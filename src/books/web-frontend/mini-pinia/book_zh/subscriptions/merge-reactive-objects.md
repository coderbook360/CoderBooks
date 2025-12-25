---
sidebar_position: 48
title: mergeReactiveObjects 工具函数
---

# mergeReactiveObjects 工具函数

`mergeReactiveObjects` 是 $patch 对象模式的核心工具，负责将新状态合并到响应式对象中。本章详细实现这个函数。

## 问题背景

直接赋值会破坏响应式连接：

```javascript
const state = reactive({ user: { name: 'John' } })

// ❌ 错误：替换整个对象，断开响应式
state.user = { name: 'Jane', age: 25 }

// ✅ 正确：保持原对象，只修改属性
Object.assign(state.user, { name: 'Jane', age: 25 })
```

`mergeReactiveObjects` 解决这个问题：智能合并，保持响应式。

## 基本实现

```javascript
function mergeReactiveObjects(target, source) {
  for (const key in source) {
    // 跳过 undefined
    if (source[key] === undefined) continue
    
    const sourceValue = source[key]
    const targetValue = target[key]
    
    // 处理 ref
    if (isRef(targetValue) && !isRef(sourceValue)) {
      targetValue.value = sourceValue
      continue
    }
    
    // 递归合并普通对象
    if (
      isPlainObject(targetValue) &&
      isPlainObject(sourceValue) &&
      !isRef(targetValue) &&
      !isReactive(targetValue)
    ) {
      mergeReactiveObjects(targetValue, sourceValue)
      continue
    }
    
    // 直接赋值
    target[key] = sourceValue
  }
  
  return target
}
```

## 判断普通对象

```javascript
function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

// 测试
isPlainObject({})           // true
isPlainObject({ a: 1 })     // true
isPlainObject([])           // false
isPlainObject(new Date())   // false
isPlainObject(null)         // false
```

## 处理不同类型

### 基本类型

```javascript
const state = reactive({ count: 0, name: '' })

mergeReactiveObjects(state, { count: 10, name: 'Test' })

console.log(state.count)  // 10
console.log(state.name)   // 'Test'
```

### ref 值

```javascript
// Setup Store 中的 ref
const count = ref(0)
const state = { count }  // 代理对象

mergeReactiveObjects(state, { count: 10 })

// 应该设置 ref.value，而不是替换 ref
console.log(count.value)  // 10
```

实现：

```javascript
if (isRef(targetValue) && !isRef(sourceValue)) {
  // target 是 ref，source 是普通值
  // 设置 ref.value
  targetValue.value = sourceValue
  continue
}
```

### 嵌套对象

```javascript
const state = reactive({
  user: {
    profile: {
      name: '',
      avatar: ''
    }
  }
})

mergeReactiveObjects(state, {
  user: {
    profile: {
      name: 'John'
      // avatar 保持不变
    }
  }
})

console.log(state.user.profile.name)    // 'John'
console.log(state.user.profile.avatar)  // ''（保持原值）
```

### 数组

```javascript
const state = reactive({
  items: [1, 2, 3]
})

// 数组整体替换
mergeReactiveObjects(state, {
  items: [4, 5, 6]
})

console.log(state.items)  // [4, 5, 6]
```

注意：数组不递归合并，而是整体替换。

### reactive 对象

```javascript
const user = reactive({ name: 'John' })
const state = reactive({ user })

// reactive 对象整体替换
mergeReactiveObjects(state, {
  user: { name: 'Jane', age: 25 }
})

// state.user 变成新对象
console.log(state.user.name)  // 'Jane'
console.log(state.user.age)   // 25
```

## 边界情况

### null 值

```javascript
mergeReactiveObjects(state, { field: null })
// field 被设置为 null
```

### undefined 值

```javascript
mergeReactiveObjects(state, { field: undefined })
// field 保持原值（跳过 undefined）
```

### 新增属性

```javascript
const state = reactive({ existing: 1 })

mergeReactiveObjects(state, { newProp: 'value' })

console.log(state.newProp)  // 'value'（Vue 自动追踪）
```

### 删除属性

$patch 对象模式不支持删除：

```javascript
// 需要删除属性，使用函数模式
store.$patch(state => {
  delete state.obsoleteField
})
```

## 与 Object.assign 的区别

```javascript
const target = { a: { b: 1, c: 2 } }

// Object.assign：浅拷贝，替换嵌套对象
Object.assign(target, { a: { b: 10 } })
// target.a = { b: 10 }，c 丢失

// mergeReactiveObjects：深度合并
mergeReactiveObjects(target, { a: { b: 10 } })
// target.a = { b: 10, c: 2 }，c 保留
```

