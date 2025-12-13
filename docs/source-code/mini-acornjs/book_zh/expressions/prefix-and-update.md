# 解析前缀与更新表达式：`!x`, `++i`

我们已经为 Pratt 解析器配备了处理原子表达式和数据结构（数组、对象）的能力。现在，是时候让它真正“动”起来，处理那些可以改变值或进行逻辑运算的**前缀运算符**了。这些运算符，如 `!`、`-`、`++`，都出现在它们所操作的表达式**之前**。

这个任务的核心，就是激活我们之前定义的 `parseMaybeUnary` 函数。这个函数是 Pratt 解析器中 `nud` (Null Denotation) 思想的直接体现，专门用于处理表达式的“前缀”部分。

## 一、`parseMaybeUnary`：`nud` 的舞台

回忆一下我们的解析流程：`parseExpression` 调用 `parseMaybeUnary`，然后将结果传递给 `parseExprOp`。`parseMaybeUnary` 的职责就是解析一个可能带有一元前缀的表达式。

它的逻辑非常清晰：

1.  检查当前 `this.type` 是否被标记为 `prefix: true`。
2.  **如果是**：说明我们遇到了一个前缀运算符。我们需要创建一个相应的 AST 节点（`UnaryExpression` 或 `UpdateExpression`），消费掉这个运算符，然后**递归地调用表达式解析函数**来处理该运算符后面的操作数（argument）。
3.  **如果不是**：说明这是一个原子表达式的开头，直接调用我们已经实现的 `parseExprAtom` 即可。

```javascript
// file: src/parser/expression.js

parseMaybeUnary() {
  // 检查当前 Token 是否是前缀运算符
  if (this.type.prefix) {
    const node = this.startNode();
    const op = this.type;
    this.next(); // 消费掉运算符，例如 `!`

    // 递归地解析运算符后面的表达式
    // 注意：这里我们直接再次调用 parseMaybeUnary()，
    // 因为前缀运算符可以叠加，例如 `!!true`
    const argument = this.parseMaybeUnary();

    // 根据运算符类型，创建不同的 AST 节点
    if (op === tt.incDec) { // `++` 或 `--`
      // ... 创建 UpdateExpression
    } else { // `!`、`-`、`typeof` 等
      // ... 创建 UnaryExpression
    }
  } else {
    // 如果不是前缀运算符，就解析原子表达式
    return this.parseExprAtom();
  }
}
```

## 二、一元表达式 (`UnaryExpression`)

像 `!a`、`-b`、`typeof c`、`void 0` 都属于一元表达式。它们的共性是一个运算符后面跟着一个单独的表达式。解析它们的过程就是构建一个 `UnaryExpression` 节点。

```javascript
// file: src/parser/expression.js -> 在 parseMaybeUnary 中

// ...
if (op === tt.incDec) {
  // ...
} else {
  node.operator = op.label;
  node.prefix = true; // 标记这是前缀形式
  node.argument = argument;

  // 特殊处理：`delete` 运算符有额外限制
  if (op === tt._delete && argument.type !== "MemberExpression") {
    this.raise(node.start, "Invalid argument to delete operator");
  }

  return this.finishNode(node, "UnaryExpression");
}
// ...
```

我们为 `delete` 增加了一个简单的检查。`delete` 只能用于删除对象的属性（即 `MemberExpression`），例如 `delete obj.prop`。尝试删除一个变量 `delete myVar` 在严格模式下是语法错误。

## 三、更新表达式 (`UpdateExpression`) 与左值检查

更新表达式 `++i` 和 `--j` 看起来与一元表达式很像，但有一个至关重要的区别：**它们会修改其操作数的值**。

这意味着，它们的操作数必须是一个可以被合法赋值的“位置”，在编程语言理论中，这被称为**左值（L-Value / Left-Hand-Side Expression）**。

-   **合法的左值**：变量名 (`i`)、对象属性 (`obj.prop`)、数组成员 (`arr[0]`)。
-   **非法的左值**：数字 (`5`)、函数调用的结果 (`getVal()`)、算术表达式的结果 (`a + b`)。

你不能写 `++5` 或者 `++(a + b)`，因为 `5` 和 `a + b` 都不是一个可以被修改的“内存位置”。

因此，在解析 `++` 和 `--` 时，我们必须在生成 AST 后，检查其 `argument` 是否为一个合法的左值。为此，我们引入一个 `checkLVal` 的辅助函数。

```javascript
// file: src/parser/expression.js -> 在 parseMaybeUnary 中

if (op === tt.incDec) { // `++` 或 `--`
  // 检查 argument 是否为合法左值
  this.checkLVal(argument);

  node.operator = op.label;
  node.prefix = true;
  node.argument = argument;
  return this.finishNode(node, "UpdateExpression");
} else {
  // ... UnaryExpression 逻辑
}
```

```javascript
// file: src/parser/util.js

// 检查一个表达式节点是否是合法的左值
checkLVal(expr) {
  // 最常见的合法左值是标识符和成员表达式
  if (expr.type === "Identifier" || expr.type === "MemberExpression") {
    return; // 合法，直接返回
  }
  // 如果不是，则抛出一个语法错误
  this.raise(expr.start, "Invalid left-hand side in assignment");
}
```

这个 `checkLVal` 函数是保证我们解析器语法正确性的关键一步。它防止了解析器生成在语义上非法的 AST。

## 四、总结

通过给 `parseMaybeUnary` 赋予生命，我们成功地让解析器掌握了处理前缀运算符的能力。这一章的核心收获是：

-   **`nud` 的实现**：`parseMaybeUnary` 成为了 Pratt 解析器中 `nud` 逻辑的载体，它清晰地分离了前缀运算和原子表达式的解析。
-   **区分 `Unary` 和 `Update`**：我们不仅在 AST 层面区分了这两种表达式，更重要的是理解了它们在“是否修改操作数”上的本质区别。
-   **左值（L-Value）的重要性**：引入了 `checkLVal` 这一关键的语法验证步骤。这是一个非常重要的概念，在后续解析赋值表达式、解构等语法时，我们还会反复与它打交道。

现在，我们的解析器已经可以正确解析像 `typeof ++a` 这样的嵌套表达式了。它会首先将 `++a` 解析为一个 `UpdateExpression`，然后这个 `UpdateExpression` 节点又作为 `typeof` 的 `argument`，被包裹在一个 `UnaryExpression` 节点中。Pratt 解析器的递归之美，开始初露锋芒。