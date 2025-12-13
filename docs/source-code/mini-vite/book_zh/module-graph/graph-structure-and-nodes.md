# 18. 模块图结构与节点状态

当我们谈论 Vite 或任何现代前端构建工具时，“模块图” (Module Graph) 是一个无法绕开的核心概念。你可以把它想象成是 Vite 在开发模式下维护的一张“活地图”，这张地图详细记录了你的应用程序中所有模块之间的依赖关系。

理解模块图，是理解 Vite 按需编译、HMR（热模块替换）等核心功能的基础。

## 1. 理论：什么是模块图？

想象一下你的项目是一座由许多乐高积木搭建而成的城堡。

- **模块 (Module)**：每一个单独的乐高积木块，就是一个模块。在前端世界里，这可以是一个 JavaScript 文件 (`.js`, `.ts`)、一个 CSS 文件 (`.css`)，甚至是一个 Vue 或 React 组件 (`.vue`, `.jsx`)。
- **依赖关系 (Dependency)**：一块乐高积木是如何与另一块拼接在一起的。在代码中，这就是 `import` 或 `require` 语句。例如，`main.js` 导入了 `app.vue`，`app.vue` 又导入了 `button.vue` 和一个 CSS 文件。
- **模块图 (Module Graph)**：整个城堡的完整搭建图纸。它清晰地展示了每一块积木（模块）的位置，以及它们之间是如何相互连接（依赖）的。

Vite 在启动开发服务器时，并不会立即去构建整个“城堡”。相反，它会从你的入口文件（通常是 `index.html`，然后是它引用的 `main.js`）开始，像一个探险家一样，顺着 `import` 的藤蔓，一步步地去发现和加载新的模块。

每当它“发现”一个新模块，它就会做两件事：

1.  **创建一个节点 (Node)**：在它的“地图”上为这个新模块画一个点，并记录下这个模块的详细信息，比如它的绝对路径、URL 等。
2.  **连接依赖 (Edge)**：找到这个模块 `import` 了哪些其他模块，然后在地图上用箭头将它们连接起来，形成依赖关系。

最终，这张由节点和箭头组成的网络，就是模块图。

## 2. 源码：Vite 中的 `ModuleGraph`

在 Vite 的源码中，`ModuleGraph` 类 (位于 `packages/vite/src/node/server/moduleGraph.ts`) 就是这个核心数据结构的实现。让我们深入其中，看看它是如何设计的。

### `ModuleNode`：图的节点

模块图中的每一个节点都是一个 `ModuleNode` 类的实例。它代表一个具体的模块，并存储了与该模块相关的所有信息。

一个简化的 `ModuleNode` 结构看起来像这样：

```typescript
// packages/vite/src/node/server/moduleGraph.ts

class ModuleNode {
  // 模块的唯一 ID，通常是基于项目根目录的相对 URL
  url: string;
  // 模块的绝对文件路径
  file: string | null;
  // 模块的类型，例如 'js', 'css'
  type: 'js' | 'css';

  // 依赖：该模块导入了哪些其他模块
  // ModuleNode 集合，代表当前模块直接依赖的模块
  importers: Set<ModuleNode>;

  // 被依赖：该模块被哪些其他模块导入
  // ModuleNode 集合，代表直接依赖当前模块的模块
  importedBy: Set<ModuleNode>;

  // 转换结果，包含编译后的代码等
  transformResult: TransformResult | null;

  // 上次热更新的时间戳
  lastHMRTimestamp = 0;
}
```

这里有几个关键属性值得我们关注：

-   `url` 和 `file`：`url` 是模块在浏览器中的访问路径，也是模块的唯一标识。`file` 则是它在服务器文件系统上的真实路径。
-   `importers` 和 `importedBy`：这两个 `Set` 集合是构建图结构的关键。
    -   `importers` 记录了当前模块 `import` 了谁（它的“下游”）。
    -   `importedBy` 记录了谁 `import` 了当前模块（它的“上游”）。
    -   正是通过这两个属性，Vite 才能在文件发生变化时，快速地向上游或下游遍历依赖关系，实现精确的 HMR。
-   `transformResult`：存储了模块经过 Vite 插件系统转换后的结果（例如，TypeScript 编译后的 JavaScript 代码）。Vite 会将这个结果缓存起来，避免重复劳动。

