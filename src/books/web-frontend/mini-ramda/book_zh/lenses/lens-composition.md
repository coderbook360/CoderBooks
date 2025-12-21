
# 28. Lens 的组合：构建更强大的数据操作管道

在前面的章节中，我们已经理解了单个 Lens 是如何工作的，它像一个探针，精确地指向数据结构的某个特定位置。然而，Lens 最激动人心的特性在于它的“可组合性”。就像乐高积木一样，简单的 Lens 可以被拼装成更复杂、更强大的结构，让我们能够以声明式的方式导航到任意深度的嵌套数据中。

Ramda 并没有提供一个名为 `composeLenses` 的特定函数，因为组合的能力是内建在 Lens 的设计哲学中的。这种组合通常通过 `R.compose` 或 `R.pipe` 来实现，这与我们组合普通函数的方式如出一辙。

## Lens 组合的本质

当我们写 `R.compose(lensA, lensB)` 时，我们到底在做什么？

让我们回到 Lens 的本质：`{ getter, setter }` 的集合。组合两个 Lens，实际上就是在组合它们的 `getter` 和 `setter`。

-   **组合 `getter`**：`compose(lensA, lensB)` 的新 `getter` 会先用 `lensB` 的 `getter` 从数据中取值，然后立刻将这个结果传给 `lensA` 的 `getter`。这形成了一个路径：`data -> lensB -> lensA`。

-   **组合 `setter`**：`setter` 的组合稍微复杂一点，它创建了一个嵌套的更新路径。当你设置值时，`lensB` 的 `setter` 会将一个“更新操作”包裹在 `lensA` 的 `setter` 之外。这意味着更新会从最深处的 `lensA` 开始，然后是 `lensB`，一层层向外返回新的数据结构。

听起来有点抽象？别担心，一个例子就能让一切清晰起来。

## 实践：手动组合 Lens

假设我们有这样一个嵌套的用户状态对象，这在 Redux 或其他前端状态管理中非常常见：

```javascript
const userState = {
  id: 1,
  account: {
    type: 'premium',
    settings: {
      theme: 'dark',
    },
  },
};
```

我们想直接操作最深处的 `theme` 属性。我们可以创建两个简单的 `lensProp`：

-   `accountLens`: 聚焦于 `account` 属性。
-   `settingsLens`: 聚焦于 `settings` 属性。
-   `themeLens`: 聚焦于 `theme` 属性。

在 Ramda 中，我们可以像这样把它们组合起来：

```javascript
import { compose, lensProp, view, over, toUpper } from 'ramda';

const accountLens = lensProp('account');
const settingsLens = lensProp('settings';
const themeLens = lensProp('theme');

// 将三个 Lens 组合成一个指向 theme 的超级 Lens
// 注意顺序：从右到左，离数据最近的在最右边
const themePathLens = compose(accountLens, settingsLens, themeLens);
```

这个 `themePathLens` 现在就是一个可以直接从 `userState` 访问到 `theme` 的“快捷方式”。它等价于我们之前使用的 `lensPath(['account', 'settings', 'theme'])`。

让我们看看它是如何工作的：

```javascript
// 使用组合后的 Lens 读取值
const currentTheme = view(themePathLens, userState);
console.log(currentTheme); // => 'dark'

// 使用组合后的 Lens 更新值
const userWithLightTheme = over(themePathLens, () => 'light', userState);
console.log(userWithLightTheme.account.settings.theme); // => 'light'

// 同样，原对象保持不变
console.log(userState.account.settings.theme); // => 'dark'
```

## 为什么 `compose` 能组合 Lens？

你可能会问，`compose` 不是用来组合函数的吗？为什么它可以组合 Lens 对象？

这正是 Ramda 设计的精妙之处。Ramda 的 `compose` 函数足够智能，它不仅仅是简单地将函数串联起来。当它检测到参数是 Lens（或者更准确地说，是符合特定函数式接口的对象）时，它会采用不同的组合策略——即我们上面讨论的 `getter` 和 `setter` 的组合逻辑。

这种能力被称为“函数重载”或“多态”，它使得同一个函数（如 `compose`）可以根据输入类型的不同而表现出不同的行为，极大地增强了代码的表达力和一致性。

## 组合的力量：动态与复用

Lens 组合的真正威力在于它的动态性和可复用性。

想象一下，在一个复杂的表单应用中，你可能有一个 `formLens` 指向整个表单的状态。然后，你可以根据用户的交互，动态地将它与 `fieldLens('username')` 或 `fieldLens('password')` 组合，从而创建出指向特定输入框的临时 Lens。

```javascript
const formLens = lensProp('form');
const fieldLens = (fieldName) => lensProp(fieldName);

// 动态创建指向 username 字段的 Lens
const usernameLens = compose(formLens, fieldLens('username'));

// 动态创建指向 password 字段的 Lens
const passwordLens = compose(formLens, fieldLens('password'));

// ... 之后就可以用 usernameLens 和 passwordLens 去 view, set, over 状态了
```

这种方式比写一长串的 `lensPath(['form', 'username'])` 要灵活得多，也更符合“构建块”的编程思想。你可以预先定义好一批基础的 Lens，然后在需要时像搭积木一样将它们组合起来，构建出你需要的任何数据路径。

通过组合，Lens 从一个简单的“探针”升级为了一个强大的“数据路径构建系统”。它让我们能够用一种声明式、可复用且极其优雅的方式来处理前端应用中无处不在的复杂状态，这也是 Lens 在函数式前端开发中备受推崇的核心原因。
