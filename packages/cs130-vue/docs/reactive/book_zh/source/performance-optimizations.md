# 性能优化：响应式系统的效率

Vue 响应式系统在设计时充分考虑了性能。本章分析 Vue 使用的各种性能优化技术。

## 惰性代理创建

Vue 不会一次性代理整个对象树：

```typescript
const deep = reactive({
  level1: {
    level2: {
      level3: { value: 1 }
    }
  }
})

// 此时只有 deep 被代理
// level1, level2, level3 还没有被代理
```

只有访问时才创建代理：

```typescript
get(target, key, receiver) {
  const res = Reflect.get(target, key, receiver)
  
  if (isObject(res)) {
    // 访问时才代理嵌套对象
    return isReadonly ? readonly(res) : reactive(res)
  }
  return res
}
```

这避免了不必要的代理创建开销。

## 代理缓存

同一对象只创建一个代理：

```typescript
export const reactiveMap: WeakMap<Target, any> = new WeakMap()

function createReactiveObject(target, ...) {
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  return proxy
}
```

WeakMap 缓存确保：

1. 相同对象返回相同代理
2. 不阻止垃圾回收

## 位掩码优化

Vue 使用位运算进行快速检查：

```typescript
export enum TrackOpTypes {
  GET = 1 << 0,        // 1
  HAS = 1 << 1,        // 2
  ITERATE = 1 << 2,    // 4
}

export enum TriggerOpTypes {
  SET = 1 << 0,        // 1
  ADD = 1 << 1,        // 2
  DELETE = 1 << 2,     // 4
  CLEAR = 1 << 3,      // 8
}
```

位运算比字符串比较更快。

## shouldTrack 开关

避免不必要的追踪：

```typescript
export let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking(): void {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function resetTracking(): void {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
```

在不需要追踪时暂停，减少开销：

```typescript
// Array 方法中
pauseTracking()
// 执行可能触发追踪的操作
resetTracking()
```

## 批量更新

调度器合并多次更新：

```typescript
const count = ref(0)

effect(() => {
  console.log(count.value)
})

// 同步修改多次
count.value = 1
count.value = 2
count.value = 3

// 只触发一次 effect（在微任务中）
```

queueJob 去重：

```typescript
export function queueJob(job: SchedulerJob): void {
  if (!queue.includes(job, ...)) {
    queue.push(job)
    queueFlush()
  }
}
```

## 依赖清理优化

Vue 3.4 引入了更高效的依赖清理：

```typescript
// 不再每次都 cleanup 后重新收集
// 而是使用标记来识别过时的依赖
```

通过 trackId 和 depsLength 优化：

```typescript
class ReactiveEffect {
  _trackId = 0
  _depsLength = 0
  
  run() {
    this._trackId++
    this._depsLength = 0
    // ...
  }
}
```

## Computed 缓存

computed 只在依赖变化时重算：

```typescript
class ComputedRefImpl<T> {
  _value!: T
  _dirty = true
  
  get value() {
    if (this._dirty) {
      this._value = this.effect.run()!
      this._dirty = false
    }
    return this._value
  }
}
```

多次访问不会重复计算：

```typescript
const double = computed(() => {
  console.log('computing')
  return count.value * 2
})

double.value  // 'computing'
double.value  // 不输出，使用缓存
double.value  // 不输出，使用缓存
```

## 高效的数据结构

使用 Map 和 Set 而非数组：

```typescript
type KeyToDepMap = Map<any, Dep>
const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

export type Dep = Map<ReactiveEffect, number>
```

Map 提供 O(1) 的查找和删除。

## 避免不必要的触发

hasChanged 检查值是否真的变化：

```typescript
set(target, key, value, receiver) {
  const oldValue = target[key]
  const result = Reflect.set(target, key, value, receiver)
  
  if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return result
}
```

相同值不触发更新。

## 数组优化

数组操作有特殊优化：

```typescript
const arrayInstrumentations: Record<string, Function> = {}

;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  arrayInstrumentations[key] = function (this: unknown[], ...args: unknown[]) {
    const arr = toRaw(this)
    for (let i = 0, l = arr.length; i < l; i++) {
      track(arr, TrackOpTypes.GET, i + '')
    }
    // 尝试使用原始值
    let res = arr[key](...args)
    if (res === -1 || res === false) {
      // 失败时尝试使用代理值
      res = arr[key](...args.map(toRaw))
    }
    return res
  }
})
```

## 只读优化

readonly 不需要追踪：

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // readonly 不需要追踪
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    // ...
  }
}
```

## trigger 优化

trigger 使用 Set 去重 effects：

```typescript
export function trigger(target, type, key?, ...) {
  const effects = new Set<ReactiveEffect>()
  
  // 收集需要触发的 effects
  const add = (dep: Dep | undefined) => {
    if (dep) {
      dep.forEach(effect => {
        if (effect !== activeEffect || effect.allowRecurse) {
          effects.add(effect)
        }
      })
    }
  }
  
  // ...
  
  // 批量触发
  effects.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  })
}
```

## 内存优化

WeakMap 允许垃圾回收：

```typescript
const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()
const reactiveMap: WeakMap<Target, any> = new WeakMap()
```

当对象不再被引用时，相关的代理和依赖关系会被自动回收。

## 条件追踪

某些操作不需要追踪：

```typescript
function get(target, key, receiver) {
  // 特殊键不追踪
  if (key === ReactiveFlags.IS_REACTIVE) {
    return !isReadonly
  }
  if (key === ReactiveFlags.RAW) {
    return target
  }
  // ...
}
```

## 本章小结

Vue 响应式系统使用多种优化技术：惰性代理避免不必要的创建，缓存避免重复代理，批量更新减少渲染次数，高效数据结构提供快速查找，computed 缓存避免重复计算。

这些优化使 Vue 在保持响应式便利性的同时，也能处理大规模应用的性能需求。
