# Pratt Parser: Algorithm Core

In the previous chapter, we saw the dilemma faced by traditional recursive descent parsers when handling expressions—the "function waterfall" is not only verbose but also difficult to maintain. Now, it's time to reveal a more elegant solution: **Pratt Parser**.

This algorithm was proposed by Vaughan Pratt in 1973, and its core idea subverts our previous understanding: **Instead of writing numerous functions to distinguish operator precedence, let each operator Token drive the parsing process itself.**

## I. Two Core Concepts: `nud` and `led`

Pratt associates parsing logic with the Token type itself and defines two types of parsing functions:

1.  **`nud` (Null Denotation)**
    -   Called when a Token appears in a **prefix** position.
    -   The `n` in `nud` stands for `null` because its left side (`null`) has no expression for it to operate on.
    -   What scenarios does it apply to?
        -   **Literals and identifiers**: Such as `123`, `x`. Their `nud` logic is the simplest—just return an AST node representing themselves.
        -   **Prefix operators**: Such as `-a`, `!b`. The `nud` logic for `-` and `!` is to first parse the expression to their right (`a` or `b`), then create a unary operation (UnaryExpression) node.

2.  **`led` (Left Denotation)**
    -   Called when a Token appears in an **infix** or **postfix** position.
    -   The `l` in `led` stands for `left` because it requires an already parsed expression on its **left** as input.
    -   What scenarios does it apply to?
        -   **Infix operators**: Such as `a + b`. The `led` of `+` receives the AST node of `a` as the left side, then continues to parse `b` to the right, and finally combines them into a binary operation (BinaryExpression) node.
        -   **Postfix operators**: Such as `i++`. The `led` of `++` receives the AST node of `i` and wraps it into an update expression (UpdateExpression) node.
        -   **Calls and member access**: Such as `fn()`, `obj[key]`. The `led` of `(` and `[` both receive the left-side expression (`fn` or `obj`) and build the corresponding AST node.

In simple terms:

-   **`nud`**: Handles "starting" Tokens, creating the "starting point" of an expression.
-   **`led`**: Handles "middle" Tokens, "attaching" new parts to the existing expression.

## II. Replacing "Precedence" with "Binding Power"

The Pratt parser replaces "precedence" with a more general concept—**Binding Power**. Binding power is a simple numerical value that determines how strongly an operator "binds" to the expressions around it.

-   Operators with higher binding power are computed first.
-   For example, the binding power of `*` (e.g., 20) is higher than that of `+` (e.g., 10).

Each **infix** and **postfix** operator (i.e., Tokens that have `led`) is assigned a binding power value. Prefix operators (`nud`) and atomic expressions (like numbers, identifiers) don't need this; their binding power can be considered 0.

| Operator | Type | Binding Power (Example) | Associativity |
| :--- | :--- | :--- | :--- |
| `a` | `nud` | 0 | - |
| `+` | `led` | 10 | Left |
| `-` | `led` | 10 | Left |
| `*` | `led` | 20 | Left |
| `/` | `led` | 20 | Left |
| `=` | `led` | 2 | Right |

## III. Algorithm Main Loop: `parseExpression`

The core of the Pratt parser is a very concise function we call `parseExpression`. It takes only one parameter: `rightBindingPower`, which represents the "minimum binding power requirement" of the current parsing context.

Let's look at its pseudocode implementation:

```javascript
function parseExpression(rightBindingPower = 0) {
  // 1. Get the current Token and execute its nud function.
  // This handles literals, identifiers, or prefix operators, generating the "left-hand side" (left) of our expression.
  let t = advance(); // Get current Token and advance
  let left = t.nud();

  // 2. Loop: Continue as long as the next Token's binding power is greater than our current rightBindingPower.
  while (peek().bindingPower > rightBindingPower) {
    // Consume this infix or postfix operator
    t = advance();

    // 3. Execute its led function, passing in the current left.
    // led will complete the remaining parsing and return a new, more complete left.
    left = t.led(left);
  }

  return left;
}
```

This loop is where the magic of the Pratt parser lies! Let's break it down step by step:

1.  **Starting Point**: `parseExpression` first obtains an initial `left` expression by calling the current Token's `nud`. This always succeeds because any expression must start with a literal, identifier, or prefix operator.

