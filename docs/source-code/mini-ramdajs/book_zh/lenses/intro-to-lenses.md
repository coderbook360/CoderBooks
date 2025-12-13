# 26. Lens 入门：聚焦数据结构的特定部分

在函数式编程中，我们始终与不可变数据打交道。对于扁平的数据结构，`assoc` 或 `evolve` 等工具可以轻松地创建更新后的副本。但当数据结构变得深层和复杂时，事情就开始变得棘手。

想象一下一个典型的 Redux state 或者一个复杂的 API 响应：

```javascript
const userState = {
  id: 1,
  name: 'Alice',
  account: {
    type: 'premium',
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        sms: false
      }
    }
  }
};
```

现在，如果我们要将 `sms` 的设置切换为 `true`，使用 Ramda 的 `assocPath` 会是这样：

```javascript
import { assocPath } from 'ramda';

const newState = assocPath(['account', 'settings', 'notifications', 'sms'], true, userState);
```

这能工作，但它有几个问题：

1.  **路径与操作耦合**：路径 `['account', 'settings', 'notifications', 'sms']` 和操作 `assocPath` 紧密地绑定在一起。如果我们想对同一个路径执行不同的操作（比如读取或函数式演进），我们就需要重复这个路径数组。
2.  **可读性与复用性差**：这个路径数组只是一个普通的数据，它没有明确的语义。我们无法轻易地将“聚焦于用户的短信通知设置”这个**概念**本身抽象出来并复用它。

为了解决这个问题，函数式编程引入了一个强大而优美的抽象——**Lens（透镜）**。

## 什么是 Lens？

你可以将 Lens 想象成一个能够**聚焦**到复杂数据结构内部特定部分的一等公民（First-class）的值。它就像一个双向的“数据通道”或“放大镜”，一旦创建，你就可以通过它来执行三种核心操作：

1.  **读取 (View)**：透过 Lens 查看它所聚焦的数据。
2.  **设置 (Set)**：透过 Lens 非破坏性地设置一个新的值，返回一个全新的、更新后的顶层对象。
3.  **演进 (Over)**：透过 Lens 对聚焦的数据应用一个转换函数，返回一个全新的、更新后的顶层对象。

Lens 将“**在哪里**”（路径）和“**做什么**”（读取/设置/演进）这两个关注点完美地分离开来。

## 创建和使用 Lens

Ramda 提供了几个函数来创建 Lens。

-   `R.lensProp(propName)`: 创建一个聚焦于对象属性的 Lens。
-   `R.lensIndex(index)`: 创建一个聚焦于数组索引的 Lens。
-   `R.lensPath([path])`: 创建一个聚焦于深层路径的 Lens。

让我们用 `lensPath` 来重构之前的例子。

```javascript
import { lensPath, view, set, over, toUpper } from 'ramda';

const userState = { /* ...同上... */ };

// 1. 创建一个 Lens，将“路径”这个概念本身变成一个可复用的值
const smsLens = lensPath(['account', 'settings', 'notifications', 'sms']);
const themeLens = lensPath(['account', 'settings', 'theme']);

// 2. 使用 Lens 进行操作

// 读取 (View)
const currentSmsSetting = view(smsLens, userState);
console.log(currentSmsSetting); // => false

// 设置 (Set)
const userWithSmsEnabled = set(smsLens, true, userState);
// userState 本身并未改变
console.log(userWithSmsEnabled.account.settings.notifications.sms); // => true

// 演进 (Over)
const userWithUpperCaseTheme = over(themeLens, toUpper, userState);
console.log(userWithUpperCaseTheme.account.settings.theme); // => 'DARK'
```

看到了吗？`smsLens` 和 `themeLens` 成为了独立的、有明确语义的值。我们可以将它们传递给任何需要操作这些特定数据点的函数，而这些函数完全不需要知道 `userState` 的内部结构。

## Lens 的组合

Lens 最强大的特性在于其**可组合性**。你可以使用 `pipe` 或 `compose` 将多个简单的 Lens 组合成一个能够深入复杂结构的复杂 Lens。

假设我们有两个 Lens：

-   `accountLens = lensProp('account')`
-   `settingsLens = lensProp('settings')`

我们可以将它们组合起来：

```javascript
import { lensProp, compose, view } from 'ramda';

const accountLens = lensProp('account');
const settingsLens = lensProp('settings');

// 使用 compose 组合 Lens (注意顺序是从右到左)
// 先聚焦到 account，再从 account 内部聚焦到 settings
const accountSettingsLens = compose(accountLens, settingsLens);

const settings = view(accountSettingsLens, userState);
console.log(settings); // => { theme: 'dark', notifications: { ... } }
```

实际上，`lensPath(['a', 'b'])` 在内部就等同于 `compose(lensProp('a'), lensProp('b'))`。这揭示了 `lensPath` 只是一个为了方便而提供的快捷方式。

## 总结

Lens 为我们提供了一种声明式、可组合、可复用的方式来操作不可变数据结构的深层部分。

-   **关注点分离**：Lens 将“路径”（在哪里）从“操作”（做什么）中分离出来，使“路径”本身成为一个一等公民的值。
-   **核心操作**：
    -   `view`: 读取值。
    -   `set`: 设置一个新值。
    -   `over`: 应用函数进行演进。
-   **可组合性**：简单的 Lens 可以通过 `compose` 或 `pipe` 组合成复杂的 Lens，以访问任意深度的嵌套数据。

当你发现自己正在为处理深层嵌套的 state 而头疼时，不妨想一想 Lens。它能够极大地简化你的代码，提升其可读性和可维护性，让你以一种前所未有的优雅姿态来驾驭复杂的数据结构。
