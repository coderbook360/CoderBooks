# storeIntegration 状态管理集成

Vue SSR 需要与状态管理库（如 Pinia、Vuex）深度集成。本章分析状态管理在 SSR 中的工作原理和最佳实践。

## SSR 状态管理的挑战

1. **请求隔离**：每个请求需要独立的状态实例
2. **状态预取**：服务端获取数据填充 store
3. **状态传递**：将服务端状态传到客户端
4. **水合同步**：客户端 store 恢复服务端状态

## Pinia 集成

### 服务端设置

```typescript
// server.ts
import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

export async function render(url: string) {
  // 每个请求创建新实例
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  
  // 渲染应用
  const html = await renderToString(app)
  
  // 提取状态
  const state = pinia.state.value
  
  return { html, state }
}
```

### 客户端水合

```typescript
// client.ts
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

// 恢复服务端状态
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}

app.use(pinia)
app.mount('#app')
```

## 请求隔离

确保每个请求独立：

```typescript
// 创建 store 工厂
function createStores(pinia: Pinia) {
  return {
    user: useUserStore(pinia),
    cart: useCartStore(pinia),
    products: useProductsStore(pinia)
  }
}

// 服务端使用
async function handleRequest(req: Request) {
  const pinia = createPinia()
  const stores = createStores(pinia)
  
  // 预取数据
  await stores.user.fetchCurrentUser(req.cookies.token)
  await stores.products.fetchProducts()
  
  // 渲染...
}
```

## 数据预取模式

### 组件级预取

```typescript
// 在组件中定义 serverPrefetch
export default {
  async serverPrefetch() {
    const store = useProductStore()
    await store.fetchProducts()
  },
  
  setup() {
    const store = useProductStore()
    
    // 客户端导航时获取
    onMounted(async () => {
      if (store.products.length === 0) {
        await store.fetchProducts()
      }
    })
    
    return { products: store.products }
  }
}
```

### 路由级预取

```typescript
// router.ts
const routes = [
  {
    path: '/products',
    component: ProductList,
    meta: {
      prefetch: async (store: ReturnType<typeof createStores>) => {
        await store.products.fetchProducts()
      }
    }
  },
  {
    path: '/products/:id',
    component: ProductDetail,
    meta: {
      prefetch: async (store, route) => {
        await store.products.fetchProduct(route.params.id)
      }
    }
  }
]

// 服务端路由处理
async function prefetchRouteData(route: RouteLocationNormalized, stores: Stores) {
  const matched = route.matched
  
  await Promise.all(
    matched.map(record => {
      if (record.meta.prefetch) {
        return record.meta.prefetch(stores, route)
      }
    })
  )
}
```

## Store 定义最佳实践

```typescript
// stores/products.ts
import { defineStore } from 'pinia'

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [] as Product[],
    currentProduct: null as Product | null,
    loading: false,
    error: null as Error | null
  }),
  
  actions: {
    async fetchProducts() {
      // 避免重复请求
      if (this.products.length > 0) return
      
      this.loading = true
      this.error = null
      
      try {
        this.products = await $fetch('/api/products')
      } catch (e) {
        this.error = e as Error
      } finally {
        this.loading = false
      }
    },
    
    async fetchProduct(id: string) {
      // 先检查已有数据
      const existing = this.products.find(p => p.id === id)
      if (existing) {
        this.currentProduct = existing
        return
      }
      
      this.loading = true
      
      try {
        this.currentProduct = await $fetch(`/api/products/${id}`)
      } catch (e) {
        this.error = e as Error
      } finally {
        this.loading = false
      }
    }
  }
})
```

