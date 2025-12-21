# 实现 Axios 类与实例化

上一节我们实现了一个简单的 `request` 函数。现在，让我们把它包装成一个类，开始向真正的 Axios 靠拢。

## 本节目标

通过本节学习，你将：

1. 理解为什么 Axios 需要用类来组织代码
2. 掌握 TypeScript 类型定义的设计技巧
3. 实现 Axios 类的核心方法
4. 理解请求派发（dispatch）的设计模式

## 为什么需要类

思考一下，Axios 是怎么用的：

```typescript
// 使用默认实例
axios.get('/users');

// 创建自定义实例
const instance = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000
});
instance.get('/users');
```

这说明：

1. Axios 有一个**默认实例**，可以直接使用
2. 可以通过 `create` 方法创建**自定义实例**
3. 每个实例可以有**不同的配置**

要实现这些特性，我们需要一个类来管理实例状态。

## 定义类型

首先，完善类型定义。创建 `src/types.ts`。

在设计类型之前，思考一下我们需要描述什么：
- **请求**需要哪些配置？（URL、方法、请求头等）
- **响应**包含什么信息？（数据、状态码、响应头等）
- **Axios 实例**需要暴露哪些能力？（方法别名、默认配置等）

带着这些问题，我们来定义类型：

```typescript
// src/types.ts

export type Method = 
  | 'get' | 'GET'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'patch' | 'PATCH';

export interface AxiosRequestConfig {
  url?: string;
  method?: Method;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  responseType?: XMLHttpRequestResponseType;
}

export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
  request?: any;
}

export interface AxiosError extends Error {
  config: AxiosRequestConfig;
  code?: string;
  request?: any;
  response?: AxiosResponse;
}

export interface AxiosInstance {
  (config: AxiosRequestConfig): Promise<AxiosResponse>;
  (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
  
  defaults: AxiosRequestConfig;
  
  request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

export interface AxiosStatic extends AxiosInstance {
  create(config?: AxiosRequestConfig): AxiosInstance;
}
```

### 类型设计解析

让我们逐一理解这些类型背后的设计思想：

#### `AxiosRequestConfig` - 请求配置

```typescript
export interface AxiosRequestConfig {
  url?: string;
  method?: Method;
  baseURL?: string;
  // ...
}
```

**为什么所有字段都是可选的？**

这是一个精妙的设计。用户发起请求时可能只提供 `url`，其他配置项会从默认配置中补充。如果字段是必选的，每次请求都要写一大堆配置，用户体验会很差。

#### `AxiosResponse<T>` - 响应结构

泛型 `T` 表示响应数据的类型。这让 TypeScript 能够正确推断 `response.data` 的类型：

```typescript
// data 被推断为 User 类型
const response = await axios.get<User>('/api/user/1');
console.log(response.data.name); // TypeScript 知道 data 有 name 属性
```

#### `AxiosInstance` - 实例接口

注意这里有两个函数签名重载：

```typescript
(config: AxiosRequestConfig): Promise<AxiosResponse>;
(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
```

**这就是为什么 Axios 既能 `axios({ url: '/api' })` 也能 `axios('/api')` 的秘密！**

TypeScript 的函数重载允许同一个函数接受不同形式的参数。当调用时，TypeScript 会自动选择匹配的签名。

#### `AxiosStatic` - 静态接口

扩展了 `AxiosInstance`，增加 `create` 方法。这是默认导出的 axios 对象的类型，它既是函数也是对象。

## 从类型到实现

有了清晰的类型定义，现在来实现 Axios 类。我们要解决的核心问题是：

1. 如何管理默认配置？
2. 如何支持多种调用方式？
3. 如何复用请求逻辑？

## 实现 Axios 类

创建 `src/core/Axios.ts`：

