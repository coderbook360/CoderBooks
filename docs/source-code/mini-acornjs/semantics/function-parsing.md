# 31. 解析函数：声明、表达式与箭头函数

我们已经搭建了程序流程控制的骨架，现在，是时候注入灵魂了——函数。函数是 JavaScript 中最基本、最核心的组织单元。在本章中，我们将为 `mini-acorn` 添加解析各种函数形式的能力，包括函数声明、函数表达式，以及现代 JavaScript 的标志性特性——箭头函数。

函数的解析是一个综合性很强的主题。它不仅涉及函数本身（`async`, `function`, `*` 关键字），还包括对复杂参数列表（默认参数、剩余参数、解构）的解析，以及对不同函数体（块级体或表达式体）的判断。这无疑是 `mini-acorn` 迄今为止面临的最有趣的挑战之一。

## 函数的 AST 家族

ESTree 为不同的函数形式定义了不同的节点类型，它们在结构上既有相似之处，又有关键的区别。

-   **`FunctionDeclaration`**: 用于 `function foo() {}` 这样的声明。
    -   `id`: 函数名，必须是一个 `Identifier`。
    -   `params`: 参数数组。
    -   `body`: 函数体，必须是一个 `BlockStatement`。
    -   `async`: 布尔值，是否为 `async function`。
    -   `generator`: 布尔值，是否为 `function*`。

-   **`FunctionExpression`**: 用于 `const a = function() {}` 这样的表达式。
    -   与 `FunctionDeclaration` 几乎相同，但 `id` 是**可选的**（用于创建命名函数表达式）。

-   **`ArrowFunctionExpression`**: 用于箭头函数 `() => {}`。
    -   `id`: 箭头函数没有 `id`，总是匿名的，所以为 `null`。
    -   `params`: 参数数组。
    -   `body`: 函数体，可以是 `BlockStatement` 或一个 `Expression`。
    -   `expression`: 一个布尔值。如果 `body` 是一个表达式，则为 `true`。
    -   `async`: 布尔值。
    -   `generator`: 箭头函数不能是生成器，此项恒为 `false`。

## 解析函数声明与表达式

由于函数声明和函数表达式在结构上非常相似，它们的解析逻辑可以高度复用。我们可以创建一个通用的 `parseFunction` 方法。

解析流程如下：

1.  检查并消费 `async` 关键字。
2.  必须消费 `function` 关键字。
3.  检查并消费 `*` (generator) 关键字。
4.  解析函数 `id`。对于函数声明，`id` 是必需的；对于函数表达式，`id` 是可选的。
5.  解析参数列表 `(...)`。
6.  解析函数体 `{...}`。
7.  根据上下文（是作为声明还是表达式被调用）创建 `FunctionDeclaration` 或 `FunctionExpression` 节点。

```javascript
// src/parser.js

// isStatement: bool, isAsync: bool
pp.parseFunction = function (node, isStatement, isAsync) {
  this.expect(tt._function);
  node.generator = this.eat(tt.star);
  node.async = !!isAsync;

  // 解析函数 ID
  if (isStatement) {
    node.id = this.parseIdentifier();
  } else if (this.match(tt.name)) {
    node.id = this.parseIdentifier();
  }

  // 解析参数和函数体
  node.params = this.parseFunctionParams();
  node.body = this.parseBlock();

  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

// 辅助方法，用于解析参数列表
pp.parseFunctionParams = function () {
  const params = [];
  this.expect(tt.parenL);
  while (!this.eat(tt.parenR)) {
    params.push(this.parseIdentifier()); // 简化版：只支持简单标识符
    if (!this.match(tt.parenR)) this.expect(tt.comma);
  }
  return params;
};
```

> **关于参数解析**：在真实的 Acorn 中，`parseFunctionParams` 是一个非常复杂的方法，它需要处理默认值（`a = 1`）、剩余参数（`...args`）和解构（`{a, b}`）。这里我们为了聚焦核心流程，将其极度简化。

