# 拦截器链的执行流程

这一节我们实现拦截器链，让请求依次通过所有拦截器。

## 本节目标

通过本节学习，你将：

1. 理解拦截器链的设计原理和执行顺序
2. 掌握 Promise 链式调用的高级用法
3. 实现完整的拦截器执行逻辑
4. 了解同步拦截器和条件执行的优化

## 执行流程图

```
请求拦截器3 → 请求拦截器2 → 请求拦截器1 → dispatchRequest → 响应拦截器1 → 响应拦截器2 → 响应拦截器3
     ↑                                              ↓
   config                                       response
```

**注意执行顺序的差异**：
- 请求拦截器：**后添加的先执行**（栈结构，LIFO）
- 响应拦截器：**先添加的先执行**（队列结构，FIFO）

### 为什么请求拦截器是逆序？

这个设计很有深意。想象一个场景：

```typescript
// 基础拦截器：所有请求都要添加 token
axios.interceptors.request.use(config => {
  config.headers.Authorization = getToken();
  return config;
});

// 后来添加的拦截器：某些请求需要特殊处理
axios.interceptors.request.use(config => {
  if (config.url.includes('/admin')) {
    config.headers.Authorization = getAdminToken(); // 覆盖基础 token
  }
  return config;
});
```

后添加的拦截器可以"覆盖"先添加的拦截器的处理结果。这符合"特殊配置覆盖通用配置"的直觉。

响应拦截器是正序，因为通常我们希望按照"基础处理 → 特殊处理"的顺序来处理响应。

## 基础实现

让我们逐步实现拦截器链：

更新 Axios 类的 `request` 方法：

```typescript
// src/core/Axios.ts

export class Axios {
  request<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // ========== 第一步：处理参数重载 ==========
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl;
    }

    // ========== 第二步：合并配置 ==========
    const mergedConfig = mergeConfig(this.defaults, config);

    // ========== 第三步：构建拦截器链 ==========
    // 链中的每个节点都是 { fulfilled, rejected } 对象
    const chain: Array<{
      fulfilled?: Function;
      rejected?: Function;
    }> = [];

    // 收集请求拦截器（倒序插入，实现后添加的先执行）
    // unshift 会把新元素插入数组开头
    this.interceptors.request.forEach(interceptor => {
      chain.unshift(interceptor);
    });

    // 添加实际请求处理器（位于链的中间）
    chain.push({
      fulfilled: dispatchRequest,
      rejected: undefined,  // 请求发送失败会进入响应拦截器的 rejected
    });

    // 收集响应拦截器（正序插入，先添加的先执行）
    // push 会把新元素插入数组末尾
    this.interceptors.response.forEach(interceptor => {
      chain.push(interceptor);
    });

    // ========== 第四步：执行链 ==========
    // 从 Promise.resolve(config) 开始，依次执行链中的每个节点
    let promise = Promise.resolve(mergedConfig);
    
    for (const { fulfilled, rejected } of chain) {
      // then(onFulfilled, onRejected) 会返回新的 Promise
      // 形成链式调用
      promise = promise.then(fulfilled as any, rejected);
    }

    return promise as Promise<AxiosResponse<T>>;
  }
}
```

### Promise 链的工作原理

让我们深入理解这段代码：

```typescript
let promise = Promise.resolve(mergedConfig);

for (const { fulfilled, rejected } of chain) {
  promise = promise.then(fulfilled, rejected);
}
```

**展开后等价于**：

```typescript
Promise.resolve(config)
  .then(requestInterceptor2.fulfilled, requestInterceptor2.rejected)
  .then(requestInterceptor1.fulfilled, requestInterceptor1.rejected)
  .then(dispatchRequest, undefined)
  .then(responseInterceptor1.fulfilled, responseInterceptor1.rejected)
  .then(responseInterceptor2.fulfilled, responseInterceptor2.rejected)
```

**数据流向**：

```
config ─────────────────────────────────────────────────────▶ response
   │                                                              ▲
   ▼                                                              │
reqInterceptor2 → reqInterceptor1 → dispatchRequest → resInterceptor1 → resInterceptor2
   │                    │                 │                 │              │
   │ 修改 config        │ 修改 config     │ 发送请求        │ 修改 response │ 修改 response
   ▼                    ▼                 ▼                 ▼              ▼
config'           config''           response           response'      response''
```
```

## 理解执行链的构建

假设有这些拦截器：

```typescript
axios.interceptors.request.use(req1, err1);  // 先添加
axios.interceptors.request.use(req2, err2);  // 后添加

axios.interceptors.response.use(res1, err1);
axios.interceptors.response.use(res2, err2);
```

**构建过程**：

```javascript
// 初始 chain 为空数组
chain = [];