```typescript
// src/core/Axios.ts

import { AxiosRequestConfig, AxiosResponse, Method } from '../types';
import { dispatchRequest } from './dispatchRequest';

export class Axios {
  // 每个实例都有自己的默认配置
  // 这是实现 axios.create() 的基础
  defaults: AxiosRequestConfig;

  constructor(config: AxiosRequestConfig = {}) {
    // 创建实例时传入的配置会成为这个实例的默认配置
    this.defaults = config;
  }

  /**
   * 核心请求方法
   * 
   * 为什么使用联合类型 `string | AxiosRequestConfig`？
   * 这让我们能够支持两种调用方式：
   * - axios.request({ url: '/api', method: 'GET' })
   * - axios.request('/api', { method: 'GET' })
   * 
   * 第二种方式更符合人类直觉，URL 作为第一个参数更醒目
   */
  request<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // 参数归一化：无论用户怎么传，最终都转换成配置对象
    let mergedConfig: AxiosRequestConfig;
    
    if (typeof configOrUrl === 'string') {
      // 用户传的是 (url, config) 形式
      mergedConfig = { ...config, url: configOrUrl };
    } else {
      // 用户传的是 (config) 形式
      mergedConfig = configOrUrl;
    }

    // 合并默认配置（简化版，后续章节会详细讲解完整的合并策略）
    // 用户配置会覆盖默认配置
    mergedConfig = { ...this.defaults, ...mergedConfig };

    // 派发请求到核心处理流程
    // 为什么要单独抽成 dispatchRequest？见下文解释
    return dispatchRequest<T>(mergedConfig);
  }

  // ============ 方法别名 ============
  // 这些方法本质上都是 request 的语法糖
  // 遵循单一职责原则：别名方法只负责组装参数，核心逻辑在 request

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'HEAD' });
  }

  options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'OPTIONS' });
  }

  // POST、PUT、PATCH 多了一个 data 参数，因为它们通常需要发送请求体
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }
}
```

### 设计细节深入解析

#### 1. 构造函数与默认配置

```typescript
constructor(config: AxiosRequestConfig = {}) {
  this.defaults = config;
}
```

每个实例都有独立的 `defaults`。这意味着：

```typescript
const api1 = new Axios({ baseURL: 'https://api1.example.com' });
const api2 = new Axios({ baseURL: 'https://api2.example.com' });

// 两个实例互不影响
api1.get('/users'); // 请求 https://api1.example.com/users
api2.get('/users'); // 请求 https://api2.example.com/users
```

#### 2. 泛型方法的类型推断

注意每个方法都有泛型参数 `<T = any>`：

```typescript
get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
```

**`T = any` 是什么意思？**

这是泛型默认值。如果用户不指定类型，`T` 默认为 `any`。但如果用户指定了：

```typescript
interface User {
  id: number;
  name: string;
}

// 显式指定泛型，data 被推断为 User 类型
const response = await axios.get<User>('/api/user/1');
console.log(response.data.name); // ✅ TypeScript 知道 data.name 存在

// 不指定泛型，data 是 any 类型
const response2 = await axios.get('/api/user/1');
console.log(response2.data.anything); // ⚠️ 没有类型检查
```

#### 3. 方法别名的设计哲学

为什么所有别名方法最终都调用 `request`？

**这体现了单一职责原则（Single Responsibility Principle）**：

- `get`、`post` 等方法只负责"组装参数"
- `request` 方法负责"核心逻辑"
- 如果未来需要修改请求逻辑（如添加拦截器），只需改 `request` 一处

```
        ┌─── get() ───┐
        ├── post() ───┤
config ─┼── put() ────┼──▶ request() ──▶ dispatchRequest() ──▶ 实际请求
        ├── patch() ──┤
        └── delete() ─┘
```

## 实现 dispatchRequest

为什么要把请求派发抽成单独的函数？

**原因一：职责分离**

`Axios` 类负责管理配置和提供 API，`dispatchRequest` 负责实际的请求处理流程。这样 `Axios` 类不会变得臃肿。

**原因二：便于扩展**

