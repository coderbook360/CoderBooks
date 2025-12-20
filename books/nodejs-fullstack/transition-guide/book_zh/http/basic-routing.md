# 路由基础实现

路由决定了不同 URL 请求由哪段代码处理。

## 最简单的路由

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.end('Home');
  } else if (req.url === '/about') {
    res.end('About');
  } else if (req.url === '/api/users') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

问题：当路由增多时，if-else 变得难以维护。

## 基于对象的路由表

```javascript
const routes = {
  'GET /': (req, res) => res.end('Home'),
  'GET /about': (req, res) => res.end('About'),
  'GET /api/users': (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  },
  'POST /api/users': (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'User created' }));
  }
};

const server = http.createServer((req, res) => {
  const key = `${req.method} ${req.url}`;
  const handler = routes[key];
  
  if (handler) {
    handler(req, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

更清晰，但不支持动态路由参数。

## 支持路径参数

需要匹配 `/users/123` 这样的动态路由：

```javascript
class Router {
  constructor() {
    this.routes = [];
  }
  
  add(method, path, handler) {
    // 转换路径为正则
    // /users/:id -> /users/([^/]+)
    const paramNames = [];
    const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    
    this.routes.push({
      method,
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      handler
    });
  }
  
  get(path, handler) {
    this.add('GET', path, handler);
  }
  
  post(path, handler) {
    this.add('POST', path, handler);
  }
  
  put(path, handler) {
    this.add('PUT', path, handler);
  }
  
  delete(path, handler) {
    this.add('DELETE', path, handler);
  }
  
  match(method, url) {
    // 分离路径和查询字符串
    const [path] = url.split('?');
    
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.regex);
      if (match) {
        // 提取参数
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { handler: route.handler, params };
      }
    }
    
    return null;
  }
}
```

使用路由器：

```javascript
const router = new Router();

router.get('/', (req, res) => {
  res.end('Home');
});

router.get('/users', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify([{ id: 1, name: 'John' }]));
});

router.get('/users/:id', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ id: req.params.id }));
});

router.post('/users', (req, res) => {
  res.end('Create user');
});

router.put('/users/:id', (req, res) => {
  res.end(`Update user ${req.params.id}`);
});

router.delete('/users/:id', (req, res) => {
  res.end(`Delete user ${req.params.id}`);
});

const server = http.createServer((req, res) => {
  const result = router.match(req.method, req.url);
  
  if (result) {
    req.params = result.params;
    result.handler(req, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

## 添加查询参数解析

```javascript
const server = http.createServer((req, res) => {
  const result = router.match(req.method, req.url);
  
  if (result) {
    // 解析查询参数
    const url = new URL(req.url, `http://${req.headers.host}`);
    req.params = result.params;
    req.query = Object.fromEntries(url.searchParams);
    
    result.handler(req, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

// 使用
router.get('/search', (req, res) => {
  const { q, page } = req.query;
  res.end(`搜索: ${q}, 页码: ${page}`);
});
// GET /search?q=nodejs&page=1
```

## 分组路由

```javascript
class Router {
  // ...之前的代码
  
  group(prefix, callback) {
    const groupRouter = {
      get: (path, handler) => this.get(prefix + path, handler),
      post: (path, handler) => this.post(prefix + path, handler),
      put: (path, handler) => this.put(prefix + path, handler),
      delete: (path, handler) => this.delete(prefix + path, handler)
    };
    callback(groupRouter);
  }
}

// 使用
const router = new Router();

router.group('/api', (api) => {
  api.get('/users', listUsers);
  api.post('/users', createUser);
  api.get('/users/:id', getUser);
  api.put('/users/:id', updateUser);
  api.delete('/users/:id', deleteUser);
});

router.group('/admin', (admin) => {
  admin.get('/dashboard', dashboard);
  admin.get('/settings', settings);
});
```

## 完整路由器实现

```javascript
const http = require('http');

class Router {
  constructor() {
    this.routes = [];
  }
  
  add(method, path, handler) {
    const paramNames = [];
    const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    
    this.routes.push({
      method,
      regex: new RegExp(`^${regexPath}$`),
      paramNames,
      handler
    });
  }
  
  get(path, handler) { this.add('GET', path, handler); }
  post(path, handler) { this.add('POST', path, handler); }
  put(path, handler) { this.add('PUT', path, handler); }
  delete(path, handler) { this.add('DELETE', path, handler); }
  
  group(prefix, callback) {
    const groupRouter = {
      get: (path, handler) => this.get(prefix + path, handler),
      post: (path, handler) => this.post(prefix + path, handler),
      put: (path, handler) => this.put(prefix + path, handler),
      delete: (path, handler) => this.delete(prefix + path, handler)
    };
    callback(groupRouter);
  }
  
  match(method, url) {
    const [path] = url.split('?');
    
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { handler: route.handler, params };
      }
    }
    
    return null;
  }
  
  handle(req, res) {
    // 解析 URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    const result = this.match(req.method, req.url);
    
    if (result) {
      req.params = result.params;
      req.query = Object.fromEntries(url.searchParams);
      result.handler(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }
}

// 创建应用
const router = new Router();

// 定义路由
router.get('/', (req, res) => {
  res.end('Welcome to the API');
});

router.group('/api/users', (users) => {
  users.get('', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      page: Number(page),
      limit: Number(limit),
      users: [{ id: 1, name: 'John' }]
    }));
  });
  
  users.get('/:id', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: req.params.id, name: 'John' }));
  });
  
  users.post('', (req, res) => {
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Created' }));
  });
});

// 启动服务器
const server = http.createServer((req, res) => {
  router.handle(req, res);
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## 测试路由

```bash
# 首页
curl http://localhost:3000/

# 用户列表（带分页）
curl "http://localhost:3000/api/users?page=2&limit=20"

# 获取单个用户
curl http://localhost:3000/api/users/123

# 创建用户
curl -X POST http://localhost:3000/api/users
```

## 本章小结

- 简单应用使用对象路由表
- 复杂应用使用路由器类
- 路径参数通过正则表达式提取
- 使用 `URL` 类解析查询参数
- 路由分组让 API 结构更清晰

下一章我们将学习中间件模式。
