# Day 10: cleanup 机制与边界处理

> 学习日期: 2025年11月30日  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 深入理解 cleanup 的必要性
- [ ] 实现完善的 cleanup 机制
- [ ] 处理各种边界情况
- [ ] 优化性能和内存
- [ ] 通过 15+ 测试用例

## ⏰ 时间规划

- 理论学习: 45分钟
- 编码实践: 1小时15分钟
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. 为什么需要 cleanup？

#### 1.1 问题场景1：条件分支

```javascript
const state = reactive({ 
  flag: true, 
  a: 'hello', 
  b: 'world' 
})

effect(() => {
  document.body.textContent = state.flag 
    ? state.a  // 分支1：依赖 a
    : state.b  // 分支2：依赖 b
})

// 初始：flag=true，effect 依赖 flag 和 a
// flag → [effect]
// a → [effect]
// b → []

// 切换分支
state.flag = false  // 触发 effect

// 期望：effect 依赖 flag 和 b
// flag → [effect]
// a → []           ← 应该清理！
// b → [effect]

// 实际（不清理）：
// flag → [effect]
// a → [effect]     ← 仍然存在！
// b → [effect]

// 问题：修改 a 仍会触发 effect！
state.a = 'changed'  // 不应该触发，但实际触发了！
```

---

#### 1.2 问题场景2：循环依赖

```javascript
const state = reactive({ list: ['a', 'b', 'c'] })

effect(() => {
  state.list.forEach((item, index) => {
    console.log(`${index}: ${item}`)
  })
})

// 首次执行，依赖：
// list → [effect]
// list[0] → [effect]
// list[1] → [effect]
// list[2] → [effect]

// 删除一个元素
state.list.pop()  // 触发 effect

// 期望依赖：
// list → [effect]
// list[0] → [effect]
// list[1] → [effect]

// 实际（不清理）：
// list → [effect]
// list[0] → [effect]
// list[1] → [effect]
// list[2] → [effect]  ← 仍然存在！内存泄漏！
```

---

#### 1.3 问题场景3：动态属性

```javascript
const state = reactive({ prop: 'a', a: 1, b: 2 })

effect(() => {
  console.log(state[state.prop])  // 动态属性访问
})

// 首次执行：
// prop → [effect]
// a → [effect]

// 切换属性
state.prop = 'b'

// 期望：
// prop → [effect]
// b → [effect]

// 实际（不清理）：
// prop → [effect]
// a → [effect]  ← 应该清理！
// b → [effect]
```

---

### 2. cleanup 的核心思想

#### 2.1 重新收集依赖

```
每次 effect 执行前：
1. 清理所有旧依赖
2. 重新执行函数
3. 自动收集新依赖
```

```javascript
effect(() => {
  // 每次执行前，清理上次的依赖
  // 执行时，重新收集依赖
  console.log(state.flag ? state.a : state.b)
})
```

---

#### 2.2 双向记录

```
依赖关系是双向的：
1. dep → effects：哪些 effect 依赖这个 dep
2. effect → deps：这个 effect 依赖哪些 dep

清理时：
1. 从 effect.deps 遍历所有 dep
2. 从每个 dep 中删除 effect
3. 清空 effect.deps
```

```typescript
class ReactiveEffect {
  deps: Dep[] = []  // 记录依赖的所有 dep
  
  run() {
    // 执行前清理
    cleanupEffect(this)
    
    // 执行函数（重新收集依赖）
    return this.fn()
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  
  if (deps.length) {
    // 从所有 dep 中删除 effect
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    
    // 清空 deps
    deps.length = 0
  }
}
```

---

### 3. cleanup 的时机

#### 3.1 三个关键时机

```typescript
class ReactiveEffect {
  run() {
    if (!this.active) {
      return this.fn()
    }
    
    try {
      // 时机1：每次执行前清理
      cleanupEffect(this)
      
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = false
      this.parent = undefined
    }
  }
  
  stop() {
    if (this.active) {
      // 时机2：停止时清理
      cleanupEffect(this)
      
      // 时机3：调用 onStop 回调
      if (this.onStop) {
        this.onStop()
      }
      
      this.active = false
    }
  }
}
```

