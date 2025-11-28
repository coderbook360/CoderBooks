# Day 9: 实现 trigger 触发更新函数

> 学习日期: 2025年11月30日  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 理解 trigger 触发更新的完整流程
- [ ] 实现 trigger 函数处理各种更新类型
- [ ] 掌握 scheduler 调度器机制
- [ ] 理解批量更新优化
- [ ] 通过 15+ 测试用例

## ⏰ 时间规划

- 理论学习: 1小时
- 编码实践: 1小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. trigger 的作用

#### 1.1 什么是 trigger？

**trigger** 负责在数据变化时，通知所有依赖该数据的 effect 重新执行。

```javascript
const state = reactive({ count: 0 })

// effect1 依赖 count
effect(() => {
  console.log('Effect 1:', state.count)
})

// effect2 也依赖 count
effect(() => {
  console.log('Effect 2:', state.count * 2)
})

// 修改 count，trigger 通知两个 effect
state.count = 5
// 输出:
// Effect 1: 5
// Effect 2: 10
```

#### 1.2 trigger 的完整流程

```
1. 数据变化（setter被调用）
   ↓
2. trigger(target, key, type, newValue)
   ↓
3. 从 targetMap 获取依赖
   ↓
4. 根据操作类型收集需要触发的 effects
   ↓
5. 按顺序执行 effects（computed 优先）
   ↓
6. 处理 scheduler 调度
```

---

### 2. 操作类型（TriggerOpTypes）

#### 2.1 操作类型定义

```typescript
export enum TriggerOpTypes {
  SET = 'set',           // 设置属性
  ADD = 'add',           // 添加属性
  DELETE = 'delete',     // 删除属性
  CLEAR = 'clear'        // 清空集合（Map/Set）
}
```

#### 2.2 不同操作类型的影响

```javascript
const state = reactive({ a: 1, b: 2 })

// SET：修改已有属性
state.a = 10
// → 触发依赖 'a' 的 effects

// ADD：添加新属性
state.c = 3
// → 触发依赖 'a' 的 effects
// → 触发迭代相关的 effects（Object.keys、for...in）

// DELETE：删除属性
delete state.b
// → 触发依赖 'b' 的 effects
// → 触发迭代相关的 effects

// 为什么 ADD 和 DELETE 要触发迭代相关的 effects？
effect(() => {
  console.log(Object.keys(state)) // 依赖对象的键集合
})

state.d = 4 // ADD 操作，keys 变了，需要重新执行 effect
delete state.a // DELETE 操作，keys 变了，需要重新执行 effect
```

---

### 3. 调度器（Scheduler）

#### 3.1 为什么需要调度器？

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

// 没有调度器：每次修改都立即执行 effect
state.count = 1 // 立即输出：1
state.count = 2 // 立即输出：2
state.count = 3 // 立即输出：3
// 执行了 3 次

// 有调度器：可以批量更新
state.count = 1
state.count = 2
state.count = 3
// 只输出一次：3
// 只执行了 1 次
```

#### 3.2 调度器的实现

```javascript
class ReactiveEffect {
  constructor(
    public fn: () => any,
    public scheduler?: (effect: ReactiveEffect) => void
  ) {}
  
  run() {
    return this.fn()
  }
}

function trigger(target, key) {
  const effects = getEffectsToRun(target, key)
  
  effects.forEach(effect => {
    if (effect.scheduler) {
      // 使用调度器（可以批量更新）
      effect.scheduler(effect)
    } else {
      // 立即执行
      effect.run()
    }
  })
}

// 批量更新的调度器
const queue: ReactiveEffect[] = []
let isFlushPending = false

function queueJob(effect: ReactiveEffect) {
  if (!queue.includes(effect)) {
    queue.push(effect)
  }
  
  if (!isFlushPending) {
    isFlushPending = true
    Promise.resolve().then(() => {
      isFlushPending = false
      queue.forEach(effect => effect.run())
      queue.length = 0
    })
  }
}

// 使用
effect(
  () => {
    console.log(state.count)
  },
  {
    scheduler: queueJob // 使用批量更新调度器
  }
)
```

---

### 4. computed 与 effect 的执行顺序

#### 4.1 为什么 computed 要优先执行？

```javascript
const state = reactive({ count: 0 })

// computed 依赖 count
const doubled = computed(() => state.count * 2)

// effect 依赖 computed
effect(() => {
  console.log('Effect:', doubled.value)
})

// 修改 count
state.count = 5

