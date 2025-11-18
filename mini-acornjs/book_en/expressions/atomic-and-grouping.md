# Parsing Atomic and Grouping Expressions: `this`, `super`, `( ... )`

We have built the powerful skeleton of the Pratt parser, and now it's time to flesh it out. Any complex expression, no matter how many layers of operators are nested, can ultimately be broken down into indivisible **atomic expressions**. They are the "elements" of the expression world and the endpoint of recursive parsing.

In this chapter, we will implement the `parseExprAtom` function, which is the specialized mechanism in our parser responsible for handling these "atoms".

## 1. `parseExprAtom`: The Foundation of Expression Parsing

`parseExprAtom` is the core entry point for the `nud` logic in the Pratt parsing algorithm. When `parseMaybeUnary` determines that the current token is not a prefix operator, it hands control to `parseExprAtom`. This function's job is to recognize and parse the atomic expression at the current position.

Its internal structure is typically a large `switch` statement that dispatches to different parsing logic based on the current `this.type`.

```javascript
// file: src/parser/expression.js

parseExprAtom() {
  const canBeArrow = this.potentialArrowAt === this.start;
  let node;

  switch (this.type) {
    case tt._super: // super
    case tt._this: // this
      // ... we'll explain in detail later

    case tt.name: // identifier
      // ...

    case tt.num: case tt.string: // numeric and string literals
      // ...

    case tt._null: case tt._true: case tt._false: // null, true, false
      // ...

    case tt.parenL: // grouping expression `(`
      // ...

    default:
      this.unexpected(); // throw error if encountering an unrecognized token
  }
}
```

Let's implement these `case` statements one by one.

## 2. Parsing Literals, `this`, and `super`

The simplest atomic expressions are literals and the keywords `this` and `super`.

- **Literals**: Include numbers (`123`), strings (`'hello'`), boolean values (`true`, `false`), and `null`. When the lexer generates these tokens, it typically stores their values. We just need to create a `Literal` node and place the value in it.
- **`this`**: This is a special keyword representing the current execution context. We create an AST node of type `ThisExpression` for it.
- **`super`**: `super` is used to call parent class constructors or methods. It can only be used in specific contexts (e.g., within a derived class's `constructor`). Parsing it itself is simple—just create a `Super` node—but validating its legality is more complex, which we'll explore in later chapters.

```javascript
// file: src/parser/expression.js -> parseExprAtom()

switch (this.type) {
  case tt._super:
  case tt._this:
    node = this.startNode();
    const type = this.type === tt._this ? "ThisExpression" : "Super";
    this.next(); // consume this or super
    return this.finishNode(node, type);

  case tt.num:
  case tt.string:
    node = this.startNode();
    node.value = this.value;
    node.raw = this.input.slice(this.start, this.end);
    this.next(); // consume literal token
    return this.finishNode(node, "Literal");

  case tt._null:
  case tt._true:
  case tt._false:
    node = this.startNode();
    node.value = this.type === tt._true ? true : this.type === tt._false ? false : null;
    node.raw = this.type.label;
    this.next();
    return this.finishNode(node, "Literal");

  // ... other cases
}
```

## 3. Parsing Identifiers

Identifiers (variable names) are the atomic expressions we most frequently encounter. We've already implemented the `parseIdent` function when parsing variable declarations, which we can reuse here.

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

## 4. Grouping Expression `( ... )`: The Tool for Boosting Precedence

Grouping expressions are the only "container" type among atomic expressions. Their syntax structure is `( Expression )`, and their sole purpose is to **unconditionally boost the precedence of the internal expression**.

For example, in `(2 + 3) * 4`, the parentheses cause `2 + 3` to be evaluated as a whole first, then multiplied by `4`.

Parsing it is very straightforward:

1. Encounter `(`, consume it.
2. Recursively call the **main expression parsing function `parseExpression()`** to parse any expression inside the parentheses.
3. Expect and consume a `)`.
4. Return the AST of the internal expression.

```javascript
// file: src/parser/expression.js -> parseExprAtom()

// ...
case tt.parenL: // '('
  this.next(); // consume '('
  // recursive call to parse everything inside parentheses
  node = this.parseExpression();
  this.expect(tt.parenR); // must end with ')'
  return node;
// ...
```

The `this.expect(tt.parenR)` here is crucial—it checks if the current token is `)`, and if not, automatically throws a syntax error, thus handling mismatched parentheses.

### A Classic Pitfall: Arrow Functions

You may have noticed a problem: code starting with `(` could be either a grouping expression or an **arrow function's parameter list**, such as `(a, b) => a + b`.

This is a classic syntactic ambiguity. When the parser only sees `(`, it cannot determine what it's facing. Acorn and other modern parsers adopt a "delayed decision" strategy:

1. **Preliminary parsing**: First assume it's a grouping expression, but allow parameter-like structures (like comma-separated identifiers) to appear within it.
2. **Lookahead**: After parsing `)`, check if the following token is `=>`.
3. **Transform or confirm**:
   - If it's `=>`, transform the just-parsed AST into an arrow function's parameter list.
   - If not `=>`, confirm it's just a regular grouping expression.

This is an advanced topic we'll explore in depth in the dedicated function parsing chapter. For now, you just need to know that our `parseExprAtom` implementation currently only handles grouping expressions, which is sufficient for understanding the core of expression parsing.

## 5. Summary

We have successfully implemented `parseExprAtom`, providing the first and most important batch of "building materials" for our Pratt parser. Now, our parser can transform the most basic code snippets into AST nodes.

- **Atoms are the foundation**: `this`, `super`, literals, and identifiers are the building blocks of all complex expressions.
- **Grouping is the weapon**: Parentheses `()` are our only weapon against default operator precedence. `parseExprAtom` implements their parsing through recursive calls to `parseExpression`.
- **Error handling**: By calling `this.unexpected()` in the `default` branch and `expect`, we ensure the parser fails gracefully when encountering illegal tokens.

Although we've only taken a small step, it's a crucial one. With these atomic expressions serving as recursive "anchors", we can confidently proceed to implement various more complex expression types that depend on them, such as arrays, objects, function calls, and more.