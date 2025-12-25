# 请求与响应的自动重试

网络请求经常会遇到临时性故障，自动重试是提高可靠性的关键手段。本节实现一个灵活的重试机制。

## 本节目标

通过本节学习，你将：

1. 理解重试策略的设计原则
2. 实现指数退避算法
3. 构建可配置的重试拦截器
4. 处理各种重试边界情况

## 为什么需要自动重试？

网络请求失败的原因多种多样：

- **暂时性故障**：网络抖动、服务器过载
- **速率限制**：API 返回 429 Too Many Requests
- **服务重启**：短暂的 503 Service Unavailable

对于这些情况，简单地重试往往就能成功。

## 重试策略设计

### 配置接口

```typescript
// src/types/retry.ts

export interface RetryConfig {
  /** 最大重试次数，默认 3 */
  retries?: number;
  
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  
  /** 是否使用指数退避，默认 true */
  exponentialBackoff?: boolean;
  
  /** 指数退避基数，默认 2 */
  backoffFactor?: number;
  
  /** 最大延迟时间（毫秒），默认 30000 */
  maxDelay?: number;
  
  /** 延迟抖动范围（0-1），默认 0.2 */
  jitter?: number;
  
  /** 判断是否应该重试 */
  retryCondition?: (error: AxiosError) => boolean;
  
  /** 判断响应是否应该重试 */
  retryOnResponse?: (response: AxiosResponse) => boolean;
  
  /** 重试前的回调 */
  onRetry?: (retryCount: number, error: AxiosError, config: AxiosRequestConfig) => void;
}
```

### 默认重试条件

```typescript
// 默认只重试网络错误和幂等请求
export function defaultRetryCondition(error: AxiosError): boolean {
  // 网络错误
  if (!error.response) {
    return true;
  }
  
  // 可重试的状态码
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ];
  
  if (retryableStatusCodes.includes(error.response.status)) {
    // 只重试幂等方法
    const method = error.config?.method?.toUpperCase();
    const idempotentMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
    return idempotentMethods.includes(method || '');
  }
  
  return false;
}
```

## 指数退避算法

### 基本原理

```
重试次数:  1      2      3      4      5
延迟时间:  1s     2s     4s     8s     16s
          ↑      ↑      ↑      ↑      ↑
        基础   2倍    4倍    8倍    16倍
```

### 实现

```typescript
// src/utils/retry.ts

export function calculateDelay(
  retryCount: number,
  config: Required<RetryConfig>
): number {
  let delay = config.retryDelay;
  
  if (config.exponentialBackoff) {
    // 指数退避：delay * factor^retryCount
    delay = delay * Math.pow(config.backoffFactor, retryCount - 1);
  }
  
  // 添加抖动，避免惊群效应
  if (config.jitter > 0) {
    const jitterRange = delay * config.jitter;
    const jitterOffset = Math.random() * jitterRange * 2 - jitterRange;
    delay = delay + jitterOffset;
  }
  
  // 确保不超过最大延迟
  return Math.min(delay, config.maxDelay);
}
```

### 抖动的重要性

```typescript
// 无抖动：所有失败的请求同时重试，可能再次压垮服务器
// 时间线：
// 请求1: [失败] --1s--> [重试，失败] --2s--> [重试]
// 请求2: [失败] --1s--> [重试，失败] --2s--> [重试]
// 请求3: [失败] --1s--> [重试，失败] --2s--> [重试]
//        ↑              ↑                    ↑
//        同时发         同时重试             同时重试

// 有抖动：重试时间分散，减轻服务器压力
// 请求1: [失败] --0.8s--> [重试]
// 请求2: [失败] --1.1s--> [重试]
// 请求3: [失败] --0.9s--> [重试]
```

## 重试拦截器实现

### 响应拦截器方式

```typescript
// src/interceptors/retry.ts

import { AxiosInstance, AxiosError, AxiosRequestConfig } from '../types';

const DEFAULT_CONFIG: Required<RetryConfig> = {
  retries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  backoffFactor: 2,
  maxDelay: 30000,
  jitter: 0.2,
  retryCondition: defaultRetryCondition,
  retryOnResponse: () => false,
  onRetry: () => {}
};

export function setupRetryInterceptor(
  instance: AxiosInstance,
  globalConfig: RetryConfig = {}
): void {
  instance.interceptors.response.use(
    // 成功响应，检查是否需要重试
    (response) => {
      const config = mergeRetryConfig(response.config.retry, globalConfig);
      
      if (config.retryOnResponse(response)) {
        // 构造错误以触发重试逻辑
        const error = new AxiosError(
          'Retry on response',
          'RETRY_ON_RESPONSE',
          response.config,
          response.request,
          response
        );
        return handleRetry(error, instance, config);
      }
      
      return response;
    },
    // 失败响应，检查是否重试
    (error: AxiosError) => {
      const config = mergeRetryConfig(error.config?.retry, globalConfig);
      
      if (shouldRetry(error, config)) {
        return handleRetry(error, instance, config);
      }
      
      return Promise.reject(error);
    }
  );
}

function shouldRetry(
  error: AxiosError,
  config: Required<RetryConfig>
): boolean {
  const currentRetry = (error.config?.__retryCount || 0);
  
  // 已达最大重试次数
  if (currentRetry >= config.retries) {
    return false;
  }
  
  // 请求已取消
  if (error.code === 'ERR_CANCELED') {
    return false;
  }
  
  // 检查自定义条件
  return config.retryCondition(error);
}

async function handleRetry(
  error: AxiosError,
  instance: AxiosInstance,
  config: Required<RetryConfig>
): Promise<any> {
  const originalConfig = error.config!;
  const retryCount = (originalConfig.__retryCount || 0) + 1;
  
  // 更新重试计数
  originalConfig.__retryCount = retryCount;
  
  // 计算延迟
  const delay = calculateDelay(retryCount, config);
  
  // 触发回调
  config.onRetry(retryCount, error, originalConfig);
  
  // 等待延迟
  await sleep(delay);
  
  // 重新发送请求
  return instance.request(originalConfig);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mergeRetryConfig(
  requestConfig?: RetryConfig,
  globalConfig?: RetryConfig
): Required<RetryConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...globalConfig,
    ...requestConfig
  };
}
```