### `ModuleGraph`：图的容器

`ModuleGraph` 类本身则像一个管理者，它负责创建、存储和查询所有的 `ModuleNode`。

```typescript
// packages/vite/src/node/server/moduleGraph.ts

class ModuleGraph {
  // 使用 URL 作为键，存储所有模块节点的 Map
  urlToModuleMap: Map<string, ModuleNode> = new Map();
  // 使用文件路径作为键，存储所有模块节点的 Map
  fileToModuleMap: Map<string, ModuleNode> = new Map();

  // 根据 URL 获取或创建模块节点
  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    // ... 实现细节 ...
  }

  // 根据文件路径获取模块节点
  getModuleByFile(file: string): ModuleNode | undefined {
    // ... 实现细节 ...
  }

  // 当一个文件发生变化时，使其关联的模块失效
  onFileChange(file: string): void {
    const mod = this.getModuleByFile(file);
    if (mod) {
      // ... 触发 HMR 的逻辑 ...
    }
  }

  // 更新模块间的依赖关系
  updateModuleInfo(
    mod: ModuleNode,
    importedModules: Set<ModuleNode | string>
  ): void {
    // ... 实现细节 ...
  }
}
```

`ModuleGraph` 的核心功能可以概括为：

1.  **模块注册与查询**：通过 `urlToModuleMap` 和 `fileToModuleMap`，可以快速地根据 URL 或文件路径找到对应的 `ModuleNode`。`ensureEntryFromUrl` 是最常用的方法，它保证了每个模块只有一个对应的 `ModuleNode` 实例。
2.  **依赖关系更新**：当 Vite 处理一个模块（例如，转换其代码）时，它会解析出该模块的 `import` 语句，然后调用 `updateModuleInfo` 来更新 `importers` 和 `importedBy` 集合，从而维护整个图的连接关系。
3.  **HMR 触发**：当监听到文件变化时，`onFileChange` 方法会被调用。它会找到对应的模块节点，并启动 HMR 流程，通知所有“上游”模块进行更新。

## 3. 实现：mini-vite 中的模块图

在我们的 `mini-vite` 项目中，我们不需要实现 Vite 源码中那么复杂的 `ModuleGraph`，但核心思想是一致的。我们可以创建一个简化的版本。

### `MiniModuleNode`

我们可以定义一个只包含最核心信息的节点类：

```javascript
// mini-vite/src/moduleNode.js

export class MiniModuleNode {
  constructor(url) {
    // 模块的唯一 URL
    this.url = url;
    // 依赖该模块的上游模块集合
    this.importers = new Set();
    // 该模块依赖的下游模块集合
    this.importedBy = new Set();
    // 模块的转换结果
    this.transformResult = null;
  }
}
```

### `MiniModuleGraph`

对应的图容器也只保留核心功能：

```javascript
// mini-vite/src/moduleGraph.js
import { MiniModuleNode } from './moduleNode.js';

export class MiniModuleGraph {
  constructor() {
    this.urlToModuleMap = new Map();
  }

  // 根据 URL 获取或创建节点
  ensureEntryFromUrl(url) {
    if (this.urlToModuleMap.has(url)) {
      return this.urlToModuleMap.get(url);
    }
    const mod = new MiniModuleNode(url);
    this.urlToModuleMap.set(url, mod);
    return mod;
  }

  // 更新模块依赖
  updateModule(mod, importedModules) {
    mod.importedBy.clear();
    for (const imported of importedModules) {
      const depMod = this.ensureEntryFromUrl(imported.url);
      depMod.importers.add(mod);
      mod.importedBy.add(depMod);
    }
  }
}
```

这个简化版的模块图已经抓住了问题的核心：

1.  用一个 `Map` 来存储所有模块，确保唯一性。
2.  通过 `importers` 和 `importedBy` 两个集合来双向记录依赖关系。

有了这个基础数据结构，我们就可以在后续章节中轻松地实现模块的按需加载和 HMR 功能了。当一个文件 `A` 发生变化时，我们只需要通过 `moduleGraph.getModuleByFile(A)` 找到节点，然后遍历其 `importers` 集合，就能找到所有依赖它的上游模块，并通知它们进行更新。

这就是模块图的魔力所在——它将扁平的文件系统，变成了一个动态、可追溯的依赖网络。
