# 28. Parsing Conditional Statements: `if` and `switch`

In the previous chapter, we successfully added the ability to parse variable declarations (`var`, `let`, `const`) to `mini-acorn`. Now it's time for our parser to master the most core logical control capabilities in programming—conditional judgment. This chapter will focus on the parsing implementation of two conditional statements: `if` and `switch`.

Through learning this chapter, you will not only understand the syntax structure of these two statements but also master how to seamlessly integrate their parsing logic with the existing `parseStatement` process in a recursive descent parser, ultimately generating AST nodes that conform to the ESTree specification.

## `if` Statement: Building Logical Branches

The `if` statement is the foundation for implementing logical branches in programming languages. Its structure can be divided into three types:

1. **Simple `if`**: `if (condition) { ... }`
2. **`if-else`**: `if (condition) { ... } else { ... }`
3. **`if-else if-else`**: `if (c1) { ... } else if (c2) { ... } else { ... }`

Although there appear to be three forms, in the AST world, they are all represented by the same node type—`IfStatement`. An `else if` structure essentially means that the parent `IfStatement`'s `alternate` property points to another `IfStatement`.

### AST Structure of `IfStatement`

According to the ESTree specification, an `IfStatement` node contains the following core properties:

- `type`: `"IfStatement"`
- `test`: An expression (`Expression`) representing the condition.
- `consequent`: A statement (`Statement`) representing the code block to execute when the condition is true.
- `alternate`: A statement (`Statement`) or `null`, representing the `else` branch code block.

Let's look at a specific example. For the following code:

```javascript
if (x > 10) {
  result = "greater";
} else {
  result = "smaller";
}
```

Its corresponding `IfStatement` AST node would be roughly as follows:

```json
{
  "type": "IfStatement",
  "test": {
    "type": "BinaryExpression",
    "left": { "type": "Identifier", "name": "x" },
    "operator": ">",
    "right": { "type": "Literal", "value": 10 }
  },
  "consequent": {
    "type": "BlockStatement",
    "body": [
      {
        "type": "ExpressionStatement",
        "expression": {
          "type": "AssignmentExpression",
          "operator": "=",
          "left": { "type": "Identifier", "name": "result" },
          "right": { "type": "Literal", "value": "greater" }
        }
      }
    ]
  },
  "alternate": {
    "type": "BlockStatement",
    "body": [
      {
        "type": "ExpressionStatement",
        "expression": {
          "type": "AssignmentExpression",
          "operator": "=",
          "left": { "type": "Identifier", "name": "result" },
          "right": { "type": "Literal", "value": "smaller" }
        }
      }
    ]
  }
}
```

### Implementing `parseIfStatement`

Now, let's implement the parsing logic for `if` statements. This task can be broken down into the following steps:

1. Create a new AST node `node` with type `IfStatement`.
2. Consume the `if` keyword.
3. Consume the left parenthesis `(`.
4. Call `this.parseExpression()` to parse the `test` expression inside the parentheses.
5. Consume the right parenthesis `)`.
6. Call `this.parseStatement()` to parse the `consequent` part.
7. Check if the current token is the `else` keyword. If yes, consume it and call `this.parseStatement()` again to parse the `alternate` part.
8. Return the created `node`.

Here's the specific implementation of the `parseIfStatement` method:

```javascript
// src/parser.js

pp.parseIfStatement = function (node) {
  this.expect(tt._if); // Consume 'if'
  this.expect(tt.parenL); // Consume '('
  node.test = this.parseExpression(); // Parse condition
  this.expect(tt.parenR); // Consume ')'
  node.consequent = this.parseStatement(); // Parse consequent
  // If next token is 'else', parse alternate
  node.alternate = this.eat(tt._else) ? this.parseStatement() : null;
  return this.finishNode(node, "IfStatement");
};
```

