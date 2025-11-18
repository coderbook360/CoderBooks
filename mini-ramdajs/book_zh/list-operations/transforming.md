# 13. 列表变换：`adjust`、`update` 与 `insert`

我们已经掌握了如何从整体上处理列表，例如映射 (`map`)、筛选 (`filter`) 和规约 (`reduce`)。然而，在许多实际场景中，我们需要对列表中的单个元素进行精确的外科手术式操作，同时保持数据的不可变性。

想象一下，你正在管理一个状态树（比如在 Redux 中），你需要：

- 更新数组中某个特定索引的元素。
- 对某个元素应用一个函数来改变它。
- 在数组的中间插入一个新元素。

直接修改数组（如 `list[i] = newValue`）是命令式的，并且会产生副作用，这在函数式编程中是需要极力避免的。Ramda 提供了 `update`、`adjust` 和 `insert` 三个函数，让我们能够以一种声明式、纯函数的方式完成这些任务。

## `R.update`：精确替换

`R.update` 是最直接的更新函数。它用一个新值替换掉列表中指定索引的元素，并返回一个全新的列表。

它的签名是 `update(index, value, list)`。

```javascript
import { update } from 'ramda';

const tasks = ['学习 Ramda', '编写代码', '喝咖啡', '休息一下'];

// 发现第三个任务写错了，应该是“喝茶”
const updatedTasks = update(2, '喝茶', tasks);

// updatedTasks => ['学习 Ramda', '编写代码', '喝茶', '休息一下']
// tasks 保持不变
console.log(tasks[2]); // => '喝咖啡'
```

由于 `update` 是柯里化的，我们可以轻松创建可复用的“更新器”：

```javascript
import { update } from 'ramda';

// 创建一个总是更新索引为 1 的元素的函数
const updateSecond = update(1);

const correctedList = updateSecond('订正后的值', ['a', 'b', 'c']);
//=> ['a', '订正后的值', 'c']
```

`update` 非常适合用于“替换”场景，即新值与旧值完全无关。

## `R.adjust`：函数式调整

`R.adjust` 与 `update` 类似，都作用于指定索引的元素。但它接受的不是一个替换值，而是一个**转换函数**。它会将这个函数应用到指定索引的元素上，并用函数的返回值替换该元素。

它的签名是 `adjust(index, transformationFn, list)`。

假设我们有一个玩家列表，每个玩家都有一个分数。现在要给第二个玩家加 10 分。

```javascript
import { adjust, add } from 'ramda';

const players = [
  { name: 'Alice', score: 80 },
  { name: 'Bob', score: 90 },
  { name: 'Charlie', score: 85 },
];

// 对索引为 1 的玩家的分数加 10
const updatedPlayers = adjust(1, (player) => ({
  ...player,
  score: player.score + 10,
}), players);

// updatedPlayers[1].score => 100
```

这个例子完美地展示了 `adjust` 的威力。我们不是简单地用一个新对象替换旧对象，而是基于旧对象的值进行计算，生成一个新对象。这在处理复杂数据结构时非常有用。

## `R.insert`：优雅插入

`R.insert` 用于在列表的指定索引处插入一个新元素，并将该索引及之后的所有元素向后移动一位。

它的签名是 `insert(index, element, list)`。

```javascript
import { insert } from 'ramda';

const steps = ['第一步', '第二步', '第四步'];

// 发现漏了第三步，赶紧补上
const fullSteps = insert(2, '第三步', steps);

// fullSteps => ['第一步', '第二步', '第三步', '第四步']
```

与 `update` 和 `adjust` 一样，`insert` 也是一个纯函数，它会返回一个全新的、更长的数组，而不会修改原始数组。

## 总结

`update`、`adjust` 和 `insert` 是 Ramda 工具库中用于精确操作列表元素的“手术刀”。

-   当你需要用一个全新的值**替换**一个元素时，使用 `update`。
-   当你需要基于一个元素的**现有值**来计算新值时，使用 `adjust`。
-   当你需要在列表的特定位置**添加**一个新元素时，使用 `insert`。

这三个函数都遵循不可变性原则，确保了数据流的单向和可预测性，是构建健壮、可维护的函数式应用的得力助手。
