# Day 15: 实现 computed 计算属性

> 学习日期: 2025年12月06日  
> 预计用时: 3小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标

- [ ] 理解 computed 的惰性计算原理
- [ ] 实现 computed 的缓存机制
- [ ] 掌握 computed 与 effect 的关系
- [ ] 理解 computed 的依赖收集
- [ ] 通过 10+ 测试用例

## ⏰ 时间规划

- 理论学习: 1小时
- 编码实践: 1.5小时
- 测试与调试: 30分钟

---

## 📚 理论知识详解

### 1. computed 的核心特性

#### 1.1 什么是计算属性？

computed 是一个**带缓存的响应式值**：

```javascript
const state = reactive({ count: 0 })

// 普通函数：每次调用都重新计算
function double() {
  console.log('计算中...')
  return state.count * 2
}

console.log(double()) // 计算中... 0
console.log(double()) // 计算中... 0 (重复计算)

// computed：有缓存
const doubleComputed = computed(() => {
  console.log('计算中...')
  return state.count * 2
})

console.log(doubleComputed.value) // 计算中... 0
console.log(doubleComputed.value) // 0 (使用缓存，不重新计算)

state.count = 5
console.log(doubleComputed.value) // 计算中... 10 (依赖变化，重新计算)
```

#### 1.2 computed 的三大特性

##### ① 惰性计算（Lazy Evaluation）

```javascript
const state = reactive({ count: 0 })

// 创建 computed，但不会立即执行
const double = computed(() => {
  console.log('计算中...')
  return state.count * 2
})

console.log('computed 已创建')
// 此时不会输出 "计算中..."

console.log(double.value) // 第一次访问才执行
// 输出: 计算中... 0
```

##### ② 缓存机制（Caching）

```javascript
const double = computed(() => {
  console.log('重新计算')
  return state.count * 2
})

// 多次访问，只计算一次
console.log(double.value) // 重新计算 0
console.log(double.value) // 0 (缓存)
console.log(double.value) // 0 (缓存)

// 依赖变化，缓存失效
state.count = 5
console.log(double.value) // 重新计算 10
console.log(double.value) // 10 (缓存)
```

##### ③ 依赖追踪（Dependency Tracking）

```javascript
const state = reactive({ a: 1, b: 2, c: 3 })

// computed 只依赖 a 和 b
const sum = computed(() => state.a + state.b)

// 修改 c 不会触发重新计算
state.c = 10 // sum 不会重新计算

// 修改 a 会触发重新计算
state.a = 10 // sum 会重新计算
```

---

### 2. computed 的实现原理

#### 2.1 核心思想

computed 本质上是一个**特殊的 effect**：

```javascript
class ComputedRefImpl {
  private _value // 缓存的值
  private _dirty = true // 脏标记：true 表示需要重新计算
  private _effect // 内部 effect
  
  constructor(getter) {
    // 创建一个 effect 来追踪依赖
    this._effect = new ReactiveEffect(getter, () => {
      // 调度器：依赖变化时，标记为脏
      if (!this._dirty) {
        this._dirty = true
        // 触发 computed 的依赖更新
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    // 如果是脏的，重新计算
    if (this._dirty) {
      this._value = this._effect.run()
      this._dirty = false
    }
    // 收集依赖当前 computed 的 effect
    track(this, 'value')
    return this._value
  }
}
```

#### 2.2 计算流程

```
1. 创建 computed
   ↓
2. 第一次访问 .value
   ↓
3. _dirty = true，执行 getter
   ↓
4. getter 中访问响应式数据，触发 track
   ↓
5. computed 的 effect 被收集为依赖
   ↓
6. 计算结果存入 _value，_dirty = false
   ↓
7. 再次访问 .value，直接返回 _value（缓存）
   ↓
8. 依赖的数据变化，触发 scheduler
   ↓
9. scheduler 将 _dirty 设为 true
   ↓
10. 下次访问 .value，重新计算
```

#### 2.3 双层依赖关系

computed 涉及两层依赖关系：

```javascript
const state = reactive({ count: 0 })

// 第一层：computed 依赖 state.count
const double = computed(() => state.count * 2)

// 第二层：effect 依赖 computed
effect(() => {
  console.log(double.value)
})

// 修改 state.count
state.count = 5

// 触发流程：
// 1. state.count 的 dep 触发 computed 的 effect
// 2. computed 的 scheduler 设置 _dirty = true
// 3. trigger(computed, 'value') 触发 effect
// 4. effect 执行，访问 double.value
// 5. 因为 _dirty = true，重新计算
```

---

### 3. computed vs effect

