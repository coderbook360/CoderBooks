# Lexical Analysis Overview: From Code to Token

Welcome to Part 2 of mini-acornjs! In Part 1, we successfully built a powerful expression parser that can transform a sequence of Tokens into a structured Abstract Syntax Tree (AST). However, we took it for granted that Tokens already existed. Now, it's time to unveil the mystery of this "black box".

In this part, we will deeply explore the first critical stage of the compilation process—**Lexical Analysis**.

## 1. Lexical Analysis: The "Translator" of Code

Imagine when you read an article, your brain doesn't perceive sentences as a long string of undivided letters. Instead, you naturally recognize words, punctuation, and paragraphs. Lexical analysis does similar work for computers.

For computers, the code you write, such as `let a = 1;`, is initially just a plain string. It cannot directly understand the meaning of this string. The role of the lexical analyzer is to act as a "translator", converting this meaningless character stream for machines into structured units with clear meaning. This unit is called a **Token**.

This process is also commonly referred to as **Tokenization** or **Scanning**, and the program that performs this task is called a **Lexical Analyzer**, **Tokenizer**, or **Scanner**.

## 2. What is a Token?

A Token is the smallest meaningful component in a programming language. It's like a word in English. A typical Token contains the following key information:

-   `type`: The type of the Token. This is like categorizing words by part of speech, such as noun, verb, or adjective. In JavaScript, types can be `Keyword`, `Identifier`, `Punctuator`, `Numeric`, etc.
-   `value`: The specific value of the Token. If the `type` is `Numeric`, then the `value` might be `10`.
-   `start`, `end`: The start and end positions (indices) of the Token in the source code string.
-   `loc`: An object containing the starting and ending line and column numbers. This is crucial for subsequent error reporting, as it can precisely tell developers "which line and column has an error".

For example, the word `let`, after lexical analysis, might become a structured object like this:

```json
{
  "type": "Keyword",
  "value": "let",
  "start": 0,
  "end": 3,
  "loc": {
    "start": { "line": 1, "column": 0 },
    "end": { "line": 1, "column": 3 }
  }
}
```

The ultimate goal of lexical analysis is to convert the entire source code file into a sequence (array) of such Tokens, while intelligently ignoring information that is useless for program logic, such as spaces, newlines, and comments.

## 3. Workflow: A State Machine Perspective

The core method of a lexical analyzer is typically `nextToken()`, whose task is to read and return the next Token from the current position. The essence of this process can be viewed as a **state machine**. The analyzer switches between different "states" to decide how to handle the upcoming characters.

Let's take `let a = 10;` as an example to see how `nextToken()` works step by step:

1.  **Initialization**: Create a pointer `pos` pointing to the beginning of the string, i.e., `pos = 0`.

2.  **Enter loop, find the first Token**:
    *   `pos` points to `l`. This is a letter, so the analyzer enters the **"identifier reading" state**.
    *   It continues scanning backward: `e`, `t`, until it encounters a character that doesn't belong to an identifier—a space.
    *   At this point, it extracts the string `let`. By querying a built-in keyword list, it discovers that `let` is a keyword.
    *   Therefore, it creates a Token with type `Keyword` and value `let`.
    *   Finally, update `pos` to point to the position after `t`.

3.  **Find the second Token**:
    *   The analyzer starts from the current `pos` and first encounters a space. It knows spaces are meaningless, so it enters the **"whitespace skipping" state**, simply moving `pos` backward until it encounters a non-whitespace character `a`.
    *   `a` is a letter, so it enters the **"identifier reading" state** again.
    *   It scans backward until it encounters `=`.
    *   It extracts `a`, queries the keyword list, finds it's not a keyword, so it's an ordinary `Identifier`.
    *   Creates the Token and updates `pos`.

4.  **Find the third Token**:
    *   Skip spaces before and after `=`. `pos` points to `=`.
    *   `=` is a punctuation symbol, so the analyzer enters the **"punctuation/operator reading" state**.
    *   It creates a Token with type `Punctuator` and value `=`, and updates `pos`.

5.  **Find the fourth Token**:
    *   `pos` points to `1`. This is a digit, so the analyzer switches to the **"number reading" state**.
    *   It scans backward: `0`, until it encounters a non-digit character `;`.
    *   It extracts `10` and converts it to a numeric type.
    *   Creates a Token with type `Numeric` and value `10`, and updates `pos`.

6.  **Find the fifth Token**:
    *   `pos` points to `;`, which is a punctuation symbol. Creates a `Punctuator` Token.

7.  **End**:
    *   When `pos` reaches the end of the string, `nextToken()` returns a special `EOF` (End of File) Token, marking the end of the lexical analysis process.

This process can be summarized with the following pseudocode:

```plaintext
function nextToken():
  skipWhitespace() // Skip whitespace and comments

  char = peek() // Look at the current character without moving the pointer

  if isLetter(char):
    return readIdentifierOrKeyword() // Read identifier or keyword

  if isDigit(char):
    return readNumber() // Read number

  if isQuote(char):
    return readString() // Read string

  if isPunctuator(char):
    return readPunctuator() // Read punctuation or operator

  if isEOF():
    return createToken(EOF) // End of file

  // If encountering an unrecognized character
  throwError("Unexpected character")
```

## 4. Manual State Machine vs. Regular Expressions

There are two main approaches to implementing a lexical analyzer:

*   **Regular Expressions**: Write a regular expression for each Token type, then try to match them in sequence.
    *   **Advantages**: Very fast and concise to implement for simple languages.
    *   **Disadvantages**: Performance is usually poor. More importantly, it's difficult to handle lexical rules that are context-dependent, like in JavaScript. For example, the character `/` could be either a division operator or the start of a regular expression. Distinguishing these two cases with regular expressions becomes extremely complex.

*   **Manual State Machine (Our Approach)**: Use `if/else` or `switch` to determine the current character and enter different processing functions, as we described above.
    *   **Advantages**: Extremely high performance because it's highly optimized character-level operations. High flexibility, allowing complete control over every detail of analysis, easily handling complex context-dependent rules.
    *   **Disadvantages**: Requires writing more code, relatively complex to implement.

For a serious, production-level parser, a manually written state machine is almost the only viable choice.

## 5. Summary

In this chapter, we established a macro understanding of lexical analysis. The key points you need to remember are:

*   Lexical analysis is the first step of compilation, converting a **character stream** into a **Token stream**.
*   A Token is the smallest meaningful unit in a language, a structured object containing type, value, and position information.
*   The core of a lexical analyzer is a **state machine** that decides the next operation based on the current character.

In the following chapters, we will manually implement this state machine, step by step building the lexical analyzer for mini-acornjs.

---

### Practice Exercises

1.  Manually perform lexical analysis on the code `const tax = rate * 1.2;` and write down the Token sequence you think should be generated (at least containing `type` and `value`).
2.  **Challenging Thought**: When the lexical analyzer reads the `/` character, how can it accurately determine whether this is a "division operator" or the start of a "regular expression"? Hint: Think about what kind of Token typically appears before these two cases in JavaScript syntax?