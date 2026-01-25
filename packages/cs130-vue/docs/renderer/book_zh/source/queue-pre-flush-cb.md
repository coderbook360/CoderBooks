# queuePreFlushCb 前置回调

前置回调是在组件更新之前执行的回调函数，最典型的使用场景是 watch 配置 `flush: 'pre'`。queuePreFlushCb 负责将这类回调加入前置队列，确保它们在 DOM 更新之前运行。

## 设计目的

某些场景需要在组件重渲染之前执行逻辑。比如，一个 watch 监听数据变化并修改其他数据：

```typescript
watch(source, (newVal) => {
  // 根据 source 修改 otherState
  otherState.value = transform(newVal)
}, { flush: 'pre' })
```

如果这个回调在组件更新后执行，组件会先用旧的 otherState 渲染一次，然后 watch 回调修改 otherState 触发再次渲染。使用 pre flush 可以在渲染前完成数据同步，组件只需渲染一次。

## 函数实现

queuePreFlushCb 的结构与 queueJob 类似，但操作的是前置回调队列：

```typescript
// 待处理的前置回调
const pendingPreFlushCbs: SchedulerJob[] = []

// 当前正在执行的前置回调（从 pending 复制）
let activePreFlushCbs: SchedulerJob[] | null = null

// 当前执行位置
let preFlushIndex = 0

export function queuePreFlushCb(cb: SchedulerJob) {
  queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex)
}
```

实际的入队逻辑封装在通用的 queueCb 函数中：

```typescript
function queueCb(
  cb: SchedulerJob,
  activeQueue: SchedulerJob[] | null,
  pendingQueue: SchedulerJob[],
  index: number
) {
  if (!isArray(cb)) {
    // 单个回调
    if (
      !activeQueue ||
      !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)
    ) {
      pendingQueue.push(cb)
    }
  } else {
    // 回调数组，常见于组件生命周期钩子
    // 这类回调已经去重，可以跳过检查直接 push
    pendingQueue.push(...cb)
  }
  queueFlush()
}
```

入队前检查回调是否已存在于活动队列中，避免重复执行。如果传入的是数组（生命周期钩子场景），直接展开添加，因为它们的去重已在其他地方处理。

## 两个队列的设计

前置回调使用 pending 和 active 两个队列配合：

```typescript
const pendingPreFlushCbs: SchedulerJob[] = []
let activePreFlushCbs: SchedulerJob[] | null = null
```

为什么需要两个队列？这是为了处理执行期间新增回调的场景：

```typescript
function flushPreFlushCbs(seen?: CountMap, i = preFlushIndex) {
  if (pendingPreFlushCbs.length) {
    // 复制 pending 到 active
    activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
    pendingPreFlushCbs.length = 0
    
    // 执行 active 中的回调
    for (
      preFlushIndex = i;
      preFlushIndex < activePreFlushCbs.length;
      preFlushIndex++
    ) {
      activePreFlushCbs[preFlushIndex]()
    }
    
    // 清理 active
    activePreFlushCbs = null
    preFlushIndex = 0
    
    // 递归处理执行期间新增的回调
    flushPreFlushCbs(seen, i)
  }
}
```

执行开始时，pending 的内容复制到 active 并清空 pending。执行期间如果有新回调入队，它们会进入空的 pending。一轮执行完成后检查 pending 是否有新内容，有则递归处理。这确保了所有前置回调都在组件更新前执行完毕。

## 去重处理

复制到 active 时使用 Set 去重：

```typescript
activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
```

这处理了同一个回调在一个 tick 内被多次入队的情况。比如，被 watch 的数据在同一同步代码块中变化了三次，回调只应执行一次。

## 与 flushJobs 的集成

flushPreFlushCbs 在 flushJobs 的主循环中被调用：

```typescript
function flushJobs(seen?: Map<SchedulerJob, number>) {
  isFlushPending = false
  isFlushing = true
  
  // 刷新前置回调
  flushPreFlushCbs(seen)
  
  // 对主队列排序
  queue.sort(comparator)
  
  // 执行主队列
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    // 重置状态
    flushIndex = 0
    queue.length = 0
    
    // 刷新后置回调
    flushPostFlushCbs(seen)
    
    isFlushing = false
    currentFlushPromise = null
    
    // 检查是否有新任务
    if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```

执行顺序是：前置回调 → 主队列（组件更新）→ 后置回调。前置回调在队列排序之前执行，这意味着它们在任何组件更新之前完成。

## 典型使用场景

watch 的 pre flush 是最常见的使用场景：

```typescript
// 在 doWatch 实现中
const job: SchedulerJob = () => {
  if (!effect.active) return
  
  if (cb) {
    // watch(source, callback) 形式
    const newValue = effect.run()
    if (/* 值变化 */) {
      cb(newValue, oldValue, onCleanup)
    }
  } else {
    // watchEffect 形式
    effect.run()
  }
}

job.allowRecurse = !!cb

if (flush === 'sync') {
  scheduler = job
} else if (flush === 'post') {
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
} else {
  // 默认 pre
  job.pre = true
  if (instance) job.id = instance.uid
  scheduler = () => queueJob(job)
}
```

等等，pre flush 的 watch 实际上是通过 queueJob 入队的，但带有 `job.pre = true` 标记。让我们看看这个标记如何影响执行：

```typescript
function flushJobs(seen?: Map<SchedulerJob, number>) {
  // ...
  
  // 主队列排序时，pre 任务优先
  queue.sort((a, b) => getId(a) - getId(b))
  
  // 更准确地说，pre 任务会在 flushPreFlushCbs 中处理
  // 但从 3.x 的实现来看，watch pre 实际上用的是 queueJob
}
```

实际上 Vue 3 的实现中，flush: 'pre' 的 watch 使用 queueJob 入队，但设置了 job.pre 标记。更准确的 pre flush 回调场景是某些内部使用：

```typescript
// 直接使用 queuePreFlushCb 的场景
queuePreFlushCb(() => {
  // 在组件更新前执行
})
```

## 执行顺序保证

前置回调的执行顺序遵循入队顺序（FIFO），不像主队列那样按 id 排序：

```typescript
for (
  preFlushIndex = i;
  preFlushIndex < activePreFlushCbs.length;
  preFlushIndex++
) {
  activePreFlushCbs[preFlushIndex]()
}
```

这是因为前置回调通常不涉及组件层级关系，按入队顺序执行即可。

## 递归调用安全

allowRecurse 属性同样适用于前置回调：

```typescript
if (
  !activeQueue ||
  !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)
) {
  pendingQueue.push(cb)
}
```

如果回调在执行期间触发了自己的重新入队（通过修改响应式数据），allowRecurse 为 true 时允许入队到 pending，下一轮递归时执行。

## 小结

queuePreFlushCb 管理在组件更新之前执行的回调。它使用 pending 和 active 双队列设计来处理执行期间的新增回调，通过 Set 去重避免重复执行，通过递归调用确保所有回调在组件更新前完成。这个机制让数据同步逻辑可以在渲染前执行，减少不必要的渲染次数。
