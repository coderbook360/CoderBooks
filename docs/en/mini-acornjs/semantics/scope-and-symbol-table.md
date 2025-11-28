# 33. Deep Dive into Scope: Building Symbol Tables and Scope Chains

So far, our `mini-acorn` has become quite an excellent "grammarian". It can accurately decompose JavaScript code into structured AST. However, it still knows nothing about the "meaning" of the code. For example, when it sees an identifier `a`, it only knows "this is an identifier", but doesn't know where this `a` is defined, whether it's a variable, a function, or an undeclared ghost?

To give the parser preliminary "understanding" capabilities, we need to introduce a crucial concept in compiler theory—**Symbol Table**. In this chapter, we'll pause adding new syntax features and instead dive deep into the parser's internals to explore how to build scopes and symbol tables, laying a solid foundation for future static analysis (like Linter, type checking) and code transformation.

## Core Concepts: Scope and Symbol Table

-   **Scope**: This is a familiar concept that defines the accessibility of identifiers like variables, functions, and classes in code. After ES6, JavaScript mainly has three types of scopes:
    -   Global Scope
    -   Function Scope
    -   Block Scope, introduced by `let`, `const`, and `class`.

-   **Symbol Table**: If scope is a "region", then the symbol table is the "household register" of that region. It's a data structure (usually a hash table or Map) used to store all identifiers declared in a specific scope and their related information (like type, declaration node, etc.). Each scope has its own symbol table.

-   **Scope Chain**: When referencing a variable in code, the engine first searches in the current scope's symbol table. If not found, it "bubbles up" to the parent scope to continue searching. This lookup path from inside to outside constitutes the scope chain.

## Why Build Symbol Tables During Parsing Phase?

You might ask: Aren't these things that the JavaScript engine does at runtime? Why do we care about them during the parsing phase?

The answer is that building symbol tables early during the parsing (static) phase gives us powerful code analysis capabilities:

1.  **Error Detection**: We can immediately detect references to undeclared variables, or duplicate declarations of the same variable, etc.
2.  **Variable Renaming/Obfuscation**: In code compression tools, we need to know in which scopes a variable is safe to rename.
3.  **Linter Implementation**: Tools like ESLint need to know variable definitions and usage to provide hints like "variable defined but never used".
4.  **Intelligent Suggestions and Completion**: IDE's intelligent suggestion functionality relies on understanding available variables in the current scope.

## Implementing Scope Management in `mini-acorn`

Our goal is to dynamically build and maintain a scope chain while parsing the AST. The most classic data structure is the "Scope Stack".

-   When entering a new scope, create a new symbol table and **push** it onto the stack top.
-   When leaving a scope, **pop** the top symbol table from the stack.
-   When declaring a new variable, register its information in the **stack top** symbol table.
-   When looking up a variable, search each symbol table **from top to bottom** of the stack.

### 1. Creating `Scope` and `ScopeStack`

First, let's design these two core data structures.

```javascript
// src/scope.js (a new file)

// Scope class, essentially a symbol table
class Scope {
  constructor(parent = null) {
    this.parent = parent; // points to parent scope
    this.declarations = new Map(); // stores declarations
  }

  // Register a declaration
  define(name, node) {
    this.declarations.set(name, node);
  }

  // Look up a declaration
  find(name) {
    let current = this;
    while (current) {
      if (current.declarations.has(name)) {
        return current.declarations.get(name);
      }
      current = current.parent;
    }
    return null; // not found
  }
}

// Scope stack manager
class ScopeStack {
  constructor() {
    this.current = new Scope(); // start from global scope
  }

  // Enter new scope
  enter() {
    this.current = new Scope(this.current);
  }

  // Exit scope
  exit() {
    this.current = this.current.parent;
  }

  // Define in current scope
  define(name, node) {
    this.current.define(name, node);
  }

  // Look up
  find(name) {
    return this.current.find(name);
  }
}
```

### 2. Integrating Scope Stack into Parser

Now, we need to use `ScopeStack` in `Parser` and call its methods when parsing specific nodes.

```javascript
// src/parser.js

import { ScopeStack } from './scope'; // import

class Parser {
  constructor(input) {
    // ...
    this.scopeStack = new ScopeStack(); // initialize
  }

  // ...
}
```

### 3. Managing Scope at Key Nodes

We need to find the "timing" for creating scopes, i.e., inserting `enter()` and `exit()` calls in the corresponding parsing methods.

-   **Block Scope (`BlockStatement`)**: Key for `let` and `const`.

    ```javascript
    // src/parser.js
    pp.parseBlock = function () {
      const node = this.startNode();
      this.scopeStack.enter(); // enter block scope

      this.expect(tt.braceL);
      node.body = [];
      while (!this.eat(tt.braceR)) {
        node.body.push(this.parseStatement());
      }

      this.scopeStack.exit(); // exit block scope
      return this.finishNode(node, "BlockStatement");
    };
    ```

-   **Function Scope (`Function`)**: Scope for function parameters and `var`.

    ```javascript
    // src/parser.js
    pp.parseFunction = function (node, isStatement, isAsync) {
      // ...
      this.scopeStack.enter(); // enter function scope

      node.params = this.parseFunctionParams(); // parameters are also in this scope
      node.body = this.parseBlock(); // function body is a block, will enter another scope

      this.scopeStack.exit(); // exit function scope
      // ...
    };
    ```

### 4. Registering Declarations

When parsing variable declarations, we need to add them to the current scope's symbol table.

```javascript
// src/parser.js

pp.parseVar = function (node, kind) {
  // ...
  for (const decl of node.declarations) {
    // decl.id is an Identifier node
    this.scopeStack.define(decl.id.name, decl);
  }
  // ...
};
```

Similarly, when parsing function declarations, class declarations, and function parameters, we also need to call `this.scopeStack.define()`.

## Let's Practice

Although we haven't fully implemented this mechanism in `mini-acorn`, you can now clearly see its workflow. Imagine parsing this code:

```javascript
let a = 1;
function log() {
  let b = 2;
  console.log(a, b);
}
```

1.  **Start**: Create global scope `S0`.
2.  **`let a = 1;`**: Register `a` in `S0`.
3.  **`function log() { ... }`**: Register `log` in `S0`. Then enter function body parsing.
4.  **Enter `log` function**: Create function scope `S1`, whose parent is `S0`. `S1` becomes the current scope.
5.  **`let b = 2;`**: Register `b` in `S1`.
6.  **`console.log(a, b)`**: Parse identifier `a`. Search in `S1`, not found. Go to parent scope `S0`, found! Parse identifier `b`. Search in `S1`, found!
7.  **`log` function ends**: Exit `S1`, current scope reverts to `S0`.

## Summary

In this chapter, we took the first step from pure syntax parsing toward semantic analysis. We learned about scope, symbol tables, and scope chains—core concepts in compiler theory—and explored how to simulate them in our parser using the classic data structure of "scope stack".

By managing scopes when entering/exiting specific nodes and registering symbols when parsing declarations, our parser is no longer just a "structure translator"; it begins to "understand" the relationships between identifiers in the code. This mechanism is an indispensable infrastructure for implementing any advanced code analysis tools (like Linter, type checker, code compressor).