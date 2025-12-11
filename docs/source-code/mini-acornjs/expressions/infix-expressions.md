# 解析中缀表达式：二元运算与逻辑运算

如果说 `parseMaybeUnary` 和 `parseExprAtom` 是 Pratt 解析器处理表达式“原子”和“前缀”的 `nud` 部分，那么 `parseExprOp` 就是处理表达式“组合”的 `led` (Left Denotation) 部分。它是 Pratt 解析器的灵魂，负责将原子通过中缀运算符（Infix Operators）粘合在一起，并优雅地处理困扰无数编译新手的**运算符优先级**和**结合性**问题。

在这一章，我们将激活 `parseExprOp`，让我们的解析器能够理解 `a + b`、`c * d`、`e && f` 等所有中缀运算。

## 一、`parseExprOp`：Pratt 解析器的核心循环

`parseExprOp` 函数接收两个参数：`left` 和 `minPrec`。

-   `left`：一个已经解析好的表达式节点，它将作为潜在的左操作数。
-   `minPrec`：一个数字，代表当前上下文的“最小优先级”。只有当解析器遇到的运算符的优先级**高于** `minPrec` 时，它才会继续向右结合。

它的核心是一个 `while` 循环，这个循环体现了 `led` 的精髓：

1.  **检查**：查看当前 Token (`this.type`) 是否是一个二元运算符 (`binop > -1`)，并且其优先级 (`prec`) 大于 `minPrec`。
2.  **循环继续**：如果满足条件，说明我们可以将 `left` 与接下来的表达式进行组合。
3.  **循环终止**：如果不满足条件，说明当前运算符的优先级太低（或它根本不是运算符），不能在当前上下文中进行组合，循环结束，直接返回 `left`。

```javascript
// file: src/parser/expression.js

parseExprOp(left, minPrec) {
  let prec;
  // 核心循环：只要当前 token 是一个优先级足够高的二元运算符
  while ((prec = this.type.binop) > -1 && prec > minPrec) {
    const op = this.type;
    this.next(); // 消费掉运算符，例如 `+`

    // 递归地解析右操作数
    const right = this.parseExprOp(this.parseMaybeUnary(), /* nextPrec */);

    // 将 left, op, right 组合成一个新的节点
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = op.label;
    node.right = right;

    // 根据元数据决定节点类型
    const nodeType = op.isLogical ? "LogicalExpression" : "BinaryExpression";
    left = this.finishNode(node, nodeType);
    // 更新 left，为下一次循环做准备（例如 a + b + c）
  }
  return left;
}
```

## 二、优先级与结合性：Pratt 的魔法

`parseExprOp` 的魔法藏在 `while` 循环的判断条件和递归调用 `parseExprOp` 时传递的 `nextPrec` 参数里。

### 优先级

`while (prec > minPrec)` 这句代码完美地处理了优先级。让我们用 `2 + 3 * 4` 来举例：

1.  `parseExpression` 开始，调用 `parseMaybeUnary` 解析出 `2`，得到 `left` 为 `Identifier(2)`。
2.  进入 `parseExprOp(Identifier(2), 0)`。
3.  遇到 `+`，其优先级（假设为 9）大于 `minPrec` (0)。循环开始。
4.  在循环内部，递归调用 `parseExprOp` 来解析 `+` 右边的部分，此时 `minPrec` 变为 `+` 的优先级 9。即 `parseExprOp(this.parseMaybeUnary(), 9)`。
5.  `parseMaybeUnary` 解析出 `3`，得到 `left` 为 `Identifier(3)`。
6.  进入内部的 `parseExprOp(Identifier(3), 9)`。
7.  遇到 `*`，其优先级（假设为 10）大于 `minPrec` (9)。循环开始。
8.  在 `*` 的循环内部，递归调用 `parseExprOp`，`minPrec` 变为 `*` 的优先级 10。`parseMaybeUnary` 解析出 `4`。
9.  在最内层的 `parseExprOp(Identifier(4), 10)` 中，后面没有更高优先级的运算符了，循环不执行，直接返回 `Identifier(4)`。
10. 回到 `*` 的循环，`right` 得到 `Identifier(4)`。组合成 `BinaryExpression(3 * 4)`，并作为新的 `left`。
11. 回到 `+` 的循环，`right` 得到 `BinaryExpression(3 * 4)`。组合成 `BinaryExpression(2 + (3 * 4))`。

