# 定义配置类型与默认值

Axios 的强大之处在于其灵活的配置系统。完善的类型定义不仅能提供 IDE 智能提示，还能在编译时捕获配置错误。

## 本节目标

通过本节学习，你将掌握：

1. **理解配置层级**：库默认 → 实例默认 → 请求级配置的覆盖关系
2. **设计类型系统**：定义完整的 `AxiosRequestConfig` 接口
3. **设置合理默认值**：为常用配置提供开箱即用的默认值
4. **实现数据转换**：默认的请求/响应数据转换器

## 配置的来源

一个请求的最终配置，可能来自多个地方。理解这个层级关系是掌握 Axios 配置系统的基础：

```typescript
// ========== 配置来源 1: 库的默认配置 ==========
// 这是 axios 库内置的默认值，所有请求都会继承
axios.defaults.timeout = 0;  // 默认不超时

// ========== 配置来源 2: 实例的默认配置 ==========
// 创建实例时设置，该实例的所有请求都会继承
const instance = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000  // 覆盖库默认的 0
});

// ========== 配置来源 3: 请求级配置 ==========
// 单个请求的配置，优先级最高
instance.get('/users', {
  timeout: 10000  // 覆盖实例的 5000
});
```

### 配置优先级图示

```
请求级配置（最高优先级）
    │
    ▼  覆盖
实例默认配置
    │
    ▼  覆盖
库默认配置（最低优先级）
```

这就引出了配置合并的需求，我们在下一节详细讲解。这一节先定义类型和默认值。

## 完整的配置类型

更新 `src/types.ts`，定义完整的配置接口。良好的类型设计应该：

- 覆盖所有可配置项
- 使用联合类型约束可选值
- 添加泛型支持类型推断
- 保持与原版 Axios 兼容

```typescript
// src/types.ts

/**
 * HTTP 请求方法
 * 同时支持大小写，方便用户使用
 */
export type Method = 
  | 'get' | 'GET'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'delete' | 'DELETE'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS'
  | 'patch' | 'PATCH';

/**
 * XHR 响应类型
 * 对应 XMLHttpRequest.responseType
 */
export type ResponseType = 
  | 'arraybuffer'  // 二进制数据（ArrayBuffer）
  | 'blob'         // 二进制大对象（文件下载）
  | 'document'     // HTML/XML 文档
  | 'json'         // JSON 对象（默认）
  | 'text'         // 纯文本
  | 'stream';      // Node.js 流（仅服务端）

/**
 * 完整的请求配置接口
 * 泛型 D 表示请求数据类型，默认为 any
 */
export interface AxiosRequestConfig<D = any> {
  // ========== URL 相关 ==========
  /** 请求 URL，可以是相对路径或绝对 URL */
  url?: string;
  /** 基础 URL，会与相对路径拼接 */
  baseURL?: string;
  /** HTTP 请求方法 */
  method?: Method;
  /** URL 查询参数对象 */
  params?: Record<string, any>;
  /** 自定义参数序列化函数 */
  paramsSerializer?: (params: Record<string, any>) => string;
  
  // ========== 请求数据 ==========
  /** 请求体数据（POST/PUT/PATCH） */
  data?: D;
  
  // ========== 请求头 ==========
  /** 自定义请求头 */
  headers?: Record<string, string>;
  
  // ========== 超时设置 ==========
  /** 超时时间（毫秒），0 表示不超时 */
  timeout?: number;
  
  // ========== 响应处理 ==========
  /** 期望的响应数据类型 */
  responseType?: ResponseType;
  
  // ========== 数据转换 ==========
  /** 请求数据转换器（发送前处理 data） */
  transformRequest?: TransformFn | TransformFn[];
  /** 响应数据转换器（接收后处理 data） */
  transformResponse?: TransformFn | TransformFn[];
  
  // ========== 状态验证 ==========
  /** 判断状态码是否表示成功 */
  validateStatus?: (status: number) => boolean;
  
  // ========== 适配器 ==========
  /** 自定义请求适配器（用于测试或特殊环境） */
  adapter?: Adapter;
  
  // ========== 取消请求 ==========
  /** AbortController 的信号，用于取消请求 */
  signal?: AbortSignal;
  
  // ========== 认证 ==========
  /** HTTP Basic 认证凭据 */
  auth?: {
    username: string;
    password: string;
  };
  
  // ========== 进度回调 ==========
  /** 上传进度回调 */
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  /** 下载进度回调 */
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
  
  // ========== XSRF 防护 ==========
  /** XSRF token 的 cookie 名称 */
  xsrfCookieName?: string;
  /** XSRF token 的请求头名称 */
  xsrfHeaderName?: string;
  /** 跨域请求是否携带 cookie */
  withCredentials?: boolean;
  
  // ========== Node.js 专用 ==========
  /** HTTP 代理配置 */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  /** 最大重定向次数 */
  maxRedirects?: number;
  
  // ========== 内容限制 ==========
  /** 响应内容最大长度（字节） */
  maxContentLength?: number;
  /** 请求体最大长度（字节） */
  maxBodyLength?: number;
}

/**
 * 数据转换函数类型
 * @param data - 要转换的数据
 * @param headers - 请求/响应头（可选）
 * @returns 转换后的数据
 */
export type TransformFn = (data: any, headers?: Record<string, string>) => any;

/**
 * 请求适配器类型
 * 接收配置，返回 Promise<AxiosResponse>
 */
export type Adapter = <T = any>(config: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
```

