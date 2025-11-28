# Day 13: 响应式数组进阶处理

> 学习日期: 2025-12-04  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 深入理解数组的响应式处理特殊性
- [ ] 处理数组的索引和 length 操作
- [ ] 实现数组方法的拦截（push、pop、shift、unshift、splice）
- [ ] 处理数组的遍历方法（forEach、map、filter 等）

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. 数组响应式的特殊性

#### 1.1 核心概念

**为什么数组需要特殊处理？**

在 JavaScript 中，数组是一种特殊的对象，它具有以下特点：
1. **索引访问**：可以通过数字索引访问元素
2. **length 属性**：自动维护的长度属性
3. **数组方法**：push、pop、shift、unshift、splice 等会修改原数组的方法
4. **遍历方法**：forEach、map、filter、reduce 等不修改原数组的方法

这些特性使得数组的响应式处理比普通对象更复杂：

```javascript
const arr = reactive([1, 2, 3])

// 1. 索引设置会影响 length
arr[3] = 4  // length 从 3 变为 4，需要触发 length 的依赖

// 2. 修改 length 会删除元素
arr.length = 2  // 索引 2 和 3 的元素被删除，需要触发这些索引的依赖

// 3. 数组方法会触发多次读写
arr.push(5)  // 会读取 length，设置 arr[length]，修改 length

// 4. 遍历方法会读取所有元素
arr.forEach(item => console.log(item))  // 需要追踪所有索引的依赖
```

#### 1.2 技术细节

**索引与 length 的联动关系**

Vue 3 使用 Proxy 的 `set` 陷阱来处理数组的索引和 length：

```javascript
// 当设置索引时
function set(target, key, value, receiver) {
  const oldLength = target.length
  const result = Reflect.set(target, key, value, receiver)
  
  // 如果是数组且设置的索引大于等于原长度
  if (Array.isArray(target) && key !== 'length') {
    const index = Number(key)
    if (index >= oldLength) {
      // 触发 length 的依赖
      trigger(target, 'length')
    }
  }
  
  return result
}
```

**数组方法的拦截**

某些数组方法在执行时会读取和修改数组，需要特殊处理以避免无限递归：

```javascript
// 问题：push 方法的执行流程
arr.push(1)  
// 1. 读取 arr.push（触发 get 陷阱）
// 2. 读取 arr.length（触发 get 陷阱，收集依赖）
// 3. 设置 arr[length] = 1（触发 set 陷阱，触发依赖）
// 4. 设置 arr.length = length + 1（触发 set 陷阱，触发依赖）
// 如果在 effect 中调用 push，会导致无限递归！

effect(() => {
  arr.push(1)  // 每次执行都会触发自己，无限递归！
})
```

**解决方案：暂停追踪**

Vue 3 的解决方案是在执行数组变更方法时暂停依赖追踪：

```javascript
let shouldTrack = true

function pauseTracking() {
  shouldTrack = false
}

function enableTracking() {
  shouldTrack = true
}

// 重写数组方法
const arrayInstrumentations = {}

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  arrayInstrumentations[key] = function(...args) {
    pauseTracking()  // 暂停追踪
    const res = Array.prototype[key].apply(this, args)
    enableTracking()  // 恢复追踪
    return res
  }
})
```

#### 1.3 关联的 CS 基础知识

**数据结构：数组的底层实现**

在 V8 引擎中，JavaScript 数组有两种存储模式：
1. **Fast Elements（快速元素模式）**：连续的内存存储，类似 C 数组
2. **Dictionary Elements（字典模式）**：使用哈希表存储，当数组稀疏或元素类型混杂时使用

```javascript
// Fast Elements - 连续存储
const arr1 = [1, 2, 3, 4, 5]

// Dictionary Elements - 哈希表存储
const arr2 = []
arr2[0] = 1
arr2[1000] = 2  // 稀疏数组，切换到字典模式
```

**算法：追踪优化**

为了避免不必要的依赖收集，Vue 3 使用了以下策略：
1. **去重**：同一个 effect 对同一个 key 只收集一次
2. **批量更新**：使用 Set 数据结构存储依赖，自动去重
3. **调度器**：延迟执行 effect，合并多次触发

#### 1.4 实际应用场景

**场景 1：动态列表渲染**

```vue
<template>
  <ul>
    <li v-for="item in list" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
  <button @click="addItem">添加</button>
</template>

<script setup>
import { reactive } from 'vue'

const list = reactive([
  { id: 1, name: '项目 1' },
  { id: 2, name: '项目 2' }
])

function addItem() {
  list.push({ id: list.length + 1, name: `项目 ${list.length + 1}` })
}
</script>
```

