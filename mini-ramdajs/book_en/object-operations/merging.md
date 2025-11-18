# Object Merging: `merge` and `mergeDeep`

In software development, merging objects is a very common operation. Typical scenarios include:

-   Overriding default configurations with user-provided ones.
-   Combining data from multiple sources into a single, unified view model.
-   In a Redux reducer, merging a new slice of data into the current state.

JavaScript's spread syntax (`{...obj1, ...obj2}`) is a common way to perform a shallow merge. Ramda provides functions like `merge` and `mergeDeep`, which not only offer a functional interface but also solve the pain points of deep merging.

## `R.merge`: Purely Functional Shallow Merging

`R.merge` takes two objects and merges them into a new one. If both objects have the same property, the value from the second object will overwrite the one from the first.

Its signature is `merge(obj1, obj2)`.

```javascript
import { merge } from 'ramda';

const defaults = { theme: 'light', showNotifications: true, layout: 'compact' };
const userConfig = { showNotifications: false, layout: 'spacious' };

// Merge user configuration onto the default configuration
const finalConfig = merge(defaults, userConfig);

// finalConfig => { theme: 'light', showNotifications: false, layout: 'spacious' }
```

`merge` is a pure function; it does not modify any input objects but returns a brand-new object. Since it is curried, we can create reusable merging functions:

```javascript
import { merge } from 'ramda';

const applyUserConfig = merge(defaults);

const config1 = applyUserConfig({ theme: 'dark' });
//=> { theme: 'dark', showNotifications: true, layout: 'compact' }

const config2 = applyUserConfig({ showNotifications: false });
//=> { theme: 'light', showNotifications: false, layout: 'compact' }
```

### The Limitation of `merge`: Nested Objects

`merge` is a **shallow merge** function. This means if a property value is itself an object, it will be completely replaced by the nested object from the second object, rather than merging their internal properties.

```javascript
import { merge } from 'ramda';

const defaults = { user: { name: 'Default', email: 'default@example.com' } };
const partialUpdate = { user: { email: 'updated@example.com' } };

const result = merge(defaults, partialUpdate);

// result => { user: { email: 'updated@example.com' } }
// Note: the user.name property was lost!
```

This is often not the desired outcome. To solve this, Ramda provides `mergeDeep`.

## `R.mergeDeep`: Recursive Deep Merging

`R.mergeDeep` recursively merges two objects. When it encounters nested objects on the same property in both objects, it goes one level deeper to merge those nested objects instead of simply replacing them.

Its signature is `mergeDeep(obj1, obj2)`.

Let's redo the example above with `mergeDeep`:

```javascript
import { mergeDeep } from 'ramda';

const defaults = { user: { name: 'Default', email: 'default@example.com' } };
const partialUpdate = { user: { email: 'updated@example.com' } };

const result = mergeDeep(defaults, partialUpdate);

// result => { user: { name: 'Default', email: 'updated@example.com' } }
// This time, the user.name property is preserved!
```

`mergeDeep` is the ideal tool for handling complex configurations or deep state updates. It ensures you don't accidentally lose other nested data during a partial update.

## `mergeWith` and `mergeDeepWith`

Ramda also provides `mergeWith` and `mergeDeepWith`, which offer ultimate flexibility for merge operations. Both functions accept an additional argument: a **merging function**.

When two objects have a value on the same `key`, Ramda will call the merging function you provide, passing the `key`, `value1`, and `value2` as arguments, allowing you to decide what the final value should be.

For example, suppose we want to merge two objects, but for properties whose values are arrays, we want to concatenate the arrays instead of replacing them.

```javascript
import { mergeWith, concat } from 'ramda';

const obj1 = { id: 1, values: [10, 20] };
const obj2 = { id: 2, values: [30, 40] };

const customMerge = mergeWith((key, val1, val2) => {
  if (key === 'values') {
    return concat(val1, val2); // If it's the values property, concatenate the arrays
  }
  return val2; // Otherwise, use the second value
});

customMerge(obj1, obj2);
//=> { id: 2, values: [10, 20, 30, 40] }
```

## Summary

Ramda's `merge` family of functions provides powerful and flexible tools for object merging.

-   Use `merge` for fast, functional **shallow merging**.
-   Use `mergeDeep` for **deep merging** when you need to handle nested objects and want to preserve data at all levels.
-   Use `mergeWith` or `mergeDeepWith` when you need complete custom control over merge conflicts.

By choosing the right merge strategy, you can build data transformation logic that is both robust and expressive.
