# 调度器设计

Vue 的响应式系统能检测到状态变化，但如果每次变化都立即更新 DOM，性能会很糟糕。调度器（Scheduler）的职责是收集更新任务、去重、批量执行。

## 问题场景

看这段代码：

```javascript
const count = ref(0)

// 在一个同步代码块中多次修改
count.value++
count.value++
count.value++
```

如果每次修改都触发组件重渲染，会渲染三次。但最终状态只是 count 从 0 变成 3，渲染一次就够了。

调度器通过将更新任务推迟到微任务队列，确保同步代码执行完毕后才统一更新。

## 任务队列设计

调度器维护一个任务队列和刷新状态：

```javascript
const queue = []
let isFlushing = false
let isFlushPending = false

const resolvedPromise = Promise.resolve()
let currentFlushPromise = null
```

组件更新时，effect 不直接执行，而是加入队列：

```javascript
function queueJob(job) {
  // 去重：相同的 job 只保留一个
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

`queueFlush` 通过 `Promise.then` 将刷新操作推迟到微任务。同步代码中的多次修改只会触发一次刷新。

## 刷新流程

```javascript
function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  // 按组件层级排序，父组件先更新
  queue.sort((a, b) => a.id - b.id)
  
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i]
      job()
    }
  } finally {
    queue.length = 0
    isFlushing = false
    currentFlushPromise = null
  }
}
```

排序很重要。如果子组件先更新，父组件再更新时可能会触发子组件再次更新，浪费性能。按层级排序确保父组件先更新，更新过程中可能会发现子组件不需要更新了。

## 组件更新任务

组件挂载时创建一个 effect，其调度器将 job 入队：

```javascript
function setupRenderEffect(instance, vnode, container) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 初次挂载
      const subTree = instance.render.call(instance.proxy)
      patch(null, subTree, container)
      instance.subTree = subTree
      instance.isMounted = true
    } else {
      // 更新
      const prevTree = instance.subTree
      const nextTree = instance.render.call(instance.proxy)
      patch(prevTree, nextTree, container)
      instance.subTree = nextTree
    }
  }
  
  const effect = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(instance.update)
  })
  
  // update 就是带调度的 effect.run
  instance.update = () => effect.run()
  instance.update.id = instance.uid
  
  instance.update()
}
```

当组件依赖的响应式数据变化时，不会立即调用 `componentUpdateFn`，而是通过调度器的 `queueJob` 将 `update` 加入队列。

## nextTick

开发者有时需要在 DOM 更新后执行代码。`nextTick` 返回一个 Promise，在当前刷新完成后 resolve：

```javascript
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

使用示例：

```javascript
count.value++
await nextTick()
// DOM 已更新
console.log(element.textContent)
```

## Pre 和 Post 队列

实际的调度器还有 Pre 和 Post 队列：

```javascript
const pendingPreFlushCbs = []
const pendingPostFlushCbs = []
```

**Pre 队列**：在组件更新之前执行，用于 watch 的回调（flush: 'pre'）

**Post 队列**：在组件更新之后执行，用于访问更新后的 DOM（flush: 'post'）

```javascript
function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  // 1. 执行 Pre 队列
  flushPreFlushCbs()
  
  // 2. 执行组件更新队列
  queue.sort((a, b) => a.id - b.id)
  for (const job of queue) {
    job()
  }
  queue.length = 0
  
  // 3. 执行 Post 队列
  flushPostFlushCbs()
  
  isFlushing = false
}
```

## 避免无限循环

如果在更新过程中又触发了更新，可能导致无限循环。调度器需要检测这种情况：

```javascript
let flushIndex = 0
const RECURSION_LIMIT = 100
const counts = new Map()

function flushJobs() {
  // ...
  for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
    const job = queue[flushIndex]
    
    // 检测递归
    const count = counts.get(job) || 0
    if (count > RECURSION_LIMIT) {
      throw new Error('Maximum recursive updates exceeded')
    }
    counts.set(job, count + 1)
    
    job()
  }
  
  counts.clear()
  // ...
}
```

## 失效任务处理

有时任务在执行前就已经无效了。比如组件被卸载后，其更新任务应该跳过：

```javascript
function queueJob(job) {
  if (!queue.includes(job)) {
    if (job.id == null) {
      queue.push(job)
    } else {
      // 带 id 的任务插入合适位置
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}

// job 可以设置 active 标记
function flushJobs() {
  for (const job of queue) {
    if (job.active !== false) {
      job()
    }
  }
}
```

卸载组件时将 `job.active = false`，刷新时跳过。

## 与响应式系统协作

调度器是响应式系统和渲染器的桥梁。响应式 effect 的 scheduler 选项决定了副作用如何执行：

```javascript
// 立即执行（默认）
effect(() => console.log(count.value))

// 通过调度器执行
effect(() => console.log(count.value), {
  scheduler: (fn) => queueJob(fn)
})
```

组件 effect 使用调度器，watch/watchEffect 也使用调度器。这保证了：
1. 同步修改只触发一次更新
2. 更新在微任务中批量执行
3. 更新顺序可控（父先子后）

## 为什么用微任务

JavaScript 有多种异步机制：宏任务（setTimeout）、微任务（Promise）、requestAnimationFrame。

Vue 选择微任务的原因：

1. **足够快**：微任务在当前同步代码之后、下一个宏任务之前执行，延迟最小
2. **稳定**：不受帧率或浏览器调度影响
3. **批量处理**：同一事件循环中的多次修改合并处理

早期 Vue 尝试过混用宏任务和微任务，导致一些边界问题。Vue 3 统一使用微任务，逻辑更简单可预测。

## 简化实现

```javascript
const queue = []
let isFlushing = false

function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    if (!isFlushing) {
      isFlushing = true
      Promise.resolve().then(() => {
        try {
          queue.sort((a, b) => a.id - b.id)
          queue.forEach(job => job())
        } finally {
          queue.length = 0
          isFlushing = false
        }
      })
    }
  }
}

function nextTick(fn) {
  return fn 
    ? Promise.resolve().then(fn) 
    : Promise.resolve()
}
```

这个简化版本展示了核心思想：收集、去重、延迟、批量执行。

## 小结

调度器通过微任务机制将同步的多次状态变更合并为一次异步更新。它是 Vue 性能优化的关键组件，与响应式系统、渲染器紧密协作，确保更新既高效又可预测。
