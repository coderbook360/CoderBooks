# 18. 对象合并：`merge` 与 `mergeDeep`

在软件开发中，合并对象是一个非常常见的操作。典型的场景包括：

-   用用户提供的配置覆盖默认配置。
-   将多个来源的数据混合成一个统一的视图模型。
-   在 Redux 的 reducer 中，将新的数据片合并到当前状态中。

JavaScript 的展开语法 (`{...obj1, ...obj2}`) 是实现浅合并的常用方法。Ramda 提供了 `merge` 和 `mergeDeep` 等函数，它们不仅提供了函数式的接口，还解决了深层合并的痛点。

## `R.merge`：纯函数式的浅合并

`R.merge` 接受两个对象，并将它们合并成一个新对象。如果两个对象有相同的属性，第二个对象的属性值将会覆盖第一个对象的。

它的签名是 `merge(obj1, obj2)`。

```javascript
import { merge } from 'ramda';

const defaults = { theme: 'light', showNotifications: true, layout: 'compact' };
const userConfig = { showNotifications: false, layout: 'spacious' };

// 将用户配置合并到默认配置上
const finalConfig = merge(defaults, userConfig);

// finalConfig => { theme: 'light', showNotifications: false, layout: 'spacious' }
```

`merge` 是一个纯函数，它不会修改任何输入对象，而是返回一个全新的对象。由于它是柯里化的，我们可以创建可复用的合并函数：

```javascript
import { merge } from 'ramda';

const applyUserConfig = merge(defaults);

const config1 = applyUserConfig({ theme: 'dark' });
//=> { theme: 'dark', showNotifications: true, layout: 'compact' }

const config2 = applyUserConfig({ showNotifications: false });
//=> { theme: 'light', showNotifications: false, layout: 'compact' }
```

### `merge` 的局限：嵌套对象

`merge` 是一个**浅合并**函数。这意味着如果属性值本身也是对象，它会直接用第二个对象中的嵌套对象替换掉第一个的，而不会合并它们内部的属性。

```javascript
import { merge } from 'ramda';

const defaults = { user: { name: 'Default', email: 'default@example.com' } };
const partialUpdate = { user: { email: 'updated@example.com' } };

const result = merge(defaults, partialUpdate);

// result => { user: { email: 'updated@example.com' } }
// 注意：user.name 属性丢失了！
```

这通常不是我们想要的结果。为了解决这个问题，Ramda 提供了 `mergeDeep`。

## `R.mergeDeep`：递归的深层合并

`R.mergeDeep` 会递归地合并两个对象。当它遇到两个对象在同一属性上都有嵌套对象时，它会继续深入一层，合并这些嵌套对象，而不是简单地替换。

它的签名是 `mergeDeep(obj1, obj2)`。

让我们用 `mergeDeep` 来重做上面的例子：

```javascript
import { mergeDeep } from 'ramda';

const defaults = { user: { name: 'Default', email: 'default@example.com' } };
const partialUpdate = { user: { email: 'updated@example.com' } };

const result = mergeDeep(defaults, partialUpdate);

// result => { user: { name: 'Default', email: 'updated@example.com' } }
// 这次，user.name 属性被保留了！
```

`mergeDeep` 是处理复杂配置或深层状态更新的理想工具。它能确保你不会因为一次局部更新而意外地丢失其他嵌套数据。

## `mergeWith` 和 `mergeDeepWith`

Ramda 还提供了 `mergeWith` 和 `mergeDeepWith`，它们为合并操作提供了终极的灵活性。这两个函数都接受一个额外的参数：一个**合并函数**。

当两个对象在同一个 `key` 上都有值时，Ramda 会调用你提供的这个合并函数，并将 `key`、`value1` 和 `value2` 作为参数传入，由你来决定最终的值应该是什么。

例如，假设我们想合并两个对象，但对于值是数组的属性，我们希望将两个数组连接起来，而不是替换。

```javascript
import { mergeWith, concat } from 'ramda';

const obj1 = { id: 1, values: [10, 20] };
const obj2 = { id: 2, values: [30, 40] };

const customMerge = mergeWith((key, val1, val2) => {
  if (key === 'values') {
    return concat(val1, val2); // 如果是 values 属性，则合并数组
  }
  return val2; // 其他情况，使用第二个值
});

customMerge(obj1, obj2);
//=> { id: 2, values: [10, 20, 30, 40] }
```

## 总结

Ramda 的 `merge` 系列函数为对象合并提供了强大而灵活的工具。

-   使用 `merge` 进行快速的、函数式的**浅合并**。
-   当你需要处理嵌套对象，并希望保留所有层级的数据时，使用 `mergeDeep` 进行**深层合并**。
-   当你需要对合并冲突进行完全自定义的控制时，使用 `mergeWith` 或 `mergeDeepWith`。

通过选择合适的合并策略，你可以构建出既健壮又富有表现力的数据转换逻辑。
