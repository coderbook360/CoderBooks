# 20. 转换缓存与失效

在前面的章节中，我们已经打通了从“接收请求 -> 解析 URL -> 建立模块节点 -> 读取源码”的完整流程。现在，我们拿到了模块的“原材料”——未经处理的源代码。下一步，就是调用插件系统，对这些代码进行转换（例如，将 TypeScript 编译为 JavaScript，或者处理 Vue 单文件组件）。

然而，转换是一个相对耗费计算资源的操作。如果每次浏览器请求同一个文件（比如刷新页面），我们都重新转换一次，那么 Vite 引以为傲的性能优势将荡然无存。为了解决这个问题，Vite 设计了一套与模块图深度绑定的、高效的**转换缓存**机制。

## 20.1. 缓存的载体：`ModuleNode.transformResult`

Vite 的转换缓存策略非常直观：**将每个模块的转换结果，直接存储在它对应的 `ModuleNode` 节点上**。

回忆一下 `ModuleNode` 的结构，其中有一个关键属性 `transformResult`：

```typescript
class ModuleNode {
  // ... 其他属性
  transformResult: TransformResult | null;
}
```

`TransformResult` 是一个对象，它通常包含：

*   `code`: `{string}` 转换后的代码。
*   `map`: `{SourceMap}` 转换后的 Source Map。
*   `etag`: `{string}` 一个根据代码内容生成的 ETag，用于 HTTP 缓存协商。

当 `transformRequest` 函数第一次处理某个模块时，它会：

1.  调用插件容器（`pluginContainer.transform`）对源码进行转换。
2.  将返回的 `TransformResult` 对象，完整地存入当前模块节点的 `transformResult` 属性中。

当**下一次**请求同一个模块的 URL 时，`transformRequest` 函数会在执行任何耗时操作之前，首先检查这个节点的 `transformResult` 属性：

```typescript
// packages/vite/src/node/server/transformRequest.ts (核心缓存逻辑)

async function transformRequest(url, server) {
  // ... (URL 标准化)
  const mod = await server.moduleGraph.ensureEntryFromUrl(url);

  // 1. 检查缓存
  // 如果节点上已经有转换结果，并且没有失效，直接返回！
  if (mod.transformResult) {
    return mod.transformResult;
  }

  // 2. 如果没有缓存，则执行完整的转换流程
  const result = await loadAndTransform(id, server, mod);

  // 3. 将结果存入缓存
  mod.transformResult = result;

  return result;
}
```

正是这个简单的 `if (mod.transformResult)` 判断，构成了 Vite 极速二次加载的基础。只要文件没有变化，所有模块的转换结果都会被缓存，刷新页面时，服务器可以直接从内存中读取结果并返回，几乎没有任何延迟。

## 20.2. 缓存的失效机制

缓存虽好，但必须有精确的失效机制，否则我们修改了代码，浏览器却还在使用旧的缓存，这显然是无法接受的。

Vite 的缓存失效机制与它的文件监听系统（我们在第 8 章讨论过）紧密相连。

当你修改并保存一个文件时，会发生以下连锁反应：

1.  **文件监听器触发**：Vite 的底层文件监听器（通常是 Chokidar）捕获到文件变更事件。

2.  **调用 `moduleGraph.onFileChange`**：服务器监听到事件后，会调用模块图的 `onFileChange` 方法，并传入发生变化的文件路径。

3.  **找到并失效模块**：`onFileChange` 方法会根据文件路径，在 `fileToModuleMap` 中找到对应的 `ModuleNode`。

4.  **置空缓存**：找到节点后，最关键的一步发生了——Vite 会将该节点的 `transformResult` 属性重新设置为 `null`。

    ```typescript
    // packages/vite/src/node/server/moduleGraph.ts (简化版)
    onFileChange(file: string): void {
      const mod = this.getModuleByFile(file);
      if (mod) {
        // 使模块的转换缓存失效
        mod.transformResult = null;

        // ... (后续会触发 HMR 流程)
      }
    }
    ```

就是这么简单的一行 `mod.transformResult = null;`，就完成了缓存的精确失效。

当 HMR 机制（我们将在后续章节深入探讨）触发浏览器重新请求这个模块的 URL 时，`transformRequest` 再次执行。这一次，它会发现 `mod.transformResult` 是 `null`，于是它会跳过缓存逻辑，重新读取文件、执行完整的插件转换流程，并把新的转换结果再次存入 `transformResult`，完成一次“缓存换新”。

## 20.3. mini-vite 的实现

让我们将转换缓存与失效的逻辑，集成到 `mini-vite` 的 `transformRequest` 函数中。

```javascript
// src/server.js (更新 transformRequest)

// ... (imports)

export async function transformRequest(url, serverContext) {
  const { config, moduleGraph, pluginContainer } = serverContext;

  // 1. 在模块图中获取或创建节点
  const mod = moduleGraph.ensureEntryFromUrl(url);

  // 2. 检查缓存
  if (mod.transformResult) {
    console.log(`[mini-vite] Using cache for: ${url}`);
    return mod.transformResult;
  }

  // 3. 解析路径并读取文件 (如果之前没做过)
  if (!mod.file) {
    mod.file = path.join(config.root, url.slice(1));
  }
  const rawCode = await fs.readFile(mod.file, 'utf-8');

  // 4. 调用插件进行转换
  const transformResult = await pluginContainer.transform(rawCode, mod.file);

  // 5. 缓存结果
  // 在一个完整的实现中，应该缓存一个包含 code, map, etag 的完整对象
  mod.transformResult = transformResult;

  return transformResult;
}
```

同时，在 `MiniModuleGraph` 中，我们也需要一个方法来处理缓存失效：

```javascript
// src/moduleGraph.js (更新)

export class MiniModuleGraph {
  // ... (constructor, ensureEntryFromUrl)

  getModuleByFile(file) {
    // 在一个完整的实现中，这里应该有一个 fileToModuleMap 来快速查找
    for (const mod of this.urlToModuleMap.values()) {
      if (mod.file === file) {
        return mod;
      }
    }
    return null;
  }

  // 使模块缓存失效
  invalidateModule(file) {
    const mod = this.getModuleByFile(file);
    if (mod) {
      console.log(`[mini-vite] Invalidating cache for: ${file}`);
      mod.transformResult = null;
      return mod;
    }
    return null;
  }
}
```

现在，我们的 `mini-vite` 拥有了基本的缓存能力：

*   `transformRequest` 在转换前会检查缓存，并在转换后存储结果。
*   `moduleGraph.invalidateModule` 方法可以精确地清除特定文件的缓存，为后续实现 HMR 做好了准备。

通过本章的学习，我们理解了 Vite 性能的又一个关键支柱——转换缓存。这个与模块图紧密结合的缓存策略，是 Vite 实现极速开发体验的基石。至此，我们已经完成了“模块图与转换”部分的全部核心内容。
