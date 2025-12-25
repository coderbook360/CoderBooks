---
sidebar_position: 57
title: 跨 Store 依赖管理
---

# 跨 Store 依赖管理

大型应用中，Store 之间经常需要相互协作。本章探讨跨 Store 依赖的管理策略。

## 为什么需要跨 Store 协作

随着应用规模增长，单一 Store 会变得臃肿：

```javascript
// ❌ 过于庞大的 Store
const useAppStore = defineStore('app', {
  state: () => ({
    // 用户相关
    user: null,
    token: null,
    permissions: [],
    
    // 购物车相关
    cartItems: [],
    cartTotal: 0,
    
    // 商品相关
    products: [],
    categories: [],
    
    // 订单相关
    orders: [],
    currentOrder: null,
    
    // ... 更多
  }),
  actions: {
    // 几十个 actions...
  }
})
```

拆分为多个专注的 Store 更合理：

```javascript
// ✅ 拆分后的结构
const useUserStore = defineStore('user', { ... })
const useCartStore = defineStore('cart', { ... })
const useProductStore = defineStore('product', { ... })
const useOrderStore = defineStore('order', { ... })
```

## 依赖关系类型

### 1. 单向依赖

一个 Store 读取另一个 Store 的数据：

```
UserStore  <--读取--  CartStore
```

```javascript
// CartStore 依赖 UserStore
const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  getters: {
    // 根据用户身份计算折扣
    discount() {
      const userStore = useUserStore()
      return userStore.isVIP ? 0.2 : 0
    }
  }
})
```

### 2. 双向依赖

两个 Store 相互读取（需要小心处理）：

```
UserStore  <-->  CartStore
```

### 3. 多层依赖

Store 之间形成依赖链：

```
UserStore --> CartStore --> OrderStore
```

## Pinia 的依赖机制

Pinia 使用惰性求值，Store 在首次访问时才初始化：

```javascript
const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  // UserStore 在这里调用时才初始化
  const discount = computed(() => {
    const userStore = useUserStore()
    return userStore.isVIP ? 0.2 : 0
  })
  
  return { items, discount }
})
```

## 依赖注入时机

### 在 getters/actions 中注入

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  getters: {
    // ✅ getter 中注入
    totalWithDiscount() {
      const userStore = useUserStore()
      const subtotal = this.items.reduce((sum, item) => sum + item.price, 0)
      return subtotal * (1 - userStore.discount)
    }
  },
  actions: {
    // ✅ action 中注入
    async checkout() {
      const userStore = useUserStore()
      const orderStore = useOrderStore()
      
      if (!userStore.isLoggedIn) {
        throw new Error('Please login first')
      }
      
      const order = await orderStore.createOrder(this.items)
      this.items = []
      return order
    }
  }
})
```

### 在 Setup Store 顶层注入

```javascript
const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  // ✅ Setup 函数顶层注入
  const userStore = useUserStore()
  
  const totalWithDiscount = computed(() => {
    const subtotal = items.value.reduce((sum, item) => sum + item.price, 0)
    return subtotal * (1 - userStore.discount)
  })
  
  return { items, totalWithDiscount }
})
```

## 依赖管理最佳实践

### 1. 单一职责原则

每个 Store 只管理一个领域：

```javascript
// ✅ 职责清晰
const useUserStore = defineStore('user', {
  state: () => ({
    profile: null,
    preferences: {}
  }),
  actions: {
    async login(credentials) { ... },
    async logout() { ... },
    async updateProfile(data) { ... }
  }
})

const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  actions: {
    addItem(product) { ... },
    removeItem(productId) { ... },
    clear() { ... }
  }
})
```

### 2. 依赖方向明确

建立清晰的依赖层次：

```
基础层：UserStore, ConfigStore
    ↓
业务层：CartStore, ProductStore
    ↓
聚合层：OrderStore, CheckoutStore
```

```javascript
// 基础层
const useUserStore = defineStore('user', { ... })
const useConfigStore = defineStore('config', { ... })

// 业务层（可以依赖基础层）
const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore()
  // ...
})

// 聚合层（可以依赖业务层）
const useOrderStore = defineStore('order', () => {
  const cartStore = useCartStore()
  const userStore = useUserStore()
  // ...
})
```

### 3. 避免过深的依赖链

```javascript
// ❌ 依赖链过深
A -> B -> C -> D -> E

// ✅ 扁平化依赖
A -> B
A -> C
A -> D
```

## 依赖图可视化

在开发时，可以追踪依赖关系：

```javascript
// dev-tools.js
const dependencyGraph = new Map()

function trackDependency(from, to) {
  if (!dependencyGraph.has(from)) {
    dependencyGraph.set(from, new Set())
  }
  dependencyGraph.get(from).add(to)
}

function printDependencyGraph() {
  console.log('Store Dependencies:')
  dependencyGraph.forEach((deps, store) => {
    console.log(`  ${store} -> ${[...deps].join(', ')}`)
  })
}

// 修改 useStore
const originalUseUserStore = useUserStore
useUserStore = (pinia) => {
  const currentStore = getCurrentStoreName()
  if (currentStore) {
    trackDependency(currentStore, 'user')
  }
  return originalUseUserStore(pinia)
}
```

## 测试跨 Store 依赖

```javascript
describe('CartStore with dependencies', () => {
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })
  
  test('applies VIP discount', () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    
    // 设置用户为 VIP
    userStore.isVIP = true
    
    // 添加商品
    cartStore.items = [{ price: 100 }]
    
    // 验证折扣
    expect(cartStore.totalWithDiscount).toBe(80) // 20% off
  })
  
  test('checkout requires login', async () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    
    userStore.isLoggedIn = false
    cartStore.items = [{ id: 1, price: 100 }]
    
    await expect(cartStore.checkout()).rejects.toThrow('Please login')
  })
})
```

## 类型安全的依赖

使用 TypeScript 确保类型安全：

```typescript
interface UserState {
  isVIP: boolean
  discount: number
  isLoggedIn: boolean
}

interface CartState {
  items: CartItem[]
}

const useUserStore = defineStore<'user', UserState>('user', {
  state: () => ({
    isVIP: false,
    discount: 0,
    isLoggedIn: false
  })
})

const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  
  // 类型安全的依赖
  const userStore = useUserStore()
  
  const totalWithDiscount = computed(() => {
    const subtotal = items.value.reduce((sum, item) => sum + item.price, 0)
    // userStore.discount 有正确的类型
    return subtotal * (1 - userStore.discount)
  })
  
  return { items, totalWithDiscount }
})
```

## 本章小结

本章介绍了跨 Store 依赖管理：

- **依赖类型**：单向、双向、多层依赖
- **注入时机**：在 getters、actions 或 Setup 函数中注入
- **最佳实践**：单一职责、明确依赖方向、避免深层链
- **测试策略**：使用 pinia 实例隔离测试

下一章详细实现在 actions 中访问其他 Store。
