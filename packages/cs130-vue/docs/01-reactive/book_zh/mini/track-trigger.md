# track 与 trigger：依赖追踪的双子星

track 和 trigger 是响应式系统的关键机制。track 在数据读取时收集依赖，trigger 在数据修改时通知更新。本章深入探讨它们的实现细节。

## 数据结构回顾

```typescript
// target -> key -> effects
const targetMap = new WeakMap<object, Map<any, Set<ReactiveEffect>>>()
```

为什么选择这个结构？

**WeakMap**：键必须是对象，且不阻止垃圾回收。当对象不再被引用时，相关的依赖关系自动清理。

**Map**：对象的每个属性需要独立的依赖集合。

**Set**：同一个 effect 不应重复收集。

## track 的职责

track 需要回答：谁（effect）依赖什么（target.key）？

```typescript
export function track(target: object, key: unknown) {
  // 没有 effect 在执行，不需要追踪
  if (!activeEffect) return
  
  // 获取或创建 target 的依赖 Map
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  // 获取或创建 key 的依赖 Set
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 添加当前 effect
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}
```

## 双向记录

注意最后两行：

```typescript
dep.add(activeEffect)         // dep 记录 effect
activeEffect.deps.push(dep)   // effect 记录 dep
```

这是双向记录。effect 需要知道自己被哪些 dep 收集，以便清理时能从这些 dep 中移除自己。

## trigger 的职责

trigger 需要做：这个数据变了，通知谁？

```typescript
export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  const effectsToRun = new Set<ReactiveEffect>()
  dep.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => effect.run())
}
```

## 为什么需要 effectsToRun

直接遍历 dep 执行会有问题：

```typescript
// 危险的写法
dep.forEach(effect => effect.run())
```

effect.run() 会先 cleanup，从 dep 中删除自己；然后执行 fn，可能又添加自己到 dep。在遍历过程中修改 Set 会导致不可预测的行为。

解决方案是先收集到新的 Set，再遍历新 Set：

```typescript
const effectsToRun = new Set<ReactiveEffect>()
dep.forEach(effect => {
  effectsToRun.add(effect)
})
effectsToRun.forEach(effect => effect.run())
```

## 过滤当前 effect

```typescript
if (effect !== activeEffect) {
  effectsToRun.add(effect)
}
```

如果不过滤，这种代码会无限循环：

```typescript
effect(() => {
  state.count = state.count + 1
})
// 读取 count -> track
// 修改 count -> trigger -> 执行同一个 effect -> ...
```

## 处理不同类型的操作

目前的 trigger 只处理修改。实际上还需要处理添加和删除：

```typescript
export const enum TriggerType {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete'
}

export function trigger(
  target: object,
  type: TriggerType,
  key: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const effectsToRun = new Set<ReactiveEffect>()
  
  const add = (dep: Set<ReactiveEffect> | undefined) => {
    if (dep) {
      dep.forEach(effect => {
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
  }
  
  // 直接依赖的 effect
  add(depsMap.get(key))
  
  // 数组长度变化或新增属性，需要触发 iterate 相关的 effect
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    add(depsMap.get(Array.isArray(target) ? 'length' : Symbol('iterate')))
  }
  
  effectsToRun.forEach(effect => effect.run())
}
```

## ITERATE_KEY

遍历操作需要特殊追踪：

```typescript
const ITERATE_KEY = Symbol('iterate')

// 在 for...in 的 handler 中
ownKeys(target) {
  track(target, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

新增或删除属性会影响遍历结果，所以需要触发 ITERATE_KEY 的依赖。

## 数组长度的特殊性

修改数组长度会隐式删除元素：

```typescript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr[2])  // 追踪 index 2
})

arr.length = 1  // 删除了 index 2 的元素
```

需要触发所有 >= 新长度的索引：

```typescript
if (Array.isArray(target) && key === 'length') {
  depsMap.forEach((dep, depKey) => {
    if (depKey === 'length' || depKey >= newValue) {
      add(dep)
    }
  })
}
```

## 暂停追踪

某些操作中不希望追踪：

```typescript
let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function resumeTracking() {
  shouldTrack = true
}

export function track(target: object, key: unknown) {
  if (!activeEffect || !shouldTrack) return
  // ...
}
```

这在数组方法内部使用，避免不必要的追踪。

## 简化版完整代码

```typescript
type Dep = Set<ReactiveEffect>
const targetMap = new WeakMap<object, Map<any, Dep>>()

let activeEffect: ReactiveEffect | null = null
let shouldTrack = true

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

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  const effectsToRun = new Set<ReactiveEffect>()
  dep.forEach(effect => {
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => effect.run())
}

export function pauseTracking() {
  shouldTrack = false
}

export function resumeTracking() {
  shouldTrack = true
}
```

## 本章小结

track 和 trigger 形成响应式系统的核心循环：

1. track 在 getter 中被调用，建立 effect 和数据的依赖关系
2. trigger 在 setter 中被调用，通知依赖的 effect 重新执行
3. 双向记录支持依赖清理
4. effectsToRun 避免遍历时修改集合
5. 过滤当前 effect 避免无限循环

理解了 track 和 trigger，就理解了响应式系统的核心。下一章我们实现 reactive，将这个机制接入 Proxy。
