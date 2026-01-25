# 扩展与进阶：构建自己的响应式库

本章介绍如何基于迷你实现进行扩展，构建更强大的响应式库。

## 添加调试支持

### onTrack 和 onTrigger

```typescript
interface EffectOptions {
  lazy?: boolean
  scheduler?: (effect: ReactiveEffect) => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: 'get' | 'set' | 'add' | 'delete'
  key: unknown
  newValue?: unknown
  oldValue?: unknown
}

class ReactiveEffect {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  constructor(fn: Function, options?: EffectOptions) {
    this.fn = fn
    this.scheduler = options?.scheduler
    this.onTrack = options?.onTrack
    this.onTrigger = options?.onTrigger
  }
}
```

在 track 和 trigger 中调用：

```typescript
function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  // 调试钩子
  if (activeEffect.onTrack) {
    activeEffect.onTrack({
      effect: activeEffect,
      target,
      type: 'get',
      key
    })
  }
  
  // 正常收集...
}

function trigger(target: object, key: unknown, type: string, newValue?: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  dep.forEach(effect => {
    // 调试钩子
    if (effect.onTrigger) {
      effect.onTrigger({
        effect,
        target,
        type: type as any,
        key,
        newValue
      })
    }
    
    // 正常触发...
  })
}
```

使用示例：

```typescript
effect(() => {
  console.log(state.count)
}, {
  onTrack({ target, key }) {
    console.log(`Tracked: ${String(key)}`)
  },
  onTrigger({ key, newValue }) {
    console.log(`Triggered: ${String(key)} = ${newValue}`)
  }
})
```

## 添加 markRaw

阻止对象被转为响应式：

```typescript
const RAW_SYMBOL = Symbol('raw')

export function markRaw<T extends object>(value: T): T {
  Object.defineProperty(value, RAW_SYMBOL, {
    configurable: false,
    enumerable: false,
    value: true
  })
  return value
}

export function isMarkedRaw(value: unknown): boolean {
  return !!(value && (value as any)[RAW_SYMBOL])
}
```

在 reactive 中检查：

```typescript
export function reactive<T extends object>(target: T): T {
  // 已标记为 raw，直接返回
  if (isMarkedRaw(target)) {
    return target
  }
  
  // 正常处理...
  return createReactiveObject(target, false, reactiveHandlers, reactiveMap)
}
```

## 实现 customRef

允许自定义 ref 的行为：

```typescript
type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void
) => {
  get: () => T
  set: (value: T) => void
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  const dep = new Set<ReactiveEffect>()
  
  const trackFn = () => {
    if (activeEffect) {
      dep.add(activeEffect)
      activeEffect.deps.push(dep)
    }
  }
  
  const triggerFn = () => {
    dep.forEach(effect => {
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    })
  }
  
  const { get, set } = factory(trackFn, triggerFn)
  
  return {
    get value() {
      return get()
    },
    set value(newValue: T) {
      set(newValue)
    },
    __v_isRef: true
  } as any
}
```

使用示例 - 防抖 ref：

```typescript
function useDebouncedRef<T>(value: T, delay = 200) {
  let timeout: any
  
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue: T) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        value = newValue
        trigger()
      }, delay)
    }
  }))
}

const text = useDebouncedRef('', 300)
// text.value 的变化会延迟 300ms 触发
```

## 实现 proxyRefs

自动解包 ref：

```typescript
export function proxyRefs<T extends object>(objectWithRefs: T): UnwrapRefs<T> {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return isRef(value) ? value.value : value
    },
    set(target, key, newValue, receiver) {
      const oldValue = (target as any)[key]
      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue
        return true
      }
      return Reflect.set(target, key, newValue, receiver)
    }
  }) as any
}
```

使用示例：

```typescript
const state = proxyRefs({
  count: ref(0),
  name: ref('Vue')
})

// 自动解包
console.log(state.count)  // 0，不是 { value: 0 }

// 自动包装
state.count = 1  // 等同于 state.count.value = 1
```

## 添加 flush 模式

完整的 flush 实现：

