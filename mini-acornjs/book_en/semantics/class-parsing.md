# 32. Parsing Classes: Declarations and Expressions

After conquering functions, we've arrived at an important milestone introduced in ES6 - `class`. Classes provide JavaScript with a clearer, more object-oriented syntax for creating constructors and handling inheritance. Although they are essentially "syntactic sugar" for prototype inheritance, their unique syntax structure presents new requirements for our parser.

In this chapter, we will add the ability to parse `class` declarations and `class` expressions to `mini-acorn`. This includes parsing the class name, parent class (`extends`), and various members inside the class body, such as constructors (`constructor`), methods, fields, getters/setters, and static blocks.

## AST Structure of Classes

Similar to functions, classes have two forms: declarations and expressions, corresponding to different AST nodes.

- **`ClassDeclaration`**: Used for declarations like `class MyClass {}`.
  - `id`: The class name, must be an `Identifier`.
  - `superClass`: The parent class expression. If an `extends` clause exists, this is an `Expression`; otherwise, it's `null`.
  - `body`: A `ClassBody` node.

- **`ClassExpression`**: Used for expressions like `const a = class {}`.
  - Similar structure to `ClassDeclaration`, but `id` is **optional**.

The core of both contains a `ClassBody` node.

- **`ClassBody`**:
  - `body`: An array containing definitions of all class members. These members are mainly `MethodDefinition`, `PropertyDefinition`, and `StaticBlock` nodes.

### AST of Class Members

- **`MethodDefinition`**: Used to define methods, including `constructor`.
  - `key`: The method name (an expression, usually an `Identifier`).
  - `value`: The method body (a `FunctionExpression`).
  - `kind`: A string, can be `"constructor"`, `"method"`, `"get"`, or `"set"`.
  - `static`: Boolean value indicating whether it's a static method.
  - `computed`: Boolean value indicating whether `key` is a computed property name (e.g., `[name]() {}`).

- **`PropertyDefinition`**: Used to define class fields (ES2022 new feature).
  - `key`: The field name.
  - `value`: The field's initial value expression, or `null`.
  - `static`: Boolean value.

- **`StaticBlock`**: Static initialization block (ES2022 new feature).
  - `body`: A `BlockStatement`.

## Parsing Class Declarations and Expressions

The overall process of parsing classes is very similar to parsing functions. We can create a generic `parseClass` method that decides whether to generate a `ClassDeclaration` or `ClassExpression` based on context.

The parsing process is as follows:

1. Consume the `class` keyword.
2. Parse the class `id`. For class declarations, `id` is required; for class expressions, `id` is optional.
3. Check if the `extends` keyword exists. If it does, consume it and parse the `superClass` expression.
4. Parse the class body `{...}`, which is the `ClassBody`.

```javascript
// src/parser.js

// isStatement: bool
pp.parseClass = function (node, isStatement) {
  this.expect(tt._class);

  // Parse class ID
  if (isStatement) {
    node.id = this.parseIdentifier();
  } else if (this.match(tt.name)) {
    node.id = this.parseIdentifier();
  }

  // Parse extends
  if (this.eat(tt._extends)) {
    node.superClass = this.parseExpression();
  } else {
    node.superClass = null;
  }

  // Parse class body
  node.body = this.parseClassBody();

  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};
```

## Parsing Class Body `ClassBody`

The responsibility of `parseClassBody` is to parse all member definitions inside the `{}`.

1. Consume the left curly brace `{`.
2. Enter a loop until the right curly brace `}` is encountered.
3. In the loop, parse each class member.
4. Consume the right curly brace `}`.

```javascript
// src/parser.js

pp.parseClassBody = function () {
  const node = this.startNode();
  node.body = [];

  this.expect(tt.braceL);

  while (!this.eat(tt.braceR)) {
    if (this.eat(tt.semi)) continue; // Allow empty semicolons in class body
    node.body.push(this.parseClassElement());
  }

  return this.finishNode(node, "ClassBody");
};
```

### Parsing Class Members `parseClassElement`

This is the most critical part. `parseClassElement` needs to determine the current token to decide whether it's parsing a method, field, or static block.

