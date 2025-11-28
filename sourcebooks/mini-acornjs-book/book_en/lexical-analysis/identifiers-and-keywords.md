# Parsing Identifiers and Keywords

After building the skeleton of our lexical analyzer, we now begin adding real functionality. The first target to conquer is the most common and fundamental "words" in JavaScript—identifiers and keywords.

Variable names, function names like `myVar`, `calculate` are identifiers. Words like `let`, `if`, `for` that are assigned special syntactic meaning by the language are keywords.

Our task is to write a `readWord` method that can intelligently read a word and accurately determine its "part of speech"—whether it's an ordinary identifier or a special keyword.

## 1. Identifying Word Boundaries

An identifier or keyword must conform to certain rules. According to the ECMAScript specification, it:

*   Must start with a letter (`a-z`, `A-Z`), underscore (`_`), or dollar sign (`$`).
*   Subsequent characters can include the above, plus digits (`0-9`).

To simplify implementation, we'll temporarily only support ASCII characters, and accordingly create two helper methods in the `Parser` class:

```javascript
// In the Parser class

// Determine if a character can start an identifier
isIdentifierStart(ch) {
  // a-z, A-Z, _, $
  return (ch >= 97 && ch <= 122) || (ch >= 65 && ch <= 90) || ch === 95 || ch === 36;
}

// Determine if a character can be part of an identifier
isIdentifierChar(ch) {
  return this.isIdentifierStart(ch) || (ch >= 48 && ch <= 57); // Includes digits 0-9
}
```

> **Performance Tip**: We continue using character codes (results of `charCodeAt`) for comparison, which is standard practice in performance-sensitive parsers.

## 2. Implementing the `readWord` Method

The logic of the `readWord` method follows a classic pattern that will recur when parsing other types of Tokens:

1.  **Loop Reading**: Starting from the current position, keep moving the pointer backward as long as characters satisfy identifier rules.
2.  **Slice Extraction**: When the loop ends, the pointer `pos` points to the end of the word. We use the `slice` method to extract the complete word string from the source code.
3.  **Table Lookup**: Take this word and look it up in the `keywords` Map we defined earlier in `tokentype.js`.
4.  **Determine Type**: If `keywords.has(word)` is `true`, then its type is the corresponding keyword `TokenType`; otherwise, it's an ordinary identifier with type `tt.name`.
5.  **Complete Token**: Finally, call a helper method `finishToken` to update the `Parser`'s state (`this.type`, `this.value`, etc.).

Let's implement it in the `Parser` class:

```javascript
// In the Parser class

readWord() {
  // Record the starting position of the word
  const start = this.pos;

  // 1. Loop reading until encountering a character that doesn't belong to an identifier
  while (this.pos < this.input.length && this.isIdentifierChar(this.input.charCodeAt(this.pos))) {
    this.pos++;
    this.column++;
  }

  // 2. Slice to extract the word
  const word = this.input.slice(start, this.pos);

  // 3. Table lookup to determine if it's a keyword or identifier
  const type = keywords.has(word) ? keywords.get(word) : tt.name;

  // 4. Complete Token creation
  this.finishToken(type, word);
}

// This is a very important helper method for uniformly updating Token state
finishToken(type, value) {
  this.type = type;
  this.value = value;
  this.end = this.pos;
  this.endLine = this.line;
  this.endColumn = this.column;
}
```

## 3. Integration into `readToken`

Now, we just need to correctly call `readWord` in the dispatch logic of `readToken`. We modify the `readToken` method, replacing the previous simple check based on `a-z` with our newly created `isIdentifierStart` method.

```javascript
// In the Parser class, modify the readToken method

readToken() {
  const ch = this.input.charCodeAt(this.pos);

  // If the current character can start an identifier
  if (this.isIdentifierStart(ch)) {
    return this.readWord();
  }

  // ... Reading logic for other Tokens will be added later

  this.raise(`Unexpected character '${String.fromCharCode(ch)}'`, this.pos);
}
```

At this point, our lexical analyzer has the ability to recognize identifiers and keywords! When `nextToken()` is called and it encounters a letter, the entire flow will be:

`nextToken()` -> `readToken()` -> `readWord()`

`readWord` will complete all the work and ultimately update the `Parser`'s `this.type` and `this.value` through `finishToken`. The syntax analyzer only needs to read these two properties to know what the current Token is.

## 4. Summary

In this chapter, we implemented a core functionality of the lexical analyzer. We mastered the classic pattern of **"loop reading characters -> slice extracting word -> table lookup determining type"**. This pattern not only allows us to successfully distinguish identifiers from keywords but also lays a solid foundation for parsing more complex Token types like numbers and strings in the future.

---

### Practice Exercises

1.  **Extend Keywords**: In your `src/tokentype.js` file's `keywords` Map, add the keywords `const`, `if`, `else`, `for`, `while`. Then write a small test code (e.g., `let code = "for (let i = 0; i < 10; i++)"`), loop through calling `nextToken()`, and print each Token's type and value to verify if your parser can correctly recognize them.

2.  **Thought Question**: In JavaScript, `true`, `false`, and `null` technically don't belong to keywords; they have their own independent types (`BooleanLiteral` and `NullLiteral`). Think about why the specification makes this distinction? Consider from the perspective of whether "they represent a value" or "a syntactic structure". In our current implementation, is it acceptable to temporarily treat them as keywords?