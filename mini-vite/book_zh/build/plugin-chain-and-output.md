# 第 26 章：插件链与产物输出

在上一章，我们了解了 Vite 如何将 Rollup 作为其构建引擎。然而，Vite 的魔力远不止于简单地调用 Rollup。它的真正强大之处，在于其统一的插件系统，以及对 Rollup 输出产物进行精细化后处理的能力。本章，我们将深入这两个方面，揭示 Vite 构建流程中的更多细节。

### 理论：统一插件模型的威力

Vite 最具匠心的设计之一，就是其“一次编写，处处运行”的插件模型。一个 Vite 插件，其钩子（Hooks）可以在开发服务器生命周期的不同阶段被调用，也可以在构建时无缝对接到 Rollup 的插件体系中。

这种统一性带来了巨大的好处：

1.  **生态共享**：为 Vite 编写的插件（例如，处理某种自定义文件类型）无需任何修改，就能同时在开发和生产构建中生效。
2.  **配置简化**：用户不必为开发和构建维护两套独立的插件配置。
3.  **强大的扩展性**：Vite 自身大量的内置功能，如 CSS 处理、`import.meta.glob`、`asset` 导入等，都是通过内部插件实现的。这意味着 Vite 的核心功能遵循着与其外部插件完全相同的机制，保证了系统的一致性和可扩展性。

在 `vite build` 期间，Vite 会遍历用户配置的所有插件，并根据插件钩子的设计，将它们巧妙地包装成一个 Rollup 兼容的插件数组。这个过程被称为“插件链”（Plugin Chain）的构建。

### Vite 源码剖析：`resolvePlugins` 的幕后

Vite 构建插件链的核心逻辑位于 `packages/vite/src/node/plugins/index.ts` 的 `resolvePlugins` 函数中。这个函数负责整合所有需要用到的插件，包括：

*   用户在 `vite.config.js` 中配置的插件。
*   Vite 核心功能的内置插件（如处理 `alias`、`define`、CSS 等）。
*   在特定情况下（如多页面应用模式）需要追加的插件。

```typescript
// packages/vite/src/node/plugins/index.ts

export async function resolvePlugins(
  config: ResolvedConfig,
): Promise<readonly Plugin[]> {
  const { plugins: userPlugins } = config

  // 1. 获取所有内置插件
  const builtInPlugins = getBuiltInPlugins(config)

  // 2. 整合用户插件和内置插件
  const allPlugins = [...userPlugins, ...builtInPlugins]

  // 3. 排序插件
  // 通过 enforce 属性 (pre, default, post) 对插件进行排序
  // 并应用 build-specific 的钩子
  const sortedPlugins = sortUserPlugins(allPlugins)

  // 4. 返回最终的插件链
  return sortedPlugins.map((p) => {
    // ... 适配和转换逻辑
    return p
  })
}
```

这个过程的关键在于**排序**。Vite 插件可以有一个 `enforce` 属性，其值可以是 `'pre'`、`'default'`（默认）或 `'post'`。Vite 会据此将插件分为三组，确保：

*   `'pre'` 插件最先执行，通常用于需要提前处理的场景。
*   `'default'` 插件按常规顺序执行。
*   `'post'` 插件最后执行，通常用于构建优化和产物处理。

这条精心排序和组织的插件链，最终会被原封不动地传递给 Rollup 的 `plugins` 选项，驱动整个构建过程。

### 理论：超越 Rollup 的产物处理

Rollup 的核心职责是打包 JavaScript。然而，一个现代 Web 应用的产物远不止 JS，还包括 CSS、图片、字体、以及最重要的 `index.html`。

Vite 在 Rollup 完成其核心打包任务后，会接管产物（`bundle`），进行一系列重要的后处理步骤：

