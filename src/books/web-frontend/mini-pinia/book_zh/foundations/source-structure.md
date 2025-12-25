---
sidebar_position: 6
title: Pinia 源码结构导读
---

# Pinia 源码结构导读

在开始实现 Mini-Pinia 之前，让我们先浏览 Pinia 官方源码的结构。理解源码组织方式能帮助我们更好地规划自己的实现。

## 获取源码

首先克隆 Pinia 官方仓库：

```bash
git clone https://github.com/vuejs/pinia.git
cd pinia
```

或者直接在 GitHub 上浏览：https://github.com/vuejs/pinia

## 项目结构概览

Pinia 是一个 monorepo，使用 pnpm workspace 管理多个包：

```
pinia/
├── packages/
│   ├── pinia/              # 核心包
│   │   ├── src/
│   │   │   ├── createPinia.ts
│   │   │   ├── store.ts
│   │   │   ├── storeToRefs.ts
│   │   │   ├── subscriptions.ts
│   │   │   ├── mapHelpers.ts
│   │   │   ├── rootStore.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── testing/            # 测试工具
│   └── nuxt/               # Nuxt 集成
│
├── playground/             # 开发测试
└── docs/                   # 文档
```

我们重点关注 `packages/pinia/src` 目录，这是 Pinia 的核心实现。

## 核心文件解析

### index.ts - 统一导出

```typescript
// packages/pinia/src/index.ts
export { createPinia } from './createPinia'
export { defineStore, skipHydrate } from './store'
export { storeToRefs } from './storeToRefs'
export {
  mapActions,
  mapStores,
  mapState,
  mapWritableState,
  mapGetters,
  setMapStoreSuffix
} from './mapHelpers'

// 类型导出
export type { Pinia, PiniaPlugin, ... } from './types'
```

这个文件是 Pinia 的公共 API 入口，导出所有用户可用的函数和类型。

### createPinia.ts - 创建 Pinia 实例

这是 Pinia 的核心入口，让我们看看关键结构：

```typescript
// packages/pinia/src/createPinia.ts（简化）
import { ref, markRaw } from 'vue'
import type { Pinia, StateTree } from './types'

export function createPinia(): Pinia {
  // 全局状态树
  const state = ref<Record<string, StateTree>>({})
  
  // 插件列表
  let _p: Pinia['_p'] = []
  
  // 待安装的插件（install 之前注册的）
  let toBeInstalled: PiniaPlugin[] = []

  const pinia: Pinia = markRaw({
    // Vue 插件 install 方法
    install(app: App) {
      // 保存 app 引用
      pinia._a = app
      // 提供 pinia 实例
      app.provide(piniaSymbol, pinia)
      // 全局属性
      app.config.globalProperties.$pinia = pinia
      // 安装等待中的插件
      toBeInstalled.forEach(plugin => _p.push(plugin))
      toBeInstalled = []
    },
    
    // 注册插件
    use(plugin) {
      if (!this._a) {
        // 还未 install，先存储
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },
    
    _p,                          // 插件列表
    _a: null,                    // Vue app 实例
    _e: undefined,               // effect scope
    _s: new Map(),               // stores map
    state,                       // 全局状态树
  })
  
  return pinia
}
```

关键设计点：

1. **state 是响应式的**：使用 `ref` 包装，确保状态变更能触发更新
2. **markRaw**：Pinia 实例本身不需要响应式，避免不必要的开销
3. **install 方法**：遵循 Vue 插件规范，使用 `provide` 注入
4. **延迟插件安装**：在 `install` 之前注册的插件会被暂存

### store.ts - Store 核心实现

这是最复杂的文件，包含 `defineStore` 和 Store 创建逻辑：

