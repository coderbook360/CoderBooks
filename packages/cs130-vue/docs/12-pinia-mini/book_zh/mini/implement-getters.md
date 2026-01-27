# 实现 Getters

Getters 是基于 State 的计算属性。这一章实现 Getters 机制。

## Getters 特性

- 基于 State 计算
- 自动缓存
- 响应式更新
- 可以访问其他 Getters

## Options Store Getters

```typescript
getters: {
  // 接收 state 参数
  double: (state) => state.count * 2,
  
  // 使用 this 访问其他 getter
  quadruple() {
    return this.double * 2
  }
}
```

## 实现原理

使用 Vue 的 computed 实现：

```typescript
import { computed } from 'vue'

function createGetters(
  getters: Record<string, Function>,
  state: StateTree,
  store: Store
) {
  const computedGetters: Record<string, any> = {}
  
  for (const key in getters) {
    const getter = getters[key]
    
    // 使用 computed 创建缓存的计算属性
    computedGetters[key] = computed(() => {
      // getter 可以接收 state，也可以使用 this
      return getter.call(store, state)
    })
  }
  
  return computedGetters
}
```

## 代理到 Store

```typescript
function proxyGettersToStore(
  store: Store,
  computedGetters: Record<string, ComputedRef>
) {
  for (const key in computedGetters) {
    Object.defineProperty(store, key, {
      get() {
        // 返回 computed 的值
        return computedGetters[key].value
      },
      enumerable: true
    })
  }
}
```

## 缓存机制

computed 自动提供缓存：

```typescript
const double = computed(() => {
  console.log('computing...')  // 只在依赖变化时执行
  return state.count * 2
})

// 多次访问，只计算一次
console.log(double.value)  // 'computing...' 0
console.log(double.value)  // 0（使用缓存）
console.log(double.value)  // 0（使用缓存）

// state 变化后重新计算
state.count = 5
console.log(double.value)  // 'computing...' 10
```

## 访问其他 Getters

通过 this 访问：

```typescript
getters: {
  double: (state) => state.count * 2,
  
  quadruple() {
    // this 是 Store，可以访问其他 getter
    return this.double * 2
  }
}
```

实现时需要确保 this 绑定正确：

```typescript
computedGetters[key] = computed(() => {
  // 使用 call 绑定 this 为 store
  return getter.call(store, state)
})
```

## 访问其他 Store

```typescript
import { useOtherStore } from './other'

getters: {
  combined() {
    const other = useOtherStore()
    return this.count + other.value
  }
}
```

在 getter 内部调用其他 useStore 即可。

## 带参数的 Getter

通过返回函数实现：

```typescript
getters: {
  getById: (state) => (id: number) => {
    return state.items.find(item => item.id === id)
  }
}

// 使用
store.getById(1)  // 返回 id 为 1 的 item
```

注意：返回函数的 getter 不会被缓存。

## 完整实现

```typescript
// src/getters.ts
import { computed, ComputedRef } from 'vue'
import type { Store, StateTree } from './types'

/**
 * 创建 Getters
 */
export function createGetters<G extends Record<string, Function>>(
  getters: G,
  state: StateTree,
  store: Store
): Record<keyof G, ComputedRef> {
  const computedGetters: Record<string, ComputedRef> = {}
  
  for (const key in getters) {
    const getter = getters[key]
    
    computedGetters[key] = computed(() => {
      // 支持 state 参数和 this 访问
      return getter.call(store, state)
    })
  }
  
  return computedGetters as Record<keyof G, ComputedRef>
}

/**
 * 将 Getters 代理到 Store
 */
export function proxyGettersToStore(
  store: Store,
  computedGetters: Record<string, ComputedRef>
): void {
  for (const key in computedGetters) {
    Object.defineProperty(store, key, {
      get() {
        return computedGetters[key].value
      },
      enumerable: true,
      configurable: true
    })
  }
}
```

## 集成到 createOptionsStore

```typescript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn, getters, actions } = options
  
  // 创建 State
  const state = reactive(stateFn ? stateFn() : {})
  
  // 创建 Store 基础
  const store = reactive({ $id: id }) as Store
  
  // 代理 State
  proxyStateToStore(store, state)
  
  // 创建并代理 Getters
  if (getters) {
    const computedGetters = createGetters(getters, state, store)
    proxyGettersToStore(store, computedGetters)
  }
  
  // ... 后续处理
}
```

## Setup Store 的 Getters

Setup Store 直接使用 computed：

```typescript
defineStore('counter', () => {
  const count = ref(0)
  
  // 使用 computed 作为 getter
  const double = computed(() => count.value * 2)
  
  return { count, double }
})
```

处理：

```typescript
if (isRef(value) && isComputed(value)) {
  // computed 是只读的
  Object.defineProperty(store, key, {
    get: () => value.value,
    enumerable: true
  })
}
```

## 测试

```typescript
// tests/getters.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should compute from state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(4)
  })
  
  it('should be cached', () => {
    let computeCount = 0
    
    const useStore = defineStore('test', {
      state: () => ({ count: 1 }),
      getters: {
        expensive: (state) => {
          computeCount++
          return state.count * 10
        }
      }
    })
    
    const store = useStore()
    
    store.expensive
    store.expensive
    store.expensive
    
    expect(computeCount).toBe(1)
  })
  
  it('should recompute when state changes', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 1 }),
      getters: {
        double: (state) => state.count * 2
      }
    })
    
    const store = useStore()
    expect(store.double).toBe(2)
    
    store.count = 5
    expect(store.double).toBe(10)
  })
  
  it('should access other getters via this', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2,
        quadruple() {
          return this.double * 2
        }
      }
    })
    
    const store = useStore()
    expect(store.quadruple).toBe(8)
  })
  
  it('should support getter with arguments', () => {
    const useStore = defineStore('test', {
      state: () => ({
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' }
        ]
      }),
      getters: {
        getById: (state) => (id: number) => {
          return state.items.find(item => item.id === id)
        }
      }
    })
    
    const store = useStore()
    expect(store.getById(1)?.name).toBe('a')
    expect(store.getById(2)?.name).toBe('b')
  })
})
```

## 性能优化

避免在 getter 中进行昂贵操作：

```typescript
// ❌ 每次访问都过滤
getters: {
  activeItems: (state) => state.items.filter(i => i.active)
}

// ✅ 如果需要缓存过滤结果，考虑使用 state
state: () => ({
  items: [],
  _cachedActiveItems: null
})
```

下一章我们实现 Actions。
