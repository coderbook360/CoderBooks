# 创建实例与实例隔离

在大型应用中，我们经常需要多个 Axios 实例，每个实例有独立的配置和拦截器。这种隔离机制是企业级应用的必备能力。

## 本节目标

通过本节学习，你将掌握：

1. **理解实例隔离**：为什么需要多实例，以及如何实现配置/拦截器隔离
2. **实现 create 方法**：`axios.create()` 的完整实现
3. **配置继承机制**：全局默认 → 实例默认 → 请求级的合并流程
4. **工厂模式应用**：使用工厂函数管理多个 API 实例

## 为什么需要多实例？

典型场景说明了为什么需要独立实例：

| 场景 | 问题 | 解决方案 |
|------|------|----------|
| 多后端服务 | 不同服务有不同的 baseURL | 每个服务一个实例 |
| 不同超时设置 | 上传需要长超时，查询需要短超时 | 按功能分实例 |
| 不同认证方式 | 内部服务用 Token，第三方用 API Key | 按认证方式分实例 |
| 隔离拦截器 | 不同服务需要不同的日志/错误处理 | 每个实例独立拦截器 |

```typescript
// ========== 场景1: 主应用 API ==========
// 大多数请求使用这个实例
const appApi = axios.create({
  baseURL: 'https://api.myapp.com',
  timeout: 5000,  // 5秒超时足够
});

// ========== 场景2: 上传服务 ==========
// 大文件上传需要更长超时
const uploadApi = axios.create({
  baseURL: 'https://upload.myapp.com',
  timeout: 60000,  // 60秒超时
});

// ========== 场景3: 第三方服务 ==========
// 使用不同的认证方式
const thirdPartyApi = axios.create({
  baseURL: 'https://api.thirdparty.com',
  headers: { 'X-API-Key': 'xxx' },  // API Key 认证
});

// 每个实例可以有独立的拦截器
appApi.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  return config;
});

thirdPartyApi.interceptors.response.use(
  response => response,
  error => {
    // 第三方 API 专用的错误处理
    logToAnalytics('third-party-error', error);
    return Promise.reject(error);
  }
);
```

## axios.create 实现

`axios.create()` 是创建独立实例的核心方法。它的实现需要：
1. 创建新的 Axios 实例
2. 保持"双重身份"（既是函数又是对象）
3. 合并默认配置和用户配置

```typescript
// src/axios.ts

import { Axios } from './core/Axios';
import { AxiosInstance, AxiosRequestConfig, AxiosStatic } from './types';
import { mergeConfig } from './core/mergeConfig';
import { defaults } from './defaults';

/**
 * 创建 Axios 实例的核心工厂函数
 * 实现了 axios 的"双重身份"：既可以作为函数调用，又有对象的方法和属性
 * 
 * @param config - 实例的默认配置
 * @returns 具有完整功能的 axios 实例
 */
function createInstance(config: AxiosRequestConfig = {}): AxiosInstance {
  // Step 1: 创建 Axios 类实例作为上下文
  // 这个实例包含 defaults 和 interceptors
  const context = new Axios(config);
  
  // Step 2: 创建一个绑定了 context 的 request 函数
  // 这使得 axios('/url') 这种函数调用成为可能
  const instance = Axios.prototype.request.bind(context);
  
  // Step 3: 复制 Axios.prototype 上的方法到 instance
  // 包括 get, post, put, delete 等方法别名
  Object.getOwnPropertyNames(Axios.prototype).forEach(method => {
    if (method !== 'constructor') {
      (instance as any)[method] = (Axios.prototype as any)[method].bind(context);
    }
  });
  
  // Step 4: 复制 context 的属性到 instance
  // 包括 defaults 和 interceptors
  Object.assign(instance, context);
  
  return instance as AxiosInstance;
}

// ========== 创建默认实例 ==========
// 大多数用户直接使用这个默认实例
const axios = createInstance(defaults) as AxiosStatic;

// ========== 添加 create 方法 ==========
// 允许用户创建独立的实例
axios.create = function create(config?: AxiosRequestConfig): AxiosInstance {
  // 合并全局默认配置和用户配置
  return createInstance(mergeConfig(defaults, config || {}));
};

// ========== 导出其他工具 ==========
axios.CancelToken = CancelToken;  // 取消令牌类
axios.Cancel = Cancel;            // 取消错误类
axios.isCancel = isCancel;        // 判断是否是取消错误
axios.isAxiosError = isAxiosError; // 判断是否是 axios 错误
axios.all = Promise.all.bind(Promise);  // 并发请求
axios.spread = spread;            // 展开响应数组
axios.Axios = Axios;              // 暴露 Axios 类

export default axios;
```

