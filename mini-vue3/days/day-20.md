# Day 20: 第二周总结和 Code Review

> 学习日期: 2025-12-12  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 回顾本周学习内容
- [ ] 对比官方源码，分析差异
- [ ] 进行代码重构和优化
- [ ] 完成性能测试
- [ ] 编写本周学习总结

## ⏰ 时间规划
- 内容回顾: 30分钟
- 源码对比: 40分钟
- 代码优化: 40分钟
- 总结文档: 10分钟

---

## 📚 本周学习回顾

### Week 2 完成内容一览

#### Day 8-9: track 和 trigger 实现
**核心成果**：
- ✅ 实现了依赖收集机制（track）
- ✅ 实现了依赖触发机制（trigger）
- ✅ 使用 WeakMap + Map + Set 存储依赖关系
- ✅ 理解了响应式系统的数据结构

**关键代码**：
```typescript
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>()

export function track(target: object, key: string | symbol) {
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
}
```

#### Day 10-11: effect 副作用函数
**核心成果**：
- ✅ 实现了 effect 函数
- ✅ 支持嵌套 effect
- ✅ 实现了 ReactiveEffect 类
- ✅ 支持调度器（scheduler）

**关键代码**：
```typescript
export class ReactiveEffect<T = any> {
  constructor(
    public fn: () => T,
    public scheduler?: (effect: ReactiveEffect<T>) => void
  ) {}
  
  run() {
    activeEffect = this
    const result = this.fn()
    activeEffect = undefined
    return result
  }
}
```

#### Day 12-13: 响应式数据结构
**核心成果**：
- ✅ 处理了对象的响应式
- ✅ 处理了数组的响应式
- ✅ 解决了数组方法的无限递归问题
- ✅ 实现了 pauseTracking/enableTracking

**关键突破**：
```typescript
const arrayInstrumentations: Record<string, Function> = {}

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  arrayInstrumentations[key] = function(...args) {
    pauseTracking()  // 暂停追踪，避免无限递归
    const res = Array.prototype[key].apply(this, args)
    enableTracking()
    return res
  }
})
```

#### Day 14: 边界情况处理和测试
**核心成果**：
- ✅ 处理了循环引用
- ✅ 处理了原型链
- ✅ 编写了完整的测试套件
- ✅ 代码覆盖率达到 80%+

#### Day 15-16: computed 计算属性
**核心成果**：
- ✅ 实现了 computed 基础功能
- ✅ 实现了惰性计算
- ✅ 实现了缓存机制（dirty 标记）
- ✅ computed 可以作为其他 effect 的依赖

**关键设计**：
```typescript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true  // dirty 标记
  
  get value() {
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    track(this, 'value')
    return this._value
  }
}
```

#### Day 17-18: watch 和 watchEffect
**核心成果**：
- ✅ 实现了 watch 函数
- ✅ 实现了 watchEffect 函数
- ✅ 支持 immediate 选项
- ✅ 实现了 onCleanup 清理机制

#### Day 19: 性能优化
**核心成果**：
- ✅ 实现了调度器系统
- ✅ 实现了批量更新
- ✅ 实现了依赖去重
- ✅ 实现了 nextTick

### 本周技术亮点

1. **数据结构设计**
   ```
   WeakMap {
     对象1 -> Map {
       属性A -> Set { effect1, effect2 }
       属性B -> Set { effect3 }
     }
     对象2 -> Map { ... }
   }
   ```

2. **调度器模式**
   - 批量更新减少执行次数
   - 微任务队列保证执行顺序
   - Set 自动去重

3. **惰性计算**
   - dirty 标记控制计算时机
   - 缓存结果提升性能
   - 调度器控制更新时机

---

## 🔍 源码对比分析

### 对比 1: 依赖收集结构

**我们的实现**：
```typescript
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>()
```

**Vue 3 源码**：
```typescript
// packages/reactivity/src/dep.ts
export type Dep = Set<ReactiveEffect> & {
  w?: number  // wasTracked
  n?: number  // newTracked
}

// packages/reactivity/src/effect.ts
const targetMap = new WeakMap<any, KeyToDepMap>()
```

