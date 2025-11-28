# 13. 扫描与入口分析

欢迎来到本书的第四部分：依赖优化。这是 Vite 在开发环境下实现极致性能的另一个关键领域。你可能会有疑问：既然 Vite 已经是基于原生 ESM 的按需加载了，为什么还需要“优化”依赖呢？

## 一、为什么要优化依赖？

想象一个场景：你的项目依赖了像 `lodash-es` 这样的库。`lodash-es` 以其模块化而闻名，可能包含了数百个独立的、细小的文件。当你第一次加载页面时，你的代码中可能有一句 `import { debounce } from 'lodash-es'`。

浏览器在解析到这句代码时，会发起一个对 `/node_modules/lodash-es/debounce.js` 的请求。然而，`debounce.js` 内部可能又 `import` 了其他几个 `lodash-es` 的内部工具函数，这些工具函数又可能再 `import` 其他……

结果就是，为了一个 `debounce` 函数，浏览器可能会在短时间内发起数十甚至上百个 HTTP 请求。这种“请求瀑布”或“请求雪崩”会严重拖慢页面的首次加载速度，即使是在本地开发环境，也会感到明显的卡顿。

**依赖预构建（Dependency Pre-bundling）** 的核心目标，就是为了解决这个问题。Vite 会在启动开发服务器之前，智能地找到你项目中的“裸模块导入”（bare module imports，即那些直接从 `node_modules` 导入的依赖），并使用 `esbuild` 将它们打包成一个或少数几个单一的 JavaScript 文件。 

这样一来，当浏览器再次遇到 `import { debounce } from 'lodash-es'` 时，它只需要请求一个预构建好的、单一的 `lodash-es.js` 文件，网络开销从几十上百次锐减到了一次。这就是优化的魔力。

## 二、扫描：Vite 的“侦察兵”

那么，Vite 是如何知道需要预构建哪些依赖的呢？它通过一个**扫描（Scan）**过程来实现。

在启动开发服务器时，Vite 会派出一个“侦察兵”，快速地遍历你的项目源码，找出所有可能成为入口的地方，并分析其中的依赖导入语句。这个过程就像是在为一次大型军事行动绘制地图，标出所有重要的“补给站”（依赖）。

这个扫描过程主要做了以下几件事：

1.  **寻找入口**：默认情况下，Vite 会将你的 `index.html` 作为主要入口。它会解析 HTML，找到所有的 `<script type="module">` 标签，并将它们的 `src` 作为扫描的起点。

2.  **遍历与解析**：从这些入口文件开始，Vite（实际上是内部的 Rollup）会递归地、静态地分析整个项目的导入图。它会跟踪每一个 `import` 语句，但它并**不执行**任何代码。它只关心一件事：你 `import` 了什么。

3.  **识别裸模块**：在遍历过程中，一旦遇到一个“裸模块导入”，比如 `import React from 'react'`，Vite 就会将 `react` 这个依赖记录下来。它会忽略相对路径导入（如 `./utils.js`），因为那些是你自己的项目代码，不需要预构建。

4.  **生成依赖列表**：扫描结束后，Vite 就得到了一份完整的、需要在启动服务器前进行预构建的依赖列表。

## 三、入口分析的实现

Vite 的扫描过程巧妙地复用了 Rollup 的能力。它会创建一个临时的 Rollup 构建实例，但目的不是为了打包输出文件，而是纯粹为了利用 Rollup 强大的静态分析能力来抓取依赖图。

这个过程大致如下（伪代码）：

```javascript
// 伪代码，展示扫描过程的核心思想
import { rollup } from 'rollup';

async function scanDependencies(entryPoints) {
  const discoveredDeps = new Set();

  // 创建一个特殊的 Rollup 插件来捕获依赖
  const scannerPlugin = {
    name: 'vite:dep-scanner',
    resolveId(id, importer) {
      // 如果是一个裸模块导入 (不以 . 或 / 开头)
      if (!id.startsWith('.') && !id.startsWith('/')) {
        discoveredDeps.add(id);
        // 告诉 Rollup 不需要继续处理这个依赖
        return { id, external: true };
      }
    },
  };

  // 使用 Rollup 进行静态分析
  await rollup({
    input: entryPoints,
    plugins: [scannerPlugin],
  });

  return Array.from(discoveredDeps);
}
```

通过这个 `scannerPlugin`，Vite 可以在 Rollup 解析模块 ID 的 `resolveId` 钩子中“拦截”所有的裸模块导入，并将它们收集起来，而 `external: true` 则告诉 Rollup：“这个依赖你不用管了，我已经知道了，不要再深入分析它了”，这极大地加快了扫描速度。

通过“扫描”和“入口分析”，Vite 精准地定位到了需要优化的目标。在下一章，我们将看到 Vite 是如何利用这份“目标清单”，进行实际的“预构建”操作，并如何利用缓存来进一步提升效率的。
