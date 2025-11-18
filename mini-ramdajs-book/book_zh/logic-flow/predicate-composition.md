# 21. 断言组合：构建复杂的逻辑过滤器

在上一章中，我们学习了如何使用断言函数（Predicate）来驱动 `ifElse` 和 `cond`，从而实现函数式的条件逻辑。断言函数是返回 `true` 或 `false` 的简单函数，例如 `isLoggedIn` 或 `isPlatinum`。

然而，现实世界的业务规则往往更加复杂。我们需要的可能不是单一的判断，而是多个条件的组合，例如：

-   “筛选出所有价格低于 100 元 **并且** 库存大于 0 的商品。” (AND)
-   “一个用户是活跃的，如果他最近一周登录过 **或者** 发布过内容。” (OR)
-   “显示所有 **不是** 草稿状态的文章。” (NOT)

在命令式编程中，我们会用 `&&`、`||` 和 `!` 操作符将这些逻辑连接起来。但在函数式编程中，Ramda 提供了一套更优雅、更具组合性的方式来处理这些逻辑——那就是断言组合函数。

这些函数允许我们将简单、单一职责的断言函数像积木一样拼接起来，形成复杂而强大的逻辑过滤器。

## `both` 与 `either`：二元逻辑组合

`both` 和 `either` 是最基础的逻辑组合子，它们分别对应 `&&` (与) 和 `||` (或) 逻辑。

-   `R.both(pred1, pred2)`: 创建一个新函数，当且仅当 `pred1` 和 `pred2` 都返回 `true` 时，它才返回 `true`。
-   `R.either(pred1, pred2)`: 创建一个新函数，只要 `pred1` 或 `pred2` 中有一个返回 `true`，它就返回 `true`。

### 前端实战：用户注册校验

假设在用户注册时，我们需要校验密码是否满足两个条件：长度不少于 8 位，并且包含特殊字符。

```javascript
import { both, either } from 'ramda';

const hasMinLength = (str) => str.length >= 8;
const hasSpecialChar = (str) => /[^A-Za-z0-9]/.test(str);

// 使用 both 组合两个断言
const isPasswordValid = both(hasMinLength, hasSpecialChar);

console.log(isPasswordValid('password'));      // => false (没有特殊字符)
console.log(isPasswordValid('pass@'));         // => false (长度不够)
console.log(isPasswordValid('password@123'));  // => true (满足所有条件)
```

`isPasswordValid` 函数现在是一个独立的、可复用的校验单元，它的意图非常清晰：“一个有效的密码，必须同时满足最小长度要求和包含特殊字符的要求”。

## `allPass` 与 `anyPass`：多元逻辑组合

当你有两个以上的条件需要组合时，`both` 和 `either` 就会显得捉襟见肘。`allPass` 和 `anyPass` 则是它们的“数组版本”，可以接受一个断言函数数组。

-   `R.allPass([pred1, pred2, ...])`: 检查数据是否能通过**所有**断言函数的校验。
-   `R.anyPass([pred1, pred2, ...])`: 检查数据是否能通过**任意一个**断言函数的校验。

### 前端实战：商品列表高级筛选

想象一个电商网站的商品筛选功能。用户希望找到所有“正在促销”的商品，并且这些商品要么“有库存”，要么“支持预购”。

```javascript
import { allPass, anyPass, propEq, propSatisfies } from 'ramda';

const product = {
  name: 'Super Game Console',
  onSale: true,
  stock: 0,
  preOrder: true,
  category: 'Electronics'
};

// 定义一组简单的断言
const isOnSale = propEq('onSale', true);
const hasStock = propSatisfies(stock => stock > 0, 'stock');
const canPreOrder = propEq('preOrder', true);

// 组合逻辑：(有库存 或 可预购)
const isAvailable = anyPass([hasStock, canPreOrder]);

// 最终逻辑：(正在促销 且 可用)
const isEligibleForDisplay = allPass([isOnSale, isAvailable]);

console.log(isEligibleForDisplay(product)); // => true
```

通过这种方式，我们将复杂的业务规则 `onSale && (stock > 0 || preOrder)` 分解成了几个独立的、易于理解和测试的小函数，然后以声明式的方式将它们组合起来。

## `complement`：逻辑非

`complement` 函数接受一个函数作为参数，并返回一个新函数，这个新函数的返回值总是与原函数相反。它就是函数式编程中的 `!` (逻辑非)。

这在提升代码可读性方面非常有用。例如，我们有 `R.isNil` (检查是否为 `null` 或 `undefined`)，但我们更常需要检查一个值**不是** `nil`。直接写 `!R.isNil(x)` 当然可以，但 `R.complement(R.isNil)` 能创建一个语义更明确的 `isNotNil` 函数。

```javascript
import { complement, isNil, filter } from 'ramda';

const isNotNil = complement(isNil);

const data = [1, 2, null, 4, undefined, 5];

// 使用 isNotNil 过滤掉所有 nil 值
const cleanData = filter(isNotNil, data);

console.log(cleanData); // => [1, 2, 4, 5]
```

## 总结

断言组合是函数式编程中构建声明式、可维护逻辑的关键。通过将复杂的业务规则分解为最小的、可复用的断言单元，然后再用 `both`、`either`、`allPass`、`anyPass` 和 `complement` 等工具将它们粘合起来，我们可以获得诸多好处：

-   **可读性**：`allPass([isImportant, isUnread])` 比 `(x) => isImportant(x) && isUnread(x)` 更能清晰地表达“所有条件都必须通过”的意图。
-   **可复用性**：每个小断言（如 `hasStock`）都可以在代码库的其他地方被复用。
-   **可测试性**：测试小的、纯粹的断言函数远比测试一个包含复杂 `if-else` 逻辑的巨大函数要容易得多。

当你下一次需要编写复杂的 `if` 条件时，不妨停下来想一想：是否能将这个逻辑拆解成一系列独立的断言，然后用 Ramda 的组合工具将它们优雅地组织起来？
