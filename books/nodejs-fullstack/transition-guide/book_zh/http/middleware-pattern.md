# 中间件模式的诞生

当应用变复杂，我们需要在多个路由中复用相同的逻辑：日志记录、身份验证、错误处理。中间件模式就是解决这个问题的。

## 问题：代码重复

```javascript
// 每个路由都要写日志
router.get('/users', (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  // 业务逻辑...
});

router.get('/posts', (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  // 业务逻辑...
});

// 每个路由都要解析请求体
router.post('/users', async (req, res) => {
  const body = await readBody(req);
  req.body = JSON.parse(body);
  // 业务逻辑...
});
```

这种重复让代码难以维护。

## 中间件的思想

**中间件** 是一个函数，它可以：
1. 执行任何代码
2. 修改 request 和 response 对象
3. 结束请求-响应周期
4. 调用下一个中间件

```javascript
function middleware(req, res, next) {
  // 做一些事情
  next();  // 调用下一个中间件
}
```

## 实现中间件系统

```javascript
class App {
  constructor() {
    this.middlewares = [];
  }
  
  use(fn) {
    this.middlewares.push(fn);
  }
  
  async handle(req, res) {
    let index = 0;
    
    const next = async () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(req, res, next);
      }
    };
    
    await next();
  }
}
```

## 基础中间件示例

### 日志中间件

```javascript
function logger(req, res, next) {
  const start = Date.now();
  
  // 响应结束时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}
```

### 请求体解析中间件

```javascript
async function bodyParser(req, res, next) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();
    
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json') && body) {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = body;
      }
    } else {
      req.body = body;
    }
  }
  
  next();
}
```

### 错误处理中间件

```javascript
async function errorHandler(req, res, next) {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);
    res.statusCode = err.status || 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: err.message || 'Internal Server Error'
    }));
  }
}
```

## 使用中间件

```javascript
const app = new App();

// 注册中间件（顺序很重要）
app.use(errorHandler);   // 最外层，捕获所有错误
app.use(logger);         // 记录日志
app.use(bodyParser);     // 解析请求体

// 业务中间件
app.use((req, res, next) => {
  if (req.url === '/api/users' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  } else {
    next();
  }
});

// 404 处理（放在最后）
app.use((req, res) => {
  res.statusCode = 404;
  res.end('Not Found');
});

// 创建服务器
const server = http.createServer((req, res) => {
  app.handle(req, res);
});

server.listen(3000);
```

## 结合路由器

```javascript
class App {
  constructor() {
    this.middlewares = [];
    this.router = new Router();
  }
  
  use(fn) {
    this.middlewares.push(fn);
  }
  
  get(path, handler) {
    this.router.get(path, handler);
  }
  
  post(path, handler) {
    this.router.post(path, handler);
  }
  
  async handle(req, res) {
    let index = 0;
    
    const next = async () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(req, res, next);
      } else {
        // 中间件执行完毕，交给路由器
        this.router.handle(req, res);
      }
    };
    
    await next();
  }
}

// 使用
const app = new App();

app.use(logger);
app.use(bodyParser);

app.get('/users', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify([{ id: 1, name: 'John' }]));
});

app.post('/users', (req, res) => {
  console.log('收到:', req.body);
  res.statusCode = 201;
  res.end('Created');
});
```

## 条件中间件

只对特定路径生效：

```javascript
function authRequired(req, res, next) {
  // 只对 /api 路径验证
  if (!req.url.startsWith('/api')) {
    return next();
  }
  
  const token = req.headers['authorization'];
  
  if (!token) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }
  
  // 验证 token...
  req.user = { id: 1, name: 'John' };
  next();
}

app.use(authRequired);
```

## 中间件工厂

创建可配置的中间件：

```javascript
function cors(options = {}) {
  const origin = options.origin || '*';
  const methods = options.methods || 'GET, POST, PUT, DELETE, OPTIONS';
  
  return function corsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    
    next();
  };
}

// 使用
app.use(cors({ origin: 'https://example.com' }));
```

```javascript
function rateLimit(options = {}) {
  const max = options.max || 100;
  const windowMs = options.windowMs || 60000;
  const requests = new Map();
  
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    
    // 清理过期记录
    const record = requests.get(ip);
    if (record && now - record.start > windowMs) {
      requests.delete(ip);
    }
    
    // 检查限制
    const current = requests.get(ip) || { count: 0, start: now };
    current.count++;
    requests.set(ip, current);
    
    if (current.count > max) {
      res.statusCode = 429;
      res.end('Too Many Requests');
      return;
    }
    
    next();
  };
}

// 使用
app.use(rateLimit({ max: 100, windowMs: 60000 }));
```

## 完整示例

```javascript
const http = require('http');

class App {
  constructor() {
    this.middlewares = [];
    this.routes = [];
  }
  
  use(fn) {
    this.middlewares.push(fn);
  }
  
  route(method, path, handler) {
    const paramNames = [];
    const regex = new RegExp('^' + path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$');
    this.routes.push({ method, regex, paramNames, handler });
  }
  
  get(path, handler) { this.route('GET', path, handler); }
  post(path, handler) { this.route('POST', path, handler); }
  
  matchRoute(method, url) {
    const [path] = url.split('?');
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => params[name] = match[i + 1]);
        return { handler: route.handler, params };
      }
    }
    return null;
  }
  
  async handle(req, res) {
    let index = 0;
    
    const next = async () => {
      if (index < this.middlewares.length) {
        await this.middlewares[index++](req, res, next);
      } else {
        const result = this.matchRoute(req.method, req.url);
        if (result) {
          req.params = result.params;
          await result.handler(req, res);
        } else {
          res.statusCode = 404;
          res.end('Not Found');
        }
      }
    };
    
    try {
      await next();
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
  
  listen(port, callback) {
    const server = http.createServer((req, res) => this.handle(req, res));
    server.listen(port, callback);
    return server;
  }
}

// 创建应用
const app = new App();

// 中间件
app.use(logger);
app.use(bodyParser);
app.use(cors());

// 路由
app.get('/', (req, res) => res.end('Home'));
app.get('/users/:id', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ id: req.params.id }));
});
app.post('/users', (req, res) => {
  res.statusCode = 201;
  res.end(JSON.stringify(req.body));
});

app.listen(3000, () => console.log('Server running'));
```

## 本章小结

- 中间件解决代码复用问题
- 中间件是带 `next` 参数的函数
- 中间件按注册顺序执行
- `next()` 调用下一个中间件
- 中间件可以修改 req/res 或提前结束请求
- 中间件工厂创建可配置的中间件

这就是 Express 和 Koa 的核心设计。下一章我们将实现静态文件服务。
