# Day 4: 实现基础 reactive 函数

> 学习日期: 2025年11月25日  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标

- [ ] 实现完整的 reactive 函数
- [ ] 处理对象的所有拦截操作
- [ ] 理解响应式代理的核心逻辑
- [ ] 实现基础的响应式缓存
- [ ] 通过 10+ 测试用例

## ⏰ 时间规划

- 理论学习: 30分钟
- 编码实践: 1小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. reactive 的核心功能

#### 1.1 什么是 reactive？

**reactive** 将普通对象转换为响应式对象：

```javascript
import { reactive } from 'vue'

// 普通对象
const obj = { count: 0 }
obj.count++ // 不会触发更新

// 响应式对象
const state = reactive({ count: 0 })
state.count++ // 自动触发依赖更新
```

#### 1.2 核心特性

1. **自动依赖追踪**
2. **深度响应式**（嵌套对象也是响应式）
3. **数组支持**
4. **集合类型支持**（Map、Set、WeakMap、WeakSet）

---

### 2. reactive 的实现原理

#### 2.1 基础版本

```javascript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 1. 依赖收集
      track(target, key)
      
      // 2. 返回值
      const result = Reflect.get(target, key, receiver)
      
      // 3. 如果是对象，递归代理
      if (isObject(result)) {
        return reactive(result)
      }
      
      return result
    },
    
    set(target, key, value, receiver) {
      // 1. 设置新值
      const result = Reflect.set(target, key, value, receiver)
      
      // 2. 触发依赖更新
      trigger(target, key)
      
      return result
    }
  })
}
```

#### 2.2 需要处理的拦截器

Proxy 提供了 13 种拦截操作，reactive 需要实现：

```javascript
const handlers = {
  get,          // 读取属性
  set,          // 设置属性
  has,          // in 操作符
  deleteProperty, // delete 操作符
  ownKeys,      // Object.keys、for...in
  // ... 其他拦截器
}
```

---

### 3. reactive 的优化

#### 3.1 响应式缓存

避免重复代理同一个对象：

```javascript
const obj = { count: 0 }

// ❌ 没有缓存，创建多个代理
const state1 = reactive(obj)
const state2 = reactive(obj)
console.log(state1 === state2) // false（错误）

// ✅ 有缓存，返回同一个代理
const reactiveMap = new WeakMap()

function reactive(target) {
  // 检查缓存
  const existing = reactiveMap.get(target)
  if (existing) {
    return existing
  }
  
  // 创建代理
  const proxy = new Proxy(target, handlers)
  
  // 存入缓存
  reactiveMap.set(target, proxy)
  
  return proxy
}

const state1 = reactive(obj)
const state2 = reactive(obj)
console.log(state1 === state2) // true（正确）
```

#### 3.2 防止重复代理

```javascript
const obj = { count: 0 }
const proxy1 = reactive(obj)
const proxy2 = reactive(proxy1) // 不应该再次代理

// 解决方案：标记已代理的对象
const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive'
}

function reactive(target) {
  // 如果已经是代理对象，直接返回
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  
  // 创建代理...
}
```

---

### 4. 深度响应式

#### 4.1 递归代理

```javascript
const state = reactive({
  user: {
    name: 'Vue',
    address: {
      city: 'Beijing'
    }
  }
})

// 嵌套对象也是响应式
state.user.address.city = 'Shanghai' // 触发更新

// 实现：
function get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 依赖收集
  track(target, key)
  
  // 如果是对象，递归代理（懒代理）
  if (isObject(result)) {
    return reactive(result)
  }
  
  return result
}
```

#### 4.2 懒代理 vs 提前代理

```javascript
// 方案1：提前代理（Vue 2）
function reactive(target) {
  const proxy = new Proxy(target, handlers)
  
  // 遍历所有属性，立即代理
  for (const key in target) {
    if (isObject(target[key])) {
      target[key] = reactive(target[key])
    }
  }
  
  return proxy
}

// 方案2：懒代理（Vue 3）
function get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 只在访问时才代理（性能更好）
  if (isObject(result)) {
    return reactive(result)
  }
  
  return result
}
```

**Vue 3 选择懒代理的原因**：
- ✅ 性能更好（不访问就不代理）
- ✅ 支持动态添加的属性
- ✅ 避免循环引用问题

---

## 💻 实践任务

### 任务目标
实现完整的 reactive 函数，支持对象的所有操作。

---

### 步骤1：创建项目结构（10分钟）

```typescript
// src/reactivity/reactive.ts

import { track, trigger } from './effect'

/**
 * 响应式标记
 */
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw'
}

/**
 * 响应式对象缓存
 */
const reactiveMap = new WeakMap<object, any>()

/**
 * 工具函数
 */
export function isObject(value: unknown): value is Record<any, any> {
  return value !== null && typeof value === 'object'
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE])
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

---

### 步骤2：实现 Proxy handlers（30分钟）

```typescript
// src/reactivity/reactive.ts

/**
 * 创建 getter
 */
function createGetter() {
  return function get(
    target: object,
    key: string | symbol,
    receiver: object
  ) {
    // 处理特殊 key
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    if (key === ReactiveFlags.RAW) {
      return target
    }
    
    // 获取值
    const result = Reflect.get(target, key, receiver)
    
    // 依赖收集
    track(target, key)
    
    // 如果是对象，递归代理（懒代理）
    if (isObject(result)) {
      return reactive(result)
    }
    
    return result
  }
}

/**
 * 创建 setter
 */
function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    // 获取旧值
    const oldValue = (target as any)[key]
    
    // 设置新值
    const result = Reflect.set(target, key, value, receiver)
    
    // 只有值真正改变时才触发更新
    if (oldValue !== value && (oldValue === oldValue || value === value)) {
      // NaN !== NaN 为 true，需要特殊处理
      trigger(target, key)
    }
    
    return result
  }
}

