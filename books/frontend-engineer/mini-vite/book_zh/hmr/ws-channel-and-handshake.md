# 21. WebSocket 通道与握手

我们已经深入探讨了模块图的构建、转换和缓存机制。这些是 Vite 实现按需加载的基础。但要实现真正的“热模块替换”(HMR)，还需要一个关键组件：**一个在服务器和浏览器之间进行实时、双向通信的通道**。

当你修改一个文件时，服务器需要一种方式能立刻通知浏览器：“嘿，某个文件变了，你需要更新一下！”。浏览器收到通知后，才能执行相应的热替换逻辑。

HTTP 协议是单向的（请求-响应模式），无法满足这种实时推送的需求。因此，Vite 和几乎所有现代开发服务器一样，选择了 **WebSocket** 作为 HMR 的通信骨架。

## 21.1. 理论：为什么是 WebSocket？

想象一下，服务器和浏览器之间需要建立一条“热线电话”。

- **HTTP 轮询（旧方案）**：浏览器每隔一小段时间就给服务器打个电话问：“有更新吗？”。这既浪费电话费（网络资源），又不及时。
- **WebSocket（现代方案）**：服务器和浏览器之间建立一条持久的电话线。一旦有更新，服务器可以直接通过这条线告诉浏览器。这既高效又实时。

WebSocket 正是这样一种技术。它在客户端和服务器之间建立一个持久化的连接，允许任何一方随时向对方发送数据。这使得它成为实现 HMR 通信的完美选择。

Vite 的 HMR 工作流程如下：

1.  **建立连接**：Vite 开发服务器启动时，会创建一个 WebSocket 服务器。同时，Vite 会向客户端（你的应用程序）注入一小段代码，这段代码负责连接到这个 WebSocket 服务器。
2.  **握手**：客户端代码连接成功后，会与服务器进行一次“握手”，确认通信通道已建立。此时，浏览器会打印出 `[vite] connected.` 的日志。
3.  **监听文件变更**：服务器端的 Chokidar 文件监听器持续监控项目文件。
4.  **发送更新消息**：当你修改并保存一个文件时，服务器监听到变更，经过模块图分析，确定需要更新的模块边界，然后通过 WebSocket 连接，向客户端发送一个 JSON 格式的 HMR 消息。
5.  **客户端处理**：客户端的 HMR 运行时（`vite/client`）接收到消息，解析它，然后执行相应的操作，比如重新请求模块、执行模块代码或重新渲染组件。

## 21.2. 源码：Vite 中的 WebSocket 服务器

Vite 内部使用 `ws` 这个流行的库来创建 WebSocket 服务器。相关的逻辑主要位于 `packages/vite/src/node/server/ws.ts`。

让我们看看 `createWebSocketServer` 这个核心函数：

```typescript
// packages/vite/src/node/server/ws.ts (简化版)

import { WebSocketServer as WebSocket } from 'ws';

export function createWebSocketServer(httpServer) {
  // 1. 创建一个 WebSocket.Server 实例
  const wss = new WebSocket({ noServer: true });

  // 2. 监听 http 服务器的 'upgrade' 事件
  httpServer.on('upgrade', (req, socket, head) => {
    // 只处理 HMR 的 WebSocket 请求
    if (req.headers['sec-websocket-protocol'] === 'vite-hmr') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        // 3. 触发 wss 的 'connection' 事件
        wss.emit('connection', ws, req);
      });
    }
  });

  // 4. 监听 'connection' 事件
  wss.on('connection', (socket) => {
    console.log('[vite] client connected.');
    socket.send(JSON.stringify({ type: 'connected' }));
    // ... 监听 'error' 和 'close' 事件
  });

  return {
    // ... (返回 wss 实例和一些辅助方法)
    send(payload) {
      // 广播消息给所有连接的客户端
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(payload));
        }
      });
    },
  };
}
```

这个过程非常经典：

1.  **创建实例**：创建一个 `ws` 的 `WebSocket.Server` 实例，但 `noServer: true` 表示它不自己监听端口，而是依附于一个已有的 HTTP 服务器。
2.  **监听 `upgrade` 事件**：WebSocket 协议的握手过程，始于一个普通的 HTTP `GET` 请求，但它包含一个特殊的 `Upgrade: websocket` 头。当 Node.js 的 `http.Server` 收到这种请求时，会触发 `upgrade` 事件。
3.  **处理握手**：Vite 在这里检查了 `sec-websocket-protocol` 头，确保这是来自 Vite 客户端的 HMR 连接请求。验证通过后，调用 `wss.handleUpgrade` 完成协议升级，将一个普通的 TCP 连接“升级”为一个 WebSocket 连接。
4.  **连接成功**：升级成功后，`wss` 会触发 `connection` 事件。Vite 在这里会向刚刚连接的客户端发送一个 `{ type: 'connected' }` 的消息，这就是“握手”成功的信号。
5.  **广播消息**：`createWebSocketServer` 返回一个包含 `send` 方法的对象。当 HMR 需要广播更新时，就会调用这个方法，它会遍历所有已连接的客户端，并将 HMR 消息（`payload`）发送给它们。

