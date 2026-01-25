# defineStore 入口分析

defineStore 是 Pinia 最核心的 API，用于定义 Store。它有多种调用方式，支持 Options Store 和 Setup Store 两种风格。这一章我们将深入分析 defineStore 的入口逻辑。

## defineStore 的重载签名

defineStore 支持多种调用方式，通过 TypeScript 的函数重载来实现：

```typescript
// 重载 1：Options Store，id 作为第一个参数
export function defineStore<Id extends string, S, G, A>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

// 重载 2：Options Store，id 在 options 中
export function defineStore<Id extends string, S, G, A>(
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

// 重载 3：Setup Store
export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS,
  options?: DefineSetupStoreOptions<Id, SS>
): StoreDefinition<Id, _ExtractStateFromSetupStore<SS>, ...>
```

这三种重载对应三种使用方式：

```typescript
// 方式 1：id 作为第一个参数（最常用）
const useStore = defineStore('main', {
  state: () => ({ count: 0 })
})

// 方式 2：id 在 options 中
const useStore = defineStore({
  id: 'main',
  state: () => ({ count: 0 })
})

// 方式 3：Setup Store
const useStore = defineStore('main', () => {
  const count = ref(0)
  return { count }
})
```

## defineStore 实现

让我们看 defineStore 的核心实现：

```typescript
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  let id: string
  let options: DefineStoreOptions<string, StateTree, _GettersTree<StateTree>, _ActionsTree>

  // 判断是哪种调用方式
  const isSetupStore = typeof setup === 'function'
  
  if (typeof idOrOptions === 'string') {
    // 方式 1 或 方式 3：第一个参数是 id
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    // 方式 2：第一个参数是 options 对象
    options = idOrOptions
    id = idOrOptions.id
  }

  // 创建 useStore 函数
  function useStore(pinia?: Pinia, hot?: StoreGeneric): StoreGeneric {
    // 获取 pinia 实例（详见后续章节）
    const hasContext = hasInjectionContext()
    pinia = pinia || (hasContext ? inject(piniaSymbol) : undefined)
    
    if (pinia) setActivePinia(pinia)
    pinia = getActivePinia()
    
    // 确保 pinia 存在
    if (__DEV__ && !pinia) {
      throw new Error(
        `[🍍]: getActivePinia was called with no active Pinia.`
      )
    }

    // 如果 Store 不存在，创建它
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options as any, pinia)
      }
    }

    // 返回已存在的 Store
    const store = pinia._s.get(id)!
    
    return store
  }

  // 设置 $id 属性，方便识别
  useStore.$id = id

  return useStore
}
```

这段代码的核心逻辑分为几个部分：参数解析、useStore 函数创建、Store 实例获取或创建。

## 参数解析逻辑

代码首先需要判断是哪种调用方式，并提取出 id 和 options：

```typescript
const isSetupStore = typeof setup === 'function'

if (typeof idOrOptions === 'string') {
  id = idOrOptions
  options = isSetupStore ? setupOptions : setup
} else {
  options = idOrOptions
  id = idOrOptions.id
}
```

这里的判断逻辑是：如果第一个参数是字符串，说明是方式 1 或方式 3。如果第二个参数是函数，说明是 Setup Store（方式 3）。如果第一个参数是对象，说明是方式 2。

isSetupStore 变量会在后续决定调用 createSetupStore 还是 createOptionsStore。

## useStore 函数

defineStore 返回的是一个函数（通常命名为 useXxxStore）。这个函数每次调用时执行以下逻辑：

```typescript
function useStore(pinia?: Pinia, hot?: StoreGeneric): StoreGeneric {
  // 1. 获取 pinia 实例
  const hasContext = hasInjectionContext()
  pinia = pinia || (hasContext ? inject(piniaSymbol) : undefined)
  if (pinia) setActivePinia(pinia)
  pinia = getActivePinia()
  
  // 2. 如果 Store 不存在，创建它
  if (!pinia._s.has(id)) {
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options, pinia)
    }
  }
  
  // 3. 返回 Store 实例
  return pinia._s.get(id)!
}
```

关键点在于 `pinia._s.has(id)` 的检查。如果 Store 已经创建过，直接从 Map 中获取返回，不会重复创建。这确保了 Store 的单例性。

## hasInjectionContext 的作用

`hasInjectionContext` 是 Vue 3.3 引入的 API，用于检查当前是否在可以使用 inject 的上下文中：

```typescript
import { hasInjectionContext, inject } from 'vue'

function useStore(pinia?: Pinia) {
  const hasContext = hasInjectionContext()
  pinia = pinia || (hasContext ? inject(piniaSymbol) : undefined)
  // ...
}
```

在 Vue 3.3 之前，Pinia 使用 `getCurrentInstance()` 来判断是否在组件上下文。`hasInjectionContext` 更加准确，因为 inject 不仅可以在组件的 setup 中使用，还可以在 composables 中使用。

这个检查避免了在不正确的上下文中调用 inject 导致的警告：

```
[Vue warn]: inject() can only be used inside setup() or functional components.
```

## 热更新支持

useStore 函数的第二个参数 `hot` 用于开发环境的热更新：

```typescript
function useStore(pinia?: Pinia, hot?: StoreGeneric): StoreGeneric {
  // ...
  
  // 热更新逻辑
  if (__DEV__ && hot) {
    // 处理热更新...
  }
  
  return store
}
```

当 Store 的代码在开发环境中改变时，Vite 或 Webpack 的 HMR 会调用 useStore 并传入 hot 参数。这允许 Pinia 更新 Store 的逻辑而保留状态。

## $id 属性

defineStore 返回的函数上挂载了 `$id` 属性：

```typescript
useStore.$id = id
return useStore
```

这使得你可以在不调用 useStore 的情况下获取 Store 的 ID：

```typescript
const useUserStore = defineStore('user', { /* ... */ })

console.log(useUserStore.$id)  // 'user'
```

这在某些元编程场景下有用，比如批量注册 Store 或动态生成 Store 配置。

## 类型推导的魔法

defineStore 的类型推导是 Pinia 的核心优势之一。让我们看看类型是如何工作的：

```typescript
// 简化的类型定义
export function defineStore<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>
```

TypeScript 从你传入的 options 对象推导出 S（state 类型）、G（getters 类型）、A（actions 类型），然后将它们组合成最终的 Store 类型。

对于 Setup Store，类型推导更加直接，因为函数的返回类型直接决定了 Store 的结构：

```typescript
const useStore = defineStore('counter', () => {
  const count = ref(0)                    // Ref<number>
  const double = computed(() => count.value * 2)  // ComputedRef<number>
  function increment() { count.value++ }  // () => void
  
  return { count, double, increment }
})

// useStore() 的类型自动包含 count, double, increment
```

下一章我们将分析 useStore 获取实例的完整流程，包括缓存机制和错误处理。
