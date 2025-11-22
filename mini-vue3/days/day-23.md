# Day 23: ref 的实现原理  

> 学习日期: 2025-12-15
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 理解 ref 的设计思想和使用场景
- [ ] 实现基础的 ref 函数
- [ ] 理解 ref 和 reactive 的区别
- [ ] 实现 shallowRef

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. 为什么需要 ref？

#### 1.1 reactive 的局限性

**reactive 只能用于对象类型**：

```javascript
// ✅ 可以
const state = reactive({ count: 0 })

// ❌ 不可以
const count = reactive(0)  // 基本类型无法被 Proxy 代理
const name = reactive('Vue')  // 字符串无法代理
```

**解构会失去响应性**：

```javascript
const state = reactive({ count: 0, name: 'Vue' })

// ❌ 解构后失去响应性
let { count, name } = state

effect(() => {
  console.log(count)  // count 不是响应式的
})

count = 1  // 不会触发 effect
```

#### 1.2 ref 的解决方案

**ref 将基本类型包装成对象**：

```javascript
// ref 创建一个包装对象
const count = ref(0)

console.log(count.value)  // 0

// 修改
count.value = 1  // 触发响应式

// 原理：
class RefImpl {
  _value: any
  
  get value() {
    track(this, 'value')
    return this._value
  }
  
  set value(newVal) {
    this._value = newVal
    trigger(this, 'value')
  }
}
```

**ref 的核心思想**：

```
基本类型 -> 包装成对象 -> 通过 .value 访问 -> 拦截 get/set -> 响应式

  0  ->  { value: 0 }  ->  count.value  ->  track/trigger  ->  响应式
```

#### 1.3 ref vs reactive 对比

| 特性 | ref | reactive |
|------|-----|----------|
| 数据类型 | 任意类型 | 只能是对象 |
| 访问方式 | `.value` | 直接访问属性 |
| 解构 | 不会失去响应性（配合 toRefs） | 会失去响应性 |
| 实现原理 | class + get/set | Proxy |
| 使用场景 | 单个值、基本类型 | 对象、复杂数据结构 |

```javascript
// ref - 适合单个值
const count = ref(0)
const name = ref('Vue')
count.value++

// reactive - 适合对象
const state = reactive({
  count: 0,
  user: {
    name: 'Vue',
    age: 3
  }
})
state.count++
```

#### 1.4 ref 的自动解包

**在模板中自动解包**：

```vue
<script setup>
const count = ref(0)
</script>

<template>
  <!-- 模板中自动解包，不需要 .value -->
  <div>{{ count }}</div>
  
  <!-- 等价于 -->
  <div>{{ count.value }}</div>
</template>
```

**在 reactive 中自动解包**：

```javascript
const count = ref(0)
const state = reactive({
  count  // ref 作为 reactive 的属性，会自动解包
})

console.log(state.count)  // 0（不需要 .value）
state.count++  // 等价于 count.value++

// 但数组和 Map 不会自动解包
const arr = reactive([ref(0)])
console.log(arr[0].value)  // 需要 .value
```

---

## 💻 实践任务

### 任务目标
实现 ref 函数，支持基本类型和对象类型的响应式。

### 测试用例

创建 `test/reactivity/ref.spec.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { ref, effect, reactive } from '../../src/reactivity'

describe('ref', () => {
  it('应该创建基本类型的 ref', () => {
    const count = ref(0)
    expect(count.value).toBe(0)
    
    count.value = 1
    expect(count.value).toBe(1)
  })
  
  it('应该是响应式的', () => {
    const count = ref(0)
    let dummy
    
    effect(() => {
      dummy = count.value
    })
    
    expect(dummy).toBe(0)
    
    count.value = 1
    expect(dummy).toBe(1)
  })
  
  it('应该支持对象类型', () => {
    const obj = ref({ count: 0 })
    let dummy
    
    effect(() => {
      dummy = obj.value.count
    })
    
    expect(dummy).toBe(0)
    
    obj.value.count = 1
    expect(dummy).toBe(1)
  })
  
  it('应该有 __v_isRef 标识', () => {
    const count = ref(0)
    expect(count.__v_isRef).toBe(true)
  })
  
  it('在 reactive 中应该自动解包', () => {
    const count = ref(0)
    const state = reactive({ count })
    
    expect(state.count).toBe(0)
    
    count.value = 1
    expect(state.count).toBe(1)
    
    state.count = 2
    expect(count.value).toBe(2)
  })
})
```

### 实现步骤

#### 步骤1: 创建 RefImpl 类 (预估10分钟)

创建 `src/reactivity/ref.ts`：

```typescript
import { track, trigger } from './effect'
import { isObject } from './shared'
import { reactive } from './reactive'

/**
 * Ref 实现类
 */
class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public readonly __v_isRef = true
  
  constructor(value: T) {
    // 保存原始值
    this._rawValue = value
    // 如果值是对象，转换为 reactive
    this._value = isObject(value) ? reactive(value as any) : value
  }
  
  get value() {
    // 追踪依赖
    track(this, 'value')
    return this._value
  }
  
  set value(newVal) {
    // 判断值是否改变
    if (Object.is(newVal, this._rawValue)) {
      return
    }
    
    // 更新值
    this._rawValue = newVal
    this._value = isObject(newVal) ? reactive(newVal as any) : newVal
    
    // 触发依赖
    trigger(this, 'value')
  }
}

/**
 * 创建一个 ref
 */
export function ref<T>(value: T) {
  return new RefImpl(value)
}

/**
 * 判断是否是 ref
 */
export function isRef(value: unknown): value is RefImpl<any> {
  return !!(value && (value as any).__v_isRef)
}
```

