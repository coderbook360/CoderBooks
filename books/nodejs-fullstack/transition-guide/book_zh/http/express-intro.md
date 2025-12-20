# Express 快速入门

Express 是 Node.js 最流行的 Web 框架，基于我们之前学习的中间件模式构建。

## 安装

```bash
npm install express
```

## 第一个应用

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## 路由

### 基本路由

```javascript
app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

app.post('/users', (req, res) => {
  res.status(201).json({ message: 'Created' });
});

app.put('/users/:id', (req, res) => {
  res.json({ message: `Updated ${req.params.id}` });
});

app.delete('/users/:id', (req, res) => {
  res.json({ message: `Deleted ${req.params.id}` });
});
```

### 路由参数

```javascript
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});

// 多个参数
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({ userId, postId });
});
```

### 查询参数

```javascript
app.get('/search', (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  res.json({ query: q, page, limit });
});
// GET /search?q=nodejs&page=2
```

## 中间件

### 应用级中间件

```javascript
// 所有请求都经过
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### 路径中间件

```javascript
// 只对 /api 路径生效
app.use('/api', (req, res, next) => {
  console.log('API 请求');
  next();
});
```

### 内置中间件

```javascript
// 解析 JSON
app.use(express.json());

// 解析 URL 编码表单
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use(express.static('public'));
```

## 请求对象

```javascript
app.post('/users', (req, res) => {
  console.log(req.body);        // 请求体（需要中间件）
  console.log(req.params);      // 路由参数
  console.log(req.query);       // 查询参数
  console.log(req.headers);     // 请求头
  console.log(req.method);      // 请求方法
  console.log(req.path);        // 路径
  console.log(req.ip);          // 客户端 IP
  
  res.json({ received: true });
});
```

## 响应对象

```javascript
app.get('/demo', (req, res) => {
  // 发送 JSON
  res.json({ data: 'value' });
  
  // 发送文本
  res.send('Hello');
  
  // 设置状态码
  res.status(404).send('Not Found');
  
  // 重定向
  res.redirect('/new-url');
  
  // 发送文件
  res.sendFile('/path/to/file.pdf');
  
  // 设置头部
  res.set('X-Custom', 'value');
  
  // 设置 Cookie
  res.cookie('name', 'value', { httpOnly: true });
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
