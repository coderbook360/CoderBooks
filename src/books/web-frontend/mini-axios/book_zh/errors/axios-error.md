# AxiosError 类设计

良好的错误处理是 HTTP 客户端的关键。这一节我们设计 AxiosError 类。

## 本节目标

通过本节学习，你将：

1. 理解为什么需要自定义错误类
2. 掌握 TypeScript 中继承内置类的技巧
3. 实现功能完整的 AxiosError 类
4. 了解错误码的设计和使用场景

## 为什么需要自定义错误类？

原生 `Error` 对象只有 `message` 和 `stack` 两个主要属性，信息不够丰富。

**场景**：用户请求失败了，你需要告诉他：
1. 是什么原因失败的？（网络断了？超时？服务器错误？）
2. 请求的是什么 URL？
3. 服务器返回了什么？

用原生 Error：

```typescript
try {
  await fetch('/api');
} catch (error) {
  console.log(error.message);  // "Failed to fetch"
  // 没了...没有更多信息
}
```

用 AxiosError：

```typescript
try {
  await axios.get('/api');
} catch (error) {
  console.log(error.message);           // "Request failed with status code 500"
  console.log(error.code);              // "ERR_BAD_RESPONSE"
  console.log(error.config?.url);       // "/api"
  console.log(error.response?.data);    // { error: "Internal Server Error" }
  console.log(error.response?.status);  // 500
}
```

**AxiosError 的价值**：
1. 携带完整的上下文信息（config, request, response）
2. 标准化的错误分类（通过 code）
3. 便于区分错误类型（网络错误 vs HTTP 错误 vs 取消）
4. 支持序列化（toJSON）便于日志记录

## 错误分类

HTTP 请求可能遇到的错误类型：

| 类型 | 触发场景 | 错误码 | 有响应? |
|------|----------|--------|---------|
| **网络错误** | DNS 失败、网络断开、CORS 被拒绝 | ERR_NETWORK | ❌ |
| **超时错误** | 请求超过设定的 timeout | ECONNABORTED | ❌ |
| **HTTP 错误** | 4xx（客户端错误）、5xx（服务器错误） | ERR_BAD_REQUEST / ERR_BAD_RESPONSE | ✅ |
| **取消错误** | 用户调用 cancel() | ERR_CANCELED | ❌ |
| **配置错误** | URL 无效、参数错误 | ERR_BAD_OPTION | ❌ |
| **响应解析错误** | JSON 解析失败 | ERR_BAD_RESPONSE | 部分 |

## 基础实现

```typescript
// src/core/AxiosError.ts

import { AxiosRequestConfig, AxiosResponse } from '../types';

export interface AxiosErrorConfig {
  message: string;
  code?: string;
  config?: AxiosRequestConfig;
  request?: any;
  response?: AxiosResponse;
}

export class AxiosError extends Error {
  /**
   * 标识这是一个 AxiosError
   * 用于类型判断，比 instanceof 更可靠
   * 
   * 为什么不用 instanceof？
   * 在某些打包环境（如 Webpack）中，可能存在多个 AxiosError 类的实例
   * instanceof 检查可能失败，但 isAxiosError 标记不会
   */
  isAxiosError = true;
  
  /** 错误码，用于分类错误类型 */
  code?: string;
  
  /** 请求配置，包含 URL、方法、请求头等 */
  config?: AxiosRequestConfig;
  
  /** 原始请求对象（XHR 或 Node.js 的 http.ClientRequest） */
  request?: any;
  
  /** 响应对象（如果请求成功发出并收到响应） */
  response?: AxiosResponse;

  constructor(
    message: string,
    code?: string,
    config?: AxiosRequestConfig,
    request?: any,
    response?: AxiosResponse
  ) {
    // 调用父类构造函数
    super(message);
    
    // 设置错误名称（在堆栈跟踪中显示）
    this.name = 'AxiosError';
    this.code = code;
    this.config = config;
    this.request = request;
    this.response = response;

    /**
     * 修复 TypeScript 继承内置类的问题
     * 
     * 问题：TypeScript 编译到 ES5 时，继承内置类（Error、Array 等）
     * 会导致原型链断裂，instanceof 检查失败
     * 
     * 解决：手动设置原型
     */
    Object.setPrototypeOf(this, AxiosError.prototype);

    /**
     * 捕获堆栈跟踪
     * 
     * Error.captureStackTrace 是 V8 引擎的 API
     * 第二个参数表示从堆栈中排除这个函数及之后的调用
     * 这样堆栈会从调用 AxiosError 的地方开始，更清晰
     * 
     * 注意：这是 Node.js/Chrome 特有的，其他环境可能没有
     */
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为 JSON 对象
   * 
   * 用于：
   * 1. 日志记录：JSON.stringify(error) 
   * 2. 网络传输：把错误发送给错误追踪服务
   * 3. 调试：console.log(error.toJSON())
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      config: this.config,
      status: this.response?.status,
      // 注意：不包含 stack，避免泄露敏感信息
    };
  }
}
```

