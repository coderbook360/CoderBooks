# Chapter 2: Compiler Primer: Grammars, Lexical and Syntax Analysis

In the previous chapter, we learned about the basic workflow of a parser. Now, you might have a question: Can't we just start writing code? Why do we need to learn about the dry theory of compiler principles?

The answer is: **Theory is the map for practice**. Without understanding basic concepts, our implementation will be blind and fragile. This chapter will provide you with the minimal set of theories needed to build a parser. They will become the "internal skills" for our subsequent practice, helping you understand "why" Acorn and our `mini-acorn` are designed the way they are.

## 1. Compiler vs. Interpreter

First, let's clarify two basic concepts:

- **Compiler**: Like a translator, it reads your high-level language code (like JavaScript) **once** in its entirety, then translates it into a low-level language that computers can directly execute (like machine code). The product of this translation process is an independent executable file. The entire process is "compile first, execute later."
- **Interpreter**: Like a simultaneous interpreter, it reads your high-level language code **line by line**, then immediately executes the operations corresponding to that line of code. It doesn't produce an independent target file; the entire process is "interpret while executing."

Early JavaScript engines were mainly interpreters, but to pursue higher performance, modern JavaScript engines (like V8) use more complex **JIT (Just-In-Time) compilation** technology, which combines the advantages of compilers and interpreters, compiling code before or during execution to achieve performance close to that of compiled languages.

Our parser is precisely the first and most critical link in this complex compilation pipeline.

## 2. Core Stages of Compilation

A complete compilation process is usually very complex, but its "frontend" part mainly consists of three core stages:

1. **Lexical Analysis**: As we saw in the previous chapter, it's responsible for decomposing code strings into Token sequences.
2. **Syntactic Analysis**: It's responsible for building Token sequences into AST.
3. **Semantic Analysis**: After obtaining the AST, the compiler checks it to ensure the code complies with the language's semantic rules. For example, it checks if you're reassigning a `const` declared constant, or if function call parameters are correct. This stage typically involves type checking and scope analysis.

The core of this book will focus on the first two stages: lexical analysis and syntactic analysis.

## 3. The "Law" of Languages: Grammar

How does the parser know how to assemble Tokens into AST? The answer is by following a set of rules, and this set of rules is the **Grammar**.

Grammar is a formal, unambiguous set of rules that precisely defines which sentences are legal and which are illegal in a language. It is the "law" of a programming language.

To describe this "law," computer scientists invented a standardized notation—**Backus-Naur Form (BNF)**.

### Defining Arithmetic Operations Using BNF

Let's look at a concrete example. Suppose we want to define a language for arithmetic operations containing only addition, subtraction, multiplication, division, and parentheses. Its BNF grammar can be described like this:

```bnf
// Rule 1: An "Expression" consists of one or more "Terms" connected by addition or subtraction.
Expression ::= Term (('+' | '-') Term)*

// Rule 2: A "Term" consists of one or more "Factors" connected by multiplication or division.
Term ::= Factor (('*' | '/') Factor)*

// Rule 3: A "Factor" can be a number, or an "Expression" wrapped in parentheses.
Factor ::= NUMBER | '(' Expression ')'
```

Let's interpret these symbols:

- `::=` means "is defined as."
- `|` means "or."
- `' '` Content within quotes represents actual characters that appear in the code; they are called **Terminals** because they can't be further decomposed, just like the Tokens produced by lexical analysis.
- Content without quotes, like `Expression`, `Term`, represents abstract concepts in syntax; they are called **Non-terminals** because they can be further expanded by other rules.
- `(...)*` is an extended BNF (EBNF) notation, meaning the content within parentheses can appear zero or more times.

These three simple rules contain profound design:

- **Operator Precedence**: By dividing the grammar into two levels—`Expression` and `Term`—we cleverly define that multiplication and division (in the `Term` rule) have higher precedence than addition and subtraction (in the `Expression` rule). Because an `Expression` is composed of `Terms`, the parser must first satisfy the `Term` rules (complete all multiplications and divisions) before continuing with the `Expression` rules (performing additions and subtractions).
- **Recursive Definition**: The definition of `Factor` includes `Expression`, forming a recursion. It's precisely this recursion that allows the grammar to describe sentences with nested structures like `3 * (4 + 2)`.

When we write a parser, we are essentially implementing these BNF rules in code.

## 4. Hand-written Parser vs. Parser Generator

Since grammar is standardized, can we write a program that reads BNF files and automatically generates parser code?

Of course, such tools are called **Parser Generators**, such as ANTLR and Bison. Their advantage is fast development speed, but the disadvantage is that the generated code is usually difficult to read and debug, and it's hard to implement high-quality, user-friendly error messages.

The alternative is **Hand-written Parsers**, which is the approach adopted by Acorn and our `mini-acorn`. The **Recursive Descent Parsing** technique we'll learn in subsequent chapters is a common hand-written parsing technique. Its advantage is that developers have complete control over the code, making it easy to implement fine-grained performance optimizations and friendly error recovery mechanisms.

## 5. Summary and Exercises

In this chapter, we quickly learned the minimal set of theories needed to build a parser. We learned:

- The difference between compilers and interpreters, and how modern JS engines work.
- The three frontend stages of the compilation process: lexical analysis, syntactic analysis, and semantic analysis.
- Grammar is the "law" that defines language rules, and BNF is the standardized language for describing grammar.
- Through layering and recursion, BNF can elegantly define operator precedence and nested structures.
- Hand-written parsers, compared to generators, provide better control over performance and error handling.

These theories will become the "internal skills" for understanding all subsequent practical chapters.

### Exercises

1. **Extend the Grammar**: Try modifying the BNF example in this chapter to add support for "unary minus" (e.g., the expression `-5`). How should you modify the `Factor` rule?
2. **BNF Reading**: Search online for "ECMAScript specification if statement" to find the grammar definition of `IfStatement` in the official specification. Try reading and understanding it (it's okay if you don't understand it completely—just get a feel for the complexity of real-world specifications).
3. **Concept Differentiation**: In your own words, re-explain the differences and connections between lexical analysis and syntactic analysis.