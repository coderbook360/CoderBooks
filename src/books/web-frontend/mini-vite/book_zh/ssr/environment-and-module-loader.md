# 第 28 章：SSR 环境与模块加载

从客户端渲染（CSR）到服务器端渲染（SSR），我们跨越的不仅仅是代码的执行位置，更是从一个“温室”环境（浏览器）到一个“野生”环境（Node.js）的巨大转变。在浏览器中，我们有 `window`、`document` 等全局 API，模块系统由浏览器原生支持。但在 Node.js 中，这些 API 都消失了，取而代之的是 `global`、`process` 和 CommonJS/ESM 的混合环境。

Vite 的 SSR 引擎巧妙地解决了这一核心矛盾。它并非简单地在 Node.js 中执行源码，而是构建了一个“模拟浏览器”的执行环境，让大部分为浏览器编写的代码无需修改或只需少量修改，就能在服务器端运行。

本章，我们将深入 Vite SSR 的心脏，探索它是如何加载、转换并执行模块的。

### 理论：在 Node.js 中“伪造”一个浏览器环境

想象一下，你要让一位只懂英语的演员（你的组件代码）去一个只讲法语的剧院（Node.js 环境）表演。直接把他推上台，结果必然是灾难性的。你需要一个“同声传译系统”，在演员说出英语台词时，立刻将其翻译成法语播放给观众。

Vite 的 SSR 引擎就是这个“同声传译系统”。它的核心职责是：

1.  **按需加载模块**：与客户端一样，服务器也只加载当前渲染路径上必需的模块。
2.  **执行转换**：利用 Vite 强大的插件系统，对加载的模块源码进行“SSR 转换”（SSR Transform）。这是关键一步，它会处理环境差异，例如将 `import.meta.env` 替换为服务器端的值，处理 CSS 和静态资源导入等。
3.  **隔离执行**：在 Node.js 中创建一个隔离的执行上下文，避免不同请求之间的状态污染。
4.  **提供外部化（Externals）能力**：对于纯粹的 Node.js 依赖（如 `fs`、`path`），无需转换和打包，直接通过 Node.js 的 `require` 或 `import` 加载。这被称为“外部化”。

这个过程的核心入口点是 `vite.ssrLoadModule()` 函数。它就像是 SSR 世界的 `import()`，但背后隐藏着整个 Vite 的转换和执行引擎。

### 源码：`ssrLoadModule` 的执行之旅

Vite 的 SSR 模块加载器位于 `packages/vite/src/node/ssr/ssrModuleLoader.ts`。让我们聚焦于 `ssrLoadModule` 的简化流程，看看它是如何工作的。

```typescript
// packages/vite/src/node/server/index.ts
async function ssrLoadModule(
  url: string,
  server: ViteDevServer,
  options?: { fixStacktrace?: boolean }
): Promise<Record<string, any>> {
  // 1. 获取模块图
  const { moduleGraph } = server;

  // 2. 获取或创建模块节点
  const mod = await moduleGraph.ensureEntryFromUrl(url, true);

  // 3. 检查缓存
  if (mod.ssrModule) {
    return mod.ssrModule;
  }

  // 4. 执行模块并处理依赖
  const ssrModule = await server.ssrRunner.run(mod);

  // 5. 缓存结果
  mod.ssrModule = ssrModule;
  return ssrModule;
}
```

这个过程与客户端的模块请求非常相似，但关键的区别在于 `server.ssrRunner.run(mod)` 这一步。`ssrRunner` 才是真正的执行者。在内部，它会：

1.  **获取转换后的代码**：调用 `transformRequest` 获取模块的 SSR 转换结果。
2.  **实例化模块**：使用 Node.js 的 `vm` 模块或等效技术，在一个受控的环境中执行转换后的代码。这可以防止模块内的顶层 `var` 变量泄漏到全局作用域。
3.  **处理依赖**：在执行模块代码时，如果遇到 `import` 语句，它会递归调用 `ssrLoadModule` 来加载和执行依赖项。
4.  **返回模块导出**：执行完毕后，`ssrRunner` 会捕获模块的 `exports` 对象并返回。

Vite 通过这种方式，将 Vite 的插件转换能力与 Node.js 的执行环境无缝结合，创造了一个功能完备的服务器端模块加载器。

### 实现：`mini-vite` 的 `ssrLoadModule`

现在，让我们在 `mini-vite` 中实现一个极简版的 `ssrLoadModule`。我们将跳过复杂的缓存和依赖图，聚焦于核心的“转换-执行”流程。

我们将使用 Node.js 内置的 `vm` 模块来创建一个安全的执行沙箱。

```javascript
// mini-vite/ssr.js
import fs from 'fs/promises';
import { transformWithEsbuild } from 'vite'; // 借用 Vite 的 esbuild 转换能力
import vm from 'vm';

// 模拟的 Vite 插件容器（仅用于演示）
async function applyPlugins(code, path) {
  // 在真实 Vite 中，这里会执行一个复杂的插件钩子链
  // 为了简化，我们直接使用 esbuild 进行基础转换
  const result = await transformWithEsbuild(code, path, {
    target: 'node16',
    format: 'esm',
  });
  return result.code;
}

// 极简的 ssrLoadModule 实现
export async function ssrLoadModule(url, serverContext) {
  const filePath = path.resolve(process.cwd(), url.slice(1)); // 简化路径解析

  try {
    const source = await fs.readFile(filePath, 'utf-8');

    // 1. 应用转换
    const transformedSource = await applyPlugins(source, filePath);

    // 2. 创建一个隔离的执行上下文
    const context = {
      module: { exports: {} },
      exports: {},
      __dirname: path.dirname(filePath),
      __filename: filePath,
    };
    
    const script = new vm.Script(transformedSource);
    
    // 3. 在沙箱中执行代码
    script.runInNewContext(context);

    // 4. 返回模块的导出
    return context.module.exports;

  } catch (e) {
    console.error(`[mini-vite] Failed to SSR load module: ${url}`, e);
    throw e;
  }
}
```

在这个简化版中：

1.  我们直接读取文件系统中的源文件。
2.  我们借用了 Vite 自身的 `transformWithEsbuild` 来模拟插件转换过程，确保代码是有效的 ESM 格式。
3.  我们使用 `vm.Script` 和 `runInNewContext` 创建了一个干净的沙箱。`context` 对象模拟了 Node.js 模块中的一些常见全局变量，如 `module` 和 `exports`。
4.  执行后，我们从沙箱的 `context.module.exports` 中提取出模块的导出并返回。

这个实现虽然简单，但它抓住了 Vite SSR 模块加载的精髓：**加载、转换、隔离执行**。正是这个流程，使得 Vite 能够驾驭在 Node.js 环境中运行前端代码的复杂性。

### 总结

Vite 的 SSR 引擎是一项精妙的设计。它没有重新发明轮子，而是巧妙地将 Vite 强大的插件转换生态与 Node.js 的原生模块系统结合起来。通过 `ssrLoadModule` 这个统一入口，Vite 在服务器端复刻了其在客户端的核心优势：按需加载和即时转换。

理解了 `ssrLoadModule` 的工作原理，我们就掌握了解锁 Vite SSR强大能力的第一把钥匙。在接下来的章节中，我们将看到这个基础之上如何构建起更复杂的 SSR 功能，如错误处理和清单生成。