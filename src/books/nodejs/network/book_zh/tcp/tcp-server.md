# 创建 TCP 服务器

> 上一章我们了解了 net 模块的基础。现在让我们深入学习如何创建一个健壮的 TCP 服务器。

一个生产可用的 TCP 服务器需要考虑很多细节：错误处理、连接管理、资源清理等。本章将逐步构建一个完善的服务器。

## 最简单的服务器

回顾最基本的写法：

```javascript
const net = require('net');

const server = net.createServer((socket) => {
  // 每个新连接都会触发这个回调
  // socket 代表这个特定的客户端连接
  socket.write('Welcome!\n');
  socket.end();
});

server.listen(3000);
```

但这个版本有很多问题：缺少错误处理、没有日志、无法优雅关闭…

## 配置选项详解

`createServer` 接受一个可选的配置对象：

```javascript
const server = net.createServer({
  // 是否允许半开连接
  // true: 当一端调用 end() 时，另一端仍可写入
  // false: 自动调用 end()
  allowHalfOpen: false,
  
  // 是否在连接上暂停（需要手动调用 resume）
  // 用于背压控制
  pauseOnConnect: false,
  
  // 是否禁用 Nagle 算法（减少延迟）
  noDelay: false,
  
  // 是否启用 keep-alive
  keepAlive: false,
  
  // keep-alive 初始延迟（毫秒）
  keepAliveInitialDelay: 0
}, connectionListener);
```

### 半开连接

什么是半开连接？理解这个概念很重要：

```
正常关闭流程：
┌─────────────────────────────────────────────────────┐
│ Client                             Server           │
│    │                                  │             │
│    │ ────── FIN（我写完了）──────────►│             │
│    │                                  │             │
│    │ ◄───── ACK（收到）───────────────│             │
│    │                                  │             │
│    │    服务器可以继续发送数据...      │  半开状态   │
│    │                                  │             │
│    │ ◄───── FIN（我也写完了）─────────│             │
│    │                                  │             │
│    │ ────── ACK（收到）──────────────►│             │
│    │                                  │             │
│    完全关闭                        完全关闭         │
└─────────────────────────────────────────────────────┘
```

```javascript
// allowHalfOpen 的影响
const server = net.createServer({ allowHalfOpen: true }, (socket) => {
  socket.on('end', () => {
    // 客户端说"我写完了"
    // 但我们还可以继续发送数据
    socket.write('服务器最后的消息\n');
    socket.end();  // 需要手动关闭
  });
});
```

## 监听配置

`listen` 方法有多种调用方式：

```javascript
// 方式1：只指定端口
server.listen(3000);

// 方式2：端口 + 主机
server.listen(3000, '0.0.0.0');

// 方式3：配置对象
server.listen({
  port: 3000,
  host: '0.0.0.0',     // 监听所有网卡
  backlog: 511,         // 等待连接队列长度
  exclusive: false      // 是否独占端口（cluster 相关）
});

// 方式4：Unix Socket（进程间通信）
server.listen('/tmp/my-app.sock');
```

### host 参数的重要性

```javascript
// 只接受本机连接（开发环境推荐）
server.listen(3000, '127.0.0.1');

// 接受任何来源的连接（生产环境）
server.listen(3000, '0.0.0.0');

// IPv6
server.listen(3000, '::');
```

### backlog：连接等待队列

当服务器繁忙时，新连接会在队列中等待：

```
                      backlog 队列（等待 accept）
新连接 ──────►  [ conn1 | conn2 | conn3 | ... ] ──────► accept() 处理
               └──────────── 最大长度 ─────────────┘
```

如果队列满了，新连接会被拒绝（客户端收到 ECONNREFUSED）。

## 服务器事件

```javascript
const server = net.createServer();

// 开始监听
server.on('listening', () => {
  const addr = server.address();
  console.log(`服务器运行在 ${addr.address}:${addr.port}`);
});

// 新连接
server.on('connection', (socket) => {
  console.log('新连接:', socket.remoteAddress);
});

// 服务器错误
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('端口已被占用');
  } else {
    console.error('服务器错误:', err);
  }
});

// 服务器关闭
server.on('close', () => {
  console.log('服务器已关闭');
});

server.listen(3000);
```

## 连接管理

生产环境需要管理所有活动连接：

```javascript
const net = require('net');

class TCPServer {
  constructor() {
    this.server = null;
    this.connections = new Set();  // 存储所有活动连接
  }
  
  start(port) {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });
    
    this.server.listen(port, () => {
      console.log(`服务器运行在端口 ${port}`);
    });
    
    this.server.on('error', this.handleServerError.bind(this));
  }
  
  handleConnection(socket) {
    // 记录连接
    this.connections.add(socket);
    console.log(`连接数: ${this.connections.size}`);
    
    // 设置超时
    socket.setTimeout(60000);  // 60秒无活动则超时
    
    // 连接关闭时移除
    socket.on('close', () => {
      this.connections.delete(socket);
      console.log(`连接数: ${this.connections.size}`);
    });
    
    // 超时处理
    socket.on('timeout', () => {
      console.log('连接超时，关闭');
      socket.end();
    });
    
    // 错误处理
    socket.on('error', (err) => {
      console.error('Socket 错误:', err.message);
      // 不需要手动删除，close 事件会处理
    });
  }
  
  handleServerError(err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`端口 ${err.port} 已被占用`);
      process.exit(1);
    }
    throw err;
  }
  
  // 优雅关闭
  async shutdown() {
    console.log('开始关闭服务器...');
    
    // 停止接受新连接
    this.server.close();
    
    // 关闭所有现有连接
    for (const socket of this.connections) {
      socket.end('服务器关闭中...\n');
    }
    
    // 等待所有连接关闭
    await new Promise((resolve) => {
      const check = () => {
        if (this.connections.size === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
    
    console.log('服务器已完全关闭');
  }
}

// 使用
const server = new TCPServer();
server.start(3000);

// 优雅关闭
process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});
```

## 本章小结

- `createServer` 接受配置选项，如 `allowHalfOpen`、`noDelay`
- `listen` 可以绑定到特定地址，`0.0.0.0` 表示所有网卡
- 服务器事件包括 `listening`、`connection`、`error`、`close`
- 生产环境需要管理连接集合，实现优雅关闭
- 设置超时和错误处理是必须的

下一章我们将学习如何创建 TCP 客户端。
