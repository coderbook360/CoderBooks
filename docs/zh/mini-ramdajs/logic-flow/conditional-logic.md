# 20. 条件逻辑：`ifElse` 与 `cond` 的函数式表达

在日常编程中，我们使用 `if...else` 或 `switch` 语句来控制代码的执行流程。这在命令式编程中非常自然，但在函数式编程的语境下，特别是当你想构建一个由多个函数组成的声明式数据处理管道时，这些语句就显得有些格格不入。

为什么呢？因为 `if...else` 是**语句（Statement）**，它不返回值，它的职责是根据条件执行不同的代码块。而函数式编程的核心是**表达式（Expression）**，每个部分都应该是一个有返回值的计算单元，这样才能像乐高积木一样被自由组合。

Ramda 提供了 `ifElse` 和 `cond` 这两个函数，它们是条件逻辑的“表达式”版本，能够无缝地融入到函数组合的链条中。

## `R.ifElse`：函数式的三元运算符

你可以将 `R.ifElse` 看作是功能更强大的三元运算符 (`condition ? onTrue : onFalse`)。它接受三个函数作为参数：

1.  `predicate`：一个返回布尔值的断言函数，用于进行判断。
2.  `onTrue`：当断言函数返回 `true` 时要执行的转换函数。
3.  `onFalse`：当断言函数返回 `false` 时要执行的转换函数。

`R.ifElse` 会返回一个全新的函数，这个函数等待接收数据，然后用这个数据去执行整个条件逻辑。

它的签名是：`ifElse(predicate, onTrueFn, onFalseFn, data)`

让我们来看一个简单的例子。假设我们要实现一个安全的除法函数，当除数为 0 时返回一个错误信息。

```javascript
import * as R from 'ramda';

// onFalseFn: 一个返回错误字符串的函数
const onZero = () => 'Error: Division by zero';

// onTrueFn: 执行实际除法的函数
const divide = (a, b) => a / b;

// predicate: 检查除数是否为 0 的函数
const isNotZero = (a, b) => b !== 0;

const safeDivide = R.ifElse(
  isNotZero,
  divide,
  onZero
);

console.log(safeDivide(10, 2)); // => 5
console.log(safeDivide(10, 0)); // => 'Error: Division by zero'
```

这个 `safeDivide` 函数就是一个纯粹的、可复用的表达式，它可以轻松地放入 `pipe` 中。

### 前端实战：动态渲染UI

在前端开发中，我们经常需要根据用户的登录状态来显示不同的界面。`ifElse` 在这里就能大显身手。

假设我们有一个 `user` 对象，需要根据 `isLoggedIn` 属性来决定是显示欢迎信息还是登录按钮。

```javascript
import { ifElse, propEq } from 'ramda';

const renderWelcomeMessage = (user) => `<h1>Welcome, ${user.name}!</h1>`;
const renderLoginButton = () => '<button>Login Please</button>';

// 使用 propEq 创建一个断言函数，检查 user.isLoggedIn 是否为 true
const isLoggedIn = propEq('isLoggedIn', true);

const renderHeader = ifElse(
  isLoggedIn,
  renderWelcomeMessage,
  renderLoginButton
);

const loggedInUser = { name: 'Alice', isLoggedIn: true };
const guest = { name: 'Guest', isLoggedIn: false };

console.log(renderHeader(loggedInUser)); // => "<h1>Welcome, Alice!</h1>"
console.log(renderHeader(guest));        // => "<button>Login Please</button>"
```

你看，我们用一种非常声明式的方式定义了 `renderHeader` 的逻辑：如果用户已登录，就渲染欢迎信息，否则，就渲染登录按钮。整个过程没有一条 `if` 语句。

## `R.cond`：函数式的 `switch` 语句

当你有多个条件分支时，`ifElse` 可能会导致层层嵌套，代码可读性下降。这时，`R.cond` 就派上用场了。它就像一个函数式的 `switch` 语句或 `if...else if...else` 链。

`R.cond` 接受一个由 `[predicate, transformer]` 数组组成的列表。它会按顺序对数据应用每个 `predicate` 函数，一旦某个 `predicate` 返回 `true`，它就会立刻执行对应的 `transformer` 函数，并将其结果作为最终返回值。后续的条件将不再被检查。

为了确保总有一个匹配项（类似于 `switch` 中的 `default`），我们可以使用 `R.T`。`R.T` 是一个永远返回 `true` 的函数，非常适合放在 `cond` 列表的最后，作为“捕获所有”的默认分支。

### 前端实战：根据用户积分计算折扣等级

想象一个电商场景，我们需要根据用户的积分（points）来判断其会员等级，并返回相应的折扣率。

```javascript
import { cond, T, propSatisfies } from 'ramda';

// 创建一系列断言函数
const isPlatinum = propSatisfies(points => points >= 1000, 'points');
const isGold = propSatisfies(points => points >= 500, 'points');
const isSilver = propSatisfies(points => points >= 100, 'points');

const getDiscountRate = cond([
  [isPlatinum, () => 0.20], // 如果是白金会员，返回 20% 折扣
  [isGold,     () => 0.15], // 如果是黄金会员，返回 15% 折扣
  [isSilver,   () => 0.10], // 如果是白银会员，返回 10% 折扣
  [T,          () => 0.05]  // 否则，返回 5% 的基础折扣
]);

const user1 = { name: 'John', points: 1200 };
const user2 = { name: 'Jane', points: 650 };
const user3 = { name: 'Joe', points: 150 };
const user4 = { name: 'Doe', points: 50 };

console.log(getDiscountRate(user1)); // => 0.2
console.log(getDiscountRate(user2)); // => 0.15
console.log(getDiscountRate(user3)); // => 0.1
console.log(getDiscountRate(user4)); // => 0.05
```

`cond` 的美妙之处在于它将一系列复杂的条件判断扁平化为一个清晰的、可读性极高的“规则列表”。每一行都代表一条独立的业务规则，增删改查都非常方便。

## 总结

`ifElse` 和 `cond` 将条件逻辑从命令式的“语句”提升为函数式的“表达式”。它们是构建复杂数据处理管道时不可或缺的工具。

-   **`ifElse`** 适用于简单的二元分支逻辑。
-   **`cond`** 适用于处理多个、扁平化的条件分支。

通过使用它们，你可以写出更具声明性、可读性更高、且易于组合的代码。你的逻辑不再是“如果这样，就做这个，否则做那个”，而是“一个值的最终形态，取决于它满足了哪条规则”。这正是函数式编程思想的精髓体现。
