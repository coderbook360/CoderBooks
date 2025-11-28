# Parsing Two Basic Statements: Expression Statements and Block Statements

In the previous chapter, we built the powerful skeleton of the `parseStatement` dispatcher, which acts like an experienced project manager, knowing which expert (specific parsing function) to assign different tasks (Tokens) to. However, so far, all the "experts" have only been throwing in the towel—`throw new Error("Not implemented yet!")`.

Starting from this chapter, we will implement these expert functions one by one, adding real flesh and blood to the parser's skeleton. We'll begin with the two most basic and common statements in JavaScript: **Block Statements** (`BlockStatement`) and **Expression Statements** (`ExpressionStatement`).

## Block Statements: Containers for Code

Block statements are statement lists wrapped by a pair of curly braces `{...}`. They are ubiquitous in JavaScript, such as function bodies, `if` branches, `for` loop bodies, etc. Their most core function is to **create a new lexical scope** and combine multiple statements into a logical unit.

```javascript
{
  const a = 1; // a is only valid within this block
  let b = a + 1;
  console.log(b);
}
```

The logic for parsing block statements is very intuitive and can be broken down into the following steps:

1.  Create a `BlockStatement` AST node.
2.  Consume and verify the opening `{` (`tt.braceL`).
3.  Enter a loop, continuously **recursively calling `this.parseStatement()`** to parse each statement inside the block, and collect the results into an array.
4.  When encountering the closing `}` (`tt.braceR`), exit the loop.
5.  Assign the collected statement array to the `body` property of the `BlockStatement` node.
6.  Return the node.

### Implementing `parseBlockStatement`

Now, let's implement this logic with code, replacing the placeholder in `src/parser/index.js`.

```javascript
// src/parser/index.js

// ... (need to import BlockStatement)
import { Program, BlockStatement } from "../ast/node";

// ...

  parseBlockStatement() {
    const node = new BlockStatement(this);
    this.expect(tt.braceL); // Consume '{'

    const body = [];
    // Loop to parse until encountering '}'
    while (!this.eat(tt.braceR)) {
      // Key point: recursively call the statement dispatcher
      body.push(this.parseStatement());
    }

    node.body = body;
    return node;
  }

// ...
```

The core here lies in the `this.parseStatement()` call within the `while` loop. `parseBlockStatement` doesn't know what specific statements are inside the block; it only provides a "container." It delegates the task of parsing internal statements back to the "general commander" `parseStatement`, which identifies whether the next statement is an `if`, a `const` declaration, or another block statement. This recursive structure is the essence of recursive descent parsing.

## Expression Statements: Ubiquitous Execution Units

We have already deeply explored the concept of expression statements in the previous chapter. They are the cornerstone of JavaScript syntax—any expression (function call, assignment, operation, etc.) can become a statement.

Now, we need to formally implement `parseExpressionStatement`, replacing the previous simple mock version.

Its responsibility is simple:
1.  Call `this.parseExpression()` to get a complete expression node.
2.  Wrap this expression node into an `ExpressionStatement` node.
3.  Handle the optional semicolon `;` at the end of the expression.
4.  Return the `ExpressionStatement` node.

### Implementing `parseExpressionStatement`

```javascript
// src/parser/index.js

// ... (need to import ExpressionStatement)
import { Program, BlockStatement, ExpressionStatement } from "../ast/node";

// ...

  parseExpressionStatement() {
    const node = new ExpressionStatement(this);
    // 1. Parse the core expression
    node.expression = this.parseExpression();
    // 2. Consume the optional semicolon
    this.eat(tt.semi);
    return node;
  }

  // Temporarily keep the placeholder for parseExpression
  parseExpression() {
    // The logic here will become extremely complex in the subsequent "Expression Parsing" chapter
    // For now, we simply parse an identifier as a mock
    const node = { type: "Identifier", name: this.value };
    this.nextToken();
    return node;
  }

// ...
```

Note that we use `this.eat(tt.semi)` instead of `this.expect(tt.semi)`. This is because JavaScript's Automatic Semicolon Insertion (ASI) mechanism allows omitting the semicolon at the end of a statement in many cases. The `eat` method will attempt to consume the semicolon—if it exists, it will be consumed; if not, no error will be reported, which exactly meets our needs.

## Empty Statements: The Simplest Statements

In JavaScript, a single semicolon `;` is also a completely legal statement, called an "empty statement." It does nothing but may be used in certain syntactic structures (e.g., infinite loops like `while(true);`).

Parsing it is very simple:

```javascript
// src/parser/index.js

// ... (need to import EmptyStatement)
import { Program, BlockStatement, ExpressionStatement, EmptyStatement } from "../ast/node";

// ...

  parseEmptyStatement() {
    const node = new EmptyStatement(this);
    this.expect(tt.semi); // Consume ';'
    return node;
  }

// ...
```

## Defining AST Nodes

We have implemented parsing functions for three statements. Now we need to define the corresponding AST node classes for them in `src/ast/node.js`.

```javascript
// src/ast/node.js

// ... (Node, Program classes)

export class ExpressionStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "ExpressionStatement";
    this.expression = null; // Will be filled by parseExpressionStatement
  }
}

export class BlockStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "BlockStatement";
    this.body = []; // Will be filled by parseBlockStatement
  }
}

export class EmptyStatement extends Node {
  constructor(parser) {
    super(parser);
    this.type = "EmptyStatement";
  }
}
```

## Summary

Congratulations! We have successfully added the first batch of flesh and blood to the parser's skeleton. By implementing `parseBlockStatement` and `parseExpressionStatement`, our parser can now understand the basic structure of code: it knows how to handle code blocks wrapped by `{}`, and also how to handle the most common function calls and assignment statements.

Although we still have a long way to go before having a complete parser, parsing these two basic statements is a crucial step forward. In the following chapters, we will continue to implement more complex control flow statements and declaration statements based on today's work.