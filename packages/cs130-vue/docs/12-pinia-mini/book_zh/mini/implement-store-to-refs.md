# 实现 storeToRefs

`storeToRefs` 从 Store 中提取响应式引用。这一章实现这个辅助函数。

## storeToRefs 特性

- 提取 state 和 getters 为 ref
- 跳过 actions 和内部属性
- 保持响应式连接
- 支持解构使用

## 为什么需要 storeToRefs

直接解构 store 会丢失响应式：

```typescript
const store = useCounterStore()

// ❌ 丢失响应式
const { count, double } = store
count  // 不再是响应式

// ✅ 保持响应式
const { count, double } = storeToRefs(store)
count.value  // 仍是响应式
```

## 基本用法

```typescript
import { storeToRefs } from 'pinia'

const store = useCounterStore()
const { count, double } = storeToRefs(store)
const { increment } = store  // actions 直接解构

// 在模板中使用
// {{ count }} {{ double }}
```

## 实现原理

遍历 store 属性，将 state 和 getters 转为 ref：

```typescript
import { toRef, isRef, isReactive } from 'vue'

function storeToRefs(store) {
  const refs = {}
  
  for (const key in store) {
    const value = store[key]
    
    // 跳过函数（actions）
    if (typeof value === 'function') continue
    
    // 跳过内部属性
    if (key.startsWith('$')) continue
    
    // 转为 ref
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}
```

## 完整实现

```typescript
// src/storeToRefs.ts
import { toRef, isRef, isReactive, ToRefs } from 'vue'
import type { Store, StateTree } from './types'

/**
 * 从 Store 提取 state 和 getters 的 ref
 * 跳过 actions 和 $ 开头的内部属性
 */
export function storeToRefs<S extends StateTree>(
  store: Store<S>
): ToRefs<S> {
  // 使用 raw store 避免触发 getter
  const rawStore = toRaw(store)
  const refs: Record<string, any> = {}
  
  for (const key in rawStore) {
    const value = rawStore[key]
    
    // 跳过函数（actions 和方法）
    if (typeof value === 'function') {
      continue
    }
    
    // 跳过内部属性（$id, $patch 等）
    if (key.startsWith('$') || key.startsWith('_')) {
      continue
    }
    
    // 只处理响应式值
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs as ToRefs<S>
}

import { toRaw } from 'vue'
```

## 处理不同类型

### State（reactive）

```typescript
const useStore = defineStore('test', {
  state: () => ({ count: 0 })
})

const store = useStore()
// store.count 是 reactive 的属性
// storeToRefs 将其转为 ref
const { count } = storeToRefs(store)
count.value++  // 修改同步到 store
```

### Getters（computed）

```typescript
const useStore = defineStore('test', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  }
})

const store = useStore()
// store.double 是 computed
const { double } = storeToRefs(store)
// double 是只读 ref
console.log(double.value)
```

### Actions（跳过）

```typescript
const { count } = storeToRefs(store)
const { increment } = store  // actions 直接从 store 解构
```

## toRef vs toRefs

Vue 提供两个函数：

```typescript
// toRef：创建单个 ref
const countRef = toRef(store, 'count')

// toRefs：创建所有属性的 ref
const { count, name } = toRefs(store)
```

storeToRefs 类似 toRefs，但专门针对 Store：
- 跳过函数
- 跳过 $ 开头的属性
- 只处理响应式值

## 测试

```typescript
// tests/storeToRefs.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'
import { storeToRefs } from '../src/storeToRefs'
import { isRef, nextTick } from 'vue'

describe('storeToRefs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should extract state as refs', () => {
    const useStore = defineStore('test', {
      state: () => ({
        count: 0,
        name: 'test'
      })
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect(isRef(refs.count)).toBe(true)
    expect(isRef(refs.name)).toBe(true)
    expect(refs.count.value).toBe(0)
    expect(refs.name.value).toBe('test')
  })
  
  it('should extract getters as refs', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect(isRef(refs.double)).toBe(true)
    expect(refs.double.value).toBe(4)
  })
  
  it('should skip actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect(refs.increment).toBeUndefined()
  })
  
  it('should skip $ prefixed properties', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect(refs.$id).toBeUndefined()
    expect(refs.$patch).toBeUndefined()
    expect(refs.$reset).toBeUndefined()
  })
  
  it('should maintain reactivity', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const { count } = storeToRefs(store)
    
    // 修改 ref 应该同步到 store
    count.value = 10
    expect(store.count).toBe(10)
    
    // 修改 store 应该同步到 ref
    store.count = 20
    expect(count.value).toBe(20)
  })
  
  it('should work with computed getters reactively', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 1 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    const { count, double } = storeToRefs(store)
    
    expect(double.value).toBe(2)
    
    count.value = 5
    await nextTick()
    
    expect(double.value).toBe(10)
  })
  
  it('should work with setup store', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      const increment = () => count.value++
      
      return { count, double, increment }
    })
    
    const store = useStore()
    const refs = storeToRefs(store)
    
    expect(isRef(refs.count)).toBe(true)
    expect(isRef(refs.double)).toBe(true)
    expect(refs.increment).toBeUndefined()
  })
})

import { ref, computed } from 'vue'
```

## 使用场景

### 1. 组件中解构

```typescript
// 在 setup 中
const store = useCounterStore()
const { count, double } = storeToRefs(store)
const { increment, decrement } = store

return { count, double, increment, decrement }
```

### 2. 组合式函数

```typescript
function useCounter() {
  const store = useCounterStore()
  const { count } = storeToRefs(store)
  const { increment } = store
  
  return { count, increment }
}
```

### 3. 选择性提取

```typescript
// 只需要部分属性
const store = useUserStore()
const { name, email } = storeToRefs(store)
// 其他属性不会被提取
```

## 注意事项

### 1. Getter 是只读的

```typescript
const { double } = storeToRefs(store)
double.value = 10  // ❌ 警告：computed 是只读的
```

### 2. 嵌套对象

```typescript
const useStore = defineStore('test', {
  state: () => ({
    user: { name: 'John' }
  })
})

const { user } = storeToRefs(store)
// user 是整个对象的 ref
user.value.name = 'Jane'  // ✅ 有效
```

下一章我们实现插件系统。
