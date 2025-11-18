# Implementing Parser Helper Methods

We have established a robust state management system for the `Parser`. Now, before formally writing core recursive descent functions like `parseStatement`, `parseExpression`, etc., we need to build a "toolkit"—a series of helper methods.

When implementing various `parseXXX` functions, we will repeatedly encounter the same operation patterns:

- "Check if the current token is the `if` keyword?"
- "If the current token is a left parenthesis `(`, 'eat' it, then continue parsing the content inside the parentheses."
- "Here must be a semicolon `;`, if not, it means the code is written incorrectly and we must report an error!"

If we write these primitive logics directly in the core parsing functions every time, the code will become verbose, repetitive, and difficult to read. The goal of this chapter is to encapsulate these high-frequency operations into a set of concise, expressive helper functions, making our parsing code read as naturally as grammar rules.

## Core Operations: Match, Eat, Expect

Our toolkit is primarily built around three core actions:

- **Match**: Only checks the type of the current Token, **does not** change the parser state.
- **Consume/Eat**: After confirming the current Token matches expectations, calls `nextToken()` to advance the parser's state to the next Token.
- **Expect**: Forces the current Token to be of a certain type, otherwise throws an error and interrupts parsing.

Let's implement these methods in the `Parser` class.

```javascript
// src/parser.js (Add the following methods to the Parser class)

/**
 * Check if the current Token type matches
 * @param {TokenType} type Expected Token type
 * @returns {boolean}
 */
match(type) {
  return this.type === type;
}

/**
 * If the current Token matches, consume it and return true.
 * This is a "gentle" consumption, used for handling optional syntax parts.
 * @param {TokenType} type Expected Token type
 * @returns {boolean}
 */
 eat(type) {
  if (this.match(type)) {
    this.nextToken(); // Consume, advance!
    return true;
  }
  return false;
}

/**
 * Force the current Token to match, otherwise throw an error.
 * This is a "strict" consumption, used for handling fixed syntax structures.
 * @param {TokenType} type Expected Token type
 */
expect(type) {
  if (this.eat(type)) {
    return; // Successfully consumed, everything is fine
  }
  // Failed, throw error
  this.raise(`Unexpected token, expected "${type.label}"`);
}
```

- `match(type)`: This is the most basic judgment tool, a read-only operation that never calls `nextToken()`.
- `eat(type)`: Adds a "write operation" on top of `match`. If the match is successful, it calls `nextToken()` to update the parser state and returns `true`. It's perfect for handling optional syntax parts, such as the optional `else` clause after an `if` statement, or the optional semicolon at the end of a statement.
- `expect(type)`: This is the "guardian" of grammar rules. It directly reuses `eat`. If `eat` fails, it means the syntax doesn't match, and it immediately calls `raise` to interrupt parsing. It's suitable for all mandatory syntax parts, such as `(` after `if`, `)` in function calls, etc.

## Unified Error Handling: `raise`

The `expect` method relies on a unified error-throwing function `raise`. Converging all syntax error throws to one place ensures consistency and debuggability of error messages.

```javascript
// src/parser.js (Add to the Parser class)

/**
 * Throw a syntax error with precise position information
 * @param {string} message Error message
 */
raise(message) {
  const err = new SyntaxError(message);
  // Attach current Token's starting position information to the error object
  err.pos = this.start;
  err.line = this.startLine;
  err.column = this.startColumn;
  throw err;
}
```

This method creates a standard `SyntaxError` and attaches the starting position of the current Token (`this.start`, `this.startLine`, `this.startColumn`) to the error object. When the upper-level caller catches this error, it can use this information to highlight the error position in the source code, greatly improving the development experience.

## The "Telescope" for Resolving Ambiguity: `lookahead`

Sometimes, relying solely on the **current** Token is not enough to determine the correct parsing path. For example, `let` can be used as a variable name in non-strict mode, but if it's immediately followed by a `[` (like `let [a] = [1]`), it becomes a destructuring assignment keyword. To distinguish these cases, we need to "look ahead," which is **Lookahead**.

The principle of `lookahead` is like "save/load" in games:

1.  **Save**: Save all current states of the parser (position, current Token information, etc.).
2.  **Explore**: Call `nextToken()` to advance the parser, load and check the next Token.
3.  **Load**: Restore the parser's state to the state saved in step 1, pretending nothing happened.

This way, we can peek at future Tokens without actually changing the parser state. Here's a simplified implementation to demonstrate how it works:

```javascript
// src/parser.js (Add to the Parser class)

/**
 * Look ahead one Token without consuming it
 * @returns {object} Lookahead Token information
 */
lookahead() {
  // 1. Save: Save all current states
  const oldState = {
    pos: this.pos, line: this.line, column: this.column,
    type: this.type, value: this.value,
    start: this.start, end: this.end,
    startLine: this.startLine, startColumn: this.startColumn,
    endLine: this.endLine, endColumn: this.endColumn,
    // ...and all contextual states
  };

  // 2. Explore: Load the next Token
  this.nextToken();

  // 3. Record the lookahead Token information
  const lookaheadToken = { type: this.type, value: this.value, start: this.start };

  // 4. Load: Restore all states, pretend nothing happened
  Object.assign(this, oldState);

  return lookaheadToken;
}
```

> **Note**: Mature parsers like Acorn have more sophisticated implementations. They typically create a temporary, independent parser instance for pre-scanning instead of manually saving and restoring states. This is more robust and avoids bugs caused by forgetting to save/restore certain states.

## Summary

At this point, we have built the core toolkit for the parser. This "Swiss Army knife" composed of `match`, `eat`, `expect`, `raise`, and `lookahead` abstracts the underlying, repetitive Token operations into clear, declarative method calls.

With these powerful tools, we can finally focus on the core task of syntactic analysis. In the next chapter, we will write the first real `parse` method, starting from the top level of the program, formally consuming Tokens and building our abstract syntax tree.

### Exercises

1.  **Implement `eatContextual(keyword)`**: Acorn has an `eatContextual` method for consuming "contextual keywords" (like `async`, which is only a keyword in specific contexts). It needs to check if the current Token is a `tt.name` and if its `value` equals the given `keyword`. Try to implement it.
2.  **Enrich Error Information**: Modify the `expect` function to accept an optional `message` parameter. If `message` is provided, use it when calling `raise`; otherwise, use the default `Unexpected token...` message. This can provide more precise error hints in certain complex scenarios.