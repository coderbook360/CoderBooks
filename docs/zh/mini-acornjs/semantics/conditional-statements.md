# 28. 解析条件语句：`if` 与 `switch`

在上一章中，我们成功地为 `mini-acorn` 添加了解析变量声明（`var`、`let`、`const`）的能力。现在，是时候让我们的解析器掌握编程中最核心的逻辑控制能力了——条件判断。本章，我们将聚焦于 `if` 和 `switch` 这两种条件语句的解析实现。

通过本章的学习，你不仅会理解这两种语句的语法结构，更将掌握如何在递归下降解析器中，将它们的解析逻辑与现有的 `parseStatement` 流程无缝集成，并最终生成符合 ESTree 规范的 AST 节点。

## `if` 语句：构建逻辑分支

`if` 语句是编程语言中实现逻辑分支的基础。它的结构可以分为三种：

1.  **简单的 `if`**：`if (condition) { ... }`
2.  **`if-else`**：`if (condition) { ... } else { ... }`
3.  **`if-else if-else`**：`if (c1) { ... } else if (c2) { ... } else { ... }`

虽然看起来有三种形式，但在 AST 的世界里，它们都由同一种节点类型——`IfStatement`——来表示。一个 `else if` 结构，本质上是父级 `IfStatement` 的 `alternate` 属性指向了另一个 `IfStatement`。

### `IfStatement` 的 AST 结构

根据 ESTree 规范，一个 `IfStatement` 节点包含以下核心属性：

-   `type`: `"IfStatement"`
-   `test`: 一个表达式（`Expression`），代表判断条件。
-   `consequent`: 一个语句（`Statement`），代表条件为真时执行的代码块。
-   `alternate`: 一个语句（`Statement`）或 `null`，代表 `else` 分支的代码块。

让我们来看一个具体的例子。对于下面的代码：

```javascript
if (x > 10) {
  result = "greater";
} else {
  result = "smaller";
}
```

它对应的 `IfStatement` AST 节点大致如下：

```json
{
  "type": "IfStatement",
  "test": {
    "type": "BinaryExpression",
    "left": { "type": "Identifier", "name": "x" },
    "operator": ">",
    "right": { "type": "Literal", "value": 10 }
  },
  "consequent": {
    "type": "BlockStatement",
    "body": [
      {
        "type": "ExpressionStatement",
        "expression": {
          "type": "AssignmentExpression",
          "operator": "=",
          "left": { "type": "Identifier", "name": "result" },
          "right": { "type": "Literal", "value": "greater" }
        }
      }
    ]
  },
  "alternate": {
    "type": "BlockStatement",
    "body": [
      {
        "type": "ExpressionStatement",
        "expression": {
          "type": "AssignmentExpression",
          "operator": "=",
          "left": { "type": "Identifier", "name": "result" },
          "right": { "type": "Literal", "value": "smaller" }
        }
      }
    ]
  }
}
```

### 实现 `parseIfStatement`

现在，我们来动手实现 `if` 语句的解析逻辑。这个任务可以分解为以下几个步骤：

1.  创建一个新的 AST 节点 `node`，类型为 `IfStatement`。
2.  消费 `if` 关键字。
3.  消费左括号 `(`。
4.  调用 `this.parseExpression()` 解析括号内的 `test` 表达式。
5.  消费右括号 `)`。
6.  调用 `this.parseStatement()` 解析 `consequent` 部分。
7.  检查当前 Token 是否为 `else` 关键字。如果是，则消费它，并再次调用 `this.parseStatement()` 解析 `alternate` 部分。
8.  返回创建的 `node`。

下面是 `parseIfStatement` 方法的具体实现：

```javascript
// src/parser.js

pp.parseIfStatement = function (node) {
  this.expect(tt._if); // 消费 'if'
  this.expect(tt.parenL); // 消费 '('
  node.test = this.parseExpression(); // 解析条件
  this.expect(tt.parenR); // 消费 ')'
  node.consequent = this.parseStatement(); // 解析 consequent
  // 如果下一个 token 是 'else'，则解析 alternate
  node.alternate = this.eat(tt._else) ? this.parseStatement() : null;
  return this.finishNode(node, "IfStatement");
};
```

