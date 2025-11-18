# Chapter 1: Getting Started: JavaScript Parser Overview

Welcome to the world of `mini-acorn`!

Before we start building our own JavaScript parser, let's take some time to understand a question from a higher, more macro perspective: What is a parser? Why do we need it?

## 1. The "Black Box" of Frontend Toolchains

As modern frontend developers, we work with various powerful tools every day:

- **Babel**: Transforms our ESNext, TypeScript, and JSX code into JavaScript that browsers can understand.
- **ESLint**: Checks our code style and identifies potential errors.
- **Prettier**: Formats our code with one click, unifying team style.
- **Webpack/Vite**: Analyzes module dependencies and bundles the entire project into the final output.

These tools greatly improve our development efficiency and code quality. But have you ever wondered how they "read" and "manipulate" our code?

Whether it's code transformation, style checking, or dependency analysis, the first and most important common foundation for these tools is **Parsing**. They all contain a **Parser** internally, which converts our source code strings into a structured representation that computers can more easily understand and process—the **Abstract Syntax Tree (AST)**.

This process from "code string" to "AST" is the core we'll explore in this book. By building a parser with our own hands, we will completely unveil the mystery behind these tools.

## 2. The Two-Phase Work of a Parser

A parser's work is typically divided into two core phases: **Lexical Analysis** and **Syntactic Analysis**.

Let's use a very simple line of code as an example to see what these two phases do:

```javascript
let a = 1;
```

### 2.1. Phase One: Lexical Analysis

**Lexical Analysis**, often called "Tokenizing," is the phase where the parser reads the code string character by character and, according to the language's lexical rules, decomposes the string into a series of meaningful, indivisible minimal units. These units are called **Tokens**.

For the code `let a = 1;`, the lexical analyzer would output a Token array that might look like this:

```json
[
  { "type": "Keyword", "value": "let" },
  { "type": "Identifier", "value": "a" },
  { "type": "Punctuator", "value": "=" },
  { "type": "Numeric", "value": "1" },
  { "type": "Punctuator", "value": ";" }
]
```

You can think of Tokens as "words" in an English sentence. Lexical analysis is like breaking down a sentence into individual words and identifying their parts of speech (nouns, verbs, adjectives, etc.). Notably, characters like spaces and line breaks are usually ignored at this stage because they don't affect the code's syntactic structure.

### 2.2. Phase Two: Syntactic Analysis

**Syntactic Analysis**, which is what we usually mean by "Parsing" in the narrow sense. In this phase, the parser receives the Token sequence produced by lexical analysis and, according to the language's syntax rules, assembles these flat "words" into a tree-like structure that reflects the program's logic. This structure is the **Abstract Syntax Tree (AST)**.

For the Token sequence above, the syntactic analyzer would build an AST like this:

```json
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": { "type": "Identifier", "name": "a" },
          "init": { "type": "Literal", "value": 1 }
        }
      ],
      "kind": "let"
    }
  ]
}
```

This tree precisely describes the structure of the original code: This is a program (`Program`) that contains a variable declaration statement (`VariableDeclaration`), the declaration type is `let`, it declares a variable `a`, and initializes it with the literal value `1`.

At this point, the parser's core mission is complete. It has successfully transformed unstructured text into a structured tree.

## 3. Why is AST So Important?

AST is the foundation of all code analysis and transformation tools. Once source code is converted to AST, we can perform various interesting and powerful operations on it:

- **Code Transformation**: Babel traverses the AST, finds nodes representing ES6+ syntax (like `ArrowFunctionExpression`), and replaces them with functionally equivalent ES5 nodes (like `FunctionExpression`).
- **Static Analysis**: ESLint traverses the AST, checking if nodes comply with preset rules. For example, it can check the `kind` property of a `VariableDeclaration` node and issue a warning if it finds `var`.
- **Code Formatting**: Prettier also parses code into AST and then regenerates formatted code strings from the AST according to its style rules.

It can be said that **AST is the bridge connecting source code and higher-level tools**.

## 4. Summary and Exercises

In this chapter, we've established a macro understanding of JavaScript parsers. We've learned:

- Parsers are the core of tools like Babel and ESLint; their role is to convert source code strings into AST.
- This process is divided into two phases: **Lexical Analysis** (code → Tokens) and **Syntactic Analysis** (Tokens → AST).
- AST, as a structured representation of code, is the foundation of all code analysis and transformation work.

Now, it's time to get hands-on experience.

### Exercises

1. **Tool Usage**: Open the online tool [AST Explorer](https://astexplorer.net/). Select "JavaScript" and "acorn" as the parser in the top-left corner. Enter `const name = "world";` in the left code box, then carefully observe the generated AST structure on the right. Try clicking different nodes in the AST to see how they interact with the code highlighting on the left.
2. **Conceptual Thinking**: Why is AST called an "Abstract" Syntax Tree? What information from the source code does it "abstract" away? (Hint: Recall what we ignored during the lexical analysis phase.)
3. **Application Scenarios**: Besides Babel and ESLint, can you think of other tools or features you use daily that might also use AST underneath? (Hint: Think about code minification, syntax highlighting, editor autocompletion...)