### 类型扩展

```typescript
// src/types/index.ts

declare module '../types' {
  interface AxiosRequestConfig {
    /** 重试配置 */
    retry?: RetryConfig;
    /** 内部使用：当前重试次数 */
    __retryCount?: number;
  }
}
```

## 使用示例

### 基本使用

```typescript
import axios from './mini-axios';
import { setupRetryInterceptor } from './interceptors/retry';

// 全局配置
setupRetryInterceptor(axios, {
  retries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});

// 发送请求，自动重试
axios.get('/api/data')
  .then(response => console.log(response.data))
  .catch(error => console.log('All retries failed:', error));
```

### 单次请求配置

```typescript
// 为特定请求配置重试
axios.get('/api/critical-data', {
  retry: {
    retries: 5,
    retryDelay: 2000,
    onRetry: (count, error) => {
      console.log(`Retry attempt ${count} for ${error.config.url}`);
    }
  }
});

// 禁用重试
axios.post('/api/payment', data, {
  retry: {
    retries: 0
  }
});
```

### 自定义重试条件

```typescript
setupRetryInterceptor(axios, {
  retryCondition: (error) => {
    // 只重试特定错误
    if (error.code === 'ECONNABORTED') {
      return true; // 超时重试
    }
    
    if (error.response?.status === 429) {
      return true; // 速率限制重试
    }
    
    return false;
  },
  
  retryOnResponse: (response) => {
    // 某些 API 返回 200 但业务失败
    return response.data?.code === 'TEMPORARY_ERROR';
  }
});
```

### 处理 Retry-After 头

```typescript
function calculateDelayWithRetryAfter(
  error: AxiosError,
  config: Required<RetryConfig>
): number {
  const retryAfter = error.response?.headers?.['retry-after'];
  
  if (retryAfter) {
    // Retry-After 可能是秒数
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
    
    // 或者是日期
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }
  }
  
  // 使用默认计算
  return calculateDelay(
    error.config?.__retryCount || 1,
    config
  );
}
```

## 高级功能

### 重试统计

```typescript
interface RetryStats {
  totalRequests: number;
  successOnFirst: number;
  successAfterRetry: number;
  failedAfterRetries: number;
  totalRetries: number;
}

const stats: RetryStats = {
  totalRequests: 0,
  successOnFirst: 0,
  successAfterRetry: 0,
  failedAfterRetries: 0,
  totalRetries: 0
};

setupRetryInterceptor(axios, {
  onRetry: (count) => {
    stats.totalRetries++;
  }
});

axios.interceptors.response.use(
  (response) => {
    stats.totalRequests++;
    if (response.config.__retryCount) {
      stats.successAfterRetry++;
    } else {
      stats.successOnFirst++;
    }
    return response;
  },
  (error) => {
    if (error.config?.__retryCount >= error.config?.retry?.retries) {
      stats.failedAfterRetries++;
    }
    return Promise.reject(error);
  }
);

// 获取统计
function getRetryStats() {
  return {
    ...stats,
    retrySuccessRate: stats.successAfterRetry / stats.totalRetries
  };
}
```

### 断路器模式

```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreaker: Map<string, CircuitBreakerState> = new Map();

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT = 30000;

function checkCircuitBreaker(url: string): boolean {
  const state = circuitBreaker.get(url);
  
  if (!state || state.state === 'CLOSED') {
    return true; // 允许请求
  }
  
  if (state.state === 'OPEN') {
    if (Date.now() - state.lastFailureTime > RESET_TIMEOUT) {
      state.state = 'HALF_OPEN';
      return true; // 尝试恢复
    }
    return false; // 拒绝请求
  }
  
  return true; // HALF_OPEN 允许一个请求
}

function recordFailure(url: string): void {
  const state = circuitBreaker.get(url) || {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED' as const
  };
  
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'OPEN';
  }
  
  circuitBreaker.set(url, state);
}

function recordSuccess(url: string): void {
  circuitBreaker.delete(url);
}
```

## 测试

```typescript
describe('Retry Interceptor', () => {
  let mock: MockAdapter;
  
  beforeEach(() => {
    mock = new MockAdapter(axios);
  });
  
  it('should retry on network error', async () => {
    let attempts = 0;
    
    mock.onGet('/api/data').reply(() => {
      attempts++;
      if (attempts < 3) {
        return [500, { error: 'Server Error' }];
      }
      return [200, { success: true }];
    });
    
    const response = await axios.get('/api/data');
    
    expect(attempts).toBe(3);
    expect(response.data.success).toBe(true);
  });
  
  it('should respect max retries', async () => {
    mock.onGet('/api/data').reply(500);
    
    await expect(
      axios.get('/api/data', { retry: { retries: 2 } })
    ).rejects.toThrow();
  });
});
```

## 小结

本节我们实现了一个功能完整的重试机制：

1. **可配置策略**：重试次数、延迟、条件
2. **指数退避**：避免服务器过载
3. **抖动机制**：分散重试请求
4. **状态追踪**：统计和监控
5. **断路器**：防止级联故障

重试机制是提高应用可靠性的重要手段，但要注意不是所有请求都适合重试，非幂等操作（如支付）需要特别小心。
