# 抽象语法树（AST）：代码的结构化表示

在上一章中，我们看到 Parser 将 Token 流转换成了 AST。但 AST 到底是什么？为什么需要它？它在 V8 的执行过程中扮演什么角色？

让我们从一个最直观的问题开始：**为什么计算机不能直接理解 Token 流？**

比如这段代码：
```javascript
1 + 2 * 3
```

Scanner 会把它变成一个扁平的列表：`[1, +, 2, *, 3]`。

如果我们直接按顺序执行，结果是 `(1+2)*3 = 9`。但这显然是错的！根据数学规则，乘法优先级高于加法，结果应该是 `7`。

为了正确表达这种**优先级**和**嵌套关系**，我们需要一种更高级的数据结构——**树**。

## 什么是 AST？

### 代码的骨架

**抽象语法树**（Abstract Syntax Tree，AST）就是代码的结构化表示。它丢弃了所有无关紧要的细节（如空格、注释、括号），只保留了代码的**逻辑结构**。

对于 `1 + 2 * 3`，它的 AST 形状是这样的：

```
      +
     / \
    1   *
       / \
      2   3
```

看！这棵树完美地表达了运算顺序：
1. 先计算底层的 `2 * 3`
2. 再将结果与 `1` 相加

这就是 AST 的魔力：**它用树的层级关系，隐含了执行顺序。**

### AST 的作用：不仅仅是编译

AST 是计算机科学中最重要的数据结构之一。它不仅是 V8 的中间产物，更是整个前端工具链的基石。

想一想你每天使用的工具：
- **Babel**：怎么把 ES6 转成 ES5？它先把代码解析成 AST，修改 AST 节点（把 `const` 改成 `var`），再生成新代码。
- **ESLint**：怎么检查你有没有用未定义的变量？它遍历 AST，分析变量的作用域。
- **Prettier**：怎么格式化代码？它忽略你的空格，根据 AST 重新打印出漂亮的代码。

可以说，**掌握了 AST，你就掌握了操纵代码的上帝之手**。

## AST 的节点类型

AST 由各种类型的节点组成。根据 ESTree 规范（JavaScript AST 的事实标准），节点主要分为三大类：

### 表达式节点（Expressions）

表达式是会产生值的代码片段。

**字面量表达式**（Literal）：

```javascript
42              // NumericLiteral
"hello"         // StringLiteral
true            // BooleanLiteral
null            // NullLiteral
```

**二元表达式**（BinaryExpression）：

```javascript
a + b           // operator: "+"
x * y           // operator: "*"
m === n         // operator: "==="
```

AST 表示：

```json
{
  "type": "BinaryExpression",
  "operator": "+",
  "left": { "type": "Identifier", "name": "a" },
  "right": { "type": "Identifier", "name": "b" }
}
```

**函数调用表达式**（CallExpression）：

```javascript
console.log("Hello")
Math.max(1, 2, 3)
```

AST 表示：

```json
{
  "type": "CallExpression",
  "callee": {
    "type": "MemberExpression",
    "object": { "type": "Identifier", "name": "console" },
    "property": { "type": "Identifier", "name": "log" }
  },
  "arguments": [
    { "type": "Literal", "value": "Hello" }
  ]
}
```

**成员访问表达式**（MemberExpression）：

```javascript
object.property     // 点号访问
array[index]        // 方括号访问
```

### 语句节点（Statements）

语句是执行某个动作的代码片段，不产生值。

**变量声明**（VariableDeclaration）：

```javascript
let count = 0;
```

AST 表示：

```json
{
  "type": "VariableDeclaration",
  "kind": "let",
  "declarations": [{
    "type": "VariableDeclarator",
    "id": { "type": "Identifier", "name": "count" },
    "init": { "type": "Literal", "value": 0 }
  }]
}
```

**条件语句**（IfStatement）：

```javascript
if (x > 0) {
  console.log("positive");
} else {
  console.log("non-positive");
}
```

