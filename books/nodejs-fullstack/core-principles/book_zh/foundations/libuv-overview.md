# libuv跨平台抽象层

libuv是Node.js异步能力的基石。它提供了跨平台的事件循环和异步I/O抽象，让Node.js能在Windows、Linux、macOS等系统上以相同的API运行。

## libuv简介

libuv最初是为Node.js开发的，现已成为独立项目，被Luvit、Julia、Neovim等项目采用。

### 设计目标

1. **跨平台**：统一不同操作系统的异步I/O接口
2. **高性能**：利用各平台最优的I/O多路复用机制
3. **全功能**：涵盖文件、网络、进程、定时器等操作
4. **事件驱动**：基于事件循环的异步编程模型

### libuv解决的问题

不同操作系统有不同的异步I/O机制：

| 操作系统 | 网络I/O | 文件I/O |
|---------|--------|--------|
| Linux | epoll | 无原生异步，需线程池 |
| macOS | kqueue | 无原生异步，需线程池 |
| Windows | IOCP | IOCP |

libuv封装了这些差异，提供统一的API：

```javascript
// 无论在什么平台，这行代码的行为相同
const fs = require('fs');
fs.readFile('data.txt', callback);
```

## 核心概念

### 事件循环（Event Loop）

libuv事件循环是Node.js异步的核心：

```c
// 简化的事件循环结构
while (有待处理的任务) {
    处理定时器回调();
    处理I/O回调();
    处理immediate回调();
    处理关闭回调();
}
```

事件循环在单线程中运行，通过非阻塞I/O实现高并发。

### 句柄（Handles）

句柄代表长期存在的对象，如：

```c
// 句柄类型
uv_tcp_t     // TCP连接
uv_timer_t   // 定时器
uv_fs_poll_t // 文件变化监听
uv_signal_t  // 信号处理
uv_idle_t    // 空闲回调
```

**句柄生命周期**：
```
创建 → 初始化 → 启动 → [运行中] → 停止 → 关闭 → 释放
```

### 请求（Requests）

请求代表一次性操作，如：

```c
// 请求类型
uv_fs_t      // 文件系统操作
uv_write_t   // 写操作
uv_connect_t // 连接操作
uv_getaddrinfo_t // DNS解析
```

**请求生命周期**：
```
创建 → 初始化 → 提交 → [执行中] → 回调 → 释放
```

### 句柄 vs 请求

| 特性 | 句柄 | 请求 |
|-----|-----|------|
| 生命周期 | 长期 | 一次性 |
| 例子 | TCP服务器、定时器 | 文件读取、DNS查询 |
| 状态 | 可启动/停止 | 提交后等待完成 |
| 引用计数 | 影响事件循环退出 | 不影响 |

## 事件循环详解

libuv事件循环包含多个阶段：

```
   ┌───────────────────────────┐
┌─→│         timers           │  ← setTimeout/setInterval
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │     pending callbacks     │  ← 某些系统操作回调
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │       idle, prepare       │  ← 内部使用
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │          poll             │  ← I/O回调
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
│  │          check            │  ← setImmediate
│  └───────────┬───────────────┘
│  ┌───────────┴───────────────┐
└──┤     close callbacks       │  ← socket.on('close')
   └───────────────────────────┘
```

### 各阶段说明

**timers阶段**：
```javascript
// 定时器回调在此阶段执行
setTimeout(() => console.log('timer'), 100);
setInterval(() => console.log('interval'), 1000);
```

**poll阶段**：
```javascript
// 大部分I/O回调在此阶段执行
fs.readFile('data.txt', (err, data) => {
  console.log('file read');  // poll阶段
});

net.createServer(socket => {
  socket.on('data', data => {
    console.log('data received');  // poll阶段
  });
});
```

**check阶段**：
```javascript
// setImmediate回调在此阶段执行
setImmediate(() => console.log('immediate'));
```

**close callbacks阶段**：
```javascript
// 关闭事件回调
socket.on('close', () => console.log('closed'));
```

## 线程池

libuv使用线程池处理某些阻塞操作：

### 使用线程池的操作

```javascript
// 文件系统操作（除了少数例外）
fs.readFile()
fs.writeFile()
fs.stat()

// 加密操作
crypto.pbkdf2()
crypto.randomBytes()

// 压缩操作
zlib.gzip()
zlib.deflate()

// DNS查询（getaddrinfo）
dns.lookup()
```

### 线程池配置

```javascript
// 默认4个线程
// 可通过环境变量调整（1-1024）
process.env.UV_THREADPOOL_SIZE = 8;
```

