# Statement Parsing Dispatch: parseStatement Implementation

In the previous chapter, we built the `parseTopLevel` top-level loop, which acts like a tireless worker, continuously processing from the beginning of the code until the end of the file (`EOF`). At each step of the loop, it calls `this.parseStatement()`, expecting this function to parse a complete JavaScript statement.

However, JavaScript has a wide variety of statement types: variable declarations (`const`, `let`, `var`), conditional statements (`if`), loop statements (`for`, `while`), block statements (`{...}`), etc. How does `parseStatement` know which type of statement it's currently facing?

The answer lies in the **signature Token** at the beginning of each statement.

## Dispatcher Pattern: The Traffic Hub of Parsing

The core responsibility of `parseStatement` is not to parse a specific statement itself, but to play the role of a "traffic controller" or "dispatch center" (Dispatcher). It determines which "specialized" parsing function should take over next by examining the current Token to be processed (`this.type`).

- See the `if` keyword (`tt._if`), call `parseIfStatement()`.
- See the `{` symbol (`tt.braceL`), call `parseBlockStatement()`.
- See the `const` or `let` keyword, call `parseVarStatement()`.

This design pattern of "only responsible for dispatching, not for specific execution" is the **Dispatcher Pattern**. It keeps the logic of `parseStatement` clear, simple, and extremely easy to extend. Whenever we want to support a new statement type, we only need to:
1.  Write a new, specialized parsing function (e.g., `parseSwitchStatement`).
2.  Add an entry pointing to the new function in the dispatching logic of `parseStatement`.

## `switch` Statement: The Most Efficient Dispatch Implementation

The most direct and efficient way to implement a dispatcher is to use a `switch` statement. We can build a large `switch` structure based on the value of `this.type`, mapping different Token types to different handler functions.

Let's add the initial implementation of the `parseStatement` method to the `Parser` class in `src/parser/index.js`.

```javascript
// src/parser/index.js

import { tt } from "../token-type";
import { Program } from "../ast/node";

export class Parser {
  // ... (constructor, match, eat, expect, etc.)

  parse() {
    // ...
  }

  parseTopLevel() {
    // ...
  }

  // New: Statement Dispatcher
  parseStatement() {
    const startType = this.type;

    switch (startType) {
      // We will add various cases here
      
      // Default case
      default:
        return this.parseExpressionStatement();
    }
  }

  // Placeholder: Expression Statement Parsing
  parseExpressionStatement() {
    // Temporarily return a simulated node
    const node = { type: "ExpressionStatement", expression: this.parseExpression() };
    this.nextToken(); // Consume the token after the expression
    return node;
  }

  // Placeholder: Expression Parsing
  parseExpression() {
    // Temporarily return a simulated node
    return { type: "Identifier", name: this.value };
  }
}
```

In this code, we define the basic structure of `parseStatement`. Currently, it only has a `default` branch, which always calls `parseExpressionStatement`.

## Default Option: Expression Statement

You might be curious about the behavior of the `default` branch: why not directly report an error when encountering an unrecognized Token, but instead call `parseExpressionStatement`?

This is precisely a core characteristic of JavaScript syntax. In JavaScript, **any expression, as long as it is followed by a semicolon (or automatically completed by the engine in specific cases), can become a legal statement**. This type of statement is called an "Expression Statement".

Consider the following examples:
```javascript
// This is an assignment expression
a = 1; 

// This is a function call expression
console.log("Hello");

// This is a legal, but meaningless string literal expression
"useless";
```
From the parser's perspective, when it encounters an identifier `a`, `console`, or a string `"useless"` in `parseStatement`, these Tokens don't resemble the beginning of any known statement (like `if`, `for`). At this point, the parser's boldest and most reasonable guess is: "This should be the beginning of an expression statement."

Therefore, the task of the `default` branch is to call the expression parser `this.parseExpression()`, let it parse out a complete expression, and then wrap this expression node in an `ExpressionStatement` node and return it.

This is why the `default` branch of `parseStatement` is `parseExpressionStatement`. It provides a unified entry point for handling a large amount of ordinary code (function calls, assignments, etc.).

## Completing the `switch` Structure

Now, let's add more "specialized" branches to `parseStatement` and create temporary placeholder functions for them.

```javascript
// src/parser/index.js

// ...

  parseStatement() {
    const startType = this.type;

    switch (startType) {
      // 1. Keyword-driven statements
      case tt._if: return this.parseIfStatement();
      case tt._for: return this.parseForStatement();
      case tt._while: return this.parseWhileStatement();
      case tt._return: return this.parseReturnStatement();

      // 2. Declaration keywords
      case tt._const:
      case tt._let:
        return this.parseVarStatement(startType); // Pass the keyword type

      case tt._function:
        return this.parseFunctionStatement();

      // 3. Punctuation-driven statements
      case tt.braceL: // {
        return this.parseBlockStatement();
      case tt.semi: // ;
        return this.parseEmptyStatement();

      // 4. Default case: Expression Statement
      default:
        return this.parseExpressionStatement();
    }
  }

  // --- Add placeholders for various statement parsers ---

  parseIfStatement() { throw new Error("parseIfStatement not implemented yet!"); }
  parseForStatement() { throw new Error("parseForStatement not implemented yet!"); }
  parseWhileStatement() { throw new Error("parseWhileStatement not implemented yet!"); }
  parseReturnStatement() { throw new Error("parseReturnStatement not implemented yet!"); }
  parseVarStatement(kind) { throw new Error(`parseVarStatement (${kind.label}) not implemented yet!`); }
  parseFunctionStatement() { throw new Error("parseFunctionStatement not implemented yet!"); }
  parseBlockStatement() { throw new Error("parseBlockStatement not implemented yet!"); }
  parseEmptyStatement() { throw new Error("parseEmptyStatement not implemented yet!"); }

  // ... (parseExpressionStatement and parseExpression)
```

This `switch` structure clearly demonstrates our parsing strategy:
- **Keyword-driven**: Most statements are guided by keywords like `if`, `for`.
- **Declarations**: `const`, `let`, `function` are used to introduce new identifiers. Note that `const` and `let` can share a handler function `parseVarStatement`.
- **Punctuation-driven**: `{` starts a code block, `;` itself constitutes an empty statement.
- **Default**: All other cases are handled by `parseExpressionStatement`.

With these placeholders, we have built the "skeleton" of the syntax analyzer. The task of the following chapters is to implement these functions currently occupied by `throw new Error`, adding flesh and blood to this skeleton.

## Summary

In this chapter, we implemented the "heart" of syntactic analysis—the `parseStatement` dispatcher. It uses an efficient `switch` statement to precisely route parsing tasks to various specialized parsing functions. At the same time, we gained a deep understanding of the concept of "Expression Statement" and made it the parser's default processing path.

This dispatcher is the "backbone" connecting `parseTopLevel` and all specific statement parsing functions. All subsequent specific statement parsing work will grow as branches from this main trunk.