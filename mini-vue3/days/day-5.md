# Day 5: 实现完整的 effect 函数

> 学习日期: 2025年11月26日  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 实现完整的 ReactiveEffect 类
- [ ] 理解 activeEffect 的作用
- [ ] 实现 effect 函数的返回值（runner）
- [ ] 掌握 effect 的基本用法
- [ ] 通过 8+ 测试用例

## ⏰ 时间规划

- 理论学习: 30分钟
- 编码实践: 1小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. effect 的核心作用

#### 1.1 什么是 effect？

**effect（副作用函数）** 是 Vue 3 响应式系统的核心，它会：
1. **立即执行**传入的函数
2. **自动收集依赖**（函数中访问的响应式数据）
3. **自动重新执行**（依赖的数据变化时）

```javascript
const state = reactive({ count: 0 })

// effect 会立即执行，并自动收集依赖
effect(() => {
  console.log('Count:', state.count) // 访问 state.count，建立依赖
})
// 输出：Count: 0

// 修改 state.count，effect 自动重新执行
state.count = 1
// 输出：Count: 1
```

---

### 2. ReactiveEffect 类设计

#### 2.1 为什么需要 ReactiveEffect 类？

```javascript
// 需求1：记录 effect 函数
const fn = () => console.log(state.count)

// 需求2：记录依赖的 dep
const deps = [dep1, dep2, dep3]

// 需求3：控制是否激活
let active = true

// 需求4：执行 effect
function run() { ... }

// 需求5：停止 effect
function stop() { ... }

// 用类来封装这些功能！
class ReactiveEffect {
  fn
  deps = []
  active = true
  
  run() { ... }
  stop() { ... }
}
```

#### 2.2 完整的类设计

```typescript
export class ReactiveEffect<T = any> {
  // 是否激活
  active = true
  
  // 依赖的 dep 数组
  deps: Dep[] = []
  
  constructor(
    // 副作用函数
    public fn: () => T,
    // 调度器（可选）
    public scheduler: EffectScheduler | null = null
  ) {}
  
  run(): T {
    // 执行副作用函数
  }
  
  stop() {
    // 停止 effect
  }
}

type Dep = Set<ReactiveEffect>
type EffectScheduler = (effect: ReactiveEffect) => void
```

---

### 3. activeEffect 的作用

#### 3.1 为什么需要 activeEffect？

**问题**：在 track 函数中，如何知道当前是哪个 effect 在访问数据？

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count) // 这里访问 state.count
  // track 函数如何知道是哪个 effect 在访问？
})
```

**解决方案**：用全局变量 `activeEffect` 记录当前正在执行的 effect

```typescript
// 全局变量：当前正在执行的 effect
let activeEffect: ReactiveEffect | undefined

class ReactiveEffect {
  run() {
    // 1. 标记当前 effect
    activeEffect = this
    
    // 2. 执行函数（这时 track 可以通过 activeEffect 知道是谁在访问）
    const result = this.fn()
    
    // 3. 清除标记
    activeEffect = undefined
    
    return result
  }
}

function track(target, key) {
  // activeEffect 就是当前正在执行的 effect！
  if (activeEffect) {
    // 将 activeEffect 添加到依赖中
    dep.add(activeEffect)
  }
}
```

---

### 4. effect 函数的返回值

#### 4.1 为什么 effect 要返回 runner？

```javascript
// 需求：手动执行 effect
const runner = effect(() => {
  console.log(state.count)
})

// 后续可以手动执行
runner() // 手动触发

// 需求：停止 effect
runner.effect.stop()
```

#### 4.2 runner 的设计

```typescript
export interface EffectRunner<T = any> {
  (): T                    // runner 是一个函数
  effect: ReactiveEffect   // 可以访问 effect 实例
}

function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run() // 立即执行
  
  // 返回 runner
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  
  return runner
}
```

---

### 5. effect 的执行流程

```
1. 用户调用 effect(fn)
   ↓
2. 创建 ReactiveEffect 实例
   ↓
3. 立即执行 run()
   ↓
4. 设置 activeEffect = this
   ↓
5. 执行 fn()
   ↓
6. fn 中访问响应式数据
   ↓
7. 触发 getter → track()
   ↓
8. track 收集 activeEffect 为依赖
   ↓
9. fn 执行完毕
   ↓
10. 清除 activeEffect = undefined
```

---

## 💻 实践任务

### 任务目标
实现完整的 ReactiveEffect 类和 effect 函数。

---

### 步骤1：定义类型（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 依赖集合类型
 */
export type Dep = Set<ReactiveEffect>

/**
 * 依赖映射类型
 */
export type KeyToDepMap = Map<any, Dep>

/**
 * 调度器类型
 */
export type EffectScheduler = (effect: ReactiveEffect) => void

/**
 * effect runner 类型
 */
export interface EffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

/**
 * 全局变量：当前正在执行的 effect
 */
export let activeEffect: ReactiveEffect | undefined

/**
 * 全局变量：是否应该收集依赖
 */
export let shouldTrack = true
```

---

### 步骤2：实现 ReactiveEffect 类（20分钟）

