# flushPreFlushCbs 与 flushPostFlushCbs：前置与后置回调

**首先要问的是**：watch 的回调什么时候执行？为什么有 `flush: 'pre'` 和 `flush: 'post'` 的区别？

**这个问题的答案会揭示 Vue 调度器的整体架构**。它涉及到调度器的三个队列。

## 三个队列的执行顺序

Vue 的调度器按顺序执行三个队列：

```
同步代码执行完毕
       │
       ▼
┌─────────────────┐
│ Pre 队列        │  ← watch 的 flush: 'pre'（默认）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 主队列          │  ← 组件更新（render + patch）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post 队列       │  ← watch 的 flush: 'post'、生命周期钩子
└─────────────────┘
```

每种队列的用途：

- **Pre 队列**：在组件更新前执行。可以在渲染前修改数据，修改会被合并到当前更新中。
- **主队列**：组件的更新函数。执行 render 生成新 VNode，然后 patch 更新 DOM。
- **Post 队列**：在组件更新后执行。此时 DOM 已更新，可以安全访问最新的 DOM。

## 数据结构

```javascript
let pendingPreFlushCbs = []   // 等待执行的 Pre 回调
let activePreFlushCbs = null  // 正在执行的 Pre 回调
let preFlushIndex = 0

let pendingPostFlushCbs = []  // 等待执行的 Post 回调
let activePostFlushCbs = null // 正在执行的 Post 回调
let postFlushIndex = 0
```

**为什么要分 `pending` 和 `active`？这是一个很重要的设计决策。**

想象这个场景：你正在执行队列中的第 3 个回调，它又添加了一个新回调。如果用同一个数组：

```javascript
// 危险！
for (let i = 0; i < cbs.length; i++) {
  cbs[i]()  // 执行时可能往 cbs 里 push 新回调
}
// 问题：新添加的回调可能被立即执行，也可能被跳过，行为不可预测
```

分离设计解决了这个问题：

- `active`：当前正在遍历的队列，**只读不写**
- `pending`：收集执行期间新添加的回调
- 遍历完 `active` 后，再递归处理 `pending`

这样行为就可预测了：**本轮添加的回调，下一轮执行**。

## queuePreFlushCb

添加 Pre 回调：

```javascript
function queuePreFlushCb(cb) {
  // 去重检查
  if (
    !pendingPreFlushCbs.includes(cb) &&
    !activePreFlushCbs?.includes(cb)
  ) {
    pendingPreFlushCbs.push(cb)
    queueFlush()
  }
}
```

## flushPreFlushCbs

执行 Pre 队列：

```javascript
function flushPreFlushCbs(seen) {
  if (!pendingPreFlushCbs.length) return
  
  // 去重
  activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
  pendingPreFlushCbs.length = 0
  
  if (__DEV__) {
    seen = seen || new Map()
  }
  
  for (
    preFlushIndex = 0;
    preFlushIndex < activePreFlushCbs.length;
    preFlushIndex++
  ) {
    const cb = activePreFlushCbs[preFlushIndex]
    
    if (__DEV__) {
      checkRecursiveUpdates(seen, cb)
    }
    
    cb()
  }
  
  activePreFlushCbs = null
  preFlushIndex = 0
  
  // 递归：cb 执行时可能又添加了新的 Pre 回调
  flushPreFlushCbs(seen)
}
```

关键点：最后的递归调用。Pre 回调执行时可能会触发新的 Pre 回调，需要继续执行直到队列清空。

## queuePostFlushCb

添加 Post 回调稍微复杂，因为生命周期钩子可能是数组：

