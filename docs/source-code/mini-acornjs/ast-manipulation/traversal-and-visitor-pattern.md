# 35. AST 遍历与访问：Visitor 模式的应用

到目前为止，我们已经投入了大量精力来构建一个能够将 JavaScript 代码精确转换为抽象语法树（AST）的解析器。现在，我们拥有了代码的结构化表示，但这仅仅是第一步。一个静态的 AST 本身意义有限，它的真正威力在于被“消费”——被读取、分析、转换，最终服务于各种强大的工具。

欢迎来到本书的第六部分——**AST 应用**。在这一部分，我们将把目光从“如何构建 AST”转向“如何使用 AST”。而所有 AST 应用的起点，都是**遍历（Traversal）**。

本章，我们将学习如何科学、高效地“走访”我们辛辛苦苦解析出来的 AST，并引入一个强大的设计模式——**访问者模式（Visitor Pattern）**，它将成为我们后续所有 AST 操作的基石。

## 为什么需要遍历 AST？

想象一下，你想实现以下这些功能：

-   **代码压缩 (Minification)**: 需要找到所有的变量声明，并将变量名（如 `longVariableName`）替换为更短的名称（如 `a`）。
-   **代码转换 (Transpilation)**: 比如将 ES6 的箭头函数转换为 ES5 的普通函数。你需要找到所有的 `ArrowFunctionExpression` 节点，并将其替换为 `FunctionExpression` 节点。
-   **静态分析与 Linter**: 比如检查是否有没有被使用过的变量。你需要收集所有的变量声明和变量引用，然后进行比对。

所有这些任务的共同点是：它们都需要系统性地检查 AST 中的每一个节点，找到感兴趣的目标，然后执行某些操作。这个“系统性地检查”过程，就是 AST 遍历。

## 遍历策略：深度优先搜索 (DFS)

AST 是一棵树，遍历树最自然、最常用的算法就是**深度优先搜索（Depth-First Search, DFS）**。它的工作方式与代码的嵌套结构天然吻合：从根节点开始，深入到最深层的子节点，然后再回溯。

例如，对于代码 `const a = 1;`，其简化的 AST 如下：

```json
{
  "type": "VariableDeclaration",
  "declarations": [
    {
      "type": "VariableDeclarator",
      "id": { "type": "Identifier", "name": "a" },
      "init": { "type": "Literal", "value": 1 }
    }
  ]
}
```

深度优先遍历的路径会是：

1.  `VariableDeclaration`
2.  `VariableDeclarator` (进入 `declarations` 数组)
3.  `Identifier` (进入 `id` 属性)
4.  `Literal` (进入 `init` 属性)

## 访问者模式 (Visitor Pattern)

直接在遍历算法中硬编码处理逻辑（比如 `if (node.type === 'Identifier') { ... }`）是一种糟糕的设计。它会将“遍历逻辑”和“节点处理逻辑”紧紧耦合在一起，难以维护和扩展。

更好的方法是使用**访问者模式**。这个模式的核心思想是**解耦**：

-   **遍历器 (Traverser/Walker)**: 它只负责一件事——如何高效地遍历整棵树。它不关心每个节点具体要干什么。
-   **访问者 (Visitor)**: 它也只负责一件事——定义了在遇到特定类型的节点时，应该执行什么操作。它不关心节点是如何被找到的。

我们将实现一个通用的 `traverse` 函数，它接受 AST 和一个 `visitor` 对象，然后让它们协同工作。

```javascript
// traverse(ast, visitor);

const visitor = {
  // 当遇到 Identifier 节点时，调用这个函数
  Identifier(node, parent) {
    console.log("Found an Identifier:", node.name);
  },
  // 当遇到 FunctionDeclaration 节点时，调用这个函数
  FunctionDeclaration(node, parent) {
    // ...
  }
};
```

### `enter` 与 `exit`：两个关键时机

在深度优先遍历中，每个节点实际上都会被访问两次：

1.  **进入 (enter)**: 第一次访问到该节点，此时它的子节点还**没有**被访问。
2.  **退出 (exit)**: 当该节点的所有子节点都已经被访问完毕，即将回溯到父节点时。

