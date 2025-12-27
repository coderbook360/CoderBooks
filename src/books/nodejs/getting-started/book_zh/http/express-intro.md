# Express 快速入门

> 在前几章，我们手动实现了路由、中间件、静态文件服务。现在你可能在想：每个项目都要从头写这些吗？

答案当然是**不**。Express 就是把这些常见功能封装好的框架——它是 Node.js 生态中最流行的 Web 框架，每周下载量超过 3000 万次。

## 为什么选择 Express？

| 手动实现 | Express |
|---------|---------|
| 自己写 Router 类 | 内置路由，语法优雅 |
| 自己实现中间件链 | 标准化中间件机制 |
| 手动解析 JSON | 一行代码搞定 |
| 到处写 `res.end(JSON.stringify(...))` | `res.json(data)` |

Express 让你专注业务逻辑，而不是底层实现。

## 安装

```bash
npm install express
```

## 第一个应用

对比一下原生 HTTP 和 Express：

```javascript
// Express 版本
const express = require('express');
const app = express();  // 创建应用实例

// 定义路由：GET 请求 /
app.get('/', (req, res) => {
  res.send('Hello World');  // send 自动设置 Content-Type
});

// 启动服务器
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

> **注意**：Express 的 `res.send()` 比原生的 `res.end()` 更智能——它会根据数据类型自动设置 Content-Type。

## 路由

Express 路由语法简洁直观，这也是它流行的主要原因。

### 基本路由

```javascript
// RESTful API 示例
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);  // 自动设置 application/json
});

app.post('/users', (req, res) => {
  res.status(201).json({ message: 'Created' });  // 链式调用设置状态码
});

app.put('/users/:id', (req, res) => {
  res.json({ message: `Updated ${req.params.id}` });
});

app.delete('/users/:id', (req, res) => {
  res.json({ message: `Deleted ${req.params.id}` });
});
```

### 路由参数

Express 自动解析 `:param` 语法：

```javascript
// 单个参数
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;  // 从 URL 中提取
  res.json({ id: userId });
});

// 多个参数
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;  // 解构获取
  res.json({ userId, postId });
});
```

### 查询参数

Express 自动解析查询字符串：

```javascript
app.get('/search', (req, res) => {
  // GET /search?q=nodejs&page=2
  const { q, page = 1, limit = 10 } = req.query;  // 支持默认值
  res.json({ query: q, page, limit });
});
```

## 中间件

中间件是 Express 的核心概念。如果你理解了前面章节手写的中间件模式，这里会非常熟悉。

### 应用级中间件

所有请求都会经过：

```javascript
// 日志中间件——记录每个请求
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();  // 调用 next() 传递到下一个中间件，忘记调用会导致请求挂起！
});
```

### 路径中间件

只对特定路径生效：

```javascript
// 只对 /api 开头的路径生效
app.use('/api', (req, res, next) => {
  console.log('API 请求');
  // 可以在这里做 API 认证等
  next();
});
```

### 内置中间件

Express 4.16+ 内置了最常用的中间件：

```javascript
// 解析 JSON 请求体（POST/PUT 请求）
// 没有这个，req.body 将是 undefined
app.use(express.json());

// 解析 URL 编码表单（传统 HTML 表单提交）
app.use(express.urlencoded({ extended: true }));

// 静态文件服务——一行搞定！
// 访问 http://localhost:3000/style.css 会返回 public/style.css
app.use(express.static('public'));
```

## 请求对象

Express 扩展了原生 `req` 对象，添加了许多便捷属性：

```javascript
app.post('/users', (req, res) => {
  // 请求体（需要 express.json() 中间件）
  console.log(req.body);        // { name: 'John', email: '...' }
  
  // 路由参数（:id 等）
  console.log(req.params);      // { id: '123' }
  
  // 查询参数（?key=value）
  console.log(req.query);       // { page: '1', limit: '10' }
  
  // 请求头
  console.log(req.headers);     // { 'content-type': 'application/json', ... }
  
  // 其他常用属性
  console.log(req.method);      // 'POST'
  console.log(req.path);        // '/users'（不含查询字符串）
  console.log(req.ip);          // 客户端 IP
  
  res.json({ received: true });
});
```

## 响应对象

Express 的 `res` 对象方法支持**链式调用**，代码更简洁：

```javascript
app.get('/demo', (req, res) => {
  // 发送 JSON（最常用）
  res.json({ data: 'value' });
  
  // 发送文本/HTML
  res.send('Hello');  // 自动检测 Content-Type
  
  // 设置状态码 + 发送（链式调用）
  res.status(404).send('Not Found');
  
  // 重定向
  res.redirect('/new-url');
  res.redirect(301, 'https://new-domain.com');  // 永久重定向
  
  // 发送文件
  res.sendFile('/absolute/path/to/file.pdf');
  
  // 设置头部
  res.set('X-Custom-Header', 'value');
  
  // 设置 Cookie
  res.cookie('token', 'abc123', {
    httpOnly: true,   // 防止 XSS
    maxAge: 86400000  // 1天（毫秒）
  });
});
```

## 路由模块化

**routes/users.js**

```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id });
});

router.post('/', (req, res) => {
  res.status(201).json(req.body);
});

module.exports = router;
```

**app.js**

```javascript
const express = require('express');
const usersRouter = require('./routes/users');

const app = express();

app.use(express.json());
app.use('/api/users', usersRouter);

app.listen(3000);
```

## 错误处理

### 同步错误

```javascript
app.get('/error', (req, res) => {
  throw new Error('Something went wrong');
});
```

### 异步错误

```javascript
app.get('/async-error', async (req, res, next) => {
  try {
    const data = await someAsyncOperation();
    res.json(data);
  } catch (err) {
    next(err);  // 传递给错误处理中间件
  }
});
```

### 错误处理中间件

```javascript
// 放在所有路由之后
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});
```

## 完整示例

```javascript
const express = require('express');
const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// 模拟数据
const users = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

// 路由
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  
  const user = {
    id: users.length + 1,
    name,
    email
  };
  
  users.push(user);
  res.status(201).json(user);
});

app.put('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  Object.assign(user, req.body);
  res.json(user);
});

app.delete('/api/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(index, 1);
  res.status(204).end();
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## 常用中间件

```javascript
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

app.use(cors());              // 跨域支持
app.use(helmet());            // 安全头
app.use(morgan('dev'));       // 请求日志
app.use(compression());       // gzip 压缩
```

安装：

```bash
npm install cors helmet morgan compression
```

## 与原生 HTTP 对比

| 原生 HTTP | Express |
|-----------|---------|
| `http.createServer()` | `express()` |
| `if (req.url === '/users')` | `app.get('/users', ...)` |
| `res.writeHead(200)` | `res.status(200)` |
| `res.end(JSON.stringify(data))` | `res.json(data)` |
| 手动解析请求体 | `express.json()` |

## 本章小结

- Express 简化了路由定义和请求处理
- 内置中间件处理 JSON、表单、静态文件
- 路由模块化让代码更易维护
- 错误处理中间件统一处理异常
- 丰富的第三方中间件生态

下一章我们将学习 Koa 框架。
