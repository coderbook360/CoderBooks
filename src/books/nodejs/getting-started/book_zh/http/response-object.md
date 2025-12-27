# 响应对象 ServerResponse 详解

> 在上一章我们学会了如何"读懂"客户端的请求，现在该学习如何"回复"了。

回调函数的 `res` 参数是 `ServerResponse` 对象，它就像一个**信使**，负责将服务器的响应安全送达客户端。理解它的工作方式，是构建可靠 HTTP 服务的关键。

## 响应的三个组成部分

一个完整的 HTTP 响应包含三部分：
1. **状态行**：状态码 + 状态信息（如 `200 OK`）
2. **响应头**：元信息（Content-Type、缓存策略等）
3. **响应体**：实际数据（HTML、JSON 等）

`res` 对象提供了设置这三部分的方法。

## 设置状态码

状态码告诉客户端请求的处理结果：

```javascript
const server = http.createServer((req, res) => {
  res.statusCode = 200;  // 默认就是 200，可省略
  res.end('OK');
});
```

**常用状态码速查表**：

```javascript
// 2xx 成功
res.statusCode = 200;  // OK - 请求成功
res.statusCode = 201;  // Created - 资源已创建（用于 POST）
res.statusCode = 204;  // No Content - 成功但无返回内容（用于 DELETE）

// 3xx 重定向
res.statusCode = 301;  // Moved Permanently - 永久重定向（SEO 友好）
res.statusCode = 302;  // Found - 临时重定向

// 4xx 客户端错误
res.statusCode = 400;  // Bad Request - 请求格式错误
res.statusCode = 401;  // Unauthorized - 未登录
res.statusCode = 403;  // Forbidden - 无权限（已登录但被禁止）
res.statusCode = 404;  // Not Found - 资源不存在

// 5xx 服务器错误
res.statusCode = 500;  // Internal Server Error - 服务器内部错误
```

## 设置响应头

响应头是服务器和客户端之间的"沟通协议"。最重要的是 `Content-Type`——告诉客户端如何解析响应体。

### 单个设置

```javascript
// Content-Type 是最重要的头，决定客户端如何解析数据
res.setHeader('Content-Type', 'application/json');

// 自定义头（通常以 X- 开头）——用于传递业务信息
res.setHeader('X-Request-Id', '12345');

// 缓存控制——指导浏览器和 CDN 如何缓存
res.setHeader('Cache-Control', 'no-cache');
```

### 设置多值头

某些头部（如 Set-Cookie）可以有多个值：

```javascript
// 一次设置多个 Cookie
res.setHeader('Set-Cookie', [
  'session=abc123; HttpOnly',   // HttpOnly 防止 XSS 窃取
  'theme=dark; Path=/'          // 用户偏好，客户端可读
]);
```

### 获取和检查

```javascript
const contentType = res.getHeader('content-type');
const hasHeader = res.hasHeader('x-custom');
```

### 删除头

```javascript
res.removeHeader('X-Unwanted');
```

## 一次性设置状态码和头部

`writeHead` 方法可以同时设置状态码和多个头部，**但有重要限制**：

```javascript
res.writeHead(200, {
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=3600'
});
```

> **⚠️ 注意**：`writeHead` 会立即发送状态行和头部到网络，调用后就不能再修改了。相比之下，`setHeader` 只是在内存中设置，直到调用 `write` 或 `end` 时才真正发送。

**何时用哪个？**
- `setHeader`：头部需要动态决定，或者有中间件需要修改
- `writeHead`：确定所有头部后一次性发送，性能略好

## 发送响应体

这是响应的核心——把实际数据发送给客户端。

### write 方法——分块发送

适合大数据或流式响应：

```javascript
// 可以多次调用，数据会依次发送
res.write('Hello ');  // 发送第一块
res.write('World');   // 发送第二块
res.end();            // 必须调用，标记响应结束
```

### end 方法——结束响应

结束响应，可以附带最后一块数据：

```javascript
res.end('Complete response');  // 发送数据并结束
// 或
res.end();  // 仅结束，无额外数据
```

> **重要**：每个响应**必须**调用 `end()`，否则客户端会一直等待，最终超时。

### 发送不同类型的数据

根据数据类型设置正确的 Content-Type：

```javascript
// 纯文本
res.setHeader('Content-Type', 'text/plain');
res.end('Hello World');

// HTML 页面
res.setHeader('Content-Type', 'text/html; charset=utf-8');
res.end('<h1>你好世界</h1>');

// JSON 数据（API 最常用）
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ message: 'Hello' }));  // 必须字符串化

// 二进制数据
const buffer = Buffer.from('binary data');
res.setHeader('Content-Type', 'application/octet-stream');
res.end(buffer);
```

