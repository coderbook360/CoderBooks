# 33. 深入作用域：构建符号表与作用域链

到目前为止，我们的 `mini-acorn` 已经成为一个相当出色的“语法家”。它能准确地将一串串 JavaScript 代码分解为结构化的 AST。然而，它对代码的“意义”仍然一无所知。例如，当它看到一个标识符 `a` 时，它只知道“这是一个标识符”，却不知道这个 `a` 是在哪里定义的，它是一个变量、一个函数，还是一个从未被声明过的幽灵？

为了让解析器拥有初步的“理解”能力，我们需要引入一个在编译原理中至关重要的概念——**符号表（Symbol Table）**。本章，我们将暂停添加新的语法功能，转而深入解析器的内部，探讨如何构建作用域和符号表，为将来的静态分析（如 Linter、类型检查）和代码转换打下坚实的基础。

## 核心概念：作用域与符号表

-   **作用域 (Scope)**: 这是一个大家都很熟悉的概念，它定义了代码中变量、函数和类等标识符的可访问性。在 ES6 之后，JavaScript 主要有三种作用域：
    -   全局作用域 (Global Scope)
    -   函数作用域 (Function Scope)
    -   块级作用域 (Block Scope)，由 `let`、`const` 和 `class` 引入。

-   **符号表 (Symbol Table)**: 如果说作用域是一个“区域”，那么符号表就是这个区域的“户籍簿”。它是一个数据结构（通常是哈希表或 Map），用于存储在特定作用域内声明的所有标识符及其相关信息（如类型、声明节点等）。每个作用域都拥有自己的符号表。

-   **作用域链 (Scope Chain)**: 当在代码中引用一个变量时，引擎会首先在当前作用域的符号表中查找。如果找不到，它会“冒泡”到上一层作用域继续查找，这个由内向外的查找路径就构成了作用域链。

## 为什么在解析阶段构建符号表？

你可能会问：这些不是 JavaScript 引擎在运行时做的事情吗？为什么我们在解析阶段就要关心它？

答案是，提前在解析（静态）阶段构建符号表，能赋予我们强大的代码分析能力：

1.  **错误检测**: 我们可以立即发现对未声明变量的引用，或者重复声明同一个变量等错误。
2.  **变量重命名/混淆**: 在代码压缩工具中，我们需要知道一个变量在哪些作用域中是安全的，才能对它进行重命名。
3.  **Linter 实现**: ESLint 等工具需要知道变量的定义和使用情况，才能给出“变量已定义但从未使用”之类的提示。
4.  **智能提示与补全**: IDE 的智能提示功能依赖于对当前作用域中可用变量的了解。

## 在 `mini-acorn` 中实现作用域管理

我们的目标是在解析 AST 的同时，动态地构建和维护一个作用域链。最经典的数据结构就是“作用域栈”（Scope Stack）。

-   当进入一个新作用域时，创建一个新的符号表，并将其**压入**栈顶。
-   当离开一个作用域时，将栈顶的符号表**弹出**。
-   当声明一个新变量时，将其信息注册到**栈顶**的符号表中。
-   当查找一个变量时，从栈顶**由上至下**依次查找每个符号表。

### 1. 创建一个 `Scope` 和 `ScopeStack`

首先，我们来设计这两个核心的数据结构。

```javascript
// src/scope.js (一个新文件)

// 作用域类，本质是一个符号表
class Scope {
  constructor(parent = null) {
    this.parent = parent; // 指向父作用域
    this.declarations = new Map(); // 存储声明
  }

  // 注册一个声明
  define(name, node) {
    this.declarations.set(name, node);
  }

  // 查找一个声明
  find(name) {
    let current = this;
    while (current) {
      if (current.declarations.has(name)) {
        return current.declarations.get(name);
      }
      current = current.parent;
    }
    return null; // 未找到
  }
}

// 作用域栈管理器
class ScopeStack {
  constructor() {
    this.current = new Scope(); // 从全局作用域开始
  }

  // 进入新作用域
  enter() {
    this.current = new Scope(this.current);
  }

  // 退出作用域
  exit() {
    this.current = this.current.parent;
  }

  // 在当前作用域定义
  define(name, node) {
    this.current.define(name, node);
  }

  // 查找
  find(name) {
    return this.current.find(name);
  }
}
```

