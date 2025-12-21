# 用拦截器实现请求重试

拦截器的强大之处在于可以构建复杂的请求处理逻辑。这一节我们实现请求重试功能。

## 为什么需要请求重试？

网络请求可能因为各种原因失败：

- 网络抖动
- 服务器临时过载（5xx）
- Token 过期（401）
- 请求超时

自动重试可以提升用户体验，减少手动干预。

## 基础重试实现

```typescript
// 创建重试拦截器
function createRetryInterceptor(options: {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}) {
  const {
    retries = 3,
    retryDelay = 1000,
    retryCondition = (error) => {
      // 默认只重试网络错误和 5xx 错误
      return !error.response || (error.response.status >= 500);
    },
  } = options;

  return async (error: AxiosError) => {
    const config = error.config;
    
    if (!config) {
      return Promise.reject(error);
    }

    // 初始化重试计数
    config.__retryCount = config.__retryCount || 0;

    // 检查是否应该重试
    if (config.__retryCount >= retries || !retryCondition(error)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    console.log(`Retrying request (${config.__retryCount}/${retries})...`);

    // 延迟后重试
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    // 重新发送请求
    return axios(config);
  };
}

// 使用
axios.interceptors.response.use(
  response => response,
  createRetryInterceptor({ retries: 3, retryDelay: 1000 })
);
```

## 指数退避

多次重试时，延迟时间应该递增，避免频繁请求：

```typescript
function createRetryInterceptor(options: RetryOptions) {
  const {
    retries = 3,
    retryDelay = 1000,
    useExponentialBackoff = true,
    maxDelay = 30000,
    retryCondition,
  } = options;

  return async (error: AxiosError) => {
    const config = error.config;
    
    if (!config) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount >= retries || !shouldRetry(error, retryCondition)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;

    // 计算延迟时间
    let delay = retryDelay;
    if (useExponentialBackoff) {
      // 指数退避：1s, 2s, 4s, 8s...
      delay = Math.min(
        retryDelay * Math.pow(2, config.__retryCount - 1),
        maxDelay
      );
      // 添加抖动，避免同时重试造成雪崩
      delay = delay * (0.5 + Math.random());
    }

    console.log(
      `Retrying request (${config.__retryCount}/${retries}) after ${Math.round(delay)}ms...`
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    return axios(config);
  };
}
```

## Token 刷新与重试

常见场景：Token 过期时自动刷新并重试：

```typescript
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // 只处理 401 错误
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 如果正在刷新，将请求加入队列
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axios(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // 刷新 Token
      const { data } = await axios.post('/auth/refresh', {
        refreshToken: getRefreshToken(),
      });
      
      const newToken = data.accessToken;
      setToken(newToken);
      
      // 处理队列中的请求
      processQueue(null, newToken);
      
      // 重试原请求
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axios(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // 刷新失败，跳转登录
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
```

## 幂等性考虑

重试只适用于幂等请求（多次执行结果相同）：

```typescript
function createSafeRetryInterceptor(options: RetryOptions) {
  const { retries = 3, retryDelay = 1000 } = options;
  
  // 幂等方法
  const idempotentMethods = ['get', 'head', 'options', 'put', 'delete'];

  return async (error: AxiosError) => {
    const config = error.config;
    
    if (!config) {
      return Promise.reject(error);
    }

    // 非幂等方法不重试
    const method = config.method?.toLowerCase() || 'get';
    if (!idempotentMethods.includes(method)) {
      console.log(`Skipping retry for non-idempotent method: ${method}`);
      return Promise.reject(error);
    }

    // 检查是否可以安全重试
    // POST 请求如果有幂等键，也可以进行重试
    if (method === 'post' && !config.headers?.['Idempotency-Key']) {
      return Promise.reject(error);
    }

    // 正常重试逻辑...
    config.__retryCount = config.__retryCount || 0;
    
    if (config.__retryCount >= retries) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    return axios(config);
  };
}
```

