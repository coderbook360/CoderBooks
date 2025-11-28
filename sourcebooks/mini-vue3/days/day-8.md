# Day 8: 实现 track 依赖收集函数

> 学习日期: 2025年11月29日  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 理解依赖收集的数据结构设计
- [ ] 实现完整的 track 函数
- [ ] 理解 WeakMap → Map → Set 的三层结构
- [ ] 掌握 activeEffect 和 shouldTrack 的作用

## ⏰ 时间规划

- 理论学习: 1小时
- 编码实践: 1小时
- 测试与调试: 30分钟

---

## 📚 理论知识详解

### 1. 依赖收集的核心问题

#### 1.1 什么是依赖收集？

在响应式系统中，我们需要记录：
- **谁**在使用某个数据（effect 函数）
- **使用了哪些**数据（对象的哪些属性）
- 数据变化时，**通知谁**去更新

```javascript
// 例子
const state = reactive({ count: 0, name: 'Vue' })

// effect1 使用了 count
effect(() => {
  console.log(state.count) // 依赖 count
})

// effect2 使用了 name
effect(() => {
  console.log(state.name) // 依赖 name
})

// 当 count 变化，应该只触发 effect1
state.count++ // 应该只通知 effect1
```

#### 1.2 依赖关系的数据结构设计

Vue 3 使用三层结构来存储依赖关系：

```
WeakMap (targetMap)
  ↓
  key: target 对象
  value: Map (depsMap)
    ↓
    key: 属性名
    value: Set (dep)
      ↓
      存储所有依赖该属性的 effect
```

**可视化示例**：

```javascript
const targetMap = new WeakMap()

// 假设有两个响应式对象
const obj1 = reactive({ count: 0, name: 'Vue' })
const obj2 = reactive({ age: 3 })

// 依赖关系示意图
targetMap: WeakMap {
  obj1 → Map {
    'count' → Set { effect1, effect3 },
    'name' → Set { effect2 }
  },
  obj2 → Map {
    'age' → Set { effect4 }
  }
}
```

---

### 2. 为什么选择 WeakMap → Map → Set？

#### 2.1 第一层：WeakMap

```javascript
const targetMap = new WeakMap()
```

**为什么用 WeakMap？**

1. **自动垃圾回收**：
```javascript
let obj = reactive({ count: 0 })
// obj 被回收时，WeakMap 中的记录也会自动清理
obj = null // targetMap 会自动删除对应记录
```

2. **防止内存泄漏**：
```javascript
// 如果用 Map
const badMap = new Map()
let obj = { count: 0 }
badMap.set(obj, new Map()) // obj 被强引用，无法回收

// 用 WeakMap
const goodMap = new WeakMap()
let obj2 = { count: 0 }
goodMap.set(obj2, new Map()) // obj2 可以被回收
```

3. **key 必须是对象**：
```javascript
const map = new WeakMap()
map.set({ a: 1 }, 'value') // ✅ 正确
map.set('string', 'value') // ❌ 错误：Invalid value used as weak map key
```

#### 2.2 第二层：Map

```javascript
const depsMap = new Map()
```

**为什么用 Map？**

1. **key 可以是任意类型**：
```javascript
const map = new Map()
map.set('name', new Set()) // 字符串 key
map.set(Symbol('id'), new Set()) // Symbol key
map.set(123, new Set()) // 数字 key
```

2. **保持插入顺序**：
```javascript
const map = new Map()
map.set('b', 1)
map.set('a', 2)
console.log([...map.keys()]) // ['b', 'a'] 保持插入顺序
```

3. **性能优势**：
- Map 的查找/插入/删除都是 O(1)
- 比普通对象的属性访问更快（特别是大量 key 时）

#### 2.3 第三层：Set

```javascript
const dep = new Set()
```

**为什么用 Set？**

1. **自动去重**：
```javascript
const dep = new Set()
dep.add(effect1)
dep.add(effect1) // 不会重复添加
dep.add(effect1)
console.log(dep.size) // 1
```

2. **快速判断存在**：
```javascript
const dep = new Set([effect1, effect2])
console.log(dep.has(effect1)) // O(1) 时间复杂度
```