## Composition API 风格

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  
  const isLoggedIn = computed(() => user.value !== null)
  const displayName = computed(() => user.value?.name || 'Guest')
  
  async function fetchCurrentUser(token?: string) {
    if (!token) return
    
    loading.value = true
    
    try {
      user.value = await $fetch('/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }
  
  function logout() {
    user.value = null
  }
  
  return {
    user,
    loading,
    isLoggedIn,
    displayName,
    fetchCurrentUser,
    logout
  }
})
```

## 状态持久化

```typescript
// 客户端持久化插件
function createPersistPlugin() {
  return ({ store }: PiniaPluginContext) => {
    // 从 localStorage 恢复
    const savedState = localStorage.getItem(`pinia-${store.$id}`)
    if (savedState) {
      store.$patch(JSON.parse(savedState))
    }
    
    // 监听变化并保存
    store.$subscribe((mutation, state) => {
      localStorage.setItem(`pinia-${store.$id}`, JSON.stringify(state))
    })
  }
}

// 使用
const pinia = createPinia()
pinia.use(createPersistPlugin())
```

## SSR 安全的 Store

```typescript
// 处理服务端/客户端差异
function createSSRSafeStore() {
  return defineStore('settings', () => {
    // 服务端安全的默认值
    const theme = ref('light')
    const language = ref('en')
    
    // 仅客户端执行
    if (typeof window !== 'undefined') {
      // 从系统读取偏好
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme.value = 'dark'
      }
      
      // 从浏览器读取语言
      language.value = navigator.language.slice(0, 2)
    }
    
    return { theme, language }
  })
}
```

## Store 之间的依赖

```typescript
// stores/cart.ts
export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  
  // 依赖 user store
  const userStore = useUserStore()
  
  // 依赖 product store
  const productStore = useProductStore()
  
  const total = computed(() => {
    return items.value.reduce((sum, item) => {
      const product = productStore.products.find(p => p.id === item.productId)
      return sum + (product?.price || 0) * item.quantity
    }, 0)
  })
  
  async function checkout() {
    if (!userStore.isLoggedIn) {
      throw new Error('Please login first')
    }
    
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        userId: userStore.user!.id,
        items: items.value
      }
    })
    
    items.value = []
  }
  
  return { items, total, checkout }
})
```

## Vuex 集成（兼容）

```typescript
// Vuex 4 SSR 设置
import { createStore } from 'vuex'

export function createSSRStore() {
  return createStore({
    state: () => ({
      user: null,
      products: []
    }),
    
    mutations: {
      SET_USER(state, user) {
        state.user = user
      },
      SET_PRODUCTS(state, products) {
        state.products = products
      }
    },
    
    actions: {
      async fetchUser({ commit }, token) {
        const user = await $fetch('/api/user', {
          headers: { Authorization: `Bearer ${token}` }
        })
        commit('SET_USER', user)
      },
      
      async fetchProducts({ commit }) {
        const products = await $fetch('/api/products')
        commit('SET_PRODUCTS', products)
      }
    }
  })
}

// 服务端
const store = createSSRStore()
await store.dispatch('fetchProducts')
const state = store.state

// 客户端
const store = createSSRStore()
if (window.__VUEX_STATE__) {
  store.replaceState(window.__VUEX_STATE__)
}
```

## 状态快照与回滚

```typescript
function createStateSnapshot(pinia: Pinia) {
  return JSON.parse(JSON.stringify(pinia.state.value))
}

function restoreStateSnapshot(pinia: Pinia, snapshot: any) {
  pinia.state.value = snapshot
}

// 使用场景：表单提交失败回滚
async function submitWithRollback(action: () => Promise<void>) {
  const pinia = getActivePinia()!
  const snapshot = createStateSnapshot(pinia)
  
  try {
    await action()
  } catch (e) {
    // 回滚状态
    restoreStateSnapshot(pinia, snapshot)
    throw e
  }
}
```

## 调试工具集成

```typescript
// 开发环境状态检查
if (__DEV__) {
  const pinia = createPinia()
  
  pinia.use(({ store }) => {
    store.$subscribe((mutation, state) => {
      console.log(`[${store.$id}] ${mutation.type}`, mutation.payload)
    })
  })
  
  // 暴露给 devtools
  if (typeof window !== 'undefined') {
    (window as any).__PINIA__ = pinia
  }
}
```

## 完整 SSR 流程

```typescript
// entry-server.ts
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'
import { createRouter } from './router'
import App from './App.vue'

export async function render(url: string, context: SSRContext) {
  const app = createSSRApp(App)
  const pinia = createPinia()
  const router = createRouter()
  
  app.use(pinia)
  app.use(router)
  
  // 导航到请求的 URL
  router.push(url)
  await router.isReady()
  
  // 预取路由数据
  const matchedComponents = router.currentRoute.value.matched
  await Promise.all(
    matchedComponents.map(record => {
      const Component = record.components?.default
      if (Component?.serverPrefetch) {
        return Component.serverPrefetch.call({ $pinia: pinia })
      }
    })
  )
  
  // 渲染
  const html = await renderToString(app, context)
  
  // 返回 HTML 和状态
  return {
    html,
    state: pinia.state.value,
    headTags: context.teleports?.['head'] || ''
  }
}

// entry-client.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter } from './router'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
const router = createRouter()

// 恢复状态
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}

app.use(pinia)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
```

## 小结

SSR 状态管理的关键点：

1. **请求隔离**：每个请求独立的 store 实例
2. **数据预取**：服务端填充 store 数据
3. **状态序列化**：安全地传递到客户端
4. **水合恢复**：客户端使用服务端状态
5. **避免重复请求**：检查已有数据

正确的状态管理集成是构建可靠 SSR 应用的基础，确保服务端和客户端状态一致。
