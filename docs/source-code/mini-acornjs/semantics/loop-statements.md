# 29. 解析循环语句：`while`, `do-while`, `for`

继上一章我们掌握了条件语句的解析之后，现在要来攻克程序流程控制的另一大支柱——循环语句。本章，我们将为 `mini-acorn` 添加解析 `while`、`do-while` 以及功能强大的 `for` 循环（包括其变体 `for-in` 和 `for-of`）的能力。

循环语句的解析，特别是 `for` 循环，是解析器实现中一个非常有趣且富有挑战性的部分。它要求我们不仅要处理好循环的各个组成部分，还要能够准确地根据细微的语法差异（如 `in` 或 `of` 关键字的出现）来决定生成哪种类型的 AST 节点。

## `while` 与 `do-while`：简单的循环

我们从最简单的两种循环开始：`while` 和 `do-while`。

### `WhileStatement` 与 `DoWhileStatement` 的 AST

-   **`WhileStatement`**: 代表 `while` 循环。
    -   `test`: 循环的条件表达式。
    -   `body`: 循环体语句块。

-   **`DoWhileStatement`**: 代表 `do-while` 循环。
    -   `body`: 循环体语句块。
    -   `test`: 循环的条件表达式。

它们结构非常直观，唯一的区别是 `do-while` 保证循环体至少执行一次。

### 实现 `parseWhileStatement` 和 `parseDoWhileStatement`

它们的解析过程也相对直接：

-   **`parseWhileStatement`**: 消费 `while` -> 消费 `(` -> 解析 `test` 表达式 -> 消费 `)` -> 解析 `body` 语句。
-   **`parseDoWhileStatement`**: 消费 `do` -> 解析 `body` 语句 -> 消费 `while` -> 消费 `(` -> 解析 `test` 表达式 -> 消费 `)`。

让我们将它们添加到 `parser.js` 中：

```javascript
// src/parser.js

pp.parseWhileStatement = function (node) {
  this.expect(tt._while);
  this.expect(tt.parenL);
  node.test = this.parseExpression();
  this.expect(tt.parenR);
  node.body = this.parseStatement();
  return this.finishNode(node, "WhileStatement");
};

pp.parseDoWhileStatement = function (node) {
  this.expect(tt._do);
  node.body = this.parseStatement();
  this.expect(tt._while);
  this.expect(tt.parenL);
  node.test = this.parseExpression();
  this.expect(tt.parenR);
  // do-while 结尾处的分号是可选的
  this.eat(tt.semi);
  return this.finishNode(node, "DoWhileStatement");
};
```

## `for` 循环：一个入口，多种可能

`for` 循环是解析的重点和难点。同一个 `for` 关键字，可能开启三种完全不同的循环模式：

1.  **`for` 循环 (C-style)**: `for (let i = 0; i < 10; i++) { ... }`
2.  **`for-in` 循环**: `for (const key in object) { ... }`
3.  **`for-of` 循环**: `for (const item of array) { ... }`

我们的解析器必须在解析 `for` 关键字和左括号 `(` 之后，通过检查接下来的内容来决定到底要解析哪一种循环。

### `for` 循环的 AST 家族

-   **`ForStatement`**: 对应 C-style `for` 循环。
    -   `init`: 初始化部分，可以是 `VariableDeclaration`、`Expression` 或 `null`。
    -   `test`: 条件表达式或 `null`。
    -   `update`: 更新表达式或 `null`。
    -   `body`: 循环体。

-   **`ForInStatement`**: 对应 `for-in` 循环。
    -   `left`: 循环变量，可以是 `VariableDeclaration` 或一个左值表达式。
    -   `right`: 被遍历的对象表达式。
    -   `body`: 循环体。

-   **`ForOfStatement`**: 对应 `for-of` 循环，结构与 `ForInStatement` 类似。
    -   `await`: 一个布尔值，用于 `for-await-of` 的场景。

### 实现 `parseForStatement`：派发中心

我们将所有逻辑都放在 `parseForStatement` 方法中。这个方法的核心职责是充当一个“派发中心”。

解析流程如下：

1.  消费 `for` 关键字和左括号 `(`。
2.  解析括号内的第一部分，我们称之为 `init`。这部分可能是变量声明（如 `let i = 0`），也可能是一个表达式（如 `i = 0`），甚至是空的（如 `for (;;)`）。
3.  **关键决策点**：查看 `init` 解析完之后的 Token：
    -   如果当前 Token 是 `in` 关键字，那么我们确定这是一个 `for-in` 循环。我们将已经解析的 `init` 作为 `left` 部分，然后继续解析 `right` 部分。
    -   如果当前 Token 是 `of` 关键字，那么这是一个 `for-of` 循环。处理方式与 `for-in` 类似。
    -   如果当前 Token 是分号 `;`，那么这是一个经典的 C-style `for` 循环。我们继续按部就班地解析 `test` 和 `update` 部分。
