# 第 23 章：客户端处理与热替换

我们已经搭建了服务器与浏览器之间的通信“热线”（WebSocket），并学会了如何在服务端追踪变更的“涟漪”并找到 HMR 边界。现在，是时候揭晓 HMR 魔法的最后一环了：浏览器这位“接收员”，在接到指令后，是如何悄无声息地完成模块替换的。

### 理论：客户端 HMR 的使命

当服务器通过 WebSocket 发送更新通知时，客户端（浏览器）中运行的一段特殊脚本需要完成一系列精密操作，这正是 Vite 客户端脚本的核心使命。

这个过程可以分解为以下几个步骤：

1.  **接收指令**：客户端的 WebSocket 客户端随时待命，监听来自服务器的消息。当 `{ type: 'update', ... }` 这样的消息抵达时，更新流程被激活。

2.  **失效模块，重新请求**：对于消息中指定的已更新模块（例如 `update.path`），客户端不能使用浏览器缓存的旧版本。它必须重新发起请求。这里的关键技巧是在模块 URL 后面附加一个时间戳查询参数，如 `import('/src/main.js?t=167888666')`。这个动态变化的参数会欺骗浏览器，让它认为这是一个全新的请求，从而绕过缓存，直接从服务器获取最新的模块代码。

3.  **寻找边界并执行回调**：在服务端，我们已经确定了接受更新的“边界”模块（`acceptedPath`）。客户端脚本在收到消息后，会在一个内部维护的映射表（`hotModulesMap`）中，根据 `acceptedPath` 找到对应的模块记录。这个记录中保存着当初由 `import.meta.hot.accept` 注册的回调函数。

4.  **执行魔法**：找到回调函数后，客户端会执行它，并将新请求到的、热乎的模块（`newMod`）作为参数传入。`accept` 的回调函数通常会包含更新UI、替换状态等逻辑，比如在 React 中可能会触发组件的重新渲染。

5.  **最后的退路：整页刷新**：如果在客户端的映射表中找不到能够处理此次更新的边界模块，或者在执行回调过程中发生错误，就意味着热更新无法安全地完成。此时，为了保证页面状态的一致性，客户端会选择最稳妥的策略：`location.reload()`，进行一次完整的页面刷新。

### Vite 源码剖析：`client.ts` 的智慧

Vite 的 HMR 客户端逻辑主要位于 `packages/vite/src/client/client.ts` 文件中。这个脚本会在开发模式下被自动注入到你的应用入口。

当我们查看源码时，可以重点关注 `socket.addEventListener('message', ...)` 这部分。它就像是客户端的总调度中心。

```javascript
// packages/vite/src/client/client.ts

// 1. 监听 WebSocket 消息
socket.addEventListener('message', async ({ data }) => {
  const payload = JSON.parse(data)
  switch (payload.type) {
    // ...
    case 'update':
      // 2. 收到更新指令，执行更新
      await fetchUpdate(payload)
      break
    // ...
  }
})

async function fetchUpdate({ updates }) {
  // ...
  for (const update of updates) {
    // ...
    // 3. 寻找能处理更新的模块
    const boundary = await getUpdateBoundary(update.path)

    if (!boundary) {
      // 4. 找不到边界，刷新页面
      window.location.reload()
      return
    }

    // 5. 重新拉取边界模块及其依赖
    await Promise.all(
      [...boundary].map((dep) => {
        return import(dep + '?t=' + Date.now())
      }),
    )
  }
  // ...
}
```

这段简化后的代码清晰地展示了客户端的工作流程：监听消息、解析 `update` 指令、然后调用 `fetchUpdate`。在 `fetchUpdate` 中，它会尝试寻找更新边界，如果找不到，就直接刷新页面。如果找到了，则通过动态 `import()` 配合时间戳参数，拉取最新的模块代码，从而触发模块的重新执行和 `accept` 回调的运行。

### mini-vite 实践：构建 HMR 客户端

现在，让我们亲手为 `mini-vite` 构建一个微型 HMR 客户端。

首先，我们需要一段在浏览器中运行的脚本。我们可以将其命名为 `hmr-client.js`，但为了简化，我们直接在插件中将其作为字符串处理。

