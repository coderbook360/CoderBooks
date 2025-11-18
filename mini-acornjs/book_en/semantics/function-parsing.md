# 31. Parsing Functions: Declarations, Expressions, and Arrow Functions

We have built the skeleton of program flow control, and now it's time to inject the soul—functions. Functions are the most fundamental and core organizational units in JavaScript. In this chapter, we will add the ability to parse various function forms to `mini-acorn`, including function declarations, function expressions, and the iconic feature of modern JavaScript—arrow functions.

Function parsing is a highly comprehensive topic. It involves not only the function itself (`async`, `function`, `*` keywords) but also the parsing of complex parameter lists (default parameters, rest parameters, destructuring) and the judgment of different function bodies (block body or expression body). This is undoubtedly one of the most interesting challenges `mini-acorn` has faced so far.

## The AST Family of Functions

ESTree defines different node types for different function forms, which have both similarities and key differences in structure.

- **`FunctionDeclaration`**: Used for declarations like `function foo() {}`.
  - `id`: Function name, must be an `Identifier`.
  - `params`: Parameter array.
  - `body`: Function body, must be a `BlockStatement`.
  - `async`: Boolean value, whether it's an `async function`.
  - `generator`: Boolean value, whether it's a `function*`.

- **`FunctionExpression`**: Used for expressions like `const a = function() {}`.
  - Almost identical to `FunctionDeclaration`, but `id` is **optional** (for creating named function expressions).

- **`ArrowFunctionExpression`**: Used for arrow functions `() => {}`.
  - `id`: Arrow functions don't have `id`, always anonymous, so it's `null`.
  - `params`: Parameter array.
  - `body`: Function body, can be a `BlockStatement` or an `Expression`.
  - `expression`: A boolean value. If `body` is an expression, it's `true`.
  - `async`: Boolean value.
  - `generator`: Arrow functions cannot be generators, this is always `false`.

## Parsing Function Declarations and Expressions

Since function declarations and function expressions are very similar in structure, their parsing logic can be highly reused. We can create a generic `parseFunction` method.

The parsing process is as follows:

1. Check and consume the `async` keyword.
2. Must consume the `function` keyword.
3. Check and consume the `*` (generator) keyword.
4. Parse the function `id`. For function declarations, `id` is required; for function expressions, `id` is optional.
5. Parse the parameter list `(...)`.
6. Parse the function body `{...}`.
7. Create `FunctionDeclaration` or `FunctionExpression` nodes based on context (whether called as a declaration or expression).

```javascript
// src/parser.js

// isStatement: bool, isAsync: bool
pp.parseFunction = function (node, isStatement, isAsync) {
  this.expect(tt._function);
  node.generator = this.eat(tt.star);
  node.async = !!isAsync;

  // Parse function ID
  if (isStatement) {
    node.id = this.parseIdentifier();
  } else if (this.match(tt.name)) {
    node.id = this.parseIdentifier();
  }

  // Parse parameters and function body
  node.params = this.parseFunctionParams();
  node.body = this.parseBlock();

  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

// Helper method for parsing parameter lists
pp.parseFunctionParams = function () {
  const params = [];
  this.expect(tt.parenL);
  while (!this.eat(tt.parenR)) {
    params.push(this.parseIdentifier()); // Simplified version: only supports simple identifiers
    if (!this.match(tt.parenR)) this.expect(tt.comma);
  }
  return params;
};
```

> **About Parameter Parsing**: In the real Acorn, `parseFunctionParams` is a very complex method that needs to handle default values (`a = 1`), rest parameters (`...args`), and destructuring (`{a, b}`). Here we simplify it to focus on the core process.