### TypeScript 继承内置类的"坑"

这是一个常见的 TypeScript 陷阱，值得详细说明：

```typescript
class MyError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const error = new MyError('test');

// 在 ES5 编译目标下，这可能返回 false！
console.log(error instanceof MyError);  // 可能是 false

// 因为 TypeScript 编译后的代码类似：
function MyError(message) {
  var _this = Error.call(this, message) || this;
  return _this;
}
// Error.call() 返回的是新的 Error 实例，不是 MyError 实例
```

**解决方案**：

```typescript
Object.setPrototypeOf(this, MyError.prototype);
```

这一行强制将实例的原型设置为正确的值，修复原型链。
```

## 错误码常量

定义标准错误码，让错误分类更加规范：

```typescript
// src/core/AxiosError.ts

/**
 * 标准错误码
 * 
 * 使用 as const 让 TypeScript 推断为字面量类型
 * 这样 AxiosErrorCode 类型会是所有错误码的联合类型
 */
export const AxiosErrorCodes = {
  /** 配置值无效，如 timeout: 'invalid' */
  ERR_BAD_OPTION_VALUE: 'ERR_BAD_OPTION_VALUE',
  
  /** 配置项无效，如使用了不存在的选项 */
  ERR_BAD_OPTION: 'ERR_BAD_OPTION',
  
  /** 连接被中止，通常是超时 */
  ECONNABORTED: 'ECONNABORTED',
  
  /** 超时（更具体的超时错误） */
  ETIMEDOUT: 'ETIMEDOUT',
  
  /** 网络错误，无法建立连接 */
  ERR_NETWORK: 'ERR_NETWORK',
  
  /** 重定向次数过多 */
  ERR_FR_TOO_MANY_REDIRECTS: 'ERR_FR_TOO_MANY_REDIRECTS',
  
  /** 响应异常，5xx 错误或响应体无法解析 */
  ERR_BAD_RESPONSE: 'ERR_BAD_RESPONSE',
  
  /** 请求异常，4xx 错误 */
  ERR_BAD_REQUEST: 'ERR_BAD_REQUEST',
  
  /** 请求被取消 */
  ERR_CANCELED: 'ERR_CANCELED',
  
  /** 功能不支持 */
  ERR_NOT_SUPPORT: 'ERR_NOT_SUPPORT',
  
  /** URL 无效 */
  ERR_INVALID_URL: 'ERR_INVALID_URL',
} as const;

// 从常量对象推断类型
export type AxiosErrorCode = typeof AxiosErrorCodes[keyof typeof AxiosErrorCodes];
```

### 错误码使用场景

| 错误码 | 触发时机 | 处理建议 |
|--------|----------|----------|
| `ERR_NETWORK` | 网络断开、DNS 失败、CORS | 提示用户检查网络 |
| `ECONNABORTED` | 请求超时 | 提示用户重试或延长超时 |
| `ERR_BAD_REQUEST` | 4xx 响应（401, 403, 404...） | 根据具体状态码处理 |
| `ERR_BAD_RESPONSE` | 5xx 响应或响应解析失败 | 提示服务器错误 |
| `ERR_CANCELED` | 用户调用 cancel() | 通常静默处理 |
| `ERR_INVALID_URL` | URL 格式错误 | 检查代码逻辑 |

## 工厂函数

创建错误的便捷函数，让代码更简洁：

```typescript
// src/core/AxiosError.ts

/**
 * 创建 AxiosError 的工厂函数
 * 
 * 比直接 new AxiosError() 更简洁，参数顺序也更符合直觉
 */
