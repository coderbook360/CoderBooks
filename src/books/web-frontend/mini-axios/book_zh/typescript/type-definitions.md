# 完整类型定义

类型系统是 Mini-Axios 的重要组成部分。良好的类型定义能提供智能提示、编译时检查和自文档化能力。

## 本节目标

通过本节学习，你将掌握：

1. **理解 Axios 的类型架构**：核心类型之间的关系
2. **定义完整的类型系统**：配置、响应、拦截器、错误等
3. **设计灵活的泛型接口**：支持用户自定义类型
4. **组织类型定义文件**：模块化的类型管理

## 为什么类型定义很重要？

对比有无类型定义的开发体验：

**没有类型定义**：

```typescript
// 没有提示，容易拼错
const response = await axios.get('/api/user');
response.dat.name;    // 运行时才发现 typo
response.data.nmae;   // 不会报错，但值是 undefined
```

**有类型定义**：

```typescript
// IDE 会立即提示错误
const response = await axios.get<User>('/api/user');
response.dat.name;    // ❌ 编译时报错：Property 'dat' does not exist
response.data.nmae;   // ❌ 编译时报错：Did you mean 'name'?
response.data.name;   // ✅ 正确，有完整提示
```

**类型定义的价值**：

| 价值 | 说明 |
|------|------|
| 智能提示 | IDE 自动补全属性和方法 |
| 编译检查 | 拼写错误、类型不匹配在编译时发现 |
| 自文档化 | 类型即文档，悬停即可查看 |
| 重构安全 | 重命名属性时自动更新所有引用 |

## 类型架构总览

Mini-Axios 的类型定义按功能分为以下几个模块：

```
类型架构
├── 核心类型（core）
│   ├── Method          - HTTP 方法
│   ├── ResponseType    - 响应类型
│   └── AxiosTransformer - 转换器函数
├── 配置类型（config）
│   ├── AxiosRequestConfig  - 请求配置
│   └── AxiosDefaults       - 默认配置
├── 响应类型（response）
│   ├── AxiosResponse       - 响应对象
│   └── AxiosResponseHeaders - 响应头
├── 拦截器类型（interceptor）
│   ├── AxiosInterceptorManager - 拦截器管理器
│   └── Interceptor            - 单个拦截器
├── 取消类型（cancel）
│   ├── CancelToken    - 取消令牌
│   └── Cancel         - 取消标记
├── 错误类型（error）
│   ├── AxiosError     - 错误对象
│   └── AxiosErrorCode - 错误代码
└── 实例类型（axios）
    ├── Axios          - 基础类
    ├── AxiosInstance  - 实例接口
    └── AxiosStatic    - 静态接口
```

## 核心类型定义

