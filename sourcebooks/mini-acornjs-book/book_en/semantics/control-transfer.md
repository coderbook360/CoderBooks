# 30. Parsing Control Transfer Statements: `return`, `break`, `continue`, `throw`

So far, our `mini-acorn` has been able to understand variable declarations, conditional statements, and loops. Now, we need to give it a crucial capability: understanding those "jump" instructions that can alter the normal execution flow of a program. In this chapter, we will focus on parsing four control transfer statements: `return`, `break`, `continue`, and `throw`.

Although these statements are relatively simple in syntax, they all come with special contextual constraints and rules. For example, `return` can only be used within functions, and `break` can only be used within loops or `switch` statements. Additionally, they are all strictly constrained by the Automatic Semicolon Insertion (ASI) mechanism. Understanding and correctly handling these details is key to building a robust parser.

## AST Structure of Control Transfer Statements

In the ESTree specification, these four statements each have their own dedicated, clearly structured AST nodes:

- **`ReturnStatement`**: Represents the `return` statement.
  - `argument`: The expression following `return`. If `return` is used alone, this is `null`.

- **`BreakStatement`**: Represents the `break` statement.
  - `label`: An `Identifier` or `null`. If `break` is followed by a label (e.g., `break myLabel;`), `label` is the identifier node for that label; otherwise, it's `null`.

- **`ContinueStatement`**: Represents the `continue` statement.
  - `label`: Similar to `BreakStatement`, represents the optional label.

- **`ThrowStatement`**: Represents the `throw` statement.
  - `argument`: The expression that must follow `throw`.

## Impact of Automatic Semicolon Insertion (ASI)

Before diving into implementation, we must first understand the special impact of ASI on these four statements. `return`, `break`, `continue`, and `throw` all belong to JavaScript's "restricted productions".

This means that if there is a line break between these keywords and their following values (expressions or labels), the JavaScript engine will **automatically** insert a semicolon after the keyword. For example:

```javascript
return
  "hello";
```

During parsing, this will be treated as two separate statements: `return;` and `"hello";`. Therefore, when parsing these statements, our parser must check whether there is a line break between the keyword and its arguments to correctly simulate this behavior.

## Implementing Parsing Methods

We will create a dedicated parsing method for each statement and dispatch them in `parseStatement`.

### `parseReturnStatement`

The parsing logic for `return` statements is as follows:

1. Consume the `return` keyword.
2. Check if the current line has ended, or if the next token cannot be the start of an expression (such as `}`). If so, it means `return` is not followed by an expression.
3. Otherwise, parse the `argument` expression.
4. Check and consume the optional semicolon.

```javascript
// src/parser.js

pp.parseReturnStatement = function (node) {
  this.expect(tt._return);

  // Check ASI: if there's a line break or no valid expression, argument is null
  if (this.eat(tt.semi) || this.isLineTerminator()) {
    node.argument = null;
  } else {
    node.argument = this.parseExpression();
    this.eat(tt.semi);
  }

  return this.finishNode(node, "ReturnStatement");
};
```

### `parseBreakContinueStatement`

The structures of `break` and `continue` are very similar, so we can handle them with a single method.

1. Consume the `break` or `continue` keyword.
2. Check if an identifier follows immediately (as `label`). Again, we need to consider ASI's impact, meaning there cannot be a line break between the keyword and the label.
3. If a label exists, parse the `Identifier` and assign it to the `label` property.
4. Check and consume the optional semicolon.

```javascript
// src/parser.js

pp.parseBreakContinueStatement = function (node, keyword) {
  const isBreak = keyword === "break";
  this.expect(isBreak ? tt._break : tt._continue);

  // Check ASI and optional label
  if (this.eat(tt.semi) || this.isLineTerminator()) {
    node.label = null;
  } else if (this.type === tt.name) {
    node.label = this.parseIdentifier();
    this.eat(tt.semi);
  } else {
    this.unexpected();
  }

  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};
```

### `parseThrowStatement`

The `throw` statement is similar to `return`, but it **must** be followed by an expression.

1. Consume the `throw` keyword.
2. Check ASI to ensure there is no line break between `throw` and the expression. If there is, it's a syntax error.
3. Parse the `argument` expression.
4. Check and consume the optional semicolon.

```javascript
// src/parser.js

pp.parseThrowStatement = function (node) {
  this.expect(tt._throw);

  // Check ASI: throw must have an expression and cannot have a line break
  if (this.isLineTerminator()) {
    this.unexpected(); // Throw new Error("Newline after throw is not allowed")
  }

  node.argument = this.parseExpression();
  this.eat(tt.semi);

  return this.finishNode(node, "ThrowStatement");
};
```

### Updating `parseStatement`

Finally, integrate these new parsing methods into our main dispatcher `parseStatement`.

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._return:
      return this.parseReturnStatement(this.startNode());
    case tt._break:
      return this.parseBreakContinueStatement(this.startNode(), "break");
    case tt._continue:
      return this.parseBreakContinueStatement(this.startNode(), "continue");
    case tt._throw:
      return this.parseThrowStatement(this.startNode());
    // ...
  }
};
```

## Adding Test Cases

To ensure our implementation is correct, especially for cases involving labels and ASI effects, writing comprehensive tests is crucial.

```javascript
// test/test.js

describe("Control Transfer Statements", () => {
  it("should parse a return statement with an argument", () => {
    const ast = parse("return 42;");
    // Assert ReturnStatement's argument
  });

  it("should parse a return statement without an argument", () => {
    const ast = parse("return;");
    // Assert ReturnStatement's argument is null
  });

  it("should parse a throw statement", () => {
    const ast = parse("throw new Error('fail');");
    // Assert ThrowStatement's argument
  });

  it("should parse a break statement without a label", () => {
    const ast = parse("while(true) { break; }");
    // Assert BreakStatement's label is null
  });

  it("should parse a continue statement with a label", () => {
    const ast = parse("outer: while(true) { continue outer; }");
    // Assert ContinueStatement's label is an Identifier with name 'outer'
  });
});
```

## Summary

In this chapter, we successfully added the ability to parse four key control transfer statements to `mini-acorn`. By implementing `parseReturnStatement`, `parseBreakContinueStatement`, and `parseThrowStatement`, our parser can now handle important programming constructs like function returns, loop breaks, and exception throwing.

We also paid special attention to the restrictions imposed by Automatic Semicolon Insertion (ASI) on these statements, which is an important step in ensuring our parser behaves consistently with real JavaScript engines.

As our statement parsing capabilities continue to improve, our parser is getting closer to being a fully functional tool. In the next chapter, we will tackle a very core and complex concept in JavaScript: parsing functions, including function declarations, function expressions, and arrow functions.