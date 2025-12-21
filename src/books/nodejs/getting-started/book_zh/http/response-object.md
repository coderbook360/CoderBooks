# 响应对象 ServerResponse 详解

回调函数的 `res` 参数是 `ServerResponse` 对象，用于构建和发送响应给客户端。

## 设置状态码

```javascript
const server = http.createServer((req, res) => {
  res.statusCode = 200;  // 默认值
  res.end('OK');
});
```

常用状态码：

```javascript
res.statusCode = 200;  // 成功
res.statusCode = 201;  // 已创建
res.statusCode = 204;  // 无内容
res.statusCode = 301;  // 永久重定向
res.statusCode = 302;  // 临时重定向
res.statusCode = 400;  // 客户端错误
res.statusCode = 401;  // 未授权
res.statusCode = 403;  // 禁止访问
res.statusCode = 404;  // 未找到
res.statusCode = 500;  // 服务器错误
```

## 设置响应头

### 单个设置

```javascript
res.setHeader('Content-Type', 'application/json');
res.setHeader('X-Request-Id', '12345');
res.setHeader('Cache-Control', 'no-cache');
```

### 设置多值头

```javascript
res.setHeader('Set-Cookie', [
  'session=abc123; HttpOnly',
  'theme=dark; Path=/'
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

```javascript
res.writeHead(200, {
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=3600'
});
```

**注意**：`writeHead` 会立即发送头部，之后不能再修改。

## 发送响应体

### write 方法

可以多次调用，用于分块发送：

```javascript
res.write('Hello ');
res.write('World');
res.end();  // 必须调用以结束响应
```

### end 方法

结束响应，可以带最后的数据：

```javascript
res.end('Complete response');
// 或
res.end();  // 无数据结束
```

### 发送不同类型

```javascript
// 文本
res.setHeader('Content-Type', 'text/plain');
res.end('Hello World');

// HTML
res.setHeader('Content-Type', 'text/html');
res.end('<h1>Hello</h1>');

// JSON
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ message: 'Hello' }));

// Buffer
const buffer = Buffer.from('binary data');
res.setHeader('Content-Type', 'application/octet-stream');
res.end(buffer);
```

## 响应辅助函数

### 发送 JSON

```javascript
function sendJSON(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// 使用
sendJSON(res, { success: true, data: users });
sendJSON(res, { error: 'Not found' }, 404);
```

### 发送错误

```javascript
function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: message }));
}

// 使用
sendError(res, 400, 'Invalid request');
sendError(res, 500, 'Internal server error');
```

### 重定向

```javascript
function redirect(res, url, permanent = false) {
  res.statusCode = permanent ? 301 : 302;
  res.setHeader('Location', url);
  res.end();
}

// 使用
redirect(res, '/login');
redirect(res, 'https://example.com', true);
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
