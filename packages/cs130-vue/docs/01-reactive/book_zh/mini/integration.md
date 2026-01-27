# 完整代码整合：迷你响应式系统

本章将前面实现的所有代码整合成一个完整可运行的迷你响应式系统。

## 项目结构

```
mini-reactivity/
├── src/
│   ├── index.ts          # 导出入口
│   ├── effect.ts         # effect 相关
│   ├── reactive.ts       # reactive 相关
│   ├── ref.ts            # ref 相关
│   ├── computed.ts       # computed
│   ├── watch.ts          # watch
│   └── effectScope.ts    # effectScope
└── test/
    └── index.test.ts     # 测试文件
```

## effect.ts

```typescript
// 当前活跃的 effect
let activeEffect: ReactiveEffect | undefined
const effectStack: ReactiveEffect[] = []

// 依赖收集映射
const targetMap = new WeakMap<object, Map<unknown, Set<ReactiveEffect>>>()

export class ReactiveEffect {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: Function,
    public scheduler?: (effect: ReactiveEffect) => void
  ) {
    // 注册到当前 scope
    if (activeEffectScope) {
      activeEffectScope.effects.push(this)
    }
  }
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    // 清理旧依赖
    cleanupEffect(this)
    
    // 入栈
    effectStack.push(this)
    activeEffect = this
    
    try {
      return this.fn()
    } finally {
      // 出栈
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      this.active = false
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  effect.deps.length = 0
}

export interface EffectOptions {
  lazy?: boolean
  scheduler?: (effect: ReactiveEffect) => void
}

export function effect(fn: Function, options?: EffectOptions) {
  const _effect = new ReactiveEffect(fn, options?.scheduler)
  
  if (!options?.lazy) {
    _effect.run()
  }
  
  const runner = _effect.run.bind(_effect) as any
  runner.effect = _effect
  
  return runner
}

// 依赖收集
let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function enableTracking() {
  shouldTrack = true
}

export function track(target: object, key: unknown) {
  if (!activeEffect || !shouldTrack) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

// 触发更新
export function trigger(target: object, key: unknown, type = 'SET') {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const effects = new Set<ReactiveEffect>()
  
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => {
      if (effect !== activeEffect) {
        effects.add(effect)
      }
    })
  }
  
  // 数组 length 处理
  if (Array.isArray(target) && type === 'ADD') {
    const lengthDep = depsMap.get('length')
    if (lengthDep) {
      lengthDep.forEach(effect => {
        if (effect !== activeEffect) {
          effects.add(effect)
        }
      })
    }
  }
  
  effects.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}

// EffectScope
let activeEffectScope: EffectScope | undefined

export class EffectScope {
  active = true
  effects: ReactiveEffect[] = []
  cleanups: (() => void)[] = []
  scopes?: EffectScope[]
  parent?: EffectScope
  
  constructor(detached = false) {
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope
      activeEffectScope.scopes || (activeEffectScope.scopes = [])
      activeEffectScope.scopes.push(this)
    }
  }
  
  run<T>(fn: () => T): T | undefined {
    if (this.active) {
      const currentScope = activeEffectScope
      try {
        activeEffectScope = this
        return fn()
      } finally {
        activeEffectScope = currentScope
      }
    }
  }
  
  stop() {
    if (this.active) {
      for (const effect of this.effects) {
        effect.stop()
      }
      if (this.scopes) {
        for (const scope of this.scopes) {
          scope.stop()
        }
      }
      for (const cleanup of this.cleanups) {
        cleanup()
      }
      this.active = false
    }
  }
}

export function effectScope(detached = false) {
  return new EffectScope(detached)
}

export function getCurrentScope() {
  return activeEffectScope
}

export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  }
}
```

## reactive.ts

