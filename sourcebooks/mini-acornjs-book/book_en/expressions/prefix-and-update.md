# Parsing Prefix and Update Expressions: `!x`, `++i`

We have equipped our Pratt parser with the ability to handle atomic expressions and data structures (arrays, objects). Now it's time to make it truly "dynamic" by handling **prefix operators** that can change values or perform logical operations. These operators, such as `!`, `-`, `++`, all appear **before** the expressions they operate on.

The core of this task is to activate the `parseMaybeUnary` function we defined earlier. This function is the direct embodiment of the `nud` (Null Denotation) concept in Pratt parsing, specifically designed to handle the "prefix" part of expressions.

## 1. `parseMaybeUnary`: The Stage for `nud`

Recall our parsing flow: `parseExpression` calls `parseMaybeUnary`, then passes the result to `parseExprOp`. The responsibility of `parseMaybeUnary` is to parse an expression that may have a unary prefix.

Its logic is very clear:

1. Check if the current `this.type` is marked as `prefix: true`.
2. **If yes**: We've encountered a prefix operator. We need to create a corresponding AST node (`UnaryExpression` or `UpdateExpression`), consume the operator, then **recursively call the expression parsing function** to handle the argument following the operator.
3. **If not**: This is the beginning of an atomic expression, so directly call our already implemented `parseExprAtom`.

```javascript
// file: src/parser/expression.js

parseMaybeUnary() {
  // Check if current token is a prefix operator
  if (this.type.prefix) {
    const node = this.startNode();
    const op = this.type;
    this.next(); // consume the operator, e.g., `!`

    // Recursively parse the expression following the operator
    // Note: We directly call parseMaybeUnary() again here,
    // because prefix operators can be stacked, e.g., `!!true`
    const argument = this.parseMaybeUnary();

    // Create different AST nodes based on operator type
    if (op === tt.incDec) { // `++` or `--`
      // ... create UpdateExpression
    } else { // `!`, `-`, `typeof`, etc.
      // ... create UnaryExpression
    }
  } else {
    // If not a prefix operator, parse atomic expression
    return this.parseExprAtom();
  }
}
```

## 2. Unary Expressions (`UnaryExpression`)

Expressions like `!a`, `-b`, `typeof c`, `void 0` all belong to unary expressions. Their commonality is that one operator is followed by a single expression. Parsing them involves building a `UnaryExpression` node.

```javascript
// file: src/parser/expression.js -> in parseMaybeUnary

// ...
if (op === tt.incDec) {
  // ...
} else {
  node.operator = op.label;
  node.prefix = true; // mark this as prefix form
  node.argument = argument;

  // Special handling: `delete` operator has additional restrictions
  if (op === tt._delete && argument.type !== "MemberExpression") {
    this.raise(node.start, "Invalid argument to delete operator");
  }

  return this.finishNode(node, "UnaryExpression");
}
// ...
```

We added a simple check for `delete`. `delete` can only be used to delete object properties (i.e., `MemberExpression`), such as `delete obj.prop`. Attempting to delete a variable `delete myVar` is a syntax error in strict mode.

## 3. Update Expressions (`UpdateExpression`) and L-Value Checking

Update expressions `++i` and `--j` look similar to unary expressions but have one crucial difference: **they modify the value of their operand**.

This means their operand must be a "location" that can be legally assigned to, known in programming language theory as an **L-Value (Left-Hand-Side Expression)**.

- **Valid L-Values**: Variable names (`i`), object properties (`obj.prop`), array members (`arr[0]`).
- **Invalid L-Values**: Numbers (`5`), results of function calls (`getVal()`), results of arithmetic expressions (`a + b`).

You cannot write `++5` or `++(a + b)` because `5` and `a + b` are not "memory locations" that can be modified.

Therefore, when parsing `++` and `--`, we must check if their `argument` is a valid L-Value after generating the AST. For this, we introduce a `checkLVal` helper function.

```javascript
// file: src/parser/expression.js -> in parseMaybeUnary

if (op === tt.incDec) { // `++` or `--`
  // Check if argument is a valid L-Value
  this.checkLVal(argument);

  node.operator = op.label;
  node.prefix = true;
  node.argument = argument;
  return this.finishNode(node, "UpdateExpression");
} else {
  // ... UnaryExpression logic
}
```

```javascript
// file: src/parser/util.js

// Check if an expression node is a valid L-Value
checkLVal(expr) {
  // Most common valid L-Values are identifiers and member expressions
  if (expr.type === "Identifier" || expr.type === "MemberExpression") {
    return; // valid, return directly
  }
  // If not, throw a syntax error
  this.raise(expr.start, "Invalid left-hand side in assignment");
}
```

This `checkLVal` function is a crucial step in ensuring our parser's syntactic correctness. It prevents the parser from generating semantically illegal ASTs.

## 4. Summary

By bringing `parseMaybeUnary` to life, we have successfully enabled our parser to handle prefix operators. The key takeaways from this chapter are:

- **Implementation of `nud`**: `parseMaybeUnary` became the carrier of `nud` logic in our Pratt parser, clearly separating prefix operation parsing from atomic expression parsing.
- **Distinguishing `Unary` and `Update`**: We not only distinguished these two expression types at the AST level but, more importantly, understood their fundamental difference in "whether they modify the operand".
- **Importance of L-Values**: Introduced the crucial syntactic validation step of `checkLVal`. This is a very important concept that we'll encounter repeatedly when parsing assignment expressions, destructuring, and other syntax.

Now, our parser can correctly parse nested expressions like `typeof ++a`. It will first parse `++a` as an `UpdateExpression`, then this `UpdateExpression` node becomes the `argument` of `typeof`, wrapped in a `UnaryExpression` node. The recursive beauty of the Pratt parser is beginning to reveal itself.