// 添加请求拦截器（unshift，从头部插入）
chain.unshift({ fulfilled: req1, rejected: err1 });
// chain = [req1]

chain.unshift({ fulfilled: req2, rejected: err2 });
// chain = [req2, req1]  ← 后添加的在前面

// 添加 dispatchRequest
chain.push({ fulfilled: dispatchRequest });
// chain = [req2, req1, dispatchRequest]

// 添加响应拦截器（push，从尾部插入）
chain.push({ fulfilled: res1, rejected: err1 });
// chain = [req2, req1, dispatchRequest, res1]

chain.push({ fulfilled: res2, rejected: err2 });
// chain = [req2, req1, dispatchRequest, res1, res2]  ← 先添加的在前面
```

**最终执行顺序**：

```
config → req2 → req1 → dispatchRequest → res1 → res2 → response
         后添加    先添加                   先添加    后添加
```

## 错误传播机制

理解错误在拦截器链中如何传播非常重要：

```typescript
axios.interceptors.request.use(
  config => {
    throw new Error('Request interceptor error');
  },
  error => {
    // ❌ 不会执行！
    // 因为错误是自己抛出的，不是上游传来的
  }
);

axios.interceptors.response.use(
  response => response,
  error => {
    // ✅ 会执行！
    // 请求拦截器的错误会传播到这里
    console.log('Caught in response interceptor:', error);
    return Promise.reject(error);  // 继续传播错误
  }
);
```

**错误传播流程图**：

```
正常流程（实线）：
config ──▶ req2 ──▶ req1 ──▶ dispatch ──▶ res1 ──▶ res2 ──▶ response

错误流程（虚线）：
config ──▶ req2 ──✕ 抛出错误
              ┆
              ┆ 跳过后续的 fulfilled
              ┆
              ▼
           res1.rejected ──▶ res2.rejected ──▶ 最终 catch
```

**错误恢复**：

拦截器的 `rejected` 处理函数可以"恢复"错误：

```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'NETWORK_ERROR') {
      // 返回一个默认响应，而不是继续抛出错误
      return { data: null, status: 0, statusText: 'Offline' };
    }
    return Promise.reject(error);
  }
);
```

## 处理 runWhen 条件

某些拦截器只需要在特定条件下执行。`runWhen` 选项提供了这个能力：

```typescript
// 只对非 GET 请求添加 CSRF Token
// GET 请求不需要 CSRF 保护，添加反而浪费带宽
axios.interceptors.request.use(
  config => {
    config.headers['X-CSRF-Token'] = getCsrfToken();
    return config;
  },
  undefined,
  { 
    runWhen: config => config.method?.toLowerCase() !== 'get' 
  }
);

// 只对 API 请求添加认证头
axios.interceptors.request.use(
  config => {
    config.headers['Authorization'] = getToken();
    return config;
  },
  undefined,
  {
    runWhen: config => config.url?.startsWith('/api/')
  }
);
```

**为什么需要 runWhen？**

没有 `runWhen` 时，你需要在拦截器内部判断：

```typescript
// 不优雅的方式
axios.interceptors.request.use(config => {
  if (config.method !== 'get') {
    config.headers['X-CSRF-Token'] = getCsrfToken();
  }
  return config;
});
```

使用 `runWhen` 的优势：
1. 关注点分离：条件判断和处理逻辑分开
2. 性能优化：不满足条件的拦截器根本不会被调用
3. 更清晰：一眼就能看出拦截器的适用范围

更新执行逻辑以支持 `runWhen`：

```typescript
// src/core/Axios.ts

request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const mergedConfig = mergeConfig(this.defaults, config);
  
  // 过滤请求拦截器：只保留满足 runWhen 条件的
  const requestInterceptors: AxiosInterceptorHandler<AxiosRequestConfig>[] = [];
  this.interceptors.request.forEach(interceptor => {
    // runWhen 不存在 或者 runWhen(config) 返回 true 才执行
    if (!interceptor.runWhen || interceptor.runWhen(mergedConfig)) {
      requestInterceptors.unshift(interceptor);
    }
  });

  // 收集响应拦截器（响应拦截器通常不需要 runWhen）
  const responseInterceptors: AxiosInterceptorHandler<AxiosResponse>[] = [];
  this.interceptors.response.forEach(interceptor => {
    responseInterceptors.push(interceptor);
  });

  // 构建并执行链
  const chain = [
    ...requestInterceptors,
    { fulfilled: dispatchRequest },
    ...responseInterceptors,
  ];

  let promise = Promise.resolve(mergedConfig);
  
  for (const { fulfilled, rejected } of chain) {
    promise = promise.then(fulfilled as any, rejected);
  }

  return promise as Promise<AxiosResponse<T>>;
}
```
```

