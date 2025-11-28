# 22. 更新传播与边界

在上一章，我们成功地在服务器和客户端之间建立了一条 WebSocket“热线”。现在，当文件发生变化时，服务器已经具备了通知客户端的能力。但这引出了 HMR 中最核心、最精妙的问题：**服务器应该发送什么信息？**

是简单地告诉客户端“`button.js`变了”，还是“`app.vue`变了”，亦或是“整个页面都需要刷新”？

一个理想的 HMR 系统应该尽可能地“懒惰”和精确。如果只修改了一个 CSS 颜色，我们绝不希望整个 React 组件的状态都丢失。如果只是修改了一个工具函数，我们希望只有直接使用它的模块被重新执行，而不是整个应用重载。

要实现这种精确的控制，Vite 必须理解变更的“传播”路径，并找到一个合适的“边界”来中止这个传播。这就是本章要探讨的核心：**HMR 的更新传播与边界发现机制**。

## 22.1. 理论：涟漪的传播与吸收

想象一下，你的模块图是一个平静的池塘，每个模块都是池塘中的一个分子。当一个模块（比如 `button.js`）发生变化时，就像向池塘里扔进了一颗石子，激起了一圈涟漪。

- **涟漪的传播 (Propagation)**：这个涟漪会从 `button.js` 开始，向上游扩散。所有直接或间接依赖 `button.js` 的模块，都会被这个涟漪波及。
    - `card.js` 导入了 `button.js`，所以涟漪到达了 `card.js`。
    - `home.vue` 导入了 `card.js`，所以涟漪继续扩散到 `home.vue`。
    - `app.vue` 导入了 `home.vue`，涟漪最终到达了 `app.vue`。

- **HMR 边界 (Boundary)**：这个涟漪不能无限扩散下去。如果它扩散到了最顶层的 `index.html`，就意味着整个应用的结构都可能受到了影响，唯一的办法就是刷新整个页面（`full-reload`）。为了避免这种情况，我们需要在传播路径上找到一个“吸收”涟漪的模块。这个模块就是 **HMR 边界**。

一个模块如何才能成为边界？它必须明确地告诉 Vite：“**我懂得如何处理我依赖的模块的更新，不需要再往上传播了。**” 在 Vite 中，这是通过 `import.meta.hot.accept` API 来实现的。

例如，`home.vue` 可能有这样的代码：

```javascript
import Card from './card.js';

// ...

if (import.meta.hot) {
  import.meta.hot.accept('./card.js', (newCard) => {
    // 当 card.js 更新时，执行这个回调
    // 我们可以在这里用新的 Card 模块，动态地更新页面，而无需刷新
    console.log('card.js has been updated!');
    // (在 Vue 或 React 中，框架的 HMR 插件会自动处理这些)
  });
}
```

当 `card.js` 或它下游的 `button.js` 发生变化，涟漪传播到 `home.vue` 时，Vite 会发现 `home.vue` “接受”了来自 `./card.js` 的更新。于是，Vite 就确定 `home.vue` 是这次更新的边界。它会停止向上游传播，并向客户端发送一个 `{ type: 'update', path: '/src/home.vue' }` 这样的消息，告诉客户端去重新请求并执行 `home.vue` 模块。

如果一个模块没有 `accept` 它的依赖，涟漪就会继续向上游传播，直到找到一个接受者，或者最终触达顶层导致页面重载。

## 22.2. 源码：`handleHMRUpdate` 的传播算法

Vite 中处理 HMR 更新的核心逻辑位于 `packages/vite/src/node/server/hmr.ts` 的 `handleHMRUpdate` 函数中。

当文件监听器捕获到文件变更时，就会调用这个函数。它的工作流程如下：

1.  **获取变更模块**：根据变更的文件路径，从模块图中找到对应的 `ModuleNode`。

2.  **失效模块**：将该模块的转换缓存 `transformResult` 置为 `null`（如第 20 章所述）。