```typescript
// src/reactivity/effect.ts

/**
 * ReactiveEffect 类
 * 封装副作用函数的执行、依赖收集、停止等功能
 */
export class ReactiveEffect<T = any> {
  /**
   * 是否激活（激活状态下才会收集依赖）
   */
  active = true
  
  /**
   * 依赖的 dep 数组（用于清理依赖）
   */
  deps: Dep[] = []
  
  /**
   * 构造函数
   * @param fn - 副作用函数
   * @param scheduler - 调度器（可选）
   */
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}
  
  /**
   * 执行副作用函数
   */
  run(): T {
    // 如果未激活，直接执行函数，不收集依赖
    if (!this.active) {
      return this.fn()
    }
    
    // 激活状态下，收集依赖
    try {
      // 1. 标记当前 effect
      activeEffect = this
      
      // 2. 启用依赖收集
      shouldTrack = true
      
      // 3. 执行函数（触发 getter → track）
      return this.fn()
    } finally {
      // 4. 重置状态
      shouldTrack = false
      activeEffect = undefined
    }
  }
  
  /**
   * 停止 effect
   */
  stop() {
    if (this.active) {
      // 清理依赖
      cleanupEffect(this)
      
      // 标记为未激活
      this.active = false
    }
  }
}

/**
 * 清理 effect 的所有依赖
 */
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
```

---

### 步骤3：实现 effect 函数（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 创建 effect
 * 
 * @param fn - 副作用函数
 * @returns runner 函数（可以手动执行 effect）
 * 
 * @example
 * const runner = effect(() => {
 *   console.log(state.count)
 * })
 * 
 * // 手动执行
 * runner()
 * 
 * // 停止 effect
 * runner.effect.stop()
 */
export function effect<T = any>(
  fn: () => T
): EffectRunner<T> {
  // 1. 创建 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn)
  
  // 2. 立即执行一次
  _effect.run()
  
  // 3. 创建 runner 函数
  const runner = _effect.run.bind(_effect) as EffectRunner<T>
  
  // 4. 将 effect 实例挂到 runner 上
  runner.effect = _effect
  
  // 5. 返回 runner
  return runner
}
```

---

### 步骤4：实现简单的 track 函数（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 依赖存储
 * WeakMap<target, Map<key, Set<effect>>>
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

/**
 * 收集依赖
 * 
 * @param target - 目标对象
 * @param key - 属性key
 */
export function track(target: object, key: unknown) {
  // 如果没有 activeEffect 或者不应该收集依赖，直接返回
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  // 1. 获取 target 的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  // 2. 获取 key 的 dep
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 3. 将 activeEffect 添加到 dep
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    
    // 双向记录：effect 也记录它依赖的 dep
    activeEffect.deps.push(dep)
  }
}
```

---

### 步骤5：实现简单的 trigger 函数（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 触发依赖更新
 * 
 * @param target - 目标对象
 * @param key - 属性key
 */
export function trigger(target: object, key: unknown) {
  // 1. 获取 target 的 depsMap
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  // 2. 获取 key 的 dep
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  
  // 3. 执行所有依赖的 effect
  dep.forEach(effect => {
    if (effect.scheduler) {
      // 如果有 scheduler，使用 scheduler
      effect.scheduler(effect)
    } else {
      // 否则直接执行
      effect.run()
    }
  })
}
```

---

### 步骤6：编写测试用例（30分钟）

```typescript
// test/reactivity/effect.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../../src/reactivity/reactive'
import { effect } from '../../src/reactivity/effect'

describe('effect', () => {
  it('应该立即执行', () => {
    const fn = vi.fn(() => {})
    
    effect(fn)
    
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('应该收集依赖', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
  })
  
  it('应该响应式更新', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    state.count = 7
    expect(dummy).toBe(7)
  })
  
  it('应该支持多个属性', () => {
    const state = reactive({ a: 1, b: 2 })
    let sum
    
    effect(() => {
      sum = state.a + state.b
    })
    
    expect(sum).toBe(3)
    
    state.a = 10
    expect(sum).toBe(12)
    
    state.b = 20
    expect(sum).toBe(30)
  })
  
  it('应该返回 runner', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    const runner = effect(() => {
      dummy = state.count
    })
    
    expect(typeof runner).toBe('function')
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    // 手动执行 runner
    state.count = 2
    dummy = 0
    runner()
    expect(dummy).toBe(2)
  })
  
  it('runner 应该返回函数的返回值', () => {
    const state = reactive({ count: 1 })
    
    const runner = effect(() => {
      return state.count * 2
    })
    
    expect(runner()).toBe(2)
    
    state.count = 10
    expect(runner()).toBe(20)
  })
  
  it('应该支持 stop', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    const runner = effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    // 停止 effect
    runner.effect.stop()
    
    state.count = 2
    expect(dummy).toBe(1) // 不应该更新
    
    // 手动执行 runner 仍然可以
    runner()
    expect(dummy).toBe(2)
  })
  
  it('stop 后不应该收集新依赖', () => {
    const state = reactive({ count: 0, flag: true })
    let dummy
    
    const runner = effect(() => {
      dummy = state.flag ? state.count : 0
    })
    
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    runner.effect.stop()
    
    state.flag = false
    expect(dummy).toBe(1) // 不应该更新
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么需要 activeEffect 全局变量？

**提示**: 
- track 如何知道当前是哪个 effect 在访问数据？
- 有没有其他方案？

### 问题2: effect.deps 数组的作用是什么？

**提示**: 
- 双向记录
- 清理依赖

### 问题3: 为什么 effect 要返回 runner 而不是 effect 实例？

**提示**: 
- API 设计
- 使用便利性

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **ReactiveEffect 类的核心方法有哪些？**

2. **activeEffect 在依赖收集中的作用？**

3. **effect 函数的完整执行流程？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- [响应式系统的实现原理](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)

---

## ⏭️ 明日预告

### Day 6: 处理嵌套 effect

明天我们将学习：
- 嵌套 effect 的问题
- effect 栈的实现
- 正确的依赖关系

**核心任务**: 解决嵌套 effect 的依赖收集问题

---

**effect 是响应式系统的核心，理解它是理解 Vue 3 的关键！** 🚀
