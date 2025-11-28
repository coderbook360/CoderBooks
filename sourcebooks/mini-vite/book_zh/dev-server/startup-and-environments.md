# 5. 启动流程与环境初始化

在第一部分，我们从宏观上理解了 Vite 的设计哲学。现在，是时候深入代码，亲眼见证 Vite 开发服务器的诞生过程了。当你在终端里满怀期待地敲下 `vite`（或者 `vite serve`）并按下回车时，究竟发生了什么？

## 一场盛大演出的“后台准备”

你可以将 Vite 服务器的启动过程，想象成一场盛大演出开始前的后台准备工作。灯光、音响、道具、演员……一切都需要在观众入场前准备就绪。

Vite 的 `createServer` 函数就是这场演出的总导演。它是我们探索的起点，负责协调所有资源的初始化，最终搭建起一个功能完备的开发服务器。

整个启动流程，可以概括为以下几个核心步骤：

1.  **配置解析**：首先，Vite 会像我们在上一章讨论的那样，解析 `vite.config.js` 并与默认配置合并，形成最终的 `resolvedConfig`。这是所有后续操作的“总纲领”。

2.  **创建服务器实例**：Vite 会创建一个 `http` 服务器实例（或者在 `https` 模式下创建一个 `https` 服务器）。但此时，它还只是一个“空壳子”，不知道如何处理请求。

3.  **初始化插件容器**：插件是 Vite 的核心扩展机制。Vite 会创建一个“插件容器”（`pluginContainer`），它负责加载所有在配置中定义的插件，并提供一个统一的上下文，让插件们可以在后续的生命周期钩子中各司其职。

4.  **创建模块图**：Vite 会初始化一个空的模块依赖图（`moduleGraph`）。这张“地图”将在后续的请求处理中被逐步填充，成为实现 HMR 的关键。

5.  **编排中间件管线**：这是最关键的一步。Vite 的核心功能，如处理静态资源、转换 `index.html`、编译 `ts`/`.vue` 文件、处理 HMR 更新等，都是通过一系列“中间件（Middlewares）”来实现的。Vite 会像编排流水线一样，将这些中间件按照严格的顺序注册到 `http` 服务器上。当一个请求到来时，它会像包裹一样，依次流经这条管线，被不同的中间件处理。

6.  **初始化 WebSocket 服务器**：为了实现 HMR，Vite 需要一条与浏览器客户端进行实时通信的“热线”。它会创建一个 WebSocket 服务器，并将其附加到 `http` 服务器上。当文件发生变化时，Vite 就是通过这条热线向客户端发送更新指令的。

7.  **执行预构建**：在正式启动服务器之前，Vite 会智能地扫描项目中的依赖，并使用 `esbuild` 对其进行“预构建（Pre-bundling）”。这个过程我们会在后续章节详细探讨，它主要是为了提升页面加载性能和处理 CommonJS 格式的依赖。

8.  **启动服务器监听**：一切准备就绪后，“总导演”会按下启动按钮。`http` 服务器开始监听指定的端口（默认为 5173），打印出熟悉的访问地址，并等待第一个浏览器请求的到来。

## 源码中的体现

虽然我们是在构建 `mini-vite`，但理解 Vite 源码中的结构对我们很有帮助。在 Vite 的 `src/node/server/index.ts` 文件中，你可以找到 `createServer` 函数，它的结构大致如下：

```typescript
// 这是一个简化的伪代码，用于展示核心逻辑
async function createServer(inlineConfig) {
  // 1. 解析配置
  const config = await resolveConfig(inlineConfig, 'serve', 'development');

  // 2. 创建 http 服务器 和 WebSocket 服务器
  const httpServer = await resolveHttpServer(config.server);
  const ws = createWebSocketServer(httpServer, config);

  // 3. 创建模块图和插件容器
  const moduleGraph = new ModuleGraph(pluginContainer);
  const pluginContainer = createPluginContainer(config, moduleGraph);

  // 4. 创建一个 Connect 实例作为中间件管理器
  const app = connect();

  // 5. 注册一系列中间件
  app.use(htmlFallbackMiddleware());
  app.use(transformMiddleware());
  app.use(staticMiddleware());
  // ... 还有很多其他中间件

  // 6. 启动监听
  httpServer.listen(config.server.port);

  return {
    // ... 返回服务器实例
  };
}
```

通过这个简化的流程，我们可以看到，服务器的启动过程是一个精心设计的、层层递进的初始化过程。它首先建立起核心的数据结构（配置、模块图），然后搭建起核心的扩展机制（插件），最后再将核心的功能（中间件）串联起来，形成一个高效的工作流。

在下一章，我们将聚焦于这条“中间件管线”，详细看看一个 HTTP 请求是如何在 Vite 的世界里旅行的。