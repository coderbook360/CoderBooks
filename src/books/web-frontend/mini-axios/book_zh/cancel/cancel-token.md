# CancelToken 机制详解

请求取消是 HTTP 客户端的重要功能。这一节我们实现 Axios 的 CancelToken 机制——一种基于 Promise 的取消方案。

## 本节目标

通过本节学习，你将掌握：

1. **CancelToken 设计理念**：理解为什么需要 CancelToken 以及它的设计思路
2. **核心实现**：实现 Cancel、CancelToken 类和相关工具函数
3. **适配器集成**：在 XHR 适配器中支持请求取消
4. **实战应用**：搜索防抖、组件卸载等常见场景的最佳实践

## 为什么需要取消请求？

在真实应用中，有很多场景需要取消已发出但未完成的请求：

| 场景 | 说明 | 不取消的后果 |
|------|------|------------|
| 组件卸载 | React 组件卸载时取消未完成的请求 | 内存泄漏、状态更新警告 |
| 搜索防抖 | 用户输入时取消上一次搜索 | 旧结果覆盖新结果 |
| 路由切换 | 离开页面时取消当前请求 | 浪费资源、可能导致错误 |
| 超时取消 | 自定义超时逻辑 | 请求长时间挂起 |
| 用户主动取消 | 点击取消按钮 | 用户体验差 |

```
┌─────────────────────────────────────────────────────────────────┐
│                   请求取消的典型场景                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  搜索框输入：                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 用户输入 "a"  →  发起请求 A                               │   │
│  │ 用户输入 "ab" →  取消请求 A，发起请求 B                    │   │
│  │ 用户输入 "abc" → 取消请求 B，发起请求 C                   │   │
│  │ 请求 C 返回   →  显示结果                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  如果不取消：                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 请求 A、B、C 同时进行                                      │   │
│  │ 请求 A 可能最后返回（网络延迟不确定）                       │   │
│  │ 结果："a" 的搜索结果覆盖了 "abc" 的结果 ❌                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## CancelToken 设计

Axios 的 CancelToken 基于 **Cancelable Promises** 提案（TC39 提案，已废弃，但设计思路沿用至今）。核心思想是：**使用一个永远 pending 的 Promise，在需要取消时 resolve 它**。

### 使用方式对比

```typescript
// ========================================
// 方式 1：通过 source() 工厂方法创建（推荐）
// 优点：简洁，token 和 cancel 一起返回
// ========================================
const source = axios.CancelToken.source();

axios.get('/api', {
  cancelToken: source.token,
});

// 需要取消时调用
source.cancel('Operation cancelled');

// ========================================
// 方式 2：通过构造函数创建
// 优点：更灵活，可以将 cancel 函数传递到其他地方
// ========================================
let cancel;
axios.get('/api', {
  cancelToken: new axios.CancelToken(c => {
    cancel = c;  // 保存 cancel 函数
  }),
});

// 需要取消时调用
cancel('取消请求');
```

### 设计架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    CancelToken 架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │     Cancel      │      │   CancelToken   │                   │
│  │  (取消原因类)    │◄────│   (取消令牌)     │                   │
│  │                 │      │                 │                   │
│  │ - message       │      │ - promise       │                   │
│  │ - __CANCEL__    │      │ - reason        │                   │
│  │                 │      │ - _listeners    │                   │
│  └─────────────────┘      │                 │                   │
│                           │ + throwIfRequested()                │
│  ┌─────────────────┐      │ + subscribe()    │                  │
│  │   isCancel()    │      │ + unsubscribe() │                   │
│  │  (判断函数)      │      │ + source()      │                   │
│  └─────────────────┘      └─────────────────┘                   │
│                                                                 │
│  使用流程：                                                      │
│  1. 创建 CancelToken，获得 token 和 cancel 函数                  │
│  2. 将 token 传入请求配置                                        │
│  3. 适配器订阅 token.promise                                     │
│  4. 调用 cancel() 时，promise resolve，触发 xhr.abort()          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 实现 Cancel 类

首先实现取消原因类。这是一个简单的类，用于封装取消信息并提供识别标记。

```typescript
// src/cancel/Cancel.ts

