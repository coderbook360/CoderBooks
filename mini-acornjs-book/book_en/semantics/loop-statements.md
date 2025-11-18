# 29. Parsing Loop Statements: `while`, `do-while`, `for`

Following our mastery of conditional statement parsing in the previous chapter, it's time to conquer another pillar of program flow control—loop statements. In this chapter, we will add the ability to parse `while`, `do-while`, and the powerful `for` loop (including its variants `for-in` and `for-of`) to `mini-acorn`.

Loop statement parsing, especially `for` loops, is a very interesting and challenging part of parser implementation. It requires us not only to handle the various components of loops but also to accurately decide which type of AST node to generate based on subtle syntax differences (such as the appearance of `in` or `of` keywords).

## `while` and `do-while`: Simple Loops

Let's start with the two simplest types of loops: `while` and `do-while`.

### AST of `WhileStatement` and `DoWhileStatement`

- **`WhileStatement`**: Represents `while` loops.
  - `test`: The loop's condition expression.
  - `body`: The loop body statement block.

- **`DoWhileStatement`**: Represents `do-while` loops.
  - `body`: The loop body statement block.
  - `test`: The loop's condition expression.

Their structures are very intuitive, with the only difference being that `do-while` guarantees the loop body executes at least once.

### Implementing `parseWhileStatement` and `parseDoWhileStatement`

Their parsing processes are relatively straightforward:

- **`parseWhileStatement`**: Consume `while` -> Consume `(` -> Parse `test` expression -> Consume `)` -> Parse `body` statement.
- **`parseDoWhileStatement`**: Consume `do` -> Parse `body` statement -> Consume `while` -> Consume `(` -> Parse `test` expression -> Consume `)`.

Let's add them to `parser.js`:

```javascript
// src/parser.js

pp.parseWhileStatement = function (node) {
  this.expect(tt._while);
  this.expect(tt.parenL);
  node.test = this.parseExpression();
  this.expect(tt.parenR);
  node.body = this.parseStatement();
  return this.finishNode(node, "WhileStatement");
};

pp.parseDoWhileStatement = function (node) {
  this.expect(tt._do);
  node.body = this.parseStatement();
  this.expect(tt._while);
  this.expect(tt.parenL);
  node.test = this.parseExpression();
  this.expect(tt.parenR);
  // The semicolon at the end of do-while is optional
  this.eat(tt.semi);
  return this.finishNode(node, "DoWhileStatement");
};
```

## `for` Loop: One Entry, Multiple Possibilities

The `for` loop is the focus and difficulty of parsing. The same `for` keyword can initiate three completely different loop modes:

1. **`for` loop (C-style)**: `for (let i = 0; i < 10; i++) { ... }`
2. **`for-in` loop**: `for (const key in object) { ... }`
3. **`for-of` loop**: `for (const item of array) { ... }`

Our parser must decide which loop to parse by checking the content after parsing the `for` keyword and left parenthesis `(`.

### The AST Family of `for` Loops

- **`ForStatement`**: Corresponds to C-style `for` loops.
  - `init`: Initialization part, can be `VariableDeclaration`, `Expression`, or `null`.
  - `test`: Condition expression or `null`.
  - `update`: Update expression or `null`.
  - `body`: Loop body.

- **`ForInStatement`**: Corresponds to `for-in` loops.
  - `left`: Loop variable, can be `VariableDeclaration` or an lvalue expression.
  - `right`: The object expression being traversed.
  - `body`: Loop body.

- **`ForOfStatement`**: Corresponds to `for-of` loops, similar in structure to `ForInStatement`.
  - `await`: A boolean value for `for-await-of` scenarios.

### Implementing `parseForStatement`: The Dispatch Center

We'll put all the logic in the `parseForStatement` method. The core responsibility of this method is to act as a "dispatch center".

The parsing process is as follows:

1. Consume the `for` keyword and left parenthesis `(`.
2. Parse the first part inside the parentheses, which we call `init`. This part could be a variable declaration (like `let i = 0`), an expression (like `i = 0`), or even empty (like `for (;;)`).
3. **Key decision point**: Look at the token after parsing `init`:
   - If the current token is the `in` keyword, then we determine this is a `for-in` loop. We use the already parsed `init` as the `left` part, then continue parsing the `right` part.
   - If the current token is the `of` keyword, then this is a `for-of` loop. The handling is similar to `for-in`.
   - If the current token is a semicolon `;`, then this is a classic C-style `for` loop. We continue parsing the `test` and `update` parts step by step.
