# 34. 解析 ES 模块：`import` 与 `export`

我们“语句与声明”部分的旅程即将来到终点，而终点站是一个至关重要的现代 JavaScript 特性——ES 模块（ESM）。`import` 和 `export` 语句构成了现代 Web 应用开发的基础，它们使得代码的组织、复用和依赖管理变得前所未有的清晰和强大。

在本章中，我们将为 `mini-acorn` 添加解析 `import` 和 `export` 语句的能力。这两种语句引入了全新的语法结构，并且有一个非常严格的规则：它们**只能出现在模块的顶层**。我们的解析器必须能够理解这些语法，并强制执行这一规则。

## 模块语法的 AST 结构

ESTree 为模块系统设计了一套专门的 AST 节点。

-   **`ImportDeclaration`**: 代表 `import` 语句。
    -   `specifiers`: 一个数组，描述了导入的具体内容（如 `a`, `{b}`, `* as c`）。
    -   `source`: 一个 `Literal`，表示从哪个模块导入。

-   **`ExportNamedDeclaration`**: 用于导出一个或多个“命名”的绑定。
    -   `declaration`: 可以是一个声明节点（如 `VariableDeclaration`），用于 `export const a = 1;` 的情况。
    -   `specifiers`: 一个数组，用于 `export {a, b};` 的情况。
    -   `source`: 如果是转发导出 `export {a} from './mod';`，则此项存在。

-   **`ExportDefaultDeclaration`**: 用于 `export default ...`。
    -   `declaration`: 可以是一个声明（`FunctionDeclaration`, `ClassDeclaration`）或一个表达式。

-   **`ExportAllDeclaration`**: 用于 `export * from './mod';`。
    -   `source`: 模块来源。
    -   `exported`: 如果是 `export * as ns from ...`，则此项存在。

## 顶层限制 (Top-Level Await)

在开始解析之前，我们必须解决“顶层限制”的问题。`import` 和 `export` 只能在程序的最高层级使用。我们可以在 `Parser` 中设置一个 `topLevel` 标志位，在解析的入口处（`parse` 方法）将其设为 `true`，而在进入任何函数体或块级作用域时，将其设为 `false` 传递下去。当解析 `import` 或 `export` 时，检查此标志位即可。

```javascript
// src/parser.js
pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    case tt._import:
      if (!topLevel) this.unexpected(); // 非顶层，抛出错误
      return this.parseImport(this.startNode());
    case tt._export:
      if (!topLevel) this.unexpected(); // 非顶层，抛出错误
      return this.parseExport(this.startNode());
    // ...
  }
}
```

## 解析 `import` 声明

`import` 语句的形态多样，我们的 `parseImport` 方法需要能够处理所有情况。

1.  消费 `import` 关键字。
2.  检查下一个 Token，判断导入的类型：
    -   如果是字符串 `Literal`，说明是 `import "./mod.js"` 这种只为副作用而导入的情况。
    -   如果是标识符、`{` 或 `*`，则开始解析 `specifiers`。
3.  解析 `specifiers` 是一个精细活，需要根据 Token 类型创建 `ImportDefaultSpecifier`、`ImportSpecifier` 或 `ImportNamespaceSpecifier`。
4.  消费 `from` 关键字。
5.  解析 `source` 字符串。

```javascript
// src/parser.js

pp.parseImport = function (node) {
  this.expect(tt._import);
  node.specifiers = [];

  // import "./mod.js";
  if (this.type === tt.string) {
    node.source = this.parseExprAtom();
    return this.finishNode(node, "ImportDeclaration");
  }

  // import ... from ...
  // 简化逻辑：只处理 import { a, b } from ...
  if (this.eat(tt.braceL)) {
    while (!this.eat(tt.braceR)) {
      const specifier = this.startNode();
      specifier.imported = this.parseIdentifier();
      specifier.local = specifier.imported;
      if (this.eat(tt._as)) {
        specifier.local = this.parseIdentifier();
      }
      node.specifiers.push(this.finishNode(specifier, "ImportSpecifier"));
      if (!this.match(tt.braceR)) this.expect(tt.comma);
    }
  }

  this.expect(tt._from);
  node.source = this.parseExprAtom(); // 必须是字符串
  return this.finishNode(node, "ImportDeclaration");
};
```

