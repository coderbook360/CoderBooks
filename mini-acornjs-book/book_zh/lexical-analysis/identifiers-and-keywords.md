# 解析标识符与关键字

在构建了词法分析器的骨架之后，我们现在开始为其添加真正的功能。第一个要攻克的目标，就是 JavaScript 中最常见、最基本的“单词”——标识符（Identifiers）和关键字（Keywords）。

变量名、函数名如 `myVar`、`calculate` 都是标识符。而像 `let`、`if`、`for` 这样被语言赋予了特殊语法含义的词，则是关键字。

我们的任务是编写一个 `readWord` 方法，它能够智能地读取一个单词，并准确判断出它的“词性”——到底是普通的标识符，还是一个特殊的关键字。

## 1. 识别单词的边界

一个标识符或关键字必须符合一定的规则。根据 ECMAScript 规范，它：

*   必须以字母（`a-z`, `A-Z`）、下划线（`_`）或美元符号（`$`）开头。
*   后续的字符可以是以上这些，还可以包含数字（`0-9`）。

为了简化实现，我们将暂时只支持 ASCII 字符，并据此在 `Parser` 类中创建两个辅助方法：

```javascript
// 在 Parser 类中

// 判断一个字符是否可以是标识符的开头
isIdentifierStart(ch) {
  // a-z, A-Z, _ , $
  return (ch >= 97 && ch <= 122) || (ch >= 65 && ch <= 90) || ch === 95 || ch === 36;
}

// 判断一个字符是否可以是标识符的一部分
isIdentifierChar(ch) {
  return this.isIdentifierStart(ch) || (ch >= 48 && ch <= 57); // 包含数字 0-9
}
```

> **性能提示**：我们继续使用字符编码（`charCodeAt` 的结果）进行比较，这在性能敏感的解析器中是标准实践。

## 2. 实现 `readWord` 方法

`readWord` 方法的逻辑遵循一个经典模式，这个模式在后续解析其他类型的 Token 时还会反复出现：

1.  **循环读取**：从当前位置开始，只要字符满足标识符的规则，就一直向后移动指针。
2.  **切片提取**：当循环结束时，指针 `pos` 就指向了单词的末尾。我们使用 `slice` 方法从源码中提取出这个完整的单词字符串。
3.  **查表判断**：拿着这个单词，去我们之前在 `tokentype.js` 中定义的 `keywords` Map 中查找。
4.  **确定类型**：如果 `keywords.has(word)` 为 `true`，那么它的类型就是对应的关键字 `TokenType`；否则，它就是一个普通的标识符，类型为 `tt.name`。
5.  **完成 Token**：最后，调用一个 `finishToken` 的辅助方法来更新 `Parser` 的状态（`this.type`, `this.value` 等）。

让我们在 `Parser` 类中实现它：

```javascript
// 在 Parser 类中

readWord() {
  // 记录单词的起始位置
  const start = this.pos;

  // 1. 循环读取，直到遇到不属于标识符的字符
  while (this.pos < this.input.length && this.isIdentifierChar(this.input.charCodeAt(this.pos))) {
    this.pos++;
    this.column++;
  }

  // 2. 切片提取出单词
  const word = this.input.slice(start, this.pos);

  // 3. 查表判断是关键字还是标识符
  const type = keywords.has(word) ? keywords.get(word) : tt.name;

  // 4. 完成 Token 的创建
  this.finishToken(type, word);
}

// 这是一个非常重要的辅助方法，用于统一更新 Token 状态
finishToken(type, value) {
  this.type = type;
  this.value = value;
  this.end = this.pos;
  this.endLine = this.line;
  this.endColumn = this.column;
}
```

## 3. 集成到 `readToken`

现在，我们只需要在 `readToken` 的调度逻辑中，正确地调用 `readWord` 即可。我们修改 `readToken` 方法，将之前基于 `a-z` 的简单判断，替换为我们新创建的 `isIdentifierStart` 方法。

```javascript
// 在 Parser 类中，修改 readToken 方法

readToken() {
  const ch = this.input.charCodeAt(this.pos);

  // 如果当前字符可以作为标识符的开头
  if (this.isIdentifierStart(ch)) {
    return this.readWord();
  }

  // ... 其他 Token 的读取逻辑将在后续添加

  this.raise(`Unexpected character '${String.fromCharCode(ch)}'`, this.pos);
}
```

至此，我们的词法分析器已经具备了识别标识符和关键字的能力！当 `nextToken()` 被调用时，如果它遇到一个字母，整个流程将是：

`nextToken()` -> `readToken()` -> `readWord()`

`readWord` 会完成所有的工作，并最终通过 `finishToken` 更新 `Parser` 的 `this.type` 和 `this.value`。语法分析器只需要读取这两个属性，就能知道当前的 Token 是什么了。

## 4. 总结

在本章中，我们实现了词法分析器的一个核心功能。我们掌握了 **“循环读取字符 -> 切片提取单词 -> 查表判断类型”** 的经典模式。这个模式不仅让我们成功区分了标识符和关键字，也为我们后续解析数字、字符串等更复杂的 Token 类型奠定了坚实的基础。

---

### 课后练习

1.  **扩展关键字**：在你的 `src/tokentype.js` 文件的 `keywords` Map 中，添加 `const`、`if`、`else`、`for`、`while` 这几个关键字。然后编写一小段测试代码（例如 `let code = "for (let i = 0; i < 10; i++)"`），循环调用 `nextToken()`，并打印出每个 Token 的类型和值，验证你的解析器是否能正确识别它们。

2.  **思考题**：在 JavaScript 中，`true`、`false` 和 `null` 在技术上不属于关键字（Keyword），它们有自己独立的类型（`BooleanLiteral` 和 `NullLiteral`）。想一想，为什么规范要这样区分？从“它们代表的是一个值”还是“一个语法结构”的角度来思考。在我们目前的实现中，暂时将它们作为关键字来处理，是否可行？