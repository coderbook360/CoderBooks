# flushPreFlushCbs 刷新前置

flushPreFlushCbs 负责执行所有待处理的前置回调。这些回调在组件更新之前运行，主要用于在渲染前同步数据状态。这个函数的设计需要处理执行期间可能产生的新回调。

## 函数签名

flushPreFlushCbs 接收可选的 seen 参数用于递归检测，以及起始索引：

```typescript
export function flushPreFlushCbs(
  seen?: CountMap,
  i = preFlushIndex
) {
  if (pendingPreFlushCbs.length) {
    currentPreFlushParentJob = null
    
    // 去重并复制到 active 队列
    activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
    pendingPreFlushCbs.length = 0
    
    // 按 id 排序（如果有的话）
    if (__DEV__) {
      seen = seen || new Map()
    }
    
    // 执行回调
    for (
      preFlushIndex = i;
      preFlushIndex < activePreFlushCbs.length;
      preFlushIndex++
    ) {
      if (
        __DEV__ &&
        checkRecursiveUpdates(seen!, activePreFlushCbs[preFlushIndex])
      ) {
        continue
      }
      activePreFlushCbs[preFlushIndex]()
    }
    
    // 重置状态
    activePreFlushCbs = null
    preFlushIndex = 0
    
    // 递归处理执行期间新增的回调
    flushPreFlushCbs(seen, i)
  }
}
```

这段代码的核心是"复制-清空-执行-递归"的模式。将 pending 队列复制到 active 后立即清空 pending，这样执行期间新增的回调会进入空的 pending，在下一轮递归时处理。

## 去重机制

复制时使用 Set 进行去重：

```typescript
activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
```

考虑这样的场景：同一个响应式数据在同步代码中被修改多次，相关的 watch 回调会多次入队。通过 Set 去重，回调只会执行一次，这正是期望的行为。

为什么在这里去重而不是入队时？入队时需要检查的是 active 队列（正在执行的），而 pending 队列中的重复项无需立即处理，到执行时统一去重即可。

## currentPreFlushParentJob

这个变量用于防止特定的递归场景：

```typescript
let currentPreFlushParentJob: SchedulerJob | null = null

export function flushPreFlushCbs(seen?: CountMap, i = preFlushIndex) {
  if (pendingPreFlushCbs.length) {
    currentPreFlushParentJob = null
    // ...
  }
}

// 在 queueJob 中使用
export function queueJob(job: SchedulerJob) {
  if (
    (!queue.length ||
      !queue.includes(job, /* ... */)) &&
    job !== currentPreFlushParentJob
  ) {
    // 入队
  }
}
```

当前置回调执行时，如果它触发了同一个任务的入队（比如 watch 回调修改了被 watch 的数据），这个检查可以防止无限递归。

## 与 flushJobs 的协作

flushPreFlushCbs 在 flushJobs 中被调用，位于主队列执行之前：

```typescript
function flushJobs(seen?: Map<SchedulerJob, number>) {
  isFlushPending = false
  isFlushing = true
  
  // 第一步：刷新前置回调
  flushPreFlushCbs(seen)
  
  // 第二步：排序主队列
  queue.sort(comparator)
  
  // 第三步：执行主队列
  // ...
}
```

这个顺序确保了前置回调在任何组件更新之前完成。如果前置回调中修改了数据，相关的组件更新会被收集到主队列中，随后一起执行。

## 执行顺序

前置回调按入队顺序执行，不像主队列那样按 id 排序：

```typescript
for (
  preFlushIndex = i;
  preFlushIndex < activePreFlushCbs.length;
  preFlushIndex++
) {
  activePreFlushCbs[preFlushIndex]()
}
```

这是因为前置回调通常是相互独立的操作，入队顺序即执行顺序是合理的。如果需要特定顺序，开发者可以通过代码组织来控制入队时机。

## 递归处理

函数末尾的递归调用处理执行期间新增的回调：

```typescript
// 重置状态
activePreFlushCbs = null
preFlushIndex = 0

// 递归处理
flushPreFlushCbs(seen, i)
```

为什么不用 while 循环？递归的优势在于每次调用都会重新去重，并且开发环境下可以持续追踪执行次数。如果用 while 循环，需要额外的逻辑来处理这些场景。

## 索引参数

起始索引参数 i 在内部递归时保持为 0：

```typescript
export function flushPreFlushCbs(
  seen?: CountMap,
  i = preFlushIndex // 默认值是当前索引
) {
  // ...
  for (
    preFlushIndex = i;  // 从 i 开始
    preFlushIndex < activePreFlushCbs.length;
    preFlushIndex++
  ) {
    // ...
  }
  // ...
  flushPreFlushCbs(seen, i)  // 递归时传递同一个 i
}
```

这个参数主要用于 flushJobs 可能需要从特定位置恢复执行的场景，正常调用时 i 为 0。

## 递归检测

开发环境下检测异常的递归执行：

```typescript
if (
  __DEV__ &&
  checkRecursiveUpdates(seen!, activePreFlushCbs[preFlushIndex])
) {
  continue
}
```

如果同一个回调在一个刷新周期内执行超过限制次数，会跳过执行并发出警告。这帮助开发者发现潜在的无限循环问题。

## 使用场景

前置回调的典型使用场景：

```typescript
// watch 的 flush: 'pre'（默认）
watch(source, (newVal) => {
  // 在组件更新前同步数据
  normalizedData.value = transform(newVal)
})

// 内部使用
queuePreFlushCb(() => {
  // 预处理逻辑
})
```

通过在渲染前执行这些回调，可以确保组件获得正确的数据状态，避免多次渲染。

## 边界情况

如果 pendingPreFlushCbs 为空，函数会直接返回：

```typescript
if (pendingPreFlushCbs.length) {
  // 处理逻辑
}
// 隐式返回
```

这是一个简单但重要的优化——当没有前置回调时跳过所有处理逻辑。

## 与组件更新的关系

考虑这个场景：

```typescript
const count = ref(0)

watch(count, (newVal) => {
  if (newVal < 10) {
    count.value = newVal + 1
  }
}, { flush: 'pre' })

count.value = 1
```

执行流程：
1. `count.value = 1` 触发 watch 回调入队
2. 微任务执行 flushPreFlushCbs
3. watch 回调执行，修改 count 为 2
4. 新的 watch 回调入队到 pending
5. 当前轮次结束，递归调用 flushPreFlushCbs
6. 执行新回调，count 变为 3
7. 重复直到 count 达到 10
8. 前置回调全部完成
9. flushJobs 继续执行主队列

所有前置回调都在组件更新之前完成，组件只渲染一次（显示 count = 10）。

## 小结

flushPreFlushCbs 实现了前置回调的批量执行。通过"复制-清空-执行-递归"模式处理执行期间的新增回调，Set 去重避免重复执行，递归检测防止无限循环。它在 flushJobs 的第一步执行，确保所有数据同步逻辑在 DOM 更新之前完成。