---

### 4. cleanup 的边界情况

#### 4.1 迭代中修改集合

```javascript
// 问题：在 forEach 中删除元素
const dep = new Set([e1, e2, e3])

dep.forEach(effect => {
  dep.delete(effect)  // ← 错误！迭代中修改集合
})

// 解决：创建副本
const effects = [...dep]
effects.forEach(effect => {
  dep.delete(effect)
})
```

---

#### 4.2 无限递归

```javascript
// 问题：清理后立即触发
effect(() => {
  cleanupEffect(this)  // 清理
  state.count++        // 触发 → 又清理 → 又触发 → 无限递归！
})

// 解决：标记当前 effect，避免触发自己
function triggerEffects(dep: Dep) {
  const effects = [...dep]
  
  effects.forEach(effect => {
    // 关键：不触发正在执行的 effect
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    }
  })
}
```

---

#### 4.3 嵌套 cleanup

```javascript
effect(() => {
  // 外层 effect
  
  effect(() => {
    // 内层 effect
  })
  
  // cleanup 的顺序？
})

// 答案：每个 effect 独立清理自己的依赖
// 外层 effect 清理时，不影响内层 effect
```

---

## 💻 实践任务

### 任务目标
完善 cleanup 机制，处理所有边界情况。

---

### 步骤1：优化 cleanupEffect（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 清理 effect 的所有依赖
 * 
 * 原理：
 * 1. 遍历 effect.deps（effect 依赖的所有 dep）
 * 2. 从每个 dep 中删除 effect
 * 3. 清空 effect.deps
 * 
 * 注意：
 * - 必须创建副本，避免迭代中修改
 * - deps.length = 0 比 deps = [] 更好（保持引用）
 */
function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect
  
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    
    // 清空数组（保持引用）
    deps.length = 0
  }
}
```

---

### 步骤2：在 run 中调用 cleanup（10分钟）

```typescript
// src/reactivity/effect.ts

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  parent: ReactiveEffect | undefined = undefined
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
    public onStop?: () => void
  ) {}
  
  run(): T {
    // 未激活，直接执行
    if (!this.active) {
      return this.fn()
    }
    
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      
      // 关键：每次执行前清理旧依赖
      cleanupEffect(this)
      
      // 执行函数，重新收集依赖
      return this.fn()
    } finally {
      activeEffect = this.parent
      shouldTrack = this.parent !== undefined
      this.parent = undefined
    }
  }
  
  stop() {
    if (this.active) {
      // 停止时清理
      cleanupEffect(this)
      
      // 调用 onStop 回调
      if (this.onStop) {
        this.onStop()
      }
      
      this.active = false
    }
  }
}
```

---

### 步骤3：优化 trackEffects（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 将 activeEffect 添加到 dep
 * 
 * 优化：
 * - 避免重复收集（dep.has 检查）
 * - 双向记录（effect.deps.push）
 */
export function trackEffects(dep: Dep) {
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  // 避免重复收集
  if (!dep.has(activeEffect)) {
    // dep 记录 effect
    dep.add(activeEffect)
    
    // effect 记录 dep（用于清理）
    activeEffect.deps.push(dep)
  }
}
```

---

### 步骤4：优化 triggerEffects（15分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 触发 dep 中的所有 effect
 * 
 * 边界处理：
 * 1. 创建副本，避免迭代中修改
 * 2. 避免无限递归（不触发 activeEffect）
 * 3. 优先执行 computed effect
 */
export function triggerEffects(dep: Dep | Dep[]) {
  // 支持单个 dep 或 dep 数组
  const effects = Array.isArray(dep) ? dep : [...dep]
  
  // 分类执行：先 computed，后普通 effect
  // 原因：computed 可能被其他 effect 依赖
  
  // 第一遍：执行 computed effect
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
  }
  
  // 第二遍：执行普通 effect
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}

