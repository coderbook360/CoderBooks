# 14. 预构建与缓存目录

在上一章，我们像一位侦察兵，通过静态分析扫描出了项目中所有需要被优化的裸模块依赖，并拿到了一份清晰的“目标清单”。现在，是时候让“重装部队”——预构建流程——登场了。

这个过程的核心目标非常明确：将上一阶段发现的几十甚至上百个零散的第三方库（比如 `react`, `lodash`, `dayjs` 等），打包成少数几个高度优化的 JavaScript 文件。

## 14.1. 为什么需要“预构建”？

你可能会问，既然浏览器已经原生支持 ES Module，我们为什么还要多此一举去“预构建”这些依赖呢？这主要有两个原因：

1.  **解决性能瓶颈**：想象一下，一个像 `lodash-es` 这样的库，内部可能包含了数百个独立的模块文件。如果你在代码中只用到了 `debounce` 这一个函数，浏览器在加载时，会发起一个 `import { debounce } from 'lodash-es'` 的请求。服务器首先返回 `lodash-es` 的入口文件，然后浏览器解析它，发现它又 `export * from './utils/debounce.js'`，于是再发起对 `debounce.js` 的请求... 如此往复，形成一个巨大的“请求瀑布流”。一个大型项目可能有成百上千个这样的依赖，开发服务器在启动时会面临数千个并发请求的压力，导致页面加载极其缓慢，甚至可能使浏览器崩溃。预构建将这些零散的模块打包成一个或少数几个文件，将成百上千次 HTTP 请求压缩为一两次，从根本上解决了这个问题。

2.  **统一模块格式 (CJS to ESM)**：尽管 ESM 已成为标准，但许多历史悠久的库仍然以 CommonJS (CJS) 格式发布。浏览器是无法直接理解 `require()` 和 `module.exports` 的。预构建流程会借助 esbuild 的力量，将这些 CJS 模块智能地转换为与浏览器兼容的 ESM 格式，让你可以在代码中无缝地使用 `import` 语法。

这个过程，就好比你要做一顿丰盛的大餐（运行你的应用）。你可以等到开饭时，才开始逐一去菜市场买菜、洗菜、切菜（浏览器按需请求原生 ESM 模块），这样做虽然灵活，但效率极低。而预构建，则像是提前进行的“备菜”（Mise en Place）。你提前把所有需要的食材（第三方依赖）都买好、处理好、打包好（用 esbuild 打包成单个文件），等到真正做饭时，直接取用即可，速度自然飞快。

## 14.2. Vite 的预构建流程

Vite 的预构建大本营位于 `packages/vite/src/node/optimizer/index.ts`。其核心是 `runOptimize` 函数，它 orchestrates 整个流程。

整个流程可以简化为以下几个步骤：

1.  **收集依赖**：首先，它会执行我们在上一章讨论过的 `scan` 过程，得到所有需要预构建的依赖 `deps`。
2.  **调用 esbuild**：然后，Vite 将这份依赖列表作为入口（`entryPoints`），直接传递给 esbuild。esbuild 是一个用 Go 编写的极速打包工具，它会从这些入口出发，抓取所有相关的代码，将它们打包、转换，并输出到指定的目录。
3.  **生成元数据**：打包完成后，Vite 会在缓存目录中生成一个 `_metadata.json` 文件。这个文件至关重要，它记录了本次预构建的所有信息，包括每个依赖被打包后的出口路径、以及原始的 `package.json` 中的 `hash` 值等。这个 `hash` 是实现智能缓存的关键。

让我们看一段 `runOptimize` 内部的简化版伪代码，来理解其核心逻辑：

