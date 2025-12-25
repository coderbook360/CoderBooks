# 凭据与跨域：withCredentials

在跨域请求中发送 cookies 和认证信息需要特殊处理。本节详解 withCredentials 配置。

## 本节目标

通过本节学习，你将：

1. 理解同源策略和跨域请求的基本概念
2. 掌握 withCredentials 的作用和使用方式
3. 了解 CORS 服务端配置要求
4. 处理跨域认证的常见问题

## 什么是跨域？

### 同源策略

**同源**的定义：协议、域名、端口都相同。

```
https://example.com/api/users
  ↓       ↓          ↓
协议    域名       路径

同源示例：
https://example.com/api/users
https://example.com/api/posts    ✓ 同源

跨域示例：
https://example.com    →  http://example.com    ✗ 协议不同
https://example.com    →  https://api.example.com    ✗ 域名不同
https://example.com    →  https://example.com:8080   ✗ 端口不同
```

### 跨域请求的限制

```
┌────────────────────────────────────────────────────────┐
│  浏览器同源策略限制：                                     │
│                                                        │
│  1. 无法读取跨域响应                                     │
│  2. 默认不发送 cookies                                  │
│  3. 无法访问跨域 iframe 的 DOM                          │
│  4. 某些请求需要预检 (preflight)                        │
└────────────────────────────────────────────────────────┘
```

## withCredentials 的作用

### 默认行为

```typescript
// 默认情况下，跨域请求不会携带 cookies
axios.get('https://api.example.com/user');
// 请求头中没有 Cookie
```

### 启用凭据

```typescript
// 启用 withCredentials 后，会携带 cookies
axios.get('https://api.example.com/user', {
  withCredentials: true
});
// 请求头中包含 Cookie
```

## 实现 withCredentials

### XHR 适配器

```typescript
// src/adapters/xhr.ts

export function xhrAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open(config.method!.toUpperCase(), url, true);
    
    // 设置 withCredentials
    if (config.withCredentials) {
      xhr.withCredentials = true;
    }
    
    // ... 其他配置
    
    xhr.send(config.data);
  });
}
```

### Fetch 适配器

```typescript
// src/adapters/fetch.ts

export function fetchAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const fetchOptions: RequestInit = {
    method: config.method,
    headers: config.headers,
    body: config.data,
    // credentials 选项
    credentials: config.withCredentials ? 'include' : 'same-origin'
  };
  
  return fetch(url, fetchOptions).then(/* ... */);
}
```

### credentials 选项对比

```typescript
// Fetch API 的 credentials 选项
{
  credentials: 'omit'       // 不发送凭据
  credentials: 'same-origin' // 仅同源请求发送（默认）
  credentials: 'include'    // 所有请求都发送（对应 withCredentials: true）
}
```

## CORS 服务端配置

### 必需的响应头

当 withCredentials 为 true 时，服务端必须设置：

```
Access-Control-Allow-Origin: https://your-frontend.com
Access-Control-Allow-Credentials: true
```

**重要**：`Access-Control-Allow-Origin` 不能使用通配符 `*`！

```javascript
// Node.js Express 示例
app.use((req, res, next) => {
  // 必须指定具体的源
  res.header('Access-Control-Allow-Origin', 'https://your-frontend.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

### 动态设置 Origin

```javascript
// 根据请求动态设置
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://app.example.com',
    'https://admin.example.com',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
});
```

## 预检请求 (Preflight)

### 什么是预检请求？

对于"非简单请求"，浏览器会先发送一个 OPTIONS 请求：

```
┌─────────┐          ┌─────────┐
│ 浏览器   │          │ 服务器   │
└────┬────┘          └────┬────┘
     │                    │
     │  OPTIONS /api/user │
     │  ─────────────────>│
     │                    │
     │  204 No Content    │
     │  CORS headers      │
     │  <─────────────────│
     │                    │
     │  POST /api/user    │
     │  ─────────────────>│
     │                    │
     │  200 OK            │
     │  <─────────────────│
```

### 触发预检的条件

```typescript
// 以下情况会触发预检：

// 1. 非简单方法
axios.put('/api/user', data);   // PUT 触发预检
axios.delete('/api/user');      // DELETE 触发预检

// 2. 自定义头部
axios.get('/api/user', {
  headers: { 'X-Custom-Header': 'value' }  // 触发预检
});