### 配置字段速查表

| 字段 | 说明 | 默认值 | 使用场景 |
|------|------|--------|----------|
| `url` | 请求 URL | - | 每个请求必需 |
| `baseURL` | 基础 URL，与相对路径拼接 | `''` | 统一 API 前缀 |
| `method` | 请求方法 | `'GET'` | 指定 HTTP 动词 |
| `headers` | 请求头 | `{}` | 认证、内容类型等 |
| `params` | URL 查询参数 | - | GET 请求传参 |
| `data` | 请求体数据 | - | POST/PUT 请求体 |
| `timeout` | 超时时间（毫秒） | `0`（不超时） | 防止请求挂起 |
| `responseType` | 响应数据类型 | `'json'` | 文件下载用 `blob` |
| `validateStatus` | 状态码验证函数 | `status >= 200 && status < 300` | 自定义成功判断 |
| `withCredentials` | 跨域携带 cookie | `false` | 需要认证的跨域请求 |
| `signal` | AbortController 信号 | - | 取消请求 |

## 定义默认配置

默认配置是 Axios 开箱即用的关键。好的默认值应该满足 80% 的使用场景，同时允许用户轻松覆盖。

创建 `src/defaults.ts`：

```typescript
// src/defaults.ts

import { AxiosRequestConfig } from './types';

/**
 * 库的默认配置
 * 这些值会被实例配置和请求配置依次覆盖
 */
const defaults: AxiosRequestConfig = {
  // ========== 基础设置 ==========
  
  // 默认使用 GET 方法（最常见的请求类型）
  method: 'GET',
  
  // 超时时间：0 表示不超时
  // 生产环境建议设置合理的超时值
  timeout: 0,
  
  // ========== 默认请求头 ==========
  
  headers: {
    // Accept 头告诉服务器客户端能接受的响应格式
    // 优先 JSON，也接受纯文本和任意类型
    'Accept': 'application/json, text/plain, */*',
  },
  
  // ========== XSRF 防护设置 ==========
  
  // XSRF（跨站请求伪造）防护的 cookie 和 header 名称
  // 这是业界常用的命名约定
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  
  // 跨域请求默认不携带 cookie
  // 需要时显式设置为 true
  withCredentials: false,
  
  // ========== 响应设置 ==========
  
  // 默认期望 JSON 响应
  responseType: 'json',
  
  // ========== 内容限制 ==========
  
  // -1 表示无限制
  // 生产环境建议设置合理的限制防止内存溢出
  maxContentLength: -1,
  maxBodyLength: -1,
  
  // ========== Node.js 专用设置 ==========
  
  // 最大重定向次数，防止无限重定向
  maxRedirects: 5,
  
  // ========== 状态码验证 ==========
  
  // 默认只有 2xx 状态码视为成功
  // 其他状态码（如 404、500）会被 reject
  validateStatus: function(status: number): boolean {
    return status >= 200 && status < 300;
  },
  
  // ========== 请求数据转换 ==========
  // 请求转换器：在发送前处理 data
  // 可以是单个函数或函数数组（按顺序执行）
  transformRequest: [
    function(data: any, headers?: Record<string, string>): any {
      // 如果 data 是纯对象，自动序列化为 JSON
      if (isPlainObject(data)) {
        // 同时设置正确的 Content-Type
        if (headers) {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
        return JSON.stringify(data);
      }
      // 其他类型（FormData、Blob、字符串等）保持原样
      return data;
    }
  ],
  
  // ========== 响应数据转换 ==========
  
  // 响应转换器：在返回前处理 data
  transformResponse: [
    function(data: any): any {
      // 尝试将字符串解析为 JSON
      // 某些服务器返回的是字符串格式的 JSON
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          // 解析失败说明不是 JSON，返回原始数据
        }
      }
      return data;
    }
  ],
};

/**
 * 判断是否是纯对象
 * 纯对象：由 {} 或 new Object() 创建的对象
 * 不包括：数组、Date、RegExp、DOM 元素等
 */
function isPlainObject(val: any): val is Record<string, any> {
  return Object.prototype.toString.call(val) === '[object Object]';
}

export default defaults;
```