/**
 * Cancel 类 - 表示请求取消的原因
 * 
 * 设计要点：
 * 1. 携带取消信息（message）
 * 2. 提供识别标记（__CANCEL__）用于类型判断
 * 3. 继承自 Error 可作为异常抛出
 */
export class Cancel {
  /** 取消原因描述 */
  message?: string;
  
  /** 
   * 取消标记 - 用于 isCancel() 判断
   * 为什么用这种方式而不是 instanceof？
   * 因为在不同的 bundle 或 iframe 中，instanceof 可能失效
   */
  __CANCEL__ = true;

  constructor(message?: string) {
    this.message = message;
  }

  /**
   * 转字符串，便于日志输出
   */
  toString(): string {
    return `Cancel: ${this.message || ''}`;
  }
}

/**
 * 判断是否为取消错误
 * 
 * 使用场景：在 catch 块中区分取消错误和其他错误
 * 
 * @example
 * try {
 *   await axios.get('/api', { cancelToken: token });
 * } catch (error) {
 *   if (isCancel(error)) {
 *     console.log('请求被取消:', error.message);
 *   } else {
 *     console.error('请求失败:', error);
 *   }
 * }
 */
export function isCancel(value: any): value is Cancel {
  return !!(value && value.__CANCEL__);
}
```

> **为什么用 `__CANCEL__` 标记而不是 `instanceof`？**
>
> 在某些情况下 `instanceof` 会失效：
> - 不同版本的 Axios 共存（如主应用和微前端子应用）
> - 在 iframe 中使用
> - 多个 bundle 打包
>
> 使用属性标记更可靠，这也是 Axios 源码采用的方式。

## 实现 CancelToken

CancelToken 是核心类，它的关键在于：**创建一个永远 pending 的 Promise，在调用 cancel 时 resolve 它**。

```typescript
// src/cancel/CancelToken.ts

import { Cancel } from './Cancel';

/**
 * 取消函数类型
 */
export type Canceler = (message?: string) => void;

/**
 * CancelToken.source() 返回值类型
 */
export interface CancelTokenSource {
  token: CancelToken;
  cancel: Canceler;
}

/**
 * CancelToken 类 - 请求取消令牌
 * 
 * 核心原理：
 * 1. 创建一个永远 pending 的 Promise
 * 2. 将 resolve 函数暴露给外部
 * 3. 外部调用 cancel() 时，resolve 这个 Promise
 * 4. 适配器监听这个 Promise，一旦 resolve 就调用 xhr.abort()
 */
export class CancelToken {
  /** 取消 Promise - 适配器监听这个 Promise */
  promise: Promise<Cancel>;
  
  /** 取消原因 - 调用 cancel 后被设置 */
  reason?: Cancel;
  
  /** 取消监听器列表 */
  private _listeners: Array<(reason: Cancel) => void> = [];

  /**
   * 构造函数
   * @param executor - 执行器函数，接收 cancel 函数作为参数
   * 
   * @example
   * let cancel;
   * const token = new CancelToken(c => { cancel = c; });
   * // 稍后调用 cancel('原因') 取消请求
   */
  constructor(executor: (cancel: Canceler) => void) {
    let resolvePromise: (reason: Cancel) => void;

    // 创建一个永远 pending 的 Promise
    // 只有调用 cancel 时才会 resolve
    // 这是整个取消机制的核心！
    this.promise = new Promise<Cancel>((resolve) => {
      resolvePromise = resolve;  // 保存 resolve 函数
    });

    // 创建 cancel 函数并传给执行器
    // 用户通过执行器获得 cancel 函数，可以在需要时调用
    executor((message?: string) => {
      // 防止重复取消
      // 一旦取消，reason 就会被设置，后续调用无效
      if (this.reason) {
        return;
      }

      // 创建取消原因
      this.reason = new Cancel(message);
      
      // resolve Promise，触发适配器中的取消逻辑
      resolvePromise(this.reason);

      // 通知所有已注册的监听器
      this._listeners.forEach(listener => listener(this.reason!));
    });
  }

