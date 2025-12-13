# 14. 排序与去重：`sort` 与 `uniq`

在数据处理的流水线中，排序和去重是两个非常常见的需求。无论是按价格对商品进行排序，还是确保一个 ID 列表的唯一性，我们都需要可靠且符合函数式思想的工具来完成这些任务。

原生 JavaScript 的 `Array.prototype.sort()` 方法有一个致命的缺陷：它会**就地修改**原数组，这是一个非常危险的副作用。Ramda 提供了 `R.sort` 和 `R.uniq`，它们都是纯函数，会返回一个全新的、经过处理的数组，而让原始数据保持原样。

## `R.sort`：纯函数式排序

`R.sort` 接受一个比较函数和一个列表，并根据比较函数的逻辑返回一个排序后的新列表。

它的签名是 `sort(comparator, list)`。

比较函数 `comparator(a, b)` 应该返回：
- 如果 `a` 应该排在 `b` 前面，返回一个负数。
- 如果 `a` 和 `b` 相等，返回 `0`。
- 如果 `a` 应该排在 `b` 后面，返回一个正数。

### 排序数字

对数字进行排序是最简单的场景。Ramda 的 `subtract` 函数天生就是一个完美的数字比较器。

```javascript
import { sort, subtract } from 'ramda';

const numbers = [4, 2, 8, 6, 1];

// 升序排序
const ascending = sort(subtract);
as_numbers = ascending(numbers); //=> [1, 2, 4, 6, 8]

// 降序排序，只需交换 a 和 b 的位置
const descending = sort((a, b) => subtract(b, a));
desc_numbers = descending(numbers); //=> [8, 6, 4, 2, 1]

console.log(numbers); // 原数组保持不变 => [4, 2, 8, 6, 1]
```

### 排序对象

在前端开发中，我们更常需要根据对象的某个属性进行排序。`R.ascend` 和 `R.descend` 是专门为此设计的辅助函数。

它们接受一个“投影函数”（用于从对象中提取要比较的值），并返回一个可用于 `sort` 的比较器。

```javascript
import { sort, ascend, descend, prop } from 'ramda';

const products = [
  { name: 'Laptop', price: 1200 },
  { name: 'Mouse', price: 25 },
  { name: 'Keyboard', price: 100 },
];

// 按价格升序排序
const byPriceAsc = sort(ascend(prop('price')));
sorted_products_asc = byPriceAsc(products);
//=> [{ name: 'Mouse', price: 25 }, { name: 'Keyboard', price: 100 }, { name: 'Laptop', price: 1200 }]

// 按价格降序排序
const byPriceDesc = sort(descend(prop('price')));
sorted_products_desc = byPriceDesc(products);
//=> [{ name: 'Laptop', price: 1200 }, { name: 'Keyboard', price: 100 }, { name: 'Mouse', price: 25 }]
```

`ascend(prop('price'))` 实际上创建了一个比较函数，它会先对两个对象应用 `prop('price')`，然后再比较得出的价格。这种方式非常声明式，代码意图清晰。

## `R.uniq`：移除重复项

`R.uniq` 会移除列表中的重复元素，只保留第一次出现的值。

它的签名是 `uniq(list)`。

```javascript
import { uniq } from 'ramda';

const tags = ['react', 'redux', 'react', 'css', 'redux'];

const uniqueTags = uniq(tags);
//=> ['react', 'redux', 'css']
```

`uniq` 使用 `R.equals` 进行相等性比较，因此它可以处理原始类型和深层结构相等的对象。

## `R.uniqBy`：根据函数计算结果去重

有时，我们判断重复的标准不是值本身，而是值的某个属性或计算结果。例如，我们可能认为 ID 相同的两个用户对象是重复的，即使它们其他属性不同。

`R.uniqBy` 允许我们提供一个函数，它会先对列表中的每个元素应用该函数，然后根据函数的**返回值**来判断唯一性。

它的签名是 `uniqBy(fn, list)`。

```javascript
import { uniqBy, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alicia' }, // id 重复
];

// 根据 id 属性去重
const uniqueUsers = uniqBy(prop('id'), users);
//=> [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

`uniqBy` 保留的是第一个遇到的元素。在上面的例子中，`{ id: 1, name: 'Alicia' }` 被认为是重复项并被移除了。

`sort` 和 `uniq` 系列函数是数据清理和准备阶段的重要工具。它们遵循函数式编程的纯粹性和不可变性原则，使我们能够安全、可靠地构建复杂的数据处理流程。
