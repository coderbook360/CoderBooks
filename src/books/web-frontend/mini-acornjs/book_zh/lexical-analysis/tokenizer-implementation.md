# 实现 Tokenizer：处理空白、注释与 Token 读取

在上一章，我们精心设计了 `Token` 和 `TokenType` 这两个核心数据结构，它们是我们词法分析的“标准零件”。现在，是时候建造一条能够生产这些零件的“流水线”了。这条流水线的核心，就是我们的 `Parser` 类，以及它最重要的方法之一：`nextToken()`。

## 1. 搭建 Parser 骨架

我们将回到 `src/parser.js` 文件（如果不存在，请创建它），并为 `Parser` 类添加词法分析所需的状态和基本结构。这个类将贯穿我们整个解析器的构建过程。

```javascript
// src/parser.js
import { tt } from "./tokentype.js";

export class Parser {
  constructor(input) {
    // 源码字符串
    this.input = input;

    // --- 词法分析状态 ---
    // pos: 当前在 input 字符串中的位置（索引）
    // line: 当前行号（从 1 开始）
    // column: 当前列号（从 0 开始）
    this.pos = 0;
    this.line = 1;
    this.column = 0;

    // --- 语法分析状态 ---
    // 每当 nextToken() 被调用，下面的属性都会被更新
    // type: 当前 Token 的类型 (TokenType 实例)
    // value: 当前 Token 的值
    // start: 当前 Token 的起始位置
    // end: 当前 Token 的结束位置
    this.type = tt.eof;
    this.value = null;
    this.start = 0;
    this.end = 0;
  }

  // 这是一个辅助函数，用于抛出错误
  raise(message, pos) {
    const err = new Error(message);
    err.pos = pos;
    throw err;
  }
}
```

**设计解析**：

*   我们将词法分析和语法分析所需的状态都集中在了 `Parser` 实例上。`pos`, `line`, `column` 是词法分析器在源码中移动的“光标”。
*   `type`, `value`, `start`, `end` 则代表了“当前”的 Token。语法分析器在工作时，只会关心这些属性，而不需要知道 `nextToken()` 内部的复杂逻辑。这是一种非常重要的解耦设计。

## 2. `nextToken()`: 词法分析的引擎

`nextToken()` 是驱动整个词法分析过程的核心引擎。每当语法分析器需要下一个 Token 时，就会调用它。它的职责非常明确：**从当前位置开始，跳过所有无意义的内容，然后返回下一个有意义的 Token**。

它的实现逻辑非常清晰：

```javascript
// 在 Parser 类中

nextToken() {
  // 记录当前 Token 的起始位置，以备后续创建 Token 对象
  this.start = this.pos;
  this.startLine = this.line;
  this.startColumn = this.column;

  // 1. 跳过所有无意义的空白和注释
  this.skipSpace();

  // 如果跳完后已经到了文件末尾，那么就设置 EOF Token 并返回
  if (this.pos >= this.input.length) {
    this.type = tt.eof;
    this.value = null;
    this.end = this.pos;
    return;
  }

  // 2. 真正开始读取 Token
  this.readToken();
}
```

## 3. `skipSpace()`: 忽略无关信息

在 JavaScript 中，空格、换行、注释等对于程序的执行逻辑是没有影响的。`skipSpace()` 的任务就是将它们统统跳过。

为了追求极致的性能，我们将使用 `charCodeAt()` 来获取字符的编码进行比较，这比直接比较字符串 (`this.input[this.pos] === ' '`) 要快得多。

```javascript
// 在 Parser 类中

skipSpace() {
  // 只要没到结尾，就一直循环
  while (this.pos < this.input.length) {
    const ch = this.input.charCodeAt(this.pos);

    if (ch === 32) { // 空格 (space)
      this.pos++;
      this.column++;
    } else if (ch === 10) { // 换行 (newline)
      this.pos++;
      this.line++;
      this.column = 0;
    } else if (ch === 47) { // 斜杠，可能是注释的开始
      const next = this.input.charCodeAt(this.pos + 1);

      if (next === 47) { // 单行注释 //
        this.skipLineComment();
      } else if (next === 42) { // 多行注释 /*
        this.skipBlockComment();
      } else {
        // 如果 / 后面不是 / 或 *，那它就是除法运算符，不是空白
        break;
      }
    } else {
      // 遇到任何其他非空白字符，退出循环
      break;
    }
  }
}

// 跳过单行注释
skipLineComment() {
  // 跳过 "//"
  this.pos += 2;
  // 一直向后找到行尾
  while (this.pos < this.input.length && this.input.charCodeAt(this.pos) !== 10) {
    this.pos++;
    this.column++; // 注意：在我们的模型中，单行注释内的字符也算列数
  }
}

// 跳过多行注释（留作练习）
skipBlockComment() {
  // TODO: 实现多行注释的跳过逻辑
}
```

## 4. `readToken()`: Token 读取的总调度室

当 `skipSpace()` 执行完毕后，`pos` 指针保证指向了下一个有意义字符的开头。`readToken()` 的任务就是根据这个字符，决定接下来应该调用哪个更具体的读取函数（如 `readNumber`, `readWord` 等）。它就像一个总调度室。

```javascript
// 在 Parser 类中

readToken() {
  const ch = this.input.charCodeAt(this.pos);

  // 使用一个 if/else if 链进行分发
  // 将最常见的字符类型放在前面，有助于提高性能

  // a-z: 可能是标识符或关键字
  if ((ch >= 97 && ch <= 122)) {
    return this.readWord();
  }

  // 0-9: 数字
  if ((ch >= 48 && ch <= 57)) {
    return this.readNumber();
  }

  // " or ': 字符串
  if (ch === 34 || ch === 39) { // " or '
    return this.readString(ch);
  }

  // . ( ) [ ] ; = + 等: 标点或运算符
  // ... 我们将在后续章节实现 readPunc() ...

  // 如果所有分发都失败了，说明遇到了一个我们不认识的字符
  this.raise(`Unexpected character '${String.fromCharCode(ch)}'`, this.pos);
}
```

这个 `readToken` 方法目前还只是一个骨架，它清晰地展示了**基于前瞻字符进行分发**的核心思想。在接下来的几章里，我们的主要任务就是去实现 `readWord`、`readNumber`、`readString` 等具体的读取方法，并用它们来填充这个骨架。

## 5. 总结

在本章中，我们构建了词法分析器的核心引擎。`Parser` 类承载了所有的状态，`nextToken()` 驱动整个流程，`skipSpace()` 负责“清理垃圾”，而 `readToken()` 则扮演了“总调度室”的角色。

我们已经为词法分析的血肉——具体的 Token 读取逻辑——做好了万全的准备。从下一章开始，我们将逐一攻克标识符、关键字、数字、字符串等各种 Token 的解析。

---

### 课后练习

1.  **实现 `skipBlockComment()`**: 请你亲手完成 `skipBlockComment()` 方法。你需要循环查找 `*/` 这个结束标记。注意，你需要正确处理 `*` 后面紧跟着的不是 `/` 的情况（例如 `/* a * b */`）。更重要的是，如果直到文件末尾都没有找到 `*/`，你应该抛出一个“未闭合的块注释”错误。
2.  **扩充 `readToken`**: 在 `readToken` 的分发逻辑中，为 `[`、`(`、`.`、`;`、`=`、`+` 等字符添加 `if` 判断，让它们暂时都调用一个（尚未实现的）`readPunc()` 方法。