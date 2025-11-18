# Structure Conversion: `toPairs` and `fromPairs`

In the journey of data processing, we often need to build bridges between different data structures. Objects and arrays of `[key, value]` pairs are two of the most common data structures, and being able to convert freely between them greatly enhances our data processing capabilities.

Why is this conversion so important? Because once you convert an object into an array, you can immediately use all the powerful list manipulation functions we've learned—`map`, `filter`, `sort`, `reduce`, and so on—to process the object's properties. After processing, you can then convert it back into an object.

Ramda provides the "twin" functions `toPairs` and `fromPairs` specifically for this purpose.

## `R.toPairs`: From Object to Array of Key-Value Pairs

`R.toPairs` takes an object and returns a two-dimensional array of `[key, value]` arrays.

Its signature is `toPairs(object)`.

```javascript
import { toPairs } from 'ramda';

const user = { name: 'Alice', age: 30 };

const pairs = toPairs(user);
//=> [['name', 'Alice'], ['age', 30]]
```

Now, `pairs` is an array, and we can do whatever we want with it!

### Example: Converting Object Keys

Suppose we receive data from a backend API where the keys are in `snake_case`, but our front-end code standard requires `camelCase`. We can elegantly accomplish this task by combining `toPairs`, `map`, and `fromPairs`.

```javascript
import { toPairs, fromPairs, map, pipe } from 'ramda';
import { camelCase } from 'lodash'; // Borrowing an excellent utility function

const snakeData = { first_name: 'Bob', last_name: 'Smith' };

const convertKeysToCamelCase = pipe(
  toPairs, // 1. Convert to [['first_name', 'Bob'], ['last_name', 'Smith']]
  map(([key, value]) => [camelCase(key), value]), // 2. Map over each pair, converting the key
  // Result: [['firstName', 'Bob'], ['lastName', 'Smith']]
  fromPairs // 3. Convert back to an object
);

const camelData = convertKeysToCamelCase(snakeData);
//=> { firstName: 'Bob', lastName: 'Smith' }
```

This `convertKeysToCamelCase` function is a perfect, reusable data transformation pipeline. It clearly demonstrates the "deconstruct-process-reconstruct" pattern of functional programming.

## `R.fromPairs`: From Array of Key-Value Pairs to Object

`R.fromPairs` is the inverse operation of `toPairs`. It takes an array of key-value pairs and converts it back into an object.

Its signature is `fromPairs(pairs)`.

If the input array contains duplicate keys, the later one will overwrite the earlier one, which is consistent with the behavior of `Object.assign` and the object spread syntax.

```javascript
import { fromPairs } from 'ramda';

const pairs = [['a', 1], ['b', 2], ['a', 3]];

const obj = fromPairs(pairs);
//=> { a: 3, b: 2 }
```

## Summary

`toPairs` and `fromPairs` are the bridges connecting the world of objects and the world of arrays. They are simple on their own, but when combined with Ramda's powerful list manipulation functions, they can unleash tremendous power.

-   When you need to perform **list-style** operations (like `map`, `filter`) on an object's keys or values, first convert it to an array with `toPairs`.
-   After processing the array of key-value pairs, safely convert it back to an object with `fromPairs`.

This pattern is a common technique for handling complex data transformations in functional programming. With this, we have completed our exploration of Ramda's core object manipulation tools. We have learned how to safely read, immutably update, merge, and transform objects. These skills will make you more adept at handling any JavaScript object.