## 同步拦截器优化

默认情况下，所有拦截器都通过 Promise 链异步执行。但这会引入不必要的微任务延迟。

**问题场景**：

```typescript
// 这个拦截器只是同步地修改 config
axios.interceptors.request.use(config => {
  config.headers['X-Request-Time'] = Date.now();
  return config;  // 同步返回
});

// 但它仍然会创建一个微任务，因为用了 Promise.then()
```

**性能影响**：

每个 `.then()` 调用都会创建一个微任务，延迟执行。如果有 10 个请求拦截器，就有 10 次微任务切换。在高频请求场景下，这会影响性能。

**解决方案**：使用 `synchronous: true` 标记同步拦截器：

```typescript
axios.interceptors.request.use(
  config => {
    // 纯同步操作
    config.headers['X-Request-Time'] = Date.now();
    return config;
  },
  undefined,
  { synchronous: true }  // 标记为同步
);
```

优化实现：

```typescript
// src/core/Axios.ts

request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const mergedConfig = mergeConfig(this.defaults, config);

  // 收集拦截器并检查是否都是同步的
  const requestInterceptors: AxiosInterceptorHandler<AxiosRequestConfig>[] = [];
  let synchronousRequestInterceptors = true;  // 假设都是同步的
  
  this.interceptors.request.forEach(interceptor => {
    if (!interceptor.runWhen || interceptor.runWhen(mergedConfig)) {
      // 只要有一个不是同步的，就用异步模式
      synchronousRequestInterceptors = 
        synchronousRequestInterceptors && !!interceptor.synchronous;
      requestInterceptors.unshift(interceptor);
    }
  });

  const responseInterceptors: AxiosInterceptorHandler<AxiosResponse>[] = [];
  this.interceptors.response.forEach(interceptor => {
    responseInterceptors.push(interceptor);
  });

  // ========== 同步模式 ==========
  // 如果所有请求拦截器都是同步的，直接同步执行
  if (synchronousRequestInterceptors) {
    let newConfig = mergedConfig;
    
    // 同步执行请求拦截器（没有 Promise 包装）
    for (const { fulfilled, rejected } of requestInterceptors) {
      try {
        if (fulfilled) {
          newConfig = fulfilled(newConfig);  // 直接调用，不用 .then()
        }
      } catch (error) {
        if (rejected) {
          rejected(error);
        }
        throw error;  // 同步抛出错误
      }
    }

    // 发送请求（这里开始是异步的）
    let promise = dispatchRequest(newConfig);
    
    // 响应拦截器还是异步执行
    for (const { fulfilled, rejected } of responseInterceptors) {
      promise = promise.then(fulfilled, rejected);
    }

    return promise;
  }

  // ========== 异步模式（默认）==========
  const chain = [
    ...requestInterceptors,
    { fulfilled: dispatchRequest },
    ...responseInterceptors,
  ];

  let promise = Promise.resolve(mergedConfig);
  
  for (const { fulfilled, rejected } of chain) {
    promise = promise.then(fulfilled as any, rejected);
  }

  return promise as Promise<AxiosResponse<T>>;
}
```

### 同步 vs 异步模式对比

```
异步模式（默认）：
─────────────────────────────────────────────────────────────
主线程 │ Promise.resolve(config)
       │           ↓
微任务 │    req1.fulfilled ──▶ req2.fulfilled ──▶ dispatch
       │                                              ↓
微任务 │                                    res1 ──▶ res2
─────────────────────────────────────────────────────────────

同步模式：
─────────────────────────────────────────────────────────────
主线程 │ req1(config) → req2(config) → dispatch
       │                                    ↓
微任务 │                           res1 ──▶ res2
─────────────────────────────────────────────────────────────
```

同步模式减少了请求拦截器阶段的微任务切换，响应更快。
```

## 常见使用模式

### 模式1：添加认证 Token

```typescript
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 模式2：统一错误处理

```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

### 模式3：请求重试

使用拦截器实现自动重试机制：

```typescript
axios.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    // 只在满足条件时重试
    // 1. 是 401 错误（token 过期）
    // 2. 还没有重试过（避免无限循环）
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;  // 标记已重试
      
      // 刷新 token
      await refreshToken();
      
      // 用新 token 重新请求
      return axios(config);
    }
    
    return Promise.reject(error);
  }
);
```

**重试机制详解**：

```
首次请求 ──▶ 401 ──▶ refreshToken ──▶ 重新请求 ──▶ 200 ──▶ 成功
                          ↓
                    如果刷新失败
                          ↓
                    抛出错误，跳转登录页
