# 事件循环架构总览

事件循环是Node.js的核心，理解它的工作原理是掌握Node.js的关键。本章从整体架构角度介绍事件循环，后续章节将深入各个阶段。

## 为什么需要事件循环

### 传统阻塞模型的问题

```javascript
// 假设每个操作需要100ms
const result1 = readFileSync('file1.txt');   // 等待100ms
const result2 = readFileSync('file2.txt');   // 等待100ms
const result3 = queryDatabase('SELECT ...');  // 等待100ms
// 总时间：300ms
```

在传统阻塞模型中，CPU在等待I/O时完全空闲。对于I/O密集型应用，大部分时间都在等待。

### 事件循环的解决方案

```javascript
// 发起请求，立即返回
readFile('file1.txt', callback1);
readFile('file2.txt', callback2);
queryDatabase('SELECT ...', callback3);
// 总时间：约100ms（并行执行）
```

事件循环允许：
- **非阻塞I/O**：发起操作后立即返回
- **回调机制**：操作完成时通知应用
- **高并发**：单线程处理大量连接

## 事件循环的本质

```
事件循环 = 一个无限循环 + 多个任务队列

while (应用还在运行) {
  1. 检查定时器队列
  2. 检查I/O队列
  3. 执行setImmediate队列
  4. 处理关闭回调
  5. 检查是否需要继续循环
}
```

### 概念模型

```
            ┌─────────────────────────────────────────┐
            │              Node.js进程                 │
            │                                         │
            │   ┌─────────────────────────────────┐   │
            │   │         JavaScript执行栈          │   │
            │   │   (V8引擎执行JavaScript代码)       │   │
            │   └──────────────┬──────────────────┘   │
            │                  │                      │
            │                  ▼                      │
            │   ┌─────────────────────────────────┐   │
            │   │           事件循环               │   │
            │   │         (libuv实现)              │   │
            │   │                                 │   │
            │   │  ┌───────┐  ┌───────┐  ┌─────┐ │   │
            │   │  │timers │─→│ poll  │─→│check│ │   │
            │   │  └───────┘  └───────┘  └─────┘ │   │
            │   │                                 │   │
            │   └─────────────────────────────────┘   │
            │                  │                      │
            │                  ▼                      │
            │   ┌─────────────────────────────────┐   │
            │   │          操作系统内核             │   │
            │   │  (epoll/kqueue/IOCP/线程池)      │   │
            │   └─────────────────────────────────┘   │
            └─────────────────────────────────────────┘
```

## 事件循环的六个阶段

```
   ┌───────────────────────────┐
┌─>│           timers          │  执行setTimeout/setInterval回调
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │     pending callbacks     │  执行延迟的I/O回调
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │       idle, prepare       │  内部使用
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           poll            │  获取新I/O事件，执行I/O回调
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │           check           │  执行setImmediate回调
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
└──┤      close callbacks      │  执行close事件回调
   └───────────────────────────┘
```

### 阶段详解

| 阶段 | 作用 | 典型回调 |
|------|------|---------|
| **timers** | 执行定时器回调 | setTimeout, setInterval |
| **pending callbacks** | 系统级回调 | TCP错误回调 |
| **idle, prepare** | 内部使用 | - |
| **poll** | 执行I/O回调 | fs, http回调 |
| **check** | 执行setImmediate | setImmediate |
| **close callbacks** | 关闭回调 | socket.on('close') |

## 微任务队列

除了六个阶段，还有两个特殊队列：

```
每个阶段之间：
┌─────────────────────────────────────────┐
│  process.nextTick队列                    │  优先级最高
│  (在任何其他队列之前清空)                  │
└─────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│  Promise微任务队列                       │  
│  (Promise.then, queueMicrotask)         │
└─────────────────────────────────────────┘
                    ▼
             进入下一阶段
```

### 执行顺序示例

```javascript
console.log('1. 同步代码');

setTimeout(() => console.log('2. setTimeout'), 0);

setImmediate(() => console.log('3. setImmediate'));

Promise.resolve().then(() => console.log('4. Promise'));

process.nextTick(() => console.log('5. nextTick'));

console.log('6. 同步代码结束');
```

输出：
```
1. 同步代码
6. 同步代码结束
5. nextTick        // nextTick队列
4. Promise         // 微任务队列
2. setTimeout      // timers阶段
3. setImmediate    // check阶段
```

## libuv事件循环实现

### C层面的循环

```c
// deps/uv/src/unix/core.c
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int r;
  
  while (r != 0 && loop->stop_flag == 0) {
    // 更新时间缓存
    uv__update_time(loop);
    
    // 1. timers阶段
    uv__run_timers(loop);
    
    // 2. pending阶段
    uv__run_pending(loop);
    
    // 3. idle阶段
    uv__run_idle(loop);
    
    // 4. prepare阶段
    uv__run_prepare(loop);
    
    // 5. poll阶段（核心）
    uv__io_poll(loop, timeout);
    
    // 6. check阶段
    uv__run_check(loop);
    
    // 7. close阶段
    uv__run_closing_handles(loop);
    
    // 检查是否需要继续
    r = uv__loop_alive(loop);
  }
  
  return r;
}
```

### 时间管理

