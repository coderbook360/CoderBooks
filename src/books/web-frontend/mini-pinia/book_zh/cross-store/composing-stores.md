---
sidebar_position: 61
title: Store 组合模式
---

# Store 组合模式

本章总结 Store 组合的最佳实践和常见模式。

## 组合 vs 继承

Pinia 推荐组合而非继承：

```javascript
// ❌ 尝试继承（不支持）
const useBaseStore = defineStore('base', { ... })
const useExtendedStore = extends(useBaseStore, { ... })

// ✅ 组合模式
const useFeatureStore = defineStore('feature', () => {
  const baseStore = useBaseStore()
  
  // 扩展功能
  const extraFeature = ref('')
  
  return {
    // 暴露 base 的属性
    ...storeToRefs(baseStore),
    // 暴露额外功能
    extraFeature
  }
})
```

## 常见组合模式

### 模式 1：功能增强

在现有 Store 基础上添加功能：

```javascript
// 基础 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ }
  }
})

// 增强 Store
const useEnhancedCounterStore = defineStore('enhancedCounter', () => {
  const counterStore = useCounterStore()
  
  // 添加历史记录功能
  const history = ref([])
  
  function incrementWithHistory() {
    history.value.push(counterStore.count)
    counterStore.increment()
  }
  
  function undo() {
    if (history.value.length > 0) {
      counterStore.count = history.value.pop()
    }
  }
  
  return {
    count: computed(() => counterStore.count),
    history,
    increment: incrementWithHistory,
    undo
  }
})
```

### 模式 2：聚合 Store

将多个 Store 聚合为一个视图：

```javascript
const useUserStore = defineStore('user', {
  state: () => ({ name: '', email: '' })
})

const useSettingsStore = defineStore('settings', {
  state: () => ({ theme: 'light', language: 'en' })
})

const useNotificationStore = defineStore('notifications', {
  state: () => ({ unread: 0 })
})

// 聚合 Store
const useDashboardStore = defineStore('dashboard', () => {
  const userStore = useUserStore()
  const settingsStore = useSettingsStore()
  const notificationStore = useNotificationStore()
  
  // 聚合数据
  const dashboardData = computed(() => ({
    userName: userStore.name,
    theme: settingsStore.theme,
    unreadCount: notificationStore.unread
  }))
  
  // 聚合操作
  async function refreshAll() {
    await Promise.all([
      userStore.fetchProfile?.(),
      notificationStore.fetchUnread?.()
    ])
  }
  
  return {
    dashboardData,
    refreshAll
  }
})
```

### 模式 3：领域组合

按业务领域组合 Store：

```javascript
// 电商领域：商品 Store
const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    selectedProduct: null
  }),
  actions: {
    async fetchProducts() { ... },
    selectProduct(id) { ... }
  }
})

// 电商领域：购物车 Store
const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  actions: {
    addItem(product, quantity) { ... },
    removeItem(productId) { ... }
  }
})

// 电商领域：订单 Store
const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null
  }),
  actions: {
    async createOrder() { ... }
  }
})

// 电商领域组合 Store
const useEcommerceStore = defineStore('ecommerce', () => {
  const productStore = useProductStore()
  const cartStore = useCartStore()
  const orderStore = useOrderStore()
  
  // 跨领域操作
  async function buyNow(productId, quantity) {
    const product = productStore.products.find(p => p.id === productId)
    if (!product) throw new Error('Product not found')
    
    cartStore.addItem(product, quantity)
    return orderStore.createOrder()
  }
  
  // 跨领域状态
  const checkoutSummary = computed(() => ({
    items: cartStore.items,
    total: cartStore.total,
    canCheckout: cartStore.items.length > 0
  }))
  
  return {
    productStore,
    cartStore,
    orderStore,
    buyNow,
    checkoutSummary
  }
})
```

### 模式 4：状态共享

多个 Store 共享部分状态：

```javascript
// 共享状态 Store
const useSharedStore = defineStore('shared', {
  state: () => ({
    currentTenant: null,
    apiBaseUrl: ''
  })
})

// Store A 使用共享状态
const useStoreA = defineStore('a', () => {
  const sharedStore = useSharedStore()
  
  async function fetchData() {
    const response = await fetch(
      `${sharedStore.apiBaseUrl}/tenant/${sharedStore.currentTenant}/data-a`
    )
    return response.json()
  }
  
  return { fetchData }
})

// Store B 使用共享状态
const useStoreB = defineStore('b', () => {
  const sharedStore = useSharedStore()
  
  async function fetchData() {
    const response = await fetch(
      `${sharedStore.apiBaseUrl}/tenant/${sharedStore.currentTenant}/data-b`
    )
    return response.json()
  }
  
  return { fetchData }
})
```

