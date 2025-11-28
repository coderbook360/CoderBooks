# Implementing Pratt Parser: Token "Binding Power"

Theory is beautiful, but the real fun lies in turning it into reality. In this chapter, we will personally inject "soul" into our `TokenType`—that is, binding power—and build the core skeleton of the Pratt parser. You will see how this elegant algorithm is implemented with just a few simple lines of code.

## I. Extending `TokenType`: Providing "Ammunition" for the Parser

The essence of the Pratt parser lies in its **data-driven** nature. The parser's behavior is entirely determined by the metadata carried by the current Token. Therefore, our first step is to enrich the definition of `TokenType`.

We need to add several key properties to each operator-type Token:

-   `binop`: A number representing the binding power (precedence) of this Token when it acts as an **infix operator**. The larger the value, the stronger the binding power. If it cannot be an infix operator, it is `-1`.
-   `prefix`: A boolean value indicating whether it can be a **prefix operator** (e.g., `-`, `!`).
-   `postfix`: A boolean value indicating whether it can be a **postfix operator** (e.g., `++`).
-   `rightAssociative`: A boolean value indicating whether it is **right-associative** when infix binding power is the same (e.g., the assignment operator `=`).

Let's open `src/tokentype.js` and perform a major upgrade to the `TokenType` class and `tt` object.

```javascript
// file: src/tokentype.js

export class TokenType {
  constructor(label, conf = {}) {
    this.label = label;
    // Key properties:
    this.binop = conf.binop ?? -1; // Infix binding power
    this.prefix = conf.prefix ?? false; // Whether it's a prefix
    this.postfix = conf.postfix ?? false; // Whether it's a postfix
    this.rightAssociative = conf.rightAssociative ?? false; // Whether it's right-associative

    // ... Other properties, such as startsExpr, isLoop, etc.
  }
}

// ...

// We define binding power for all operators
// The larger the precedence number, the stronger the binding power
export const tt = {
  // ... (num, string, name, and other atomic types)

  // Assignment and ternary, right-associative
  eq: new TokenType("=", { binop: 2, rightAssociative: true }),
  question: new TokenType("?", { binop: 3, rightAssociative: true }),

  // Logical operators
  logicalOR: new TokenType("||", { binop: 4 }),
  logicalAND: new TokenType("&&", { binop: 5 }),

  // Bitwise operators
  bitwiseOR: new TokenType("|", { binop: 6 }),
  bitwiseXOR: new TokenType("^", { binop: 7 }),
  bitwiseAND: new TokenType("&", { binop: 8 }),

  // Equality operators
  equality: new TokenType("==/!=", { binop: 9 }),

  // Relational operators
  relational: new TokenType("</>", { binop: 10 }),

  // Bit shift operators
  bitShift: new TokenType("<</>>", { binop: 11 }),

  // Addition and subtraction
  plus: new TokenType("+", { binop: 12, prefix: true }),
  minus: new TokenType("-", { binop: 12, prefix: true }),

  // Multiplication, division, modulo
  modulo: new TokenType("%", { binop: 13 }),
  star: new TokenType("*", { binop: 13 }),
  slash: new TokenType("/", { binop: 13 }),

  // Prefix/postfix increment/decrement
  incDec: new TokenType("++/--", { prefix: true, postfix: true }),

  // Other prefix operators
  bang: new TokenType("!", { prefix: true }),
  tilde: new TokenType("~", { prefix: true }),

  // ... (parenL, parenR, braceL, etc.)
};
```

Now, our Tokens are no longer just simple labels; they have become "intelligent" objects carrying parsing instructions. For example, when the parser encounters `tt.star` (`*`), it immediately knows:

-   This is an infix operator (`binop: 13`).
-   It is not a prefix or postfix operator.
-   It is left-associative (`rightAssociative: false`).

This information is all the "ammunition" the Pratt parser needs to run.

## II. Building the Pratt Parser Skeleton

With "intelligent" Tokens, we can now start building the core skeleton of the parser. We will implement all of this in `src/parser/expression.js`.

### 1. `parseExpression`: Unified Expression Entry Point

First, we need a unified entry point to parse any type of expression. This function is very simple; it just calls the starting point of the Pratt loop and passes in a minimum binding power of `0`, meaning "we can now start parsing any expression."

```javascript
// file: src/parser/expression.js

// Unified entry point for expression parsing
parseExpression() {
  // Initial call, the passed `left` is the first atomic expression, minimum binding power is 0
  return this.parseExprOp(this.parseMaybeUnary(), 0);
}
```

