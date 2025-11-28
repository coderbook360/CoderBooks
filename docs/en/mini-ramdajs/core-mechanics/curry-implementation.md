# 6. A Deep Dive into `curry` Implementation: From `_curry1` to `_curryN`

In the previous chapter, we experienced the magic of currying. It acts like a function generator, allowing us to conveniently create specialized, reusable function units. Now, you might be as curious as I am: How does Ramda implement this amazing automatic currying feature?

In this chapter, we'll play the role of code detectives and dive directly into Ramda's source code to find out. Spoiler alert: there's no real "magic" behind it, but rather a series of cleverly designed and logically rigorous internal helper functions working in concert.

## The Foundation of Everything: Function Arity

Before we begin, we must understand a key concept: **Arity**.

A function's arity is the **number of arguments it is declared to receive**. We can get this through the function's `length` property.

```javascript
const fn0 = () => {};
const fn1 = a => {};
const fn2 = (a, b) => {};

console.log(fn0.length); // 0
console.log(fn1.length); // 1
console.log(fn2.length); // 2
```

The core job of the `curry` function is to compare the **number of arguments a function expects to receive** (its `length`) with the **number of arguments it has currently received**. If they are equal, it executes the original function; if not, it returns a new function that continues to wait for the remaining arguments.

To optimize performance, Ramda provides several different versions of the `curry` implementation for functions with different arities. Let's start with the simplest one.

## `_curry1`: The Simplest Starting Point

`_curry1` is used to wrap functions that take only one argument. Its implementation is very straightforward:

```javascript
// Simplified version from Ramda's source
function _curry1(fn) {
  return function f1(a) {
    // If no arguments are provided, return f1 itself to wait for an argument
    if (arguments.length === 0) {
      return f1;
    }
    // Once an argument is received, immediately execute the original function fn
    return fn.apply(this, arguments);
  };
}
```

`_curry1` returns a new function, `f1`. If you call `f1()` without any arguments, it returns itself, continuing to wait. Once you provide an argument (e.g., `f1(10)`), it immediately executes the original `fn` function.

For example, Ramda's `R.inc` (increment) function is created using `_curry1`:

```javascript
const inc = _curry1(function(n) {
  return n + 1;
});

inc();      // Returns the inc function itself
inc(5);     // 6
```

## `_curry2`: The Art of Collecting Arguments

When a function has two arguments, things start to get interesting. `_curry2` needs to handle two scenarios: receiving both arguments at once, or receiving them one at a time.

```javascript
// Simplified version from Ramda's source
function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        // No arguments provided, return itself
        return f2;
      case 1:
        // Only one argument 'a' is provided, return a new function waiting for 'b'
        return _curry1(function(_b) {
          return fn(a, _b);
        });
      default:
        // Enough arguments provided, execute directly
        return fn.apply(this, arguments);
    }
  };
}
```

Let's analyze the behavior of `f2(a, b)`:
*   `f2()`: No arguments, returns `f2` itself.
*   `f2(10)`: Only one argument `a` (with a value of 10) is provided. It returns a **new** function wrapped by `_curry1`. This new function "remembers" that `a` is 10 and is waiting for the next argument, `_b`. Once you call this new function, for example, with `(20)`, it will execute `fn(10, 20)`.
*   `f2(10, 20)`: All arguments are provided, so it directly executes `fn(10, 20)`.

Ramda's `R.add` is a typical application of `_curry2`:

```javascript
const add = _curry2(function(a, b) {
  return a + b;
});

const add10 = add(10); // Returns a new function wrapped by _curry1
add10(20); // 30
```

## `_curryN`: The Generic Currying Engine

`_curry1` and `_curry2` are optimizations for specific arities. `_curryN`, however, is the general solution that can curry a function of any arity. Its implementation uses recursion and closures and is key to understanding Ramda's core mechanism.

```javascript
// Simplified version from Ramda's source
function _curryN(length, received, fn) {
  return function() {
    const args = [];
    let i = 0;
    // Combine the already received arguments (received) and the new arguments from this call (arguments)
    while (i < received.length) {
      args[args.length] = received[i];
      i += 1;
    }
    i = 0;
    while (i < arguments.length) {
      args[args.length] = arguments[i];
      i += 1;
    }

    // If the collected arguments are not enough, recursively call _curryN
    if (args.length < length) {
      // Return a new function that "remembers" all currently collected arguments (args)
      return _curryN(length, args, fn);
    }

    // Arguments are sufficient, execute the original function
    return fn.apply(this, args);
  };
}
```

`_curryN` accepts three parameters:
*   `length`: The number of arguments the original function expects.
*   `received`: An array containing the arguments that have already been received.
*   `fn`: The original function to be curried.

Its workflow can be summarized as follows:
1.  **Return a new function**: This new function is a natural "argument collector."
2.  **Combine arguments**: When this new function is called, it merges the previously collected arguments (`received`) with the newly passed arguments (`arguments`) into a single `args` array.
3.  **Check argument count**:
    *   If the length of `args` is **less than** the expected `length`, it means the "ingredients" are not all collected yet. It will **recursively** call `_curryN` and return **yet another** new "argument collector." This new collector will pass the current collection of `args` as its `received` parameter, thus "remembering" the previous state.
    *   If the length of `args` is **greater than or equal to** the expected `length`, it means the arguments are sufficient. It will then execute the original `fn` function with all the collected arguments.

Ultimately, Ramda's `curry` function is itself a `_curry1` that accepts a function `fn`. Then, based on the value of `fn.length`, it chooses to call `_curry1(fn)`, `_curry2(fn)`, or `_curryN(fn.length, [], fn)`.

```javascript
const curry = _curry1(function(fn) {
  const arity = fn.length;
  if (arity === 1) {
    return _curry1(fn);
  }
  return _curryN(arity, [], fn);
});
```

In this way, Ramda builds an efficient and powerful currying system. It not only provides us with an elegant functional programming interface but also ensures excellent performance through internal optimizations for common cases (arities of 1 or 2). Now, when you use a Ramda function, you have insight into the clever mechanics operating behind the scenes.
