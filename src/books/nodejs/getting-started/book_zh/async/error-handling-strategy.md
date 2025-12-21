# 异步错误处理策略：构建健壮的 Node.js 应用

在同步代码中，一个 try-catch 就能捕获所有错误。但在异步世界里，错误处理变得复杂得多。

未处理的异步错误是 Node.js 应用崩溃的主要原因之一。本章我们将建立一套系统性的异步错误处理策略。

## 异步错误的特殊性

### 为什么 try-catch 不够用

```javascript
// 这个 try-catch 捕获不到异步错误
try {
  setTimeout(() => {
    throw new Error('异步错误');  // 逃逸了！
  }, 100);
} catch (err) {
  console.log('捕获到错误');  // 永远不会执行
}
```

原因：`setTimeout` 的回调在不同的调用栈中执行，当错误发生时，原来的 try-catch 早已执行完毕。

### 不同异步模式的错误处理

**回调模式**：

```javascript
fs.readFile('/not-exist.txt', (err, data) => {
  if (err) {
    // 必须在回调内处理
    console.error('读取失败:', err.message);
    return;
  }
  console.log(data);
});
```

**Promise 模式**：

```javascript
readFileAsync('/not-exist.txt')
  .then(data => console.log(data))
  .catch(err => console.error('读取失败:', err.message));
```

**async/await 模式**：

```javascript
async function read() {
  try {
    const data = await readFileAsync('/not-exist.txt');
    console.log(data);
  } catch (err) {
    console.error('读取失败:', err.message);
  }
}
```

## 错误处理的层次结构

一个健壮的应用需要多层错误处理：

```
┌─────────────────────────────────────────┐
│ 全局未捕获异常处理（最后防线）            │
├─────────────────────────────────────────┤
│ 中间件/框架级错误处理                    │
├─────────────────────────────────────────┤
│ 业务模块级错误处理                       │
├─────────────────────────────────────────┤
│ 函数级 try-catch                        │
└─────────────────────────────────────────┘
```

### 函数级：精细的错误处理

```javascript
async function getUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    // 转换为业务错误
    if (err.message.includes('404')) {
      throw new UserNotFoundError(userId);
    }
    if (err.code === 'ECONNREFUSED') {
      throw new ServiceUnavailableError('用户服务不可用');
    }
    throw err;  // 未知错误继续向上传播
  }
}
```

### 模块级：统一处理本模块的错误

```javascript
class UserService {
  async getUser(id) {
    return this.handleError(() => this.fetchUser(id));
  }
  
  async updateUser(id, data) {
    return this.handleError(() => this.patchUser(id, data));
  }
  
  async handleError(operation) {
    try {
      return await operation();
    } catch (err) {
      // 记录日志
      logger.error('UserService 错误', { error: err });
      
      // 转换错误
      if (err instanceof NetworkError) {
        throw new ServiceUnavailableError('用户服务暂时不可用');
      }
      throw err;
    }
  }
}
```

### 中间件级：Web 框架的错误处理

Express 错误处理中间件：

```javascript
// 异步错误包装器
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 路由使用
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json(user);
}));

// 错误处理中间件（4个参数）
app.use((err, req, res, next) => {
  logger.error('请求错误', {
    error: err,
    url: req.url,
    method: req.method
  });
  
  // 根据错误类型返回不同响应
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  // 不暴露内部错误细节
  res.status(500).json({ error: '服务器内部错误' });
});
```

### 全局级：最后的防线

```javascript
// 未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', { reason });
  
  // 在生产环境，可能需要优雅退出
  // gracefulShutdown();
});

// 未捕获的同步异常
process.on('uncaughtException', err => {
  logger.error('未捕获的异常', { error: err });
  
  // 必须退出进程，状态可能已损坏
  process.exit(1);
});
```

## 自定义错误类