```

**更完善的重试策略**：

```typescript
// 创建一个带重试次数的拦截器
function createRetryInterceptor(maxRetries = 3) {
  return async (error: AxiosError) => {
    const config = error.config as any;
    config._retryCount = config._retryCount || 0;
    
    // 只对网络错误和 5xx 错误重试
    const shouldRetry = 
      (error.code === 'ERR_NETWORK' || error.response?.status >= 500) &&
      config._retryCount < maxRetries;
    
    if (shouldRetry) {
      config._retryCount++;
      
      // 指数退避：1s, 2s, 4s...
      const delay = Math.pow(2, config._retryCount - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying request (${config._retryCount}/${maxRetries})`);
      return axios(config);
    }
    
    return Promise.reject(error);
  };
}

axios.interceptors.response.use(null, createRetryInterceptor(3));
```
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Axios } from '../src/core/Axios';

describe('Interceptor Chain', () => {
  it('should execute request interceptors in reverse order', async () => {
    const axios = new Axios();
    const order: number[] = [];
    
    axios.interceptors.request.use(config => {
      order.push(1);
      return config;
    });
    axios.interceptors.request.use(config => {
      order.push(2);
      return config;
    });

    // 模拟适配器
    axios.defaults.adapter = async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await axios.request({ url: '/test' });
    
    expect(order).toEqual([2, 1]);  // 后添加的先执行
  });

  it('should execute response interceptors in order', async () => {
    const axios = new Axios();
    const order: number[] = [];
    
    axios.interceptors.response.use(response => {
      order.push(1);
      return response;
    });
    axios.interceptors.response.use(response => {
      order.push(2);
      return response;
    });

    axios.defaults.adapter = async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await axios.request({ url: '/test' });
    
    expect(order).toEqual([1, 2]);  // 先添加的先执行
  });

  it('should pass modified config through chain', async () => {
    const axios = new Axios();
    
    axios.interceptors.request.use(config => {
      config.headers = { ...config.headers, 'X-First': '1' };
      return config;
    });
    axios.interceptors.request.use(config => {
      config.headers = { ...config.headers, 'X-Second': '2' };
      return config;
    });

    let capturedConfig: any;
    axios.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await axios.request({ url: '/test' });
    
    expect(capturedConfig.headers['X-First']).toBe('1');
    expect(capturedConfig.headers['X-Second']).toBe('2');
  });

  it('should skip interceptor when runWhen returns false', async () => {
    const axios = new Axios();
    const fn = vi.fn(config => config);
    
    axios.interceptors.request.use(fn, undefined, {
      runWhen: config => config.method === 'post',
    });

    axios.defaults.adapter = async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await axios.request({ url: '/test', method: 'get' });
    
    expect(fn).not.toHaveBeenCalled();
  });
});
```

## 小结

### 拦截器链的关键点

| 特性 | 说明 |
|------|------|
| **请求拦截器顺序** | 后添加先执行（unshift 实现） |
| **响应拦截器顺序** | 先添加先执行（push 实现） |
| **Promise 链** | 通过 `.then()` 串联所有拦截器 |
| **条件执行** | `runWhen` 过滤特定请求 |
| **同步模式** | `synchronous` 跳过 Promise 包装，减少微任务 |

### 执行流程总结

```
Promise.resolve(config)
  .then(requestInterceptor2)   // 后添加的先执行
  .then(requestInterceptor1)
  .then(dispatchRequest)       // 发送实际请求
  .then(responseInterceptor1)  // 先添加的先执行
  .then(responseInterceptor2)
  .then(result => ...)         // 用户代码
  .catch(error => ...)
```

### 常见问题解答

**Q: 拦截器可以是异步函数吗？**

A: 可以！拦截器返回 Promise 时，链会等待它 resolve：

```typescript
axios.interceptors.request.use(async config => {
  const token = await getTokenFromStorage();
  config.headers.Authorization = token;
  return config;
});
```

**Q: 如何移除特定的拦截器？**

A: `use()` 方法返回一个 ID，用这个 ID 可以移除：

```typescript
const interceptorId = axios.interceptors.request.use(...);
axios.interceptors.request.eject(interceptorId);
```

**Q: 拦截器中如何取消请求？**

A: 返回一个 rejected 的 Promise 或抛出错误：

```typescript
axios.interceptors.request.use(config => {
  if (shouldCancel(config)) {
    return Promise.reject(new Error('Request cancelled by interceptor'));
  }
  return config;
});
```

下一节我们用拦截器实现请求重试等高级功能。
