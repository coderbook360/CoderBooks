# 实现解析器辅助方法

我们已经为 `Parser` 建立了一个健壮的状态管理系统。现在，在正式编写 `parseStatement`、`parseExpression` 等核心递归下降函数之前，我们需要先打造一套“工具箱”——一系列的辅助方法。

在实现各种 `parseXXX` 函数时，我们会反复遇到一些相同的操作模式：

- “检查一下当前是不是 `if` 关键字？”
- “如果当前是左括号 `(`，就把它‘吃掉’，然后继续解析括号里的内容。”
- “这里必须是一个分号 `;`，如果不是，就说明代码写错了，必须报错！”

如果每次都在核心解析函数中编写这些原始逻辑，代码将变得冗长、重复且难以阅读。本章的目标就是将这些高频操作封装成一组简洁、表意清晰的辅助函数，让我们的解析代码写起来像阅读语法规则一样自然。

## 核心操作：Match, Eat, Expect

我们的工具箱主要围绕三个核心动作构建：

- **匹配 (Match)**: 只检查当前 Token 的类型，**不**改变解析器状态。
- **消费 (Consume/Eat)**: 确认当前 Token 符合预期后，调用 `nextToken()` 将解析器的状态向前推进至下一个 Token。
- **期望 (Expect)**: 强制要求当前 Token 必须是某个类型，否则就抛出错误，中断解析。

让我们在 `Parser` 类中实现这些方法。

```javascript
// src/parser.js (在 Parser 类中新增以下方法)

/**
 * 检查当前 Token 类型是否匹配
 * @param {TokenType} type 期望的 Token 类型
 * @returns {boolean}
 */
match(type) {
  return this.type === type;
}

/**
 * 如果当前 Token 匹配，则消费它并返回 true。
 * 这是一个“温柔”的消费，用于处理可选的语法部分。
 * @param {TokenType} type 期望的 Token 类型
 * @returns {boolean}
 */
 eat(type) {
  if (this.match(type)) {
    this.nextToken(); // 消费，前进！
    return true;
  }
  return false;
}

/**
 * 强行要求当前 Token 必须匹配，否则抛出错误。
 * 这是一个“严厉”的消费，用于处理固定的语法结构。
 * @param {TokenType} type 期望的 Token 类型
 */
expect(type) {
  if (this.eat(type)) {
    return; // 成功消费，一切正常
  }
  // 失败，抛出错误
  this.raise(`Unexpected token, expected "${type.label}"`);
}
```

- `match(type)`: 这是最基础的判断工具，一个只读操作，绝不调用 `nextToken()`。
- `eat(type)`: 在 `match` 的基础上增加了“写操作”。如果匹配成功，就调用 `nextToken()` 来更新解析器状态，并返回 `true`。它完美适用于处理可选的语法部分，例如 `if` 语句后面可选的 `else` 子句，或者一条语句末尾可选的分号。
- `expect(type)`: 这是语法规则的“守护者”。它直接复用 `eat`，如果 `eat` 失败，就意味着语法不匹配，立即调用 `raise` 中断解析。它适用于所有强制性的语法部分，如 `if` 后面的 `(`、函数调用时的 `)` 等。

## 统一的错误处理：`raise`

`expect` 方法依赖于一个统一的错误抛出函数 `raise`。将所有语法错误的抛出收敛到一个地方，能保证错误信息的一致性和可调试性。

```javascript
// src/parser.js (在 Parser 类中新增)

/**
 * 抛出一个带有精确位置信息的语法错误
 * @param {string} message 错误信息
 */
raise(message) {
  const err = new SyntaxError(message);
  // 将当前 Token 的起始位置信息附加到错误对象上
  err.pos = this.start;
  err.line = this.startLine;
  err.column = this.startColumn;
  throw err;
}
```

这个方法创建了一个标准的 `SyntaxError`，并将当前 Token 的起始位置（`this.start`, `this.startLine`, `this.startColumn`）附加到错误对象上。当上层调用者捕获到这个错误时，就可以利用这些信息在源码中高亮错误位置，极大地提升了开发体验。

## 解决歧义的“望远镜”：`lookahead`

有时候，仅靠**当前**一个 Token 无法决定正确的解析路径。例如，`let` 在非严格模式下可以作为变量名，但在它后面如果紧跟着一个 `[`（如 `let [a] = [1]`），它就是一个解构赋值的关键字。为了区分这种情况，我们需要“向前看一眼”，这就是**前瞻（Lookahead）**。

`lookahead` 的原理就像游戏里的“存档/读档”：

1.  **存档**：保存解析器当前的所有状态（位置、当前 Token 信息等）。
2.  **探索**：调用 `nextToken()` 让解析器前进，加载并检查下一个 Token。
3.  **读档**：将解析器的状态恢复到第一步保存的状态，假装无事发生。

这样，我们就能在不实际改变解析器状态的情况下，窥探未来的 Token。下面是一个简化的实现，用于演示其工作原理：

```javascript
// src/parser.js (在 Parser 类中新增)

/**
 * 向前看一个 Token，但不消费它
 * @returns {object} lookahead Token 的信息
 */
lookahead() {
  // 1. 存档：保存当前所有状态
  const oldState = {
    pos: this.pos, line: this.line, column: this.column,
    type: this.type, value: this.value,
    start: this.start, end: this.end,
    startLine: this.startLine, startColumn: this.startColumn,
    endLine: this.endLine, endColumn: this.endColumn,
    // ...以及所有上下文状态
  };

  // 2. 探索：加载下一个 Token
  this.nextToken();

  // 3. 记录下 lookahead 的 Token 信息
  const lookaheadToken = { type: this.type, value: this.value, start: this.start };

  // 4. 读档：恢复所有状态，假装无事发生
  Object.assign(this, oldState);

  return lookaheadToken;
}
```

> **注**：Acorn 等成熟的解析器有更精巧的实现，它们通常会创建一个临时的、独立的解析器实例来预扫描，而不是手动保存和恢复状态，这样更健壮，能避免因忘记保存/恢复某个状态而导致的 bug。

## 总结

至此，我们打造了解析器的核心工具箱。这套由 `match`, `eat`, `expect`, `raise` 和 `lookahead` 组成的“瑞士军刀”，将底层、重复的 Token 操作抽象为了清晰的、具有声明性的方法调用。

有了这些利器，我们终于可以开始专注于语法分析的核心任务了。在下一章，我们将编写第一个真正的 `parse` 方法，从程序的顶层开始，正式消费 Token，构建我们的抽象语法树。

### 练习

1.  **实现 `eatContextual(keyword)`**: Acorn 中有一个 `eatContextual` 方法，用于消费“上下文关键字”（如 `async`，它只在特定情境下是关键字）。它需要检查当前 Token 是不是一个 `tt.name`，并且其 `value` 是否等于给定的 `keyword`。请尝试实现它。
2.  **丰富错误信息**: 修改 `expect` 函数，使其能接受一个可选的 `message` 参数。如果提供了 `message`，则 `raise` 时使用该 `message`，否则使用默认的 `Unexpected token...` 信息。这在某些复杂场景下能提供更精确的错误提示。