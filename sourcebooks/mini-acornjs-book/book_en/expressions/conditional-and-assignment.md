# Parsing Conditional and Assignment Expressions: `a ? b : c`, `a = b`

Welcome to the final stop of our expression parsing journey. In this chapter, we will equip our parser with the ability to handle two key expressions that change program control flow and data flow: **conditional expressions (ternary expressions)** and **assignment expressions**.

These two expression types have very low precedence (assignment has almost the lowest precedence), and they share a common, tricky characteristic—**right-associativity**.

- `a = b = c` is parsed as `a = (b = c)`
- `a ? b : c ? d : e` is parsed as `a ? b : (c ? d : e)`

To correctly handle this behavior, we can no longer rely on `parseExprOp`'s main loop but need to adjust the top-level structure of our expression parsing.

## 1. Final Expression Parsing Pipeline

To integrate assignment and conditional expressions and correctly handle their low precedence, we will establish a brand new, well-layered parsing pipeline. `parseExpression` as the top-level entry now calls `parseMaybeAssign`.

```javascript
// file: src/parser/expression.js

// New top-level entry
parseExpression() {
  return this.parseMaybeAssign();
}

// Responsible for parsing assignment expressions
parseMaybeAssign() {
  // ...
  const left = this.parseMaybeConditional();
  // ...
}

// Responsible for parsing conditional expressions
parseMaybeConditional() {
  // ...
  const expr = this.parseExprOp(/*...*/);
  // ...
}

// ... parseExprOp, parseSubscripts, parseMaybeUnary, parseExprAtom remain unchanged
```

This function call chain `parseMaybeAssign` -> `parseMaybeConditional` -> `parseExprOp` clearly defines precedence: **Assignment < Conditional < Logical OR**. `parseExprOp`'s `minPrec` is 0, meaning it will handle all binary operations with higher precedence than "conditional expressions".

## 2. Parsing Assignment Expressions (`AssignmentExpression`)

The responsibility of `parseMaybeAssign` is to parse a possible assignment operation. Its logic is as follows:

1. First, call `parseMaybeConditional` to parse a higher precedence expression as a potential "L-Value".
2. Check if the current token is an assignment operator (like `=`, `+=`, etc., which we can identify by adding an `isAssign: true` flag in `TokenType`).
3. **If it is an assignment operator**:
   a. **Check L-Value**: Call `this.checkLVal(left)` to ensure the left-side expression is a valid assignment target.
   b. Create an `AssignmentExpression` node.
   c. Consume the assignment operator.
   d. **Recursively call `parseMaybeAssign` itself** to parse the right-side expression. This is key to implementing **right-associativity**!
   e. Complete and return the node.
4. **If not an assignment operator**: Directly return the `left` expression parsed in step 1.

```javascript
// file: src/parser/expression.js

parseMaybeAssign() {
  // 1. Parse potential L-Value on the left
  const left = this.parseMaybeConditional();

  // 2. Check if it's an assignment operation
  if (this.type.isAssign) {
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = this.value; // e.g., "+="

    // 3a. Check L-Value
    this.checkLVal(left);

    this.next(); // 3c. Consume operator

    // 3d. Recursively call itself to implement right-associativity
    node.right = this.parseMaybeAssign();

    return this.finishNode(node, "AssignmentExpression");
  }

  // 4. Not an assignment, return directly
  return left;
}
```

When parsing `a = b = c`, after parsing `a` and `=`, `parseMaybeAssign` recursively calls `parseMaybeAssign` to parse `b = c`. This recursive call returns an `AssignmentExpression` node representing `b = c`, which ultimately becomes the `right` part of `a`, perfectly constructing the AST structure for `a = (b = c)`.

## 3. Parsing Conditional Expressions (`ConditionalExpression`)

The conditional (ternary) operator `? :` is the only operator in JavaScript that takes three operands. Its parsing logic is encapsulated in `parseMaybeConditional`.

1. First, call `parseExprOp` to parse a complete binary/logical expression, which will serve as the `test` condition.
2. Check if the current token is `?`.
3. **If it is `?`**:
   a. Create a `ConditionalExpression` node, with `test` being the result from step 1.
   b. Consume `?`.
   c. Call `parseMaybeAssign` to parse the `consequent` part (expression between `?` and `:`).
   d. Expect and consume a `:`.
   e. Call `parseMaybeAssign` to parse the `alternate` part (expression after `:`).
   f. Complete and return the node.
4. **If not `?`**: Directly return the `expr` parsed in step 1.

```javascript
// file: src/parser/expression.js

parseMaybeConditional() {
  // 1. Parse test part
  const expr = this.parseExprOp(this.parseSubscripts(this.parseMaybeUnary()), 0);

  // 2. Check if there's a `?`
  if (this.eat(tt.question)) {
    const node = this.startNodeAtNode(expr);
    node.test = expr;

    // 3c. Parse consequent
    node.consequent = this.parseMaybeAssign();

    // 3d. Expect `:`
    this.expect(tt.colon);

    // 3e. Parse alternate
    node.alternate = this.parseMaybeAssign();

    return this.finishNode(node, "ConditionalExpression");
  }

  // 4. Not a conditional expression, return directly
  return expr;
}
```

Note that when parsing `consequent` and `alternate`, we call `parseMaybeAssign`. This is not only because their precedence is low, allowing assignment operations inside, but also to correctly handle nested conditional expressions and implement right-associativity.

## 4. Summary: The Endpoint of Expression Parsing

With the completion of conditional and assignment expressions, our expression parsing edifice is finally topped off. We have built a clear, robust, and extensible parsing pipeline that perfectly reflects the precedence relationships of various expressions:

**`parseMaybeAssign`** (Assignment) -> **`parseMaybeConditional`** (Conditional) -> **`parseExprOp`** (Binary/Logical) -> **`parseSubscripts`** (Postfix/Member/Call) -> **`parseMaybeUnary`** (Prefix) -> **`parseExprAtom`** (Atomic)

This call chain itself is a precedence table from low to high. We have learned:

- **Control precedence through function call order**: Place low-precedence operations at the top of the call chain, high-precedence ones at the bottom.
- **Implement right-associativity through recursive self-calls**: `parseMaybeAssign` calling itself is the classic pattern for handling right-associative operators.
- **Importance of `checkLVal`**: Performing L-Value checks before assignment operations is the last line of defense for ensuring syntactic correctness.

At this point, you have mastered all the core knowledge for building a fully functional JavaScript expression parser from scratch. From the simplest numbers to the most complex chained calls and nested assignments, your parser can skillfully transform them into well-structured abstract syntax trees. This is a solid step toward the broader world of compilers, interpreters, language tools, and more.