```c
// libuv使用单调递增时钟，避免系统时间调整的影响
void uv__update_time(uv_loop_t* loop) {
  loop->time = uv__hrtime(UV_CLOCK_FAST) / 1000000;
}
```

## 事件循环的生命周期

### 启动

```javascript
// 当Node.js启动时：
// 1. 执行入口文件的同步代码
// 2. 如果有异步操作，进入事件循环
// 3. 如果没有，直接退出

// 这个脚本执行完就退出
console.log('Hello');

// 这个脚本会保持运行
http.createServer().listen(3000);
```

### 保持活跃

```javascript
// 以下操作会使事件循环保持活跃：

// 1. 活跃的服务器
const server = http.createServer();
server.listen(3000);

// 2. 未完成的定时器
const timer = setInterval(() => {}, 1000);

// 3. 未完成的I/O操作
fs.readFile('large-file.txt', callback);

// 4. 活跃的子进程
const child = spawn('long-running-process');

// 5. 显式保持
process.stdin.resume();
```

### 退出条件

```javascript
// 事件循环在以下条件满足时退出：
// - 没有活跃的handles（服务器、定时器等）
// - 没有活跃的requests（I/O操作）
// - 微任务队列为空

// 可以使用unref()让handle不阻止退出
const timer = setInterval(() => {
  console.log('tick');
}, 1000);
timer.unref();  // 不阻止进程退出

// 相反，ref()使handle阻止退出
timer.ref();
```

## 事件循环与V8的交互

```
┌────────────────────────────────────────────────────┐
│                    事件循环迭代                      │
│                                                    │
│  ┌──────────────────┐   ┌────────────────────┐    │
│  │   libuv检查I/O    │ → │  V8执行回调         │    │
│  │   (非阻塞)        │   │  (执行栈)           │    │
│  └──────────────────┘   └────────────────────┘    │
│           │                       │               │
│           │                       │               │
│           ▼                       ▼               │
│  ┌──────────────────┐   ┌────────────────────┐    │
│  │  收集完成的I/O    │   │  处理微任务队列     │    │
│  │  准备回调        │   │  nextTick, Promise  │    │
│  └──────────────────┘   └────────────────────┘    │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 回调调用过程

```cpp
// src/node.cc
// 当libuv有I/O完成时

void InvokeCallback(uv_handle_t* handle) {
  // 1. 获取保存的JavaScript函数
  Local<Function> callback = ...;
  
  // 2. 进入V8执行
  callback->Call(context, receiver, argc, argv);
  
  // 3. 执行完成后，检查微任务
  isolate->PerformMicrotaskCheckpoint();
}
```

## 常见误解

### 误解1：Node.js是单线程的

```
正确理解：
- JavaScript执行是单线程的
- 事件循环是单线程的
- 但I/O操作使用线程池或系统异步机制

┌──────────────────────────────────────────────┐
│                  主线程                       │
│  ┌───────────────────────────────────────┐   │
│  │  JavaScript执行 + 事件循环              │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  线程池线程1 │ │  线程池线程2 │ │  线程池线程3 │
│  (fs, crypto)│ │  (fs, crypto)│ │  (dns)      │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 误解2：setTimeout(fn, 0)立即执行

```javascript
console.log('start');

setTimeout(() => {
  console.log('timeout');  // 不是立即执行
}, 0);

console.log('end');

// 输出：
// start
// end
// timeout
```

setTimeout最小延迟是1ms（实际可能更长），且必须等当前同步代码执行完。

### 误解3：Promise比setTimeout快

```javascript
// 这是对的，但原因是微任务优先级

setTimeout(() => console.log('1'), 0);
Promise.resolve().then(() => console.log('2'));

// 输出：2, 1
// 原因：微任务在每个阶段之间执行
```

## 事件循环可视化

### 一次完整迭代

```
时间线：─────────────────────────────────────────────>

      timers      poll        check      close
        │           │           │          │
        │   ┌───────┴───────┐   │          │
        │   │等待I/O，执行回调│   │          │
        ▼   └───────────────┘   ▼          ▼
    ────●───────────●───────────●──────────●────
        │           │           │          │
        │           │           │          │
    setTimeout   fs.read    setImmediate socket.close
     callback    callback     callback    callback

    ▲─────────── 微任务队列在各阶段之间执行 ───────────▲
```

### 实时观察事件循环

```javascript
const { monitorEventLoopDelay } = require('perf_hooks');

// 监控事件循环延迟
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setTimeout(() => {
  console.log('事件循环延迟统计：');
  console.log('min:', h.min / 1e6, 'ms');
  console.log('max:', h.max / 1e6, 'ms');
  console.log('mean:', h.mean / 1e6, 'ms');
  console.log('p99:', h.percentile(99) / 1e6, 'ms');
  h.disable();
}, 5000);
```

## 本章小结

- 事件循环是Node.js处理异步操作的核心机制
- libuv提供跨平台的事件循环实现
- 六个阶段：timers → pending → idle/prepare → poll → check → close
- 微任务队列（nextTick和Promise）在每个阶段之间执行
- JavaScript执行是单线程的，但I/O可以并行
- 事件循环在没有活跃任务时自动退出

下一章，我们将深入poll阶段——事件循环中最重要也最复杂的阶段。
