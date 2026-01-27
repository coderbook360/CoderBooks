# Store 组合与嵌套

上一章我们讨论了 Pinia 的扁平化模块设计。但在实际项目中，Store 之间的关系往往比简单的并列更复杂。有时候我们需要一个 Store 派生自另一个 Store，有时候需要多个 Store 协同工作。这一章我们将探讨 Store 组合与嵌套的高级模式。

## 组合式 Store 模式

虽然 Pinia 不支持像 Vuex 那样的模块嵌套，但我们可以通过组合的方式实现类似的效果。核心思想是：一个 Store 可以使用其他 Store 作为其实现的一部分。

```typescript
// stores/user-base.ts
export const useUserBaseStore = defineStore('user-base', {
  state: () => ({
    id: '',
    name: '',
    email: ''
  }),
  
  actions: {
    setUser(user: User) {
      this.id = user.id
      this.name = user.name
      this.email = user.email
    },
    
    clear() {
      this.id = ''
      this.name = ''
      this.email = ''
    }
  }
})

// stores/user-auth.ts
import { useUserBaseStore } from './user-base'

export const useUserAuthStore = defineStore('user-auth', {
  state: () => ({
    token: '',
    isLoading: false
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  
  actions: {
    async login(credentials: Credentials) {
      this.isLoading = true
      try {
        const { token, user } = await api.login(credentials)
        this.token = token
        
        // 组合使用 user-base Store
        const userBase = useUserBaseStore()
        userBase.setUser(user)
      } finally {
        this.isLoading = false
      }
    },
    
    logout() {
      this.token = ''
      const userBase = useUserBaseStore()
      userBase.clear()
    }
  }
})
```

这种模式将用户数据（user-base）和认证逻辑（user-auth）分离。认证 Store 负责 token 管理和登录流程，同时操作用户数据 Store。两个 Store 各自保持简单，但通过组合实现了完整的功能。

## Getter 组合

有时候我们需要从多个 Store 计算派生数据。这可以通过在 getter 中访问其他 Store 来实现：

```typescript
// stores/cart.ts
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[]
  }),
  
  getters: {
    subtotal: (state) => {
      return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }
  }
})

// stores/shipping.ts
export const useShippingStore = defineStore('shipping', {
  state: () => ({
    method: 'standard' as 'standard' | 'express',
    address: null as Address | null
  }),
  
  getters: {
    shippingCost(): number {
      return this.method === 'express' ? 20 : 5
    }
  }
})

// stores/checkout.ts
import { useCartStore } from './cart'
import { useShippingStore } from './shipping'

export const useCheckoutStore = defineStore('checkout', {
  getters: {
    // 组合多个 Store 的数据
    total(): number {
      const cart = useCartStore()
      const shipping = useShippingStore()
      return cart.subtotal + shipping.shippingCost
    },
    
    orderSummary(): OrderSummary {
      const cart = useCartStore()
      const shipping = useShippingStore()
      
      return {
        items: cart.items,
        subtotal: cart.subtotal,
        shipping: shipping.shippingCost,
        total: this.total,
        address: shipping.address
      }
    }
  }
})
```

checkout Store 本身没有状态，它的职责是组合其他 Store 的数据，提供结账所需的汇总信息。这种"聚合 Store"模式在复杂场景下很有用。

## 动态 Store 模式

有时候我们需要创建多个结构相同但 ID 不同的 Store 实例。比如在多标签页应用中，每个标签页可能需要独立的状态。

Pinia 的 Store 是单例的——同一个 `defineStore` 返回的函数，无论调用多少次，都返回同一个实例。但我们可以通过工厂函数创建动态 Store：

```typescript
// stores/tab.ts
function createTabStore(tabId: string) {
  return defineStore(`tab-${tabId}`, {
    state: () => ({
      content: '',
      isLoading: false,
      isDirty: false
    }),
    
    actions: {
      setContent(content: string) {
        this.content = content
        this.isDirty = true
      },
      
      async save() {
        this.isLoading = true
        try {
          await api.saveTab(tabId, this.content)
          this.isDirty = false
        } finally {
          this.isLoading = false
        }
      }
    }
  })
}

// 使用时动态创建
const useTab1Store = createTabStore('tab-1')
const useTab2Store = createTabStore('tab-2')

// 在组件中
const tab1 = useTab1Store()
const tab2 = useTab2Store()

// 它们是独立的实例
tab1.setContent('content 1')
tab2.setContent('content 2')
```

这种模式的关键是每次调用工厂函数时使用不同的 Store ID。Pinia 通过 ID 区分不同的 Store 实例。

需要注意动态 Store 的清理问题。当标签页关闭时，对应的 Store 仍然存在于 Pinia 中。如果需要清理，可以使用 `$dispose`：