// 执行顺序：
// 1. 触发 computed 的 scheduler（标记为脏）
// 2. 触发 effect 执行
// 3. effect 访问 doubled.value
// 4. computed 重新计算（因为是脏的）
// 5. 返回新值
```

**如果顺序错误**：
```javascript
// 错误顺序：先执行 effect，后更新 computed
state.count = 5
// 1. effect 执行，访问 doubled.value
// 2. computed 还没标记为脏，返回旧值 0
// 3. computed 才标记为脏
// 结果：effect 拿到的是旧值！
```

#### 4.2 实现优先级

```typescript
function trigger(target, key) {
  const effects = getEffectsToRun(target, key)
  
  // 分类 effects
  const computedEffects: ReactiveEffect[] = []
  const normalEffects: ReactiveEffect[] = []
  
  effects.forEach(effect => {
    if (effect.computed) {
      computedEffects.push(effect)
    } else {
      normalEffects.push(effect)
    }
  })
  
  // 先执行 computed，再执行普通 effect
  computedEffects.forEach(effect => runEffect(effect))
  normalEffects.forEach(effect => runEffect(effect))
}
```

---

### 5. 避免无限递归

#### 5.1 问题场景

```javascript
const state = reactive({ count: 0 })

effect(() => {
  state.count = state.count + 1
  // 1. 读取 count，track 依赖
  // 2. 设置 count，trigger 触发自己
  // 3. effect 重新执行
  // 4. 无限循环！
})
```

#### 5.2 解决方案

```javascript
let activeEffect: ReactiveEffect | undefined

function trigger(target, key) {
  const effects = getEffectsToRun(target, key)
  
  effects.forEach(effect => {
    // 避免触发自己
    if (effect !== activeEffect) {
      runEffect(effect)
    }
  })
}
```

---

## 💻 实践任务

### 任务目标
实现完整的 trigger 函数，支持各种更新类型和调度机制。

---

### 步骤1：定义操作类型（10分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 触发操作类型
 */
export enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}

/**
 * 迭代 key（用于追踪 for...in 等操作）
 */
export const ITERATE_KEY = Symbol('iterate')
```

---

### 步骤2：实现 trigger 函数（30分钟）

```typescript
// src/reactivity/effect.ts

/**
 * 触发依赖更新
 * 
 * @param target - 目标对象
 * @param type - 操作类型
 * @param key - 触发的 key
 * @param newValue - 新值
 * @param oldValue - 旧值
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  // 1. 获取 target 的 depsMap
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 没有依赖，直接返回
    return
  }
  
  // 2. 收集需要触发的 effects
  const effects = new Set<ReactiveEffect>()
  
  /**
   * 添加 effect 到集合
   */
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        // 避免无限递归：不触发当前正在执行的 effect
        if (effect !== activeEffect) {
          effects.add(effect)
        }
      })
    }
  }
  
  // 3. 根据操作类型收集 effects
  if (type === TriggerOpTypes.CLEAR) {
    // CLEAR：触发所有依赖
    depsMap.forEach(dep => add(dep))
  } else if (key === 'length' && Array.isArray(target)) {
    // 数组 length 变化
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // SET, ADD, DELETE
    
    // 触发指定 key 的依赖
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    
    // 根据操作类型，触发迭代相关的依赖
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!Array.isArray(target)) {
          // 对象添加属性，触发 ITERATE_KEY
          add(depsMap.get(ITERATE_KEY))
        } else if (Number.isInteger(key)) {
          // 数组添加索引，触发 length 依赖
          add(depsMap.get('length'))
        }
        break
        
      case TriggerOpTypes.DELETE:
        if (!Array.isArray(target)) {
          // 对象删除属性，触发 ITERATE_KEY
          add(depsMap.get(ITERATE_KEY))
        }
        break
        
      case TriggerOpTypes.SET:
        // SET 操作不需要额外处理
        break
    }
  }
  
  // 4. 执行 effects
  runEffects(effects)
}

/**
 * 执行 effects
 */
function runEffects(effects: Set<ReactiveEffect>) {
  // 分类：computed effects 和普通 effects
  const computedEffects: ReactiveEffect[] = []
  const normalEffects: ReactiveEffect[] = []
  
  effects.forEach(effect => {
    if (effect.computed) {
      computedEffects.push(effect)
    } else {
      normalEffects.push(effect)
    }
  })
  
  // computed 优先执行
  computedEffects.forEach(effect => runEffect(effect))
  normalEffects.forEach(effect => runEffect(effect))
}

/**
 * 执行单个 effect
 */
function runEffect(effect: ReactiveEffect) {
  if (effect.scheduler) {
    // 使用调度器
    effect.scheduler()
  } else {
    // 直接执行
    effect.run()
  }
}
```

---

### 步骤3：更新 reactive 中的 trigger 调用（15分钟）

