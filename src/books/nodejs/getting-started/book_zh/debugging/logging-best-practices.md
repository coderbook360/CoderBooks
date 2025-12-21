# 日志规范与最佳实践

生产环境中，日志是排查问题的重要手段。

## 日志级别

按严重程度划分：

| 级别 | 用途 |
|------|------|
| error | 错误，需要处理 |
| warn | 警告，可能有问题 |
| info | 重要信息，正常流程 |
| debug | 调试信息，开发用 |

```javascript
logger.error('数据库连接失败', { error: err.message });
logger.warn('请求超时，已重试', { retries: 3 });
logger.info('用户登录成功', { userId: 123 });
logger.debug('请求详情', { body: req.body });
```

## 简单日志封装

```javascript
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const logger = {
  error(msg, data) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(JSON.stringify({ level: 'error', msg, ...data, time: new Date().toISOString() }));
    }
  },
  warn(msg, data) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(JSON.stringify({ level: 'warn', msg, ...data, time: new Date().toISOString() }));
    }
  },
  info(msg, data) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(JSON.stringify({ level: 'info', msg, ...data, time: new Date().toISOString() }));
    }
  },
  debug(msg, data) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(JSON.stringify({ level: 'debug', msg, ...data, time: new Date().toISOString() }));
    }
  }
};

module.exports = logger;
```

## 使用 Pino

高性能日志库：

```bash
npm install pino
```

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

logger.info('应用启动');
logger.info({ userId: 123 }, '用户登录');
logger.error({ err: error }, '处理失败');
```

### 格式化输出（开发环境）

```bash
npm install pino-pretty
```

```javascript
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});
```

或命令行：

```bash
node app.js | npx pino-pretty
```

## 使用 Winston

功能丰富的日志库：

```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

logger.info('应用启动');
logger.error('发生错误', { error: err.message });
```

## 结构化日志

使用 JSON 格式便于分析：

```javascript
// 好的日志
logger.info({
  event: 'user_login',
  userId: 123,
  ip: '192.168.1.1',
  duration: 45
});

// 输出
{"level":"info","event":"user_login","userId":123,"ip":"192.168.1.1","duration":45,"time":"2024-01-01T10:00:00.000Z"}
```

## 请求日志

```javascript
const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino();
const app = express();

app.use(pinoHttp({ logger }));

app.get('/users', (req, res) => {
  req.log.info('获取用户列表');
  res.json([]);
});
```

自定义请求日志：

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip
    });
  });
  
  next();
});
```

## 错误日志

```javascript
function logError(err, context = {}) {
  logger.error({
    message: err.message,
    stack: err.stack,
    code: err.code,
    ...context
  });
}

// 使用
try {
  await processOrder(orderId);
} catch (err) {
  logError(err, { orderId, action: 'processOrder' });
}
```

## 敏感信息脱敏

```javascript
function sanitize(obj) {
  const sensitive = ['password', 'token', 'secret', 'authorization'];
  const result = { ...obj };
  
  for (const key of sensitive) {
    if (result[key]) {
      result[key] = '***';
    }
  }
  
  return result;
}

logger.info(sanitize(req.body));
```

## 请求 ID 追踪

```javascript
const { v4: uuid } = require('uuid');

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuid();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// 在日志中包含请求 ID
app.use((req, res, next) => {
  req.log = {
    info: (msg, data) => logger.info({ ...data, requestId: req.id, msg }),
    error: (msg, data) => logger.error({ ...data, requestId: req.id, msg })
  };
  next();
});
```

## 日志轮转

使用 winston-daily-rotate-file：

```bash
npm install winston-daily-rotate-file
```

```javascript
const DailyRotateFile = require('winston-daily-rotate-file');

const transport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  transports: [transport]
});
```

## 日志建议

**应该记录**：
- 应用启动和关闭
- 用户认证事件
- 重要业务操作
- 错误和异常
- 性能指标

**不应记录**：
- 密码和令牌
- 个人隐私信息
- 过于频繁的调试信息

**格式规范**：
- 使用 JSON 格式
- 包含时间戳
- 包含日志级别
- 包含请求 ID（Web 应用）

## 本章小结

- 使用日志级别控制输出
- 结构化 JSON 日志便于分析
- Pino 性能好，Winston 功能丰富
- 请求日志包含方法、URL、状态、耗时
- 脱敏敏感信息
- 使用请求 ID 追踪调用链

下一章我们将学习性能问题诊断。
