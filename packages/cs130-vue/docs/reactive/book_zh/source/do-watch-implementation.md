# doWatch 实现：侦听器的核心逻辑

doWatch 是 watch 和 watchEffect 的共享实现。这个函数处理各种数据源类型、创建 effect、管理回调执行和清理。本章深入分析 doWatch 的完整实现。

## 函数签名

```typescript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  {
    immediate,
    deep,
    flush,
    once,
    onTrack,
    onTrigger,
  }: WatchOptions = EMPTY_OBJ,
): WatchStopHandle
```

cb 为 null 时是 watchEffect 模式，否则是 watch 模式。

## 整体结构

doWatch 的实现分为几个主要部分：

1. 构建 getter 函数
2. 处理深度监听
3. 创建清理机制
4. 定义调度器
5. 创建 ReactiveEffect
6. 处理立即执行
7. 返回停止函数

让我们逐一分析。

## 构建 getter 函数

首先需要根据 source 类型构建统一的 getter 函数：

```typescript
let getter: () => any
let forceTrigger = false
let isMultiSource = false

if (isRef(source)) {
  getter = () => source.value
  forceTrigger = isShallow(source)
} else if (isReactive(source)) {
  getter = () => reactiveGetter(source)
  deep = true
} else if (isArray(source)) {
  isMultiSource = true
  forceTrigger = source.some(s => isReactive(s) || isShallow(s))
  getter = () =>
    source.map(s => {
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        return reactiveGetter(s)
      } else if (isFunction(s)) {
        return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER)
      } else {
        __DEV__ && warnInvalidSource(s)
      }
    })
} else if (isFunction(source)) {
  if (cb) {
    // watch with getter
    getter = () =>
      callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
  } else {
    // watchEffect
    getter = () => {
      if (cleanup) {
        cleanup()
      }
      return callWithAsyncErrorHandling(
        source,
        instance,
        ErrorCodes.WATCH_CALLBACK,
        [onCleanup],
      )
    }
  }
} else {
  getter = NOOP
  __DEV__ && warnInvalidSource(source)
}
```

这段代码处理了所有可能的 source 类型。

对于 ref，getter 返回其 .value。shallowRef 需要设置 forceTrigger，因为即使值相同也可能需要触发回调。

对于 reactive 对象，自动开启 deep 模式，并使用 reactiveGetter 遍历所有属性。

对于数组，getter 返回映射后的数组，每个元素按其类型处理。

对于函数，watch 模式直接调用，watchEffect 模式会先执行清理。

## reactiveGetter 函数

```typescript
function reactiveGetter(source: object) {
  if (deep) {
    return source
  }
  if (isShallow(source) || deep === false || deep === 0) {
    return traverse(source, 1)
  }
  return traverse(source)
}
```

这个函数决定如何遍历 reactive 对象。deep 为 true 时返回源对象（traverse 在后面处理），否则只遍历一层。

## 处理深度监听

```typescript
const baseGetter = getter
if (deep) {
  if (deep === true) {
    getter = () => traverse(baseGetter())
  } else {
    const depth = deep
    getter = () => traverse(baseGetter(), depth)
  }
}
```

deep 选项现在支持数字值（Vue 3.5+），表示遍历的深度。true 表示无限深度。

traverse 函数递归访问对象的所有属性，确保它们都被追踪。

## 清理机制

```typescript
let cleanup: (() => void) | undefined
let onCleanup: OnCleanup = (fn: () => void) => {
  cleanup = effect.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    cleanup = effect.onStop = undefined
  }
}
```

onCleanup 让用户注册清理函数。这个函数会在：
1. 下次回调执行前调用
2. effect 停止时调用

清理函数被同时赋给 cleanup 变量和 effect.onStop，确保两种场景都能触发。

## SSR 处理

```typescript
let ssrCleanup: (() => void)[] | undefined
if (__SSR__ && isInSSRComponentSetup) {
  // 服务端渲染特殊处理
  onCleanup = NOOP
  if (!cb) {
    getter()
  } else if (immediate) {
    callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
      getter(),
      isMultiSource ? [] : undefined,
      onCleanup,
    ])
  }
  if (flush === 'sync') {
    const ctx = useSSRContext()!
    ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = [])
  } else {
    return NOOP as WatchStopHandle
  }
}
```