// 3. Content-Type 非简单值
axios.post('/api/user', data, {
  headers: { 'Content-Type': 'application/json' }  // 触发预检
});
```

### 服务端处理预检

```javascript
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Custom-Header');
  res.header('Access-Control-Max-Age', '86400'); // 缓存预检结果 24 小时
  res.sendStatus(204);
});
```

## 常见使用场景

### 1. 会话认证

```typescript
// 登录请求
axios.post('https://api.example.com/auth/login', 
  { username, password },
  { withCredentials: true }
);

// 服务端设置 cookie
// Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=None

// 后续请求自动携带 cookie
axios.get('https://api.example.com/user/profile', {
  withCredentials: true
});
```

### 2. Token 认证（不需要 withCredentials）

```typescript
// Token 认证通常不需要 withCredentials
// 因为 token 是手动添加到请求头的

axios.get('https://api.example.com/user/profile', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### 3. 全局配置

```typescript
// 创建实例时全局启用
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  withCredentials: true
});

// 所有请求都会携带凭据
apiClient.get('/user');
apiClient.post('/posts', data);
```

## 问题排查

### 常见错误

```
错误 1: 
"The value of the 'Access-Control-Allow-Origin' header must not be 
the wildcard '*' when the request's credentials mode is 'include'"

原因：服务端使用了 Access-Control-Allow-Origin: *
解决：设置具体的源，如 Access-Control-Allow-Origin: https://example.com
```

```
错误 2:
"The value of the 'Access-Control-Allow-Credentials' header in the 
response is '' which must be 'true'"

原因：服务端没有设置 Access-Control-Allow-Credentials
解决：添加 Access-Control-Allow-Credentials: true
```

```
错误 3:
"Cookies are not being sent"

可能原因：
1. 忘记设置 withCredentials: true
2. Cookie 的 SameSite 属性阻止了发送
3. Cookie 的 Domain 不匹配

解决：
1. 确保客户端设置 withCredentials: true
2. 服务端 Cookie 设置 SameSite=None; Secure
3. 检查 Cookie 的 Domain 配置
```

### 调试技巧

```typescript
// 添加拦截器检查配置
axios.interceptors.request.use(config => {
  console.log('Request config:', {
    url: config.url,
    withCredentials: config.withCredentials,
    headers: config.headers
  });
  return config;
});

axios.interceptors.response.use(
  response => {
    console.log('Response headers:', response.headers);
    return response;
  },
  error => {
    console.log('CORS Error:', error.message);
    console.log('Check server CORS configuration');
    return Promise.reject(error);
  }
);
```

## Cookie 属性说明

```
Set-Cookie: session=abc123; 
  HttpOnly;      // 防止 JS 访问
  Secure;        // 仅 HTTPS 传输
  SameSite=None; // 允许跨站发送
  Domain=.example.com; // 作用域
  Path=/;        // 路径
  Max-Age=3600   // 有效期（秒）
```

### SameSite 属性

```
SameSite=Strict  // 完全禁止跨站发送
SameSite=Lax     // 允许顶级导航跨站（默认）
SameSite=None    // 允许所有跨站发送（需要 Secure）
```

## 安全考虑

### CSRF 保护

```typescript
// 即使启用了 withCredentials，也要注意 CSRF 保护

// 服务端：生成 CSRF token
// 客户端：在请求中包含 token
axios.post('/api/transfer', data, {
  withCredentials: true,
  headers: {
    'X-CSRF-Token': getCsrfToken()
  }
});
```

### 最小权限原则

```typescript
// 只在需要时启用 withCredentials
const publicApi = axios.create({
  baseURL: 'https://api.example.com'
  // 公开 API 不需要凭据
});

const privateApi = axios.create({
  baseURL: 'https://api.example.com',
  withCredentials: true  // 私有 API 需要凭据
});
```

## 小结

本节我们学习了：

1. **同源策略**：跨域请求的限制
2. **withCredentials**：启用跨域凭据发送
3. **CORS 配置**：服务端必需的响应头
4. **预检请求**：OPTIONS 请求处理
5. **Cookie 属性**：SameSite、Secure 等
6. **问题排查**：常见错误和调试方法

正确配置跨域凭据对于 Web 应用安全至关重要，需要客户端和服务端协同配置。
