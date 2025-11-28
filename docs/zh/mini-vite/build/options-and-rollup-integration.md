# 第 25 章：构建选项与 Rollup 集成

如果说开发服务器是 Vite 的“闪电战”，那么生产环境构建（Build）就是它的“正规战”。在这一环节，Vite 选择了业界公认的、以生成代码质量高而著称的打包工具——Rollup——作为其底层构建引擎。Vite 的角色，从一个原生 ESM 服务的提供者，转变为一个高度智能的 Rollup 配置生成器和任务协调器。

本章，我们将深入探讨 Vite 是如何与 Rollup 这位“巨人”并肩作战的。

### 理论：为何选择 Rollup？

Vite 选择 Rollup 而不是其他打包工具（如 Webpack），主要基于以下几点考量：

1.  **ESM 优先**：Rollup 从诞生之初就是为 ES Module 设计的。它的静态分析能力非常强，能够很好地理解模块间的导入导出关系，这与 Vite 的核心理念不谋而合。

2.  **Tree-shaking**：Rollup 是 Tree-shaking 技术的先驱和最佳实践者。它可以在打包时静态分析代码，精确地移除所有未被使用的代码（dead-code），从而生成体积最小、最高效的产物。这对于现代前端应用至关重要。

3.  **简洁的插件 API**：Rollup 的插件 API 设计得非常清晰和灵活，与 Vite 统一开发和构建的插件体系能够完美兼容。Vite 插件在开发时服务于 `koa` 中间件，在构建时则能无缝转换为 Rollup 插件。

4.  **输出格式多样**：Rollup 支持多种输出格式（如 `es`、`cjs`、`umd` 等），能够满足不同的部署需求。

Vite 的构建过程，本质上就是调用 Rollup 的 JavaScript API 来完成打包。Vite 的 `build` 命令，其核心任务就是准备一份庞大而精细的 Rollup 配置对象，然后将其传递给 Rollup。

### Vite 源码剖析：`build` 命令的背后

Vite 的构建逻辑主要始于 `packages/vite/src/node/build.ts` 文件中的 `build` 函数。这个函数是 `vite build` 命令的入口点。

```typescript
// packages/vite/src/node/build.ts

export async function build(inlineConfig: InlineConfig = {}): Promise<RollupOutput | RollupOutput[]> {
  // 1. 解析合并配置
  const config = await resolveConfig(inlineConfig, 'build', 'production')

  // 2. 准备 Rollup 插件
  const plugins = await resolvePlugins(config)

  // 3. 生成 Rollup 输入选项 (InputOptions)
  const rollupOptions: RollupOptions = {
    input: resolveBuildInput(config.build.rollupOptions, config.build.lib),
    plugins,
    // ... 其他大量从 Vite 配置转换来的选项
  }

  // 4. 调用 Rollup 的 JavaScript API
  const bundle = await rollup(rollupOptions)

  // 5. 生成产物
  const { output } = config.build
  await bundle.write(output)

  // 6. 关闭 bundle
  await bundle.close()
}
```

这个过程可以概括为：

1.  **解析配置**：`resolveConfig` 函数会加载 `vite.config.js`，并将其与命令行参数、默认配置进行合并，形成最终的 `ResolvedConfig` 对象。

2.  **转换插件**：Vite 的插件是统一的，但 Rollup 只认识 Rollup 插件。因此，Vite 会遍历所有插件，将它们适配成 Rollup 插件的格式。

3.  **构建 Rollup 选项**：这是最核心的一步。Vite 会创建一个巨大的 `RollupOptions` 对象。其中：
    *   `input`：根据 `build.rollupOptions.input` 或 `build.lib` 配置，确定打包的入口点（通常是 `index.html`）。
    *   `plugins`：传入转换后的插件数组。
    *   其他大量选项：如 `output`、`external`、`onwarn` 等，都从 Vite 的 `config.build` 对象中精心映射而来。例如，Vite 的 `build.outDir` 会被转换为 Rollup 的 `output.dir`。

4.  **执行 Rollup**：调用 `rollup()` 函数，传入配置，启动打包过程。Rollup 会在内存中完成所有的模块解析、转换、Tree-shaking 和代码生成。

5.  **写入磁盘**：调用 `bundle.write()`，将内存中的构建产物写入到 `dist` 目录。

### mini-vite 实践：实现一个 `build` 命令

现在，让我们为 `mini-vite` 实现一个最基础的 `build` 命令。我们将直接使用 `rollup` 的 JS API，并手动创建一个简单的配置。

首先，确保你已经安装了 `rollup`：

```bash
npm install rollup -D
```

然后，我们可以创建一个 `build.js` 文件来存放构建逻辑。

```javascript
// build.js
import { rollup } from 'rollup';
import path from 'path';

// 一个模拟 Vite 插件的 Rollup 插件
// 它简单地将 .css 文件内容打印出来，并返回空 JS
function cssPlugin() {
  return {
    name: 'mini-vite:css',
    transform(code, id) {
      if (id.endsWith('.css')) {
        console.log(`[CSS Content]: ${code}`);
        return 'export default ""' // 将 CSS 模块转换为空 JS 模块
      }
      return null;
    }
  };
}

async function runBuild() {
  console.log('Starting mini-vite build...');

  // 1. 定义 Rollup 输入选项
  const inputOptions = {
    input: path.resolve(process.cwd(), 'src/main.js'), // 入口文件
    plugins: [
      cssPlugin() // 使用我们的“CSS插件”
    ],
    external: [] // 假设没有外部依赖
  };

  // 2. 定义 Rollup 输出选项
  const outputOptions = {
    dir: path.resolve(process.cwd(), 'dist'), // 输出目录
    format: 'es', // 输出为 ES Module
    sourcemap: true
  };

  try {
    // 3. 调用 Rollup API
    const bundle = await rollup(inputOptions);

    console.log('Bundle created. Writing to disk...');

    // 4. 写入产物
    await bundle.write(outputOptions);

    console.log('Build successful!');

    // 5. 关闭 bundle
    await bundle.close();

  } catch (error) {
    console.error('Build failed:', error);
  }
}

runBuild();
```

在这个简化版的 `build.js` 中：

*   我们定义了一个 `cssPlugin`，它模拟了 Vite 处理 CSS 的行为：在构建时捕获 CSS 内容（这里只是打印），并将其转换成一个空的 JS 模块，以避免 Rollup 因无法处理非 JS 文件而报错。
*   我们手动创建了 `inputOptions` 和 `outputOptions`，这正是 Vite 在背后为我们做的事情。
*   我们调用 `rollup()` 和 `bundle.write()`，完整地走了一遍 Rollup 的构建流程。

要运行它，你可以在 `package.json` 中添加一个脚本：

```json
"scripts": {
  "dev": "node server.js",
  "build": "node build.js"
}
```

然后执行 `npm run build`。你会看到 Rollup 成功打包了 `src/main.js`，处理了其中的 CSS 导入，并将最终的 JS 文件输出到了 `dist` 目录。

这便是 Vite 与 Rollup 集成的核心思想：Vite 负责将自己灵活的配置和强大的插件生态系统，精准地翻译成 Rollup 能够理解的语言，然后放手让这位打包大师去完成最擅长的工作。