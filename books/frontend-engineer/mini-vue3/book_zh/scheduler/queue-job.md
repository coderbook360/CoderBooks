# queueJob：任务队列的管理与排序

**首先要问的是**：多个组件同时更新，Vue 如何保证正确的更新顺序？如何避免同一个组件更新多次？

这就是 `queueJob` 要解决的核心问题。**别担心，我们一步步拆解**。

## 基本实现

先从最简单的版本开始：

```javascript
const queue = []
let isFlushing = false
let isFlushPending = false

function queueJob(job) {
  // 去重：已经在队列里的不重复添加
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  // 关键：只调度一次微任务
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  try {
    for (let i = 0; i < queue.length; i++) {
      queue[i]()
    }
  } finally {
    queue.length = 0
    isFlushing = false
  }
}
```

**思考一下**：为什么需要两个状态变量？

- `isFlushPending`：已经安排了刷新（Promise.then 已调用），但还没开始执行
- `isFlushing`：正在执行队列

**有没有发现**：这两个状态其实是刷新过程的两个阶段！

```
queueJob() → isFlushPending = true → 等待微任务 → flushJobs() → isFlushing = true → 执行完毕
```

## 任务去重

**现在要问第二个问题**：同一个 job 被触发多次怎么办？

```javascript
const state = reactive({ a: 1, b: 2 })

effect(() => {
  console.log(state.a, state.b)  // 同时依赖 a 和 b
}, {
  scheduler: queueJob
})

state.a = 10  // 触发 queueJob
state.b = 20  // 再次触发 queueJob
// 期望：effect 只执行一次
```

简单版本用 `includes` 检查去重。**但这里有个微妙的问题**：如果队列正在执行中，job 刚执行完又被触发呢？

```javascript
function queueJob(job) {
  // 更精确的检查
  if (
    !queue.length ||
    !queue.includes(job, isFlushing ? flushIndex + 1 : 0)
  ) {
    queue.push(job)
    queueFlush()
  }
}
```

**思考一下**：`flushIndex + 1` 是什么意思？

`flushIndex` 是当前正在执行的任务索引。我们只需要检查**当前位置之后**的任务。

为什么从 `flushIndex + 1` 开始检查？

- **已经执行过的任务（索引 < flushIndex）**：不需要检查，它们已经执行完了
- **当前正在执行的任务（索引 === flushIndex）**：如果当前 job A 执行过程中又触发了 job A，我们**希望它能再次入队**（前提是有 ALLOW_RECURSE 标记）。从 `flushIndex + 1` 开始检查意味着不会在"当前位置"找到重复，所以允许添加
- **未执行的任务（索引 > flushIndex）**：需要检查去重，避免重复添加

**这个设计支持了递归场景**：一个 job 执行时触发自己再次入队，会被添加到队列末尾，在本轮刷新中执行。

## 任务排序

**这是整个调度器的精华所在**。组件更新需要按**父子顺序**——父组件先更新，子组件后更新。

**为什么顺序很重要？思考这个场景**：

```vue
<!-- 父组件 -->
<Child :data="state.data" />

<!-- 子组件 -->
<template>{{ data.name }}</template>
```

如果子组件先更新，它拿到的是**旧的 props**。然后父组件更新，改变了传给子组件的 props，子组件又需要再更新一次——**白白浪费了一次渲染**！

Vue 的解决方案很巧妙：**给每个组件分配一个递增的 `uid`**。

由于组件是自顶向下创建的，父组件的 `uid` 一定小于子组件。job 的 `id` 就是组件的 `uid`：

```javascript
function flushJobs() {
  isFlushPending = false
  isFlushing = true
  
  // 新增：按 id 排序，父组件（id 小）排在前面
  queue.sort((a, b) => getId(a) - getId(b))
  
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        job()
      }
    }
  } finally {
    flushIndex = 0
    queue.length = 0
    isFlushing = false
  }
}

function getId(job) {
  return job.id == null ? Infinity : job.id  // 没有 id 的排最后
}
```

**有没有发现**：没有 id 的 job 排在最后（`Infinity`）——这通常是用户自己创建的 watch 等。

## 递归刷新

**接下来是个棘手的问题，也是很多 bug 的来源**：一个 job 执行时可能会触发新的 job——甚至触发自己！

```javascript
effect(() => {
  count.value++  // 读取后立即修改，又触发自己！
}, { scheduler: queueJob })
```

**思考一下**：这会导致什么问题？

答案：**无限循环**！job 执行 → 触发自己 → 再次执行 → 再次触发...

Vue 通过两种方式保护：

**方式一：限制递归次数**

在开发模式下，记录每个 job 的执行次数，超过阈值就报错：

```javascript
const RECURSION_LIMIT = 100

function flushJobs() {
  const seen = new Map()  // 记录每个 job 执行了多少次
  
  for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
    const job = queue[flushIndex]
    
    if (__DEV__) {
      checkRecursiveUpdates(seen, job)  // 检查是否超过限制
    }
    
    job()
  }
}

function checkRecursiveUpdates(seen, job) {
  if (!seen.has(job)) {
    seen.set(job, 1)
  } else {
    const count = seen.get(job)
    if (count > RECURSION_LIMIT) {
      throw new Error('Maximum recursive updates exceeded')  // 报错提醒开发者
    }
    seen.set(job, count + 1)
  }
}
```

**方式二：job.active 控制**

组件卸载后，它的 update job 不应该再执行：

