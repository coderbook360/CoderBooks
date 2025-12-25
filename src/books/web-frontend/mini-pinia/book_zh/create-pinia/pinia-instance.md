---
sidebar_position: 8
title: Pinia 实例数据结构
---

# Pinia 实例数据结构

上一章我们实现了 `createPinia` 函数。本章将深入分析 Pinia 实例的每个属性，理解它们的作用和相互关系。

## Pinia 实例结构总览

```typescript
interface Pinia {
  // 公共 API
  install: (app: App) => void
  use: (plugin: PiniaPlugin) => Pinia
  
  // 内部属性（以 _ 开头）
  _a?: App              // Vue 应用实例
  _s: Map<string, StoreGeneric>  // Store 注册表
  _p: PiniaPlugin[]     // 插件列表
  state: Ref<Record<string, StateTree>>  // 全局状态树
}
```

让我们逐一深入分析每个属性。

## _a：Vue 应用实例

```typescript
_a?: App
```

`_a` 保存对 Vue 应用实例的引用。这个属性在 `install` 方法中被设置：

```typescript
install(app: App) {
  pinia._a = app
  // ...
}
```

### 为什么需要保存 App 引用？

思考一下，哪些场景需要访问 Vue App？

**场景一：插件需要访问 App**

```typescript
function myPlugin({ app, store }) {
  // 插件可能需要访问 app 的配置或其他属性
  const router = app.config.globalProperties.$router
  
  store.$router = router
}
```

**场景二：错误处理**

```typescript
function errorHandlerPlugin({ app, store }) {
  store.$onAction(({ onError }) => {
    onError((error) => {
      // 使用 app 的错误处理器
      app.config.errorHandler?.(error, null, 'Pinia action error')
    })
  })
}
```

**场景三：SSR 场景**

在服务端渲染中，每个请求都有独立的 App 实例，需要区分不同请求的状态。

### 可选属性的原因

`_a` 是可选的（带 `?`），因为：

1. **延迟赋值**：在 `install` 调用之前，`_a` 为 `undefined`
2. **独立使用**：在某些测试场景，可能不挂载到 Vue App

## _s：Store 注册表

```typescript
_s: Map<string, StoreGeneric>
```

`_s` 是一个 Map，存储所有已创建的 Store 实例。键是 Store ID，值是 Store 实例。

### 为什么用 Map？

对比两种数据结构：

```typescript
// 方案一：普通对象
const stores: Record<string, Store> = {}
stores['counter'] = counterStore
stores['user'] = userStore

// 方案二：Map
const stores = new Map<string, Store>()
stores.set('counter', counterStore)
stores.set('user', userStore)
```

Map 的优势：

1. **键类型灵活**：虽然我们目前用字符串，但 Map 支持任意类型的键
2. **迭代顺序**：Map 保证按插入顺序迭代
3. **size 属性**：直接获取 Store 数量
4. **语义清晰**：Map 专为键值对设计

### Store 注册流程

```typescript
// 1. 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// 2. 首次使用时创建并注册
const counter = useCounterStore()

// 内部发生的事情：
// if (!pinia._s.has('counter')) {
//   const store = createStore(...)
//   pinia._s.set('counter', store)
// }
// return pinia._s.get('counter')
```

### Store 复用机制

```typescript
// 多次调用返回同一个实例
const counter1 = useCounterStore()
const counter2 = useCounterStore()

console.log(counter1 === counter2) // true
```

这是 Pinia 的重要特性：**Store 是单例的**。整个应用共享同一个 Store 实例。

## _p：插件列表

```typescript
_p: PiniaPlugin[]
```

`_p` 存储所有注册的插件。

### 插件是什么？

插件是一个函数，接收上下文对象，可以扩展 Store：

```typescript
type PiniaPlugin = (context: PiniaPluginContext) => 
  Partial<PiniaCustomProperties> | void

interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: StoreGeneric
  options: DefineStoreOptions
}
```

### 插件执行时机

插件不是在注册时执行，而是在 Store 创建时：

```typescript
function createStore(id, options, pinia) {
  // ... 创建 store 基础结构
  
  // 执行所有插件
  pinia._p.forEach(plugin => {
    const extensions = plugin({
      pinia,
      app: pinia._a!,
      store,
      options
    })
    
    // 合并插件返回的属性
    if (extensions) {
      Object.assign(store, extensions)
    }
  })
  
  return store
}
```

