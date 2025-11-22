# Day 1: 深入理解 Proxy 基础

你好，我是你的技术导师。欢迎来到 Mini-Vue3 的第一天。

在接下来的旅程中，我们将一起亲手构建一个属于自己的 Vue 3 响应式系统。但在写下第一行代码之前，我们需要先聊聊"代理"（Proxy）。

你可能听说过，Vue 3 相比 Vue 2 最大的变化之一就是将响应式系统的核心从 `Object.defineProperty` 换成了 `Proxy`。

但这究竟是为什么？仅仅是为了性能吗？还是为了解决某些无法逾越的痛点？

今天，我不打算直接把 `Proxy` 的 API 丢给你，而是想带你重走一遍 Vue 团队的思考路径。我们要从 Vue 2 的局限性出发，看看 `Proxy` 是如何像一位救世主一样，优雅地解决了那些困扰我们多年的难题。

准备好了吗？让我们开始吧。

## 1. 为什么我们要抛弃 Object.defineProperty？

想象一下，你正在使用 Vue 2 开发一个应用。你定义了一个数据对象：

```javascript
const data = {
  name: 'Vue',
  age: 2
}
```

Vue 2 会使用 `Object.defineProperty` 来"劫持"这些属性的读取和设置操作，从而实现响应式。这听起来很完美，对吧？

但是，当你试图做一些"出格"的事情时，问题就来了。

### 痛点一：无法感知的"新朋友"

假设你想给 `data` 增加一个新属性 `description`：

```javascript
data.description = 'The Progressive Framework'
```

在 Vue 2 中，这行代码**不会**触发视图更新。为什么？

因为 `Object.defineProperty` 只能劫持**已经存在**的属性。当你定义 `data` 时，`description` 并不存在，所以它没有被劫持。Vue 根本不知道你添加了这个属性。

这就是为什么在 Vue 2 中，你不得不使用那个略显笨拙的 `$set` 方法：

```javascript
this.$set(this.data, 'description', 'The Progressive Framework')
```

这不仅增加了心智负担，也让代码变得不那么自然。

### 痛点二：数组的尴尬

数组的问题更让人头疼。

```javascript
const list = [1, 2, 3]
list[0] = 100 // Vue 2 无法检测到！
list.push(4)  // Vue 2 需要重写 push 方法才能检测到！
```

`Object.defineProperty` 对数组的支持非常有限。为了让数组也能响应式，Vue 2 不得不通过"猴子补丁"（Monkey Patch）的方式，重写了数组的 7 个变异方法（push, pop, shift, unshift, splice, sort, reverse）。

但这依然无法解决通过索引直接修改数组元素的问题。

### 痛点三：性能的隐忧

为了让嵌套对象也能响应式，Vue 2 必须在初始化时就**递归**地遍历整个对象树，把每个属性都转换成 getter/setter。

如果你的数据对象很大，层级很深，这个初始化过程就会变得非常昂贵，甚至导致页面卡顿。

## 2. Proxy：全能的拦截者

这时候，ES6 带来的 `Proxy` 就像一道光，照亮了前行的路。

`Proxy`，顾名思义，就是"代理"。它允许你创建一个对象的代理，并拦截对这个代理对象的**几乎所有**操作。

注意我的用词：**几乎所有**。不仅仅是读取和设置，还包括删除属性、判断属性是否存在（`in` 操作符）、甚至获取属性键名（`Object.keys`）。

更重要的是，`Proxy` 是针对**整个对象**进行拦截的，而不是某个具体的属性。这意味着，无论你在这个对象上添加多少新属性，它们都会自动被拦截！

让我们来看一个最简单的例子：

```javascript
const target = {
  name: 'Vue',
  age: 3
}

const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log(`正在读取属性: ${key}`)
    return target[key]
  },
  set(target, key, value, receiver) {
    console.log(`正在设置属性: ${key} = ${value}`)
    target[key] = value
    return true
  }
})
```

现在，让我们试试之前的痛点：

```javascript
// 1. 读取属性
proxy.name 
// 输出: 正在读取属性: name

// 2. 设置属性
proxy.age = 4 
// 输出: 正在设置属性: age = 4

// 3. 新增属性（Vue 2 的痛点！）
proxy.description = 'Awesome' 
// 输出: 正在设置属性: description = Awesome
// 完美拦截！不需要 $set！
```

看到了吗？我们不需要预先知道 `description` 属性的存在，`Proxy` 依然能捕获到它的设置操作。这就是 `Proxy` 的强大之处。

