# pending callbacks阶段

pending callbacks阶段是事件循环中相对较少讨论但同样重要的阶段。本章深入分析这个阶段的工作机制。

## 阶段位置

```
   ┌─ timers ─────────────────────────────────────┐
   │  setTimeout/setInterval回调                   │
   └──────────────────────────────────────────────┘
                    │
                    ▼
   ┌─ pending callbacks ──────────────────────────┐
   │  延迟的系统级I/O回调                    ◄── 这里│
   └──────────────────────────────────────────────┘
                    │
                    ▼
   ┌─ idle, prepare ──────────────────────────────┐
   │  内部使用                                     │
   └──────────────────────────────────────────────┘
                    │
                    ▼
              ... poll阶段 ...
```

## 什么是Pending Callbacks

某些系统级回调不会在poll阶段立即执行，而是被推迟到下一轮事件循环的pending阶段：

```c
// deps/uv/src/unix/core.c
static void uv__run_pending(uv_loop_t* loop) {
  QUEUE* q;
  QUEUE pq;
  uv__io_t* w;

  // 将pending队列移出
  QUEUE_MOVE(&loop->pending_queue, &pq);

  // 执行所有pending的回调
  while (!QUEUE_EMPTY(&pq)) {
    q = QUEUE_HEAD(&pq);
    QUEUE_REMOVE(q);
    w = QUEUE_DATA(q, uv__io_t, pending_queue);
    w->cb(loop, w, POLLOUT);
  }
}
```

## 典型场景

### 1. TCP连接错误

```javascript
const net = require('net');

const client = net.connect({ port: 9999 }, () => {
  console.log('connected');
});

client.on('error', (err) => {
  // 如果连接被拒绝，这个回调可能在pending阶段执行
  console.log('Connection error:', err.code);
});
```

当连接失败时（如ECONNREFUSED），回调可能被推迟到pending阶段。

### 2. 写入错误

```javascript
const fs = require('fs');

// 尝试写入只读文件
const stream = fs.createWriteStream('/readonly-file');

stream.on('error', (err) => {
  // 某些写入错误在pending阶段报告
  console.log('Write error:', err);
});

stream.write('data');
```

### 3. EAGAIN/EWOULDBLOCK错误

当I/O操作返回这些错误时，表示资源暂时不可用，操作需要稍后重试：

```javascript
// 非阻塞socket写入时，如果发送缓冲区满
// EAGAIN错误会导致回调被推迟到pending阶段
```

## 为什么需要推迟

```
问题场景：
┌─────────────────────────────────────────────────┐
│ poll阶段执行中                                   │
│   - 正在处理socket A的回调                       │
│   - socket B发生错误                            │
│   - 如果立即执行B的错误回调，可能干扰A的处理      │
└─────────────────────────────────────────────────┘

解决方案：
┌─────────────────────────────────────────────────┐
│ poll阶段                                        │
│   - 处理socket A的回调                          │
│   - socket B错误 → 加入pending队列              │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ 下一轮循环的pending阶段                          │
│   - 处理socket B的错误回调                       │
└─────────────────────────────────────────────────┘
```

## libuv中的实现

### 加入pending队列

```c
// 当I/O操作完成但需要推迟回调时
void uv__io_feed(uv_loop_t* loop, uv__io_t* w) {
  if (QUEUE_EMPTY(&w->pending_queue)) {
    QUEUE_INSERT_TAIL(&loop->pending_queue, &w->pending_queue);
  }
}
```

### 执行pending回调

```c
static int uv__run_pending(uv_loop_t* loop) {
  QUEUE* q;
  QUEUE pq;
  uv__io_t* w;

  // 如果队列为空，返回0
  if (QUEUE_EMPTY(&loop->pending_queue))
    return 0;

  // 移动队列，防止在执行过程中被修改
  QUEUE_MOVE(&loop->pending_queue, &pq);

  // 执行所有回调
  while (!QUEUE_EMPTY(&pq)) {
    q = QUEUE_HEAD(&pq);
    QUEUE_REMOVE(q);
    QUEUE_INIT(q);
    w = QUEUE_DATA(q, uv__io_t, pending_queue);
    w->cb(loop, w, POLLOUT);
  }

  return 1;
}
```

## 与poll阶段的区别

| 特性 | poll阶段 | pending callbacks阶段 |
|------|----------|----------------------|
| 执行时机 | I/O事件触发时 | 下一轮循环开始时 |
| 回调来源 | 新的I/O完成 | 上轮推迟的回调 |
| 可能阻塞 | 是（等待I/O） | 否 |
| 典型回调 | 正常读/写完成 | 错误、重试 |

## 调试pending callbacks

```javascript
const async_hooks = require('async_hooks');

const pendingOps = new Map();

async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    if (type === 'TCPWRAP' || type === 'PIPEWRAP') {
      pendingOps.set(asyncId, {
        type,
        created: Date.now()
      });
    }
  },
  destroy(asyncId) {
    pendingOps.delete(asyncId);
  }
}).enable();

// 定期检查长时间pending的操作
setInterval(() => {
  const now = Date.now();
  for (const [id, op] of pendingOps) {
    if (now - op.created > 5000) {
      console.warn('Long pending operation:', op);
    }
  }
}, 5000).unref();
```

## 性能影响

pending callbacks阶段通常执行很快：

```
正常情况：
- pending队列大部分时间为空
- 只有出错或特殊情况才有回调

异常情况：
- 大量连接错误
- 频繁的资源竞争
- 可能导致pending队列堆积
```

### 监控建议

```javascript
// 监控pending队列是否有堆积
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

// 如果事件循环延迟高，可能有回调堆积
setInterval(() => {
  if (histogram.percentile(99) / 1e6 > 100) {
    console.warn('High event loop delay, check pending callbacks');
  }
  histogram.reset();
}, 5000).unref();
```

## 本章小结

- pending callbacks阶段执行被推迟的系统级I/O回调
- 典型场景包括TCP错误、写入错误等
- 推迟执行是为了避免干扰当前正在处理的回调
- 这个阶段通常执行很快，除非有异常情况
- 可以通过async_hooks追踪pending操作

下一章，我们将深入poll阶段——事件循环最核心的阶段。
