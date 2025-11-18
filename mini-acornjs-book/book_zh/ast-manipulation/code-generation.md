# 36. 代码生成：将 AST 转换回 JavaScript 代码

在上一章，我们学会了如何使用访问者模式来遍历 AST。现在，我们将利用这项技能来完成一个编译流程中的经典收尾工作——**代码生成（Code Generation）**。代码生成的任务很简单：接收一个 AST，然后输出一个字符串，这个字符串就是符合目标语言语法的代码。

这个过程就像是“看图说话”，AST 就是那张结构图，而生成的代码就是我们说出的话。它是所有代码转换器（Babel）、格式化工具（Prettier）和打包工具（Webpack）的最后一步。完成这一章后，我们的 `mini-acorn` 项目将形成一个完整的闭环：`Code -> AST -> Code`。

## 代码生成的核心原理

代码生成的过程，本质上又是一次对 AST 的**深度优先遍历**。它的逻辑非常直观：

1.  定义一个 `generate` 函数，接收一个 AST 节点。
2.  在函数内部，根据节点的 `type`，分发到不同的、专门处理该类型节点的“生成器”函数（如 `generateIdentifier`、`generateVariableDeclaration`）。
3.  每个生成器函数负责将当前节点“打印”成字符串。如果这个节点有子节点，那么它会**递归地**调用 `generate` 函数来打印子节点，最后将所有部分拼接成最终的字符串。

这个过程可以看作是解析过程的“逆操作”。

## 实现一个简单的代码生成器

我们将创建一个 `generate` 函数，它将是所有生成逻辑的入口。我们将把不同节点类型的生成逻辑放在一个对象或 `switch` 语句中。

```javascript
// ast-manipulation/generator.js (一个新文件)

function generate(node) {
  switch (node.type) {
    case 'Program':
      return node.body.map(generate).join('\n');

    case 'ExpressionStatement':
      return generate(node.expression) + ';';

    case 'Identifier':
      return node.name;

    case 'Literal':
      return node.raw;

    case 'VariableDeclaration':
      return `${node.kind} ${node.declarations.map(generate).join(', ')};`;

    case 'VariableDeclarator':
      return `${generate(node.id)}${node.init ? ' = ' + generate(node.init) : ''}`;

    case 'BinaryExpression':
      // 简化版，未处理操作符优先级
      return `${generate(node.left)} ${node.operator} ${generate(node.right)}`;

    case 'FunctionDeclaration':
      return `function ${generate(node.id)}(${node.params.map(generate).join(', ')}) {\n${generate(node.body)}\n}`;

    case 'BlockStatement':
      return node.body.map(generate).join('\n');

    default:
      throw new TypeError("Unsupported node type: " + node.type);
  }
}
```

### 实践一下

让我们用这个简单的生成器来“翻译”一段代码的 AST。

```javascript
import { parse } from '../src/parser';
import { generate } from './generator';

const code = 'const a = 1 + 2;';
const ast = parse(code);

const generatedCode = generate(ast);

console.log(generatedCode);
// 输出: const a = 1 + 2;
```

成功了！我们把 AST 又变回了代码。这个简单的生成器虽然能工作，但它忽略了很多现实世界中的复杂性。

## 代码生成的挑战

一个生产级的代码生成器远比上面的例子复杂，它需要处理两个核心挑战：

### 1. 操作符优先级与括号

我们之前的 `generateBinaryExpression` 实现有一个严重的问题。考虑 `2 * (3 + 4)`，其 AST 大致是：

```
BinaryExpression('*')
  left: Literal(2)
  right: BinaryExpression('+')
    left: Literal(3)
    right: Literal(4)
```

如果我们用之前的简单生成器，会得到 `2 * 3 + 4`，这在数学上是错误的！因为 `+` 的优先级低于 `*`，当它作为 `*` 的子节点时，必须被括号 `()` 包围。

一个健壮的生成器需要维护一个操作符优先级表。在生成 `BinaryExpression` 时，比较父节点和子节点的操作符优先级，如果子节点的优先级更低，就自动为子节点生成的代码添加括号。

### 2. 代码格式化

我们的生成器生成的代码是紧凑的，没有任何缩进。这对于机器执行没有问题，但对于人类阅读却是一场灾难。一个好的代码生成器，比如 Prettier，其核心复杂性就在于如何根据一套规则来决定在哪里换行、添加多少缩进和空格，以生成最美观、最可读的代码。

实现这一点通常需要在递归生成时传递一个“状态”对象，其中包含当前的缩进级别。当进入一个 `BlockStatement` 时，缩进级别加一；退出时，减一。

```javascript
// 伪代码
function generateBlockStatement(node, state) {
  let code = '{\n';
  state.indent++;
  code += node.body.map(child => '  '.repeat(state.indent) + generate(child, state)).join('\n');
  state.indent--;
  code += '\n' + '  '.repeat(state.indent) + '}';
  return code;
}
```

## “往返测试” (Round-trip Testing)

如何验证我们的代码生成器是否正确？一个常见且有效的方法是进行“往返测试”：

1.  **解析**: `const ast = parse(originalCode);`
2.  **生成**: `const generatedCode = generate(ast);`
3.  **再次解析**: `const newAst = parse(generatedCode);`
4.  **对比**: `assert.deepEqual(ast, newAst);`

如果原始 AST 和从生成代码中再次解析出的 AST 是完全相同的，那么我们就可以很有信心地说，我们的代码生成器在语法层面上是正确的（即使格式可能不同）。

## 总结

在本章，我们完成了从 AST 到代码的逆向工程，为我们的 `mini-acorn` 项目画上了一个完美的句号。我们学习了：

-   代码生成是通过深度优先遍历，将每个 AST 节点递归地“打印”成字符串。
-   通过为每种节点类型编写专门的生成器函数，我们可以将结构化的 AST 转换回文本代码。
-   生产级的代码生成器需要精细地处理操作符优先级（通过加括号）和代码格式化（通过管理缩进和换行）。
-   “往返测试”是验证代码生成器正确性的强大策略。

至此，第六部分“AST 应用”结束。我们不仅学会了如何遍历 AST，还学会了如何将其转换回代码。我们已经拥有了一套完整的微型编译工具链！

在接下来的第七部分“高级特性”中，我们将探讨如何让我们的解析器变得更强大、更灵活、更健壮，比如为其添加插件系统、生成 Source Map 等。准备好迎接更高级的挑战吧！