**场景 2：数组过滤和排序**

```javascript
import { reactive, computed } from 'vue'

const todos = reactive([
  { id: 1, text: '学习 Vue', done: false },
  { id: 2, text: '写代码', done: true },
  { id: 3, text: '锻炼身体', done: false }
])

// 使用 computed 处理数组，避免在模板中使用方法
const activeTodos = computed(() => {
  return todos.filter(todo => !todo.done)
})

const sortedTodos = computed(() => {
  return [...todos].sort((a, b) => a.id - b.id)
})
```

---

## 💻 实践任务

### 任务目标
增强 `reactive` 函数，正确处理数组的索引、length 和数组方法。

### 前置准备

#### 环境要求
- 已完成 Day 1-12 的实现
- 理解 Proxy 的 get 和 set 陷阱
- 理解 track 和 trigger 的工作原理

#### 项目结构
```
mini-vue3/
├── src/
│   └── reactivity/
│       ├── effect.ts      # effect 实现
│       └── reactive.ts    # reactive 实现，今天要修改
└── test/
    └── reactivity/
        └── reactive.spec.ts  # 测试用例
```

### 测试用例

在 `test/reactivity/reactive.spec.ts` 中添加以下测试：

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src/reactivity'

describe('reactive - 数组', () => {
  it('应该追踪数组索引的变化', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr[0]
    })
    
    expect(dummy).toBe(1)
    arr[0] = 10
    expect(dummy).toBe(10)
  })
  
  it('应该追踪数组 length 的变化', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(3)
    arr.push(4)
    expect(dummy).toBe(4)
  })
  
  it('当设置大于 length 的索引时应该触发 length 依赖', () => {
    const arr = reactive([1, 2])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(2)
    arr[3] = 4  // 跳过索引 2
    expect(dummy).toBe(4)
  })
  
  it('当修改 length 时应该触发索引依赖', () => {
    const arr = reactive([1, 2, 3, 4])
    const fn = vi.fn(() => {
      arr.forEach(item => {})
    })
    
    effect(fn)
    
    expect(fn).toHaveBeenCalledTimes(1)
    arr.length = 2
    expect(fn).toHaveBeenCalledTimes(2)
  })
  
  it('数组的 push 方法应该正常工作', () => {
    const arr = reactive([])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    expect(dummy).toBe(0)
    arr.push(1)
    expect(dummy).toBe(1)
    arr.push(2)
    expect(dummy).toBe(2)
  })
  
  it('在 effect 中调用 push 不应该导致无限递归', () => {
    const arr = reactive([])
    
    // 这不应该导致无限递归
    effect(() => {
      arr.push(1)
    })
    
    expect(arr.length).toBe(1)
  })
  
  it('数组的其他变更方法应该正常工作', () => {
    const arr = reactive([1, 2, 3])
    let dummy
    
    effect(() => {
      dummy = arr.length
    })
    
    arr.pop()
    expect(dummy).toBe(2)
    
    arr.shift()
    expect(dummy).toBe(1)
    
    arr.unshift(0)
    expect(dummy).toBe(2)
  })
})
```

### 实现步骤（一步步详细指导）

#### 步骤1: 添加追踪控制变量 (预估5分钟)

**要做什么:**
添加用于控制是否追踪依赖的变量和函数。

**如何操作:**
1. 打开文件 `src/reactivity/effect.ts`
2. 在文件顶部添加以下代码:

```typescript
// 控制是否应该追踪依赖
let shouldTrack = true

/**
 * 暂停依赖追踪
 */
export function pauseTracking() {
  shouldTrack = false
}

/**
 * 恢复依赖追踪
 */
export function enableTracking() {
  shouldTrack = true
}
```

3. 修改 `track` 函数，添加 shouldTrack 检查:

```typescript
export function track(target: object, key: string | symbol) {
  // 如果没有激活的 effect 或者暂停追踪，则不收集依赖
  if (!activeEffect || !shouldTrack) {
    return
  }
  
  // ... 原有的依赖收集逻辑
}
```

**为什么这样做:**
通过控制 `shouldTrack` 变量，我们可以在执行数组变更方法时暂时禁用依赖追踪，避免在 effect 中调用这些方法时导致无限递归。

**预期结果:**
现在可以通过 `pauseTracking()` 和 `enableTracking()` 控制依赖追踪的开关。

#### 步骤2: 实现数组方法的拦截 (预估10分钟)

**要做什么:**
创建数组方法的拦截器，在执行变更方法时暂停依赖追踪。

**如何操作:**
1. 打开文件 `src/reactivity/reactive.ts`
2. 在文件顶部导入新增的函数:

```typescript
import { track, trigger, pauseTracking, enableTracking } from './effect'
```

3. 在 `createReactiveObject` 函数之前添加数组方法拦截器:

```typescript
// 需要拦截的数组方法
const arrayInstrumentations: Record<string, Function> = {}

