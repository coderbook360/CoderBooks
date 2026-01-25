# 组件更新流程

当组件的响应式数据变化时，Vue 会触发组件更新。本章分析组件更新的完整流程。

## 更新触发

```typescript
// 响应式数据变化触发 effect
const effect = (instance.effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(update),  // scheduler
  instance.scope
))

const update: SchedulerJob = (instance.update = () => effect.run())
```

## componentUpdateFn 更新函数

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载逻辑...
  } else {
    // ⭐ 更新逻辑
    let { next, bu, u, parent, vnode } = instance

    if (next) {
      next.el = vnode.el
      updateComponentPreRender(instance, next, optimized)
    } else {
      next = vnode
    }

    // 调用 beforeUpdate 钩子
    if (bu) {
      invokeArrayFns(bu)
    }

    // 执行 onVnodeBeforeUpdate
    if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
      invokeVNodeHook(vnodeHook, parent, next, vnode)
    }

    // ⭐ 渲染新的 subTree
    const nextTree = renderComponentRoot(instance)
    const prevTree = instance.subTree
    instance.subTree = nextTree

    // ⭐ patch 新旧 subTree
    patch(
      prevTree,
      nextTree,
      hostParentNode(prevTree.el!)!,
      getNextHostNode(prevTree),
      instance,
      parentSuspense,
      isSVG
    )

    next.el = nextTree.el

    // 调用 updated 钩子（异步）
    if (u) {
      queuePostRenderEffect(u, parentSuspense)
    }

    // 执行 onVnodeUpdated
    if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
      queuePostRenderEffect(
        () => invokeVNodeHook(vnodeHook!, parent, next!, vnode),
        parentSuspense
      )
    }
  }
}
```

## instance.next 的作用

```typescript
// next 表示父组件触发的更新
if (next) {
  next.el = vnode.el
  updateComponentPreRender(instance, next, optimized)
} else {
  // 自身状态变化
  next = vnode
}
```

## updateComponentPreRender

```typescript
const updateComponentPreRender = (
  instance: ComponentInternalInstance,
  nextVNode: VNode,
  optimized: boolean
) => {
  // 更新 vnode 引用
  nextVNode.component = instance
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null

  // ⭐ 更新 props
  updateProps(instance, nextVNode.props, prevProps, optimized)
  
  // ⭐ 更新 slots
  updateSlots(instance, nextVNode.children, optimized)

  // 暂停依赖收集
  pauseTracking()
  
  // 执行 pre 钩子
  flushPreFlushCbs()
  
  resetTracking()
}
```

## 更新队列机制

```typescript
// scheduler.ts
const queue: SchedulerJob[] = []
let isFlushing = false
let isFlushPending = false

export function queueJob(job: SchedulerJob) {
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
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

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

## flushJobs 执行队列

```typescript
function flushJobs(seen?: CountMap) {
  isFlushPending = false
  isFlushing = true

  // 按 id 排序，确保父组件先于子组件更新
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

    // 执行 post 钩子
    flushPostFlushCbs(seen)

    isFlushing = false
    currentFlushPromise = null
    
    // 可能有新的 job 加入
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```

## job.id 排序

```typescript
// 组件的 update job 带有 id
update.id = instance.uid

// 排序函数
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    if (a.pre && !b.pre) return -1
    if (b.pre && !a.pre) return 1
  }
  return diff
}

const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id
```

## 批量更新

```typescript
// 同一个 tick 内的多次状态变化只触发一次更新
const count = ref(0)

count.value++
count.value++
count.value++
// 只会触发一次更新
```

## invalidateJob 取消更新

```typescript
export function invalidateJob(job: SchedulerJob) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}

// 用于组件卸载时取消待执行的更新
```

## 更新流程图

```
响应式数据变化
    ↓
trigger() 触发
    ↓
effect.scheduler() 调用
    ↓
queueJob(update) 入队
    ↓
queueFlush() 安排刷新
    ↓
nextTick
    ↓
flushJobs() 执行队列
    ↓
componentUpdateFn() 组件更新
    ↓
patch(prevTree, nextTree) 更新 DOM
```

## 使用示例

### 理解批量更新

```html
<script setup>
import { ref, nextTick } from 'vue'

const count = ref(0)

const increment = async () => {
  count.value++
  count.value++
  console.log('Sync:', document.body.textContent)
  // DOM 还未更新
  
  await nextTick()
  console.log('After nextTick:', document.body.textContent)
  // DOM 已更新
}
</script>
```

### 强制同步更新

```typescript
import { flushSync } from 'vue'

// 不推荐，但可以强制同步
flushSync(() => {
  count.value++
})
// DOM 已更新
```

## 小结

组件更新流程的核心要点：

1. **响应式触发**：数据变化通过 effect 触发更新
2. **队列调度**：queueJob 将更新入队
3. **批量处理**：同一 tick 内的更新合并
4. **排序执行**：父组件先于子组件更新
5. **异步刷新**：nextTick 后执行更新

下一章将分析 shouldUpdateComponent 判断逻辑。