Finally, we need to associate the `if` keyword with our new method in the `parseStatement` method:

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._if:
      return this.parseIfStatement(this.startNode());
    // ...
  }
};
```

## `switch` Statement: Handling Multi-way Branches

Compared to `if` statements, `switch` statements provide a more structured way to handle multi-way branches. Their parsing is slightly more complex because they introduce two new contextual keywords: `case` and `default`.

### AST of `SwitchStatement` and `SwitchCase`

`switch` statements are described in ESTree by two node types working together: `SwitchStatement` and `SwitchCase`.

- **`SwitchStatement`**:
  - `type`: `"SwitchStatement"`
  - `discriminant`: An expression (`Expression`), i.e., the expression in the `switch` parentheses.
  - `cases`: An array of `SwitchCase` nodes.

- **`SwitchCase`**:
  - `type`: `"SwitchCase"`
  - `test`: An expression (`Expression`) or `null`. For `case` branches, it's the matching expression; for `default` branches, it's `null`.
  - `consequent`: An array of statements (`Statement`) representing the code block for that branch.

Let's look at an example:

```javascript
switch (fruit) {
  case "apple":
    console.log("It's an apple.");
    break;
  case "banana":
    console.log("It's a banana.");
    break;
  default:
    console.log("Unknown fruit.");
}
```

Its AST structure would be roughly as follows:

```json
{
  "type": "SwitchStatement",
  "discriminant": { "type": "Identifier", "name": "fruit" },
  "cases": [
    {
      "type": "SwitchCase",
      "test": { "type": "Literal", "value": "apple" },
      "consequent": [
        // ... AST for console.log and break statements
      ]
    },
    {
      "type": "SwitchCase",
      "test": { "type": "Literal", "value": "banana" },
      "consequent": [
        // ... AST for console.log and break statements
      ]
    },
    {
      "type": "SwitchCase",
      "test": null, // default branch
      "consequent": [
        // ... AST for console.log statement
      ]
    }
  ]
}
```

### Implementing `parseSwitchStatement`

The challenge in parsing `switch` statements lies in correctly handling the `case` and `default` blocks inside the curly braces `{}`. We need to parse in a loop until we encounter the right curly brace `}`.

1. Create a `SwitchStatement` node `node`.
2. Consume the `switch` keyword and left parenthesis `(`.
3. Parse the `discriminant` expression.
4. Consume the right parenthesis `)` and left curly brace `{`.
5. Enter a loop until encountering the right curly brace `}`:
   a. Inside the loop, we expect to encounter `case` or `default` keywords.
   b. Create a `SwitchCase` node `caseNode`.
   c. If encountering `case`, consume it and parse the `test` expression. If encountering `default`, consume it and set `test` to `null`.
   d. Consume the colon `:`.
   e. Enter another inner loop to parse all statements (`consequent`) belonging to the current `case`, until encountering the next `case`, `default`, or `}`.
   f. Add `caseNode` to the `node.cases` array.
6. Consume the right curly brace `}`.
7. Return `node`.

```javascript
// src/parser.js

pp.parseSwitchStatement = function (node) {
  this.expect(tt._switch); // Consume 'switch'
  this.expect(tt.parenL); // Consume '('
  node.discriminant = this.parseExpression(); // Parse discriminant
  this.expect(tt.parenR); // Consume ')'
  node.cases = [];
  this.expect(tt.braceL); // Consume '{'

  // Loop to parse case/default blocks
  while (!this.eat(tt.braceR)) {
    const caseNode = this.startNode();
    if (this.eat(tt._case)) {
      caseNode.test = this.parseExpression(); // Parse case's test expression
    } else if (this.eat(tt._default)) {
      caseNode.test = null; // default's test is null
    } else {
      this.unexpected(); // If not case/default/braceR, throw error
    }

    this.expect(tt.colon); // Consume ':'
    caseNode.consequent = [];

    // Loop to parse statements inside case block
    while (
      !this.eat(tt._case) &&
      !this.eat(tt._default) &&
      !this.match(tt.braceR)
    ) {
      caseNode.consequent.push(this.parseStatement());
    }
    node.cases.push(this.finishNode(caseNode, "SwitchCase"));
  }

  return this.finishNode(node, "SwitchStatement");
};
```

Similarly, don't forget to add the `switch` handling branch in `parseStatement`:

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    // ...
    case tt._switch:
      return this.parseSwitchStatement(this.startNode());
    // ...
  }
};
```

## Adding Test Cases

Both theory and implementation are complete. Now it's time to test the results. We need to add comprehensive test cases for `if` and `switch` statements to ensure our parser can correctly handle various edge cases.

In your test file, you can add tests like these:

```javascript
// test/test.js

describe("Conditional Statements", () => {
  it("should parse a simple if statement", () => {
    const ast = parse("if (a) b;");
    // Assert AST structure
    assert.deepStrictEqual(ast.body[0], {
      type: "IfStatement",
      test: { type: "Identifier", name: "a" },
      consequent: {
        type: "ExpressionStatement",
        expression: { type: "Identifier", name: "b" },
      },
      alternate: null,
    });
  });

  it("should parse an if-else statement", () => {
    const ast = parse("if (a) b; else c;");
    // Assert AST structure
  });

  it("should parse an if-else if-else statement", () => {
    const ast = parse("if (a) b; else if (c) d; else e;");
    // Assert AST structure, note the nesting of alternate
  });

  it("should parse a switch statement", () => {
    const ast = parse("switch (a) { case 1: b; break; default: c; }");
    // Assert SwitchStatement and SwitchCase structure
  });
});
```

Please be sure to complete the assertion parts of these test cases yourself and run them. Through testing, you will gain a deeper understanding of the AST structure of conditional statements.

## Summary

Congratulations! `mini-acorn` now has the ability to handle the two most basic structures in program flow control. By extending `parseStatement` and implementing the two core methods `parseIfStatement` and `parseSwitchStatement`, we've enabled the parser to understand and build ASTs for `if` and `switch` statements.

In the next chapter, we will continue to expand the statement parsing capabilities and explore various loop structures in JavaScript: `while`, `do-while`, and `for` loops.