## 实例隔离的实现细节

实例隔离的核心是：每个实例都有自己独立的 `defaults` 和 `interceptors`，不会互相影响：

```typescript
/**
 * Axios 类 - 核心请求类
 * 每个实例都拥有独立的配置和拦截器
 */
export class Axios {
  // 实例级默认配置，独立于其他实例
  defaults: AxiosDefaults;
  
  // 实例级拦截器管理器，独立于其他实例
  interceptors: {
    request: InterceptorManager<AxiosRequestConfig>;
    response: InterceptorManager<AxiosResponse>;
  };

  constructor(instanceConfig: AxiosRequestConfig = {}) {
    // ========== 关键：每个实例创建新的 defaults 对象 ==========
    // 使用 mergeConfig 深度合并，确保嵌套对象也是独立的
    this.defaults = mergeConfig(getDefaultConfig(), instanceConfig) as AxiosDefaults;
    
    // ========== 关键：每个实例创建新的拦截器管理器 ==========
    // InterceptorManager 内部维护独立的处理器数组
    this.interceptors = {
      request: new InterceptorManager<AxiosRequestConfig>(),
      response: new InterceptorManager<AxiosResponse>(),
    };
  }
}
```

### 实例隔离示意图

```
┌─────────────────────────────────────────────────────────────┐
│                     axios（默认实例）                        │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │     defaults    │  │         interceptors            │  │
│  │  baseURL: ''    │  │  request: [globalAuthHandler]   │  │
│  │  timeout: 0     │  │  response: [globalErrorHandler] │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                apiA = axios.create({...})                   │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │     defaults    │  │         interceptors            │  │
│  │  baseURL: '/a'  │  │  request: [apiAAuthHandler]     │  │
│  │  timeout: 5000  │  │  response: []                   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                apiB = axios.create({...})                   │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │     defaults    │  │         interceptors            │  │
│  │  baseURL: '/b'  │  │  request: []                    │  │
│  │  timeout: 10000 │  │  response: [apiBRetryHandler]   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

三个实例完全独立，互不影响！
```

## 配置继承关系

配置在多个层级之间流动，优先级从低到高：

```
┌─────────────────────────────────────┐
│         全局默认配置                 │  ← 最低优先级
│   (src/defaults.ts 中定义)          │
│   method: 'GET', timeout: 0 ...     │
└─────────────────────────────────────┘
              │
              ▼ axios.create() 时合并
┌─────────────────────────────────────┐
│         实例默认配置                 │  ← 中等优先级
│   axios.create({ baseURL, timeout }) │
│   继承全局 + 覆盖特定配置            │
└─────────────────────────────────────┘
              │
              ▼ 发送请求时合并
┌─────────────────────────────────────┐
│         请求级配置                   │  ← 最高优先级
│   api.get('/users', { timeout })    │
│   可以覆盖任何默认配置               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         最终请求配置                 │
│   传递给适配器执行实际请求           │
└─────────────────────────────────────┘
```

### 实现代码

```typescript
// ========== 创建实例时合并全局配置 ==========
axios.create = function(config) {
  // 全局 defaults + 用户 config
  return createInstance(mergeConfig(axios.defaults, config));
};

// ========== 发送请求时合并实例配置 ==========
class Axios {
  request(config) {
    // 实例 defaults + 请求 config
    const mergedConfig = mergeConfig(this.defaults, config);
    // 继续处理请求...
  }
}
```

