# Boolean and Comparison Operations

In functional programming, boolean logic and comparison operations are the cornerstones for building declarative, highly readable code. Ramda provides a powerful suite of utility functions for handling equality, size comparisons, and default values, enabling developers to manage conditional logic in a more functional style.

## 1. Equality Judgment (`equals`)

In JavaScript, determining if two values are "deeply equal" has always been a challenge due to the type coercion of `==` and the reference comparison limitations of `===`. Ramda's `equals` function solves this problem.

### Features of `equals`

- **Deep Comparison**: Recursively compares every property or element of an object or array.
- **Value Equality**: Returns `true` as long as the values are the same, regardless of whether the references are identical.
- **Type Safety**: Correctly handles `null`, `undefined`, and primitive values of different types.

```javascript
import { equals } from 'ramda';

// Compare primitive values
console.log(equals(1, 1)); // => true
console.log(equals('a', 'a')); // => true

// Compare arrays
console.log(equals([1, 2], [1, 2])); // => true
console.log(equals([1, 2], [2, 1])); // => false

// Compare objects
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.log(equals(obj1, obj2)); // => true
console.log(equals(obj1, obj3)); // => false
```

### Front-end Application Scenarios

In front-end frameworks like React or Vue, `equals` can be used to optimize performance. For example, in `React.memo` or `shouldComponentUpdate`, it can be used to determine if `props` have truly changed, avoiding unnecessary component re-renders.

```javascript
import { equals } from 'ramda';
import React, { memo } from 'react';

const MyComponent = memo(function MyComponent(props) {
  // ...
}, equals);
```

## 2. Size Comparison (`gt`, `gte`, `lt`, `lte`)

Ramda provides a set of functions for comparing the size of two values, and their names are very intuitive:

- `gt`: Greater than (`>`)
- `gte`: Greater than or equal to (`>=`)
- `lt`: Less than (`<`)
- `lte`: Less than or equal to (`<=`)

These functions are all automatically curried, making them ideal for composition with other functions like `filter` and `find`.

```javascript
import { filter, gt, __ } from 'ramda';

const scores = [99, 85, 100, 60, 75];

// Use the placeholder `__` to create a function that "waits for data"
const isGradeA = gt(__, 90);

const highScores = filter(isGradeA, scores); // => [99, 100]
```

In this example, `gt(__, 90)` creates a new function that checks if the passed argument is greater than 90. This "data-last" style is one of Ramda's core design principles.

## 3. Null Value Handling and Default Values

When processing function arguments or object properties, it is often necessary to check if a value is `null` or `undefined` and provide a default value.

### `isEmpty`

`isEmpty` is used to check if a value is "empty." For arrays or strings, it checks if the length is 0; for objects, it checks if there are no own properties.

```javascript
import { isEmpty } from 'ramda';

console.log(isEmpty([])); // => true
console.log(isEmpty('')); // => true
console.log(isEmpty({})); // => true
console.log(isEmpty([1])); // => false
console.log(isEmpty({ a: 1 })); // => false
console.log(isEmpty(null)); // => false (Note: null is not an "empty" collection)
console.log(isEmpty(undefined)); // => false
```

### `defaultTo`

`defaultTo` is a more general-purpose tool for default values. If the input value is `null`, `undefined`, or `NaN`, it returns the specified default value; otherwise, it returns the original value.

```javascript
import { defaultTo, pipe, prop } from 'ramda';

// Scenario: Handling potentially missing configuration items
function createComponent(config) {
  const getTheme = pipe(prop('theme'), defaultTo('light'));
  const getRetries = pipe(prop('retries'), defaultTo(3));

  const theme = getTheme(config);
  const retries = getRetries(config);

  console.log(`Theme: ${theme}, Retries: ${retries}`);
}

createComponent({ theme: 'dark' }); // => Theme: dark, Retries: 3
createComponent({}); // => Theme: light, Retries: 3
```

In this example, we use `pipe` and `prop` to safely access the properties of the configuration object. If `prop('theme')` returns `undefined`, `defaultTo('light')` takes effect, ensuring that `theme` always has a valid value.

By combining these boolean and comparison functions, you can build powerful and expressive logic flows without writing a large number of imperative `if/else` statements.
