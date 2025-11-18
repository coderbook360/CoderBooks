# 解析程序与顶层节点：实现 parse 方法

万事俱备，只欠东风。我们已经拥有了状态管理器和辅助工具箱，现在是时候将它们组合起来，编写我们第一个真正的语法分析函数了。

任何解析过程都必须有一个入口。对于解析一整个 JavaScript 文件而言，这个入口就是 `parse()` 方法，它的目标是生成 AST 的根节点——`Program` 节点。`Program` 节点代表了整个源文件，它的 `body` 属性是一个数组，包含了文件顶层的所有语句。

这一章，我们将实现这个“总指挥官”，并在这里把词法分析和语法分析的“齿轮”第一次啮合在一起。

## AST 节点的设计

在创建 AST 之前，我们先来定义节点的通用结构。一个好的实践是创建一个 `Node` 基类，所有具体的 AST 节点（如 `Program`, `IfStatement` 等）都继承自它。这个基类可以负责记录所有节点共有的信息，比如源码位置。

根据 [ESTree 规范](https://github.com/estree/estree)，每个节点都应该有 `type`, `start`, `end` 和 `loc` 属性。

```javascript
// src/ast/node.js (新建)

// 源码位置信息
class SourceLocation {
  constructor(parser) {
    this.start = {
      line: parser.startLine,
      column: parser.startColumn
    };
    this.end = {
      line: parser.endLine,
      column: parser.endColumn
    };
  }
}

// AST 节点基类
export class Node {
  constructor(parser) {
    this.type = '';
    this.start = parser.start;
    this.end = parser.end;
    this.loc = new SourceLocation(parser);
  }
}
```

有了基类，我们就可以定义 `Program` 节点了。

```javascript
// src/ast/node.js (续)

export class Program extends Node {
  constructor(parser, body, sourceType) {
    super(parser);
    this.type = 'Program';
    this.body = body;
    this.sourceType = sourceType; // 'script' or 'module'
  }
}
```

## 实现 `parse` 入口

我们的 `parse` 方法将作为库的公共 API，它是一个静态方法，封装了 `Parser` 实例的创建和调用过程，让用户可以方便地使用。

```javascript
// src/parser/index.js (Parser 主类)
import { Program } from '../ast/node.js';
import { tt } from "../tokentype";

export default class Parser {
  constructor(input) { /* ... state initialization from previous chapter ... */ }

  // 公共 API 入口
  static parse(input) {
    const parser = new Parser(input);
    return parser.parse();
  }

  // 实例的解析方法
  parse() {
    // 1. 获取第一个 Token，这是启动语法分析的关键一步
    this.nextToken();

    // 2. 开始解析顶层结构
    return this.parseTopLevel();
  }
}
```

这里有两个 `parse` 方法：

1.  `Parser.parse(input)`: 静态方法，作为库的公共 API。它隐藏了内部实现，用户只需调用 `Parser.parse('let a = 1')` 即可。
2.  `parser.parse()`: 实例方法，是解析的总控制。它做的第一件事就是调用 `this.nextToken()`。**这是至关重要的一步**，它完成了从源码到第一个 Token 的转换，为语法分析准备好了初始输入。

## `parseTopLevel`：核心解析循环

`parseTopLevel` 是解析的“主引擎”。它负责创建一个循环，不断地解析顶层语句，直到文件末尾。

```javascript
// src/parser/index.js (在 Parser 类中新增)

parseTopLevel() {
  const body = [];

  // 只要没到文件末尾(EOF)，就一直解析语句
  while (!this.match(tt.eof)) {
    // 调用下一章将要实现的语句分发器
    const statement = this.parseStatement();
    body.push(statement);
  }

  // 创建并返回 Program 节点
  // 注意：我们暂时硬编码 sourceType 为 'script'
  return new Program(this, body, 'script');
}
```

这个方法的逻辑非常清晰：

1.  初始化一个空的 `body` 数组。
2.  进入一个 `while` 循环，循环条件是 `!this.match(tt.eof)`，即“只要当前 Token 不是文件结束符”。
3.  在循环内部，调用 `this.parseStatement()`。我们暂时将 `parseStatement` 想象成一个“黑盒”，它的任务就是解析任意一种语句，并返回对应的 AST 节点。
4.  将返回的语句节点推入 `body` 数组。
5.  循环结束后，用收集到的 `body` 创建一个 `Program` 节点并返回。

### `parseStatement` 的临时实现

为了让 `parseTopLevel` 能跑起来，我们需要一个临时的 `parseStatement` 实现。但这里有一个巨大的陷阱：**这个临时实现必须消费掉至少一个 Token**，否则 `while` 循环将因为 `this.type` 永远不变而陷入死循环。

```javascript
// src/parser/index.js (在 Parser 类中新增，作为临时占位符)

parseStatement() {
  // 这是一个临时的 mock 实现，用于让代码跑通
  console.log("Parsing statement starting with token:", this.type.label);
  
  // 关键：必须消费 Token，否则会无限循环！
  this.nextToken(); 
  
  // 返回一个虚拟节点
  return { type: 'EmptyStatement' }; 
}
```

这是编写递归下降解析器时最常见的错误之一，务必牢记。

## 总结

在本章中，我们终于打通了从源码到 AST 的“最后一公里”。我们实现了 `parse` 入口函数和 `parseTopLevel` 核心循环，定义了 `Program` 作为 AST 的根节点，并通过一个 `while` 循环和对 `parseStatement` 的调用，将文件内容解析为一系列顶层语句。

至此，我们解析器的完整骨架已经搭建完毕。剩下的工作，就是用真实的逻辑去填充 `parseStatement` 以及它所调用的各种具体的语句和表达式解析函数。

在下一章，我们将开始这个填充工作，实现一个语句解析的“调度中心”——`parseStatement`，它将根据不同的 Token 类型，将解析任务分发给不同的、更具体的 `parseXXXStatement` 函数。

### 练习

1.  **实现 `sourceType` 选项**: 修改 `Parser.parse` 函数，使其可以接收 `options` 对象，例如 `Parser.parse(code, { sourceType: 'module' })`。将这个 `sourceType` 存储在解析器实例中，并在 `parseTopLevel` 创建 `Program` 节点时使用它。
2.  **思考 `try...catch`**: `parse` 方法是库的入口，它应该对用户友好。如果解析过程中 `raise` 抛出了错误，这个错误应该被 `parse` 方法捕获，并可以被重新包装成更友好的格式再抛出。请思考应该在哪里放置 `try...catch` 块？