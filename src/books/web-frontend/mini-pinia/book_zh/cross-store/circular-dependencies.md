---
sidebar_position: 60
title: 循环依赖处理
---

# 循环依赖处理

当多个 Store 相互依赖时，可能形成循环依赖。本章讲解如何识别和解决这个问题。

## 什么是循环依赖

```javascript
// Store A 依赖 Store B
const useStoreA = defineStore('a', {
  getters: {
    value() {
      return useStoreB().someValue
    }
  }
})

// Store B 依赖 Store A
const useStoreB = defineStore('b', {
  getters: {
    someValue() {
      return useStoreA().value  // 循环！
    }
  }
})
```

调用 `storeA.value` 会导致无限递归。

## 循环依赖的类型

### 1. 直接循环

```javascript
A -> B -> A
```

两个 Store 直接相互依赖。

### 2. 间接循环

```javascript
A -> B -> C -> A
```

通过中间 Store 形成循环。

### 3. 隐式循环

```javascript
// Store A 在 getter 中依赖 B
// Store B 在 action 中修改 A
// A 的 getter 再次触发 B
```

这种情况更难发现。

## Pinia 如何处理

Pinia 使用惰性初始化，在大多数情况下可以避免模块加载时的循环：

```javascript
// 文件 storeA.js
import { useStoreB } from './storeB'  // 导入不会立即执行

const useStoreA = defineStore('a', {
  actions: {
    someAction() {
      // 只有在 action 调用时才获取 StoreB
      const storeB = useStoreB()
      storeB.doSomething()
    }
  }
})

// 文件 storeB.js
import { useStoreA } from './storeA'

const useStoreB = defineStore('b', {
  actions: {
    doSomething() {
      // 同样延迟获取
      const storeA = useStoreA()
      storeA.value
    }
  }
})
```

但在 getters 中的循环依赖仍然会导致问题。

## 检测循环依赖

### 开发时检测

```javascript
// dev-utils.js
const accessStack = []

function trackStoreAccess(storeId) {
  if (accessStack.includes(storeId)) {
    console.error(
      `[Pinia] Circular dependency detected: ${accessStack.join(' -> ')} -> ${storeId}`
    )
    return true
  }
  accessStack.push(storeId)
  return false
}

function clearStoreAccess() {
  accessStack.length = 0
}

// 在 getter 中使用
const useStoreA = defineStore('a', {
  getters: {
    value() {
      if (__DEV__) {
        if (trackStoreAccess('a')) return undefined
      }
      const result = useStoreB().someValue
      if (__DEV__) clearStoreAccess()
      return result
    }
  }
})
```

### 运行时检测

```javascript
function createCircularDetector() {
  const stack = new Set()
  
  return {
    enter(id) {
      if (stack.has(id)) {
        throw new Error(`Circular dependency: ${[...stack, id].join(' -> ')}`)
      }
      stack.add(id)
    },
    leave(id) {
      stack.delete(id)
    }
  }
}

const detector = createCircularDetector()
```

## 解决方案

### 方案 1：提取共享状态

将共同依赖的状态提取到独立 Store：

```javascript
// ❌ 循环依赖
const useUserStore = defineStore('user', {
  getters: {
    permissions() {
      return useRoleStore().rolePermissions
    }
  }
})

const useRoleStore = defineStore('role', {
  getters: {
    rolePermissions() {
      return useUserStore().role  // 循环！
    }
  }
})

// ✅ 提取共享状态
const useAuthStore = defineStore('auth', {
  state: () => ({
    role: 'user',
    permissions: []
  }),
  getters: {
    rolePermissions: state => {
      const permissionMap = {
        admin: ['read', 'write', 'delete'],
        user: ['read']
      }
      return permissionMap[state.role] || []
    }
  }
})

const useUserStore = defineStore('user', {
  getters: {
    permissions() {
      return useAuthStore().rolePermissions
    }
  }
})
```

### 方案 2：合并 Store

如果两个 Store 紧密耦合，考虑合并：

