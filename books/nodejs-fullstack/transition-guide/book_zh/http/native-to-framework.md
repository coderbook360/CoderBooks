# 从原生到框架的思维过渡

学完原生 HTTP 和框架，我们来回顾整个演进过程，建立清晰的技术认知。

## 演进路径

```
原生 http 模块
    ↓ 代码重复
封装路由器
    ↓ 逻辑耦合
引入中间件
    ↓ 功能完善
Express/Koa
```

## 核心问题的解决

### 问题一：路由管理

**原生写法**

```javascript
if (req.url === '/users' && req.method === 'GET') {
  // 处理逻辑
} else if (req.url.startsWith('/users/') && req.method === 'GET') {
  const id = req.url.split('/')[2];
  // 处理逻辑
}
```

**Express 写法**

```javascript
app.get('/users', listUsers);
app.get('/users/:id', getUser);
```

**本质**：把路由匹配从业务代码中抽离，声明式定义路由。

### 问题二：请求解析

**原生写法**

```javascript
const chunks = [];
req.on('data', chunk => chunks.push(chunk));
req.on('end', () => {
  const body = Buffer.concat(chunks).toString();
  const data = JSON.parse(body);
  // 处理逻辑
});
```

**Express 写法**

```javascript
app.use(express.json());

app.post('/users', (req, res) => {
  const data = req.body;  // 直接可用
});
```

**本质**：通过中间件预处理请求，让处理函数专注业务。

### 问题三：响应构建

**原生写法**

```javascript
res.statusCode = 200;
res.setHeader('Content-Type', 'application/json');
res.end(JSON.stringify({ success: true }));
```

**Express 写法**

```javascript
res.json({ success: true });
```

**本质**：封装常用操作，减少重复代码。

### 问题四：代码复用

**原生写法**

```javascript
// 每个路由都要写
const token = req.headers['authorization'];
if (!token) {
  res.statusCode = 401;
  res.end('Unauthorized');
  return;
}
```

**中间件写法**

```javascript
app.use(authMiddleware);  // 一次注册，所有路由生效
```

**本质**：横切关注点通过中间件集中处理。

## 框架做了什么

框架的价值在于：

1. **约定优于配置**：统一的代码组织方式
2. **常用功能内置**：路由、静态文件、错误处理
3. **扩展机制**：中间件、插件系统
4. **社区生态**：大量现成的中间件

## 何时用原生

原生 http 适合：

- **简单场景**：健康检查、webhook 接收
- **学习目的**：理解底层原理
- **极致性能**：每一行代码都可控
- **特殊需求**：框架无法满足的场景

## 何时用框架

框架适合：

- **业务应用**：CRUD、API、Web 站点
- **团队协作**：统一规范，降低学习成本
- **快速开发**：利用现成中间件
- **长期维护**：代码结构清晰

## 常见误区

### 误区一：框架封装了性能

框架本质是代码组织工具，性能开销很小。真正的性能瓶颈通常是：
- 数据库查询
- 网络 I/O
- 业务逻辑

### 误区二：必须精通原生才能用框架

可以先用框架，遇到问题再深入原理。但理解原生会帮助你：
- 调试疑难问题
- 做出更好的技术决策
- 编写自定义中间件

### 误区三：Express 和 Koa 差别很大

核心思想相同，都是中间件模式。差别主要在：
- Koa 用 async/await
- Koa 用 ctx 统一上下文
- Koa 核心更精简

## 技术选型建议

### 小型项目

```javascript
// 直接用 Express，开箱即用
const express = require('express');
const app = express();
app.use(express.json());
// ... 路由
app.listen(3000);
```

### 中型项目

```
project/
├── src/
│   ├── routes/
│   ├── middlewares/
│   ├── controllers/
│   └── app.js
├── package.json
└── README.md
```

### 大型项目

考虑更完整的框架：
- **NestJS**：TypeScript + 依赖注入 + 模块化
- **Fastify**：高性能 + 插件系统
- **Hono**：轻量 + 多运行时支持

## 从前端到后端的思维转变

### 状态管理

前端：组件状态、全局 Store
后端：无状态设计，状态存数据库/缓存

### 错误处理

前端：try-catch + 用户提示
后端：中间件统一捕获 + 日志记录 + 监控告警

### 安全意识

前端：XSS 防护
后端：SQL 注入、权限验证、输入校验、速率限制

### 性能考量

前端：渲染性能、包体积
后端：并发处理、数据库优化、缓存策略

## 后续学习路径

```
HTTP 基础（已完成）
    ↓
数据库集成
    ↓
认证与授权
    ↓
API 设计
    ↓
测试与部署
```

## 本章小结

- 框架是对原生能力的封装和组织
- 理解演进过程，才能灵活应对变化
- 选择框架要考虑团队、项目规模、长期维护
- 原生知识是调试和优化的基础
- 后端思维关注无状态、错误处理、安全性

至此，你已经具备了构建 HTTP 服务的基础能力。在后续章节中，我们将深入命令行工具开发。