### 2. `parseMaybeUnary`: Implementation of `nud`

The first step of `parseExpression` is to call `this.parseMaybeUnary()`. This function perfectly illustrates the concept of `nud`: handling the "beginning" part of an expression.

The beginning of an expression is either a **prefix operator** (e.g., `-1`) or an **atomic expression** (e.g., `x`, `123`, `( ... )`). The responsibility of `parseMaybeUnary` is to distinguish between these two cases.

```javascript
// file: src/parser/expression.js

// Parse unary prefix expression or atomic expression
parseMaybeUnary() {
  // Check if the current Token is marked as a prefix operator
  if (this.type.prefix) {
    const node = this.startNode();
    const op = this.type;
    node.operator = op.label;
    this.next(); // Consume the prefix operator

    // Key: Recursively call parseExprOp to parse the expression after the operator
    // We need to set a binding power for unary operations, here we use a higher value (e.g., 14)
    // to ensure unary operators tightly bind to their operands. For example, in `-a * b`, `-` has higher precedence than `*`.
    node.argument = this.parseExprOp(this.parseMaybeUnary(), 14);
    node.prefix = true; // Explicitly mark this as a prefix expression

    // Determine whether it's UnaryExpression or UpdateExpression based on the operator type
    const nodeType = op === tt.incDec ? "UpdateExpression" : "UnaryExpression";
    return this.finishNode(node, nodeType);
  }

  // If it's not a prefix operator, it must be an atomic expression
  return this.parseExprAtom(); // We will implement this in the next chapter
}
```

### 3. `parseExprOp`: The Core Loop of Pratt

Now, we come to the most exciting part—implementing the core loop of the Pratt parser. This function implements the logic of `led`. It is a `while` loop that continues to "devour" and combine expressions to the right as long as the next infix operator's binding power is strong enough.

```javascript
// file: src/parser/expression.js

// Core loop of the Pratt parser, handling infix expressions
// left: The already parsed left-side expression
// minPrec: The minimum binding power required by the current context
parseExprOp(left, minPrec) {
  let prec = this.type.binop; // Get the infix binding power of the current Token

  // Loop condition:
  // 1. The current Token is an infix operator (prec > -1)
  // 2. Its binding power is higher than our required minimum binding power (prec > minPrec)
  while (prec > -1 && prec > minPrec) {
    const op = this.type;
    this.next(); // Consume the infix operator

    // Critical recursive call!
    // We need to parse the right-hand side expression.
    // What binding power do we pass to the next level? This determines associativity!
    // - Left-associative (a + b + c): Pass the same binding power as the current operator `prec`.
    //   This way, the next `+` (binding power 12) will not be greater than `minPrec` (12), the loop will stop, and (a+b) will be combined first.
    // - Right-associative (a = b = c): Pass `prec - 1`.
    //   This way, the next `=` (binding power 2) is still greater than `minPrec` (1), the loop will continue, and b=c will be prioritized for combination.
    const right = this.parseExprOp(this.parseMaybeUnary(), op.rightAssociative ? prec - 1 : prec);

    // Combine the left and right parts into a new, larger left
    const node = this.startNodeAtNode(left);
    node.left = left;
    node.operator = op.label;
    node.right = right;
    left = this.finishNode(node, "BinaryExpression");

    // Update prec for the next iteration to see if there's a stronger operator ahead
    prec = this.type.binop;
  }
  return left;
}
```

That's it! These three functions—`parseExpression`, `parseMaybeUnary`, and `parseExprOp`—together form the complete skeleton of the Pratt parser. Their collaboration is perfect:

1.  `parseExpression` serves as the unified entry point, starting the entire process.
2.  `parseMaybeUnary` is responsible for parsing the "head" of the expression, i.e., the `nud` part.
3.  `parseExprOp` is responsible for handling the "body" and "tail" of the expression, i.e., the `led` part. Through a concise `while` loop and clever recursive calls, it elegantly handles the precedence and associativity of all infix operators.

## III. Outlook

We have set up the stage, but the main character has not yet appeared. In `parseMaybeUnary`, we left a gap: `this.parseExprAtom()`. **Atomic expressions** are the foundation of all complex expressions; they are the smallest units that make up expressions and are the recursive endpoint of the Pratt parser.

In the following chapters, we will implement the parsing of various atomic expressions one by one, including:

-   Numbers, strings, booleans, null, this
-   Identifiers (variable names)
-   Parenthesized expressions `( ... )`