  /**
   * 如果已经取消，抛出取消原因
   * 
   * 使用场景：在发送请求前检查是否已取消
   * 这样可以避免发送已经不需要的请求
   */
  throwIfRequested(): void {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * 订阅取消事件
   * 
   * 适配器使用此方法监听取消事件
   * 如果已经取消，会立即调用监听器
   */
  subscribe(listener: (reason: Cancel) => void): void {
    if (this.reason) {
      // 如果已经取消，立即调用
      listener(this.reason);
      return;
    }
    this._listeners.push(listener);
  }

  /**
   * 取消订阅
   * 
   * 请求完成后应该取消订阅，避免内存泄漏
   */
  unsubscribe(listener: (reason: Cancel) => void): void {
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * 工厂方法：创建 CancelToken 和 cancel 函数
   * 
   * 这是最常用的创建方式，比直接用构造函数更简洁
   * 
   * @example
   * const { token, cancel } = CancelToken.source();
   * axios.get('/api', { cancelToken: token });
   * cancel('取消请求');
   */
  static source(): CancelTokenSource {
    let cancel!: Canceler;
    const token = new CancelToken((c) => {
      cancel = c;
    });
    return { token, cancel };
  }
}
```

### CancelToken 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    CancelToken 工作流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 创建阶段                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ const { token, cancel } = CancelToken.source()          │   │
│  │                                                         │   │
│  │ token.promise = new Promise(resolve => ...)  (pending)  │   │
│  │ cancel = (msg) => { resolve(new Cancel(msg)) }          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  2. 请求阶段                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ axios.get('/api', { cancelToken: token })               │   │
│  │                                                         │   │
│  │ 适配器: token.promise.then(() => xhr.abort())           │   │
│  │ （监听 Promise，但它一直 pending，所以不触发）             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  3. 取消阶段                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ cancel('用户取消')                                       │   │
│  │                                                         │   │
│  │ token.promise resolve  →  xhr.abort()  →  reject(Cancel) │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
  }
}
```

## 在适配器中使用

有了 CancelToken，我们需要在 XHR 适配器中集成取消功能。核心思路是：**订阅 CancelToken，一旦取消就调用 `xhr.abort()`**。

更新 XHR 适配器以支持取消：

```typescript
// src/adapters/xhr.ts

import { Cancel } from '../cancel/Cancel';
import { AxiosRequestConfig, AxiosResponse } from '../types';

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // ========================================
    // 取消处理
    // ========================================
    
    // 保存取消回调，用于后续取消订阅
    let onCanceled: ((reason: Cancel) => void) | undefined;

    /**
     * 清理函数 - 请求完成后调用
     * 无论成功、失败还是取消，都要取消订阅
     * 避免内存泄漏
     */
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled!);
      }
    }

    // 如果有 CancelToken，订阅取消事件
    if (config.cancelToken) {
      onCanceled = (reason) => {
        // 1. 中断请求
        xhr.abort();
        // 2. reject Promise，传入取消原因
        reject(reason);
        // 3. 清理
        done();
      };
      // 订阅：当 cancel() 被调用时，onCanceled 会被执行
      config.cancelToken.subscribe(onCanceled);
    }

    // ========================================
    // 初始化请求
    // ========================================
    const url = buildURL({ 
      url: config.url, 
      baseURL: config.baseURL, 
      params: config.params 
    });
    xhr.open(config.method?.toUpperCase() || 'GET', url, true);

    // 设置请求头...
    // 设置超时...

    // ========================================
    // 事件处理
    // ========================================
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 0) return;  // 被取消或网络错误

      const response = { /* 构建响应对象 */ };
      done();  // 清理
      settle(resolve, reject, response);
    };

    xhr.onerror = function () {
      done();  // 清理
      reject(createError('Network Error', config, null, xhr));
    };

    xhr.ontimeout = function () {
      done();  // 清理
      reject(createError(
        `Timeout of ${config.timeout}ms exceeded`, 
        config, 
        'ECONNABORTED', 
        xhr
      ));
    };

    // ========================================
    // 发送前最后检查
    // ========================================
    // 如果在创建请求过程中已经被取消，直接抛出
    if (config.cancelToken) {
      config.cancelToken.throwIfRequested();
    }

    xhr.send(config.data ?? null);
  });
}
```

### 为什么需要多处检查？

| 检查时机 | 方法 | 目的 |
|---------|------|------|
| 发送前 | `throwIfRequested()` | 避免发送已取消的请求 |
| 请求中 | `subscribe()` + `abort()` | 中断正在进行的请求 |
| 响应后 | `done()` 清理 | 避免内存泄漏 |

## 在 dispatchRequest 中检查

除了适配器层面的取消处理，`dispatchRequest` 也需要在多个时机检查取消状态。

```typescript
// src/core/dispatchRequest.ts

import { isCancel } from '../cancel/Cancel';

export function dispatchRequest<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  // ========================================
  // 检查点 1: 发送前
  // 如果在拦截器处理过程中被取消，这里直接抛出
  // ========================================
  throwIfCancellationRequested(config);

  // 转换请求数据
  config.data = transform(config.data, config.headers, config.transformRequest);

  // 发送请求
  const adapter = config.adapter || getDefaultAdapter();

  return adapter(config).then(
    (response) => {
      // ========================================
      // 检查点 2: 响应后
      // 响应到达但可能已经不需要了（如组件已卸载）
      // ========================================
      throwIfCancellationRequested(config);
      
      // 转换响应数据
      response.data = transform(response.data, response.headers, config.transformResponse);
      return response;
    },
    (error) => {
      // ========================================
      // 检查点 3: 错误处理
      // 如果是取消错误，不需要额外检查
      // ========================================
      if (!isCancel(error)) {
        throwIfCancellationRequested(config);
        
        // 错误响应也需要转换
        if (error.response) {
          error.response.data = transform(
            error.response.data,
            error.response.headers,
            config.transformResponse
          );
        }
      }
      return Promise.reject(error);
    }
  );
}

/**
 * 检查并抛出取消异常
 * 
 * 封装成函数的原因：
 * 1. 避免重复代码
 * 2. 便于统一修改检查逻辑
 */
function throwIfCancellationRequested(config: AxiosRequestConfig): void {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}
```
```

## 实际使用示例

了解了原理后，让我们看看在实际项目中如何使用 CancelToken。

### 搜索防抖

这是最常见的使用场景：用户输入时取消上一次搜索，只保留最新的请求。

```typescript
// 保存当前请求的取消源
let cancelToken: CancelTokenSource | null = null;

/**
 * 搜索函数 - 自动取消上一次请求
 */
async function search(query: string) {
  // 1. 取消上一次请求
  if (cancelToken) {
    cancelToken.cancel('新搜索取消旧请求');
  }

  // 2. 创建新的取消源
  cancelToken = axios.CancelToken.source();

  try {
    // 3. 发起请求
    const { data } = await axios.get('/search', {
      params: { q: query },
      cancelToken: cancelToken.token,
    });
    return data;
  } catch (error) {
    // 4. 区分取消错误和其他错误
    if (axios.isCancel(error)) {
      // 取消是正常行为，不需要报错
      console.log('请求已取消:', error.message);
      return null;
    }
    // 其他错误继续抛出
    throw error;
  }
}

// 使用示例
searchInput.addEventListener('input', (e) => {
  search(e.target.value).then(results => {
    if (results) {
      renderResults(results);
    }
  });
});
```

### React 组件

在 React 中，组件卸载时取消未完成的请求是最佳实践：

```typescript
import { useEffect, useState } from 'react';
import axios, { CancelTokenSource } from 'axios';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 每次 userId 变化或组件挂载时，创建新的取消源
    const source = axios.CancelToken.source();
    
    setLoading(true);
    setError(null);

    axios.get(`/users/${userId}`, {
      cancelToken: source.token,
    })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(error => {
        // 取消不算错误
        if (!axios.isCancel(error)) {
          setError(error.message);
          setLoading(false);
        }
        // 如果是取消，不更新状态（组件可能已卸载）
      });

    // 清理函数：组件卸载或 userId 变化时调用
    return () => {
      source.cancel('组件卸载或依赖变化');
    };
  }, [userId]);  // userId 变化时重新执行

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  return <div>用户: {user?.name}</div>;
}
  }, [userId]);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  return <div>用户: {user?.name}</div>;
}
```

### 批量取消

多个请求可以共享同一个 CancelToken，实现一次取消全部：

```typescript
// 创建一个取消源，多个请求共享
const source = axios.CancelToken.source();

