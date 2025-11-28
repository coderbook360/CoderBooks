# Acorn 架构概览：认识核心模块与流程

在上一章中，我们了解了编译原理的基础知识，知道了从源代码到抽象语法树（AST）需要经历词法分析和语法分析两个阶段。从本章开始，我们将正式进入 `mini-acorn` 的实战构建。第一步，也是最重要的一步，就是理解 Acorn 的整体架构设计。

一个设计精良的解析器，其内部模块一定是高度解耦、各司其职的。Acorn 作为一个高性能的 JavaScript 解析器，其架构设计堪称典范。理解了它的核心组件和工作流程，我们才能在后续的章节中游刃有余地进行编码实现。

## 1. 动机与问题描述：我们为什么需要一个清晰的架构？

想象一下，如果让你直接开始编写一个 JavaScript 解析器，你可能会感到无从下手。

- 代码应该如何组织？是写在一个巨大的文件里，还是拆分成多个模块？
- 词法分析器和语法分析器应该如何协作？是词法分析器先将所有代码转换成 Token，还是语法分析器需要时才向词法分析器请求下一个 Token？
- 解析过程中产生的状态（比如当前解析到第几行、第几列，当前处于哪个语法上下文中）应该如何管理？

这些问题都指向一个核心：我们需要一个清晰、合理、可扩展的架构。一个好的架构能够帮助我们：

- **分离关注点 (Separation of Concerns)**：将复杂的解析过程拆解为独立的、易于理解和维护的模块。
- **管理状态 (State Management)**：有效地追踪和管理贯穿整个解析过程的上下文信息。
- **提升可扩展性 (Extensibility)**：方便地增加新功能（例如支持新的语法特性）或进行优化。

Acorn 的架构正是围绕这些目标设计的。

## 2. Acorn 的三大核心组件

Acorn 的架构可以被精炼地概括为三大核心组件：`Parser`、`Tokenizer` 和 `State`。

| 组件 | 核心职责 | 描述 |
| :--- | :--- | :--- |
| **`Parser`** | **语法分析** | 驱动整个解析流程，负责实现语法规则，构建 AST。 |
| **`Tokenizer`** | **词法分析** | 负责读取源代码字符流，并将其转换为 Token 序列。 |
| **`State`** | **状态管理** | 存储和管理解析过程中的所有上下文信息。 |

这三个组件的关系可以这样理解：

- **`Parser` 是指挥官**：它定义了“如何解析”（例如，一个 `if` 语句应该如何解析）。当它需要一个“单词”（Token）时，它会向 `Tokenizer` 发出请求。
- **`Tokenizer` 是侦察兵**：它负责深入源代码的“战场”，识别出每一个有意义的“单词”（Token），然后报告给 `Parser`。
- **`State` 是作战地图**：它记录了当前“战局”的所有信息，比如“侦察兵”当前的位置（`pos`）、当前的行号（`line`）和列号（`column`），以及当前的上下文（例如，是否在 `async` 函数内）。`Parser` 和 `Tokenizer` 都依赖 `State` 来获取和更新这些信息。

## 3. Acorn 工作流程的可视化

为了更直观地理解这三者如何协作，我们可以看一个简化的 `parse` 函数入口的伪代码和流程图。

**伪代码:**

```javascript
function parse(input, options) {
  // 1. 创建一个 Parser 实例
  //    - 在内部，Parser 会初始化一个 State 对象来管理状态
  //    - State 对象会持有输入的代码 `input`
  //    - Parser 自身也扮演了 Tokenizer 的角色，包含了词法分析的方法
  const parser = new Parser(options, input);

  // 2. 调用 Parser 的核心方法 `parse`
  const ast = parser.parse();

  // 3. 返回最终的 AST
  return ast;
}

// Parser 内部的核心 `parse` 方法
class Parser {
  // ...
  parse() {
    // 2a. 获取第一个 Token，为解析做好准备
    this.nextToken(); 
    
    // 2b. 调用顶层解析方法，开始解析整个程序
    return this.parseTopLevel(); 
  }
  // ...
}
```

**工作流程图:**

```mermaid
graph TD
    A[外部调用 `parse(code)`] --> B{创建 `Parser` 实例};
    B --> C{初始化 `State` 对象 (包含代码 `code`)};
    C --> D[Parser 持有 State];
    A --> E{调用 `parser.parse()`};
    E --> F{`parser.nextToken()`: 请求第一个 Token};
    F --> G[Tokenizer 读取字符流];
    G --> H{生成 Token};
    H --> I[更新 State (pos, line, column)];
    I --> J[Parser 获得 Token];
    J --> K{`parser.parseTopLevel()`: 开始语法分析};
    K --> L{递归下降解析...};
    L -- 请求下一个 Token --> F;
    L -- 构建 AST 节点 --> M[AST];
    K --> N[返回 Program 节点];
    N --> O[最终 AST];
```

从上图可以看出，整个流程是一个由 `Parser` 主导，`Tokenizer` 提供 Token，`State` 记录状态的闭环。语法分析器（`Parser`）在需要时才向词法分析器（`Tokenizer`）请求下一个 Token，这种模式被称为“按需词法分析”（Scannerless Parsing 或 On-demand Lexical Analysis），它比一次性生成所有 Token 的方式更高效，内存占用也更低。

## 4. 边界与错误处理

- **输入边界**：如果输入的是空字符串，解析器应该返回一个空的 `Program` 节点。
- **错误恢复**：当遇到语法错误时，一个健壮的解析器会尝试恢复并继续解析，而不是立即崩溃。Acorn 通过其插件系统和内部的错误处理机制，可以在一定程度上实现错误恢复。我们将在后续章节深入探讨。

## 5. 总结与练习

本章我们学习了 Acorn 的核心架构，它由 `Parser`、`Tokenizer` 和 `State` 三大组件构成。

- **`Parser`** 是语法分析的核心，驱动整个流程。
- **`Tokenizer`** 负责词法分析，按需生成 Token。
- **`State`** 是一个集中的状态管理器，存储所有上下文信息。

这种清晰的架构分离了关注点，使得代码更易于理解和维护。

**练习:**

1.  **画图**：尝试自己重新画一遍 Acorn 的核心工作流程图，确保你理解了 `Parser`、`Tokenizer` 和 `State` 之间的交互关系。
2.  **思考**：为什么“按需词法分析”比一次性生成所有 Token 更高效？它在哪些方面节省了资源？
3.  **蓝图**：基于本章的知识，为你自己的 `mini-acorn` 项目规划出初始的文件结构。你会创建哪些文件或类来分别承载 `Parser`、`Tokenizer` 和 `State` 的功能？

在下一章，我们将开始深入词法分析的细节，亲手实现我们的 `Tokenizer`。