export function createError(
  message: string,
  config?: AxiosRequestConfig,
  code?: string,
  request?: any,
  response?: AxiosResponse
): AxiosError {
  return new AxiosError(message, code, config, request, response);
}

/**
 * 根据 HTTP 状态码创建错误
 * 
 * 自动判断是 4xx（客户端错误）还是 5xx（服务器错误）
 */
export function createErrorFromStatus(
  status: number,
  config: AxiosRequestConfig,
  request: any,
  response: AxiosResponse
): AxiosError {
  const message = `Request failed with status code ${status}`;
  
  // 4xx 是客户端错误，5xx 是服务器错误
  const code = status >= 400 && status < 500 
    ? AxiosErrorCodes.ERR_BAD_REQUEST 
    : AxiosErrorCodes.ERR_BAD_RESPONSE;
  
  return createError(message, config, code, request, response);
}

/**
 * 类型守卫：判断是否为 AxiosError
 * 
 * 使用 isAxiosError 标记而不是 instanceof
 * 因为 instanceof 在多实例场景下可能失效
 * 
 * @example
 * if (isAxiosError(error)) {
 *   // TypeScript 知道 error 是 AxiosError
 *   console.log(error.config.url);
 * }
 */
export function isAxiosError(payload: any): payload is AxiosError {
  return payload?.isAxiosError === true;
}
```
```

## 在适配器中使用

下面展示如何在 XHR 适配器中正确使用 AxiosError：

```typescript
// src/adapters/xhr.ts

import { AxiosError, createError, AxiosErrorCodes } from '../core/AxiosError';

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // ========== 网络错误 ==========
    // 触发场景：DNS 失败、网络断开、CORS 被拒绝
    // 特点：没有响应，xhr.status 为 0
    xhr.onerror = function () {
      reject(createError(
        'Network Error',
        config,
        AxiosErrorCodes.ERR_NETWORK,
        xhr
        // 注意：没有 response 参数，因为根本没收到响应
      ));
    };

    // ========== 超时 ==========
    // 触发场景：请求时间超过 config.timeout
    // 特点：请求已发出但未在规定时间内收到响应
    xhr.ontimeout = function () {
      reject(createError(
        `timeout of ${config.timeout}ms exceeded`,
        config,
        AxiosErrorCodes.ECONNABORTED,  // 连接中止
        xhr
      ));
    };

    // ========== 处理响应 ==========
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 0) return;  // 被 onerror 或 ontimeout 处理

      const response = createResponse(xhr, config);

      // 状态码判断
      const validateStatus = config.validateStatus || defaultValidateStatus;
      
      if (validateStatus(response.status)) {
        // 成功：2xx 状态码
        resolve(response);
      } else {
        // 失败：4xx 或 5xx 状态码
        // 注意：这里有 response，因为服务器确实返回了响应
        reject(createError(
          `Request failed with status code ${response.status}`,
          config,
          response.status >= 400 && response.status < 500 
            ? AxiosErrorCodes.ERR_BAD_REQUEST   // 4xx
            : AxiosErrorCodes.ERR_BAD_RESPONSE, // 5xx
          xhr,
          response  // 包含响应，用户可以获取错误详情
        ));
      }
    };

    xhr.send(config.data ?? null);
  });
}

function defaultValidateStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
```

### 网络错误 vs HTTP 错误

这是一个重要的区分：

```
网络错误 (ERR_NETWORK)：
──────────────────────────────────────────────────
客户端 ──✕──▶ 网络 ──✕──▶ 服务器
           ↑
      请求根本没到达服务器
      没有 response 对象
      error.response === undefined
──────────────────────────────────────────────────

HTTP 错误 (ERR_BAD_REQUEST / ERR_BAD_RESPONSE)：
──────────────────────────────────────────────────
客户端 ────▶ 网络 ────▶ 服务器
                         ↓
                      处理请求
                         ↓
客户端 ◀──── 网络 ◀──── 返回 4xx/5xx
                ↑
          有 response 对象
          error.response.status = 404/500/...
          error.response.data = 服务器返回的错误信息
──────────────────────────────────────────────────
```
```

## 错误增强

有时候我们需要把一个普通 Error 增强为 AxiosError：

```typescript
// src/core/enhanceError.ts

