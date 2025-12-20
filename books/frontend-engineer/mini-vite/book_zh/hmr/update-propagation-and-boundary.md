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

### 22.1.2. 两种接受模式：`isSelfAccepting` vs `acceptedHmrDeps`

Vite 中存在**两种不同的 HMR 接受模式**，理解它们的区别对于掌握 HMR 边界至关重要：

**1. 自我接受（Self-Accepting）**

当一个模块调用 `import.meta.hot.accept()` 而**不传递任何依赖路径**时，它声明自己是"自我接受"的。这意味着当这个模块**自身**发生变化时，它会重新执行，而不需要通知上游：

```javascript
// counter.js - 自我接受模式
// 当 counter.js 自身被修改时，它会重新执行并调用回调
export let count = 0;

export function increment() {
  count++;
  render();
}

function render() {
  document.getElementById('count').textContent = count;
}

if (import.meta.hot) {
  // accept() 不传参数：声明自己是 self-accepting
  // 这意味着当本文件变化时，Vite 会重新请求并执行这个模块
  import.meta.hot.accept();
  
  // 可选：使用 import.meta.hot.data 在更新间保持状态
  // data 对象会在模块重新执行前后保持不变
  if (import.meta.hot.data?.count !== undefined) {
    count = import.meta.hot.data.count;  // 恢复之前的计数值
    render();
  }
  
  // dispose 钩子在模块被替换前调用
  // 用于保存状态或执行清理操作
  import.meta.hot.dispose((data) => {
    data.count = count;  // 将当前状态保存到 data 对象
  });
}
```

在 Vite 内部，这会将 `ModuleNode.isSelfAccepting` 设置为 `true`。

**2. 依赖接受（Accepting Dependencies）**

当一个模块调用 `import.meta.hot.accept('./dep.js', callback)` 并传递具体的依赖路径时，它声明自己可以处理**特定依赖**的更新：

```javascript
// app.js - 依赖接受模式
import Card from './card.js';
import { formatDate } from './utils.js';

// ...

if (import.meta.hot) {
  // 只接受 card.js 的更新，当 card.js 变化时执行回调
  // newCard 是重新导入后的新模块对象
  import.meta.hot.accept('./card.js', (newCard) => {
    console.log('card.js has been updated!');
    // 使用新的 Card 组件重新渲染
    // Vue/React 框架的 HMR 插件会自动处理这些
  });
  
  // 可以接受多个依赖，传入数组
  // 当数组中任何一个模块变化时，都会触发回调
  import.meta.hot.accept(['./card.js', './utils.js'], ([newCard, newUtils]) => {
    // newCard 和 newUtils 分别是更新后的模块
    // 如果某个模块没有变化，对应位置是 undefined
  });
}
```

在 Vite 内部，这会将 `./card.js` 对应的 `ModuleNode` 添加到当前模块的 `acceptedHmrDeps` 集合中。

**关键区别**：
- `isSelfAccepting`：模块能处理**自身**的变化
- `acceptedHmrDeps`：模块能处理**特定依赖**的变化

在边界查找算法中，Vite 会检查这两种情况：

```typescript
// 边界判断的核心逻辑
// importer.isSelfAccepting: 上游模块声明了自我接受
// importer.acceptedHmrDeps.has(changedMod): 上游模块显式接受了变更模块
if (importer.isSelfAccepting || importer.acceptedHmrDeps.has(changedMod)) {
  boundary.add(importer);  // 找到边界
}
```

### 22.1.3. CSS HMR：无需 JavaScript 边界的特殊通道

CSS 文件在 Vite 中享有特殊的 HMR 待遇。与 JavaScript 不同，CSS 的更新**不需要寻找边界**，也**不需要重新执行任何 JavaScript**：

```typescript
// packages/vite/src/node/server/hmr.ts 中的 CSS 特殊处理
if (file.endsWith('.css')) {
  // CSS 文件变更时，直接发送 css-update 消息
  // 客户端只需要重新请求 CSS 并更新 <style> 或 <link> 标签
  ws.send({
    type: 'update',
    updates: [{
      type: 'css-update',
      path: moduleUrl,
      timestamp: Date.now()  // 添加时间戳破坏缓存
    }]
  });
  return;  // 不需要执行 propagateUpdate
}
```

客户端的 CSS HMR 处理也非常简单：

```javascript
// @vite/client 中的 CSS 更新处理
case 'css-update': {
  const { path, timestamp } = update;
  // 方式1：如果是 <link> 标签引入的 CSS
  const link = document.querySelector(`link[href*="${path}"]`);
  if (link) {
    // 通过更新 href 触发浏览器重新请求
    // 添加时间戳防止浏览器缓存
    const newUrl = new URL(link.href);
    newUrl.searchParams.set('t', timestamp);
    link.href = newUrl.toString();
  }
  
  // 方式2：如果是 Vite 注入的 <style> 标签
  // 重新 fetch CSS 内容并更新 style.textContent
  break;
}
```

这种设计使得 CSS 的热更新几乎是**即时**的，不会影响 JavaScript 状态。

### 22.1.4. `import.meta.hot.data`：跨更新的状态保持

在真实应用中，HMR 的一个关键挑战是**状态保持**。当模块重新执行时，之前的变量值会丢失。Vite 提供了 `import.meta.hot.data` 对象来解决这个问题：

```javascript
// timer.js - 演示状态保持
let intervalId = null;
let tickCount = 0;

function startTimer() {
  // 清理旧的定时器（如果存在）
  if (intervalId) clearInterval(intervalId);
  
  intervalId = setInterval(() => {
    tickCount++;
    console.log(`Tick: ${tickCount}`);
  }, 1000);
}

if (import.meta.hot) {
  // 从 data 中恢复状态
  // data 对象在模块更新前后是同一个对象引用
  if (import.meta.hot.data) {
    tickCount = import.meta.hot.data.tickCount || 0;
    intervalId = import.meta.hot.data.intervalId;
  }
  
  // dispose 在模块即将被替换时调用
  // 这是保存状态和清理副作用的最后机会
  import.meta.hot.dispose((data) => {
    // 保存当前状态到 data 对象
    data.tickCount = tickCount;
    data.intervalId = intervalId;
    // 注意：不要在这里 clearInterval
    // 因为我们想保持定时器继续运行
  });
  
  // prune 在模块不再被任何其他模块导入时调用
  // 这时应该进行完全清理
  import.meta.hot.prune(() => {
    if (intervalId) clearInterval(intervalId);
  });
  
  import.meta.hot.accept();
}

startTimer();
```

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
