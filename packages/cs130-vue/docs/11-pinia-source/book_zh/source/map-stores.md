# mapStores 辅助函数

mapStores 是 Options API 的辅助函数，用于在组件中映射多个 Store。这一章分析其实现。

## 问题场景

Options API 组件中使用 Pinia Store：

```typescript
export default {
  computed: {
    // 手动定义每个 Store
    userStore() {
      return useUserStore()
    },
    cartStore() {
      return useCartStore()
    }
  }
}
```

多个 Store 时很繁琐。

## 基本用法

```typescript
import { mapStores } from 'pinia'

export default {
  computed: {
    ...mapStores(useUserStore, useCartStore)
  },
  methods: {
    checkout() {
      // 通过计算属性访问
      this.userStore.userId
      this.cartStore.items
    }
  }
}
```

## 实现分析

```typescript
export function mapStores<Stores extends Record<string, StoreDefinition>>(
  ...stores: [...Stores[]]
): _Spread<Stores> {
  return stores.reduce((reduced, useStore) => {
    // 获取 Store ID
    const id = useStore.$id
    
    // 生成计算属性名
    const name = id + mapStoreSuffix
    
    // 创建计算属性
    reduced[name] = function (this: ComponentPublicInstance) {
      return useStore(this.$pinia)
    }
    
    return reduced
  }, {} as _Spread<Stores>)
}
```

遍历所有 useStore 函数，为每个创建计算属性。

## $id 属性

每个 useStore 函数都有 $id：

```typescript
const useUserStore = defineStore('user', { ... })

console.log(useUserStore.$id)  // 'user'
```

这是在 defineStore 时添加的：

```typescript
function useStore(pinia?: Pinia) {
  // ...
}

useStore.$id = id  // 设置 $id
return useStore
```

## 命名约定

默认情况下，Store 名加 "Store" 后缀：

```typescript
mapStores(useUserStore, useCartStore)
// 生成：userStore, cartStore
```

可以自定义后缀：

```typescript
import { setMapStoreSuffix } from 'pinia'

setMapStoreSuffix('')  // 无后缀
// 生成：user, cart

setMapStoreSuffix('_store')
// 生成：user_store, cart_store
```

## this.$pinia

计算属性中使用 this.$pinia：

```typescript
reduced[name] = function (this: ComponentPublicInstance) {
  return useStore(this.$pinia)
}
```

$pinia 是通过 Vue 的 provide/inject 注入的，在 Options API 组件中可通过 this 访问。

## 返回类型

返回值是一组计算属性定义：

```typescript
// mapStores 返回类似这样的对象
{
  userStore: {
    get() {
      return useUserStore(this.$pinia)
    }
  },
  cartStore: {
    get() {
      return useCartStore(this.$pinia)
    }
  }
}
```

使用展开运算符合并到 computed：

```typescript
computed: {
  ...mapStores(useUserStore, useCartStore)
}
```

## 类型推断

TypeScript 能正确推断 Store 类型：

```typescript
export default {
  computed: {
    ...mapStores(useUserStore, useCartStore)
  },
  methods: {
    example() {
      // 类型正确
      this.userStore.name  // string
      this.cartStore.items  // CartItem[]
    }
  }
}
```

## 与 Vuex 对比

Vuex 的 mapState 等直接映射属性：

```typescript
// Vuex
computed: {
  ...mapState(['user', 'cart'])
}

this.user  // 直接是状态值
```

Pinia 的 mapStores 映射整个 Store：

```typescript
// Pinia
computed: {
  ...mapStores(useUserStore)
}

this.userStore.user  // 通过 Store 访问
```

这种设计更明确，避免命名冲突。

## 多个 Store 的情况

```typescript
computed: {
  ...mapStores(
    useUserStore,
    useCartStore,
    useProductStore,
    useOrderStore
  )
},
methods: {
  complexOperation() {
    const user = this.userStore.currentUser
    const cart = this.cartStore.items
    const products = this.productStore.catalog
    
    this.orderStore.createOrder(user, cart, products)
  }
}
```

## 响应性

mapStores 返回的是计算属性，每次访问调用 useStore：

```typescript
// 每次访问都获取最新的 Store 状态
this.userStore.name  // 响应式
```

实际上 useStore 返回的是同一个 Store 实例，但通过计算属性确保了响应式追踪。

## 常见用法

组件中使用多个 Store：

```typescript
import { mapStores } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

export default {
  name: 'CheckoutPage',
  
  computed: {
    ...mapStores(useUserStore, useCartStore),
    
    // 可以基于 Store 定义其他计算属性
    canCheckout() {
      return this.userStore.isLoggedIn && this.cartStore.items.length > 0
    }
  },
  
  methods: {
    async checkout() {
      await this.cartStore.checkout()
      this.$router.push('/order-confirmation')
    }
  }
}
```

## 注意事项

只在 Options API 中使用：

```typescript
// ❌ 组合式 API 中不需要
setup() {
  const { userStore } = mapStores(useUserStore)  // 不是这样用
  
  // ✅ 直接调用
  const userStore = useUserStore()
}
```

确保 Pinia 已安装：

```typescript
// main.ts
app.use(pinia)  // 必须安装，否则 this.$pinia 是 undefined
```

## 性能

每次访问计算属性都调用 useStore：

```typescript
// 频繁访问
for (let i = 0; i < 1000; i++) {
  this.userStore.count  // 每次都调用 useStore
}
```

useStore 只是从 Map 获取 Store，开销很小。但如果担心，可以缓存：

```typescript
methods: {
  processMany() {
    const store = this.userStore  // 缓存引用
    for (let i = 0; i < 1000; i++) {
      store.count
    }
  }
}
```

## 与其他 map 函数配合

```typescript
computed: {
  ...mapStores(useUserStore),
  ...mapState(useUserStore, ['name', 'age']),  // 直接映射状态
  ...mapGetters(useUserStore, ['fullName'])    // 直接映射 getter
}
```

mapStores 映射整个 Store，mapState/mapGetters 映射特定属性。

下一章我们将分析 mapState 辅助函数。
