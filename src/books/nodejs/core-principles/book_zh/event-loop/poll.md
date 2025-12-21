# Poll阶段深度解析

Poll阶段是事件循环的核心，大部分I/O回调都在这里执行。理解Poll阶段对于掌握Node.js异步机制至关重要。

## Poll阶段的职责

Poll阶段主要负责两件事：

1. **计算阻塞时间**：决定事件循环在这里等待多久
2. **处理I/O事件**：执行I/O相关的回调函数

```
┌─────────────────────────────────────────────────────┐
│                     Poll阶段                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  1. 计算超时时间                              │   │
│  │     - 如果有setImmediate，超时 = 0           │   │
│  │     - 如果有定时器到期，超时 = 0             │   │
│  │     - 否则，等待I/O事件                      │   │
│  └─────────────────────────────────────────────┘   │
│                        │                            │
│                        ▼                            │
│  ┌─────────────────────────────────────────────┐   │
│  │  2. 等待I/O事件（可能阻塞）                   │   │
│  │     - epoll_wait (Linux)                    │   │
│  │     - kqueue (macOS)                        │   │
│  │     - IOCP (Windows)                        │   │
│  └─────────────────────────────────────────────┘   │
│                        │                            │
│                        ▼                            │
│  ┌─────────────────────────────────────────────┐   │
│  │  3. 执行I/O回调                              │   │
│  │     - 处理完成的读/写操作                    │   │
│  │     - 处理新连接                             │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## libuv中的Poll实现

### Linux: epoll

```c
// deps/uv/src/unix/linux.c
void uv__io_poll(uv_loop_t* loop, int timeout) {
  struct epoll_event events[1024];
  int nfds;
  
  // 等待I/O事件
  nfds = epoll_wait(loop->backend_fd, events, 1024, timeout);
  
  // 处理每个就绪的事件
  for (int i = 0; i < nfds; i++) {
    uv__handle_t* handle = events[i].data.ptr;
    
    // 调用相应的回调
    if (events[i].events & EPOLLIN) {
      handle->read_cb(handle);
    }
    if (events[i].events & EPOLLOUT) {
      handle->write_cb(handle);
    }
  }
}
```

### macOS: kqueue

```c
// deps/uv/src/unix/kqueue.c
void uv__io_poll(uv_loop_t* loop, int timeout) {
  struct kevent events[1024];
  struct timespec ts;
  int nfds;
  
  ts.tv_sec = timeout / 1000;
  ts.tv_nsec = (timeout % 1000) * 1000000;
  
  // 等待I/O事件
  nfds = kevent(loop->backend_fd, NULL, 0, events, 1024, &ts);
  
  // 处理事件...
}
```

### Windows: IOCP

```c
// deps/uv/src/win/core.c
void uv__poll(uv_loop_t* loop, DWORD timeout) {
  OVERLAPPED_ENTRY entries[64];
  ULONG count;
  
  // 获取完成的I/O操作
  GetQueuedCompletionStatusEx(
    loop->iocp,
    entries,
    64,
    &count,
    timeout,
    FALSE
  );
  
  // 处理完成的操作...
}
```

## Poll阶段的超时计算

### 超时逻辑

```c
int uv__backend_timeout(const uv_loop_t* loop) {
  // 1. 如果循环将要停止，不等待
  if (loop->stop_flag != 0)
    return 0;
    
  // 2. 如果没有活跃的handles和requests，不等待
  if (!uv__has_active_handles(loop) && !uv__has_active_reqs(loop))
    return 0;
    
  // 3. 如果有idle handles，不等待
  if (!QUEUE_EMPTY(&loop->idle_handles))
    return 0;
    
  // 4. 如果有pending的I/O回调，不等待
  if (!QUEUE_EMPTY(&loop->pending_queue))
    return 0;
    
  // 5. 如果有关闭中的handles，不等待
  if (loop->closing_handles != NULL)
    return 0;
    
  // 6. 计算到最近定时器的时间
  return uv__next_timeout(loop);
}
```

### 最近定时器计算

```c
int uv__next_timeout(const uv_loop_t* loop) {
  // 如果没有定时器，返回无限等待
  if (RB_EMPTY(&loop->timer_handles))
    return -1;  // 无限等待
    
  // 获取最近的定时器
  const uv_timer_t* timer = RB_MIN(uv__timers, &loop->timer_handles);
  
  // 计算差值
  uint64_t diff = timer->timeout - loop->time;
  
  if (diff > INT_MAX)
    return INT_MAX;
    
  return (int)diff;
}
```

## Poll阶段的行为

### 场景1：有setImmediate待执行

```javascript
setImmediate(() => {
  console.log('immediate');
});

// Poll阶段不会阻塞，立即进入check阶段
```

```
timers → ... → poll(timeout=0) → check → ...
                    │                 │
                    │                 └─ 执行setImmediate
                    └─ 不等待，立即返回
```

### 场景2：有定时器即将到期

```javascript
setTimeout(() => {
  console.log('timer');
}, 100);