| 特性 | computed | effect |
|------|----------|--------|
| **执行时机** | 惰性，访问时才执行 | 立即执行 |
| **缓存** | 有缓存，依赖不变不重复计算 | 无缓存，每次依赖变化都执行 |
| **返回值** | 返回 ref 对象 | 无返回值 |
| **用途** | 派生数据 | 副作用 |
| **依赖收集** | 被访问时收集依赖 | 执行时收集依赖 |

```javascript
const state = reactive({ count: 0 })

// computed：有缓存的派生数据
const double = computed(() => {
  console.log('computed 执行')
  return state.count * 2
})

// effect：副作用
effect(() => {
  console.log('effect 执行:', state.count)
})

// 对比行为
console.log(double.value) // computed 执行 0
console.log(double.value) // 0 (缓存，不执行)
console.log(double.value) // 0 (缓存，不执行)

state.count = 5
// effect 执行: 5 (立即执行)
console.log(double.value) // computed 执行 10 (惰性，访问时才执行)
```

---

### 4. computed 的高级用法

#### 4.1 可写的 computed

```javascript
const state = reactive({ firstName: 'John', lastName: 'Doe' })

const fullName = computed({
  get() {
    return `${state.firstName} ${state.lastName}`
  },
  set(value) {
    const [first, last] = value.split(' ')
    state.firstName = first
    state.lastName = last
  }
})

console.log(fullName.value) // 'John Doe'

fullName.value = 'Jane Smith'
console.log(state.firstName) // 'Jane'
console.log(state.lastName) // 'Smith'
```

#### 4.2 computed 链式调用

```javascript
const state = reactive({ count: 1 })

const double = computed(() => state.count * 2)
const quadruple = computed(() => double.value * 2)
const eight = computed(() => quadruple.value * 2)

console.log(eight.value) // 8

state.count = 2
console.log(eight.value) // 16
```

---

## 💻 实践任务

### 任务目标
实现完整的 computed 功能，支持缓存、惰性计算和可写 computed。

---

### 步骤1：实现 ComputedRefImpl 类（30分钟）

```typescript
// src/reactivity/computed.ts

import { ReactiveEffect } from './effect'
import { track, trigger } from './effect'
import { Ref } from './ref'

export class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true // 脏标记
  public readonly effect: ReactiveEffect
  public readonly __v_isRef = true
  
  constructor(
    getter: () => T,
    private readonly _setter?: (value: T) => void
  ) {
    // 创建 effect，传入 scheduler
    this.effect = new ReactiveEffect(getter, () => {
      // 依赖变化时，标记为脏，但不立即计算
      if (!this._dirty) {
        this._dirty = true
        // 触发依赖当前 computed 的 effect
        trigger(this, 'value')
      }
    })
  }
  
  get value(): T {
    // 依赖收集：收集依赖当前 computed 的 effect
    track(this, 'value')
    
    // 如果是脏的，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    
    return this._value
  }
  
  set value(newValue: T) {
    if (this._setter) {
      this._setter(newValue)
    } else {
      // 只读 computed 不能设置
      console.warn('Computed property is readonly')
    }
  }
}
```

---

### 步骤2：实现 computed 工厂函数（15分钟）

```typescript
// src/reactivity/computed.ts

export type ComputedGetter<T> = () => T
export type ComputedSetter<T> = (value: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T
}

/**
 * 创建只读 computed
 */
export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>

/**
 * 创建可写 computed
 */
export function computed<T>(
  options: WritableComputedOptions<T>
): ComputedRef<T>

/**
 * 实现
 */
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
): ComputedRef<T> {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T> | undefined
  
  // 判断参数类型
  if (typeof getterOrOptions === 'function') {
    // 只读 computed
    getter = getterOrOptions
    setter = undefined
  } else {
    // 可写 computed
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  
  return new ComputedRefImpl(getter, setter) as any
}
```

---

### 步骤3：完善 trigger 函数支持 computed（15分钟）

```typescript
// src/reactivity/effect.ts

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  
  // 分类 effect：有 scheduler 和 没有 scheduler
  const effectsToRun = new Set<ReactiveEffect>()
  
  dep.forEach(effect => {
    // 避免无限递归：不能触发自己
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  // 执行所有 effect
  effectsToRun.forEach(effect => {
    if (effect.scheduler) {
      // 有 scheduler，执行 scheduler（computed 走这里）
      effect.scheduler()
    } else {
      // 没有 scheduler，直接执行
      effect.run()
    }
  })
}
```

---

### 步骤4：编写测试用例（30分钟）

