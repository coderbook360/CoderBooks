# 8. A Deep Dive into `pipe` and `compose` Implementation: An Elegant Variation of `reduce`

In the previous chapter, we saw how `pipe` and `compose` chain individual functions into powerful data processing pipelines. They are the epitome of the elegance and declarative thinking in functional programming. So, how are these magical composition functions implemented internally in Ramda?

The answer might surprise you: at their core is a very familiar JavaScript array method—`reduce`.

## The Implementation of `pipe`: The Power of `reduce`

The purpose of `pipe` is to "feed" a value to the first function, then feed the result to the second function, and so on, until the last function. This process is essentially an "accumulation" calculation: starting with an initial value, each function in the list is used to sequentially "process" this accumulated value.

Doesn't this sound exactly like how `reduce` works?

The `Array.prototype.reduce` method takes a callback function (the reducer) and an initial value. It iterates over the array, passing the return value of the previous callback (the accumulator `acc`) and the current array item (`current`) to the next callback.

Let's implement `pipe` ourselves using `reduce`:

```javascript
const pipe = (...fns) => (initialValue) =>
  fns.reduce((acc, fn) => fn(acc), initialValue);

// --- Let's test it ---
const add5 = x => x + 5;
const multiplyBy2 = x => x * 2;
const subtract10 = x => x - 10;

const calculate = pipe(
  add5,         // 10 + 5 = 15
  multiplyBy2,  // 15 * 2 = 30
  subtract10    // 30 - 10 = 20
);

calculate(10); // 20
```

Let's break down the execution of `calculate(10)` step by step:

1.  `pipe` returns a function that accepts an `initialValue` (which is `10` here).
2.  `fns.reduce` starts executing, where `fns` is `[add5, multiplyBy2, subtract10]`.
3.  **First iteration**: `acc` is the `initialValue` (`10`), and `fn` is `add5`. `fn(acc)` is `add5(10)`, which returns `15`. This `15` becomes the `acc` for the next iteration.
4.  **Second iteration**: `acc` is `15`, and `fn` is `multiplyBy2`. `fn(acc)` is `multiplyBy2(15)`, which returns `30`. This `30` becomes the `acc` for the next iteration.
5.  **Third iteration**: `acc` is `30`, and `fn` is `subtract10`. `fn(acc)` is `subtract10(30)`, which returns `20`.
6.  `reduce` finishes, returning the final accumulated value, `20`.

It's that simple! The elegance of `pipe` comes from the powerful accumulation capability of `reduce`.

## The Implementation of `compose`: The Twin of `reduceRight`

Since `pipe` is a left-to-right `reduce`, you can probably guess how `compose` is implemented. That's right, it's the twin of `reduce`—`reduceRight`.

`reduceRight` works exactly like `reduce`, but it iterates through the array in **right-to-left** order.

```javascript
const compose = (...fns) => (initialValue) =>
  fns.reduceRight((acc, fn) => fn(acc), initialValue);

// --- Let's test it ---
const calculate = compose(
  subtract10,   // 3. 15 - 10 = 5
  multiplyBy2,  // 2. 7.5 * 2 = 15
  add5          // 1. 2.5 + 5 = 7.5
);

calculate(2.5); // 5
```

The execution of `calculate(2.5)` is as follows:

1.  `fns.reduceRight` starts executing, where `fns` is `[subtract10, multiplyBy2, add5]`.
2.  **First iteration** (starting from the end of the array): `acc` is the `initialValue` (`2.5`), and `fn` is `add5`. `fn(acc)` is `add5(2.5)`, which returns `7.5`.
3.  **Second iteration**: `acc` is `7.5`, and `fn` is `multiplyBy2`. `fn(acc)` is `multiplyBy2(7.5)`, which returns `15`.
4.  **Third iteration**: `acc` is `15`, and `fn` is `subtract10`. `fn(acc)` is `subtract10(15)`, which returns `5`.
5.  `reduceRight` finishes, returning the final result, `5`.

## Ramda's Internal Implementation

Ramda's internal `_pipe` and `_compose` implementations are logically identical to our versions above. It just adds some extra optimizations and handling, such as:

*   It uses its own internal `_reduce` function.
*   It handles the edge case where `pipe` or `compose` are called with no function arguments.
*   It slightly optimizes the handling of the first function, as it directly receives the initial value without waiting for a previous function's result.

But the core idea remains the same: using `reduce` (or `reduceRight`) to "fold" a list of functions into a single value.

By diving deep into the implementation of `pipe` and `compose`, we once again see the essence of functional programming: **breaking down complex problems into simple, composable parts, and then gluing them together with general-purpose, powerful tools like `reduce`.**

With this, we have completed our exploration of Ramda's two core mechanisms—currying and function composition. You have now mastered the most fundamental "internal skills" of Ramda. Starting from the next section, we will enter a whole new world, systematically learning the rich variety of functions Ramda offers and seeing how to apply these "internal skills" to various real-world development scenarios.