4.  解析完括号内的所有内容后，消费右括号 `)`，然后解析 `body`。
5.  根据决策点判断的类型，完成对应 AST 节点的创建并返回。

```javascript
// src/parser.js

pp.parseForStatement = function (node) {
  this.expect(tt._for);
  this.expect(tt.parenL);

  // 1. 解析 init 部分
  let init = null;
  if (this.match(tt.semi)) {
    // for (;;) an empty init
  } else if (this.match(tt._var) || this.match(tt._let) || this.match(tt._const)) {
    init = this.parseVar();
  } else {
    init = this.parseExpression();
  }

  // 2. 决策点：判断是 for, for-in, 还是 for-of
  if (this.eat(tt._in) || this.eat(tt._of)) {
    // 这是 for-in 或 for-of
    const isForIn = this.type === tt._in;
    const forNode = this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
    forNode.left = init;
    forNode.right = this.parseExpression();
    this.expect(tt.parenR);
    forNode.body = this.parseStatement();
    return forNode;
  } else {
    // 这是经典的 for 循环
    const forNode = this.finishNode(node, "ForStatement");
    forNode.init = init;
    this.expect(tt.semi);
    forNode.test = this.match(tt.semi) ? null : this.parseExpression();
    this.expect(tt.semi);
    forNode.update = this.match(tt.parenR) ? null : this.parseExpression();
    this.expect(tt.parenR);
    forNode.body = this.parseStatement();
    return forNode;
  }
};
```

> **注意**: 上述 `parseForStatement` 的实现是一个简化版本，用于说明核心思想。在 Acorn 的完整实现中，为了处理 `for-in`/`for-of` 左侧更复杂的表达式（如解构赋值），以及 `for-await-of` 等情况，逻辑会更加复杂和精细。但这个简化版已经抓住了派发机制的精髓。

最后，将所有新的解析方法注册到 `parseStatement` 中：

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._while:
      return this.parseWhileStatement(this.startNode());
    case tt._do:
      return this.parseDoWhileStatement(this.startNode());
    case tt._for:
      return this.parseForStatement(this.startNode());
    // ...
  }
};
```

## 添加测试用例

现在，是时候通过测试来验证我们的劳动成果了。你需要为 `while`、`do-while` 以及 `for` 循环的各种形式添加测试用例。

```javascript
// test/test.js

describe("Loop Statements", () => {
  it("should parse a while statement", () => {
    const ast = parse("while (a < 1) { a++; }");
    // 断言 WhileStatement 的 AST 结构
  });

  it("should parse a do-while statement", () => {
    const ast = parse("do { a++; } while (a < 1);");
    // 断言 DoWhileStatement 的 AST 结构
  });

  it("should parse a classic for statement", () => {
    const ast = parse("for (let i = 0; i < 10; i++) { go(); }");
    // 断言 ForStatement 的 AST 结构
  });

  it("should parse a for-in statement", () => {
    const ast = parse("for (const key in obj) { console.log(key); }");
    // 断言 ForInStatement 的 AST 结构
  });

  it("should parse a for-of statement", () => {
    const ast = parse("for (const val of arr) { console.log(val); }");
    // 断言 ForOfStatement 的 AST 结构
  });

  it("should parse a for statement with empty parts", () => {
    const ast = parse("for (;;) { break; }");
    // 断言 ForStatement 的 init, test, update 均为 null
  });
});
```

## 总结

在本章中，我们成功地为 `mini-acorn` 引入了对 JavaScript 中所有主要循环结构的支持。通过实现 `parseWhileStatement`、`parseDoWhileStatement` 以及一个智能的 `parseForStatement` 派发中心，我们的解析器现在能够理解更复杂的程序控制流。

`for` 循环的解析尤其锻炼了我们处理“语法模糊性”的能力——在解析的早期阶段，我们并不知道将要面对的是哪种 `for` 循环，必须根据后续的 Token（`in`、`of` 或 `;`）来动态决策。这是解析器设计中一个常见且重要的模式。

在下一章，我们将处理另一组重要的语句类型：控制转移语句，包括 `return`、`break`、`continue` 和 `throw`。这些语句将使我们的解析器能够处理函数返回、循环中断等关键行为。