# Parsing Operators and Punctuators

We have successfully converted character streams into identifiers, keywords, and literals. But code consists of more than just these elements; it requires numerous operators (`+`, `-`, `*`, `/`) and punctuation symbols (`(`, `)`, `{`, `}`) to build syntactic structures. In this chapter, we will complete the final core functionality of our lexical analyzer: recognizing these crucial symbols.

## Challenge: Ambiguity and the "Longest Match" Principle

Unlike parsing words and numbers, the world of operators and punctuation symbols is full of "ambiguity". For example, when you see a `+` character, it might be just a plus sign (`+`), or it could be part of the increment operator (`++`), or even part of the addition assignment operator (`+=`).

How does the lexical analyzer make the correct choice? The answer lies in following a simple yet powerful principle: **Longest Match Principle**.

This principle states that when a character sequence has multiple possible interpretations, the lexical analyzer must choose the Token that matches the longest possible sequence at the current position.

- If the input is `++a`, the analyzer at the first `+` position finds that `++` is a valid Token, and `+` is also valid. Since `++` is longer, it will prioritize matching `++`.
- If the input is `a + b`, the analyzer at the `+` position finds that the next character is a space, and `+` is the only possible match, so it generates a `plus` Token.

This principle is the foundation for our implementation of operator parsing.

## Implementation Strategy: Divide and Conquer

Faced with a large number of operators, the most direct and effective approach is to use a large `switch` statement in the `readToken` method, dispatching processing based on the current character.

For simple single-character punctuation, the handling is very straightforward:

```javascript
// src/parser.js

// ... in readToken method
const ch = this.input.charCodeAt(this.pos);

switch (ch) {
  // ... (cases for identifiers, strings, numbers)

  // Punctuators
  case 40: // (
    this.pos++;
    this.column++;
    return this.finishToken(tt.parenL);
  case 41: // )
    this.pos++;
    this.column++;
    return this.finishToken(tt.parenR);
  case 59: // ;
    this.pos++;
    this.column++;
    return this.finishToken(tt.semi);
  case 44: // ,
    this.pos++;
    this.column++;
    return this.finishToken(tt.comma);
  // ... more single-character tokens
}
```

### Implementing `finishOp`

To simplify the code, we can create a `finishOp` helper function that's responsible for completing Token creation based on the given type and length.

```javascript
// src/parser.js

// Add a new helper method
finishOp(type, size) {
  const value = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  this.column += size;
  return this.finishToken(type, value);
}
```

Now, handling single-character Tokens becomes more concise:

```javascript
// case 59: return this.finishOp(tt.semi, 1);
```

### Handling Multi-character Operators

For operators that may consist of multiple characters, we need to perform lookahead checks within the `switch` `case`. Let's take `+`, `++`, `+=` as an example:

```javascript
// src/parser.js

// ... in readToken's switch statement
case 43: // +
  const next = this.input[this.pos + 1];
  if (next === '+') {
    return this.finishOp(tt.incDec, 2); // '++'
  } else if (next === '=') {
    return this.finishOp(tt.assign, 2); // '+='
  } else {
    return this.finishOp(tt.plus, 1); // '+'
  }
```

This code perfectly embodies the "Longest Match" principle. It first attempts to match two-character operators, and if that fails, falls back to matching single-character operators.

Following this pattern, you can easily extend it to handle `-`, `--`, `-=`, or `*`, `*=`, `**`, `**=` etc.

As an exercise, you can think about how to handle `=`, `==`, `===`, and `=>`. The logic for these four cases will be slightly more complex, but the principle is exactly the same.

Here's one implementation of `readEq` that you can reference:

```javascript
// src/parser.js

// ... in readToken's switch statement
case 61: // =
  const next = this.input[this.pos + 1];
  if (next === '>') {
    return this.finishOp(tt.arrow, 2); // =>
  } else if (next === '=') {
    const nextNext = this.input[this.pos + 2];
    if (nextNext === '=') {
      return this.finishOp(tt.equality, 3); // ===
    } else {
      return this.finishOp(tt.equality, 2); // ==
    }
  } else {
    return this.finishOp(tt.assign, 1); // =
  }
```

## Dot, Dot, Dot: Handling the Special Case of `.`

The dot (`.`) is a very special character. It can serve both as the **dot operator** for object property access (`obj.prop`) and as the start of a **numeric literal** (`.123`).

When parsing it, we need to check the character immediately following it to resolve the ambiguity.

```javascript
// src/parser.js

// ... in readToken's switch statement
case 46: // .
  const next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) { // next is a digit
    return this.readNumber();
  } else {
    return this.finishOp(tt.dot, 1);
  }
```

## The Starting Point of Template Strings: `` ` ``

The backtick (`` ` ``) marks the start of a template string. In the lexical analysis phase, we're mainly concerned with correctly identifying its Token type. A simplified implementation can handle only simple template strings without interpolation (`${...}`).

```javascript
// src/parser.js

// ... in readToken's switch statement
case 96: // `
  return this.readTemplate();

// ... in Parser class
readTemplate() {
  this.pos++;
  this.column++;
  let chunk = '';
  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);
    if (ch === 96) { // `
      this.pos++;
      this.column++;
      // Here, we simply end. A complete implementation would need to handle ${...} interpolation
      return this.finishToken(tt.template, chunk);
    }
    chunk += this.input[this.pos];
    this.pos++;
    this.column++;
  }
}
```

This implementation is very basic—it treats everything between two backticks as a string. A complete template string parser would be much more complex, requiring recursive calls to the lexical analyzer to handle interpolation expressions, but for our mini-acornjs, this is sufficient.

## Integration and Testing

Now, our `readToken` method has become very powerful. It acts like a traffic hub, directing different characters to the correct parsing functions.

```javascript
// Pseudocode showing the final structure of readToken
readToken() {
  // skipSpace() ...

  const ch = this.input.charCodeAt(this.pos);

  if (isIdentifierStart(ch)) {
    return this.readWord();
  }

  switch (ch) {
    case 46: // .
      // ...
    case 40: case 41: case 59: case 44: // ( ) ; ,
      // ...
    case 43: case 45: // + -
      // ...
    case 42: case 47: // * /
      // ...
    case 61: // =
      // ...
    case 96: // `
```