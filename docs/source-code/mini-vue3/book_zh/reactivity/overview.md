# 响应式系统概览：从 Object.defineProperty 到 Proxy

在 Vue 中，你修改一个响应式变量的值，页面就会自动更新。

```javascript
state.count = 1  // 页面瞬间从 0 变成了 1
```

这看起来像某种黑科技，但背后有着非常清晰的机制。这一章我们来揭开响应式系统的面纱——弄清楚这个"自动"到底是怎么实现的。

## 响应式的本质

**首先要问的第一个问题是：什么是响应式？**

可能很多人会说"数据变了视图就变"，这没错，但还不够深入。让我们换一个角度思考：如果没有响应式系统，你会怎么写代码？

```javascript
// 没有响应式的世界
let count = 0

function updateUI() {
  document.body.innerText = count
}

updateUI()  // 初始化显示

count = 1
updateUI()  // 手动调用更新

count = 2
updateUI()  // 又要手动调用...
```

每次修改数据，都要记得调用 `updateUI()`。忘了？页面就不会变。项目大了之后，到处都是 `updateUI()`，而且你还要小心别漏掉任何一处。

**有没有很痛苦的感觉？**

**响应式系统就是来解决这个痛苦的。**

它是一种**自动化机制**：当数据变化时，依赖这些数据的操作会自动重新执行。换句话说，框架帮你记住了"谁用了这个数据"，数据变了就自动通知它们。

在 Vue 中，这意味着：

```javascript
const state = reactive({ count: 0 })

effect(() => {
  document.body.innerText = state.count
})

state.count = 1  // 页面自动更新为 1，不需要手动调用任何函数！
```

我们没有手动调用任何更新函数，只是修改了 `state.count`，视图就自动变了。

### 核心公式

思考一下，声明式 UI 的核心思想可以表达为：

```
UI = f(state)
```

视图是状态的函数。状态变化时，框架自动重新计算视图。

响应式系统的职责就是：**建立状态与副作用（如视图更新）之间的自动联系**。

### 两个核心操作

**理解了响应式的目标，自然要问第二个问题：Vue 怎么知道数据被读取了？又怎么知道数据被修改了？**

如果你仔细想想，会发现要实现"自动"，需要两个能力：

1. **读取数据时**：记录"谁在读"（依赖收集，track）
2. **修改数据时**：通知"所有读过的人"（派发更新，trigger）

用伪代码表达：

```javascript
let currentEffect = null

// 读取时收集依赖
function track(target, key) {
  if (currentEffect) {
    // 把 currentEffect 记录到 target[key] 的依赖列表
  }
}

// 写入时触发更新
function trigger(target, key) {
  // 找到 target[key] 的所有依赖，依次执行
}
```

**现在最关键的问题来了：JavaScript 中，如何拦截对象属性的读取和写入？**

这可不是普通的函数调用，而是 `obj.key` 这样的语法。JavaScript 提供了什么机制让我们"偷听"这些操作呢？

## Object.defineProperty 方案

Vue 2 使用 ES5 的 `Object.defineProperty` 实现拦截。如果你之前没接触过这个 API，别担心，它的原理很简单。

### 基本用法

```javascript
Object.defineProperty(obj, 'key', {
  get() {
    console.log('读取了 key')  // 拦截读取
    return value
  },
  set(newVal) {
    console.log('设置了 key')  // 拦截写入
    value = newVal
  }
})
```

思考一下：有了这个能力，我们就可以在 `get` 中收集依赖，在 `set` 中触发更新！

### 实现响应式

```javascript
function defineReactive(obj, key, val) {
  const deps = new Set()  // 存储依赖
  
  Object.defineProperty(obj, key, {
    get() {
      // 读取时：收集当前正在执行的 effect
      if (activeEffect) {
        deps.add(activeEffect)
      }
      return val
    },
    set(newVal) {
      val = newVal
      // 写入时：通知所有收集到的 effect 重新执行
      deps.forEach(fn => fn())
    }
  })
}

// 使用
const state = {}
defineReactive(state, 'count', 0)

activeEffect = () => console.log('count is', state.count)
state.count  // 触发依赖收集
activeEffect = null

state.count = 1  // 触发更新，输出 "count is 1"
```

