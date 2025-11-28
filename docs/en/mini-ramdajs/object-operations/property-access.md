# Property Access: `prop`, `path`, and `pick`

In JavaScript, one of the most common operations is accessing object properties. Whether it's `user.name` or `data['id']`, the syntax is concise and clear. However, in the functional programming paradigm, this direct access method has two main problems:

1.  **It's not a function**: You can't pass `.` or `[]` as an argument to higher-order functions like `map`. This makes code composition difficult.
2.  **It's not safe**: If you try to access a property of a `null` or `undefined` value (e.g., `user.address.city` when `user.address` doesn't exist), the program will immediately throw a `TypeError` and crash.

Ramda provides an elegant and safe set of functions to solve these problems, with the most basic and commonly used being `prop`, `path`, and `pick`.

## `R.prop`: Safely Get a Single Property

`R.prop` is the functional replacement for `object[key]`. It takes a property name and an object, and returns the value of that property.

Its signature is `prop(propertyName, object)`.

```javascript
import { prop } from 'ramda';

const user = { name: 'Alice', age: 30 };

prop('name', user); //=> 'Alice'
```

The real advantages of `prop` are its **safety** and **composability**.

-   **Safety**: If the object is `null` or `undefined`, or if the property doesn't exist, `prop` will return `undefined` instead of throwing an error.

    ```javascript
    prop('name', null); //=> undefined
    prop('email', user); //=> undefined
    ```

-   **Composability**: Because `prop` is a function, it can be easily used in function compositions. One of the most common examples is combining it with `map` to extract all properties of the same name from an array of objects.

    ```javascript
    import { map, prop } from 'ramda';

    const users = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];

    // "Give me a list of users, I will map over it, and take the 'name' property of each user"
    const getUserNames = map(prop('name'));

    getUserNames(users); //=> ['Alice', 'Bob']
    ```
    The line `map(prop('name'))` perfectly embodies the declarative and readable nature of functional programming.

## `R.path`: Safely Access Deeply Nested Properties

When we need to access deeply nested properties like `response.data.user.profile.avatar`, the problem becomes more complex. In native JavaScript, we would need to write a long chain of `&&` checks (or use optional chaining `?.`) to avoid a `TypeError`.

`R.path` provides a perfect solution for this. It takes a path array of property names and an object.

Its signature is `path([prop1, prop2, ...], object)`.

```javascript
import { path } from 'ramda';

const apiResponse = {
  data: {
    user: {
      id: 123,
      profile: {
        name: 'Charlie',
        avatar: 'http://example.com/avatar.png'
      }
    }
  }
};

// Create a function to get the avatar URL
const getAvatarUrl = path(['data', 'user', 'profile', 'avatar']);

getAvatarUrl(apiResponse); //=> 'http://example.com/avatar.png'

// If any step in the path fails, it safely returns undefined
path(['data', 'user', 'settings', 'theme'], apiResponse); //=> undefined
```

`path` transforms tedious, imperative null checks into a declarative, reusable getter function.

## `R.pick`: Pick Multiple Properties to Form a New Object

Sometimes, we don't need a single property value, but rather to pick a few properties from a large object to form a new, smaller object. This is very useful for filtering API responses or creating Data Transfer Objects (DTOs).

`R.pick` is designed for this purpose. It takes an array of property names and an object, and returns a new object containing only those specified properties.

Its signature is `pick([prop1, prop2, ...], object)`.

```javascript
import { pick } from 'ramda';

const userProfile = {
  id: 1,
  name: 'David',
  email: 'david@example.com',
  lastLogin: '2024-10-27',
  isAdmin: false,
};

// We only want to get the user's basic information for display
const getPublicProfile = pick(['name', 'email']);

getPublicProfile(userProfile); //=> { name: 'David', email: 'david@example.com' }
```

If the property list for `pick` includes a property that the original object doesn't have, it is simply ignored.

## Summary

`prop`, `path`, and `pick` are the cornerstones of Ramda's object manipulation toolbox. They provide us with a safe, declarative, and composable way to extract information from objects.

-   Use `prop` to get a single top-level property.
-   Use `path` to safely drill down into deeply nested properties.
-   Use `pick` to select a subset of properties from a large object to create a new one.

Mastering these functions is the first step toward thinking about and handling objects in a functional way.
