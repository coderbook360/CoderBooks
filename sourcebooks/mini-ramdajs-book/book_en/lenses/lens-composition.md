# 28. Lens Composition: Building More Powerful Data Manipulation Pipelines

In the previous chapters, we understood how a single Lens works, acting like a probe that precisely points to a specific location in a data structure. However, the most exciting feature of Lenses is their "composability." Like Lego bricks, simple Lenses can be assembled into more complex and powerful structures, allowing us to navigate to any depth of nested data in a declarative way.

Ramda does not provide a specific function called `composeLenses` because the ability to compose is built into the design philosophy of Lenses. This composition is usually achieved through `R.compose` or `R.pipe`, just as we compose regular functions.

## The Essence of Lens Composition

What are we actually doing when we write `R.compose(lensA, lensB)`?

Let's go back to the essence of a Lens: a collection of `{ getter, setter }`. Composing two Lenses is, in fact, composing their `getter`s and `setter`s.

-   **Composing `getter`s**: The new `getter` of `compose(lensA, lensB)` will first use the `getter` of `lensB` to get a value from the data, and then immediately pass this result to the `getter` of `lensA`. This forms a path: `data -> lensB -> lensA`.

-   **Composing `setter`s**: The composition of `setter`s is a bit more complex. It creates a nested update path. When you set a value, the `setter` of `lensB` wraps an "update operation" outside the `setter` of `lensA`. This means the update starts from the innermost `lensA`, then `lensB`, returning new data structures layer by layer.

Sounds a bit abstract? Don't worry, an example will make everything clear.

## In Practice: Manually Composing Lenses

Suppose we have a nested user state object like this, which is very common in Redux or other front-end state management:

```javascript
const userState = {
  id: 1,
  account: {
    type: 'premium',
    settings: {
      theme: 'dark',
    },
  },
};
```

We want to directly manipulate the innermost `theme` property. We can create three simple `lensProp`s:

-   `accountLens`: Focuses on the `account` property.
-   `settingsLens`: Focuses on the `settings` property.
-   `themeLens`: Focuses on the `theme` property.

In Ramda, we can compose them like this:

```javascript
import { compose, lensProp, view, over, toUpper } from 'ramda';

const accountLens = lensProp('account');
const settingsLens = lensProp('settings');
const themeLens = lensProp('theme');

// Compose the three Lenses into a super Lens pointing to theme
// Note the order: from right to left, the one closest to the data is on the far right
const themePathLens = compose(accountLens, settingsLens, themeLens);
```

This `themePathLens` is now a "shortcut" that can directly access `theme` from `userState`. It is equivalent to the `lensPath(['account', 'settings', 'theme'])` we used before.

Let's see how it works:

```javascript
// Read a value using the composed Lens
const currentTheme = view(themePathLens, userState);
console.log(currentTheme); // => 'dark'

// Update a value using the composed Lens
const userWithLightTheme = over(themePathLens, () => 'light', userState);
console.log(userWithLightTheme.account.settings.theme); // => 'light'

// Again, the original object remains unchanged
console.log(userState.account.settings.theme); // => 'dark'
```

## Why Can `compose` Compose Lenses?

You might ask, isn't `compose` for composing functions? Why can it compose Lens objects?

This is the beauty of Ramda's design. Ramda's `compose` function is smart enough that it doesn't just chain functions together. When it detects that the arguments are Lenses (or more accurately, objects that conform to a specific functional interface), it adopts a different composition strategy—namely, the `getter` and `setter` composition logic we discussed above.

This capability is known as "function overloading" or "polymorphism." It allows the same function (like `compose`) to exhibit different behaviors based on the input type, greatly enhancing the expressiveness and consistency of the code.

## The Power of Composition: Dynamics and Reusability

The true power of Lens composition lies in its dynamism and reusability.

Imagine in a complex form application, you might have a `formLens` pointing to the entire form state. Then, based on user interaction, you can dynamically compose it with `fieldLens('username')` or `fieldLens('password')` to create temporary Lenses pointing to specific input fields.

```javascript
const formLens = lensProp('form');
const fieldLens = (fieldName) => lensProp(fieldName);

// Dynamically create a Lens pointing to the username field
const usernameLens = compose(formLens, fieldLens('username'));

// Dynamically create a Lens pointing to the password field
const passwordLens = compose(formLens, fieldLens('password'));

// ... then you can use usernameLens and passwordLens to view, set, over the state
```

This approach is much more flexible than writing a long `lensPath(['form', 'username'])` and is more in line with the "building blocks" programming philosophy. You can pre-define a batch of basic Lenses and then assemble them like building blocks whenever you need to construct any data path you require.

Through composition, a Lens is upgraded from a simple "probe" to a powerful "data path construction system." It allows us to handle the ubiquitous complex state in front-end applications in a declarative, reusable, and extremely elegant way, which is the core reason why Lenses are highly respected in functional front-end development.
