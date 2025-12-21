# AbortController：现代取消方案

Axios 0.22.0+ 支持标准的 AbortController API。这是更现代、更推荐的取消方式。

## 本节目标

通过本节学习，你将：
- 理解 AbortController 的工作原理和优势
- 掌握在 Axios 中使用 AbortController 取消请求
- 实现同时支持 CancelToken 和 AbortController 的适配器
- 学会在 React 项目中优雅地处理请求取消

## CancelToken vs AbortController

在选择取消方案之前，先了解两者的区别：

| 特性 | CancelToken | AbortController |
|------|-------------|-----------------|
| 标准 | Axios 私有 | Web 标准 (DOM) |
| 浏览器支持 | 所有 | IE 不支持（需 polyfill） |
| Fetch 兼容 | ❌ 否 | ✅ 是 |
| 未来趋势 | ⚠️ 已弃用 | ✅ 推荐使用 |
| Node.js | 需要 polyfill | 15.4+ 原生支持 |
| 复用性 | 不可复用 | 不可复用（都是一次性的） |

> **为什么推荐 AbortController？** 因为它是 Web 标准，不仅可以取消 Axios 请求，还可以取消 Fetch、事件监听、流操作等，学一次到处用。

## AbortController 基础

AbortController 由两部分组成：

```
┌─────────────────────────────────────────────────────────┐
│                    AbortController                       │
├──────────────────────┬──────────────────────────────────┤
│  controller.abort()  │  触发取消操作                     │
├──────────────────────┼──────────────────────────────────┤
│  controller.signal   │  AbortSignal 对象               │
│                      │  - signal.aborted: 是否已取消   │
│                      │  - signal.reason: 取消原因      │
│                      │  - addEventListener('abort')    │
└──────────────────────┴──────────────────────────────────┘
```

```typescript
// 创建控制器
const controller = new AbortController();

// 获取信号对象（传给需要取消的操作）
const signal = controller.signal;

// 监听取消事件
signal.addEventListener('abort', () => {
  console.log('请求已取消');
  console.log('取消原因:', signal.reason);  // Axios 1.4+ 支持
});

// 触发取消
controller.abort();

// 检查状态
console.log(signal.aborted);  // true，已中止
```

## 在 Axios 中使用

使用方式非常简单，只需将 `signal` 传入配置：

```typescript
const controller = new AbortController();

axios.get('/api/data', {
  signal: controller.signal,  // 传入 signal
}).catch(error => {
  if (error.name === 'CanceledError') {
    console.log('请求被取消');
  }
});

// 任意时刻取消请求
controller.abort();
```

## 适配器支持

接下来我们更新 XHR 适配器，让它支持 AbortController：

```typescript
// src/adapters/xhr.ts

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // ==================== 处理 AbortSignal ====================
    const abortSignal = config.signal;
    
    if (abortSignal) {
      // 情况1：signal 已经是取消状态，直接拒绝，不发请求
      if (abortSignal.aborted) {
        reject(new CanceledError('canceled', config));
        return;  // 提前返回，不执行后续代码
      }

      // 情况2：监听取消事件
      const onAbort = () => {
        xhr.abort();  // 中止 XHR 请求
        reject(new CanceledError('canceled', config));
      };
      
      abortSignal.addEventListener('abort', onAbort);
      
      // 清理函数：请求完成后移除监听，避免内存泄漏
      const cleanup = () => {
        abortSignal.removeEventListener('abort', onAbort);
      };
      
      // 在 onreadystatechange 的完成态调用 cleanup
      // 在 onerror、ontimeout 等回调中也要调用 cleanup
    }

    // ==================== 其余实现 ====================
    xhr.open(config.method?.toUpperCase() || 'GET', url, true);
    // ...
  });
}
```

### 关键点解释

```
请求生命周期与取消处理：

用户调用 abort() ──────────────┐
                               ↓
┌─────────────────────────────────────────────────────┐
│  1. signal 触发 'abort' 事件                         │
│  2. onAbort 回调执行                                 │
│  3. xhr.abort() 中止网络请求                         │
│  4. reject(CanceledError) 拒绝 Promise               │
│  5. cleanup() 移除事件监听                           │
└─────────────────────────────────────────────────────┘
```
```

## CanceledError 类

取消请求需要一个专门的错误类，方便后续判断：

```typescript
// src/cancel/CanceledError.ts

