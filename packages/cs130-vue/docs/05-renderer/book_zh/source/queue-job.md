# queueJob 任务入队

Vue 的响应式系统在检测到数据变化时不会立即触发组件重渲染，而是将更新任务加入队列，在下一个微任务中批量执行。queueJob 是这个调度系统的入口函数，负责收集需要执行的任务并去重。

## 设计动机

假设一个组件依赖多个响应式数据，它们在同一同步代码块中被修改了三次：

```typescript
function handleClick() {
  state.count++
  state.name = 'new name'
  state.list.push(item)
}
```

如果每次修改都立即触发重渲染，组件会渲染三次，这是巨大的浪费。通过将更新任务入队，Vue 确保无论数据变化多少次，组件在一个 tick 内只渲染一次。

## 函数签名

queueJob 接收一个 SchedulerJob 类型的任务：

```typescript
export interface SchedulerJob extends Function {
  id?: number
  active?: boolean
  computed?: boolean
  allowRecurse?: boolean
  ownerInstance?: ComponentInternalInstance
}

export function queueJob(job: SchedulerJob) {
  // 去重检查：队列中没有这个任务，或者允许递归调用
  if (
    (!queue.length ||
      !queue.includes(
        job,
        isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
      )) &&
    job !== currentPreFlushParentJob
  ) {
    if (job.id == null) {
      // 无 id 的任务直接推入队尾
      queue.push(job)
    } else {
      // 有 id 的任务按 id 顺序插入
      queue.splice(findInsertionIndex(job.id), 0, job)
    }
    queueFlush()
  }
}
```

SchedulerJob 是带有额外属性的函数。id 用于排序确保执行顺序，active 标记任务是否有效，allowRecurse 允许任务在执行期间重新入队自己。

## 去重逻辑

入队前的去重检查是性能优化的关键：

```typescript
if (
  !queue.length ||
  !queue.includes(
    job,
    isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
  )
) {
  // 添加任务
}
```

这段代码检查任务是否已在队列中。如果正在刷新队列且任务允许递归，检查从当前执行位置之后开始，这允许正在执行的任务重新入队等待下一轮执行。否则从当前位置检查，避免重复添加。

allowRecurse 属性用于像 watch 这样的场景——回调中修改了被 watch 的数据，需要再次触发：

```typescript
watch(count, (newVal) => {
  if (newVal < 10) {
    count.value++ // 这会触发再次 watch
  }
})
```

## 排序插入

有 id 的任务需要按 id 顺序插入，使用二分查找定位插入点：

```typescript
function findInsertionIndex(id: number): number {
  // 从 flushIndex + 1 开始搜索，因为之前的已经执行
  let start = flushIndex + 1
  let end = queue.length

  while (start < end) {
    const middle = (start + end) >>> 1
    const middleJobId = getId(queue[middle])
    
    // 相等时继续向右搜索，确保稳定排序
    middleJobId < id ? (start = middle + 1) : (end = middle)
  }

  return start
}

const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id
```

二分查找将插入操作的复杂度从 O(n) 降到 O(log n)。注意搜索从 flushIndex + 1 开始，因为已执行的任务不需要考虑。

## 触发刷新

添加任务后调用 queueFlush 触发队列刷新：

```typescript
let isFlushing = false
let isFlushPending = false

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

两个标志确保只调度一次刷新。isFlushPending 表示已调度但未开始，isFlushing 表示正在执行。只有两者都为 false 时才通过 Promise.resolve().then() 调度微任务。

resolvedPromise 是预先创建的已完成 Promise：

```typescript
const resolvedPromise = Promise.resolve()
```

使用它比每次 new Promise 效率更高。then 回调在微任务队列中执行，这发生在当前同步代码完成后、下一次事件循环之前。

## 任务的 id 属性

组件更新任务的 id 来自组件实例的 uid：

```typescript
// 在 setupRenderEffect 中创建的更新函数
const update = (instance.update = () => effect.run())
update.id = instance.uid
```

uid 在组件创建时自增分配：

```typescript
let uid = 0

function createComponentInstance(vnode, parent, suspense) {
  const instance = {
    uid: uid++,
    // ...
  }
  return instance
}
```

父组件的 uid 小于子组件，这确保了父组件先更新。为什么需要这个顺序？考虑父组件传递 props 给子组件的场景——如果子组件先更新，它拿到的是旧 props，随后父组件更新又会触发子组件再次更新。按父到子顺序，每个组件只需更新一次。

## 无 id 任务

没有 id 的任务直接推入队尾：

```typescript
if (job.id == null) {
  queue.push(job)
}
```

这类任务通常是用户代码创建的，如 watchEffect 的回调。它们不需要严格的顺序，按入队顺序执行即可。

## 与其他队列的关系

调度系统有三个队列：

```typescript
// 主任务队列
const queue: SchedulerJob[] = []

// 前置回调队列
const pendingPreFlushCbs: SchedulerJob[] = []
const activePreFlushCbs: SchedulerJob[] = []

// 后置回调队列
const pendingPostFlushCbs: SchedulerJob[] = []
const activePostFlushCbs: SchedulerJob[] = []
```

queueJob 操作的是主任务队列，组件更新任务在这里。前置回调（如 watch 的 flush: 'pre'）在主任务之前执行，后置回调（如生命周期钩子）在主任务之后执行。

完整的刷新顺序是：
1. 刷新前置回调
2. 刷新主任务队列
3. 刷新后置回调
4. 如果前三步产生了新任务，回到步骤 1

## 使用示例

组件更新是 queueJob 最主要的使用场景：

```typescript
// 在 setupRenderEffect 中
const effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(update),
  instance.scope
)

// scheduler 是响应式系统的回调
// 每次依赖变化都会调用 scheduler
// scheduler 通过 queueJob 将更新入队
```

ReactiveEffect 的第二个参数是 scheduler。当响应式数据变化时，effect 不会立即运行 componentUpdateFn，而是调用 scheduler，后者将更新任务入队。这就是 Vue 批量更新的秘密。

## 小结

queueJob 是 Vue 调度系统的入队函数，它负责收集更新任务、去重、按 id 排序插入。通过微任务调度，所有同步代码中的数据变化都会合并成一次更新。id 排序确保父组件先于子组件更新，减少不必要的渲染。这个简单的函数是 Vue 高效更新机制的基石。
