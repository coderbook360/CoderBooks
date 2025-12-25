---
sidebar_position: 50
title: storeToRefs 实现：响应式解构
---

# storeToRefs 实现：响应式解构

直接解构 Store 会丢失响应式，`storeToRefs` 解决了这个问题。本章详细实现这个重要的辅助函数。

## 问题：解构丢失响应式

```javascript
const store = useCounterStore()

// ❌ 解构后丢失响应式
const { count, name } = store
console.log(count)  // 0
store.count = 10
console.log(count)  // 仍然是 0！

// 因为解构得到的是值，不是响应式引用
```

## storeToRefs 的作用

```javascript
import { storeToRefs } from 'pinia'

const store = useCounterStore()

// ✅ 保持响应式
const { count, name } = storeToRefs(store)
console.log(count.value)  // 0

store.count = 10
console.log(count.value)  // 10（响应式更新）
```

## 基本实现

```javascript
import { toRef, isRef, isReactive } from 'vue'

function storeToRefs(store) {
  const refs = {}
  
  for (const key in store) {
    const value = store[key]
    
    // 跳过函数（actions）
    if (typeof value === 'function') {
      continue
    }
    
    // 跳过内部属性
    if (key.startsWith('$') || key.startsWith('_')) {
      continue
    }
    
    // 创建 ref
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}
```

## toRef 的作用

`toRef` 创建一个连接到源对象属性的 ref：

```javascript
const store = reactive({ count: 0 })

const countRef = toRef(store, 'count')

// 双向连接
countRef.value = 10
console.log(store.count)  // 10

store.count = 20
console.log(countRef.value)  // 20
```

## 处理不同类型

### state（ref）

```javascript
// Setup Store
const count = ref(0)

// storeToRefs 返回
const { count } = storeToRefs(store)
// count 是一个连接到 store.count 的 ref
```

### state（reactive）

```javascript
// Setup Store
const user = reactive({ name: '', age: 0 })

// storeToRefs 返回
const { user } = storeToRefs(store)
// user 是一个 ref，其 .value 是原始 reactive 对象
```

### getters（computed）

```javascript
// Setup Store
const double = computed(() => count.value * 2)

// storeToRefs 返回
const { double } = storeToRefs(store)
// double 是一个 ref，连接到 computed
```

### actions（跳过）

```javascript
// 函数不需要 ref 化
const { increment } = storeToRefs(store)
// increment 是 undefined

// actions 直接解构即可
const { increment } = store
```

## 完整实现

```javascript
import { isRef, isReactive, toRaw, toRef } from 'vue'

function storeToRefs(store) {
  // 获取原始对象（跳过 reactive 包装）
  const rawStore = toRaw(store)
  
  const refs = {}
  
  for (const key in rawStore) {
    const value = rawStore[key]
    
    // 跳过函数
    if (typeof value === 'function') {
      continue
    }
    
    // 只处理 ref 和 reactive（包括 computed）
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}

export { storeToRefs }
```

## 为什么使用 toRaw？

```javascript
const store = reactive({ ... })

// 直接遍历 store 会触发响应式追踪
for (const key in store) { ... }

// 使用 toRaw 避免不必要的追踪
for (const key in toRaw(store)) { ... }
```

## 与 toRefs 的区别

Vue 自带 `toRefs`，但对 Store 不完全适用：

```javascript
import { toRefs } from 'vue'

// toRefs 会处理所有属性
const refs = toRefs(store)
// 包括 actions，可能导致问题

// storeToRefs 专门为 Store 设计
const refs = storeToRefs(store)
// 只处理 state 和 getters，跳过 actions
```

## 使用模式

### 在组件中

```javascript
export default {
  setup() {
    const store = useCounterStore()
    
    // 解构 state 和 getters
    const { count, double } = storeToRefs(store)
    
    // 解构 actions（不需要 storeToRefs）
    const { increment, decrement } = store
    
    return { count, double, increment, decrement }
  }
}
```

### 在模板中

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ double }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()
const { count, double } = storeToRefs(store)
const { increment } = store
</script>
```

## 注意事项

### 不要对 actions 使用

```javascript
// ❌ 错误用法
const { count, increment } = storeToRefs(store)
increment.value()  // increment 是 undefined

// ✅ 正确用法
const { count } = storeToRefs(store)
const { increment } = store
```

### 修改仍然是响应式的

```javascript
const { count } = storeToRefs(store)

// 可以直接修改
count.value = 10

// 等同于
store.count = 10
```

### $state 不包含

```javascript
const refs = storeToRefs(store)

// $state 等内部属性被跳过
console.log('$state' in refs)  // false
```

## 测试用例

```javascript
describe('storeToRefs', () => {
  test('creates refs for state properties', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0, name: 'Test' })
    })
    
    const store = useStore()
    const { count, name } = storeToRefs(store)
    
    expect(isRef(count)).toBe(true)
    expect(isRef(name)).toBe(true)
    expect(count.value).toBe(0)
    expect(name.value).toBe('Test')
  })
  
  test('refs are connected to store', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const { count } = storeToRefs(store)
    
    // 修改 ref 影响 store
    count.value = 10
    expect(store.count).toBe(10)
    
    // 修改 store 影响 ref
    store.count = 20
    expect(count.value).toBe(20)
  })
  
  test('includes getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    const { double } = storeToRefs(store)
    
    expect(isRef(double)).toBe(true)
    expect(double.value).toBe(0)
    
    store.count = 5
    expect(double.value).toBe(10)
  })
  
  test('excludes actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() { this.count++ }
      }
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect('increment' in refs).toBe(false)
  })
  
  test('excludes $ and _ properties', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect('$id' in refs).toBe(false)
    expect('$state' in refs).toBe(false)
    expect('$patch' in refs).toBe(false)
  })
  
  test('works with setup stores', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      const increment = () => count.value++
      
      return { count, double, increment }
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect('count' in refs).toBe(true)
    expect('double' in refs).toBe(true)
    expect('increment' in refs).toBe(false)
  })
})
```

## 本章小结

本章实现了 storeToRefs：

- **核心功能**：保持解构后的响应式
- **实现原理**：使用 toRef 创建连接
- **处理类型**：state 和 getters，跳过 actions
- **使用场景**：组件中解构 Store
- **注意事项**：actions 直接解构即可

下一章实现 mapStores。