## 封装为可复用模块

```typescript
// src/plugins/retry.ts

import { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

export interface RetryConfig {
  retries?: number;
  retryDelay?: number | ((retryCount: number) => number);
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (retryCount: number, error: AxiosError, config: AxiosRequestConfig) => void;
}

const defaultRetryCondition = (error: AxiosError): boolean => {
  // 网络错误
  if (!error.response) {
    return true;
  }
  // 5xx 服务器错误
  if (error.response.status >= 500) {
    return true;
  }
  // 超时
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  return false;
};

declare module 'axios' {
  interface AxiosRequestConfig {
    __retryCount?: number;
    retry?: RetryConfig;
  }
}

export function setupRetry(axios: AxiosInstance, globalConfig: RetryConfig = {}) {
  axios.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config;
    
    if (!config) {
      return Promise.reject(error);
    }

    // 合并全局配置和请求配置
    const retryConfig: RetryConfig = {
      ...globalConfig,
      ...config.retry,
    };

    const {
      retries = 3,
      retryDelay = 1000,
      retryCondition = defaultRetryCondition,
      onRetry,
    } = retryConfig;

    config.__retryCount = config.__retryCount || 0;

    // 检查重试条件
    if (config.__retryCount >= retries || !retryCondition(error)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;

    // 回调通知
    if (onRetry) {
      onRetry(config.__retryCount, error, config);
    }

    // 计算延迟
    const delay = typeof retryDelay === 'function'
      ? retryDelay(config.__retryCount)
      : retryDelay;

    await new Promise(resolve => setTimeout(resolve, delay));
    return axios(config);
  });
}

// 使用
setupRetry(axios, {
  retries: 3,
  retryDelay: (count) => Math.min(1000 * Math.pow(2, count - 1), 30000),
  onRetry: (count, error, config) => {
    console.log(`Retry ${count} for ${config.url}`);
  },
});

// 单个请求覆盖
axios.get('/api', {
  retry: {
    retries: 5,
    retryCondition: (error) => error.response?.status === 429,
  },
});
```

## 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { setupRetry } from '../src/plugins/retry';

describe('Retry Interceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry on network error', async () => {
    const mockAdapter = vi.fn()
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValueOnce({ data: 'success', status: 200 });

    const instance = axios.create({ adapter: mockAdapter });
    setupRetry(instance, { retries: 3, retryDelay: 100 });

    const promise = instance.get('/test');
    
    // 快进时间
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    
    const response = await promise;
    expect(response.data).toBe('success');
    expect(mockAdapter).toHaveBeenCalledTimes(3);
  });

  it('should stop after max retries', async () => {
    const error = new Error('Network Error') as AxiosError;
    const mockAdapter = vi.fn().mockRejectedValue(error);

    const instance = axios.create({ adapter: mockAdapter });
    setupRetry(instance, { retries: 2, retryDelay: 100 });

    const promise = instance.get('/test');
    
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    
    await expect(promise).rejects.toThrow();
    expect(mockAdapter).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const error = new Error('Network Error');
    const mockAdapter = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ data: 'success', status: 200 });

    const instance = axios.create({ adapter: mockAdapter });
    setupRetry(instance, { retries: 3, retryDelay: 100, onRetry });

    const promise = instance.get('/test');
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.anything(), expect.anything());
  });
});
```

## 小结

请求重试的关键点：

- **重试条件**：网络错误、5xx、超时
- **指数退避**：避免重试风暴
- **抖动**：随机延迟防止雪崩
- **幂等性**：只重试安全的请求
- **Token 刷新**：特殊处理 401

最佳实践：

1. 设置最大重试次数
2. 使用指数退避 + 抖动
3. 只重试幂等请求
4. 记录重试日志便于排查
5. 提供 onRetry 回调

至此，拦截器章节完成。下一章我们实现请求取消功能。
