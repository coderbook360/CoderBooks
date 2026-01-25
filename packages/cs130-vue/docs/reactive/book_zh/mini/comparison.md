# 与 Vue 源码对比：理解设计取舍

本章对比迷你实现与 Vue 源码的差异，理解 Vue 团队的设计考量。

## 代码组织差异

### 迷你版

```
mini-reactivity/
├── effect.ts
├── reactive.ts
├── ref.ts
├── computed.ts
└── watch.ts
```

### Vue 源码

```
@vue/reactivity/
├── src/
│   ├── baseHandlers.ts    # 普通对象 handlers
│   ├── collectionHandlers.ts  # 集合 handlers
│   ├── computed.ts
│   ├── dep.ts             # Dep 类
│   ├── effect.ts
│   ├── effectScope.ts
│   ├── reactive.ts
│   ├── ref.ts
│   └── watch.ts           # 新增于 Vue 3.4
```

Vue 将代码拆分更细，便于维护和测试。

## ReactiveEffect 差异

### 迷你版

```typescript
class ReactiveEffect {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: Function,
    public scheduler?: Function
  ) {}
  
  run() {
    if (!this.active) return this.fn()
    cleanupEffect(this)
    effectStack.push(this)
    activeEffect = this
    try {
      return this.fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
}
```

### Vue 源码

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  
  // 链表结构优化
  _trackId = 0
  _runnings = 0
  _queryings = 0
  _depsLength = 0
  
  // 调试
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  constructor(
    public fn: () => T,
    public trigger: () => void,
    public scheduler?: EffectScheduler,
    scope?: EffectScope
  ) {
    recordEffectScope(this, scope)
  }
  
  run() {
    this._dirtyLevel = DirtyLevels.NotDirty
    if (!this.active) return this.fn()
    
    let lastShouldTrack = shouldTrack
    let lastEffect = activeEffect
    
    try {
      shouldTrack = true
      activeEffect = this
      this._runnings++
      preCleanupEffect(this)
      return this.fn()
    } finally {
      postCleanupEffect(this)
      this._runnings--
      activeEffect = lastEffect
      shouldTrack = lastShouldTrack
    }
  }
}
```

Vue 添加了：

1. `_trackId` 用于优化依赖收集
2. `_runnings` 追踪嵌套执行
3. `onTrack/onTrigger` 调试钩子
4. `DirtyLevel` 细粒度脏检查

## 依赖收集差异

### 迷你版

```typescript
const targetMap = new WeakMap<object, Map<unknown, Set<ReactiveEffect>>>()

function track(target: object, key: unknown) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}
```

### Vue 源码

```typescript
export class Dep {
  // 版本号优化
  version = 0
  activeLink?: Link = undefined
  subs?: Link = undefined
  