```javascript
// src/parser.js

pp.parseClassElement = function () {
  const elementNode = this.startNode();

  // Check modifiers like static, get, set, async
  const isStatic = this.eat(tt._static);
  // ... Complex logic for get/set/async is omitted here

  // Simplified logic: we only use static and constructor to determine
  if (isStatic && this.match(tt.braceL)) {
    // static { ... } static block
    this.expect(tt.braceL);
    const staticBlock = this.startNode();
    staticBlock.body = [];
    while(!this.eat(tt.braceR)) {
        staticBlock.body.push(this.parseStatement());
    }
    return this.finishNode(staticBlock, "StaticBlock");
  }

  // Parse method or field
  const key = this.parsePropertyName(); // Parse property name
  elementNode.key = key;
  elementNode.computed = key.type !== 'Identifier';
  elementNode.static = isStatic;

  // Simplified judgment: if key is constructor, it's a constructor
  if (key.name === 'constructor') {
    elementNode.kind = "constructor";
    elementNode.value = this.parseMethodBody();
    return this.finishNode(elementNode, "MethodDefinition");
  }

  // Simplified judgment: if followed by (, it's a method; otherwise it's a field
  if (this.match(tt.parenL)) {
    elementNode.kind = "method";
    elementNode.value = this.parseMethodBody();
    return this.finishNode(elementNode, "MethodDefinition");
  } else {
    // Field
    elementNode.value = this.eat(tt.eq) ? this.parseExpression() : null;
    this.eat(tt.semi);
    return this.finishNode(elementNode, "PropertyDefinition");
  }
};

// Helper method to parse method body, returns a FunctionExpression
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

> **Important Note**: The `parseClassElement` above is a **highly simplified** version designed to reveal the core identification process. In the real Acorn implementation, the logic for handling `get`, `set`, `async`, `*`, and their various combinations is very complex and requires a sophisticated finite state machine to manage. However, the essential idea remains the same: **decide what type of member to parse by examining current and upcoming tokens**.

Finally, integrate `parseClass` into the `parseStatement` and expression parsing flow.

```javascript
// src/parser.js

pp.parseStatement = function (declaration, topLevel) {
  // ...
  if (startType === tt._class) {
    return this.parseClass(this.startNode(), true);
  }
  // ...
}

// Also add class to expression parsing since it can be an expression
pp.parseExprAtom = function(...) {
  // ...
  if (this.type === tt._class) {
    return this.parseClass(this.startNode(), false);
  }
  // ...
}
```

## Adding Test Cases

Class testing needs to cover all its syntax features.

```javascript
// test/test.js

describe("Class Parsing", () => {
  it("should parse a class declaration", () => {
    const ast = parse("class MyClass extends Base { constructor() {} }");
    // Assert ClassDeclaration, superClass, constructor
  });

  it("should parse a class expression", () => {
    const ast = parse("const C = class MyNamedClass {}");
    // Assert ClassExpression and its id
  });

  it("should parse static methods and fields", () => {
    const ast = parse("class C { static myMethod() {} static myField = 1; }");
    // Assert MethodDefinition and PropertyDefinition's static flags
  });

  it("should parse getters and setters", () => {
    const ast = parse("class C { get prop() {} set prop(v) {} }");
    // Assert MethodDefinition's kind is 'get' and 'set'
  });

  it("should parse a static block", () => {
    const ast = parse("class C { static { let a = 1; } }");
    // Assert existence of StaticBlock node
  });
});
```

## Summary

In this chapter, we successfully added support for ES6 `class` syntax to `mini-acorn`. We implemented `parseClass` to handle declarations and expressions, and used `parseClassBody` and `parseClassElement` to parse the complex member definitions inside class bodies.

Although our implementation is simplified, it clearly demonstrates how to distinguish between methods, fields, getters/setters, and static blocks through lookahead and decision-making. This gives us a deeper understanding of how parsers handle context-dependent complex syntax.

With class parsing completed, our learning of the "Statements and Declarations" section is also nearing its end. In the next chapter, we will explore the implementation principles of JavaScript scope and attempt to build a basic symbol table.