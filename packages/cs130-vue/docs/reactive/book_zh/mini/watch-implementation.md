# watch 实现：监听数据变化

effect 提供了自动追踪依赖并在变化时重新执行的能力，但在实际开发中，我们经常需要更精细的控制：我想知道数据变化前后的值是什么、我想在变化时执行特定的回调而不是重新执行整个函数、我想能够取消之前的异步操作。watch API 正是为这些场景设计的——它是 effect 的上层封装，提供了新旧值对比、延迟执行、清理函数等高级功能。

## effect 与 watch 的核心差异

理解 watch 的实现，首先要理解它与 effect 的本质区别。effect 是"执行并追踪"——传入的函数本身就是要执行的副作用；watch 是"观察并响应"——传入一个数据源和一个回调，当数据源变化时执行回调。

这个区别导致了实现上的关键差异：effect 在依赖变化时重新执行整个函数；watch 需要先获取新值，然后调用回调并传入新旧值。这意味着 watch 需要"记住"上一次的值，并且需要一种机制来分离"追踪依赖"和"执行回调"这两件事。

scheduler 正是这个分离机制的关键。当我们创建 effect 时，可以传入一个 scheduler：依赖变化时，不直接调用 effect 的 run 方法，而是调用 scheduler。watch 利用这个机制，在 scheduler 中获取新值、调用用户回调、更新保存的旧值。

## 最简版本的 watch

让我们从最简单的版本开始。这个版本只支持 ref 类型的数据源和基本的回调功能：

```typescript
import { effect, ReactiveEffect } from './effect'
import { isRef, Ref } from './ref'

export function watch<T>(
  source: Ref<T>,
  callback: (newValue: T, oldValue: T) => void
) {
  // 创建一个 getter 函数来读取数据源
  const getter = () => source.value
  
  // 保存旧值
  let oldValue: T
  
  // 这个 job 就是我们的 scheduler
  // 当依赖变化时，它会被调用
  const job = () => {
    // 重新执行 getter 获取新值
    const newValue = effectFn()
    // 调用用户回调，传入新旧值
    callback(newValue, oldValue)
    // 更新旧值为当前值，为下次变化做准备
    oldValue = newValue
  }
  
  // 创建 effect，使用 lazy 选项延迟首次执行
  // scheduler 设为 job，这样依赖变化时会调用 job 而不是直接执行 getter
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job
  })
  
  // 首次执行 getter 获取初始值
  oldValue = effectFn()
}
```

这段代码的核心思想是：用 effect 来追踪依赖，但通过 scheduler 来控制响应方式。getter 函数读取响应式数据，建立依赖关系；当数据变化时，scheduler（也就是 job）被调用，它获取新值、比较新旧值、调用用户回调。

`lazy: true` 选项很重要——它让 effect 创建后不立即执行。这样我们可以手动控制首次执行的时机，并且能获取到初始值保存为 oldValue。

## 支持多种数据源类型

真实的 watch API 支持多种数据源：ref、getter 函数、reactive 对象。我们需要将这些不同类型统一转换为 getter 函数：

```typescript
type WatchSource<T> = Ref<T> | (() => T)

export function watch<T>(
  source: WatchSource<T>,
  callback: (newValue: T, oldValue: T) => void
) {
  // 将不同类型的 source 统一转换为 getter
  let getter: () => T
  
  if (isRef(source)) {
    // ref 类型：读取 .value
    getter = () => source.value
  } else if (typeof source === 'function') {
    // 函数类型：直接使用
    getter = source
  } else {
    // 其他类型（如 reactive 对象）：包装成返回自身的函数
    getter = () => source
  }
  
  // ... 后续逻辑与之前相同
}
```

函数类型的 source 让用户可以观察任意表达式：

```typescript
const state = reactive({ user: { name: 'John' } })

// 观察一个计算表达式
watch(
  () => state.user.name.toUpperCase(),
  (newName, oldName) => {
    console.log(`Name changed: ${oldName} -> ${newName}`)
  }
)
```

这里的 getter 函数在执行时会访问 `state.user.name`，从而建立对这个属性的依赖。当 name 变化时，watch 的 scheduler 被调用，获取新的大写名字。

## 深度监听：traverse 函数

当我们监听一个 reactive 对象时，默认只追踪对对象引用本身的访问，而不追踪对象内部属性的变化。要实现深度监听，需要在 getter 执行时遍历整个对象，访问每一个属性来建立依赖：

```typescript
function traverse(value: unknown, seen = new Set()): unknown {
  // 基础类型或 null，直接返回
  if (typeof value !== 'object' || value === null) {
    return value
  }
  
  // 避免循环引用导致的无限递归
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  
  // 递归遍历所有属性
  // 这个遍历本身就会触发 Proxy 的 get，建立依赖
  for (const key in value) {
    traverse((value as any)[key], seen)
  }
  
  return value
}
```

traverse 函数的作用是"访问"对象的每一个属性。由于我们在 effect 内部调用它，每次访问都会触发 track，建立依赖。这样，对象内部任何属性的变化都会触发 watch。

使用 traverse 实现 deep 选项：

```typescript
interface WatchOptions {
  deep?: boolean
  immediate?: boolean
}

export function watch<T>(
  source: WatchSource<T> | object,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
) {
  let getter: () => T
  
  if (isRef(source)) {
    getter = () => (source as Ref<T>).value
  } else if (typeof source === 'function') {
    getter = source as () => T
  } else {
    // reactive 对象：自动深度遍历
    getter = () => traverse(source) as T
  }
  
  // 如果显式指定 deep，包装 getter 使其深度遍历
  if (options.deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter()) as T
  }
  
  // ... 后续逻辑
}
```

