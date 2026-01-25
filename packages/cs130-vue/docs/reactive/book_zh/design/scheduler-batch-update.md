# 调度器与批量更新

在实际应用中，数据变化往往是频繁且集中的。一个用户操作可能导致多个状态的更新，如果每次状态变化都立即触发副作用执行，会造成大量不必要的中间计算。调度器（scheduler）机制让 Vue3 可以智能地控制副作用的执行时机，实现批量更新。

## 同步更新的问题

默认情况下，响应式系统的更新是同步的：数据变化后，依赖它的 effect 会立即执行。这在简单场景下工作良好，但在复杂场景下会带来问题。

```javascript
const state = reactive({ 
  firstName: 'John',
  lastName: 'Doe',
  fullName: ''
})

effect(() => {
  state.fullName = `${state.firstName} ${state.lastName}`
  console.log('Updated fullName:', state.fullName)
})

// 如果同时修改两个名字...
state.firstName = 'Jane'  // 触发 effect，输出: Updated fullName: Jane Doe
state.lastName = 'Smith'  // 再次触发 effect，输出: Updated fullName: Jane Smith
```

这段代码中，effect 执行了两次，第一次输出了一个"中间状态"（Jane Doe），这个状态可能是无意义的。更糟糕的是，如果 effect 包含 DOM 操作，就会造成两次不必要的重绘。

在更复杂的场景下，这个问题会更严重。想象一个表单验证逻辑，每修改一个字段就触发一次验证；或者一个图表组件，每修改一个数据点就重新渲染。这些都是性能的浪费。

## scheduler 的基本原理

Vue3 通过 `scheduler` 选项让 effect 可以自定义触发行为。当 effect 需要被触发时，如果它有 scheduler，系统会调用 scheduler 而不是直接执行 effect：

```javascript
const state = reactive({ count: 0 })

effect(
  () => {
    console.log('Effect executed:', state.count)
  },
  {
    scheduler(effect) {
      console.log('Scheduler called, but not running effect yet')
      // 可以选择立即执行、延迟执行、或者不执行
    }
  }
)

state.count++ // 输出: Scheduler called, but not running effect yet
// 没有输出 Effect executed，因为 scheduler 没有调用 effect.run()
```

scheduler 是一个函数，接收 effect 实例作为参数。它拥有完全的控制权，可以决定何时、是否执行 effect。

## 实现批量更新

批量更新的核心思想是：将多次触发合并成一次执行。实现这个目标需要两个组件：一个任务队列，和一个异步刷新机制。

```javascript
// 任务队列
const queue = new Set()
let isFlushing = false

// 将任务加入队列
function queueJob(job) {
  if (!queue.has(job)) {
    queue.add(job)
    queueFlush()
  }
}

// 安排异步刷新
function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    // 使用微任务来延迟执行
    Promise.resolve().then(flushJobs)
  }
}

// 执行队列中的所有任务
function flushJobs() {
  queue.forEach(job => job())
  queue.clear()
  isFlushing = false
}
```

这个简化的实现展示了批量更新的基本原理。当一个任务被加入队列时，会检查是否已经安排了刷新。如果没有，就通过 `Promise.resolve().then()` 安排一个微任务。在当前同步代码执行完毕后，微任务会执行，一次性处理队列中的所有任务。

使用 Set 而不是数组来存储任务，自动实现了去重：同一个任务多次被添加，也只会执行一次。

## 微任务 vs 宏任务

Vue3 选择微任务（microtask）而不是宏任务（macrotask）来执行批量更新。这个选择有重要的影响。

微任务在当前任务结束后、下一个宏任务开始前执行。这意味着更新会在同一个浏览器帧内完成，用户不会看到闪烁或中间状态。

```javascript
// 宏任务：setTimeout
state.count++
setTimeout(() => {
  // 这里可能已经过了一帧，可能看到闪烁
}, 0)

// 微任务：Promise.resolve().then()
state.count++
Promise.resolve().then(() => {
  // 这里还在同一帧内，更新是无缝的
})
```