Then, in `parseStatement`, we can call it like this:

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  if (startType === tt._function) {
    return this.parseFunction(this.startNode(), true);
  }
  // ...
}
```

## The Challenge of Parsing Arrow Functions

The reason why arrow function parsing is tricky is that its beginning may look exactly like a regular parenthesized expression. For example, when the parser reads `(a, b)`, it cannot determine whether this is a parenthesized expression or an arrow function's parameter list. Only when it continues reading and sees the distinctive `=>` token can it make a final judgment.

Parsers like Acorn adopt a very clever strategy:

1. **Try First**: Proceed normally according to the expression parsing process. For example, parse `(a, b)` as a sequence expression.
2. **Check for `=>`**: After parsing this potential "expression", check if the next token is `=>`.
3. **Convert or Confirm**:
   - If it's `=>`, then the previously parsed "expression" is actually the arrow function's parameters. The parser needs to "convert" or "reinterpret" the already generated expression AST node into a parameter list AST node.
   - If it's not `=>`, then it's a regular expression, and the parsing process continues.

### Implementing `parseArrowExpression`

This conversion logic is the essence of combining `Pratt` parser with recursive descent. When `parseExprAtom` finishes parsing a parenthesized expression or an identifier, it checks if `=>` follows.

```javascript
// src/parser.js - (in expression parsing section)

pp.parseExprAtom = function (refShorthandDefaultPos) {
  // ...
  let node;
  switch (this.type) {
    case tt.parenL:
      // Could be (a, b) => ... or (a + b)
      node = this.parseParenAndDistinguishExpression(); 
      break;
    // ...
  }
  return node;
};

pp.parseParenAndDistinguishExpression = function() {
  const start = this.start;
  this.expect(tt.parenL);
  // ... Complex parameter parsing and conversion logic omitted

  // Simplified idea:
  const expr = this.parseExpression(); // First parse as regular expression
  this.expect(tt.parenR);

  if (this.eat(tt.arrow)) { // Found =>
    // This is an arrow function!
    const arrowNode = this.startNodeAt(start);
    arrowNode.params = [expr]; // Highly simplified: treat the entire expression as one parameter
    arrowNode.body = this.parseArrowExpressionBody();
    return this.finishNode(arrowNode, "ArrowFunctionExpression");
  } else {
    // This is a regular parenthesized expression
    return expr;
  }
}

// Parse arrow function body
pp.parseArrowExpressionBody = function() {
  if (this.match(tt.braceL)) {
    // Is { ... } block function body
    return this.parseBlock();
  } else {
    // Is a + b such expression function body
    return this.parseExpression();
  }
}
```

The code above is a highly simplified conceptual model that reveals the core strategy of "**parse first, judge later**". The real implementation would be more sophisticated, directly building correct parameter nodes during parameter list parsing rather than creating expression nodes first and then converting.

## Adding Test Cases

Function testing needs to cover multiple forms and edge cases.

```javascript
// test/test.js

describe("Function Parsing", () => {
  it("should parse a function declaration", () => {
    const ast = parse("function hello(a) { return a; }");
    // Assert FunctionDeclaration's id, params, body
  });

  it("should parse an async generator function expression", () => {
    const ast = parse("const f = async function* gen() {};");
    // Assert FunctionExpression's async and generator flags
  });

  it("should parse an arrow function with a block body", () => {
    const ast = parse("(a, b) => { return a + b; }");
    // Assert ArrowFunctionExpression's body is BlockStatement
  });

  it("should parse an arrow function with an expression body", () => {
    const ast = parse("x => x * 2");
    // Assert ArrowFunctionExpression's body is BinaryExpression
    // and expression flag is true
  });

  it("should parse arrow function with complex parameters", () => {
    const ast = parse("({a, b}, [c], ...d) => {}");
    // Assert parameter list's AST structure
  });
});
```

## Summary

In this chapter, we conquered the most core part of JavaScript parsing—function parsing. We learned how to distinguish and parse function declarations, function expressions, and arrow functions, and understood their respective AST structures.

We specifically explored the complexity of arrow function parsing and understood the advanced parsing strategy of "parse first, judge later". Although our implementation is simplified, it reveals the internal mechanisms of real parsers.

At this point, `mini-acorn` has mastered most statements and expressions in JavaScript. In the next chapter, we will challenge another important concept introduced in ES6: class parsing.