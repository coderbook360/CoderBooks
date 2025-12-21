# 事件循环六个阶段详解

事件循环是Node.js异步编程的核心。本章将详细介绍事件循环的六个阶段，帮助你建立完整的心智模型。

## 事件循环全景图

```
   ┌───────────────────────────────────────────────────────────────┐
   │                        事件循环                               │
   │                                                               │
   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
   │  │   timers    │  │   pending   │  │idle/prepare │           │
   │  │             │→ │  callbacks  │→ │  (内部使用)  │           │
   │  │ setTimeout  │  │ 延迟的I/O   │  │             │           │
   │  │ setInterval │  │ 回调        │  │             │           │
   │  └─────────────┘  └─────────────┘  └─────────────┘           │
   │         ↑                                  │                  │
   │         │                                  ↓                  │
   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
   │  │    close    │  │    check    │  │    poll     │           │
   │  │  callbacks  │← │             │← │             │           │
   │  │             │  │ setImmediate│  │   I/O回调   │           │
   │  │ 关闭回调    │  │             │  │   等待I/O   │           │
   │  └─────────────┘  └─────────────┘  └─────────────┘           │
   │                                                               │
   │  注意：process.nextTick和Promise微任务在每个阶段之间执行       │
   └───────────────────────────────────────────────────────────────┘
```

## 阶段概览

| 阶段 | 执行内容 | 关键API |
|------|----------|---------|
| **timers** | 到期的定时器回调 | `setTimeout`, `setInterval` |
| **pending callbacks** | 延迟的系统级I/O回调 | 系统内部 |
| **idle, prepare** | 内部使用 | libuv内部 |
| **poll** | I/O回调，可能阻塞等待 | 文件、网络I/O |
| **check** | setImmediate回调 | `setImmediate` |
| **close callbacks** | 关闭资源的回调 | `socket.on('close')` |

## 第一阶段：Timers

timers阶段执行由`setTimeout`和`setInterval`调度的回调函数。

```javascript
// 这些回调在timers阶段执行
setTimeout(() => {
  console.log('setTimeout 回调');
}, 100);

setInterval(() => {
  console.log('setInterval 回调');
}, 1000);
```

### 关键特性

- 定时器按到期时间排序（使用最小堆）
- 回调只有在指定时间**过后**才会执行，不保证精确
- 一次迭代可能执行多个到期的定时器

```javascript
// 精度示例
const start = Date.now();
setTimeout(() => {
  console.log(`实际延迟: ${Date.now() - start}ms`);
}, 100);
// 可能输出: 实际延迟: 102ms
```

## 第二阶段：Pending Callbacks

执行被推迟到下一轮循环的I/O回调。

```javascript
// 某些系统级错误回调在这里执行
const net = require('net');

const client = net.connect({ port: 9999 });
client.on('error', (err) => {
  // TCP连接错误可能在pending callbacks阶段报告
  console.log('连接错误:', err.code);
});
```

### 什么回调会被推迟？

- TCP连接错误（如 ECONNREFUSED）
- 某些写入错误
- 避免poll阶段处理过多回调

## 第三阶段：Idle, Prepare

这是libuv内部使用的阶段，JavaScript层面不可见，通常不需要关注。

## 第四阶段：Poll

poll阶段是事件循环的核心，负责：

1. **计算阻塞时间**：决定在这里等待多久
2. **执行I/O回调**：处理已完成的I/O操作

```javascript
const fs = require('fs');

// 这个回调在poll阶段执行
fs.readFile('file.txt', (err, data) => {
  console.log('文件读取完成');
});
```

### Poll阶段的阻塞逻辑

```
poll阶段开始
     │
     ▼
检查I/O队列是否有回调
     │
     ├─ 有回调 → 执行回调直到队列为空或达到限制
     │
     └─ 无回调 → 决定是否阻塞等待
                    │
                    ├─ 有setImmediate → 不阻塞，进入check阶段
                    │
                    ├─ 有到期定时器 → 不阻塞，回到timers阶段
                    │
                    └─ 都没有 → 阻塞等待新的I/O事件
```

## 第五阶段：Check

check阶段专门用于执行`setImmediate`回调。

