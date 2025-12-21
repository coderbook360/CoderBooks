# 19. URL 解析与入口建立

我们已经了解了模块图这个核心数据结构，但模块图本身是如何被一步步建立起来的呢？答案始于一个最基本的操作：**处理 HTTP 请求**。

当你在浏览器中访问 `http://localhost:5173/` 时，Vite 开发服务器接收到了一系列的请求。这些请求的 URL，就是构建和扩展模块图的“原材料”。服务器的核心任务之一，就是将这些浏览器发来的 URL，精确地解析为模块图中的一个个节点，并以它们为起点，触发后续的转换、加载和依赖分析。

本章，我们将聚焦于这个从 URL 到模块图节点的关键过程。

## 19.1. 请求的入口：`transformRequest`

Vite 中处理模块转换的核心函数是 `transformRequest`，它位于 `packages/vite/src/node/server/transformRequest.ts`。你可以把它看作是 Vite 开发服务器的“心脏”，几乎所有对 JS/TS/CSS 等源码的请求，最终都会汇集到这里。

当一个请求进入 `transformRequest` 时，它的首要任务是：**将请求的 URL 标准化，并在模块图中找到或创建一个对应的 `ModuleNode`**。

让我们看看这个函数的简化版签名和核心逻辑：

```typescript
// packages/vite/src/node/server/transformRequest.ts (简化版)

export async function transformRequest(
  url: string, // 浏览器请求的原始 URL，例如 /src/main.ts
  server: ViteDevServer
): Promise<TransformResult | null> {

  // 1. 标准化 URL，移除哈希和时间戳等查询参数
  const { moduleGraph } = server;
  const id = removeTimestampQuery(url);

  // 2. 在模块图中查找或创建入口节点
  const mod = await moduleGraph.ensureEntryFromUrl(id);

  // ... 后续的转换、加载、缓存检查等逻辑 ...
}
```

这个过程的第一步和第二步至关重要：

1.  **URL 标准化**：浏览器请求的 URL 可能会包含一些用于缓存控制的查询参数，例如 `?t=1678886400000`。在将 URL 作为模块 ID 之前，必须将这些参数清理掉，以确保模块的唯一性。`removeTimestampQuery` 函数就负责这个工作。
2.  **确保入口节点**：`moduleGraph.ensureEntryFromUrl(id)` 是整个流程的关键。它会拿着标准化后的 `id`（例如 `/src/main.ts`）去模块图的 `urlToModuleMap` 中查找。 
    *   如果**找到了**，说明这个模块之前已经被处理过，直接返回对应的 `ModuleNode`。
    *   如果**没找到**，说明这是一个全新的模块，`ModuleGraph` 会立刻创建一个新的 `ModuleNode`，用这个 `id` 作为 `url`，然后将其存入 `urlToModuleMap`，最后返回这个新创建的节点。

通过 `ensureEntryFromUrl`，Vite 保证了任何一个 URL 请求，在模块图中都有一个唯一的、对应的“入口节点”。这个节点就是后续所有处理的起点。

## 19.2. 从 URL 到文件路径的解析

仅仅有 URL 是不够的，Vite 还需要知道这个 URL 对应的服务器磁盘上的**真实文件路径**，这样才能读取文件内容进行转换。这个解析工作发生在 `ModuleGraph` 的 `ensureEntryFromUrl` 内部，它会进一步调用 `resolveId` 这个方法。

`resolveId` 是一个更加通用的解析函数，它不仅服务于 `transformRequest`，也服务于插件在解析 `import` 语句时的需求。它的核心职责可以概括为：**根据请求的 `id` (URL) 和导入者 `importer` 的信息，解析出模块的绝对文件路径**。

解析逻辑大致如下：

1.  **根路径 (`/`)**：如果 URL 以 `/` 开头，Vite 会认为它是相对于项目根目录 (`config.root`) 的路径。例如，URL `/src/main.ts` 会被解析为 `G:/projects/io-books/CoderBooks/mini-vite/src/main.ts`。

2.  **相对路径 (`.` 或 `..`)**：如果 URL 以 `.` 或 `..` 开头，这通常发生在模块内部的 `import`。Vite 会结合 `importer`（导入这个模块的文件）的路径，来计算出被导入模块的绝对路径。

3.  **裸模块 (Bare Module)**：如果 URL 是一个裸模块名（如 `react`），Vite 会使用 Node.js 的解析算法，在 `node_modules` 目录中寻找这个包的入口文件。

4.  **别名 (Alias)**：Vite 还会检查 `resolve.alias` 配置，如果 URL 命中了某个别名规则（例如 `@/` 映射到 `/src/`），它会先进行替换，然后再进行解析。

一旦 `resolveId` 成功解析出文件路径，这个路径就会被存储在 `ModuleNode` 的 `file` 属性上，以备后续的文件读取操作。

## 19.3. mini-vite 的实现

现在，让我们在 `mini-vite` 中实现一个简化的请求处理与 URL 解析流程。我们将创建一个 `transformRequest` 函数，它将协调 URL 解析和模块图节点的创建。

```javascript
// src/server.js

import { promises as fs } from 'fs';
import path from 'path';

/**
 * 模拟 Vite 的核心请求转换器
 * @param {string} url - 浏览器请求的 URL
 * @param {object} serverContext - 服务器上下文，包含 config 和 moduleGraph
 */
export async function transformRequest(url, serverContext) {
  const { config, moduleGraph } = serverContext;

  // 1. 将 URL 解析为绝对文件路径
  const resolvedPath = path.join(config.root, url.slice(1)); // 极简版解析

  // 2. 在模块图中获取或创建节点
  const mod = moduleGraph.ensureEntryFromUrl(url);
  mod.file = resolvedPath; // 关联文件路径

  // 3. 读取文件内容
  try {
    const rawCode = await fs.readFile(resolvedPath, 'utf-8');

    // 4. (后续章节) 调用插件进行转换
    // const transformResult = await transformWithPlugins(rawCode, url, serverContext);
    // mod.transformResult = transformResult;

    // 5. 返回转换后的代码
    // return transformResult.code;

    // 当前章节：直接返回源码
    return rawCode;

  } catch (e) {
    console.error(`[mini-vite] Failed to load ${url}:`, e);
    // 在实际应用中，这里应该返回一个 404 或 500 错误响应
    return null;
  }
}
```

在这个 `mini-vite` 的实现中，我们构建了一个清晰的流程：

1.  **极简 URL 解析**：我们使用了一个非常简化的解析策略，直接将根路径开头的 URL 与项目根目录 `config.root` 拼接。一个完整的实现需要处理别名、相对路径和 `node_modules` 解析。
2.  **建立模块图入口**：我们调用 `moduleGraph.ensureEntryFromUrl(url)` 来获取或创建模块节点，这是与 Vite 保持一致的核心思想。
3.  **关联文件路径**：我们将解析出的 `resolvedPath` 存入节点的 `file` 属性，完成了从 URL 到物理文件的映射。
4.  **读取内容**：我们使用 `fs.readFile` 读取文件内容，为后续的转换步骤做准备。

通过本章的学习，我们打通了从一个 HTTP 请求到模块图入口建立的全过程。这个过程是 Vite 动态构建依赖关系、实现按需加载的基石。在下一章，我们将看到 Vite 是如何利用这个入口节点，对模块内容进行缓存和转换的。