SSR 环境中，watchEffect 会执行一次 getter，watch 只有设置 immediate 才执行回调。非 sync 模式直接返回空函数。

## 定义 job 函数

```typescript
let oldValue: any = isMultiSource
  ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
  : INITIAL_WATCHER_VALUE

const job: SchedulerJob = (immediateFirstRun?: boolean) => {
  if (!effect.active || (!effect.dirty && !immediateFirstRun)) {
    return
  }
  if (cb) {
    // watch(source, cb)
    const newValue = effect.run()
    if (
      deep ||
      forceTrigger ||
      (isMultiSource
        ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
        : hasChanged(newValue, oldValue))
    ) {
      // 清理旧的副作用
      if (cleanup) {
        cleanup()
      }
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
        newValue,
        oldValue === INITIAL_WATCHER_VALUE
          ? undefined
          : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
            ? []
            : oldValue,
        onCleanup,
      ])
      oldValue = newValue
    }
  } else {
    // watchEffect
    effect.run()
  }
}
```

job 是实际执行的任务函数。它检查 effect 是否活跃和脏，获取新值，比较变化，执行清理，调用回调。

INITIAL_WATCHER_VALUE 是一个特殊标记，表示尚未获取过值。第一次触发时 oldValue 会是 undefined 而非这个标记。

## 调度器设置

```typescript
job.allowRecurse = !!cb

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

根据 flush 选项决定调度策略：
- sync：同步执行
- post：渲染后执行
- pre：渲染前执行（默认）

allowRecurse 允许回调中修改数据触发自身。

## 创建 ReactiveEffect

```typescript
const effect = new ReactiveEffect(getter, NOOP, scheduler)

if (__DEV__) {
  effect.onTrack = onTrack
  effect.onTrigger = onTrigger
}
```

创建 effect，传入 getter 和 scheduler。开发模式下设置调试回调。

## 初始执行

```typescript
if (cb) {
  if (immediate) {
    job(true)
  } else {
    oldValue = effect.run()
  }
} else if (flush === 'post') {
  queuePostRenderEffect(
    effect.run.bind(effect),
    instance && instance.suspense,
  )
} else {
  effect.run()
}
```

watch 模式：immediate 为 true 时立即执行 job，否则只运行 effect 获取初始值。

watchEffect 模式：post 时延迟执行，否则立即执行。

## 返回停止函数

```typescript
const unwatch = () => {
  effect.stop()
  if (instance && instance.scope) {
    remove(instance.scope.effects!, effect)
  }
}

if (__SSR__ && ssrCleanup) ssrCleanup.push(unwatch)
return unwatch
```

返回的函数调用 effect.stop() 并从组件 scope 中移除。SSR 时注册到 ssrCleanup 数组。

## 完整流程示例

```typescript
const count = ref(0)

const stop = watch(
  count,
  (newVal, oldVal) => {
    console.log(`${oldVal} -> ${newVal}`)
  },
  { immediate: true }
)

// 1. 构建 getter: () => count.value
// 2. 创建 job 函数
// 3. 创建 scheduler（默认 pre）
// 4. 创建 ReactiveEffect
// 5. immediate 为 true，立即执行 job
//    - 运行 effect.run() 获取新值 0
//    - 调用回调 (0, undefined)
// 6. 返回 stop 函数

count.value = 1
// 1. 触发 trigger
// 2. 调用 scheduler，将 job 加入队列
// 3. 队列刷新时执行 job
// 4. 获取新值 1，对比旧值 0
// 5. 有变化，调用回调 (1, 0)
// 6. 更新 oldValue 为 1
```

## 本章小结

doWatch 是 watch 系统的核心实现，它统一处理各种数据源类型，创建 getter 函数追踪依赖。通过 job 函数管理回调执行，通过 scheduler 控制执行时机。

关键设计包括：统一的 getter 构建、灵活的清理机制、可配置的调度策略、完善的 SSR 支持。这些设计使 watch 成为一个强大而灵活的响应式 API。
