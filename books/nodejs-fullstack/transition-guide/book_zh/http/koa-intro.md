# Koa 快速入门

Koa 由 Express 原班人马打造，使用 async/await 重新设计了中间件机制。

## 安装

```bash
npm install koa
```

## 第一个应用

```javascript
const Koa = require('koa');
const app = new Koa();

app.use(async (ctx) => {
  ctx.body = 'Hello World';
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Context 对象

Koa 将 request 和 response 封装在 `ctx` 中：

```javascript
app.use(async (ctx) => {
  // 请求信息
  console.log(ctx.method);      // 请求方法
  console.log(ctx.url);         // 完整 URL
  console.log(ctx.path);        // 路径
  console.log(ctx.query);       // 查询参数对象
  console.log(ctx.headers);     // 请求头
  console.log(ctx.ip);          // 客户端 IP
  
  // 原始对象
  console.log(ctx.request);     // Koa Request
  console.log(ctx.response);    // Koa Response
  console.log(ctx.req);         // Node.js request
  console.log(ctx.res);         // Node.js response
  
  ctx.body = 'OK';
});
```

## 响应

```javascript
app.use(async (ctx) => {
  // 文本
  ctx.body = 'Hello';
  
  // JSON（自动设置 Content-Type）
  ctx.body = { message: 'Hello' };
  
  // HTML
  ctx.type = 'html';
  ctx.body = '<h1>Hello</h1>';
  
  // 状态码
  ctx.status = 201;
  ctx.body = { created: true };
  
  // 设置头部
  ctx.set('X-Custom', 'value');
  
  // 重定向
  ctx.redirect('/new-url');
});
```

## 中间件

Koa 中间件是 async 函数，通过 `await next()` 调用下一个：

```javascript
app.use(async (ctx, next) => {
  console.log('1. 进入');
  await next();
  console.log('5. 离开');
});

app.use(async (ctx, next) => {
  console.log('2. 进入');
  await next();
  console.log('4. 离开');
});

app.use(async (ctx) => {
  console.log('3. 处理');
  ctx.body = 'Done';
});

// 输出顺序：1, 2, 3, 4, 5
```

这就是著名的**洋葱模型**。

## 常用中间件

### 日志

```javascript
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});
```

### 错误处理

```javascript
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    ctx.app.emit('error', err, ctx);
  }
});

// 监听错误
app.on('error', (err, ctx) => {
  console.error('Error:', err.message);
});
```

## 路由

Koa 核心不包含路由，需要安装 koa-router：

```bash
npm install @koa/router
```

```javascript
const Koa = require('koa');
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();

router.get('/', (ctx) => {
  ctx.body = 'Home';
});

router.get('/users', (ctx) => {
  ctx.body = [{ id: 1, name: 'John' }];
});

router.get('/users/:id', (ctx) => {
  ctx.body = { id: ctx.params.id };
});

router.post('/users', (ctx) => {
  ctx.status = 201;
  ctx.body = ctx.request.body;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
```

### 路由分组

```javascript
const Router = require('@koa/router');

const api = new Router({ prefix: '/api' });

api.get('/users', (ctx) => {
  ctx.body = [];
});

api.get('/posts', (ctx) => {
  ctx.body = [];
});

app.use(api.routes());
```

## 请求体解析

```bash
npm install koa-bodyparser
```

```javascript
const bodyParser = require('koa-bodyparser');

app.use(bodyParser());

router.post('/users', (ctx) => {
  const { name, email } = ctx.request.body;
  ctx.body = { name, email };
});
```

## 静态文件

```bash
npm install koa-static
```

```javascript
const serve = require('koa-static');
const path = require('path');

app.use(serve(path.join(__dirname, 'public')));
```

## 完整示例

```javascript
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

// 模拟数据
const users = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

// 错误处理
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
  }
});

// 日志
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`);
});

// 请求体解析
app.use(bodyParser());

// 路由
router.get('/api/users', (ctx) => {
  ctx.body = users;
});

router.get('/api/users/:id', (ctx) => {
  const user = users.find(u => u.id === parseInt(ctx.params.id));
  
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'User not found' };
    return;
  }
  
  ctx.body = user;
});

router.post('/api/users', (ctx) => {
  const { name, email } = ctx.request.body;
  
  if (!name || !email) {
    ctx.status = 400;
    ctx.body = { error: 'Name and email required' };
    return;
  }
  
  const user = {
    id: users.length + 1,
    name,
    email
  };
  
  users.push(user);
  ctx.status = 201;
  ctx.body = user;
});

router.put('/api/users/:id', (ctx) => {
  const user = users.find(u => u.id === parseInt(ctx.params.id));
  
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'User not found' };
    return;
  }
  
  Object.assign(user, ctx.request.body);
  ctx.body = user;
});

router.delete('/api/users/:id', (ctx) => {
  const index = users.findIndex(u => u.id === parseInt(ctx.params.id));
  
  if (index === -1) {
    ctx.status = 404;
    ctx.body = { error: 'User not found' };
    return;
  }
  
  users.splice(index, 1);
  ctx.status = 204;
});

app.use(router.routes());
app.use(router.allowedMethods());

// 404
app.use((ctx) => {
  ctx.status = 404;
  ctx.body = { error: 'Not found' };
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Koa vs Express

| 特性 | Express | Koa |
|------|---------|-----|
| 中间件 | 回调函数 | async/await |
| 错误处理 | 专门的错误中间件 | try/catch |
| 路由 | 内置 | 需要安装 |
| 请求体解析 | 需要安装 | 需要安装 |
| Context | req/res 分离 | ctx 统一 |
| 生态 | 更成熟 | 更现代 |

**选择建议**：
- 新项目推荐 Koa，语法更现代
- 维护老项目继续用 Express
- 两者概念相通，迁移成本低

## 本章小结

- Koa 使用 async/await 处理异步
- ctx 对象统一了请求和响应
- 洋葱模型让中间件可以在请求前后执行代码
- 核心精简，功能通过中间件扩展
- 路由、请求体解析等需要安装额外包

下一章我们将总结从原生 HTTP 到框架的思维过渡。