通过提升 `minPrec`，Pratt 解析器确保了只有更高优先级的运算符才能在递归中“抢占”右操作数。

### 结合性

结合性决定了相同优先级的运算符如何组合。`a - b - c` 应该等价于 `(a - b) - c`（左结合），而 `a ** b ** c` 应该等价于 `a ** (b ** c)`（右结合）。

这个魔法藏在计算 `nextPrec` 的逻辑里：

```javascript
// ... 在 while 循环内部
// 对于右结合运算符，我们允许它和右侧相同优先级的运算符结合，所以传入 prec - 1
// 对于左结合运算符，我们要求右侧的运算符优先级必须更高，所以传入 prec
const nextPrec = op.rightAssociative ? prec - 1 : prec;

const right = this.parseExprOp(this.parseMaybeUnary(), nextPrec);
// ...
```

-   **左结合 (e.g., `+`, `-`)**: `nextPrec` 等于当前运算符的优先级 `prec`。这意味着，右侧的表达式中，只有**严格更高**优先级的运算符才能继续递归，相同优先级的则不行。这迫使 `a - b - c` 在解析完 `a - b` 后，内部的 `parseExprOp` 遇到下一个 `-` 时会因为 `prec > minPrec` (即 `9 > 9`) 不成立而返回，从而形成 `(a - b) - c` 的结构。
-   **右结合 (e.g., `**`)**: `nextPrec` 等于 `prec - 1`。这意味着，右侧的表达式中，**相同或更高**优先级的运算符都可以继续递归。这使得 `a ** b ** c` 在解析 `a` 之后，内部的 `parseExprOp` 遇到 `b` 后面的 `**` 时，因为 `prec > minPrec` (即 `12 > 11`) 成立而继续向右结合，最终形成 `a ** (b ** c)` 的结构。

## 三、`BinaryExpression` vs `LogicalExpression`

你可能注意到，我们根据 `op.isLogical` 来决定是创建 `BinaryExpression` 还是 `LogicalExpression`。为什么需要区分它们？

尽管它们的解析方式完全相同，但在 ECMAScript 规范中，它们是两种不同的节点类型。这主要是因为它们的**语义**不同：

-   `BinaryExpression`：代表算术、位、关系等运算，它的左右两边通常都会被求值。
-   `LogicalExpression`：代表 `&&`、`||`、`??` 运算，它们具有**短路求值（short-circuiting）**的特性。例如，在 `a && b` 中，如果 `a` 为假，`b` 根本不会被求值。

为了生成符合规范且能被后续工具（如解释器、编译器、代码检查工具）正确理解的 AST，我们必须做出这种区分。这正是 `TokenType` 元数据驱动设计的强大之处——解析逻辑保持统一，但产出的 AST 节点类型可以灵活配置。

## 四、总结

`parseExprOp` 是 Pratt 解析器最精妙、最强大的部分。通过一个看似简单的 `while` 循环，它实现了：

-   **数据驱动的解析**：运算符的行为完全由 `TokenType` 中的元数据（`binop`, `rightAssociative`, `isLogical`）定义，扩展性极强。
-   **优雅的优先级处理**：通过在递归中提升 `minPrec` 参数，自然地实现了运算符优先级的判断。
-   **巧妙的结合性控制**：通过微调 `nextPrec` 的值（`prec` 或 `prec - 1`），精确地控制了左结合与右结合的行为。

至此，我们已经拥有了一个功能相当完备的表达式解析器。它能够处理原子、前缀和中缀表达式，并正确处理它们之间复杂的优先级和结合性关系。剩下的，就是为它添加更多后缀类型的表达式，让它变得更加完美。