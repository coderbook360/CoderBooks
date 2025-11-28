
# 27. Lens 的实现原理

在上一章，我们领略了 Lens 的威力，它像一个精确的“手术刀”，让我们能够聚焦并操作复杂数据结构的深处，同时保持代码的优雅和数据的不可变性。你可能和我一样好奇：这背后到底是什么样的魔法？

其实，Lens 的核心思想出奇地简洁，它并非魔法，而是一种精巧的设计模式。理解了它的构造，你不仅能更深刻地运用 Ramda，甚至可以构建属于你自己的“透镜”。

## Lens：一个“读取器”与“写入器”的组合

让我们先抛开 Ramda 的源码，从第一性原理出发。想象一下，要操作一个数据结构的某个部分，你需要做什么？

1.  **读取（Get）**：能够拿到那个部分的值。
2.  **写入（Set）**：能够在不改变原数据结构的前提下，返回一个更新了该部分值的新数据结构。

这不就是 Lens 的本质吗？一个 Lens，说白了，就是一个将“读取逻辑”和“写入逻辑”打包在一起的对象。

我们可以用一个非常简单的函数 `lens` 来创建这样一个对象。这个函数接收两个参数：一个用于读取的 `getter` 函数和一个用于写入的 `setter` 函数。

```javascript
// 一个极简的 lens 函数，用来创建 lens 对象
const lens = (getter, setter) => ({
  getter,
  setter,
});
```

这个 `lens` 函数返回一个包含 `getter` 和 `setter` 两个方法的普通 JavaScript 对象。这就是一个最原始的“透镜”。

## 手动实现 `lensProp`

现在，让我们尝试用这个简化的 `lens` 函数来复刻 Ramda 的 `lensProp`。`lensProp('x')` 会创建一个聚焦于对象属性 `x` 的 Lens。

它的 `getter` 逻辑很简单，就是获取对象上名为 `prop` 的属性。它的 `setter` 逻辑则是使用新值更新对象的 `prop` 属性，并返回一个新对象。

```javascript
import { assoc } from 'ramda';

// 模拟 Ramda 的 prop 和 assoc 函数，为了示例清晰
const prop = (key, obj) => obj[key];

// 手动实现一个简化版的 lensProp
const lensProp = (key) => {
  const getter = (obj) => prop(key, obj);
  // assoc(key, value, obj) 返回一个新对象，其中 key 的值被更新为 value
  const setter = (value, obj) => assoc(key, value, obj);
  return lens(getter, setter);
};

// 创建一个聚焦 'name' 属性的 lens
const nameLens = lensProp('name');

console.log(nameLens);
// 输出: { getter: [Function: getter], setter: [Function: setter] }
```

看，我们成功创建了一个 `nameLens`！它内部封装了如何读取和更新一个对象的 `name` 属性的所有逻辑。

## 实现 `view`, `set`, 和 `over`

有了 Lens 对象，我们还需要配套的 `view`, `set`, `over` 函数来“消费”它。这三个函数的实现同样非常直观。

*   **`view(lens, data)`**：它的工作就是调用 Lens 的 `getter` 方法，并将 `data` 传给它。

*   **`set(lens, value, data)`**：它调用 Lens 的 `setter` 方法，将 `value` 和 `data` 传给它。

*   **`over(lens, fn, data)`**：`over` 是 `view` 和 `set` 的巧妙结合。它首先用 `view` 读取出当前值，然后将这个值传给转换函数 `fn`，最后用 `set` 将计算出的新值写回去。

让我们来实现它们：

```javascript
// 简化版的 view, set, over

const view = (lens, obj) => lens.getter(obj);

const set = (lens, value, obj) => lens.setter(value, obj);

const over = (lens, fn, obj) => {
  // 1. 使用 getter 读取当前值
  const currentValue = view(lens, obj);
  // 2. 将当前值传入 fn 计算新值
  const newValue = fn(currentValue);
  // 3. 使用 setter 将新值写回
  return set(lens, newValue, obj);
};
```

现在，让我们把所有部分组合起来，看看我们的手动实现是否能正常工作。

```javascript
import { assoc, toUpper } from 'ramda';

// --- 我们手动实现的部分 ---

const lens = (getter, setter) => ({ getter, setter });

const lensProp = (key) => {
  const getter = (obj) => obj[key];
  const setter = (value, obj) => assoc(key, value, obj);
  return lens(getter, setter);
};

const view = (lens, obj) => lens.getter(obj);
const set = (lens, value, obj) => lens.setter(value, obj);
const over = (lens, fn, obj) => {
  const currentValue = view(lens, obj);
  const newValue = fn(currentValue);
  return set(lens, newValue, obj);
};

// --- 测试 ---

const user = { id: 1, name: 'alice' };
const nameLens = lensProp('name');

// 1. 使用 view 读取 name
const currentName = view(nameLens, user);
console.log('Current name:', currentName); // => 'alice'

// 2. 使用 set 更新 name
const updatedUser = set(nameLens, 'bob', user);
console.log('Updated user:', updatedUser); // => { id: 1, name: 'bob' }
console.log('Original user:', user);     // => { id: 1, name: 'alice' } (原对象不变)

// 3. 使用 over 转换 name
const userWithUpperName = over(nameLens, toUpper, user);
console.log('User with upper name:', userWithUpperName); // => { id: 1, name: 'ALICE' }
```

完全符合预期！我们通过简单的 `getter` 和 `setter` 组合，成功地模拟了 Lens 的核心行为。

## Ramda 的真正实现：Functor 的角色

当然，Ramda 的实际源码比我们这里的实现要复杂和抽象得多，它构建在更深层次的函数式理论——**Functor（函子）**之上。

在 Ramda 的世界里，Lens 的 `setter` 并不直接接受一个值，而是接受一个“转换函数”和一个“目标”，然后将这个转换函数应用到一个“容器”（Functor）内的值上。这使得 Lens 不仅仅能处理普通对象，还能处理 `Maybe`、`Either` 等各种抽象数据类型，并且让 Lens 之间的组合变得异常强大和灵活。

深入 Functor 理论超出了本书的入门范畴，但你只需要记住这个核心思想：

> **Lens 将“如何聚焦”和“如何操作”这两个关注点彻底分离了。**

`lensProp`、`lensPath` 等函数负责“如何聚焦”，而 `view`、`set`、`over` 则负责“如何操作”。这种分离，正是函数式编程“组合优于继承”思想的绝佳体现。

通过本章的学习，你应该已经明白了 Lens 并非遥不可及的魔法。它是一种优雅的设计，其核心就是将读取和写入的逻辑封装在一起。下次当你使用 `R.over(R.lensPath([...]), ...)` 时，你的脑海中应该能浮现出 `getter` 和 `setter` 协同工作的清晰画面。
