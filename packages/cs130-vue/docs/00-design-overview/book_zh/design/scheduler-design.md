# 响应式系统的调度策略

调度是响应式系统中一个容易被忽视但极其重要的部分。它决定了副作用何时执行、以什么顺序执行，直接影响应用的性能和正确性。

## 同步执行的问题

最简单的策略是在数据变化时立即同步执行所有 effect：

```javascript
function trigger(target, key) {
  const effects = getEffects(target, key)
  effects.forEach(effect => effect.run())  // 立即同步执行
}
```

这种方式有几个问题。

首先是重复执行。一个组件可能依赖多个属性，连续修改这些属性会导致组件多次重渲染。

```javascript
state.firstName = 'John'
state.lastName = 'Doe'
// 如果组件同时依赖两个属性，会渲染两次
```

其次是执行顺序问题。父子组件可能因为触发顺序的偶然性，导致子组件先于父组件更新，产生不一致的中间状态。

最后是递归触发。effect 执行过程中修改了其他响应式数据，可能导致无限循环。

## Vue3 的调度机制

Vue3 使用异步队列来调度更新。当响应式数据变化时，不立即执行 effect，而是将其加入队列，在微任务中统一执行。

```javascript
const queue: SchedulerJob[] = []
let isFlushing = false

function queueJob(job: SchedulerJob) {
  // 去重：同一个 job 只入队一次
  if (!queue.includes(job)) {
    queue.push(job)
  }
  // 调度一次 flush
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  // 按照组件树顺序排序
  queue.sort((a, b) => a.id - b.id)
  // 依次执行
  for (const job of queue) {
    job()
  }
  queue.length = 0
  isFlushing = false
}
```

这个机制带来几个好处：

批量更新：同一个事件循环中的多次数据修改，只触发一次更新。

顺序保证：通过排序确保父组件先于子组件更新。

去重：同一个组件在一次 flush 中只更新一次。

## 父子组件更新顺序

Vue 为每个组件分配一个递增的 ID，父组件的 ID 小于子组件。调度时按 ID 排序，确保父组件先更新。

```javascript
// 组件创建时分配 ID
let uid = 0
function createComponentInstance(vnode, parent) {
  const instance = {
    uid: uid++,  // 递增 ID
    // ...
  }
  return instance
}

// 更新任务携带组件 ID
instance.update = () => { /* ... */ }
instance.update.id = instance.uid
```

为什么父组件要先更新？因为父组件更新可能改变传给子组件的 props，如果子组件先更新，使用的是旧 props，之后又会因为 props 变化再次更新，造成浪费。

## 生命周期钩子的调度

生命周期钩子也需要调度。mounted 和 updated 钩子应该在 DOM 更新完成后执行。

```javascript
const pendingPostFlushCbs: Function[] = []

function queuePostFlushCb(cb: Function) {
  pendingPostFlushCbs.push(cb)
}

function flushJobs() {
  // 先执行组件更新
  for (const job of queue) {
    job()
  }
  // 再执行 post 回调（mounted、updated 等）
  for (const cb of pendingPostFlushCbs) {
    cb()
  }
  pendingPostFlushCbs.length = 0
}
```

这确保了在 mounted 钩子中可以访问到已渲染的 DOM。

## watchEffect 与 watch 的调度差异

`watchEffect` 默认在组件更新前执行（pre），`watch` 默认在组件更新后执行（post）。

```javascript
watchEffect(() => {
  console.log(state.count)  // pre: 在 DOM 更新前执行
})

watch(source, (newVal) => {
  console.log(newVal)  // post: 在 DOM 更新后执行
})
```

可以通过 flush 选项控制：

```javascript
watchEffect(() => { /* ... */ }, { flush: 'post' })  // 改为更新后执行
watchEffect(() => { /* ... */ }, { flush: 'sync' })  // 同步执行（谨慎使用）
```

sync 模式绕过调度队列，在数据变化时立即执行。这在某些需要精确时序控制的场景有用，但可能影响性能。

## 调度策略的权衡

Vue3 的默认调度策略是为通用场景优化的。它牺牲了一些实时性（不是立即执行），换取了更好的性能（批量去重）和可预测性（顺序保证）。

对于特殊场景，Vue 提供了调整选项。开发者可以根据具体需求选择合适的策略。这种灵活性是框架设计的重要考量。
