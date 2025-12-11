# 解析字面量：字符串、数字与正则表达式

我们已经成功地解析了标识符和关键字，它们构成了代码的“骨架”。现在，我们要来处理代码的“血肉”——字面量（Literals）。字面量是在源代码中直接表示一个固定值的语法，例如数字 `123`、字符串 `"hello"` 等。

本章，我们将实现对数字和字符串的解析，并挑战词法分析中最经典的难题之一：如何区分除法运算符和正则表达式。

## 1. 解析数字 (`readNumber`)

解析数字的逻辑相对直接。在我们的简化版中，我们先只考虑十进制的整数和浮点数。

`readNumber` 的工作流程如下：

1.  从当前位置开始，循环读取所有连续的数字字符 (`0-9`)。
2.  如果遇到一个点 `.`，并且之前没有遇到过点，那么我们认为这是一个浮点数，继续向后读取数字。
3.  当遇到任何非数字字符时，停止循环。
4.  使用 `slice` 提取数字字符串，并用 `Number()` 将其转换为真实的数字类型。
5.  调用 `finishToken` 完成 Token 的创建。

```javascript
// 在 Parser 类中

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

> **注意**：这个实现非常基础。一个生产级的 `readNumber` 还需要处理十六进制（`0x...`）、八进制（`0o...`）、二进制（`0b...`）以及科学记数法（`1e10`）等复杂情况。

## 2. 解析字符串 (`readString`)

解析字符串的关键在于正确地处理引号和转义字符。

`readString` 的工作流程是：

1.  传入的参数 `quote` 是起始的引号类型（单引号 `'` 或双引号 `"`）。
2.  跳过起始的引号。
3.  循环读取字符，直到再次遇到与起始引号相同的、并且**未被转义**的引号。
4.  在循环过程中，如果遇到换行符，或者没闭合就到了文件末尾，说明字符串有误，应抛出错误。
5.  如果遇到反斜杠 `\`，说明后面可能是一个转义序列，需要特殊处理（例如 `\n` 应该被解析为一个换行符，而不是两个字符）。
6.  提取引号之间的内容作为字符串的值。

```javascript
// 在 Parser 类中

readString(quote) { // quote 是起始引号的字符编码
  // 跳过起始引号
  this.pos++;
  this.column++;

  const start = this.pos;
  let value = "";

  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);

    if (ch === quote) { // 遇到闭合引号
      value = this.input.slice(start, this.pos);
      this.pos++; // 跳过闭合引号
      this.column++;
      return this.finishToken(tt.string, value);
    }

    if (ch === 10) { // 字符串中不允许未转义的换行
      this.raise("Unterminated string constant", this.pos);
    }

    // 简化处理，我们暂时不处理转义字符，直接前进
    this.pos++;
    this.column++;
  }

  // 如果循环结束还没返回，说明字符串没有闭合
  this.raise("Unterminated string constant", start - 1);
}
```

## 3. 世纪难题：除法 `/` vs. 正则 ` /.../`

现在，我们来到了词法分析中最有趣的部分。字符 `/` 在 JavaScript 中有两种截然不同的含义：

*   在 `10 / 2` 中，它是一个**除法运算符**。
*   在 `let re = /abc/i` 中，它是**正则表达式的起始符**。

词法分析器如何才能像我们一样“智能”地做出区分呢？答案是：**依赖上下文**。

一个简单但极其有效的规则是：**观察 `/` 前面的那个 Token**。

1.  如果 `/` 前面是一个**可以作为表达式结尾**的 Token（例如一个变量 `a`、一个数字 `10`、一个右括号 `)`、一个属性 `obj.prop`），那么这个 `/` **必须**被解释为**除法运算符**。因为 `a /.../` 在语法上是不合法的。

2.  如果 `/` 前面是一个**不可以作为表达式结尾**的 Token（例如一个左括号 `(`、一个赋值号 `=`、一个逗号 `,`、一个 `return` 关键字），那么这个 `/` **必须**被解释为**正则表达式的起始符**。

为了实现这一点，我们的 `Parser` 需要维护一个状态，我们称之为 `expressionAllowed`。这个状态会在每解析完一个 Token 后进行更新。

*   当解析完 `a` 或 `10` 或 `)` 后，`expressionAllowed` 会被设置为 `false`。
*   当解析完 `=` 或 `(` 或 `return` 后，`expressionAllowed` 会被设置为 `true`。

现在，当 `readToken` 遇到 `/` 时，它的逻辑就变得清晰了：

```javascript
// 在 Parser 类中，readToken 方法里

// ...
// 遇到 / (编码 47)
if (ch === 47) {
  // 如果 expressionAllowed 状态为 true，则解析正则表达式
  if (this.expressionAllowed) {
    return this.readRegexp();
  }

  // 否则，解析为除法或除法赋值运算符
  // ... (这部分逻辑我们将在下一章实现)
}
```

这个“根据前一个 Token 的性质来决定当前 Token 如何解析”的思想，就是**上下文敏感性（Context Sensitivity）**的体现，它是编写一个精确的词法分析器的关键。

## 4. 解析正则表达式 (`readRegexp`)

一旦确定了要解析正则表达式，`readRegexp` 的逻辑就和 `readString` 有些类似了：

1.  跳过起始的 `/`。
2.  循环读取主体部分，直到遇到一个未被转义的 `/`。
3.  读取 `/` 之后的标志位（flags），如 `g`, `i`, `m` 等，直到遇到非标识符字符。
4.  创建 `RegExp` Token。

```javascript
// 在 Parser 类中

readRegexp() {
  const start = this.pos;
  this.pos++; // 跳过起始的 /
  this.column++;

  // 读取正则表达式主体
  while (this.pos < this.input.length && this.input.charCodeAt(this.pos) !== 47) {
    // 简化处理，暂不考虑转义的 / 和换行
    this.pos++;
    this.column++;
  }

  this.pos++; // 跳过结束的 /
  this.column++;

  // 读取标志位
  while (this.pos < this.input.length && this.isIdentifierChar(this.input.charCodeAt(this.pos))) {
    this.pos++;
    this.column++;
  }

  const value = this.input.slice(start, this.pos);
  // 在 Acorn 中，这里会用 new RegExp() 验证合法性，我们暂时省略
  this.finishToken(tt.regexp, value);
}
```

## 5. 总结

在本章，我们成功地为解析器添加了解析数字和字符串字面量的能力。更重要的是，我们通过解决 `/` 的二义性问题，深入理解了“上下文敏感性”在词法分析中的重要作用。我们认识到，词法分析并非一个完全独立的阶段，有时它需要来自语法分析层面的“暗示”（即前一个 Token 的性质）来做出正确的决策。

---

### 课后练习

1.  **实现十六进制解析**：扩展 `readNumber` 方法，使其在遇到 `0x` 或 `0X` 后，能够正确地读取后续的十六进制数字（`0-9`, `a-f`, `A-F`）。
2.  **实现字符串转义**：完善 `readString` 方法，使其能正确处理 `\n`（解析为换行符）和 `\\`（解析为单个反斜杠）这两种常见的转义序列。你需要一个 `value` 变量来逐步构建最终的字符串值。
3.  **思考题**：观察以下两行代码：`1 / 2 / 3` 和 `let r = /a/i`。请详细描述在解析这两段代码时，你的词法分析器在遇到每一个 `/` 时，是如何根据“前一个 Token”来判断其具体含义的。