后续添加拦截器时，我们需要在 `request` 和 `dispatchRequest` 之间插入拦截器链。如果请求逻辑写死在 `request` 里，扩展会很困难。

创建 `src/core/dispatchRequest.ts`：

```typescript
// src/core/dispatchRequest.ts

import { AxiosRequestConfig, AxiosResponse } from '../types';
import { getAdapter } from '../adapters';

/**
 * 请求派发的核心函数
 * 
 * 这个函数是请求处理的"中枢"，负责：
 * 1. 转换请求数据（如将对象序列化为 JSON）
 * 2. 选择合适的适配器（浏览器用 XHR，Node.js 用 http）
 * 3. 发送请求
 * 4. 转换响应数据（如将 JSON 字符串解析为对象）
 * 
 * 为什么叫 "dispatch"？
 * dispatch 有"分派、调度"的意思，这个函数就像一个调度中心，
 * 接收请求配置，调度给合适的适配器去执行。
 */
export function dispatchRequest<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  // 1. 转换请求数据（后续章节实现）
  // 比如：自动将 JS 对象转为 JSON 字符串
  // config.data = transformRequest(config.data, config.headers);

  // 2. 获取适配器
  // 适配器模式允许我们用统一的接口处理不同平台的 HTTP 请求
  const adapter = getAdapter(config);
  
  // 3. 发送请求并处理响应
  return adapter<T>(config).then(response => {
    // 4. 转换响应数据（后续章节实现）
    // 比如：自动将 JSON 字符串解析为 JS 对象
    // response.data = transformResponse(response.data);
    return response;
  });
}
```

### 请求处理流程图

```
┌────────────────────────────────────────────────────────────────┐
│                    dispatchRequest(config)                      │
├────────────────────────────────────────────────────────────────┤
│  ① transformRequest    转换请求数据（序列化、压缩等）             │
│          ↓                                                      │
│  ② getAdapter          选择合适的适配器                          │
│          ↓                                                      │
│  ③ adapter(config)     适配器发送实际请求                        │
│          ↓                                                      │
│  ④ transformResponse   转换响应数据（解析、解压等）               │
│          ↓                                                      │
│     返回 response                                               │
└────────────────────────────────────────────────────────────────┘
```

## 实现简单的适配器

适配器是连接 Axios 和底层 HTTP API 的桥梁。现在我们先实现一个简单版本，后续章节会深入讲解适配器模式。

创建 `src/adapters/index.ts`：

```typescript
// src/adapters/index.ts

import { AxiosRequestConfig, AxiosResponse } from '../types';
import { xhrAdapter } from './xhr';

// 适配器的统一接口
// 无论是 XHR、Fetch 还是 Node.js http，都要实现这个接口
export type Adapter = <T = any>(config: AxiosRequestConfig) => Promise<AxiosResponse<T>>;

/**
 * 获取适配器
 * 
 * 目前是简化版，只返回 XHR 适配器
 * 后续会实现自动检测环境并选择合适的适配器
 */
export function getAdapter(config: AxiosRequestConfig): Adapter {
  return xhrAdapter;
}
```

创建 `src/adapters/xhr.ts`：

