# Day 12: 数组的响应式处理

> 学习日期: 2025年12月02日  
> 预计用时: 3小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标

- [ ] 理解数组的特殊性
- [ ] 实现数组索引的响应式
- [ ] 实现 length 属性的特殊处理
- [ ] 拦截数组方法（push/pop/shift等）
- [ ] 处理查找方法（includes/indexOf等）
- [ ] 通过 20+ 测试用例

## ⏰ 时间规划

- 理论学习: 1小时
- 编码实践: 1小时30分钟
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. 数组的特殊性

#### 1.1 数组 vs 对象

```javascript
// 对象
const obj = { name: 'vue', version: 3 }
obj.name  // 访问属性
obj.name = 'react'  // 修改属性

// 数组
const arr = ['a', 'b', 'c']
arr[0]  // 访问元素（本质是访问属性 '0'）
arr[0] = 'x'  // 修改元素（本质是修改属性 '0'）
arr.length  // 特殊属性
arr.push('d')  // 特殊方法
```

**数组的特殊性**：
1. **索引**：数字字符串属性（'0', '1', '2'...）
2. **length**：自动更新的特殊属性
3. **方法**：改变数组的方法（push, pop, shift, unshift, splice...）
4. **查找方法**：可能需要特殊处理（includes, indexOf, lastIndexOf）

---

#### 1.2 数组操作的问题

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr.length)
})

// 问题1：修改索引应该触发 length 的依赖吗？
arr[3] = 4  // length 从 3 变成 4

// 问题2：修改 length 应该触发哪些索引的依赖？
arr.length = 1  // arr[1] 和 arr[2] 被删除

// 问题3：push 会触发几次更新？
arr.push(5)  // 修改 arr[4] + 修改 length → 2次更新？

// 问题4：includes 能找到原始对象吗？
const obj = {}
const arr = reactive([obj])
arr.includes(obj)  // 应该返回 true 还是 false？
```

---

### 2. 索引操作的处理

#### 2.1 索引的依赖收集

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr[0])  // 访问索引 0
  console.log(arr[1])  // 访问索引 1
})

// 依赖关系：
// arr['0'] → [effect]
// arr['1'] → [effect]

arr[0] = 10  // 触发 effect
arr[2] = 30  // 不触发 effect（未依赖）
```

---

#### 2.2 新增元素 vs 修改元素

```typescript
function set(target, key, value, receiver) {
  const hadKey = Array.isArray(target)
    ? Number(key) < target.length  // 数组：索引 < length 是修改
    : hasOwn(target, key)            // 对象：有属性是修改
  
  const result = Reflect.set(target, key, value, receiver)
  
  if (!hadKey) {
    trigger(target, 'add', key)  // 新增
  } else {
    trigger(target, 'set', key)  // 修改
  }
  
  return result
}
```

---

### 3. length 属性的特殊处理

#### 3.1 length 的双向影响

```javascript
const arr = reactive([1, 2, 3])

// 情况1：修改索引 → 影响 length
arr[3] = 4
// length: 3 → 4

// 情况2：修改 length → 影响索引
arr.length = 1
// arr[1] 和 arr[2] 被删除
```

---

#### 3.2 修改 length 的触发逻辑

```javascript
const arr = reactive([1, 2, 3, 4, 5])

effect(() => {
  console.log(arr[0])  // 依赖索引 0
  console.log(arr[2])  // 依赖索引 2
  console.log(arr[4])  // 依赖索引 4
})

// 修改 length
arr.length = 3

// 应该触发哪些依赖？
// - 索引 0：仍存在，不应触发？
// - 索引 2：仍存在，不应触发？
// - 索引 4：被删除，应该触发！✓

// 规则：触发 >= newLength 的索引依赖
```

---

### 4. 数组方法的拦截

#### 4.1 改变数组的方法

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(arr.length)
})

// push 的内部实现：
arr.push(4)
// 1. 访问 length → track('length')
// 2. 修改 arr[3] = 4 → trigger('add', 3)
// 3. 修改 length = 4 → trigger('set', 'length')

// 问题：触发了 2 次更新！

// 解决：在执行数组方法时，暂停依赖收集
```

---

#### 4.2 查找方法的特殊处理

```javascript
// 问题：原始对象 vs 响应式对象
const obj = {}
const arr = reactive([obj])

