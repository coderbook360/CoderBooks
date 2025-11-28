# 15. 分组与聚合：`groupBy` 与 `countBy`

我们已经探索了多种处理列表数据的方法，但很多时候，我们需要将扁平的列表转换成更具结构性的数据，以便于分析和展示。分组（Grouping）就是这样一种强大的操作，它能将列表中的元素按照某个标准进行分类。

Ramda 提供了 `groupBy` 和 `countBy` 两个核心函数，用于满足不同的分组和聚合需求。

## `R.groupBy`：将列表转换为分组对象

`R.groupBy` 接受一个函数和一个列表，它会对列表中的每个元素应用该函数，并根据函数的**返回值**将元素进行分组。最终，它会返回一个对象，其中 `key` 是函数返回的字符串，`value` 是一个包含所有匹配该 `key` 的元素的数组。

它的签名是 `groupBy(fn, list)`。

### 示例：按博客文章的年份分组

假设我们有一个博客文章列表，我们想按年份将它们归档。

```javascript
import { groupBy, prop } from 'ramda';

const posts = [
  { title: 'Post 1', year: '2023' },
  { title: 'Post 2', year: '2024' },
  { title: 'Post 3', year: '2023' },
  { title: 'Post 4', year: '2024' },
];

// 创建一个按年份分组的函数
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

`groupBy(prop('year'))` 创建了一个可复用的分组函数，它的意图非常清晰：“按年份分组”。这种声明式的方式使得代码易于理解和维护。

`groupBy` 的本质是 `reduce` 操作的一种高级封装。实际上，我们在 `reduce` 章节中已经手动实现过一个类似的 `groupByAuthor` 函数，而 `groupBy` 则是更通用、更强大的版本。

## `R.countBy`：统计每个分组的数量

有时，我们不关心分组后的具体元素，只关心每个分组中有**多少**个元素。`R.countBy` 就是为此设计的。

它的工作方式与 `groupBy` 类似，接受一个函数和一个列表。但它返回的不是一个 `key -> [value]` 的对象，而是一个 `key -> count` 的对象。

它的签名是 `countBy(fn, list)`。

### 示例：统计不同类别的商品数量

假设我们有一个商品列表，需要统计每个类别的商品有多少件。

```javascript
import { countBy, prop } from 'ramda';

const products = [
  { name: 'Laptop', category: 'Electronics' },
  { name: 'T-shirt', category: 'Apparel' },
  { name: 'Mouse', category: 'Electronics' },
  { name: 'Jeans', category: 'Apparel' },
  { name: 'Keyboard', category: 'Electronics' },
];

// 创建一个按类别计数的函数
const countByCategory = countBy(prop('category'));

const categoryCounts = countByCategory(products);

// categoryCounts => { Electronics: 3, Apparel: 2 }
```

`countBy` 让我们能够非常方便地从原始数据中提取出聚合信息，这对于生成报告、图表或仪表盘数据非常有用。

## 总结

`groupBy` 和 `countBy` 是从列表数据中提取结构化信息的强大工具，它们是列表操作这一章的完美收官。

-   当你需要将一个列表**转换**为一个按类别划分的对象时，使用 `groupBy`。
-   当你只需要**统计**每个类别的项目数量时，使用 `countBy`。

通过组合使用本章学习的 `map`、`filter`、`reduce`、`sort`、`groupBy` 等函数，你已经可以构建出非常复杂和强大的数据处理管道，以一种声明式、可读且无副作用的方式来操作任何列表数据。至此，我们完成了对 Ramda 列表操作瑞士军刀的全面探索。
