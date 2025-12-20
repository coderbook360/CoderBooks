# http 模块基础：创建第一个服务器

作为前端开发者，你已经熟悉 HTTP 协议的客户端使用——fetch、axios、XMLHttpRequest。现在，让我们切换视角，站在服务端接收和处理这些请求。

## 最简单的服务器

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.end('Hello World');
});

server.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});
```

运行这段代码，打开浏览器访问 `http://localhost:3000`，你会看到 "Hello World"。

## 理解请求响应模型

```javascript
http.createServer((req, res) => {
  // req: IncomingMessage - 请求对象，包含客户端发送的信息
  // res: ServerResponse - 响应对象，用于向客户端发送数据
});
```

这个回调函数会在每次收到请求时执行：

```javascript
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.end('OK');
});
```

访问不同 URL，控制台会显示：

```
GET /
GET /favicon.ico
GET /about
POST /api/users
```

## 设置响应状态码和头部

### 状态码

```javascript
const server = http.createServer((req, res) => {
  res.statusCode = 200;  // 成功
  res.end('OK');
});

// 或者在 writeHead 中设置
const server = http.createServer((req, res) => {
  res.writeHead(404);
  res.end('Not Found');
});
```

### 响应头

```javascript
const server = http.createServer((req, res) => {
  // 单独设置
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Custom-Header', 'value');
  
  res.end('<h1>你好，世界</h1>');
});

// 或使用 writeHead 一次性设置
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
  });
  
  res.end(JSON.stringify({ message: 'Hello' }));
});
```

## 返回不同类型的内容

### 纯文本

```javascript
res.setHeader('Content-Type', 'text/plain');
res.end('纯文本内容');
```

### HTML

```javascript
res.setHeader('Content-Type', 'text/html; charset=utf-8');
res.end('<html><body><h1>标题</h1></body></html>');
```

### JSON

```javascript
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({
  success: true,
  data: { id: 1, name: 'test' }
}));
```

### 封装 JSON 响应

```javascript
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify(data));
}

// 使用
const server = http.createServer((req, res) => {
  sendJSON(res, { message: 'Hello' });
});
```

## 处理不同的路径

```javascript
const server = http.createServer((req, res) => {
  const url = req.url;
  
  if (url === '/') {
    res.end('首页');
  } else if (url === '/about') {
    res.end('关于我们');
  } else if (url === '/api/users') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1, name: 'Alice' }]));
  } else {
    res.statusCode = 404;
    res.end('页面不存在');
  }
});
```

## 处理不同的 HTTP 方法

```javascript
const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  if (method === 'GET' && url === '/') {
    res.end('GET 首页');
  } else if (method === 'GET' && url === '/api/users') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ users: [] }));
  } else if (method === 'POST' && url === '/api/users') {
    // 处理 POST 请求
    res.end('创建用户');
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});
```

## 服务器事件

`http.Server` 是一个 EventEmitter：

```javascript
const server = http.createServer();

// request 事件（等同于 createServer 回调）
server.on('request', (req, res) => {
  res.end('Hello');
});

// 连接建立
server.on('connection', (socket) => {
  console.log('新连接');
});

// 错误处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('端口已被占用');
  } else {
    console.error('服务器错误:', err);
  }
});

// 服务器关闭
server.on('close', () => {
  console.log('服务器已关闭');
});

server.listen(3000);
```

## 监听配置

```javascript
// 只监听本地
server.listen(3000, '127.0.0.1', () => {
  console.log('只能本机访问');
});

// 监听所有接口
server.listen(3000, '0.0.0.0', () => {
  console.log('可从网络访问');
});

// 使用环境变量
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

## 优雅关闭

```javascript
const server = http.createServer((req, res) => {
  res.end('Hello');
});

server.listen(3000);

// 收到终止信号时优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM，开始关闭...');
  
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
  
  // 超时强制退出
  setTimeout(() => {
    console.error('关闭超时，强制退出');
    process.exit(1);
  }, 10000);
});
```

## 完整示例

```javascript
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const { method, url } = req;
  
  console.log(`${new Date().toISOString()} ${method} ${url}`);
  
  // 简单路由
  if (method === 'GET') {
    if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>欢迎</h1><a href="/api/health">健康检查</a>');
    } else if (url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.on('error', (err) => {
  console.error('服务器错误:', err);
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
```

## 本章小结

- 使用 `http.createServer()` 创建服务器
- 回调函数接收 `req`（请求）和 `res`（响应）
- 通过 `res.statusCode` 和 `res.setHeader()` 设置响应
- 通过 `res.end()` 发送响应并结束
- 服务器是 EventEmitter，可监听各种事件
- 使用环境变量配置端口

下一章我们将详细学习请求对象的各种属性和方法。
