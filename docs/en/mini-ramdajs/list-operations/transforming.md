# 13. List Transformations: `adjust`, `update`, and `insert`

We have already mastered how to process lists as a whole, such as mapping (`map`), filtering (`filter`), and reducing (`reduce`). However, in many practical scenarios, we need to perform precise, surgical operations on individual elements within a list while maintaining data immutability.

Imagine you are managing a state tree (as in Redux), and you need to:

- Update an element at a specific index in an array.
- Apply a function to an element to change it.
- Insert a new element in the middle of an array.

Directly modifying the array (e.g., `list[i] = newValue`) is imperative and creates side effects, which should be strongly avoided in functional programming. Ramda provides three functions, `update`, `adjust`, and `insert`, that allow us to accomplish these tasks in a declarative, pure-functional way.

## `R.update`: Precise Replacement

`R.update` is the most direct update function. It replaces the element at a specified index in a list with a new value and returns a brand new list.

Its signature is `update(index, value, list)`.

```javascript
import { update } from 'ramda';

const tasks = ['Learn Ramda', 'Write code', 'Drink coffee', 'Take a break'];

// Found that the third task was wrong, it should be "Drink tea"
const updatedTasks = update(2, 'Drink tea', tasks);

// updatedTasks => ['Learn Ramda', 'Write code', 'Drink tea', 'Take a break']
// tasks remains unchanged
console.log(tasks[2]); // => 'Drink coffee'
```

Since `update` is curried, we can easily create reusable "updaters":

```javascript
import { update } from 'ramda';

// Create a function that always updates the element at index 1
const updateSecond = update(1);

const correctedList = updateSecond('Corrected value', ['a', 'b', 'c']);
//=> ['a', 'Corrected value', 'c']
```

`update` is very suitable for "replacement" scenarios, where the new value is completely unrelated to the old one.

## `R.adjust`: Functional Adjustment

`R.adjust` is similar to `update` in that it acts on an element at a specified index. However, instead of a replacement value, it accepts a **transformation function**. It applies this function to the element at the specified index and replaces the element with the function's return value.

Its signature is `adjust(index, transformationFn, list)`.

Suppose we have a list of players, each with a score. We want to add 10 points to the second player's score.

```javascript
import { adjust } from 'ramda';

const players = [
  { name: 'Alice', score: 80 },
  { name: 'Bob', score: 90 },
  { name: 'Charlie', score: 85 },
];

// Add 10 to the score of the player at index 1
const updatedPlayers = adjust(1, (player) => ({
  ...player,
  score: player.score + 10,
}), players);

// updatedPlayers[1].score => 100
```

This example perfectly demonstrates the power of `adjust`. We are not simply replacing the old object with a new one, but rather calculating a new object based on the values of the old one. This is very useful when dealing with complex data structures.

## `R.insert`: Elegant Insertion

`R.insert` is used to insert a new element at a specified index in a list, shifting that element and all subsequent elements one position to the right.

Its signature is `insert(index, element, list)`.

```javascript
import { insert } from 'ramda';

const steps = ['Step 1', 'Step 2', 'Step 4'];

// Realized Step 3 was missing, so let's add it
const fullSteps = insert(2, 'Step 3', steps);

// fullSteps => ['Step 1', 'Step 2', 'Step 3', 'Step 4']
```

Like `update` and `adjust`, `insert` is also a pure function. It returns a brand new, longer array without modifying the original array.

## Summary

`update`, `adjust`, and `insert` are the "scalpels" in the Ramda toolbox for precise manipulation of list elements.

-   Use `update` when you need to **replace** an element with a completely new value.
-   Use `adjust` when you need to calculate a new value based on an element's **existing value**.
-   Use `insert` when you need to **add** a new element at a specific position in the list.

All three functions adhere to the principle of immutability, ensuring a unidirectional and predictable data flow, making them powerful assistants in building robust and maintainable functional applications.