// 同时发起多个请求，共享同一个 token
Promise.all([
  axios.get('/api/users', { cancelToken: source.token }),
  axios.get('/api/posts', { cancelToken: source.token }),
  axios.get('/api/comments', { cancelToken: source.token }),
]).catch(error => {
  if (axios.isCancel(error)) {
    console.log('所有请求已取消');
  }
});

// 一次取消所有请求
source.cancel('批量取消');
```

### 自定义超时

CancelToken 也可以用于实现自定义超时逻辑：

```typescript
function requestWithTimeout<T>(
  url: string, 
  timeout: number
): Promise<T> {
  const source = axios.CancelToken.source();
  
  // 设置超时取消
  const timeoutId = setTimeout(() => {
    source.cancel(`请求超时 (${timeout}ms)`);
  }, timeout);
  
  return axios.get<T>(url, { 
    cancelToken: source.token 
  }).finally(() => {
    // 请求完成后清除定时器
    clearTimeout(timeoutId);
  });
}
```

## 测试

完整的测试用例确保 CancelToken 在各种场景下都能正常工作：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CancelToken, Cancel, isCancel } from '../src/cancel';

describe('CancelToken', () => {
  
  // ========================================
  // 测试组 1: 创建和基本使用
  // ========================================
  it('should create cancel token with source()', () => {
    const source = CancelToken.source();
    
    // source 应该包含 token 和 cancel
    expect(source.token).toBeInstanceOf(CancelToken);
    expect(typeof source.cancel).toBe('function');
  });

  it('should resolve promise when cancelled', async () => {
    const source = CancelToken.source();
    
    // 延迟取消
    setTimeout(() => source.cancel('test message'), 10);
    
    // 等待 promise resolve
    const reason = await source.token.promise;
    
    // 验证取消原因
    expect(reason).toBeInstanceOf(Cancel);
    expect(reason.message).toBe('test message');
  });

  // ========================================
  // 测试组 2: throwIfRequested
  // ========================================
  it('should throw when checking cancelled token', () => {
    const source = CancelToken.source();
    source.cancel('cancelled');
    
    // 已取消的 token 调用 throwIfRequested 应该抛出
    expect(() => source.token.throwIfRequested()).toThrow('cancelled');
  });

  it('should not throw for active token', () => {
    const source = CancelToken.source();
    
    // 未取消的 token 不应该抛出
    expect(() => source.token.throwIfRequested()).not.toThrow();
  });

  // ========================================
  // 测试组 3: 订阅机制
  // ========================================
  it('should call subscriber on cancel', () => {
    const source = CancelToken.source();
    const listener = vi.fn();
    
    // 先订阅，后取消
    source.token.subscribe(listener);
    source.cancel('cancelled');
    
    expect(listener).toHaveBeenCalledWith(expect.any(Cancel));
  });

  it('should immediately call subscriber if already cancelled', () => {
    const source = CancelToken.source();
    const listener = vi.fn();
    
    // 先取消，后订阅
    source.cancel('cancelled');
    source.token.subscribe(listener);
    
    // 订阅时应该立即调用
    expect(listener).toHaveBeenCalled();
  });

  it('should unsubscribe listener', () => {
    const source = CancelToken.source();
    const listener = vi.fn();
    
    // 订阅后取消订阅
    source.token.subscribe(listener);
    source.token.unsubscribe(listener);
    source.cancel('cancelled');
    
    // 已取消订阅，不应该被调用
    expect(listener).not.toHaveBeenCalled();
  });

  // ========================================
  // 测试组 4: 防重复取消
  // ========================================
  it('should only cancel once', () => {
    const source = CancelToken.source();
    const listener = vi.fn();
    
    source.token.subscribe(listener);
    
    // 多次调用 cancel
    source.cancel('first');
    source.cancel('second');
    source.cancel('third');
    
    // 只应该触发一次
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.token.reason?.message).toBe('first');
  });
});

describe('isCancel', () => {
  
  it('should return true for Cancel instance', () => {
    expect(isCancel(new Cancel('test'))).toBe(true);
  });

  it('should return false for regular error', () => {
    expect(isCancel(new Error('test'))).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isCancel(null)).toBe(false);
    expect(isCancel(undefined)).toBe(false);
  });

  it('should return true for object with __CANCEL__ flag', () => {
    // 即使不是 Cancel 实例，只要有 __CANCEL__ 标记就认为是取消
    expect(isCancel({ __CANCEL__: true })).toBe(true);
  });
});
```

