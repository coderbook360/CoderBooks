# 14. Sorting and Deduplication: `sort` and `uniq`

In the data processing pipeline, sorting and deduplication are two very common requirements. Whether it's sorting products by price or ensuring the uniqueness of a list of IDs, we need reliable and functional tools to accomplish these tasks.

The native JavaScript `Array.prototype.sort()` method has a fatal flaw: it **modifies the original array in place**, which is a very dangerous side effect. Ramda provides `R.sort` and `R.uniq`, which are both pure functions that return a new, processed array, leaving the original data untouched.

## `R.sort`: Purely Functional Sorting

`R.sort` takes a comparator function and a list, and returns a new sorted list based on the logic of the comparator function.

Its signature is `sort(comparator, list)`.

The comparator function `comparator(a, b)` should return:
- A negative number if `a` should come before `b`.
- `0` if `a` and `b` are equal.
- A positive number if `a` should come after `b`.

### Sorting Numbers

Sorting numbers is the simplest scenario. Ramda's `subtract` function is a perfect number comparator by nature.

```javascript
import { sort, subtract } from 'ramda';

const numbers = [4, 2, 8, 6, 1];

// Ascending sort
const ascending = sort(subtract);
const as_numbers = ascending(numbers); //=> [1, 2, 4, 6, 8]

// Descending sort, just swap the positions of a and b
const descending = sort((a, b) => subtract(b, a));
const desc_numbers = descending(numbers); //=> [8, 6, 4, 2, 1]

console.log(numbers); // The original array remains unchanged => [4, 2, 8, 6, 1]
```

### Sorting Objects

In front-end development, we more often need to sort objects based on one of their properties. `R.ascend` and `R.descend` are helper functions designed specifically for this.

They take a "projection function" (used to extract the value to be compared from the object) and return a comparator that can be used with `sort`.

```javascript
import { sort, ascend, descend, prop } from 'ramda';

const products = [
  { name: 'Laptop', price: 1200 },
  { name: 'Mouse', price: 25 },
  { name: 'Keyboard', price: 100 },
];

// Sort by price in ascending order
const byPriceAsc = sort(ascend(prop('price')));
const sorted_products_asc = byPriceAsc(products);
//=> [{ name: 'Mouse', price: 25 }, { name: 'Keyboard', price: 100 }, { name: 'Laptop', price: 1200 }]

// Sort by price in descending order
const byPriceDesc = sort(descend(prop('price')));
const sorted_products_desc = byPriceDesc(products);
//=> [{ name: 'Laptop', price: 1200 }, { name: 'Keyboard', price: 100 }, { name: 'Mouse', price: 25 }]
```

`ascend(prop('price'))` actually creates a comparator function that first applies `prop('price')` to both objects and then compares the resulting prices. This approach is very declarative, and the code's intent is clear.

## `R.uniq`: Removing Duplicates

`R.uniq` removes duplicate elements from a list, keeping only the first occurrence of each value.

Its signature is `uniq(list)`.

```javascript
import { uniq } from 'ramda';

const tags = ['react', 'redux', 'react', 'css', 'redux'];

const uniqueTags = uniq(tags);
//=> ['react', 'redux', 'css']
```

`uniq` uses `R.equals` for equality comparison, so it can handle primitive types and objects with deep structural equality.

## `R.uniqBy`: Deduplication Based on a Function's Calculation Result

Sometimes, the criterion for judging duplicates is not the value itself, but a property or calculation result of the value. For example, we might consider two user objects with the same ID to be duplicates, even if their other properties are different.

`R.uniqBy` allows us to provide a function. It will first apply this function to each element in the list, and then judge uniqueness based on the function's **return value**.

Its signature is `uniqBy(fn, list)`.

```javascript
import { uniqBy, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alicia' }, // duplicate id
];

// Deduplicate based on the id property
const uniqueUsers = uniqBy(prop('id'), users);
//=> [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

`uniqBy` keeps the first element it encounters. In the example above, `{ id: 1, name: 'Alicia' }` is considered a duplicate and is removed.

The `sort` and `uniq` series of functions are important tools in the data cleaning and preparation phase. They follow the principles of purity and immutability of functional programming, enabling us to build complex data processing flows safely and reliably.
