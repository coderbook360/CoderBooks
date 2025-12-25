# XSRF/CSRF 防护实现

跨站请求伪造（CSRF）是 Web 安全中的重要威胁。本节实现 Axios 的 XSRF 防护机制。

## 本节目标

通过本节学习，你将：

1. 理解 CSRF 攻击的原理和危害
2. 实现基于 Cookie 的 XSRF Token 机制
3. 配置自定义的 Token 头部
4. 了解其他 CSRF 防护策略

## 什么是 CSRF？

### 攻击原理

```
┌─────────────────────────────────────────────────────────────┐
│  CSRF 攻击流程：                                              │
│                                                             │
│  1. 用户登录了 bank.com，浏览器保存了登录 Cookie            │
│                                                             │
│  2. 用户访问恶意网站 evil.com                               │
│                                                             │
│  3. evil.com 页面包含：                                     │
│     <img src="https://bank.com/transfer?to=hacker&amount=1000">│
│                                                             │
│  4. 浏览器自动携带 bank.com 的 Cookie 发送请求              │
│                                                             │
│  5. 银行服务器认为是合法请求，执行转账                       │
└─────────────────────────────────────────────────────────────┘
```

### 为什么会发生？

- 浏览器会自动携带目标域的 Cookie
- 服务器无法区分请求来自真实用户还是恶意网站
- GET 请求通过 `<img>` 等标签就能发起

## XSRF Token 机制

### 防护原理

```
┌─────────────────────────────────────────────────────────────┐
│  XSRF Token 防护：                                           │
│                                                             │
│  1. 服务器生成随机 Token，存入 Cookie                        │
│     Set-Cookie: XSRF-TOKEN=abc123                           │
│                                                             │
│  2. 前端 JS 读取 Cookie，在请求头中携带 Token                │
│     X-XSRF-TOKEN: abc123                                    │
│                                                             │
│  3. 服务器验证 Cookie 和 Header 中的 Token 是否一致         │
│                                                             │
│  4. 恶意网站无法读取 Cookie（同源策略），无法伪造请求        │
└─────────────────────────────────────────────────────────────┘
```

## 实现配置接口

```typescript
// src/types/index.ts

export interface AxiosRequestConfig {
  // ... 其他配置
  
  /** XSRF Cookie 名称 */
  xsrfCookieName?: string;
  
  /** XSRF Header 名称 */
  xsrfHeaderName?: string;
}
```

## 默认配置

```typescript
// src/defaults.ts

export const defaults: AxiosRequestConfig = {
  // XSRF 默认配置
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  
  // ... 其他配置
};
```

## Cookie 读取工具

```typescript
// src/helpers/cookies.ts

interface CookieUtils {
  read(name: string): string | null;
  write(name: string, value: string, expires?: Date): void;
  remove(name: string): void;
}

export const cookies: CookieUtils = {
  read(name: string): string | null {
    // 浏览器环境
    if (typeof document === 'undefined') {
      return null;
    }
    
    const match = document.cookie.match(
      new RegExp('(^|;\\s*)' + name + '=([^;]*)')
    );
    
    return match ? decodeURIComponent(match[2]) : null;
  },
  
  write(name: string, value: string, expires?: Date): void {
    if (typeof document === 'undefined') {
      return;
    }
    
    let cookie = `${name}=${encodeURIComponent(value)}`;
    
    if (expires) {
      cookie += `; expires=${expires.toUTCString()}`;
    }
    
    cookie += '; path=/';
    
    document.cookie = cookie;
  },
  
  remove(name: string): void {
    this.write(name, '', new Date(0));
  }
};
```

## XHR 适配器中的实现

```typescript
// src/adapters/xhr.ts

import { cookies } from '../helpers/cookies';
import { isURLSameOrigin } from '../helpers/isURLSameOrigin';

export function xhrAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // 处理 XSRF Token
    addXsrfHeader(config);
    
    // ... 其他配置
  });
}

function addXsrfHeader(config: AxiosRequestConfig): void {
  const {
    xsrfCookieName,
    xsrfHeaderName,
    withCredentials,
    url,
    headers = {}
  } = config;
  
  // 只在浏览器环境处理
  if (typeof document === 'undefined') {
    return;
  }
  
  // 只处理同源请求或带凭据的请求
  if (!isStandardBrowserEnv()) {
    return;
  }
  
  // 检查是否需要添加 XSRF 头
  const shouldAddXsrf = 
    (withCredentials || isURLSameOrigin(url!)) &&
    xsrfCookieName;
  
  if (shouldAddXsrf) {
    const xsrfValue = cookies.read(xsrfCookieName!);
    
    if (xsrfValue && xsrfHeaderName) {
      headers[xsrfHeaderName] = xsrfValue;
    }
  }
  
  config.headers = headers;
}
```

## 同源检测

```typescript
// src/helpers/isURLSameOrigin.ts

interface URLOrigin {
  protocol: string;
  host: string;
}

export function isURLSameOrigin(requestURL: string): boolean {
  // 非浏览器环境
  if (typeof window === 'undefined') {
    return true;
  }
  
  const parsedOrigin = resolveURL(requestURL);
  const currentOrigin = resolveURL(window.location.href);
  
  return (
    parsedOrigin.protocol === currentOrigin.protocol &&
    parsedOrigin.host === currentOrigin.host
  );
}

function resolveURL(url: string): URLOrigin {
  // 使用 <a> 标签解析 URL
  const link = document.createElement('a');
  link.href = url;
  
  return {
    protocol: link.protocol,
    host: link.host
  };
}
```

