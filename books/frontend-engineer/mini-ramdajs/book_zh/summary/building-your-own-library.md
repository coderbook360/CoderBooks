
# 33. 动手实践：构建你自己的迷你函数式工具库

我们的旅程即将结束，现在，是时候将理论付诸实践，迎接最终的挑战了。没有什么比亲手创造更能巩固所学。在这一章，我们将综合运用本书学到的所有知识，从零开始构建一个属于你自己的、迷你版的函数式工具库，我们姑且称之为 `mini-ramda.js`。

这个过程不仅是对你学习成果的终极检验，更是一次充满乐趣的创造之旅。你将扮演一个库的设计者和实现者，去权衡、去决策，最终打造出一个小而美的作品。

## 确定我们的 MVP（最小可行产品）

一个成熟的库如 Ramda 有数百个函数，我们不可能全部实现。我们需要定义一个核心子集，作为我们的“最小可行产品”。这个子集应该包含那些最常用、最能体现函数式编程思想的函数。我为你挑选了以下几个：

1.  **`curry`**: 柯里化是函数式编程的灵魂，我们必须实现它。
2.  **`compose`**: 函数组合是构建数据管道的基础。
3.  **`map`**: 最核心的集合操作之一。
4.  **`filter`**: 另一个核心的集合操作。

仅仅四个函数，但它们足以支撑起一个基本的函数式编程框架，并且完美地覆盖了我们之前探讨过的所有核心概念：高阶函数、纯函数、柯里化、函数组合。

## 第一步：实现 `curry`

我们已经在“`_curryN` 的工作原理”一章中实现过一个简化版的 `curry`。现在，让我们重新实现它，并让它变得更健壮一些。我们的 `curry` 函数应该能根据函数自身的 `length` 属性（即函数期望的参数个数）来自动判断柯里化的深度。

```javascript
// mini-ramda.js

export const curry = (fn) => {
  const arity = fn.length;

  return function curried(...args) {
    if (args.length >= arity) {
      return fn(...args);
    } else {
      return (...nextArgs) => {
        return curried(...args.concat(nextArgs));
      };
    }
  };
};
```

这个实现与我们之前的版本非常相似，但它通过读取 `fn.length` 变得更加“智能”和通用。

## 第二步：实现 `compose`

`compose` 的实现非常优雅，它完美地诠释了 `reduce` 的威力。`compose(f, g, h)` 等价于 `(...args) => f(g(h(...args)))`。我们可以看到，这是一个从右到左的执行过程，所以我们可以使用 `reduceRight` 来实现它。

```javascript
// mini-ramda.js

export const compose = (...fns) => 
  (initialValue) => 
    fns.reduceRight((acc, fn) => fn(acc), initialValue);

// --- 测试 ---
const toUpper = (str) => str.toUpperCase();
const exclaim = (str) => `${str}!`;
const greet = (name) => `Hello, ${name}`;

const loudGreeting = compose(exclaim, toUpper, greet);
loudGreeting('world'); // => 'HELLO, WORLD!'
```

仅仅两行代码，我们就实现了一个强大、灵活的 `compose` 函数。

## 第三步：实现 `map` 和 `filter`

现在，让我们来实现 `map` 和 `filter`。为了让我们的库拥有一致的“数据后置”和“自动柯里化”体验，我们需要将它们与我们刚刚创建的 `curry` 函数组合起来。

我们将遵循 Ramda 的设计模式：先创建一个原始的、非柯里化的内部实现，然后再用 `curry` 进行包装。

```javascript
// mini-ramda.js

// 内部实现
const _map = (fn, list) => {
  const result = [];
  for (const item of list) {
    result.push(fn(item));
  }
  return result;
};

const _filter = (predicate, list) => {
  const result = [];
  for (const item of list) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
};

// 柯里化后对外暴露
export const map = curry(_map);
export const filter = curry(_filter);
```

现在，我们的 `map` 和 `filter` 也像 Ramda 的版本一样，支持柯里化和数据后置了！

```javascript
// --- 测试 ---
const numbers = [1, 2, 3, 4, 5];

const double = (x) => x * 2;
const isEven = (x) => x % 2 === 0;

const doubleAll = map(double);
const getEvens = filter(isEven);

doubleAll(numbers); // => [2, 4, 6, 8, 10]
getEvens(numbers);  // => [2, 4]

// 组合使用
const doubleOfEvens = compose(doubleAll, getEvens);
doubleOfEvens(numbers); // => [4, 8]
```

## 你的 `mini-ramda.js`

恭喜你！你已经成功地构建了自己的迷你函数式工具库。把所有代码放在一起，它看起来是这样的：

```javascript
// mini-ramda.js

export const curry = (fn) => {
  const arity = fn.length;
  return function curried(...args) {
    if (args.length >= arity) {
      return fn(...args);
    } else {
      return (...nextArgs) => curried(...args.concat(nextArgs));
    }
  };
};

export const compose = (...fns) => 
  (initialValue) => 
    fns.reduceRight((acc, fn) => fn(acc), initialValue);

const _map = (fn, list) => {
  const result = [];
  for (const item of list) {
    result.push(fn(item));
  }
  return result;
};

const _filter = (predicate, list) => {
  const result = [];
  for (const item of list) {
    if (predicate(item)) {
      result.push(item);
    }
  }
  return result;
};

export const map = curry(_map);
export const filter = curry(_filter);
```

这个小小的文件，凝聚了函数式编程最核心的思想。它虽然简单，但五脏俱全。你可以尝试用它来重构你的一些旧代码，或者用它来开始你的下一个小项目。

## 旅程的终点，也是新的起点

这本书到这里就结束了。但你的函数式编程之旅，才刚刚开始。

你已经掌握了强大的思维工具，也拥有了亲手创造工具的能力。接下来，你可以去：

-   **扩展你的库**：尝试为你的 `mini-ramda.js` 添加 `reduce`, `pipe`, `assoc` 等更多函数。
-   **深入源码**：再去阅读 Ramda, Lodash-FP, 或者 Redux 的源码，相信你会有全新的、更深刻的理解。
-   **探索更广阔的世界**：去了解 Functor, Monad, Transducer 等更高级的函数式概念，它们会为你打开一扇通往更高度抽象和组合能力的大门。

记住，编程的本质是创造。愿函数式编程的思维，能为你未来的创造之旅，带来清晰、优雅和无限的乐趣。

感谢你的阅读，我们下一段旅程再会！