## 修改实例配置

实例创建后，仍然可以动态修改其默认配置：

```typescript
const api = axios.create({
  baseURL: 'https://api.example.com',
});

// ========== 动态修改实例配置 ==========

// 场景1: 用户登录后添加认证头
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 场景2: 根据网络状况调整超时
api.defaults.timeout = navigator.connection?.effectiveType === '4g' ? 5000 : 15000;

// 场景3: 切换环境
api.defaults.baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com'
  : 'https://dev-api.example.com';

// ========== 添加实例级拦截器 ==========
api.interceptors.request.use(config => {
  console.log('Request to:', config.url);
  return config;
});

// 注意：全局 axios 实例不受影响
console.log(axios.defaults.baseURL);  // undefined
```

## 实例不互相影响

验证实例隔离的效果——每个实例的配置和拦截器都是独立的：

```typescript
// ========== 创建两个独立实例 ==========
const api1 = axios.create({ timeout: 1000 });
const api2 = axios.create({ timeout: 5000 });

// ========== 为 api1 添加拦截器 ==========
api1.interceptors.request.use(config => {
  console.log('API1 interceptor triggered');
  return config;
});

// ========== 测试隔离效果 ==========
api1.get('/test');  // 输出: "API1 interceptor triggered"
api2.get('/test');  // 无输出 - api2 没有这个拦截器！

// ========== 配置也是隔离的 ==========
console.log(api1.defaults.timeout);  // 1000
console.log(api2.defaults.timeout);  // 5000

// 修改 api1 不影响 api2
api1.defaults.timeout = 2000;
console.log(api1.defaults.timeout);  // 2000
console.log(api2.defaults.timeout);  // 5000（不变）
```

## 实例工厂模式

在大型项目中，推荐使用工厂模式来统一管理多个 API 实例。这样可以：
- 集中管理实例配置
- 避免重复创建相同实例
- 统一添加通用拦截器
- 方便测试时 mock

```typescript
// api/factory.ts

interface ServiceConfig {
  /** 服务名称，用于日志和缓存 key */
  name: string;
  /** 服务的基础 URL */
  baseURL: string;
  /** 超时时间，默认 10 秒 */
  timeout?: number;
  /** 是否需要认证，默认 true */
  withAuth?: boolean;
}

// 缓存已创建的实例，避免重复创建
const services: Map<string, AxiosInstance> = new Map();

/**
 * 创建或获取 API 服务实例
 * 使用单例模式，相同 name 返回同一实例
 */
export function createService(config: ServiceConfig): AxiosInstance {
  const { name, baseURL, timeout = 10000, withAuth = true } = config;
  
  // ========== 单例检查 ==========
  // 如果实例已存在，直接返回
  if (services.has(name)) {
    return services.get(name)!;
  }
  
  // ========== 创建新实例 ==========
  const instance = axios.create({
    baseURL,
    timeout,
  });
  
  // ========== 条件性添加认证拦截器 ==========
  if (withAuth) {
    instance.interceptors.request.use(config => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  
  // ========== 统一错误处理 ==========
  instance.interceptors.response.use(
    response => response,
    error => {
      // 错误日志包含服务名称，方便定位问题
      console.error(`[${name}] Request failed:`, error.message);
      return Promise.reject(error);
    }
  );
  
  // ========== 缓存实例 ==========
  services.set(name, instance);
  
  return instance;
}

// ========== 预定义的 API 服务 ==========

export const userApi = createService({
  name: 'user',
  baseURL: 'https://user.api.com',
});

export const orderApi = createService({
  name: 'order',
  baseURL: 'https://order.api.com',
  timeout: 30000,
});

export const analyticsApi = createService({
  name: 'analytics',
  baseURL: 'https://analytics.api.com',
  withAuth: false,
});
```

## 测试

为实例创建和隔离编写完整的测试用例：