## 使用示例

### 基本使用

```typescript
// 使用默认配置
axios.post('/api/transfer', { amount: 100 }, {
  withCredentials: true
});
// 自动读取 XSRF-TOKEN cookie 并添加到 X-XSRF-TOKEN 头
```

### 自定义配置

```typescript
// 自定义 Cookie 和 Header 名称
axios.create({
  xsrfCookieName: 'csrf_token',
  xsrfHeaderName: 'X-CSRF-Token',
  withCredentials: true
});
```

### 服务端配置

```javascript
// Express.js 服务端示例
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// 在响应中设置 CSRF Token Cookie
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});

// 验证 CSRF Token
app.post('/api/transfer', (req, res) => {
  // csrf 中间件会自动验证
  res.json({ success: true });
});
```

## 环境检测

```typescript
// src/helpers/isStandardBrowserEnv.ts

export function isStandardBrowserEnv(): boolean {
  if (typeof navigator !== 'undefined') {
    const product = navigator.product;
    
    // React Native / NativeScript 等
    if (product === 'ReactNative' || product === 'NativeScript') {
      return false;
    }
  }
  
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}
```

## 其他 CSRF 防护策略

### 1. SameSite Cookie

```javascript
// 服务端设置
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' // 或 'lax'
});
```

### 2. Origin/Referer 验证

```javascript
// 服务端验证
function validateOrigin(req, res, next) {
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = ['https://app.example.com'];
  
  if (!origin || !allowedOrigins.some(o => origin.startsWith(o))) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  
  next();
}
```

### 3. 双重提交 Cookie

```typescript
// 客户端
function generateToken(): string {
  return Math.random().toString(36).substring(2);
}

const token = generateToken();

// 同时在 Cookie 和 Header 中发送
document.cookie = `csrf=${token}; path=/`;

axios.post('/api/action', data, {
  headers: {
    'X-CSRF-Token': token
  }
});
```

### 4. 自定义请求头

```typescript
// 简单但有效：只检查自定义头的存在
// 因为跨域请求无法添加自定义头（需要预检）
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// 服务端
function checkXHR(req, res, next) {
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Invalid request' });
  }
  next();
}
```

## 防护策略对比

| 策略 | 优点 | 缺点 |
|-----|------|------|
| XSRF Token | 可靠、通用 | 需要后端配合 |
| SameSite Cookie | 简单、自动 | 旧浏览器不支持 |
| Origin 验证 | 简单 | Referer 可能被禁用 |
| 双重提交 | 无状态 | 子域名攻击风险 |
| 自定义头 | 简单 | 依赖 CORS |

## 完整实现

```typescript
// src/core/xsrf.ts

import { AxiosRequestConfig } from '../types';
import { cookies } from '../helpers/cookies';
import { isURLSameOrigin } from '../helpers/isURLSameOrigin';
import { isStandardBrowserEnv } from '../helpers/isStandardBrowserEnv';

export function addXsrfHeader(config: AxiosRequestConfig): void {
  // 非浏览器环境跳过
  if (!isStandardBrowserEnv()) {
    return;
  }
  
  const {
    xsrfCookieName = 'XSRF-TOKEN',
    xsrfHeaderName = 'X-XSRF-TOKEN',
    withCredentials,
    url,
    headers = {}
  } = config;
  
  // 检查是否需要添加 XSRF 头
  // 1. 同源请求
  // 2. 跨域但带凭据的请求
  const needsXsrf = isURLSameOrigin(url!) || withCredentials;
  
  if (!needsXsrf) {
    return;
  }
  
  // 读取 XSRF Token
  const token = cookies.read(xsrfCookieName);
  
  if (token) {
    config.headers = {
      ...headers,
      [xsrfHeaderName]: token
    };
  }
}
```

## 测试

```typescript
describe('XSRF Protection', () => {
  beforeEach(() => {
    // 设置测试 Cookie
    document.cookie = 'XSRF-TOKEN=test-token';
  });
  
  afterEach(() => {
    // 清理 Cookie
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });
  
  it('should add XSRF header from cookie', async () => {
    let capturedHeaders: any;
    
    mock.onPost('/api/test').reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });
    
    await axios.post('/api/test', {});
    
    expect(capturedHeaders['X-XSRF-TOKEN']).toBe('test-token');
  });
  
  it('should use custom cookie and header names', async () => {
    document.cookie = 'MY-CSRF=custom-token';
    
    let capturedHeaders: any;
    
    mock.onPost('/api/test').reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });
    
    await axios.post('/api/test', {}, {
      xsrfCookieName: 'MY-CSRF',
      xsrfHeaderName: 'X-MY-CSRF'
    });
    
    expect(capturedHeaders['X-MY-CSRF']).toBe('custom-token');
  });
  
  it('should not add header if cookie is missing', async () => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    let capturedHeaders: any;
    
    mock.onPost('/api/test').reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });
    
    await axios.post('/api/test', {});
    
    expect(capturedHeaders['X-XSRF-TOKEN']).toBeUndefined();
  });
});
```

## 小结

本节我们实现了完整的 XSRF 防护机制：

1. **CSRF 原理**：理解攻击方式和危害
2. **Token 机制**：Cookie 存储 + Header 传递
3. **自动处理**：同源请求自动添加 Token
4. **可配置**：支持自定义 Cookie 和 Header 名称
5. **多种策略**：了解其他防护方案

CSRF 防护是 Web 安全的重要环节，需要前后端协同配合才能有效防护。
