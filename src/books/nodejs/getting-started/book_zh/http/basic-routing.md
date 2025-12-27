# 路由基础实现

> 当你的服务器开始处理多个不同的 URL 时，问题来了：如何优雅地组织代码？

路由（Routing）就是**根据 URL 和 HTTP 方法，将请求分发到对应处理函数**的机制。这是 Web 框架的核心功能，理解它的原理，能帮你更好地使用 Express、Koa 等框架。

## 从最简单的开始

最直观的方式是 if-else：

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // 根据 URL 路径分发请求
  if (req.url === '/') {
    res.end('Home');
  } else if (req.url === '/about') {
    res.end('About');
  } else if (req.url === '/api/users') {
    // API 返回 JSON
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([{ id: 1, name: 'John' }]));
  } else {
    // 默认返回 404
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

**问题**：当路由增多时（想象一下有 50 个页面），这段代码会变得难以维护。我们需要更好的组织方式。

## 基于对象的路由表

第一步改进——用数据结构代替条件语句：

```javascript
// 路由表：key 是 "方法 路径"，value 是处理函数
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
  // 构造查找 key
  const key = `${req.method} ${req.url}`;
  const handler = routes[key];
  
  if (handler) {
    handler(req, res);  // 找到处理函数，执行它
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3000);
```

**优点**：清晰、易维护、添加路由只需加一行。  
**缺点**：不支持动态路由参数（如 `/users/123`）。

## 支持路径参数

实际应用中，我们需要匹配 `/users/123` 这样的动态路由。这需要用正则表达式：

```javascript
/**
 * 简易路由器
 * 核心思路：将 /users/:id 这样的路径模式转换为正则表达式
 */
class Router {
  constructor() {
    this.routes = [];  // 存储所有路由规则
  }
  
  /**
   * 注册路由
   * @param {string} method - HTTP 方法
   * @param {string} path - 路径模式，如 /users/:id
   * @param {Function} handler - 处理函数
   */
  add(method, path, handler) {
    const paramNames = [];  // 存储参数名
    
    // 将 :param 语法转换为正则表达式
    // 例如: /users/:id -> /users/([^/]+)
    // ([^/]+) 匹配任意非斜杠字符
    const regexPath = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);  // 记录参数名
      return '([^/]+)';       // 替换为捕获组
    });
    
    this.routes.push({
      method,
      regex: new RegExp(`^${regexPath}$`),  // 完整匹配
      paramNames,
      handler
    });
  }
  
  // 便捷方法
  get(path, handler) { this.add('GET', path, handler); }
  post(path, handler) { this.add('POST', path, handler); }
  put(path, handler) { this.add('PUT', path, handler); }
  delete(path, handler) { this.add('DELETE', path, handler); }
  
  /**
   * 匹配请求
   * @returns {Object|null} 匹配结果或 null
   */
  match(method, url) {
    // 分离路径和查询字符串（/users/123?a=1 -> /users/123）
    const [path] = url.split('?');
    
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.regex);
      if (match) {
        // 提取路径参数
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = match[i + 1];  // match[0] 是完整匹配，从 [1] 开始是捕获组
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
