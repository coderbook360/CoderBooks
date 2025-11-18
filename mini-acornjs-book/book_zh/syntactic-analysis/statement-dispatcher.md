# 语句解析调度：parseStatement 实现

在上一章，我们搭建了 `parseTopLevel` 这个顶层循环，它像一个永不疲倦的工人，不断地从代码的开头一直处理到文件末尾（`EOF`）。在循环的每一步，它都会调用 `this.parseStatement()`，期望这个函数能解析出一条完整的 JavaScript 语句。

但是，JavaScript 的语句类型五花八门：变量声明 (`const`, `let`, `var`)、条件语句 (`if`)、循环语句 (`for`, `while`)、块语句 (`{...}`) 等等。`parseStatement` 如何知道当前面对的是哪一种语句呢？

答案就藏在每条语句起始的那个 **标志性 Token** 中。

## 分发器模式：解析的交通枢纽

`parseStatement` 的核心职责并不是亲自去解析某一条具体的语句，而是扮演一个“交通总指挥”或“调度中心”（Dispatcher）的角色。它通过检查当前待处理的 Token (`this.type`)，来决定接下来应该由哪个“专业”的解析函数接手。

- 看到 `if` 关键字 (`tt._if`)，就调用 `parseIfStatement()`。
- 看到 `{` 符号 (`tt.braceL`)，就调用 `parseBlockStatement()`。
- 看到 `const` 或 `let` 关键字，就调用 `parseVarStatement()`。

这种“只负责分发，不负责具体执行”的设计模式，就是**分发器模式**。它让 `parseStatement` 的逻辑保持清晰、简单，且极易扩展。每当我们想支持一种新的语句类型时，只需要：
1.  编写一个新的、专门的解析函数（例如 `parseSwitchStatement`）。
2.  在 `parseStatement` 的分发逻辑中增加一个指向新函数的入口。

## `switch` 语句：最高效的分发实现

实现分发器最直接、最高效的方式就是使用 `switch` 语句。我们可以基于 `this.type` 的值，构建一个巨大的 `switch` 结构，将不同的 Token 类型映射到不同的处理函数上。

让我们在 `src/parser/index.js` 中为 `Parser` 类添加 `parseStatement` 方法的初步实现。

```javascript
// src/parser/index.js

import { tt } from "../token-type";
import { Program } from "../ast/node";

export class Parser {
  // ... (constructor, match, eat, expect, etc.)

  parse() {
    // ...
  }

  parseTopLevel() {
    // ...
  }

  // 新增：语句分发器
  parseStatement() {
    const startType = this.type;

    switch (startType) {
      // 我们将在这里添加各种 case
      
      // 默认情况
      default:
        return this.parseExpressionStatement();
    }
  }

  // 占位符：表达式语句解析
  parseExpressionStatement() {
    // 暂时返回一个模拟的节点
    const node = { type: "ExpressionStatement", expression: this.parseExpression() };
    this.nextToken(); // 消费掉表达式后的 token
    return node;
  }

  // 占位符：表达式解析
  parseExpression() {
    // 暂时返回一个模拟的节点
    return { type: "Identifier", name: this.value };
  }
}
```

在这段代码中，我们定义了 `parseStatement` 的基本结构。目前它只有一个 `default` 分支，总是调用 `parseExpressionStatement`。

## 默认选项：表达式语句 (Expression Statement)

你可能会对 `default` 分支的行为感到好奇：为什么在看不懂当前 Token 的情况下，不直接报错，而是去调用 `parseExpressionStatement` 呢？

这恰恰是 JavaScript 语法的一个核心特征。在 JavaScript 中，**任何一个表达式，只要在它后面加上一个分号（或者在特定情况下由引擎自动补全分号），就可以成为一条合法的语句**。这种语句被称为“表达式语句”。

思考以下例子：
```javascript
// 这是一个赋值表达式
a = 1; 

// 这是一个函数调用表达式
console.log("Hello");

// 这是一个合法的，但毫无意义的字符串字面量表达式
"useless";
```
从解析器的角度看，当它在 `parseStatement` 中遇到一个标识符 `a`、`console`，或者一个字符串 `"useless"` 时，这些 Token 都不像是任何已知语句（如 `if`, `for`）的开头。此时，解析器最大胆、也最合理的猜测就是：“这应该是一条表达式语句的开始”。

因此，`default` 分支的任务就是调用表达式解析器 `this.parseExpression()`，让它去解析出一个完整的表达式，然后将这个表达式节点包装在一个 `ExpressionStatement` 节点中返回。

这就是为什么 `parseStatement` 的 `default` 分支是 `parseExpressionStatement`，它为处理大量的普通代码（函数调用、赋值等）提供了统一的入口。

## 完善 `switch` 结构

现在，让我们为 `parseStatement` 添加更多“专业”的分支，并为它们创建临时的占位符函数。

```javascript
// src/parser/index.js

// ...

  parseStatement() {
    const startType = this.type;

    switch (startType) {
      // 1. 关键字驱动的语句
      case tt._if: return this.parseIfStatement();
      case tt._for: return this.parseForStatement();
      case tt._while: return this.parseWhileStatement();
      case tt._return: return this.parseReturnStatement();

      // 2. 声明类关键字
      case tt._const:
      case tt._let:
        return this.parseVarStatement(startType); // 传递关键字类型

      case tt._function:
        return this.parseFunctionStatement();

      // 3. 由标点符号驱动的语句
      case tt.braceL: // {
        return this.parseBlockStatement();
      case tt.semi: // ;
        return this.parseEmptyStatement();

      // 4. 默认情况：表达式语句
      default:
        return this.parseExpressionStatement();
    }
  }

  // --- 添加各类语句解析的占位符 ---

  parseIfStatement() { throw new Error("parseIfStatement not implemented yet!"); }
  parseForStatement() { throw new Error("parseForStatement not implemented yet!"); }
  parseWhileStatement() { throw new Error("parseWhileStatement not implemented yet!"); }
  parseReturnStatement() { throw new Error("parseReturnStatement not implemented yet!"); }
  parseVarStatement(kind) { throw new Error(`parseVarStatement (${kind.label}) not implemented yet!`); }
  parseFunctionStatement() { throw new Error("parseFunctionStatement not implemented yet!"); }
  parseBlockStatement() { throw new Error("parseBlockStatement not implemented yet!"); }
  parseEmptyStatement() { throw new Error("parseEmptyStatement not implemented yet!"); }

  // ... (parseExpressionStatement 和 parseExpression)
```

这个 `switch` 结构清晰地展示了我们的解析策略：
- **关键字驱动**：大部分语句由 `if`, `for` 等关键字引导。
- **声明**：`const`, `let`, `function` 用于引入新的标识符。注意 `const` 和 `let` 可以共用一个处理函数 `parseVarStatement`。
- **标点驱动**：`{` 开启一个代码块，`;` 本身构成一个空语句。
- **默认**：所有其他情况都交给 `parseExpressionStatement` 处理。

通过这些占位符，我们搭建起了语法分析器的“骨架”。接下来的章节，我们的任务就是逐一实现这些被 `throw new Error` 占位的函数，为这个骨架添上血肉。

## 总结

本章，我们实现了语法分析的“心脏”——`parseStatement` 分发器。它通过一个高效的 `switch` 语句，将解析任务精确地路由到各个专门的解析函数。同时，我们深入理解了“表达式语句”这一概念，并将其作为解析器的默认处理路径。

这个分发器是连接 `parseTopLevel` 和所有具体语句解析函数的“脊梁”，后续所有具体的语句解析工作，都将作为分支从这个主干上生长出来。