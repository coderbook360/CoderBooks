---
sidebar_position: 13
title: defineStore 函数签名解析
---

# defineStore 函数签名解析

`defineStore` 是 Pinia 中最核心的 API，用于定义 Store。本章将深入分析其函数签名设计，理解它如何支持多种使用方式。

## defineStore 的多种调用方式

Pinia 的 `defineStore` 支持三种调用方式：

```typescript
// 方式一：Options Store（ID + options）
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: { ... },
  actions: { ... }
})

// 方式二：Setup Store（ID + setup function）
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  return { count }
})

// 方式三：Options Store（options with id）
const useCounterStore = defineStore({
  id: 'counter',
  state: () => ({ count: 0 })
})
```

一个函数支持三种调用方式，这是如何实现的？

## 函数重载

TypeScript 的函数重载允许一个函数有多个类型签名：

```typescript
// 重载签名
export function defineStore<Id extends string, S, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS
): StoreDefinition<Id, ...>

export function defineStore<Id extends string, S, G, A>(
  options: DefineStoreOptionsBase<S, G, A> & { id: Id }
): StoreDefinition<Id, S, G, A>

// 实现签名
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  // 实现...
}
```

重载签名定义了不同的调用方式和返回类型，而实现签名是实际的函数体。

## 参数解析逻辑

在实现中，我们需要统一处理不同的参数形式：

```typescript
export function defineStore(
  idOrOptions: string | DefineStoreOptionsBase,
  setup?: (() => any) | DefineStoreOptions,
  setupOptions?: DefineSetupStoreOptions
) {
  let id: string
  let options: DefineStoreOptions | DefineSetupStoreOptions
  
  // 判断是否为 Setup Store
  const isSetupStore = typeof setup === 'function'
  
  // 解析参数
  if (typeof idOrOptions === 'string') {
    // 第一个参数是字符串 ID
    id = idOrOptions
    // 第二个参数是 options 对象或 setup 函数
    options = isSetupStore ? (setupOptions || {}) : setup!
  } else {
    // 第一个参数是包含 id 的 options 对象
    options = idOrOptions
    id = idOrOptions.id
  }
  
  // 现在我们有了统一的 id 和 options
  // ...
}
```

让我们用具体例子来理解这个逻辑：

```typescript
// 调用方式一：defineStore('counter', { state: () => ({}) })
// idOrOptions = 'counter' (string)
// setup = { state: () => ({}) } (object, not function)
// isSetupStore = false
// → id = 'counter', options = { state: () => ({}) }

// 调用方式二：defineStore('counter', () => ({}))
// idOrOptions = 'counter' (string)
// setup = () => ({}) (function)
// isSetupStore = true
// → id = 'counter', options = setupOptions || {}

// 调用方式三：defineStore({ id: 'counter', state: () => ({}) })
// idOrOptions = { id: 'counter', ... } (object)
// setup = undefined
// isSetupStore = false
// → id = idOrOptions.id, options = idOrOptions
```

## 返回 useStore 函数

`defineStore` 不直接返回 Store，而是返回一个 `useStore` 函数：

```typescript
export function defineStore(
  idOrOptions: string | DefineStoreOptionsBase,
  setup?: (() => any) | DefineStoreOptions,
  setupOptions?: DefineSetupStoreOptions
) {
  let id: string
  let options: DefineStoreOptions
  const isSetupStore = typeof setup === 'function'
  
  // 参数解析...
  
  // 返回 useStore 函数
  function useStore(pinia?: Pinia | null): Store {
    // Store 创建逻辑...
  }
  
  // 附加 ID 到函数上
  useStore.$id = id
  
  return useStore
}
```

为什么这样设计？

**延迟创建**：Store 不是在 `defineStore` 时创建，而是在 `useStore()` 调用时创建。这带来几个好处：

