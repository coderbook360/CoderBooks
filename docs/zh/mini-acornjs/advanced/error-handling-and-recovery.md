# 40. 错误处理与容错：构建更健壮的解析器

我们已经走过了漫长而激动人心的旅程。我们的 `mini-acorn` 已经学会了如何解析复杂的 JavaScript 语法，如何被插件扩展，如何生成代码和 Source Map，甚至如何优化自身。然而，到目前为止，我们一直生活在一个“理想世界”里——我们假设输入的所有代码都是语法正确的。

在现实世界中，代码充满了错误，尤其是在开发者正在输入的过程中。一个优秀的解析器，其价值不仅在于能处理正确的代码，更在于当它面对错误时，能做出何种反应。是简单粗暴地崩溃？还是能提供清晰有用的错误提示，甚至尝试从错误中恢复，继续分析文件的其余部分？

欢迎来到本书的最后一章。在这里，我们将为 `mini-acorn` 注入“人性”，教它如何优雅地处理错误，构建一个更健壮、对开发者更友好的解析器。

## 优质错误处理的重要性

想象一下，你在 IDE 中写代码，只是少打了一个分号，整个编辑器就白屏了，或者给出一个毫无信息的 `Error: failed to parse`。这是无法接受的。一个好的解析器，尤其当它被用于 Linter 或 IDE 时，必须做到：

1.  **精确定位**: 准确地指出错误发生在源代码的**哪一行、哪一列**。
2.  **清晰描述**: 明确地告诉用户**哪里**错了，**为什么**错了。例如，“在第 5 行第 10 列：期望得到一个分号 `;`，但却看到了一个右大括号 `}`。”
3.  **（可选）容错恢复**: 在报告一个错误后，不立即“死亡”，而是尝试跳过错误的部分，找到下一个可以安全恢复解析的地方，继续寻找文件中可能存在的其他错误。这使得 IDE 可以一次性给文件标出所有“红线”。

## 重构 `mini-acorn` 的错误处理

目前，我们的错误处理方式非常粗糙，通常是直接 `throw new Error("Unexpected token")`。我们将对其进行系统性的重构。

### 1. 创建一个统一的 `unexpected` 方法

我们应该将所有抛出解析错误的地方，都统一到一个方法上，例如 `this.unexpected()`。这个方法将负责收集当前的位置信息，并格式化错误消息。

```javascript
// src/parser.js

pp.raise = function(pos, message) {
  const loc = this.curPosition(); // 获取当前行列信息
  message += ` (${loc.line}:${loc.column})`;
  const err = new SyntaxError(message);
  err.pos = pos;
  err.loc = loc;
  throw err;
}

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
}
```

现在，我们可以改造 `expect` 和 `eat` 方法，让它们在断言失败时调用这个新的错误报告方法。

```javascript
// src/parser.js

pp.expect = function(type) {
  if (this.eat(type)) return;
  this.unexpected(); // 使用新的方法
}
```

### 2. 提供更丰富的错误信息

“Unexpected token”虽然准确，但不够友好。我们可以提供更具体的信息。

```javascript
// src/parser.js

// 例如，在 expect 中
pp.expect = function(type) {
  if (this.eat(type)) return;
  const msg = `Unexpected token, expected "${type.label}"`;
  this.raise(this.start, msg);
}
```

这样，当缺少一个分号时，用户会得到 `Unexpected token, expected ";" (5:10)` 这样清晰的提示。

## 错误恢复 (Error Recovery)

错误恢复是一个高级话题，但其基本思想是相通的：当解析器陷入困境时，它需要一个策略来“自救”，而不是直接放弃。

一个简单而有效的策略是**“同步点恢复”**。当 `parseStatement` 捕获到一个解析错误时，它不会让这个错误中断整个解析过程，而是：

1.  将这个错误记录到一个错误列表中。
2.  进入一个“恢复模式”，开始不断地消费（丢弃）后续的 Token。
3.  直到它找到了一个可以安全地重新开始解析的“同步点”。
4.  退出恢复模式，尝试解析下一条语句。

什么是好的同步点？通常是那些明确标志着一条语句结束或一个新结构开始的 Token，例如：

-   分号 `;`
-   右大括号 `}`
-   `export`, `import`, `function`, `const` 等关键字

### 简化的恢复逻辑示例

让我们看看在 `parseTopLevel`（解析程序顶层语句的循环）中如何实现这一点。

```javascript
// src/parser.js

pp.parseTopLevel = function(node) {
  // ...
  node.body = [];
  this.errors = []; // 用于收集错误

  while (this.type !== tt.eof) {
    try {
      const stmt = this.parseStatement(true, true);
      node.body.push(stmt);
    } catch (err) {
      // 捕获到错误！
      this.errors.push(err);

      // 进入恢复模式：不断消费 token 直到找到同步点
      while (this.type !== tt.eof) {
        if (this.type === tt.semi || this.type === tt.braceR) {
          this.next(); // 消费掉同步点本身
          break; // 找到同步点，退出恢复模式
        }
        if (this.type.keyword) {
          break; // 如果是关键字，也可能是新语句的开始
        }
        this.next();
      }
    }
  }
  // ...
}
```

通过这种方式，即使文件中有多处语法错误，我们的解析器也能“蹒跚”着走完全程，并带回一个包含所有错误信息的列表。这正是 IDE 和 Linter 所需的核心能力。

## 旅程的终点，也是新的起点

在本章，我们为 `mini-acorn` 安装了最后一个，也是至关重要的“安全气囊”——一个健壮的错误处理与恢复系统。我们学会了：

-   一个好的错误提示对于开发者体验至关重要。
-   通过统一的 `raise` / `unexpected` 方法，可以系统性地提升错误报告的质量。
-   错误恢复技术，如“同步点恢复”，能让解析器在面对错误时表现得更加智能和坚韧。

至此，《mini-acorn.js 解析器实战：从零构建》这本书的核心内容已经全部完成。我们从一个只能识别数字的 `Lexer` 开始，一步步构建了一个能够解析变量、函数、类、模块，具备插件系统、能生成代码和 Source Map，并且拥有良好性能和健壮性的现代 JavaScript 解析器。

这不仅仅是关于编写一个解析器的旅程。更重要的是，我们在这个过程中，亲手揭开了那些我们日常使用的工具（如 Babel、Webpack、ESLint、Prettier）背后的魔法。我们理解了什么是 AST，以及它在整个前端工具链中扮演的“通用语言”角色。

**这趟旅程结束了，但你的探索之路才刚刚开始。**

现在，你可以尝试：

-   为 `mini-acorn` 编写更复杂的插件，支持 JSX 或 TypeScript 的部分语法。
-   基于 `mini-acorn` 构建一个简单的 Linter 或代码格式化工具。
-   深入阅读 Acorn、Babel 或 esbuild 的源码，去见识一个真正的工业级解析器是如何设计的。

愿你在这条探索代码世界的道路上，永远保持好奇，永远享受创造的乐趣。

感谢你的阅读！
