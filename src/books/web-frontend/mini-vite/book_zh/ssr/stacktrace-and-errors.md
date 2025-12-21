# 第 29 章：SSR 堆栈重写与错误处理

在服务器端渲染（SSR）的调试过程中，最令人头疼的问题莫过于一个神秘的错误，它指向一个你从未见过的、经过转换和打包后的文件。你看着终端里天书般的错误堆栈，完全无法定位到它在你的源代码中的真实位置。这就像一个侦探只拿到了一段被加密的线索，案件根本无从查起。

Vite 通过其精妙的 **SSR 错误处理** 和 **堆栈重写（Stacktrace Rewriting）** 机制，彻底解决了这个痛点。它充当了一个“解密器”，能将运行时抛出的错误堆栈“翻译”回开发者熟悉的、未经转换的源代码位置，让 SSR 的调试体验如丝般顺滑。

### 理论：源映射（Source Map）与堆栈重写的魔术

这一切的核心是 **源映射（Source Map）**。源映射是一个 JSON 文件，它记录了转换后代码的每一部分与原始源代码之间的精确对应关系。它就像一本“密码本”，详细记载了加密（转换）过程的每一步。

当 SSR 执行过程中发生错误时，Vite 的错误处理中间件会捕获这个错误。错误对象通常包含一个 `stack` 属性，即错误堆栈字符串。这个堆栈指向的是转换后代码的位置。

Vite 的堆栈重写流程如下：

1.  **捕获错误**：通过一个顶层的 `try...catch` 或中间件来捕获 SSR 执行期间的所有异常。
2.  **解析堆栈**：逐行解析错误堆栈字符串，提取出文件名、行号和列号。
3.  **查找源映射**：对于每一个堆栈帧（stack frame），根据文件名找到对应的模块，并从该模块的转换结果中获取源映射（Source Map）。Vite 在开发模式下通常将源映射以内联（inline）的形式附加在转换后代码的末尾。
4.  **执行映射**：利用 `source-map-js` 这类库，根据堆栈中的行号和列号，在源映射文件中进行反向查找，找到它在原始文件（`.vue`, `.ts`, `.jsx`）中的确切位置。
5.  **重写堆栈**：用查询到的原始位置替换掉堆栈中转换后的位置，生成一个全新的、对开发者友好的错误堆栈。
6.  **美化输出**：将重写后的堆栈以清晰、高亮的形式打印到控制台，并/或通过 WebSocket 发送到浏览器的 Vite 错误浮层（Error Overlay）中，实现双端同步的错误提示。

通过这个过程，开发者看到的不再是 `dist/server.js:1024:15`，而是清晰的 `src/components/MyComponent.vue:10:5`。

### 源码：`ssrFixStacktrace` 的精密操作

Vite 中实现这一功能的核心函数是 `ssrFixStacktrace`，它位于 `packages/vite/src/node/ssr/ssrStacktrace.ts`。让我们看看它的简化逻辑。

```typescript
// packages/vite/src/node/ssr/ssrStacktrace.ts
export function ssrFixStacktrace(e: Error, moduleGraph: ModuleGraph) {
  const stack = e.stack || '';

  // 使用正则表达式解析堆栈行
  const stacktrace = parse(stack);

  const newStack = Promise.all(
    stacktrace.map(async (frame) => {
      const { file, line, column } = frame;
      if (!file || !line || !column) return frame.raw;

      // 1. 根据文件路径找到模块节点
      const mod = moduleGraph.getModuleByUrl(file);
      if (!mod || !mod.transformResult) return frame.raw;

      // 2. 获取模块的源映射
      const sourceMap = mod.transformResult.map;
      if (!sourceMap) return frame.raw;

      // 3. 使用 source-map-js 进行反向查找
      const consumer = await new SourceMapConsumer(sourceMap);
      const originalPos = consumer.originalPositionFor({ line, column });

      if (!originalPos.source) return frame.raw;

      // 4. 格式化成新的堆栈行
      return `at ${frame.method} (${originalPos.source}:${originalPos.line}:${originalPos.column})`;
    })
  ).then((lines) => lines.join('\n'));

  e.stack = newStack;
}
```

这个函数清晰地展示了我们上面描述的理论流程：

-   它接收一个错误对象 `e` 和 `moduleGraph` 作为参数。
-   它遍历错误的每一条堆栈帧。
-   利用 `moduleGraph`，它能迅速找到出错文件对应的模块节点 `mod`。
-   从 `mod.transformResult` 中提取出转换过程中生成的源映射 `map`。
-   `SourceMapConsumer` 是魔法发生的地方，它负责执行反向映射。
-   最后，它将所有重写后的堆栈行重新组合，并更新原始错误对象的 `stack` 属性。

### 实现：为 `mini-vite` 添加基础的错误处理

在我们的 `mini-vite` 中，我们可以通过在 `ssrLoadModule` 外层包裹一个 `try...catch` 来实现一个最基础的错误捕获和堆栈重写逻辑。我们将模拟这个过程，但不会引入完整的源映射库，而是聚焦于展示其核心思想。

```javascript
// mini-vite/ssr.js (扩展)

// ... 此前 ssrLoadModule 的代码 ...

// 模拟的源映射查找
// 在真实场景中，这会从模块的 transformResult 中获取
const sourceMaps = new Map(); 

async function applyPlugins(code, path) {
  const result = await transformWithEsbuild(code, path, {
    target: 'node16',
    format: 'esm',
    sourcemap: 'inline', // 关键：让 esbuild 生成源映射
  });
  // 简单模拟：存储源映射
  sourceMaps.set(path, result.map);
  return result.code;
}

// 简化的堆栈修复函数
function fixStacktrace(error, filePath) {
  const stack = error.stack.split('\n');
  const newStack = stack.map(line => {
    // 这是一个非常简化的演示
    // 真实实现需要解析行号列号并使用 source-map-js
    if (line.includes(filePath)) {
      return line.replace(filePath, `[original source for] ${filePath}`);
    }
    return line;
  });
  error.stack = newStack.join('\n');
}

// 更新 ssrLoadModule 以包含错误处理
export async function ssrLoadModule(url, serverContext) {
  const filePath = path.resolve(process.cwd(), url.slice(1));

  try {
    // ... (加载、转换、执行的逻辑不变)
  } catch (e) {
    // 捕获到错误，进行堆栈重写
    fixStacktrace(e, filePath);
    console.error(`[mini-vite] Failed to SSR load module: ${url}`);
    console.error(e.stack);
    // 不再向上抛出，而是优雅地处理
  }
}
```

在这个增强版中：

1.  我们在 `applyPlugins` 中配置 `sourcemap: 'inline'`，让 esbuild 为我们生成源映射。
2.  我们创建了一个 `fixStacktrace` 函数，虽然它只是一个简单的字符串替换，但它准确地表达了堆栈重写的核心意图：**将转换后的路径替换回对开发者有意义的原始路径**。
3.  `ssrLoadModule` 中的 `catch` 块现在会调用 `fixStacktrace`，然后将美化后的错误堆栈打印到控制台。

### 总结

如果说 `ssrLoadModule` 是 Vite SSR 的引擎，那么 `ssrFixStacktrace` 就是这个引擎的“仪表盘”和“诊断系统”。没有它，引擎一旦出故障，我们就只能束手无策。有了它，我们就能获得清晰、准确的故障报告，从而快速定位并修复问题。

通过将源映射技术与集中的错误处理中间件相结合，Vite 极大地改善了 SSR 的开发体验，使其不再是一项令人望而生畏的调试噩梦。这是 Vite “以开发者为中心”设计哲学的又一个完美体现。