**差异分析**：
- Vue 3 的 Dep 扩展了 Set，添加了 `w` 和 `n` 标记
- 用于优化依赖追踪，避免重复收集
- 我们的实现更简单，但缺少这个优化

**改进方向**：
```typescript
// 可以添加依赖追踪优化
export class Dep extends Set<ReactiveEffect> {
  w = 0  // wasTracked - 上一次追踪的标记
  n = 0  // newTracked - 本次追踪的标记
}
```

### 对比 2: ReactiveEffect 的实现

**我们的实现**：
```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: () => T,
    public scheduler?: (effect: ReactiveEffect<T>) => void
  ) {}
  
  run() {
    activeEffect = this
    const result = this.fn()
    activeEffect = undefined
    return result
  }
}
```

**Vue 3 源码**：
```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  parent: ReactiveEffect | undefined = undefined
  
  // 额外的属性
  computed?: ComputedRefImpl<T>
  allowRecurse?: boolean
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    let parent: ReactiveEffect | undefined = activeEffect
    let lastShouldTrack = shouldTrack
    
    while (parent) {
      if (parent === this) {
        return  // 防止递归
      }
      parent = parent.parent
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      
      trackOpBit = 1 << ++effectTrackDepth
      
      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this)
      } else {
        cleanupEffect(this)
      }
      
      return this.fn()
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this)
      }
      
      trackOpBit = 1 << --effectTrackDepth
      
      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined
    }
  }
}
```

**差异分析**：
1. **parent 链**：Vue 3 使用 parent 链处理嵌套 effect
2. **递归检测**：防止 effect 递归调用自己
3. **依赖标记**：使用位运算优化依赖追踪
4. **调试支持**：onTrack 和 onTrigger 钩子

**改进建议**：
```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  parent: ReactiveEffect | undefined = undefined  // 添加 parent
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    // 防止递归
    let parent: ReactiveEffect | undefined = activeEffect
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = this.parent
      this.parent = undefined
    }
  }
}
```

### 对比 3: computed 的实现

**我们的实现**：
```typescript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private effect: ReactiveEffect<T>
  
  constructor(getter: () => T) {
    this.effect = new ReactiveEffect(getter, () => {
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
      this._value = this.effect.run()
    }
    return this._value
  }
}
```

**Vue 3 源码**：
```typescript
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  private _value!: T
  public readonly effect: ReactiveEffect<T>
  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY] = true
  
  public _dirty = true
  public _cacheable: boolean
  
  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
    this.effect.active = this._cacheable = !isSSR
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }
  
  get value() {
    const self = toRaw(this)
    trackRefValue(self)
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      self._value = self.effect.run()!
    }
    return self._value
  }
  
  set value(newValue: T) {
    this._setter(newValue)
  }
}
```

**差异分析**：
1. **可写 computed**：Vue 3 支持 setter
2. **SSR 支持**：`_cacheable` 标记
3. **只读标记**：`IS_READONLY` 标记

---

## 💻 代码优化任务

### 任务 1: 添加递归检测 (预估15分钟)

修改 `src/reactivity/effect.ts`：

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Set<ReactiveEffect>[] = []
  parent: ReactiveEffect | undefined = undefined
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    // 检测递归
    let parent: ReactiveEffect | undefined = activeEffect
    while (parent) {
      if (parent === this) {
        console.warn('检测到 effect 递归调用')
        return
      }
      parent = parent.parent
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      return this.fn()
    } finally {
      activeEffect = this.parent
      this.parent = undefined
    }
  }
}
```

### 任务 2: 添加可写 computed (预估10分钟)

修改 `src/reactivity/computed.ts`：

```typescript
export function computed<T>(
  getterOrOptions: (() => T) | {
    get: () => T
    set: (value: T) => void
  }
) {
  let getter: () => T
  let setter: (value: T) => void
  
  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions
    setter = () => {
      console.warn('computed 是只读的')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(getter, setter)
}

class ComputedRefImpl<T> {
  // ...
  
  constructor(
    getter: () => T,
    private _setter: (value: T) => void
  ) {
    // ...
  }
  
  set value(newValue: T) {
    this._setter(newValue)
  }
}
```

### 任务 3: 添加调试支持 (预估15分钟)

```typescript
export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: 'get' | 'set' | 'add' | 'delete'
  key: any
  newValue?: any
  oldValue?: any
}