> 上述实现是一个简化版，仅能处理 `import {a, b as c} from 'mod'` 和 `import 'mod'`。一个完整的实现需要处理默认导入、命名空间导入以及它们的混合使用，逻辑会复杂得多。

## 解析 `export` 声明

`export` 的解析更像一个派发中心，因为它后面的 Token 决定了具体的导出类型。

1.  消费 `export` 关键字。
2.  检查下一个 Token：
    -   `default`: 调用 `parseExportDefault`。
    -   `*`: 调用 `parseExportAll`。
    -   `{`: 解析命名的 `specifiers`，并检查可选的 `from` 子句。
    -   `let`, `const`, `var`, `function`, `class`: 解析这些声明，然后将它们包装在一个 `ExportNamedDeclaration` 节点中。

```javascript
// src/parser.js

pp.parseExport = function (node) {
  this.expect(tt._export);

  if (this.eat(tt._default)) {
    // export default ...
    node.declaration = this.parseExpression(); // 简化：只支持表达式
    return this.finishNode(node, "ExportDefaultDeclaration");
  }

  if (this.eat(tt.star)) {
    // export * from ...
    this.expect(tt._from);
    node.source = this.parseExprAtom();
    return this.finishNode(node, "ExportAllDeclaration");
  }

  // export const a = 1; 或 export { a };
  if (this.isDeclaration()) { // isDeclaration 是一个辅助方法，判断是否为 let/const/var/function/class
    node.declaration = this.parseStatement();
    node.specifiers = [];
    node.source = null;
  } else {
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers();
    if (this.eat(tt._from)) {
      node.source = this.parseExprAtom();
    } else {
      node.source = null;
    }
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};

pp.parseExportSpecifiers = function() {
    // ... 解析 { a, b as c } 的逻辑，与 import 类似
    return [];
}
```

## 添加测试用例

模块系统的测试用例需要非常全面，以覆盖其所有语法组合。

```javascript
// test/test.js

describe("ES Modules", () => {
  it("should parse an import declaration with named specifiers", () => {
    const ast = parse("import { a, b as c } from 'mod';");
    // 断言 ImportDeclaration, ImportSpecifier
  });

  it("should parse a default import", () => {
    const ast = parse("import d from 'mod';");
    // 断言 ImportDefaultSpecifier
  });

  it("should parse an export declaration", () => {
    const ast = parse("export const x = 10;");
    // 断言 ExportNamedDeclaration 包含一个 VariableDeclaration
  });

  it("should parse a default export", () => {
    const ast = parse("export default () => {};");
    // 断言 ExportDefaultDeclaration 包含一个 ArrowFunctionExpression
  });

  it("should parse a re-export (export from)", () => {
    const ast = parse("export { a } from 'mod';");
    // 断言 ExportNamedDeclaration 包含 source
  });

  it("should parse an export all declaration", () => {
    const ast = parse("export * from 'mod';");
    // 断言 ExportAllDeclaration
  });

  it("should throw on non-top-level import", () => {
    assert.throws(() => parse("function f() { import 'mod'; }"));
  });
});
```

## 总结

恭喜你！随着 `import` 和 `export` 解析的完成，我们的 `mini-acorn` 已经掌握了现代 JavaScript 的所有核心语法。我们不仅实现了对这两种复杂语句的解析，还通过 `topLevel` 标志强制执行了它们只能在顶层使用的重要规则。

至此，我们已经完整地走过了“语句与声明”这一漫长而收获颇丰的旅程。我们的解析器从一个只能处理简单表达式的“婴儿”，成长为了一个能够解析变量、条件、循环、函数、类和模块的“青年”。

在接下来的第六部分“AST 应用”中，我们将不再向解析器添加新功能，而是将目光转向如何“使用”我们辛勤劳动构建出的 AST。我们将学习如何遍历 AST，并利用它来实现一些有趣且实用的功能，比如代码生成。