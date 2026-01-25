# watchPostEffect 与 watchSyncEffect：特定时机的侦听器

Vue 提供了 watchPostEffect 和 watchSyncEffect 两个便捷函数，分别对应渲染后执行和同步执行两种场景。本章分析它们的实现和使用场景。

## 函数定义

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

这两个函数是 watchEffect 的预设配置版本，只接受调试选项，flush 是固定的。

## watchPostEffect：渲染后执行

watchPostEffect 的 effect 在 DOM 更新后执行：

```typescript
const count = ref(0)

watchPostEffect(() => {
  // 此时 DOM 已更新
  const el = document.querySelector('.count')
  console.log(el?.textContent)  // 显示更新后的值
})
```

这对于需要访问更新后 DOM 的场景很有用。

## 实现细节：queuePostRenderEffect

post flush 使用 queuePostRenderEffect：

```typescript
if (flush === 'post') {
  scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
}
```

queuePostRenderEffect 将任务加入渲染后队列：

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? __TEST__
    ? (fn: Function | Function[], suspense: SuspenseBoundary | null) =>
        queueEffectWithSuspense(fn, suspense)
    : queueEffectWithSuspense
  : queuePostFlushCb
```

在支持 Suspense 的环境中会考虑 Suspense 边界，否则直接使用 queuePostFlushCb。

## 初始执行时机

watchPostEffect 的初始执行也是延迟的：

```typescript
if (cb) {
  // watch 模式
} else if (flush === 'post') {
  queuePostRenderEffect(
    effect.run.bind(effect),
    instance && instance.suspense,
  )
} else {
  effect.run()
}
```

不像普通 watchEffect 立即执行，watchPostEffect 的首次执行也在渲染后。

## watchSyncEffect：同步执行

watchSyncEffect 在数据变化时同步执行：

```typescript
const count = ref(0)

watchSyncEffect(() => {
  console.log('sync:', count.value)
})

console.log('before')
count.value++
console.log('after')

// 输出:
// sync: 0 (初始执行)
// before
// sync: 1 (同步执行)
// after
```

注意 'sync: 1' 在 'before' 和 'after' 之间，说明是同步执行的。

## 同步调度器

sync flush 的调度器就是 job 本身：

```typescript
if (flush === 'sync') {
  scheduler = job as any
}
```

当 trigger 调用 effect.scheduler() 时，job 直接执行，不经过任何队列。

## 三种 flush 模式对比

```typescript
const count = ref(0)

watchEffect(() => {
  console.log('pre:', count.value)
})

watchPostEffect(() => {
  console.log('post:', count.value)
})

watchSyncEffect(() => {
  console.log('sync:', count.value)
})

// 初始输出（假设在 setup 中）:
// pre: 0
// sync: 0
// post: 0

count.value = 1

// 触发后:
// sync: 1 (同步)
// pre: 1 (队列刷新)
// post: 1 (渲染后)
```

执行顺序：sync（同步）→ pre（渲染前队列）→ post（渲染后队列）。

## sync 模式的风险

同步执行有性能风险：

```typescript
watchSyncEffect(() => {
  console.log(count.value)
})

// 批量更新时，每次都会触发
for (let i = 0; i < 1000; i++) {
  count.value++  // 每次都执行 effect！
}
```

pre 模式会批量处理这些更新，只执行一次 effect。sync 模式则每次都执行。

使用 sync 的场景：

1. 需要立即响应的关键逻辑
2. 调试和日志
3. 与外部系统同步

## post 模式与 DOM

post 模式常用于 DOM 操作：

```typescript
const list = ref([1, 2, 3])

watchPostEffect(() => {
  // 安全地测量 DOM
  const items = document.querySelectorAll('.item')
  console.log('Item count:', items.length)
  
  // 计算布局
  const container = document.querySelector('.container')
  if (container) {
    console.log('Height:', container.clientHeight)
  }
})

list.value.push(4)  // DOM 更新后，effect 执行
```

如果用 pre 模式，DOM 还没更新，测量结果会不正确。

## 与组件生命周期的关系

在组件中，flush 模式与生命周期相关：

```typescript
setup() {
  const count = ref(0)
  
  // pre: 类似 beforeUpdate
  watchEffect(() => {
    console.log('pre:', count.value)
  })
  
  // post: 类似 updated
  watchPostEffect(() => {
    console.log('post:', count.value)
  })
  
  // sync: 不等待任何阶段
  watchSyncEffect(() => {
    console.log('sync:', count.value)
  })
}
```

pre 模式在组件更新前执行，post 模式在更新后执行。

## SSR 中的行为

服务端渲染时，non-sync 模式直接返回空函数：

```typescript
if (__SSR__ && isInSSRComponentSetup) {
  // ...
  if (flush === 'sync') {
    const ctx = useSSRContext()!
    ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = [])
  } else {
    return NOOP as WatchStopHandle
  }
}
```

只有 sync 模式在 SSR 中可用，因为服务端没有渲染队列概念。

## 选择建议

**默认用 pre（watchEffect）**：
- 适合大多数场景
- 自动批量处理
- 在渲染前更新状态

**用 post（watchPostEffect）**：
- 需要访问更新后的 DOM
- 依赖 DOM 测量
- 集成第三方 DOM 库

**用 sync（watchSyncEffect）**：
- 需要立即响应
- 调试目的
- 谨慎使用，注意性能

## 类型定义

```typescript
export type WatchEffect = (onCleanup: OnCleanup) => void

export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}
```

两个函数都接受 DebuggerOptions，支持调试：

```typescript
watchPostEffect(
  () => {
    console.log(count.value)
  },
  {
    onTrigger(e) {
      console.log('triggered by:', e.key)
    }
  }
)
```

## 本章小结

watchPostEffect 和 watchSyncEffect 是针对特定执行时机的便捷函数。post 模式适合 DOM 操作，sync 模式适合需要立即响应的场景。

理解三种 flush 模式的执行时机和队列机制，有助于选择合适的 watcher 类型，平衡响应性和性能。