```typescript
// src/types/index.ts

// ============ 基础类型 ============

/**
 * HTTP 方法类型
 * 支持大小写两种写法，保证用户使用的灵活性
 */
export type Method =
  | 'get' | 'GET'
  | 'post' | 'POST'
  | 'put' | 'PUT'
  | 'delete' | 'DELETE'
  | 'patch' | 'PATCH'
  | 'head' | 'HEAD'
  | 'options' | 'OPTIONS';

/**
 * 响应数据类型
 * 决定 response.data 的格式
 */
export type ResponseType = 
  | 'arraybuffer'   // 二进制数组
  | 'blob'          // 二进制大对象（文件下载）
  | 'document'      // DOM 文档
  | 'json'          // JSON 对象（默认）
  | 'text'          // 纯文本
  | 'stream';       // 流（Node.js）

// ============ 请求配置 ============

/**
 * Axios 请求配置
 * 
 * 泛型参数 D 表示请求体的类型
 * 这是 Axios 最核心的接口之一
 */
export interface AxiosRequestConfig<D = any> {
  // ---------- URL 相关 ----------
  url?: string;                    // 请求地址
  baseURL?: string;                // 基础 URL，会与 url 合并
  method?: Method;                 // HTTP 方法
  params?: Record<string, any>;    // URL 查询参数
  paramsSerializer?: (params: Record<string, any>) => string;  // 自定义参数序列化

  // ---------- 数据相关 ----------
  data?: D;                        // 请求体数据
  transformRequest?: AxiosTransformer | AxiosTransformer[];   // 请求转换器
  transformResponse?: AxiosTransformer | AxiosTransformer[];  // 响应转换器

  // ---------- 请求头 ----------
  headers?: AxiosRequestHeaders;

  // ---------- 超时与取消 ----------
  timeout?: number;                // 超时时间（毫秒）
  signal?: AbortSignal;            // AbortController 信号
  cancelToken?: CancelToken;       // 旧版取消令牌

  // 响应类型
  responseType?: ResponseType;

  // 认证
  auth?: AxiosBasicCredentials;
  withCredentials?: boolean;

  // 进度回调
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;

  // 适配器
  adapter?: AxiosAdapter;

  // 验证状态码
  validateStatus?: (status: number) => boolean;

  // 最大重定向次数（Node.js）
  maxRedirects?: number;

  // 代理设置（Node.js）
  proxy?: AxiosProxyConfig | false;
}

// ============ 响应对象 ============

export interface AxiosResponse<T = any, D = any> {
  data: T;
  status: number;
  statusText: string;
  headers: AxiosResponseHeaders;
  config: AxiosRequestConfig<D>;
  request?: any;
}

// ============ 请求头类型 ============

type MethodsHeaders = {
  [key in Method]?: AxiosHeaders;
};

interface CommonHeaders {
  common?: AxiosHeaders;
}

export type AxiosRequestHeaders = 
  AxiosHeaders & 
  MethodsHeaders & 
  CommonHeaders;

export type AxiosResponseHeaders = Record<string, string> & {
  'set-cookie'?: string[];
};

export interface AxiosHeaders {
  [key: string]: string | number | boolean | undefined;
  Accept?: string;
  'Content-Type'?: string;
  'Content-Length'?: number;
  Authorization?: string;
}

// ============ 凭证与代理 ============

export interface AxiosBasicCredentials {
  username: string;
  password: string;
}

export interface AxiosProxyConfig {
  host: string;
  port: number;
  auth?: AxiosBasicCredentials;
  protocol?: string;
}

// ============ 转换器 ============

export type AxiosTransformer = (
  data: any,
  headers?: AxiosHeaders
) => any;

// ============ 适配器 ============

export type AxiosAdapter = <T = any>(
  config: AxiosRequestConfig
) => Promise<AxiosResponse<T>>;

// ============ 进度事件 ============

export interface AxiosProgressEvent {
  loaded: number;
  total: number;
  progress?: number;
  bytes?: number;
  rate?: number;
  estimated?: number;
  upload?: boolean;
  download?: boolean;
  event?: ProgressEvent;
}
```

## 取消相关类型

```typescript
// src/types/cancel.ts

export interface CancelToken {
  promise: Promise<Cancel>;
  reason?: Cancel;
  throwIfRequested(): void;
}

export interface CancelTokenSource {
  token: CancelToken;
  cancel: Canceler;
}

export interface CancelTokenStatic {
  new (executor: (cancel: Canceler) => void): CancelToken;
  source(): CancelTokenSource;
}

export interface Cancel {
  message?: string;
  __CANCEL__: true;
}

export interface Canceler {
  (message?: string): void;
}

export function isCancel(value: any): value is Cancel {
  return value != null && value.__CANCEL__ === true;
}
```

## 错误类型

