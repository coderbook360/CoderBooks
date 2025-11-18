# Challenges in Expression Parsing: Operator Precedence and Associativity

Welcome to the most exciting and challenging part of the parser—expression parsing. So far, we have successfully parsed statements like variable declarations, if statements, for loops, etc. The structure of statements is usually relatively fixed, and the parsing process is straightforward. But expressions are completely different—they are full of "freedom" and "variation".

## 1. The Problem: How Does a Computer Understand `2 + 3 * 4`?

Let's start with a math problem you've been familiar with since elementary school:

```
2 + 3 * 4
```

You can immediately see that the answer is `14` because "multiplication and division come before addition and subtraction". Your brain automatically recognizes the **precedence** of operators, treating `3 * 4` as a whole, then adding it to `2`.

But for a simple parser that reads tokens sequentially from left to right, it sees this sequence:

1.  `Number` (2)
2.  `+` (Plus)
3.  `Number` (3)
4.  `*` (Star)
5.  `Number` (4)

If the parser has no "intelligence", it might simply combine them in the order they appear, resulting in `(2 + 3) * 4`, which equals `20`—this is clearly wrong.

This is our first core challenge: **The parser must understand and obey operator precedence rules**. It needs a mechanism that can "foresee" that there are higher-precedence operators coming up and prioritize processing them.

## 2. The Second Challenge: Operator "Alignment"—Associativity

Precedence solves the order problem when different operators appear together. But what about a series of identical operators? For example:

```
a - b - c
```

Here there are only subtraction operators, all with the same precedence. So, should we calculate `a - b` first or `b - c` first?

-   If we calculate `a - b` first, the expression is equivalent to `(a - b) - c`.
-   If we calculate `b - c` first, the expression is equivalent to `a - (b - c)`.

For subtraction, these two calculation orders yield completely different results. In JavaScript (and most programming languages), subtraction, addition, multiplication, and division are all **left-associative**. This means that when precedence is the same, operations proceed from left to right. Therefore, the correct parsing result for `a - b - c` is `(a - b) - c`.

However, not all operators are left-associative. The most typical example is the assignment operator:

```
a = b = c
```

The execution order of this expression is from right to left: first execute `b = c`, then assign the result of `b = c` (i.e., the value of `c`) to `a`. This is called **right-associative**. Its correct parsing result is `a = (b = c)`.

So, this is our second core challenge: **The parser must understand and obey operator associativity rules** to decide how to structure the AST when precedence is the same.

## 3. The Dilemma of Traditional Recursive Descent Parsing

Faced with the two mountains of precedence and associativity, traditional recursive descent parsing methods become extremely clumsy.

Imagine if we wrote a separate parsing function for each precedence level—what would happen?

```javascript
// Pseudocode
function parseExpression() {
  return parseAssignmentExpression(); // lowest precedence
}

function parseAssignmentExpression() {
  let left = parseConditionalExpression();
  // if followed by '=', handle assignment...
  return left;
}

function parseConditionalExpression() {
  let left = parseLogicalORExpression();
  // if followed by '?', handle ternary expression...
  return left;
}

function parseLogicalORExpression() {
  let left = parseLogicalANDExpression();
  // if followed by '||', handle logical OR...
  return left;
}

// ... layer after layer, until the highest precedence multiplicative expression ...

function parseMultiplicativeExpression() {
  let left = parseUnaryExpression();
  while (this.type === tt.star || this.type === tt.slash) {
    // handle '*' and '/'
  }
  return left;
}

// ...
```

This approach is called the "Expression Cascade". It does work, but it has several serious problems:

1.  **Function Explosion**: JavaScript has over a dozen different operator precedence levels, which would require us to write over a dozen nearly identical functions. This makes the code verbose and difficult to maintain.
2.  **Performance Issues**: Each layer of function call incurs overhead, and deep recursive call chains can affect parser performance.
3.  **Rigidity and Fragility**: Whenever the language adds a new operator or modifies precedence, we would need to painfully restructure this "cascade", which is very cumbersome.

We need a more elegant, flexible, and efficient method to handle expressions. This method should be able to use a unified logic to concisely handle all operator precedence and associativity.

Fortunately, such a method already exists. It's the protagonist of our next chapter—**Pratt Parsing**. It will completely change our understanding of expression parsing, allowing us to conquer this seemingly insurmountable mountain in an extremely clever way.