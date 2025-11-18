# 30. 解析控制转移语句：`return`, `break`, `continue`, `throw`

到目前为止，我们的 `mini-acorn` 已经能够理解变量声明、条件判断和循环。现在，我们要为它添加一项至关重要的能力：理解那些能够改变程序正常执行流程的“跳转”指令。本章，我们将聚焦于四种控制转移语句的解析：`return`、`break`、`continue` 和 `throw`。

这些语句虽然在语法上相对简单，但它们都带有一些特殊的上下文约束和规则，比如 `return` 只能在函数中使用，`break` 只能在循环或 `switch` 中使用。此外，它们还都受到“自动分号插入”（ASI）机制的严格限制。理解并正确处理这些细节，是构建一个健壮解析器的关键。

## 控制转移语句的 AST 结构

在 ESTree 规范中，这四种语句都有自己专属的、结构清晰的 AST 节点：

-   **`ReturnStatement`**: 代表 `return` 语句。
    -   `argument`: `return` 后面跟随的表达式，如果 `return` 单独使用，则为 `null`。

-   **`BreakStatement`**: 代表 `break` 语句。
    -   `label`: 一个 `Identifier` 或 `null`。如果 `break` 后面带有标签（如 `break myLabel;`），`label` 就是该标签的标识符节点；否则为 `null`。

-   **`ContinueStatement`**: 代表 `continue` 语句。
    -   `label`: 与 `BreakStatement` 类似，代表可选的标签。

-   **`ThrowStatement`**: 代表 `throw` 语句。
    -   `argument`: `throw` 后面必须跟随的表达式。

## 自动分号插入 (ASI) 的影响

在深入实现之前，必须先理解 ASI 对这四种语句的特殊影响。`return`、`break`、`continue` 和 `throw` 都属于 JavaScript 中的“限制性产生式”（restricted productions）。

这意味着，如果在这几个关键字和它们后面的值（表达式或标签）之间存在一个换行符，JavaScript 引擎会**自动**在关键字后面插入一个分号。例如：

```javascript
return
  "hello";
```

在解析时，这会被视为两条独立的语句：`return;` 和 `"hello";`。因此，我们的解析器在解析这些语句时，必须检查关键字和其参数之间是否存在换行，以正确模拟这一行为。

## 实现解析方法

我们将为每一种语句创建一个专门的解析方法，并在 `parseStatement` 中进行派发。

### `parseReturnStatement`

`return` 语句的解析逻辑如下：

1.  消费 `return` 关键字。
2.  检查当前行是否已经结束，或者下一个 Token 是否不允许作为表达式的开头（如 `}`）。如果是，说明 `return` 后面没有跟表达式。
3.  否则，解析 `argument` 表达式。
4.  检查并消费可选的分号。

```javascript
// src/parser.js

pp.parseReturnStatement = function (node) {
  this.expect(tt._return);

  // 检查 ASI：如果换行或没有合法表达式，则 argument 为 null
  if (this.eat(tt.semi) || this.isLineTerminator()) {
    node.argument = null;
  } else {
    node.argument = this.parseExpression();
    this.eat(tt.semi);
  }

  return this.finishNode(node, "ReturnStatement");
};
```

### `parseBreakContinueStatement`

`break` 和 `continue` 的结构非常相似，我们可以用一个方法来处理它们。

1.  消费 `break` 或 `continue` 关键字。
2.  检查后面是否紧跟着一个标识符（作为 `label`）。同样，这里要考虑 ASI 的影响，即关键字和标签之间不能有换行。
3.  如果存在标签，则解析该 `Identifier` 并赋值给 `label` 属性。
4.  检查并消费可选的分号。

```javascript
// src/parser.js

pp.parseBreakContinueStatement = function (node, keyword) {
  const isBreak = keyword === "break";
  this.expect(isBreak ? tt._break : tt._continue);

  // 检查 ASI 和可选的 label
  if (this.eat(tt.semi) || this.isLineTerminator()) {
    node.label = null;
  } else if (this.type === tt.name) {
    node.label = this.parseIdentifier();
    this.eat(tt.semi);
  } else {
    this.unexpected();
  }

  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};
```

### `parseThrowStatement`

`throw` 语句与 `return` 类似，但它后面**必须**跟一个表达式。

1.  消费 `throw` 关键字。
2.  检查 ASI，确保 `throw` 和表达式之间没有换行。如果有，这是语法错误。
3.  解析 `argument` 表达式。
4.  检查并消费可选的分号。

```javascript
// src/parser.js

pp.parseThrowStatement = function (node) {
  this.expect(tt._throw);

  // 检查 ASI，throw 后面必须有表达式且不能换行
  if (this.isLineTerminator()) {
    this.unexpected(); // Throw new Error("Newline after throw is not allowed")
  }

  node.argument = this.parseExpression();
  this.eat(tt.semi);

  return this.finishNode(node, "ThrowStatement");
};
```

### 更新 `parseStatement`

最后，将这些新的解析方法集成到我们的主分发器 `parseStatement` 中。

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._return:
      return this.parseReturnStatement(this.startNode());
    case tt._break:
      return this.parseBreakContinueStatement(this.startNode(), "break");
    case tt._continue:
      return this.parseBreakContinueStatement(this.startNode(), "continue");
    case tt._throw:
      return this.parseThrowStatement(this.startNode());
    // ...
  }
};
```

## 添加测试用例

为了确保我们的实现是正确的，特别是对于带标签和受 ASI 影响的情况，编写全面的测试至关重要。

```javascript
// test/test.js

describe("Control Transfer Statements", () => {
  it("should parse a return statement with an argument", () => {
    const ast = parse("return 42;");
    // 断言 ReturnStatement 的 argument
  });

  it("should parse a return statement without an argument", () => {
    const ast = parse("return;");
    // 断言 ReturnStatement 的 argument 为 null
  });

  it("should parse a throw statement", () => {
    const ast = parse("throw new Error('fail');");
    // 断言 ThrowStatement 的 argument
  });

  it("should parse a break statement without a label", () => {
    const ast = parse("while(true) { break; }");
    // 断言 BreakStatement 的 label 为 null
  });

  it("should parse a continue statement with a label", () => {
    const ast = parse("outer: while(true) { continue outer; }");
    // 断言 ContinueStatement 的 label 是一个 name 为 'outer' 的 Identifier
  });
});
```

## 总结

在本章中，我们成功地为 `mini-acorn` 添加了解析四种关键控制转移语句的能力。通过实现 `parseReturnStatement`、`parseBreakContinueStatement` 和 `parseThrowStatement`，我们的解析器现在能够处理函数返回、循环中断和异常抛出等重要的编程构造。

我们还特别关注了自动分号插入（ASI）对这些语句的限制，这是保证解析器行为与真实 JavaScript 引擎一致的重要一步。

随着语句解析能力的不断完善，我们的解析器越来越接近一个功能完备的工具。在下一章，我们将挑战 JavaScript 中一个非常核心且复杂的概念：函数的解析，包括函数声明、函数表达式以及箭头函数。