/**
 * 将普通 Error 增强为 AxiosError
 * 
 * 使用场景：
 * 1. 捕获到一个普通错误，但想给它添加 Axios 上下文
 * 2. 在拦截器中包装错误
 * 
 * 注意：这会直接修改原始错误对象
 */
export function enhanceError(
  error: Error,
  config: AxiosRequestConfig,
  code?: string,
  request?: any,
  response?: AxiosResponse
): AxiosError {
  const axiosError = error as AxiosError;
  
  // 添加 Axios 特有的属性
  axiosError.config = config;
  if (code) {
    axiosError.code = code;
  }
  axiosError.request = request;
  axiosError.response = response;
  axiosError.isAxiosError = true;
  
  // 添加 toJSON 方法
  axiosError.toJSON = function () {
    return {
      message: this.message,
      name: this.name,
      stack: this.stack,
      config: this.config,
      code: this.code,
      status: this.response?.status,
    };
  };
  
  return axiosError;
}
```

### 使用场景示例

```typescript
// 场景：JSON 解析失败时增强错误
try {
  const data = JSON.parse(responseText);
} catch (parseError) {
  // parseError 是普通的 SyntaxError
  // 增强为 AxiosError，添加请求上下文
  throw enhanceError(
    parseError,
    config,
    AxiosErrorCodes.ERR_BAD_RESPONSE,
    request,
    { data: responseText, status: 200, ... }
  );
}
```
```

## 测试

```typescript
import { describe, it, expect } from 'vitest';
import { AxiosError, createError, isAxiosError, AxiosErrorCodes } from '../src/core/AxiosError';

describe('AxiosError', () => {
  it('should create error with all properties', () => {
    const config = { url: '/test', method: 'get' };
    const response = { status: 404, data: 'Not Found' };
    
    const error = new AxiosError(
      'Not Found',
      AxiosErrorCodes.ERR_BAD_REQUEST,
      config as any,
      null,
      response as any
    );

    expect(error.message).toBe('Not Found');
    expect(error.code).toBe('ERR_BAD_REQUEST');
    expect(error.config).toBe(config);
    expect(error.response).toBe(response);
    expect(error.isAxiosError).toBe(true);
    expect(error.name).toBe('AxiosError');
  });

  it('should be instance of Error', () => {
    const error = new AxiosError('test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AxiosError);
  });

  it('should serialize to JSON', () => {
    const config = { url: '/test' };
    const response = { status: 500 };
    
    const error = new AxiosError(
      'Server Error',
      AxiosErrorCodes.ERR_BAD_RESPONSE,
      config as any,
      null,
      response as any
    );

    const json = error.toJSON();

    expect(json.message).toBe('Server Error');
    expect(json.code).toBe('ERR_BAD_RESPONSE');
    expect(json.status).toBe(500);
  });
});

describe('createError', () => {
  it('should create AxiosError with factory function', () => {
    const error = createError('Network Error', { url: '/api' } as any, 'ERR_NETWORK');

    expect(error).toBeInstanceOf(AxiosError);
    expect(error.message).toBe('Network Error');
    expect(error.code).toBe('ERR_NETWORK');
  });
});

describe('isAxiosError', () => {
  it('should return true for AxiosError', () => {
    const error = new AxiosError('test');
    expect(isAxiosError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('test');
    expect(isAxiosError(error)).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isAxiosError(null)).toBe(false);
    expect(isAxiosError(undefined)).toBe(false);
  });

  it('should return false for objects with isAxiosError !== true', () => {
    expect(isAxiosError({ isAxiosError: false })).toBe(false);
    expect(isAxiosError({ isAxiosError: 'true' })).toBe(false);
  });
});
```

## 错误使用示例

在实际项目中如何优雅地处理 Axios 错误：

