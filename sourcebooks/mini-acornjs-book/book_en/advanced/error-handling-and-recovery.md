# 40. Error Handling and Recovery: Building a More Robust Parser

We have come a long and exciting journey. Our `mini-acorn` has learned how to parse complex JavaScript syntax, how to be extended by plugins, how to generate code and Source Maps, and even how to optimize itself. However, up to this point, we have been living in an "ideal world"—we assumed that all input code was syntactically correct.

In the real world, code is full of errors, especially while developers are typing. The value of an excellent parser lies not only in its ability to handle correct code but also in how it reacts when faced with errors. Does it crash simply and brutally? Or can it provide clear and useful error messages, and even attempt to recover from errors to continue analyzing the rest of the file?

Welcome to the final chapter of this book. Here, we will inject "humanity" into `mini-acorn`, teaching it how to handle errors gracefully and building a more robust, developer-friendly parser.

## The Importance of Quality Error Handling

Imagine you're writing code in an IDE, you just missed a semicolon, and the entire editor goes blank, or gives an uninformative `Error: failed to parse`. This is unacceptable. A good parser, especially when used in a Linter or IDE, must:

1.  **Precise Location**: Accurately indicate **which line and column** the error occurred in the source code.
2.  **Clear Description**: Clearly tell the user **where** the error is and **why** it happened. For example, "At line 5, column 10: Expected a semicolon `;`, but encountered a right brace `}`."
3.  **(Optional) Fault Tolerance and Recovery**: After reporting an error, do not immediately "die," but try to skip the erroneous part, find the next safe place to resume parsing, and continue looking for other possible errors in the file. This allows the IDE to mark all "red lines" in the file at once.

## Refactoring `mini-acorn`'s Error Handling

Currently, our error handling is very crude, usually just `throw new Error("Unexpected token")`. We will systematically refactor this.

### 1. Creating a Unified `unexpected` Method

We should unify all places that throw parsing errors to a single method, such as `this.unexpected()`. This method will be responsible for collecting current position information and formatting error messages.

```javascript
// src/parser.js

pp.raise = function(pos, message) {
  const loc = this.curPosition(); // Get current line and column information
  message += ` (${loc.line}:${loc.column})`;
  const err = new SyntaxError(message);
  err.pos = pos;
  err.loc = loc;
  throw err;
}

pp.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
}
```

Now, we can refactor the `expect` and `eat` methods to call this new error reporting method when assertions fail.

```javascript
// src/parser.js

pp.expect = function(type) {
  if (this.eat(type)) return;
  this.unexpected(); // Use the new method
}
```

### 2. Providing Richer Error Information

"Unexpected token" is accurate but not friendly enough. We can provide more specific information.

```javascript
// src/parser.js

// For example, in expect
pp.expect = function(type) {
  if (this.eat(type)) return;
  const msg = `Unexpected token, expected "${type.label}"`;
  this.raise(this.start, msg);
}
```

This way, when a semicolon is missing, the user will get a clear prompt like `Unexpected token, expected ";" (5:10)`.

## Error Recovery

Error recovery is an advanced topic, but its basic idea is universal: when the parser gets stuck, it needs a strategy to "save itself" rather than giving up immediately.

A simple yet effective strategy is **"synchronization point recovery"**. When `parseStatement` catches a parsing error, instead of letting this error interrupt the entire parsing process, it:

1.  Records this error in an error list.
2.  Enters a "recovery mode," starting to continuously consume (discard) subsequent Tokens.
3.  Until it finds a "synchronization point" where it can safely resume parsing.
4.  Exits recovery mode and attempts to parse the next statement.

What are good synchronization points? Usually, Tokens that clearly mark the end of a statement or the start of a new structure, such as:

-   Semicolon `;`
-   Right brace `}`
-   Keywords like `export`, `import`, `function`, `const`

### Simplified Recovery Logic Example

Let's see how to implement this in `parseTopLevel` (the loop that parses top-level program statements).

```javascript
// src/parser.js

pp.parseTopLevel = function(node) {
  // ...
  node.body = [];
  this.errors = []; // For collecting errors

  while (this.type !== tt.eof) {
    try {
      const stmt = this.parseStatement(true, true);
      node.body.push(stmt);
    } catch (err) {
      // Caught an error!
      this.errors.push(err);

      // Enter recovery mode: continuously consume tokens until finding a synchronization point
      while (this.type !== tt.eof) {
        if (this.type === tt.semi || this.type === tt.braceR) {
          this.next(); // Consume the synchronization point itself
          break; // Found synchronization point, exit recovery mode
        }
        if (this.type.keyword) {
          break; // If it's a keyword, it might also be the start of a new statement
        }
        this.next();
      }
    }
  }
  // ...
}
```

Through this approach, even if there are multiple syntax errors in the file, our parser can "stagger" through to the end and bring back a list containing all error information. This is exactly the core capability required by IDEs and Linters.

## The End of the Journey, and a New Beginning

In this chapter, we installed the last and most crucial "airbag" for `mini-acorn`—a robust error handling and recovery system. We learned:

-   Good error messages are crucial for developer experience.
-   Through unified `raise` / `unexpected` methods, we can systematically improve the quality of error reporting.
-   Error recovery techniques, such as "synchronization point recovery," can make the parser behave more intelligently and resiliently when facing errors.

With this, the core content of the book "mini-acorn.js Parser in Practice: Building from Scratch" is fully completed. We started from a `Lexer` that could only recognize numbers, and step by step built a modern JavaScript parser capable of parsing variables, functions, classes, modules, equipped with a plugin system, able to generate code and Source Maps, and possessing good performance and robustness.

This is more than just a journey about writing a parser. More importantly, through this process, we personally unveiled the magic behind the tools we use daily (such as Babel, Webpack, ESLint, Prettier). We understood what AST is and the role it plays as a "universal language" in the entire frontend toolchain.

**This journey has ended, but your exploration path has just begun.**

Now, you can try:

-   Writing more complex plugins for `mini-acorn`, supporting JSX or TypeScript syntax.
-   Building a simple Linter or code formatting tool based on `mini-acorn`.
-   Deeply reading the source code of Acorn, Babel, or esbuild to see how a truly industrial-grade parser is designed.

May you always stay curious and enjoy the fun of creation on this path of exploring the code world.

Thank you for reading!