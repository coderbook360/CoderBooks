# Day 8: 实现 track 依赖收集函数

你好，我是你的技术导师。

在之前的课程中，我们已经搭建好了响应式系统的骨架：
- `reactive` 负责拦截。
- `effect` 负责执行。
- `activeEffect` 负责标记当前正在执行的副作用。

今天，我们要完成最关键的一步：**连接**。

我们需要实现 `track` 函数，把"数据"（Target）和"副作用"（Effect）精准地绑定在一起。

这听起来很简单：当数据被读取时，把 `activeEffect` 存起来。

但问题是：**存到哪里？怎么存？**

如果存得不好，不仅会导致依赖混乱（改了 A 却更新了 B），还会引发严重的内存泄漏。

今天，我们就来深入剖析 Vue 3 那精妙绝伦的依赖存储结构。

## 1. 设计数据结构：三层套娃的智慧

我们需要记录的信息有三个维度：
1.  **哪个对象**被读取了？（Target）
2.  **哪个属性**被读取了？（Key）
3.  **哪些副作用**依赖它？（Effect）

这天然对应了一个三层结构。

### 1.1 第一层：WeakMap (Target -> DepsMap)

```typescript
const targetMap = new WeakMap()
```

**为什么是 WeakMap？**

我们在 Day 3 中提到过，这是为了**防止内存泄漏**。

如果使用普通的 `Map`，只要 `targetMap` 存在，它引用的所有响应式对象（Target）就永远不会被垃圾回收。哪怕你在代码中已经把 `user` 对象设为 `null` 了，它依然顽固地活在 `targetMap` 里。

而 `WeakMap` 持有的是对象的**弱引用**。一旦 `user` 对象在其他地方没有被引用了，垃圾回收器（GC）就会无视 `targetMap` 的引用，直接回收 `user`，并且自动从 `targetMap` 中移除对应的条目。

这是 Vue 3 能够长期稳定运行、不撑爆内存的关键。

### 1.2 第二层：Map (Key -> Dep)

```typescript
const depsMap = new Map()
```

**为什么是 Map？**

因为对象的属性名（Key）通常是字符串或 Symbol，不需要弱引用。而且 `Map` 的查找性能优于普通对象，还能保持插入顺序（虽然在这里顺序不重要，但性能至关重要）。

### 1.3 第三层：Set (Dep)

```typescript
const dep = new Set()
```

**为什么是 Set？**

因为一个属性可能被同一个 `effect` 读取多次。

```javascript
effect(() => {
  console.log(state.count)
  console.log(state.count) // 第二次读取
})
```

如果不去重，`dep` 里就会有两个相同的 `effect`。当 `count` 变化时，这个 `effect` 就会被执行两次。这显然是浪费。

`Set` 天然具有**去重**功能，完美解决了这个问题。

## 2. 实现 track：精准制导

有了这三层结构，`track` 的实现就变成了简单的"填空题"。

```typescript
// 全局容器
const targetMap = new WeakMap()

export function track(target, key) {
  // 1. 边界检查：如果没有 activeEffect，说明不是在 effect 中读取的，直接忽略
  if (!activeEffect || !shouldTrack) return
  
  // 2. 获取 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  
  // 3. 获取 dep
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  
  // 4. 收集依赖
  trackEffects(dep)
}
```

## 3. 双向记录：为了更好的告别

在 `trackEffects` 中，我们不仅要把 `effect` 添加到 `dep` 中，还要做一件看起来"多余"的事情：

**把 `dep` 也添加到 `effect` 中。**

```typescript
export function trackEffects(dep) {
  // 1. 正向收集：属性 -> effect
  // 如果已经收集过，就不重复收集（Set 自动去重，但这里判断一下性能更好）
  if (dep.has(activeEffect)) return
  
  dep.add(activeEffect)
  
  // 2. 反向收集：effect -> 属性
  activeEffect.deps.push(dep)
}
```

为什么要这么做？

为了**清理（Cleanup）**。

想象一下这个场景：

```javascript
effect(() => {
  document.body.innerText = state.ok ? state.text : 'not ok'
})
```

1.  初始 `state.ok` 为 `true`。`effect` 依赖了 `ok` 和 `text`。
2.  修改 `state.ok` 为 `false`。`effect` 重新执行。
3.  此时 `effect` 只依赖 `ok`。它**不再依赖** `text` 了。

如果我们不清理旧的依赖，当 `state.text` 变化时，`effect` 依然会被触发。这不仅浪费性能，还可能导致 Bug。

为了能清理，`effect` 必须知道"我依赖了谁"。这就是 `activeEffect.deps` 的作用。

在每次 `effect` 重新执行前，我们会调用 `cleanupEffect`：

```typescript
function cleanupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      // 从 dep 中删除自己
      deps[i].delete(effect)
    }
    // 清空自己的记录
    deps.length = 0
  }
}
```

这就是**双向记录**的意义：为了能够优雅地"分手"。

## 4. 总结与预告

今天，我们完成了响应式系统的最后一块拼图 —— `track` 函数。

我们学到了：
1.  **三层存储结构**：`WeakMap -> Map -> Set`，兼顾了内存安全、性能和去重。
2.  **双向收集**：不仅属性记录 effect，effect 也记录属性（的 dep），为依赖清理打下基础。
3.  **精准控制**：利用 `activeEffect` 和 `shouldTrack` 避免不必要的收集。

现在，我们的响应式系统已经可以工作了！

你可以试着写一段代码：

```javascript
const state = reactive({ count: 0 })
let dummy
effect(() => {
  dummy = state.count
})
console.log(dummy) // 0
state.count++
console.log(dummy) // 1
```

如果它能正常运行，恭喜你，你已经亲手造出了 Vue 3 的核心引擎。

明天，我们将进入一个新的篇章。我们将利用这个引擎，去实现 Vue 3 中最常用的两个 API：**ref** 和 **computed**。

准备好迎接更高层的抽象了吗？我们明天见！