```typescript
import { track, trigger, pauseTracking, enableTracking } from './effect'

const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  RAW: '__v_raw'
}

const reactiveMap = new WeakMap<object, any>()
const readonlyMap = new WeakMap<object, any>()
const shallowReactiveMap = new WeakMap<object, any>()
const shallowReadonlyMap = new WeakMap<object, any>()

// 数组方法重写
const arrayInstrumentations: Record<string, Function> = {}

;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  const originMethod = Array.prototype[method as any]
  arrayInstrumentations[method] = function(this: unknown[], ...args: unknown[]) {
    let res = originMethod.apply(this, args)
    if (res === false || res === -1) {
      res = originMethod.apply((this as any)[ReactiveFlags.RAW], args)
    }
    return res
  }
})

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method as any]
  arrayInstrumentations[method] = function(this: unknown[], ...args: unknown[]) {
    pauseTracking()
    const result = originMethod.apply(this, args)
    enableTracking()
    return result
  }
})

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
    if (key === ReactiveFlags.IS_READONLY) return isReadonly
    if (key === ReactiveFlags.IS_SHALLOW) return isShallow
    if (key === ReactiveFlags.RAW) return target
    
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    
    const result = Reflect.get(target, key, receiver)
    
    if (!isReadonly) {
      track(target, key)
    }
    
    if (isShallow) return result
    
    if (typeof result === 'object' && result !== null) {
      return isReadonly ? readonly(result) : reactive(result)
    }
    
    return result
  }
}

function createSetter(isReadonly = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    if (isReadonly) {
      console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
      return true
    }
    
    const oldValue = (target as any)[key]
    
    const hadKey = Array.isArray(target)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key)
    
    const result = Reflect.set(target, key, value, receiver)
    
    if (!hadKey) {
      trigger(target, key, 'ADD')
    } else if (oldValue !== value) {
      trigger(target, key, 'SET')
    }
    
    return result
  }
}

const reactiveHandlers = {
  get: createGetter(),
  set: createSetter()
}

const readonlyHandlers = {
  get: createGetter(true),
  set: createSetter(true)
}

const shallowReactiveHandlers = {
  get: createGetter(false, true),
  set: createSetter()
}

const shallowReadonlyHandlers = {
  get: createGetter(true, true),
  set: createSetter(true)
}

function createReactiveObject(
  target: object,
  isReadonly: boolean,
  handlers: ProxyHandler<object>,
  proxyMap: WeakMap<object, any>
) {
  const existingProxy = proxyMap.get(target)
  if (existingProxy) return existingProxy
  
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  
  return proxy
}

export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, reactiveHandlers, reactiveMap)
}

export function readonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap)
}

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowReactiveMap)
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyMap)
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_READONLY])
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_SHALLOW])
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

## ref.ts

```typescript
import { track, trigger, ReactiveEffect } from './effect'
import { reactive, isReactive, toRaw } from './reactive'

class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public dep = new Set<ReactiveEffect>()
  public readonly __v_isRef = true
  
  constructor(value: T) {
    this._rawValue = toRaw(value)
    this._value = toReactive(value)
  }
  
  get value() {
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    const rawValue = toRaw(newValue)
    if (rawValue !== this._rawValue) {
      this._rawValue = rawValue
      this._value = toReactive(newValue)
      triggerRefValue(this)
    }
  }
}

function toReactive<T>(value: T): T {
  return typeof value === 'object' && value !== null
    ? reactive(value as object) as T
    : value
}

export function trackRefValue(ref: { dep: Set<ReactiveEffect> }) {
  track(ref, 'value')
}

export function triggerRefValue(ref: { dep: Set<ReactiveEffect> }) {
  trigger(ref, 'value')
}

export function ref<T>(value: T) {
  return new RefImpl(value)
}

export function isRef(value: unknown): value is { value: unknown } {
  return !!(value && (value as any).__v_isRef === true)
}

export function unref<T>(ref: T): T extends { value: infer V } ? V : T {
  return isRef(ref) ? ref.value : ref as any
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): { value: T[K] } {
  return {
    get value() {
      return object[key]
    },
    set value(newValue) {
      object[key] = newValue
    }
  } as any
}