```javascript
// 伪代码：hmr-client.js 的核心逻辑

// 1. 连接 WebSocket
const socket = new WebSocket(`ws://${location.host}`, 'vite-hmr');

// 2. 监听消息
socket.addEventListener('message', async ({ data }) => {
  handleMessage(JSON.parse(data));
});

// 存储 HMR 回调
// key: 模块 URL (ownerPath)
// value: { callbacks: [Function, ...] }
const hotModulesMap = new Map();

async function handleMessage(payload) {
  switch (payload.type) {
    case 'connected':
      console.log('[mini-vite] client connected.');
      break;
    case 'update':
      console.log('[mini-vite] received update message.');
      // 处理更新
      await handleUpdate(payload.updates);
      break;
    default:
      break;
  }
}

async function handleUpdate(updates) {
  for (const update of updates) {
    const { acceptedPath } = update;

    // 找到接受更新的模块记录
    const mod = hotModulesMap.get(acceptedPath);
    if (!mod || !mod.callbacks.length) {
      // 没有找到边界或没有回调，整页刷新
      console.log(`[mini-vite] HMR boundary not found for ${acceptedPath}. Reloading...`);
      location.reload();
      return;
    }

    // 重新拉取发生变更的模块（注意不是边界模块）
    // 使用时间戳确保获取最新代码
    const newMod = await import(update.path + '?t=' + Date.now());

    // 执行边界模块注册的回调
    mod.callbacks.forEach(cb => {
      console.log(`[mini-vite] executing HMR callback for ${acceptedPath}.`);
      cb(newMod);
    });
  }
}

// 这就是 import.meta.hot 的“真身”
export const createHotContext = (ownerPath) => {
  if (!hotModulesMap.has(ownerPath)) {
    hotModulesMap.set(ownerPath, {
      callbacks: []
    });
  }

  const hot = {
    accept(callback) {
      // 将回调存储到 map 中
      hotModulesMap.get(ownerPath).callbacks.push(callback);
    }
  };

  return hot;
};
```

这段代码做了几件关键事情：
1.  创建了一个 `hotModulesMap`，用于存储每个模块的 `accept` 回调。
2.  `createHotContext` 函数是 `import.meta.hot` 的实现。当一个模块调用 `import.meta.hot.accept(cb)` 时，实际上是调用 `createHotContext` 返回的 `hot.accept` 方法，将回调函数 `cb` 存入了 `hotModulesMap`。
3.  `handleUpdate` 函数在收到更新消息后，根据 `acceptedPath` 从 `hotModulesMap` 中找到对应的回调，然后使用 `import(path + '?t=' + ...)` 拉取新模块，并执行回调。

最后，我们需要更新 `clientInjectPlugin` 插件，将这段客户端脚本注入到应用的入口文件中。同时，我们还需要在 `transform` 钩子中，将用户代码里的 `import.meta.hot` 替换为对我们 `createHotContext` 的调用。

```javascript
// server/plugins/clientInject.js

export function clientInjectPlugin() {
  return {
    name: 'mini-vite:client-inject',
    transform(code, id) {
      // 只处理入口文件
      if (id.endsWith('main.js')) {
        const clientCode = `
          // HMR Client Code from above
          import { createHotContext } from '/@vite/client';
          
          // ... WebSocket, handleMessage, handleUpdate ...
        `;
        
        // 将客户端代码注入到 main.js 顶部
        return clientCode + code;
      }
      
      // 将 import.meta.hot 替换为我们的实现
      if (code.includes('import.meta.hot')) {
        const replaced = code.replace(
          /import\.meta\.hot/g,
          'createHotContext(import.meta.url)'
        );
        return replaced;
      }

      return code;
    }
  };
}
```
当然，为了让 `import { createHotContext } from '/@vite/client'` 能够工作，我们还需要一个虚拟模块的插件来提供客户端代码，但这超出了核心逻辑的范畴。一个更简单的实现是直接在 `transform` 中将所有客户端代码注入。

至此，从文件监听到服务端分析，再到客户端执行更新的 HMR 完整闭环就构建完成了。`mini-vite` 现在拥有了现代开发服务器的灵魂功能！