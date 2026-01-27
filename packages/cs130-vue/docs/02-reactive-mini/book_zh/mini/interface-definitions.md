# 接口定义与类型

在开始实现之前，我们需要定义清晰的接口和类型。良好的类型定义不仅提供类型安全，也是对 API 设计的精确描述。

## Effect 相关类型

effect 是响应式系统的核心，我们首先定义它的类型：

```typescript
// effect.ts

/**
 * 响应式副作用函数
 */
export interface ReactiveEffect<T = any> {
  (): T
  id: number
  active: boolean
  _isEffect: true
  raw: () => T
  deps: Set<ReactiveEffect>[]
  options: ReactiveEffectOptions
}

/**
 * effect 选项
 */
export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  onStop?: () => void
  allowRecurse?: boolean
}

/**
 * effect 调度器类型
 */
export type EffectScheduler = (effect: ReactiveEffect) => void

/**
 * 依赖集合类型
 */
export type Dep = Set<ReactiveEffect>

/**
 * 依赖映射类型
 */
export type KeyToDepMap = Map<any, Dep>
```

## Reactive 相关类型

```typescript
// reactive.ts

/**
 * 代理标记
 */
export const enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}

/**
 * 目标对象类型
 */
export interface Target {
  [ReactiveFlags.SKIP]?: boolean
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
}

/**
 * 代理映射表类型
 */
export type ProxyMap = WeakMap<Target, any>
```

## Ref 相关类型

```typescript
// ref.ts

/**
 * Ref 接口
 */
export interface Ref<T = any> {
  value: T
  /**
   * 用于区分 ref 和普通对象
   */
  _isRef: true
}

/**
 * 浅层 Ref 接口
 */
export interface ShallowRef<T = any> {
  value: T
  _isRef: true
  _shallow: true
}

/**
 * 用于类型推断的解包类型
 */
export type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRef<V>
  : T extends object
  ? { [K in keyof T]: UnwrapRef<T[K]> }
  : T

/**
 * toRef 的返回类型
 */
export type ToRef<T> = [T] extends [Ref] ? T : Ref<T>

/**
 * toRefs 的返回类型
 */
export type ToRefs<T = any> = {
  [K in keyof T]: ToRef<T[K]>
}
```

## Computed 相关类型

```typescript
// computed.ts

/**
 * 计算属性 Ref
 */
export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T
  _isComputed: true
}

/**
 * 可写计算属性
 */
export interface WritableComputedRef<T> extends Ref<T> {
  value: T
  _isComputed: true
}

/**
 * getter 类型
 */
export type ComputedGetter<T> = (oldValue?: T) => T

/**
 * setter 类型
 */
export type ComputedSetter<T> = (newValue: T) => void

/**
 * 可写计算属性选项
 */
export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}
```

## Watch 相关类型

```typescript
// watch.ts

/**
 * watch 来源类型
 */
export type WatchSource<T = any> =
  | Ref<T>
  | ComputedRef<T>
  | (() => T)

/**
 * watch 回调
 */
export type WatchCallback<V = any, OV = any> = (
  value: V,
  oldValue: OV,
  onCleanup: (cleanupFn: () => void) => void
) => void

/**
 * watch 选项
 */
export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

/**
 * watchEffect 选项
 */
export interface WatchEffectOptions {
  flush?: 'pre' | 'post' | 'sync'
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

/**
 * 停止函数
 */
export type WatchStopHandle = () => void

/**
 * 调试事件
 */
export interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: 'get' | 'set' | 'add' | 'delete' | 'clear'
  key: any
  newValue?: any
  oldValue?: any
}
```

## EffectScope 相关类型

```typescript
// effectScope.ts

/**
 * Effect 作用域
 */
export interface EffectScope {
  id: number
  active: boolean
  effects: ReactiveEffect[]
  cleanups: (() => void)[]
  parent?: EffectScope
  scopes?: EffectScope[]
  
  run<T>(fn: () => T): T | undefined
  stop(): void
}
```

## Handlers 相关类型

```typescript
// baseHandlers.ts

/**
 * Proxy handler 配置
 */
export interface ProxyHandlerContext {
  isReadonly: boolean
  isShallow: boolean
}

/**
 * 集合类型判断
 */
export const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

/**
 * Track 操作类型
 */
export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

/**
 * Trigger 操作类型
 */
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
```

## 公共工具类型

```typescript
// shared.ts

/**
 * 判断是否为对象
 */
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

/**
 * 判断是否为函数
 */
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

/**
 * 判断是否为数组
 */
export const isArray = Array.isArray

/**
 * 判断是否为 Map
 */
export const isMap = (val: unknown): val is Map<any, any> =>
  val instanceof Map

/**
 * 判断是否为 Set
 */
export const isSet = (val: unknown): val is Set<any> =>
  val instanceof Set

/**
 * 判断值是否变化
 */
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

/**
 * 判断是否拥有某属性
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

/**
 * 空函数
 */
export const NOOP = () => {}

/**
 * 扩展对象
 */
export const extend = Object.assign

/**
 * 创建不可变空对象
 */
export const EMPTY_OBJ: { readonly [key: string]: any } = {}
```

## API 导出定义

```typescript
// index.ts

// reactive 系列
export {
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  isReactive,
  isReadonly,
  isShallow,
  isProxy,
  toRaw,
  markRaw
} from './reactive'

// ref 系列
export {
  ref,
  shallowRef,
  isRef,
  unref,
  toRef,
  toRefs,
  proxyRefs
} from './ref'

// effect 系列
export {
  effect,
  stop,
  ReactiveEffect
} from './effect'

// computed
export { computed } from './computed'

// watch
export {
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect
} from './watch'

// effectScope
export {
  effectScope,
  getCurrentScope,
  onScopeDispose
} from './effectScope'

// 类型导出
export type {
  Ref,
  ShallowRef,
  UnwrapRef,
  ToRef,
  ToRefs,
  ComputedRef,
  WritableComputedRef,
  WritableComputedOptions,
  WatchSource,
  WatchCallback,
  WatchOptions,
  WatchEffectOptions,
  WatchStopHandle,
  ReactiveEffectOptions,
  EffectScheduler,
  EffectScope
}
```

## 类型验证

定义完类型后，可以写一些类型测试确保类型正确：

```typescript
// types.test-d.ts
import { expectType } from 'vitest'
import { ref, computed, reactive, Ref, ComputedRef } from './index'

// ref 类型测试
const count = ref(0)
expectType<Ref<number>>(count)
expectType<number>(count.value)

// computed 类型测试
const double = computed(() => count.value * 2)
expectType<ComputedRef<number>>(double)

// reactive 类型测试
const state = reactive({ count: 0, name: 'test' })
expectType<number>(state.count)
expectType<string>(state.name)
```

有了这些类型定义，我们就可以开始实现具体功能了。类型既是文档，也是契约，帮助我们在实现过程中保持一致性。
