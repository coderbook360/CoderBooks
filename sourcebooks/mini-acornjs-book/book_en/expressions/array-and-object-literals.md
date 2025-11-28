# Parsing Array and Object Literals

After mastering the most basic atomic expressions, we now face two more complex "atoms"—arrays and objects. Technically, they are also atomic expressions because they are fundamental units that constitute complex expressions and serve as the starting point for Pratt parser recursion. When the parser encounters `[` or `{` at the beginning of an expression, it knows a new data structure is about to be created.

We will again extend `parseExprAtom`, giving it the ability to parse these two core data structures.

## 1. Extending `parseExprAtom`: New Branches

First, we need to add two new `case` statements to the `switch` statement in `parseExprAtom`, using `[` and `{` as signals to call the specialized parsing functions `parseArray` and `parseObject` respectively.

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

## 2. Parsing Array Literals `[...]`

The `parseArray` function is responsible for converting the comma-separated content between `[` and `]` into an `ArrayExpression` node. Its logic is relatively straightforward:

1. Create an `ArrayExpression` node and consume the opening `[`.
2. Enter a loop to continuously parse array elements until encountering the closing `]`.
3. In the loop, handle three scenarios:
   - **Regular Elements**: Directly call `parseMaybeAssign` to parse a complete assignment expression.
   - **Spread Syntax `...`**: Call a helper function `parseSpread` to handle it.
   - **Empty Slots (Elision)**: If encountering consecutive commas (e.g., `[a,,b]`) or a leading comma (e.g., `[,a]`), this represents an empty slot in the array. In the ESTree specification, we use `null` to represent it.
4. Handle trailing commas (Trailing Comma), i.e., legal syntax like `[a, b,]`.
5. Consume the closing `]`, complete and return the node.

```javascript
// file: src/parser/expression.js

parseArray() {
  const node = this.startNode();
  node.elements = [];
  this.next(); // consume `[`

  while (!this.eat(tt.bracketR)) { // as long as we haven't encountered `]`
    // Handle empty slots, e.g., the second element in `[a,,b]`
    if (this.eat(tt.comma)) {
      node.elements.push(null);
      continue;
    }

    // Check if it's a trailing comma, if so, the loop should end
    if (this.type === tt.bracketR) break;

    // Parse element
    let element;
    if (this.type === tt.ellipsis) { // `...`
      element = this.parseSpread();
    } else {
      // Any legal expression can be an array element
      element = this.parseMaybeAssign();
    }
    node.elements.push(element);

    // After the element, it must be either a comma or `]`
    if (!this.eat(tt.comma)) {
      this.expect(tt.bracketR);
      break; // expect will check, break here just to exit the loop
    }
  }
  return this.finishNode(node, "ArrayExpression");
}

// parseSpread is a simple helper function
parseSpread() {
  const node = this.startNode();
  this.next(); // consume `...`
  node.argument = this.parseMaybeAssign(); // `...` can be followed by any assignment expression
  return this.finishNode(node, "SpreadElement");
}
```

## 3. Parsing Object Literals `{...}`

Parsing objects is more complex than parsing arrays because object properties can take various forms. The overall structure of `parseObject` function is similar to `parseArray`, but it calls `parseProperty` in a loop to parse each property.

```javascript
// file: src/parser/expression.js

parseObject() {
  const node = this.startNode();
  node.properties = [];
  this.next(); // consume `{`

  while (!this.eat(tt.braceR)) {
    let prop;
    if (this.type === tt.ellipsis) {
      prop = this.parseSpread();
      node.properties.push(prop);
    } else {
      prop = this.parseProperty();
      node.properties.push(prop);
    }

    // Handle commas and trailing commas
    if (!this.eat(tt.comma)) {
      this.expect(tt.braceR);
      break;
    }
  }
  return this.finishNode(node, "ObjectExpression");
}
```

### `parseProperty`: The Heart of Objects

The real complexity lies in `parseProperty`. An object property can be:

- **Regular Property**: `{ key: value }`
- **Shorthand Property**: `{ a }`, equivalent to `{ a: a }`
- **Computed Property Name**: `{ [myVar]: 1 }`
- **Method**: `{ myMethod() { ... } }`
- **Getter/Setter**: `{ get myProp() { ... }, set myProp(v) { ... } }`

To stay focused, we'll first implement a simplified version of `parseProperty` that only handles the most common **regular properties** and **shorthand properties**.

```javascript
// file: src/parser/expression.js

// Simplified version of parseProperty
parseProperty() {
  const prop = this.startNode();

  // For simplification, we only handle identifiers as property names here
  // A complete implementation would need to call parsePropertyName, which can handle strings, numbers, etc.
  if (this.type === tt.name) {
    prop.key = this.parseIdent();
  } else {
    this.unexpected();
  }

  prop.computed = false; // computed properties we'll handle later
  prop.method = false; // methods we'll also handle later

  // Key: How to distinguish between shorthand property `{a}` and regular property `{a: 1}`?
  // The answer is to check if there's a colon `:` following
  if (this.eat(tt.colon)) {
    // It's a regular property
    prop.kind = "init";
    prop.shorthand = false;
    prop.value = this.parseMaybeAssign(); // parse the value after the colon
  } else {
    // It's a shorthand property
    // Check: shorthand property cannot be directly followed by parentheses, otherwise it's a method definition
    if (this.type === tt.parenL) {
        this.unexpected(); // simplified handling, directly report error
    }
    prop.kind = "init";
    prop.shorthand = true;
    // For shorthand properties, key and value point to the same Identifier node
    prop.value = prop.key;
  }

  return this.finishNode(prop, "Property");
}
```

This simplified implementation captures the core: by checking whether there's a colon `:` following the property name to distinguish between shorthand and regular properties. This is sufficient to parse many common object literals.

## 4. Summary

By adding branches for `[` and `{` in `parseExprAtom` and implementing `parseArray` and `parseObject`, our parser can now handle the two most commonly used data structures in JavaScript. We've learned:

- How to loop through parsing comma-separated lists and correctly handle **trailing commas**.
- How to handle **empty slots** in arrays and **spread syntax `...`** in both data structures.
- How to distinguish between **shorthand properties** and **regular properties** in objects by checking for the **colon `:`**.

Although we simplified object property parsing to focus on the core concepts, this solid foundation has been established. In subsequent chapters, we will gradually improve `parseProperty` to unlock parsing capabilities for all advanced property types like computed properties, methods, getters/setters, making our parser more complete and powerful.