```typescript
import axios, { AxiosError, isAxiosError } from 'axios';

try {
  await axios.get('/api/users/1');
} catch (error) {
  // ========== 第一步：判断是否是 Axios 错误 ==========
  if (isAxiosError(error)) {
    // 类型安全：TypeScript 知道 error 是 AxiosError
    console.log('Config:', error.config?.url);
    console.log('Status:', error.response?.status);
    console.log('Code:', error.code);
    
    // ========== 第二步：根据错误码处理 ==========
    switch (error.code) {
      case 'ERR_NETWORK':
        // 网络错误：没有网络连接
        showToast('网络错误，请检查您的网络连接');
        break;
        
      case 'ECONNABORTED':
        // 超时：服务器响应太慢
        showToast('请求超时，请稍后重试');
        break;
        
      case 'ERR_BAD_REQUEST':
        // 4xx 错误：客户端问题
        if (error.response?.status === 401) {
          // 未授权：需要登录
          router.push('/login');
        } else if (error.response?.status === 403) {
          // 禁止访问：没有权限
          showToast('您没有权限访问此资源');
        } else if (error.response?.status === 404) {
          // 资源不存在
          showToast('请求的资源不存在');
        } else {
          // 其他 4xx 错误
          showToast(error.response?.data?.message || '请求错误');
        }
        break;
        
      case 'ERR_BAD_RESPONSE':
        // 5xx 错误：服务器问题
        showToast('服务器错误，请稍后重试');
        // 可以上报到错误追踪服务
        reportError(error);
        break;
        
      case 'ERR_CANCELED':
        // 请求被取消：通常是用户行为，静默处理
        console.log('请求已取消');
        break;
        
      default:
        // 未知错误
        showToast('发生未知错误');
        console.error('Unhandled error:', error);
    }
  } else {
    // ========== 非 Axios 错误 ==========
    // 可能是代码逻辑错误，应该上抛
    throw error;
  }
}
```

### 封装通用错误处理

```typescript
// utils/handleAxiosError.ts

export function handleAxiosError(error: AxiosError): string {
  if (!error.response) {
    // 没有响应：网络错误或超时
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请稍后重试';
    }
    return '网络错误，请检查您的网络连接';
  }
  
  // 有响应：HTTP 错误
  const status = error.response.status;
  const data = error.response.data as any;
  
  // 优先使用服务器返回的错误消息
  if (data?.message) {
    return data.message;
  }
  
  // 使用默认消息
  const messages: Record<number, string> = {
    400: '请求参数错误',
    401: '请登录后再试',
    403: '没有访问权限',
    404: '资源不存在',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂时不可用',
  };
  
  return messages[status] || `请求失败 (${status})`;
}

// 使用
try {
  await axios.get('/api');
} catch (error) {
  if (isAxiosError(error)) {
    showToast(handleAxiosError(error));
  }
}
```
```

## 小结

### AxiosError 的设计要点

| 特性 | 作用 |
|------|------|
| **继承 Error** | 保持标准错误行为，可以被 try-catch 捕获 |
| **isAxiosError 标识** | 可靠的类型判断，比 instanceof 更稳定 |
| **丰富的上下文** | config、request、response 提供完整信息 |
| **标准化错误码** | 通过 code 分类错误，便于统一处理 |
| **可序列化** | toJSON 支持日志记录和错误上报 |

### 错误码速查表

| 错误码 | 含义 | error.response |
|--------|------|----------------|
| `ERR_NETWORK` | 网络错误，无法建立连接 | `undefined` |
| `ECONNABORTED` | 请求超时 | `undefined` |
| `ERR_BAD_REQUEST` | 4xx 客户端错误 | 有响应数据 |
| `ERR_BAD_RESPONSE` | 5xx 服务器错误或响应解析失败 | 有响应数据 |
| `ERR_CANCELED` | 请求被用户取消 | `undefined` |
| `ERR_INVALID_URL` | URL 格式无效 | `undefined` |

### 常见问题解答

**Q: 为什么用 `isAxiosError()` 而不是 `instanceof AxiosError`？**

A: `instanceof` 在以下场景可能失效：
- 多个 Axios 版本共存（每个版本有自己的 AxiosError 类）
- 某些打包工具的特殊处理
- 跨 iframe 场景

`isAxiosError` 只检查 `isAxiosError === true` 这个属性，更可靠。

**Q: error.response 什么时候有值？**

A: 只有服务器返回了响应时才有值。网络错误、超时、请求被取消等情况下，`error.response` 是 `undefined`。

**Q: 如何获取服务器返回的错误信息？**

A: 
```typescript
if (isAxiosError(error) && error.response) {
  const serverMessage = error.response.data?.message;
  const httpStatus = error.response.status;
}
```

**Q: 如何判断是否是超时错误？**

A: 
```typescript
if (error.code === 'ECONNABORTED') {
  // 是超时错误
}
```

下一节我们实现统一的错误处理策略。