```typescript
// packages/pinia/src/store.ts（简化结构）

// defineStore 的多种签名
export function defineStore(
  idOrOptions: string | DefineStoreOptionsBase<...>,
  setup?: () => SS,
  setupOptions?: DefineSetupStoreOptions<...>
): StoreDefinition {
  
  let id: string
  let options: DefineStoreOptions | DefineSetupStoreOptions
  
  // 处理不同的参数形式
  const isSetupStore = typeof setup === 'function'
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    options = idOrOptions
    id = idOrOptions.id
  }
  
  // 返回 useStore 函数
  function useStore(pinia?: Pinia | null): Store {
    // 获取当前组件实例
    const currentInstance = getCurrentInstance()
    
    // 获取 pinia 实例
    pinia = pinia || 
           (currentInstance && inject(piniaSymbol, null))
    
    if (pinia) setActivePinia(pinia)
    pinia = activePinia!
    
    // 检查 store 是否已创建
    if (!pinia._s.has(id)) {
      // 首次使用，创建 store
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options, pinia)
      }
    }
    
    // 返回缓存的 store
    const store = pinia._s.get(id)!
    return store
  }
  
  useStore.$id = id
  return useStore
}

// 创建 Options Store
function createOptionsStore(id, options, pinia) {
  const { state, actions, getters } = options
  
  // 转换为 setup 函数形式
  function setup() {
    // 处理 state
    // 处理 getters（转为 computed）
    // 处理 actions
    // 返回合并后的对象
  }
  
  // 调用 createSetupStore
  return createSetupStore(id, setup, options, pinia, true)
}

// 创建 Setup Store（核心）
function createSetupStore(id, setup, options, pinia, isOptionsApi) {
  // 创建 effect scope
  const scope = effectScope(true)
  
  // 在 scope 中运行 setup
  const setupStore = scope.run(() => setup())
  
  // 创建 store 对象
  const store = reactive({
    $id: id,
    $state: ...,
    $patch: ...,
    $reset: ...,
    $subscribe: ...,
    $onAction: ...,
    $dispose: ...,
    ...setupStore
  })
  
  // 运行插件
  pinia._p.forEach(plugin => {
    const extensions = scope.run(() => 
      plugin({ store, pinia, app: pinia._a, options })
    )
    if (extensions) {
      Object.assign(store, extensions)
    }
  })
  
  // 缓存并返回
  pinia._s.set(id, store)
  return store
}
```

关键设计点：

1. **Options Store 转 Setup Store**：统一处理逻辑
2. **effectScope**：管理 Store 的副作用生命周期
3. **reactive 包装**：Store 整体是响应式的
4. **插件执行时机**：在 Store 创建后立即执行

### subscriptions.ts - 订阅系统

处理 `$subscribe` 和 `$onAction` 的核心逻辑：

```typescript
// packages/pinia/src/subscriptions.ts（简化）

// 添加订阅的通用函数
export function addSubscription<T extends _Method>(
  subscriptions: T[],
  callback: T,
  detached?: boolean,
  onCleanup: () => void = noop
) {
  subscriptions.push(callback)
  
  // 返回取消订阅的函数
  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback)
    if (idx > -1) {
      subscriptions.splice(idx, 1)
      onCleanup()
    }
  }
  
  // 如果不是 detached，在 scope 销毁时自动清理
  if (!detached && getCurrentScope()) {
    onScopeDispose(removeSubscription)
  }
  
  return removeSubscription
}

// 触发订阅的通用函数
export function triggerSubscriptions<T extends _Method>(
  subscriptions: T[],
  ...args: Parameters<T>
) {
  // 复制数组，避免在迭代中修改
  subscriptions.slice().forEach(callback => {
    callback(...args)
  })
}
```

这个模块提供了订阅管理的基础设施，被 `$subscribe` 和 `$onAction` 复用。

### storeToRefs.ts - 响应式解构

```typescript
// packages/pinia/src/storeToRefs.ts（简化）
import { toRef, isRef, isReactive } from 'vue'

export function storeToRefs<SS extends StoreGeneric>(store: SS) {
  // 跳过 pinia 内部属性
  store = toRaw(store)
  
  const refs: Record<string, Ref> = {}
  
  for (const key in store) {
    const value = store[key]
    // 只处理 ref 和 reactive（跳过函数）
    if (isRef(value) || isReactive(value)) {
      refs[key] = toRef(store, key)
    }
  }
  
  return refs
}
```

核心逻辑：遍历 Store 属性，将 `ref` 和 `reactive` 转换为可解构的 `ref` 引用。

### mapHelpers.ts - 辅助函数

```typescript
// packages/pinia/src/mapHelpers.ts（简化）

export function mapStores<Stores extends UseStoreDefinition[]>(
  ...stores: Stores
): MapStoresObjectReturn<Stores> {
  return stores.reduce((reduced, useStore) => {
    // 生成属性名：useUserStore → userStore
    const storeName = useStore.$id + 'Store'
    reduced[storeName] = function () {
      return useStore(this.$pinia)
    }
    return reduced
  }, {})
}

export function mapState<
  Id extends string,
  S extends StateTree,
  G,
  A,
  Keys extends keyof S | keyof G
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keys: Keys[]
): MapStateReturn<S, G, Keys> {
  return keys.reduce((reduced, key) => {
    reduced[key] = function () {
      const store = useStore(this.$pinia)
      return store.$state[key as keyof S] ?? store[key]
    }
    return reduced
  }, {})
}

// mapWritableState 类似，但返回 get/set 对象
// mapActions 返回绑定了 store 的方法
```