arr.includes(obj)  // 期望：true
// 实际：arr[0] 是 reactive(obj)，不等于 obj → false

// 解决：查找时同时查找原始值和响应式值
arr.includes(obj)
// 1. 先在 reactive 数组中查找 obj → 找不到
// 2. 再在 reactive 数组中查找 reactive(obj) → 找到！
// 返回 true
```

---

## 💻 实践任务

### 任务目标
实现数组的完整响应式支持。

---

### 步骤1：判断是否为数组操作（10分钟）

```typescript
// src/reactivity/shared/index.ts

/**
 * 判断是否为数组索引
 */
export function isIntegerKey(key: unknown): boolean {
  return (
    typeof key === 'string' &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key
  )
}

/**
 * 判断 key 是否为数组的索引
 */
export function isArrayIndex(key: unknown): key is number {
  const n = parseFloat(String(key))
  return (
    n >= 0 &&
    Math.floor(n) === n &&
    isFinite(n)
  )
}
```

---

### 步骤2：修改 set 拦截器（20分钟）

```typescript
// src/reactivity/baseHandlers.ts

function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key]
    
    // 判断是新增还是修改
    const hadKey = Array.isArray(target) && isArrayIndex(key)
      ? Number(key) < target.length
      : hasOwn(target, key)
    
    const result = Reflect.set(target, key, value, receiver)
    
    // 只有当 receiver 是 target 的代理时才触发
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    
    return result
  }
}
```

---

### 步骤3：完善 trigger 函数（30分钟）

```typescript
// src/reactivity/effect.ts

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  // 收集需要触发的 effects
  const effects = new Set<ReactiveEffect>()
  
  const add = (effectsToAdd: Dep | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        if (effect !== activeEffect || effect.allowRecurse) {
          effects.add(effect)
        }
      })
    }
  }
  
  // 清空操作：触发所有依赖
  if (type === TriggerOpTypes.CLEAR) {
    depsMap.forEach(add)
  }
  // 数组的 length 修改
  else if (key === 'length' && Array.isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        // 触发 length 依赖 + 被删除的索引依赖
        add(dep)
      }
    })
  }
  // 其他操作
  else {
    // 触发 key 的依赖
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    
    // 新增/删除操作的额外处理
    switch (type) {
      case TriggerOpTypes.ADD:
        if (Array.isArray(target)) {
          // 数组新增：触发 length 依赖
          add(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (Array.isArray(target)) {
          // 数组删除：触发 length 依赖
          add(depsMap.get('length'))
        }
        break
    }
  }
  
  // 执行 effects
  triggerEffects(effects)
}
```

---

### 步骤4：拦截数组方法（40分钟）

```typescript
// src/reactivity/arrayInstrumentations.ts

const arrayInstrumentations: Record<string, Function> = {}

/**
 * 改变数组的方法，需要暂停依赖收集
 */
;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
  arrayInstrumentations[key] = function (this: any[], ...args: any[]) {
    // 暂停依赖收集
    pauseTracking()
    
    // 执行原始方法
    const res = (toRaw(this) as any)[key].apply(this, args)
    
    // 恢复依赖收集
    resetTracking()
    
    return res
  }
})

/**
 * 查找方法，需要同时查找原始值和响应式值
 */
;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
  arrayInstrumentations[key] = function (this: any[], ...args: any[]) {
    // 先获取原始数组
    const arr = toRaw(this)
    
    // 收集数组的所有索引依赖
    for (let i = 0; i < this.length; i++) {
      track(arr, TrackOpTypes.GET, i + '')
    }
    
    // 先用参数原始值查找
    const res = arr[key](...args)
    if (res === -1 || res === false) {
      // 没找到，用参数的原始值再查找一次
      return arr[key](...args.map(toRaw))
    }
    
    return res
  }
})

/**
 * pauseTracking 和 resetTracking
 */
let trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
```

---

### 步骤5：应用数组拦截（15分钟）

```typescript
// src/reactivity/baseHandlers.ts

function createGetter(isReadonly = false, shallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    // 特殊 key 处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }
    
    const targetIsArray = Array.isArray(target)
    
    // 数组方法拦截
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    
    const res = Reflect.get(target, key, receiver)
    
    // 收集依赖
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    
    if (shallow) {
      return res
    }
    
    // 深度响应式
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    
    return res
  }
}
```

---

### 步骤6：编写测试用例（45分钟）

```typescript
// test/reactivity/reactive-array.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src/reactivity'