```typescript
// src/reactivity/reactive.ts

function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]
    
    // 判断是 SET 还是 ADD
    const hadKey = Array.isArray(target) && Number.isInteger(key)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key)
    
    const result = Reflect.set(target, key, value, receiver)
    
    // 判断是否需要触发更新
    const hasChanged = oldValue !== value && (oldValue === oldValue || value === value)
    
    if (hasChanged) {
      const type = hadKey ? TriggerOpTypes.SET : TriggerOpTypes.ADD
      trigger(target, type, key, value, oldValue)
    }
    
    return result
  }
}

function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  
  return result
}
```

---

### 步骤4：编写测试用例（30分钟）

```typescript
// test/reactivity/effect.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../../src/reactivity/reactive'
import { effect, trigger, TriggerOpTypes } from '../../src/reactivity/effect'

describe('effect - trigger', () => {
  it('应该触发 effect', () => {
    const state = reactive({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = state.count
    })
    
    expect(dummy).toBe(0)
    
    state.count = 7
    expect(dummy).toBe(7)
  })
  
  it('应该触发多个 effect', () => {
    const state = reactive({ count: 0 })
    let dummy1, dummy2
    
    effect(() => {
      dummy1 = state.count
    })
    
    effect(() => {
      dummy2 = state.count * 2
    })
    
    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    
    state.count = 5
    expect(dummy1).toBe(5)
    expect(dummy2).toBe(10)
  })
  
  it('应该避免无限递归', () => {
    const state = reactive({ count: 0 })
    
    effect(() => {
      state.count = state.count + 1
    })
    
    // 如果没有防止无限递归，这里会栈溢出
    expect(state.count).toBe(1)
  })
  
  it('ADD 操作应该触发迭代依赖', () => {
    const state = reactive<any>({ a: 1 })
    let keys: string[] = []
    
    effect(() => {
      keys = Object.keys(state)
    })
    
    expect(keys).toEqual(['a'])
    
    state.b = 2
    expect(keys).toEqual(['a', 'b'])
  })
  
  it('DELETE 操作应该触发迭代依赖', () => {
    const state = reactive({ a: 1, b: 2 })
    let keys: string[] = []
    
    effect(() => {
      keys = Object.keys(state)
    })
    
    expect(keys).toEqual(['a', 'b'])
    
    delete state.b
    expect(keys).toEqual(['a'])
  })
  
  it('应该支持 scheduler', () => {
    const state = reactive({ count: 0 })
    let dummy
    let callCount = 0
    
    const scheduler = vi.fn(() => {
      callCount++
    })
    
    effect(
      () => {
        dummy = state.count
      },
      { scheduler }
    )
    
    expect(dummy).toBe(0)
    expect(callCount).toBe(0)
    
    state.count = 1
    // scheduler 被调用，但 effect 不立即执行
    expect(scheduler).toHaveBeenCalledTimes(1)
    expect(dummy).toBe(0)
    
    // 手动执行 scheduler
    scheduler.mock.calls[0][0]()
    expect(dummy).toBe(1)
  })
  
  it('computed effect 应该优先执行', () => {
    const state = reactive({ count: 0 })
    const execution: string[] = []
    
    const doubled = computed(() => {
      execution.push('computed')
      return state.count * 2
    })
    
    effect(() => {
      execution.push('effect')
      doubled.value
    })
    
    execution.length = 0 // 清空
    
    state.count = 1
    expect(execution).toEqual(['computed', 'effect'])
  })
  
  it('数组 length 变化应该触发索引依赖', () => {
    const arr = reactive([1, 2, 3])
    let item
    
    effect(() => {
      item = arr[2]
    })
    
    expect(item).toBe(3)
    
    arr.length = 2
    expect(item).toBeUndefined()
  })
  
  it('只有值真正改变时才触发', () => {
    const state = reactive({ count: 0 })
    const fn = vi.fn(() => state.count)
    
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    
    state.count = 0 // 相同的值
    expect(fn).toHaveBeenCalledTimes(1)
    
    state.count = 1 // 不同的值
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么 ADD 和 DELETE 操作要触发迭代依赖？

**提示**: 考虑 Object.keys()、for...in 等操作

### 问题2: 如何防止 effect 无限递归？

**提示**: activeEffect 的作用

### 问题3: 为什么 computed effect 要优先执行？

**提示**: 依赖链、值的正确性

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **trigger 的完整流程是什么？**

2. **不同操作类型的触发逻辑有什么区别？**

3. **调度器的作用是什么？**

---

## 📖 扩展阅读

- [Vue 3 源码：effect.ts trigger 函数](https://github.com/vuejs/core/blob/main/packages/reactivity/src/effect.ts)

---

## ⏭️ 明日预告

### Day 10: 实现 stop 和 cleanup 机制

明天我们将学习：
- effect 的停止机制
- 依赖清理
- onStop 回调

**核心任务**: 完善 effect 的生命周期管理

---

**trigger 是响应式更新的核心，理解它的调度机制至关重要！** ⚡
