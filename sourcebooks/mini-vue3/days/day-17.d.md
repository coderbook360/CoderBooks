# Day 17: watch 监听器实现

你好，我是你的技术导师。

今天，我们要实现 Vue 3 中另一个非常重要的 API —— **watch**。

如果说 `computed` 是为了**计算**（生成新数据），那么 `watch` 就是为了**副作用**（执行动作）。
比如：数据变了发个请求、存个 LocalStorage、打个 Log 等等。

`watch` 的实现原理其实非常巧妙，它本质上就是利用了我们之前实现的 `ReactiveEffect` 的 `scheduler` 机制。

## 1. 核心原理：Effect + Scheduler

回顾一下 `ReactiveEffect`：

```typescript
const effect = new ReactiveEffect(getter, scheduler)
```

-   `getter`：依赖收集函数。
-   `scheduler`：依赖变化时的回调函数。

这不正是 `watch` 想要的功能吗？
-   `getter` 就是我们要监听的数据源（source）。
-   `scheduler` 就是数据变化时我们要执行的回调（callback）。

所以，`watch` 的骨架非常简单：

```typescript
function watch(source, cb) {
  let getter
  // ... 处理 source 变成 getter ...

  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }

  const effect = new ReactiveEffect(getter, job)
  
  // 首次执行，收集依赖，并获取初始值
  let oldValue = effect.run()
}
```

## 2. 数据源的规范化

`watch` 的强大之处在于它支持多种数据源：
1.  `ref`
2.  `reactive` 对象
3.  getter 函数
4.  数组（多个源）

我们需要把这些五花八门的输入，统一转换成一个标准的 `getter` 函数。

```typescript
function watch(source, cb) {
  let getter

  if (isRef(source)) {
    // 1. 如果是 ref，直接读取 .value
    getter = () => source.value
  } else if (isReactive(source)) {
    // 2. 如果是 reactive，需要深度遍历读取所有属性
    getter = () => traverse(source)
  } else if (typeof source === 'function') {
    // 3. 如果是函数，直接用
    getter = source
  } else {
    getter = () => {}
    console.warn('Invalid watch source')
  }
  
  // ...
}
```

### 2.1 深度监听：traverse

对于 `reactive` 对象，我们需要访问它的每一个属性，才能收集到所有依赖。
这就需要一个递归遍历函数 `traverse`。

```typescript
function traverse(value, seen = new Set()) {
  // 避免循环引用导致的死循环
  if (!isObject(value) || seen.has(value)) return value
  seen.add(value)

  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}
```

## 3. 立即执行：immediate

有时候我们需要在 `watch` 创建时立即执行一次回调。
这也很简单，只需要手动调用一次 `job` 即可。

```typescript
function watch(source, cb, { immediate } = {}) {
  // ... 创建 effect ...

  const job = () => { /* ... */ }

  if (immediate) {
    job() // 立即执行回调
  } else {
    oldValue = effect.run() // 只收集依赖，不执行回调
  }
}
```

注意这里的一个细节：
-   如果 `immediate: true`，第一次执行 `job` 时，`oldValue` 是 `undefined`。
-   如果 `immediate: false`，我们需要手动调用 `effect.run()` 来获取初始值作为 `oldValue`。

## 4. 停止监听

`watch` 会返回一个停止函数，用于手动取消监听。
这直接调用 `effect.stop()` 就能实现。

```typescript
function watch(source, cb) {
  // ...
  const effect = new ReactiveEffect(getter, job)
  // ...

  return () => {
    effect.stop()
  }
}
```

## 5. 总结

今天我们实现的 `watch`，再次证明了我们底层架构（ReactiveEffect）的强大。

1.  **复用**：`watch` 没有引入新的响应式机制，完全基于 `effect` 和 `scheduler`。
2.  **适配**：通过规范化层，支持了多种数据源。
3.  **灵活**：通过 `immediate` 等选项，满足了不同的业务需求。

至此，Vue 3 的响应式系统（Reactivity）部分，我们已经全部完成了！

从最底层的 `Proxy` 拦截，到核心的 `track/trigger`，再到上层的 `computed` 和 `watch`。
我们亲手构建了一座精密的响应式大厦。

明天，我们将开启一段全新的旅程。
我们将离开纯数据的世界，去探索 Vue 3 的另一个核心 —— **Runtime（运行时）**。
我们将亲手实现组件的渲染、更新，以及那个传说中的 **Diff 算法**。

准备好了吗？真正的挑战才刚刚开始。
