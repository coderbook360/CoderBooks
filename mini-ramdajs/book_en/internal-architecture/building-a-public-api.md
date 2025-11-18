# 31. Building a Public API: The Case of `R.map`

We have separately explored Ramda's architectural philosophy and its core helper functions, `_curryN` and `_dispatchable`. Now, it's time to put all these pieces together and see how a familiar public API—`R.map`—is born from lines of source code. This process perfectly demonstrates how Ramda integrates the elegance, high performance, and flexibility of functional programming.

The construction process of `R.map` follows the classic "three-step" model we mentioned earlier:

1.  **Define the internal core logic (`_map`)**
2.  **Enhance it with `_dispatchable` to support method dispatching**
3.  **Wrap it with `_curry2` to support auto-currying**

Let's go through it step by step.

## Step 1: Internal Core Logic `_map`

Deep within Ramda's `internal` directory, there exists a function named `_map`. This is the most primitive and core implementation of the `map` functionality. Its responsibility is very pure: to receive a transformation function `fn` and an array (or other iterable object), and then return a new array containing the transformed elements.

This internal function has several key characteristics:

-   **Non-curried**: It is a regular JavaScript function that expects to receive all its arguments at once.
-   **High-performance**: It is usually implemented using a `for` or `while` loop, which is one of the fastest ways to process arrays in JavaScript, avoiding the overhead of function calls and closures.
-   **No dispatching considered**: It doesn't care if the incoming `list` argument has its own `.map` method; it is only responsible for implementing the most general `map` logic.

A highly simplified implementation of `_map` might look like this:

```javascript
// A simplified version of Ramda's internal _map function
function _map(fn, list) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    result[i] = fn(list[i]);
  }
  return result;
}
```

This function is simple and efficient, but it is still "raw" and lacks the elegant features we expect from a Ramda function.

## Step 2: Enhancement and Dispatching with `_dispatchable`

Next, Ramda uses the `_dispatchable` "enhancer" to wrap `_map`. The purpose of this step is to make our `map` function "intelligent," able to leverage potentially optimized methods that the incoming object itself may have.

```javascript
// Pseudo-code showing the composition process

// Assuming _dispatchable and _map already exist

// Create a dispatchable map function
// The first argument ['map'] tells _dispatchable to use the object's .map method if it exists
// The second argument _map is the fallback, used if the object has no .map method
const dispatchedMap = _dispatchable(['map'], _map);
```

Now, `dispatchedMap` has the ability to:

-   If you call `dispatchedMap(fn, [1, 2, 3])`, it will detect that the array `[1, 2, 3]` has a native `.map` method and will directly execute `[1, 2, 3].map(fn)`, which is usually the fastest.
-   If you call `dispatchedMap(fn, someCustomObject)` and `someCustomObject` does not have a `.map` method, it will fall back to using our previously defined `_map` function.

This step is key to how Ramda strikes a balance between "elegance" and "performance."

## Step 3: Currying with `_curry2`

So far, `dispatchedMap` is still a regular, non-curried function. The final step, and the last process for the user-facing API, is to wrap it with `_curry2` to turn it into the familiar, auto-curried Ramda function we know.

Why `_curry2`? Because the `map` function takes a total of two arguments: the transformation function `fn` and the data `list`.

```javascript
// Pseudo-code showing the final wrapping

// Assuming _curry2 and dispatchedMap already exist

// The final version exposed to the public
const map = _curry2(dispatchedMap);
```

After being wrapped by `_curry2`, the `map` function now has all the features we expect:

-   `map(fn, list)`: Works normally when all arguments are provided at once.
-   `map(fn)(list)`: Works with currying when arguments are provided one at a time.
-   `const doubleList = map(double)`: When only the first argument is provided, it returns a "specialized" new function `doubleList` that is waiting to receive a `list`.

## The Final `R.map`

So, when you write `import { map } from 'ramda'` in your code, the `map` function you get can be understood as being constructed internally like this:

```javascript
// The complete build process of R.map (conceptual model)

const map = _curry2(
  _dispatchable(
    ['map'], 
    _map
  )
);
```

This is Ramda's building philosophy: **start with the purest, most efficient internal implementation, gradually add functionality (like dispatching) through layers of function composition and wrapping, and finally, give it a uniform, elegant external interface (currying)**.

This process is like a precision assembly line. The raw material input is pure algorithmic logic, and the finished product is a set of powerful, consistent, and user-friendly functional tools for developers. Once you understand how `R.map` is born, you understand the secret to how almost all Ramda functions are built.
