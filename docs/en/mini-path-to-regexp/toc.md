# path-to-regexp in Practice: Building a Mini Library from Scratch

This book will guide you through building a fully functional JavaScript path matching library, inspired by `path-to-regexp`, from the ground up. We will not only delve into the source code implementation but also combine it with theoretical knowledge of compilers, ensuring you understand both the "how" and the "why."

- [Preface](preface.md)

---

### Part 1: Foundations

1. [Overview: API and Core Flow](foundations/overview.md)
2. [Core Concepts: Path Patterns, Parameters, and Modifiers](foundations/core-concepts.md)
3. [Design Philosophy: The Journey from Path String to Regular Expression](foundations/design-philosophy.md)

---

### Part 2: Core Implementation: Path Parsing and RegExp Generation

4. [Lexical Analysis: The Core RegExp of the `parse` Function](implementation/lexical-analysis.md)
5. [Data Structure: Designing the `Token`](implementation/token-data-structure.md)
6. [Core Implementation: A Deep Dive into the `parse` Function](implementation/parse-function.md)
7. [Code Generation: Implementing the `pathToRegexp` Function](implementation/pathtoregexp-function.md)
8. [Advanced Implementation: Handling Modifiers and Custom Patterns](implementation/advanced-patterns.md)

---

### Part 3: Core Implementation: Path Compilation and Matching

9. [Path Generation: Implementing the `compile` Function](implementation/compile-function.md)
10. [Advanced Abstraction: A Deep Dive into the `match` Function](implementation/match-function.md)
11. [Error Handling: Building a Robust Parsing and Matching Mechanism](implementation/error-handling.md)