### 模式 5：工厂模式

动态创建 Store：

```javascript
// Store 工厂
function createEntityStore(entityName) {
  return defineStore(`entity-${entityName}`, {
    state: () => ({
      items: [],
      loading: false,
      error: null
    }),
    actions: {
      async fetchAll() {
        this.loading = true
        try {
          const response = await fetch(`/api/${entityName}`)
          this.items = await response.json()
        } catch (e) {
          this.error = e.message
        } finally {
          this.loading = false
        }
      },
      async create(data) {
        const response = await fetch(`/api/${entityName}`, {
          method: 'POST',
          body: JSON.stringify(data)
        })
        const item = await response.json()
        this.items.push(item)
        return item
      }
    }
  })
}

// 使用工厂创建 Store
const useUserStore = createEntityStore('users')
const useProductStore = createEntityStore('products')
const useOrderStore = createEntityStore('orders')
```

## 组合工具函数

### 创建可复用逻辑

```javascript
// 可复用的加载状态逻辑
function useLoadingState() {
  const loading = ref(false)
  const error = ref(null)
  
  async function withLoading(fn) {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }
  
  return { loading, error, withLoading }
}

// 在 Store 中使用
const useDataStore = defineStore('data', () => {
  const items = ref([])
  const { loading, error, withLoading } = useLoadingState()
  
  async function fetchItems() {
    items.value = await withLoading(() => 
      fetch('/api/items').then(r => r.json())
    )
  }
  
  return { items, loading, error, fetchItems }
})
```

### 创建分页逻辑

```javascript
function usePagination(fetchFn) {
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const items = ref([])
  
  const totalPages = computed(() => 
    Math.ceil(total.value / pageSize.value)
  )
  
  const hasNext = computed(() => page.value < totalPages.value)
  const hasPrev = computed(() => page.value > 1)
  
  async function fetch() {
    const result = await fetchFn(page.value, pageSize.value)
    items.value = result.items
    total.value = result.total
  }
  
  async function nextPage() {
    if (hasNext.value) {
      page.value++
      await fetch()
    }
  }
  
  async function prevPage() {
    if (hasPrev.value) {
      page.value--
      await fetch()
    }
  }
  
  return {
    page,
    pageSize,
    total,
    items,
    totalPages,
    hasNext,
    hasPrev,
    fetch,
    nextPage,
    prevPage
  }
}

// 使用
const useProductStore = defineStore('products', () => {
  const pagination = usePagination(async (page, size) => {
    const response = await fetch(`/api/products?page=${page}&size=${size}`)
    return response.json()
  })
  
  return { ...pagination }
})
```

## 组合模式最佳实践

### 1. 保持清晰的边界

```javascript
// ✅ 职责清晰
const useAuthStore = defineStore('auth', { ... })     // 认证
const useUserStore = defineStore('user', { ... })     // 用户数据
const useProfileStore = defineStore('profile', { ... }) // 用户资料

// ❌ 职责模糊
const useUserAuthProfileStore = defineStore('userAuthProfile', { ... })
```

### 2. 避免过度组合

```javascript
// ❌ 过度组合
const useSuperStore = defineStore('super', () => {
  const a = useStoreA()
  const b = useStoreB()
  const c = useStoreC()
  const d = useStoreD()
  const e = useStoreE()
  // ... 太多依赖
})

// ✅ 适度组合
const useFeatureStore = defineStore('feature', () => {
  const core = useCoreStore()
  const settings = useSettingsStore()
  // 2-3 个依赖比较合适
})
```

### 3. 文档化依赖关系

```javascript
/**
 * 购物车 Store
 * 
 * @depends useUserStore - 获取用户折扣信息
 * @depends useProductStore - 获取商品详情
 */
const useCartStore = defineStore('cart', () => {
  // ...
})
```

## 本章小结

本章总结了 Store 组合模式：

- **组合优于继承**：Pinia 使用组合模式
- **常见模式**：功能增强、聚合、领域组合、状态共享、工厂
- **工具函数**：提取可复用逻辑
- **最佳实践**：清晰边界、适度组合、文档化依赖

至此，跨 Store 协作部分完成。下一部分进入插件系统。