/**
 * 触发单个 effect
 */
function triggerEffect(effect: ReactiveEffect) {
  // 关键：避免无限递归
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  }
}
```

---

### 步骤5：添加调试辅助（15分钟）

```typescript
// src/reactivity/effect.ts

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
  onStop?: () => void
  
  // 调试选项
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  // 高级选项
  allowRecurse?: boolean
}

export interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: 'get' | 'set' | 'add' | 'delete' | 'clear'
  key: any
  newValue?: any
  oldValue?: any
}

export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  parent: ReactiveEffect | undefined = undefined
  
  // 调试标志
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
    public onStop?: () => void
  ) {}
  
  // ... run 和 stop 方法
}

// 修改 trackEffects
export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    
    // 调试：触发 onTrack
    if (activeEffect.onTrack && debuggerEventExtraInfo) {
      activeEffect.onTrack({
        effect: activeEffect,
        ...debuggerEventExtraInfo
      })
    }
  }
}

// 修改 triggerEffect
function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (effect !== activeEffect || effect.allowRecurse) {
    // 调试：触发 onTrigger
    if (effect.onTrigger && debuggerEventExtraInfo) {
      effect.onTrigger({
        effect,
        ...debuggerEventExtraInfo
      })
    }
    
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  }
}
```

---

### 步骤6：编写测试用例（40分钟）

```typescript
// test/reactivity/effect-cleanup.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src/reactivity'