import { AxiosRequestConfig } from '../types';

export class CanceledError extends Error {
  __CANCEL__ = true;                    // 标记：用于 isCancel 判断
  code = 'ERR_CANCELED';                // 错误码：与其他错误区分
  config?: AxiosRequestConfig;          // 保存请求配置，便于调试

  constructor(message?: string, config?: AxiosRequestConfig) {
    super(message || 'canceled');
    this.name = 'CanceledError';        // 设置 name，而不是默认的 'Error'
    this.config = config;
  }
}

/**
 * 判断是否是取消错误
 * 
 * 无论使用 CancelToken 还是 AbortController，都可以用这个函数判断
 */
export function isCancel(value: any): value is CanceledError {
  return !!(value && value.__CANCEL__);
}
```

> **为什么用 `__CANCEL__` 标记？** 因为用户可能 `catch` 到各种错误，包括网络错误、超时错误等。通过这个特殊标记，可以准确判断「这是用户主动取消的」。
```

## 同时支持两种方式

为了向后兼容，我们的适配器需要同时支持 CancelToken（旧）和 AbortController（新）：

```typescript
// src/adapters/xhr.ts

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let isAborted = false;  // 防止重复处理

    // ==================== 统一的取消处理函数 ====================
    const onCancel = (reason?: any) => {
      if (isAborted) return;  // 已经处理过，跳过
      isAborted = true;
      
      xhr.abort();  // 中止 XHR
      
      // 统一包装成 CanceledError
      reject(reason instanceof CanceledError 
        ? reason 
        : new CanceledError(reason?.message || 'canceled', config));
    };

    // ==================== 处理 AbortController (推荐) ====================
    if (config.signal) {
      // 已经取消，直接返回
      if (config.signal.aborted) {
        onCancel();
        return;
      }
      // 监听取消事件
      config.signal.addEventListener('abort', () => onCancel());
    }

    // ==================== 处理 CancelToken (已弃用但仍支持) ====================
    if (config.cancelToken) {
      // CancelToken 使用 Promise 机制
      config.cancelToken.promise.then(onCancel);
    }

    // ==================== 其余实现 ====================
    // ...
  });
}
```

### 兼容性处理流程

```
请求发起时检查取消源：
┌─────────────────────────────────────────────────────────┐
│  1. 检查 config.signal (AbortController)               │
│     └─ 已 aborted? → 直接 reject                       │
│     └─ 未 aborted? → 添加 abort 事件监听               │
│                                                         │
│  2. 检查 config.cancelToken (CancelToken)              │
│     └─ 注册 promise.then(onCancel)                     │
│                                                         │
│  3. 无论哪种方式触发，最终都调用同一个 onCancel()       │
└─────────────────────────────────────────────────────────┘
```
```

## 超时与取消的结合

一个常见需求是「请求超时自动取消」。AbortController 可以优雅地实现：

```typescript
/**
 * 带超时的请求封装
 * 
 * @param url 请求 URL
 * @param timeout 超时时间（毫秒）
 */
function requestWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();

  // 设置超时定时器
  const timeoutId = setTimeout(() => {
    controller.abort();  // 超时后触发取消
  }, timeout);

  return axios.get(url, {
    signal: controller.signal,
  }).finally(() => {
    // 无论成功失败，都清除定时器
    // 避免请求成功后定时器还在运行
    clearTimeout(timeoutId);
  });
}

// 使用示例
try {
  const data = await requestWithTimeout('/api/data', 5000);
} catch (error) {
  if (axios.isCancel(error)) {
    console.log('请求超时或被取消');
  }
}
```

> **小贴士**：Axios 本身有 `timeout` 配置项，但使用 AbortController 可以实现更复杂的超时逻辑，如「总超时 + 单次重试超时」。
```

## 合并多个取消信号

