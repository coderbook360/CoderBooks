# 实现 Pratt 解析器：Token 的“绑定力”

理论是美好的，但真正的乐趣在于将它变为现实。在这一章，我们将亲手为我们的 `TokenType` 注入“灵魂”——也就是绑定力（Binding Power），并构建出 Pratt 解析器最核心的骨架。你将看到，这个优雅的算法是如何通过几行简单的代码实现的。

## 一、扩展 `TokenType`：为解析器提供“弹药”

Pratt 解析器的精髓在于其**数据驱动**的特性。解析器的行为，完全由当前 Token 携带的元数据决定。因此，我们的第一步，就是去丰富 `TokenType` 的定义。

我们需要为每个运算符类型的 Token 添加几个关键属性：

-   `binop`: 一个数字，代表该 Token 作为**中缀运算符**时的绑定力（优先级）。值越大，绑定力越强。如果它不能作为中缀运算符，则为 `-1`。
-   `prefix`: 一个布尔值，标记它是否能作为**前缀运算符**（如 `-`、`!`）。
-   `postfix`: 一个布尔值，标记它是否能作为**后缀运算符**（如 `++`）。
-   `rightAssociative`: 一个布尔值，标记当中缀绑定力相同时，它是否是**右结合**的（如赋值运算符 `=`）。

让我们打开 `src/tokentype.js`，为 `TokenType` 类和 `tt` 对象进行一次大升级。

```javascript
// file: src/tokentype.js

export class TokenType {
  constructor(label, conf = {}) {
    this.label = label;
    // 关键属性：
    this.binop = conf.binop ?? -1; // 中缀绑定力
    this.prefix = conf.prefix ?? false; // 是否为前缀
    this.postfix = conf.postfix ?? false; // 是否为后缀
    this.rightAssociative = conf.rightAssociative ?? false; // 是否右结合

    // ... 其他属性，如 startsExpr, isLoop 等
  }
}

// ...

// 我们为所有运算符定义绑定力
// 优先级数字越大，绑定力越强
export const tt = {
  // ... (num, string, name 等原子类型)

  // 赋值与三元，右结合
  eq: new TokenType("=", { binop: 2, rightAssociative: true }),
  question: new TokenType("?", { binop: 3, rightAssociative: true }),

  // 逻辑运算符
  logicalOR: new TokenType("||", { binop: 4 }),
  logicalAND: new TokenType("&&", { binop: 5 }),

  // 位运算符
  bitwiseOR: new TokenType("|", { binop: 6 }),
  bitwiseXOR: new TokenType("^", { binop: 7 }),
  bitwiseAND: new TokenType("&", { binop: 8 }),

  // 等式运算符
  equality: new TokenType("==/!=", { binop: 9 }),

  // 关系运算符
  relational: new TokenType("</>", { binop: 10 }),

  // 位移运算符
  bitShift: new TokenType("<</>>", { binop: 11 }),

  // 加减法
  plus: new TokenType("+", { binop: 12, prefix: true }),
  minus: new TokenType("-", { binop: 12, prefix: true }),

  // 乘除模
  modulo: new TokenType("%", { binop: 13 }),
  star: new TokenType("*", { binop: 13 }),
  slash: new TokenType("/", { binop: 13 }),

  // 前缀/后缀自增自减
  incDec: new TokenType("++/--", { prefix: true, postfix: true }),

  // 其他前缀运算符
  bang: new TokenType("!", { prefix: true }),
  tilde: new TokenType("~", { prefix: true }),

  // ... (parenL, parenR, braceL, etc.)
};
```

现在，我们的 Token 不再只是一个简单的标签，它们已经成为了携带解析指令的“智能”对象。例如，当解析器遇到 `tt.star` (`*`) 时，它立刻就知道：

-   这是一个中缀运算符 (`binop: 13`)。
-   它不是前缀或后缀运算符。
-   它是左结合的 (`rightAssociative: false`)。

这些信息，就是 Pratt 解析器运行所需要的全部“弹药”。

## 二、构建 Pratt 解析器骨架

有了“智能”的 Token，我们现在可以开始构建解析器的核心骨架了。我们将会在 `src/parser/expression.js` 中实现这一切。

### 1. `parseExpression`：统一的表达式入口

首先，我们需要一个统一的入口来解析任何类型的表达式。这个函数非常简单，它只是调用了 Pratt 循环的起点，并传入一个最低的绑定力 `0`，表示“我们现在可以开始解析任何表达式了”。

```javascript
// file: src/parser/expression.js

// 表达式解析的统一入口
parseExpression() {
  // 初始调用，传入的 left 是第一个原子表达式，最低绑定力为 0
  return this.parseExprOp(this.parseMaybeUnary(), 0);
}
```

### 2. `parseMaybeUnary`：`nud` 的实现