## 响应辅助函数

重复的代码应该封装。以下是构建 HTTP 服务时最常用的工具函数：

### 发送 JSON

最常用的封装——API 开发的基础：

```javascript
/**
 * 发送 JSON 响应
 * @param {ServerResponse} res - 响应对象
 * @param {any} data - 要发送的数据，会被 JSON.stringify
 * @param {number} statusCode - HTTP 状态码，默认 200
 */
function sendJSON(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// 使用示例
sendJSON(res, { success: true, data: users });       // 200 成功响应
sendJSON(res, { error: 'Not found' }, 404);          // 404 错误响应
```

### 发送错误

统一错误格式，便于前端处理：

```javascript
/**
 * 发送错误响应
 * @param {ServerResponse} res - 响应对象  
 * @param {number} statusCode - 错误状态码
 * @param {string} message - 错误信息
 */
function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

// 使用示例
sendError(res, 400, 'Invalid request');     // 客户端错误
sendError(res, 500, 'Internal error');      // 服务器错误
```

### 重定向

告诉浏览器跳转到新地址：

```javascript
/**
 * 重定向到新 URL
 * @param {ServerResponse} res - 响应对象
 * @param {string} url - 目标 URL
 * @param {boolean} permanent - 是否永久重定向（影响 SEO 和浏览器缓存）
 */
function redirect(res, url, permanent = false) {
  // 301 永久重定向：浏览器会缓存，搜索引擎会更新索引
  // 302 临时重定向：浏览器每次都会请求原 URL
  res.statusCode = permanent ? 301 : 302;
  res.setHeader('Location', url);
  res.end();
}

// 使用示例
redirect(res, '/login');                     // 临时跳转到登录页
redirect(res, 'https://new-domain.com', true); // 域名迁移，永久重定向
```

## 流式响应

### pipe 方法

将可读流 pipe 到响应：

```javascript
const fs = require('fs');

const server = http.createServer((req, res) => {
  const filePath = './large-file.txt';
  const readStream = fs.createReadStream(filePath);
  
  res.setHeader('Content-Type', 'text/plain');
  readStream.pipe(res);  // 自动调用 res.end()
});
```

### 处理错误

```javascript
const server = http.createServer((req, res) => {
  const readStream = fs.createReadStream('./file.txt');
  
  readStream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('File not found');
    } else {
      res.statusCode = 500;
      res.end('Server error');
    }
  });
  
  res.setHeader('Content-Type', 'text/plain');
  readStream.pipe(res);
});
```

## 响应事件

### close 事件

客户端断开连接时触发：

```javascript
res.on('close', () => {
  console.log('客户端断开连接');
  // 清理资源
});
```

### finish 事件

响应完全发送后触发：

```javascript
res.on('finish', () => {
  console.log('响应已发送');
});
```

## 设置 Cookie

```javascript
function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  
  const existing = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existing) ? existing : [existing];
  cookies.push(parts.join('; '));
  
  res.setHeader('Set-Cookie', cookies);
}

// 使用
setCookie(res, 'session', 'abc123', {
  httpOnly: true,
  maxAge: 3600,
  path: '/'
});
```

## CORS 头设置

```javascript
function setCORS(res, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer((req, res) => {
  setCORS(res);
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // 正常处理
  res.end('OK');
});
```

## 完整示例

```javascript
const http = require('http');
const fs = require('fs');

// 响应工具
const response = {
  json(res, data, status = 200) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  },
  
  html(res, content, status = 200) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(content);
  },
  
  file(res, filePath, contentType) {
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', () => {
      res.statusCode = 404;
      res.end('Not Found');
    });
    
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
  },
  
  redirect(res, url, permanent = false) {
    res.statusCode = permanent ? 301 : 302;
    res.setHeader('Location', url);
    res.end();
  },
  
  error(res, status, message) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
};

const server = http.createServer((req, res) => {
  if (req.url === '/api/data') {
    response.json(res, { message: 'Hello' });
  } else if (req.url === '/page') {
    response.html(res, '<h1>Welcome</h1>');
  } else if (req.url === '/old') {
    response.redirect(res, '/new', true);
  } else {
    response.error(res, 404, 'Not found');
  }
});

server.listen(3000);
```

## 本章小结

- `res.statusCode` 设置状态码
- `res.setHeader()` / `res.writeHead()` 设置响应头
- `res.write()` 分块发送数据，`res.end()` 结束响应
- 使用 `pipe()` 发送流数据
- 封装响应辅助函数提高代码可读性

下一章我们将学习如何处理不同类型的请求体。