这两个时机对于不同的任务至关重要。

-   `enter`: 适合自上而下传递信息。例如，当进入一个函数作用域时，可以将作用域信息传递给其内部的所有节点。
-   `exit`: 适合自下而上进行操作。例如，当你想替换一个节点时，最好在它的所有子节点都处理完毕后进行，以避免影响子节点的遍历。

我们的 `visitor` 对象可以支持这种精细的控制：

```javascript
const visitor = {
  Identifier: {
    enter(node, parent) {
      console.log('Entering Identifier:', node.name);
    },
    exit(node, parent) {
      console.log('Exiting Identifier:', node.name);
    }
  }
};
```

## 实现 `traverse` 函数

现在，我们来构建这个核心的 `traverse` 函数。它通常包含一个外部的入口函数和一个内部的递归 `walk` 函数。

```javascript
// ast-manipulation/traverse.js (一个新文件)

function traverse(ast, visitor) {
  function walk(node, parent) {
    // 1. 调用 visitor 的 enter 方法
    const visitorMethods = visitor[node.type];
    if (visitorMethods && visitorMethods.enter) {
      visitorMethods.enter(node, parent);
    }

    // 2. 递归遍历子节点
    switch (node.type) {
      case 'Program':
      case 'BlockStatement':
        node.body.forEach(child => walk(child, node));
        break;

      case 'VariableDeclaration':
        node.declarations.forEach(child => walk(child, node));
        break;

      case 'VariableDeclarator':
        walk(node.id, node);
        if (node.init) walk(node.init, node);
        break;

      case 'FunctionDeclaration':
        if (node.id) walk(node.id, node);
        node.params.forEach(param => walk(param, node));
        walk(node.body, node);
        break;

      // ... 需要为所有可能包含子节点的 AST 类型添加 case

      // 对于没有子节点的叶子节点，如 Identifier, Literal，则什么也不做
      case 'Identifier':
      case 'Literal':
        break;
    }

    // 3. 调用 visitor 的 exit 方法
    if (visitorMethods && visitorMethods.exit) {
      visitorMethods.exit(node, parent);
    }
  }

  walk(ast, null); // 从根节点开始遍历
}
```

> **注意**: 上述 `switch` 语句只是一个示例，一个完备的 `traverse` 函数需要覆盖 ESTree 规范中所有包含子节点的节点类型。像 Babel 和 Acorn 的 `walk` 库已经为我们做好了这一切。

## 实践一下：收集所有变量名

假设我们想用新建的 `traverse` 函数来收集代码中声明的所有变量名。

```javascript
import { parse } from '../src/parser';
import { traverse } from './traverse';

const code = `
  const a = 1;
  let b = 2;
  function greet() {
    var c = 3;
  }
`;

const ast = parse(code);
const declaredNames = [];

traverse(ast, {
  // 我们只关心 VariableDeclarator 节点，因为它直接持有变量名
  VariableDeclarator: {
    enter(node, parent) {
      // node.id 就是一个 Identifier 节点
      declaredNames.push(node.id.name);
    }
  }
});

console.log(declaredNames); // 输出: ['a', 'b', 'c']
```

看！我们不需要写任何递归代码，只需提供一个简单的 `visitor` 对象，就轻松地从复杂的 AST 中提取出了我们想要的信息。这就是访问者模式的优雅之处。

## 总结

在本章中，我们为 AST 的应用铺平了道路。我们学习了：

-   AST 遍历是几乎所有代码分析和转换工具的基础。
-   深度优先搜索（DFS）是遍历 AST 的标准算法。
-   访问者模式（Visitor Pattern）是实现 AST 遍历的优雅方案，它将“遍历逻辑”与“节点处理逻辑”完美解耦。
-   `enter` 和 `exit` 两个访问时机为我们提供了对遍历过程的精细控制。

我们亲手实现了一个简化版的 `traverse` 函数，并用它解决了一个实际问题。现在，我们已经掌握了访问和操作 AST 的核心技术。在下一章，我们将基于本章的成果，挑战一个更令人兴奋的任务——**代码生成**，即如何将 AST 重新变回可执行的 JavaScript 代码。
