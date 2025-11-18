# 26. Introduction to Lenses: Focusing on Specific Parts of Data Structures

In functional programming, we always deal with immutable data. For flat data structures, tools like `assoc` or `evolve` can easily create updated copies. But when data structures become deep and complex, things start to get tricky.

Imagine a typical Redux state or a complex API response:

```javascript
const userState = {
  id: 1,
  name: 'Alice',
  account: {
    type: 'premium',
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        sms: false
      }
    }
  }
};
```

Now, if we want to toggle the `sms` setting to `true`, using Ramda's `assocPath` would look like this:

```javascript
import { assocPath } from 'ramda';

const newState = assocPath(['account', 'settings', 'notifications', 'sms'], true, userState);
```

This works, but it has several problems:

1.  **Path and Operation are Coupled**: The path `['account', 'settings', 'notifications', 'sms']` and the `assocPath` operation are tightly bound. If we want to perform a different operation on the same path (like reading or functional evolution), we need to repeat this path array.
2.  **Poor Readability and Reusability**: This path array is just plain data; it has no clear semantics. We cannot easily abstract and reuse the **concept** of "focusing on the user's SMS notification settings."

To solve this problem, functional programming introduces a powerful and elegant abstraction: the **Lens**.

## What is a Lens?

A Lens can be thought of as a first-class value that can **focus** on a specific part of a complex data structure. It's like a two-way "data channel" or "magnifying glass." Once created, you can use it to perform three core operations:

1.  **View**: Look at the data it focuses on through the Lens.
2.  **Set**: Non-destructively set a new value through the Lens, returning a brand new, updated top-level object.
3.  **Over**: Apply a transformation function to the focused data through the Lens, returning a brand new, updated top-level object.

A Lens perfectly separates the concerns of "**where**" (the path) and "**what to do**" (view/set/over).

## Creating and Using Lenses

Ramda provides several functions to create Lenses.

-   `R.lensProp(propName)`: Creates a Lens that focuses on an object's property.
-   `R.lensIndex(index)`: Creates a Lens that focuses on an array index.
-   `R.lensPath([path])`: Creates a Lens that focuses on a deep path.

Let's refactor the previous example using `lensPath`.

```javascript
import { lensPath, view, set, over, toUpper } from 'ramda';

const userState = { /* ...same as above... */ };

// 1. Create a Lens, turning the "path" concept itself into a reusable value
const smsLens = lensPath(['account', 'settings', 'notifications', 'sms']);
const themeLens = lensPath(['account', 'settings', 'theme']);

// 2. Use the Lens to perform operations

// View
const currentSmsSetting = view(smsLens, userState);
console.log(currentSmsSetting); // => false

// Set
const userWithSmsEnabled = set(smsLens, true, userState);
// userState itself is not changed
console.log(userWithSmsEnabled.account.settings.notifications.sms); // => true

// Over
const userWithUpperCaseTheme = over(themeLens, toUpper, userState);
console.log(userWithUpperCaseTheme.account.settings.theme); // => 'DARK'
```

See? `smsLens` and `themeLens` have become independent values with clear semantics. We can pass them to any function that needs to operate on these specific data points, and these functions don't need to know anything about the internal structure of `userState`.

## Lens Composition

The most powerful feature of Lenses is their **composability**. You can use `pipe` or `compose` to combine multiple simple Lenses into a complex Lens that can delve deep into complex structures.

Suppose we have two Lenses:

-   `accountLens = lensProp('account')`
-   `settingsLens = lensProp('settings')`

We can combine them:

```javascript
import { lensProp, compose, view } from 'ramda';

const accountLens = lensProp('account');
const settingsLens = lensProp('settings');

// Compose Lenses using compose (note the order is right to left)
// First focus on account, then from within account, focus on settings
const accountSettingsLens = compose(accountLens, settingsLens);

const settings = view(accountSettingsLens, userState);
console.log(settings); // => { theme: 'dark', notifications: { ... } }
```

In fact, `lensPath(['a', 'b'])` is internally equivalent to `compose(lensProp('a'), lensProp('b'))`. This reveals that `lensPath` is just a convenience shortcut.

## Summary

Lenses provide us with a declarative, composable, and reusable way to operate on deep parts of immutable data structures.

-   **Separation of Concerns**: Lenses separate the "path" (where) from the "operation" (what to do), making the "path" itself a first-class value.
-   **Core Operations**:
    -   `view`: Read a value.
    -   `set`: Set a new value.
    -   `over`: Apply a function for evolution.
-   **Composability**: Simple Lenses can be combined into complex Lenses via `compose` or `pipe` to access nested data of any depth.

When you find yourself struggling with deeply nested state, think about Lenses. They can greatly simplify your code, improve its readability and maintainability, and allow you to handle complex data structures with unprecedented elegance.
