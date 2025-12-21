# 拦截器管理器的设计

拦截器是 Axios 最强大的特性之一。这一节我们设计拦截器管理器。

## 本节目标

通过本节学习，你将：

1. 理解拦截器的作用和使用场景
2. 掌握拦截器管理器的数据结构设计
3. 实现拦截器的注册、移除和遍历功能
4. 了解拦截器选项（同步执行、条件执行）的实现

## 什么是拦截器？

拦截器可以在请求发送前或响应返回后执行自定义逻辑：

```typescript
// 请求拦截器：在请求发送前执行
axios.interceptors.request.use(
  config => {
    // 修改配置（如添加认证头）
    config.headers.Authorization = 'Bearer token';
    return config;  // 必须返回 config
  },
  error => Promise.reject(error)  // 处理错误
);

// 响应拦截器：在响应返回后执行
axios.interceptors.response.use(
  response => response.data,  // 可以直接返回数据部分
  error => Promise.reject(error)
);
```

**拦截器的核心特点**：
1. 可以修改请求配置或响应数据
2. 可以处理错误
3. 支持异步操作（返回 Promise）
4. 可以有多个，按顺序执行

## 拦截器的使用场景

### 请求拦截器常见用途

| 用途 | 说明 |
|------|------|
| 添加认证信息 | Token、签名、API Key |
| 请求参数加密 | 敏感数据加密 |
| 添加公共参数 | 时间戳、请求 ID、版本号 |
| 请求日志 | 记录请求信息 |
| 显示加载状态 | 开始 loading |

### 响应拦截器常见用途

| 用途 | 说明 |
|------|------|
| 统一错误处理 | 根据状态码跳转、提示 |
| 响应数据解密 | 解密敏感数据 |
| Token 刷新 | 401 时自动刷新 token |
| 业务状态码处理 | 处理 `{ code, data, message }` 格式 |
| 隐藏加载状态 | 结束 loading |

## 设计拦截器管理器

拦截器管理器需要实现三个核心功能：

```
┌────────────────────────────────────────────────────────────┐
│                  InterceptorManager                         │
├────────────────────────────────────────────────────────────┤
│  use(fulfilled, rejected)  → 注册拦截器，返回 ID           │
│  eject(id)                 → 根据 ID 移除拦截器            │
│  forEach(fn)               → 遍历所有有效拦截器            │
│  clear()                   → 清空所有拦截器                │
└────────────────────────────────────────────────────────────┘
```

定义类型：

```typescript
// src/types/index.ts

// 拦截器处理器：包含成功回调和失败回调
export interface AxiosInterceptorHandler<T> {
  fulfilled?: (value: T) => T | Promise<T>;  // 成功时调用
  rejected?: (error: any) => any;            // 失败时调用
}

// 拦截器管理器接口
export interface AxiosInterceptorManager<T> {
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: any) => any
  ): number;  // 返回拦截器 ID
  
  eject(id: number): void;  // 移除拦截器
  
  forEach(fn: (handler: AxiosInterceptorHandler<T>) => void): void;
}
```

实现拦截器管理器：

```typescript
// src/core/InterceptorManager.ts

import { AxiosInterceptorHandler, AxiosInterceptorManager } from '../types';

export class InterceptorManager<T> implements AxiosInterceptorManager<T> {
  // 存储所有拦截器
  // 使用 null 标记已删除的拦截器（原因见下文）
  private handlers: Array<AxiosInterceptorHandler<T> | null> = [];

  /**
   * 注册拦截器
   * 
   * @param onFulfilled 成功时的回调，接收 config/response，必须返回处理后的结果
   * @param onRejected 失败时的回调，接收 error
   * @returns 拦截器 ID，可用于后续移除
   */
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: any) => any
  ): number {
    this.handlers.push({
      fulfilled: onFulfilled,
      rejected: onRejected,
    });
    // 返回索引作为 ID
    return this.handlers.length - 1;
  }

  /**
   * 移除拦截器
   * 
   * 注意：不是真的删除数组元素，而是设为 null
   * 这样可以保持其他拦截器的 ID 不变
   * 
   * @param id 拦截器 ID（由 use 返回）
   */
  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * 遍历所有有效拦截器
   * 
   * 自动跳过已被 eject 的拦截器（null 值）
   */
  forEach(fn: (handler: AxiosInterceptorHandler<T>) => void): void {
    this.handlers.forEach(handler => {
      if (handler !== null) {
        fn(handler);
      }
    });
  }

  /**
   * 清空所有拦截器
   */
  clear(): void {
    this.handlers = [];
  }
}
```
```

## 为什么用 null 标记删除？

这是一个常见的面试题，也是理解 Axios 设计的关键点。

### 问题场景

假设我们用数组的 `splice` 方法直接删除元素：

```typescript
// 场景
const id1 = axios.interceptors.request.use(fn1);  // id = 0
const id2 = axios.interceptors.request.use(fn2);  // id = 1
const id3 = axios.interceptors.request.use(fn3);  // id = 2

