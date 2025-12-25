---
sidebar_position: 16
title: useStore 函数实现
---

# useStore 函数实现

`useStore` 是 `defineStore` 返回的函数，是用户与 Store 交互的入口。本章将完整实现 `useStore` 函数。

## useStore 的职责

`useStore` 需要完成以下任务：

1. **获取 Pinia 实例**：从参数、inject 或 activePinia 获取
2. **检查 Store 是否存在**：查询注册表
3. **创建 Store**：如果不存在，创建并注册
4. **返回 Store 实例**：返回可用的 Store

## 基础实现

```typescript
// src/pinia/defineStore.ts
import { getCurrentInstance, inject } from 'vue'
import { piniaSymbol } from './createPinia'
import { getActivePinia, setActivePinia } from './rootStore'
import type { Pinia, Store, StoreDefinition } from './types'

export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  // 参数解析
  let id: string
  let options: any
  const isSetupStore = typeof setup === 'function'
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    options = idOrOptions
    id = idOrOptions.id
  }
  
  // useStore 函数
  function useStore(pinia?: Pinia | null): Store {
    // 步骤 1: 获取 Pinia 实例
    const currentInstance = getCurrentInstance()
    
    pinia = pinia || 
           (currentInstance && inject(piniaSymbol, null)) ||
           getActivePinia()
    
    if (pinia) {
      setActivePinia(pinia)
    }
    
    if (!pinia) {
      throw new Error(
        `[Pinia]: "useStore()" was called but there was no active Pinia. ` +
        `Did you forget to install pinia?\n` +
        `\tconst pinia = createPinia()\n` +
        `\tapp.use(pinia)`
      )
    }
    
    // 步骤 2: 检查 Store 是否已存在
    if (!pinia._s.has(id)) {
      // 步骤 3: 创建 Store
      if (isSetupStore) {
        createSetupStore(id, setup, options || {}, pinia)
      } else {
        createOptionsStore(id, options as any, pinia)
      }
    }
    
    // 步骤 4: 返回 Store
    const store = pinia._s.get(id)!
    
    return store as Store
  }
  
  // 附加 ID
  useStore.$id = id
  
  return useStore as StoreDefinition
}
```

## 获取 Pinia 实例的优先级

`useStore` 按以下优先级获取 Pinia 实例：

```typescript
pinia = pinia || 
       (currentInstance && inject(piniaSymbol, null)) ||
       getActivePinia()
```

1. **显式参数**：`useStore(myPinia)`
2. **组件上下文 inject**：在组件内自动获取
3. **全局 activePinia**：组件外使用时的回退

让我们看不同场景：

```typescript
// 场景 1: 组件内使用（最常见）
export default {
  setup() {
    // currentInstance 存在
    // inject(piniaSymbol) 返回已安装的 pinia
    const store = useCounterStore()
  }
}

// 场景 2: 组件外使用（如路由守卫）
router.beforeEach(() => {
  // currentInstance 为 null
  // inject 不可用
  // 使用 getActivePinia()
  const store = useCounterStore()
})

// 场景 3: 显式传递
const pinia = createPinia()
const store = useCounterStore(pinia)
```

## getCurrentInstance 的处理

`getCurrentInstance` 只在 `setup` 函数执行期间返回值：

```typescript
import { getCurrentInstance } from 'vue'

export default {
  setup() {
    console.log(getCurrentInstance()) // 有值
    
    const handleClick = () => {
      console.log(getCurrentInstance()) // null！
    }
    
    return { handleClick }
  }
}
```

但在事件处理器中调用 `useStore` 通常没问题：

```typescript
export default {
  setup() {
    const handleClick = () => {
      // 虽然 getCurrentInstance() 为 null
      // 但 getActivePinia() 仍然有效
      const store = useCounterStore()
      store.increment()
    }
    
    return { handleClick }
  }
}
```

## 设置 activePinia

注意这行代码：

```typescript
if (pinia) {
  setActivePinia(pinia)
}
```

每次成功获取 pinia 后，都设置为 active。这确保了：

1. **后续调用的一致性**：使用同一个 pinia 实例
2. **嵌套 Store 访问**：Store 内部访问其他 Store 时能正确获取 pinia

```typescript
const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore()  // 使用刚设置的 activePinia
  
  // ...
})
```

## 错误处理

当找不到 Pinia 时，抛出有意义的错误：

```typescript
if (!pinia) {
  throw new Error(
    `[Pinia]: "useStore()" was called but there was no active Pinia. ` +
    `Did you forget to install pinia?\n` +
    `\tconst pinia = createPinia()\n` +
    `\tapp.use(pinia)`
  )
}
```

