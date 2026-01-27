# queuePostFlushCb 后置回调

后置回调是在组件更新完成、DOM 已经更新之后执行的回调。这是生命周期钩子（如 mounted、updated）和需要访问更新后 DOM 的逻辑最常用的调度方式。queuePostFlushCb 负责管理这类回调的入队。

## 设计动机

很多场景需要在 DOM 更新后执行代码。比如，mounted 钩子需要访问组件渲染出的真实 DOM；updated 钩子需要操作更新后的元素；watch 配置 `flush: 'post'` 需要在视图同步后才执行回调。

```typescript
onMounted(() => {
  // 需要访问真实 DOM
  console.log(el.value.offsetHeight)
})

watch(data, () => {
  // 需要在 DOM 更新后执行
  scrollToBottom()
}, { flush: 'post' })
```

如果这些代码在 DOM 更新之前执行，拿到的是旧的或不存在的元素。后置回调确保了它们在正确的时机运行。

## 函数实现

queuePostFlushCb 的结构与前置回调类似：

```typescript
// 待处理的后置回调
const pendingPostFlushCbs: SchedulerJob[] = []

// 当前正在执行的后置回调
let activePostFlushCbs: SchedulerJob[] | null = null

// 当前执行位置
let postFlushIndex = 0

export function queuePostFlushCb(cb: SchedulerJob | SchedulerJob[]) {
  if (!isArray(cb)) {
    // 单个回调
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // 回调数组
    // 组件生命周期钩子以数组形式传入，跳过去重检查
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

与前置回调的主要区别在于，后置回调更常以数组形式传入。组件的生命周期钩子（同一个钩子可能有多个回调）会收集成数组一起入队。

## 渲染器包装

渲染器提供了 queuePostRenderEffect 函数，根据是否有 Suspense 选择不同的入队方式：

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb

function queueEffectWithSuspense(
  fn: Function | Function[],
  suspense: SuspenseBoundary | null
): void {
  if (suspense && suspense.pendingBranch && !suspense.isUnmounted) {
    // 在 Suspense 边界内，收集到 effects 数组
    if (isArray(fn)) {
      suspense.effects.push(...fn)
    } else {
      suspense.effects.push(fn)
    }
  } else {
    // 正常入队
    queuePostFlushCb(fn)
  }
}
```

当组件在 Suspense 边界内且 Suspense 还未 resolve 时，后置回调被收集到 Suspense 的 effects 数组，等 resolve 后统一执行。这避免了在异步内容就绪前执行可能出错的副作用。

## 刷新后置队列

flushPostFlushCbs 负责执行队列中的所有后置回调：

```typescript
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    // 去重并复制到 active
    const deduped = [...new Set(pendingPostFlushCbs)]
    pendingPostFlushCbs.length = 0
    
    // 如果已有 active 队列（嵌套调用场景）
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped)
      return
    }
    
    activePostFlushCbs = deduped
    
    // 按 id 排序确保执行顺序
    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))
    
    // 执行回调
    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (__DEV__) {
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
      }
      activePostFlushCbs[postFlushIndex]()
    }
    
    // 重置状态
    activePostFlushCbs = null
    postFlushIndex = 0
  }
}
```

与前置回调不同，后置回调在执行前会按 id 排序。这确保了父组件的钩子先于子组件执行，与渲染顺序一致。

## 嵌套调用处理

后置回调的执行可能触发新的更新，这会导致嵌套的 flushPostFlushCbs 调用：

```typescript
if (activePostFlushCbs) {
  activePostFlushCbs.push(...deduped)
  return
}
```

当检测到已有活动队列时，新回调直接追加到活动队列而非创建新队列。这样当前的 for 循环会继续执行新添加的回调，不会错过。

## 与 flushJobs 的集成

后置回调在主队列执行完毕后刷新：

```typescript
function flushJobs(seen?: Map<SchedulerJob, number>) {
  isFlushPending = false
  isFlushing = true
  
  // 1. 刷新前置回调
  flushPreFlushCbs(seen)
  
  // 2. 执行主队列
  queue.sort(comparator)
  
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      if (job && job.active !== false) {
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {
    // 3. 重置主队列
    flushIndex = 0
    queue.length = 0
    
    // 4. 刷新后置回调（此时 DOM 已更新）
    flushPostFlushCbs(seen)
    
    isFlushing = false
    currentFlushPromise = null
    
    // 5. 检查是否有新任务产生
    if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```

这个顺序很关键：主队列中的组件更新任务执行完毕后，DOM 已经同步更新。此时刷新后置回调，回调中可以安全地访问新的 DOM 状态。

如果后置回调中触发了新的数据变化，产生的任务会进入 pending 队列，flushJobs 末尾的检查会发现它们并递归处理。

## 生命周期钩子入队

组件的生命周期钩子通过 queuePostRenderEffect 入队：

```typescript
const mountElement = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  // ...
) => {
  // ... 元素创建和属性设置 ...
  
  // 插入 DOM
  hostInsert(el, container, anchor)
  
  // 入队 mounted 钩子
  if (vnodeHook || dirs) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
      dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
    }, parentSuspense)
  }
}
```

mounted 钩子在元素插入 DOM 后入队，但实际执行是在所有组件更新完成后。这确保了整个组件树都已渲染完毕，钩子中可以访问任何 DOM 元素。

## watch 的 post flush

watch 配置 `flush: 'post'` 时使用后置回调：

```typescript
// doWatch 实现
if (flush === 'post') {
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
}
```

这让 watch 回调可以安全地操作更新后的 DOM，比如在数据变化后滚动到新内容：

```typescript
watch(messages, () => {
  nextTick(() => {
    // 也可以用 flush: 'post' 替代 nextTick
  })
}, { flush: 'post' })
```

## 递归更新检测

开发环境下会检测无限递归更新：

```typescript
if (__DEV__) {
  checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
}

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
      return
    } else {
      seen.set(fn, count + 1)
    }
  }
}
```

如果同一个回调在一次 flush 周期内执行超过 100 次，会发出警告。这通常表示代码存在无限循环——回调修改数据，触发更新，更新后再次触发回调。

## 小结

queuePostFlushCb 管理 DOM 更新后执行的回调，主要用于生命周期钩子和需要访问新 DOM 的逻辑。它使用 pending 和 active 双队列处理嵌套调用，通过 id 排序保证父子组件顺序，与 Suspense 集成延迟异步场景的副作用执行。后置回调确保了开发者在正确的时机获得正确的 DOM 状态。