  // 双向链表
  link(effect: ReactiveEffect) {
    // 使用 trackId 避免重复收集
    if (effect._trackId === this._trackId) {
      return
    }
    this._trackId = effect._trackId
    
    // 链表操作...
  }
}
```

Vue 3.4 引入了：

1. `Dep` 类封装依赖集合
2. 双向链表优化大量依赖场景
3. `trackId` 避免同一轮收集中重复添加
4. 版本号优化减少不必要的触发

## Computed 差异

### 迷你版

```typescript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _effect: ReactiveEffect
  
  get value() {
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}
```

### Vue 源码

```typescript
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  private _value!: T
  public readonly effect: ReactiveEffect<T>
  
  public _cacheable: boolean
  
  // 脏级别
  private _dirtyLevel = DirtyLevels.Dirty
  
  get value() {
    const self = toRaw(this)
    
    // 脏检查
    if (self._dirtyLevel >= DirtyLevels.MaybeDirty) {
      if (self._dirtyLevel >= DirtyLevels.Dirty) {
        triggerRefValue(self, DirtyLevels.Dirty)
      }
      self._dirtyLevel = DirtyLevels.NotDirty
      self._value = self.effect.run()!
    }
    
    trackRefValue(self)
    return self._value
  }
}
```

Vue 使用多级脏状态：

```typescript
enum DirtyLevels {
  NotDirty = 0,
  QueryingDirty = 1,
  MaybeDirty = 2,
  Dirty = 3
}
```

这解决了嵌套 computed 的边缘情况。

## 数组处理差异

### 迷你版

简单的方法重写：

```typescript
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  arrayInstrumentations[method] = function(...args) {
    pauseTracking()
    const result = Array.prototype[method].apply(this, args)
    enableTracking()
    return result
  }
})
```

### Vue 源码

更完整的处理：

```typescript
function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  
  // 查找方法
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function(this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw))
      }
      return res
    }
  })
  
  // 修改方法
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function(this: unknown[], ...args: unknown[]) {
      pauseTracking()
      pauseScheduling()
      const res = (toRaw(this) as any)[key].apply(this, args)
      resetScheduling()
      resetTracking()
      return res
    }
  })
  
  return instrumentations
}
```

Vue 还处理了调度暂停等细节。

## 性能优化对比

| 特性 | 迷你版 | Vue 源码 |
|------|--------|----------|
| 依赖收集 | Set + 数组 | 双向链表 |
| 重复收集 | 检查 Set | trackId |
| computed 脏检查 | boolean | DirtyLevel |
| 批量更新 | 简单队列 | 优先级调度 |
| 内存占用 | 较高 | 优化 |

## 功能完整性对比

### 迷你版缺失的功能

1. **调试支持**

```typescript
// Vue 支持
effect(() => {}, {
  onTrack(e) { console.log('tracked:', e) },
  onTrigger(e) { console.log('triggered:', e) }
})
```

2. **markRaw**

```typescript
// Vue 支持
const obj = markRaw({ count: 0 })
const state = reactive({ obj })
// obj 不会被转为响应式
```

3. **customRef**

```typescript
// Vue 支持
function useDebouncedRef(value, delay = 200) {
  return customRef((track, trigger) => ({
    get() { track(); return value },
    set(newValue) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        value = newValue
        trigger()
      }, delay)
    }
  }))
}
```

4. **proxyRefs**

```typescript
// Vue 支持自动解包
const state = proxyRefs({ count: ref(0) })
console.log(state.count) // 0，而不是 { value: 0 }
```

## 为什么需要这些优化

### 1. 双向链表

大型应用可能有成千上万的依赖关系。链表的插入删除是 O(1)，而数组是 O(n)。

### 2. trackId

同一个 effect 执行中可能多次读取同一属性：

```typescript
effect(() => {
  console.log(obj.count + obj.count + obj.count)
})
```

trackId 避免重复添加依赖。

### 3. DirtyLevel

嵌套 computed 场景：

```typescript
const a = ref(0)
const b = computed(() => a.value)
const c = computed(() => b.value)
```

修改 a 时，b 和 c 的脏状态需要精确控制。

### 4. 批量调度

```typescript
count.value++
count.value++
count.value++
// 应该只触发一次更新
```

Vue 的调度器确保这种情况的正确处理。

## 学习建议

1. **先理解迷你版**：核心概念更清晰
2. **再阅读源码**：理解优化的必要性
3. **关注边缘情况**：这是优化的主要原因
4. **运行测试用例**：Vue 的测试覆盖了大量边缘情况

## 本章小结

迷你版与 Vue 源码的主要差异：

1. **结构**：Vue 拆分更细，便于维护
2. **性能**：Vue 使用链表、trackId、DirtyLevel 等优化
3. **功能**：Vue 提供更多 API（markRaw、customRef 等）
4. **调试**：Vue 支持 onTrack/onTrigger 钩子
5. **边缘情况**：Vue 处理更完善

理解这些差异有助于深入掌握 Vue 响应式系统的设计哲学。