// Poll阶段最多等待100ms
```

```
timers → ... → poll(timeout=100ms) → check → close → timers
                    │                                   │
                    │                                   └─ 执行setTimeout回调
                    └─ 等待I/O或100ms超时
```

### 场景3：只有I/O操作

```javascript
const net = require('net');
const server = net.createServer((socket) => {
  console.log('新连接');
});
server.listen(3000);

// Poll阶段会一直等待直到有连接
```

```
timers → ... → poll(timeout=-1) → ...
                    │
                    └─ 无限等待直到有I/O事件
```

### 场景4：空闲状态

```javascript
// 只有这行代码
console.log('hello');

// 没有异步操作，进程退出
```

```
执行同步代码 → 检查是否有活跃任务 → 没有 → 退出
```

## 回调执行限制

Poll阶段会限制一次迭代中执行的回调数量，防止饿死其他阶段：

```c
// 简化的逻辑
#define UV__IO_POLL_LIMIT 1000

void uv__io_poll(uv_loop_t* loop, int timeout) {
  int count = 0;
  
  while (has_events && count < UV__IO_POLL_LIMIT) {
    // 处理一个事件
    process_event();
    count++;
  }
  
  // 如果还有事件没处理完，下次迭代继续
}
```

## Poll阶段与网络I/O

### TCP连接处理

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  // 这个回调在Poll阶段执行
  console.log('客户端连接');
  
  socket.on('data', (data) => {
    // 这个回调也在Poll阶段执行
    console.log('收到数据:', data.toString());
  });
});

server.listen(3000);
```

### 执行流程

```
1. server.listen() 注册监听socket到epoll

2. Poll阶段：
   ┌─────────────────────────────────────────────┐
   │  epoll_wait() 等待事件                       │
   │                                             │
   │  事件1: 新连接到达                           │
   │    → 触发 connection 回调                   │
   │                                             │
   │  事件2: socket可读                           │
   │    → 触发 data 回调                         │
   │                                             │
   │  事件3: socket可写                           │
   │    → 继续写入缓冲的数据                      │
   └─────────────────────────────────────────────┘

3. 处理完所有就绪事件后，进入下一阶段
```

## Poll阶段与文件I/O

文件I/O不使用epoll/kqueue，而是使用线程池：

```javascript
const fs = require('fs');

fs.readFile('large-file.txt', (err, data) => {
  // 虽然回调在Poll阶段执行
  // 但实际读取是在线程池中完成的
  console.log('文件读取完成');
});
```

### 文件I/O流程

```
主线程                              线程池
   │                                  │
   │ fs.readFile()                    │
   │────────────────────────────────>│
   │                                  │ 读取文件
   │ 继续事件循环                      │ (阻塞操作)
   │                                  │
   │<────────────────────────────────│
   │     通过pipe/事件通知              │
   │                                  │
   │ Poll阶段执行回调                   │
   │                                  │
```

## 深入理解：epoll机制

### 为什么epoll高效

```
传统select/poll：
┌─────────────────────────────────────────────────┐
│ 每次调用都要传递所有监听的fd                       │
│ 内核需要遍历所有fd检查状态                        │
│ O(n) 复杂度                                     │
└─────────────────────────────────────────────────┘

epoll：
┌─────────────────────────────────────────────────┐
│ 内核维护监听列表                                 │
│ 只返回就绪的fd                                  │
│ O(1) 添加/删除，O(就绪数) 获取事件                │
└─────────────────────────────────────────────────┘
```

### epoll三个系统调用

```c
// 1. 创建epoll实例
int epfd = epoll_create1(0);

// 2. 添加/修改/删除监听
struct epoll_event event;
event.events = EPOLLIN | EPOLLOUT;
event.data.fd = socket_fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, socket_fd, &event);

// 3. 等待事件
struct epoll_event events[100];
int n = epoll_wait(epfd, events, 100, timeout);
```

### 边缘触发vs水平触发

```c
// 水平触发(LT) - 默认
// 只要fd就绪就会通知，直到处理完
event.events = EPOLLIN;

// 边缘触发(ET)
// 只在状态变化时通知一次
event.events = EPOLLIN | EPOLLET;
```

libuv默认使用水平触发，更容易正确使用。

## Poll阶段调试

### 追踪I/O事件

```javascript
const { createHook } = require('async_hooks');

createHook({
  init(asyncId, type, triggerAsyncId) {
    if (type.includes('TCP') || type.includes('PIPE')) {
      console.log(`I/O操作: ${type}, ID: ${asyncId}`);
    }
  }
}).enable();
```

### 监控Poll阶段延迟

```javascript
const { monitorEventLoopDelay } = require('perf_hooks');

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  // 高延迟可能意味着Poll阶段回调执行时间过长
  console.log(`Event loop delay: ${h.percentile(99) / 1e6}ms (p99)`);
}, 1000);
```

## 常见问题

### 问题1：Poll阶段阻塞太久

```javascript
// 错误：在回调中执行耗时同步操作
server.on('connection', (socket) => {
  // 这会阻塞整个事件循环
  const result = heavyComputation();  // ❌
  socket.write(result);
});

// 正确：使用Worker线程
const { Worker } = require('worker_threads');

server.on('connection', (socket) => {
  const worker = new Worker('./compute.js');
  worker.on('message', (result) => {
    socket.write(result);
  });
});
```