**循环语句**（ForStatement, WhileStatement）：

```javascript
for (let i = 0; i < 10; i++) {
  // loop body
}
```

**函数声明**（FunctionDeclaration）：

```javascript
function greet(name) {
  return `Hello, ${name}`;
}
```

### 程序结构节点

**Program**：根节点，代表整个程序

```json
{
  "type": "Program",
  "body": [
    // 顶层语句和声明
  ]
}
```

**BlockStatement**：代码块 `{}`

```javascript
{
  let x = 1;
  console.log(x);
}
```

## 完整示例：从代码到 AST

让我们通过一个完整的例子，深入理解 AST 的结构。

**源代码**：

```javascript
function add(a, b) {
  return a + b;
}

let result = add(5, 3);
```

**完整 AST**：

```json
{
  "type": "Program",
  "body": [
    {
      "type": "FunctionDeclaration",
      "id": { "type": "Identifier", "name": "add" },
      "params": [
        { "type": "Identifier", "name": "a" },
        { "type": "Identifier", "name": "b" }
      ],
      "body": {
        "type": "BlockStatement",
        "body": [{
          "type": "ReturnStatement",
          "argument": {
            "type": "BinaryExpression",
            "operator": "+",
            "left": { "type": "Identifier", "name": "a" },
            "right": { "type": "Identifier", "name": "b" }
          }
        }]
      }
    },
    {
      "type": "VariableDeclaration",
      "kind": "let",
      "declarations": [{
        "type": "VariableDeclarator",
        "id": { "type": "Identifier", "name": "result" },
        "init": {
          "type": "CallExpression",
          "callee": { "type": "Identifier", "name": "add" },
          "arguments": [
            { "type": "Literal", "value": 5 },
            { "type": "Literal", "value": 3 }
          ]
        }
      }]
    }
  ]
}
```

**树形可视化**：

```
Program
├── FunctionDeclaration (add)
│   ├── params: [a, b]
│   └── body: BlockStatement
│       └── ReturnStatement
│           └── BinaryExpression (+)
│               ├── left: Identifier (a)
│               └── right: Identifier (b)
└── VariableDeclaration (let)
    └── VariableDeclarator (result)
        └── init: CallExpression (add)
            ├── arguments[0]: Literal (5)
            └── arguments[1]: Literal (3)
```

从这个例子可以看出：
- AST 是递归的树形结构
- 每个节点都有 `type` 字段标识节点类型
- 节点的子节点通过特定字段（如 `body`、`argument`、`left`、`right`）连接
- 叶子节点通常是 `Identifier` 或 `Literal`

## V8 如何使用 AST

在 V8 的执行流程中，AST 是关键的中间环节：

### 从 Parser 到 AST

Parser 的输出就是 AST。V8 的 Parser 在解析过程中，会：

1. **构建节点**：为每个语法结构创建对应的 AST 节点
2. **建立层次**：将节点按照语法关系连接成树
3. **记录元信息**：记录每个节点在源码中的位置（用于错误提示和调试）

### 从 AST 到字节码

Ignition 解释器会遍历 AST，将其编译成字节码：

1. **遍历 AST**：采用深度优先遍历
2. **生成字节码**：为每个节点生成对应的字节码指令
3. **优化处理**：在编译过程中进行一些简单的优化（如常量折叠）

比如，`return a + b;` 这个 ReturnStatement 节点会被编译成：

```
Ldar a0       // 加载参数 a
Add a1        // 与参数 b 相加
Return        // 返回结果
```

### AST 的生命周期

在 V8 中，AST 的生命周期很短：

1. Parser 生成 AST
2. Ignition 将 AST 编译成字节码
3. **AST 被丢弃**，释放内存

这也是为什么 V8 5.9 版本引入 Ignition 后，内存占用大幅下降的原因之一——字节码比 AST 紧凑得多。

## AST 在工具链中的应用