### 插件顺序

插件按注册顺序执行：

```typescript
pinia.use(plugin1)
pinia.use(plugin2)
pinia.use(plugin3)

// 执行顺序：plugin1 → plugin2 → plugin3
```

如果后注册的插件与前面的有属性冲突，后者会覆盖前者。

## state：全局状态树

```typescript
state: Ref<Record<string, StateTree>>
```

`state` 是最重要的属性，存储所有 Store 的状态。

### 状态树结构

```typescript
// 假设有三个 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

const useUserStore = defineStore('user', {
  state: () => ({ name: '', age: 0 })
})

const useCartStore = defineStore('cart', {
  state: () => ({ items: [] })
})

// pinia.state.value 的结构：
{
  counter: { count: 0 },
  user: { name: '', age: 0 },
  cart: { items: [] }
}
```

### 为什么是 Ref？

使用 `ref` 而不是普通对象或 `reactive`：

```typescript
// 方案一：普通对象 ❌
const state = {} 
// 问题：不是响应式的

// 方案二：reactive ❌
const state = reactive({})
// 问题：不能整体替换

// 方案三：ref ✅
const state = ref({})
// 优点：响应式 + 可整体替换
```

整体替换在 SSR 场景特别重要：

```typescript
// SSR 水合时，需要替换整个状态树
pinia.state.value = serverState
```

### 状态注册

当 Store 创建时，其状态被添加到状态树：

```typescript
function createSetupStore(id, setup, pinia) {
  // 如果状态树中没有这个 Store 的状态，初始化一个空对象
  if (!pinia.state.value[id]) {
    pinia.state.value[id] = {}
  }
  
  // 获取状态引用
  const storeState = pinia.state.value[id]
  
  // ... 后续处理
}
```

### 状态与 Store 的关系

状态树中的数据与 Store 实例的 `$state` 是**同一个引用**：

```typescript
const store = useCounterStore()

// 这两个是同一个对象
console.log(store.$state === pinia.state.value.counter) // true

// 修改一个会影响另一个
store.$state.count = 5
console.log(pinia.state.value.counter.count) // 5

pinia.state.value.counter.count = 10
console.log(store.$state.count) // 10
```

## 属性命名规范

注意到内部属性都以下划线开头（`_a`、`_s`、`_p`）。这是一种约定：

- **下划线开头**：内部属性，不建议外部直接使用
- **无下划线**：公共 API，如 `install`、`use`、`state`

`state` 虽然没有下划线，但它主要用于调试和 DevTools，普通使用中不需要直接访问。

## 数据流图

让我们用一张图来展示 Pinia 实例与各组件的关系：

```
                    ┌─────────────────────┐
                    │     Vue App (_a)     │
                    └──────────┬──────────┘
                               │
                               │ app.use(pinia)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                        Pinia Instance                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    state (Ref)                          │  │
│  │  ┌────────────┬────────────┬────────────┐              │  │
│  │  │  counter   │    user    │    cart    │ ...          │  │
│  │  │ {count: 0} │{name: ''...│ {items:[]} │              │  │
│  │  └────────────┴────────────┴────────────┘              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    _s (Map)                             │  │
│  │  'counter' → Store Instance                             │  │
│  │  'user'    → Store Instance                             │  │
│  │  'cart'    → Store Instance                             │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    _p (Array)                           │  │
│  │  [plugin1, plugin2, plugin3, ...]                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                               │
                               │ inject(piniaSymbol)
                               ▼
                    ┌─────────────────────┐
                    │     Components       │
                    │  useStore() → Store  │
                    └─────────────────────┘
```

## 本章小结

本章我们深入分析了 Pinia 实例的数据结构：

1. **_a（App 引用）**：保存 Vue 应用实例，供插件和错误处理使用

2. **_s（Store Map）**：存储所有 Store 实例，实现 Store 单例和复用

3. **_p（插件数组）**：存储注册的插件，在 Store 创建时执行

4. **state（状态树）**：响应式的全局状态，所有 Store 状态的聚合

这些属性相互配合，构成了 Pinia 的核心基础设施。下一章我们将深入状态树的管理机制。

---

**下一章**：[全局状态树管理](state-tree.md)
