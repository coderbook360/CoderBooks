# 实现 $reset

`$reset` 方法将 State 重置到初始状态。这一章实现 `$reset` 机制。

## $reset 特性

- 将 state 恢复到初始值
- 仅适用于 Options Store
- Setup Store 不支持（无法推断初始状态）

## 基本用法

```typescript
const useStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'default'
  })
})

const store = useStore()
store.count = 100
store.name = 'changed'

store.$reset()

console.log(store.count)  // 0
console.log(store.name)   // 'default'
```

## 实现原理

保存初始 state 函数，重置时重新调用：

```typescript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn } = options
  
  // 保存 state 工厂函数
  const initialState = stateFn
  
  function $reset() {
    // 重新调用 state 函数获取初始值
    const newState = initialState ? initialState() : {}
    
    // 用 $patch 批量更新
    this.$patch(($state) => {
      Object.assign($state, newState)
    })
  }
  
  store.$reset = $reset.bind(store)
}
```

## 完整实现

```typescript
// src/reset.ts
import type { StateTree, Store } from './types'

/**
 * 创建 $reset 方法
 * 仅适用于 Options Store
 */
export function createReset(
  store: Store,
  initialStateFn: (() => StateTree) | undefined,
  $patch: Store['$patch']
): () => void {
  return function $reset() {
    // 重新调用 state 工厂函数
    const newState = initialStateFn ? initialStateFn() : {}
    
    // 使用 $patch 批量更新
    $patch(($state: StateTree) => {
      // 清理现有属性并应用新状态
      Object.assign($state, newState)
    })
  }
}
```

## 为什么 Setup Store 不支持

Setup Store 使用函数定义状态，Pinia 无法知道哪些是"初始"状态：

```typescript
defineStore('counter', () => {
  const count = ref(0)  // 初始值是 0
  
  // 这些运行时逻辑无法重新执行
  if (someCondition) {
    count.value = 10
  }
  
  return { count }
})
```

如果需要重置 Setup Store，手动实现：

```typescript
defineStore('counter', () => {
  const count = ref(0)
  const name = ref('default')
  
  function $reset() {
    count.value = 0
    name.value = 'default'
  }
  
  return { count, name, $reset }
})
```

## Setup Store 的 $reset 错误提示

```typescript
function createSetupStore(id, setup, pinia) {
  // ... setup store 创建逻辑
  
  // Setup Store 不支持 $reset
  store.$reset = () => {
    if (__DEV__) {
      throw new Error(
        `🍍: Store "${id}" is built using the setup syntax and ` +
        `does not implement $reset().`
      )
    }
  }
}
```

## 集成到 createOptionsStore

```typescript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn, getters, actions } = options
  
  // 创建 state
  const state = reactive(stateFn ? stateFn() : {})
  pinia.state.value[id] = state
  
  // 创建 store
  const store = reactive({ $id: id }) as Store
  
  // 代理 state、getters、actions
  proxyStateToStore(store, state)
  // ...
  
  // 创建 $patch
  const $patch = createPatch(id, () => pinia.state.value[id])
  store.$patch = $patch
  
  // 创建 $reset（传入原始 state 函数）
  store.$reset = createReset(store, stateFn, $patch)
  
  return store
}
```

## 深度重置

$reset 会完全重置状态，包括嵌套对象：

```typescript
const useStore = defineStore('user', {
  state: () => ({
    profile: {
      name: 'default',
      settings: {
        theme: 'light'
      }
    }
  })
})

const store = useStore()
store.profile.settings.theme = 'dark'
store.profile.name = 'John'

store.$reset()

// 完全恢复
console.log(store.profile.name)           // 'default'
console.log(store.profile.settings.theme) // 'light'
```

## 测试

```typescript
// tests/reset.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('$reset', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should reset state to initial values', () => {
    const useStore = defineStore('test', {
      state: () => ({
        count: 0,
        name: 'default'
      })
    })
    
    const store = useStore()
    store.count = 100
    store.name = 'changed'
    
    store.$reset()
    
    expect(store.count).toBe(0)
    expect(store.name).toBe('default')
  })
  
  it('should reset nested objects', () => {
    const useStore = defineStore('test', {
      state: () => ({
        user: {
          name: 'John',
          settings: {
            theme: 'light'
          }
        }
      })
    })
    
    const store = useStore()
    store.user.name = 'Jane'
    store.user.settings.theme = 'dark'
    
    store.$reset()
    
    expect(store.user.name).toBe('John')
    expect(store.user.settings.theme).toBe('light')
  })
  
  it('should reset arrays', () => {
    const useStore = defineStore('test', {
      state: () => ({
        items: [1, 2, 3]
      })
    })
    
    const store = useStore()
    store.items.push(4, 5)
    
    store.$reset()
    
    expect(store.items).toEqual([1, 2, 3])
  })
  
  it('should work after multiple modifications', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    store.count = 10
    store.$patch({ count: 20 })
    store.count++
    
    store.$reset()
    
    expect(store.count).toBe(0)
  })
  
  it('should throw error for setup store', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      return { count }
    })
    
    const store = useStore()
    
    // Setup Store 的 $reset 应该抛出错误
    expect(() => store.$reset()).toThrow()
  })
  
  it('should create fresh state on each reset', () => {
    const useStore = defineStore('test', {
      state: () => ({
        items: []
      })
    })
    
    const store = useStore()
    store.items.push(1)
    store.$reset()
    
    store.items.push(2)
    store.$reset()
    
    // 每次 reset 都是新的空数组
    expect(store.items).toEqual([])
  })
})
```

## 重要注意事项

### 1. 响应式保持

$reset 后，状态仍然是响应式的：

```typescript
store.$reset()
store.count++  // 仍然会触发更新
```

### 2. 订阅通知

$reset 使用 $patch，因此会触发订阅：

```typescript
store.$subscribe((mutation) => {
  if (mutation.type === 'patch') {
    console.log('State was patched/reset')
  }
})
```

### 3. 计算属性更新

$reset 后，依赖 state 的 getters 会自动更新：

```typescript
const useStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  }
})

const store = useStore()
store.count = 10
console.log(store.double)  // 20

store.$reset()
console.log(store.double)  // 0
```

下一章我们实现 `$subscribe` 方法。