## 完整实现

```javascript
import { isRef, isReactive } from 'vue'

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function mergeReactiveObjects(target, source) {
  for (const key in source) {
    const sourceValue = source[key]
    
    // 跳过 undefined
    if (sourceValue === undefined) {
      continue
    }
    
    const targetValue = target[key]
    
    // 情况 1：target 是 ref，source 不是
    if (isRef(targetValue) && !isRef(sourceValue)) {
      targetValue.value = sourceValue
      continue
    }
    
    // 情况 2：两边都是普通对象，递归合并
    if (
      isPlainObject(targetValue) &&
      isPlainObject(sourceValue) &&
      target.hasOwnProperty(key) &&
      !isRef(targetValue) &&
      !isReactive(targetValue)
    ) {
      mergeReactiveObjects(targetValue, sourceValue)
      continue
    }
    
    // 情况 3：直接赋值（数组、reactive、基本类型等）
    target[key] = sourceValue
  }
  
  return target
}

export { mergeReactiveObjects }
```

## 在 $patch 中的使用

```javascript
function $patch(partialStateOrMutator) {
  if (typeof partialStateOrMutator === 'function') {
    partialStateOrMutator(pinia.state.value[id])
  } else {
    // 使用 mergeReactiveObjects 合并
    mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
  }
  
  // 触发订阅...
}
```

## 测试用例

```javascript
describe('mergeReactiveObjects', () => {
  test('merges basic properties', () => {
    const target = reactive({ a: 1, b: 2 })
    mergeReactiveObjects(target, { a: 10, c: 3 })
    
    expect(target.a).toBe(10)
    expect(target.b).toBe(2)
    expect(target.c).toBe(3)
  })
  
  test('deep merges nested objects', () => {
    const target = reactive({
      user: { name: 'John', age: 25 }
    })
    
    mergeReactiveObjects(target, {
      user: { name: 'Jane' }
    })
    
    expect(target.user.name).toBe('Jane')
    expect(target.user.age).toBe(25)  // 保留
  })
  
  test('sets ref.value for ref targets', () => {
    const count = ref(0)
    const target = { count }
    
    mergeReactiveObjects(target, { count: 10 })
    
    expect(count.value).toBe(10)
    expect(target.count).toBe(count)  // 仍是同一个 ref
  })
  
  test('replaces arrays', () => {
    const target = reactive({ items: [1, 2, 3] })
    
    mergeReactiveObjects(target, { items: [4, 5] })
    
    expect(target.items).toEqual([4, 5])
  })
  
  test('skips undefined values', () => {
    const target = reactive({ a: 1, b: 2 })
    
    mergeReactiveObjects(target, { a: undefined, b: 20 })
    
    expect(target.a).toBe(1)  // 保留原值
    expect(target.b).toBe(20)
  })
  
  test('sets null values', () => {
    const target = reactive({ a: 1 })
    
    mergeReactiveObjects(target, { a: null })
    
    expect(target.a).toBe(null)
  })
  
  test('handles deeply nested structures', () => {
    const target = reactive({
      level1: {
        level2: {
          level3: {
            value: 'original'
          }
        }
      }
    })
    
    mergeReactiveObjects(target, {
      level1: {
        level2: {
          level3: {
            value: 'updated'
          }
        }
      }
    })
    
    expect(target.level1.level2.level3.value).toBe('updated')
  })
  
  test('replaces reactive nested objects', () => {
    const nested = reactive({ x: 1 })
    const target = reactive({ nested })
    
    mergeReactiveObjects(target, {
      nested: { x: 10, y: 20 }
    })
    
    // reactive 对象被替换
    expect(target.nested.x).toBe(10)
    expect(target.nested.y).toBe(20)
  })
})
```

## 性能考量

对于大型对象，递归合并可能有性能影响：

```javascript
// 性能优化：限制递归深度
function mergeReactiveObjects(target, source, maxDepth = 10, depth = 0) {
  if (depth >= maxDepth) {
    Object.assign(target, source)
    return target
  }
  
  for (const key in source) {
    // ... 递归时传入 depth + 1
    mergeReactiveObjects(targetValue, sourceValue, maxDepth, depth + 1)
  }
  
  return target
}
```

## 本章小结

本章实现了 mergeReactiveObjects：

- **核心功能**：智能合并状态，保持响应式
- **ref 处理**：设置 ref.value 而不是替换
- **深度合并**：递归处理嵌套普通对象
- **数组处理**：整体替换而非合并
- **边界情况**：null/undefined、新增属性

下一章讨论订阅函数的管理与清理。
