# computed 函数入口：计算属性的起点

computed 是 Vue 响应式系统中最重要的 API 之一。它创建基于其他响应式数据派生的值，具有缓存和懒计算的特性。理解 computed 的实现，对于理解 Vue 的性能优化机制至关重要。

## computed 的基本概念

computed 创建一个响应式的计算值：

```typescript
const count = ref(0)
const doubled = computed(() => count.value * 2)

console.log(doubled.value)  // 0
count.value = 5
console.log(doubled.value)  // 10
```

computed 有两个重要特性。第一是懒计算：只有在访问 .value 时才执行 getter，不访问就不计算。第二是缓存：如果依赖没有变化，多次访问返回缓存的值，不会重复计算。

## computed 函数的重载

computed 支持两种调用方式：

```typescript
// 只读 computed：只传 getter
const doubled = computed(() => count.value * 2)

// 可写 computed：传 getter 和 setter
const fullName = computed({
  get: () => firstName.value + ' ' + lastName.value,
  set: (value) => {
    const parts = value.split(' ')
    firstName.value = parts[0]
    lastName.value = parts[1]
  }
})
```

## 函数签名

让我们看看 computed 的类型签名：

```typescript
export function computed<T>(
  getter: ComputedGetter<T>,
  debugOptions?: DebuggerOptions,
): ComputedRef<T>

export function computed<T>(
  options: WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
): WritableComputedRef<T>

export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false,
) {
  // 实现...
}
```

第一个参数可以是 getter 函数或包含 get/set 的选项对象。第二个参数是调试选项，用于开发时追踪依赖。第三个参数 isSSR 是内部使用的服务端渲染标志。

## computed 实现源码

```typescript
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false,
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)

  if (__DEV__ && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack
    cRef.effect.onTrigger = debugOptions.onTrigger
  }

  return cRef as any
}
```

函数首先解析参数，提取 getter 和 setter。如果只传了函数（onlyGetter 为 true），setter 会被设为一个警告函数或空函数。

然后创建 ComputedRefImpl 实例，传入 getter、setter、是否只读、是否 SSR。

如果提供了调试选项且在开发模式，将 onTrack 和 onTrigger 回调设置到内部 effect 上。

## 相关类型定义

```typescript
export type ComputedGetter<T> = (...args: any[]) => T
export type ComputedSetter<T> = (v: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
  readonly value: T
}

export interface WritableComputedRef<T> extends Ref<T> {
  readonly effect: ReactiveEffect<T>
}
```

ComputedRef 和 WritableComputedRef 都是 Ref 的子类型，但 ComputedRef 的 value 是只读的。两者都暴露了内部的 effect，用于高级场景。

## 与 effect 的关系

computed 内部使用 ReactiveEffect 来追踪依赖：

```typescript
class ComputedRefImpl<T> {
  public readonly effect: ReactiveEffect<T>
  
  constructor(getter, setter, isReadonly, isSSR) {
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => triggerRefValue(this, ...),
      () => this.dep && triggerEffects(this.dep, ...)
    )
    // ...
  }
}
```

getter 函数被包装在 ReactiveEffect 中，这样 getter 执行时访问的响应式数据会被追踪。当这些数据变化时，computed 会被通知需要重新计算。

但与普通 effect 不同，computed 的 effect 不会立即执行 getter。它使用特殊的调度逻辑，只在下次访问 .value 时才计算。

## 调试选项

computed 支持调试选项，用于观察依赖追踪和触发：

```typescript
const plusOne = computed(() => count.value + 1, {
  onTrack(e) {
    console.log('tracked:', e)
  },
  onTrigger(e) {
    console.log('triggered:', e)
  }
})
```

onTrack 在收集依赖时调用，onTrigger 在依赖变化触发更新时调用。这些回调只在开发模式下生效，生产环境会被忽略。

事件对象包含详细信息：

```typescript
interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  // 对于 trigger 事件还有：
  newValue?: any
  oldValue?: any
}
```

## 服务端渲染的处理

computed 的第三个参数 isSSR 在服务端渲染时为 true：

```typescript
const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)
```

在 SSR 模式下，computed 的行为会有些不同：

1. 不会创建响应式 effect（因为服务端不需要响应式更新）
2. 每次访问都会重新计算（没有缓存优化）
3. 不会追踪依赖

这些调整确保 SSR 正确工作同时避免不必要的开销。

## 只读 vs 可写

只读 computed（只有 getter）是更常见的用法：

```typescript
const doubled = computed(() => count.value * 2)
doubled.value = 10  // 警告或静默失败
```

可写 computed 提供双向绑定能力：

```typescript
const formatted = computed({
  get: () => Number(raw.value).toFixed(2),
  set: (v) => { raw.value = parseFloat(v) }
})

formatted.value = '3.14'  // 会更新 raw
```

实现上，两者使用同一个 ComputedRefImpl 类，只是 setter 不同。只读版本的 setter 是警告函数或空函数。

## 与普通 ref 的区别

computed 和 ref 都是 Ref 类型，都有 .value，但行为不同：

```typescript
// ref：直接存储和更新值
const count = ref(0)
count.value = 5  // 直接设置

// computed：根据 getter 计算值
const doubled = computed(() => count.value * 2)
doubled.value  // 执行 getter 计算
```

ref 是"源数据"，computed 是"派生数据"。computed 的值由 getter 决定，不能直接设置（除非提供 setter）。

## 本章小结

computed 函数是创建计算属性的入口。它解析参数（getter 或 get/set 对象），创建 ComputedRefImpl 实例，并设置调试选项。

computed 的核心特性——懒计算和缓存——由 ComputedRefImpl 和其内部的 ReactiveEffect 实现。下一章我们将深入分析 ComputedRefImpl 的实现细节。

理解 computed 的函数入口有助于正确使用这个 API：只读 vs 可写的选择、调试选项的使用、以及它与 effect 系统的关系。
