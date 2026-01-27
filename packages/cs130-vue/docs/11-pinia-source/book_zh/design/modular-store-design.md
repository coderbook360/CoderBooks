# 模块化 Store 设计

随着应用规模增长，状态管理的复杂度也在增加。如何组织多个 Store？Store 之间如何交互？如何避免代码膨胀？这些问题需要清晰的模块化策略。Pinia 采用了与 Vuex 完全不同的模块化方案——扁平化的独立 Store 结构。

## 从 Vuex 的嵌套模块说起

Vuex 使用树形结构组织模块。根 Store 可以包含多个子模块，子模块还可以继续嵌套：

```javascript
// Vuex 的嵌套模块结构
const store = new Vuex.Store({
  modules: {
    user: {
      namespaced: true,
      state: () => ({ name: '' }),
      modules: {
        profile: {
          namespaced: true,
          state: () => ({ avatar: '' })
        },
        settings: {
          namespaced: true,
          state: () => ({ theme: 'light' })
        }
      }
    },
    cart: {
      namespaced: true,
      state: () => ({ items: [] })
    }
  }
})
```

这种结构在访问时会产生很长的路径：

```javascript
store.state.user.profile.avatar
store.commit('user/profile/SET_AVATAR', url)
store.dispatch('user/settings/updateTheme', 'dark')
```

嵌套越深，路径越长，代码越难维护。而且这些字符串路径没有类型检查，拼写错误只能在运行时发现。

## Pinia 的扁平化设计

Pinia 选择了完全不同的方向：没有嵌套，每个 Store 都是独立的顶级模块。

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', { /* ... */ })

// stores/user-profile.ts
export const useUserProfileStore = defineStore('user-profile', { /* ... */ })

// stores/user-settings.ts
export const useUserSettingsStore = defineStore('user-settings', { /* ... */ })

// stores/cart.ts
export const useCartStore = defineStore('cart', { /* ... */ })
```

使用时直接 import 需要的 Store：

```typescript
import { useUserStore } from '@/stores/user'
import { useUserProfileStore } from '@/stores/user-profile'

const userStore = useUserStore()
const profileStore = useUserProfileStore()

userStore.name
profileStore.avatar
```

没有嵌套路径，没有命名空间，访问方式与普通 JavaScript 模块完全一致。

## 文件组织策略

扁平化设计不意味着所有 Store 文件都堆在一个目录里。你可以通过文件目录来组织相关的 Store：

```
stores/
├── index.ts           # 统一导出（可选）
├── user/
│   ├── index.ts       # useUserStore
│   ├── profile.ts     # useUserProfileStore
│   └── settings.ts    # useUserSettingsStore
├── cart/
│   ├── index.ts       # useCartStore
│   └── items.ts       # useCartItemsStore
└── order/
    ├── index.ts       # useOrderStore
    └── history.ts     # useOrderHistoryStore
```

每个子目录可以有一个 index.ts 作为该领域的主 Store，其他文件是相关的辅助 Store。这种组织方式将逻辑相关的 Store 放在一起，便于查找和维护。

统一导出文件可以简化 import：

```typescript
// stores/index.ts
export { useUserStore } from './user'
export { useUserProfileStore } from './user/profile'
export { useUserSettingsStore } from './user/settings'
export { useCartStore } from './cart'
export { useOrderStore } from './order'

// 使用时
import { useUserStore, useCartStore } from '@/stores'
```

## Store 之间的依赖

在实际应用中，Store 之间经常需要相互访问。Pinia 的处理方式非常直接——在 action 或 getter 中 import 并调用其他 Store。

```typescript
// stores/order.ts
import { defineStore } from 'pinia'
import { useUserStore } from './user'
import { useCartStore } from './cart'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [] as Order[],
    isProcessing: false
  }),
  
  actions: {
    async createOrder() {
      const userStore = useUserStore()
      const cartStore = useCartStore()
      
      if (!userStore.isLoggedIn) {
        throw new Error('Please login first')
      }
      
      if (cartStore.isEmpty) {
        throw new Error('Cart is empty')
      }
      
      this.isProcessing = true
      try {
        const order = await api.createOrder({
          userId: userStore.id,
          items: cartStore.items,
          address: userStore.defaultAddress
        })
        
        this.orders.push(order)
        cartStore.clear()
        
        return order
      } finally {
        this.isProcessing = false
      }
    }
  }
})
```

这种方式有几个优点。首先，依赖关系清晰可见——从 import 语句就能知道这个 Store 依赖哪些其他 Store。其次，类型安全——userStore 和 cartStore 都有完整的类型信息。第三，按需加载——Store 只在被使用时才会被访问，支持代码分割。

需要注意的是，不要在 Store 定义的顶层调用其他 Store，而应该在 action 或 getter 的函数体内调用：

```typescript
// ❌ 错误：在顶层调用
export const useOrderStore = defineStore('order', {
  state: () => {
    const userStore = useUserStore()  // 可能失败，Pinia 还未初始化
    return {
      userId: userStore.id
    }
  }
})

