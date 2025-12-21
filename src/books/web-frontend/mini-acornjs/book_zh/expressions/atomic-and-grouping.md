# 解析原子与分组表达式：`this`, `super`, `( ... )`

我们已经搭建好了 Pratt 解析器的强大骨架，现在是时候为其填充血肉了。任何复杂的表达式，无论嵌套多少层运算符，其最深处总能归结为不可再分的**原子表达式（Atomic Expression）**。它们是表达式世界的“元素”，是递归解析的终点。 

在这一章，我们将实现 `parseExprAtom` 函数，它正是我们解析器中负责处理这些“原子”的专门机构。

## 一、`parseExprAtom`：表达式解析的基石

`parseExprAtom` 是 Pratt 解析算法中 `nud` 逻辑的核心入口。当 `parseMaybeUnary` 判断当前 Token 不是一个前缀运算符时，它就会把控制权交给 `parseExprAtom`。这个函数的工作就是识别并解析出当前位置的原子表达式。

它的内部结构通常是一个巨大的 `switch` 语句，根据当前 `this.type` 的不同，分派到不同的解析逻辑中。

```javascript
// file: src/parser/expression.js

parseExprAtom() {
  const canBeArrow = this.potentialArrowAt === this.start;
  let node;

  switch (this.type) {
    case tt._super: // super
    case tt._this: // this
      // ... 我们稍后会详细讲解

    case tt.name: // 标识符
      // ...

    case tt.num: case tt.string: // 数字和字符串字面量
      // ...

    case tt._null: case tt._true: case tt._false: // null, true, false
      // ...

    case tt.parenL: // 分组表达式 `(`
      // ...

    default:
      this.unexpected(); // 如果遇到一个不认识的 Token，抛出错误
  }
}
```

让我们逐一实现这些 `case`。

## 二、解析字面量、`this` 和 `super`

最简单的原子表达式莫过于字面量（Literals）和关键字 `this`、`super`。

-   **字面量**：包括数字 (`123`)、字符串 (`'hello'`)、布尔值 (`true`, `false`) 和 `null`。当词法分析器生成这些 Token 时，通常已经将它们的值（value）存储好了。我们只需要创建一个 `Literal` 节点，把值放进去即可。
-   **`this`**：这是一个特殊的关键字，代表当前的执行上下文。我们为它创建一个 `ThisExpression` 类型的 AST 节点。
-   **`super`**：`super` 用于调用父类的构造函数或方法。它只能在特定的上下文中使用（例如派生类的 `constructor` 内）。解析它本身很简单，就是创建一个 `Super` 节点，但验证其合法性则比较复杂，我们会在后续章节深入。

```javascript
// file: src/parser/expression.js -> parseExprAtom()

switch (this.type) {
  case tt._super:
  case tt._this:
    node = this.startNode();
    const type = this.type === tt._this ? "ThisExpression" : "Super";
    this.next(); // 消费 this 或 super
    return this.finishNode(node, type);

  case tt.num:
  case tt.string:
    node = this.startNode();
    node.value = this.value;
    node.raw = this.input.slice(this.start, this.end);
    this.next(); // 消费字面量 Token
    return this.finishNode(node, "Literal");

  case tt._null:
  case tt._true:
  case tt._false:
    node = this.startNode();
    node.value = this.type === tt._true ? true : this.type === tt._false ? false : null;
    node.raw = this.type.label;
    this.next();
    return this.finishNode(node, "Literal");

  // ... 其他 case
}
```

## 三、解析标识符

标识符（Identifier）即变量名，是我们最常打交道的原子表达式。我们在解析变量声明时已经实现了 `parseIdent` 函数，这里可以直接复用。

```javascript
// file: src/parser/expression.js -> parseExprAtom()

// ...
case tt.name:
  node = this.startNode();
  const name = this.value;
  this.next();
  return this.finishNode(node, "Identifier");
// ...
```

## 四、分组表达式 `( ... )`：提升优先级的利器

分组表达式是原子表达式中唯一一个“容器”类型的表达式。它的语法结构是 `( Expression )`，其唯一的作用就是**无条件地提升内部表达式的优先级**。

例如，在 `(2 + 3) * 4` 中，括号使得 `2 + 3` 作为一个整体，被优先计算，然后再与 `4` 相乘。

解析它非常直观：

1.  遇到 `(`，消费它。
2.  递归调用**主表达式解析函数 `parseExpression()`** 来解析括号内部的任意表达式。
3.  期望并消费一个 `)`。
4.  返回内部表达式的 AST。

```javascript
// file: src/parser/expression.js -> parseExprAtom()

// ...
case tt.parenL: // '('
  this.next(); // 消费 '('
  // 递归调用，解析括号内的所有内容
  node = this.parseExpression();
  this.expect(tt.parenR); // 必须以 ')' 结尾
  return node;
// ...
```

这里的 `this.expect(tt.parenR)` 很关键，它会检查当前 Token 是否是 `)`，如果不是，就会自动抛出一个语法错误，从而处理了括号不匹配的情况。

### 一个经典的陷阱：箭头函数

你可能已经注意到了一个问题：以 `(` 开头的代码，除了是分组表达式，还可能是**箭头函数的参数列表**，例如 `(a, b) => a + b`。

这是一个经典的语法歧义。当解析器只看到 `(` 时，它无法确定自己面对的是什么。Acorn 和其他现代解析器采用了一种“延迟决策”的策略：

1.  **初步解析**：先假设它是一个分组表达式，但同时允许其中出现一些类似参数的结构（如逗号分隔的标识符）。
2.  **向后看**：解析完 `)` 之后，检查紧随其后的 Token 是不是 `=>`。
3.  **转换或确认**：
    -   如果是 `=>`，就将刚刚解析的 AST“转换”成箭头函数的参数列表。
    -   如果不是 `=>`，那就确认它就是一个普通的分组表达式。

这是一个高级主题，我们将在专门的函数解析章节中深入探讨。目前，你只需要知道，我们的 `parseExprAtom` 实现暂时只处理了分组表达式这一种情况，这对于我们理解表达式解析的核心已经足够了。

## 五、总结

我们成功地实现了 `parseExprAtom`，为我们的 Pratt 解析器填充了第一批，也是最重要的一批“建筑材料”。现在，我们的解析器已经能够将最基本的代码片段转化为 AST 节点了。

-   **原子是基础**：`this`、`super`、字面量、标识符是构成一切复杂表达式的基石。
-   **分组是武器**：括号 `()` 是我们对抗默认运算符优先级的唯一武器，`parseExprAtom` 通过递归调用 `parseExpression` 实现了对它的解析。
-   **错误处理**：通过在 `default` 分支和 `expect` 中调用 `this.unexpected()`，我们保证了解析器在遇到非法 Token 时能够优雅地失败。

虽然我们只迈出了一小步，但这是至关重要的一步。有了这些原子表达式作为递归的“锚点”，我们接下来就可以放心地去实现各种依赖于它们的、更复杂的表达式类型了，例如数组、对象、函数调用等等。