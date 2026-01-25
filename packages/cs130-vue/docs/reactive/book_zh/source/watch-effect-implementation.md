# watchEffect 实现：自动追踪的侦听器

watchEffect 是 watch 的简化版本，它自动追踪回调函数中访问的所有响应式数据，无需显式指定依赖。本章分析 watchEffect 的实现原理。

## 基本用法

```typescript
const count = ref(0)
const name = ref('Vue')

watchEffect(() => {
  console.log(`${name.value}: ${count.value}`)
})

// 初始输出: 'Vue: 0'
count.value++  // 输出: 'Vue: 1'
name.value = 'React'  // 输出: 'React: 1'
```

watchEffect 立即执行回调，并自动追踪其中访问的 count 和 name。

## 函数签名

```typescript
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase,
): WatchStopHandle {
  return doWatch(effect, null, options)
}

export type WatchEffect = (onCleanup: OnCleanup) => void
```

watchEffect 调用 doWatch 时第二个参数（cb）为 null，这是与 watch 的关键区别。

## 与 watch 的实现差异

在 doWatch 中，cb 是否为 null 决定了两种不同的行为模式：

```typescript
if (isFunction(source)) {
  if (cb) {
    // watch 模式：source 是 getter
    getter = () =>
      callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
  } else {
    // watchEffect 模式：source 是 effect
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
}
```

watchEffect 模式下：

1. 每次执行前先调用清理函数
2. 把 onCleanup 传给用户的 effect
3. 整个 effect 函数就是 getter

## 自动依赖追踪

watchEffect 的魔力在于自动追踪。用户不需要显式声明依赖，只要在 effect 中访问响应式数据，就会建立追踪：

```typescript
const state = reactive({ count: 0, name: 'Vue' })

watchEffect(() => {
  // 自动追踪 state.count 和 state.name
  console.log(state.count, state.name)
})
```

这是因为 effect 函数被包装成 getter，执行时触发 track。当 state.count 或 state.name 变化时触发 trigger，调度器重新执行 effect。

## 动态依赖

watchEffect 的依赖是动态的：

```typescript
const show = ref(true)
const count = ref(0)

watchEffect(() => {
  if (show.value) {
    console.log(count.value)
  }
})

// 初始依赖: show, count
show.value = false
// 此次执行只访问 show，不访问 count
// 新依赖: show（count 不再追踪）

count.value++  // 不会触发 effect
show.value = true  // 触发 effect，重新追踪 count
```

每次执行 effect 后，依赖会根据实际访问的数据重新建立。这就是前面章节讲的依赖清理机制的价值。

## 清理函数

watchEffect 通过 onCleanup 参数注册清理函数：

```typescript
watchEffect((onCleanup) => {
  const controller = new AbortController()
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      // 处理数据
    })
  
  onCleanup(() => {
    controller.abort()  // 取消请求
  })
})
```

清理函数在两种情况下执行：

1. 下次 effect 执行前
2. watchEffect 停止时

这解决了竞态问题——当依赖快速变化时，旧的异步操作会被取消。

## 清理机制实现

```typescript
let cleanup: (() => void) | undefined
let onCleanup: OnCleanup = (fn: () => void) => {
  cleanup = effect.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    cleanup = effect.onStop = undefined
  }
}
```

onCleanup 做两件事：

1. 设置 cleanup 变量供下次执行前调用
2. 设置 effect.onStop 供停止时调用

清理函数执行后，两个引用都被清除，确保只执行一次。

## job 函数的差异

```typescript
const job: SchedulerJob = (immediateFirstRun?: boolean) => {
  if (!effect.active || (!effect.dirty && !immediateFirstRun)) {
    return
  }
  if (cb) {
    // watch 模式：比较新旧值，调用回调
    // ...
  } else {
    // watchEffect 模式：直接执行 effect
    effect.run()
  }
}
```

watchEffect 的 job 非常简单，直接调用 effect.run()。不需要比较值、不需要传参，因为 effect 本身就是用户想执行的副作用。

## 初始执行

```typescript
if (cb) {
  // watch 模式
  if (immediate) {
    job(true)
  } else {
    oldValue = effect.run()
  }
} else if (flush === 'post') {
  // watchEffect + post
  queuePostRenderEffect(
    effect.run.bind(effect),
    instance && instance.suspense,
  )
} else {
  // watchEffect 默认：立即执行
  effect.run()
}
```

watchEffect 默认立即执行。如果 flush 为 'post'，延迟到渲染后执行。

这与 watch 不同——watch 默认惰性执行，需要 immediate: true 才立即执行。

## watchPostEffect 和 watchSyncEffect

Vue 提供了两个便捷函数：

```typescript
export function watchPostEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
) {
  return doWatch(
    effect,
    null,
    __DEV__ ? { ...options, flush: 'post' } : { flush: 'post' },
  )
}

export function watchSyncEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
) {
  return doWatch(
    effect,
    null,
    __DEV__ ? { ...options, flush: 'sync' } : { flush: 'sync' },
  )
}
```

它们是 watchEffect 的预设配置版本：

```typescript
// 等价写法
watchPostEffect(fn)
watchEffect(fn, { flush: 'post' })

watchSyncEffect(fn)
watchEffect(fn, { flush: 'sync' })
```

## flush 选项的影响

```typescript
const count = ref(0)

watchEffect(() => {
  console.log('sync:', count.value)
}, { flush: 'sync' })

watchEffect(() => {
  console.log('pre:', count.value)
})  // 默认 pre

watchEffect(() => {
  console.log('post:', count.value)
}, { flush: 'post' })

count.value++

// 输出顺序:
// sync: 1  (同步立即执行)
// pre: 1   (渲染前队列)
// post: 1  (渲染后队列)
```

sync 模式在数据变化时同步执行，适合需要立即响应的场景，但要注意性能。

pre 模式（默认）在渲染前执行，可以在渲染前更新状态。

post 模式在渲染后执行，可以访问更新后的 DOM。

## 使用场景对比

何时用 watchEffect vs watch？

watchEffect 适合：
- 副作用依赖多个响应式数据
- 不需要新旧值对比
- 希望立即执行

```typescript
watchEffect(() => {
  // 多个依赖，不关心旧值
  document.title = `${user.name} - ${count.value} items`
})
```

watch 适合：
- 需要新旧值对比
- 需要惰性执行
- 需要精确控制监听的数据

```typescript
watch(count, (newVal, oldVal) => {
  // 需要知道变化量
  analytics.track('count_changed', { delta: newVal - oldVal })
})
```

## 本章小结

watchEffect 是自动追踪依赖的侦听器，通过将用户 effect 作为 getter 执行，自然地建立和更新依赖关系。

与 watch 的核心区别在于：cb 为 null、自动追踪、立即执行、不比较值。清理函数机制使其能安全处理异步操作。

watchPostEffect 和 watchSyncEffect 是预设 flush 选项的便捷版本，适用于特定的执行时机需求。
