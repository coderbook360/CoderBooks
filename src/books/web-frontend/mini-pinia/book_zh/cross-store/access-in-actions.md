---
sidebar_position: 58
title: 在 Actions 中访问其他 Store
---

# 在 Actions 中访问其他 Store

Actions 是跨 Store 协作最常见的场景。本章详细讲解如何在 actions 中安全地访问其他 Store。

## 基本用法

在 action 中直接调用其他 Store：

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  actions: {
    async checkout() {
      // 获取其他 Store
      const userStore = useUserStore()
      const orderStore = useOrderStore()
      
      // 读取状态
      if (!userStore.isLoggedIn) {
        throw new Error('Please login first')
      }
      
      // 调用其他 Store 的 action
      const order = await orderStore.create({
        userId: userStore.id,
        items: this.items
      })
      
      // 清空购物车
      this.items = []
      
      return order
    }
  }
})
```

## 为什么在 action 内部获取 Store

### 避免初始化顺序问题

```javascript
// ❌ 错误：在模块顶层获取
const userStore = useUserStore()  // Pinia 可能还未初始化

const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      console.log(userStore.isLoggedIn)  // 可能报错
    }
  }
})

// ✅ 正确：在 action 内部获取
const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      const userStore = useUserStore()  // 此时 Pinia 已就绪
      console.log(userStore.isLoggedIn)
    }
  }
})
```

### 确保响应式追踪

```javascript
const useCartStore = defineStore('cart', {
  actions: {
    applyDiscount() {
      // 每次调用都获取最新状态
      const userStore = useUserStore()
      
      const discount = userStore.isVIP ? 0.2 : 0
      
      this.items.forEach(item => {
        item.discountedPrice = item.price * (1 - discount)
      })
    }
  }
})
```

## 实际场景示例

### 场景 1：认证与授权

```javascript
const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null
  }),
  getters: {
    isLoggedIn: state => !!state.token
  },
  actions: {
    async login(credentials) {
      const response = await api.login(credentials)
      this.token = response.token
      this.user = response.user
    }
  }
})

const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null
  }),
  actions: {
    async fetchProfile() {
      const authStore = useAuthStore()
      
      if (!authStore.isLoggedIn) {
        throw new Error('Authentication required')
      }
      
      // 使用 token 获取 profile
      this.profile = await api.getProfile({
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      })
    }
  }
})
```

### 场景 2：购物车结算

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    coupon: null
  }),
  getters: {
    subtotal: state => state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ),
    discount() {
      return this.coupon ? this.subtotal * this.coupon.rate : 0
    },
    total() {
      return this.subtotal - this.discount
    }
  },
  actions: {
    async checkout() {
      const userStore = useUserStore()
      const orderStore = useOrderStore()
      const notificationStore = useNotificationStore()
      
      try {
        // 验证用户
        if (!userStore.isLoggedIn) {
          throw new Error('Please login to checkout')
        }
        
        // 验证购物车
        if (this.items.length === 0) {
          throw new Error('Cart is empty')
        }
        
        // 创建订单
        const order = await orderStore.create({
          userId: userStore.id,
          items: this.items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          })),
          subtotal: this.subtotal,
          discount: this.discount,
          total: this.total,
          couponCode: this.coupon?.code
        })
        
        // 清空购物车
        this.items = []
        this.coupon = null
        
        // 发送通知
        notificationStore.success('Order placed successfully!')
        
        return order
        
      } catch (error) {
        notificationStore.error(error.message)
        throw error
      }
    }
  }
})
```

### 场景 3：数据同步

```javascript
const useDataSyncStore = defineStore('dataSync', {
  state: () => ({
    lastSyncTime: null,
    isSyncing: false
  }),
  actions: {
    async syncAll() {
      if (this.isSyncing) return
      
      this.isSyncing = true
      
      try {
        const userStore = useUserStore()
        const cartStore = useCartStore()
        const settingsStore = useSettingsStore()
        
        // 并行同步多个 Store
        await Promise.all([
          userStore.syncProfile(),
          cartStore.syncCart(),
          settingsStore.syncSettings()
        ])
        
        this.lastSyncTime = Date.now()
        
      } finally {
        this.isSyncing = false
      }
    }
  }
})
```

## Setup Store 中的 Actions

```javascript
const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  async function checkout() {
    // 同样在 action 内部获取
    const userStore = useUserStore()
    const orderStore = useOrderStore()
    
    if (!userStore.isLoggedIn) {
      throw new Error('Please login first')
    }
    
    const order = await orderStore.create({
      userId: userStore.id,
      items: items.value
    })
    
    items.value = []
    return order
  }
  
  return { items, checkout }
})
```

## 传递 Pinia 实例

在某些场景下需要显式传递 Pinia：

```javascript
// 组件外使用
export function checkoutFromOutside() {
  // 没有 Vue 组件上下文，需要传入 pinia
  const pinia = getActivePinia()
  
  const cartStore = useCartStore(pinia)
  return cartStore.checkout()
}
```

在 action 中传递：

```javascript
const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      // 在 action 中，this.$pinia 可用
      const userStore = useUserStore(this.$pinia)
      // ...
    }
  }
})
```

## 错误处理

```javascript
const useCartStore = defineStore('cart', {
  actions: {
    async checkout() {
      const userStore = useUserStore()
      const orderStore = useOrderStore()
      
      // 包装错误
      try {
        if (!userStore.isLoggedIn) {
          throw new AuthError('Not authenticated')
        }
        
        return await orderStore.create(this.items)
        
      } catch (error) {
        // 根据错误类型处理
        if (error instanceof AuthError) {
          // 可能触发登录流程
          const authStore = useAuthStore()
          authStore.showLoginModal = true
        }
        
        throw error
      }
    }
  }
})
```

## 测试跨 Store Actions

```javascript
describe('CartStore.checkout', () => {
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })
  
  test('creates order when logged in', async () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    const orderStore = useOrderStore()
    
    // 设置登录状态
    userStore.isLoggedIn = true
    userStore.id = 'user-1'
    
    // 添加商品
    cartStore.items = [
      { id: 'p-1', price: 100, quantity: 1 }
    ]
    
    // Mock orderStore.create
    const mockOrder = { id: 'order-1' }
    vi.spyOn(orderStore, 'create').mockResolvedValue(mockOrder)
    
    // 执行 checkout
    const result = await cartStore.checkout()
    
    // 验证
    expect(result).toEqual(mockOrder)
    expect(cartStore.items).toHaveLength(0)
    expect(orderStore.create).toHaveBeenCalledWith({
      userId: 'user-1',
      items: expect.any(Array)
    })
  })
  
  test('throws when not logged in', async () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    
    userStore.isLoggedIn = false
    cartStore.items = [{ id: 'p-1', price: 100, quantity: 1 }]
    
    await expect(cartStore.checkout()).rejects.toThrow('Please login')
  })
})
```

## 本章小结

本章讲解了在 actions 中访问其他 Store：

- **基本用法**：在 action 内部调用 useXxxStore()
- **避免问题**：不在模块顶层获取 Store
- **实际场景**：认证、结算、数据同步
- **错误处理**：包装和传播跨 Store 错误
- **测试策略**：Mock 依赖 Store 的方法

下一章讲解在 getters 中访问其他 Store。