```typescript
// src/adapters/xhr.ts

import { AxiosRequestConfig, AxiosResponse } from '../types';

/**
 * XHR 适配器 - 浏览器环境的 HTTP 请求实现
 * 
 * 将 XMLHttpRequest 的回调式 API 包装成 Promise 接口
 */
export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 构建完整 URL
    // 如果有 baseURL，需要和 url 拼接
    const url = config.baseURL 
      ? `${config.baseURL}${config.url}` 
      : config.url || '';
    
    // 初始化请求
    // 第三个参数 true 表示异步请求
    xhr.open(config.method?.toUpperCase() || 'GET', url, true);
    
    // 设置超时时间（毫秒）
    // 超时后会触发 ontimeout 事件
    if (config.timeout) {
      xhr.timeout = config.timeout;
    }
    
    // 设置响应类型
    // 可选值：'' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
    if (config.responseType) {
      xhr.responseType = config.responseType;
    }
    
    // 设置请求头
    // 注意：必须在 open() 之后、send() 之前调用
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    // 监听请求状态变化
    xhr.onreadystatechange = function () {
      // readyState 状态码：
      // 0: 未初始化  1: 已打开  2: 已发送  3: 接收中  4: 完成
      if (xhr.readyState !== 4) return;
      
      // status 为 0 表示请求未完成
      // 可能原因：网络错误、请求被取消、CORS 被拒绝
      if (xhr.status === 0) return;
      // 请求成功，解析响应
      const responseHeaders = parseHeaders(xhr.getAllResponseHeaders());
      const responseData = xhr.responseType === 'text' || !xhr.responseType 
        ? xhr.responseText 
        : xhr.response;
      
      // 构建符合 AxiosResponse 接口的响应对象
      const response: AxiosResponse<T> = {
        data: responseData,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
        config: config,      // 保留原始配置，便于错误处理时获取上下文
        request: xhr,        // 保留原始请求对象，便于调试
      };
      
      // 判断 HTTP 状态码
      // 2xx 表示成功，其他表示失败
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        reject(createError(`Request failed with status code ${xhr.status}`, config, null, xhr, response));
      }
    };
    
    // 网络层面的错误（无法建立连接）
    // 注意：HTTP 4xx/5xx 不会触发 onerror，它们是"成功的失败响应"
    xhr.onerror = function () {
      reject(createError('Network Error', config, null, xhr));
    };
    
    // 请求超时
    xhr.ontimeout = function () {
      reject(createError(`Timeout of ${config.timeout}ms exceeded`, config, 'ECONNABORTED', xhr));
    };
    
    // 发送请求
    // GET/HEAD 请求通常没有请求体，传 null
    // POST/PUT/PATCH 请求需要发送数据
    const requestData = config.data ? JSON.stringify(config.data) : null;
    xhr.send(requestData);
  });
}

/**
 * 解析响应头字符串
 * 
 * getAllResponseHeaders() 返回的格式是：
 * "content-type: application/json\r\ncache-control: no-cache\r\n"
 * 
 * 我们需要将其解析为对象：
 * { 'content-type': 'application/json', 'cache-control': 'no-cache' }
 */
function parseHeaders(headersString: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headersString) return headers;
  
  // 按换行符分割每一行
  headersString.split('\r\n').forEach(line => {
    // 按第一个冒号分割键值
    // 注意：值中可能包含冒号（如 "Date: Mon, 01 Jan 2024 00:00:00 GMT"）
    const [key, ...values] = line.split(':');
    if (key) {
      // 键转小写，值去除首尾空格
      headers[key.trim().toLowerCase()] = values.join(':').trim();
    }
  });
  
  return headers;
}

/**
 * 创建错误对象
 * 
 * 为什么要封装错误？
 * 1. 统一错误格式，便于用户处理
 * 2. 携带上下文信息（config, request, response）
 * 3. 便于区分错误类型（网络错误、超时、HTTP错误）
 */
function createError(
  message: string,
  config: AxiosRequestConfig,
  code: string | null,
  request?: XMLHttpRequest,
  response?: AxiosResponse
): Error {
  const error = new Error(message) as any;
  error.config = config;      // 请求配置
  error.code = code;          // 错误码（如 'ECONNABORTED' 表示超时）
  error.request = request;    // 原始请求对象
  error.response = response;  // 响应对象（如果有）
  error.isAxiosError = true;  // 标识这是 Axios 错误
  return error;
}
```

### XHR 生命周期图解

