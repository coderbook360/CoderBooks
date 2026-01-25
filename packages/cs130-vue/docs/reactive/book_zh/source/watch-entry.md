# watch 函数入口：侦听器的起点

watch 是 Vue 响应式系统中用于观察数据变化并执行副作用的 API。与 effect 不同，watch 提供了更多控制选项，如深度监听、立即执行、清理函数等。本章分析 watch 函数的入口实现。

## watch 的基本用法

watch 监听响应式数据的变化并执行回调：

```typescript
const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`count changed from ${oldValue} to ${newValue}`)
})

count.value++  // 'count changed from 0 to 1'
```

watch 支持多种数据源类型和配置选项，是一个功能丰富的 API。

## 函数签名

watch 有多个重载签名：

```typescript
// 监听单个源
export function watch<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T>,
  options?: WatchOptions,
): WatchStopHandle

// 监听多个源
export function watch<T extends MultiWatchSources>(
  sources: [...T],
  cb: WatchCallback<MapSources<T>>,
  options?: WatchOptions,
): WatchStopHandle

// 监听 reactive 对象
export function watch<T extends object>(
  source: T,
  cb: WatchCallback<T>,
  options?: WatchOptions,
): WatchStopHandle
```

WatchSource 可以是 ref、reactive 对象、或 getter 函数。多个源可以用数组传入。

## watch 实现概览

```typescript
export function watch<T = any>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions,
): WatchStopHandle {
  if (__DEV__ && !isFunction(cb)) {
    warn(...)
  }
  return doWatch(source as any, cb, options)
}
```

watch 函数本身很简单，只做参数验证然后调用 doWatch。真正的实现在 doWatch 函数中。

## WatchSource 类型

```typescript
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T)
```

watch 可以监听三种源：

1. Ref（包括 shallowRef）
2. ComputedRef
3. Getter 函数

对于 reactive 对象，有特殊处理——会自动开启深度监听。

## WatchCallback 类型

```typescript
export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: OnCleanup,
) => any

export type OnCleanup = (cleanupFn: () => void) => void
```

回调函数接收三个参数：

- value：新值
- oldValue：旧值
- onCleanup：注册清理函数的方法

## WatchOptions 类型

```typescript
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
  immediate?: Immediate
  deep?: boolean
  once?: boolean
}

export interface WatchOptionsBase extends DebuggerOptions {
  flush?: 'pre' | 'post' | 'sync'
}
```

主要选项：

- immediate：是否立即执行回调
- deep：是否深度监听
- once：是否只触发一次（Vue 3.4+）
- flush：回调执行时机（sync/pre/post）

## 与 watchEffect 的关系

watch 和 watchEffect 都用于观察响应式数据，但有关键区别：

```typescript
// watchEffect：自动追踪，立即执行
watchEffect(() => {
  console.log(count.value)  // 自动追踪 count
})

// watch：显式指定源，惰性执行
watch(count, (newVal) => {
  console.log(newVal)
})
```

watchEffect 自动追踪回调中访问的所有响应式数据，立即执行一次。watch 需要显式指定监听源，默认不立即执行。

在实现上，两者都调用 doWatch，只是参数不同。

## 监听多个源

watch 可以同时监听多个源：

```typescript
const count = ref(0)
const name = ref('Vue')

watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
  console.log(`count: ${oldCount} -> ${newCount}`)
  console.log(`name: ${oldName} -> ${newName}`)
})
```

任何一个源变化都会触发回调，回调参数是数组形式。

## WatchStopHandle 返回值

watch 返回一个停止函数：

```typescript
const stop = watch(count, (newVal) => {
  console.log(newVal)
})

// 停止监听
stop()
```

调用这个函数会停止内部的 effect，之后数据变化不再触发回调。

## 与 effect 的区别

watch 和 effect 都基于 ReactiveEffect，但设计目标不同：

effect 是低级 API：
- 立即执行
- 自动追踪所有依赖
- 没有新旧值对比
- 主要用于内部实现

watch 是高级 API：
- 默认惰性执行
- 显式指定监听源
- 提供新旧值
- 提供清理机制
- 提供更多控制选项

## 调试选项

watch 继承了调试选项：

```typescript
watch(source, callback, {
  onTrack(e) {
    console.log('tracking:', e)
  },
  onTrigger(e) {
    console.log('triggered:', e)
  }
})
```

这些回调在开发模式下帮助调试依赖追踪问题。

## 服务端渲染考虑

在 SSR 环境中，watch 的行为略有不同：

```typescript
// 在组件 setup 中
watch(source, callback)
```

在服务端，watch 默认不执行回调（除非设置 immediate）。这是因为服务端是一次性渲染，不需要响应式更新。但如果设置了 `{ immediate: true }`，回调会在服务端执行一次。

## 本章小结

watch 函数是 Vue 中监听数据变化的主要 API。它接收数据源、回调函数和可选配置，返回停止函数。

watch 支持多种数据源类型（ref、computed、getter、reactive 对象）和丰富的配置选项（immediate、deep、once、flush）。实际实现由 doWatch 函数处理，我们将在下一章详细分析。

理解 watch 的函数签名和选项有助于正确使用这个 API，选择最适合场景的配置方式。
