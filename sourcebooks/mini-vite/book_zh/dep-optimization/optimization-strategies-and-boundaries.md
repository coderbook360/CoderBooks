# 15. 优化策略与边界

我们已经了解了 Vite 依赖优化中“扫描”和“预构建”这两个自动化核心流程。这套组合拳在大多数情况下都能完美运作，但真实的开发场景远比理想状态复杂。有时，Vite 的自动化扫描程序会“看走眼”，或者我们有特殊的优化需求。

这时，我们就需要扮演“特种兵”的角色，利用 `vite.config.js` 中的 `optimizeDeps` 选项，对优化行为进行精准的手动干预。本章将带你深入了解两个最关键的配置项：`include` 和 `exclude`。

## 15.1. `optimizeDeps.include`：强制纳入

`optimizeDeps.include` 的作用是**强制**将某个依赖纳入预构建的范围，即使 Vite 的扫描器没有自动发现它。

你可能会好奇，什么情况下扫描器会“失手”呢？最常见的情况就是**动态导入 (Dynamic Imports)**。

思考以下代码：

```javascript
// src/components/SpecialButton.js

function loadSpecialLibrary() {
  const libName = 'my-special-lib';
  // 扫描器无法在构建时确定 libName 的具体值
  import(libName).then(module => {
    module.default.run();
  });
}
```

Vite 的依赖扫描是基于静态分析的。它会解析 `import` 和 `export` 语句，但它不会执行你的代码。在上面的例子中，`import()` 的参数是一个变量 `libName`。扫描器无法在不运行代码的情况下，预知这个变量的值是什么，因此它会直接跳过 `my-special-lib` 这个依赖。其结果是，`my-special-lib` 不会被预构建。

当浏览器执行到这段代码时，它会发起一个对 `/my-special-lib` 的请求。由于没有预构建，开发服务器会尝试在 `node_modules` 中实时转换它，这不仅会触发新的请求瀑布流，还可能因为模块格式问题（如 CJS）而直接失败。

为了解决这个问题，我们可以使用 `include` 明确地告诉 Vite：“嘿，请务必把 `my-special-lib` 也加入到预构建的大家庭里。”

```javascript
// vite.config.js

export default {
  optimizeDeps: {
    include: ['my-special-lib'],
  },
};
```

添加这个配置后，Vite 在执行 `scan` 阶段时，会直接将 `my-special-lib` 添加到依赖列表中，确保它被 esbuild 正确地预构建和缓存。这样，当浏览器请求它时，就能得到一个优化好的、随时可用的 ESM 模块。

`include` 就像是给扫描器一份“特殊关注名单”，确保任何隐藏在动态逻辑深处的依赖都不会被遗漏。

## 15.2. `optimizeDeps.exclude`：强制排除

与 `include` 相反，`optimizeDeps.exclude` 的作用是**强制**将某个依赖从预构建的范围中**排除**。

这个选项的使用场景相对较少，但同样重要。通常在以下情况会用到它：

1.  **避免重复处理**：假设你的项目中有一个本地的 monorepo 包（比如 `packages/my-local-lib`），你通过文件路径（`file:...`）或工作区（workspaces）引入它。这个包可能已经被你的构建流程（如 TypeScript 编译）处理过，并且你希望在开发时直接使用它的源码，以便享受到实时的热更新。如果 Vite 仍然对它进行预构建，不仅会减慢启动速度，还会切断它与源文件的直接联系，导致热更新失效。

2.  **处理有问题的依赖**：极少数情况下，某个第三方依赖的内部结构非常特殊，esbuild 在处理它时可能会出错。此时，你可以暂时将其 `exclude`，让浏览器直接请求原始模块，绕过预构建的环节。（当然，这可能会引入 CJS/ESM 的兼容性问题，需要谨慎使用）。

```javascript
// vite.config.js

export default {
  optimizeDeps: {
    exclude: ['my-local-lib'],
  },
};
```

`exclude` 就像是给预构建流程一份“豁免名单”，告诉它：“这些依赖情况特殊，请不要动它们，让它们保持原样。”

## 15.3. mini-vite 的实现

让我们将 `include` 和 `exclude` 的逻辑融入到 `mini-vite` 的依赖扫描流程中。我们需要修改 `scanDependencies` 函数，让它在返回最终依赖列表之前，应用这些手动配置。

```javascript
// src/optimizer.js (更新 scanDependencies)

import { rollup } from 'rollup';

/**
 * 扫描依赖，并应用 include/exclude 策略
 * @param {object} config - 项目配置
 */
export async function scanDependencies(config) {
  const discoveredDeps = new Set();

  const scannerPlugin = {
    name: 'mini-vite:dep-scanner',
    resolveId(id, importer) {
      if (id.startsWith('.') || id.startsWith('/')) {
        return null; // 忽略相对路径和绝对路径
      }
      // 发现裸模块
      discoveredDeps.add(id);
      return { id, external: true }; // 标记为外部依赖，rollup 不会尝试打包它
    },
  };

  await rollup({
    input: config.entries, // ['./index.html']
    plugins: [scannerPlugin],
  });

  // 1. 应用 include 配置
  const include = config.optimizeDeps?.include || [];
  include.forEach(dep => discoveredDeps.add(dep));

  // 2. 应用 exclude 配置
  const exclude = config.optimizeDeps?.exclude || [];
  exclude.forEach(dep => discoveredDeps.delete(dep));

  return Array.from(discoveredDeps);
}
```

在这个更新后的 `scanDependencies` 函数中，我们增加了两个关键步骤：

1.  在扫描结束后，我们首先通过 `Set.add()` 将 `include` 数组中的所有依赖项强制添加进 `discoveredDeps` 集合。由于 `Set` 的特性，如果依赖已经存在，也不会重复添加。
2.  接着，我们通过 `Set.delete()` 将 `exclude` 数组中的所有依赖项从集合中移除。

这样，函数最终返回的依赖列表，就是经过自动化扫描和手动干预双重确认后的最终结果，确保了依赖优化过程的灵活性和准确性。

通过本章的学习，我们掌握了精细化调校 Vite 依赖优化的能力。无论是处理难以捉摸的动态导入，还是保护需要“特殊照顾”的本地包，我们都能游刃有余。这标志着我们对 Vite 核心原理的理解又迈进了一大步。