### 默认配置详解

让我们深入理解三个最重要的默认配置：

**1. transformRequest - 请求数据自动转换**

默认的请求转换器会自动处理对象序列化：

```typescript
// 用户代码（简洁）
axios.post('/api', { name: 'test' });

// 实际发送的请求（转换器自动处理）
// 请求头: Content-Type: application/json;charset=utf-8
// 请求体: '{"name":"test"}'

// 工作流程：
// 1. 检测到 data 是纯对象
// 2. 自动设置 Content-Type 为 application/json
// 3. 使用 JSON.stringify 序列化
```

**2. transformResponse - 响应数据自动解析**

默认的响应转换器会尝试解析 JSON：

```typescript
// 服务器返回的原始响应
// Content-Type: application/json
// Body: '{"id":1,"name":"test"}'

// 用户收到的 response.data（转换器自动解析）
{ id: 1, name: 'test' }  // 已经是对象，可以直接使用
```

**3. validateStatus - 成功判断逻辑**

默认只有 2xx 状态码视为成功，可以自定义：

```typescript
// 默认行为
validateStatus: (status) => status >= 200 && status < 300

// 自定义示例：只有 5xx 才算失败
axios.get('/api', {
  validateStatus: (status) => status < 500
});

// 自定义示例：任何状态码都不抛错
axios.get('/api', {
  validateStatus: () => true  // 永远返回成功
});
```

## 按请求方法设置默认 headers

不同的请求方法通常需要不同的默认 headers。例如，GET 请求不需要 `Content-Type`，而 POST 请求需要声明请求体格式：

```typescript
// src/defaults.ts

const defaults: AxiosRequestConfig = {
  // ... 其他配置
  
  headers: {
    // common: 所有请求方法都会携带的 headers
    common: {
      'Accept': 'application/json, text/plain, */*',
    },
    
    // 以下是按请求方法区分的 headers
    
    // GET 等"安全"方法不修改服务器数据，不需要 Content-Type
    get: {},
    delete: {},
    head: {},
    options: {},
    
    // POST 等"非安全"方法需要声明请求体格式
    // 默认使用表单格式，对象会被 transformRequest 覆盖为 JSON
    post: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    put: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    patch: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  } as any,  // 使用 any 是因为这种结构比较特殊
};
```

### Headers 合并流程

```
最终 headers = common + method + 请求级配置

示例（POST 请求）：
common:  { 'Accept': 'application/json...' }
   +
post:    { 'Content-Type': 'application/x-www-form-urlencoded' }
   +
请求级:   { 'Authorization': 'Bearer token' }
   =
最终:    {
           'Accept': 'application/json...',
           'Content-Type': 'application/x-www-form-urlencoded',
           'Authorization': 'Bearer token'
         }
```

## 在 Axios 类中使用默认配置

现在让我们把默认配置集成到 Axios 类中：

```typescript
// src/axios.ts

import { Axios } from './core/Axios';
import defaults from './defaults';

/**
 * 创建 axios 实例的工厂函数
 * @param defaultConfig - 用户提供的默认配置
 * @returns 具有 axios 完整功能的实例
 */
function createInstance(defaultConfig: AxiosRequestConfig): AxiosStatic {
  // 合并库默认配置和用户配置
  // 用户配置会覆盖库默认配置
  const config = { ...defaults, ...defaultConfig };
  
  // 创建 Axios 实例
  const context = new Axios(config);
  
  // ... 其余代码不变（创建双重身份等）
}

// 创建默认实例，不传任何配置
// 用户可以通过 axios.defaults 修改
const axios = createInstance({});

export default axios;
```

### 配置流向图

```
┌─────────────────────────────────────────────────────────┐
│                    库默认配置                            │
│  defaults.ts 中定义的 method, timeout, headers 等       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ 合并（...defaults, ...userConfig）
┌─────────────────────────────────────────────────────────┐
│                 axios.create() 配置                      │
│  const api = axios.create({ baseURL, timeout })        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ 合并（在 Axios.request 中）
┌─────────────────────────────────────────────────────────┐
│                    请求级配置                            │
│  api.get('/users', { headers: { ... } })               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    最终请求配置                          │
│  传递给适配器（XHR/HTTP）执行请求                       │
└─────────────────────────────────────────────────────────┘
```

## 测试默认配置

为默认配置编写完整的测试用例：

