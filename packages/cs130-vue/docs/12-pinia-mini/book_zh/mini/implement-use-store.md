# 实现 useStore

useStore 函数是 defineStore 返回的函数，用于获取 Store 实例。这一章深入分析其实现。

## 核心职责

useStore 需要：

1. 获取正确的 Pinia 实例
2. 检查 Store 是否已创建
3. 未创建则创建 Store
4. 返回 Store 实例

## 获取 Pinia 实例

```typescript
function useStore(pinia?: Pinia): Store {
  // 三种获取方式，按优先级
  const currentPinia = 
    pinia ||                    // 1. 显式传入
    inject<Pinia>('pinia') ||   // 2. 组件注入
    getActivePinia()            // 3. 全局活跃

  if (!currentPinia) {
    throw new Error('[Mini Pinia] No pinia instance found')
  }
  
  return getOrCreateStore(currentPinia)
}
```

## inject 的时机

inject 只能在 setup 或函数式组件中调用：

```typescript
// ✅ 在 setup 中调用
setup() {
  const store = useStore()  // inject 生效
}

// ✅ 在组合函数中调用
function useMyFeature() {
  const store = useStore()  // 被 setup 调用时 inject 生效
}

// ❌ 在 setup 外部调用
const store = useStore()  // inject 返回 undefined，回退到 getActivePinia
```

## Store 缓存逻辑

```typescript
function getOrCreateStore(pinia: Pinia): Store {
  const id = useStore.$id
  
  // 检查缓存
  if (pinia._s.has(id)) {
    return pinia._s.get(id)!
  }
  
  // 创建新 Store
  const store = createStore(id, options, pinia)
  
  // 缓存 Store
  pinia._s.set(id, store)
  
  return store
}
```

## 多 Pinia 实例

不同 Pinia 实例有不同的 Store：

```typescript
const pinia1 = createPinia()
const pinia2 = createPinia()

const useStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// 不同 Pinia 实例中的 Store 是独立的
const store1 = useStore(pinia1)
const store2 = useStore(pinia2)

store1.count = 10
console.log(store2.count)  // 0，不受影响
```

## SSR 场景

每个请求有独立的 Pinia：

```typescript
// 服务端处理请求
async function handleRequest(req) {
  const pinia = createPinia()
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 每个请求的 Store 是独立的
  const store = useUserStore(pinia)
  await store.fetchUser()
  
  return renderToString(app)
}
```

## 完整 useStore 逻辑

```typescript
// src/defineStore.ts

function useStore(pinia?: Pinia): Store {
  // 获取当前组件实例
  const hasContext = getCurrentInstance() !== null
  
  // 获取 Pinia
  let currentPinia = pinia
  
  if (!currentPinia) {
    // 在组件上下文中尝试 inject
    if (hasContext) {
      currentPinia = inject<Pinia>('pinia')
    }
    
    // 回退到全局活跃 Pinia
    if (!currentPinia) {
      currentPinia = getActivePinia()
    }
  }
  
  if (!currentPinia) {
    throw new Error('[Mini Pinia] No pinia instance found')
  }
  
  // 获取或创建 Store
  if (!currentPinia._s.has(id)) {
    if (setup) {
      createSetupStore(id, setup, currentPinia)
    } else {
      createOptionsStore(id, options!, currentPinia)
    }
  }
  
  const store = currentPinia._s.get(id)!
  
  return store
}
```

## 热更新处理

真实 Pinia 中 useStore 还处理 HMR：

```typescript
function useStore(pinia?: Pinia): Store {
  // ...获取 Store...
  
  // HMR 处理
  if (__DEV__ && hot) {
    // 热更新时替换 Store 定义
  }
  
  return store
}
```

我们的简化版不实现 HMR。

## 组件挂载后的清理

Options API 组件中，$subscribe 等需要在组件卸载时清理：

```typescript
function useStore(pinia?: Pinia): Store {
  const store = getOrCreateStore(pinia)
  
  // 获取当前组件实例
  const vm = getCurrentInstance()
  
  if (vm) {
    // 存储 Store 引用，用于清理
    // （实际实现在 $subscribe 中处理）
  }
  
  return store
}
```

## 类型推断

useStore 的返回类型应该包含 State、Getters、Actions：

```typescript
interface StoreDefinition<Id, S, G, A> {
  (pinia?: Pinia): Store<Id, S, G, A> & S & ComputedGetters<G> & A
}

// 使用时有完整类型
const store = useCounterStore()
store.count      // 类型: number
store.double     // 类型: number
store.increment  // 类型: () => void
```

## 测试

```typescript
// tests/useStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia, getActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('useStore', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })
  
  it('should use active pinia when called outside component', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 42 })
    })
    
    const store = useStore()
    
    expect(store.value).toBe(42)
    expect(getActivePinia()!._s.has('test')).toBe(true)
  })
  
  it('should use provided pinia', () => {
    const pinia1 = createPinia()
    const pinia2 = createPinia()
    
    const useStore = defineStore('test', {
      state: () => ({ value: 0 })
    })
    
    const store1 = useStore(pinia1)
    const store2 = useStore(pinia2)
    
    store1.value = 100
    
    expect(store1.value).toBe(100)
    expect(store2.value).toBe(0)
  })
  
  it('should return same store instance', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 0 })
    })
    
    const store1 = useStore()
    const store2 = useStore()
    
    expect(store1).toBe(store2)
  })
  
  it('should throw without pinia', () => {
    setActivePinia(undefined as any)
    
    const useStore = defineStore('test', {
      state: () => ({})
    })
    
    expect(() => useStore()).toThrow('[Mini Pinia] No pinia instance found')
  })
})
```

## 实际使用

```typescript
// stores/counter.ts
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    }
  }
})

// Component.vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
</script>

<template>
  <button @click="counter.increment">
    {{ counter.count }}
  </button>
</template>
```

下一章我们实现 Options Store。