```javascript
// packages/vite/src/node/optimizer/index.ts (简化版)

async function runOptimize(config, deps) {
  const cacheDir = config.optimizerCacheDir; // 通常是 node_modules/.vite

  // 1. 定义 esbuild 构建上下文
  const context = await esbuild.context({
    entryPoints: Object.keys(deps), // ['react', 'react-dom', ...]
    bundle: true,
    format: 'esm',
    splitting: true, // 允许代码分割，优化产物
    outdir: cacheDir, // 输出到缓存目录
    // ... 其他 esbuild 配置
  });

  // 2. 执行构建
  await context.rebuild();

  // 3. 生成元数据文件
  const metadata = {
    hash: getDepHash(config), // 根据 lockfile, package.json 等生成哈希
    optimized: {},
  };

  for (const dep in deps) {
    metadata.optimized[dep] = {
      file: path.resolve(cacheDir, dep + '.js'), // 记录打包后的文件路径
      src: deps[dep], // 记录原始文件路径
    };
  }

  // 将 metadata 写入 _metadata.json
  await fs.writeFile(
    path.join(cacheDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
}
```

## 14.3. 智能的缓存策略

预构建虽然快，但如果每次启动服务器都重新构建一次，那也相当耗时。Vite 的聪明之处在于其“非必要，勿重复”的缓存策略。

Vite 如何判断是否需要重新构建呢？答案就在 `_metadata.json` 文件和一系列的依赖描述文件中。

当你启动 `vite` 时，它会执行以下检查：

1.  **计算新的依赖哈希 (Dep Hash)**：Vite 会根据当前项目的 `package-lock.json`、`yarn.lock` 或 `pnpm-lock.yaml` 文件的内容，结合 `vite.config.js` 中与依赖优化相关的配置，计算出一个全新的哈希值。
2.  **对比哈希值**：它会读取 `node_modules/.vite/_metadata.json` 文件中存储的旧 `hash` 值。
3.  **决策**：
    *   如果新旧哈希值**一致**，并且 `_metadata.json` 文件存在，Vite 会得出结论：依赖没有发生任何变化。于是它会完全跳过预构建过程，直接使用缓存目录中的文件。这使得后续的冷启动速度极快，几乎是瞬时的。
    *   如果哈希值**不一致**（比如你 `npm install` 了一个新包，或者升级/删除了一个旧包），或者缓存目录不存在，Vite 就会认为缓存已“失效”，从而触发一次全新的 `runOptimize` 预构建流程。

这种基于哈希的缓存机制，确保了只有在依赖真正发生变化时，才会执行耗时的预构建操作，极大地提升了日常开发的效率。

## 14.4. mini-vite 的实现

现在，让我们在 `mini-vite` 中实现一个简化版的预构建与缓存功能。我们将创建一个 `preBundle` 函数，它接收依赖列表，并使用 esbuild 进行打包。

```javascript
// src/optimizer.js

import { build } from 'esbuild';
import path from 'path';
import { promises as fs } from 'fs';

/**
 * 执行预构建
 * @param {string[]} deps - 需要预构建的依赖列表
 * @param {object} config - 项目配置
 */
export async function preBundle(deps, config) {
  const cacheDir = config.cacheDir; // e.g., 'g:/projects/io-books/CoderBooks/mini-vite/node_modules/.mini-vite'
  const metadataPath = path.join(cacheDir, '_metadata.json');

  // 1. 检查缓存是否有效 (简化版：仅检查 metadata 文件是否存在)
  try {
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    // 在一个完整的实现中，这里应该有哈希比较
    console.log('缓存有效，跳过预构建。');
    return;
  } catch (e) {
    // 缓存不存在或无效，继续执行
  }

  // 2. 执行 esbuild 打包
  await build({
    entryPoints: deps,
    bundle: true,
    format: 'esm',
    splitting: true,
    outdir: cacheDir,
    write: true, // 确保产物写入磁盘
  });

  // 3. 创建并写入元数据
  const metadata = {
    // 简化版：用时间戳作为哈希
    hash: Date.now().toString(),
    dependencies: deps,
  };

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify(metadata));

  console.log('预构建完成，并已生成缓存。');
}
```

在这个简化版中，我们省略了复杂的哈希计算，仅通过检查 `_metadata.json` 是否存在来判断缓存有效性。但在实际场景中，一个可靠的哈希是必不可少的。

通过本章的学习，我们不仅理解了 Vite 依赖优化的“第二阶段”——预构建，还亲手实现了一个迷你版。现在，我们的 `mini-vite` 已经具备了处理复杂依赖、提升加载性能的核心能力。

在下一章，我们将探讨预构建中的一些高级优化策略和边界情况，让你的知识体系更加完善。
