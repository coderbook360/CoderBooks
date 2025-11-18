# 19. 结构转换：`toPairs` 与 `fromPairs`

在数据处理的旅程中，我们经常需要在不同的数据结构之间架设桥梁。对象（Object）和键值对数组（Array of `[key, value]` pairs）是两种最常见的数据结构，能够在这两者之间自由转换，会极大地增强我们的数据处理能力。

为什么这种转换如此重要？因为一旦你将对象转换成一个数组，你就可以立即使用我们之前学过的所有强大的列表操作函数——`map`、`filter`、`sort`、`reduce` 等等——来处理对象的属性。处理完毕后，再把它转换回对象。

Ramda 提供了 `toPairs` 和 `fromPairs` 这对“双子星”函数，专门用于实现这种转换。

## `R.toPairs`：从对象到键值对数组

`R.toPairs` 接受一个对象，并返回一个由 `[key, value]` 数组组成的二维数组。

它的签名是 `toPairs(object)`。

```javascript
import { toPairs } from 'ramda';

const user = { name: 'Alice', age: 30 };

const pairs = toPairs(user);
//=> [['name', 'Alice'], ['age', 30]]
```

现在，`pairs` 是一个数组，我们可以对它为所欲为了！

### 示例：转换对象 `key`

假设我们从一个后端 API 收到了数据，其中的 `key` 是下划线风格（`snake_case`），而我们的前端代码规范要求使用驼峰风格（`camelCase`）。我们可以使用 `toPairs`、`map` 和 `fromPairs` 的组合来优雅地完成这个任务。

```javascript
import { toPairs, fromPairs, map, pipe } from 'ramda';
import { camelCase } from 'lodash'; // 借用一个优秀的工具函数

const snakeData = { first_name: 'Bob', last_name: 'Smith' };

const convertKeysToCamelCase = pipe(
  toPairs, // 1. 转换为 [['first_name', 'Bob'], ['last_name', 'Smith']]
  map(([key, value]) => [camelCase(key), value]), // 2. 映射每一对，转换 key
  // 结果： [['firstName', 'Bob'], ['lastName', 'Smith']]
  fromPairs // 3. 转换回对象
);

const camelData = convertKeysToCamelCase(snakeData);
//=> { firstName: 'Bob', lastName: 'Smith' }
```

这个 `convertKeysToCamelCase` 函数是一个完美的、可复用的数据转换管道。它清晰地展示了“拆解-处理-重建”的函数式编程模式。

## `R.fromPairs`：从键值对数组到对象

`R.fromPairs` 是 `toPairs` 的逆操作。它接受一个键值对数组，并将其转换回一个对象。

它的签名是 `fromPairs(pairs)`。

如果输入的数组中有重复的 `key`，后面的会覆盖前面的，这与 `Object.assign` 和对象展开语法的行为一致。

```javascript
import { fromPairs } from 'ramda';

const pairs = [['a', 1], ['b', 2], ['a', 3]];

const obj = fromPairs(pairs);
//=> { a: 3, b: 2 }
```

## 总结

`toPairs` 和 `fromPairs` 是连接对象世界和数组世界的桥梁。它们本身很简单，但当与 Ramda 强大的列表操作函数结合使用时，它们能够释放出巨大的能量。

-   当你需要对一个对象的 `key` 或 `value` 进行**列表式**的处理（如 `map`, `filter`）时，先用 `toPairs` 将其转换成数组。
-   当处理完键值对数组后，用 `fromPairs` 将其安全地转换回对象。

这个模式是函数式编程中处理复杂数据转换的常用技巧。至此，我们已经完成了对 Ramda 对象操作核心工具的探索。我们学会了如何安全地读取、以不可变的方式更新、合并以及转换对象。这些技能将使你在处理任何 JavaScript 对象时都更加得心应手。