```javascript
// ❌ 紧密耦合的两个 Store
const useCartStore = defineStore('cart', {
  getters: {
    canCheckout() {
      return useCheckoutStore().isValid
    }
  }
})

const useCheckoutStore = defineStore('checkout', {
  getters: {
    isValid() {
      return useCartStore().items.length > 0
    }
  }
})

// ✅ 合并为一个 Store
const useShoppingStore = defineStore('shopping', {
  state: () => ({
    cartItems: [],
    checkoutStep: 0
  }),
  getters: {
    canCheckout: state => state.cartItems.length > 0,
    isCheckoutValid() {
      return this.canCheckout && this.checkoutStep > 0
    }
  }
})
```

### 方案 3：使用参数传递

通过参数传递数据，而非依赖获取：

```javascript
// ❌ 在 getter 中获取依赖
const useCartStore = defineStore('cart', {
  getters: {
    total() {
      const discountStore = useDiscountStore()
      return this.subtotal * (1 - discountStore.rate)
    }
  }
})

// ✅ 通过 action 参数传递
const useCartStore = defineStore('cart', {
  getters: {
    subtotal: state => state.items.reduce(
      (sum, item) => sum + item.price,
      0
    )
  },
  actions: {
    calculateTotal(discountRate = 0) {
      return this.subtotal * (1 - discountRate)
    }
  }
})

// 使用时
const discountStore = useDiscountStore()
const cartStore = useCartStore()
const total = cartStore.calculateTotal(discountStore.rate)
```

### 方案 4：延迟获取

只在需要时获取，避免初始化时循环：

```javascript
const useStoreA = defineStore('a', () => {
  const value = ref(0)
  
  // 使用 computed 延迟获取
  const combinedValue = computed(() => {
    // 只在访问时才获取 StoreB
    const storeB = useStoreB()
    return value.value + storeB.value
  })
  
  return { value, combinedValue }
})
```

### 方案 5：事件通信

使用事件解耦：

```javascript
import mitt from 'mitt'
const eventBus = mitt()

const useStoreA = defineStore('a', {
  state: () => ({ value: 0 }),
  actions: {
    updateValue(newValue) {
      this.value = newValue
      // 发出事件，而非直接访问 StoreB
      eventBus.emit('a:valueChanged', newValue)
    }
  }
})

const useStoreB = defineStore('b', {
  state: () => ({ derivedValue: 0 }),
  actions: {
    init() {
      // 监听事件
      eventBus.on('a:valueChanged', (value) => {
        this.derivedValue = value * 2
      })
    }
  }
})
```

## 重构示例

### 重构前（有循环）

```javascript
// orderStore 依赖 cartStore
const useOrderStore = defineStore('order', {
  getters: {
    canCreateOrder() {
      const cartStore = useCartStore()
      return cartStore.items.length > 0 && cartStore.isValid
    }
  }
})

// cartStore 依赖 orderStore
const useCartStore = defineStore('cart', {
  getters: {
    isValid() {
      const orderStore = useOrderStore()
      return !orderStore.hasPendingOrder  // 循环！
    }
  }
})
```

### 重构后（无循环）

```javascript
// 提取验证逻辑到独立 Store
const useValidationStore = defineStore('validation', {
  state: () => ({
    hasPendingOrder: false
  })
})

const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),
  getters: {
    isValid() {
      const validationStore = useValidationStore()
      return this.items.length > 0 && !validationStore.hasPendingOrder
    }
  }
})

const useOrderStore = defineStore('order', {
  actions: {
    createOrder() {
      const cartStore = useCartStore()
      const validationStore = useValidationStore()
      
      if (!cartStore.isValid) {
        throw new Error('Cart is not valid')
      }
      
      validationStore.hasPendingOrder = true
      // 创建订单...
    }
  }
})
```

## 架构建议

### 依赖方向原则

```
UI Layer
    ↓
Feature Stores (cart, product, order)
    ↓
Core Stores (auth, config, settings)
    ↓
Infrastructure (api, storage)
```

- 上层可以依赖下层
- 同层之间谨慎依赖
- 下层不应依赖上层

### 代码审查检查点

- [ ] 新 Store 的依赖方向是否合理？
- [ ] 是否引入了循环依赖？
- [ ] 是否可以通过参数传递替代依赖获取？
- [ ] 紧密耦合的 Store 是否应该合并？

## 本章小结

本章讲解了循环依赖处理：

- **识别类型**：直接、间接、隐式循环
- **检测方法**：开发时栈追踪
- **解决方案**：提取共享状态、合并 Store、参数传递、事件通信
- **架构原则**：清晰的依赖方向

下一章讲解 Store 组合模式。
