# process 模块：环境变量与进程信息

## 章节定位

本章是新增的关键章节。process 是 Node.js 中最重要的全局对象之一，提供了进程信息和环境变量访问。前端开发者可能只用过 process.env，但 process 的能力远不止此。

## 学习目标

读完本章，读者应该能够：

1. 理解 process 对象的作用和重要性
2. 掌握环境变量的读取和最佳实践
3. 了解进程信息的获取方法
4. 掌握标准输入输出的使用
5. 理解进程退出和信号处理

## 核心知识点

### 1. process 是什么

- Node.js 的全局对象，无需 require
- 提供当前进程的信息和控制能力
- 类似浏览器中的 window，但面向进程而非窗口

### 2. 环境变量

```javascript
// 读取环境变量
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV;

// 设置环境变量（仅影响当前进程）
process.env.MY_VAR = 'value';

// 常见环境变量
// NODE_ENV: development/production/test
// PORT: 服务端口
// DEBUG: 调试标志
// PATH: 系统路径
```

**dotenv 最佳实践**
```javascript
require('dotenv').config();
// 或 ES Modules
import 'dotenv/config';
```

**.env 文件**
```
PORT=3000
DATABASE_URL=mongodb://localhost/mydb
JWT_SECRET=your-secret-key
```

### 3. 进程信息

```javascript
// 基本信息
process.pid;          // 进程 ID
process.ppid;         // 父进程 ID
process.title;        // 进程标题
process.version;      // Node.js 版本
process.versions;     // 各组件版本

// 运行环境
process.platform;     // 'darwin', 'win32', 'linux'
process.arch;         // 'x64', 'arm64'
process.cwd();        // 当前工作目录
process.execPath;     // Node.js 可执行文件路径

// 资源使用
process.memoryUsage();  // 内存使用情况
process.cpuUsage();     // CPU 使用情况
process.uptime();       // 进程运行时间（秒）
```

### 4. 命令行参数

```javascript
// node app.js --port 3000 --env production
console.log(process.argv);
// [
//   '/usr/local/bin/node',    // node 路径
//   '/path/to/app.js',        // 脚本路径
//   '--port',
//   '3000',
//   '--env',
//   'production'
// ]

// 实际参数从 argv[2] 开始
const args = process.argv.slice(2);
```

### 5. 标准输入输出

```javascript
// 标准输出
process.stdout.write('Hello\n');
console.log('Hello'); // 内部调用 stdout

// 标准错误
process.stderr.write('Error message\n');
console.error('Error'); // 内部调用 stderr

// 标准输入
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  console.log('输入:', chunk.trim());
});
```

### 6. 进程退出

```javascript
// 正常退出
process.exit(0);

// 异常退出
process.exit(1);

// 优雅退出（完成当前任务后退出）
process.exitCode = 0;

// 退出事件
process.on('exit', code => {
  console.log('进程即将退出，退出码:', code);
  // 注意：此处只能执行同步代码
});
```

### 7. 信号处理

```javascript
// 处理 Ctrl+C
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号');
  // 清理资源
  process.exit(0);
});

// 处理终止信号
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号');
  // 优雅关闭
});
```

## 写作要求

### 内容结构

1. **开篇**：以"Node.js 如何获取运行环境信息？"切入
2. **process 概览**：是什么、能做什么
3. **环境变量**：读取、设置、dotenv
4. **进程信息**：各种属性和方法
5. **命令行参数**：argv 的使用
6. **输入输出**：stdin/stdout/stderr
7. **退出处理**：优雅退出和信号

### 代码示例要求

- 实用的代码片段
- 展示实际输出
- 突出常用场景

### 避免的内容

- 不要深入进程管理（child_process）
- 不要讲 cluster 模块
- 不要讲进程间通信
- 保持入门级别

## 章节长度

约 2500-3000 字。
