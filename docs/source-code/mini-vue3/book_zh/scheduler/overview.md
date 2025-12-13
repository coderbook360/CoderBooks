# 调度器概述：Vue 3 异步更新机制

**首先要问的是**：连续修改 100 次数据，组件会渲染 100 次吗？

```javascript
for (let i = 0; i < 100; i++) {
  count.value++
}
```

如果你之前没深入思考过这个问题，可能会觉得"当然是 100 次"。但实际上 Vue 的答案是：**只渲染 1 次**。

**这就引出了第二个问题**：Vue 是怎么做到的？

## 同步更新的问题

**思考一下**：如果每次修改都立即更新 DOM，会发生什么？

回顾我们之前实现的响应式系统：

```javascript
const count = ref(0)

effect(() => {
  console.log(count.value)
  // 假设这里更新 DOM
  document.body.innerText = count.value
})

// 连续修改
for (let i = 0; i < 100; i++) {
  count.value++
}
```

按照之前的实现，effect 会执行 100 次。每次都会更新 DOM。

**但这有问题**：我们只关心最终结果（count = 100），中间的 99 次 DOM 更新完全是浪费！

更糟糕的是，DOM 操作是**昂贵的**。100 次 DOM 更新可能导致页面卡顿，用户体验极差。

## 批量更新的核心思路

**有没有发现**：问题的本质是"太急了"——数据一变就立刻更新。

解决方案很直观：**不立即执行，而是"攒一攒"，等同步代码都执行完再统一处理**。

```javascript
const queue = new Set()  // 用 Set 自动去重——同一个 job 不会重复添加
let isFlushing = false

function queueJob(job) {
  queue.add(job)  // 相同的 job 只会添加一次
  
  if (!isFlushing) {
    isFlushing = true
    
    // 关键：在微任务中执行队列
    Promise.resolve().then(() => {
      try {
        queue.forEach(job => job())
      } finally {
        isFlushing = false
        queue.clear()
      }
    })
  }
}
```

**思考一下**：为什么用 `Set` 而不是数组？

答案不仅仅是"自动去重"，**更重要的是性能**：

- **数组去重**：`if (!queue.includes(job))` 是 O(n) 复杂度。100 个任务就要检查 100 次。
- **Set 去重**：`Set.add()` 是 O(1) 复杂度。无论多少任务，每次操作都是常数时间。

当 `count.value++` 执行 100 次时，每次都触发同一个 effect。用数组需要检查 1+2+3+...+100 = 5050 次；用 Set 只需要 100 次哈希操作。

**这里我们用 Set 来讲解核心思路**。但实际上 Vue 3 使用了**更高效的位标记**方案：给每个 job 添加一个 `flags` 属性，用位运算 `job.flags & QUEUED` 来检查是否已入队——这比 Set 的哈希查找还要快。后面的 `job-flags` 章节会详细讲解这个优化。

现在修改 effect 使用调度器：

```javascript
effect(() => {
  console.log(count.value)
}, {
  // 新增：使用 scheduler 代替直接执行
  scheduler(effectFn) {
    queueJob(effectFn)  // 不直接执行，而是放入队列
  }
})

for (let i = 0; i < 100; i++) {
  count.value++
}
// effect 只执行 1 次！使用的是最终值 100
```

**魔法就在这里**：100 次数据修改 → 100 次 scheduler 调用 → Set 去重后只有 1 个 job → 微任务只执行 1 次 effect！

## JavaScript 事件循环

**可能很多人不太理解**：为什么 `Promise.resolve().then()` 能实现"等同步代码执行完"？

这就需要理解 JavaScript 的事件循环（Event Loop）。**别担心，我们一步步来。这是理解 Vue 异步更新的关键！**

每一轮事件循环的执行顺序：

```
┌────────────────────────────────────────────────────┐
│  1. 同步代码：执行调用栈中的所有同步代码           │
│         ↓                                          │
│  2. 微任务队列：执行所有微任务                     │
│     （Promise.then、queueMicrotask）               │
│     注意：执行过程中新产生的微任务也会在本阶段执行  │
│         ↓                                          │
│  3. 渲染：浏览器更新渲染                           │
│         ↓                                          │
│  4. 宏任务队列：执行一个宏任务                     │
│     （setTimeout、setInterval）                    │
└────────────────────────────────────────────────────┘
```

**关键洞察**：
- 微任务在同步代码**之后**、浏览器渲染**之前**执行
- 微任务会**一直执行到队列清空**，包括执行过程中新产生的微任务（这就是为什么 nextTick 的链式调用也能在同一轮事件循环中执行）

