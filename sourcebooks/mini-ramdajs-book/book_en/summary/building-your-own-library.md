# Hands-on Practice: Building Your Own Mini Functional Utility Library

Our journey is coming to an end. Now, it's time to put theory into practice and take on the final challenge. Nothing solidifies learning better than creating something with your own hands. In this chapter, we will synthesize all the knowledge gained from this book to build your very own mini functional utility library from scratch. Let's call it `mini-ramda.js`.

This process is not only the ultimate test of your learning but also a fun and creative journey. You will play the role of a library designer and implementer, making trade-offs and decisions to ultimately create a small but beautiful piece of work.

## Defining Our MVP (Minimum Viable Product)

A mature library like Ramda has hundreds of functions, and we can't possibly implement them all. We need to define a core subset as our "Minimum Viable Product." This subset should include the most commonly used functions that best embody the principles of functional programming. I have selected the following for you:

1.  **`curry`**: Currying is the soul of functional programming, so we must implement it.
2.  **`compose`**: Function composition is the foundation for building data pipelines.
3.  **`map`**: One of the most core collection operations.
4.  **`filter`**: Another core collection operation.

Just four functions, but they are enough to support a basic functional programming framework and perfectly cover all the core concepts we've discussed: higher-order functions, pure functions, currying, and function composition.

## Step 1: Implementing `curry`

We have already implemented a simplified version of `curry` in the chapter "How `_curryN` Works." Now, let's re-implement it and make it a bit more robust. Our `curry` function should automatically determine the currying depth based on the function's own `length` property (i.e., the number of expected arguments).

```javascript
// mini-ramda.js

export const curry = (fn) => {
  const arity = fn.length;

  return function curried(...args) {
    if (args.length >= arity) {
      return fn(...args);
    } else {
      return (...nextArgs) => {
        return curried(...args.concat(nextArgs));
      };
    }
  };
};
```

This implementation is very similar to our previous version, but it becomes more "intelligent" and generic by reading `fn.length`.

## Step 2: Implementing `compose`

The implementation of `compose` is very elegant and perfectly illustrates the power of `reduce`. `compose(f, g, h)` is equivalent to `(...args) => f(g(h(...args)))`. We can see that this is a right-to-left execution process, so we can use `reduceRight` to implement it.

```javascript
// mini-ramda.js

export const compose = (...fns) => 
  (initialValue) => 
    fns.reduceRight((acc, fn) => fn(acc), initialValue);

// --- Testing ---
const toUpper = (str) => str.toUpperCase();
const exclaim = (str) => `${str}!`;
const greet = (name) => `Hello, ${name}`;

const loudGreeting = compose(exclaim, toUpper, greet);
loudGreeting('world'); // => 'HELLO, WORLD!'
```

In just two lines of code, we have implemented a powerful and flexible `compose` function.

## Step 3: Implementing `map` and `filter`

Now, let's implement `map` and `filter`. To give our library a consistent "data-last" and "auto-curried" experience, we need to combine them with the `curry` function we just created.

We will follow Ramda's design pattern: first create a raw, non-curried internal implementation, and then wrap it with `curry`.

```javascript
// mini-ramda.js

// Internal implementation
const _map = (fn, list) => {
  const result = [];
  for (const item of list) {
    result.push(fn(item));
  }
  return result;
};

const _filter = (predicate, list) => {
  const result = [];
  for (const item of list) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
};

// Expose the curried versions
export const map = curry(_map);
export const filter = curry(_filter);
```

Now, our `map` and `filter` functions support currying and data-last, just like Ramda's versions!

```javascript
// --- Testing ---
const numbers = [1, 2, 3, 4, 5];

const double = (x) => x * 2;
const isEven = (x) => x % 2 === 0;

const doubleAll = map(double);
const getEvens = filter(isEven);

doubleAll(numbers); // => [2, 4, 6, 8, 10]
getEvens(numbers);  // => [2, 4]

// Composition
const doubleOfEvens = compose(doubleAll, getEvens);
doubleOfEvens(numbers); // => [4, 8]
```

## Your `mini-ramda.js`

Congratulations! You have successfully built your own mini functional utility library. Putting all the code together, it looks like this:

```javascript
// mini-ramda.js

export const curry = (fn) => {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) {
      return fn(...args);
    } else {
      return (...nextArgs) => curried(...args.concat(nextArgs));
    }
  };
};

export const compose = (...fns) => 
  (initialValue) => 
    fns.reduceRight((acc, fn) => fn(acc), initialValue);

const _map = (fn, list) => {
  const result = [];
  for (const item of list) {
    result.push(fn(item));
  }
  return result;
};

const _filter = (predicate, list) => {
  const result = [];
  for (const item of list) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
};

export const map = curry(_map);
export const filter = curry(_filter);
```

This small file embodies the core ideas of functional programming. It may be simple, but it has all the essential parts. You can try refactoring some of your old code with it or use it to start your next small project.

## The End of the Journey, and a New Beginning

This book ends here. But your functional programming journey has just begun.

You have mastered powerful mental tools and gained the ability to create tools yourself. Next, you can:

-   **Expand your library**: Try adding more functions like `reduce`, `pipe`, `assoc`, etc., to your `mini-ramda.js`.
-   **Dive into the source code**: Read the source code of Ramda, Lodash-FP, or Redux again. You will surely have a new, deeper understanding.
-   **Explore a wider world**: Learn about more advanced functional concepts like Functors, Monads, and Transducers. They will open a door to a higher level of abstraction and composition.

Remember, the essence of programming is creation. May the functional programming mindset bring clarity, elegance, and endless joy to your future creative endeavors.

Thank you for reading, and see you on the next journey!
