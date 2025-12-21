# 静态文件服务实现

Web 应用需要提供 HTML、CSS、JavaScript、图片等静态文件。

## 基础实现

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  
  // 构建文件路径
  const filePath = path.join(__dirname, 'public', req.url);
  
  // 读取并发送文件
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    
    res.end(data);
  });
});

server.listen(3000);
```

问题：没有正确的 Content-Type，安全隐患，不支持目录。

## MIME 类型

```javascript
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}
```

## 安全处理

防止目录遍历攻击：

```javascript
function safePath(root, requestPath) {
  // 解码 URL
  const decoded = decodeURIComponent(requestPath);
  
  // 规范化路径
  const normalized = path.normalize(decoded);
  
  // 构建完整路径
  const fullPath = path.join(root, normalized);
  
  // 确保在根目录内
  if (!fullPath.startsWith(root)) {
    return null;  // 目录遍历攻击
  }
  
  return fullPath;
}
```

## 使用流发送文件

大文件不应加载到内存：

```javascript
const server = http.createServer((req, res) => {
  const root = path.join(__dirname, 'public');
  const filePath = safePath(root, req.url);
  
  if (!filePath) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }
  
  // 检查文件是否存在
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    
    // 设置响应头
    res.setHeader('Content-Type', getMimeType(filePath));
    res.setHeader('Content-Length', stats.size);
    
    // 流式发送
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Server Error');
    });
  });
});
```

## 默认文档

访问目录时返回 index.html：

```javascript
async function resolveFilePath(root, requestPath) {
  let filePath = safePath(root, requestPath);
  if (!filePath) return null;
  
  try {
    const stats = await fs.promises.stat(filePath);
    
    // 如果是目录，尝试 index.html
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      await fs.promises.access(filePath);
    }
    
    return filePath;
  } catch {
    return null;
  }
}
```

## 缓存控制

```javascript
function setCacheHeaders(res, filePath, stats) {
  const ext = path.extname(filePath);
  
  // 静态资源长缓存
  if (['.js', '.css', '.png', '.jpg', '.woff2'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');  // 1年
  } else if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');  // 总是验证
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');  // 1小时
  }
  
  // ETag
  const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
  res.setHeader('ETag', etag);
  
  // Last-Modified
  res.setHeader('Last-Modified', stats.mtime.toUTCString());
}

function checkCache(req, res, stats) {
  const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
  const lastModified = stats.mtime.toUTCString();
  
  // 检查 If-None-Match
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();
    return true;
  }
  
  // 检查 If-Modified-Since
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
    res.statusCode = 304;
    res.end();
    return true;
  }
  
  return false;
}
```

## 范围请求

支持断点续传和视频拖拽：

```javascript
function handleRangeRequest(req, res, filePath, stats) {
  const range = req.headers.range;
  
  if (!range) {
    return null;  // 不是范围请求
  }
  
  const [, start, end] = range.match(/bytes=(\d+)-(\d*)/) || [];
  
  if (!start) {
    return null;
  }
  
  const startByte = parseInt(start, 10);
  const endByte = end ? parseInt(end, 10) : stats.size - 1;
  
  // 验证范围
  if (startByte >= stats.size) {
    res.statusCode = 416;  // Range Not Satisfiable
    res.setHeader('Content-Range', `bytes */${stats.size}`);
    res.end();
    return true;
  }
  
  res.statusCode = 206;  // Partial Content
  res.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${stats.size}`);
  res.setHeader('Content-Length', endByte - startByte + 1);
  res.setHeader('Accept-Ranges', 'bytes');
  
  const stream = fs.createReadStream(filePath, { start: startByte, end: endByte });
  stream.pipe(res);
  
  return true;
}
```

## 完整静态文件中间件

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

function staticFiles(root, options = {}) {
  const absRoot = path.resolve(root);
  const index = options.index || 'index.html';
  const maxAge = options.maxAge || 3600;
  
  return async function staticMiddleware(req, res, next) {
    // 只处理 GET 和 HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    
    // 解析路径
    const decoded = decodeURIComponent(req.url.split('?')[0]);
    const normalized = path.normalize(decoded);
    let filePath = path.join(absRoot, normalized);
    
    // 安全检查
    if (!filePath.startsWith(absRoot)) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }
    
    try {
      let stats = await fs.promises.stat(filePath);
      
      // 目录处理
      if (stats.isDirectory()) {
        filePath = path.join(filePath, index);
        stats = await fs.promises.stat(filePath);
      }
      
      // 非文件
      if (!stats.isFile()) {
        return next();
      }
      
      // 缓存检查
      const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
      
      if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304;
        res.end();
        return;
      }
      
      // 设置响应头
      res.setHeader('Content-Type', getMimeType(filePath));
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());
      
      // 范围请求
      const range = req.headers.range;
      if (range) {
        const [, start, end] = range.match(/bytes=(\d+)-(\d*)/) || [];
        if (start) {
          const startByte = parseInt(start, 10);
          const endByte = end ? parseInt(end, 10) : stats.size - 1;
          
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${stats.size}`);
          res.setHeader('Content-Length', endByte - startByte + 1);
          
          if (req.method === 'HEAD') {
            res.end();
          } else {
            fs.createReadStream(filePath, { start: startByte, end: endByte }).pipe(res);
          }
          return;
        }
      }
      
      // 完整响应
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Accept-Ranges', 'bytes');
      
      if (req.method === 'HEAD') {
        res.end();
      } else {
        fs.createReadStream(filePath).pipe(res);
      }
      
    } catch (err) {
      if (err.code === 'ENOENT') {
        return next();  // 文件不存在，交给下一个中间件
      }
      throw err;
    }
  };
}

// 使用
const app = new App();

app.use(staticFiles('./public', { maxAge: 86400 }));

app.get('/api/hello', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Hello' }));
});

app.listen(3000);
```

## 目录结构

```
project/
├── server.js
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── images/
        └── logo.png
```

## 本章小结

- 使用流发送大文件，避免内存问题
- 设置正确的 MIME 类型
- 防止目录遍历攻击
- 实现缓存控制减少带宽
- 支持范围请求用于断点续传
- 将静态文件服务封装为中间件

下一章我们将学习 Express 框架。
