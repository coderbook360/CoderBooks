# flushJobs 刷新队列

flushJobs 是调度系统的核心执行函数，负责按正确的顺序刷新所有待处理的任务和回调。它协调前置回调、主任务队列和后置回调的执行，是 Vue 批量更新机制的心脏。

## 触发时机

当第一个任务入队时，queueFlush 会在微任务中调度 flushJobs：

```typescript
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

使用 Promise.resolve().then() 确保 flushJobs 在当前同步代码执行完毕后、下一个事件循环之前运行。这样同步代码中的所有数据变化都会合并到一次刷新中。

## 完整实现

flushJobs 的实现包含了调度系统的完整逻辑：

```typescript
function flushJobs(seen?: Map<SchedulerJob, number>) {
  isFlushPending = false
  isFlushing = true
  
  // 开发环境下用于检测递归更新
  if (__DEV__) {
    seen = seen || new Map()
  }
  
  // 步骤 1：刷新前置回调
  flushPreFlushCbs(seen)
  
  // 步骤 2：对主队列排序
  // 父组件的 id 小于子组件，确保父先更新
  queue.sort(comparator)
  
  // 步骤 3：执行主队列
  const check = __DEV__
    ? (job: SchedulerJob) => checkRecursiveUpdates(seen!, job)
    : NOOP
  
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        if (__DEV__ && check(job)) {
          continue
        }
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    // 步骤 4：重置主队列
    flushIndex = 0
    queue.length = 0
    
    // 步骤 5：刷新后置回调
    flushPostFlushCbs(seen)
    
    // 步骤 6：清理状态
    isFlushing = false
    currentFlushPromise = null
    
    // 步骤 7：检查是否有新任务
    if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```

这段代码清晰地展示了刷新的七个步骤。标志位 isFlushing 和 isFlushPending 的切换确保了状态追踪的正确性——isFlushPending 在进入时置为 false（已开始执行），isFlushing 置为 true 表示正在刷新中。

## 执行顺序

三类任务的执行顺序是固定的：

1. **前置回调（Pre Flush）**：在任何组件更新之前执行
2. **主队列（Queue）**：组件更新任务，按 id 排序
3. **后置回调（Post Flush）**：DOM 更新完成后执行

这个顺序有其必然性。前置回调可能修改数据影响组件渲染结果，所以必须在更新前执行。后置回调需要访问更新后的 DOM，所以必须在更新后执行。主队列按父到子顺序可以避免不必要的重复渲染。

## 排序比较器

主队列使用 id 排序，确保父组件先于子组件更新：

```typescript
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    // id 相同时，pre 标记的任务优先
    if (a.pre && !b.pre) return -1
    if (b.pre && !a.pre) return 1
  }
  return diff
}

const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id
```

没有 id 的任务（id == null）被视为 Infinity，排在最后。id 相同时，带有 pre 标记的任务优先执行——这用于 watch 的 flush: 'pre' 场景。

## 错误处理

任务执行被包装在 callWithErrorHandling 中：

```typescript
callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
```

这确保了单个任务的错误不会中断整个队列的执行：

```typescript
function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
) {
  let res
  try {
    res = args ? fn(...args) : fn()
  } catch (err) {
    handleError(err, instance, type)
  }
  return res
}
```

错误会被捕获并传递给应用的错误处理机制（app.config.errorHandler），其他任务继续执行。

## active 标记检查

执行前检查任务的 active 标记：

```typescript
if (job && job.active !== false) {
  // 执行
}
```

这让任务可以被"取消"。比如，一个 watch 在 stop 后会将其 job.active 设为 false，即使任务还在队列中也不会执行：

```typescript
const runner = effect.run.bind(effect)
runner.effect = effect

return () => {
  effect.stop()
  // effect.stop() 会设置 effect.active = false
}
```

## 递归刷新

flushJobs 末尾检查是否有新任务产生：

```typescript
if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
  flushJobs(seen)
}
```

后置回调中可能触发新的数据变化，产生新的更新任务。递归调用确保所有任务都被处理。seen 参数（开发环境下的 Map）用于追踪每个任务的执行次数，检测无限循环。

为什么不在 while 循环中处理？使用递归并传递 seen 可以让开发环境的递归检测跨越多轮刷新，更准确地捕获问题。

## 递归更新限制

开发环境下会检测异常的递归更新：

```typescript
const RECURSION_LIMIT = 100

function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob) {
  if (!seen.has(fn)) {
    seen.set(fn, 1)
  } else {
    const count = seen.get(fn)!
    if (count > RECURSION_LIMIT) {
      const instance = fn.ownerInstance
      const componentName = instance && getComponentName(instance.type)
      warn(
        `Maximum recursive updates exceeded${componentName ? ` in component <${componentName}>` : ''}.`
      )
      return true // 跳过此任务
    } else {
      seen.set(fn, count + 1)
    }
  }
  return false
}
```

如果同一个任务在一次 flush 周期内执行超过 100 次，会发出警告并跳过。这通常意味着代码中存在无限更新循环。

## currentFlushPromise

currentFlushPromise 记录当前的刷新 Promise：

```typescript
let currentFlushPromise: Promise<void> | null = null

function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

这个变量用于 nextTick 的实现——它需要返回一个在刷新完成后 resolve 的 Promise：

```typescript
export function nextTick<T = void>(fn?: () => T): Promise<T> {
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(fn) : p
}
```

如果正在刷新或已调度刷新，nextTick 返回的 Promise 会在刷新完成后 resolve。

## finally 块的重要性

主队列执行被包装在 try-finally 中：

```typescript
try {
  for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
    // 执行任务
  }
} finally {
  flushIndex = 0
  queue.length = 0
  flushPostFlushCbs(seen)
  isFlushing = false
  currentFlushPromise = null
  // 检查新任务
}
```

即使执行过程中抛出未捕获的错误，finally 块也会执行，确保：
- 队列被清空，不会残留任务
- 后置回调仍然执行
- 状态标志被重置
- 新任务被检查

这保证了调度系统的健壮性。

## 嵌套组件更新

考虑父组件更新触发子组件 props 变化的场景：

```typescript
// 父组件
<Child :value="count" />

// 更新 count
count.value = newValue
```

父组件的更新任务执行时，会 patch 子组件，这可能产生子组件的更新任务。由于执行是在 for 循环中，子组件任务会被添加到队列末尾：

```typescript
for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
  // 父组件更新
  // -> patch 子组件
  // -> 子组件可能入队新任务
  // -> queue.length 增加
  // -> 循环继续处理新任务
}
```

循环条件使用 `queue.length` 而非缓存的长度值，确保新增任务被处理。

## 小结

flushJobs 是 Vue 调度系统的执行引擎，它按固定顺序（前置回调 → 主队列 → 后置回调）刷新所有待处理任务。排序确保父组件先于子组件更新，try-finally 保证状态正确重置，递归调用处理执行期间产生的新任务，开发环境的循环检测防止无限更新。这个精心设计的函数让 Vue 能够高效、可靠地批量处理状态变化。