Vue 正是利用这一点！当你修改数据时：

1. 触发 trigger，把 effect 加入队列（同步）
2. 同步代码继续执行其他 `count.value++`（同步）
3. for 循环执行完毕（同步代码结束）
4. 微任务执行，刷新队列，执行 effect（微任务）
5. effect 触发 DOM 更新
6. 浏览器渲染

**完整的批量更新流程图**：

```
┌─────────────────────────────────────────────────────────────┐
│  count.value = 1                                            │
│      │                                                      │
│      ▼                                                      │
│  trigger(target, 'count')                                   │
│      │                                                      │
│      ▼                                                      │
│  执行 effect.scheduler (不是直接执行 effect.run!)           │
│      │                                                      │
│      ▼                                                      │
│  queueJob(componentUpdateFn)                                │
│      │                                                      │
│      ├── 检查去重 (flags & QUEUED)                          │
│      ├── 添加到队列                                         │
│      └── queueFlush() → Promise.resolve().then(flushJobs)   │
│                                                             │
│  ══════════════ 同步代码继续执行 ══════════════             │
│                                                             │
│  count.value = 2  (同一个 job，不会重复添加)                 │
│  count.value = 3  (同一个 job，不会重复添加)                 │
│                                                             │
│  ══════════════ 同步代码执行完毕 ══════════════             │
│                                                             │
│      ▼                                                      │
│  flushJobs() 执行                                           │
│      │                                                      │
│      ├── flushPreFlushCbs()   执行 Pre 队列                 │
│      ├── 排序并执行主队列      组件更新 (使用最终值 count=3)│
│      └── flushPostFlushCbs()  执行 Post 队列                │
│                                                             │
│      ▼                                                      │
│  浏览器渲染                                                 │
└─────────────────────────────────────────────────────────────┘
```

**这就是为什么修改数据后 DOM 不会立即更新**：

```javascript
count.value = 1
console.log(document.body.innerText)  // 还是旧值！DOM 还没更新

await nextTick()  // 等待微任务执行完
console.log(document.body.innerText)  // 新值！
```

## Vue 调度器的三个队列

**现在要问第三个问题**：只有一个队列够吗？

**思考这个场景**：
- watch 回调需要在组件更新**之前**执行（比如做一些数据准备）
- 组件需要更新 DOM
- 生命周期钩子需要在 DOM 更新**之后**执行

用一个队列，它们的执行顺序怎么控制？

Vue 的解决方案很直接——**三个队列，各司其职**！

```javascript
let pendingPreFlushCbs = []   // Pre 队列：组件更新前
const queue = []               // 主队列：组件更新
let pendingPostFlushCbs = []  // Post 队列：组件更新后
```

执行顺序（**这张图很重要**）：

```
同步代码执行完毕
       │
       ▼
┌─────────────────┐
│   Pre 队列      │  ← watch 的 flush: 'pre'（默认）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   主队列        │  ← 组件更新（render + patch）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Post 队列     │  ← watch 的 flush: 'post'、mounted、updated
└─────────────────┘
```

**有没有发现**：这就解释了 watch 的 flush 选项！

- **Pre 队列**：`flush: 'pre'` 的 watch 在这里执行，可以在组件更新前做准备
- **主队列**：组件的 update 函数——执行 render，对比 VNode，更新 DOM
- **Post 队列**：`flush: 'post'` 的 watch 和 `mounted`/`updated` 钩子在这里执行，此时 DOM 已更新

## 调度器架构全景

把所有概念串起来，这就是调度器的完整架构：

```
┌────────────────────────────────────────────┐
│                 queueJob()                 │
│         数据变化时，添加 job 到主队列       │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│               queueFlush()                 │
│     调度一个微任务（如果还没调度的话）      │
└──────────────────┬─────────────────────────┘
                   │
                   ▼ (Promise.resolve().then)
┌────────────────────────────────────────────┐
│                flushJobs()                 │
│            执行所有队列任务                │
├────────────────────────────────────────────┤
│  1. flushPreFlushCbs()   执行 Pre 队列     │
│  2. 执行 queue 中的 jobs  组件更新         │
│  3. flushPostFlushCbs()  执行 Post 队列    │
└────────────────────────────────────────────┘
```

**关键点**：`queueFlush()` 会判断是否已经调度过微任务，避免重复调度。这就是 `isFlushing` 标志的作用。

## 与 effect scheduler 的关联

**回到开头的问题**：组件是怎么接入这个调度系统的？

