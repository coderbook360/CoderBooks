# Day 19: 响应式系统性能优化

你好，我是你的技术导师。

在之前的课程中，我们构建了一个功能完备的响应式系统。
但是，它还有一个严重的性能隐患。

## 1. 性能杀手：同步更新

看下面这个例子：

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log('render:', state.count)
})

state.count++
state.count++
state.count++
```

控制台会打印：
```
render: 0
render: 1
render: 2
render: 3
```

`effect` 执行了 4 次！
但实际上，中间的 1 和 2 只是过渡状态，我们只关心最终结果 3。
如果这个 `effect` 是一个复杂的组件渲染函数，那这 3 次多余的渲染就是巨大的性能浪费。

我们需要一种机制，把多次同步修改合并成一次更新。
这就是**批量更新（Batch Update）**。

## 2. 解决方案：异步队列

原理很简单：
当数据变化时，不要立即执行 `effect`，而是把它扔到一个队列里。
等所有同步代码都执行完了，再把队列里的 `effect` 拿出来执行一次。

这利用了 JavaScript 的**事件循环（Event Loop）**机制。

### 2.1 任务队列

首先，我们需要一个队列来存放待执行的任务。
为了去重（同一个 effect 不重复添加），我们使用 `Set`。

```typescript
const queue = new Set()
```

### 2.2 入队函数：queueJob

当 `trigger` 触发时，我们调用 `queueJob` 把任务入队。

```typescript
let isFlushPending = false
const p = Promise.resolve()

export function queueJob(job) {
  // 1. 入队（Set 自动去重）
  queue.add(job)

  // 2. 安排刷新
  if (!isFlushPending) {
    isFlushPending = true
    // 利用微任务，在同步代码执行完后立即执行
    p.then(flushJobs)
  }
}
```

### 2.3 刷新函数：flushJobs

这个函数会在微任务阶段执行，负责清空队列。

```typescript
function flushJobs() {
  isFlushPending = false
  
  // 遍历执行所有任务
  queue.forEach(job => job())
  
  // 清空队列
  queue.clear()
}
```

## 3. 接入响应式系统

现在，我们需要修改 `trigger` 逻辑，让它默认使用调度器。

在 `effect.ts` 中：

```typescript
export function trigger(target, key) {
  // ... 获取 effects ...
  
  effects.forEach(effect => {
    if (effect.scheduler) {
      // 如果有自定义调度器（比如 computed），用自定义的
      effect.scheduler()
    } else {
      // 否则，默认走批量更新
      queueJob(effect.run.bind(effect))
    }
  })
}
```

现在，再运行最开始的例子：

```javascript
state.count++
state.count++
state.count++
```

1.  第一次 `++` -> `queueJob` -> 入队 -> 安排微任务。
2.  第二次 `++` -> `queueJob` -> 已在队列，忽略。
3.  第三次 `++` -> `queueJob` -> 已在队列，忽略。
4.  同步代码结束。
5.  微任务执行 `flushJobs` -> 执行 `effect` 一次。

控制台只打印：
```
render: 0
render: 3
```

完美！

## 4. nextTick 的实现

Vue 3 提供了一个 `nextTick` API，让我们可以在状态改变后，等待 DOM 更新完成。
其实它就是把回调函数放到微任务队列里。

```typescript
export function nextTick(fn) {
  return fn ? p.then(fn) : p
}
```

因为我们的 `flushJobs` 也是通过 `p.then` 注册的微任务。
根据微任务队列的先进先出原则，用户调用的 `nextTick` 会在 `flushJobs` 之后执行。
此时，所有的 `effect`（包括组件渲染）都已经执行完毕，DOM 已经是新的了。

## 5. 总结

今天我们给响应式系统装上了一个"变速箱" —— **Scheduler**。

1.  **去重**：利用 `Set` 避免重复添加任务。
2.  **防抖**：利用 `isFlushPending` 标志位，避免重复注册微任务。
3.  **异步**：利用 `Promise` 微任务，实现批量更新。

这不仅解决了性能问题，也是 Vue 3 异步渲染的核心基础。

至此，我们的响应式系统（Reactivity）优化篇也结束了。
它现在不仅功能强大，而且性能卓越。

明天，我们将正式开始构建 **Runtime（运行时）**。
我们将从最基础的 `h` 函数开始，一步步搭建起 Vue 3 的组件渲染系统。

明天见！