有时候我们需要「任一条件满足就取消」，比如「用户点击取消」或「超时」：

```typescript
/**
 * 合并多个 AbortSignal
 * 任一 signal 取消，返回的 signal 也取消
 * 
 * @param signals 要合并的 signal 数组
 * @returns 合并后的 signal
 */
function mergeSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    // 如果已经有一个是取消状态，立即取消
    if (signal.aborted) {
      controller.abort();
      break;
    }
    // 监听每个 signal 的取消事件
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

// ==================== 使用示例 ====================

// 场景：用户可以手动取消，也可能超时自动取消
const userController = new AbortController();      // 用户触发
const timeoutController = new AbortController();   // 超时触发

// 5秒后超时
setTimeout(() => timeoutController.abort(), 5000);

// 合并两个 signal
axios.get('/api', {
  signal: mergeSignals([userController.signal, timeoutController.signal]),
});

// 用户点击取消按钮
cancelButton.onclick = () => userController.abort();
```

> **进阶**：新的 `AbortSignal.any()` 方法（Chrome 116+）可以原生实现这个功能，但目前兼容性有限。
```

## React Hooks 封装

在 React 项目中，请求取消是一个常见需求：组件卸载时应该取消未完成的请求，避免「更新已卸载组件」的警告。

```typescript
import { useEffect, useRef, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 自动管理请求取消的 Hook
 * 
 * 特性：
 * - 组件卸载时自动取消请求
 * - 新请求自动取消旧请求（防止竞态）
 * - 支持手动取消
 */
function useAxios<T = any>() {
  // 用 ref 保存 controller，避免每次渲染创建新的
  const controllerRef = useRef<AbortController | null>(null);

  // 取消当前请求
  const cancel = useCallback((message?: string) => {
    controllerRef.current?.abort();
  }, []);

  // 发送请求
  const request = useCallback(async (config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    // 关键：发新请求前，先取消之前的请求
    // 这可以防止「搜索框快速输入」导致的响应顺序问题
    cancel();

    // 创建新的控制器
    controllerRef.current = new AbortController();

    return axios({
      ...config,
      signal: controllerRef.current.signal,
    });
  }, [cancel]);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => cancel();  // cleanup 函数
  }, [cancel]);

  return { request, cancel };
}

// ==================== 使用示例 ====================

function SearchComponent() {
  const { request, cancel } = useAxios<SearchResult[]>();
  const [results, setResults] = useState<SearchResult[]>([]);

  // 搜索处理函数
  const handleSearch = async (query: string) => {
    try {
      const { data } = await request({
        url: '/search',
        params: { q: query },
      });
      setResults(data);
    } catch (error) {
      // 重要：取消错误不需要处理
      if (!axios.isCancel(error)) {
        console.error('搜索失败', error);
      }
    }
  };

  return (
    <div>
      {/* 输入时触发搜索，快速输入会自动取消之前的请求 */}
      <input onChange={e => handleSearch(e.target.value)} />
      <button onClick={cancel}>取消</button>
    </div>
  );
}
```

### 为什么需要自动取消？

```
场景：用户快速输入 "react"

时间线：
t0: 输入 'r'  → 发起请求 A
t1: 输入 're' → 发起请求 B，取消请求 A
t2: 输入 'rea' → 发起请求 C，取消请求 B
t3: 输入 'reac' → 发起请求 D，取消请求 C
t4: 输入 'react' → 发起请求 E，取消请求 D
t5: 请求 E 返回 → 显示结果

如果不取消：
- 5 个请求都在飞
- 响应顺序不确定
- 可能显示 'r' 的结果而不是 'react' 的结果（竞态问题）
```
```

