# 解析运算符与标点

我们已经成功地将字符流转换为了标识符、关键字和字面量。但代码不仅仅是这些元素，还需要大量的运算符（`+`, `-`, `*`, `/`）和标点符号（`(`, `)`, `{`, `}`）来构建语法结构。在这一章，我们将完成词法分析器的最后一块核心功能：识别这些至关重要的符号。

## 挑战：歧义与“最长匹配”原则

与解析单词和数字不同，运算符和标点符号的世界充满了“歧义”。例如，当你看到一个 `+` 字符时，它可能只是一个加号 (`+`)，也可能是自增运算符 (`++`) 的一部分，甚至是加法赋值运算符 (`+=`) 的一部分。

词法分析器如何做出正确的选择？答案是遵循一个简单而强大的原则：**最长匹配原则（Longest Match Principle）**。

这个原则规定，当一个字符序列有多种可能的解释时，词法分析器必须选择能匹配当前位置的最长的那个 Token。

- 如果输入是 `++a`，分析器在第一个 `+` 处，发现 `++` 是一个合法的 Token，而 `+` 也是。由于 `++` 更长，它会优先匹配 `++`。
- 如果输入是 `a + b`，分析器在 `+` 处，发现下一个字符是空格，`+` 是唯一可能的匹配，于是生成 `plus` Token。

这个原则是我们实现运算符解析的基石。

## 实现策略：分而治之

面对数量繁多的运算符，最直接有效的方法是在 `readToken` 方法中使用一个巨大的 `switch` 语句，根据当前字符进行分发处理。

对于简单的单字符标点，处理非常直接：

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

### 实现 `finishOp`

为了简化代码，我们可以创建一个 `finishOp` 辅助函数，它负责根据给定的类型和长度来完成 Token 的创建。

```javascript
// src/parser.js

// 新增一个辅助方法
finishOp(type, size) {
  const value = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  this.column += size;
  return this.finishToken(type, value);
}
```

现在，处理单字符 Token 变得更简洁：

```javascript
// case 59: return this.finishOp(tt.semi, 1);
```

### 处理多字符运算符

对于可能由多个字符组成的运算符，我们需要在 `switch` 的 `case` 中进行前瞻（lookahead）检查。让我们以 `+`, `++`, `+=` 为例：

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

这段代码完美地体现了“最长匹配”原则。它首先尝试匹配两个字符的运算符，如果失败，再回退到匹配单个字符的运算符。

遵循这个模式，你可以轻松地扩展它来处理 `-`, `--`, `-=`，或者 `*`, `*=`, `**`, `**=` 等等。

作为练习，你可以思考一下如何处理 `=`, `==`, `===` 和 `=>`。这四种情况的逻辑会稍微复杂一些，但原理是完全相同的。

这里是 `readEq` 的一种实现，你可以参考：

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

## 点、点、点：处理 `.` 的特殊性

点号 (`.`) 是一个非常特殊的字符。它既可以作为对象属性访问的**点运算符**（`obj.prop`），也可以作为**数字字面量**的开头（`.123`）。

我们需要在解析它时，检查紧随其后的字符来消除歧义。

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

## 模板字符串的起点：`` ` ``

反引号（`` ` ``）标志着模板字符串的开始。在词法分析阶段，我们主要关心的是正确地识别出它的 Token 类型。一个简化的实现可以只处理不包含插值（`${...}`）的简单模板字符串。

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
      // 在这里，我们简单地结束。一个完整的实现需要处理 ${...} 插值
      return this.finishToken(tt.template, chunk);
    }
    chunk += this.input[this.pos];
    this.pos++;
    this.column++;
  }
}
```
这个实现非常基础，它将两个反引号之间的所有内容都当作一个字符串。一个完备的模板字符串解析会复杂得多，需要递归地调用词法分析器来处理插值表达式，但对于我们的 mini-acornjs 来说，这已经足够了。

## 整合与测试

现在，我们的 `readToken` 方法已经非常强大了。它像一个交通枢纽，将不同的字符引导到正确的解析函数中。

```javascript
// 伪代码展示最终的 readToken 结构
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
      // ...
    case 34: case 39: // " '
      return this.readString(ch);
    
    default:
      if (isDigit(ch)) {
        return this.readNumber();
      }
  }

  throw new Error(`Unexpected character '${String.fromCharCode(ch)}'`);
}
```

让我们用一个简单的例子来检验我们的成果：

```javascript
const code = "let a = 1; a++; const b = a === 2;";
const parser = new Parser(code);
const tokens = [];
while(true) {
  const token = parser.nextToken();
  if (token.type === tt.eof) break;
  tokens.push(token);
}
console.log(tokens);
```

当你运行这段代码时，你应该能看到一个完美的 Token 序列，其中 `let`, `a`, `=`, `1`, `;`, `a`, `++`, `;`, `const`, `b`, `=`, `a`, `===`, `2`, `;` 都被正确地识别了出来。

## 总结

恭喜你！至此，我们已经完成了 `mini-acornjs` 的整个词法分析阶段。我们的 `Parser` 现在拥有了一个强大的 `nextToken` 方法，它能够将任意的 JavaScript 源代码字符串，分解成一个结构清晰、意义明确的 Token 序列。

我们从 Token 的数据结构设计出发，实现了关键字和标识符的识别，攻克了数字、字符串和正则表达式的解析难点，最后通过“最长匹配”原则，完美地处理了各种运算符和标点符号。

这个 Token 序列，就是我们通往下一步——**语法分析**——的入场券。在接下来的部分，我们将学习如何消费这些 Token，并根据 JavaScript 的语法规则，将它们组织成一棵抽象语法树（AST）。