---
sidebar_position: 27
title: Setup Store 设计理念
---

# Setup Store 设计理念

Setup Store 是 Pinia 提供的另一种定义 Store 的方式，它使用类似 Vue 3 Composition API 的语法。本章深入理解 Setup Store 的设计理念，对比它与 Options Store 的差异。

## 什么是 Setup Store？

Setup Store 使用一个函数来定义 Store，这个函数类似于 Vue 组件的 `setup` 函数：

```javascript
const useCounterStore = defineStore('counter', () => {
  // state：使用 ref 或 reactive
  const count = ref(0)
  const user = reactive({ name: '', age: 0 })
  
  // getters：使用 computed
  const doubleCount = computed(() => count.value * 2)
  
  // actions：普通函数
  function increment() {
    count.value++
  }
  
  async function fetchUser(id) {
    const data = await api.getUser(id)
    user.name = data.name
    user.age = data.age
  }
  
  // 返回要暴露的内容
  return {
    count,
    user,
    doubleCount,
    increment,
    fetchUser
  }
})
```

## 为什么需要 Setup Store？

首先问一个问题：既然有了 Options Store，为什么还要 Setup Store？

### 原因一：更好的 Composition

Options Store 的结构是固定的，难以复用逻辑：

```javascript
// Options Store 难以复用
const useStoreA = defineStore('a', {
  state: () => ({ loading: false, error: null, data: null }),
  actions: {
    async fetchData() {
      this.loading = true
      try {
        this.data = await api.getData()
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    }
  }
})

// 另一个 Store 需要相同的 loading/error 逻辑
// 只能复制粘贴...
```

Setup Store 可以使用 Composables 复用：

```javascript
// composable: 可复用的异步加载逻辑
function useAsyncState(fetcher) {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)
  
  async function execute(...args) {
    loading.value = true
    error.value = null
    try {
      data.value = await fetcher(...args)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }
  
  return { loading, error, data, execute }
}

// Setup Store 使用 composable
const useUserStore = defineStore('user', () => {
  const { loading, error, data: user, execute: fetchUser } = 
    useAsyncState((id) => api.getUser(id))
  
  return { loading, error, user, fetchUser }
})

const useProductStore = defineStore('product', () => {
  const { loading, error, data: products, execute: fetchProducts } = 
    useAsyncState(() => api.getProducts())
  
  return { loading, error, products, fetchProducts }
})
```

### 原因二：更灵活的组织

Setup Store 没有固定结构，可以按逻辑组织代码：

```javascript
const useOrderStore = defineStore('order', () => {
  // ========== 订单列表相关 ==========
  const orders = ref([])
  const ordersLoading = ref(false)
  
  async function fetchOrders() {
    ordersLoading.value = true
    orders.value = await api.getOrders()
    ordersLoading.value = false
  }
  
  // ========== 当前订单相关 ==========
  const currentOrder = ref(null)
  const currentOrderLoading = ref(false)
  
  async function fetchOrder(id) {
    currentOrderLoading.value = true
    currentOrder.value = await api.getOrder(id)
    currentOrderLoading.value = false
  }
  
  // ========== 购物车相关 ==========
  const cart = reactive({ items: [], total: 0 })
  
  function addToCart(item) {
    cart.items.push(item)
    cart.total += item.price
  }
  
  return {
    // 订单列表
    orders,
    ordersLoading,
    fetchOrders,
    // 当前订单
    currentOrder,
    currentOrderLoading,
    fetchOrder,
    // 购物车
    cart,
    addToCart
  }
})
```

### 原因三：更好的 TypeScript 推断

Setup Store 的类型推断更自然：

```typescript
// Setup Store：类型自动推断
const useStore = defineStore('store', () => {
  const count = ref(0)  // Ref<number>
  const double = computed(() => count.value * 2)  // ComputedRef<number>
  
  function increment() {
    count.value++  // 类型安全
  }
  
  return { count, double, increment }
})

// Options Store：需要更复杂的类型体操
const useStore = defineStore('store', {
  state: () => ({
    count: 0  // 类型推断需要 ThisType 支持
  }),
  getters: {
    double(): number {  // 有时需要显式标注
      return this.count * 2
    }
  }
})
```

## Setup Store vs Options Store

