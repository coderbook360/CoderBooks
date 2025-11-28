# 32. 解析类：声明与表达式

在征服了函数之后，我们来到了 ES6 引入的一个重要里程碑——`class`。类为 JavaScript 提供了更清晰、更面向对象的语法来创建构造函数和处理继承。虽然它本质上是原型继承的“语法糖”，但其独特的语法结构对我们的解析器提出了新的要求。

本章，我们将为 `mini-acorn` 添加解析 `class` 声明和 `class` 表达式的能力。这包括解析类名、父类（`extends`）、以及类体内部的各种成员，如构造函数（`constructor`）、方法、字段、getter/setter 和静态块。

## 类的 AST 结构

与函数类似，类也有声明和表达式两种形式，对应着不同的 AST 节点。

-   **`ClassDeclaration`**: 用于 `class MyClass {}` 这样的声明。
    -   `id`: 类的名称，必须是一个 `Identifier`。
    -   `superClass`: 父类表达式，如果存在 `extends` 子句，则为一个 `Expression`，否则为 `null`。
    -   `body`: 一个 `ClassBody` 节点。

-   **`ClassExpression`**: 用于 `const a = class {}` 这样的表达式。
    -   与 `ClassDeclaration` 结构类似，但 `id` 是**可选的**。

它们的核心都包含一个 `ClassBody` 节点。

-   **`ClassBody`**:
    -   `body`: 一个数组，包含了类所有成员的定义。这些成员主要是 `MethodDefinition`、`PropertyDefinition` 和 `StaticBlock` 节点。

### 类成员的 AST

-   **`MethodDefinition`**: 用于定义方法，包括 `constructor`。
    -   `key`: 方法名（一个表达式，通常是 `Identifier`）。
    -   `value`: 方法体（一个 `FunctionExpression`）。
    -   `kind`: 字符串，可以是 `"constructor"`、`"method"`、`"get"` 或 `"set"`。
    -   `static`: 布尔值，表示是否为静态方法。
    -   `computed`: 布尔值，表示 `key` 是否为计算属性名（如 `[name]() {}`）。

-   **`PropertyDefinition`**: 用于定义类字段（ES2022 新特性）。
    -   `key`: 字段名。
    -   `value`: 字段的初始值表达式，或 `null`。
    -   `static`: 布尔值。

-   **`StaticBlock`**: 静态初始化块（ES2022 新特性）。
    -   `body`: 一个 `BlockStatement`。

## 解析类声明与表达式

解析类的整体流程与解析函数非常相似。我们可以创建一个通用的 `parseClass` 方法，根据上下文来决定是生成 `ClassDeclaration` 还是 `ClassExpression`。

解析流程如下：

1.  消费 `class` 关键字。
2.  解析类的 `id`。对于类声明，`id` 是必需的；对于类表达式，`id` 是可选的。
3.  检查是否存在 `extends` 关键字。如果存在，消费它并解析 `superClass` 表达式。
4.  解析类体 `{...}`，也就是 `ClassBody`。

```javascript
// src/parser.js

// isStatement: bool
pp.parseClass = function (node, isStatement) {
  this.expect(tt._class);

  // 解析类 ID
  if (isStatement) {
    node.id = this.parseIdentifier();
  } else if (this.match(tt.name)) {
    node.id = this.parseIdentifier();
  }

  // 解析 extends
  if (this.eat(tt._extends)) {
    node.superClass = this.parseExpression();
  } else {
    node.superClass = null;
  }

  // 解析类体
  node.body = this.parseClassBody();

  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};
```

## 解析类体 `ClassBody`

`parseClassBody` 的职责是解析 `{}` 内部的所有成员定义。

1.  消费左花括号 `{`。
2.  进入一个循环，直到遇到右花括号 `}`。
3.  在循环中，解析每一个类成员。
4.  消费右花括号 `}`。

```javascript
// src/parser.js

pp.parseClassBody = function () {
  const node = this.startNode();
  node.body = [];

  this.expect(tt.braceL);

  while (!this.eat(tt.braceR)) {
    if (this.eat(tt.semi)) continue; // 允许类体中有空分号
    node.body.push(this.parseClassElement());
  }

  return this.finishNode(node, "ClassBody");
};
```

### 解析类成员 `parseClassElement`

这是最核心的部分。`parseClassElement` 需要判断当前 Token，来决定正在解析的是方法、字段还是静态块。

