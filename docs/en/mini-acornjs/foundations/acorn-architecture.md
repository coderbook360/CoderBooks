# Acorn Architecture Overview: Understanding Core Modules and Workflow

In the previous chapter, we learned the basics of compiler principles and understood that transforming source code into an Abstract Syntax Tree (AST) requires going through two stages: lexical analysis and syntactic analysis. Starting from this chapter, we will officially begin the practical construction of `mini-acorn`. The first step, and the most important one, is to understand Acorn's overall architecture design.

A well-designed parser must have highly decoupled internal modules, each with its own responsibilities. Acorn, as a high-performance JavaScript parser, has an exemplary architecture design. Only by understanding its core components and workflow can we code with ease in subsequent chapters.

## 1. Motivation and Problem Description: Why Do We Need a Clear Architecture?

Imagine if you were asked to start writing a JavaScript parser directly, you might feel at a loss.

- How should the code be organized? Should it be written in one huge file or split into multiple modules?
- How should the lexical analyzer and syntactic analyzer collaborate? Should the lexical analyzer convert all code into Tokens first, or should the syntactic analyzer request the next Token from the lexical analyzer only when needed?
- How should the state generated during parsing (such as current line number, column number, current syntax context) be managed?

These questions all point to one core issue: we need a clear, reasonable, and extensible architecture. A good architecture can help us:

- **Separation of Concerns**: Decompose the complex parsing process into independent, easy-to-understand and maintain modules.
- **State Management**: Effectively track and manage contextual information throughout the parsing process.
- **Improve Extensibility**: Easily add new features (such as supporting new syntax features) or perform optimizations.

Acorn's architecture is designed precisely around these goals.

## 2. Acorn's Three Core Components

Acorn's architecture can be succinctly summarized into three core components: `Parser`, `Tokenizer`, and `State`.

| Component | Core Responsibility | Description |
| :--- | :--- | :--- |
| **`Parser`** | **Syntactic Analysis** | Drives the entire parsing workflow, responsible for implementing syntax rules and building AST. |
| **`Tokenizer`** | **Lexical Analysis** | Responsible for reading the source code character stream and converting it into a Token sequence. |
| **`State`** | **State Management** | Stores and manages all contextual information during the parsing process. |

The relationship between these three components can be understood as follows:

- **`Parser` is the commander**: It defines "how to parse" (e.g., how an `if` statement should be parsed). When it needs a "word" (Token), it sends a request to the `Tokenizer`.
- **`Tokenizer` is the scout**: It's responsible for going deep into the "battlefield" of source code, identifying each meaningful "word" (Token), and then reporting back to the `Parser`.
- **`State` is the battle map**: It records all information about the current "battle situation," such as the scout's current position (`pos`), current line number (`line`) and column number (`column`), and current context (e.g., whether inside an `async` function). Both `Parser` and `Tokenizer` rely on `State` to get and update this information.

## 3. Visualization of Acorn's Workflow

To more intuitively understand how these three components collaborate, let's look at a simplified pseudocode and flowchart of the `parse` function entry point.

**Pseudocode:**

```javascript
function parse(input, options) {
  // 1. Create a Parser instance
  //    - Internally, Parser will initialize a State object to manage state
  //    - The State object will hold the input code `input`
  //    - Parser itself also plays the role of Tokenizer, containing lexical analysis methods
  const parser = new Parser(options, input);

  // 2. Call Parser's core method `parse`
  const ast = parser.parse();

  // 3. Return the final AST
  return ast;
}

// The core `parse` method inside Parser
class Parser {
  // ...
  parse() {
    // 2a. Get the first Token to prepare for parsing
    this.nextToken(); 
    
    // 2b. Call the top-level parsing method to start parsing the entire program
    return this.parseTopLevel(); 
  }
  // ...
}
```

**Workflow Diagram:**

```mermaid
graph TD
    A[External call `parse(code)`] --> B{Create `Parser` instance};
    B --> C{Initialize `State` object (contains code `code`)};
    C --> D[Parser holds State];
    A --> E{Call `parser.parse()`};
    E --> F{`parser.nextToken()`: Request first Token};
    F --> G[Tokenizer reads character stream];
    G --> H{Generate Token};
    H --> I[Update State (pos, line, column)];
    I --> J[Parser obtains Token];
    J --> K{`parser.parseTopLevel()`: Start syntactic analysis};
    K --> L{Recursive descent parsing...};
    L -- Request next Token --> F;
    L -- Build AST node --> M[AST];
    K --> N[Return Program node];
    N --> O[Final AST];
```

From the diagram above, we can see that the entire process is a closed loop driven by `Parser`, with `Tokenizer` providing Tokens and `State` recording the state. The syntactic analyzer (`Parser`) requests the next Token from the lexical analyzer (`Tokenizer`) only when needed. This pattern is called "Scannerless Parsing" or "On-demand Lexical Analysis," which is more efficient and has lower memory usage than generating all Tokens at once.

## 4. Boundaries and Error Handling

- **Input Boundaries**: If the input is an empty string, the parser should return an empty `Program` node.
- **Error Recovery**: When encountering a syntax error, a robust parser should attempt to recover and continue parsing rather than immediately crashing. Acorn, through its plugin system and internal error handling mechanisms, can achieve a certain degree of error recovery. We will explore this in depth in subsequent chapters.

## 5. Summary and Exercises

In this chapter, we learned about Acorn's core architecture, which consists of three main components: `Parser`, `Tokenizer`, and `State`.

- **`Parser`** is the core of syntactic analysis, driving the entire workflow.
- **`Tokenizer`** is responsible for lexical analysis, generating Tokens on demand.
- **`State`** is a centralized state manager that stores all contextual information.

This clear architecture separates concerns, making the code easier to understand and maintain.

**Exercises:**

1. **Diagram Drawing**: Try to redraw Acorn's core workflow diagram yourself, ensuring you understand the interaction relationships between `Parser`, `Tokenizer`, and `State`.
2. **Thinking**: Why is "on-demand lexical analysis" more efficient than generating all Tokens at once? In what aspects does it save resources?
3. **Blueprint**: Based on the knowledge from this chapter, plan the initial file structure for your own `mini-acorn` project. Which files or classes would you create to carry the functionality of `Parser`, `Tokenizer`, and `State` respectively?

In the next chapter, we will begin delving into the details of lexical analysis and implement our `Tokenizer` by hand.