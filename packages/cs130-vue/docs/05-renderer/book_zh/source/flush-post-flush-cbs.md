# flushPostFlushCbs 刷新后置

flushPostFlushCbs 负责执行所有待处理的后置回调。这些回调在 DOM 更新完成后运行，是生命周期钩子和需要访问新 DOM 状态的逻辑的执行时机。与前置回调相比，后置回调有额外的排序和嵌套处理逻辑。

## 函数实现

flushPostFlushCbs 的完整实现：

```typescript
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    // 去重
    const deduped = [...new Set(pendingPostFlushCbs)]
    pendingPostFlushCbs.length = 0

    // 嵌套调用检测
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped)
      return
    }

    activePostFlushCbs = deduped
    
    // 开发环境递归检测
    if (__DEV__) {
      seen = seen || new Map()
    }

    // 按 id 排序
    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))

    // 执行回调
    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (
        __DEV__ &&
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
      ) {
        continue
      }
      activePostFlushCbs[postFlushIndex]()
    }

    // 重置状态
    activePostFlushCbs = null
    postFlushIndex = 0
  }
}
```

与前置回调相比，后置回调有两个关键区别：执行前的 id 排序，以及嵌套调用时追加到现有队列而非递归处理。

## 排序机制

后置回调按 id 排序执行：

```typescript
activePostFlushCbs.sort((a, b) => getId(a) - getId(b))
```

这确保了父组件的钩子先于子组件执行，与组件树的层级关系一致。考虑这个场景：

```html
<!-- Parent.vue -->
<template>
  <Child />
</template>
<script setup>
onMounted(() => {
  console.log('Parent mounted') // 先执行
})
</script>

<!-- Child.vue -->
<script setup>
onMounted(() => {
  console.log('Child mounted') // 后执行
})
</script>
```

父组件的 id 小于子组件（uid 按创建顺序分配），所以父组件的 mounted 先触发。

## 嵌套调用处理

后置回调执行期间可能触发新的后置回调入队：

```typescript
if (activePostFlushCbs) {
  activePostFlushCbs.push(...deduped)
  return
}
```

如果已存在活动队列（正在执行中），新回调直接追加到活动队列。这样当前的 for 循环会继续处理新添加的回调，无需递归调用。

这与前置回调的递归模式不同，原因在于：
- 后置回调需要排序，追加到队列后可以继续利用已排序的位置
- 后置回调通常数量较多（所有组件的生命周期钩子），避免多次递归可以提升性能
- 循环条件 `postFlushIndex < activePostFlushCbs.length` 自然处理了新增元素

## 与生命周期的关系

组件的生命周期钩子通过 queuePostRenderEffect 入队：

```typescript
// 挂载完成后触发 mounted
queuePostRenderEffect(() => {
  if (m) {
    invokeArrayFns(m) // instance.m 是 mounted 钩子数组
  }
}, parentSuspense)

// 更新完成后触发 updated
queuePostRenderEffect(() => {
  if (u) {
    invokeArrayFns(u) // instance.u 是 updated 钩子数组
  }
}, parentSuspense)
```

入队时设置的 id 来自组件实例：

```typescript
const job: SchedulerJob = () => { /* 钩子执行逻辑 */ }
job.id = instance.uid
queuePostFlushCb(job)
```

这就是排序能够正确反映组件层级的原因。

## 去重逻辑

去重在复制时进行：

```typescript
const deduped = [...new Set(pendingPostFlushCbs)]
```

同一个后置回调可能因为多次数据变化而多次入队，去重确保只执行一次。比如：

```typescript
watch([a, b, c], callback, { flush: 'post' })

// 同一 tick 内
a.value = 1
b.value = 2
c.value = 3
// callback 只会执行一次
```

## 循环执行

for 循环的条件使用活动队列的长度：

```typescript
for (
  postFlushIndex = 0;
  postFlushIndex < activePostFlushCbs.length;
  postFlushIndex++
) {
  // 执行
}
```

由于嵌套调用会追加到 activePostFlushCbs，`activePostFlushCbs.length` 可能在循环中增加。循环会自动处理这些新增的回调，无需额外逻辑。

## 递归更新检测

开发环境下检测异常的重复执行：

```typescript
if (
  __DEV__ &&
  checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
) {
  continue
}
```

如果同一个回调执行超过 100 次，会跳过并发出警告。这通常表示存在问题，比如 mounted 钩子中修改数据导致重新挂载。

## 与 Suspense 的集成

在 Suspense 场景中，后置回调可能被收集而非立即入队：

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb

function queueEffectWithSuspense(
  fn: Function | Function[],
  suspense: SuspenseBoundary | null
) {
  if (suspense && suspense.pendingBranch && !suspense.isUnmounted) {
    // 收集到 Suspense 的 effects 中
    suspense.effects.push(fn)
  } else {
    // 正常入队
    queuePostFlushCb(fn)
  }
}
```

Suspense resolve 时统一执行收集的 effects：

```typescript
// SuspenseBoundary.resolve
if (!hasUnresolvedAncestor) {
  queuePostFlushCb(effects)
}
suspense.effects = []
```

这确保了异步组件的后置回调在 Suspense resolve 后才执行。

## 执行时机

flushPostFlushCbs 在 flushJobs 的 finally 块中调用：

```typescript
function flushJobs(seen?) {
  // ...
  try {
    // 执行主队列
  } finally {
    flushIndex = 0
    queue.length = 0
    
    // 刷新后置回调
    flushPostFlushCbs(seen)
    
    isFlushing = false
    // ...
  }
}
```

在 finally 中执行有两个好处：
1. 即使主队列执行出错，后置回调仍会执行
2. 确保 DOM 更新完成后再执行

## 回调数组处理

后置回调可以以数组形式入队：

```typescript
export function queuePostFlushCb(cb: SchedulerJob | SchedulerJob[]) {
  if (!isArray(cb)) {
    // 单个回调，需要去重检查
    if (!activePostFlushCbs || !activePostFlushCbs.includes(/* ... */)) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // 回调数组，直接添加
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

数组形式用于生命周期钩子场景——一个组件可能注册多个同类型钩子（通过多次 onMounted 调用或混入），它们被收集成数组一起入队。

## 状态重置

执行完成后重置状态：

```typescript
activePostFlushCbs = null
postFlushIndex = 0
```

这让下一次调用可以正确初始化。如果不重置 activePostFlushCbs，嵌套检测会失效。

## 小结

flushPostFlushCbs 执行 DOM 更新后的回调，包括生命周期钩子和 flush: 'post' 的 watch。id 排序确保父子组件顺序，嵌套调用时追加到活动队列而非递归，与 Suspense 集成延迟异步场景的回调执行。它在 flushJobs 的 finally 块中调用，确保即使主队列出错也能执行后置逻辑。