axios.interceptors.request.eject(id1);  // 删除第一个
```

```
初始状态：
handlers = [fn1, fn2, fn3]
            ↑    ↑    ↑
          id=0 id=1 id=2

如果使用 splice(0, 1) 真的删除数组元素：
handlers = [fn2, fn3]
            ↑    ↑
          id=0 id=1  ← 所有 id 都变了！

此时 id2=1 原本指向 fn2，现在索引 1 是 fn3！
调用 eject(id2) 会错误删除 fn3
```

### 正确做法：使用 null 占位

```
使用 null 标记删除后：
handlers = [null, fn2, fn3]
             ↑    ↑    ↑
           id=0 id=1 id=2  ← 所有 id 保持稳定

id2=1 仍然正确指向 fn2
id3=2 仍然正确指向 fn3
```

### 对比总结

| 删除方式 | ID 稳定性 | 内存 | 适用场景 |
|---------|-----------|------|----------|
| splice 真删除 | ❌ 后续 ID 全部变化 | 节省 | 不需要保留 ID |
| null 占位标记 | ✅ 所有 ID 不变 | 略多 | 需要稳定 ID 引用 |

**小贴士**：这种「软删除」/「惰性删除」模式在很多场景都有应用，如数据库的逻辑删除、LRU 缓存等。

## 集成到 Axios 类

现在让我们把 `InterceptorManager` 集成到 `Axios` 类中：

```typescript
// src/core/Axios.ts

import { InterceptorManager } from './InterceptorManager';

export class Axios {
  defaults: AxiosDefaults;
  
  // 提供请求和响应两个拦截器管理器
  interceptors: {
    request: InterceptorManager<AxiosRequestConfig>;   // 泛型为 AxiosRequestConfig
    response: InterceptorManager<AxiosResponse>;       // 泛型为 AxiosResponse
  };

  constructor(instanceConfig: AxiosRequestConfig = {}) {
    this.defaults = { /* ... */ } as AxiosDefaults;
    
    // 在构造函数中初始化两个管理器
    this.interceptors = {
      request: new InterceptorManager<AxiosRequestConfig>(),
      response: new InterceptorManager<AxiosResponse>(),
    };
  }

  // ...
}
```

> **设计说明**：请求拦截器和响应拦截器使用不同的泛型类型，这样 TypeScript 可以在编写拦截器时提供正确的类型提示。

## 拦截器选项

Axios 支持为拦截器配置额外选项，实现更精细的控制：

```typescript
axios.interceptors.request.use(
  config => config,
  error => Promise.reject(error),
  { 
    synchronous: true,                              // 同步执行模式
    runWhen: config => config.url !== '/health'     // 条件执行
  }
);
```

### 选项说明

| 选项 | 类型 | 默认值 | 作用 |
|------|------|--------|------|
| `synchronous` | boolean | false | 同步执行拦截器，不使用 Promise |
| `runWhen` | function | - | 返回 false 时跳过此拦截器 |

### 扩展类型定义

```typescript
// src/types/index.ts

export interface AxiosInterceptorOptions {
  /** 
   * 是否同步执行拦截器
   * 设为 true 时，请求会立即发出，不等待微任务队列
   */
  synchronous?: boolean;
  
  /** 
   * 条件执行函数
   * 返回 false 时跳过此拦截器
   * 适用于：某些请求不需要添加 token 等场景
   */
  runWhen?: (config: AxiosRequestConfig) => boolean;
}

export interface AxiosInterceptorHandler<T> {
  fulfilled?: (value: T) => T | Promise<T>;
  rejected?: (error: any) => any;
  synchronous?: boolean;                            // 从选项复制
  runWhen?: (config: AxiosRequestConfig) => boolean; // 从选项复制
}
```

### 更新实现

```typescript
// src/core/InterceptorManager.ts

