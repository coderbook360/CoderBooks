# Implementing Tokenizer: Handling Whitespace, Comments, and Token Reading

In the previous chapter, we carefully designed the two core data structures `Token` and `TokenType`, which are the "standard components" of our lexical analysis. Now, it's time to build an "assembly line" that can produce these components. The core of this assembly line is our `Parser` class and one of its most important methods: `nextToken()`.

## 1. Building the Parser Framework

We'll return to the `src/parser.js` file (create it if it doesn't exist) and add the state and basic structure required for lexical analysis to the `Parser` class. This class will run through the entire construction process of our parser.

```javascript
// src/parser.js
import { tt } from "./tokentype.js";

export class Parser {
  constructor(input) {
    // Source code string
    this.input = input;

    // --- Lexical Analysis State ---
    // pos: current position in the input string (index)
    // line: current line number (starting from 1)
    // column: current column number (starting from 0)
    this.pos = 0;
    this.line = 1;
    this.column = 0;

    // --- Syntax Analysis State ---
    // These properties are updated every time nextToken() is called
    // type: current Token type (TokenType instance)
    // value: current Token value
    // start: starting position of current Token
    // end: ending position of current Token
    this.type = tt.eof;
    this.value = null;
    this.start = 0;
    this.end = 0;
  }

  // Helper function for throwing errors
  raise(message, pos) {
    const err = new Error(message);
    err.pos = pos;
    throw err;
  }
}
```

**Design Analysis**:

*   We've centralized both lexical and syntax analysis states in the `Parser` instance. `pos`, `line`, `column` are the "cursor" that moves through the source code during lexical analysis.
*   `type`, `value`, `start`, `end` represent the "current" Token. When the syntax analyzer works, it only cares about these properties and doesn't need to know the complex logic inside `nextToken()`. This is a very important decoupling design.

## 2. `nextToken()`: The Engine of Lexical Analysis

`nextToken()` is the core engine that drives the entire lexical analysis process. Whenever the syntax analyzer needs the next Token, it calls this method. Its responsibility is very clear: **Starting from the current position, skip all meaningless content, then return the next meaningful Token**.

Its implementation logic is very straightforward:

```javascript
// In the Parser class

nextToken() {
  // Record the starting position of the current Token for creating Token objects later
  this.start = this.pos;
  this.startLine = this.line;
  this.startColumn = this.column;

  // 1. Skip all meaningless whitespace and comments
  this.skipSpace();

  // If we've reached the end of file after skipping, set EOF Token and return
  if (this.pos >= this.input.length) {
    this.type = tt.eof;
    this.value = null;
    this.end = this.pos;
    return;
  }

  // 2. Start reading the actual Token
  this.readToken();
}
```

## 3. `skipSpace()`: Ignoring Irrelevant Information

In JavaScript, spaces, line breaks, comments, etc., have no impact on program execution logic. The task of `skipSpace()` is to skip them all.

To pursue ultimate performance, we'll use `charCodeAt()` to get character codes for comparison, which is faster than direct string comparison (`this.input[this.pos] === ' '`).

```javascript
// In the Parser class

skipSpace() {
  // Keep looping as long as we haven't reached the end
  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);

    if (ch === 32) { // Space
      this.pos++;
      this.column++;
    } else if (ch === 10) { // Newline
      this.pos++;
      this.line++;
      this.column = 0;
    } else if (ch === 47) { // Slash, could be the start of a comment
      const next = this.input.charCodeAt(this.pos + 1);

      if (next === 47) { // Single-line comment //
        this.skipLineComment();
      } else if (next === 42) { // Multi-line comment /*
        this.skipBlockComment();
      } else {
        // If / is not followed by / or *, it's a division operator, not whitespace
        break;
      }
    } else {
      // Encounter any other non-whitespace character, exit the loop
      break;
    }
  }
}

// Skip single-line comments
skipLineComment() {
  // Skip "//"
  this.pos += 2;
  // Keep going until the end of the line
  while (this.pos < this.input.length && this.input.charCodeAt(this.pos) !== 10) {
    this.pos++;
    this.column++; // Note: In our model, characters within single-line comments also count as column numbers
  }
}

// Skip multi-line comments (left as an exercise)
skipBlockComment() {
  // TODO: Implement multi-line comment skipping logic
}
```

## 4. `readToken()`: The Central Dispatch for Token Reading

When `skipSpace()` finishes executing, the `pos` pointer is guaranteed to point to the beginning of the next meaningful character. The task of `readToken()` is to decide which specific reading function (such as `readNumber`, `readWord`, etc.) should be called next based on this character. It acts like a central dispatch room.

```javascript
// In the Parser class

readToken() {
  const ch = this.input.charCodeAt(this.pos);

  // Use an if/else if chain for dispatching
  // Place the most common character types first to help improve performance

  // a-z: Could be identifiers or keywords
  if ((ch >= 97 && ch <= 122)) {
    return this.readWord();
  }

  // 0-9: Numbers
  if ((ch >= 48 && ch <= 57)) {
    return this.readNumber();
  }

  // " or ': Strings
  if (ch === 34 || ch === 39) { // " or '
    return this.readString(ch);
  }

  // . ( ) [ ] ; = + etc: Punctuation or operators
  // ... We'll implement readPunc() in subsequent chapters ...

  // If all dispatching fails, it means we encountered an unrecognized character
  this.raise(`Unexpected character '${String.fromCharCode(ch)}'`, this.pos);
}
```

This `readToken` method is currently just a skeleton, but it clearly demonstrates the core idea of **dispatching based on lookahead characters**. In the next few chapters, our main task will be to implement specific reading methods like `readWord`, `readNumber`, `readString`, etc., and use them to fill out this skeleton.

## 5. Summary

In this chapter, we built the core engine of the lexical analyzer. The `Parser` class carries all the states, `nextToken()` drives the entire process, `skipSpace()` is responsible for "cleaning up garbage", and `readToken()` plays the role of "central dispatch".

We have made complete preparations for the flesh and blood of lexical analysis—the specific Token reading logic. Starting from the next chapter, we will tackle the parsing of various Tokens one by one, including identifiers, keywords, numbers, strings, and more.

---

### Exercises

1.  **Implement `skipBlockComment()`**: Please complete the `skipBlockComment()` method yourself. You need to loop to find the closing marker `*/`. Note that you need to correctly handle cases where `*` is not immediately followed by `/` (for example, `/* a * b */`). More importantly, if you don't find `*/` until the end of the file, you should throw an "unclosed block comment" error.
2.  **Expand `readToken`**: In the dispatching logic of `readToken`, add `if` judgments for characters like `[`, `(`, `.`, `;`, `=`, `+`, etc., and have them temporarily call a (not yet implemented) `readPunc()` method.