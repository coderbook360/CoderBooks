# 34. Parsing ES Modules: `import` and `export`

Our journey through the "Statements and Declarations" section is about to reach its destination, and the final stop is a crucial modern JavaScript feature - ES Modules (ESM). `import` and `export` statements form the foundation of modern web application development, making code organization, reuse, and dependency management clearer and more powerful than ever before.

In this chapter, we will add the ability to parse `import` and `export` statements to `mini-acorn`. These two types of statements introduce entirely new syntax structures and have a very strict rule: they **can only appear at the top level** of modules. Our parser must be able to understand these syntaxes and enforce this rule.

## AST Structure of Module Syntax

ESTree has designed a specialized set of AST nodes for the module system.

- **`ImportDeclaration`**: Represents `import` statements.
  - `specifiers`: An array describing the specific content being imported (e.g., `a`, `{b}`, `* as c`).
  - `source`: A `Literal` indicating which module to import from.

- **`ExportNamedDeclaration`**: Used to export one or more "named" bindings.
  - `declaration`: Can be a declaration node (e.g., `VariableDeclaration`) for cases like `export const a = 1;`.
  - `specifiers`: An array for cases like `export {a, b};`.
  - `source`: If it's a re-export like `export {a} from './mod';`, this field exists.

- **`ExportDefaultDeclaration`**: Used for `export default ...`.
  - `declaration`: Can be a declaration (`FunctionDeclaration`, `ClassDeclaration`) or an expression.

- **`ExportAllDeclaration`**: Used for `export * from './mod';`.
  - `source`: The module source.
  - `exported`: If it's `export * as ns from ...`, this field exists.

## Top-Level Restriction (Top-Level Await)

Before starting parsing, we must address the "top-level restriction" issue. `import` and `export` can only be used at the highest level of the program. We can set a `topLevel` flag in the `Parser`, set it to `true` at the parsing entry point (`parse` method), and pass it as `false` when entering any function body or block scope. When parsing `import` or `export`, we can check this flag.

```javascript
// src/parser.js
pp.parseStatement = function (declaration, topLevel) {
  // ...
  switch (startType) {
    case tt._import:
      if (!topLevel) this.unexpected(); // Not top-level, throw error
      return this.parseImport(this.startNode());
    case tt._export:
      if (!topLevel) this.unexpected(); // Not top-level, throw error
      return this.parseExport(this.startNode());
    // ...
  }
}
```

## Parsing `import` Declarations

`import` statements come in various forms, and our `parseImport` method needs to handle all cases.

1. Consume the `import` keyword.
2. Check the next token to determine the import type:
   - If it's a string `Literal`, it's an import for side effects like `import "./mod.js"`.
   - If it's an identifier, `{`, or `*`, start parsing `specifiers`.
3. Parsing `specifiers` is a delicate task that requires creating `ImportDefaultSpecifier`, `ImportSpecifier`, or `ImportNamespaceSpecifier` based on token types.
4. Consume the `from` keyword.
5. Parse the `source` string.

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
  // Simplified logic: only handle import { a, b } from ...
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
  node.source = this.parseExprAtom(); // Must be a string
  return this.finishNode(node, "ImportDeclaration");
};
```

> The above implementation is a simplified version that only handles `import {a, b as c} from 'mod'` and `import 'mod'`. A complete implementation would need to handle default imports, namespace imports, and their mixed usage, which would be much more complex.

## Parsing `export` Declarations

`export` parsing is more like a dispatch center because the token following it determines the specific export type.

1. Consume the `export` keyword.
2. Check the next token:
   - `default`: Call `parseExportDefault`.
   - `*`: Call `parseExportAll`.
   - `{`: Parse named `specifiers` and check for optional `from` clause.
   - `let`, `const`, `var`, `function`, `class`: Parse these declarations, then wrap them in an `ExportNamedDeclaration` node.

```javascript
// src/parser.js

pp.parseExport = function (node) {
  this.expect(tt._export);

  if (this.eat(tt._default)) {
    // export default ...
    node.declaration = this.parseExpression(); // Simplified: only supports expressions
    return this.finishNode(node, "ExportDefaultDeclaration");
  }

  if (this.eat(tt.star)) {
    // export * from ...
    this.expect(tt._from);
    node.source = this.parseExprAtom();
    return this.finishNode(node, "ExportAllDeclaration");
  }

  // export const a = 1; or export { a };
  if (this.isDeclaration()) { // isDeclaration is a helper method to determine if it's let/const/var/function/class
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
    // ... Logic for parsing { a, b as c }, similar to import
    return [];
}
```

## Adding Test Cases

Module system test cases need to be very comprehensive to cover all syntax combinations.

```javascript
// test/test.js

describe("ES Modules", () => {
  it("should parse an import declaration with named specifiers", () => {
    const ast = parse("import { a, b as c } from 'mod';");
    // Assert ImportDeclaration, ImportSpecifier
  });

  it("should parse a default import", () => {
    const ast = parse("import d from 'mod';");
    // Assert ImportDefaultSpecifier
  });

  it("should parse an export declaration", () => {
    const ast = parse("export const x = 10;");
    // Assert ExportNamedDeclaration contains a VariableDeclaration
  });

  it("should parse a default export", () => {
    const ast = parse("export default () => {};");
    // Assert ExportDefaultDeclaration contains an ArrowFunctionExpression
  });

  it("should parse a re-export (export from)", () => {
    const ast = parse("export { a } from 'mod';");
    // Assert ExportNamedDeclaration contains source
  });

  it("should parse an export all declaration", () => {
    const ast = parse("export * from 'mod';");
    // Assert ExportAllDeclaration
  });

  it("should throw on non-top-level import", () => {
    assert.throws(() => parse("function f() { import 'mod'; }"));
  });
});
```

## Summary

Congratulations! With the completion of `import` and `export` parsing, our `mini-acorn` has mastered all the core syntax of modern JavaScript. We've not only implemented parsing for these two complex statements but also enforced the important rule that they can only be used at the top level through the `topLevel` flag.

At this point, we have fully completed our long and rewarding journey through the "Statements and Declarations" section. Our parser has grown from a "baby" that could only handle simple expressions into a "young adult" capable of parsing variables, conditionals, loops, functions, classes, and modules.

In the upcoming Part 6 "AST Applications", we will no longer add new features to the parser but instead turn our attention to how to "use" the AST we've painstakingly built. We will learn how to traverse the AST and use it to implement some interesting and practical features, such as code generation.