export class InterceptorManager<T> {
  use(
    onFulfilled?: (value: T) => T | Promise<T>,
    onRejected?: (error: any) => any,
    options?: AxiosInterceptorOptions  // 新增第三个参数
  ): number {
    this.handlers.push({
      fulfilled: onFulfilled,
      rejected: onRejected,
      // 将选项展开存储
      synchronous: options?.synchronous,
      runWhen: options?.runWhen,
    });
    return this.handlers.length - 1;
  }
}
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { InterceptorManager } from '../src/core/InterceptorManager';

describe('InterceptorManager', () => {
  // 测试基本的添加功能
  it('should add interceptor and return id', () => {
    const manager = new InterceptorManager<any>();
    const fn = vi.fn();
    
    const id = manager.use(fn);
    
    expect(id).toBe(0);  // 第一个拦截器 id 为 0
  });

  // 测试 forEach 遍历
  it('should call forEach for all handlers', () => {
    const manager = new InterceptorManager<any>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    
    manager.use(fn1);
    manager.use(fn2);
    
    const handlers: any[] = [];
    manager.forEach(h => handlers.push(h));
    
    expect(handlers).toHaveLength(2);
    expect(handlers[0].fulfilled).toBe(fn1);
    expect(handlers[1].fulfilled).toBe(fn2);
  });

  // 测试 eject 移除
  it('should eject interceptor and keep other ids stable', () => {
    const manager = new InterceptorManager<any>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    
    const id1 = manager.use(fn1);
    manager.use(fn2);
    
    manager.eject(id1);  // 移除第一个
    
    const handlers: any[] = [];
    manager.forEach(h => handlers.push(h));
    
    // forEach 应该跳过 null，只返回有效的拦截器
    expect(handlers).toHaveLength(1);
    expect(handlers[0].fulfilled).toBe(fn2);
  });

  // 测试 eject 不存在的 id 不报错
  it('should handle eject non-existent id gracefully', () => {
    const manager = new InterceptorManager<any>();
    
    // 不应该抛错
    expect(() => manager.eject(999)).not.toThrow();
  });

  // 测试 clear 清空
  it('should clear all interceptors', () => {
    const manager = new InterceptorManager<any>();
    
    manager.use(() => {});
    manager.use(() => {});
    manager.clear();
    
    const handlers: any[] = [];
    manager.forEach(h => handlers.push(h));
    
    expect(handlers).toHaveLength(0);
  });
});
```

## 小结

本节我们实现了 `InterceptorManager` 类，它是拦截器系统的基础组件。

### 核心设计要点

| 方法 | 功能 | 关键点 |
|------|------|--------|
| `use()` | 注册拦截器 | 返回唯一 ID，支持选项配置 |
| `eject()` | 移除拦截器 | 用 null 标记，保持 ID 稳定 |
| `forEach()` | 遍历拦截器 | 自动跳过 null |
| `clear()` | 清空所有 | 重置数组 |

### 数据结构可视化

```
handlers 数组状态示例：
┌───────────────────────────────────────────────────────────┐
│ [0]: { fulfilled, rejected, synchronous, runWhen }       │ ← 有效
│ [1]: null                                                 │ ← 已删除
│ [2]: { fulfilled, rejected }                              │ ← 有效
│ [3]: { fulfilled, rejected, runWhen }                     │ ← 有效
└───────────────────────────────────────────────────────────┘
        ↑ forEach 遍历时会跳过 null
```

## 常见问题解答

**Q1: 为什么请求拦截器和响应拦截器要分开管理？**

A: 因为它们处理的数据类型不同：
- 请求拦截器操作 `AxiosRequestConfig`
- 响应拦截器操作 `AxiosResponse`

分开管理可以获得更好的类型推断。

**Q2: 拦截器 ID 会用完吗？**

A: 理论上会。ID 是数组索引，JavaScript 数组最大长度约 2^32-1（约 43 亿）。实际使用中不可能注册这么多拦截器。

**Q3: 为什么不用 Map 来存储拦截器？**

A: 使用 Map 也可以，但数组有以下优势：
- 保持拦截器的注册顺序（Map 也可以，但语义不如数组直观）
- 遍历性能略好
- 实现更简单

**Q4: `runWhen` 选项有什么实际用途？**

A: 常见场景：
```typescript
// 只对非健康检查请求添加 token
axios.interceptors.request.use(
  config => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  null,
  { runWhen: config => !config.url?.includes('/health') }
);
```

---

下一节我们将学习拦截器链的执行逻辑——如何将多个拦截器串联起来形成完整的请求处理流程。