```typescript
// src/types/error.ts

export interface AxiosError<T = any, D = any> extends Error {
  config: AxiosRequestConfig<D>;
  code?: string;
  request?: any;
  response?: AxiosResponse<T, D>;
  isAxiosError: true;
  status?: number;
  toJSON: () => object;
}

// 错误代码常量
export const AxiosErrorCode = {
  ERR_BAD_OPTION_VALUE: 'ERR_BAD_OPTION_VALUE',
  ERR_BAD_OPTION: 'ERR_BAD_OPTION',
  ECONNABORTED: 'ECONNABORTED',
  ETIMEDOUT: 'ETIMEDOUT',
  ERR_NETWORK: 'ERR_NETWORK',
  ERR_FR_TOO_MANY_REDIRECTS: 'ERR_FR_TOO_MANY_REDIRECTS',
  ERR_DEPRECATED: 'ERR_DEPRECATED',
  ERR_BAD_RESPONSE: 'ERR_BAD_RESPONSE',
  ERR_BAD_REQUEST: 'ERR_BAD_REQUEST',
  ERR_CANCELED: 'ERR_CANCELED',
  ERR_NOT_SUPPORT: 'ERR_NOT_SUPPORT',
  ERR_INVALID_URL: 'ERR_INVALID_URL',
} as const;

export type AxiosErrorCode = typeof AxiosErrorCode[keyof typeof AxiosErrorCode];
```

## 拦截器类型

```typescript
// src/types/interceptor.ts

export interface AxiosInterceptorManager<V> {
  use(
    onFulfilled?: (value: V) => V | Promise<V>,
    onRejected?: (error: any) => any,
    options?: AxiosInterceptorOptions
  ): number;
  
  eject(id: number): void;
  
  clear(): void;
}

export interface AxiosInterceptorOptions {
  synchronous?: boolean;
  runWhen?: (config: AxiosRequestConfig) => boolean;
}

// 内部使用
export interface Interceptor<V> {
  fulfilled?: (value: V) => V | Promise<V>;
  rejected?: (error: any) => any;
  synchronous?: boolean;
  runWhen?: (config: AxiosRequestConfig) => boolean;
}
```

## Axios 实例类型

```typescript
// src/types/axios.ts

export interface AxiosInstance extends Axios {
  <T = any, R = AxiosResponse<T>, D = any>(
    config: AxiosRequestConfig<D>
  ): Promise<R>;
  
  <T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
}

export interface AxiosStatic extends AxiosInstance {
  // 工厂方法
  create(config?: AxiosRequestConfig): AxiosInstance;

  // 取消相关
  CancelToken: CancelTokenStatic;
  Cancel: CancelStatic;
  isCancel: typeof isCancel;

  // 错误相关
  AxiosError: typeof AxiosError;
  isAxiosError: typeof isAxiosError;

  // 工具方法
  all<T>(values: Array<T | Promise<T>>): Promise<T[]>;
  spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;

  // 适配器
  getAdapter(adapters: AxiosAdapter | AxiosAdapter[]): AxiosAdapter;

  // 默认配置
  defaults: AxiosDefaults;
}

export interface Axios {
  defaults: AxiosDefaults;
  interceptors: {
    request: AxiosInterceptorManager<AxiosRequestConfig>;
    response: AxiosInterceptorManager<AxiosResponse>;
  };

  getUri(config?: AxiosRequestConfig): string;
  request<T = any, R = AxiosResponse<T>, D = any>(
    config: AxiosRequestConfig<D>
  ): Promise<R>;
  
  get<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  delete<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  head<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  options<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  post<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  put<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  patch<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  postForm<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  putForm<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  patchForm<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
}
```

## 默认配置类型

```typescript
// src/types/defaults.ts

export interface AxiosDefaults<D = any> 
  extends Omit<AxiosRequestConfig<D>, 'headers'> {
  headers: HeadersDefaults;
}

export interface HeadersDefaults {
  common: AxiosHeaders;
  delete: AxiosHeaders;
  get: AxiosHeaders;
  head: AxiosHeaders;
  post: AxiosHeaders;
  put: AxiosHeaders;
  patch: AxiosHeaders;
  [key: string]: AxiosHeaders;
}
```

## 统一导出