常见的微任务 API 包括 `Promise.then()`、`MutationObserver`、`queueMicrotask()`。Vue3 优先使用 `Promise.resolve().then()`，因为它在各浏览器中支持最好。

## Vue 组件更新的调度

Vue 组件的更新使用了更复杂的调度策略。每个组件实例都有一个更新函数（update），当组件的响应式状态变化时，这个更新函数会被加入调度队列。

```javascript
// 组件挂载时创建更新 effect
instance.effect = new ReactiveEffect(
  // 渲染函数
  () => {
    // 执行渲染逻辑
  },
  // scheduler
  () => queueJob(instance.update)
)

instance.update = () => {
  instance.effect.run()
}
```

这个设计意味着：无论组件的状态在一个同步块中被修改多少次，组件只会重新渲染一次。

```javascript
// 在事件处理函数中
function handleClick() {
  state.a = 1
  state.b = 2
  state.c = 3
  // 组件只会在这个函数执行完毕后重新渲染一次
}
```

## nextTick 的实现

由于更新是异步的，有时我们需要在更新完成后执行一些操作。`nextTick` API 就是为此设计的：

```javascript
import { nextTick } from 'vue'

state.count++

nextTick(() => {
  // DOM 已经更新
  console.log(document.getElementById('count').textContent)
})

// 或者使用 await
await nextTick()
// DOM 已经更新
```

`nextTick` 的实现很简单：它返回一个 Promise，这个 Promise 会在当前队列刷新后 resolve。由于 Vue 的更新也是通过微任务调度的，`nextTick` 的回调会在更新之后执行。

```javascript
// nextTick 的简化实现
let resolvedPromise = Promise.resolve()

function nextTick(fn) {
  const p = resolvedPromise.then(fn)
  return p
}
```

实际实现稍复杂一些，需要处理队列刷新的时序和错误处理，但核心原理就是这样。

## 不同的刷新时机：flush 选项

`watch` 和 `watchEffect` 提供了 `flush` 选项来控制回调的执行时机：

**flush: 'pre'**（默认）—— 在组件更新之前执行。这是最常用的时机，回调可以读取到更新前的 DOM 状态。

**flush: 'post'** —— 在组件更新之后执行。回调可以访问更新后的 DOM。

**flush: 'sync'** —— 同步执行，不使用队列。每次数据变化都立即执行回调，不推荐在大多数场景使用。

```javascript
const state = reactive({ count: 0 })

// pre flush：在 DOM 更新前执行
watchEffect(() => {
  console.log('Pre:', state.count)
}, { flush: 'pre' })

// post flush：在 DOM 更新后执行
watchEffect(() => {
  console.log('Post:', state.count)
}, { flush: 'post' })

state.count++
// 输出顺序：
// 1. Pre: 1 （在 DOM 更新前）
// 2. （DOM 更新）
// 3. Post: 1 （在 DOM 更新后）
```

实现不同 flush 时机需要多个队列。Vue3 维护了 pre 队列、渲染队列、post 队列，按顺序依次执行。

## 任务优先级

在复杂的应用中，不同的任务可能有不同的优先级。父组件的更新应该在子组件之前（确保子组件收到正确的 props），用户交互的响应应该比数据同步更优先。

Vue3 通过给每个任务分配 ID 来实现排序。任务 ID 在创建时递增分配，早创建的任务 ID 较小。在刷新队列时，会先按 ID 排序：

```javascript
function flushJobs() {
  // 按 ID 升序排序
  const jobs = [...queue].sort((a, b) => a.id - b.id)
  
  for (const job of jobs) {
    job()
  }
  
  queue.clear()
}
```

由于父组件总是比子组件先创建，父组件的更新任务 ID 较小，会先执行。这保证了正确的更新顺序。

## 避免无限循环

