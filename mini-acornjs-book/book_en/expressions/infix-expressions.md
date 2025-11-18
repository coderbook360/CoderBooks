# Parsing Infix Expressions: Binary Operations and Logical Operations

If `parseMaybeUnary` and `parseExprAtom` are the `nud` part of the Pratt parser handling expression "atoms" and "prefixes", then `parseExprOp` is the `led` (Left Denotation) part handling expression "combination". It is the soul of the Pratt parser, responsible for gluing atoms together through infix operators (Infix Operators) and elegantly handling the **operator precedence** and **associativity** problems that trouble countless compilation beginners.

In this chapter, we will activate `parseExprOp`, enabling our parser to understand all infix operations like `a + b`, `c * d`, `e && f`, etc.

## 1. `parseExprOp`: The Core Loop of the Pratt Parser

The `parseExprOp` function takes two parameters: `left` and `minPrec`.

- `left`: An already parsed expression node that will serve as the potential left operand.
- `minPrec`: A number representing the "minimum precedence" of the current context. The parser will only continue combining to the right if it encounters an operator with precedence **higher than** `minPrec`.

Its core is a `while` loop that embodies the essence of `led`:

1. **Check**: See if the current token (`this.type`) is a binary operator (`binop > -1`) and if its precedence (`prec`) is greater than `minPrec`.
2. **Loop continues**: If conditions are met, we can combine `left` with the following expression.
3. **Loop terminates**: If conditions are not met, the current operator's precedence is too low (or it's not an operator at all) to combine in the current context, the loop ends, and `left` is returned directly.

```javascript
// file: src/parser/expression.js

parseExprOp(left, minPrec) {
  let prec;
  // Core loop: as long as current token is a binary operator with sufficient precedence
  while ((prec = this.type.binop) > -1 && prec > minPrec) {
    const op = this.type;
    this.next(); // consume the operator, e.g., `+`

    // Recursively parse the right operand
    const right = this.parseExprOp(this.parseMaybeUnary(), /* nextPrec */);

    // Combine left, op, right into a new node
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = op.label;
    node.right = right;

    // Determine node type based on metadata
    const nodeType = op.isLogical ? "LogicalExpression" : "BinaryExpression";
    left = this.finishNode(node, nodeType);
    // Update left for next iteration (e.g., a + b + c)
  }
  return left;
}
```

## 2. Precedence and Associativity: Pratt's Magic

The magic of `parseExprOp` lies in the `while` loop's condition and the `nextPrec` parameter passed in the recursive call to `parseExprOp`.

### Precedence

The code `while (prec > minPrec)` perfectly handles precedence. Let's use `2 + 3 * 4` as an example:

1. `parseExpression` starts, calls `parseMaybeUnary` to parse `2`, getting `left` as `Identifier(2)`.
2. Enters `parseExprOp(Identifier(2), 0)`.
3. Encounters `+`, its precedence (assume 9) is greater than `minPrec` (0). Loop starts.
4. Inside the loop, recursively calls `parseExprOp` to parse the part to the right of `+`, with `minPrec` becoming `+`'s precedence 9. That is, `parseExprOp(this.parseMaybeUnary(), 9)`.
5. `parseMaybeUnary` parses `3`, getting `left` as `Identifier(3)`.
6. Enters inner `parseExprOp(Identifier(3), 9)`.
7. Encounters `*`, its precedence (assume 10) is greater than `minPrec` (9). Loop starts.
8. Inside `*`'s loop, recursively calls `parseExprOp`, `minPrec` becomes `*`'s precedence 10. `parseMaybeUnary` parses `4`.
9. In the innermost `parseExprOp(Identifier(4), 10)`, no higher precedence operators follow, loop doesn't execute, returns `Identifier(4)` directly.
10. Returns to `*`'s loop, `right` gets `Identifier(4)`. Combines into `BinaryExpression(3 * 4)`, becomes new `left`.
11. Returns to `+`'s loop, `right` gets `BinaryExpression(3 * 4)`. Combines into `BinaryExpression(2 + (3 * 4))`.

By raising `minPrec`, the Pratt parser ensures that only higher precedence operators can "preempt" the right operand in recursion.

### Associativity

Associativity determines how operators of the same precedence combine. `a - b - c` should be equivalent to `(a - b) - c` (left-associative), while `a ** b ** c` should be equivalent to `a ** (b ** c)` (right-associative).

This magic lies in the logic for calculating `nextPrec`:

```javascript
// ... inside while loop
// For right-associative operators, we allow combination with same precedence operators to the right, so pass prec - 1
// For left-associative operators, we require higher precedence operators to the right, so pass prec
const nextPrec = op.rightAssociative ? prec - 1 : prec;

const right = this.parseExprOp(this.parseMaybeUnary(), nextPrec);
// ...
```

- **Left-associative (e.g., `+`, `-`)**: `nextPrec` equals the current operator's precedence `prec`. This means that in the expression to the right, only operators with **strictly higher** precedence can continue recursion; same precedence ones cannot. This forces `a - b - c` to form `(a - b) - c` structure after parsing `a - b`, because the inner `parseExprOp` encountering the next `-` will return since `prec > minPrec` (i.e., `9 > 9`) is false.
- **Right-associative (e.g., `**`)**: `nextPrec` equals `prec - 1`. This means that in the expression to the right, operators with **same or higher** precedence can continue recursion. This causes `a ** b ** c` to form `a ** (b ** c)` structure after parsing `a`, because the inner `parseExprOp` encountering `**` after `b` continues combining to the right since `prec > minPrec` (i.e., `12 > 11`) is true.

## 3. `BinaryExpression` vs `LogicalExpression`

You may have noticed we decide whether to create `BinaryExpression` or `LogicalExpression` based on `op.isLogical`. Why distinguish them?

Although they parse identically, they are different node types in the ECMAScript specification. This is mainly because their **semantics** differ:

- `BinaryExpression`: Represents arithmetic, bitwise, relational operations, where both sides are typically evaluated.
- `LogicalExpression`: Represents `&&`, `||`, `??` operations, which have **short-circuiting** characteristics. For example, in `a && b`, if `a` is false, `b` is not evaluated at all.

To generate ASTs that conform to the specification and can be correctly understood by subsequent tools (like interpreters, compilers, code linters), we must make this distinction. This demonstrates the power of the `TokenType` metadata-driven design—parsing logic remains unified, but the produced AST node types can be flexibly configured.

## 4. Summary

`parseExprOp` is the most ingenious and powerful part of the Pratt parser. Through a seemingly simple `while` loop, it achieves:

- **Data-driven parsing**: Operator behavior is entirely defined by metadata (`binop`, `rightAssociative`, `isLogical`) in `TokenType`, with strong extensibility.
- **Elegant precedence handling**: By raising the `minPrec` parameter in recursion, it naturally implements operator precedence judgment.
- **Clever associativity control**: By fine-tuning the `nextPrec` value (`prec` or `prec - 1`), it precisely controls left-associative and right-associative behavior.

At this point, we have a quite complete expression parser. It can handle atomic, prefix, and infix expressions, correctly processing the complex precedence and associativity relationships between them. What remains is to add more suffix-type expressions to make it even more perfect.