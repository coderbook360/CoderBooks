# 15. Grouping and Aggregation: `groupBy` and `countBy`

We have explored various ways to process list data, but often, we need to transform a flat list into more structured data for easier analysis and presentation. Grouping is such a powerful operation that can classify elements in a list according to a certain standard.

Ramda provides two core functions, `groupBy` and `countBy`, to meet different grouping and aggregation needs.

## `R.groupBy`: Converting a List into a Grouped Object

`R.groupBy` takes a function and a list. It applies the function to each element in the list and groups the elements based on the function's **return value**. Ultimately, it returns an object where the `key` is the string returned by the function, and the `value` is an array containing all elements that match that `key`.

Its signature is `groupBy(fn, list)`.

### Example: Grouping Blog Posts by Year

Suppose we have a list of blog posts and we want to archive them by year.

```javascript
import { groupBy, prop } from 'ramda';

const posts = [
  { title: 'Post 1', year: '2023' },
  { title: 'Post 2', year: '2024' },
  { title: 'Post 3', year: '2023' },
  { title: 'Post 4', year: '2024' },
];

// Create a function to group posts by year
const groupPostsByYear = groupBy(prop('year'));

const postsByYear = groupPostsByYear(posts);

/*
postsByYear => {
  '2023': [
    { title: 'Post 1', year: '2023' },
    { title: 'Post 3', year: '2023' }
  ],
  '2024': [
    { title: 'Post 2', year: '2024' },
    { title: 'Post 4', year: '2024' }
  ]
}
*/
```

`groupBy(prop('year'))` creates a reusable grouping function with a very clear intent: "group by year." This declarative style makes the code easy to understand and maintain.

The essence of `groupBy` is a high-level encapsulation of the `reduce` operation. In fact, we have already manually implemented a similar `groupByAuthor` function in the `reduce` chapter, and `groupBy` is a more general and powerful version.

## `R.countBy`: Counting the Number of Items in Each Group

Sometimes, we don't care about the specific elements after grouping, but only **how many** elements are in each group. `R.countBy` is designed for this.

It works similarly to `groupBy`, taking a function and a list. But instead of returning a `key -> [value]` object, it returns a `key -> count` object.

Its signature is `countBy(fn, list)`.

### Example: Counting the Number of Products in Different Categories

Suppose we have a list of products and need to count how many items are in each category.

```javascript
import { countBy, prop } from 'ramda';

const products = [
  { name: 'Laptop', category: 'Electronics' },
  { name: 'T-shirt', category: 'Apparel' },
  { name: 'Mouse', category: 'Electronics' },
  { name: 'Jeans', category: 'Apparel' },
  { name: 'Keyboard', category: 'Electronics' },
];

// Create a function to count by category
const countByCategory = countBy(prop('category'));

const categoryCounts = countByCategory(products);

// categoryCounts => { Electronics: 3, Apparel: 2 }
```

`countBy` allows us to very conveniently extract aggregated information from raw data, which is very useful for generating reports, charts, or dashboard data.

## Summary

`groupBy` and `countBy` are powerful tools for extracting structured information from list data, and they are the perfect conclusion to this chapter on list operations.

-   Use `groupBy` when you need to **transform** a list into an object divided by category.
-   Use `countBy` when you only need to **count** the number of items in each category.

By combining the `map`, `filter`, `reduce`, `sort`, `groupBy`, and other functions learned in this chapter, you can already build very complex and powerful data processing pipelines to operate on any list data in a declarative, readable, and side-effect-free way. With this, we have completed our comprehensive exploration of Ramda's Swiss army knife for list operations.