3. **方便遍历**：
```javascript
const dep = new Set([effect1, effect2, effect3])
dep.forEach(effect => effect.run())
```

---

### 3. activeEffect 和 shouldTrack

#### 3.1 activeEffect：当前正在执行的 effect

```javascript
let activeEffect = undefined

class ReactiveEffect {
  run() {
    activeEffect = this // 标记当前 effect
    try {
      return this.fn() // 执行用户函数
    } finally {
      activeEffect = undefined // 清除标记
    }
  }
}
```

**作用**：
- track 函数通过 activeEffect 知道当前是哪个 effect 在访问数据
- 没有 activeEffect 时，不需要收集依赖

#### 3.2 shouldTrack：是否应该收集依赖

```javascript
let shouldTrack = true

function pauseTracking() {
  shouldTrack = false
}

function enableTracking() {
  shouldTrack = true
}
```

**使用场景**：
```javascript
// 场景1：避免无限递归
effect(() => {
  state.count = state.count + 1
  // 读取 count 时不应该再收集依赖
  // 否则会无限循环
})

// 场景2：批量更新时暂停收集
pauseTracking()
for (let i = 0; i < 1000; i++) {
  state.list.push(i) // 不收集依赖
}
enableTracking()
```

---

### 4. track 函数的完整流程

```
1. 检查是否应该收集依赖
   ↓
2. 获取 target 的 depsMap
   ↓
3. 获取 key 的 dep（Set）
   ↓
4. 将 activeEffect 添加到 dep
   ↓
5. 同时将 dep 添加到 effect.deps（双向记录）
```

---

## 💻 实践任务

### 任务目标
实现完整的 track 函数，并通过测试用例。

### 前置准备

确保已实现 ReactiveEffect 类（Day 7 的内容）：

```typescript
// src/reactivity/effect.ts
export class ReactiveEffect {
  public deps: Set<any>[] = []
  
  constructor(public fn: () => any) {}
  
  run() {
    activeEffect = this
    try {
      return this.fn()
    } finally {
      activeEffect = undefined
    }
  }
}

export let activeEffect: ReactiveEffect | undefined
```

---

### 步骤1：创建依赖存储结构（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 依赖收集的核心数据结构
 * 
 * WeakMap {
 *   target → Map {
 *     key → Set { effect1, effect2, ... }
 *   }
 * }
 */

type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>

// 全局依赖存储
const targetMap = new WeakMap<any, KeyToDepMap>()

/**
 * 获取或创建 depsMap
 */
function getDepMap(target: object): KeyToDepMap {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  return depsMap
}

/**
 * 获取或创建 dep
 */
function getDep(depsMap: KeyToDepMap, key: any): Dep {
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  return dep
}
```

---

### 步骤2：实现基础 track 函数（20分钟）

```typescript
/**
 * 依赖收集函数
 * 
 * @param target - 响应式对象
 * @param key - 访问的属性名
 */
export function track(target: object, key: unknown) {
  // 1. 检查是否需要收集依赖
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  // 2. 获取 target 的 depsMap
  const depsMap = getDepMap(target)
  
  // 3. 获取 key 的 dep（Set）
  const dep = getDep(depsMap, key)
  
  // 4. 将 activeEffect 添加到 dep
  trackEffect(dep)
}

/**
 * 将当前 effect 添加到 dep
 */
function trackEffect(dep: Dep) {
  if (!activeEffect) {
    return
  }
  
  // 添加到 dep
  dep.add(activeEffect)
  
  // 双向记录：effect 也记录它依赖的 dep
  activeEffect.deps.push(dep)
}
```

**为什么要双向记录？**
```javascript
// effect.deps 记录了 effect 依赖的所有 dep
// 作用：在 cleanup 时，可以快速从所有 dep 中删除该 effect

class ReactiveEffect {
  deps: Set[] = [] // 记录所有依赖的 dep
  
  cleanup() {
    // 从所有 dep 中删除自己
    this.deps.forEach(dep => {
      dep.delete(this)
    })
    this.deps.length = 0
  }
}
```

---

### 步骤3：添加 shouldTrack 控制（10分钟）

```typescript
// src/reactivity/effect.ts

export let shouldTrack = true
const trackStack: boolean[] = []

/**
 * 暂停依赖收集
 */