**有没有发现一个很巧妙的点？** 我们只是"读了一下" `state.count`，框架就自动记住了"谁读了它"。之后修改时，自动通知这些"读者"。整个过程对使用者来说是透明的！

### 局限性

**但是，这种方案有几个根本性的问题。** 理解这些局限性很重要，它们直接解释了 Vue 3 为什么要换方案。

**问题一：无法检测属性添加**

```javascript
const state = {}
defineReactive(state, 'count', 0)

state.name = 'Vue'  // 没有被拦截！name 是新属性
```

`defineProperty` 只能拦截已存在的属性。新增属性没有经过处理，自然不会触发更新。

**这就是为什么 Vue 2 需要 `Vue.set` 这个"补丁"方法。** 可能很多人用 Vue 2 时都被这个坑过——明明改了数据，视图却不更新。

**问题二：无法检测属性删除**

```javascript
delete state.count  // 没有被拦截！
```

Vue 2 提供了 `Vue.delete` 来处理。又一个"补丁"。

**问题三：数组索引问题**

```javascript
const state = { list: [1, 2, 3] }
// 假设 list 已经是响应式的

state.list[0] = 10  // 不会触发更新！
```

虽然技术上可以为每个索引设置 getter/setter，但性能代价太高——想象一下一个有 10000 个元素的数组。Vue 2 选择重写数组的变异方法（push、pop、splice 等），这也是一种"打补丁"的做法。

**问题四：初始化递归遍历**

要让一个对象变成响应式，需要遍历所有属性，对每个属性调用 `defineReactive`。如果属性值还是对象，需要继续递归。

```javascript
function observe(obj) {
  if (typeof obj !== 'object') return
  
  for (const key in obj) {
    defineReactive(obj, key, obj[key])
    observe(obj[key])  // 递归处理嵌套对象
  }
}
```

即使某些深层属性永远不会被访问，也会产生遍历开销。**这是一种"预付费"模式——不管用不用，先全部处理一遍。**

**到这里，你可能已经感受到了：`Object.defineProperty` 方案处处受限，需要各种"补丁"来弥补。有没有更优雅的方案？**

## Proxy 方案

Vue 3 改用 ES6 的 `Proxy`。**这是一个根本性的升级，而不是简单的替换。**

### 基本用法

```javascript
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log('读取了', key)  // 任意属性的读取都会被拦截
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log('设置了', key)  // 任意属性的写入都会被拦截
    return Reflect.set(target, key, value, receiver)
  }
})
```

**思考一下这里的关键区别**：`defineProperty` 拦截的是"某个特定属性"，而 `Proxy` 拦截的是"对象上的所有操作"。

这意味着什么？新增属性、删除属性、任意索引访问——全都能拦截！再也不需要 `Vue.set` 了！

### 实现响应式

```javascript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)  // 收集依赖
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      trigger(target, key)  // 触发更新
      return result
    }
  })
}
```

一次代理，整个对象的所有属性访问都被拦截。**有没有感觉非常优雅？** 相比 `defineProperty` 要为每个属性单独设置，Proxy 的设计思路高了一个层次。

### 解决的问题

让我们看看 Proxy 如何解决 `defineProperty` 的所有痛点：

**✅ 自动检测属性添加**：

```javascript
const state = reactive({})

effect(() => console.log(state.name))

state.name = 'Vue'  // 触发更新！不需要任何 Vue.set
```

新属性的赋值也会经过 `set` 拦截器。**再也不需要 `Vue.set` 了！**

**✅ 支持属性删除**：

```javascript
const proxy = new Proxy(target, {
  deleteProperty(target, key) {
    trigger(target, key)  // 删除时也能触发更新
    return Reflect.deleteProperty(target, key)
  }
})

delete state.count  // 可以拦截！不需要 Vue.delete
```

**✅ 原生数组支持**：

```javascript
const state = reactive({ list: [1, 2, 3] })

state.list[0] = 10  // 触发更新！
state.list.push(4)  // 触发更新！
```

不需要重写数组方法，一切都自然工作。

**✅ 惰性代理**：

这是一个很重要的性能优化。不需要在初始化时递归遍历整个对象树，只有访问某个属性时，才检查是否需要继续代理：

