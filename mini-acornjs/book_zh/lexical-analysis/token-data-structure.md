# Token 数据结构设计

在上一章，我们了解了词法分析的宏观概念：将代码字符串转换为 Token 序列。现在，我们必须深入细节，回答一个核心问题：这个“Token”到底应该是什么样子的？一个健壮、高效的 Token 数据结构，是构建高性能解析器的基石。

## 1. 问题的提出：简单的字符串够用吗？

最直观的想法，或许是用一个简单的 JavaScript 对象来表示 Token，例如：

```javascript
// 一个代表 "let" 的 Token
{
  type: "Keyword",
  value: "let",
  start: 0,
  end: 3
}
```

在语法分析阶段，我们可以通过比较 `type` 字符串来判断 Token 类型：

```javascript
if (token.type === "Keyword") {
  // ...处理关键字
}
```

这种方法简单易懂，但在一个对性能和健壮性要求极高的解析器中，它暴露了几个严重的问题：

1.  **性能开销**：字符串的比较 (`===`) 通常比直接比较对象的引用要慢。当处理成千上万个 Token 时，这种微小的性能差异会被放大。
2.  **可维护性差**：如果开发时不小心拼写错误，比如写成了 `token.type === "Keywod"`，程序不会抛出任何异常，但会静默地失败，导致逻辑错误，这种 bug 非常难以追踪。
3.  **信息承载能力弱**：一个简单的字符串 `type` 无法携带额外的“元信息”（Metadata）。例如，我们后续在实现 Pratt 解析器时，需要知道一个操作符的“绑定强度”（binding power）；或者需要快速判断一个 Token 是不是赋值操作符。将这些信息硬编码在语法分析的逻辑中，会使代码变得混乱不堪。

为了解决这些问题，我们需要设计一个更专业、更强大的 Token 系统。

## 2. 解决方案：`TokenType` 与 `Token` 的分离

Acorn 和许多其他现代解析器采用了一种优雅的解决方案：将 Token 的“定义”与“实例”分离开来。

*   **`TokenType`**：这是一个用于 **定义** Token 类型的类。我们为每一种词法单元（如一个关键字、一个操作符）创建一个 `TokenType` 的唯一实例。它本身可以携带关于该类型的所有元信息。
*   **`Token`**：这是一个用于表示 **实例** 的类。词法分析器生成的每一个 Token 都是 `Token` 类的实例，它会引用一个 `TokenType` 实例作为其类型，并存储自己的值和位置信息。

让我们通过创建两个核心文件 `tokentype.js` 和 `token.js` 来实现这个系统。

### 2.1. `tokentype.js`: 定义所有 Token 的“类型”

这个文件是我们的“词典”，它定义了语言中所有可能出现的词法单元类型。我们将创建一个 `TokenType` 类，并用它来实例化所有具体的 Token 类型。

```javascript
// src/tokentype.js

export class TokenType {
  constructor(label, options = {}) {
    this.label = label; // 类型的字符串标签，用于调试和显示，如 "name", "num"
    this.keyword = options.keyword; // 如果是关键字，这里存储关键字的字符串
    // 在后续章节，我们会在这里为 Pratt 解析器添加更多元信息，例如：
    // this.binop = options.binop; // 运算符的优先级
    // this.prefix = options.prefix; // 是否是前缀操作符
  }
}

// 定义一个对象 tt，用于存储所有 TokenType 的实例
export const tt = {
  num: new TokenType("num"),
  string: new TokenType("string"),
  name: new TokenType("name"), // 标识符
  eof: new TokenType("eof"),   // End of File，文件结束符

  // 标点符号 (Punctuators)
  bracketL: new TokenType("["), // [
  bracketR: new TokenType("]"), // ]
  parenL: new TokenType("("),   // (
  parenR: new TokenType(")"),   // )
  dot: new TokenType("."),
  semi: new TokenType(";"),   // ;

  // 操作符 (Operators)
  assign: new TokenType("="),
  plus: new TokenType("+"),

  // 关键字 (Keywords)
  // 注意我们使用 _let 是因为 let 是 JS 的保留字
  _let: new TokenType("let", { keyword: "let" }),
  _if: new TokenType("if", { keyword: "if" }),
};

// 为了快速区分一个标识符是否是关键字，我们创建一个从关键字字符串到 TokenType 的映射
export const keywords = new Map([
  ["let", tt._let],
  ["if", tt._if],
]);
```

**设计解析**：

*   通过 `new TokenType()`，我们为每种类型创建了一个**唯一的对象实例**。现在，在语法分析中，我们可以使用高效的引用比较：`token.type === tt.num`。
*   `TokenType` 类像一个信息载体。`label` 属性用于调试，而 `keyword` 属性则清晰地标记出了哪些类型是关键字。
*   `keywords` 这个 `Map` 结构使得我们可以在 O(1) 的时间复杂度内判断一个读取到的标识符（如 `let`）是否是一个关键字。

### 2.2. `token.js`: 定义 Token 的“实例”

这个文件定义了词法分析器实际产出的对象结构。它非常简单，主要负责存储一个 Token 在代码中的具体信息。

```javascript
// src/token.js

export class Token {
  constructor(type, value, start, end, loc) {
    this.type = type;     // 一个 TokenType 实例 (e.g., tt.num)
    this.value = value;   // Token 的值 (e.g., 10)
    this.start = start;   // 在源码中的起始索引
    this.end = end;       // 在源码中的结束索引
    this.loc = loc;       // 一个包含 { line, column } 的位置对象
  }
}
```

现在，当词法分析器解析出数字 `10` 时，它会创建一个这样的实例：

```javascript
new Token(tt.num, 10, 10, 12, { ... });
```

## 3. 总结

通过将 Token 的“类型定义” (`TokenType`) 和“实例” (`Token`) 分离，我们构建了一套既高效又可扩展的系统。

*   **高效性**：使用对象引用比较 (`===`) 代替字符串比较。
*   **健壮性**：消除了因字符串拼写错误导致的 bug，因为 `tt.keywod` 会立即报错 `undefined`。
*   **可扩展性**：`TokenType` 类可以携带任意多的元信息，为后续复杂的语法分析（如运算符优先级）提供了强大的支持，而无需修改解析器的主体逻辑。

这套数据结构是 mini-acornjs 的核心基础之一。在下一章，我们将利用这个系统，开始编写词法分析器的骨架。

---

### 课后练习

1.  在 `src/tokentype.js` 中，为 `const`、`for`、`while` 这三个关键字添加 `TokenType` 定义，并记得更新 `keywords` 映射。
2.  同样在 `tokentype.js` 中，为 `*` (乘法)、`-` (减法)、`=>` (箭头) 这三个操作符添加 `TokenType` 定义。
3.  **思考题**：你认为 `true` 和 `false` 应该被定义成关键字，还是应该有自己独立的 `Boolean` Token 类型？为什么？（提示：从语法分析的角度思考，它们和普通标识符有什么区别？）