**为什么这样实现**：

1. **包装对象**：使用 class 创建包装对象，通过 get/set 拦截访问
2. **对象值转 reactive**：如果 value 是对象，转换为 reactive，实现深度响应式
3. **保存原始值**：`_rawValue` 用于值比较，避免不必要的更新
4. **标识符**：`__v_isRef` 用于判断是否是 ref

#### 步骤2: 添加辅助函数 (预估5分钟)

在 `src/reactivity/shared/index.ts` 中添加：

```typescript
/**
 * 判断是否是对象
 */
export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
```

#### 步骤3: 实现 ref 在 reactive 中的自动解包 (预估10分钟)

修改 `src/reactivity/reactive.ts`，在 get 陷阱中添加自动解包：

```typescript
import { isRef } from './ref'

function createGetter() {
  return function get(target: object, key: string | symbol, receiver: object) {
    // ... 其他逻辑
    
    const res = Reflect.get(target, key, receiver)
    
    // 只追踪自身属性
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      track(target, key)
    }
    
    // ref 自动解包（只在对象中，数组不解包）
    if (isRef(res) && !Array.isArray(target)) {
      return res.value
    }
    
    // 如果返回值是对象，递归代理
    if (isObject(res)) {
      return reactive(res)
    }
    
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
    // 获取旧值
    const oldValue = (target as any)[key]
    
    // 如果旧值是 ref，设置新值时自动解包
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    }
    
    // ... 其他逻辑
    
    const result = Reflect.set(target, key, value, receiver)
    
    // 触发更新
    if (!hadKey) {
      trigger(target, key, 'add')
    } else if (value !== oldValue) {
      trigger(target, key, 'set')
    }
    
    return result
  }
}
```

#### 步骤4: 实现 shallowRef (预估5分钟)

在 `src/reactivity/ref.ts` 中添加：

```typescript
/**
 * 浅层 ref，不会对对象进行 reactive 转换
 */
class ShallowRefImpl<T> {
  private _value: T
  public readonly __v_isRef = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value() {
    track(this, 'value')
    return this._value
  }
  
  set value(newVal) {
    if (Object.is(newVal, this._value)) {
      return
    }
    
    this._value = newVal
    trigger(this, 'value')
  }
}

export function shallowRef<T>(value: T) {
  return new ShallowRefImpl(value)
}
```

**shallowRef vs ref**：

```javascript
// ref - 深层响应式
const state = ref({
  nested: { count: 0 }
})

effect(() => {
  console.log(state.value.nested.count)
})

state.value.nested.count++  // ✅ 触发 effect

// shallowRef - 浅层响应式
const state = shallowRef({
  nested: { count: 0 }
})

effect(() => {
  console.log(state.value.nested.count)
})

state.value.nested.count++  // ❌ 不触发 effect
state.value = { nested: { count: 1 } }  // ✅ 触发 effect
```

### 完整代码参考

<details>
<summary>点击查看完整代码</summary>

```typescript
// src/reactivity/ref.ts
import { track, trigger } from './effect'
import { isObject } from './shared'
import { reactive } from './reactive'

class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public readonly __v_isRef = true
  
  constructor(value: T) {
    this._rawValue = value
    this._value = isObject(value) ? reactive(value as any) : value
  }
  
  get value() {
    track(this, 'value')
    return this._value
  }
  
  set value(newVal) {
    if (Object.is(newVal, this._rawValue)) {
      return
    }
    
    this._rawValue = newVal
    this._value = isObject(newVal) ? reactive(newVal as any) : newVal
    trigger(this, 'value')
  }
}

class ShallowRefImpl<T> {
  private _value: T
  public readonly __v_isRef = true
  
  constructor(value: T) {
    this._value = value
  }
  
  get value() {
    track(this, 'value')
    return this._value
  }
  
  set value(newVal) {
    if (Object.is(newVal, this._value)) {
      return
    }
    
    this._value = newVal
    trigger(this, 'value')
  }
}

export function ref<T>(value: T) {
  return new RefImpl(value)
}

export function shallowRef<T>(value: T) {
  return new ShallowRefImpl(value)
}

export function isRef(value: unknown): value is RefImpl<any> {
  return !!(value && (value as any).__v_isRef)
}
```
</details>

---

## 🤔 思考题

### 问题1: 为什么 ref 需要 .value 访问？能不能设计成不需要 .value？
**提示**: 考虑 JavaScript 的语言特性和 Proxy 的限制。

### 问题2: ref 包装的对象和 reactive 创建的对象有什么区别？
**提示**: 考虑访问方式和使用场景。

### 问题3: 如何实现一个自定义的 ref？
**提示**: Vue 3 提供了 customRef API。

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

- [Vue 3 ref API 文档](https://cn.vuejs.org/api/reactivity-core.html#ref) - 阅读时间: 15分钟
- [Vue 3 源码 - ref.ts](../../.book_refe/core/packages/reactivity/src/ref.ts) - 阅读时间: 30分钟
- [为什么需要 ref](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html#为什么需要-ref) - 阅读时间: 10分钟

---

## ⏭️ 明日预告

明天我们将学习: **reactive vs ref 深度对比**

主要内容:
- reactive 和 ref 的选择策略
- 各自的优缺点
- 实际项目中的最佳实践
- 性能对比

建议预习: 回顾 reactive 的实现
