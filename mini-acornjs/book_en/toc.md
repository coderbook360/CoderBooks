# JavaScript Parser in Practice: Building mini-acorn from Scratch

This book will guide you step by step to build a fully functional JavaScript parser from scratch. We will not only dive into Acorn's source code implementation but also combine it with compiler theory knowledge, helping you understand both the how and the why.

- [Preface](preface.md)

---

## Part 1: Parser Foundations

1. [Getting Started: JavaScript Parser Overview](foundations/parsing-overview.md)
2. [Compiler Primer: Grammars, Lexical and Syntax Analysis](foundations/compiler-primer.md)
3. [Understanding the ESTree Specification](foundations/estree-specification.md)
4. [Acorn Architecture Overview: Core Modules and Workflow](foundations/acorn-architecture.md)
5. [Preparation: Setting Up the mini-acorn Project](foundations/project-setup.md)

---

## Part 2: Lexical Analysis

6. [Lexical Analysis Overview: Implementation Approach for Tokenization](lexical-analysis/overview.md)
7. [Token Data Structure Design](lexical-analysis/token-data-structure.md)
8. [Implementing Tokenizer: Handling Whitespace, Comments, and Token Reading](lexical-analysis/tokenizer-implementation.md)
9. [Parsing Identifiers and Keywords](lexical-analysis/identifiers-and-keywords.md)
10. [Parsing Literals: Strings, Numbers, and Regular Expressions](lexical-analysis/literals-and-regexp.md)
11. [Parsing Operators and Punctuators](lexical-analysis/operators-and-punctuators.md)

---

## Part 3: Syntactic Analysis

12. [Syntactic Analysis Overview: Recursive Descent Method](syntactic-analysis/overview.md)
13. [Parser Core: State Initialization and Management](syntactic-analysis/parser-state.md)
14. [Implementing Parser Helper Methods](syntactic-analysis/parser-helpers.md)
15. [Parsing Programs and Top-Level Nodes: Implementing the parse Method](syntactic-analysis/program-parsing.md)
16. [Statement Parsing Dispatch: parseStatement Implementation](syntactic-analysis/statement-dispatcher.md)
17. [Parsing Two Basic Statements: Expression Statements and Block Statements](syntactic-analysis/basic-statements.md)

---

## Part 4: Expression Parsing

18. [Challenges in Expression Parsing: Operator Precedence and Associativity](expressions/challenges.md)
19. [Pratt Parsing Method: Algorithm Core](expressions/pratt-parser-core.md)
20. [Implementing Pratt Parser: Token "Binding Power"](expressions/pratt-parser-implementation.md)
21. [Parsing Atomic and Grouping Expressions: `this`, `super`, `( ... )`](expressions/atomic-and-grouping.md)
22. [Parsing Array and Object Literals](expressions/array-and-object-literals.md)
23. [Parsing Prefix and Update Expressions: `!x`, `++i`](expressions/prefix-and-update.md)
24. [Parsing Infix Expressions: Binary Operations and Logical Operations](expressions/infix-expressions.md)
25. [Parsing Postfix, Call, and Member Expressions: `a++`, `a()`, `a[]`](expressions/postfix-call-member.md)
26. [Parsing Conditional and Assignment Expressions: `a ? b : c`, `a = b`](expressions/conditional-and-assignment.md)

---

## Part 5: Statements and Declarations

27. [Parsing Variable Declarations: `var`, `let`, `const`](semantics/variable-declarations.md)
28. [Parsing Conditional Statements: `if` and `switch`](semantics/conditional-statements.md)
29. [Parsing Loop Statements: `while`, `do-while`, `for`](semantics/loop-statements.md)
30. [Parsing Control Transfer Statements: `return`, `break`, `continue`, `throw`](semantics/control-transfer.md)
31. [Parsing Functions: Declarations, Expressions, and Arrow Functions](semantics/function-parsing.md)
32. [Parsing Classes: Declarations and Expressions](semantics/class-parsing.md)
33. [Deep Dive into Scope: Building Symbol Tables and Scope Chains](semantics/scope-and-symbol-table.md)
34. [Parsing ES Modules: `import` and `export`](semantics/es-modules.md)

---

## Part 6: AST Applications

35. [AST Traversal and Visiting: Application of Visitor Pattern](ast-manipulation/traversal-and-visitor-pattern.md)
36. [Code Generation: Converting AST Back to JavaScript Code](ast-manipulation/code-generation.md)

---

## Part 7: Advanced Features

37. [Plugin Architecture: Building an Extensible Parser](advanced/plugin-architecture.md)
38. [Source Maps: Implementing Source Map Generation](advanced/source-map-generation.md)
39. [Performance Optimization: Memory and Speed Considerations for Parsers](advanced/performance-optimization.md)
40. [Error Handling and Recovery: Building a More Robust Parser](advanced/error-handling-and-recovery.md)
41. [Integration Practice: Building a Complete Parser](advanced/putting-it-all-together.md)