1. **避免创建未使用的 Store**：如果某个 Store 没被使用，就不会创建
2. **支持 HMR**：热更新时可以重新定义 Store
3. **依赖注入**：可以在调用时传入特定的 Pinia 实例

```typescript
// Store 定义时不创建
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// 使用时才创建
const counter = useCounterStore()  // 此时创建
const counter2 = useCounterStore() // 复用已创建的实例
```

## 完整的函数签名

让我们看看完整的 TypeScript 类型定义：

```typescript
// src/pinia/defineStore.ts
import type { Pinia, StateTree, Store, StoreDefinition } from './types'

/**
 * Options Store 重载（ID + options）
 */
export function defineStore<
  Id extends string,
  S extends StateTree,
  G /* extends GettersTree<S> */,
  A /* extends ActionsTree */
>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

/**
 * Setup Store 重载（ID + setup function）
 */
export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS,
  options?: DefineSetupStoreOptions
): StoreDefinition<
  Id,
  ExtractStateFromSetup<SS>,
  ExtractGettersFromSetup<SS>,
  ExtractActionsFromSetup<SS>
>

/**
 * Options Store 重载（options with id）
 */
export function defineStore<
  Id extends string,
  S extends StateTree,
  G,
  A
>(
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

/**
 * 实现
 */
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
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
  
  function useStore(pinia?: Pinia | null): Store {
    // 获取 pinia 实例
    pinia = pinia || getActivePinia()
    
    if (!pinia) {
      throw new Error(
        `[Pinia]: "useStore()" was called but no active Pinia was found.`
      )
    }
    
    // 检查 Store 是否已创建
    if (!pinia._s.has(id)) {
      // 创建 Store
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options, pinia)
      }
    }
    
    // 返回缓存的 Store
    return pinia._s.get(id)!
  }
  
  useStore.$id = id
  
  return useStore as StoreDefinition
}
```

## 类型推断

Pinia 的类型系统非常精妙。让我们看看类型是如何被推断的：

```typescript
// Options Store
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Counter'
  }),
  getters: {
    doubleCount: (state) => state.count * 2
    // state 被正确推断为 { count: number, name: string }
  },
  actions: {
    increment() {
      this.count++
      // this 被正确推断，可以访问 state、getters、actions
    }
  }
})

const counter = useCounterStore()
counter.count      // number
counter.name       // string
counter.doubleCount // number
counter.increment   // () => void
```

```typescript
// Setup Store
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  
  function increment() {
    count.value++
  }
  
  return { count, doubleCount, increment }
})

const counter = useCounterStore()
counter.count       // number (自动解包 ref)
counter.doubleCount // number (自动解包 computed)
counter.increment   // () => void
```

## $id 属性

`useStore.$id` 存储 Store 的 ID：

```typescript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

console.log(useCounterStore.$id) // 'counter'
```

这个属性有什么用？

1. **调试**：识别是哪个 Store
2. **map 辅助函数**：生成计算属性名
3. **插件**：插件可以通过 $id 判断处理哪个 Store

```typescript
// mapStores 内部使用 $id
function mapStores(...stores) {
  return stores.reduce((acc, useStore) => {
    const name = useStore.$id + 'Store'  // 使用 $id
    acc[name] = function () {
      return useStore(this.$pinia)
    }
    return acc
  }, {})
}
```

## 本章小结

本章我们分析了 `defineStore` 的函数签名设计：

1. **三种调用方式**：
   - `defineStore(id, options)` - Options Store
   - `defineStore(id, setup)` - Setup Store
   - `defineStore(options)` - Options with id

2. **函数重载**：TypeScript 函数重载支持多种调用方式的类型推断

3. **参数解析**：统一处理不同的参数形式，提取 id 和 options

4. **返回 useStore**：延迟创建 Store，支持复用和 HMR

5. **$id 属性**：附加 Store ID 到 useStore 函数

下一章我们将深入 Store ID 的设计和唯一标识机制。

---

**下一章**：[Store ID 与唯一标识机制](store-id.md)