创建语义化的错误类，便于分类处理：

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;  // 区分操作错误和程序错误
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} ${id} 不存在`, 404, 'NOT_FOUND');
    this.resource = resource;
    this.resourceId = id;
  }
}

class ValidationError extends AppError {
  constructor(message, fields = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

使用自定义错误：

```javascript
async function getUser(id) {
  const user = await db.users.findById(id);
  
  if (!user) {
    throw new NotFoundError('用户', id);
  }
  
  return user;
}
```

## 操作错误 vs 程序错误

区分两类错误非常重要：

**操作错误**：可预期的运行时问题
- 网络请求失败
- 文件不存在
- 用户输入无效
- 数据库连接断开

处理策略：记录日志，返回友好错误信息，可能重试

**程序错误**：代码缺陷
- 调用未定义的变量
- 传递错误类型的参数
- 逻辑错误

处理策略：记录错误，重启进程（状态可能已损坏）

```javascript
function handleError(err) {
  if (err.isOperational) {
    // 操作错误：记录并继续
    logger.warn('操作错误', { error: err });
    return;
  }
  
  // 程序错误：记录并准备重启
  logger.error('程序错误', { error: err });
  gracefulShutdown();
}
```

## 错误重试策略

对于临时性错误，重试可能成功：

```javascript
async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = () => true
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (attempt === retries || !shouldRetry(err)) {
        throw err;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      logger.warn(`尝试 ${attempt} 失败，${waitTime}ms 后重试`, {
        error: err.message
      });
      
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
  
  throw lastError;
}

// 使用
const data = await retry(
  () => fetchFromApi('/data'),
  {
    retries: 3,
    delay: 1000,
    backoff: 2,
    shouldRetry: err => err.code === 'ECONNRESET'
  }
);
```

## 错误日志最佳实践

### 结构化日志

```javascript
const logger = {
  error(message, context = {}) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...context,
      error: context.error ? {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
        code: context.error.code
      } : undefined
    }));
  }
};
```

### 包含足够的上下文

```javascript
async function processOrder(orderId) {
  try {
    const order = await fetchOrder(orderId);
    await validateOrder(order);
    await chargePayment(order);
    await sendConfirmation(order);
  } catch (err) {
    logger.error('订单处理失败', {
      error: err,
      orderId,
      step: err.step || 'unknown',
      userId: order?.userId
    });
    throw err;
  }
}
```

### 错误追踪 ID

```javascript
const { randomUUID } = require('crypto');

function withErrorTracking(fn) {
  return async (...args) => {
    const traceId = randomUUID();
    
    try {
      return await fn(...args);
    } catch (err) {
      err.traceId = traceId;
      logger.error('操作失败', { error: err, traceId });
      throw err;
    }
  };
}
```

## 优雅关闭

当发生严重错误时，优雅关闭比直接崩溃更好：

```javascript
async function gracefulShutdown(exitCode = 1) {
  logger.info('开始优雅关闭...');
  
  // 设置超时，防止无限等待
  const forceExit = setTimeout(() => {
    logger.error('强制退出');
    process.exit(1);
  }, 10000);
  
  try {
    // 1. 停止接受新请求
    server.close();
    
    // 2. 等待现有请求完成
    await waitForActiveRequests();
    
    // 3. 关闭数据库连接
    await db.close();
    
    // 4. 关闭其他资源
    await messageQueue.close();
    
    clearTimeout(forceExit);
    logger.info('优雅关闭完成');
    process.exit(exitCode);
    
  } catch (err) {
    logger.error('关闭过程出错', { error: err });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown(0));
process.on('SIGINT', () => gracefulShutdown(0));
```

## 实战模式总结

### 1. 早失败

```javascript
function processData(data) {
  // 函数开头就验证
  if (!data) throw new ValidationError('数据不能为空');
  if (!data.id) throw new ValidationError('缺少 ID');
  
  // 验证通过后执行逻辑
  // ...
}
```

### 2. 错误边界

```javascript
// 不让一个组件的错误影响整个系统
async function processItems(items) {
  const results = [];
  
  for (const item of items) {
    try {
      results.push(await processItem(item));
    } catch (err) {
      results.push({ error: err.message, item });
      // 继续处理其他项
    }
  }
  
  return results;
}
```

### 3. 失败快照

```javascript
async function complexOperation() {
  const snapshot = createSnapshot();  // 保存当前状态
  
  try {
    await step1();
    await step2();
    await step3();
  } catch (err) {
    await restoreSnapshot(snapshot);  // 回滚
    throw err;
  }
}
```

## 本章小结

- 异步错误需要在异步上下文中捕获
- 建立多层错误处理：函数级 → 模块级 → 中间件级 → 全局级
- 区分操作错误和程序错误，采取不同处理策略
- 使用自定义错误类实现语义化的错误处理
- 对临时性错误实施重试策略
- 记录结构化日志，包含足够的上下文信息
- 实现优雅关闭，保护系统状态

下一章，我们将总结异步编程中的常见陷阱和最佳实践。
