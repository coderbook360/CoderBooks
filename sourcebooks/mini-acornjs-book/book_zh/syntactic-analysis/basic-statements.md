# 解析两种基础语句：表达式语句与块级语句

在上一章，我们构建了 `parseStatement` 这个强大的分发器骨架，它像一个经验丰富的项目经理，知道该把不同的任务（Token）分配给哪个专家（具体的解析函数）。但目前为止，所有的“专家”都只会撂挑子——`throw new Error("Not implemented yet!")`。

从本章开始，我们将逐一实现这些专家函数，为解析器的骨架添上真正的血肉。我们将从 JavaScript 中最基础、最常见的两种语句开始：**块级语句** (`BlockStatement`) 和**表达式语句** (`ExpressionStatement`)。

## 块级语句：代码的容器

块级语句，就是由一对花括号 `{...}` 包裹的语句列表。它在 JavaScript 中无处不在，例如函数体、`if` 分支、`for` 循环体等等。它最核心的功能是**创造一个新的词法作用域**，并将多条语句组合成一个逻辑单元。

```javascript
{
  const a = 1; // a 只在这个块中有效
  let b = a + 1;
  console.log(b);
}
```

解析块级语句的逻辑非常直观，可以分解为以下几步：

1.  创建一个 `BlockStatement` AST 节点。
2.  消费并验证开头的 `{` (`tt.braceL`)。
3.  进入一个循环，不断地**递归调用 `this.parseStatement()`** 来解析块内部的每一条语句，并将结果收集到一个数组中。
4.  当遇到结尾的 `}` (`tt.braceR`) 时，退出循环。
5.  将收集到的语句数组赋值给 `BlockStatement` 节点的 `body` 属性。
6.  返回该节点。

### 实现 `parseBlockStatement`

现在，让我们用代码来实现这个逻辑，替换掉 `src/parser/index.js` 中的占位符。

```javascript
// src/parser/index.js

// ... (需要引入 BlockStatement)
import { Program, BlockStatement } from "../ast/node";

// ...

  parseBlockStatement() {
    const node = new BlockStatement(this);
    this.expect(tt.braceL); // 消费 '{'

    const body = [];
    // 循环解析，直到遇到 '}'
    while (!this.eat(tt.braceR)) {
      // 重点：递归调用语句分发器
      body.push(this.parseStatement());
    }

    node.body = body;
    return node;
  }

// ...
```

这里的核心在于 `while` 循环中的 `this.parseStatement()` 调用。`parseBlockStatement` 并不知道块里面具体是什么语句，它只负责提供一个“容器”。它将解析内部语句的任务再次交还给“总指挥” `parseStatement`，由 `parseStatement` 去识别下一条语句是 `if`、是 `const` 声明，还是另一个块级语句。这种递归的结构正是递归下降解析的精髓所在。

## 表达式语句：无处不在的执行单元

我们在上一章已经深入探讨了表达式语句的概念。它是 JavaScript 语法的基石，任何一个表达式（函数调用、赋值、运算等）都可以成为一条语句。

现在，我们要正式实现 `parseExpressionStatement`，替换掉之前那个简陋的模拟版本。

它的职责很简单：
1.  调用 `this.parseExpression()`，获取一个完整的表达式节点。
2.  将这个表达式节点包装成一个 `ExpressionStatement` 节点。
3.  处理表达式末尾可选的分号 `;`。
4.  返回 `ExpressionStatement` 节点。

### 实现 `parseExpressionStatement`

```javascript
// src/parser/index.js

// ... (需要引入 ExpressionStatement)
import { Program, BlockStatement, ExpressionStatement } from "../ast/node";

// ...

  parseExpressionStatement() {
    const node = new ExpressionStatement(this);
    // 1. 解析核心表达式
    node.expression = this.parseExpression();
    // 2. 消费可选的分号
    this.eat(tt.semi);
    return node;
  }

  // 暂时保留 parseExpression 的占位符
  parseExpression() {
    // 这里的逻辑将在后续“表达式解析”章节中变得极其复杂
    // 目前，我们只简单地解析一个标识符作为 mock
    const node = { type: "Identifier", name: this.value };
    this.nextToken();
    return node;
  }

// ...
```

注意，我们用 `this.eat(tt.semi)` 而不是 `this.expect(tt.semi)`。这是因为 JavaScript 的自动分号插入（ASI）机制允许在很多情况下省略句末的分号。`eat` 方法会尝试消费分号，如果存在就消费，不存在也不会报错，这正好符合我们的需求。

## 空语句：最简单的语句

在 JavaScript 中，一个单独的分号 `;` 也是一条完全合法的语句，称为“空语句”。它什么也不做，但在某些语法结构中（例如 `while(true);` 这样的死循环）可能会被用到。

解析它非常简单：

```javascript
// src/parser/index.js

// ... (需要引入 EmptyStatement)
import { Program, BlockStatement, ExpressionStatement, EmptyStatement } from "../ast/node";

// ...

  parseEmptyStatement() {
    const node = new EmptyStatement(this);
    this.expect(tt.semi); // 消费 ';'
    return node;
  }

// ...
```

## 定义 AST 节点

我们实现了三个语句的解析函数，现在需要在 `src/ast/node.js` 中为它们定义相应的 AST 节点类。

```javascript
// src/ast/node.js

// ... (Node, Program 类)

export class ExpressionStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "ExpressionStatement";
    this.expression = null; // 将由 parseExpressionStatement 填充
  }
}

export class BlockStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "BlockStatement";
    this.body = []; // 将由 parseBlockStatement 填充
  }
}

export class EmptyStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "EmptyStatement";
  }
}
```

## 总结

恭喜！我们已经为解析器的骨架成功添加了第一批血肉。通过实现 `parseBlockStatement` 和 `parseExpressionStatement`，我们的解析器现在已经能够理解代码的基本结构了：它知道如何处理由 `{}` 包裹的代码块，也知道如何处理最常见的函数调用和赋值语句。

虽然我们离一个完整的解析器还有很长的路要走，但解析这两种基础语句是迈出的至关重要的一步。在后续章节中，我们将基于今天的工作，继续实现更复杂的控制流语句和声明语句。