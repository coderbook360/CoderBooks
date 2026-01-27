# 跨 Store 的 getters

一个 Store 的 getter 可以访问其他 Store 的状态和 getters。这一章分析跨 Store getters 的实现和注意事项。

## 基本用法

Options Store 中访问其他 Store：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    userId: null as string | null,
    name: ''
  })
})

const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[]
  }),
  getters: {
    // 在 getter 中调用其他 Store
    userOrders() {
      const userStore = useUserStore()
      return this.orders.filter(o => o.userId === userStore.userId)
    }
  }
})
```

Setup Store 中更直接：

```typescript
const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()
  const orders = ref<Order[]>([])
  
  const userOrders = computed(() => 
    orders.value.filter(o => o.userId === userStore.userId)
  )
  
  return { orders, userOrders }
})
```

## 工作原理

getter 内部调用 useUserStore 时：

```typescript
userOrders() {
  const userStore = useUserStore()
  // useUserStore 内部会调用 getActivePinia() 获取 pinia 实例
  // 然后从 pinia._s.get('user') 获取 Store
}
```

因为 Options Store getter 执行时会先 setActivePinia：

```typescript
computed(() => {
  setActivePinia(pinia)  // 确保 activePinia 可用
  const store = pinia._s.get(id)!
  return getters![name].call(store, store)
})
```

所以 getter 内部的 useXxxStore 调用能正确工作。

## 依赖追踪

跨 Store 的依赖会被正确追踪：

```typescript
const userOrders = computed(() => 
  orders.value.filter(o => o.userId === userStore.userId)
)

// 当 userStore.userId 变化时，userOrders 会重新计算
userStore.userId = 'new-id'
// userOrders 自动更新
```

computed 不关心值来自哪个 Store，只追踪访问的响应式属性。

## 初始化顺序

跨 Store 依赖会自动处理初始化顺序：

```typescript
// OrderStore setup
const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()  // 如果 userStore 不存在，会自动创建
  // ...
})
```

当 useOrderStore 首次调用时：

1. 检查 order Store 是否存在 → 否
2. 运行 order 的 setup 函数
3. setup 中调用 useUserStore
4. 检查 user Store 是否存在 → 否
5. 创建 user Store
6. useUserStore 返回 user Store
7. 继续 order 的 setup
8. order Store 创建完成

## 避免循环依赖

直接的循环依赖会导致问题：

```typescript
// ❌ 错误：循环依赖
const useStoreA = defineStore('a', () => {
  const storeB = useStoreB()
  // ...
})

const useStoreB = defineStore('b', () => {
  const storeA = useStoreA()
  // ...
})
```

解决方案是延迟访问：

```typescript
// ✅ 正确：在 getter 或 action 中访问
const useStoreA = defineStore('a', () => {
  const value = ref(0)
  
  // 不在顶层获取 storeB
  const combinedValue = computed(() => {
    const storeB = useStoreB()  // 延迟到使用时获取
    return value.value + storeB.value
  })
  
  return { value, combinedValue }
})
```

当 combinedValue 被访问时，两个 Store 都已初始化完成。

## Options Store 的自动延迟

Options Store 的 getter 天然是延迟执行的：

```typescript
const useStoreA = defineStore('a', {
  getters: {
    combined() {
      const storeB = useStoreB()  // 在 getter 被访问时才执行
      return this.value + storeB.value
    }
  }
})
```

这是因为 getter 被包装成 computed，computed 是惰性计算的。

## 跨 Store getter 的性能

每次访问 getter 都会调用 useOtherStore：

```typescript
combined() {
  const otherStore = useOtherStore()  // 每次 getter 执行都调用
  return this.value + otherStore.value
}
```

useOtherStore 内部只是从 Map 中获取已存在的 Store，开销很小：

```typescript
function useStore(pinia) {
  if (pinia._s.has(id)) {
    return pinia._s.get(id)  // O(1) 操作
  }
  // ...
}
```

通常不需要担心性能，除非在极端高频场景。

## Setup Store 中缓存引用

Setup Store 可以在顶层缓存引用（如果没有循环依赖）：

```typescript
const useOrderStore = defineStore('order', () => {
  // 顶层获取，整个 setup 过程只调用一次
  const userStore = useUserStore()
  
  // 多个 computed 复用同一个引用
  const userOrders = computed(() => 
    orders.value.filter(o => o.userId === userStore.userId)
  )
  
  const userOrderCount = computed(() => userOrders.value.length)
  
  return { userOrders, userOrderCount }
})
```

## 类型安全

TypeScript 能正确推断跨 Store 类型：

```typescript
const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()
  
  const userOrders = computed(() => {
    // userStore.userId 类型正确：string | null
    // userStore.name 类型正确：string
    return orders.value.filter(o => o.userId === userStore.userId)
  })
})
```

## 测试中的注意事项

测试跨 Store getter 时需要确保依赖的 Store 有正确状态：

```typescript
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})

test('userOrders filters correctly', () => {
  // 设置 userStore 状态
  const userStore = useUserStore()
  userStore.userId = 'user-1'
  
  // 设置 orderStore 状态
  const orderStore = useOrderStore()
  orderStore.orders = [
    { id: 1, userId: 'user-1' },
    { id: 2, userId: 'user-2' }
  ]
  
  // 验证跨 Store getter
  expect(orderStore.userOrders).toHaveLength(1)
  expect(orderStore.userOrders[0].id).toBe(1)
})
```

## 替代方案：参数传递

有时更好的设计是通过参数传递依赖：

```typescript
// 而不是在 getter 中获取 userStore
getters: {
  userOrders() {
    const userStore = useUserStore()
    return this.ordersByUser(userStore.userId)
  },
  
  // 更通用的 getter
  ordersByUser: (state) => (userId: string | null) => {
    return state.orders.filter(o => o.userId === userId)
  }
}
```

这样 ordersByUser 可以用于任何用户，不只是当前用户。

## 组合 Store 模式

对于复杂的跨 Store 逻辑，可以创建组合 Store：

```typescript
// 组合多个 Store 的派生状态
const useDashboardStore = defineStore('dashboard', () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const productStore = useProductStore()
  
  // 聚合多个 Store 的数据
  const dashboardData = computed(() => ({
    userName: userStore.name,
    orderCount: orderStore.userOrders.length,
    recentProducts: productStore.recentViewed
  }))
  
  return { dashboardData }
})
```

这集中管理了跨 Store 的复杂依赖。

下一章我们将分析 actions 的实现机制。