## 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AbortController support', () => {
  // 测试：调用 abort() 后请求应该被取消
  it('should abort request when signal is aborted', async () => {
    const controller = new AbortController();
    
    // 模拟适配器：延迟返回，模拟网络请求
    const mockAdapter = vi.fn().mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new CanceledError('canceled')), 100);
      })
    );

    const instance = axios.create({ adapter: mockAdapter });

    const promise = instance.get('/test', {
      signal: controller.signal,
    });

    // 立即取消
    controller.abort();

    await expect(promise).rejects.toThrow('canceled');
  });

  // 测试：如果 signal 已经是取消状态，请求应该立即失败
  it('should reject immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();  // 预先取消

    const mockAdapter = vi.fn();
    const instance = axios.create({ adapter: mockAdapter });

    await expect(
      instance.get('/test', { signal: controller.signal })
    ).rejects.toThrow();

    // 关键断言：适配器不应该被调用
    // 因为请求应该在调用适配器之前就被拒绝
    expect(mockAdapter).not.toHaveBeenCalled();
  });

  // 测试：isCancel 应该正确识别取消错误
  it('should identify canceled errors correctly', () => {
    const error = new CanceledError('canceled');
    
    expect(axios.isCancel(error)).toBe(true);
    expect(error.name).toBe('CanceledError');
    expect(error.code).toBe('ERR_CANCELED');
  });

  // 测试：普通错误不应该被识别为取消错误
  it('should not identify regular errors as canceled', () => {
    const error = new Error('network error');
    
    expect(axios.isCancel(error)).toBe(false);
  });
});
```

## 迁移指南

如果你的项目还在使用 CancelToken，可以按以下步骤迁移：

### 代码对比

```typescript
// ============ 旧方式 (CancelToken) ============
const source = axios.CancelToken.source();
axios.get('/api', { cancelToken: source.token });
source.cancel('取消原因');

// ============ 新方式 (AbortController) ============
const controller = new AbortController();
axios.get('/api', { signal: controller.signal });
controller.abort();
```

### 迁移步骤

1. **替换创建方式**：
   - `CancelToken.source()` → `new AbortController()`
   
2. **替换配置属性**：
   - `{ cancelToken: source.token }` → `{ signal: controller.signal }`
   
3. **替换取消调用**：
   - `source.cancel()` → `controller.abort()`

4. **判断取消错误的方式不变**：

```typescript
// 两种方式都可以用 axios.isCancel 判断
try {
  await axios.get('/api', { signal: controller.signal });
} catch (error) {
  if (axios.isCancel(error)) {
    console.log('请求被取消');
  }
}
```

### 渐进式迁移

如果项目较大，可以两种方式共存，逐步迁移：

```typescript
// 工具函数：同时支持两种方式
function createCancelableRequest(config: AxiosRequestConfig) {
  const controller = new AbortController();
  
  return {
    request: axios({
      ...config,
      signal: controller.signal,
    }),
    cancel: () => controller.abort(),
  };
}
```

## 小结

本节我们学习了 AbortController——现代化的请求取消方案。

### AbortController 的优势

| 优势 | 说明 |
|------|------|
| **Web 标准** | 与 Fetch API、DOM 事件等兼容 |
| **更简洁** | 不需要额外的类和工厂方法 |
| **生态友好** | React、Vue 等框架天然支持 |
| **未来趋势** | CancelToken 已标记弃用 |

### 使用建议

1. ✅ **新项目**：直接使用 AbortController
2. ✅ **旧项目**：可以逐步迁移，两种方式可共存
3. ✅ **判断取消**：统一使用 `axios.isCancel()`
4. ✅ **React 项目**：封装 Hook 自动管理取消

## 常见问题解答

**Q1: AbortController 可以复用吗？**

A: 不可以。一旦调用 `abort()`，这个 controller 就「用完了」，需要创建新的。这一点和 CancelToken 一样。

**Q2: 如何传递取消原因？**

A: Axios 1.4+ 支持 `controller.abort(reason)`：
```typescript
controller.abort(new Error('用户取消'));
```

**Q3: 服务器会收到取消通知吗？**

A: 不会。取消操作发生在客户端，服务器可能已经开始处理请求了。如果需要通知服务器，需要额外发送一个取消请求。

**Q4: 为什么取消后还是看到请求完成了？**

A: 可能是：
- 请求在取消前已经完成
- 服务器返回了响应，但客户端选择忽略它

---

至此，请求取消章节完成。下一章我们学习错误处理。
