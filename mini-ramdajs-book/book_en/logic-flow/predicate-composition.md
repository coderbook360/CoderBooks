# Predicate Composition: Building Complex Logical Filters

In the previous chapter, we learned how to use predicate functions to drive `ifElse` and `cond` for functional conditional logic. Predicate functions are simple functions that return `true` or `false`, such as `isLoggedIn` or `isPlatinum`.

However, real-world business rules are often more complex. What we need may not be a single condition, but a combination of multiple conditions, for example:

-   "Filter for all products with a price below $100 **AND** a stock greater than 0." (AND)
-   "A user is active if they have logged in within the last week **OR** have posted content." (OR)
-   "Display all articles that are **NOT** in a draft state." (NOT)

In imperative programming, we would connect this logic using `&&`, `||`, and `!` operators. But in functional programming, Ramda provides a more elegant and composable way to handle this logic—predicate composition functions.

These functions allow us to piece together simple, single-responsibility predicate functions like building blocks to form complex and powerful logical filters.

## `both` and `either`: Binary Logic Composition

`both` and `either` are the most basic logical combinators, corresponding to `&&` (and) and `||` (or) logic, respectively.

-   `R.both(pred1, pred2)`: Creates a new function that returns `true` if and only if both `pred1` and `pred2` return `true`.
-   `R.either(pred1, pred2)`: Creates a new function that returns `true` as long as either `pred1` or `pred2` returns `true`.

### Front-end in Practice: User Registration Validation

Suppose during user registration, we need to validate that the password meets two conditions: it must be at least 8 characters long and contain a special character.

```javascript
import { both, either } from 'ramda';

const hasMinLength = (str) => str.length >= 8;
const hasSpecialChar = (str) => /[^A-Za-z0-9]/.test(str);

// Use both to combine the two predicates
const isPasswordValid = both(hasMinLength, hasSpecialChar);

console.log(isPasswordValid('password'));      // => false (no special character)
console.log(isPasswordValid('pass@'));         // => false (not long enough)
console.log(isPasswordValid('password@123'));  // => true (meets all conditions)
```

The `isPasswordValid` function is now an independent, reusable validation unit whose intent is very clear: "A valid password must satisfy both the minimum length requirement and the special character requirement."

## `allPass` and `anyPass`: Multi-way Logic Composition

When you have more than two conditions to combine, `both` and `either` can become cumbersome. `allPass` and `anyPass` are their "array versions," accepting an array of predicate functions.

-   `R.allPass([pred1, pred2, ...])`: Checks if the data passes **all** predicate functions.
-   `R.anyPass([pred1, pred2, ...])`: Checks if the data passes **any one** of the predicate functions.

### Front-end in Practice: Advanced Product List Filtering

Imagine a product filtering feature on an e-commerce site. A user wants to find all products that are "on sale" and are either "in stock" or "available for pre-order."

```javascript
import { allPass, anyPass, propEq, propSatisfies } from 'ramda';

const product = {
  name: 'Super Game Console',
  onSale: true,
  stock: 0,
  preOrder: true,
  category: 'Electronics'
};

// Define a set of simple predicates
const isOnSale = propEq('onSale', true);
const hasStock = propSatisfies(stock => stock > 0, 'stock');
const canPreOrder = propEq('preOrder', true);

// Combined logic: (in stock OR can be pre-ordered)
const isAvailable = anyPass([hasStock, canPreOrder]);

// Final logic: (on sale AND available)
const isEligibleForDisplay = allPass([isOnSale, isAvailable]);

console.log(isEligibleForDisplay(product)); // => true
```

In this way, we have decomposed the complex business rule `onSale && (stock > 0 || preOrder)` into several independent, easy-to-understand, and testable small functions, which are then declaratively combined.

## `complement`: Logical NOT

The `complement` function takes a function as an argument and returns a new function whose return value is always the opposite of the original function. It is the `!` (logical NOT) of functional programming.

This is very useful for improving code readability. For example, we have `R.isNil` (checks for `null` or `undefined`), but we more often need to check that a value is **not** `nil`. Writing `!R.isNil(x)` is of course possible, but `R.complement(R.isNil)` can create a semantically clearer `isNotNil` function.

```javascript
import { complement, isNil, filter } from 'ramda';

const isNotNil = complement(isNil);

const data = [1, 2, null, 4, undefined, 5];

// Use isNotNil to filter out all nil values
const cleanData = filter(isNotNil, data);

console.log(cleanData); // => [1, 2, 4, 5]
```

## Summary

Predicate composition is key to building declarative, maintainable logic in functional programming. By breaking down complex business rules into the smallest, reusable predicate units and then gluing them together with tools like `both`, `either`, `allPass`, `anyPass`, and `complement`, we gain several benefits:

-   **Readability**: `allPass([isImportant, isUnread])` more clearly expresses the intent "all conditions must pass" than `(x) => isImportant(x) && isUnread(x)`.
-   **Reusability**: Each small predicate (like `hasStock`) can be reused elsewhere in the codebase.
-   **Testability**: Testing small, pure predicate functions is far easier than testing a huge function with complex `if-else` logic.

Next time you need to write a complex `if` condition, take a moment to consider: can this logic be broken down into a series of independent predicates and then elegantly organized with Ramda's composition tools?
