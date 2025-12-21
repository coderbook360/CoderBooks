# 7. 函数组合：构建声明式的数据流水线

我们已经掌握了纯函数、不可变性、柯里化等函数式编程的“零件”。现在，是时候学习如何将这些零件组装成强大的机器了。这个组装工具，就是**函数组合（Function Composition）**。

如果你觉得柯里化已经很神奇了，那么函数组合将让你真正领略到函数式编程的威力。它是一种将多个函数串联起来，创建一个新函数的方法。这个新函数就像一条数据处理的流水线，数据从一端进入，经过流水线上每个工位（函数）的处理，最终在另一端输出结果。

## 从混乱的嵌套到清晰的流水线

假设我们有一个任务：给定一个字符串，计算其中所有单词的平均长度。非函数式的做法可能充满中间变量和循环。而一种更“函数式”的思路，但未使用组合，可能会是这样：

```javascript
import { split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

// 一层又一层的函数调用，就像俄罗斯套娃
const avgWordLength = mean(map(length, split(' ', sentence)));

console.log(avgWordLength); // 3.888...
```

这段代码虽然只有一行，但阅读起来却非常费劲。你的视线需要从内到外跳跃：先 `split`，然后 `map`，最后 `mean`。这种代码的可读性很差，而且难以维护。

现在，让我们用 Ramda 的 `pipe` 函数来改造它。

## `pipe`：从左到右的数据流

`pipe` 函数接收一系列函数作为参数，并返回一个新函数。当你调用这个新函数并给它一个初始值时，这个值会像在管道（pipe）中一样，从左到右依次流过每个函数，前一个函数的输出会成为后一个函数的输入。

```javascript
import { pipe, split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

const calculateAvgWordLength = pipe(
  split(' '),   // 1. 将句子按空格分割成单词数组
  map(length),  // 2. 将单词数组映射为其长度数组
  mean          // 3. 计算长度数组的平均值
);

const avgWordLength = calculateAvgWordLength(sentence);

console.log(avgWordLength); // 3.888...
```

看到了吗？`pipe` 将之前的嵌套调用，变成了一个清晰、线性的操作序列。代码的阅读顺序和执行顺序完全一致，就像在阅读一个任务清单：

1.  先分割字符串。
2.  然后计算每个部分的长度。
3.  最后求平均值。

这种声明式的代码风格，极大地提高了可读性和可维护性。我们只关心“做什么”（`what`），而不关心“怎么做”（`how`）。

## `compose`：从右到左的数学风格

Ramda 还提供了另一个组合函数：`compose`。它的工作方式与 `pipe` 完全相同，唯一的区别是**执行顺序是从右到左**。

```javascript
import { compose, split, map, length, mean } from 'ramda';

const sentence = "the quick brown fox jumps over the lazy dog";

const calculateAvgWordLength = compose(
  mean,         // 3. 最后，计算平均值
  map(length),  // 2. 接着，计算每个单词的长度
  split(' ')    // 1. 首先，按空格分割句子
);

const avgWordLength = calculateAvgWordLength(sentence);

console.log(avgWordLength); // 3.888...
```

`compose` 的执行顺序更贴近数学中函数的组合方式，例如 `f(g(x))`。在数学上，这被称为 `(f ∘ g)(x)`。`compose(f, g)` 就等同于 `x => f(g(x))`。

**`pipe` vs `compose`：如何选择？**

*   **`pipe`** 更符合我们日常的从左到右的阅读习惯，对于描述一系列数据处理步骤来说，通常更直观。
*   **`compose`** 更贴近数学传统，一些有数学背景或习惯于传统函数式编程的开发者可能更偏爱它。

在 Ramda 中，两者没有优劣之分，选择哪一个完全取决于个人或团队的偏好。关键是保持一致性。

## 组合的力量：构建复杂的业务逻辑

函数组合的真正威力在于，它可以将我们之前学到的所有概念——纯函数、柯里化、数据置后——完美地粘合在一起，用来构建复杂而又优雅的业务逻辑。

让我们回到经典的“购物车”场景。假设我们需要计算一个用户购物车中所有“在售”商品的总价。

```javascript
import { pipe, filter, propEq, map, prop, sum } from 'ramda';

const cart = [
  { name: 'T-shirt', price: 25, status: 'on-sale' },
  { name: 'Jeans', price: 80, status: 'on-sale' },
  { name: 'Hat', price: 15, status: 'out-of-stock' },
  { name: 'Socks', price: 5, status: 'on-sale' }
];

// 1. 定义我们的“零件”函数
const isOnSale = propEq('status', 'on-sale');
const getPrice = prop('price');

// 2. 使用 pipe 组装流水线
const calculateTotal = pipe(
  filter(isOnSale), // 筛选出所有在售商品
  map(getPrice),    // 提取所有在售商品的价格
  sum               // 对所有价格求和
);

const total = calculateTotal(cart); // 110
```

这段代码是如此地清晰和富有表现力：
*   `isOnSale` 和 `getPrice` 是通过柯里化创建的、高度可复用的“判断”和“提取”工具。
*   `calculateTotal` 这条流水线，通过 `pipe` 将筛选、提取、求和这三个独立的步骤串联起来，形成了一个新的、更高级的业务函数。

我们可以轻松地修改或扩展这个流水线。比如，如果现在需要计算折扣后的总价，我们只需要在流水线中增加一个“打折”的环节即可。

这就是函数式编程的核心思想：**通过组合小的、可预测的纯函数，来构建大型、可靠的软件系统。** `pipe` 和 `compose` 就是实现这一思想的“瑞士军刀”。

在下一章，我们将再次深入源码，看看 `pipe` 和 `compose` 是如何被巧妙地实现的。