```javascript
// src/parser.js

pp.parseClassElement = function () {
  const elementNode = this.startNode();

  // 检查 static, get, set, async 等修饰符
  const isStatic = this.eat(tt._static);
  // ... 此处省略了对 get/set/async 的复杂判断逻辑

  // 简化逻辑：我们只通过 static 和 constructor 来判断
  if (isStatic && this.match(tt.braceL)) {
    // static { ... } 静态块
    this.expect(tt.braceL);
    const staticBlock = this.startNode();
    staticBlock.body = [];
    while(!this.eat(tt.braceR)) {
        staticBlock.body.push(this.parseStatement());
    }
    return this.finishNode(staticBlock, "StaticBlock");
  }

  // 解析方法或字段
  const key = this.parsePropertyName(); // 解析属性名
  elementNode.key = key;
  elementNode.computed = key.type !== 'Identifier';
  elementNode.static = isStatic;

  // 简化判断：如果 key 是 constructor，则为构造函数
  if (key.name === 'constructor') {
    elementNode.kind = "constructor";
    elementNode.value = this.parseMethodBody();
    return this.finishNode(elementNode, "MethodDefinition");
  }

  // 简化判断：如果后面是 (，则为方法；否则为字段
  if (this.match(tt.parenL)) {
    elementNode.kind = "method";
    elementNode.value = this.parseMethodBody();
    return this.finishNode(elementNode, "MethodDefinition");
  } else {
    // 字段
    elementNode.value = this.eat(tt.eq) ? this.parseExpression() : null;
    this.eat(tt.semi);
    return this.finishNode(elementNode, "PropertyDefinition");
  }
};

// 辅助方法，用于解析方法体，返回一个 FunctionExpression
pp.parseMethodBody = function() {
    const funcNode = this.startNode();
    funcNode.id = null;
    funcNode.params = this.parseFunctionParams();
    funcNode.body = this.parseBlock();
    funcNode.async = false;
    funcNode.generator = false;
    return this.finishNode(funcNode, "FunctionExpression");
}
```

> **重要提示**：上面的 `parseClassElement` 是一个**高度简化**的版本，它旨在揭示核心的识别流程。真实的 Acorn 实现中，处理 `get`、`set`、`async`、`*` 以及它们的各种组合的逻辑非常复杂，需要一个精密的有限状态机来管理。但其本质思想不变：**通过检查当前和接下来的 Token 来决策要解析的成员类型**。

最后，将 `parseClass` 集成到 `parseStatement` 和表达式解析的流程中。

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  if (startType === tt._class) {
    return this.parseClass(this.startNode(), true);
  }
  // ...
}

// 在表达式解析中也要加入 class，因为它也可以是表达式
pp.parseExprAtom = function(...) {
  // ...
  if (this.type === tt._class) {
    return this.parseClass(this.startNode(), false);
  }
  // ...
}
```

## 添加测试用例

类的测试需要覆盖其所有语法特性。

```javascript
// test/test.js

describe("Class Parsing", () => {
  it("should parse a class declaration", () => {
    const ast = parse("class MyClass extends Base { constructor() {} }");
    // 断言 ClassDeclaration, superClass, constructor
  });

  it("should parse a class expression", () => {
    const ast = parse("const C = class MyNamedClass {}");
    // 断言 ClassExpression 及其 id
  });

  it("should parse static methods and fields", () => {
    const ast = parse("class C { static myMethod() {} static myField = 1; }");
    // 断言 MethodDefinition 和 PropertyDefinition 的 static 标志位
  });

  it("should parse getters and setters", () => {
    const ast = parse("class C { get prop() {} set prop(v) {} }");
    // 断言 MethodDefinition 的 kind 为 'get' 和 'set'
  });

  it("should parse a static block", () => {
    const ast = parse("class C { static { let a = 1; } }");
    // 断言存在 StaticBlock 节点
  });
});
```

## 总结

在本章中，我们成功地为 `mini-acorn` 添加了对 ES6 `class` 语法的支持。我们实现了 `parseClass` 来处理声明和表达式，并通过 `parseClassBody` 和 `parseClassElement` 来解析类体内部复杂的成员定义。

尽管我们的实现是简化的，但它清晰地展示了如何通过前瞻和决策来区分方法、字段、getter/setter 和静态块。这让我们对解析器如何处理上下文相关的复杂语法有了更深的理解。

随着类的解析完成，我们“语句与声明”部分的学习也接近尾声。在下一章，我们将探讨 JavaScript 作用域的实现原理，并尝试构建一个基础的符号表。