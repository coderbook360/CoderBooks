# Parser 核心：状态初始化与管理

我们已经确立了使用“递归下降”作为语法分析的核心策略。这个策略依赖于一系列 `parseXXX` 函数的相互调用来构建 AST。但这里有一个关键问题：这些独立的函数之间如何通信？它们如何共享关于解析进度的信息？

例如，当 `parseStatement` 调用 `parseExpression` 时，`parseExpression` 如何知道应该从源码的哪个位置开始解析？当解析出错时，我们又如何能精确地报告错误发生在第几行、第几列？

答案就是**状态（State）**。我们需要一个统一的、贯穿整个解析过程的状态对象，它就像是解析器的“记忆体”或“中央处理器”，记录着所有关于解析进度的关键信息。所有的 `parseXXX` 函数都将共享并更新这个状态对象。

在这一章，我们将对词法分析阶段创建的 `Parser` 类进行一次重大升级，为其装备一个强大的状态管理核心。

## 解析器：一个状态机

从本质上讲，解析器就是一个**状态机（State Machine）**。在任何一个时刻，它都处于一个明确的状态，例如“我正在读取一个标识符”、“我刚刚消费了一个加号 Token”或者“我期望接下来是一个右括号”。每当它消费一个新的 Token，它的状态就会发生一次“转换”。

我们将所有状态都作为 `Parser` 类的实例属性，通过 `this` 来访问。这样，每个 `parseXXX` 方法都能方便地读取和修改当前解析器的状态。

我们将状态分为三类：

1.  **位置状态**：解析器在源码中的“光标”。
2.  **Token 状态**：当前待处理的 Token 的完整信息。
3.  **上下文状态**：用于处理与环境相关的特殊语法规则。

## 状态初始化

让我们来扩充 `Parser` 类的构造函数，初始化所有必要的状态。

```javascript
// src/parser.js (升级后的 Parser)
import { tt } from "./tokentype";

export default class Parser {
  constructor(input) {
    // --- 1. 位置状态 (Position State) ---
    this.input = input; // 源码字符串
    this.pos = 0;       // 当前扫描的字符索引
    this.line = 1;      // 当前行号
    this.column = 0;    // 当前列号

    // --- 2. Token 状态 (Token State) ---
    // 这些状态由 nextToken() 更新
    this.type = tt.eof; // 当前 Token 的类型
    this.value = null;  // 当前 Token 的值
    this.start = 0;     // 当前 Token 的起始索引
    this.end = 0;       // 当前 Token 的结束索引

    // 为了更精确的错误报告和 AST 节点位置
    this.startLine = this.line;
    this.startColumn = this.column;
    this.endLine = this.line;
    this.endColumn = this.column;

    // --- 3. 上下文状态 (Contextual State) ---
    this.strict = false;      // 是否处于严格模式
    this.inFunction = false;  // 是否在函数体内部
    this.inAsync = false;     // 是否在异步函数内部
    this.inLoop = false;      // 是否在循环体内部
  }

  // ... nextToken() 和其他词法分析方法
}
```

### 1. 位置状态 (`pos`, `line`, `column`)

这三个属性是解析器最基本的“GPS”。它们精确地指向词法分析器当前正在扫描的字符。它们是所有位置计算（如错误报告）和 Token 位置记录（`start`, `end`）的基础。这些值主要在词法分析阶段，特别是在处理字符和换行符时被更新。

### 2. Token 状态 (`type`, `value`, `start`, `end`, ...)

这组属性是**语法分析阶段的直接输入**。我们的 `parseXXX` 函数不应该再关心源码字符串 `input`，而是直接读取 `this.type` 来判断当前应该做什么决策。

- `this.type`：当前 Token 的类型，例如 `tt.name`, `tt.num`, `tt._if`。
- `this.value`：当前 Token 的值，例如标识符的名称、数字或字符串的值。
- `this.start`, `this.end`：当前 Token 在 `input` 字符串中的起止索引。这对于生成 AST 节点至关重要，因为很多工具（如代码高亮、Linter）都需要知道每个节点对应的源码范围。

每当我们需要“消费”一个 Token 并前进时，我们就会调用 `nextToken()`。这个方法的核心职责之一，就是用下一个 Token 的信息来更新 `Parser` 实例的这组 Token 状态属性。

### 3. 上下文状态 (`strict`, `inFunction`, ...)

JavaScript 的一大特点是其语法的**上下文相关性**。同一个词，在不同语境下可能有不同含义，甚至决定了语法的合法性。

- **`strict`**: 当解析器遇到一个表达式为 `"use strict";` 的语句时，它需要将 `this.strict` 标志设为 `true`。后续的解析，比如对变量名的限制，就需要检查这个状态。
- **`inFunction`**: 当我们开始解析一个函数体时，会将 `this.inFunction` 设为 `true`。这样，当 `parseReturnStatement` 被调用时，它就可以检查这个状态。如果在函数体外（`inFunction` 为 `false`）遇到了 `return` 语句，就应该抛出一个语法错误。
- **`inLoop`**: 同样，`break` 和 `continue` 语句只能出现在循环体内部。`parseBreakStatement` 和 `parseContinueStatement` 就需要检查 `this.inLoop` 状态。
- **`inAsync`**: `await` 关键字只能在 `async` 函数中使用。`parseAwaitExpression` 必须检查 `this.inAsync` 状态。

这些上下文状态通常由特定的 `parseXXX` 函数在进入和退出相应语法结构时进行维护，形成一种“状态入栈/出栈”的效果，从而保证了解析的正确性。

## 总结

在本章中，我们为 `Parser` 类构建了其核心的“大脑”——一个全面的状态管理系统。这个系统通过位置状态、Token 状态和上下文状态，为后续的语法分析提供了所有必需的信息。

正确地初始化和维护这些状态，是编写一个健壮、精确、容错性强的解析器的基石。有了这个坚实的基础，我们就可以在下一章开始编写真正的解析器辅助方法，并开始消费 Token、构建 AST 了。

### 练习

1.  在我们的 `Parser` 状态中，已经添加了 `inLoop` 标志。思考一下，哪些 `parseXXX` 函数（例如 `parseForStatement`, `parseWhileStatement`）应该负责将它设为 `true` 和 `false`？
2.  `nextToken()` 方法会更新 Token 相关的状态。请再次思考，位置状态 `pos`, `line`, `column` 应该在何时、在哪个模块中（词法分析器还是语法分析器）被更新？为什么？