```javascript
function queuePostFlushCb(cb) {
  if (!Array.isArray(cb)) {
    // 单个回调
    if (
      !pendingPostFlushCbs.includes(cb) &&
      !activePostFlushCbs?.includes(cb)
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // 多个回调（如组件的生命周期钩子数组）
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

## flushPostFlushCbs

执行 Post 队列：

```javascript
function flushPostFlushCbs(seen) {
  if (!pendingPostFlushCbs.length) return
  
  // 去重
  const deduped = [...new Set(pendingPostFlushCbs)]
  pendingPostFlushCbs.length = 0
  
  // 如果已经有活动队列，合并进去
  if (activePostFlushCbs) {
    activePostFlushCbs.push(...deduped)
    return
  }
  
  activePostFlushCbs = deduped
  
  if (__DEV__) {
    seen = seen || new Map()
  }
  
  // 按 id 排序（保证父组件生命周期先于子组件）
  activePostFlushCbs.sort((a, b) => getId(a) - getId(b))
  
  for (
    postFlushIndex = 0;
    postFlushIndex < activePostFlushCbs.length;
    postFlushIndex++
  ) {
    const cb = activePostFlushCbs[postFlushIndex]
    
    if (__DEV__) {
      checkRecursiveUpdates(seen, cb)
    }
    
    // 为什么检查 active？
    // watch 或 effect 可能在执行前被 stop()，此时 active = false
    // 组件卸载时也会设置 active = false，防止卸载后仍执行回调
    if (cb.active !== false) {
      cb()
    }
  }
  
  activePostFlushCbs = null
  postFlushIndex = 0
  
  // 递归
  flushPostFlushCbs(seen)
}
```

**为什么 Post 回调需要排序，而 Pre 不需要？**

这是一个很好的问题！思考一下生命周期钩子的语义：

- **`mounted`**：**子组件先于父组件**执行。Vue 采用深度优先遍历，先递归渲染子组件，子组件挂载完成后父组件才算挂载完成。
- **`beforeUpdate`**（Pre 队列）：在组件更新前执行，此时只是准备数据，顺序不重要

**关于 Post 队列排序的细节**：Post 队列按 id 从小到大排序，但这主要影响的是**同一批次**的 watch 回调顺序（父组件的 watch 先于子组件）。而 `mounted` 钩子的执行顺序是由组件渲染的递归调用栈决定的——子组件的 `mounted` 在父组件的 `mounted` 之前触发。

Pre 队列主要用于 watch 的 `flush: 'pre'`，它们只是在组件更新前做数据准备，顺序无关紧要。

## 完整的 flushJobs

把三个队列串起来：

```javascript
function flushJobs(seen) {
  isFlushPending = false
  isFlushing = true
  
  if (__DEV__) {
    seen = seen || new Map()
  }
  
  // 1. 首先执行 Pre 队列
  flushPreFlushCbs(seen)
  
  // 2. 排序主队列
  queue.sort((a, b) => getId(a) - getId(b))
  
  // 3. 执行主队列
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
    // 清理
    flushIndex = 0
    queue.length = 0
    
    // 4. 执行 Post 队列
    flushPostFlushCbs(seen)
    
    isFlushing = false
    currentFlushPromise = null
    
    // 5. 检查是否有新任务
    if (
      queue.length ||
      pendingPreFlushCbs.length ||
      pendingPostFlushCbs.length
    ) {
      flushJobs(seen)
    }
  }
}
```

## 使用场景

### watch 的 flush 选项

```javascript
// flush: 'pre'（默认）- 在组件更新前执行
watch(source, callback)
// callback 会被加入 Pre 队列

// flush: 'post' - 在组件更新后执行
watch(source, callback, { flush: 'post' })
// callback 会被加入 Post 队列

// flush: 'sync' - 同步执行
watch(source, callback, { flush: 'sync' })
// callback 直接执行，不入队列
```

### 生命周期钩子

```javascript
// mounted、updated 等在 Post 队列执行
onMounted(() => {
  // 此时 DOM 已更新
  console.log(el.value.offsetHeight)
})
```

### 实际例子

```javascript
const count = ref(0)
const doubled = ref(0)

// Pre watch：在组件更新前同步派生状态
watch(count, (val) => {
  doubled.value = val * 2
}, { flush: 'pre' })

// Post watch：在 DOM 更新后读取 DOM
watch(count, () => {
  console.log('DOM height:', el.value.offsetHeight)
}, { flush: 'post' })

count.value = 1
// 执行顺序：
// 1. Pre watch 执行，doubled = 2
// 2. 组件更新（使用 count = 1, doubled = 2）
// 3. Post watch 执行，读取最新 DOM
```

## 本章小结

Vue 调度器的三个队列：

- **Pre 队列**：`flushPreFlushCbs`，组件更新前执行
- **主队列**：组件更新
- **Post 队列**：`flushPostFlushCbs`，组件更新后执行

关键实现细节：

- 使用 `pending` 和 `active` 分离新增和执行中的回调
- Post 回调需要按 id 排序，Pre 不需要
- 递归刷新处理执行过程中新增的回调

**现在你已经理解了三个队列是如何协作的。** 下一章我们看看 `nextTick` 的实现——它允许用户代码也能等待 DOM 更新完成，本质上就是将回调插入到当前刷新 Promise 的 `.then()` 中。

---

## 踩坑经验

**1. watch 在 Post 中修改数据导致无限循环**

```javascript
// ❌ 危险！会触发无限循环
watch(count, () => {
  count.value++
}, { flush: 'post' })

// ✅ 如果必须修改，加个条件防止无限循环
watch(count, (val) => {
  if (val < 100) {
    count.value++
  }
}, { flush: 'post' })
```

**2. watchEffect 默认是 Pre 模式**

```javascript
// watchEffect 默认 flush: 'pre'
watchEffect(() => {
  console.log(count.value)
})
// 等价于：watch 的 flush: 'pre'

// 如果需要访问 DOM，要明确指定 post
watchEffect(() => {
  console.log(el.value?.offsetHeight)
}, { flush: 'post' })
```

---

## 源码参考

本章涉及的 Vue 3 源码位置：

| 概念 | 源码位置 |
|------|----------|
| queuePreFlushCb | `packages/runtime-core/src/scheduler.ts` L62 |
| flushPreFlushCbs | `packages/runtime-core/src/scheduler.ts` L165 |
| queuePostFlushCb | `packages/runtime-core/src/scheduler.ts` L95 |
| flushPostFlushCbs | `packages/runtime-core/src/scheduler.ts` L202 |
| activePreFlushCbs | `packages/runtime-core/src/scheduler.ts` L22 |

---

## 练习与思考

1. **场景分析**：如果一个 Post 回调执行时触发了数据变更，整个刷新流程会重新开始吗？

   提示：看 `flushJobs` 最后的递归检查。

2. **代码分析**：`watchEffect` 默认使用什么 flush 模式？这对性能有什么影响？

3. **设计思考**：如果去掉 `pending` 和 `active` 的分离，直接用一个数组，会有什么问题？
