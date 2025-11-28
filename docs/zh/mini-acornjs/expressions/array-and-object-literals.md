# 解析数组与对象字面量

在掌握了最基本的原子表达式之后，我们现在要挑战两个更复杂的“原子”——数组和对象。从技术上讲，它们也是原子表达式，因为它们是构成复杂表达式的基本单元，并且是 Pratt 解析器递归的起点。当解析器在表达式的开头遇到 `[` 或 `{` 时，它知道一个新的数据结构即将诞生。

我们将再次扩展 `parseExprAtom`，赋予它解析这两种核心数据结构的能力。

## 一、扩展 `parseExprAtom`：新的分支

首先，我们需要在 `parseExprAtom` 的 `switch` 语句中加入两个新的 `case`，以 `[` 和 `{` 作为信号，分别调用 `parseArray` 和 `parseObject` 这两个专门的解析函数。

```javascript
// file: src/parser/expression.js -> parseExprAtom()

// ...
switch (this.type) {
  // ... (cases for this, super, literals, identifiers, parens)

  case tt.bracketL: // `[`
    return this.parseArray();

  case tt.braceL: // `{`
    return this.parseObject();

  default:
    this.unexpected();
}
// ...
```

## 二、解析数组字面量 `[...]`

`parseArray` 函数负责将 `[` 和 `]` 之间由逗号分隔的内容，转化为一个 `ArrayExpression` 节点。它的逻辑相对直接：

1.  创建一个 `ArrayExpression` 节点，并消费掉开头的 `[`。
2.  进入一个循环，持续解析数组的元素，直到遇到结尾的 `]`。
3.  在循环中，需要处理三种情况：
    -   **普通元素**: 直接调用 `parseMaybeAssign` 解析一个完整的赋值表达式。
    -   **展开语法 `...`**: 调用一个辅助函数 `parseSpread` 来处理。
    -   **空位（Elision）**: 如果遇到连续的逗号（如 `[a,,b]`）或开头的逗号（如 `[,a]`），这代表数组中的一个空位。在 ESTree 规范中，我们用 `null` 来代表它。
4.  处理尾随逗号（Trailing Comma），即 `[a, b,]` 这种合法语法。
5.  消费掉结尾的 `]`，完成并返回节点。

```javascript
// file: src/parser/expression.js

parseArray() {
  const node = this.startNode();
  node.elements = [];
  this.next(); // 消费 `[`

  while (!this.eat(tt.bracketR)) { // 只要还没遇到 `]`
    // 处理空位，例如 `[a,,b]` 中的第二个元素
    if (this.eat(tt.comma)) {
      node.elements.push(null);
      continue;
    }

    // 检查是否是尾随逗号，如果是，则循环应该结束
    if (this.type === tt.bracketR) break;

    // 解析元素
    let element;
    if (this.type === tt.ellipsis) { // `...`
      element = this.parseSpread();
    } else {
      // 任何合法的表达式都可以是数组元素
      element = this.parseMaybeAssign();
    }
    node.elements.push(element);

    // 在元素之后，要么是逗号，要么就必须是 `]`
    if (!this.eat(tt.comma)) {
      this.expect(tt.bracketR);
      break; // expect 会检查，这里 break 只是为了退出循环
    }
  }
  return this.finishNode(node, "ArrayExpression");
}

// parseSpread 是一个简单的辅助函数
parseSpread() {
  const node = this.startNode();
  this.next(); // 消费 `...`
  node.argument = this.parseMaybeAssign(); // `...` 后面可以跟任何赋值表达式
  return this.finishNode(node, "SpreadElement");
}
```

## 三、解析对象字面量 `{...}`

解析对象比解析数组要复杂得多，因为对象的属性（Property）有多种多样的形式。`parseObject` 函数的整体结构和 `parseArray` 类似，但它循环调用的是 `parseProperty` 来解析每个属性。

```javascript
// file: src/parser/expression.js

parseObject() {
  const node = this.startNode();
  node.properties = [];
  this.next(); // 消费 `{`

  while (!this.eat(tt.braceR)) {
    let prop;
    if (this.type === tt.ellipsis) {
      prop = this.parseSpread();
      node.properties.push(prop);
    } else {
      prop = this.parseProperty();
      node.properties.push(prop);
    }

    // 处理逗号和尾随逗号
    if (!this.eat(tt.comma)) {
      this.expect(tt.braceR);
      break;
    }
  }
  return this.finishNode(node, "ObjectExpression");
}
```

### `parseProperty`：对象的心脏

真正的复杂性隐藏在 `parseProperty` 中。一个对象的属性可以是：

-   **普通属性**：`{ key: value }`
-   **简写属性（Shorthand）**：`{ a }`，等价于 `{ a: a }`
-   **计算属性名**：`{ [myVar]: 1 }`
-   **方法**：`{ myMethod() { ... } }`
-   **Getter/Setter**：`{ get myProp() { ... }, set myProp(v) { ... } }`

为了保持聚焦，我们先实现一个简化版的 `parseProperty`，它只处理最常见的**普通属性**和**简写属性**。

```javascript
// file: src/parser/expression.js

// 简化版的 parseProperty
parseProperty() {
  const prop = this.startNode();

  // 为了简化，我们这里只处理标识符作为属性名
  // 一个完整的实现需要调用 parsePropertyName，它可以处理字符串、数字等
  if (this.type === tt.name) {
    prop.key = this.parseIdent();
  } else {
    this.unexpected();
  }

  prop.computed = false; // 计算属性我们暂不处理
  prop.method = false; // 方法也暂不处理

  // 关键：如何区分是简写属性 `{a}` 还是普通属性 `{a: 1}`？
  // 答案是看后面有没有冒号 `:`
  if (this.eat(tt.colon)) {
    // 是普通属性
    prop.kind = "init";
    prop.shorthand = false;
    prop.value = this.parseMaybeAssign(); // 解析冒号后面的值
  } else {
    // 是简写属性
    // 检查：简写属性后面不能直接跟括号，否则是方法定义
    if (this.type === tt.parenL) {
        this.unexpected(); // 简化处理，直接报错
    }
    prop.kind = "init";
    prop.shorthand = true;
    // 对于简写属性，key 和 value 指向同一个 Identifier 节点
    prop.value = prop.key;
  }

  return this.finishNode(prop, "Property");
}
```

这个简化版的实现抓住了核心：通过检查属性名后面是否有冒号 `:` 来区分简写属性和普通属性。这足以让我们解析许多常见的对象字面量了。

## 四、总结

通过在 `parseExprAtom` 中添加 `[` 和 `{` 的分支，并实现 `parseArray` 和 `parseObject`，我们的解析器现在已经能够处理 JavaScript 中最常用的两种数据结构了。我们学到了：

-   如何循环解析由逗号分隔的列表，并正确处理**尾随逗号**。
-   如何处理数组中的**空位**和两种数据结构中的**展开语法 `...`**。
-   如何通过检查**冒号 `:`** 来区分对象的**简写属性**和**普通属性**。

尽管我们为了聚焦核心而简化了对象属性的解析，但这个坚实的基础已经搭建完成。在后续的章节中，我们将逐步完善 `parseProperty`，解锁对计算属性、方法、Getter/Setter 等所有高级属性类型的解析能力，让我们的解析器变得更加完整和强大。