```typescript
// src/types/index.ts

export * from './config';
export * from './response';
export * from './headers';
export * from './cancel';
export * from './error';
export * from './interceptor';
export * from './axios';
export * from './defaults';

// ========== 类型守卫 ==========
// 运行时类型检查，帮助 TypeScript 收窄类型

/**
 * 判断是否为 Axios 错误
 * 用于 catch 块中区分 Axios 错误和其他错误
 */
export function isAxiosError<T = any, D = any>(
  payload: any
): payload is AxiosError<T, D> {
  return payload != null && payload.isAxiosError === true;
}

/**
 * 判断是否为取消错误
 * 用于区分主动取消和真正的错误
 */
export function isCancel(value: any): value is Cancel {
  return value != null && value.__CANCEL__ === true;
}
```

## 声明文件结构

发布 npm 包时，需要正确配置类型声明文件的位置：

```
mini-axios/
├── dist/
│   ├── index.js        # CommonJS 产物
│   ├── index.mjs       # ESM 产物
│   └── index.d.ts      # 类型声明入口
├── src/
│   └── types/
│       ├── index.ts    # 类型定义源码
│       ├── config.ts
│       └── ...
└── package.json
```

`package.json` 配置说明：

```json
{
  "name": "mini-axios",
  "types": "./dist/index.d.ts",    // 类型入口（旧版工具）
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",  // 类型（优先级最高）
      "import": "./dist/index.mjs",  // ESM 入口
      "require": "./dist/index.js"   // CJS 入口
    }
  }
}
```

> **注意**：`types` 字段必须放在 `exports` 的每个条件中的第一位。

## 常见问题解答

### Q: 为什么 Method 类型同时包含大小写？

```typescript
type Method = 'get' | 'GET' | 'post' | 'POST' | ...
```

为了用户体验！不同开发者有不同习惯：

```typescript
axios.get('/api');     // 小写爱好者 ✅
axios.request({ method: 'GET' });  // 大写爱好者 ✅
```

### Q: 如何扩展 Axios 的类型定义？

使用 TypeScript 的声明合并：

```typescript
// types/axios.d.ts
import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    retry?: number;           // 添加重试配置
    retryDelay?: number;      // 添加重试延迟
  }
}
```

### Q: 为什么有些属性是可选的（?）？

因为用户可能只需要部分配置：

```typescript
// 只传 url，其他都用默认值
axios.get('/api');

// 传更多配置
axios.get('/api', { timeout: 5000 });
```

## 小结

本节我们构建了 Mini-Axios 的完整类型系统：

```
类型系统设计
├── 基础类型
│   ├── Method（HTTP 方法，支持大小写）
│   └── ResponseType（响应格式）
├── 核心接口
│   ├── AxiosRequestConfig（请求配置）
│   ├── AxiosResponse（响应对象）
│   └── AxiosDefaults（默认配置）
├── 功能接口
│   ├── 拦截器类型
│   ├── 取消类型
│   └── 错误类型
├── 实例接口
│   ├── Axios（基类）
│   ├── AxiosInstance（实例）
│   └── AxiosStatic（静态方法）
└── 工具函数
    ├── isAxiosError（错误判断）
    └── isCancel（取消判断）
```

**核心类型速查表**：

| 类型分类 | 核心类型 | 用途 |
|---------|---------|------|
| 配置 | `AxiosRequestConfig`, `AxiosDefaults` | 请求参数配置 |
| 响应 | `AxiosResponse`, `AxiosResponseHeaders` | 响应数据结构 |
| 实例 | `Axios`, `AxiosInstance`, `AxiosStatic` | 实例与静态方法 |
| 拦截器 | `AxiosInterceptorManager`, `Interceptor` | 拦截器管理 |
| 取消 | `CancelToken`, `Cancel`, `Canceler` | 请求取消 |
| 错误 | `AxiosError`, `AxiosErrorCode` | 错误处理 |

**类型定义设计原则**：

1. **完整性**：覆盖所有公开 API
2. **精确性**：类型描述要准确，避免过多 `any`
3. **灵活性**：使用泛型支持用户自定义类型
4. **兼容性**：与原版 Axios 类型兼容，便于迁移

下一节，我们学习如何利用泛型让响应类型更加智能。
