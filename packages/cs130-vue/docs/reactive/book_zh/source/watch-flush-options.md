# flush 选项：控制回调执行时机

flush 选项决定 watch/watchEffect 回调的执行时机。Vue 提供三种模式：pre（默认）、post 和 sync。本章深入分析 flush 的实现机制。

## 三种 flush 模式

```typescript
export interface WatchOptionsBase extends DebuggerOptions {
  flush?: 'pre' | 'post' | 'sync'
}
```

每种模式对应不同的调度策略：

- pre：组件更新前执行（默认）
- post：组件更新后执行
- sync：同步立即执行

## 调度器实现

```typescript
let scheduler: EffectScheduler
if (flush === 'sync') {
  scheduler = job as any
} else if (flush === 'post') {
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
} else {
  // 默认 'pre'
  job.pre = true
  if (instance) job.id = instance.uid
  scheduler = () => queueJob(job)
}
```

三种模式使用完全不同的调度方式。

## sync 模式：直接执行

sync 模式最简单，scheduler 就是 job 本身：

```typescript
if (flush === 'sync') {
  scheduler = job as any
}
```

当 trigger 触发时，effect.scheduler() 直接执行 job，没有任何延迟。

```typescript
const count = ref(0)

watch(count, (val) => {
  console.log(val)
}, { flush: 'sync' })

console.log('1')
count.value++  // 立即输出: 1
console.log('2')

// 输出顺序: 1, 1, 2
```

## pre 模式：渲染前队列

pre 是默认模式，使用 queueJob：

```typescript
job.pre = true
if (instance) job.id = instance.uid
scheduler = () => queueJob(job)
```

关键设置：

1. job.pre = true 标记为 pre 类型
2. job.id 设为组件 uid 用于排序

queueJob 的实现：

```typescript
export function queueJob(job: SchedulerJob): void {
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex,
    )
  ) {
    if (job.id == null) {
      queue.push(job)
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}
```

job 被加入队列，按 id 排序。如果队列未在刷新中，调用 queueFlush 安排刷新。

## 队列刷新机制

```typescript
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

flushJobs 在微任务中执行：

```typescript
function flushJobs(seen?: CountMap) {
  isFlushPending = false
  isFlushing = true
  
  // pre jobs 在组件更新前
  // 按 id 排序确保父组件先于子组件
  queue.sort(comparator)
  
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    flushIndex = 0
    queue.length = 0
    
    // 然后刷新 post 队列
    flushPostFlushCbs(seen)
    
    isFlushing = false
    currentFlushPromise = null
    
    // 如果有新任务加入，继续刷新
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```

## post 模式：渲染后队列

post 模式使用 queuePostRenderEffect：

```typescript
scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
```

queuePostRenderEffect 的实现：

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb
```

不考虑 Suspense 时就是 queuePostFlushCb：

```typescript
export function queuePostFlushCb(cb: SchedulerJobs): void {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex,
      )
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

post job 加入 pendingPostFlushCbs 队列，在 flushJobs 末尾通过 flushPostFlushCbs 执行。

## job 排序

```typescript
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    if (a.pre && !b.pre) return -1
    if (b.pre && !a.pre) return 1
  }
  return diff
}
```

排序规则：

1. 按 id 升序（父组件 id 小于子组件）
2. id 相同时，pre 类型优先

这确保父组件的 watcher 先执行，pre 类型先于普通类型。

## 执行顺序示例

```typescript
const count = ref(0)

// 不同 flush 的 watcher
watch(count, () => console.log('sync'), { flush: 'sync' })
watch(count, () => console.log('pre'))  // 默认
watch(count, () => console.log('post'), { flush: 'post' })

// 修改值
count.value++

// 输出顺序:
// sync   <- 同步立即执行
// pre    <- 微任务队列，渲染前
// post   <- 微任务队列，渲染后
```

## allowRecurse 设置

```typescript
job.allowRecurse = !!cb
```

watch 模式（cb 存在）允许递归。这意味着在回调中修改数据可以再次触发自身：

```typescript
const count = ref(0)

watch(count, (val) => {
  if (val < 5) {
    count.value++  // 可以触发自身
  }
})

count.value = 1
// 触发链：1 -> 2 -> 3 -> 4 -> 5
```

watchEffect 不允许递归，防止无限循环。

## 与组件更新的关系

```
数据变化
    ↓
trigger 调用 scheduler
    ↓
    ├── sync: 立即执行 job
    │
    └── pre/post: 加入队列
           ↓
       queueFlush 安排微任务
           ↓
       flushJobs 执行
           ↓
           ├── pre jobs 执行
           ├── 组件 render/update
           └── post jobs 执行
```

pre job 在组件更新前执行，可以在渲染前修改状态。post job 在渲染后执行，可以访问更新后的 DOM。

## 选择指南

**pre（默认）适用场景**：
- 需要在渲染前更新派生状态
- 想要批量处理多个变化
- 大多数业务逻辑

**post 适用场景**：
- 需要访问更新后的 DOM
- 与 DOM 相关的计算
- 集成第三方库

**sync 适用场景**：
- 需要立即响应
- 调试和日志
- 与外部系统实时同步

## 性能考虑

sync 模式每次变化都执行，没有批量优化：

```typescript
// 不推荐：sync 模式频繁触发
watch(count, handler, { flush: 'sync' })
for (let i = 0; i < 100; i++) {
  count.value++  // handler 执行 100 次
}

// 推荐：pre 模式批量处理
watch(count, handler)
for (let i = 0; i < 100; i++) {
  count.value++  // handler 只执行 1 次
}
```

## 本章小结

flush 选项通过不同的调度策略控制回调执行时机。sync 直接执行，pre 使用渲染前队列并支持排序，post 使用渲染后队列。

理解队列机制和执行顺序，有助于选择正确的 flush 模式，在响应性和性能之间取得平衡。