// 在 track 中触发
export function track(target: object, key: string | symbol) {
  // ...
  
  if (activeEffect.onTrack) {
    activeEffect.onTrack({
      effect: activeEffect,
      target,
      type: 'get',
      key
    })
  }
}
```

---

## 📊 性能测试

### 测试用例

```typescript
describe('性能测试', () => {
  it('批量更新性能', async () => {
    const state = reactive({ count: 0 })
    let runCount = 0
    
    effect(() => {
      state.count
      runCount++
    })
    
    const iterations = 10000
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      state.count++
    }
    
    await nextTick()
    
    const end = performance.now()
    const time = end - start
    
    console.log(`批量更新 ${iterations} 次`)
    console.log(`effect 执行次数: ${runCount}`)
    console.log(`耗时: ${time.toFixed(2)}ms`)
    console.log(`平均: ${(time / iterations).toFixed(4)}ms/次`)
    
    expect(runCount).toBe(2)  // 初始 + 1次批量更新
  })
  
  it('computed 缓存性能', () => {
    const state = reactive({ count: 0 })
    let computeCount = 0
    
    const double = computed(() => {
      computeCount++
      return state.count * 2
    })
    
    const iterations = 10000
    const start = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      double.value
    }
    
    const end = performance.now()
    const time = end - start
    
    console.log(`访问 computed ${iterations} 次`)
    console.log(`实际计算次数: ${computeCount}`)
    console.log(`耗时: ${time.toFixed(2)}ms`)
    
    expect(computeCount).toBe(1)  // 只计算一次
  })
})
```

---

## 📝 本周学习总结

### 技术成长

1. **响应式系统核心原理**
   - 理解了 Proxy 和 Reflect 的应用
   - 掌握了依赖收集和触发机制
   - 学会了使用 WeakMap/Map/Set 管理依赖

2. **设计模式和架构**
   - 观察者模式（effect 和依赖）
   - 调度器模式（批量更新）
   - 惰性计算（computed）
   - 策略模式（不同的调度策略）

3. **性能优化技巧**
   - 批量更新减少执行次数
   - 缓存机制避免重复计算
   - 微任务队列优化执行时机
   - Set 自动去重

### 本周难点突破

1. **数组方法的无限递归**
   - 问题：push 等方法会触发自身
   - 解决：pauseTracking/enableTracking

2. **computed 的惰性计算**
   - 问题：如何避免不必要的计算
   - 解决：dirty 标记 + 调度器

3. **批量更新的实现**
   - 问题：多次修改触发多次 effect
   - 解决：任务队列 + 微任务

### 下周展望

下周（Week 3）将学习：
- ✨ ref 的实现和原理
- ✨ reactive 和 ref 的区别
- ✨ toRef、toRefs、unref
- ✨ 响应式工具函数
- ✨ 第一阶段总结

---

## 🤔 思考题（本周复盘）

### 问题1: 为什么响应式系统需要 WeakMap 而不是 Map？
**你的答案**：

### 问题2: computed 和 watch 的本质区别是什么？
**你的答案**：

### 问题3: 如何设计一个更好的调度器？
**你的答案**：

---

## 📖 推荐阅读

- [Vue 3 响应式系统完整源码](../../.book_refe/core/packages/reactivity/) - 建议精读
- [JavaScript 引擎的优化技术](https://v8.dev/blog) - 了解底层优化
- [设计模式在 Vue 3 中的应用](https://refactoring.guru/design-patterns) - 提升架构思维

---

## ⏭️ 下周预告

下周进入 **Week 3: Ref 与工具函数**

主要内容:
- Day 22: ref 的实现原理
- Day 23: reactive vs ref 深度对比
- Day 24: toRef 和 toRefs
- Day 25: unref 和 proxyRefs
- Day 26-27: 响应式工具函数
- Day 28: 第一阶段总结和源码对比

预计完成:
- [ ] 完整的 ref 系统
- [ ] 所有响应式工具函数
- [ ] 通过 100+ 测试用例
- [ ] 第一阶段学习报告
