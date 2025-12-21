# close callbacks阶段

close callbacks阶段是事件循环的最后一个阶段，负责处理资源关闭相关的回调。本章深入分析这个阶段的工作机制。

## 阶段位置

```
              ... 前面的阶段 ...
                    │
                    ▼
   ┌─ check ──────────────────────────────────────┐
   │  setImmediate回调                             │
   └──────────────────────────────────────────────┘
                    │
                    ▼
   ┌─ close callbacks ────────────────────────────┐
   │  关闭回调（socket.on('close')等）       ◄── 这里│
   └──────────────────────────────────────────────┘
                    │
                    ▼
              回到timers阶段（下一轮）
```

## Close Callbacks的作用

当socket或handle被突然关闭（如通过destroy()）时，close回调在这个阶段执行：

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  socket.on('close', () => {
    // 这个回调在close callbacks阶段执行
    console.log('Socket closed');
  });
  
  // 强制关闭
  socket.destroy();
});
```

## libuv实现

### 关闭句柄

```c
// deps/uv/src/unix/core.c
void uv_close(uv_handle_t* handle, uv_close_cb close_cb) {
  // 设置关闭回调
  handle->close_cb = close_cb;
  
  // 标记为正在关闭
  handle->flags |= UV_HANDLE_CLOSING;
  
  // 根据句柄类型执行特定的关闭逻辑
  switch (handle->type) {
    case UV_TCP:
      uv__tcp_close((uv_tcp_t*)handle);
      break;
    case UV_TIMER:
      uv__timer_close((uv_timer_t*)handle);
      break;
    // ... 其他类型
  }
  
  // 加入关闭队列
  uv__make_close_pending(handle);
}
```

### 加入关闭队列

```c
void uv__make_close_pending(uv_handle_t* handle) {
  handle->next_closing = handle->loop->closing_handles;
  handle->loop->closing_handles = handle;
}
```

### 执行关闭回调

```c
static void uv__run_closing_handles(uv_loop_t* loop) {
  uv_handle_t* p;
  uv_handle_t* q;

  p = loop->closing_handles;
  loop->closing_handles = NULL;

  while (p) {
    q = p->next_closing;
    uv__finish_close(p);
    p = q;
  }
}

static void uv__finish_close(uv_handle_t* handle) {
  // 标记为已关闭
  handle->flags |= UV_HANDLE_CLOSED;
  
  // 执行close回调
  if (handle->close_cb) {
    handle->close_cb(handle);
  }
}
```

## 典型场景

### 1. 服务器关闭

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.end('hello');
});

server.listen(3000);

// 关闭服务器
server.close(() => {
  // 这在close callbacks阶段执行
  console.log('Server closed');
});
```

### 2. 文件描述符关闭

```javascript
const fs = require('fs');

const fd = fs.openSync('file.txt', 'r');

// 使用fs.close的回调版本
fs.close(fd, () => {
  console.log('File closed');
});
```

### 3. 子进程结束

```javascript
const { spawn } = require('child_process');

const child = spawn('node', ['script.js']);

child.on('close', (code) => {
  // 子进程关闭回调
  console.log('Child process exited with code:', code);
});
```

### 4. Socket销毁

```javascript
const net = require('net');

const socket = net.connect({ port: 3000 });

socket.on('close', (hadError) => {
  // hadError为true表示因错误关闭
  console.log('Socket closed, had error:', hadError);
});

// 强制关闭
socket.destroy();
```

## close vs end vs finish vs destroy

这些事件和方法容易混淆：

### 可写流

```javascript
const stream = fs.createWriteStream('file.txt');

stream.on('finish', () => {
  // 所有数据已写入底层系统
  // 在poll阶段执行
  console.log('All data written');
});

stream.on('close', () => {
  // 流及其底层资源已关闭
  // 在close callbacks阶段执行
  console.log('Stream closed');
});

stream.end('final data');
```

事件顺序：
```
write operations
      │
      ▼
    finish（数据写完）
      │
      ▼
    close（资源关闭）
```

### 可读流

```javascript
const stream = fs.createReadStream('file.txt');

stream.on('end', () => {
  // 没有更多数据可读
  console.log('No more data');
});

stream.on('close', () => {
  // 流已关闭
  console.log('Stream closed');
});
```

### destroy方法

```javascript
// end()：优雅关闭，等待数据发送完
stream.end('final data');

// destroy()：立即关闭，可能丢弃缓冲数据
stream.destroy();

// destroy(error)：因错误关闭
stream.destroy(new Error('Something went wrong'));
```

## socket.destroy()的执行流程

```
socket.destroy()
      │
      ▼
标记handle为closing
      │
      ▼
关闭底层TCP连接
      │
      ▼
加入closing_handles链表
      │
      ▼
等待当前阶段完成
      │
      ▼
close callbacks阶段
      │
      ▼
执行close回调
      │
      ▼
释放资源
```

## 资源清理的重要性

### 为什么需要关闭回调

```javascript
class ResourceManager {
  constructor() {
    this.connections = new Set();
    this.timers = new Set();
  }
  
  addConnection(socket) {
    this.connections.add(socket);
    
    socket.on('close', () => {
      // 在close callbacks阶段清理
      this.connections.delete(socket);
      console.log(`Connections remaining: ${this.connections.size}`);
    });
  }
  
  cleanup() {
    // 关闭所有连接
    for (const socket of this.connections) {
      socket.destroy();
    }
    // 关闭所有定时器
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
  }
}
```

### 内存泄漏预防

```javascript
// 问题：没有处理close事件导致泄漏
const connections = new Map();

server.on('connection', (socket) => {
  const id = generateId();
  connections.set(id, socket);
  
  // 忘记清理！
});

// 正确：在close回调中清理
server.on('connection', (socket) => {
  const id = generateId();
  connections.set(id, socket);
  
  socket.on('close', () => {
    connections.delete(id);  // 正确清理
  });
});
```

## 优雅关闭模式

### 服务器优雅关闭

```javascript
const http = require('http');

const server = http.createServer(handler);
const connections = new Set();

server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  // 停止接受新连接
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // 关闭现有连接
  for (const socket of connections) {
    socket.end();
  }
  
  // 超时强制退出
  setTimeout(() => {
    console.log('Forcing shutdown');
    for (const socket of connections) {
      socket.destroy();
    }
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### 数据库连接清理

```javascript
const pool = createDatabasePool();

process.on('exit', () => {
  // 同步清理（exit事件中只能同步）
});

process.on('beforeExit', async () => {
  // 异步清理
  await pool.end();
  console.log('Database connections closed');
});
```

## 调试close callbacks

### 追踪未关闭的句柄

```javascript
const activeHandles = process._getActiveHandles();
console.log('Active handles:', activeHandles.length);

activeHandles.forEach(handle => {
  console.log('Handle type:', handle.constructor.name);
});
```

### 检测泄漏

```javascript
// 定期检查活跃句柄数
setInterval(() => {
  const handles = process._getActiveHandles();
  const requests = process._getActiveRequests();
  
  console.log({
    handles: handles.length,
    requests: requests.length
  });
  
  // 如果持续增长，可能有泄漏
}, 30000).unref();
```

## 本章小结

- close callbacks阶段执行资源关闭回调
- 通过destroy()或正常关闭触发close事件
- close事件在finish/end事件之后触发
- 在close回调中进行资源清理，避免内存泄漏
- 实现优雅关闭模式以正确处理进程退出
- 使用_getActiveHandles()调试未关闭的资源

至此，事件循环的六个阶段已全部介绍完毕。下一章将介绍process.nextTick与微任务队列。
