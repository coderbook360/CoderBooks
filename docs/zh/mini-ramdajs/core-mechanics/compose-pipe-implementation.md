# 8. 深入 `pipe` 与 `compose` 实现：`reduce` 的优雅变奏

在上一章，我们见识了 `pipe` 和 `compose` 如何将零散的函数串联成强大的数据处理流水线。它们是函数式编程中优雅和声明式思想的集中体现。那么，这些神奇的组合函数，在 Ramda 内部又是如何实现的呢？

答案可能会让你大吃一惊：它们的核心，仅仅是 JavaScript 数组的一个我们非常熟悉的方法——`reduce`。

## `pipe` 的实现：`reduce` 的威力

`pipe` 的作用是将一个值“喂”给第一个函数，然后将结果“喂”给第二个函数，以此类推，直到最后一个函数。这个过程，本质上就是一个“累积”计算：从一个初始值开始，用函数列表中的每一个函数去依次“处理”这个累积值。

这听起来是不是和 `reduce` 的工作方式一模一样？

`Array.prototype.reduce` 方法接收一个回调函数（reducer）和一个初始值。它会遍历数组，并将上一次回调的返回值（累加器 `acc`）和当前数组项（`current`）传入下一次回调。

让我们用 `reduce` 来亲手实现一个 `pipe`：

```javascript
const pipe = (...fns) => (initialValue) => 
  fns.reduce((acc, fn) => fn(acc), initialValue);

// --- 测试一下 ---
const add5 = x => x + 5;
const multiplyBy2 = x => x * 2;
const subtract10 = x => x - 10;

const calculate = pipe(
  add5,         // 10 + 5 = 15
  multiplyBy2,  // 15 * 2 = 30
  subtract10    // 30 - 10 = 20
);

calculate(10); // 20
```

让我们一步步分解 `calculate(10)` 的执行过程：

1.  `pipe` 返回一个函数，这个函数接收一个 `initialValue`（这里是 `10`）。
2.  `fns.reduce` 开始执行，`fns` 是 `[add5, multiplyBy2, subtract10]`。
3.  **第一次迭代**：`acc` 是 `initialValue`（`10`），`fn` 是 `add5`。`fn(acc)` 即 `add5(10)`，返回 `15`。这个 `15` 成为下一次迭代的 `acc`。
4.  **第二次迭代**：`acc` 是 `15`，`fn` 是 `multiplyBy2`。`fn(acc)` 即 `multiplyBy2(15)`，返回 `30`。这个 `30` 成为下一次迭代的 `acc`。
5.  **第三次迭代**：`acc` 是 `30`，`fn` 是 `subtract10`。`fn(acc)` 即 `subtract10(30)`，返回 `20`。
6.  `reduce` 执行完毕，返回最终的累积值 `20`。

就是这么简单！`pipe` 的优雅，源于 `reduce` 强大的累积能力。

## `compose` 的实现：`reduceRight` 的孪生兄弟

既然 `pipe` 是从左到右的 `reduce`，那么你一定能猜到 `compose` 是如何实现的了。没错，它就是 `reduce` 的孪生兄弟——`reduceRight`。

`reduceRight` 的工作方式与 `reduce` 完全相同，只是遍历数组的顺序是**从右到左**。

```javascript
const compose = (...fns) => (initialValue) =>
  fns.reduceRight((acc, fn) => fn(acc), initialValue);

// --- 测试一下 ---
const calculate = compose(
  subtract10,   // 3. 15 - 10 = 5
  multiplyBy2,  // 2. 7.5 * 2 = 15
  add5          // 1. 2.5 + 5 = 7.5
);

calculate(2.5); // 5
```

`calculate(2.5)` 的执行过程如下：

1.  `fns.reduceRight` 开始执行，`fns` 是 `[subtract10, multiplyBy2, add5]`。
2.  **第一次迭代**（从数组末尾开始）：`acc` 是 `initialValue`（`2.5`），`fn` 是 `add5`。`fn(acc)` 即 `add5(2.5)`，返回 `7.5`。
3.  **第二次迭代**：`acc` 是 `7.5`，`fn` 是 `multiplyBy2`。`fn(acc)` 即 `multiplyBy2(7.5)`，返回 `15`。
4.  **第三次迭代**：`acc` 是 `15`，`fn` 是 `subtract10`。`fn(acc)` 即 `subtract10(15)`，返回 `5`。
5.  `reduceRight` 执行完毕，返回最终结果 `5`。

## Ramda 的内部实现

Ramda 内部的 `_pipe` 和 `_compose` 实现与我们上面的版本在逻辑上是完全一致的。它只是做了一些额外的优化和处理，例如：

*   它使用了自己内部实现的 `_reduce` 函数。
*   它处理了当 `pipe` 或 `compose` 没有接收任何函数作为参数时的边界情况。
*   它对第一个函数的处理做了一点优化，因为它直接接收初始值，而不需要等待上一个函数的结果。

但其核心思想，依然是利用 `reduce`（或 `reduceRight`）将函数列表“折叠”成一个单一的值。

通过深入 `pipe` 和 `compose` 的实现，我们再次看到了函数式编程的精髓：**将复杂的问题分解成简单的、可组合的部分，然后用通用的、强大的工具（如 `reduce`）将它们粘合在一起。**

至此，我们已经完成了对 Ramda 两个核心机制——柯里化与函数组合——的探索。你现在已经掌握了 Ramda 最核心的“内功心法”。从下一部分开始，我们将进入一个全新的世界，系统地学习 Ramda 提供的丰富多样的函数，看看如何将这些“内功”应用到日常开发的各种实际场景中。