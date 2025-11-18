# Parsing Literals: Strings, Numbers, and Regular Expressions

We have successfully parsed identifiers and keywords, which form the "skeleton" of code. Now, we need to handle the "flesh and blood" of code—literals. Literals are syntax that directly represents a fixed value in source code, such as the number `123`, the string `"hello"`, etc.

In this chapter, we will implement parsing of numbers and strings, and tackle one of the most classic challenges in lexical analysis: how to distinguish between the division operator and regular expressions.

## 1. Parsing Numbers (`readNumber`)

The logic for parsing numbers is relatively straightforward. In our simplified version, we'll first only consider decimal integers and floating-point numbers.

The workflow of `readNumber` is as follows:

1.  Starting from the current position, loop through reading all consecutive digit characters (`0-9`).
2.  If a dot `.` is encountered and no dot has been encountered before, we consider this a floating-point number and continue reading digits.
3.  When any non-digit character is encountered, stop the loop.
4.  Use `slice` to extract the number string and convert it to a real numeric type using `Number()`.
5.  Call `finishToken` to complete Token creation.

```javascript
// In the Parser class

readNumber() {
  const start = this.pos;
  let isFloat = false;

  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);
    if (ch >= 48 && ch <= 57) { // 0-9
      this.pos++;
      this.column++;
    } else if (ch === 46 && !isFloat) { // . (dot)
      isFloat = true;
      this.pos++;
      this.column++;
    } else {
      break;
    }
  }

  const value = Number(this.input.slice(start, this.pos));
  this.finishToken(tt.num, value);
}
```

> **Note**: This implementation is very basic. A production-grade `readNumber` would also need to handle complex cases like hexadecimal (`0x...`), octal (`0o...`), binary (`0b...`), and scientific notation (`1e10`).

## 2. Parsing Strings (`readString`)

The key to parsing strings lies in correctly handling quotes and escape characters.

The workflow of `readString` is:

1.  The parameter `quote` is the type of starting quote (single quote `'` or double quote `"`).
2.  Skip the starting quote.
3.  Loop through reading characters until encountering the same quote as the starting one, and it must be **unescaped**.
4.  During the loop, if a newline character is encountered, or if the end of file is reached without closure, it indicates a string error and should throw an error.
5.  If a backslash `\` is encountered, it indicates a possible escape sequence that needs special handling (e.g., `\n` should be parsed as a newline character, not two characters).
6.  Extract the content between the quotes as the string value.

```javascript
// In the Parser class

readString(quote) { // quote is the character code of the starting quote
  // Skip the starting quote
  this.pos++;
  this.column++;

  const start = this.pos;
  let value = "";

  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);

    if (ch === quote) { // Encounter closing quote
      value = this.input.slice(start, this.pos);
      this.pos++; // Skip closing quote
      this.column++;
      return this.finishToken(tt.string, value);
    }

    if (ch === 10) { // Unescaped newlines are not allowed in strings
      this.raise("Unterminated string constant", this.pos);
    }

    // Simplified handling, we temporarily don't process escape characters, just advance
    this.pos++;
    this.column++;
  }

  // If loop ends without returning, the string is unclosed
  this.raise("Unterminated string constant", start - 1);
}
```

## 3. The Century Problem: Division `/` vs. Regex `/.../`

Now we come to the most interesting part of lexical analysis. The character `/` has two completely different meanings in JavaScript:

*   In `10 / 2`, it's a **division operator**.
*   In `let re = /abc/i`, it's the **start of a regular expression**.

How can the lexical analyzer make this distinction "intelligently" like we do? The answer is: **rely on context**.

A simple but extremely effective rule is: **Observe the Token that comes before `/`**.

1.  If `/` is preceded by a Token that **can serve as the end of an expression** (e.g., a variable `a`, a number `10`, a right parenthesis `)`, a property `obj.prop`), then this `/` **must** be interpreted as a **division operator**. Because `a /.../` is syntactically invalid.

2.  If `/` is preceded by a Token that **cannot serve as the end of an expression** (e.g., a left parenthesis `(`, an assignment operator `=`, a comma `,`, a `return` keyword), then this `/` **must** be interpreted as the **start of a regular expression**.

To implement this, our `Parser` needs to maintain a state, which we'll call `expressionAllowed`. This state is updated after parsing each Token.

*   After parsing `a`, `10`, or `)`, `expressionAllowed` is set to `false`.
*   After parsing `=`, `(`, or `return`, `expressionAllowed` is set to `true`.

Now, when `readToken` encounters `/`, its logic becomes clear:

```javascript
// In the Parser class, within the readToken method

// ...
// Encounter / (code 47)
if (ch === 47) {
  // If expressionAllowed state is true, parse as regular expression
  if (this.expressionAllowed) {
    return this.readRegexp();
  }

  // Otherwise, parse as division or division assignment operator
  // ... (we'll implement this logic in the next chapter)
}
```

This idea of "determining how to parse the current Token based on the nature of the previous Token" is the embodiment of **Context Sensitivity**, which is key to writing a precise lexical analyzer.

## 4. Parsing Regular Expressions (`readRegexp`)

Once it's determined to parse a regular expression, the logic of `readRegexp` is somewhat similar to `readString`:

1.  Skip the starting `/`.
2.  Loop through reading the body part until encountering an unescaped `/`.
3.  Read the flags after `/`, such as `g`, `i`, `m`, etc., until encountering a non-identifier character.
4.  Create a `RegExp` Token.

```javascript
// In the Parser class

readRegexp() {
  const start = this.pos;
  this.pos++; // Skip starting /
  this.column++;

  // Read regular expression body
  while (this.pos < this.input.length && this.input.charCodeAt(this.pos) !== 47) {
    // Simplified handling, temporarily ignoring escaped / and newlines
    this.pos++;
    this.column++;
  }

  this.pos++; // Skip ending /
  this.column++;

  // Read flags
  while (this.pos < this.input.length && this.isIdentifierChar(this.input.charCodeAt(this.pos))) {
    this.pos++;
    this.column++;
  }

  const value = this.input.slice(start, this.pos);
  // In Acorn, this would validate legality with new RegExp(), we'll omit for now
  this.finishToken(tt.regexp, value);
}
```

## 5. Summary

In this chapter, we successfully added the ability to parse numeric and string literals to our parser. More importantly, by solving the ambiguity problem of `/`, we gained a deep understanding of the important role of "context sensitivity" in lexical analysis. We recognize that lexical analysis is not a completely independent stage; sometimes it needs "hints" from the syntax analysis level (i.e., the nature of the previous Token) to make correct decisions.

---

### Practice Exercises

1.  **Implement Hexadecimal Parsing**: Extend the `readNumber` method so that when it encounters `0x` or `0X`, it can correctly read subsequent hexadecimal digits (`0-9`, `a-f`, `A-F`).
2.  **Implement String Escaping**: Improve the `readString` method so it can correctly handle the two common escape sequences `\n` (parsed as newline) and `\\` (parsed as single backslash). You'll need a `value` variable to gradually build the final string value.
3.  **Thought Question**: Observe the following two lines of code: `1 / 2 / 3` and `let r = /a/i`. Please describe in detail how your lexical analyzer, when encountering each `/` while parsing these two code segments, determines its specific meaning based on the "previous Token".