# 解析条件与赋值表达式：`a ? b : c`, `a = b`

欢迎来到我们表达式解析之旅的最后一站。在这一章，我们将为解析器装配上处理两种改变程序控制流和数据流的关键表达式的能力：**条件表达式（三元表达式）**和**赋值表达式**。

这两种表达式的优先级非常低（赋值的优先级几乎是最低的），并且它们都具有一个共同的、棘手的特性——**右结合性（Right-associativity）**。

-   `a = b = c` 被解析为 `a = (b = c)`
-   `a ? b : c ? d : e` 被解析为 `a ? b : (c ? d : e)`

为了正确处理这种行为，我们不能再依赖 `parseExprOp` 的主循环，而是需要调整我们表达式解析的顶层结构。

## 一、最终的表达式解析流水线

为了将赋值和条件表达式整合进来，并正确处理它们的低优先级，我们将建立一条全新的、层次分明的解析流水线。`parseExpression` 作为顶层入口，现在会调用 `parseMaybeAssign`。

```javascript
// file: src/parser/expression.js

// 新的顶层入口
parseExpression() {
  return this.parseMaybeAssign();
}

// 负责解析赋值表达式
parseMaybeAssign() {
  // ...
  const left = this.parseMaybeConditional();
  // ...
}

// 负责解析条件表达式
parseMaybeConditional() {
  // ...
  const expr = this.parseExprOp(/*...*/);
  // ...
}

// ... parseExprOp, parseSubscripts, parseMaybeUnary, parseExprAtom 保持不变
```

这个函数调用链 `parseMaybeAssign` -> `parseMaybeConditional` -> `parseExprOp` 清晰地定义了优先级：**赋值 < 条件 < 逻辑或**。`parseExprOp` 的 `minPrec` 为 0，意味着它会处理所有比“条件表达式”优先级更高的二元运算。

## 二、解析赋值表达式 (`AssignmentExpression`)

`parseMaybeAssign` 的职责是解析一个可能的赋值操作。它的逻辑如下：

1.  首先，调用 `parseMaybeConditional` 解析一个优先级更高的表达式，作为潜在的“左值”（L-Value）。
2.  检查当前 Token 是否为一个赋值运算符（如 `=`、`+=` 等，我们可以通过在 `TokenType` 中添加 `isAssign: true` 标志来识别）。
3.  **如果是赋值运算符**：
    a.  **检查左值**：调用 `this.checkLVal(left)` 确保左侧表达式是一个合法的赋值目标。
    b.  创建一个 `AssignmentExpression` 节点。
    c.  消费掉赋值运算符。
    d.  **递归调用 `parseMaybeAssign` 自身**来解析右侧表达式。这是实现**右结合性**的关键！
    e.  完成并返回节点。
4.  **如果不是赋值运算符**：直接返回第一步解析出的 `left` 表达式。

```javascript
// file: src/parser/expression.js

parseMaybeAssign() {
  // 1. 解析左侧潜在的左值
  const left = this.parseMaybeConditional();

  // 2. 检查是否为赋值操作
  if (this.type.isAssign) {
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = this.value; // 例如 "+="

    // 3a. 检查左值
    this.checkLVal(left);

    this.next(); // 3c. 消费运算符

    // 3d. 递归调用自身，实现右结合
    node.right = this.parseMaybeAssign();

    return this.finishNode(node, "AssignmentExpression");
  }

  // 4. 不是赋值，直接返回
  return left;
}
```

当解析 `a = b = c` 时，`parseMaybeAssign` 解析完 `a` 和 `=` 后，递归调用 `parseMaybeAssign` 去解析 `b = c`。这个递归调用会返回一个代表 `b = c` 的 `AssignmentExpression` 节点，该节点最终成为 `a` 的 `right` 部分，从而完美地构建出 `a = (b = c)` 的 AST 结构。

## 三、解析条件表达式 (`ConditionalExpression`)

条件（三元）运算符 `? :` 是 JavaScript 中唯一一个接受三个操作数的运算符。它的解析逻辑被封装在 `parseMaybeConditional` 中。

1.  首先，调用 `parseExprOp` 解析一个完整的二元/逻辑表达式，这部分将作为 `test` 条件。
2.  检查当前 Token 是否是 `?`。
3.  **如果是 `?`**：
    a.  创建一个 `ConditionalExpression` 节点，`test` 部分就是第一步的结果。
    b.  消费掉 `?`。
    c.  调用 `parseMaybeAssign` 解析 `consequent` 部分（`?` 和 `:` 之间的表达式）。
    d.  期望并消费一个 `:`。
    e.  调用 `parseMaybeAssign` 解析 `alternate` 部分（`:` 之后的表达式）。
    f.  完成并返回节点。
4.  **如果不是 `?`**：直接返回第一步解析出的 `expr`。

```javascript
// file: src/parser/expression.js

parseMaybeConditional() {
  // 1. 解析 test 部分
  const expr = this.parseExprOp(this.parseSubscripts(this.parseMaybeUnary()), 0);

  // 2. 检查是否有 `?`
  if (this.eat(tt.question)) {
    const node = this.startNodeAtNode(expr);
    node.test = expr;

    // 3c. 解析 consequent
    node.consequent = this.parseMaybeAssign();

    // 3d. 期望 `:`
    this.expect(tt.colon);

    // 3e. 解析 alternate
    node.alternate = this.parseMaybeAssign();

    return this.finishNode(node, "ConditionalExpression");
  }

  // 4. 不是条件表达式，直接返回
  return expr;
}
```

注意，在解析 `consequent` 和 `alternate` 时，我们都调用 `parseMaybeAssign`。这不仅是因为它们的优先级很低，允许内部包含赋值操作，更是为了正确处理嵌套的条件表达式，实现右结合性。

## 四、总结：表达式解析的终点

随着条件和赋值表达式的完成，我们表达式解析的大厦终于封顶。我们构建了一条清晰、健壮且可扩展的解析流水线，它完美地体现了各种表达式的优先级关系：

**`parseMaybeAssign`** (赋值) -> **`parseMaybeConditional`** (条件) -> **`parseExprOp`** (二元/逻辑) -> **`parseSubscripts`** (后缀/成员/调用) -> **`parseMaybeUnary`** (前缀) -> **`parseExprAtom`** (原子)

这个调用链本身就是一张从低到高的优先级表。我们学到了：

-   **通过函数调用顺序控制优先级**：将低优先级的操作放在调用链的顶层，高优先级的放在底层。
-   **通过递归调用自身实现右结合性**：`parseMaybeAssign` 调用自己，是处理右结合运算符的经典模式。
-   **`checkLVal` 的重要性**：在赋值操作前进行左值检查，是保证语法正确性的最后一道防线。

至此，你已经掌握了从零开始构建一个功能完备的 JavaScript 表达式解析器的所有核心知识。从最简单的数字，到最复杂的链式调用和嵌套赋值，你的解析器都能够游刃有余地将它们转化为结构清晰的抽象语法树。这是通往编译器、解释器、语言工具等更广阔世界的坚实一步。