```bash
# 命令行设置
UV_THREADPOOL_SIZE=16 node app.js
```

### 线程池工作流程

```
主线程                          线程池
   │
   │  fs.readFile(path, cb)
   │  ────────────────────→    Worker获取任务
   │                                │
   │                           执行同步read()
   │                                │
   │  ←────────────────────    完成，回调入队
   │
   │  事件循环取出回调
   │  执行cb(err, data)
```

### 何时增加线程池大小

```javascript
// 监控线程池压力
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  console.log({
    min: histogram.min / 1e6,
    max: histogram.max / 1e6,
    mean: histogram.mean / 1e6,
    percentile99: histogram.percentile(99) / 1e6
  });
}, 5000);
```

如果事件循环延迟高且有大量文件I/O，考虑增加线程池。

## 网络I/O

网络I/O使用操作系统的I/O多路复用，不使用线程池：

### TCP服务器

```c
// libuv层面的TCP服务器（简化）
uv_tcp_t server;
uv_tcp_init(loop, &server);
uv_tcp_bind(&server, addr, 0);
uv_listen((uv_stream_t*)&server, 128, on_connection);
```

对应的Node.js代码：

```javascript
const net = require('net');

const server = net.createServer(socket => {
  socket.on('data', data => {
    socket.write(data);  // echo
  });
});

server.listen(3000);
```

### I/O多路复用

libuv根据平台选择最优机制：

```
Linux:   epoll_wait()
macOS:   kevent()
Windows: GetQueuedCompletionStatusEx()
```

这些机制允许单个线程高效地监视大量文件描述符。

## 定时器实现

### 最小堆结构

libuv使用最小堆存储定时器：

```
           100ms (最小)
          /      \
       200ms    300ms
       /   \
    500ms  400ms
```

### 定时器精度

```javascript
// 定时器不保证精确执行
setTimeout(() => {
  console.log('可能不是恰好1000ms后');
}, 1000);

// 因为：
// 1. 事件循环可能被阻塞
// 2. 定时器只在timers阶段检查
// 3. 系统调度延迟
```

## 信号处理

libuv提供跨平台的信号处理：

```javascript
// Node.js信号处理
process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  gracefulShutdown();
});
```

对应libuv：

```c
uv_signal_t sig;
uv_signal_init(loop, &sig);
uv_signal_start(&sig, on_signal, SIGINT);
```

## 文件系统操作

### 异步文件操作

```javascript
const fs = require('fs');

// 异步版本（使用线程池）
fs.readFile('data.txt', (err, data) => {
  if (err) throw err;
  console.log(data);
});
```

libuv层面：

```c
uv_fs_t req;
uv_fs_read(loop, &req, fd, &buf, 1, -1, on_read);
// 在线程池中执行，完成后回调
```

### 同步文件操作

```javascript
// 同步版本（阻塞主线程）
const data = fs.readFileSync('data.txt');
```

libuv层面：

```c
uv_fs_t req;
uv_fs_read(loop, &req, fd, &buf, 1, -1, NULL);  // 无回调
// 直接在主线程执行，阻塞
```

## 子进程

libuv提供跨平台的进程管理：

```javascript
const { spawn } = require('child_process');

const child = spawn('ls', ['-la']);

child.stdout.on('data', data => {
  console.log(`stdout: ${data}`);
});

child.on('close', code => {
  console.log(`child process exited with code ${code}`);
});
```

libuv处理：
- 进程创建（fork/exec或CreateProcess）
- 标准输入输出管道
- 进程退出检测

## 调试libuv

### 查看活跃句柄

```javascript
// 查看什么在保持事件循环运行
process._getActiveHandles().forEach(handle => {
  console.log(handle.constructor.name);
});

process._getActiveRequests().forEach(req => {
  console.log(req.constructor.name);
});
```

### UV_DEBUG

```bash
# 启用libuv调试输出
UV_DEBUG=1 node app.js
```

## 本章小结

- libuv是Node.js跨平台异步I/O的基础
- 提供统一的事件循环模型
- 句柄代表长期对象，请求代表一次性操作
- 线程池处理阻塞操作（文件I/O、加密等）
- 网络I/O使用I/O多路复用，不使用线程池
- 可通过UV_THREADPOOL_SIZE调整线程池大小

libuv和V8共同构成了Node.js的两大支柱：V8负责JavaScript执行，libuv负责异步I/O。理解它们的协作方式，是深入掌握Node.js的关键。

下一章，我们将对比Node.js与浏览器JavaScript的差异，帮助前端开发者顺利过渡到服务端开发。
