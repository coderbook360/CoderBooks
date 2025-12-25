---
sidebar_position: 59
title: 在 Getters 中访问其他 Store
---

# 在 Getters 中访问其他 Store

Getters 中访问其他 Store 可以创建跨 Store 的派生状态。本章讲解实现方式和注意事项。

## 基本用法

### Options Store

```javascript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  getters: {
    // 访问 userStore 获取折扣
    finalPrice() {
      const userStore = useUserStore()
      const subtotal = this.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      return subtotal * (1 - userStore.discount)
    }
  }
})
```

### Setup Store

```javascript
const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  const finalPrice = computed(() => {
    const userStore = useUserStore()
    const subtotal = items.value.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    return subtotal * (1 - userStore.discount)
  })
  
  return { items, finalPrice }
})
```

## 响应式行为

跨 Store getter 会自动追踪依赖的响应式数据：

```javascript
const useUserStore = defineStore('user', {
  state: () => ({
    isVIP: false
  }),
  getters: {
    discount: state => state.isVIP ? 0.2 : 0
  }
})

const useCartStore = defineStore('cart', {
  state: () => ({
    items: [{ price: 100, quantity: 1 }]
  }),
  getters: {
    finalPrice() {
      const userStore = useUserStore()
      const subtotal = this.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )
      // 当 userStore.discount 变化时，自动重新计算
      return subtotal * (1 - userStore.discount)
    }
  }
})

// 测试响应式
const userStore = useUserStore()
const cartStore = useCartStore()

console.log(cartStore.finalPrice)  // 100
userStore.isVIP = true
console.log(cartStore.finalPrice)  // 80（20% 折扣）
```

## 实际场景

### 场景 1：基于用户权限的显示逻辑

```javascript
const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    permissions: []
  }),
  getters: {
    canEdit: state => state.permissions.includes('edit'),
    canDelete: state => state.permissions.includes('delete'),
    isAdmin: state => state.user?.role === 'admin'
  }
})

const useDocumentStore = defineStore('document', {
  state: () => ({
    documents: []
  }),
  getters: {
    // 根据用户权限过滤可操作的文档
    editableDocuments() {
      const authStore = useAuthStore()
      
      if (authStore.isAdmin) {
        return this.documents
      }
      
      return this.documents.filter(doc => {
        // 自己的文档
        if (doc.ownerId === authStore.user?.id) {
          return true
        }
        // 有编辑权限
        return authStore.canEdit && doc.allowEdit
      })
    },
    
    deletableDocuments() {
      const authStore = useAuthStore()
      
      if (!authStore.canDelete) {
        return []
      }
      
      return this.documents.filter(doc => 
        doc.ownerId === authStore.user?.id || authStore.isAdmin
      )
    }
  }
})
```

### 场景 2：价格计算

```javascript
const useCurrencyStore = defineStore('currency', {
  state: () => ({
    currentCurrency: 'USD',
    rates: {
      USD: 1,
      EUR: 0.85,
      CNY: 6.5
    }
  }),
  getters: {
    currentRate: state => state.rates[state.currentCurrency] || 1
  }
})

const useProductStore = defineStore('product', {
  state: () => ({
    products: [
      { id: 1, name: 'Widget', priceUSD: 100 },
      { id: 2, name: 'Gadget', priceUSD: 200 }
    ]
  }),
  getters: {
    // 根据当前货币显示价格
    productsWithLocalPrice() {
      const currencyStore = useCurrencyStore()
      
      return this.products.map(product => ({
        ...product,
        localPrice: product.priceUSD * currencyStore.currentRate,
        currency: currencyStore.currentCurrency
      }))
    }
  }
})
```

### 场景 3：购物车汇总

```javascript
const useSettingsStore = defineStore('settings', {
  state: () => ({
    taxRate: 0.1,
    freeShippingThreshold: 100
  })
})

const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  getters: {
    subtotal: state => state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ),
    
    // 访问 settings 计算税费
    tax() {
      const settingsStore = useSettingsStore()
      return this.subtotal * settingsStore.taxRate
    },
    
    // 访问 settings 和 user 计算运费
    shipping() {
      const settingsStore = useSettingsStore()
      const userStore = useUserStore()
      
      // VIP 免运费
      if (userStore.isVIP) return 0
      
      // 满额免运费
      if (this.subtotal >= settingsStore.freeShippingThreshold) return 0
      
      return 10
    },
    
    total() {
      return this.subtotal + this.tax + this.shipping
    }
  }
})
```

