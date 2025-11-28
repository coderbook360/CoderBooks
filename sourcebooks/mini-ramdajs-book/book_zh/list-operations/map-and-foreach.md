# 9. 遍历与映射：`map` 与 `forEach` 的函数式解读

欢迎来到本书的第三部分。在前端开发中，我们打交道最多的数据结构可能就是数组（或列表）。无论是处理从后端获取的数据，还是管理应用内部的状态，列表操作无处不在。Ramda 为我们提供了一套极其强大和丰富的“瑞士军刀”，让处理列表变得前所未有的优雅和高效。

我们将从两个最基础也最重要的函数开始：`map` 和 `forEach`。

## `R.map`：函数式的转换引擎

你对 JavaScript 原生的 `Array.prototype.map` 方法一定不陌生。它接收一个函数，对数组中的每个元素执行该函数，并返回一个包含所有执行结果的**新数组**。

Ramda 的 `R.map` 做了同样的事情，但有几个关键的区别，而这些区别正是 Ramda 设计哲学的体现。

**关键区别 1：函数优先，数据置后**

*   **原生 `map`**：`array.map(fn)`
*   **Ramda `map`**：`R.map(fn, array)`

我们已经反复强调过这个模式。将数据（`array`）放在最后一个参数位，使得 `R.map` 可以被轻松地柯里化。

**关键区别 2：自动柯里化**

结合第一点，`R.map` 的自动柯里化能力让它成为了函数组合中的明星成员。

假设我们有一个用户列表，我们想要提取所有用户的邮箱地址。

```javascript
import { pipe, map, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

// 原生 map 的写法，难以直接用于组合
const getEmailsNative = (userList) => userList.map(user => user.email);

// Ramda 的写法
const getEmails = map(prop('email'));

const emails = getEmails(users); // ['alice@example.com', 'bob@example.com']
```

`map(prop('email'))` 创建了一个新的、高度特化的函数 `getEmails`。这个函数存在的唯一目的，就是“提取一个列表中所有对象的 `email` 属性”。它是一个等待数据（用户列表）的、可复用的工具。

现在，我们可以非常自然地将它放入一个 `pipe` 流水线中：

```javascript
import { pipe, filter, propEq, map, prop } from 'ramda';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'admin' }
];

const getAdminNames = pipe(
  filter(propEq('role', 'admin')), // 1. 筛选出管理员
  map(prop('name'))               // 2. 提取他们的名字
);

const adminNames = getAdminNames(users); // ['Alice', 'Charlie']
```

`map(prop('name'))` 在这里完美地扮演了流水线中一个“工位”的角色，它接收上一步 `filter` 的输出，并将其转换为下一步需要的数据格式。

## `R.forEach`：处理副作用的正确姿势

`map` 的核心使命是**数据转换**。它接收一个数组，返回一个**新的、转换后**的数组，这是一个纯函数的核心特征。

但有时，我们需要的不是转换数据，而是利用数据去**执行某些操作**，比如打印日志、更新 DOM、向服务器发送请求等。这些操作都属于**副作用（Side Effects）**。

这时，`R.forEach` 就登场了。它和 `R.map` 一样，也接收一个函数和一个数组，并对数组中的每个元素执行该函数。但它有两大不同：

1.  **它总是返回原始的数组**。它不关心你传入函数的返回值，它的目的不是转换。
2.  它的存在就是为了**处理副作用**。

```javascript
import { forEach } from 'ramda';

const numbers = [1, 2, 3];

const printItem = (item) => console.log(`Item is: ${item}`);

const result = forEach(printItem, numbers);
// 控制台会依次打印:
// "Item is: 1"
// "Item is: 2"
// "Item is: 3"

console.log(result); // [1, 2, 3] (返回原始数组)
```

**`map` vs `forEach`：一个重要的选择**

在函数式编程中，明确区分纯粹的转换和副作用是非常重要的。这是一个思维上的转变：

*   **当你需要根据一个数组创建另一个新数组时，请使用 `map`。** 即使你需要在 `map` 的回调里做一些计算，你的最终目的也是为了 `return` 一个新的值。

    ```javascript
    // 正确使用 map
    const double = x => x * 2;
    const doubledNumbers = map(double, [1, 2, 3]); // [2, 4, 6]
    ```

*   **当你只是想对数组的每一项执行一个动作，而不需要一个新数组时，请使用 `forEach`。**

    ```javascript
    // 错误地使用 map 执行副作用
    let sum = 0;
    map(x => { sum += x }, [1, 2, 3]); // 这是一个坏味道，map 被用于副作用

    // 正确使用 forEach
    let sum = 0;
    forEach(x => { sum += x }, [1, 2, 3]);
    ```

`forEach` 就像是函数式世界里一个被明确标记的“副作用区域”。它告诉代码的阅读者：“注意，这里将会发生一些与外部世界的交互。” 这种明确的区分，让我们的代码库主体能够保持纯净，同时又能优雅地处理那些不可避免的副作用。

`R.forEach` 同样是自动柯里化的，这意味着你也可以创建特化的“动作”函数，并在 `pipe` 的末端使用它来触发副作用，例如记录最终的计算结果。

```javascript
import { pipe, map, sum, forEach } from 'ramda';

const prices = [10.5, 20, 8.75];

const logTotal = pipe(
  map(Math.round), // 四舍五入
  sum,             // 求和
  (total) => `Final total is: ${total}`, // 格式化字符串
  console.log      // 执行副作用：打印日志
);

logTotal(prices); // "Final total is: 39"
```

掌握 `map` 和 `forEach` 的正确使用场景，是编写清晰、可维护的函数式代码的第一步。在接下来的章节中，我们将看到更多基于这一思想构建的强大列表操作函数。