好的错误信息应该：
1. 说明问题所在
2. 提供可能的原因
3. 给出解决方案

## Store 创建与缓存

关键的缓存逻辑：

```typescript
if (!pinia._s.has(id)) {
  // 不存在才创建
  if (isSetupStore) {
    createSetupStore(id, setup, options, pinia)
  } else {
    createOptionsStore(id, options, pinia)
  }
}

// 始终从缓存获取
const store = pinia._s.get(id)!
```

这保证了：

```typescript
const store1 = useCounterStore()
const store2 = useCounterStore()

console.log(store1 === store2) // true，同一个实例
```

## 带类型的完整实现

让我们添加完整的类型支持：

```typescript
// src/pinia/defineStore.ts
import { getCurrentInstance, inject } from 'vue'
import { piniaSymbol } from './createPinia'
import { getActivePinia, setActivePinia } from './rootStore'
import { createSetupStore, createOptionsStore } from './store'
import type {
  Pinia,
  Store,
  StoreDefinition,
  DefineStoreOptions,
  DefineSetupStoreOptions,
  StateTree
} from './types'

// 重载签名...

export function defineStore<Id extends string, S extends StateTree, G, A>(
  idOrOptions: Id | DefineStoreOptions<Id, S, G, A>,
  setup?: (() => any) | DefineStoreOptions<Id, S, G, A>,
  setupOptions?: DefineSetupStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A> {
  
  let id: Id
  let options: DefineStoreOptions<Id, S, G, A> | DefineSetupStoreOptions<Id, S, G, A>
  
  const isSetupStore = typeof setup === 'function'
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions as Id
    options = (isSetupStore ? setupOptions : setup) as any
  } else {
    options = idOrOptions as DefineStoreOptions<Id, S, G, A>
    id = (idOrOptions as DefineStoreOptions<Id, S, G, A>).id as Id
  }

  function useStore(pinia?: Pinia | null): Store<Id, S, G, A> {
    const currentInstance = getCurrentInstance()
    
    pinia = pinia ||
           (currentInstance && inject(piniaSymbol, null) as Pinia | null) ||
           getActivePinia()
    
    if (pinia) {
      setActivePinia(pinia)
    }
    
    if (!pinia) {
      throw new Error(
        `[Pinia]: "useStore()" was called but there was no active Pinia.`
      )
    }
    
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup as () => any, options || {}, pinia)
      } else {
        createOptionsStore(id, options as DefineStoreOptions<Id, S, G, A>, pinia)
      }
    }
    
    return pinia._s.get(id) as Store<Id, S, G, A>
  }
  
  useStore.$id = id
  
  return useStore as StoreDefinition<Id, S, G, A>
}
```

## 测试 useStore

```typescript
// tests/useStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, defineComponent } from 'vue'
import { createPinia, defineStore, setActivePinia } from '@pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})

describe('useStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should return the same store instance', () => {
    const store1 = useCounterStore()
    const store2 = useCounterStore()
    
    expect(store1).toBe(store2)
  })
  
  it('should work with explicit pinia', () => {
    const pinia = createPinia()
    const store = useCounterStore(pinia)
    
    expect(store.$id).toBe('counter')
    expect(pinia._s.has('counter')).toBe(true)
  })
  
  it('should create store only once', () => {
    const pinia = createPinia()
    let createCount = 0
    
    const useTestStore = defineStore('test', {
      state: () => {
        createCount++
        return { value: 0 }
      }
    })
    
    useTestStore(pinia)
    useTestStore(pinia)
    useTestStore(pinia)
    
    expect(createCount).toBe(1)
  })
  
  it('should throw when pinia is not available', () => {
    setActivePinia(undefined)
    
    expect(() => useCounterStore()).toThrow('[Pinia]')
  })
  
  it('should work in Vue components', async () => {
    const pinia = createPinia()
    let storeInComponent: any
    
    const TestComponent = defineComponent({
      setup() {
        storeInComponent = useCounterStore()
        return () => null
      }
    })
    
    const app = createApp(TestComponent)
    app.use(pinia)
    app.mount(document.createElement('div'))
    
    expect(storeInComponent).toBeDefined()
    expect(storeInComponent.$id).toBe('counter')
  })
})
```

## 本章小结

本章我们实现了 `useStore` 函数：

1. **获取 Pinia**：按优先级从参数、inject、activePinia 获取

2. **单例模式**：检查注册表，不存在才创建

3. **设置 activePinia**：确保后续调用的一致性

4. **错误处理**：找不到 Pinia 时抛出有意义的错误

5. **类型安全**：完整的 TypeScript 类型支持

下一章我们将深入 Store 的缓存与复用机制。

---

**下一章**：[Store 缓存与复用机制](store-cache.md)
