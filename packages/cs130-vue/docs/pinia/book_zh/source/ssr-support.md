# SSR 支持

Pinia 原生支持服务端渲染。这一章分析 SSR 相关的设计和实现。

## SSR 的挑战

服务端渲染面临的状态管理问题：

- 每个请求需要独立的状态
- 服务端状态需要传递到客户端
- 避免状态污染

## 核心设计

Pinia 通过 Pinia 实例隔离解决这些问题：

```typescript
// 每个请求创建新的 Pinia 实例
export default function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  
  return { app, pinia }
}
```

## 服务端状态隔离

每个请求有独立的 Pinia 实例：

```typescript
// server.js
app.get('*', async (req, res) => {
  // 每个请求创建新实例
  const { app, pinia } = createApp()
  
  // 渲染应用
  const html = await renderToString(app)
  
  // 获取状态
  const state = pinia.state.value
  
  // 返回 HTML 和状态
  res.send(`
    <html>
      <body>${html}</body>
      <script>window.__PINIA_STATE__ = ${JSON.stringify(state)}</script>
    </html>
  `)
})
```

## 状态传递原理

服务端状态通过全局变量传递：

```typescript
// 服务端：将状态序列化到 HTML
const state = pinia.state.value
const serialized = JSON.stringify(state)
// 注入到 HTML：window.__PINIA_STATE__ = {...}

// 客户端：恢复状态
const pinia = createPinia()
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}
```

## Pinia 的 SSR 机制

createPinia 时检查初始状态：

```typescript
function createPinia(): Pinia {
  const state = ref({})
  
  const pinia: Pinia = {
    state,
    // ...
    install(app) {
      // 客户端恢复状态
      if (typeof window !== 'undefined' && (window as any).__PINIA_STATE__) {
        state.value = (window as any).__PINIA_STATE__
        delete (window as any).__PINIA_STATE__
      }
    }
  }
  
  return pinia
}
```

## Store 创建时机

服务端和客户端的 Store 创建行为不同：

```typescript
function useStore(pinia?: Pinia) {
  // 获取 Pinia 实例
  const currentPinia = pinia || getCurrentPinia()
  
  // 检查是否已存在
  if (!currentPinia._s.has(id)) {
    // 创建 Store
    createStore(id, options, currentPinia)
    
    // SSR 时检查是否有预取状态
    if (currentPinia.state.value[id]) {
      // 使用预取状态初始化
      initializeWithServerState(store, currentPinia.state.value[id])
    }
  }
  
  return currentPinia._s.get(id)
}
```

## 数据预取

在服务端预取数据：

```typescript
// 路由组件
export default {
  async serverPrefetch() {
    const store = useUserStore()
    await store.fetchUser()
  }
}

// 或使用 Composition API
export default {
  async setup() {
    const store = useUserStore()
    
    // 服务端预取
    if (typeof window === 'undefined') {
      await store.fetchUser()
    }
    
    return { store }
  }
}
```

## onServerPrefetch

Vue 3 提供的钩子：

```typescript
import { onServerPrefetch } from 'vue'

setup() {
  const store = useUserStore()
  
  onServerPrefetch(async () => {
    await store.fetchUser()
  })
  
  return { store }
}
```

## 避免状态污染

确保每个请求独立：

```typescript
// ❌ 错误：共享实例
const pinia = createPinia()

export default function createApp() {
  const app = createSSRApp(App)
  app.use(pinia)  // 所有请求共享
  return { app }
}

// ✅ 正确：每请求创建
export default function createApp() {
  const pinia = createPinia()  // 每次调用创建新实例
  const app = createSSRApp(App)
  app.use(pinia)
  return { app, pinia }
}
```

## Nuxt 集成

Nuxt 3 自动处理 Pinia SSR：

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt']
})

// 使用
const store = useUserStore()
// SSR 自动处理
```

## 手动 SSR 设置

不使用框架时的完整设置：

```typescript
// entry-server.ts
import { createApp } from './app'
import { renderToString } from 'vue/server-renderer'

export async function render(url: string) {
  const { app, pinia, router } = createApp()
  
  // 等待路由就绪
  await router.push(url)
  await router.isReady()
  
  // 渲染应用（触发 serverPrefetch）
  const html = await renderToString(app)
  
  // 序列化状态
  const state = pinia.state.value
  
  return { html, state }
}

// entry-client.ts
import { createApp } from './app'

const { app, pinia } = createApp()

// 恢复状态
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}

app.mount('#app')
```

## 异步 Action 处理

服务端需要等待异步操作：

```typescript
const useDataStore = defineStore('data', {
  state: () => ({
    items: [],
    loading: false
  }),
  actions: {
    async fetchItems() {
      this.loading = true
      try {
        this.items = await api.getItems()
      } finally {
        this.loading = false
      }
    }
  }
})

// 组件中确保等待完成
onServerPrefetch(async () => {
  await store.fetchItems()
})
```

## 条件代码

区分服务端和客户端：

```typescript
actions: {
  init() {
    if (typeof window !== 'undefined') {
      // 客户端专用代码
      this.initLocalStorage()
    }
  },
  
  initLocalStorage() {
    const saved = localStorage.getItem('data')
    if (saved) {
      this.$patch(JSON.parse(saved))
    }
  }
}
```

## 插件的 SSR 处理

插件需要考虑 SSR：

```typescript
function myPlugin({ store }) {
  // 检查环境
  if (typeof window === 'undefined') {
    // 服务端：跳过浏览器专用代码
    return
  }
  
  // 客户端代码
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state))
  })
}
```

## 状态序列化注意事项

某些类型不能直接序列化：

```typescript
// ❌ 函数不能序列化
state: () => ({
  callback: () => {}  // 服务端无法传递
})

// ❌ 循环引用
state: () => ({
  self: null  // 如果 self = state，会导致循环
})

// ✅ 使用可序列化类型
state: () => ({
  id: 0,
  name: '',
  items: [],
  config: {}
})
```

## 敏感数据处理

避免在 SSR 中暴露敏感数据：

```typescript
const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '',      // 敏感
    user: null,     // 可能敏感
    isLoggedIn: false  // 安全
  }),
  getters: {
    // 只暴露必要信息
    publicState: (state) => ({
      isLoggedIn: state.isLoggedIn,
      userName: state.user?.name
    })
  }
})

// 序列化时过滤
const state = JSON.stringify(pinia.state.value, (key, value) => {
  if (key === 'token') return undefined  // 过滤 token
  return value
})
```

## 错误处理

SSR 中的错误处理：

```typescript
onServerPrefetch(async () => {
  try {
    await store.fetchData()
  } catch (error) {
    // 记录错误但不中断渲染
    console.error('SSR fetch failed:', error)
    // 设置错误状态
    store.error = error.message
  }
})
```

## 性能考虑

减少 SSR 数据量：

```typescript
// 只预取必要数据
onServerPrefetch(async () => {
  // 首屏需要的数据
  await store.fetchInitialData()
  
  // 非首屏数据在客户端获取
  // store.fetchMoreData()  // 不在 SSR 执行
})
```

下一章我们将分析 SSR 状态序列化的细节。