// 这些方法会修改数组，需要暂停追踪避免无限递归
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  const method = Array.prototype[key as keyof Array<any>]
  arrayInstrumentations[key] = function(this: any[], ...args: any[]) {
    // 暂停追踪
    pauseTracking()
    // 调用原始方法
    const res = method.apply(this, args)
    // 恢复追踪
    enableTracking()
    return res
  }
})

// 这些方法会遍历数组，需要追踪所有元素
;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  const method = Array.prototype[key as keyof Array<any>]
  arrayInstrumentations[key] = function(this: any[], ...args: any[]) {
    // 先在响应式对象中查找
    const res = method.apply(this, args)
    if (res === false || res === -1) {
      // 如果没找到，在原始对象中查找
      return method.apply(toRaw(this), args)
    }
    return res
  }
})
```

4. 修改 `get` 陷阱，添加数组方法拦截:

```typescript
function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    // 如果是数组且访问的是被拦截的方法
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    
    // ... 原有的 get 逻辑
  }
}
```

**为什么这样做:**
1. **暂停追踪**：在执行 push 等方法时暂停追踪，避免 effect 中调用这些方法时的无限递归
2. **方法拦截**：在访问数组方法时返回我们包装过的版本，而不是原始方法

**预期结果:**
现在在 effect 中调用 `arr.push()` 不会导致无限递归。

#### 步骤3: 处理数组索引和 length 的联动 (预估10分钟)

**要做什么:**
在 set 陷阱中添加逻辑，处理数组索引和 length 属性的相互影响。

**如何操作:**
1. 继续在 `src/reactivity/reactive.ts` 中修改 `set` 陷阱:

```typescript
function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    const oldValue = (target as any)[key]
    
    // 判断是新增还是修改
    const hadKey = Array.isArray(target)
      ? Number(key) < target.length  // 数组：判断索引是否存在
      : Object.prototype.hasOwnProperty.call(target, key)  // 对象：判断属性是否存在
    
    const result = Reflect.set(target, key, value, receiver)
    
    // 如果是数组
    if (Array.isArray(target)) {
      if (key === 'length') {
        // 修改 length 时，触发所有大于等于新 length 的索引依赖
        const newLength = Number(value)
        trigger(target, 'length')
      } else if (!hadKey) {
        // 新增索引，触发 length 的依赖
        trigger(target, 'length')
      }
    }
    
    // 触发当前 key 的依赖
    if (!hadKey) {
      trigger(target, key, 'add')
    } else if (value !== oldValue) {
      trigger(target, key, 'set')
    }
    
    return result
  }
}
```

**为什么这样做:**
1. **索引新增**：当设置一个不存在的索引时（如 `arr[10] = 1`），数组的 length 会改变，需要触发 length 的依赖
2. **length 修改**：当直接修改 length 时（如 `arr.length = 0`），会删除部分元素，需要触发相关索引的依赖

**预期结果:**
现在数组的索引操作和 length 操作能够正确触发相关依赖。

#### 步骤4: 添加 toRaw 辅助函数 (预估5分钟)

**要做什么:**
添加获取原始对象的辅助函数。

**如何操作:**
1. 在 `src/reactivity/reactive.ts` 中添加:

```typescript
// 存储原始对象到响应式对象的映射
const reactiveMap = new WeakMap()

// 在 createReactiveObject 函数中保存映射
function createReactiveObject(target: object) {
  // 如果已经是响应式对象，直接返回
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  const proxy = new Proxy(target, {
    get: createGetter(),
    set: createSetter()
  })
  
  // 保存映射关系
  reactiveMap.set(target, proxy)
  
  return proxy
}

/**
 * 获取响应式对象的原始对象
 */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any).__v_raw
  return raw ? toRaw(raw) : observed
}
```

2. 在 get 陷阱中添加特殊属性：

```typescript
function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    // 访问 __v_raw 返回原始对象
    if (key === '__v_raw') {
      return target
    }
    
    // ... 其他逻辑
  }
}
```

**为什么这样做:**
有时我们需要访问响应式对象的原始版本，特别是在查找操作中（如 includes）。

**预期结果:**
可以通过 `toRaw()` 获取响应式对象的原始对象。

### 完整代码参考

<details>
<summary>点击查看 src/reactivity/effect.ts 的完整代码</summary>

```typescript
type EffectFn = () => void

let activeEffect: EffectFn | undefined
let shouldTrack = true