答案在组件的 effect 里：

```javascript
const effect = new ReactiveEffect(componentUpdateFn, () => {
  // 这是 scheduler！不直接执行，而是加入队列
  queueJob(instance.update)
})
```

**思考一下**：为什么 scheduler 里调用的是 `queueJob` 而不是直接执行 `componentUpdateFn`？

因为我们希望：
- **批量更新**：多次数据修改只触发一次组件更新
- **顺序控制**：让父组件在子组件之前更新

当组件依赖的响应式数据变化时：

```
count.value++ 
    ↓
trigger() 触发依赖
    ↓
执行 scheduler（不是直接执行 effect！）
    ↓
scheduler 调用 queueJob(instance.update)
    ↓
job 被加入队列
    ↓
同步代码继续执行...
    ↓
同步代码执行完毕
    ↓
微任务执行 flushJobs()
    ↓
组件更新！
```

## nextTick

**自然要问**：如果我想在 DOM 更新后执行一些代码，怎么办？

Vue 提供了 `nextTick`：

```javascript
function nextTick(fn) {
  const p = Promise.resolve()
  return fn ? p.then(fn) : p
}
```

**有没有发现**：`nextTick` 就是把你的代码放入微任务队列！

由于 Vue 的更新也在微任务队列里，而微任务队列是**先进先出**的，所以：

```javascript
async function onClick() {
  count.value++  // 触发 queueJob，把组件更新加入微任务队列
  
  // 此时 DOM 还没更新（同步代码还在执行）
  console.log(el.textContent)  // 旧值
  
  await nextTick()  // 等待当前微任务队列清空
  
  // 此时 DOM 已更新
  console.log(el.textContent)  // 新值！
}
```

**等等，这里有个细节**：如果 `count.value++` 和 `nextTick()` 都创建微任务，谁先执行？

答案：**先入先出**。`count.value++` 先触发了 `queueJob`，所以组件更新先执行，然后才是 `nextTick` 的回调。

## 本章小结

回到开头的问题：**连续修改 100 次数据，组件会渲染几次？**

答案是 **1 次**，原因是：

1. **Set 去重**：同一个 job 只会保留一个
2. **微任务延迟**：所有同步代码执行完才刷新队列
3. **最终值**：effect 执行时，数据已经是最终状态

Vue 调度器的核心设计：

- **queueJob**：把任务加入队列，避免重复
- **三个队列**：Pre/主/Post，控制执行顺序
- **微任务**：同步代码后、渲染前执行
- **nextTick**：让用户代码也能等待更新完成

下一章我们将深入 `queueJob` 的实现，了解任务去重、排序和递归处理的细节。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

| 概念 | 源码位置 |
|------|----------|
| queueJob | `packages/runtime-core/src/scheduler.ts` |
| queueFlush | `packages/runtime-core/src/scheduler.ts` |
| flushJobs | `packages/runtime-core/src/scheduler.ts` |
| 三种队列定义 | `packages/runtime-core/src/scheduler.ts` |
| nextTick | `packages/runtime-core/src/scheduler.ts` |

---

## 踩坑经验

在实际开发中，调度器相关的常见问题：

**1. 在 Post 回调中修改数据导致无限循环**

```javascript
// ❌ 危险操作
watch(count, () => {
  count.value++  // 在回调中修改监听的数据
}, { flush: 'post' })
// Vue 会检测到超过 100 次递归并报错
```

**2. 修改数据后立即读取 DOM**

```javascript
// ❌ 错误写法
count.value = 1
console.log(el.textContent)  // 还是旧值！

// ✅ 正确写法
count.value = 1
await nextTick()
console.log(el.textContent)  // 新值
```

**3. 组件卸载后仍触发更新**

```javascript
// 如果异步操作在组件卸载后完成
setTimeout(() => {
  count.value++  // 组件已卸载，但更新仍被触发
}, 1000)
// Vue 通过 job.active = false 来阻止这种情况
```

---

## 练习与思考

1. **实践练习**：实现一个简单的调度器，支持任务去重和批量执行。尝试分别用数组和 Set 实现，比较代码复杂度。

2. **权衡思考**：为什么 Vue 选择微任务而不是 `setTimeout` 来调度更新？

   提示：`setTimeout` 是宏任务，在浏览器渲染**之后**执行。这意味着用户会先看到旧状态，然后看到新状态——产生闪烁！

3. **进阶思考**：如果在 Post 队列执行过程中又触发了新的数据变化，会发生什么？Vue 是如何处理的？