4. After parsing all content inside the parentheses, consume the right parenthesis `)`, then parse the `body`.
5. Based on the type determined at the decision point, complete the creation of the corresponding AST node and return it.

```javascript
// src/parser.js

pp.parseForStatement = function (node) {
  this.expect(tt._for);
  this.expect(tt.parenL);

  // 1. Parse init part
  let init = null;
  if (this.match(tt.semi)) {
    // for (;;) an empty init
  } else if (this.match(tt._var) || this.match(tt._let) || this.match(tt._const)) {
    init = this.parseVar();
  } else {
    init = this.parseExpression();
  }

  // 2. Decision point: determine if it's for, for-in, or for-of
  if (this.eat(tt._in) || this.eat(tt._of)) {
    // This is for-in or for-of
    const isForIn = this.type === tt._in;
    const forNode = this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
    forNode.left = init;
    forNode.right = this.parseExpression();
    this.expect(tt.parenR);
    forNode.body = this.parseStatement();
    return forNode;
  } else {
    // This is a classic for loop
    const forNode = this.finishNode(node, "ForStatement");
    forNode.init = init;
    this.expect(tt.semi);
    forNode.test = this.match(tt.semi) ? null : this.parseExpression();
    this.expect(tt.semi);
    forNode.update = this.match(tt.parenR) ? null : this.parseExpression();
    this.expect(tt.parenR);
    forNode.body = this.parseStatement();
    return forNode;
  }
};
```

> **Note**: The above implementation of `parseForStatement` is a simplified version to illustrate the core idea. In Acorn's complete implementation, the logic would be more complex and refined to handle more complex expressions on the left side of `for-in`/`for-of` (like destructuring assignments) and `for-await-of` scenarios. But this simplified version already captures the essence of the dispatch mechanism.

Finally, register all the new parsing methods in `parseStatement`:

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._while:
      return this.parseWhileStatement(this.startNode());
    case tt._do:
      return this.parseDoWhileStatement(this.startNode());
    case tt._for:
      return this.parseForStatement(this.startNode());
    // ...
  }
};
```

## Adding Test Cases

Now it's time to verify our work through testing. You need to add test cases for various forms of `while`, `do-while`, and `for` loops.

```javascript
// test/test.js

describe("Loop Statements", () => {
  it("should parse a while statement", () => {
    const ast = parse("while (a < 1) { a++; }");
    // Assert WhileStatement's AST structure
  });

  it("should parse a do-while statement", () => {
    const ast = parse("do { a++; } while (a < 1);");
    // Assert DoWhileStatement's AST structure
  });

  it("should parse a classic for statement", () => {
    const ast = parse("for (let i = 0; i < 10; i++) { go(); }");
    // Assert ForStatement's AST structure
  });

  it("should parse a for-in statement", () => {
    const ast = parse("for (const key in obj) { console.log(key); }");
    // Assert ForInStatement's AST structure
  });

  it("should parse a for-of statement", () => {
    const ast = parse("for (const val of arr) { console.log(val); }");
    // Assert ForOfStatement's AST structure
  });

  it("should parse a for statement with empty parts", () => {
    const ast = parse("for (;;) { break; }");
    // Assert ForStatement's init, test, update are all null
  });
});
```

## Summary

In this chapter, we successfully introduced support for all major loop structures in JavaScript to `mini-acorn`. By implementing `parseWhileStatement`, `parseDoWhileStatement`, and an intelligent `parseForStatement` dispatch center, our parser can now understand more complex program control flows.

The parsing of `for` loops particularly exercised our ability to handle "syntactic ambiguity"—in the early stages of parsing, we don't know which type of `for` loop we're facing and must dynamically decide based on subsequent tokens (`in`, `of`, or `;`). This is a common and important pattern in parser design.

In the next chapter, we will handle another important group of statement types: control transfer statements, including `return`, `break`, `continue`, and `throw`. These statements will enable our parser to handle key behaviors like function returns and loop interruptions.