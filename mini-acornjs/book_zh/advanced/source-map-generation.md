# 38. 源码映射：实现 Source Map 生成

在现代前端开发中，我们编写的代码很少直接在浏览器中运行。它们通常会经过 Babel 的转换、Webpack 的打包、Terser 的压缩。这个过程虽然优化了性能，但也带来了一个巨大的问题：当转换后的代码出错时，浏览器显示的错误堆栈指向的是天书般的机器码，我们几乎无法凭此定位到原始的、人类可读的源代码。

**Source Map** 就是为了解决这个问题而诞生的。它是一个独立的 JSON 文件，像一座桥梁，精确地连接了“转换后的代码”和“原始的源代码”中每一处的位置关系。有了它，浏览器的开发者工具就能够奇迹般地将错误位置、断点和 `console.log` 的来源，从压缩代码反向映射回我们熟悉的源码，极大地提升了调试体验。

本章，我们将学习 Source Map 的工作原理，并为我们的 `mini-acorn` 工具链添加生成 Source Map 的能力。

## Source Map V3 规范简介

目前通用的 Source Map V3 规范定义了一个 JSON 文件，其核心字段如下：

-   `version`: 版本号，固定为 `3`。
-   `file`: 转换后文件的名称。
-   `sources`: 一个数组，包含了所有原始文件的路径。
-   `sourcesContent`: 一个数组，包含了所有原始文件的内容（可选，但强烈推荐，这样 Source Map 就可以独立于原始文件存在）。
-   `names`: 一个数组，包含了代码中用到的所有变量名和属性名，供 `mappings` 字段引用。
-   `mappings`: **最核心的字段**。这是一个经过 Base64 VLQ 编码的超长字符串，它以一种极其紧凑的方式，存储了从生成代码到原始代码的每一个位置映射点。

### `mappings` 的奥秘：VLQ 编码

`mappings` 字符串看起来像一堆乱码，但它内部是有结构的。它由分号 `;` 分隔每一行，由逗号 `,` 分隔每一行的映射段。每个映射段通常由 1、4 或 5 个可变长度的数字（VLQ）组成，分别代表：

1.  生成代码的列号（相对于前一个映射点的差值）。
2.  `sources` 数组中源文件的索引。
3.  原始代码的行号。
4.  原始代码的列号。
5.  （可选）`names` 数组中标识符的索引。

**我们不需要手动实现 VLQ 编码/解码**。理解它的核心思想即可：它是一种对整数进行紧凑编码的方式，尤其擅长编码大量的小整数（位置差值通常很小），从而极大地压缩了 Source Map 的体积。我们将使用现成的库来处理这些复杂的细节。

## 生成 Source Map 的流程

生成 Source Map 的过程，是在我们上一章实现的**代码生成器**的基础上进行的扩展。我们需要在“打印”每个 AST 节点的同时，记录下“生成位置”与“原始位置”的对应关系。

我们将使用 Mozilla 开发的 `source-map` 库，它是处理 Source Map 的事实标准。

```bash
npm install source-map
```

生成流程如下：

1.  **初始化 `SourceMapGenerator`**: 在开始代码生成之前，创建一个 `SourceMapGenerator` 的实例。
2.  **改造 `generate` 函数**: 修改我们的 `generate` 函数，使其在递归生成代码时，能够追踪当前在生成文件中的行号和列号。
3.  **添加映射点**: 在为每个有意义的 AST 节点（特别是 `Identifier`、`Literal` 等叶子节点）生成代码时，调用 `generator.addMapping()` 方法，将生成位置、原始位置（从节点的 `loc` 属性获取）、源文件和（可选的）名称信息传递给它。
4.  **获取结果**: 代码生成结束后，调用 `generator.toString()` 得到 Source Map 的 JSON 字符串。

### 改造代码生成器

让我们来改造上一章的 `generate` 函数。我们需要一个“状态”对象来贯穿整个生成过程，追踪当前位置。

```javascript
// ast-manipulation/generator-with-sourcemap.js

import { SourceMapGenerator } from 'source-map';

function generate(node, sourceFileName, sourceCode) {
  const generator = new SourceMapGenerator({ file: 'output.js' });
  generator.setSourceContent(sourceFileName, sourceCode);

  let code = '';
  let currentLine = 1;
  let currentColumn = 0;

  function walk(node) {
    // ... 根据 node.type 调用不同的生成函数
    // 并在生成代码的同时，更新 code, currentLine, currentColumn
    // 以及调用 generator.addMapping
  }

  function generateIdentifier(node) {
    generator.addMapping({
      generated: { line: currentLine, column: currentColumn },
      original: node.loc.start,
      source: sourceFileName,
      name: node.name
    });
    const generatedName = node.name;
    code += generatedName;
    currentColumn += generatedName.length;
  }

  // ... 其他节点的生成函数

  walk(node);

  return {
    code: code,
    map: generator.toString()
  };
}
```

> 上述代码是一个示意。一个真正的实现会更复杂，需要精确地计算每个 token 后的行列位置。像 `babel-generator` 或 `escodegen` 这样的库已经为我们完美地处理了这些细节。

### 端到端示例

让我们看看一个完整的流程是什么样的。

```javascript
import { parse } from '../src/parser';
import { generate } from './generator-with-sourcemap'; // 假设我们实现了它

const sourceCode = 'const answer = 42;';
const sourceFileName = 'input.js';

// 1. 解析，获取带位置信息的 AST
const ast = parse(sourceCode, { locations: true });

// 2. 生成代码和 Source Map
const { code, map } = generate(ast, sourceFileName, sourceCode);

// 3. 将 Source Map 内联到生成的文件中（常见做法）
const generatedCodeWithMap = 
  code + '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + Buffer.from(map).toString('base64');

console.log(generatedCodeWithMap);
// fs.writeFileSync('output.js', generatedCodeWithMap);
```

将 `generatedCodeWithMap` 保存为 `output.js` 并用 Node.js 执行。如果在其中引入一个错误（例如，访问一个不存在的属性），你会发现错误堆栈指向的将是 `input.js` 的位置，而不是 `output.js`！

## 总结

在本章，我们揭开了 Source Map 的神秘面纱，它是连接开发时代码和运行时代码的关键桥梁。我们学习了：

-   Source Map 的核心作用是解决代码转换后的调试难题。
-   Source Map V3 的 JSON 结构，以及 `mappings` 字段如何通过 VLQ 编码紧凑地存储位置信息。
-   如何使用 `source-map` 库来辅助生成 Source Map。
-   生成 Source Map 的核心思想是在代码生成阶段，同步记录生成代码位置与原始 AST 节点位置的映射关系。

通过为我们的工具链添加 Source Map 生成能力，`mini-acorn` 的实用性得到了质的飞跃。它不再只是一个学术上的玩具，而是开始具备了生产级工具的雏形。

在下一章，我们将关注另一个工程实践中的重要话题：**性能优化**，探讨如何让我们的解析器运行得更快，占用更少的内存。