### 2. 将作用域栈集成到解析器

现在，我们需要在 `Parser` 中使用 `ScopeStack`，并在解析到特定节点时调用它的方法。

```javascript
// src/parser.js

import { ScopeStack } from './scope'; // 引入

class Parser {
  constructor(input) {
    // ...
    this.scopeStack = new ScopeStack(); // 初始化
  }

  // ...
}
```

### 3. 在关键节点处管理作用域

我们需要找到创建作用域的“时机”，即在相应的解析方法中插入 `enter()` 和 `exit()` 调用。

-   **块级作用域 (`BlockStatement`)**: `let` 和 `const` 的关键。

    ```javascript
    // src/parser.js
    pp.parseBlock = function () {
      const node = this.startNode();
      this.scopeStack.enter(); // 进入块级作用域

      this.expect(tt.braceL);
      node.body = [];
      while (!this.eat(tt.braceR)) {
        node.body.push(this.parseStatement());
      }

      this.scopeStack.exit(); // 退出块级作用域
      return this.finishNode(node, "BlockStatement");
    };
    ```

-   **函数作用域 (`Function`)**: 函数参数和 `var` 的作用域。

    ```javascript
    // src/parser.js
    pp.parseFunction = function (node, isStatement, isAsync) {
      // ...
      this.scopeStack.enter(); // 进入函数作用域

      node.params = this.parseFunctionParams(); // 参数也在此作用域中
      node.body = this.parseBlock(); // 函数体是一个块，会再进入一层作用域

      this.scopeStack.exit(); // 退出函数作用域
      // ...
    };
    ```

### 4. 注册声明

当解析到变量声明时，我们需要将它们添加到当前作用域的符号表中。

```javascript
// src/parser.js

pp.parseVar = function (node, kind) {
  // ...
  for (const decl of node.declarations) {
    // decl.id 是一个 Identifier 节点
    this.scopeStack.define(decl.id.name, decl);
  }
  // ...
};
```

同样，在解析函数声明、类声明和函数参数时，也需要调用 `this.scopeStack.define()`。

## 实践一下

虽然我们没有在 `mini-acorn` 中完整实现这个机制，但现在你可以清晰地看到它的工作流程。想象一下解析这段代码：

```javascript
let a = 1;
function log() {
  let b = 2;
  console.log(a, b);
}
```

1.  **开始**: 创建全局作用域 `S0`。
2.  **`let a = 1;`**: 在 `S0` 中注册 `a`。
3.  **`function log() { ... }`**: 在 `S0` 中注册 `log`。然后进入函数体解析。
4.  **进入 `log` 函数**: 创建函数作用域 `S1`，其父是 `S0`。`S1` 成为当前作用域。
5.  **`let b = 2;`**: 在 `S1` 中注册 `b`。
6.  **`console.log(a, b)`**: 解析到标识符 `a`。在 `S1` 中查找，没找到。去父作用域 `S0` 中查找，找到了！解析到标识符 `b`。在 `S1` 中查找，找到了！
7.  **`log` 函数结束**: 退出 `S1`，当前作用域恢复为 `S0`。

## 总结

在本章中，我们从纯粹的语法解析，迈出了通往语义分析的第一步。我们学习了作用域、符号表和作用域链这些编译原理中的核心概念，并探讨了如何在我们的解析器中通过“作用域栈”这一经典数据结构来模拟它们。

通过在进入/退出特定节点时管理作用域，并在解析声明时注册符号，我们的解析器不再只是一个“结构翻译官”，它开始能够“理解”代码中标识符之间的关系。这个机制是实现任何高级代码分析工具（如 Linter、类型检查器、代码压缩器）的不可或-缺的基础设施。

在下一章，我们将挑战 ES 模块的解析，这是现代 JavaScript 应用的基石。