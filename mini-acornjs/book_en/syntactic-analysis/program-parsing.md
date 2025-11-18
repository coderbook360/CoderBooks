# Parsing Programs and Top-Level Nodes: Implementing the parse Method

Everything is ready except for the final push. We already have the state manager and auxiliary toolbox; now it's time to combine them and write our first real syntactic analysis function.

Any parsing process must have an entry point. For parsing an entire JavaScript file, this entry point is the `parse()` method, whose goal is to generate the root node of the AST—the `Program` node. The `Program` node represents the entire source file, and its `body` property is an array containing all top-level statements of the file.

In this chapter, we will implement this "commander-in-chief" and here, for the first time, we will mesh the "gears" of lexical analysis and syntactic analysis together.

## AST Node Design

Before creating the AST, let's first define the common structure of nodes. A good practice is to create a `Node` base class, from which all specific AST nodes (such as `Program`, `IfStatement`, etc.) inherit. This base class can be responsible for recording information common to all nodes, such as source code location.

According to the [ESTree specification](https://github.com/estree/estree), each node should have `type`, `start`, `end`, and `loc` properties.

```javascript
// src/ast/node.js (new file)

// Source code location information
class SourceLocation {
  constructor(parser) {
    this.start = {
      line: parser.startLine,
      column: parser.startColumn
    };
    this.end = {
      line: parser.endLine,
      column: parser.endColumn
    };
  }
}

// AST node base class
export class Node {
  constructor(parser) {
    this.type = '';
    this.start = parser.start;
    this.end = parser.end;
    this.loc = new SourceLocation(parser);
  }
}
```

With the base class, we can now define the `Program` node.

```javascript
// src/ast/node.js (continued)

export class Program extends Node {
  constructor(parser, body, sourceType) {
    super(parser);
    this.type = 'Program';
    this.body = body;
    this.sourceType = sourceType; // 'script' or 'module'
  }
}
```

## Implementing the `parse` Entry Point

Our `parse` method will serve as the library's public API. It is a static method that encapsulates the creation and invocation process of the `Parser` instance, making it convenient for users to use.

```javascript
// src/parser/index.js (Parser main class)
import { Program } from '../ast/node.js';
import { tt } from "../tokentype";

export default class Parser {
  constructor(input) { /* ... state initialization from previous chapter ... */ }

  // Public API entry point
  static parse(input) {
    const parser = new Parser(input);
    return parser.parse();
  }

  // Instance parsing method
  parse() {
    // 1. Get the first Token—this is a crucial step to start syntactic analysis
    this.nextToken();

    // 2. Start parsing the top-level structure
    return this.parseTopLevel();
  }
}
```

There are two `parse` methods here:

1.  `Parser.parse(input)`: A static method serving as the library's public API. It hides internal implementation details; users only need to call `Parser.parse('let a = 1')`.
2.  `parser.parse()`: An instance method that is the overall control of parsing. The first thing it does is call `this.nextToken()`. **This is a crucial step**—it completes the transition from source code to the first Token, preparing the initial input for syntactic analysis.

## `parseTopLevel`: The Core Parsing Loop

`parseTopLevel` is the "main engine" of parsing. It is responsible for creating a loop that continuously parses top-level statements until the end of the file.

```javascript
// src/parser/index.js (add to Parser class)

parseTopLevel() {
  const body = [];

  // As long as it's not the end of file (EOF), keep parsing statements
  while (!this.match(tt.eof)) {
    // Call the statement dispatcher to be implemented in the next chapter
    const statement = this.parseStatement();
    body.push(statement);
  }

  // Create and return the Program node
  // Note: We temporarily hardcode sourceType as 'script'
  return new Program(this, body, 'script');
}
```

The logic of this method is very clear:

1.  Initialize an empty `body` array.
2.  Enter a `while` loop with the condition `!this.match(tt.eof)`, meaning "as long as the current Token is not the end-of-file marker."
3.  Inside the loop, call `this.parseStatement()`. For now, think of `parseStatement` as a "black box" whose task is to parse any type of statement and return the corresponding AST node.
4.  Push the returned statement node into the `body` array.
5.  After the loop ends, create a `Program` node with the collected `body` and return it.

### Temporary Implementation of `parseStatement`

To make `parseTopLevel` work, we need a temporary implementation of `parseStatement`. However, there's a huge pitfall here: **This temporary implementation must consume at least one Token**; otherwise, the `while` loop will fall into an infinite loop because `this.type` never changes.

```javascript
// src/parser/index.js (add to Parser class, as a temporary placeholder)

parseStatement() {
  // This is a temporary mock implementation to make the code run
  console.log("Parsing statement starting with token:", this.type.label);
  
  // Key: Must consume a Token, otherwise infinite loop!
  this.nextToken(); 
  
  // Return a dummy node
  return { type: 'EmptyStatement' }; 
}
```

This is one of the most common errors when writing recursive descent parsers—be sure to remember it.

## Summary

In this chapter, we finally bridged the "last mile" from source code to AST. We implemented the `parse` entry function and the `parseTopLevel` core loop, defined `Program` as the root node of the AST, and through a `while` loop and calls to `parseStatement`, parsed the file content into a series of top-level statements.

At this point, the complete skeleton of our parser has been built. The remaining work is to fill in `parseStatement` and the various specific statement and expression parsing functions it calls with real logic.

In the next chapter, we will begin this filling work, implementing a "dispatch center" for statement parsing—`parseStatement`, which will distribute parsing tasks to different, more specific `parseXXXStatement` functions based on different Token types.

### Exercises

1.  **Implement `sourceType` Option**: Modify the `Parser.parse` function so it can accept an `options` object, e.g., `Parser.parse(code, { sourceType: 'module' })`. Store this `sourceType` in the parser instance and use it when creating the `Program` node in `parseTopLevel`.
2.  **Think About `try...catch`**: The `parse` method is the library's entry point and should be user-friendly. If an error is thrown by `raise` during parsing, this error should be caught by the `parse` method and can be re-packaged into a more friendly format before being thrown. Think about where the `try...catch` block should be placed?