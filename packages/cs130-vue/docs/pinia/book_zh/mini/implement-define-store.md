# 实现 defineStore

defineStore 用于定义 Store，返回一个获取 Store 实例的函数。

## 调用方式

defineStore 支持多种调用方式：

```typescript
// 1. Options Store
defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {},
  actions: {}
})

// 2. Setup Store
defineStore('counter', () => {
  const count = ref(0)
  return { count }
})

// 3. ID 在选项中
defineStore({
  id: 'counter',
  state: () => ({ count: 0 })
})
```

## 基础实现

```typescript
// src/defineStore.ts
import { inject } from 'vue'
import type { Pinia, StoreDefinition, StoreOptions, StateTree } from './types'
import { getActivePinia } from './createPinia'
import { createOptionsStore, createSetupStore } from './store'

export function defineStore<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  id: Id,
  options: Omit<StoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

export function defineStore<Id extends string>(
  id: Id,
  setup: () => any
): StoreDefinition<Id>

export function defineStore<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  options: StoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

export function defineStore(
  idOrOptions: any,
  setupOrOptions?: any
): StoreDefinition {
  let id: string
  let options: StoreOptions<any, any, any, any> | undefined
  let setup: (() => any) | undefined
  
  // 解析参数
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    
    if (typeof setupOrOptions === 'function') {
      // Setup Store
      setup = setupOrOptions
    } else {
      // Options Store
      options = setupOrOptions
    }
  } else {
    // ID 在选项中
    id = idOrOptions.id
    options = idOrOptions
  }
  
  // 返回 useStore 函数
  function useStore(pinia?: Pinia) {
    // 获取 Pinia 实例
    const currentPinia = pinia || inject<Pinia>('pinia') || getActivePinia()
    
    if (!currentPinia) {
      throw new Error(
        `[Mini Pinia] No pinia instance found. ` +
        `Make sure to install pinia with app.use(pinia)`
      )
    }
    
    // 检查 Store 是否已存在
    if (!currentPinia._s.has(id)) {
      // 创建 Store
      if (setup) {
        createSetupStore(id, setup, currentPinia)
      } else if (options) {
        createOptionsStore(id, options, currentPinia)
      }
    }
    
    // 返回 Store 实例
    return currentPinia._s.get(id)!
  }
  
  // 设置 $id
  useStore.$id = id
  
  return useStore as StoreDefinition
}
```

## 参数解析

解析三种调用方式：

```typescript
// 方式 1：defineStore('id', options)
if (typeof idOrOptions === 'string') {
  id = idOrOptions
  if (typeof setupOrOptions === 'function') {
    setup = setupOrOptions  // Setup Store
  } else {
    options = setupOrOptions  // Options Store
  }
}

// 方式 2：defineStore({ id: 'id', ...options })
else {
  id = idOrOptions.id
  options = idOrOptions
}
```

## useStore 函数

返回的 useStore 函数：

```typescript
function useStore(pinia?: Pinia) {
  // 1. 获取 Pinia 实例
  const currentPinia = pinia || inject('pinia') || getActivePinia()
  
  // 2. 检查 Store 是否存在
  if (!currentPinia._s.has(id)) {
    // 3. 不存在则创建
    createStore(...)
  }
  
  // 4. 返回 Store 实例
  return currentPinia._s.get(id)
}
```

## Pinia 获取优先级

1. 显式传入的 pinia 参数
2. 组件注入的 pinia（通过 inject）
3. 全局活跃 pinia（通过 getActivePinia）

```typescript
const currentPinia = pinia || inject<Pinia>('pinia') || getActivePinia()
```

## Store 缓存

Store 只创建一次：

```typescript
if (!currentPinia._s.has(id)) {
  // 创建 Store
  createStore(...)
}

// 总是返回同一个实例
return currentPinia._s.get(id)!
```

## $id 属性

useStore 函数上附加 $id：

```typescript
useStore.$id = id
```

用于：
- 插件获取 Store ID
- HMR 识别 Store
- 调试信息

## 完整实现

```typescript
// src/defineStore.ts
import { inject } from 'vue'
import type { Pinia, StoreDefinition, StoreOptions, StateTree, Store } from './types'
import { getActivePinia } from './createPinia'
import { createOptionsStore, createSetupStore } from './store'

// 重载签名
export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: Omit<StoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

export function defineStore<Id extends string>(
  id: Id,
  setup: () => any
): StoreDefinition<Id>

export function defineStore<Id extends string, S extends StateTree, G, A>(
  options: StoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

// 实现
export function defineStore(
  idOrOptions: string | StoreOptions<any, any, any, any>,
  setupOrOptions?: (() => any) | Omit<StoreOptions<any, any, any, any>, 'id'>
): StoreDefinition {
  let id: string
  let options: StoreOptions<any, any, any, any> | undefined
  let setup: (() => any) | undefined
  
  // 解析参数
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    if (typeof setupOrOptions === 'function') {
      setup = setupOrOptions
    } else {
      options = setupOrOptions as StoreOptions<any, any, any, any>
    }
  } else {
    id = idOrOptions.id
    options = idOrOptions
  }
  
  // useStore 函数
  function useStore(pinia?: Pinia): Store {
    const currentPinia = pinia || inject<Pinia>('pinia') || getActivePinia()
    
    if (!currentPinia) {
      throw new Error(
        '[Mini Pinia] No pinia instance found. ' +
        'Did you forget to install pinia? (app.use(pinia))'
      )
    }
    
    if (!currentPinia._s.has(id)) {
      if (setup) {
        createSetupStore(id, setup, currentPinia)
      } else if (options) {
        createOptionsStore(id, options, currentPinia)
      } else {
        throw new Error('[Mini Pinia] Invalid store definition')
      }
    }
    
    return currentPinia._s.get(id)!
  }
  
  useStore.$id = id
  
  return useStore as StoreDefinition
}
```

## 使用示例

```typescript
// 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

// 在组件中使用
export default {
  setup() {
    const counter = useCounterStore()
    
    return {
      count: computed(() => counter.count),
      double: computed(() => counter.double),
      increment: counter.increment
    }
  }
}
```

## 测试

```typescript
// tests/defineStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('defineStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should define a store with id and options', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 1 })
    })
    
    expect(useStore.$id).toBe('test')
  })
  
  it('should return same store instance', () => {
    const useStore = defineStore('test', {
      state: () => ({ value: 1 })
    })
    
    const store1 = useStore()
    const store2 = useStore()
    
    expect(store1).toBe(store2)
  })
})
```

下一章我们实现 useStore 的完整逻辑。