export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

/**
 * 恢复依赖收集
 */
export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

/**
 * 重置依赖收集状态
 */
export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
```

**使用示例**：
```javascript
pauseTracking()
// 这里的操作不会收集依赖
state.count++
resetTracking()
```

---

### 步骤4：完善 ReactiveEffect 类（15分钟）

```typescript
export class ReactiveEffect {
  // 存储该 effect 依赖的所有 dep
  public deps: Dep[] = []
  // 是否激活
  public active = true
  
  constructor(
    public fn: () => any,
    public scheduler?: (effect: ReactiveEffect) => void
  ) {}
  
  run() {
    // 如果未激活，直接执行不收集依赖
    if (!this.active) {
      return this.fn()
    }
    
    // 收集依赖
    try {
      enableTracking()
      activeEffect = this
      
      // 清理旧依赖
      cleanupEffect(this)
      
      // 执行函数，触发依赖收集
      return this.fn()
    } finally {
      activeEffect = undefined
      resetTracking()
    }
  }
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
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

### 步骤5：编写测试用例（30分钟）

```typescript
// test/reactivity/effect.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../../src/reactivity/reactive'
import { effect } from '../../src/reactivity/effect'

describe('effect - track', () => {
  it('应该收集依赖', () => {
    const obj = reactive({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = obj.count // 收集依赖
    })
    
    expect(dummy).toBe(0)
    
    obj.count++ // 触发更新
    expect(dummy).toBe(1)
  })
  
  it('应该收集多个属性的依赖', () => {
    const obj = reactive({ a: 1, b: 2 })
    let sum
    
    effect(() => {
      sum = obj.a + obj.b // 依赖 a 和 b
    })
    
    expect(sum).toBe(3)
    
    obj.a = 10
    expect(sum).toBe(12)
    
    obj.b = 20
    expect(sum).toBe(30)
  })
  
  it('应该支持多个 effect 依赖同一属性', () => {
    const obj = reactive({ count: 0 })
    let dummy1, dummy2
    
    effect(() => {
      dummy1 = obj.count
    })
    
    effect(() => {
      dummy2 = obj.count * 2
    })
    
    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    
    obj.count = 5
    expect(dummy1).toBe(5)
    expect(dummy2).toBe(10)
  })
  
  it('应该支持嵌套 effect', () => {
    const obj = reactive({ a: 1, b: 2 })
    let dummy1, dummy2
    
    effect(() => {
      dummy1 = obj.a
      
      effect(() => {
        dummy2 = obj.b
      })
    })
    
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(2)
    
    obj.a = 10
    expect(dummy1).toBe(10)
    expect(dummy2).toBe(2) // 内层 effect 不会重新执行
    
    obj.b = 20
    expect(dummy2).toBe(20)
  })
  
  it('pauseTracking 应该暂停依赖收集', () => {
    const obj = reactive({ count: 0 })
    let dummy
    
    const fn = vi.fn(() => {
      dummy = obj.count
    })
    
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 暂停收集
    pauseTracking()
    obj.count++
    resetTracking()
    
    // 不应该触发 effect
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么依赖存储要用三层结构？

**提示**: 
- 第一层（WeakMap）存什么？为什么？
- 第二层（Map）存什么？为什么？
- 第三层（Set）存什么？为什么？

### 问题2: activeEffect 的生命周期是什么？

**提示**:
```javascript
effect(() => {
  // activeEffect 是谁？
  console.log(state.count)
  // activeEffect 还是谁？
})
// activeEffect 又是谁？
```

### 问题3: 为什么需要 effect.deps 双向记录？

**提示**: 考虑 effect.stop() 的实现

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **track 函数的核心流程是什么？**

2. **WeakMap、Map、Set 分别的作用是什么？**

3. **activeEffect 和 shouldTrack 的区别？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- 《JavaScript 数据结构与算法》- WeakMap 章节

---

## ⏭️ 明日预告

### Day 9: 实现 trigger 触发更新

明天我们将学习：
- trigger 函数的实现
- effect 调度器
- 批量更新优化

**核心任务**: 实现完整的响应式更新流程

---

**依赖收集是响应式系统的核心，理解 track 至关重要！** 🎯