2.  **Loop Condition**: `while (peek().bindingPower > rightBindingPower)` is the decision core of the algorithm. It asks: "Is the next operator's binding power strong enough to warrant me 'grabbing' it to become part of the current `left` expression?"

3.  **"Grabbing" and Combining**: If the answer is yes, the loop body executes. It consumes the stronger operator and calls its `led` method. The `led` method receives the already parsed `left`, continues parsing to the right, and then combines all parts into a new, larger `left` expression. This new `left` will continue to be tested in the next iteration.

4.  **End Point**: When the loop condition is not met (i.e., the next Token's binding power is not strong enough, or there are no more Tokens), it means the current expression is complete and can be returned.

## IV. Diagramming the `2 + 3 * 4` Parsing Process

Let's manually trace the parsing process of `2 + 3 * 4` using this algorithm. Assume binding power: `+` is 10, `*` is 20.

1.  **`parseExpression(0)`** is called (initial call, minimum binding power is 0).

2.  **`nud`**: Read `2`. The `nud` of `2` returns `NumericLiteral(2)`. `left` is now `NumericLiteral(2)`.

3.  **Loop Check**: Look at the next Token `+`. Its binding power is `10`, `10 > 0`, so the loop starts.

4.  **`led`**: Consume `+`, call the `led` of `+` with `NumericLiteral(2)`.
    -   Inside the `led` of `+`, it needs to parse the expression to the right. The key point: it recursively calls **`parseExpression(10)`**, passing `+`'s own binding power as the new `rightBindingPower`!
    -   **Enter inner `parseExpression(10)`**
        1.  **`nud`**: Read `3`. The `nud` of `3` returns `NumericLiteral(3)`. The inner `left` is `NumericLiteral(3)`.
        2.  **Loop Check**: Look at the next Token `*`. Its binding power is `20`, `20 > 10`, so the inner loop starts.
        3.  **`led`**: Consume `*`, call the `led` of `*` with `NumericLiteral(3)`.
            -   Inside the `led` of `*`, it also needs to parse the expression to the right, so it recursively calls **`parseExpression(20)`** (passing `*`'s binding power).
            -   **Enter innermost `parseExpression(20)`**
                1.  **`nud`**: Read `4`. The `nud` of `4` returns `NumericLiteral(4)`. The innermost `left` is `NumericLiteral(4)`.
                2.  **Loop Check**: End of file, no more Tokens. The innermost loop ends.
                3.  **Return**: The innermost `parseExpression(20)` returns `NumericLiteral(4)`.
            -   The `led` of `*` receives `NumericLiteral(4)` as the right side, combines it into `BinaryExpression(3 * 4)`, and returns this new node.
        4.  **Loop Check**: End of file. The inner loop ends.
        5.  **Return**: The inner `parseExpression(10)` returns `BinaryExpression(3 * 4)`.
    -   The `led` of `+` receives `BinaryExpression(3 * 4)` as the right side, combines it into `BinaryExpression(2 + (3 * 4))`, and returns this final AST node.

5.  **Loop Check**: End of file. The outer loop ends.

6.  **Final Return**: `parseExpression(0)` returns `BinaryExpression(2 + (3 * 4))`.

![Pratt Parser Flow](https://i.imgur.com/8yY4V4r.png) *（Note: This is a schematic diagram; the actual function calls and returns in the implementation are more complex）*

Through this process, you can see that `*`, because it has higher binding power than `+`, is "preemptively" executed inside the `led` function of `+`. The entire process is like a "tug-of-war"—operators with stronger binding power always "pull" the operands away from operators with weaker binding power.

## V. Summary

The Pratt parser is an extremely elegant and powerful algorithm. It completely solves the problem of expression parsing through the following core ideas:

-   **Delegation of Responsibility**: Attach parsing logic (`nud` and `led`) and precedence information (binding power) to the Token itself.
-   **Unified Loop**: Use a single `parseExpression(rightBindingPower)` function and main loop to handle all types of expressions.
-   **Recursive Composition**: Skillfully handle complex precedence and associativity issues by recursively calling `parseExpression` within `led` functions and passing new binding power contexts.

In the following chapters, we will implement this algorithm ourselves, and you will gain a deeper appreciation for its simplicity and power. Get ready to say goodbye to the "function waterfall" and welcome a new way of parsing expressions!