```
xhr.open()                          xhr.send()
    │                                   │
    ▼                                   ▼
┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐
│  0   │ ──▶ │  1   │ ──▶ │  2   │ ──▶ │  3   │ ──▶ │  4   │
│UNSENT│     │OPENED│     │HEADERS│    │LOADING│    │ DONE │
│      │     │      │     │RECEIVED│   │      │     │      │
└──────┘     └──────┘     └──────┘     └──────┘     └──────┘
                                                        │
                               onreadystatechange ──────┘
                               状态变为 4 时处理响应
```

## 测试 Axios 类

创建测试文件 `test/axios.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Axios } from '../src/core/Axios';

// 模拟 XHR（复用之前的模拟对象）
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  getAllResponseHeaders: vi.fn(() => 'content-type: application/json'),
  readyState: 4,
  status: 200,
  statusText: 'OK',
  responseText: JSON.stringify({ id: 1 }),
  response: null,
  responseType: '',
  timeout: 0,
  onreadystatechange: null as any,
  onerror: null as any,
  ontimeout: null as any,
};

vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR));

describe('Axios class', () => {
  let axios: Axios;

  beforeEach(() => {
    vi.clearAllMocks();
    axios = new Axios();
  });

  it('should send GET request via get method', async () => {
    const promise = axios.get('/api/test');
    mockXHR.onreadystatechange();
    
    await promise;
    expect(mockXHR.open).toHaveBeenCalledWith('GET', '/api/test', true);
  });

  it('should send POST request with data', async () => {
    const promise = axios.post('/api/test', { name: 'test' });
    mockXHR.onreadystatechange();
    
    await promise;
    expect(mockXHR.open).toHaveBeenCalledWith('POST', '/api/test', true);
    expect(mockXHR.send).toHaveBeenCalledWith('{"name":"test"}');
  });

  it('should use defaults config', async () => {
    const instance = new Axios({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    });
    
    const promise = instance.get('/users');
    mockXHR.onreadystatechange();
    
    await promise;
    expect(mockXHR.open).toHaveBeenCalledWith('GET', 'https://api.example.com/users', true);
    expect(mockXHR.timeout).toBe(5000);
  });
});
```

## 小结

这一节我们实现了 `Axios` 类的核心结构：

- **类型定义**：明确了请求配置和响应的结构
- **Axios 类**：管理实例配置，提供请求方法
- **dispatchRequest**：请求派发的核心流程
- **XHR 适配器**：实际发送请求的实现

但现在还有一个问题：我们只能这样使用：

```typescript
const axios = new Axios();
axios.get('/api');
```

而真正的 Axios 可以直接当函数调用：

```typescript
axios('/api');
axios.get('/api');
```

这是怎么做到的？下一节我们来解决这个"双重身份"的问题。

## 常见问题解答

### Q: 为什么 request 方法的第一个参数类型是 `string | AxiosRequestConfig`？

A: 这是为了支持两种调用方式。TypeScript 会根据实际传入的参数类型进行类型收窄（type narrowing）。通过 `typeof configOrUrl === 'string'` 判断，我们可以区分两种情况并正确处理。

### Q: 为什么 GET/DELETE 等方法没有 data 参数，而 POST/PUT 有？

A: 根据 HTTP 规范，GET、DELETE、HEAD 等方法通常不应该有请求体（虽然技术上可以发送）。而 POST、PUT、PATCH 通常需要发送数据。这种设计反映了 HTTP 语义。

### Q: 为什么错误也要构建成特定格式？

A: 统一的错误格式让用户可以：
1. 通过 `error.response` 获取响应内容（如服务器返回的错误信息）
2. 通过 `error.config` 重试请求
3. 通过 `error.code` 区分错误类型（网络错误 vs 超时 vs HTTP错误）

### Q: dispatchRequest 和 adapter 的区别是什么？

A: 
- `dispatchRequest` 负责"做什么"：转换数据、选择适配器、处理响应
- `adapter` 负责"怎么做"：实际发送 HTTP 请求

这种分层设计让我们可以轻松替换底层实现（XHR → Fetch → Node.js http）而不影响上层逻辑。