// ✅ 正确：在 action/getter 内调用
export const useOrderStore = defineStore('order', {
  state: () => ({
    userId: ''
  }),
  
  actions: {
    syncWithUser() {
      const userStore = useUserStore()  // 在运行时调用，Pinia 已初始化
      this.userId = userStore.id
    }
  }
})
```

## 处理循环依赖

当两个 Store 相互依赖时，需要小心处理以避免死循环或初始化问题。

```typescript
// stores/a.ts
import { useBStore } from './b'

export const useAStore = defineStore('a', {
  actions: {
    doSomething() {
      const bStore = useBStore()
      bStore.doOther()
    }
  }
})

// stores/b.ts
import { useAStore } from './a'

export const useBStore = defineStore('b', {
  actions: {
    doOther() {
      const aStore = useAStore()
      aStore.doSomething()  // 如果不小心会造成无限循环
    }
  }
})
```

这种循环依赖本身在模块层面是可以工作的，因为 import 是惰性执行的。但如果在 action 中形成了调用循环，程序会陷入死循环。

解决方案是重新审视设计。循环依赖通常是设计问题的信号——可能需要将共享逻辑提取到第三个 Store，或者将双向依赖改为单向依赖。

```typescript
// 提取共享逻辑到独立 Store
// stores/shared.ts
export const useSharedStore = defineStore('shared', {
  state: () => ({ /* 共享状态 */ }),
  actions: {
    sharedLogic() { /* 共享逻辑 */ }
  }
})

// stores/a.ts
import { useSharedStore } from './shared'

export const useAStore = defineStore('a', {
  actions: {
    doSomething() {
      const shared = useSharedStore()
      shared.sharedLogic()
    }
  }
})

// stores/b.ts
import { useSharedStore } from './shared'

export const useBStore = defineStore('b', {
  actions: {
    doOther() {
      const shared = useSharedStore()
      shared.sharedLogic()
    }
  }
})
```

## 按领域划分 Store

一个常见的问题是：一个 Store 应该有多大？应该如何划分边界？

一种有效的策略是按领域（Domain）划分。每个领域对应一个或多个相关的 Store，管理该领域的状态和行为。

以电商应用为例，可以划分为以下领域：

用户领域（User Domain）管理用户认证、个人信息、偏好设置。商品领域（Product Domain）管理商品列表、详情、分类、搜索。购物车领域（Cart Domain）管理购物车项目、数量、价格计算。订单领域（Order Domain）管理订单创建、支付、历史记录。

```
stores/
├── user/
│   ├── auth.ts        # 登录、登出、token 管理
│   ├── profile.ts     # 用户资料
│   └── preferences.ts # 用户偏好设置
├── product/
│   ├── catalog.ts     # 商品目录
│   ├── detail.ts      # 商品详情（当前查看的商品）
│   └── search.ts      # 搜索状态和结果
├── cart/
│   └── index.ts       # 购物车（通常一个 Store 足够）
└── order/
    ├── checkout.ts    # 结账流程状态
    └── history.ts     # 订单历史
```

每个 Store 保持聚焦，只管理自己领域的状态。跨领域的操作（如创建订单需要用户信息和购物车数据）通过在 action 中调用其他 Store 来实现。

## Store 粒度的权衡

Store 划分过粗和过细都有问题。

过粗的 Store（把很多不相关的状态放在一起）会导致代码臃肿、难以维护、不利于代码分割。

过细的 Store（每个小功能一个 Store）会导致 Store 数量爆炸、依赖关系复杂、心智负担增加。

一个合理的判断标准是：这些状态是否需要一起变化？如果两个状态总是同时更新、同时使用，它们应该在同一个 Store。如果它们可以独立变化、被不同的组件使用，可以考虑分开。

另一个标准是可测试性：一个 Store 应该可以独立测试，不依赖太多其他 Store。如果测试一个 Store 需要 mock 十个其他 Store，说明依赖关系可能需要重新设计。

## Setup Store 中的模块化

Setup Store 提供了额外的模块化能力——通过 composables 共享逻辑。

```typescript
// composables/useLoadable.ts
export function useLoadable<T>(fetchFn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  
  async function load() {
    isLoading.value = true
    error.value = null
    try {
      data.value = await fetchFn()
    } catch (e) {
      error.value = e as Error
    } finally {
      isLoading.value = false
    }
  }
  
  function reset() {
    data.value = null
    error.value = null
  }
  
  return { data, isLoading, error, load, reset }
}

// 在多个 Store 中复用
export const useProductStore = defineStore('product', () => {
  const products = useLoadable(() => api.getProducts())
  const categories = useLoadable(() => api.getCategories())
  
  return { products, categories }
})

export const useOrderStore = defineStore('order', () => {
  const orders = useLoadable(() => api.getOrders())
  
  return { orders }
})
```

这种 composable 复用模式是 Pinia 与 Composition API 结合的强大能力，在 Options Store 中无法实现。

下一章，我们将深入探讨 Store 组合与嵌套的高级模式，看看如何在复杂场景下优雅地组织多个 Store 的协作。