```typescript
// test/reactivity/computed.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive } from '../../src/reactivity/reactive'
import { computed } from '../../src/reactivity/computed'
import { effect } from '../../src/reactivity/effect'

describe('computed', () => {
  it('应该返回计算后的值', () => {
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    
    expect(double.value).toBe(2)
  })
  
  it('应该懒计算（访问时才执行）', () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const double = computed(getter)
    
    // 创建后不会执行
    expect(getter).not.toHaveBeenCalled()
    
    // 访问时才执行
    expect(double.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(1)
  })
  
  it('应该缓存计算结果', () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const double = computed(getter)
    
    // 多次访问，只计算一次
    expect(double.value).toBe(2)
    expect(double.value).toBe(2)
    expect(double.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(1)
  })
  
  it('依赖变化时应该重新计算', () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const double = computed(getter)
    
    expect(double.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(1)
    
    // 依赖变化
    state.count = 2
    
    // 访问时重新计算
    expect(double.value).toBe(4)
    expect(getter).toHaveBeenCalledTimes(2)
    
    // 再次访问，使用缓存
    expect(double.value).toBe(4)
    expect(getter).toHaveBeenCalledTimes(2)
  })
  
  it('应该支持链式 computed', () => {
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    const quadruple = computed(() => double.value * 2)
    
    expect(quadruple.value).toBe(4)
    
    state.count = 2
    expect(quadruple.value).toBe(8)
  })
  
  it('应该在 effect 中触发更新', () => {
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    let dummy
    
    effect(() => {
      dummy = double.value
    })
    
    expect(dummy).toBe(2)
    
    state.count = 2
    expect(dummy).toBe(4)
  })
  
  it('应该支持可写 computed', () => {
    const state = reactive({ firstName: 'John', lastName: 'Doe' })
    
    const fullName = computed({
      get() {
        return `${state.firstName} ${state.lastName}`
      },
      set(value) {
        const [first, last] = value.split(' ')
        state.firstName = first
        state.lastName = last
      }
    })
    
    expect(fullName.value).toBe('John Doe')
    
    fullName.value = 'Jane Smith'
    expect(state.firstName).toBe('Jane')
    expect(state.lastName).toBe('Smith')
    expect(fullName.value).toBe('Jane Smith')
  })
  
  it('应该只追踪实际使用的依赖', () => {
    const state = reactive({ a: 1, b: 2, c: 3 })
    const getter = vi.fn(() => state.a + state.b)
    const sum = computed(getter)
    
    expect(sum.value).toBe(3)
    getter.mockClear()
    
    // 修改未使用的属性，不应重新计算
    state.c = 10
    expect(sum.value).toBe(3)
    expect(getter).not.toHaveBeenCalled()
    
    // 修改使用的属性，应重新计算
    state.a = 10
    expect(sum.value).toBe(12)
    expect(getter).toHaveBeenCalledTimes(1)
  })
  
  it('只读 computed 设置值应警告', () => {
    const consoleSpy = vi.spyOn(console, 'warn')
    const state = reactive({ count: 1 })
    const double = computed(() => state.count * 2)
    
    double.value = 10
    expect(consoleSpy).toHaveBeenCalledWith('Computed property is readonly')
    
    consoleSpy.mockRestore()
  })
})
```

---

## 🤔 思考题

### 问题1: computed 的 _dirty 标记有什么作用？

**提示**: 
- 什么时候设为 true？
- 什么时候设为 false？
- 如果没有 _dirty 会怎样？

### 问题2: 为什么 computed 的 effect 需要 scheduler？

**提示**:
```javascript
this.effect = new ReactiveEffect(getter, () => {
  // 为什么这里不直接重新计算？
})
```

### 问题3: computed 如何实现双层依赖？

```javascript
const state = reactive({ count: 0 })
const double = computed(() => state.count * 2)

effect(() => {
  console.log(double.value) // 这里涉及哪些依赖关系？
})
```

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **computed 的三大特性是什么？**

2. **computed 和 effect 的主要区别？**

3. **_dirty 标记的作用机制？**

4. **computed 如何实现缓存？**

---

## 📖 扩展阅读

- [Vue 3 源码：computed.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/computed.ts)
- [Vue 3 官方文档：计算属性](https://cn.vuejs.org/guide/essentials/computed.html)

---

## ⏭️ 明日预告

### Day 16: 实现 watch 监听器

明天我们将学习：
- watch 的实现原理
- 立即执行和深度监听
- watch vs watchEffect

**核心任务**: 实现完整的 watch 功能

---

**computed 是 Vue 最优雅的 API 之一，理解它的缓存机制至关重要！** ✨