```typescript
// 清理 Store
function closeTab(tabId: string) {
  const useTabStore = createTabStore(tabId)
  const store = useTabStore()
  store.$dispose()  // 清理 Store 的订阅和副作用
}
```

## 层级关系模式

虽然 Pinia 是扁平化的，但我们可以在逻辑上建立 Store 的层级关系。父 Store 管理全局状态，子 Store 管理局部状态，子 Store 从父 Store 读取数据。

```typescript
// stores/app.ts（顶层 Store）
export const useAppStore = defineStore('app', {
  state: () => ({
    user: null as User | null,
    settings: {
      theme: 'light',
      language: 'zh'
    }
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.user
  }
})

// stores/dashboard.ts（子领域 Store）
import { useAppStore } from './app'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    widgets: [] as Widget[],
    layout: 'grid' as 'grid' | 'list'
  }),
  
  getters: {
    // 基于父 Store 的数据计算
    visibleWidgets(): Widget[] {
      const app = useAppStore()
      
      // 未登录用户看到的 widgets 不同
      if (!app.isLoggedIn) {
        return this.widgets.filter(w => w.public)
      }
      
      return this.widgets
    }
  },
  
  actions: {
    loadDashboard() {
      const app = useAppStore()
      
      // 根据用户设置加载不同配置
      if (app.settings.language === 'zh') {
        this.loadChineseWidgets()
      } else {
        this.loadEnglishWidgets()
      }
    }
  }
})
```

这种模式下，app Store 作为"父"Store 提供全局数据，dashboard Store 作为"子"Store 在需要时读取父 Store 的数据。这种依赖关系是单向的，避免了循环依赖。

## 事件驱动的 Store 通信

有时候 Store 之间需要通信，但不适合直接调用。比如当一个事件发生时，多个 Store 需要响应。我们可以使用事件驱动的模式：

```typescript
// utils/event-bus.ts
import mitt from 'mitt'

type Events = {
  'user:login': User
  'user:logout': void
  'cart:updated': CartItem[]
}

export const eventBus = mitt<Events>()

// stores/user.ts
import { eventBus } from '@/utils/event-bus'

export const useUserStore = defineStore('user', {
  actions: {
    async login(credentials: Credentials) {
      const user = await api.login(credentials)
      this.user = user
      
      // 发布事件
      eventBus.emit('user:login', user)
    },
    
    logout() {
      this.user = null
      eventBus.emit('user:logout')
    }
  }
})

// stores/cart.ts
import { eventBus } from '@/utils/event-bus'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[]
  }),
  
  actions: {
    init() {
      // 监听用户登出事件，清空购物车
      eventBus.on('user:logout', () => {
        this.items = []
      })
      
      // 监听用户登录事件，加载购物车
      eventBus.on('user:login', async (user) => {
        await this.loadCart(user.id)
      })
    }
  }
})
```

这种模式解耦了 Store 之间的直接依赖。user Store 不需要知道有哪些 Store 关心登录/登出事件，它只管发布事件。cart Store 也不需要知道登出事件从哪里来，它只管响应事件。

但要注意事件驱动模式的缺点：数据流变得隐式，debug 时可能难以追踪事件的来源和去向。在简单场景下，直接调用可能更清晰。

## Setup Store 中的高级组合

Setup Store 提供了更灵活的组合能力。你可以将多个 Store 的逻辑封装成 composable，然后在 Store 中组合使用：

```typescript
// composables/useSync.ts
export function useSync<T>(
  key: string,
  initialValue: T,
  serialize = JSON.stringify,
  deserialize = JSON.parse
) {
  const data = ref<T>(initialValue) as Ref<T>
  
  // 从 localStorage 恢复
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      data.value = deserialize(saved)
    } catch (e) {
      console.warn(`Failed to parse ${key}`)
    }
  }
  
  // 监听变化并持久化
  watch(data, (newValue) => {
    localStorage.setItem(key, serialize(newValue))
  }, { deep: true })
  
  return data
}

// stores/settings.ts
import { useSync } from '@/composables/useSync'

export const useSettingsStore = defineStore('settings', () => {
  // 使用 composable 实现自动持久化
  const theme = useSync('settings.theme', 'light')
  const language = useSync('settings.language', 'zh')
  const fontSize = useSync('settings.fontSize', 14)
  
  function reset() {
    theme.value = 'light'
    language.value = 'zh'
    fontSize.value = 14
  }
  
  return { theme, language, fontSize, reset }
})
```

这种组合方式非常强大。每个 composable 封装一个独立的关注点（如持久化、防抖、验证），Store 通过组合这些 composable 来构建复杂功能，保持每个部分的简单性。

下一章，我们将探讨 Pinia 的插件系统设计，看看如何通过插件扩展所有 Store 的能力。