1.  **CSS 代码分割**：Vite 会分析 Rollup 输出的 JS chunks，找出其中引入的 CSS。如果一个异步加载的 JS chunk 依赖了某些 CSS，Vite 会将这部分 CSS 提取成一个单独的文件。当这个 JS chunk 被加载时，浏览器会自动并行加载对应的 CSS 文件，实现了 CSS 的按需加载。

2.  **HTML 生成与注入**：Vite 将 `index.html` 视为构建的入口和模板。在构建结束后，Vite 会：
    *   解析 `index.html`。
    *   将 Rollup 生成的 JS 和 CSS 文件路径，以 `<script>` 和 `<link>` 标签的形式，自动注入到 HTML 中。
    *   处理预加载（Preload）指令，为关键资源生成 `<link rel="modulepreload">` 标签，优化加载性能。
    *   将最终处理好的 HTML 文件写入 `dist` 目录。

3.  **静态资源处理**：在构建过程中被引用的图片、字体等静态资源，会被拷贝到 `dist/assets` 目录下，并根据其内容生成唯一的哈希文件名，以实现永久缓存。

### mini-vite 实践：构建后的 HTML 处理

让我们通过一个简化的实践，来模拟 Vite 在构建后处理 `index.html` 的过程。

假设我们的 `build.js` 已经成功运行，`dist` 目录中包含了由 Rollup 生成的 `main.js`。

```javascript
// build.js (续)
import { rollup } from 'rollup';
import path from 'path';
import fs from 'fs-extra'; // 使用 fs-extra 方便文件操作

// ... cssPlugin 和 runBuild 函数 ...

async function postProcessHtml(outputDir) {
  console.log('Post-processing HTML...');

  // 1. 读取模板 HTML
  const templateHtmlPath = path.resolve(process.cwd(), 'index.html');
  let html = await fs.readFile(templateHtmlPath, 'utf-8');

  // 2. 找到 Rollup 生成的 JS 文件
  // (在一个真实场景中，这会从 Rollup 的输出 manifest 中获取)
  const outputFiles = await fs.readdir(outputDir);
  const jsFile = outputFiles.find(f => f.endsWith('.js'));

  if (!jsFile) {
    console.error('No JS output file found!');
    return;
  }

  // 3. 创建 script 标签
  const scriptTag = `<script type="module" src="./${jsFile}"></script>`;

  // 4. 将 script 标签注入到 body 的末尾
  html = html.replace(
    '</body>',
    `  ${scriptTag}\n  </body>`
  );

  // 5. 将处理后的 HTML 写入 dist 目录
  const outputHtmlPath = path.resolve(outputDir, 'index.html');
  await fs.writeFile(outputHtmlPath, html);

  console.log('HTML processed successfully!');
}

async function runBuild() {
  // ... (Rollup 构建逻辑) ...
  try {
    const bundle = await rollup(inputOptions);
    await bundle.write(outputOptions);
    await bundle.close();

    // 在 Rollup 完成后，执行我们的后处理步骤
    await postProcessHtml(outputOptions.dir);

    console.log('Build successful!');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

runBuild();
```

在这个例子中，我们添加了一个 `postProcessHtml` 函数：

1.  它在 Rollup 成功写入磁盘**之后**被调用。
2.  它读取项目根目录下的 `index.html` 作为模板。
3.  它在 `dist` 目录中查找由 Rollup 生成的 JavaScript 文件。
4.  它将 JS 文件以 `<script type="module">` 的形式，注入到 HTML 的 `<body>` 标签闭合之前。
5.  最后，它将这个全新的、包含了正确资源引用的 `index.html` 保存到 `dist` 目录中。

这个简单的脚本，浓缩了 Vite 在构建流程中“承上启下”的关键作用：它不仅要精心准备和指挥 Rollup 的工作，还要在 Rollup 完成后，细致地打扫“战场”，将零散的 JS、CSS 和静态资源，与 `index.html` 这条主线完美地缝合在一起，最终交付一个可以直接部署的、优化过的生产应用。