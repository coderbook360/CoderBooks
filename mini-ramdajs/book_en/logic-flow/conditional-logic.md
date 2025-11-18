# Conditional Logic: Functional Expressions with `ifElse` and `cond`

In everyday programming, we use `if...else` or `switch` statements to control the execution flow of our code. This is very natural in imperative programming, but in the context of functional programming—especially when you want to build a declarative data processing pipeline composed of multiple functions—these statements can feel out of place.

Why? Because `if...else` is a **statement**. It doesn't return a value; its job is to execute different blocks of code based on a condition. The core of functional programming, however, is the **expression**. Every part should be a computational unit that returns a value, allowing them to be freely combined like LEGO bricks.

Ramda provides `ifElse` and `cond`, which are the "expression" versions of conditional logic, capable of seamlessly integrating into a chain of function compositions.

## `R.ifElse`: The Functional Ternary Operator

You can think of `R.ifElse` as a more powerful version of the ternary operator (`condition ? onTrue : onFalse`). It accepts three functions as arguments:

1.  `predicate`: An assertion function that returns a boolean value, used for the condition.
2.  `onTrue`: The transformation function to execute when the predicate returns `true`.
3.  `onFalse`: The transformation function to execute when the predicate returns `false`.

`R.ifElse` returns a brand-new function that waits to receive data, then executes the entire conditional logic with that data.

Its signature is: `ifElse(predicate, onTrueFn, onFalseFn, data)`

Let's look at a simple example. Suppose we want to implement a safe division function that returns an error message when the divisor is 0.

```javascript
import * as R from 'ramda';

// onFalseFn: A function that returns an error string
const onZero = () => 'Error: Division by zero';

// onTrueFn: The function that performs the actual division
const divide = (a, b) => a / b;

// predicate: A function that checks if the divisor is not 0
const isNotZero = (a, b) => b !== 0;

const safeDivide = R.ifElse(
  isNotZero,
  divide,
  onZero
);

console.log(safeDivide(10, 2)); // => 5
console.log(safeDivide(10, 0)); // => 'Error: Division by zero'
```

This `safeDivide` function is a pure, reusable expression that can easily be placed inside a `pipe`.

### Front-end in Practice: Dynamic UI Rendering

In front-end development, we often need to display different interfaces based on the user's login status. `ifElse` shines here.

Suppose we have a `user` object and need to decide whether to show a welcome message or a login button based on the `isLoggedIn` property.

```javascript
import { ifElse, propEq } from 'ramda';

const renderWelcomeMessage = (user) => `<h1>Welcome, ${user.name}!</h1>`;
const renderLoginButton = () => '<button>Login Please</button>';

// Use propEq to create a predicate function that checks if user.isLoggedIn is true
const isLoggedIn = propEq('isLoggedIn', true);

const renderHeader = ifElse(
  isLoggedIn,
  renderWelcomeMessage,
  renderLoginButton
);

const loggedInUser = { name: 'Alice', isLoggedIn: true };
const guest = { name: 'Guest', isLoggedIn: false };

console.log(renderHeader(loggedInUser)); // => "<h1>Welcome, Alice!</h1>"
console.log(renderHeader(guest));        // => "<button>Login Please</button>"
```

As you can see, we defined the logic for `renderHeader` in a very declarative way: if the user is logged in, render the welcome message; otherwise, render the login button. The entire process involves no `if` statements.

## `R.cond`: The Functional `switch` Statement

When you have multiple conditional branches, `ifElse` can lead to nested layers, reducing code readability. This is where `R.cond` comes in. It's like a functional `switch` statement or an `if...else if...else` chain.

`R.cond` accepts a list of `[predicate, transformer]` array pairs. It applies each `predicate` function to the data in order. As soon as a `predicate` returns `true`, it immediately executes the corresponding `transformer` function and returns its result as the final value. Subsequent conditions will not be checked.

To ensure there is always a match (similar to the `default` case in a `switch`), we can use `R.T`. `R.T` is a function that always returns `true`, making it perfect for placing at the end of the `cond` list as a "catch-all" default branch.

### Front-end in Practice: Calculating Discount Levels Based on User Points

Imagine an e-commerce scenario where we need to determine a user's membership level based on their points and return the corresponding discount rate.

```javascript
import { cond, T, propSatisfies } from 'ramda';

// Create a series of predicate functions
const isPlatinum = propSatisfies(points => points >= 1000, 'points');
const isGold = propSatisfies(points => points >= 500, 'points');
const isSilver = propSatisfies(points => points >= 100, 'points');

const getDiscountRate = cond([
  [isPlatinum, () => 0.20], // If Platinum member, return 20% discount
  [isGold,     () => 0.15], // If Gold member, return 15% discount
  [isSilver,   () => 0.10], // If Silver member, return 10% discount
  [T,          () => 0.05]  // Otherwise, return a 5% base discount
]);

const user1 = { name: 'John', points: 1200 };
const user2 = { name: 'Jane', points: 650 };
const user3 = { name: 'Joe', points: 150 };
const user4 = { name: 'Doe', points: 50 };

console.log(getDiscountRate(user1)); // => 0.2
console.log(getDiscountRate(user2)); // => 0.15
console.log(getDiscountRate(user3)); // => 0.1
console.log(getDiscountRate(user4)); // => 0.05
```

The beauty of `cond` is that it flattens a series of complex conditional checks into a clear, highly readable "list of rules." Each line represents an independent business rule, making it very convenient to add, delete, or modify.

## Summary

`ifElse` and `cond` elevate conditional logic from imperative "statements" to functional "expressions." They are indispensable tools for building complex data processing pipelines.

-   **`ifElse`** is suitable for simple binary branch logic.
-   **`cond`** is suitable for handling multiple, flattened conditional branches.

By using them, you can write code that is more declarative, more readable, and easier to compose. Your logic is no longer "if this, do that, otherwise do something else," but rather "the final form of a value depends on which rule it satisfies." This is the essence of the functional programming mindset.
