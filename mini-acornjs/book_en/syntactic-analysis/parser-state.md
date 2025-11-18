# Parser Core: State Initialization and Management

We have established the use of "recursive descent" as the core strategy for syntactic analysis. This strategy relies on a series of `parseXXX` functions calling each other to build the AST. But here's a key question: how do these independent functions communicate? How do they share information about parsing progress?

For example, when `parseStatement` calls `parseExpression`, how does `parseExpression` know from which position in the source code it should start parsing? When a parsing error occurs, how can we precisely report which line and column the error occurred at?

The answer is **State**. We need a unified state object that runs through the entire parsing process. It's like the parser's "memory" or "central processing unit," recording all key information about parsing progress. All `parseXXX` functions will share and update this state object.

In this chapter, we will perform a major upgrade to the `Parser` class created during the lexical analysis phase, equipping it with a powerful state management core.

## Parser: A State Machine

Essentially, a parser is a **State Machine**. At any given moment, it is in a specific state, such as "I'm reading an identifier," "I just consumed a plus Token," or "I expect a right parenthesis next." Every time it consumes a new Token, its state undergoes a "transition."

We store all states as instance properties of the `Parser` class, accessible through `this`. This way, each `parseXXX` method can easily read and modify the current parser's state.

We categorize the states into three types:

1.  **Position State**: The parser's "cursor" in the source code.
2.  **Token State**: Complete information about the current Token being processed.
3.  **Contextual State**: Used to handle environment-specific special grammar rules.

## State Initialization

Let's expand the `Parser` class constructor to initialize all necessary states.

```javascript
// src/parser.js (Upgraded Parser)
import { tt } from "./tokentype";

export default class Parser {
  constructor(input) {
    // --- 1. Position State ---
    this.input = input; // Source code string
    this.pos = 0;       // Current character index being scanned
    this.line = 1;      // Current line number
    this.column = 0;    // Current column number

    // --- 2. Token State ---
    // These states are updated by nextToken()
    this.type = tt.eof; // Current Token type
    this.value = null;  // Current Token value
    this.start = 0;     // Starting index of current Token
    this.end = 0;       // Ending index of current Token

    // For more precise error reporting and AST node positioning
    this.startLine = this.line;
    this.startColumn = this.column;
    this.endLine = this.line;
    this.endColumn = this.column;

    // --- 3. Contextual State ---
    this.strict = false;      // Whether in strict mode
    this.inFunction = false;  // Whether inside a function body
    this.inAsync = false;     // Whether inside an async function
    this.inLoop = false;      // Whether inside a loop body
  }

  // ... nextToken() and other lexical analysis methods
}
```

### 1. Position State (`pos`, `line`, `column`)

These three properties are the parser's basic "GPS." They precisely point to the character currently being scanned by the lexical analyzer. They form the foundation for all position calculations (like error reporting) and Token position recording (`start`, `end`). These values are primarily updated during the lexical analysis phase, especially when processing characters and newlines.

### 2. Token State (`type`, `value`, `start`, `end`, ...)

This group of properties is the **direct input for the syntactic analysis phase**. Our `parseXXX` functions should no longer care about the source code string `input`, but should directly read `this.type` to decide what action to take.

- `this.type`: The type of the current Token, e.g., `tt.name`, `tt.num`, `tt._if`.
- `this.value`: The value of the current Token, e.g., the name of an identifier, the value of a number or string.
- `this.start`, `this.end`: The start and end indices of the current Token in the `input` string. This is crucial for generating AST nodes because many tools (like code highlighting, Linter) need to know the source code range corresponding to each node.

Whenever we need to "consume" a Token and advance, we call `nextToken()`. One of the core responsibilities of this method is to update this group of Token state properties of the `Parser` instance with information from the next Token.

### 3. Contextual State (`strict`, `inFunction`, ...)

A major characteristic of JavaScript is the **context-dependency** of its syntax. The same word can have different meanings in different contexts, and can even determine the legality of the syntax.

- **`strict`**: When the parser encounters a statement with the expression `"use strict";`, it needs to set the `this.strict` flag to `true`. Subsequent parsing, such as restrictions on variable names, needs to check this state.
- **`inFunction`**: When we start parsing a function body, we set `this.inFunction` to `true`. This way, when `parseReturnStatement` is called, it can check this state. If a `return` statement is encountered outside a function body (`inFunction` is `false`), a syntax error should be thrown.
- **`inLoop`**: Similarly, `break` and `continue` statements can only appear inside loop bodies. `parseBreakStatement` and `parseContinueStatement` need to check the `this.inLoop` state.
- **`inAsync`**: The `await` keyword can only be used inside `async` functions. `parseAwaitExpression` must check the `this.inAsync` state.

These contextual states are typically maintained by specific `parseXXX` functions when entering and exiting corresponding syntax structures, creating a "state push/pop" effect, thereby ensuring parsing correctness.

## Summary

In this chapter, we built the core "brain" of the `Parser` class—a comprehensive state management system. This system provides all necessary information for subsequent syntactic analysis through position state, Token state, and contextual state.

Correctly initializing and maintaining these states is the cornerstone of writing a robust, precise, and fault-tolerant parser. With this solid foundation, we can start writing real parser helper methods in the next chapter and begin consuming Tokens and building the AST.

### Exercises

1.  In our `Parser` state, we've already added the `inLoop` flag. Think about which `parseXXX` functions (e.g., `parseForStatement`, `parseWhileStatement`) should be responsible for setting it to `true` and `false`?
2.  The `nextToken()` method updates Token-related states. Think again: when and in which module (lexical analyzer or syntax analyzer) should the position states `pos`, `line`, `column` be updated? Why?