export function effect(fn: EffectFn) {
  activeEffect = fn
  fn()
  activeEffect = undefined
}

export function pauseTracking() {
  shouldTrack = false
}

export function enableTracking() {
  shouldTrack = true
}

const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>()

export function track(target: object, key: string | symbol) {
  if (!activeEffect || !shouldTrack) {
    return
  }

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  dep.add(activeEffect)
}

export function trigger(target: object, key: string | symbol, type?: 'set' | 'add') {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }

  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}
```
</details>

<details>
<summary>点击查看 src/reactivity/reactive.ts 的完整代码</summary>

```typescript
import { track, trigger, pauseTracking, enableTracking } from './effect'

const reactiveMap = new WeakMap<object, any>()

const arrayInstrumentations: Record<string, Function> = {}

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  const method = Array.prototype[key as keyof Array<any>]
  arrayInstrumentations[key] = function(this: any[], ...args: any[]) {
    pauseTracking()
    const res = method.apply(this, args)
    enableTracking()
    return res
  }
})

;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  const method = Array.prototype[key as keyof Array<any>]
  arrayInstrumentations[key] = function(this: any[], ...args: any[]) {
    const res = method.apply(this, args)
    if (res === false || res === -1) {
      return method.apply(toRaw(this), args)
    }
    return res
  }
})

function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    if (key === '__v_raw') {
      return target
    }

    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)
    track(target, key)
    return res
  }
}

function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    const oldValue = (target as any)[key]
    const hadKey = Array.isArray(target)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key)

    const result = Reflect.set(target, key, value, receiver)

    if (Array.isArray(target)) {
      if (key === 'length') {
        trigger(target, 'length')
      } else if (!hadKey) {
        trigger(target, 'length')
      }
    }

    if (!hadKey) {
      trigger(target, key, 'add')
    } else if (value !== oldValue) {
      trigger(target, key, 'set')
    }

    return result
  }
}

function createReactiveObject(target: object) {
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const proxy = new Proxy(target, {
    get: createGetter(),
    set: createSetter()
  })

  reactiveMap.set(target, proxy)
  return proxy
}

export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target) as T
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any).__v_raw
  return raw ? toRaw(raw) : observed
}
```
</details>

### 调试技巧

1. **追踪执行流程**
```typescript
// 在关键位置添加 console.log
function set(target, key, value, receiver) {
  console.log('set:', { target, key, value, isArray: Array.isArray(target) })
  // ...
}
```

2. **检查依赖收集**
```typescript
// 查看某个对象的依赖映射
console.log('targetMap:', targetMap.get(arr))
```

3. **验证 shouldTrack 状态**
```typescript
function track(target, key) {
  console.log('track:', { key, shouldTrack, activeEffect: !!activeEffect })
  // ...
}
```

### 验收标准
- [ ] 所有测试用例通过
- [ ] 数组的索引访问能正确触发依赖
- [ ] 数组的 length 属性能正确触发依赖
- [ ] 数组方法（push、pop 等）能正常工作
- [ ] 在 effect 中调用数组方法不会无限递归
- [ ] 代码有清晰的注释
- [ ] 理解数组响应式的核心原理

---

## 🤔 思考题

### 问题1: 为什么数组的 push 方法会导致无限递归？
**提示**: 思考 push 方法的执行过程中会读写哪些属性。

### 问题2: Vue 3 为什么不拦截所有的数组方法？
**提示**: 考虑 forEach、map、filter 等方法的特点，它们是否需要特殊处理？

### 问题3: 如何优化数组的大量元素访问？
**提示**: 如果一个数组有 10000 个元素，forEach 会收集 10000 个依赖，如何优化？

---

## 📝 学习总结

完成今天的学习后，请回答以下问题：

1. **今天学到的核心知识点是什么？**
   - 

2. **遇到了哪些困难？如何解决的？**
   - 

3. **有哪些新的思考和疑问？**
   - 

4. **如何将今天的知识应用到实际项目中？**
   - 

---

## 📖 扩展阅读

- [MDN - Array](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array) - 阅读时间: 30分钟
- [V8 数组优化](https://v8.dev/blog/elements-kinds) - 阅读时间: 20分钟
- [Vue 3 源码 - reactive/baseHandlers.ts](../../.book_refe/core/packages/reactivity/src/baseHandlers.ts) - 推荐章节: arrayInstrumentations

---

## ⏭️ 明日预告

明天我们将学习: **响应式系统的单元测试和边界情况处理**

主要内容:
- 编写完整的测试套件
- 处理循环引用
- 处理原型链
- 性能测试

建议预习: Vitest 测试框架的基本用法
