# net 模块概览

> 当你用 Express 处理 HTTP 请求时，底层实际上发生了什么？HTTP 协议运行在 TCP 之上，而 TCP 编程的核心就是 `net` 模块。

理解 `net` 模块，就是理解 Node.js 网络能力的根基。

## 为什么要学习 net 模块？

你可能会问：有了 Express、Fastify，为什么还要学习底层的 net 模块？

**三个理由**：

1. **理解原理**：所有 HTTP 框架都构建在 net 模块之上，理解底层才能用好上层
2. **自定义协议**：当你需要实现游戏服务器、即时通讯等场景时，需要自定义二进制协议
3. **问题排查**：连接超时、粘包拆包、内存泄漏等网络问题，都需要底层知识来诊断

## TCP vs HTTP

```
┌─────────────────────────────────────────────────────────┐
│                    应用层协议                            │
│        HTTP / WebSocket / 自定义协议                     │
├─────────────────────────────────────────────────────────┤
│                    传输层（TCP）                         │
│              可靠传输、流量控制、拥塞控制                  │
│                   net 模块工作在这里                      │
├─────────────────────────────────────────────────────────┤
│                    网络层（IP）                          │
│                  寻址、路由                               │
├─────────────────────────────────────────────────────────┤
│                    链路层                                │
│               物理传输（以太网等）                        │
└─────────────────────────────────────────────────────────┘
```

| 对比项 | net 模块（TCP） | http 模块 |
|--------|----------------|-----------|
| 协议层 | 传输层 | 应用层 |
| 数据格式 | 原始字节流 | 结构化的请求/响应 |
| 解析 | 需要自己解析 | 自动解析头部和正文 |
| 使用场景 | 自定义协议、高性能服务 | Web API、网站 |

## net 模块核心概念

### Socket（套接字）

Socket 是网络通信的端点。你可以把它想象成一个"电话"——两端各有一个 Socket，通过它们进行双向通信。

```javascript
const net = require('net');

// 创建服务器（等待来电）
const server = net.createServer((socket) => {
  // socket 代表一个客户端连接
  // 通过它可以读写数据
});

// 创建客户端连接（拨打电话）
const client = net.connect({ port: 3000 }, () => {
  // 连接成功后可以发送数据
});
```

### 服务器 vs 客户端

```
┌──────────────┐                    ┌──────────────┐
│   Server     │                    │   Client     │
│              │                    │              │
│  监听端口    │◄──── 连接请求 ─────│  发起连接    │
│              │                    │              │
│  接受连接    │────  确认连接 ────►│  连接成功    │
│              │                    │              │
│  双向通信    │◄───── 数据 ───────►│  双向通信    │
│              │                    │              │
└──────────────┘                    └──────────────┘
```

### 核心 API 速览

```javascript
const net = require('net');

// ===== 服务器端 =====
const server = net.createServer(options, connectionListener);
server.listen(port, host, callback);      // 开始监听
server.close(callback);                    // 停止监听
server.getConnections(callback);           // 获取连接数

// ===== 客户端 =====
const socket = net.connect(options, connectListener);
// 或
const socket = new net.Socket();
socket.connect(port, host, callback);

// ===== Socket（双向都可用）=====
socket.write(data, encoding, callback);    // 发送数据
socket.end(data, encoding, callback);      // 发送数据并关闭写端
socket.destroy();                          // 强制关闭
socket.pause();                            // 暂停读取
socket.resume();                           // 恢复读取
socket.setTimeout(timeout, callback);      // 设置超时

// ===== 事件 =====
socket.on('data', (chunk) => {});          // 收到数据
socket.on('end', () => {});                // 对端关闭写
socket.on('close', (hadError) => {});      // 完全关闭
socket.on('error', (err) => {});           // 错误
socket.on('timeout', () => {});            // 超时
```

## 第一个 TCP 程序

让我们写一个最简单的回显（Echo）服务器：

**server.js**
```javascript
const net = require('net');

// 创建 TCP 服务器
const server = net.createServer((socket) => {
  console.log('客户端已连接:', socket.remoteAddress, socket.remotePort);
  
  // 收到数据时，原样返回
  socket.on('data', (data) => {
    console.log('收到:', data.toString());
    socket.write(`回显: ${data}`);
  });
  
  // 连接关闭
  socket.on('end', () => {
    console.log('客户端断开连接');
  });
  
  // 错误处理（很重要！）
  socket.on('error', (err) => {
    console.error('Socket 错误:', err.message);
  });
});

// 开始监听
server.listen(3000, '127.0.0.1', () => {
  console.log('服务器运行在 127.0.0.1:3000');
});
```

**client.js**
```javascript
const net = require('net');

// 连接到服务器
const client = net.connect({ port: 3000, host: '127.0.0.1' }, () => {
  console.log('已连接到服务器');
  client.write('Hello, Server!');
});

// 接收响应
client.on('data', (data) => {
  console.log('服务器响应:', data.toString());
  client.end();  // 收到响应后关闭连接
});

client.on('end', () => {
  console.log('连接已关闭');
});
```

## Socket 生命周期

理解 Socket 的生命周期对于正确处理连接至关重要：

```
创建 Socket
    │
    ▼
连接中（connecting）
    │
    ▼ ─────────── 连接失败 ───► 错误（error）
    │
连接成功（connect 事件）
    │
    ▼
数据传输（可以 read/write）
    │
    ├── socket.end() ──────► 半关闭（FIN_WAIT）
    │                              │
    │                              ▼
    │                         对端收到 'end' 事件
    │                              │
    │                              ▼
    │                         对端调用 end()
    │                              │
    └── socket.destroy() ──► 完全关闭（'close' 事件）
```

## 本章小结

- `net` 模块提供了 TCP 网络编程的底层能力
- TCP 是可靠的双向字节流协议
- Socket 是网络通信的端点，服务端和客户端各持有一个
- 理解 Socket 生命周期有助于正确处理连接状态

下一章我们将深入学习如何创建健壮的 TCP 服务器。
