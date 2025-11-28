# 9. Iteration and Mapping: A Functional Interpretation of `map` and `forEach`

Welcome to the third part of this book. In front-end development, the data structure we deal with the most is probably the array (or list). Whether it's processing data from the backend or managing the application's internal state, list operations are ubiquitous. Ramda provides us with an extremely powerful and rich "Swiss army knife" that makes handling lists more elegant and efficient than ever before.

We will start with two of the most basic and important functions: `map` and `forEach`.

## `R.map`: The Functional Transformation Engine

You are certainly no stranger to JavaScript's native `Array.prototype.map` method. It takes a function, executes it on each element of the array, and returns a **new array** containing all the execution results.

Ramda's `R.map` does the same thing, but with a few key differences that embody Ramda's design philosophy.

**Key Difference 1: Function First, Data Last**

*   **Native `map`**: `array.map(fn)`
*   **Ramda `map`**: `R.map(fn, array)`

We have repeatedly emphasized this pattern. Placing the data (`array`) as the last argument allows `R.map` to be easily curried.

**Key Difference 2: Automatic Currying**

Combined with the first point, `R.map`'s automatic currying ability makes it a star member in function composition.

Suppose we have a list of users and we want to extract all their email addresses.

```javascript
import { pipe, map, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

// Native map implementation, difficult to use directly in composition
const getEmailsNative = (userList) => userList.map(user => user.email);

// Ramda's way
const getEmails = map(prop('email'));

const emails = getEmails(users); // ['alice@example.com', 'bob@example.com']
```

`map(prop('email'))` creates a new, highly specialized function `getEmails`. The sole purpose of this function is to "extract the `email` property of all objects in a list." It is a reusable tool waiting for data (the user list).

Now, we can very naturally place it in a `pipe` pipeline:

```javascript
import { pipe, filter, propEq, map, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'admin' }
];

const getAdminNames = pipe(
  filter(propEq('role', 'admin')), // 1. Filter out admins
  map(prop('name'))               // 2. Extract their names
);

const adminNames = getAdminNames(users); // ['Alice', 'Charlie']
```

`map(prop('name'))` perfectly plays the role of a "workstation" in the pipeline here, receiving the output of the previous `filter` step and transforming it into the data format needed for the next step.

## `R.forEach`: The Correct Way to Handle Side Effects

The core mission of `map` is **data transformation**. It takes an array and returns a **new, transformed** array, which is a core feature of a pure function.

But sometimes, what we need is not to transform data, but to use data to **perform certain actions**, such as printing logs, updating the DOM, sending requests to the server, etc. These operations are all **Side Effects**.

This is where `R.forEach` comes in. Like `R.map`, it also takes a function and an array and executes the function on each element of the array. But it has two major differences:

1.  **It always returns the original array**. It doesn't care about the return value of the function you pass in; its purpose is not transformation.
2.  Its existence is for **handling side effects**.

```javascript
import { forEach } from 'ramda';

const numbers = [1, 2, 3];

const printItem = (item) => console.log(`Item is: ${item}`);

const result = forEach(printItem, numbers);
// The console will print in order:
// "Item is: 1"
// "Item is: 2"
// "Item is: 3"

console.log(result); // [1, 2, 3] (returns the original array)
```

**`map` vs `forEach`: An Important Choice**

In functional programming, it is very important to clearly distinguish between pure transformations and side effects. This is a mental shift:

*   **When you need to create a new array from an existing one, use `map`.** Even if you need to do some calculations in the `map` callback, your ultimate goal is to `return` a new value.

    ```javascript
    // Correct use of map
    const double = x => x * 2;
    const doubledNumbers = map(double, [1, 2, 3]); // [2, 4, 6]
    ```

*   **When you just want to perform an action on each item of the array and don't need a new array, use `forEach`.**

    ```javascript
    // Incorrectly using map to perform side effects
    let sum = 0;
    map(x => { sum += x }, [1, 2, 3]); // This is a bad smell, map is used for side effects

    // Correctly using forEach
    let sum = 0;
    forEach(x => { sum += x }, [1, 2, 3]);
    ```

`forEach` is like a clearly marked "side effect zone" in the functional world. It tells the reader of the code: "Attention, some interaction with the outside world will happen here." This clear distinction allows the main body of our codebase to remain pure while elegantly handling those unavoidable side effects.

`R.forEach` is also automatically curried, which means you can also create specialized "action" functions and use them at the end of a `pipe` to trigger side effects, such as logging the final calculation result.

```javascript
import { pipe, map, sum, forEach } from 'ramda';

const prices = [10.5, 20, 8.75];

const logTotal = pipe(
  map(Math.round), // Round to the nearest integer
  sum,             // Sum them up
  (total) => `Final total is: ${total}`, // Format the string
  console.log      // Perform the side effect: print the log
);

logTotal(prices); // "Final total is: 39"
```

Mastering the correct use cases for `map` and `forEach` is the first step to writing clear, maintainable functional code. In the following chapters, we will see more powerful list operation functions built on this idea.