describe('effect cleanup', () => {
  it('条件分支切换应该清理旧依赖', () => {
    const state = reactive({ flag: true, a: 1, b: 2 })
    let dummy
    const fn = vi.fn(() => {
      dummy = state.flag ? state.a : state.b
    })
    
    effect(fn)
    
    expect(dummy).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 修改 a
    state.a = 10
    expect(dummy).toBe(10)
    expect(fn).toHaveBeenCalledTimes(2)
    
    // 修改 b（不应触发）
    state.b = 20
    expect(dummy).toBe(10)
    expect(fn).toHaveBeenCalledTimes(2)
    
    // 切换分支
    state.flag = false
    expect(dummy).toBe(20)
    expect(fn).toHaveBeenCalledTimes(3)
    
    // 修改 a（不应触发）
    state.a = 100
    expect(dummy).toBe(20)
    expect(fn).toHaveBeenCalledTimes(3)
    
    // 修改 b
    state.b = 200
    expect(dummy).toBe(200)
    expect(fn).toHaveBeenCalledTimes(4)
  })
  
  it('动态属性访问应该正确清理', () => {
    const state = reactive({
      prop: 'a',
      a: 1,
      b: 2,
      c: 3
    })
    let dummy
    const fn = vi.fn(() => {
      dummy = state[state.prop]
    })
    
    effect(fn)
    
    expect(dummy).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 修改当前属性
    state.a = 10
    expect(dummy).toBe(10)
    expect(fn).toHaveBeenCalledTimes(2)
    
    // 切换到 b
    state.prop = 'b'
    expect(dummy).toBe(2)
    expect(fn).toHaveBeenCalledTimes(3)
    
    // 修改 a（不应触发）
    state.a = 100
    expect(dummy).toBe(2)
    expect(fn).toHaveBeenCalledTimes(3)
    
    // 修改 b
    state.b = 20
    expect(dummy).toBe(20)
    expect(fn).toHaveBeenCalledTimes(4)
    
    // 切换到 c
    state.prop = 'c'
    expect(dummy).toBe(3)
    expect(fn).toHaveBeenCalledTimes(5)
    
    // 修改 b（不应触发）
    state.b = 200
    expect(dummy).toBe(3)
    expect(fn).toHaveBeenCalledTimes(5)
  })
  
  it('循环中应该正确清理', () => {
    const state = reactive({ list: [1, 2, 3] })
    let sum
    const fn = vi.fn(() => {
      sum = 0
      state.list.forEach(item => {
        sum += item
      })
    })
    
    effect(fn)
    
    expect(sum).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 修改元素
    state.list[0] = 10
    expect(sum).toBe(15)
    expect(fn).toHaveBeenCalledTimes(2)
    
    // 删除元素
    state.list.pop()
    expect(sum).toBe(12)
    expect(fn).toHaveBeenCalledTimes(3)
  })
  
  it('stop 后不应收集新依赖', () => {
    const state = reactive({ flag: true, a: 1, b: 2 })
    let dummy
    const fn = vi.fn(() => {
      dummy = state.flag ? state.a : state.b
    })
    
    const runner = effect(fn)
    
    expect(dummy).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 停止
    runner.effect.stop()
    
    // 切换分支（不应触发）
    state.flag = false
    expect(dummy).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 手动执行 runner
    runner()
    expect(dummy).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
    
    // 修改 b（不应触发，因为已 stop）
    state.b = 20
    expect(dummy).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })
  
  it('嵌套 effect 应该独立清理', () => {
    const state = reactive({ a: 1, b: 2, flag: true })
    let outer, inner
    const outerFn = vi.fn()
    const innerFn = vi.fn()
    
    effect(() => {
      outerFn()
      outer = state.a
      
      effect(() => {
        innerFn()
        inner = state.flag ? state.b : 0
      })
    })
    
    expect(outer).toBe(1)
    expect(inner).toBe(2)
    expect(outerFn).toHaveBeenCalledTimes(1)
    expect(innerFn).toHaveBeenCalledTimes(1)
    
    // 修改 a（触发外层）
    state.a = 10
    expect(outer).toBe(10)
    expect(outerFn).toHaveBeenCalledTimes(2)
    expect(innerFn).toHaveBeenCalledTimes(2) // 外层重新执行，创建新内层
    
    // 修改 flag（触发内层）
    state.flag = false
    expect(inner).toBe(0)
    expect(outerFn).toHaveBeenCalledTimes(2)
    expect(innerFn).toHaveBeenCalledTimes(3)
    
    // 修改 b（不应触发内层）
    state.b = 20
    expect(inner).toBe(0)
    expect(innerFn).toHaveBeenCalledTimes(3)
  })
  
  it('cleanup 不应影响其他 effect', () => {
    const state = reactive({ count: 0 })
    let dummy1, dummy2
    
    const e1 = effect(() => {
      dummy1 = state.count
    })
    
    const e2 = effect(() => {
      dummy2 = state.count * 2
    })
    
    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    
    state.count = 1
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(2)
    
    // 停止 e1
    e1.effect.stop()
    
    state.count = 2
    expect(dummy1).toBe(1) // 不更新
    expect(dummy2).toBe(4) // 继续更新
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么要用 deps.length = 0 而不是 deps = []？

**提示**: 
- 引用保持
- 内存管理

---

### 问题2: cleanup 的性能开销如何优化？

**提示**: 
- 标记清除
- 增量更新
- 惰性清理

---

### 问题3: 什么情况下不需要 cleanup？

**提示**: 
- 依赖固定
- 一次性 effect

---

## 📝 学习总结

完成今天的学习后，请思考：

1. **cleanup 解决了哪些问题？**

2. **cleanup 的实现原理和时机？**

3. **cleanup 的性能影响和优化方向？**

---

## 📖 扩展阅读

- [Vue 3 源码：cleanup 实现](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)
- [响应式系统的内存管理](https://github.com/vuejs/rfcs/discussions/235)

---

## ⏭️ 明日预告

### Day 11: stop 功能完善

明天我们将学习：
- stop 的完整实现
- onStop 回调
- 手动执行 runner
- 性能优化

**核心任务**: 完善 effect 的生命周期管理

---

**cleanup 是响应式系统稳定性的关键，细节决定成败！** 🔧