`parseExpression` 的第一步是调用 `this.parseMaybeUnary()`。这个函数完美地诠释了 `nud` 的概念：处理表达式的“开头”部分。

一个表达式的开头，要么是一个**前缀运算符**（如 `-1`），要么是一个**原子表达式**（如 `x`、`123`、`( ... )`）。`parseMaybeUnary` 的职责就是区分这两种情况。

```javascript
// file: src/parser/expression.js

// 解析一元前缀表达式 或 原子表达式
parseMaybeUnary() {
  // 检查当前 Token 是否被标记为前缀运算符
  if (this.type.prefix) {
    const node = this.startNode();
    const op = this.type;
    node.operator = op.label;
    this.next(); // 消费掉前缀运算符

    // 关键：递归调用 parseExprOp 来解析运算符后面的表达式
    // 我们需要为一元运算设置一个绑定力，这里我们用一个较高的值（例如 14）
    // 来确保一元运算符紧密绑定其操作数。例如，在 `-a * b` 中，`-` 的优先级高于 `*`。
    node.argument = this.parseExprOp(this.parseMaybeUnary(), 14);
    node.prefix = true; // 明确这是一个前缀表达式

    // 根据运算符类型，确定是 UnaryExpression 还是 UpdateExpression
    const nodeType = op === tt.incDec ? "UpdateExpression" : "UnaryExpression";
    return this.finishNode(node, nodeType);
  }

  // 如果不是前缀运算符，那它必须是一个原子表达式
  return this.parseExprAtom(); // 我们将在下一章实现它
}
```

### 3. `parseExprOp`：Pratt 的核心循环

现在，我们来到了最激动人心的部分——实现 Pratt 解析器的核心循环。这个函数实现了 `led` 的逻辑，它是一个 `while` 循环，只要下一个中缀运算符的绑定力足够强，它就会一直向右“吞噬”并组合表达式。

```javascript
// file: src/parser/expression.js

// Pratt 解析器的核心循环，处理中缀表达式
// left: 已经解析好的左侧表达式
// minPrec: 当前上下文要求的最低绑定力
parseExprOp(left, minPrec) {
  let prec = this.type.binop; // 获取当前 Token 的中缀绑定力

  // 循环条件：
  // 1. 当前 Token 是一个中缀运算符 (prec > -1)
  // 2. 它的绑定力高于我们要求的最低绑定力 (prec > minPrec)
  while (prec > -1 && prec > minPrec) {
    const op = this.type;
    this.next(); // 消费掉中缀运算符

    // 关键的递归调用！
    // 我们需要解析右侧的表达式 (right-hand side)。
    // 传递给下一层的绑定力是多少？这决定了结合性！
    // - 左结合 (a + b + c): 传入与当前运算符相同的绑定力 `prec`。
    //   这样，下一个 `+` (绑定力12) 就不会大于 `minPrec` (12)，循环会停止，(a+b) 会先被组合。
    // - 右结合 (a = b = c): 传入 `prec - 1`。
    //   这样，下一个 `=` (绑定力2) 仍然大于 `minPrec` (1)，循环会继续，b=c 会被优先组合。
    const right = this.parseExprOp(this.parseMaybeUnary(), op.rightAssociative ? prec - 1 : prec);

    // 将左右两部分组合成一个新的、更大的 left
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = op.label;
    node.right = right;
    left = this.finishNode(node, "BinaryExpression");

    // 为下一次循环更新 prec，看看后面还有没有更强的运算符
    prec = this.type.binop;
  }
  return left;
}
```

就是这样！这三个函数——`parseExpression`、`parseMaybeUnary` 和 `parseExprOp`——共同构成了 Pratt 解析器的完整骨架。它们之间的协作堪称完美：

1.  `parseExpression` 作为统一入口，启动整个过程。
2.  `parseMaybeUnary` 负责解析表达式的“头”，即 `nud` 部分。
3.  `parseExprOp` 负责处理表达式的“身体”和“尾巴”，即 `led` 部分，通过一个简洁的 `while` 循环和巧妙的递归调用，优雅地处理了所有中缀运算符的优先级和结合性。

## 三、展望

我们已经搭建好了舞台，但主角还未登场。在 `parseMaybeUnary` 中，我们留了一个坑：`this.parseExprAtom()`。**原子表达式**是所有复杂表达式的基础，它们是构成表达式的最小单位，是 Pratt 解析器递归的终点。

在接下来的章节中，我们将逐一实现对各种原子表达式的解析，包括：

-   数字、字符串、布尔值、null、this
-   标识符（变量名）
-   括号表达式 `( ... )`
-   数组字面量 `[ ... ]`
-   对象字面量 `{ ... }`

每当我们实现一种新的原子表达式，我们的解析器能力就会得到一次扩展。准备好，我们将开始为这个强大的骨架填充血肉。