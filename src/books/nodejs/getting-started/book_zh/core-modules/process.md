# process 模块：环境变量与进程信息

`process` 是 Node.js 中最重要的全局对象之一。它提供了当前进程的信息和控制能力——环境变量、命令行参数、标准输入输出、进程生命周期管理。

## process 是什么

在浏览器中，`window` 是全局对象，代表浏览器窗口。在 Node.js 中，`process` 是核心全局对象，代表当前 Node.js 进程。

```javascript
// 无需 require，直接使用
console.log(process.version);  // Node.js 版本
console.log(process.platform); // 操作系统
console.log(process.pid);      // 进程 ID
```

## 环境变量

### 读取环境变量

```javascript
// 最常用
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// 判断环境
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
```

### 常见环境变量

| 变量 | 说明 |
|------|------|
| `NODE_ENV` | 运行环境：development/production/test |
| `PORT` | 服务端口 |
| `DEBUG` | 调试模式标志 |
| `PATH` | 系统可执行文件路径 |
| `HOME` / `USERPROFILE` | 用户主目录 |

### 设置环境变量

```javascript
// 代码中设置（仅影响当前进程和子进程）
process.env.MY_VAR = 'value';
```

命令行设置：

```bash
# Linux/macOS
PORT=3000 NODE_ENV=production node app.js

# Windows PowerShell
$env:PORT=3000; $env:NODE_ENV="production"; node app.js

# 跨平台：使用 cross-env
npx cross-env PORT=3000 NODE_ENV=production node app.js
```

### dotenv 最佳实践

使用 `.env` 文件管理环境变量：

```bash
npm install dotenv
```

创建 `.env` 文件：

```
PORT=3000
DATABASE_URL=mongodb://localhost/mydb
JWT_SECRET=your-secret-key
DEBUG=true
```

在代码中加载：

```javascript
require('dotenv').config();

// 或 ES Modules
import 'dotenv/config';

// 现在可以使用
const port = process.env.PORT;
```

**重要**：将 `.env` 添加到 `.gitignore`，不要提交到版本控制。

### 环境变量验证

```javascript
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`缺少环境变量: ${missing.join(', ')}`);
    process.exit(1);
  }
}

validateEnv();
```

## 进程信息

### 基本信息

```javascript
console.log(process.pid);       // 进程 ID
console.log(process.ppid);      // 父进程 ID
console.log(process.title);     // 进程标题
console.log(process.version);   // Node.js 版本 'v18.12.0'
console.log(process.versions);  // 所有依赖版本

console.log(process.platform);  // 'darwin', 'linux', 'win32'
console.log(process.arch);      // 'x64', 'arm64'
```

### 工作目录

```javascript
// 当前工作目录
console.log(process.cwd());

// 切换工作目录
process.chdir('/path/to/dir');
```

### 运行时间

```javascript
// 进程运行秒数
console.log(process.uptime());  // 123.456
```

## 命令行参数

### process.argv

```javascript
// 运行: node app.js --port 3000 --debug
console.log(process.argv);
// [
//   '/usr/local/bin/node',    // Node.js 可执行文件路径
//   '/path/to/app.js',        // 脚本路径
//   '--port',
//   '3000',
//   '--debug'
// ]

// 获取实际参数
const args = process.argv.slice(2);
// ['--port', '3000', '--debug']
```

### 简单参数解析

```javascript
function parseArgs(args) {
  const result = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  
  return result;
}

const options = parseArgs(process.argv.slice(2));
// { port: '3000', debug: true }
```

实际项目建议使用 `commander` 或 `yargs`。

## 标准输入输出

### 标准输出

```javascript
// 标准输出
process.stdout.write('Hello');
process.stdout.write(' World\n');

// console.log 内部使用 process.stdout
console.log('Hello');
// 等价于
process.stdout.write('Hello\n');
```

### 标准错误

```javascript
// 标准错误（不缓冲）
process.stderr.write('错误信息\n');

// console.error 内部使用 process.stderr
console.error('Error:', message);
```

### 标准输入

```javascript
// 读取用户输入
process.stdin.setEncoding('utf8');

process.stdin.on('data', (data) => {
  console.log('你输入了:', data.trim());
});

// 或使用 readline
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('你的名字是? ', (answer) => {
  console.log(`你好, ${answer}!`);
  rl.close();
});
```

## 内存使用

```javascript
const usage = process.memoryUsage();

console.log({
  rss: formatBytes(usage.rss),          // 常驻内存
  heapTotal: formatBytes(usage.heapTotal), // 堆总大小
  heapUsed: formatBytes(usage.heapUsed),   // 堆已用
  external: formatBytes(usage.external),   // C++ 对象
  arrayBuffers: formatBytes(usage.arrayBuffers)
});

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
```

## 进程退出

### 正常退出

```javascript
// 退出码 0 表示成功
process.exit(0);

// 退出码非 0 表示错误
process.exit(1);
```

### 退出事件

```javascript
// 即将退出（同步代码）
process.on('beforeExit', (code) => {
  console.log('进程即将退出，退出码:', code);
  // 可以做清理工作
  // 注意：不会在 process.exit() 调用时触发
});

// 已退出
process.on('exit', (code) => {
  console.log('进程退出，退出码:', code);
  // 只能执行同步代码
});
```

### 优雅退出

```javascript
function gracefulShutdown(signal) {
  console.log(`收到 ${signal}，开始优雅关闭...`);
  
  // 停止接受新连接
  server.close(() => {
    console.log('HTTP 服务器已关闭');
    
    // 关闭数据库连接
    db.close(() => {
      console.log('数据库连接已关闭');
      process.exit(0);
    });
  });
  
  // 超时强制退出
  setTimeout(() => {
    console.error('关闭超时，强制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## 信号处理

```javascript
// 常见信号
// SIGTERM: 终止请求（可处理）
// SIGINT: 中断（Ctrl+C）
// SIGHUP: 挂起
// SIGKILL: 强制终止（不可处理）

process.on('SIGINT', () => {
  console.log('收到 SIGINT');
  process.exit(0);
});
```

## 未捕获错误处理

```javascript
// 未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  // 建议退出进程，状态可能已损坏
  process.exit(1);
});
```

## nextTick

`process.nextTick` 在当前操作完成后、事件循环继续前执行：

```javascript
console.log('1');

process.nextTick(() => {
  console.log('2 - nextTick');
});

Promise.resolve().then(() => {
  console.log('3 - Promise');
});

console.log('4');

// 输出: 1, 4, 2 - nextTick, 3 - Promise
```

`nextTick` 优先级高于 Promise。

## 实战示例

### 启动信息打印

```javascript
function printStartupInfo() {
  console.log('='.repeat(50));
  console.log(`应用启动`);
  console.log(`Node.js: ${process.version}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PID: ${process.pid}`);
  console.log(`工作目录: ${process.cwd()}`);
  console.log('='.repeat(50));
}
```

### 配置管理

```javascript
const config = {
  port: parseInt(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true',
  db: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 10
  }
};

// 验证必需配置
if (!config.db.url) {
  console.error('错误: DATABASE_URL 未设置');
  process.exit(1);
}

module.exports = config;
```

## 本章小结

- `process` 是全局对象，提供进程信息和控制能力
- `process.env` 访问环境变量，配合 dotenv 使用
- `process.argv` 获取命令行参数
- `process.stdout/stderr/stdin` 处理标准输入输出
- 使用 `process.on('SIGTERM')` 实现优雅退出
- `process.memoryUsage()` 监控内存使用

恭喜你完成了核心模块的学习！下一部分我们将学习 HTTP 服务开发。