```javascript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 新增：惰性代理——只在访问时才处理嵌套对象
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

未被访问的深层属性永远不会被处理。**这是一种"按需付费"模式，比 Vue 2 的"预付费"模式高效得多。**

**但是，惰性代理也有代价**：每次访问嵌套属性都需要检查"是否已经代理过"。想象一下，如果你频繁访问 `obj.a.b.c`，每次都要判断 `a`、`b`、`c` 是否需要代理，这也是开销。

我们需要一个缓存机制来避免重复代理——同一个对象只代理一次，后续直接返回缓存的代理对象。这个问题会在下一章详细讨论。

## Reflect 的作用

你可能注意到，我们使用 `Reflect.get` 而不是直接 `target[key]`。这是为什么？

**可能很多人会觉得这只是写法偏好，其实不然。** 这里有两个重要原因：

### 原因一：保持正确的 this 指向

考虑这个场景：

```javascript
const parent = {
  get value() {
    return this.rawValue  // this 应该指向谁？
  }
}

const child = Object.create(parent)
child.rawValue = 42

const proxy = new Proxy(child, {
  get(target, key) {
    return target[key]  // 直接访问，有问题！
  }
})

console.log(proxy.value)  // 期望 42，实际可能有问题
```

当访问 `proxy.value` 时，触发 `parent.value` 的 getter。此时 `this` 应该指向 `proxy`（才能找到 `rawValue`），但如果不传 `receiver`，`this` 会指向 `parent`。

使用 `Reflect.get(target, key, receiver)` 可以正确传递 `this`。**这是一个很容易被忽略的细节，但在真实场景中会导致奇怪的 bug。**

### 原因二：统一的返回值

`Reflect` 的方法返回布尔值表示操作是否成功，便于在 `set` 中返回正确的值：

```javascript
set(target, key, value, receiver) {
  return Reflect.set(target, key, value, receiver)  // 返回 true/false
}
```

## Vue 3 响应式架构预览

**理解了拦截机制，现在要问一个架构问题：依赖关系存在哪里？**

我们需要一套数据结构来存储"谁依赖了谁"。Vue 3 的设计是一个三层嵌套结构：

```
targetMap: WeakMap<target, Map<key, Set<effect>>>
```

用代码表示：

```javascript
const targetMap = new WeakMap()

function track(target, key) {
  // 第一层：target -> depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 第二层：key -> deps
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 第三层：deps 是一个 Set，存储所有依赖的 effect
  deps.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const deps = depsMap.get(key)
  if (deps) {
    deps.forEach(effect => effect())
  }
}
```

**为什么用 WeakMap？** 这是一个非常精妙的设计，可能很多人第一次看会忽略。

WeakMap 的 key 是弱引用——当 `target` 对象被销毁时，对应的依赖信息会自动被垃圾回收，不会造成内存泄漏。

**如果用普通的 Map，你需要手动清理不再使用的对象的依赖信息。忘了清理？内存泄漏。用了 WeakMap？自动处理！**

## 本章小结

这一章我们回答了三个核心问题：

1. **什么是响应式？** —— 数据变化时，依赖的操作自动重新执行
2. **如何拦截数据访问？** —— Vue 2 用 defineProperty，Vue 3 用 Proxy
3. **为什么 Vue 3 要换方案？** —— Proxy 解决了 defineProperty 的所有限制

响应式系统的核心是：

- **拦截数据访问**：读取时收集依赖，写入时触发更新
- **Vue 2 用 Object.defineProperty**：属性级别拦截，有诸多限制，需要各种"补丁"
- **Vue 3 用 Proxy**：对象级别拦截，解决了 Vue 2 的所有限制，更加优雅

下一章，我们将完整实现 `reactive` 函数，处理深层响应式、缓存、特殊标记等细节。

---

## 练习与思考

1. 用 `Proxy` 实现一个最简单的响应式系统，支持 `reactive` 和 `effect`：

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log('count is', state.count)
})

state.count = 1  // 应该输出 "count is 1"
```

2. `Object.defineProperty` 能否拦截 `in` 操作符和 `for...in` 循环？`Proxy` 呢？

3. 为什么 Vue 3 的响应式系统使用 `WeakMap` 而不是普通的 `Map`？