## 21.3. 客户端的连接逻辑

服务器准备好了，客户端如何连接呢？

Vite 通过一个内置插件，在你的 `index.html` 中自动注入一个脚本：`<script type="module" src="/@vite/client"></script>`。

这个 `@vite/client` 模块就是 HMR 的客户端运行时。它的核心任务之一就是建立 WebSocket 连接。

```typescript
// packages/vite/src/client/client.ts (简化版)

// ...

// 1. 确定 WebSocket URL
const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${location.host}`;

// 2. 创建 WebSocket 实例
const socket = new WebSocket(wsUrl, 'vite-hmr');

// 3. 监听事件
socket.addEventListener('message', async ({ data }) => {
  const payload = JSON.parse(data);
  // ... 处理收到的 HMR 消息 ...
});

socket.addEventListener('open', () => {
  console.log('[vite] connected.');
});
```

客户端逻辑非常直接：

1.  根据当前页面的协议 (`http` 或 `https`) 和主机，构造出 WebSocket 服务器的地址。
2.  创建一个新的 `WebSocket` 实例，并**非常重要地**，在第二个参数中传入了 `'vite-hmr'` 作为子协议。这正好与服务器端 `upgrade` 事件处理器中的检查相对应。
3.  监听 `message` 事件，准备接收和处理来自服务器的 HMR 消息。

## 21.4. mini-vite 的实现

现在，让我们在 `mini-vite` 中实现这个核心的通信通道。

首先，我们需要安装 `ws` 库：

```bash
npm install ws
```

然后，我们可以创建一个 `ws.js` 文件来实现 WebSocket 服务器的创建逻辑。

```javascript
// src/ws.js

import { WebSocketServer } from 'ws';

export function createMiniWebSocketServer(httpServer) {
  // noServer: true 表示不独立监听端口
  // 而是复用已有的 HTTP 服务器
  const wss = new WebSocketServer({ noServer: true });

  // 监听 HTTP 服务器的 upgrade 事件
  // 当浏览器发送 WebSocket 握手请求时触发
  httpServer.on('upgrade', (req, socket, head) => {
    // 这里可以添加路径或协议检查
    // 只处理来自我们客户端的连接请求
    if (req.url === '/') {
      // handleUpgrade 完成 WebSocket 协议握手
      // 将普通 TCP 连接升级为 WebSocket 连接
      wss.handleUpgrade(req, socket, head, (ws) => {
        // 手动触发 connection 事件
        wss.emit('connection', ws, req);
      });
    }
  });

  // 新客户端连接时的处理
  wss.on('connection', (socket) => {
    console.log('[mini-vite] client connected.');
    // 发送握手成功消息，客户端收到后会打印 "[mini-vite] connected."
    socket.send(JSON.stringify({ type: 'connected' }));
  });

  wss.on('error', (err) => {
    console.error(`[mini-vite] ws error:`, err);
  });

  return {
    send(payload) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1 /* OPEN */) {
          client.send(JSON.stringify(payload));
        }
      });
    },
    close() {
      wss.close();
    },
  };
}
```

接着，我们需要在主服务器文件 `server.js` 中集成它：

```javascript
// src/server.js (部分更新)

import http from 'http';
import { createMiniWebSocketServer } from './ws.js';
// ... 其他 import

export async function createServer() {
  // ... (解析配置等)

  const httpServer = http.createServer(async (req, res) => {
    // ... (中间件和请求处理逻辑)
  });

  // 创建并集成 WebSocket 服务器
  const ws = createMiniWebSocketServer(httpServer);

  const server = {
    // ...
    listen() {
      httpServer.listen(config.port, () => {
        console.log(`[mini-vite] dev server running at: http://localhost:${config.port}`);
      });
    },
    // 将 ws 实例暴露出去，以便其他部分（如文件监听器）可以调用 send
    ws,
  };

  return server;
}
```

最后，我们需要一个简化的客户端 HMR 注入逻辑。在 `mini-vite` 中，我们可以通过一个插件，在转换 `index.html` 时，硬编码注入客户端脚本。

```javascript
// 简化的客户端脚本注入思路
function clientInjectPlugin() {
  return {
    name: 'mini-vite:client-inject',
    transform(code, id) {
      if (id.endsWith('.html')) {
        const clientScript = `
          <script type="module">
            const socket = new WebSocket('ws://' + location.host, 'vite-hmr');
            socket.addEventListener('message', ({ data }) => {
              const payload = JSON.parse(data);
              if (payload.type === 'connected') {
                console.log('[mini-vite] connected to server.');
              }
              // ... 后续处理其他 HMR 消息
            });
          </script>
        `;
        return code.replace('</body>', `${clientScript}</body>`);
      }
      return code;
    }
  }
}
```

通过以上步骤，我们的 `mini-vite` 就拥有了一个功能虽简但核心完整的 HMR 通信通道。服务器和客户端之间已经可以“对话”，为下一章实现真正的热更新传播奠定了坚实的基础。