AST 不仅在 V8 中至关重要，它也是现代 JavaScript 工具链的基石。

### Babel：代码转译

Babel 是最著名的 JavaScript 转译器，它的核心工作流程就是基于 AST：

```
ES6+ 代码
    ↓ parse
   AST
    ↓ transform（转换 AST）
  新的 AST
    ↓ generate
ES5 代码
```

比如，Babel 将箭头函数转换为普通函数：

```javascript
// 输入
const add = (a, b) => a + b;

// Babel 转换 AST
// ArrowFunctionExpression → FunctionExpression

// 输出
const add = function(a, b) {
  return a + b;
};
```

### ESLint：代码检查

ESLint 通过遍历 AST 来检查代码规范：

```javascript
//规则：禁止使用 console
{
  "no-console": "error"
}

// ESLint 检查 AST，查找 CallExpression 节点
// 如果 callee 是 console.xxx，报告错误
```

### Prettier：代码格式化

Prettier 的工作流程是：

```
代码 → AST → 按照规则重新生成代码
```

它完全忽略原始代码的格式，根据 AST 重新生成符合规范的代码。

### webpack：模块打包

webpack 通过分析 AST 来识别模块依赖：

```javascript
// webpack 解析这段代码的 AST
import { something } from './module';
const lazy = () => import('./lazy-module');

// 识别 ImportDeclaration 和 CallExpression (import())
// 建立依赖图
```

## 如何查看和操作 AST

### 使用在线工具

最简单的方式是使用在线 AST 浏览器：

- **AST Explorer**（https://astexplorer.net/）：支持多种解析器，实时查看 AST
- **Babel REPL**（https://babeljs.io/repl）：查看 Babel 的转换过程

### 使用代码生成 AST

可以使用 `@babel/parser` 或 `acorn` 等库：

```javascript
const parser = require('@babel/parser');

const code = 'const a = 1 + 2;';
const ast = parser.parse(code);

console.log(JSON.stringify(ast, null, 2));
```

### 遍历和修改 AST

使用 `@babel/traverse` 遍历 AST：

```javascript
const traverse = require('@babel/traverse').default;

traverse(ast, {
  // 访问所有的二元表达式
  BinaryExpression(path) {
    console.log(path.node.operator);
  }
});
```

## AST 的优势与局限

### 优势

1. **结构化**：比字符串更易于程序化处理
2. **语义明确**：每个节点都有清晰的语义
3. **可转换**：易于进行代码转换和优化
4. **工具友好**：各种工具都基于 AST 工作

### 局限

1. **内存占用**：AST 比源码占用更多内存
2. **构建成本**：解析生成 AST 需要时间
3. **信息丢失**：格式、注释等信息可能丢失（除非特意保留）

这也是为什么 V8 在生成字节码后立即丢弃 AST，以及引入预解析机制的原因。

## 本章小结

本章我们深入探索了抽象语法树（AST）。核心要点包括：

1. **AST 的定义**：代码的树形结构化表示，省略了字面细节，保留了语义结构
2. **节点类型**：表达式节点、语句节点、程序结构节点
3. **在 V8 中的作用**：Parser 的输出，Ignition 的输入
4. **工具链应用**：Babel、ESLint、Prettier、webpack 等都基于 AST

AST 是理解编译原理和现代 JavaScript 工具链的关键。虽然在实际开发中我们很少直接操作 AST，但理解它能让我们：

- 更好地理解 Babel 等工具的工作原理
- 编写自定义的代码转换工具
- 深入理解 V8 的执行流程

下一章，我们将看到 Ignition 如何将 AST 转换成字节码，以及字节码是如何被解释执行的。

---

**思考题**：

1. 为什么 AST 要"抽象"掉括号、分号等细节？这些信息在什么情况下是必要的？
2. 如果你要设计一个代码混淆工具，你会如何利用 AST？
3. V8 为什么在生成字节码后立即丢弃 AST，而不是保留它以便后续优化使用？
