# 22. 布尔与比较：函数式的相等与关系运算

在任何编程范式中，比较都是最基础的操作之一。我们用 `===` 来判断相等，用 `>`、`<` 来比较大小，用 `||` 来提供默认值。这些操作符在命令式代码中简单直接，但当我们需要将它们作为“一等公民”传递给高阶函数（如 `filter`、`sortBy`）时，就需要将它们包装成函数。

Ramda 提供了一整套函数式的比较和布尔运算工具，它们被设计成可柯里化、可组合的纯函数，能无缝地融入到函数式的数据处理流程中。

## `R.equals`：深度相等判断

JavaScript 的 `==` 和 `===` 都有其局限性。`==` 会进行类型转换，行为难以预测；`===` 虽然严格，但无法处理对象和数组的“值相等”比较。

```javascript
[1, 2] === [1, 2]; // => false
{ a: 1 } === { a: 1 }; // => false
```

这是因为 `===` 比较的是对象的引用（内存地址），而不是它们的内容。在函数式编程中，我们经常创建新的数据结构，因此急需一个可靠的“深度相等”判断。

`R.equals` 就是为此而生。它会递归地比较两个参数的内部结构和值，只有当它们完全相同时才返回 `true`。

```javascript
import { equals } from 'ramda';

console.log(equals([1, 2], [1, 2]));      // => true
console.log(equals({ a: 1 }, { a: 1 }));    // => true
console.log(equals({ a: 1 }, { a: 2 }));    // => false
console.log(equals(1, '1'));             // => false (无类型转换)
```

### 前端实战：防止不必要的重渲染

在 React 或 Vue 等前端框架中，一个常见的性能优化点是避免在 props 没有实际变化时重新渲染组件。`R.equals` 是实现这种“浅比较”或“深比较”的完美工具。

```javascript
import { equals } from 'ramda';

// 伪代码：一个 React 组件的更新逻辑
function shouldComponentUpdate(nextProps, nextState) {
  // 只有当 props 或 state 真的发生“值”的变化时才更新
  return !equals(this.props, nextProps) || !equals(this.state, nextState);
}
```

## 关系运算：`gt`, `gte`, `lt`, `lte`

Ramda 将 `>`、`>=`、`<`、`<=` 这些关系操作符也变成了函数。

-   `gt(a, b)`: `a > b`
-   `gte(a, b)`: `a >= b`
-   `lt(a, b)`: `a < b`
-   `lte(a, b)`: `a <= b`

由于它们是自动柯里化的，我们可以轻松地创建出更具体的比较函数。

```javascript
import { filter, gt } from 'ramda';

const scores = [99, 85, 100, 60, 75];

// R.gt(__, 90) 创建了一个新函数，它会检查传入的参数是否大于 90
const isGradeA = gt(R.__, 90);

const highScores = filter(isGradeA, scores);

console.log(highScores); // => [99, 100]
```

`R.__` 是 Ramda 的占位符，它允许我们指定将来哪个参数会被填充。`gt(R.__, 90)` 的意思是：“创建一个函数，它的第一个参数是待定的，第二个参数是 90”。这在创建单参数的断言函数时非常有用。

## 布尔与逻辑

-   `R.isEmpty(value)`: 检查一个值是否“空”。对于数组和字符串，它检查 `length` 是否为 0；对于对象，它检查是否有任何可枚举的属性。对于 `null` 和 `undefined`，它返回 `true`。

-   `R.defaultTo(defaultValue, value)`: 如果 `value` 是 `null`、`undefined` 或 `NaN`，则返回 `defaultValue`；否则返回 `value` 本身。这是 `||` 操作符的一个更严格、更可预测的版本，因为它不会将 `false`、`0` 或空字符串 `''` 视为需要被替换的值。

### 前端实战：处理可选配置

在处理函数的可选配置对象时，`defaultTo` 非常好用。

```javascript
import { defaultTo, pipe, prop } from 'ramda';

function createComponent(config) {
  // 如果 config.theme 未定义，则默认为 'light'
  const getTheme = pipe(prop('theme'), defaultTo('light'));
  
  // 如果 config.retries 未定义，则默认为 3
  const getRetries = pipe(prop('retries'), defaultTo(3));

  const theme = getTheme(config);
  const retries = getRetries(config);

  console.log(`Theme: ${theme}, Retries: ${retries}`);
}

createComponent({ theme: 'dark' });      // => Theme: dark, Retries: 3
createComponent({ retries: 0 });       // => Theme: light, Retries: 0 (0 是有效值，不会被替换)
createComponent({});                  // => Theme: light, Retries: 3
```

## 总结

将基础的比较和布尔运算函数化，是函数式编程思想的重要体现。它使得这些基础逻辑单元可以被平等地对待，像其他任何函数一样参与到柯里化、组合和高阶函数的操作中。

-   使用 `R.equals` 进行可靠的深度值比较。
-   使用 `gt`, `lt` 等关系函数创建声明式的过滤器和排序器。
-   使用 `R.isEmpty` 进行统一的“空”值检查。
-   使用 `R.defaultTo` 代替 `||` 来实现更严谨的默认值处理。

通过拥抱这些函数，你的代码将变得更加一致、声明式和健壮。
