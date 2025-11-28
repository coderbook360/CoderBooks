# 解析后缀、调用与成员表达式：`a++`, `a()`, `a[]`

我们已经征服了表达式解析中最复杂的部分——中缀运算符的优先级和结合性。现在，我们来处理另一类非常重要且常见的表达式：**后缀表达式（Postfix Expression）**、**成员访问（Member Access）** 和 **函数调用（Function Call）**。

这些操作有一个共同点：它们都作用于一个已经存在的、位于它们左侧的表达式。在 Pratt 解析模型中，它们都属于 `led` (Left Denotation) 行为。它们的优先级非常高，仅次于原子表达式本身，高于所有二元运算符。

-   `a++` (后缀自增/自减)
-   `obj.prop` (点符号成员访问)
-   `arr[0]` (方括号成员访问)
-   `func(arg)` (函数调用)

为了处理这些操作，并支持 `a.b(c)[d]` 这样的链式调用，我们引入一个新的中间步骤：`parseSubscripts`。

## 一、新的解析流水线

我们的表达式解析入口 `parseExpression` 现在变成一个三步走的流水线，清晰地体现了运算符的优先级顺序：

1.  **`parseMaybeUnary()`**：解析原子表达式和任何前缀运算符，这是表达式的“核心”。
2.  **`parseSubscripts()`**：基于核心，循环解析所有后缀、成员访问和函数调用操作。
3.  **`parseExprOp()`**：将前两步的结果作为左操作数，解析所有二元和逻辑运算。

```javascript
// file: src/parser/expression.js

parseExpression() {
  // 1. 解析核心：原子或带前缀的表达式
  const expr = this.parseMaybeUnary();
  // 2. 解析后缀：成员访问、函数调用、后缀更新
  const subscriptedExpr = this.parseSubscripts(expr);
  // 3. 解析中缀：二元运算和逻辑运算
  return this.parseExprOp(subscriptedExpr, 0 /* minPrec */);
}
```

## 二、`parseSubscripts`：链式调用的引擎

`parseSubscripts` 函数接收一个基础表达式 `base`，然后在一个 `while (true)` 循环中，不断尝试解析应用于 `base` 之上的后缀类操作。如果成功解析出一个，它就会用新生成的、包装过的表达式（例如 `MemberExpression`）替换 `base`，然后继续下一轮循环。如果一轮循环下来没有任何后缀操作可以应用，则说明链式调用结束，函数返回最终的 `base`。

```javascript
// file: src/parser/expression.js

parseSubscripts(base) {
  while (true) {
    // 尝试解析单次后缀操作
    const element = this.parseSubscript(base);

    // 如果返回的节点和传入的 base 相同，说明没有后缀操作被解析，循环结束
    if (element === base) {
      return base;
    }
    // 否则，用新的、包装过的节点更新 base，继续下一轮循环
    base = element;
  }
}
```

这个循环结构正是实现 `a.b(c)[d]` 链式解析的关键。每一次循环，都将前一次的结果作为下一次操作的 `object` 或 `callee`。

## 三、`parseSubscript`：单步操作的实现

`parseSubscript` 是 `while` 循环的主体，它通过一连串的 `if/else if` 来判断当前 Token 属于哪种后缀操作。

### 1. 成员访问：`.` 和 `[]`

-   **点符号 (`a.b`)**：如果遇到 `.`，我们知道这是一个静态成员访问。`object` 是传入的 `base`，`property` 是 `.` 后面必须紧跟的一个标识符。其 `computed` 属性为 `false`。
-   **方括号 (`a[b]`)**：如果遇到 `[`，这是一个动态成员访问。`object` 是 `base`，`property` 则是 `[` 和 `]` 之间可以被求值的**任意表达式**。其 `computed` 属性为 `true`。

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a.b
if (this.eat(tt.dot)) {
  const node = this.startNodeAtNode(base);
  node.object = base;
  node.property = this.parseIdent(); // 点后面必须是标识符
  node.computed = false;
  return this.finishNode(node, "MemberExpression");
}
// a[b]
else if (this.eat(tt.bracketL)) {
  const node = this.startNodeAtNode(base);
  node.object = base;
  node.property = this.parseExpression(); // 方括号内是任意表达式
  node.computed = true;
  this.expect(tt.bracketR);
  return this.finishNode(node, "MemberExpression");
}
// ...
```

### 2. 函数调用：`a()`

如果遇到 `(`，说明这是一个函数调用。`callee` (被调用者) 是 `base`，`arguments` (参数列表) 是 `(` 和 `)` 之间由逗号分隔的表达式列表。我们可以用一个辅助函数 `parseExprList` 来解析参数。

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a(b, c)
else if (this.eat(tt.parenL)) {
  const node = this.startNodeAtNode(base);
  node.callee = base;
  // parseExprList 解析由逗号分隔的表达式列表，直到遇到指定的结束 Token
  node.arguments = this.parseExprList(tt.parenR);
  return this.finishNode(node, "CallExpression");
}
// ...
```

### 3. 后缀更新：`a++`

后缀 `++` 和 `--` 与前缀形式一样，也需要进行**左值检查**。此外，它还有一个与**自动分号插入 (ASI)** 相关的特殊规则：操作数和 `++`/`--` 之间不能有换行符。

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a++
// `!this.canInsertSemicolon()` 检查确保 a 和 ++ 之间没有换行
else if (this.type === tt.incDec && !this.canInsertSemicolon()) {
  const node = this.startNodeAtNode(base);
  this.checkLVal(base); // 必须是合法左值

  node.operator = this.value;
  node.prefix = false; // 标记为后缀
  node.argument = base;
  this.next(); // 消费 `++` 或 `--`
  return this.finishNode(node, "UpdateExpression");
}
// ...
```

如果所有 `if` 条件都不满足，`parseSubscript` 就直接返回原始的 `base`，这会使 `parseSubscripts` 的循环终止。

## 四、总结

通过引入 `parseSubscripts` 这条“流水线”，我们优雅地解决了所有后缀类表达式的解析问题。

-   **统一的 `led` 模型**：我们将成员访问、函数调用和后缀更新都统一看作是作用于左侧表达式的 `led` 操作。
-   **清晰的解析流程**：`parseMaybeUnary` -> `parseSubscripts` -> `parseExprOp` 的三步走策略，完美地映射了从高到低的运算符优先级。
-   **强大的链式处理**：一个简单的 `while` 循环就实现了对 `a.b(c)[d]` 这种复杂链式调用的解析，充分展现了递归下降解析的威力。
-   **语法正确性**：通过 `checkLVal` 和 `canInsertSemicolon` 等检查，我们确保了解析器生成的 AST 严格符合 JavaScript 的语法规范。

至此，我们的表达式解析器已经非常接近一个工业级的解析器了。它能够处理绝大多数常见的表达式。在下一章，我们将完成最后几块拼图：条件表达式和赋值表达式。