/**
 * has 拦截器（in 操作符）
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  track(target, key)
  return result
}

/**
 * deleteProperty 拦截器
 */
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const result = Reflect.deleteProperty(target, key)
  
  // 只有成功删除已存在的属性才触发更新
  if (result && hadKey) {
    trigger(target, key)
  }
  
  return result
}

/**
 * ownKeys 拦截器（Object.keys、for...in）
 */
function ownKeys(target: object): (string | symbol)[] {
  track(target, Array.isArray(target) ? 'length' : Symbol('iterate'))
  return Reflect.ownKeys(target)
}

/**
 * Proxy handlers
 */
const mutableHandlers: ProxyHandler<object> = {
  get: createGetter(),
  set: createSetter(),
  has,
  deleteProperty,
  ownKeys
}
```

---

### 步骤3：实现 reactive 函数（20分钟）

```typescript
// src/reactivity/reactive.ts

/**
 * 创建响应式对象
 */
export function reactive<T extends object>(target: T): T {
  // 参数校验
  if (!isObject(target)) {
    console.warn(`reactive() 的参数必须是对象，收到: ${typeof target}`)
    return target
  }
  
  // 如果已经是响应式对象，直接返回
  if (isReactive(target)) {
    return target
  }
  
  // 检查缓存
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 创建代理
  const proxy = new Proxy(target, mutableHandlers)
  
  // 存入缓存
  reactiveMap.set(target, proxy)
  
  return proxy as T
}
```

---

### 步骤4：编写测试用例（30分钟）

```typescript
// test/reactivity/reactive.spec.ts

import { describe, it, expect } from 'vitest'
import { reactive, isReactive, toRaw } from '../../src/reactivity/reactive'
import { effect } from '../../src/reactivity/effect'

describe('reactive', () => {
  it('应该创建响应式对象', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })
  
  it('应该能读取和设置属性', () => {
    const state = reactive({ count: 0 })
    
    expect(state.count).toBe(0)
    
    state.count = 1
    expect(state.count).toBe(1)
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
  
  it('应该支持嵌套对象', () => {
    const state = reactive({
      nested: { count: 0 }
    })
    
    let dummy
    effect(() => {
      dummy = state.nested.count
    })
    
    expect(dummy).toBe(0)
    
    state.nested.count = 8
    expect(dummy).toBe(8)
  })
  
  it('嵌套对象应该是响应式的', () => {
    const state = reactive({
      nested: { count: 0 }
    })
    
    expect(isReactive(state.nested)).toBe(true)
  })
  
  it('应该缓存响应式对象', () => {
    const original = { count: 0 }
    const observed1 = reactive(original)
    const observed2 = reactive(original)
    
    expect(observed1).toBe(observed2)
  })
  
  it('不应该重复代理', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    
    expect(observed).toBe(observed2)
  })
  
  it('toRaw 应该返回原始对象', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    
    expect(toRaw(observed)).toBe(original)
  })
  
  it('应该支持 in 操作符', () => {
    const state = reactive({ a: 1 })
    let dummy
    
    effect(() => {
      dummy = 'a' in state
    })
    
    expect(dummy).toBe(true)
    
    delete state.a
    expect(dummy).toBe(false)
  })
  
  it('应该支持 delete 操作符', () => {
    const state = reactive({ a: 1 })
    let dummy
    
    effect(() => {
      dummy = state.a
    })
    
    expect(dummy).toBe(1)
    
    delete state.a
    expect(dummy).toBeUndefined()
  })
  
  it('应该支持 Object.keys', () => {
    const state = reactive({ a: 1, b: 2 })
    let keys
    
    effect(() => {
      keys = Object.keys(state)
    })
    
    expect(keys).toEqual(['a', 'b'])
    
    state.c = 3
    expect(keys).toEqual(['a', 'b', 'c'])
  })
  
  it('应该支持 for...in 循环', () => {
    const state = reactive({ a: 1, b: 2 })
    let keys: string[] = []
    
    effect(() => {
      keys = []
      for (const key in state) {
        keys.push(key)
      }
    })
    
    expect(keys).toEqual(['a', 'b'])
    
    state.c = 3
    expect(keys).toEqual(['a', 'b', 'c'])
  })
  
  it('只有值真正改变时才触发更新', () => {
    const state = reactive({ count: 0 })
    let callCount = 0
    
    effect(() => {
      state.count
      callCount++
    })
    
    expect(callCount).toBe(1)
    
    state.count = 0 // 相同的值
    expect(callCount).toBe(1) // 不应该触发
    
    state.count = 1 // 不同的值
    expect(callCount).toBe(2) // 应该触发
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么 Vue 3 选择懒代理而不是提前代理？

**提示**: 
- 性能考虑
- 内存占用
- 动态属性

### 问题2: 如何判断两个值是否真正不同？

```javascript
// 考虑以下情况
NaN === NaN // false
0 === -0 // true
```

### 问题3: 为什么要用 WeakMap 缓存响应式对象？

**提示**: 垃圾回收、内存泄漏

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **reactive 的核心流程是什么？**

2. **需要拦截哪些操作？**

3. **懒代理的优势是什么？**

---

## 📖 扩展阅读

- [Vue 3 源码：reactive.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/reactive.ts)
- [MDN Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

---

## ⏭️ 明日预告

### Day 5: 实现 effect 副作用函数

明天我们将学习：
- effect 函数的完整实现
- 依赖清理机制
- 嵌套 effect 处理

**核心任务**: 实现 effect 的完整功能

---

**reactive 是 Vue 3 响应式系统的核心，理解它至关重要！** 🎯