```typescript
import { describe, it, expect } from 'vitest';
import defaults from '../src/defaults';

describe('defaults', () => {
  // ========== 基础配置测试 ==========
  
  it('should have default method as GET', () => {
    // GET 是最常见的请求方法
    expect(defaults.method).toBe('GET');
  });

  it('should have default timeout as 0 (no timeout)', () => {
    // 0 表示不超时，让用户决定是否设置
    expect(defaults.timeout).toBe(0);
  });

  // ========== 状态码验证测试 ==========
  
  it('should validate 2xx status as success', () => {
    // 2xx 系列状态码都应该视为成功
    expect(defaults.validateStatus!(200)).toBe(true);
    expect(defaults.validateStatus!(201)).toBe(true);  // Created
    expect(defaults.validateStatus!(204)).toBe(true);  // No Content
    expect(defaults.validateStatus!(299)).toBe(true);  // 边界值
  });

  it('should validate non-2xx status as failure', () => {
    // 非 2xx 应该视为失败
    expect(defaults.validateStatus!(300)).toBe(false); // Redirect
    expect(defaults.validateStatus!(400)).toBe(false); // Bad Request
    expect(defaults.validateStatus!(404)).toBe(false); // Not Found
    expect(defaults.validateStatus!(500)).toBe(false); // Server Error
  });

  // ========== 请求转换器测试 ==========
  
  it('should serialize object to JSON in transformRequest', () => {
    const transform = defaults.transformRequest![0] as Function;
    
    // 准备：创建空 headers 对象
    const headers: Record<string, string> = {};
    
    // 执行：转换对象
    const result = transform({ name: 'test', age: 18 }, headers);
    
    // 验证：对象被序列化为 JSON 字符串
    expect(result).toBe('{"name":"test","age":18}');
    
    // 验证：Content-Type 被自动设置
    expect(headers['Content-Type']).toBe('application/json;charset=utf-8');
  });

  it('should pass through non-object data in transformRequest', () => {
    const transform = defaults.transformRequest![0] as Function;
    
    // 字符串保持原样
    expect(transform('raw string')).toBe('raw string');
    
    // FormData 保持原样（用于文件上传）
    const formData = new FormData();
    expect(transform(formData)).toBe(formData);
  });

  // ========== 响应转换器测试 ==========
  
  it('should parse JSON string in transformResponse', () => {
    const transform = defaults.transformResponse![0] as Function;
    
    // JSON 字符串应该被解析为对象
    expect(transform('{"name":"test"}')).toEqual({ name: 'test' });
    
    // 嵌套对象也能正确解析
    expect(transform('{"user":{"id":1}}')).toEqual({ user: { id: 1 } });
  });

  it('should return original data if not valid JSON', () => {
    const transform = defaults.transformResponse![0] as Function;
    
    // 非 JSON 字符串保持原样
    expect(transform('hello world')).toBe('hello world');
    
    // 无效 JSON 也保持原样
    expect(transform('{invalid json}')).toBe('{invalid json}');
    
    // 已经是对象的保持原样
    expect(transform({ already: 'object' })).toEqual({ already: 'object' });
  });
});
```

## 常见问题解答

### Q1: 为什么 timeout 默认是 0 而不是一个合理的值？

因为"合理"取决于具体场景。API 服务可能 5 秒足够，但文件上传可能需要几分钟。默认不超时让用户根据实际需求设置，避免意外中断请求。

### Q2: transformRequest 和 transformResponse 可以配置多个吗？

可以！它们都支持函数数组，按顺序执行：

```typescript
axios.post('/api', data, {
  transformRequest: [
    (data) => { /* 第一步处理 */ return data; },
    (data) => { /* 第二步处理 */ return data; },
    ...axios.defaults.transformRequest  // 最后执行默认处理
  ]
});
```

### Q3: 如何完全禁用默认转换？

```typescript
axios.post('/api', rawData, {
  transformRequest: [],   // 空数组，不做任何转换
  transformResponse: [],
  headers: { 'Content-Type': 'application/octet-stream' }
});
```

### Q4: withCredentials 什么时候需要设置为 true？

当你需要在跨域请求中携带 cookie 时，比如基于 session 的认证。注意服务器也需要设置 `Access-Control-Allow-Credentials: true`。

## 小结

这一节我们完成了配置系统的基础工作：

**知识点回顾**：

| 主题 | 要点 |
|------|------|
| 配置来源 | 库默认 → 实例默认 → 请求级，优先级递增 |
| 类型设计 | 完整的 `AxiosRequestConfig` 接口，支持泛型 |
| 默认值 | 开箱即用的合理默认值（method、timeout、转换器等） |
| 转换器 | transformRequest/Response 自动处理 JSON |
| Headers | 按方法分组，common + method + 请求级合并 |

**文件结构**：

```
src/
├── types.ts       # 类型定义：AxiosRequestConfig, Method, Adapter 等
└── defaults.ts    # 默认配置：method, timeout, transformers 等
```

下一节，我们将实现配置合并策略，处理多层配置的优先级问题。