然后，在 `parseStatement` 中，我们可以这样调用它：

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  if (startType === tt._function) {
    return this.parseFunction(this.startNode(), true);
  }
  // ...
}
```

## 箭头函数的解析挑战

箭头函数的解析之所以棘手，是因为它的开头可能与一个普通的括号表达式完全一样。例如，当解析器读到 `(a, b)` 时，它无法确定这是一个括号表达式，还是一个箭头函数的参数列表。只有当它继续向后读，看到了 `=>` 这个标志性的 Token 时，才能做出最终判断。

Acorn 等解析器采用了一种非常巧妙的策略：

1.  **先行尝试**：正常地按照解析表达式的流程进行。例如，将 `(a, b)` 解析为一个序列表达式。
2.  **检查 `=>`**：在解析完这个潜在的“表达式”后，检查下一个 Token 是否为 `=>`。
3.  **转换或确认**：
    -   如果是 `=>`，那么刚才解析的“表达式”其实是箭头函数的参数。解析器需要将已经生成的表达式 AST 节点“转换”或“重新解释”为参数列表的 AST 节点。
    -   如果不是 `=>`，那么它就是一个普通的表达式，解析流程继续。

### 实现 `parseArrowExpression`

这个转换逻辑是 `Pratt` 解析器与递归下降法结合的精髓体现。当 `parseExprAtom` 解析完一个括号表达式或一个标识符后，它会检查后面是否跟着 `=>`。

```javascript
// src/parser.js - (在表达式解析部分)

pp.parseExprAtom = function (refShorthandDefaultPos) {
  // ...
  let node;
  switch (this.type) {
    case tt.parenL:
      // 可能是 (a, b) => ... 或 (a + b)
      node = this.parseParenAndDistinguishExpression(); 
      break;
    // ...
  }
  return node;
};

pp.parseParenAndDistinguishExpression = function() {
  const start = this.start;
  this.expect(tt.parenL);
  // ... 省略了复杂的参数解析和转换逻辑

  // 简化版的思想：
  const expr = this.parseExpression(); // 先当成普通表达式解析
  this.expect(tt.parenR);

  if (this.eat(tt.arrow)) { // 发现 =>
    // 这是一个箭头函数！
    const arrowNode = this.startNodeAt(start);
    arrowNode.params = [expr]; // 极度简化：将整个表达式当成一个参数
    arrowNode.body = this.parseArrowExpressionBody();
    return this.finishNode(arrowNode, "ArrowFunctionExpression");
  } else {
    // 这是一个普通的括号表达式
    return expr;
  }
}

// 解析箭头函数的函数体
pp.parseArrowExpressionBody = function() {
  if (this.match(tt.braceL)) {
    // 是 { ... } 块级函数体
    return this.parseBlock();
  } else {
    // 是 a + b 这样的表达式函数体
    return this.parseExpression();
  }
}
```

上面的代码是一个高度简化的思想模型，它揭示了“**先行解析，后续判断**”的核心策略。真实的实现会更加精巧，它会在解析参数列表时就直接构建出正确的参数节点，而不是先创建表达式节点再转换。

## 添加测试用例

函数的测试需要覆盖多种形式和边界情况。

```javascript
// test/test.js

describe("Function Parsing", () => {
  it("should parse a function declaration", () => {
    const ast = parse("function hello(a) { return a; }");
    // 断言 FunctionDeclaration 的 id, params, body
  });

  it("should parse an async generator function expression", () => {
    const ast = parse("const f = async function* gen() {};");
    // 断言 FunctionExpression 的 async 和 generator 标志位
  });

  it("should parse an arrow function with a block body", () => {
    const ast = parse("(a, b) => { return a + b; }");
    // 断言 ArrowFunctionExpression 的 body 是 BlockStatement
  });

  it("should parse an arrow function with an expression body", () => {
    const ast = parse("x => x * 2");
    // 断言 ArrowFunctionExpression 的 body 是 BinaryExpression
    // 并且 expression 标志位为 true
  });

  it("should parse arrow function with complex parameters", () => {
    const ast = parse("({a, b}, [c], ...d) => {}");
    // 断言参数列表的 AST 结构
  });
});
```

## 总结

在本章中，我们攻克了 JavaScript 解析中最为核心的部分——函数的解析。我们学习了如何区分和解析函数声明、函数表达式和箭头函数，并了解了它们各自的 AST 结构。

我们特别探讨了箭头函数解析的复杂性，理解了“先行解析，后续判断”这一高级解析策略。虽然我们的实现是简化的，但它为你揭示了真实解析器内部的运作机制。

至此，`mini-acorn` 已经掌握了 JavaScript 中绝大部分的语句和表达式。在下一章，我们将挑战 ES6 引入的另一个重要概念：类的解析。