3.  **寻找边界**：这是最核心的算法。Vite 会创建一个 `boundary` 集合和一个 `needFullReload` 标志。

    ```typescript
    // packages/vite/src/node/server/hmr.ts (简化版)

    async function handleHMRUpdate(file, server) {
      const mod = await server.moduleGraph.getModuleByFile(file);
      // ...

      // 1. 使模块缓存失效
      await server.moduleGraph.invalidateModule(mod);

      // 2. 向上遍历，寻找 HMR 边界
      const boundary = new Set<ModuleNode>();
      const needFullReload = await propagateUpdate(mod, boundary);

      // 3. 根据结果发送消息
      if (needFullReload) {
        server.ws.send({ type: 'full-reload' });
      } else {
        server.ws.send({
          type: 'update',
          updates: [...boundary].map((b) => ({
            type: b.type === 'js' ? 'js-update' : 'css-update',
            path: b.url,
            // ...
          })),
        });
      }
    }

    async function propagateUpdate(mod, boundary) {
      const importers = mod.importers;
      if (importers.size === 0) {
        // 如果没有上游模块（例如入口文件），则需要整页重载
        return true; 
      }

      for (const importer of importers) {
        // 检查 importer 是否接受了对 mod 的更新
        if (importer.isSelfAccepting || importer.acceptedHmrDeps.has(mod)) {
          boundary.add(importer);
          continue; // 找到边界，停止在该路径上继续传播
        }

        // 如果没有接受，则递归地向上传播
        if (await propagateUpdate(importer, boundary)) {
          return true; // 如果任何一个分支需要重载，则整体需要重载
        }
      }
      return false;
    }
    ```

    `propagateUpdate` 函数是一个递归函数，它清晰地展示了“涟漪”的传播过程：

    -   从当前变更的模块 `mod` 开始，遍历它的所有“上游”模块（`importers`）。
    -   对于每一个上游模块 `importer`，检查它是否“接受”了对 `mod` 的更新（`acceptedHmrDeps` 集合包含了 `import.meta.hot.accept` 的信息）。
    -   如果**接受**，那么 `importer` 就是一个边界，将它加入 `boundary` 集合，并停止在这一条路径上继续向上递归。
    -   如果**不接受**，则以 `importer` 为新起点，递归调用 `propagateUpdate`，继续向上寻找边界。
    -   如果在任何路径上，传播到达了根节点（`importers` 为空），则返回 `true`，表示需要整页重载。

4.  **发送消息**：遍历结束后，如果 `needFullReload` 为 `true`，就发送 `full-reload` 消息。否则，就将找到的所有 `boundary` 模块的信息，打包成一个 `update` 消息发送出去。

## 22.3. mini-vite 的实现

在 `mini-vite` 中，我们无法完整解析 `import.meta.hot.accept`，但我们可以模拟这个传播和边界查找的核心思想。

我们将创建一个 `handleHMRUpdate` 函数，并将其与文件监听器集成。

```javascript
// src/server.js (添加 HMR 处理)

import chokidar from 'chokidar';
// ...

export async function createServer() {
  // ... (httpServer, ws 创建等)

  // 创建文件监听器
  const watcher = chokidar.watch(config.root, {
    ignored: [/node_modules/, /.git/],
    ignoreInitial: true,
  });

  // 将 serverContext 组合起来
  const serverContext = { config, moduleGraph, ws, watcher };

  // 监听文件变更事件
  watcher.on('change', (file) => {
    console.log(`[mini-vite] file changed: ${file}`);
    handleHMRUpdate(file, serverContext);
  });

  // ... (listen, etc.)
}

async function handleHMRUpdate(file, serverContext) {
  const { moduleGraph, ws } = serverContext;

  // 1. 使变更的模块缓存失效
  const changedMod = moduleGraph.invalidateModule(file);
  if (!changedMod) return;

  // 2. 向上遍历，寻找边界
  const boundary = new Set();
  const needFullReload = propagateUpdate(changedMod, boundary);

  // 3. 发送消息
  if (needFullReload) {
    console.log(`[mini-vite] Full reload needed.`);
    ws.send({ type: 'full-reload' });
  } else {
    console.log(`[mini-vite] HMR boundary found:`, [...boundary].map(b => b.url));
    ws.send({
      type: 'update',
      updates: [...boundary].map(b => ({ type: 'js-update', path: b.url }))
    });
  }
}

function propagateUpdate(mod, boundary) {
  if (mod.importers.size === 0) {
    return true; // 到达根节点，需要重载
  }

  for (const importer of mod.importers) {
    // 极简版边界判断：如果一个模块的文件名包含 `boundary`，我们就认为它是一个边界
    // 在真实世界中，这里会检查 `importer.acceptedHmrDeps`
    if (importer.url.includes('boundary')) {
      boundary.add(importer);
      continue;
    }

    if (propagateUpdate(importer, boundary)) {
      return true;
    }
  }
  return false;
}
```

在这个 `mini-vite` 的实现中：

1.  我们使用 `chokidar` 来监听文件变化，并在 `change` 事件触发时调用 `handleHMRUpdate`。
2.  `handleHMRUpdate` 首先调用我们之前实现的 `invalidateModule` 来清除缓存。
3.  核心的 `propagateUpdate` 函数通过递归遍历 `mod.importers`，模拟了向上查找的过程。
4.  我们用一个非常简化的规则 (`importer.url.includes('boundary')`) 来模拟 `import.meta.hot.accept` 的边界判断。这足以让我们理解算法的精髓。
5.  最后，根据是否找到边界，通过 WebSocket 发送 `full-reload` 或 `update` 消息。

至此，我们已经打通了 HMR 在服务器端最核心的逻辑：从文件监听到精确的更新传播分析。下一步，我们将转向客户端，看看浏览器是如何响应这些消息，并完成最终的“热替换”动作的。
