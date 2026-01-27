# 异步更新机制

上一章讨论了调度器的设计，这一章深入分析 Vue 的异步更新机制——为什么更新是异步的、异步带来的问题、以及如何正确处理。

## 同步更新的问题

假设更新是同步的：

```javascript
const count = ref(0)

function onClick() {
  for (let i = 0; i < 100; i++) {
    count.value++
  }
}
```

每次 `count.value++` 都触发组件重渲染，循环中会渲染 100 次。但用户只关心最终结果，中间状态毫无意义。

更糟的是，多个响应式数据在同一事件中变化：

```javascript
function updateUser() {
  user.name = 'Alice'
  user.age = 25
  user.email = 'alice@example.com'
}
```

如果每次赋值都触发更新，会渲染三次。异步批量更新将这些变更合并为一次。

## 微任务时机

Vue 使用 `Promise.then()` 将更新推迟到微任务队列。微任务在以下时机执行：

1. 当前同步代码执行完毕
2. 调用栈清空
3. 下一个宏任务之前

```javascript
console.log('1')
Promise.resolve().then(() => console.log('2'))
console.log('3')
// 输出：1, 3, 2
```

这意味着事件处理函数中的所有同步代码执行完毕后，才会触发组件更新。

## 更新流程时序

当响应式数据变化时：

```
1. count.value = 1  (触发 trigger)
     |
     v
2. 调用 effect 的 scheduler
     |
     v
3. queueJob(componentUpdate)
     |
     v
4. 检查是否已调度刷新
     |-- 未调度 --> Promise.resolve().then(flushJobs)
     |-- 已调度 --> 返回（job 已入队）
     v
5. 继续执行同步代码
     |
     v
6. 同步代码结束，调用栈清空
     |
     v
7. 微任务执行 flushJobs
     |
     v
8. DOM 更新
```

## 访问更新后的 DOM

异步更新带来一个问题：修改数据后立即访问 DOM，拿到的是旧值。

```javascript
const count = ref(0)

function onClick() {
  count.value++
  console.log(el.textContent)  // 还是 "0"
}
```

解决方案是使用 `nextTick`：

```javascript
async function onClick() {
  count.value++
  await nextTick()
  console.log(el.textContent)  // "1"
}
```

或者用回调形式：

```javascript
function onClick() {
  count.value++
  nextTick(() => {
    console.log(el.textContent)  // "1"
  })
}
```

## nextTick 实现

`nextTick` 的实现很简单——返回当前刷新队列的 Promise，或创建一个新的：

```javascript
let currentFlushPromise = null

function nextTick(fn) {
  const p = currentFlushPromise || Promise.resolve()
  return fn ? p.then(fn) : p
}
```

关键是 `currentFlushPromise` 在 `queueFlush` 时设置：

```javascript
function queueFlush() {
  if (!isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

这样，`nextTick` 返回的 Promise 会在 `flushJobs` 完成后 resolve。

## watch 的 flush 选项

`watch` 提供三种 flush 时机：

```javascript
// 'pre' - 组件更新前
watch(source, callback, { flush: 'pre' })

// 'post' - 组件更新后（默认）
watch(source, callback, { flush: 'post' })

// 'sync' - 同步执行（不推荐）
watch(source, callback, { flush: 'sync' })
```

**flush: 'pre'**：回调在组件渲染之前执行，可以修改其他响应式状态，这些修改会包含在本次渲染中。

**flush: 'post'**：回调在组件渲染之后执行，可以访问更新后的 DOM。这是在模板 ref 变化时的正确选择。

**flush: 'sync'**：每次数据变化立即执行回调，不走调度器。可能导致性能问题和不一致状态，应避免使用。

## Pre 和 Post 队列

调度器维护三个队列：

```javascript
const pendingPreFlushCbs = []  // watch flush: 'pre'
const queue = []                // 组件更新
const pendingPostFlushCbs = []  // watch flush: 'post'
```

执行顺序：

```javascript
function flushJobs() {
  // 1. Pre flush callbacks
  flushPreFlushCbs()
  
  // 2. Component updates
  for (const job of queue) {
    job()
  }
  
  // 3. Post flush callbacks
  flushPostFlushCbs()
}
```

这个顺序确保了：
- Pre 回调可以影响本次渲染
- 组件更新后 Post 回调能访问新 DOM

## 嵌套更新

在刷新过程中可能产生新任务：

```javascript
watch(count, () => {
  // 这个回调在刷新过程中执行
  // 可能触发新的更新
  other.value++
})
```

调度器需要处理这种情况：

```javascript
function flushJobs() {
  isFlushing = true
  
  // 循环直到队列清空
  // 新加入的任务会在本轮处理
  while (queue.length) {
    const job = queue.shift()
    job()
  }
  
  // Post 队列同理
  while (pendingPostFlushCbs.length) {
    const cb = pendingPostFlushCbs.shift()
    cb()
  }
  
  isFlushing = false
}
```

实际实现更复杂，需要防止无限循环。

## 与事件循环的关系

理解 JavaScript 事件循环对理解异步更新很重要：

```
[宏任务] --> [微任务队列] --> [渲染] --> [宏任务] --> ...
```

Vue 的更新在微任务阶段完成：

```javascript
button.addEventListener('click', () => {
  // 宏任务：事件处理
  count.value++  // 触发更新入队
  count.value++  // 同一个任务，合并
})  // 同步代码结束

// 微任务：flushJobs
// 执行组件更新

// 浏览器渲染：反映 DOM 变化
```

用户点击后，浏览器渲染时 DOM 已经是最新状态，因为微任务先于渲染执行。

## Suspense 与异步组件

异步组件和 Suspense 增加了复杂性。异步组件在 setup 中返回 Promise：

```javascript
async setup() {
  const data = await fetchData()
  return { data }
}
```

Suspense 需要协调多个异步组件的加载状态，这涉及到额外的调度逻辑，将在 Suspense 章节详细讨论。

## 最佳实践

1. **理解异步性**：修改数据后 DOM 不会立即更新
2. **使用 nextTick**：需要访问更新后的 DOM 时
3. **选择正确的 flush**：watch 默认 'post'，通常是对的
4. **避免 sync**：除非真的需要，否则不用 `flush: 'sync'`
5. **批量修改**：将相关修改放在一起，自然合并为一次更新

## 调试技巧

遇到时序问题时：

```javascript
// 查看任务队列状态
console.log('before change')
count.value++
console.log('after change, before flush')

nextTick(() => {
  console.log('after flush')
})

// 观察执行顺序
```

Vue DevTools 也能显示组件更新时机，帮助理解异步行为。

## 小结

Vue 的异步更新机制通过微任务批量处理状态变更，避免重复渲染。理解这个机制是正确使用 Vue 的基础，`nextTick` 是应对异步更新的标准工具。