```javascript
function queueJob(job) {
  // 新增：检查 job 是否激活
  if (job.active === false) {
    return  // 已停用的 job 直接忽略
  }
  // ...
}

// 组件卸载时
function unmountComponent(instance) {
  instance.update.active = false  // 标记为非激活
  // ...
}
```

**有没有发现**：这就像一个"开关"——关掉之后，即使被触发也不会执行。

## invalidateJob：移除任务

**有时候我们需要"反悔"**——把已经加入队列的任务移除：

```javascript
function invalidateJob(job) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {  // 只移除还没执行的
    queue.splice(i, 1)
  }
}
```

**思考一下**：为什么是 `i > flushIndex` 而不是 `i >= 0`？

因为 `i <= flushIndex` 的任务要么正在执行（`i === flushIndex`），要么已经执行过了（`i < flushIndex`）。移除它们没有任何意义。

**实际使用场景**：

```javascript
// 场景 1：watch 被停止时取消待执行的回调
function stopWatch() {
  // 如果 watch 的 job 已经在队列中但还没执行
  // 需要移除它，避免执行已经不需要的回调
  invalidateJob(watchJob)
  watchJob.active = false  // 同时设置 active，双重保险
}

// 场景 2：组件更新时取消旧的更新任务
// 某些情况下，组件可能需要取消之前的更新
function cancelUpdate(instance) {
  invalidateJob(instance.update)
}
```

## 完整实现

把所有概念整合起来：

```javascript
const queue = []
let isFlushing = false
let isFlushPending = false
let flushIndex = 0

const RECURSION_LIMIT = 100

function queueJob(job) {
  // 第一关：检查 job 是否激活
  if (job.active === false) {
    return
  }
  
  // 第二关：去重检查
  if (
    !queue.length ||
    !queue.includes(job, isFlushing ? flushIndex + 1 : 0)
  ) {
    // 第三关：按 id 插入正确位置（保持有序）
    if (job.id == null) {
      queue.push(job)  // 没有 id 的放最后
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job)  // 二分查找插入位置
    }
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs(seen) {
  isFlushPending = false
  isFlushing = true
  
  if (__DEV__) {
    seen = seen || new Map()
  }
  
  // 排序确保父组件在子组件之前
  queue.sort((a, b) => getId(a) - getId(b))
  
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      
      if (job && job.active !== false) {
        if (__DEV__) {
          checkRecursiveUpdates(seen, job)
        }
        job()
      }
    }
  } finally {
    flushIndex = 0
    queue.length = 0
    isFlushing = false
    
    // 新增：检查是否有新任务（job 执行中可能添加了新任务）
    if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
      flushJobs(seen)  // 递归处理新任务
    }
  }
}

// 二分查找插入位置
function findInsertionIndex(id) {
  let start = flushIndex + 1
  let end = queue.length
  
  while (start < end) {
    const middle = (start + end) >>> 1
    const middleJobId = getId(queue[middle])
    middleJobId < id ? (start = middle + 1) : (end = middle)
  }
  
  return start
}

function getId(job) {
  return job.id == null ? Infinity : job.id
}

function invalidateJob(job) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}

function checkRecursiveUpdates(seen, job) {
  if (!seen.has(job)) {
    seen.set(job, 1)
  } else {
    const count = seen.get(job)
    if (count > RECURSION_LIMIT) {
      throw new Error(
        'Maximum recursive updates exceeded. ' +
        'This may be due to a reactive effect mutating its own dependencies.'
      )
    }
    seen.set(job, count + 1)
  }
}
```

**回顾整个设计**：

```
queueJob 的四道关卡：
1. active 检查 → 阻止已卸载组件的更新
2. 去重检查 → 同一个 job 只添加一次
3. 位置计算 → 保证父子顺序正确
4. 调度刷新 → 确保微任务已安排
```
```

## 本章小结

回到开头的问题：**多个组件同时更新，Vue 如何保证正确的顺序？**

答案是 `queueJob` 的四个核心功能：

- **去重**：同一个 job 被多次触发时只执行一次
- **排序**：父组件在子组件之前更新，避免重复渲染
- **递归保护**：防止无限循环，超过 100 次就报错
- **active 控制**：组件卸载后不再执行其更新

**权衡思考**：为什么用二分查找插入而不是最后统一排序？

因为刷新过程中可能会有新 job 加入（某个 job 的执行触发了另一个组件更新）。如果插入时就保持有序，后续插入的 job 会自动排到正确位置，不需要重新排序。

下一章我们将看看 Pre/Post 队列的实现。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

| 概念 | 源码位置 |
|------|----------|
| queueJob | `packages/runtime-core/src/scheduler.ts` L68 |
| flushJobs | `packages/runtime-core/src/scheduler.ts` L228 |
| findInsertionIndex | `packages/runtime-core/src/scheduler.ts` L87 |
| invalidateJob | `packages/runtime-core/src/scheduler.ts` L105 |
| RECURSION_LIMIT | `packages/runtime-core/src/scheduler.ts` L8 |

---

## 练习与思考

1. **设计问题**：为什么 Vue 需要 `isFlushPending` 和 `isFlushing` 两个状态？能否合并成一个？试着思考会有什么问题。

2. **代码分析**：`findInsertionIndex` 使用了二分查找。手动追踪一下这个过程：如果队列是 `[id:1, id:3, id:5]`，插入 `id:2` 会返回什么索引？

3. **进阶思考**：如果一个父组件和子组件同时触发更新，但子组件的 job 先被添加到队列会怎样？排序能解决这个问题吗？
