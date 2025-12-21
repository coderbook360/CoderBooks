# 请求对象 IncomingMessage 详解

每当服务器收到请求，回调函数的 `req` 参数就是一个 `IncomingMessage` 对象。它包含了客户端发送的所有信息。

## 基本属性

### 请求方法和 URL

```javascript
const server = http.createServer((req, res) => {
  console.log(req.method);  // 'GET', 'POST', 'PUT', 'DELETE', etc.
  console.log(req.url);     // '/api/users?page=1'
  
  res.end('OK');
});
```

### 请求头

```javascript
console.log(req.headers);
// {
//   'host': 'localhost:3000',
//   'user-agent': 'Mozilla/5.0 ...',
//   'accept': 'application/json',
//   'content-type': 'application/json',
//   'content-length': '42'
// }

// 获取单个头部（小写）
const contentType = req.headers['content-type'];
const userAgent = req.headers['user-agent'];
```

**注意**：所有头部名称都被转为小写。

### HTTP 版本

```javascript
console.log(req.httpVersion);  // '1.1' 或 '2.0'
```

## 解析 URL

`req.url` 只包含路径和查询字符串，不包含协议和主机。使用 `URL` 类解析：

```javascript
const server = http.createServer((req, res) => {
  // 构建完整 URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  console.log(url.pathname);     // '/api/users'
  console.log(url.search);       // '?page=1&limit=10'
  
  // 获取查询参数
  const page = url.searchParams.get('page');    // '1'
  const limit = url.searchParams.get('limit');  // '10'
  
  res.end('OK');
});
```

### 封装 URL 解析

```javascript
function parseRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers
  };
}

// 使用
const server = http.createServer((req, res) => {
  const { method, path, query } = parseRequest(req);
  console.log(`${method} ${path}`, query);
  res.end('OK');
});
```

## 读取请求体

`req` 是一个可读流（Readable Stream），需要通过事件或异步迭代来读取请求体：

### 事件方式

```javascript
const server = http.createServer((req, res) => {
  const chunks = [];
  
  req.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    console.log('请求体:', body);
    res.end('OK');
  });
  
  req.on('error', (err) => {
    console.error('读取错误:', err);
    res.statusCode = 400;
    res.end('Bad Request');
  });
});
```

### 异步迭代方式

```javascript
const server = http.createServer(async (req, res) => {
  const chunks = [];
  
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  
  const body = Buffer.concat(chunks).toString();
  console.log('请求体:', body);
  res.end('OK');
});
```

### 封装为 Promise

```javascript
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// 使用
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    const body = await readBody(req);
    console.log('收到:', body);
  }
  res.end('OK');
});
```

## 解析 JSON 请求体

```javascript
async function readJSON(req) {
  const body = await readBody(req);
  
  if (!body) return null;
  
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid JSON');
  }
}

// 使用
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
    try {
      const data = await readJSON(req);
      console.log('JSON 数据:', data);
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ received: data }));
    } catch (err) {
      res.statusCode = 400;
      res.end('Invalid JSON');
    }
  } else {
    res.end('OK');
  }
});
```

## 常见请求头解析

### Content-Type

```javascript
function parseContentType(req) {
  const contentType = req.headers['content-type'] || '';
  const [type, ...params] = contentType.split(';').map(s => s.trim());
  
  const charset = params
    .find(p => p.startsWith('charset='))
    ?.split('=')[1] || 'utf-8';
  
  return { type, charset };
}

// 使用
const { type, charset } = parseContentType(req);
// type: 'application/json'
// charset: 'utf-8'
```

### Accept

```javascript
function parseAccept(req) {
  const accept = req.headers['accept'] || '*/*';
  return accept.split(',').map(s => s.trim().split(';')[0]);
}

// 使用
const accepts = parseAccept(req);
// ['application/json', 'text/html', '*/*']
```

### Authorization

```javascript
function parseAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  
  const [type, credentials] = auth.split(' ');
  
  if (type === 'Bearer') {
    return { type: 'bearer', token: credentials };
  }
  
  if (type === 'Basic') {
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [username, password] = decoded.split(':');
    return { type: 'basic', username, password };
  }
  
  return { type, credentials };
}
```

## 获取客户端信息

### IP 地址

```javascript
function getClientIP(req) {
  // 代理转发的真实 IP
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // 直连 IP
  return req.socket.remoteAddress;
}
```

### User-Agent

```javascript
const userAgent = req.headers['user-agent'];
console.log(userAgent);
// 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...'
```

## 完整的请求解析示例

```javascript
const http = require('http');

async function parseRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  const request = {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: req.headers,
    ip: req.socket.remoteAddress,
    body: null
  };
  
  // 读取请求体
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString();
    
    // 根据 Content-Type 解析
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      try {
        request.body = JSON.parse(rawBody);
      } catch {
        request.body = rawBody;
      }
    } else {
      request.body = rawBody;
    }
  }
  
  return request;
}

const server = http.createServer(async (req, res) => {
  const request = await parseRequest(req);
  
  console.log('请求:', {
    method: request.method,
    path: request.path,
    query: request.query,
    body: request.body
  });
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: request }));
});

server.listen(3000);
```

## 本章小结

- `req.method` 获取请求方法
- `req.url` 获取请求路径和查询字符串
- `req.headers` 获取请求头（键名小写）
- `req` 是可读流，通过事件或 for-await-of 读取请求体
- 使用 `URL` 类解析路径和查询参数
- 根据 Content-Type 解析不同格式的请求体

下一章我们将学习响应对象的使用。