## 小结

本节我们实现了 Axios 的 CancelToken 机制，一种基于 Promise 的请求取消方案。

### 核心组件总结

| 组件 | 作用 | 关键特性 |
|------|------|---------|
| `Cancel` | 取消原因类 | `__CANCEL__` 标记，`message` 属性 |
| `CancelToken` | 取消令牌 | pending Promise，订阅机制 |
| `isCancel()` | 判断函数 | 通过 `__CANCEL__` 标记识别 |
| `source()` | 工厂方法 | 返回 `{ token, cancel }` |

### 关键设计决策

| 设计 | 说明 | 好处 |
|------|------|------|
| Promise 机制 | 用 pending Promise 传递取消信号 | 异步友好，易于集成 |
| 订阅模式 | 支持多个监听器 | 灵活，支持复杂场景 |
| 防重复取消 | 只能取消一次 | 避免重复触发回调 |
| `__CANCEL__` 标记 | 属性标记而非 instanceof | 跨 bundle 兼容 |

### 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    CancelToken 完整流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  创建: CancelToken.source()                                     │
│         │                                                       │
│         ▼                                                       │
│  配置: axios.get('/api', { cancelToken: token })                │
│         │                                                       │
│         ▼                                                       │
│  订阅: 适配器 subscribe(onCanceled)                              │
│         │                                                       │
│         ▼                                                       │
│  取消: cancel('原因') ──→ Promise resolve                        │
│         │                                                       │
│         ▼                                                       │
│  触发: onCanceled() ──→ xhr.abort()                             │
│         │                                                       │
│         ▼                                                       │
│  返回: reject(Cancel) ──→ catch 中用 isCancel() 判断             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 常见问题解答

**Q1: CancelToken 和 AbortController 有什么区别？**

CancelToken 是 Axios 自己实现的取消机制（基于 Cancelable Promises 提案），而 AbortController 是浏览器原生 API。在现代项目中推荐使用 AbortController，但 CancelToken 仍然被广泛使用且 Axios 继续支持。

**Q2: 为什么要用 `__CANCEL__` 标记而不是 `instanceof`？**

`instanceof` 在以下情况会失效：
- 不同版本的 Axios 共存
- 在 iframe 中使用
- 多个独立的 bundle
使用属性标记更可靠。

**Q3: 取消请求后，服务器会停止处理吗？**

不一定。`xhr.abort()` 只是客户端取消了请求，服务器可能已经收到并开始处理。如果需要服务器也停止，需要额外的协议（如 WebSocket 通知）。

**Q4: 可以取消已完成的请求吗？**

技术上可以调用 cancel()，但没有实际效果。Promise 已经 resolved/rejected，无法再改变状态。

下一节我们学习现代的 AbortController 方案。