export function toRefs<T extends object>(object: T) {
  const ret: any = {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}

class ShallowRefImpl<T> {
  private _value: T
  public dep = new Set<ReactiveEffect>()
  public readonly __v_isRef = true
  public readonly __v_isShallow = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value() {
    trackRefValue(this)
    return this._value
  }
  
  set value(newValue) {
    if (newValue !== this._value) {
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

export function shallowRef<T>(value: T) {
  return new ShallowRefImpl(value)
}

export function triggerRef(ref: ShallowRefImpl<any>) {
  triggerRefValue(ref)
}
```

## computed.ts

```typescript
import { ReactiveEffect, track, trigger } from './effect'

class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _effect: ReactiveEffect
  public readonly __v_isRef = true
  public readonly __v_isReadonly: boolean
  
  constructor(
    getter: () => T,
    private readonly _setter?: (value: T) => void
  ) {
    this.__v_isReadonly = !_setter
    
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    track(this, 'value')
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
  
  set value(newValue: T) {
    if (this._setter) {
      this._setter(newValue)
    }
  }
}

type ComputedGetter<T> = () => T
type ComputedSetter<T> = (value: T) => void

interface ComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export function computed<T>(getter: ComputedGetter<T>): { readonly value: T }
export function computed<T>(options: ComputedOptions<T>): { value: T }
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | ComputedOptions<T>
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T> | undefined
  
  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(getter, setter)
}
```

## watch.ts

```typescript
import { ReactiveEffect } from './effect'
import { isRef } from './ref'
import { isReactive } from './reactive'

type WatchSource<T> = (() => T) | { value: T }

interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: 'sync' | 'pre' | 'post'
}

export function watch<T>(
  source: WatchSource<T>,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: WatchOptions = {}
) {
  const { immediate, deep, flush = 'sync' } = options
  
  let getter: () => T
  
  if (isRef(source)) {
    getter = () => source.value as T
  } else if (isReactive(source)) {
    getter = () => source as T
    // reactive 对象默认 deep
  } else if (typeof source === 'function') {
    getter = source as () => T
  } else {
    getter = () => source as T
  }
  
  if (deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  
  let oldValue: T | undefined
  let cleanup: (() => void) | undefined
  
  function onCleanup(fn: () => void) {
    cleanup = fn
  }
  
  const job = () => {
    if (cleanup) {
      cleanup()
      cleanup = undefined
    }
    const newValue = effect.run()
    callback(newValue, oldValue)
    oldValue = newValue
  }
  
  let scheduler: () => void
  if (flush === 'sync') {
    scheduler = job
  } else {
    scheduler = () => {
      Promise.resolve().then(job)
    }
  }
  
  const effect = new ReactiveEffect(getter, scheduler)
  
  if (immediate) {
    job()
  } else {
    oldValue = effect.run()
  }
  
  return () => {
    effect.stop()
    if (cleanup) {
      cleanup()
    }
  }
}

function traverse(value: unknown, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value
  }
  
  seen.add(value)
  
  for (const key in value) {
    traverse((value as any)[key], seen)
  }
  
  return value
}

export function watchEffect(
  effect: () => void,
  options: Omit<WatchOptions, 'immediate'> = {}
) {
  return watch(effect as any, () => {}, { ...options, immediate: true })
}
```

## index.ts

```typescript
// 导出所有 API
export {
  effect,
  ReactiveEffect,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  track,
  trigger
} from './effect'

export {
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  isReactive,
  isReadonly,
  isShallow,
  isProxy,
  toRaw
} from './reactive'

export {
  ref,
  isRef,
  unref,
  toRef,
  toRefs,
  shallowRef,
  triggerRef
} from './ref'

export { computed } from './computed'

export { watch, watchEffect } from './watch'
```

## 使用示例

```typescript
import {
  reactive,
  ref,
  computed,
  effect,
  watch,
  effectScope
} from './index'

// reactive
const state = reactive({ count: 0 })

// ref
const count = ref(0)

// computed
const double = computed(() => count.value * 2)

// effect
effect(() => {
  console.log('state.count:', state.count)
  console.log('count.value:', count.value)
  console.log('double.value:', double.value)
})

// watch
const stop = watch(count, (newVal, oldVal) => {
  console.log(`count changed from ${oldVal} to ${newVal}`)
})

// 修改触发更新
count.value++
state.count++

// 停止 watch
stop()

// effectScope
const scope = effectScope()
scope.run(() => {
  effect(() => {
    console.log('in scope:', count.value)
  })
})
scope.stop()
```

## 本章小结

完整的迷你响应式系统包含：

1. **effect.ts**：ReactiveEffect、track/trigger、effectScope
2. **reactive.ts**：reactive、readonly、shallowReactive
3. **ref.ts**：ref、isRef、unref、toRef/toRefs
4. **computed.ts**：computed 实现
5. **watch.ts**：watch、watchEffect

这个实现虽然简化，但涵盖了 Vue 响应式系统的核心概念。通过这个项目，你可以深入理解 Vue 响应式的工作原理。