### 问题2：回调执行顺序不确定

```javascript
// 同一阶段内的回调顺序取决于I/O完成顺序
fs.readFile('a.txt', () => console.log('a'));
fs.readFile('b.txt', () => console.log('b'));

// 输出顺序不确定，取决于哪个文件先读完
```

### 问题3：连接积压

```javascript
// 大量连接同时到达时
server.on('connection', async (socket) => {
  // 每个连接都要数据库查询
  const data = await db.query('...');  // 可能很慢
  socket.write(data);
});

// 解决：使用连接池和超时
const pool = new ConnectionPool({ max: 100 });

server.on('connection', (socket) => {
  socket.setTimeout(5000);
  // 使用连接池限制并发
});
```

## 与其他阶段的关系

```
┌────────────────────────────────────────────────────┐
│                    事件循环                         │
│                                                    │
│  timers ─────────────────────────────────────>     │
│     │                                              │
│     │  如果有到期定时器，执行回调                    │
│     │                                              │
│  pending ────────────────────────────────────>     │
│     │                                              │
│     │  执行上次循环推迟的I/O回调                    │
│     │                                              │
│  poll ───────────────────────────────────────>     │
│     │                                              │
│     │  ┌─ 计算超时时间                             │
│     │  │  - 有setImmediate? → 0                   │
│     │  │  - 有定时器? → min(定时器时间)            │
│     │  │  - 否则 → -1 (无限)                      │
│     │  │                                          │
│     │  └─ 等待I/O，执行回调                        │
│     │                                              │
│  check ──────────────────────────────────────>     │
│     │                                              │
│     │  执行setImmediate回调                        │
│     │                                              │
│  close ──────────────────────────────────────>     │
│                                                    │
└────────────────────────────────────────────────────┘
```

## 深入：I/O多路复用机制

I/O轮询是Node.js异步I/O的核心。下面深入分析libuv如何在不同操作系统上实现高效的I/O多路复用。

### 什么是I/O多路复用

```
传统模型（每连接一个线程）：
┌─────────────────────────────────────────────────────────┐
│  线程1 ─── socket1 ─── 阻塞等待 ─── 读取 ─── 处理      │
│  线程2 ─── socket2 ─── 阻塞等待 ─── 读取 ─── 处理      │
│  线程3 ─── socket3 ─── 阻塞等待 ─── 读取 ─── 处理      │
│  ...                                                   │
│  问题：10000连接需要10000个线程                          │
└─────────────────────────────────────────────────────────┘

I/O多路复用：
┌─────────────────────────────────────────────────────────┐
│  单线程 ─┬─ socket1 ─┐                                  │
│          ├─ socket2 ─┼─ 系统告诉我们哪些就绪 ─── 处理   │
│          └─ socket3 ─┘                                  │
│  优势：一个线程处理10000个连接                           │
└─────────────────────────────────────────────────────────┘
```

### I/O多路复用发展历史

```
select (1983)
   │
   │ 限制1024个fd
   │ 每次调用复制所有fd
   ▼
poll (1997)
   │
   │ 无fd数量限制
   │ 仍需遍历所有fd
   ▼
epoll (Linux 2002) / kqueue (BSD 2000)
   │
   │ O(1)事件通知
   │ 只返回就绪的fd
   ▼
io_uring (Linux 2019)
   │
   │ 异步I/O
   │ 减少系统调用
```

### 水平触发vs边缘触发

```c
// 水平触发（LT，默认）
event.events = EPOLLIN;
// 特点：只要fd可读，每次epoll_wait都会返回
// 优点：简单，不会丢事件
// 缺点：可能重复通知

// 边缘触发（ET）
event.events = EPOLLIN | EPOLLET;
// 特点：只有状态变化时通知一次
// 优点：减少重复通知
// 缺点：必须一次读完所有数据，否则丢失

// libuv使用水平触发，更安全
```

### libuv的I/O抽象

```c
// 统一的watcher结构
struct uv__io_s {
  uv__io_cb cb;          // 回调函数
  void* pending_queue[2]; // pending队列节点
  void* watcher_queue[2]; // watcher队列节点
  unsigned int pevents;   // 待注册的事件
  unsigned int events;    // 当前注册的事件
  int fd;                 // 文件描述符
};
```

## 本章小结

- Poll阶段是事件循环的核心，负责处理大部分I/O回调
- Poll阶段使用系统级异步机制：epoll(Linux)、kqueue(macOS)、IOCP(Windows)
- 超时时间由setImmediate和定时器决定
- 文件I/O使用线程池，网络I/O使用系统异步机制
- 一次迭代中执行的回调数有限制，防止饿死其他阶段
- I/O多路复用允许单线程处理大量连接
- libuv抽象了平台差异，提供统一的API
- 长时间同步操作会阻塞整个事件循环

下一章，我们将深入check阶段，理解setImmediate的工作机制。