## 3. 深入 Proxy 的拦截器

`Proxy` 提供了 13 种拦截器（Trap），覆盖了对象操作的方方面面。在 Vue 3 的响应式系统中，我们主要关注以下几种：

### 3.1 get：读取拦截

这是最常用的拦截器。每当你访问属性时，都会触发它。在 Vue 3 中，这里是**收集依赖**（Track）的地方。

```javascript
get(target, key, receiver) {
  // 1. 收集依赖：记录谁在用这个属性
  track(target, key)
  
  // 2. 返回属性值
  return Reflect.get(target, key, receiver)
}
```

### 3.2 set：设置拦截

每当你修改属性时，都会触发它。在 Vue 3 中，这里是**触发更新**（Trigger）的地方。

```javascript
set(target, key, value, receiver) {
  // 1. 触发更新：通知所有用这个属性的地方
  trigger(target, key)
  
  // 2. 设置属性值
  return Reflect.set(target, key, value, receiver)
}
```

### 3.3 has：in 操作符拦截

你可能没注意过，`in` 操作符也是可以被拦截的。

```javascript
const handler = {
  has(target, key) {
    console.log(`检查属性: ${key}`)
    track(target, key) // 依赖收集也应该包含这里！
    return Reflect.has(target, key)
  }
}

'name' in proxy // 触发拦截
```

### 3.4 deleteProperty：删除拦截

`delete` 操作符同样逃不过 `Proxy` 的法眼。

```javascript
const handler = {
  deleteProperty(target, key) {
    console.log(`删除属性: ${key}`)
    trigger(target, key) // 删除属性也应该触发更新！
    return Reflect.deleteProperty(target, key)
  }
}

delete proxy.name // 触发拦截
```

## 4. 为什么 Vue 3 选择 Proxy？

现在，我们可以回答最初的问题了。Vue 3 选择 `Proxy` 绝不仅仅是为了赶时髦，而是为了彻底解决 Vue 2 的架构缺陷：

1.  **全方位的监听能力**：原生支持监听属性的新增、删除，以及数组的索引访问和长度变化。再也不需要 `$set`、`$delete` 和数组方法的猴子补丁了。
2.  **懒代理（Lazy Proxy）**：`Proxy` 只有在你访问嵌套对象时，才会为该对象创建代理。这意味着，如果你的数据对象很大，但页面只用到了其中一小部分，Vue 3 的初始化速度会比 Vue 2 快得多，内存占用也更少。
3.  **更好的生态对接**：`Proxy` 是 ES 标准的一部分，随着 JS 引擎的优化，它的性能只会越来越好。

## 5. 动手时刻：实现一个简单的拦截器

光说不练假把式。现在，请打开你的编辑器，创建一个 `index.js` 文件，我们来亲手写一个简单的拦截器，感受一下 `Proxy` 的魅力。

```javascript
// 目标对象
const user = {
  name: 'Alice',
  age: 25
}

// 处理器对象
const handler = {
  get(target, key) {
    console.log(`[读取]: ${String(key)}`)
    return target[key]
  },
  set(target, key, value) {
    console.log(`[设置]: ${String(key)} = ${value}`)
    target[key] = value
    return true
  }
}

// 创建代理
const proxyUser = new Proxy(user, handler)

// 测试一下
console.log('--- 测试读取 ---')
console.log(proxyUser.name)

console.log('--- 测试设置 ---')
proxyUser.age = 26

console.log('--- 测试新增 ---')
proxyUser.email = 'alice@example.com'
```

运行这段代码，观察控制台的输出。当你看到"测试新增"部分也能正确输出 `[设置]: email = alice@example.com` 时，恭喜你，你已经迈出了理解 Vue 3 响应式原理的第一步。

## 6. 总结与预告

今天，我们深入探讨了 `Proxy` 的核心概念，并对比了它与 `Object.defineProperty` 的区别。我们明白了 Vue 3 为什么要进行这次底层的"大换血"。

`Proxy` 给了我们强大的拦截能力，但它只是响应式系统的基石。

你可能会问：
- 拦截到操作后，我们具体该做什么？
- 怎么知道是哪个函数在读取属性？
- 属性变化后，怎么通知对应的函数重新执行？

这些问题的答案，藏在两个核心概念中：**Reflect** 和 **Effect**。

明天，我们将深入研究 `Reflect` API，看看它如何与 `Proxy` 完美配合，修复一些你可能还没意识到的隐蔽 Bug。

保持好奇心，我们明天见！