describe('reactive数组', () => {
  it('数组索引应该响应式', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr[0]
    })
    
    expect(dummy).toBe(1)
    
    arr[0] = 10
    expect(dummy).toBe(10)
  })
  
  it('修改 length 应该触发依赖', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(3)
    
    arr[3] = 4
    expect(dummy).toBe(4)
    
    arr.length = 0
    expect(dummy).toBe(0)
  })
  
  it('修改 length 应该触发被删除元素的依赖', () => {
    const arr = reactive([1, 2, 3, 4, 5])
    const fn = vi.fn(() => {
      arr[2]
      arr[4]
    })
    
    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    
    arr.length = 3
    expect(fn).toHaveBeenCalledTimes(2) // 索引4被删除，触发
  })
  
  it('push 应该正确工作', () => {
    const arr = reactive([1, 2])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(2)
    
    arr.push(3)
    expect(dummy).toBe(3)
    expect(arr[2]).toBe(3)
  })
  
  it('多个 push 不应该互相触发', () => {
    const arr = reactive([])
    const fn1 = vi.fn(() => {
      arr.push(1)
    })
    const fn2 = vi.fn(() => {
      arr.push(2)
    })
    
    effect(fn1)
    effect(fn2)
    
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })
  
  it('pop 应该正确工作', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(3)
    
    const item = arr.pop()
    expect(item).toBe(3)
    expect(dummy).toBe(2)
  })
  
  it('shift/unshift 应该正确工作', () => {
    const arr = reactive([2, 3])
    let dummy
    
    effect(() => {
      dummy = arr[0]
    })
    
    expect(dummy).toBe(2)
    
    arr.unshift(1)
    expect(dummy).toBe(1)
    expect(arr.length).toBe(3)
    
    arr.shift()
    expect(dummy).toBe(2)
    expect(arr.length).toBe(2)
  })
  
  it('splice 应该正确工作', () => {
    const arr = reactive([1, 2, 3, 4])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(4)
    
    arr.splice(1, 2, 'a', 'b')
    expect(arr).toEqual([1, 'a', 'b', 4])
    expect(dummy).toBe(4)
  })
  
  it('includes 应该能找到原始对象', () => {
    const obj = {}
    const arr = reactive([obj])
    
    expect(arr.includes(obj)).toBe(true)
  })
  
  it('includes 应该能找到响应式对象', () => {
    const obj = {}
    const arr = reactive([obj])
    const reactiveObj = arr[0]
    
    expect(arr.includes(reactiveObj)).toBe(true)
  })
  
  it('indexOf 应该能找到原始对象', () => {
    const obj = {}
    const arr = reactive([obj])
    
    expect(arr.indexOf(obj)).toBe(0)
  })
  
  it('forEach 应该正确工作', () => {
    const arr = reactive([1, 2, 3])
    let sum = 0
    
    effect(() => {
      sum = 0
      arr.forEach(item => {
        sum += item
      })
    })
    
    expect(sum).toBe(6)
    
    arr[0] = 10
    expect(sum).toBe(15)
    
    arr.push(4)
    expect(sum).toBe(19)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么 push 等方法需要暂停依赖收集？

**提示**: 
- push 内部会访问 length
- 避免不必要的触发

---

### 问题2: 修改 length 为什么只触发 >= newLength 的索引依赖？

**提示**: 
- 哪些元素被影响？
- 最小化不必要的更新

---

### 问题3: includes 为什么要查找两次？

**提示**: 
- 原始值 vs 响应式值
- 用户体验

---

## 📝 学习总结

完成今天的学习后，请思考：

1. **数组与对象的响应式处理有什么不同？**

2. **数组方法拦截的必要性和实现方式？**

3. **数组响应式的性能优化点在哪里？**

---

## 📖 扩展阅读

- [Vue 3 源码：数组响应式](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts)
- [为什么数组需要特殊处理？](https://github.com/vuejs/rfcs/discussions/233)

---

## ⏭️ 明日预告

### Day 13: 集合类型的响应式（Map/Set）

明天我们将学习：
- Map/Set 的特殊性
- 集合方法的拦截
- size 属性的处理
- 迭代器的实现

**核心任务**: 实现 Map/Set 的响应式支持

---

**数组是最常用的数据结构，掌握它的响应式实现非常重要！** 📊