这里有个细节：当 source 直接是 reactive 对象时，我们自动使用 traverse；而对于函数类型的 source，只有当用户显式指定 `deep: true` 时才深度遍历。这与 Vue 的实际行为一致。

## immediate 选项

有时候我们希望 watch 创建后立即执行一次回调，而不是等到数据变化。这就是 `immediate` 选项的作用：

```typescript
export function watch<T>(
  source: WatchSource<T>,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
) {
  // ... getter 设置 ...
  
  let oldValue: T | undefined
  
  const job = () => {
    const newValue = _effect.run()!
    callback(newValue, oldValue)
    oldValue = newValue
  }
  
  const _effect = new ReactiveEffect(getter, job)
  
  if (options.immediate) {
    // 立即执行 job
    // 此时 oldValue 是 undefined，这是预期行为
    job()
  } else {
    // 正常流程：获取初始值但不调用回调
    oldValue = _effect.run()
  }
  
  // ...
}
```

注意 immediate 情况下，oldValue 在首次回调时是 undefined。这是合理的——没有"上一次的值"可言。callback 的类型签名 `oldValue: T | undefined` 反映了这一点。

## 清理函数：处理竞态条件

异步操作中经常遇到竞态条件：发起请求 A，然后数据变化，发起请求 B，但请求 A 比请求 B 后完成。如果不处理，请求 A 的结果会覆盖请求 B 的结果，这是错误的。

watch 提供了 onCleanup 机制来处理这种情况：

```typescript
type OnCleanup = (fn: () => void) => void

export function watch<T>(
  source: WatchSource<T>,
  callback: (
    newValue: T, 
    oldValue: T | undefined, 
    onCleanup: OnCleanup
  ) => void,
  options: WatchOptions = {}
) {
  // 保存用户注册的清理函数
  let cleanup: (() => void) | undefined
  
  const onCleanup: OnCleanup = (fn) => {
    cleanup = fn
  }
  
  const job = () => {
    const newValue = _effect.run()!
    
    // 在执行新回调之前，先执行上次注册的清理函数
    if (cleanup) {
      cleanup()
    }
    
    // 执行回调，传入 onCleanup 供用户注册新的清理函数
    callback(newValue, oldValue, onCleanup)
    oldValue = newValue
  }
  
  // ...
}
```

使用方式：

```typescript
watch(userId, async (newId, oldId, onCleanup) => {
  // 用于标记这次请求是否被取消
  let cancelled = false
  
  // 注册清理函数：下次 watch 触发前会调用
  onCleanup(() => {
    cancelled = true
  })
  
  // 发起异步请求
  const userData = await fetchUser(newId)
  
  // 只有未被取消时才处理结果
  if (!cancelled) {
    user.value = userData
  }
})
```

这个机制的工作流程是：每次 job 执行时，先调用上次注册的 cleanup（如果有），然后执行新的回调。回调可以通过 onCleanup 注册新的清理函数，这个函数会在下次 job 执行前被调用。

## 返回停止函数

watch 应该返回一个函数，调用它可以停止监听：

```typescript
export function watch<T>(
  source: WatchSource<T>,
  callback: (newValue: T, oldValue: T | undefined, onCleanup: OnCleanup) => void,
  options: WatchOptions = {}
): () => void {
  // ... 所有逻辑 ...
  
  const _effect = new ReactiveEffect(getter, job)
  
  // ... immediate 和初始值逻辑 ...
  
  // 返回停止函数
  return () => {
    _effect.stop()
    // 也执行清理函数
    if (cleanup) {
      cleanup()
    }
  }
}
```

这让用户可以在适当的时候手动停止 watch，比如在组件卸载前：

```typescript
const stop = watch(source, callback)

// 稍后...
stop()  // 停止监听
```

## watchEffect：自动追踪的简化版

watchEffect 是 watch 的简化版：它不需要指定数据源，而是自动追踪回调函数中访问的所有响应式数据。实现起来更简单：

```typescript
export function watchEffect(
  fn: (onCleanup: OnCleanup) => void
): () => void {
  let cleanup: (() => void) | undefined
  
  const onCleanup: OnCleanup = (cleanupFn) => {
    cleanup = cleanupFn
  }
  
  const _effect = new ReactiveEffect(() => {
    // 先执行清理
    if (cleanup) {
      cleanup()
    }
    // 然后执行用户函数
    fn(onCleanup)
  })
  
  // 立即执行一次
  _effect.run()
  
  return () => {
    _effect.stop()
    if (cleanup) {
      cleanup()
    }
  }
}
```

watchEffect 没有 scheduler——每次依赖变化都直接重新执行传入的函数。它也没有新旧值的概念，因为整个函数就是副作用，不需要比较。

## 本章小结

watch 的实现展示了如何在 effect 的基础上构建更高级的抽象。核心思路是：用 effect 的依赖追踪机制来感知数据变化，但通过 scheduler 来控制响应方式。

几个关键的设计决策值得记住。getter 统一化让我们可以用同样的逻辑处理不同类型的数据源。lazy 选项让我们能控制首次执行的时机，从而正确获取初始的 oldValue。traverse 函数通过遍历对象来建立深层依赖。onCleanup 机制优雅地解决了异步竞态问题。

从更高的角度看，watch 是 effect 的"用户友好"封装。effect 是底层的、灵活的、需要用户自己处理细节的；watch 是上层的、贴合使用场景的、帮用户处理好常见需求的。这种分层设计让简单场景简单，复杂场景可能。

在下一章中，我们将实现 scheduler 调度器，看看如何控制 effect 的执行时机来实现批量更新。