最后，我们需要在 `parseStatement` 方法中，将 `if` 关键字与我们的新方法关联起来：

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._if:
      return this.parseIfStatement(this.startNode());
    // ...
  }
};
```

## `switch` 语句：处理多路分支

与 `if` 语句相比，`switch` 语句提供了更结构化的多路分支方式。它的解析稍微复杂一些，因为它引入了 `case` 和 `default` 两个新的上下文关键字。

### `SwitchStatement` 与 `SwitchCase` 的 AST

`switch` 语句在 ESTree 中由 `SwitchStatement` 和 `SwitchCase` 两种节点类型共同描述。

-   **`SwitchStatement`**:
    -   `type`: `"SwitchStatement"`
    -   `discriminant`: 一个表达式（`Expression`），即 `switch` 括号中的表达式。
    -   `cases`: 一个由 `SwitchCase` 节点组成的数组。

-   **`SwitchCase`**:
    -   `type`: `"SwitchCase"`
    -   `test`: 一个表达式（`Expression`）或 `null`。对于 `case` 分支，它是匹配的表达式；对于 `default` 分支，它是 `null`。
    -   `consequent`: 一个由语句（`Statement`）组成的数组，代表该分支的代码块。

来看一个例子：

```javascript
switch (fruit) {
  case "apple":
    console.log("It's an apple.");
    break;
  case "banana":
    console.log("It's a banana.");
    break;
  default:
    console.log("Unknown fruit.");
}
```

其 AST 结构大致如下：

```json
{
  "type": "SwitchStatement",
  "discriminant": { "type": "Identifier", "name": "fruit" },
  "cases": [
    {
      "type": "SwitchCase",
      "test": { "type": "Literal", "value": "apple" },
      "consequent": [
        // ... console.log 和 break 语句的 AST
      ]
    },
    {
      "type": "SwitchCase",
      "test": { "type": "Literal", "value": "banana" },
      "consequent": [
        // ... console.log 和 break 语句的 AST
      ]
    },
    {
      "type": "SwitchCase",
      "test": null, // default 分支
      "consequent": [
        // ... console.log 语句的 AST
      ]
    }
  ]
}
```

### 实现 `parseSwitchStatement`

解析 `switch` 语句的挑战在于正确地处理花括号 `{}` 内部的 `case` 和 `default` 块。我们需要循环解析，直到遇到右花括号 `}`。

1.  创建 `SwitchStatement` 节点 `node`。
2.  消费 `switch` 关键字和左括号 `(`。
3.  解析 `discriminant` 表达式。
4.  消费右括号 `)` 和左花括号 `{`。
5.  进入一个循环，直到遇到右花括号 `}`：
    a.  在循环内部，我们期望遇到 `case` 或 `default` 关键字。
    b.  创建一个 `SwitchCase` 节点 `caseNode`。
    c.  如果遇到 `case`，消费它并解析 `test` 表达式。如果遇到 `default`，消费它并将 `test` 设为 `null`。
    d.  消费冒号 `:`。
    e.  进入另一个内部循环，解析属于当前 `case` 的所有语句（`consequent`），直到遇到下一个 `case`、`default` 或 `}`。
    f.  将 `caseNode` 添加到 `node.cases` 数组中。
6.  消费右花括号 `}`。
7.  返回 `node`。

```javascript
// src/parser.js

pp.parseSwitchStatement = function (node) {
  this.expect(tt._switch); // 消费 'switch'
  this.expect(tt.parenL); // 消费 '('
  node.discriminant = this.parseExpression(); // 解析 discriminant
  this.expect(tt.parenR); // 消费 ')'
  node.cases = [];
  this.expect(tt.braceL); // 消费 '{'

  // 循环解析 case/default 块
  while (!this.eat(tt.braceR)) {
    const caseNode = this.startNode();
    if (this.eat(tt._case)) {
      caseNode.test = this.parseExpression(); // 解析 case 的 test 表达式
    } else if (this.eat(tt._default)) {
      caseNode.test = null; // default 的 test 为 null
    } else {
      this.unexpected(); // 如果不是 case/default/braceR，则抛出错误
    }

    this.expect(tt.colon); // 消费 ':'
    caseNode.consequent = [];

    // 循环解析 case 块内的语句
    while (
      !this.eat(tt._case) &&
      !this.eat(tt._default) &&
      !this.match(tt.braceR)
    ) {
      caseNode.consequent.push(this.parseStatement());
    }
    node.cases.push(this.finishNode(caseNode, "SwitchCase"));
  }

  return this.finishNode(node, "SwitchStatement");
};
```

同样，不要忘记在 `parseStatement` 中添加 `switch` 的处理分支：

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._switch:
      return this.parseSwitchStatement(this.startNode());
    // ...
  }
};
```

## 添加测试用例

理论和实现都已完成，现在是检验成果的时候了。我们需要为 `if` 和 `switch` 语句添加全面的测试用例，确保我们的解析器能够正确处理各种边界情况。

在你的测试文件中，可以添加如下测试：

```javascript
// test/test.js

describe("Conditional Statements", () => {
  it("should parse a simple if statement", () => {
    const ast = parse("if (a) b;");
    // 断言 AST 结构
    assert.deepStrictEqual(ast.body[0], {
      type: "IfStatement",
      test: { type: "Identifier", name: "a" },
      consequent: {
        type: "ExpressionStatement",
        expression: { type: "Identifier", name: "b" },
      },
      alternate: null,
    });
  });

  it("should parse an if-else statement", () => {
    const ast = parse("if (a) b; else c;");
    // 断言 AST 结构
  });

  it("should parse an if-else if-else statement", () => {
    const ast = parse("if (a) b; else if (c) d; else e;");
    // 断言 AST 结构，注意 alternate 的嵌套
  });

  it("should parse a switch statement", () => {
    const ast = parse("switch (a) { case 1: b; break; default: c; }");
    // 断言 SwitchStatement 和 SwitchCase 的结构
  });
});
```

请务必亲手补全这些测试用例的断言部分，并运行它们。通过测试，你将对条件语句的 AST 结构有更深刻的理解。

## 总结

恭喜你！`mini-acorn` 现在已经具备了处理程序流程控制中两种最基本结构的能力。我们通过扩展 `parseStatement`，并实现了 `parseIfStatement` 和 `parseSwitchStatement` 两个核心方法，让解析器能够理解并构建 `if` 和 `switch` 语句的 AST。

在下一章，我们将继续扩展语句解析的能力，探索 JavaScript 中的各种循环结构：`while`、`do-while` 和 `for` 循环。