```typescript
const pendingPreJobs: Function[] = []
const pendingPostJobs: Function[] = []
let isPreFlushing = false
let isPostFlushing = false

function queuePreJob(job: Function) {
  if (!pendingPreJobs.includes(job)) {
    pendingPreJobs.push(job)
    if (!isPreFlushing) {
      isPreFlushing = true
      Promise.resolve().then(flushPreJobs)
    }
  }
}

function queuePostJob(job: Function) {
  if (!pendingPostJobs.includes(job)) {
    pendingPostJobs.push(job)
    if (!isPostFlushing) {
      isPostFlushing = true
      Promise.resolve().then(flushPostJobs)
    }
  }
}

function flushPreJobs() {
  for (const job of pendingPreJobs) {
    job()
  }
  pendingPreJobs.length = 0
  isPreFlushing = false
}

function flushPostJobs() {
  for (const job of pendingPostJobs) {
    job()
  }
  pendingPostJobs.length = 0
  isPostFlushing = false
}

function createScheduler(flush: 'sync' | 'pre' | 'post') {
  switch (flush) {
    case 'sync':
      return undefined  // 直接执行
    case 'pre':
      return (job: Function) => queuePreJob(job)
    case 'post':
      return (job: Function) => queuePostJob(job)
  }
}
```

## 实现 once 选项

Vue 3.4 的 once 选项：

```typescript
interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  once?: boolean
  flush?: 'sync' | 'pre' | 'post'
}

export function watch(source: any, callback: Function, options: WatchOptions = {}) {
  const { once } = options
  
  let stop: () => void
  
  const wrappedCallback = (newVal: any, oldVal: any) => {
    callback(newVal, oldVal)
    if (once) {
      stop()  // 执行一次后停止
    }
  }
  
  // ... 创建 effect
  
  stop = () => {
    effect.stop()
  }
  
  return stop
}
```

## 添加暂停和恢复

```typescript
class ReactiveEffect {
  paused = false
  
  pause() {
    this.paused = true
  }
  
  resume() {
    if (this.paused) {
      this.paused = false
      this.run()  // 恢复时执行一次
    }
  }
}

// trigger 中检查
function trigger(target: object, key: unknown) {
  // ...
  effects.forEach(effect => {
    if (effect.paused) return  // 跳过暂停的 effect
    
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

## 实现批处理

```typescript
let isBatching = false
const batchedTriggers: Array<() => void> = []

export function batch(fn: () => void) {
  isBatching = true
  fn()
  isBatching = false
  
  // 批量执行所有 trigger
  for (const trigger of batchedTriggers) {
    trigger()
  }
  batchedTriggers.length = 0
}

// 修改 trigger
function trigger(target: object, key: unknown) {
  const runTrigger = () => {
    // 原来的 trigger 逻辑
  }
  
  if (isBatching) {
    batchedTriggers.push(runTrigger)
  } else {
    runTrigger()
  }
}
```

使用示例：

```typescript
batch(() => {
  state.a = 1
  state.b = 2
  state.c = 3
  // 所有修改在 batch 结束后一起触发
})
```

## 类型安全增强

```typescript
// 更精确的类型
export interface Ref<T = any> {
  value: T
  readonly __v_isRef: true
}

export type UnwrapRef<T> = T extends Ref<infer V> ? V : T

export type UnwrapRefs<T> = {
  [K in keyof T]: UnwrapRef<T[K]>
}

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K]
}

// 类型安全的 readonly
export function readonly<T extends object>(target: T): DeepReadonly<T> {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap) as DeepReadonly<T>
}
```

## 构建和发布

```json
// package.json
{
  "name": "mini-reactivity",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "rollup -c",
    "test": "vitest"
  }
}
```

## 本章小结

扩展响应式库的方向：

1. **调试支持**：onTrack、onTrigger 帮助开发调试
2. **控制 API**：markRaw、customRef 提供灵活性
3. **自动解包**：proxyRefs 简化使用
4. **调度控制**：flush 模式、pause/resume
5. **批处理**：batch 减少更新次数
6. **类型安全**：完善 TypeScript 类型

通过这些扩展，你可以构建一个功能完整的响应式库。