调度器需要处理一个潜在的问题：如果一个任务在执行时又触发了同一个任务的调度，可能会导致无限循环。

```javascript
const state = reactive({ count: 0 })

watchEffect(() => {
  state.count++ // 每次执行都会触发自己
})
```

Vue3 通过检测和限制来避免这个问题。在刷新队列时，会记录刷新次数。如果同一个队列刷新超过一定次数（默认 100 次），Vue 会发出警告并停止，提示可能存在无限循环：

```javascript
let flushCount = 0
const RECURSION_LIMIT = 100

function flushJobs() {
  flushCount++
  if (flushCount > RECURSION_LIMIT) {
    console.warn('Maximum recursive updates exceeded')
    return
  }
  
  // 执行任务...
  
  flushCount = 0
}
```

## computed 的惰性调度

`computed` 使用 scheduler 实现了惰性求值。当 computed 的依赖变化时，不是立即重新计算，而是将 computed 标记为"脏"（需要重新计算）。只有当 computed 的值被读取时，才会真正重新计算。

```javascript
const state = reactive({ a: 1, b: 2 })

const sum = computed(() => {
  console.log('Computing sum')
  return state.a + state.b
})

state.a = 10 // 不会输出 "Computing sum"
state.b = 20 // 也不会

// 只有访问 sum.value 时才会计算
console.log(sum.value) // 输出: Computing sum, 30
console.log(sum.value) // 不再输出（有缓存）
```

这种惰性策略避免了不必要的计算。如果 computed 的值没有被使用，即使它的依赖变化了很多次，也不会进行任何计算。

## watch 的调度

`watch` 的调度稍有不同。当被观察的数据变化时，watch 的回调会被加入调度队列（除非设置了 `flush: 'sync'`）。但 watch 还需要处理一些额外的事情：

收集新旧值、调用 onCleanup 清理函数、以及处理 immediate 选项。

```javascript
function doWatch(source, cb, options) {
  let oldValue
  
  const job = () => {
    // 获取新值
    const newValue = effect.run()
    // 调用清理函数
    if (cleanup) cleanup()
    // 调用回调
    cb(newValue, oldValue, onCleanup)
    // 更新旧值
    oldValue = newValue
  }
  
  const effect = new ReactiveEffect(getter, () => {
    // scheduler：将 job 加入队列
    if (options.flush === 'sync') {
      job()
    } else if (options.flush === 'post') {
      queuePostFlushCb(job)
    } else {
      queuePreFlushCb(job)
    }
  })
  
  // immediate: true 时立即执行
  if (options.immediate) {
    job()
  } else {
    oldValue = effect.run()
  }
}
```

这个简化的实现展示了 watch 如何利用 scheduler 和队列来控制回调的执行时机。

## 性能优化：可中断更新（实验性）

在未来的 Vue 版本中，可能会引入可中断更新（Interruptible Updates）的概念，类似于 React 的 Concurrent Mode。核心思想是：长时间运行的更新可以被打断，让浏览器处理更高优先级的任务（如用户输入），然后再继续更新。

这需要更复杂的调度机制，包括任务切分、优先级管理、以及任务恢复。目前 Vue3 还没有正式实现这个特性，但调度器的设计为未来的这类优化预留了空间。

## 小结

调度器是 Vue3 响应式系统中实现批量更新的关键机制。通过 scheduler 选项，effect 可以自定义触发行为，而不是简单地同步执行。任务队列和微任务机制实现了批量执行，避免了中间状态和不必要的重复计算。不同的 flush 时机（pre、post、sync）满足了不同的使用场景。computed 利用 scheduler 实现惰性求值，watch 利用 scheduler 实现回调的正确时序。

调度器的设计体现了 Vue3 对性能和开发体验的追求。开发者可以安心地修改数据，而不用担心会触发过多的更新。在下一章中，我们将深入探讨 computed 的惰性求值设计。

