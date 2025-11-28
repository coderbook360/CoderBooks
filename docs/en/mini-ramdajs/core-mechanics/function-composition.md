# 7. Function Composition: Building Declarative Data Pipelines

We have already mastered the "parts" of functional programming like pure functions, immutability, and currying. Now, it's time to learn how to assemble these parts into a powerful machine. This assembly tool is **Function Composition**.

If you thought currying was magical, function composition will show you the true power of functional programming. It's a method of chaining multiple functions together to create a new one. This new function acts like a data processing pipeline: data enters one end, is processed by each station (function) on the line, and the final result is output at the other end.

## From Messy Nesting to a Clear Pipeline

Let's say we have a task: given a string, calculate the average length of all the words in it. A non-functional approach might be full of intermediate variables and loops. A more "functional" way of thinking, but without using composition, might look like this:

```javascript
import { split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

// Layer after layer of function calls, like a Russian doll
const avgWordLength = mean(map(length, split(' ', sentence)));

console.log(avgWordLength); // 3.888...
```

Although this code is just one line, it's very difficult to read. Your eyes have to jump from the inside out: first `split`, then `map`, and finally `mean`. This kind of code has poor readability and is hard to maintain.

Now, let's refactor it using Ramda's `pipe` function.

## `pipe`: A Left-to-Right Data Flow

The `pipe` function takes a series of functions as arguments and returns a new function. When you call this new function with an initial value, that value flows through each function from left to right, as if in a pipe. The output of the previous function becomes the input for the next.

```javascript
import { pipe, split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

const calculateAvgWordLength = pipe(
  split(' '),   // 1. Split the sentence into an array of words
  map(length),  // 2. Map the array of words to an array of their lengths
  mean          // 3. Calculate the mean of the array of lengths
);

const avgWordLength = calculateAvgWordLength(sentence);

console.log(avgWordLength); // 3.888...
```

See? `pipe` transforms the previous nested calls into a clear, linear sequence of operations. The reading order of the code is identical to the execution order, just like reading a to-do list:

1.  First, split the string.
2.  Then, calculate the length of each part.
3.  Finally, find the average.

This declarative style of code greatly improves readability and maintainability. We only care about "what" to do, not "how" to do it.

## `compose`: A Right-to-Left Mathematical Style

Ramda also provides another composition function: `compose`. It works exactly the same way as `pipe`, with the only difference being that the **execution order is from right to left**.

```javascript
import { compose, split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

const calculateAvgWordLength = compose(
  mean,         // 3. Finally, calculate the mean
  map(length),  // 2. Next, calculate the length of each word
  split(' ')    // 1. First, split the sentence by spaces
);

const avgWordLength = calculateAvgWordLength(sentence);

console.log(avgWordLength); // 3.888...
```

The execution order of `compose` is closer to the way functions are composed in mathematics, such as `f(g(x))`. In mathematics, this is denoted as `(f ∘ g)(x)`. `compose(f, g)` is equivalent to `x => f(g(x))`.

**`pipe` vs `compose`: How to Choose?**

*   **`pipe`** is more aligned with our natural left-to-right reading habit. It's often more intuitive for describing a series of data processing steps.
*   **`compose`** is closer to mathematical tradition. Some developers with a background in mathematics or who are accustomed to traditional functional programming may prefer it.

In Ramda, neither is superior to the other. The choice depends entirely on personal or team preference. The key is to be consistent.

## The Power of Composition: Building Complex Business Logic

The true power of function composition lies in its ability to perfectly glue together all the concepts we've learned so far—pure functions, currying, data-last—to build complex yet elegant business logic.

Let's return to the classic "shopping cart" scenario. Suppose we need to calculate the total price of all "on-sale" items in a user's shopping cart.

```javascript
import { pipe, filter, propEq, map, prop, sum } from 'ramda';

const cart = [
  { name: 'T-shirt', price: 25, status: 'on-sale' },
  { name: 'Jeans', price: 80, status: 'on-sale' },
  { name: 'Hat', price: 15, status: 'out-of-stock' },
  { name: 'Socks', price: 5, status: 'on-sale' }
];

// 1. Define our "part" functions
const isOnSale = propEq('status', 'on-sale');
const getPrice = prop('price');

// 2. Assemble the pipeline with pipe
const calculateTotal = pipe(
  filter(isOnSale), // Filter for all on-sale items
  map(getPrice),    // Extract the prices of all on-sale items
  sum               // Sum all the prices
);

const total = calculateTotal(cart); // 110
```

This code is so clear and expressive:
*   `isOnSale` and `getPrice` are highly reusable "predicate" and "extractor" tools created through currying.
*   The `calculateTotal` pipeline, using `pipe`, chains together the three independent steps of filtering, extracting, and summing to form a new, higher-level business function.

We can easily modify or extend this pipeline. For example, if we now need to calculate the total price after a discount, we just need to add a "discount" step to the pipeline.

This is the core idea of functional programming: **building large, reliable software systems by composing small, predictable pure functions.** `pipe` and `compose` are the "Swiss Army knives" for implementing this idea.

In the next chapter, we will once again dive deep into the source code to see how `pipe` and `compose` are cleverly implemented.
