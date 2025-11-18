# Parsing Postfix, Call, and Member Expressions: `a++`, `a()`, `a[]`

We have conquered the most complex part of expression parsing—operator precedence and associativity for infix operators. Now, let's handle another very important and common category of expressions: **postfix expressions**, **member access**, and **function calls**.

These operations share a common characteristic: they all act on an existing expression located to their left. In the Pratt parsing model, they all belong to `led` (Left Denotation) behavior. Their precedence is very high, second only to atomic expressions themselves, and higher than all binary operators.

- `a++` (postfix increment/decrement)
- `obj.prop` (dot notation member access)
- `arr[0]` (bracket notation member access)
- `func(arg)` (function call)

To handle these operations and support chained calls like `a.b(c)[d]`, we introduce a new intermediate step: `parseSubscripts`.

## 1. New Parsing Pipeline

Our expression parsing entry `parseExpression` now becomes a three-step pipeline that clearly reflects operator precedence order:

1. **`parseMaybeUnary()`**: Parse atomic expressions and any prefix operators—this is the "core" of the expression.
2. **`parseSubscripts()`**: Based on the core, iteratively parse all postfix, member access, and function call operations.
3. **`parseExprOp()`**: Use the result of the first two steps as the left operand, parse all binary and logical operations.

```javascript
// file: src/parser/expression.js

parseExpression() {
  // 1. Parse core: atomic or prefixed expression
  const expr = this.parseMaybeUnary();
  // 2. Parse postfix: member access, function calls, postfix updates
  const subscriptedExpr = this.parseSubscripts(expr);
  // 3. Parse infix: binary and logical operations
  return this.parseExprOp(subscriptedExpr, 0 /* minPrec */);
}
```

## 2. `parseSubscripts`: The Engine for Chained Calls

The `parseSubscripts` function takes a base expression `base`, then in a `while (true)` loop, continuously attempts to parse postfix-type operations applied to `base`. If it successfully parses one, it replaces `base` with the newly generated, wrapped expression (e.g., `MemberExpression`), then continues to the next iteration. If no postfix operation can be applied in an iteration, it means the chain call has ended, and the function returns the final `base`.

```javascript
// file: src/parser/expression.js

parseSubscripts(base) {
  while (true) {
    // Attempt to parse a single postfix operation
    const element = this.parseSubscript(base);

    // If returned node is same as input base, no postfix operation was parsed, loop ends
    if (element === base) {
      return base;
    }
    // Otherwise, update base with new wrapped node, continue next iteration
    base = element;
  }
}
```

This loop structure is key to implementing chained parsing like `a.b(c)[d]`. Each iteration uses the previous result as the `object` or `callee` for the next operation.

## 3. `parseSubscript`: Implementation of Single-Step Operation

`parseSubscript` is the body of the `while` loop. It uses a series of `if/else if` statements to determine which postfix operation the current token belongs to.

### 1. Member Access: `.` and `[]`

- **Dot notation (`a.b`)**: If encountering `.`, we know this is a static member access. `object` is the input `base`, `property` is an identifier that must immediately follow `.`. Its `computed` property is `false`.
- **Bracket notation (`a[b]`)**: If encountering `[`, this is a dynamic member access. `object` is `base`, `property` is **any expression** that can be evaluated between `[` and `]`. Its `computed` property is `true`.

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a.b
if (this.eat(tt.dot)) {
  const node = this.startNodeAtNode(base);
  node.object = base;
  node.property = this.parseIdent(); // must be identifier after dot
  node.computed = false;
  return this.finishNode(node, "MemberExpression");
}
// a[b]
else if (this.eat(tt.bracketL)) {
  const node = this.startNodeAtNode(base);
  node.object = base;
  node.property = this.parseExpression(); // any expression inside brackets
  node.computed = true;
  this.expect(tt.bracketR);
  return this.finishNode(node, "MemberExpression");
}
// ...
```

### 2. Function Call: `a()`

If encountering `(`, it's a function call. `callee` (the called entity) is `base`, `arguments` (parameter list) are expressions separated by commas between `(` and `)`. We can use a helper function `parseExprList` to parse parameters.

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a(b, c)
else if (this.eat(tt.parenL)) {
  const node = this.startNodeAtNode(base);
  node.callee = base;
  // parseExprList parses comma-separated expression lists until specified end token
  node.arguments = this.parseExprList(tt.parenR);
  return this.finishNode(node, "CallExpression");
}
// ...
```

### 3. Postfix Update: `a++`

Postfix `++` and `--`, like their prefix forms, also require **L-Value checking**. Additionally, they have a special rule related to **Automatic Semicolon Insertion (ASI)**: there cannot be a line break between the operand and `++`/`--`.

```javascript
// file: src/parser/expression.js -> parseSubscript(base)

// ...
// a++
// `!this.canInsertSemicolon()` check ensures no line break between a and ++
else if (this.type === tt.incDec && !this.canInsertSemicolon()) {
  const node = this.startNodeAtNode(base);
  this.checkLVal(base); // must be valid L-Value

  node.operator = this.value;
  node.prefix = false; // mark as postfix
  node.argument = base;
  this.next(); // consume `++` or `--`
  return this.finishNode(node, "UpdateExpression");
}
// ...
```

If none of the `if` conditions are met, `parseSubscript` directly returns the original `base`, which will terminate the `parseSubscripts` loop.

## 4. Summary

By introducing the `parseSubscripts` "pipeline", we elegantly solve the parsing problem for all postfix-type expressions.

- **Unified `led` model**: We treat member access, function calls, and postfix updates uniformly as `led` operations acting on left-side expressions.
- **Clear parsing flow**: The three-step strategy `parseMaybeUnary` -> `parseSubscripts` -> `parseExprOp` perfectly maps operator precedence from high to low.
- **Powerful chain handling**: A simple `while` loop implements parsing of complex chained calls like `a.b(c)[d]`, fully demonstrating the power of recursive descent parsing.
- **Syntactic correctness**: Through checks like `checkLVal` and `canInsertSemicolon`, we ensure the parser generates ASTs that strictly conform to JavaScript syntax specifications.

At this point, our expression parser is very close to an industrial-grade parser. It can handle most common expressions. In the next chapter, we'll complete the final pieces: conditional expressions and assignment expressions.