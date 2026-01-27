# 跨 Store 的 actions

Action 可以访问和操作其他 Store。这一章分析跨 Store action 的实现和模式。

## 基本用法

Options Store 中调用其他 Store：

```typescript
const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[]
  }),
  actions: {
    checkout() {
      const userStore = useUserStore()
      const paymentStore = usePaymentStore()
      
      if (!userStore.isLoggedIn) {
        throw new Error('Please login first')
      }
      
      paymentStore.processPayment(this.items)
      this.items = []
    }
  }
})
```

Setup Store 中同样：

```typescript
const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  
  function checkout() {
    const userStore = useUserStore()
    const paymentStore = usePaymentStore()
    
    if (!userStore.isLoggedIn) {
      throw new Error('Please login first')
    }
    
    paymentStore.processPayment(items.value)
    items.value = []
  }
  
  return { items, checkout }
})
```

## 工作原理

action 执行前设置 activePinia：

```typescript
function wrapAction(name, action) {
  return function(...args) {
    setActivePinia(pinia)  // 确保 pinia 可用
    
    return action.apply(this, args)
  }
}
```

action 内部调用 useUserStore 时：

```typescript
function useStore(pinia) {
  pinia = pinia || getActivePinia()  // 获取 activePinia
  
  if (!pinia._s.has(id)) {
    // 创建 Store
  }
  
  return pinia._s.get(id)
}
```

两者使用同一个 pinia 实例，确保状态共享。

## 初始化顺序

跨 Store 调用可能触发 Store 初始化：

```typescript
// cartStore action 执行
function checkout() {
  const userStore = useUserStore()  // 如果 userStore 不存在，此时创建
  // ...
}
```

这是惰性初始化——Store 在首次使用时创建。

## 读取其他 Store 状态

```typescript
actions: {
  getOrderSummary() {
    const userStore = useUserStore()
    const promoStore = usePromoStore()
    
    return {
      userId: userStore.userId,
      items: this.items,
      discount: promoStore.currentDiscount,
      total: this.total * (1 - promoStore.currentDiscount)
    }
  }
}
```

读取是直接的，响应式依赖自动建立。

## 修改其他 Store 状态

```typescript
actions: {
  addToCart(item: Product) {
    this.items.push(item)
    
    // 更新相关 Store
    const analyticsStore = useAnalyticsStore()
    analyticsStore.trackEvent('add_to_cart', { productId: item.id })
    
    const inventoryStore = useInventoryStore()
    inventoryStore.decreaseStock(item.id, 1)
  }
}
```

可以直接调用其他 Store 的 action 或修改其状态。

## 调用其他 Store 的 action

```typescript
actions: {
  async completeOrder() {
    const orderStore = useOrderStore()
    const notificationStore = useNotificationStore()
    
    try {
      // 调用其他 Store 的 action
      const order = await orderStore.createOrder(this.items)
      
      notificationStore.show({
        type: 'success',
        message: `Order ${order.id} created!`
      })
      
      this.items = []
    } catch (e) {
      notificationStore.show({
        type: 'error',
        message: 'Order failed: ' + e.message
      })
    }
  }
}
```

## 避免循环调用

直接的循环调用会导致栈溢出：

```typescript
// ❌ 错误：循环调用
// storeA.ts
actions: {
  doA() {
    const storeB = useStoreB()
    storeB.doB()
  }
}

// storeB.ts
actions: {
  doB() {
    const storeA = useStoreA()
    storeA.doA()  // 调用 doA，doA 又调用 doB...
  }
}
```

解决方案一：重新设计逻辑

```typescript
// 抽取共享逻辑到单独的 Store
const useSharedLogicStore = defineStore('sharedLogic', {
  actions: {
    commonOperation() {
      // 共享逻辑
    }
  }
})
```

解决方案二：条件终止

```typescript
actions: {
  doB(fromA = false) {
    if (!fromA) {
      const storeA = useStoreA()
      storeA.doA()
    }
    // 其他逻辑
  }
}
```

## 事务模式

多个 Store 的协调操作：

```typescript
actions: {
  async transfer(fromAccountId: string, toAccountId: string, amount: number) {
    const accountStore = useAccountStore()
    const transactionStore = useTransactionStore()
    
    // 开始事务
    const transaction = transactionStore.begin()
    
    try {
      accountStore.debit(fromAccountId, amount)
      accountStore.credit(toAccountId, amount)
      
      transactionStore.commit(transaction)
    } catch (e) {
      // 回滚
      transactionStore.rollback(transaction)
      throw e
    }
  }
}
```

## 使用组合 Store

对于复杂的跨 Store 操作，创建组合 Store：

```typescript
const useCheckoutStore = defineStore('checkout', () => {
  const cartStore = useCartStore()
  const userStore = useUserStore()
  const paymentStore = usePaymentStore()
  const orderStore = useOrderStore()
  
  async function processCheckout(paymentInfo: PaymentInfo) {
    // 验证
    if (!userStore.isLoggedIn) {
      throw new Error('Not logged in')
    }
    if (cartStore.items.length === 0) {
      throw new Error('Cart is empty')
    }
    
    // 处理支付
    const paymentResult = await paymentStore.process(paymentInfo)
    
    // 创建订单
    const order = await orderStore.create({
      userId: userStore.userId,
      items: cartStore.items,
      paymentId: paymentResult.id
    })
    
    // 清空购物车
    cartStore.clear()
    
    return order
  }
  
  return { processCheckout }
})
```

这集中管理了跨 Store 的复杂逻辑。

## 事件模式

另一种解耦方式是事件模式：

```typescript
// eventBus.ts
import mitt from 'mitt'
export const eventBus = mitt()

// cartStore.ts
actions: {
  addToCart(item) {
    this.items.push(item)
    eventBus.emit('cart:item-added', item)
  }
}

// analyticsStore.ts
const useAnalyticsStore = defineStore('analytics', () => {
  // 监听事件
  eventBus.on('cart:item-added', (item) => {
    trackEvent('add_to_cart', item)
  })
  
  // ...
})
```

这减少了 Store 之间的直接依赖。

## 测试跨 Store action

```typescript
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})

test('checkout calls payment store', async () => {
  const cartStore = useCartStore()
  const paymentStore = usePaymentStore()
  const userStore = useUserStore()
  
  // 设置状态
  userStore.isLoggedIn = true
  cartStore.items = [{ id: '1', price: 100 }]
  
  // Mock 支付
  const processSpy = vi.spyOn(paymentStore, 'processPayment')
  
  cartStore.checkout()
  
  expect(processSpy).toHaveBeenCalledWith(cartStore.items)
  expect(cartStore.items).toHaveLength(0)
})
```

## 类型安全

TypeScript 提供跨 Store 类型检查：

```typescript
actions: {
  checkout() {
    const userStore = useUserStore()
    
    // 类型正确推断
    const id: string = userStore.userId
    const isAdmin: boolean = userStore.isAdmin
    
    // 调用其他 Store 的 action
    userStore.updateLastActivity()  // 有类型检查
  }
}
```

## 性能考量

频繁的跨 Store 调用有些开销：

```typescript
actions: {
  // 每次都获取 Store
  processItem(item) {
    const store = useOtherStore()  // 小开销
    store.process(item)
  }
}
```

对于批量操作，缓存 Store 引用：

```typescript
actions: {
  processItems(items: Item[]) {
    const store = useOtherStore()  // 只获取一次
    items.forEach(item => store.process(item))
  }
}
```

下一章我们将分析订阅系统的实现。