```javascript
setImmediate(() => {
  console.log('setImmediate 回调');
});
```

### setImmediate的特点

- 在poll阶段之后立即执行
- 比`setTimeout(fn, 0)`更高效
- 适合在I/O回调中安排"立即"执行的任务

```javascript
const fs = require('fs');

fs.readFile('file.txt', () => {
  setImmediate(() => {
    console.log('1. setImmediate');
  });
  
  setTimeout(() => {
    console.log('2. setTimeout');
  }, 0);
});

// 输出顺序:
// 1. setImmediate
// 2. setTimeout
```

## 第六阶段：Close Callbacks

执行资源关闭的回调，如`socket.on('close')`。

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  socket.on('close', () => {
    // 这个回调在close callbacks阶段执行
    console.log('连接关闭');
  });
});
```

### 触发场景

- `socket.destroy()` 被调用
- `server.close()` 被调用
- 子进程退出

## 微任务：阶段之间的"插队者"

`process.nextTick`和`Promise`微任务在每个阶段之间执行：

```
timers阶段
     │
     ▼
[执行所有nextTick和微任务]
     │
     ▼
pending callbacks阶段
     │
     ▼
[执行所有nextTick和微任务]
     │
     ▼
... 后续阶段 ...
```

### 执行顺序示例

```javascript
setTimeout(() => console.log('1. setTimeout'), 0);
setImmediate(() => console.log('2. setImmediate'));

Promise.resolve().then(() => console.log('3. Promise'));
process.nextTick(() => console.log('4. nextTick'));

console.log('5. 同步代码');

// 输出:
// 5. 同步代码
// 4. nextTick
// 3. Promise
// 1. setTimeout 或 2. setImmediate（顺序不确定）
// 2. setImmediate 或 1. setTimeout
```

## 各阶段执行时间限制

为了防止某个阶段独占事件循环，每个阶段都有执行限制：

```
┌─────────────────────────────────────────────────────┐
│ timers阶段                                          │
│   - 执行到期的定时器，但不会无限执行                  │
│   - 达到限制后进入下一阶段                           │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ poll阶段                                            │
│   - 执行I/O回调，有数量限制                          │
│   - 如果有setImmediate或定时器到期，不阻塞           │
└─────────────────────────────────────────────────────┘
```

## 事件循环退出条件

事件循环在以下情况下退出：

1. 没有活跃的handles（定时器、I/O watcher等）
2. 没有待处理的requests
3. 没有活跃的子进程

```javascript
// 这个程序会立即退出，因为没有活跃任务
console.log('Hello');

// 这个程序不会退出，因为有活跃的定时器
setInterval(() => {
  console.log('Still running');
}, 1000);

// 使用unref()可以让定时器不阻止退出
const timer = setInterval(() => {}, 1000);
timer.unref();  // 现在程序可以正常退出
```

## 完整示例：追踪阶段执行

```javascript
const fs = require('fs');

console.log('=== 开始 ===');

// timers阶段
setTimeout(() => {
  console.log('1. setTimeout');
  
  // 在timers阶段注册的setImmediate
  setImmediate(() => {
    console.log('3. setImmediate (from setTimeout)');
  });
  
  // nextTick在阶段之间执行
  process.nextTick(() => {
    console.log('2. nextTick (from setTimeout)');
  });
}, 0);

// poll阶段
fs.readFile(__filename, () => {
  console.log('4. readFile callback');
  
  setImmediate(() => {
    console.log('6. setImmediate (from readFile)');
  });
  
  process.nextTick(() => {
    console.log('5. nextTick (from readFile)');
  });
});

console.log('=== 同步代码结束 ===');
```

## 本章小结

- 事件循环包含六个阶段，按固定顺序循环执行
- **timers**：执行到期的定时器回调
- **pending callbacks**：执行延迟的系统级I/O回调
- **poll**：核心阶段，处理I/O回调，可能阻塞等待
- **check**：执行setImmediate回调
- **close callbacks**：执行资源关闭回调
- `process.nextTick`和`Promise`微任务在每个阶段之间执行
- 理解这些阶段对于编写高效的异步代码至关重要

下一章，我们将深入timers阶段，详细分析setTimeout与setInterval的实现原理。
