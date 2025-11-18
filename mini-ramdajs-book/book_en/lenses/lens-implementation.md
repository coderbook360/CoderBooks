# 27. How Lenses Are Implemented

In the previous chapter, we witnessed the power of Lenses. They act like a precise "scalpel," allowing us to focus on and manipulate the depths of complex data structures while maintaining elegant code and data immutability. You might be as curious as I am: what kind of magic is behind this?

In fact, the core idea of a Lens is surprisingly simple. It's not magic, but a clever design pattern. By understanding its construction, you can not only use Ramda more profoundly but even build your own "lenses."

## Lens: A Combination of a "Getter" and a "Setter"

Let's first set aside Ramda's source code and start from first principles. Imagine what you need to do to operate on a part of a data structure:

1.  **Get**: Be able to retrieve the value of that part.
2.  **Set**: Be able to return a new data structure with the value of that part updated, without changing the original structure.

Isn't this the essence of a Lens? A Lens, to put it plainly, is an object that bundles "get logic" and "set logic" together.

We can use a very simple function `lens` to create such an object. This function takes two arguments: a `getter` function for reading and a `setter` function for writing.

```javascript
// A minimal lens function to create a lens object
const lens = (getter, setter) => ({
  getter,
  setter,
});
```

This `lens` function returns a plain JavaScript object containing `getter` and `setter` methods. This is the most primitive form of a "lens."

## Manually Implementing `lensProp`

Now, let's try to replicate Ramda's `lensProp` using this simplified `lens` function. `lensProp('x')` creates a Lens that focuses on the property `x` of an object.

Its `getter` logic is simple: get the property named `prop` from the object. Its `setter` logic is to update the `prop` property of the object with a new value and return a new object.

```javascript
import { assoc } from 'ramda';

// Simulate Ramda's prop and assoc functions for clarity
const prop = (key, obj) => obj[key];

// Manually implement a simplified version of lensProp
const lensProp = (key) => {
  const getter = (obj) => prop(key, obj);
  // assoc(key, value, obj) returns a new object with the value of key updated to value
  const setter = (value, obj) => assoc(key, value, obj);
  return lens(getter, setter);
};

// Create a lens focusing on the 'name' property
const nameLens = lensProp('name');

console.log(nameLens);
// Output: { getter: [Function: getter], setter: [Function: setter] }
```

See, we've successfully created a `nameLens`! It encapsulates all the logic for how to read and update the `name` property of an object.

## Implementing `view`, `set`, and `over`

With the Lens object, we also need the accompanying `view`, `set`, and `over` functions to "consume" it. The implementation of these three functions is also very straightforward.

*   **`view(lens, data)`**: Its job is to call the Lens's `getter` method and pass `data` to it.

*   **`set(lens, value, data)`**: It calls the Lens's `setter` method and passes `value` and `data` to it.

*   **`over(lens, fn, data)`**: `over` is a clever combination of `view` and `set`. It first uses `view` to read the current value, then passes this value to the transformation function `fn`, and finally uses `set` to write the calculated new value back.

Let's implement them:

```javascript
// Simplified versions of view, set, and over

const view = (lens, obj) => lens.getter(obj);

const set = (lens, value, obj) => lens.setter(value, obj);

const over = (lens, fn, obj) => {
  // 1. Use getter to read the current value
  const currentValue = view(lens, obj);
  // 2. Pass the current value to fn to calculate the new value
  const newValue = fn(currentValue);
  // 3. Use setter to write the new value back
  return set(lens, newValue, obj);
};
```

Now, let's put all the pieces together and see if our manual implementation works correctly.

```javascript
import { assoc, toUpper } from 'ramda';

// --- Our manually implemented parts ---

const lens = (getter, setter) => ({ getter, setter });

const lensProp = (key) => {
  const getter = (obj) => obj[key];
  const setter = (value, obj) => assoc(key, value, obj);
  return lens(getter, setter);
};

const view = (lens, obj) => lens.getter(obj);
const set = (lens, value, obj) => lens.setter(value, obj);
const over = (lens, fn, obj) => {
  const currentValue = view(lens, obj);
  const newValue = fn(currentValue);
  return set(lens, newValue, obj);
};

// --- Testing ---

const user = { id: 1, name: 'alice' };
const nameLens = lensProp('name');

// 1. Use view to read the name
const currentName = view(nameLens, user);
console.log('Current name:', currentName); // => 'alice'

// 2. Use set to update the name
const updatedUser = set(nameLens, 'bob', user);
console.log('Updated user:', updatedUser); // => { id: 1, name: 'bob' }
console.log('Original user:', user);     // => { id: 1, name: 'alice' } (original object remains unchanged)

// 3. Use over to transform the name
const userWithUpperName = over(nameLens, toUpper, user);
console.log('User with upper name:', userWithUpperName); // => { id: 1, name: 'ALICE' }
```

It works exactly as expected! We have successfully simulated the core behavior of a Lens through a simple combination of `getter` and `setter`.

## Ramda's Real Implementation: The Role of Functors

Of course, Ramda's actual source code is much more complex and abstract than our implementation here. It is built on a deeper functional theory: **Functors**.

In Ramda's world, a Lens's `setter` doesn't directly accept a value. Instead, it accepts a "transformation function" and a "target," and then applies this transformation function to a value inside a "container" (Functor). This allows Lenses to handle not only plain objects but also various abstract data types like `Maybe` and `Either`, and makes the composition of Lenses exceptionally powerful and flexible.

Delving into Functor theory is beyond the introductory scope of this book, but you just need to remember this core idea:

> **A Lens completely separates the concerns of "how to focus" and "how to operate."**

Functions like `lensProp` and `lensPath` are responsible for "how to focus," while `view`, `set`, and `over` are responsible for "how to operate." This separation is an excellent embodiment of the functional programming idea of "composition over inheritance."

Through this chapter, you should have understood that Lenses are not unattainable magic. They are an elegant design, the core of which is to encapsulate the logic of reading and writing. The next time you use `R.over(R.lensPath([...]), ...)`, a clear picture of the `getter` and `setter` working together should come to your mind.