| 特性 | Options Store | Setup Store |
|-----|--------------|-------------|
| 语法风格 | 类似 Vuex/Vue Options API | 类似 Vue Composition API |
| 结构 | 固定（state/getters/actions） | 自由 |
| 代码复用 | 困难 | 支持 Composables |
| 类型推断 | 需要复杂类型 | 自然推断 |
| $reset 支持 | 原生支持 | 需要手动实现 |
| 学习曲线 | 较低 | 需要理解 Composition API |
| DevTools | 完整支持 | 完整支持 |

## Setup Store 的数据流

```
┌─────────────────────────────────────────┐
│           Setup Function                │
│  ┌─────────────────────────────────┐   │
│  │  ref/reactive → State           │   │
│  │  computed    → Getters          │   │
│  │  functions   → Actions          │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│                  ▼                      │
│  ┌─────────────────────────────────┐   │
│  │         return { ... }          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│              Store 实例                 │
│  • $id, $state, $patch, $reset...       │
│  • 用户返回的所有属性和方法             │
└─────────────────────────────────────────┘
```

## Setup 函数的执行时机

Setup 函数只在 Store 首次被使用时执行一次：

```javascript
const useStore = defineStore('store', () => {
  console.log('Setup executed!')
  
  const count = ref(0)
  return { count }
})

// 第一次调用：执行 setup
const store1 = useStore()  // 输出 "Setup executed!"

// 第二次调用：返回缓存的实例
const store2 = useStore()  // 不输出

console.log(store1 === store2)  // true
```

这与 Vue 组件的 `setup` 不同（每个组件实例都会执行 setup）。

## Setup Store 的约束

### $reset 的特殊处理

Options Store 可以通过调用 `state()` 获取初始状态实现 `$reset`。但 Setup Store 没有 state 工厂函数，需要手动实现：

```javascript
const useStore = defineStore('store', () => {
  const count = ref(0)
  const name = ref('')
  
  // 手动实现 reset
  function $reset() {
    count.value = 0
    name.value = ''
  }
  
  return { count, name, $reset }
})
```

如果不提供 `$reset`，调用会抛出错误（或 Pinia 提供默认的空实现警告）。

### State 识别的挑战

Setup Store 返回的内容需要被正确分类：

```javascript
return {
  count,        // ref → state
  user,         // reactive → state
  doubleCount,  // computed → getter
  increment,    // function → action
  CONSTANT      // 普通值 → ？
}
```

Pinia 需要分析返回值的类型来正确处理：

- `isRef(value)` → state
- `isReactive(value)` → state
- `isComputed(value)` → getter
- `typeof value === 'function'` → action
- 其他 → 作为属性直接暴露

## 实现思路预览

`createSetupStore` 的核心流程：

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 1. 创建 effectScope 隔离副作用
  const scope = effectScope()
  
  let store
  
  scope.run(() => {
    // 2. 执行 setup 函数
    const setupResult = setup()
    
    // 3. 分析返回值
    const { state, getters, actions } = analyzeSetupResult(setupResult)
    
    // 4. 注册 state 到全局状态树
    pinia.state.value[id] = state
    
    // 5. 创建 store 实例
    store = reactive({
      ...state,
      ...getters,
      ...wrapActions(actions, store),
      $id: id,
      $state: computed(...),
      $patch,
      $reset,
      $subscribe,
      $onAction,
      $dispose
    })
  })
  
  // 6. 注册到 Pinia
  pinia._s.set(id, store)
  
  return store
}
```

## 与 Options Store 的内部统一

虽然用户看到两种不同的 API，但内部实现尽量统一：

```javascript
function defineStore(idOrOptions, setup, setupOptions) {
  // ... 参数解析 ...
  
  function useStore(pinia) {
    // 检查是否已创建
    if (pinia._s.has(id)) {
      return pinia._s.get(id)
    }
    
    // 根据类型创建 Store
    if (isSetupStore) {
      return createSetupStore(id, setup, options, pinia)
    } else {
      return createOptionsStore(id, options, pinia)
    }
  }
  
  return useStore
}
```

两种 Store 最终产生的实例结构是相同的，都有 `$id`、`$state`、`$patch` 等 API。

## 本章小结

本章理解了 Setup Store 的设计理念：

- **Composition 优势**：支持 Composables，逻辑复用更方便
- **灵活组织**：没有固定结构，按逻辑分组代码
- **类型推断**：TypeScript 支持更自然
- **统一输出**：与 Options Store 产生相同结构的实例
- **$reset 约束**：需要手动实现

下一章，我们将实现 `createSetupStore` 函数。
