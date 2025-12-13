# 6. 深入 `curry` 实现：从 `_curry1` 到 `_curryN`

在上一章，我们领略了柯里化的魅力。它就像一个函数生成器，让我们可以方便地创建特化、可复用的函数单元。现在，你可能和我一样好奇：Ramda 是如何实现这个神奇的自动柯里化功能的？

在这一章，我们将扮演一次代码侦探，直接潜入 Ramda 的源码，一探究竟。剧透一下：这背后并没有什么真正的“魔法”，而是一系列设计精巧、逻辑严谨的内部辅助函数在协同工作。

## 一切的基础：函数元数（Arity）

在开始之前，我们必须先理解一个关键概念：**元数（Arity）**。

一个函数的元数，指的就是它**声明要接收的参数的个数**。我们可以通过函数的 `length` 属性来获取它。

```javascript
const fn0 = () => {};
const fn1 = a => {};
const fn2 = (a, b) => {};

console.log(fn0.length); // 0
console.log(fn1.length); // 1
console.log(fn2.length); // 2
```

`curry` 函数的核心工作，就是比较一个函数**期望接收的参数个数**（它的 `length`）和**当前已经接收到的参数个数**。如果两者相等，就执行原函数；如果不等，就返回一个继续等待接收剩余参数的新函数。

Ramda 内部为了优化性能，针对不同元数的函数，提供了几个不同版本的 `curry` 实现。让我们从最简单的开始。

## `_curry1`：最简单的起点

`_curry1` 是用来包裹只有一个参数的函数的。它的实现非常直白：

```javascript
// Ramda 源码简化版
function _curry1(fn) {
  return function f1(a) {
    // 如果没有提供参数，就返回 f1 自身，等待接收参数
    if (arguments.length === 0) {
      return f1;
    }
    // 一旦接收到参数，就立即执行原函数 fn
    return fn.apply(this, arguments);
  };
}
```

`_curry1` 返回了一个新的函数 `f1`。如果你调用 `f1()` 时不带任何参数，它就返回自己，继续等待。一旦你提供了参数（例如 `f1(10)`），它就会立刻执行原始的 `fn` 函数。

例如，Ramda 的 `R.inc`（加一）函数就是通过 `_curry1` 创建的：

```javascript
const inc = _curry1(function(n) {
  return n + 1;
});

inc();      // 返回 inc 函数自身
inc(5);     // 6
```

## `_curry2`：收集参数的艺术

当函数有两个参数时，事情开始变得有趣起来。`_curry2` 需要处理两种情况：一次性接收两个参数，或者分两次接收。

```javascript
// Ramda 源码简化版
function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        // 未提供参数，返回自身
        return f2;
      case 1:
        // 只提供了一个参数 a，返回一个等待接收 b 的新函数
        return _curry1(function(_b) {
          return fn(a, _b);
        });
      default:
        // 提供了足够的参数，直接执行
        return fn.apply(this, arguments);
    }
  };
}
```

让我们来分析一下 `f2(a, b)` 的行为：
*   `f2()`：没有参数，返回 `f2` 自己。
*   `f2(10)`：只提供了一个参数 `a`（值为 10）。它会返回一个**新**的、被 `_curry1` 包裹的函数。这个新函数“记住”了 `a` 的值是 10，并且正在等待下一个参数 `_b`。一旦你调用这个新函数，比如 `(20)`，它就会执行 `fn(10, 20)`。
*   `f2(10, 20)`：提供了所有参数，直接执行 `fn(10, 20)`。

Ramda 的 `R.add` 就是一个典型的 `_curry2` 应用：

```javascript
const add = _curry2(function(a, b) {
  return a + b;
});

const add10 = add(10); // 返回一个被 _curry1 包裹的新函数
add10(20); // 30
```

## `_curryN`：通用的柯里化引擎

`_curry1` 和 `_curry2` 都是针对特定元数的优化。而 `_curryN` 则是通用的解决方案，它可以柯里化任意元数的函数。它的实现利用了递归和闭包，是理解 Ramda 核心机制的关键。

```javascript
// Ramda 源码简化版
function _curryN(length, received, fn) {
  return function() {
    const args = [];
    let i = 0;
    // 将已经接收的参数 (received) 和本次新接收的参数 (arguments) 合并
    while (i < received.length) {
      args[args.length] = received[i];
      i += 1;
    }
    i = 0;
    while (i < arguments.length) {
      args[args.length] = arguments[i];
      i += 1;
    }

    // 如果收集到的参数还不够，就递归调用 _curryN
    if (args.length < length) {
      // 返回一个新函数，它“记住”了当前所有已收集的参数 (args)
      return _curryN(length, args, fn);
    }

    // 参数足够了，执行原函数
    return fn.apply(this, args);
  };
}
```

`_curryN` 接收三个参数：
*   `length`：原始函数期望的参数个数。
*   `received`：一个数组，存放已经接收到的参数。
*   `fn`：要被柯里化的原始函数。

它的工作流程可以概括为：
1.  **返回一个新函数**：这个新函数是“天生的参数收集器”。
2.  **合并参数**：当这个新函数被调用时，它会把之前已经收集到的参数（`received`）和这次调用新传入的参数（`arguments`）合并到一个 `args` 数组中。
3.  **检查参数数量**：
    *   如果 `args` 的长度**小于**期望的 `length`，说明“原料”还没收齐。它会**递归地**调用 `_curryN`，并返回一个**又一个**新的“参数收集器”。这个新的收集器会把当前已经收集到的所有 `args` 作为 `received` 参数传进去，从而“记住”了之前的状态。
    *   如果 `args` 的长度**大于或等于**期望的 `length`，说明参数已经足够了。它就会用收集到的所有参数去执行原始的 `fn` 函数。

最终，Ramda 的 `curry` 函数就是一个 `_curry1`，它接收一个函数 `fn`，然后根据 `fn.length` 的值，选择调用 `_curry1(fn)`、`_curry2(fn)` 还是 `_curryN(fn.length, [], fn)`。

```javascript
const curry = _curry1(function(fn) {
  const arity = fn.length;
  if (arity === 1) {
    return _curry1(fn);
  }
  return _curryN(arity, [], fn);
});
```

通过这种方式，Ramda 构建了一个高效且强大的柯里化系统。它不仅为我们提供了优雅的函数式编程接口，还在内部通过对常见情况（元数为 1 或 2）的优化，保证了出色的性能。现在，当你再使用 Ramda 函数时，你已经洞悉了它背后那精巧的运作机制。