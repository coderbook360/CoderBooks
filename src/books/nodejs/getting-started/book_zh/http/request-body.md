# 处理不同类型的请求体

不同的客户端发送不同格式的数据，服务器需要正确解析。

## 常见请求体类型

| Content-Type | 描述 | 示例 |
|-------------|------|------|
| application/json | JSON 数据 | `{"name":"John"}` |
| application/x-www-form-urlencoded | 表单数据 | `name=John&age=30` |
| multipart/form-data | 文件上传 | 二进制数据 |
| text/plain | 纯文本 | `Hello World` |

## 解析 JSON

最常见的 API 数据格式：

```javascript
const http = require('http');

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

async function parseJSON(req) {
  const body = await readBody(req);
  if (!body) return null;
  return JSON.parse(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
    try {
      const data = await parseJSON(req);
      console.log('收到 JSON:', data);
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ received: data }));
    } catch (err) {
      res.statusCode = 400;
      res.end('Invalid JSON');
    }
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

## 解析 URL 编码表单

HTML 表单默认使用这种格式：

```javascript
function parseFormUrlEncoded(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params);
}

const server = http.createServer(async (req, res) => {
  const contentType = req.headers['content-type'] || '';
  
  if (req.method === 'POST' && contentType.includes('application/x-www-form-urlencoded')) {
    const body = await readBody(req);
    const data = parseFormUrlEncoded(body);
    
    console.log('表单数据:', data);
    // { name: 'John', email: 'john@example.com' }
    
    res.end('表单已接收');
  } else {
    res.end('OK');
  }
});
```

## 统一解析器

根据 Content-Type 自动选择解析方式：

```javascript
async function parseBody(req) {
  const contentType = req.headers['content-type'] || '';
  const body = await readBody(req);
  
  if (!body) return null;
  
  if (contentType.includes('application/json')) {
    return JSON.parse(body);
  }
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body));
  }
  
  // 其他类型返回原始字符串
  return body;
}

const server = http.createServer(async (req, res) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const data = await parseBody(req);
      console.log('请求体:', data);
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Parse error' }));
    }
  } else {
    res.end('OK');
  }
});
```

## 处理大请求体

防止恶意大请求耗尽内存：

```javascript
async function readBodyWithLimit(req, maxSize = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  
  for await (const chunk of req) {
    size += chunk.length;
    
    if (size > maxSize) {
      throw new Error('Request body too large');
    }
    
    chunks.push(chunk);
  }
  
  return Buffer.concat(chunks).toString();
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    try {
      const body = await readBodyWithLimit(req, 1024 * 100); // 100KB 限制
      const data = JSON.parse(body);
      
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ received: true }));
    } catch (err) {
      if (err.message === 'Request body too large') {
        res.statusCode = 413;
        res.end('Payload Too Large');
      } else {
        res.statusCode = 400;
        res.end('Bad Request');
      }
    }
  } else {
    res.end('OK');
  }
});
```

## 检查 Content-Length

```javascript
const server = http.createServer(async (req, res) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 1024 * 1024; // 1MB
  
  // 预检大小
  if (contentLength > maxSize) {
    res.statusCode = 413;
    res.end('Payload Too Large');
    return;
  }
  
  // 处理请求...
  const body = await readBody(req);
  res.end('OK');
});
```

## 处理文件上传

multipart/form-data 解析较复杂，通常使用第三方库。这里展示基本原理：

```javascript
// 简化示例，实际应用推荐使用 formidable 或 busboy
function parseMultipart(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const result = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      if (nameMatch) {
        const name = nameMatch[1];
        const content = part.split('\r\n\r\n')[1]?.trim();
        result[name] = content;
      }
    }
  }
  
  return result;
}

const server = http.createServer(async (req, res) => {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType.split('boundary=')[1];
    const body = await readBody(req);
    const data = parseMultipart(body, boundary);
    
    console.log('上传数据:', data);
    res.end('Upload received');
  } else {
    res.end('OK');
  }
});
```

## 完整的请求体解析器

```javascript
const http = require('http');

class BodyParser {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1024 * 1024;
  }
  
  async parse(req) {
    const contentType = req.headers['content-type'] || '';
    
    // 检查大小限制
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > this.maxSize) {
      const error = new Error('Payload too large');
      error.status = 413;
      throw error;
    }
    
    // 读取请求体
    const body = await this.read(req);
    
    // 根据类型解析
    if (contentType.includes('application/json')) {
      return this.parseJSON(body);
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return this.parseForm(body);
    }
    
    return body;
  }
  
  async read(req) {
    const chunks = [];
    let size = 0;
    
    for await (const chunk of req) {
      size += chunk.length;
      if (size > this.maxSize) {
        const error = new Error('Payload too large');
        error.status = 413;
        throw error;
      }
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks).toString();
  }
  
  parseJSON(body) {
    if (!body) return null;
    try {
      return JSON.parse(body);
    } catch {
      const error = new Error('Invalid JSON');
      error.status = 400;
      throw error;
    }
  }
  
  parseForm(body) {
    if (!body) return {};
    return Object.fromEntries(new URLSearchParams(body));
  }
}

// 使用
const parser = new BodyParser({ maxSize: 100 * 1024 });

const server = http.createServer(async (req, res) => {
  try {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body = await parser.parse(req);
    }
    
    // 处理业务逻辑
    console.log('请求体:', req.body);
    
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, body: req.body }));
    
  } catch (err) {
    res.statusCode = err.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## 测试请求

```bash
# JSON
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"name":"John","age":30}'

# 表单
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John&age=30"
```

## 本章小结

- 使用 `for await...of` 读取请求体流
- 根据 `Content-Type` 选择解析方式
- JSON 使用 `JSON.parse()`
- 表单使用 `URLSearchParams`
- 设置大小限制防止内存耗尽
- 文件上传推荐使用专门的库

下一章我们将学习路由的基础实现。
