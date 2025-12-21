# 11. 聚合与归约：`reduce` 的函数式升华

我们已经学习了 `map`（转换）和 `filter`（筛选）。现在，我们将深入探讨一个更底层、更强大的函数，它被誉为函数式编程的“瑞士军刀之母”——`reduce`。

`reduce`，也常被称为“折叠”（fold）或“注入”（inject），是列表操作的基石。从理论上讲，几乎所有其他的列表操作（包括 `map` 和 `filter`）都可以用 `reduce` 来实现。理解了 `reduce`，你就能更深刻地洞悉列表转换的本质。

## `reduce` 的核心思想

`reduce` 的核心思想是**将一个列表“归约”成一个单一的值**。这个“单一的值”可以是任何东西：一个数字（如总和）、一个字符串、一个对象，甚至是一个新的数组。

它就像一个雪球从山顶滚下，越滚越大。`reduce` 从一个**初始值**（雪球的核心）开始，然后遍历列表中的每一个元素，通过一个你提供的**归约函数（Reducer）**，将当前元素“揉”进雪球里，形成一个更大的雪球（**累加器**），然后继续这个过程，直到所有元素都被“吸收”。

`R.reduce` 接收三个参数：
1.  **归约函数 `(accumulator, value) => newAccumulator`**：这是核心逻辑，它定义了如何将当前值 `value` 合并到累加器 `accumulator` 中，并返回新的累加器。
2.  **初始值 `initialAccumulator`**：累加器的起始状态。
3.  **列表 `list`**：要被归约的列表。

```javascript
import { reduce } from 'ramda';

// 归约函数：(acc, val) => acc + val
const add = (a, b) => a + b;

// 初始值：0
// 列表：[1, 2, 3, 4, 5]
reduce(add, 0, [1, 2, 3, 4, 5]); // 15
```

执行过程如下：
*   初始 `acc` = `0`
*   `add(0, 1)` -> `acc` 变为 `1`
*   `add(1, 2)` -> `acc` 变为 `3`
*   `add(3, 3)` -> `acc` 变为 `6`
*   `add(6, 4)` -> `acc` 变为 `10`
*   `add(10, 5)` -> `acc` 变为 `15`
*   遍历结束，返回最终的 `acc`：`15`。

## `reduce` 的应用场景

`reduce` 的应用远不止于简单的求和。

### 场景1：将列表转换为对象（分组）

假设我们有一个帖子列表，我们想按作者 ID 对它们进行分组。

```javascript
import { reduce, assoc, append } from 'ramda';

const posts = [
  { author: 'jane', content: 'Post 1' },
  { author: 'john', content: 'Post 2' },
  { author: 'jane', content: 'Post 3' }
];

const groupByAuthor = (acc, post) => {
  const { author } = post;
  // 如果累加器中还没有这个作者的键，就创建一个空数组
  const currentPosts = acc[author] || [];
  // 使用 Ramda 的 assoc 和 append (均为纯函数) 来更新对象和数组
  return assoc(author, append(post, currentPosts), acc);
};

reduce(groupByAuthor, {}, posts);
// {
//   jane: [ { author: 'jane', content: 'Post 3' }, { author: 'jane', content: 'Post 1' } ],
//   john: [ { author: 'john', content: 'Post 2' } ]
// }
```

在这个例子中，初始值是一个空对象 `{}`，最终的归约结果是一个将帖子按作者名分组的新对象。

### 场景2：用 `reduce` 实现 `map`

为了证明 `reduce` 的强大，让我们用它来实现 `map` 的功能。

```javascript
const mapWithReduce = (fn, list) => 
  reduce((acc, val) => append(fn(val), acc), [], list);

const double = x => x * 2;
mapWithReduce(double, [1, 2, 3]); // [2, 4, 6]
```

这里的逻辑是：
*   初始值是一个空数组 `[]`。
*   对于列表中的每个 `val`，我们先用 `fn(val)` 计算出新值。
*   然后用 `append` 将这个新值添加到累加器数组 `acc` 中，形成新的累加器。
*   最终，我们就得到了一个全新的、经过映射的数组。

### 场景3：用 `reduce` 实现 `filter`

同样，我们也可以用 `reduce` 实现 `filter`。

```javascript
const filterWithReduce = (predicate, list) =>
  reduce((acc, val) => predicate(val) ? append(val, acc) : acc, [], list);

const isEven = n => n % 2 === 0;
filterWithReduce(isEven, [1, 2, 3, 4, 5]); // [2, 4]
```

这里的逻辑是：
*   初始值依然是一个空数组 `[]`。
*   对于列表中的每个 `val`，我们用谓词函数 `predicate(val)` 进行判断。
*   如果判断为 `true`，我们就用 `append` 将这个 `val` 添加到累加器中；如果为 `false`，我们什么都不做，直接返回原有的累加器 `acc`。

## `reduceRight`

与 `compose` 和 `pipe` 的关系类似，Ramda 也提供了 `reduceRight`，它和 `reduce` 的唯一区别是遍历列表的顺序是**从右到左**。

```javascript
const subtract = (a, b) => a - b;

reduce(subtract, 0, [1, 2, 3, 4]);      // (((0 - 1) - 2) - 3) - 4 = -10
reduceRight(subtract, 0, [1, 2, 3, 4]); // 4 - (3 - (2 - (1 - 0))) = 2
```

在大多数情况下，`reduce` 更为常用。但在处理某些特定算法或需要模拟 `compose` 行为时，`reduceRight` 会非常有用。

`reduce` 是一个需要花时间去消化和理解的概念，因为它比 `map` 或 `filter` 更抽象。但一旦你真正掌握了它，你就会发现自己拥有了一把能够解决几乎所有列表处理问题的“万能钥匙”。它迫使你从“累积”和“归约”的角度去思考问题，这正是函数式编程思维的核心之一。