这些辅助函数主要用于 Options API 组件，将 Store 映射为组件选项。

### types.ts - 类型定义

这个文件很长，包含所有的 TypeScript 类型定义。关键类型：

```typescript
// packages/pinia/src/types.ts（部分）

// Pinia 实例
export interface Pinia {
  install: (app: App) => void
  use(plugin: PiniaPlugin): Pinia
  
  _p: PiniaPlugin[]
  _a: App | undefined
  _e: EffectScope | undefined
  _s: Map<string, StoreGeneric>
  state: Ref<Record<string, StateTree>>
}

// Store 定义
export interface StoreDefinition<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  (pinia?: Pinia | null, hot?: StoreGeneric): Store<Id, S, G, A>
  $id: Id
}

// Store 实例
export interface Store<Id, S, G, A> {
  $id: Id
  $state: UnwrapRef<S>
  $patch(...): void
  $reset(): void
  $subscribe(...): () => void
  $onAction(...): () => void
  $dispose(): void
}

// 插件相关
export interface PiniaPluginContext<...> {
  pinia: Pinia
  app: App
  store: Store<...>
  options: DefineStoreOptionsBase<...>
}

export type PiniaPlugin = (context: PiniaPluginContext) => 
  Partial<PiniaCustomProperties> | void
```

## 源码阅读技巧

### 1. 从入口开始

阅读源码时，从 `index.ts` 开始，了解公共 API，然后逐个深入。

### 2. 关注核心流程

Pinia 的核心流程：
1. `createPinia()` 创建实例
2. `app.use(pinia)` 安装到 Vue
3. `defineStore()` 定义 Store
4. `useStore()` 获取 Store 实例
5. 组件中使用 Store

跟踪这个流程阅读代码最为高效。

### 3. 暂时跳过边缘情况

源码中有很多边缘情况处理和兼容性代码，初次阅读可以暂时跳过，专注于主线逻辑。

### 4. 结合测试用例

Pinia 有完善的测试用例，阅读测试可以帮助理解功能预期行为。

```bash
# 查看测试文件
ls packages/pinia/__tests__/
```

### 5. 使用调试器

在开发环境中设置断点，跟踪代码执行流程，是理解源码的最有效方式。

## 我们的实现计划

基于对 Pinia 源码的理解，我们的 Mini-Pinia 将采用类似的结构：

| Pinia 源码 | Mini-Pinia | 功能 |
|------------|------------|------|
| createPinia.ts | createPinia.ts | 创建 Pinia 实例 |
| store.ts | defineStore.ts + store.ts | Store 定义和创建 |
| subscriptions.ts | subscriptions.ts | 订阅系统 |
| storeToRefs.ts | storeToRefs.ts | 响应式解构 |
| mapHelpers.ts | mapHelpers.ts | 辅助函数 |
| types.ts | types.ts | 类型定义 |

主要简化点：

1. **移除 SSR 支持**：简化实现，专注核心功能
2. **移除 DevTools 集成**：减少复杂度
3. **简化类型体操**：保持类型安全，但不追求与官方完全一致

## 本章小结

本章我们浏览了 Pinia 官方源码的结构：

1. **项目组织**：monorepo 结构，核心代码在 `packages/pinia/src`

2. **核心文件**：
   - `createPinia.ts`：创建 Pinia 实例
   - `store.ts`：defineStore 和 Store 创建逻辑
   - `subscriptions.ts`：订阅系统基础设施
   - `storeToRefs.ts`：响应式解构
   - `mapHelpers.ts`：Options API 辅助函数

3. **关键设计**：
   - Options Store 内部转换为 Setup Store
   - effectScope 管理 Store 生命周期
   - 统一的订阅管理机制

4. **阅读技巧**：从入口开始，跟踪核心流程，结合测试用例

从下一章开始，我们将正式进入实现阶段，首先实现 `createPinia` 函数。

---

**下一章**：[createPinia 函数设计](../create-pinia/create-pinia.md)
