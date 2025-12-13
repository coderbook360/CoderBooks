# 10. 筛选与查找：`filter` 与 `find` 的精确制导

如果说 `map` 是数据转换的引擎，那么 `filter` 就是数据筛选的雷达。在日常开发中，我们很少需要处理一个列表的全部内容，更多的时候，我们只关心其中满足特定条件的子集。Ramda 的 `filter` 和 `find` 函数，就是为此而生的精确制导工具。

## `R.filter`：你的数据守门员

`R.filter` 和原生 `Array.prototype.filter` 的目的一样：接收一个**谓词函数（Predicate Function）**和一个列表，然后返回一个**新列表**，新列表只包含那些让谓词函数返回 `true` 的元素。

一个**谓词函数**，就是一个返回布尔值（`true` 或 `false`）的函数。你可以把它想象成一个“守门员”，它会检查每一个传入的元素，并决定是“放行”（`true`）还是“拦截”（`false`）。

同样，`R.filter` 遵循 Ramda 的设计哲学：

```javascript
import { filter } from 'ramda';

const isEven = n => n % 2 === 0;

filter(isEven, [1, 2, 3, 4, 5]); // [2, 4]
```

由于自动柯里化，我们可以轻松创建特化的筛选函数：

```javascript
const getEvenNumbers = filter(isEven);

getEvenNumbers([1, 2, 3, 4, 5]); // [2, 4]
getEvenNumbers([10, 15, 20]);   // [10, 20]
```

### 组合谓词函数

`filter` 的真正威力在于，我们可以结合 Ramda 提供的其他辅助函数，来构建富有表现力的、可复用的谓词函数。

假设我们有一个产品列表，我们想要筛选出所有价格低于 50 元的“在售”商品。

```javascript
import { pipe, filter, allPass, propEq, prop, lt } from 'ramda';

const products = [
  { name: 'T-shirt', price: 25, status: 'on-sale' },
  { name: 'Jeans', price: 80, status: 'on-sale' },
  { name: 'Hat', price: 45, status: 'out-of-stock' },
  { name: 'Socks', price: 5, status: 'on-sale' }
];

// 构建我们的谓词函数
const isOnSale = propEq('status', 'on-sale'); // 谓词 1: 状态是否为 'on-sale'
const isCheaperThan50 = pipe(prop('price'), lt(__, 50)); // 谓词 2: 价格是否小于 50
// 注意: lt(a, b) 检查 a < b。lt(__, 50) 创建了一个等待一个值并检查它是否小于50的函数。

// 使用 allPass 将多个谓词组合成一个
const isTargetProduct = allPass([isOnSale, isCheaperThan50]);

const getTargetProducts = filter(isTargetProduct);

getTargetProducts(products); 
// [ 
//   { name: 'T-shirt', price: 25, status: 'on-sale' },
//   { name: 'Socks', price: 5, status: 'on-sale' }
// ]
```

在这个例子中：
*   我们定义了两个简单、专一的谓词函数：`isOnSale` 和 `isCheaperThan50`。
*   我们使用 `R.allPass` 这个强大的工具，它接收一个谓词函数数组，并返回一个新的谓词函数。只有当**所有**内部的谓词都返回 `true` 时，这个新谓词才会返回 `true`。
*   最终，`filter(isTargetProduct)` 创建了一个语义清晰、可复用的筛选器。

## `R.find`：只找第一个

`filter` 总是返回一个数组，即使只有一个元素满足条件，或者没有任何元素满足条件（返回空数组）。但很多时候，我们只关心**第一个**满足条件的元素。

这时，就轮到 `R.find` 出场了。它的用法和 `filter` 完全一样，也接收一个谓词函数和一个列表，但区别在于：

*   它返回**第一个**让谓词函数为 `true` 的元素。
*   如果找不到任何满足条件的元素，它返回 `undefined`。

```javascript
import { find, propEq } from 'ramda';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const findUserById = (id, userList) => find(propEq('id', id), userList);

findUserById(2, users); // { id: 2, name: 'Bob' }
findUserById(99, users); // undefined
```

`find` 在你需要根据唯一标识符查找单个实体时非常有用。

## `R.reject`：`filter` 的反义词

`reject` 是 `filter` 的完美搭档。它也接收一个谓词函数和一个列表，但它会**丢弃**所有让谓词返回 `true` 的元素，并保留剩下的。

```javascript
import { reject } from 'ramda';

const isOdd = n => n % 2 !== 0;

reject(isOdd, [1, 2, 3, 4, 5]); // [2, 4]
```

`reject(isOdd, list)` 的结果和 `filter(isEven, list)` 完全一样。实际上，`reject` 在逻辑上等价于 `filter` 加上 `complement`。

`R.complement` 是一个非常有用的小工具，它接收一个函数，并返回一个新函数，这个新函数的返回值总是与原函数相反。

```javascript
import { complement } from 'ramda';

const isEven = n => n % 2 === 0;
const isOdd = complement(isEven);

isOdd(3); // true
isOdd(4); // false
```

所以，`reject(fn)` 就等同于 `filter(complement(fn))`。

通过 `filter`、`find`、`reject` 以及各种谓词辅助函数，Ramda 让我们能够用一种声明式、可组合的方式来表达复杂的筛选逻辑。我们不再需要编写嵌套的 `if` 语句或复杂的循环，而是将一个个简单的“规则”（谓词）组合起来，构建出强大而又易于理解的数据过滤器。