```typescript
import { describe, it, expect, vi } from 'vitest';
import axios from '../src/axios';

describe('axios.create', () => {
  // ========== 配置独立性测试 ==========
  
  it('should create independent instance with own config', () => {
    // 创建两个实例，配置不同
    const instance1 = axios.create({ timeout: 1000 });
    const instance2 = axios.create({ timeout: 2000 });

    // 验证各自保持独立配置
    expect(instance1.defaults.timeout).toBe(1000);
    expect(instance2.defaults.timeout).toBe(2000);
  });

  // ========== 拦截器独立性测试 ==========
  
  it('should not share interceptors between instances', () => {
    const instance1 = axios.create();
    const instance2 = axios.create();
    
    // 为 instance1 添加拦截器
    const interceptorFn = vi.fn(config => config);
    instance1.interceptors.request.use(interceptorFn);

    // 设置 mock 适配器
    const mockAdapter = async (config: any) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
    instance1.defaults.adapter = mockAdapter;
    instance2.defaults.adapter = mockAdapter;

    // instance2 的请求不应触发 instance1 的拦截器
    instance2.get('/test');
    
    expect(interceptorFn).not.toHaveBeenCalled();
  });

  // ========== 配置继承测试 ==========
  
  it('should inherit default config from global defaults', () => {
    const instance = axios.create({
      baseURL: 'https://api.example.com',
    });

    // 用户配置生效
    expect(instance.defaults.baseURL).toBe('https://api.example.com');
    
    // 同时继承了全局默认配置
    expect(instance.defaults.headers.common['Accept']).toBeDefined();
  });

  // ========== 实例修改不影响全局测试 ==========
  
  it('should allow modifying instance defaults without affecting global', () => {
    const instance = axios.create();
    
    // 修改实例配置
    instance.defaults.baseURL = 'https://new.api.com';
    
    // 实例配置已更新
    expect(instance.defaults.baseURL).toBe('https://new.api.com');
    
    // 全局实例不受影响
    expect(axios.defaults.baseURL).toBeUndefined();
  });
});
```

## 常见问题解答

### Q1: create 创建的实例和全局 axios 有什么区别？

功能完全相同。区别在于实例的 defaults 和 interceptors 是独立的，修改不会影响全局或其他实例。

### Q2: 什么时候用 create，什么时候直接用全局 axios？

| 场景 | 推荐方式 |
|------|----------|
| 简单项目，单一后端 | 直接用全局 axios |
| 多后端服务 | 每个服务一个实例 |
| 需要不同认证方式 | 按认证方式分实例 |
| 微前端/组件库 | 必须用独立实例，避免污染 |

### Q3: 实例创建后还能修改全局默认配置吗？

可以，但已创建的实例不会受影响（因为配置是在 create 时合并的）。

```typescript
const api = axios.create();  // 此时合并当前的 defaults
axios.defaults.timeout = 5000;  // 修改全局
console.log(api.defaults.timeout);  // 0（不变）
```

### Q4: 如何让多个实例共享某些拦截器？

创建一个工具函数，在创建实例时统一添加：

```typescript
function addCommonInterceptors(instance) {
  instance.interceptors.request.use(commonAuthHandler);
  instance.interceptors.response.use(null, commonErrorHandler);
  return instance;
}

const api = addCommonInterceptors(axios.create({ baseURL: '...' }));
```

## 小结

实例创建与隔离是大型应用的基础能力：

**核心要点**：

| 主题 | 说明 |
|------|------|
| 独立配置 | 每个实例有自己的 defaults 对象 |
| 独立拦截器 | 每个实例有自己的 InterceptorManager |
| 配置继承 | create 时继承全局 defaults |
| 配置合并 | 请求时合并实例 defaults 和请求 config |

**最佳实践**：

1. 不同后端服务使用不同实例
2. 使用工厂模式统一管理实例
3. 按需添加实例级拦截器
4. 避免频繁创建新实例（使用缓存）

下一节我们实现并发请求控制。
