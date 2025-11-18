# Object Updating and Evolution: `assoc`, `dissoc`, and `evolve`

In functional programming, immutability is one of the core principles. When we want to "modify" an object, we are actually creating a new object that includes the new information, while the original object remains unchanged. This ensures a predictable data flow and avoids hard-to-trace side effects.

Ramda provides three key functions—`assoc`, `dissoc`, and `evolve`—for handling object updates in a purely functional way.

## `R.assoc`: Associating a New Property

`R.assoc` (associate) is the pure functional version of `obj.prop = value`. It takes a property name, a value, and an object, then returns a **new** object that includes the new value for the specified property.

Its signature is `assoc(prop, value, object)`.

```javascript
import { assoc } from 'ramda';

const user = { name: 'Alice' };

// Add an age to the user
const userWithAge = assoc('age', 30, user);
//=> { name: 'Alice', age: 30 }

// If the property already exists, it is updated
const updatedUser = assoc('name', 'Alicia', userWithAge);
//=> { name: 'Alicia', age: 30 }

console.log(user); // The original object is unaffected => { name: 'Alice' }
```

`assoc` is a core building block for reducers in state management libraries like Redux. Every time you update the state, you are essentially using an operation like `assoc` to create a new state object.

### `R.assocPath`: Deep Association

Corresponding to `path`, `assocPath` is used to "write" to deeply nested properties. It will safely create any intermediate paths that do not exist.

```javascript
import { assocPath } from 'ramda';

const user = { name: 'Bob' };

// Set the user's address and city
const userWithCity = assocPath(['address', 'city'], 'New York', user);
/*
=> {
  name: 'Bob',
  address: {
    city: 'New York'
  }
}
*/
```

## `R.dissoc`: Removing a Property

`R.dissoc` (dissociate) is the pure functional version of `delete obj.prop`. It takes a property name and an object, and returns a new object that does not contain that property.

Its signature is `dissoc(prop, object)`.

```javascript
import { dissoc } from 'ramda';

const user = { id: 1, name: 'Charlie', password: '123456' };

// Remove the sensitive password field before sending user info to the front end
const publicUser = dissoc('password', user);
//=> { id: 1, name: 'Charlie' }
```

## `R.evolve`: Declaratively "Evolving" an Object

`evolve` is one of Ramda's most powerful and unique object manipulation functions. It allows you to provide a "transformation specification" object that defines how to **evolve** certain properties of the original object.

The keys of the "transformation specification" object must be keys that exist in the original object, and the values must be functions that will be applied to the corresponding key's value in the original object.

Its signature is `evolve(transformations, object)`.

Suppose we have a game character who, upon leveling up, gets a 100-point score increase, has their health restored to the maximum of 100, and adds a "Master Sword" to their equipment list.

```javascript
import { evolve, add, always, append } from 'ramda';

const character = {
  name: 'Hero',
  score: 1500,
  hp: 85,
  equipment: ['Longsword', 'Shield'],
};

const transformations = {
  score: add(100),          // Add 100 to score
  hp: always(100),            // Set hp to 100
  equipment: append('Master Sword'), // Append an item to the equipment list
};

const evolvedCharacter = evolve(transformations, character);

/*
evolvedCharacter => {
  name: 'Hero', // Properties not defined in the spec remain unchanged
  score: 1600,
  hp: 100,
  equipment: ['Longsword', 'Shield', 'Master Sword'],
}
*/
```

The beauty of `evolve` lies in its declarative nature. The `transformations` object clearly describes how the state will "evolve" without a single imperative assignment statement. It can even handle the evolution of nested objects:

```javascript
const state = { counter: { count: 0 }, settings: { theme: 'light' } };

const nestedEvolve = {
  counter: { count: add(1) }
};

evolve(nestedEvolve, state);
//=> { counter: { count: 1 }, settings: { theme: 'light' } }
```

## Summary

`assoc`, `dissoc`, and `evolve` provide us with a complete toolkit for updating objects in an immutable way.

-   Use `assoc` to set or update a single property.
-   Use `dissoc` to remove a single property.
-   Use `evolve` when you need to apply function transformations to one or more properties—this is the most declarative and powerful way.

Mastering these functions will enable you to manage complex state changes in a safe, predictable, and highly readable manner.
