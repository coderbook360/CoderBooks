# 语法分析概览：递归下降法

在前面的章节中，我们成功地将一串原始的源代码字符流转换成了一个扁平的、一维的 Token 序列。这就像我们把一本英文小说里的所有单词都识别出来并列在了一张纸上。我们虽然有了"单词"，但还不知道它们是如何组成"句子"和"段落"的。

这就是**语法分析（Parsing / Syntactic Analysis）**登场的时刻。它的核心任务是，根据目标语言的语法规则（文法），将这个扁平的 Token 序列转换成一个能够精确反映代码逻辑结构和层级关系的树状结构——**抽象语法树（Abstract Syntax Tree, AST）**。

## 从一维到二维的飞跃

想象一下 `if (a) { b; }` 这段代码。经过词法分析，我们得到的是这样一个 Token 序列：

`[ IF, LPAREN, IDENTIFIER("a"), RPAREN, LBRACE, IDENTIFIER("b"), SEMI, RBRACE ]`

这个序列是线性的，它并没有告诉我们 `a` 是 `if` 语句的判断条件，而 `{ b; }` 是它的执行体。语法分析的目标，就是要把这种内在的、嵌套的逻辑关系给“立体化”，构建出如下的树形结构：

```json
{
  "type": "IfStatement",
  "test": {
    "type": "Identifier",
    "name": "a"
  },
  "consequent": {
    "type": "BlockStatement",
    "body": [
      {
        "type": "ExpressionStatement",
        "expression": {
          "type": "Identifier",
          "name": "b"
        }
      }
    ]
  },
  "alternate": null
}
```

这棵树清晰地展示了：这是一个 `IfStatement` 节点，它的 `test` 属性是一个 `Identifier` (a)，它的 `consequent` 属性是一个 `BlockStatement`。这，就是 AST 的魔力。

那么，我们如何实现这个转换过程呢？对于手写解析器来说，最流行、最直观的方法就是**递归下降法（Recursive Descent Parsing）**。

## 核心思想：一个规则，一个函数

递归下降法的思想极其优美和简洁：**为语言中的每一个语法规则（非终结符），编写一个对应的解析函数。**

例如，JavaScript 的文法中有名为 `IfStatement`、`WhileStatement`、`Expression` 等语法规则。那么，在我们的解析器中，就会有对应的 `parseIfStatement()`、`parseWhileStatement()`、`parseExpression()` 等函数。

当一个解析函数需要某个子语法结构时，它就直接调用对应的子解析函数。这个过程不断“下降”，直到遇到最基本的元素——**终结符（Terminal）**，也就是我们词法分析器生成的 Token。

让我们通过一个 `if` 语句的例子来感受一下这个过程。

`if` 语句的文法规则（简化版）可以这样描述：

`IfStatement ::= 'if' '(' Expression ')' Statement ('else' Statement)?`

这行规则告诉我们：一个 `if` 语句由 `if` 关键字、一个左括号、一个表达式、一个右括号、一个语句，以及一个可选的 `else` 分支构成。

根据递归下降法的思想，我们可以编写出 `parseIfStatement` 函数的伪代码：

```plaintext
function parseIfStatement():
  // 1. 消费 'if' 关键字
  // 我们期望当前 Token 是 'if'，确认后就把它“吃掉”，让解析器前进到下一个 Token
  expect(tt._if)

  // 2. 消费 '('
  expect(tt.parenL)

  // 3. 调用下级解析函数，解析括号内的表达式
  // 这里就是“递归下降”的体现！
  const test = parseExpression()

  // 4. 消费 ')'
  expect(tt.parenR)

  // 5. 调用下级解析函数，解析 if 的执行体
  const consequent = parseStatement()

  // 6. (可选) 处理 else 分支
  let alternate = null
  // 如果当前 Token 是 'else'，就吃掉它并解析后续的语句
  if (eat(tt._else)):
    alternate = parseStatement()

  // 7. 所有部分都解析完毕，组装成 AST 节点并返回
  return new IfStatement(test, consequent, alternate)
```

## 函数调用栈与 AST 的映射

递归下降法最奇妙的一点在于，**解析过程中的函数调用栈结构，与最终生成的 AST 结构形成了完美的镜像关系**。

当解析 `if (a) { b; }` 时：

1.  顶层的 `parseStatement()` 被调用，它看到当前的 Token 是 `if`，于是决定调用 `parseIfStatement()`。
2.  `parseIfStatement()` 开始执行，它在解析条件表达式时，会调用 `parseExpression()`。
3.  `parseExpression()` 发现 Token 是标识符 `a`，它完成了自己的任务，返回一个 `Identifier` 节点。
4.  `parseIfStatement()` 拿到 `Identifier` 节点后，继续向下解析执行体，再次调用 `parseStatement()` 来解析 `{ b; }`。

这个 `parseStatement -> parseIfStatement -> parseExpression` 的函数调用链，恰好就对应了 AST 中 `IfStatement` 节点包含一个 `Expression` 子节点的层级关系。代码的语法结构，通过解析函数的相互调用，被自然而然地构建了出来。

## 挑战与展望

当然，递归下降法并非万能。它有一个著名的“阿喀琉斯之踵”：**无法处理左递归**的文法规则。

形如 `Expression ::= Expression '+' Term` 的规则就是左递归的，因为规则的左侧（`Expression`）直接出现在了右侧的开头。如果直接为其编写 `parseExpression()` 函数，会导致无限的自我调用：`parseExpression()` -> `parseExpression()` -> ...

我们将在后续解析表达式的章节中，引入强大的 **Pratt 解析法**来优雅地解决这个问题。

## 总结

语法分析是编译原理的核心，而递归下降法为我们手写解析器提供了一条清晰、直观的道路。它将抽象的文法规则与具体的代码实现连接起来，通过函数的递归调用，将一维的 Token 序列“雕刻”成了立体的 AST。

在接下来的章节中，我们将亲手为 `mini-acornjs` 构建起这个递归下降的骨架，从解析器的状态管理开始，一步步实现各种语句和表达式的解析函数，最终建成一棵完整的抽象语法树。

### 练习

1.  根据 `while` 语句的文法规则 `WhileStatement ::= 'while' '(' Expression ')' Statement`，尝试写出 `parseWhileStatement()` 函数的伪代码。
2.  思考一下，当 `parseStatement()` 被调用时，它如何知道接下来应该调用 `parseIfStatement` 还是 `parseWhileStatement`？它需要根据什么信息来做“预测”？（提示：向前看 Lookahead）