## 避免循环依赖

### 问题示例

```javascript
// ❌ 循环依赖
const useStoreA = defineStore('a', {
  getters: {
    valueFromB() {
      const storeB = useStoreB()
      return storeB.valueFromA + 1  // 依赖 B
    }
  }
})

const useStoreB = defineStore('b', {
  getters: {
    valueFromA() {
      const storeA = useStoreA()
      return storeA.valueFromB + 1  // 依赖 A -> 循环！
    }
  }
})
```

### 解决方案

1. **重构为单向依赖**

```javascript
// ✅ 单向依赖
const useBaseStore = defineStore('base', {
  state: () => ({ value: 0 })
})

const useStoreA = defineStore('a', {
  getters: {
    computed() {
      const baseStore = useBaseStore()
      return baseStore.value + 1
    }
  }
})

const useStoreB = defineStore('b', {
  getters: {
    computed() {
      const baseStore = useBaseStore()
      return baseStore.value + 2
    }
  }
})
```

2. **提取共享逻辑**

```javascript
// ✅ 提取到工具函数
function calculateTotal(storeA, storeB) {
  return storeA.value + storeB.value
}

const useStoreA = defineStore('a', {
  state: () => ({ value: 10 })
})

const useStoreB = defineStore('b', {
  state: () => ({ value: 20 })
})

const useAggregateStore = defineStore('aggregate', {
  getters: {
    total() {
      return calculateTotal(useStoreA(), useStoreB())
    }
  }
})
```

## 性能考虑

### 缓存行为

Pinia 的 getters 是计算属性，具有缓存：

```javascript
const useCartStore = defineStore('cart', {
  getters: {
    finalPrice() {
      console.log('Computing finalPrice')  // 只在依赖变化时打印
      const userStore = useUserStore()
      return this.subtotal * (1 - userStore.discount)
    }
  }
})

// 多次访问不会重复计算
console.log(cartStore.finalPrice)
console.log(cartStore.finalPrice)
console.log(cartStore.finalPrice)
// 只打印一次 "Computing finalPrice"
```

### 避免不必要的依赖

```javascript
// ❌ 依赖整个 Store 对象
const useCartStore = defineStore('cart', {
  getters: {
    finalPrice() {
      const userStore = useUserStore()
      // 任何 userStore 的变化都会触发重算
      console.log(userStore)
      return this.subtotal * (1 - userStore.discount)
    }
  }
})

// ✅ 只依赖需要的属性
const useCartStore = defineStore('cart', {
  getters: {
    finalPrice() {
      const userStore = useUserStore()
      const discount = userStore.discount  // 只访问 discount
      return this.subtotal * (1 - discount)
    }
  }
})
```

## 测试跨 Store Getters

```javascript
describe('CartStore getters', () => {
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })
  
  test('finalPrice applies user discount', () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    
    cartStore.items = [{ price: 100, quantity: 1 }]
    
    // 非 VIP
    userStore.isVIP = false
    expect(cartStore.finalPrice).toBe(100)
    
    // VIP 20% 折扣
    userStore.isVIP = true
    expect(cartStore.finalPrice).toBe(80)
  })
  
  test('reacts to dependency changes', () => {
    const userStore = useUserStore()
    const cartStore = useCartStore()
    
    cartStore.items = [{ price: 100, quantity: 1 }]
    userStore.isVIP = false
    
    const initial = cartStore.finalPrice
    
    // 改变依赖的 Store
    userStore.isVIP = true
    
    expect(cartStore.finalPrice).not.toBe(initial)
  })
})
```

## 本章小结

本章讲解了在 getters 中访问其他 Store：

- **基本用法**：在 getter 函数内调用 useXxxStore()
- **响应式**：自动追踪跨 Store 依赖
- **实际场景**：权限过滤、货币转换、价格计算
- **避免循环**：重构为单向依赖或提取共享逻辑
- **性能优化**：利用缓存，避免不必要的依赖

下一章讲解循环依赖的处理。
