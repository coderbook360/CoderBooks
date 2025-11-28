# 10. Filtering and Finding: Precise Guidance with `filter` and `find`

If `map` is the engine for data transformation, then `filter` is the radar for data screening. In daily development, we rarely need to process the entire content of a list. More often, we are only interested in a subset that meets specific conditions. Ramda's `filter` and `find` functions are the precision-guided tools born for this purpose.

## `R.filter`: Your Data Goalkeeper

`R.filter` has the same purpose as the native `Array.prototype.filter`: it takes a **predicate function** and a list, and returns a **new list** containing only those elements that make the predicate function return `true`.

A **predicate function** is a function that returns a boolean value (`true` or `false`). You can think of it as a "goalkeeper" that checks each incoming element and decides whether to "let it pass" (`true`) or "intercept it" (`false`).

Similarly, `R.filter` follows Ramda's design philosophy:

```javascript
import { filter } from 'ramda';

const isEven = n => n % 2 === 0;

filter(isEven, [1, 2, 3, 4, 5]); // [2, 4]
```

Thanks to automatic currying, we can easily create specialized filtering functions:

```javascript
const getEvenNumbers = filter(isEven);

getEvenNumbers([1, 2, 3, 4, 5]); // [2, 4]
getEvenNumbers([10, 15, 20]);   // [10, 20]
```

### Composing Predicate Functions

The real power of `filter` lies in our ability to combine it with other utility functions provided by Ramda to build expressive and reusable predicate functions.

Suppose we have a list of products and we want to filter out all "on-sale" items with a price below 50.

```javascript
import { pipe, filter, allPass, propEq, prop, lt } from 'ramda';

const products = [
  { name: 'T-shirt', price: 25, status: 'on-sale' },
  { name: 'Jeans', price: 80, status: 'on-sale' },
  { name: 'Hat', price: 45, status: 'out-of-stock' },
  { name: 'Socks', price: 5, status: 'on-sale' }
];

// Build our predicate functions
const isOnSale = propEq('status', 'on-sale'); // Predicate 1: Is the status 'on-sale'?
const isCheaperThan50 = pipe(prop('price'), lt(__, 50)); // Predicate 2: Is the price less than 50?
// Note: lt(a, b) checks if a < b. lt(__, 50) creates a function that waits for a value and checks if it is less than 50.

// Use allPass to combine multiple predicates into one
const isTargetProduct = allPass([isOnSale, isCheaperThan50]);

const getTargetProducts = filter(isTargetProduct);

getTargetProducts(products); 
// [ 
//   { name: 'T-shirt', price: 25, status: 'on-sale' },
//   { name: 'Socks', price: 5, status: 'on-sale' }
// ]
```

In this example:
*   We defined two simple, single-purpose predicate functions: `isOnSale` and `isCheaperThan50`.
*   We used `R.allPass`, a powerful tool that takes an array of predicate functions and returns a new predicate function. This new predicate returns `true` only if **all** of the inner predicates return `true`.
*   Finally, `filter(isTargetProduct)` creates a semantically clear and reusable filter.

## `R.find`: Find Only the First

`filter` always returns an array, even if only one element satisfies the condition, or if no elements satisfy it (returns an empty array). But often, we are only interested in the **first** element that satisfies the condition.

This is where `R.find` comes in. Its usage is exactly the same as `filter`, taking a predicate function and a list, but with a difference:

*   It returns the **first** element that makes the predicate function `true`.
*   If no matching element is found, it returns `undefined`.

```javascript
import { find, propEq } from 'ramda';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const findUserById = (id, userList) => find(propEq('id', id), userList);

findUserById(2, users); // { id: 2, name: 'Bob' }
findUserById(99, users); // undefined
```

`find` is very useful when you need to look up a single entity by a unique identifier.

## `R.reject`: The Antonym of `filter`

`reject` is the perfect partner for `filter`. It also takes a predicate function and a list, but it **discards** all elements that make the predicate return `true` and keeps the rest.

```javascript
import { reject } from 'ramda';

const isOdd = n => n % 2 !== 0;

reject(isOdd, [1, 2, 3, 4, 5]); // [2, 4]
```

The result of `reject(isOdd, list)` is exactly the same as `filter(isEven, list)`. In fact, `reject` is logically equivalent to `filter` plus `complement`.

`R.complement` is a very useful little tool that takes a function and returns a new function whose return value is always the opposite of the original function.

```javascript
import { complement } from 'ramda';

const isEven = n => n % 2 === 0;
const isOdd = complement(isEven);

isOdd(3); // true
isOdd(4); // false
```

So, `reject(fn)` is equivalent to `filter(complement(fn))`.

With `filter`, `find`, `reject`, and various predicate utility functions, Ramda allows us to express complex filtering logic in a declarative and composable way. We no longer need to write nested `if` statements or complex loops. Instead, we combine simple "rules" (predicates) to build powerful and easy-to-understand data filters.
