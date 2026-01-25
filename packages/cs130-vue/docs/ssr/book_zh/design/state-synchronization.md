# 状态同步设计

同构应用面临一个核心挑战：服务端渲染时产生的状态如何传递给客户端？如果客户端使用不同的状态进行水合，就会出现不匹配问题。状态同步是连接服务端渲染和客户端水合的关键桥梁。

## 为什么需要状态同步

让我们通过一个具体的例子来理解状态同步的必要性。假设有一个显示用户信息的页面：

```javascript
// UserProfile.vue
export default {
  async setup() {
    const user = ref(null)
    
    // 获取用户数据
    const response = await fetch('/api/user/123')
    user.value = await response.json()
    
    return { user }
  },
  template: `
    <div v-if="user">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
  `
}
```

在服务端渲染时，这个组件会获取用户数据，假设返回 `{ name: 'Alice', email: 'alice@example.com' }`。服务端生成的 HTML 包含 "Alice" 和对应的邮箱。

当客户端水合时，如果没有状态同步，客户端会重新执行 `setup` 函数，再次调用 API。这会导致两个问题：首先是多余的网络请求——同样的数据被请求了两次。其次是潜在的不匹配——如果两次请求之间数据发生了变化，渲染结果可能不同。

状态同步的目的就是避免这种重复获取，确保客户端使用与服务端相同的数据进行水合。

## 基本的状态序列化

最简单的状态同步方式是将状态序列化为 JSON，嵌入到 HTML 中：

```javascript
// 服务端渲染
export async function render(url) {
  const app = createSSRApp(App)
  const store = createStore()
  
  app.use(store)
  
  // 获取数据
  await store.dispatch('fetchUser', 123)
  
  // 渲染
  const html = await renderToString(app)
  
  // 返回 HTML 和序列化的状态
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="app">${html}</div>
      <script>
        window.__INITIAL_STATE__ = ${JSON.stringify(store.state)}
      </script>
      <script src="/app.js"></script>
    </body>
    </html>
  `
}
```

服务端将 store 的状态序列化后注入到 `window.__INITIAL_STATE__` 中。客户端在初始化时读取这个状态：

```javascript
// 客户端入口
const app = createSSRApp(App)
const store = createStore()

// 恢复服务端状态
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__)
}

app.use(store)
app.mount('#app')
```

通过 `replaceState`，客户端的 store 被设置为与服务端完全相同的状态。水合过程中使用的数据与服务端一致，不会出现不匹配。

## 安全考量

将状态序列化到 HTML 中需要注意安全问题。如果状态中包含用户生成的内容，可能被利用来进行 XSS 攻击。

```javascript
// 危险：直接 JSON.stringify 可能包含恶意内容
const state = {
  userInput: '</script><script>alert("XSS")</script>'
}

// 这会破坏 HTML 结构
`<script>window.__STATE__ = ${JSON.stringify(state)}</script>`
```

正确的做法是对序列化结果进行转义：

```javascript
function serialize(state) {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
}
```

或者使用专门的库如 `devalue` 或 `serialize-javascript`，它们会处理这些安全问题：

```javascript
import devalue from 'devalue'

const serialized = devalue(store.state)
```

`devalue` 还能处理 `JSON.stringify` 不支持的数据类型，如 `Date`、`Map`、`Set`、循环引用等。

## 敏感数据过滤

并非所有服务端状态都应该发送给客户端。某些数据可能包含敏感信息，如访问令牌、内部配置、用户隐私数据等。

```javascript
// 服务端状态可能包含敏感信息
const state = {
  user: {
    name: 'Alice',
    email: 'alice@example.com',
    internalId: 'db_user_12345',  // 不应该暴露
    accessToken: 'secret_token'    // 绝不应该暴露
  },
  posts: [...]
}
```

需要在序列化前过滤敏感字段：

```javascript
function sanitizeState(state) {
  return {
    user: state.user ? {
      name: state.user.name,
      email: state.user.email
      // 不包含 internalId 和 accessToken
    } : null,
    posts: state.posts
  }
}

const serialized = serialize(sanitizeState(store.state))
```

另一种方法是在状态设计时就区分"公开状态"和"私有状态"：

```javascript
const store = createStore({
  state: {
    // 公开状态，会序列化到客户端
    public: {
      user: null,
      posts: []
    },
    // 私有状态，仅在服务端使用
    private: {
      accessToken: null,
      dbConnections: []
    }
  }
})

// 只序列化公开状态
const serialized = serialize(store.state.public)
```

## Pinia 的 SSR 支持

Vue 3 的官方状态管理库 Pinia 内置了 SSR 支持。它提供了更优雅的状态同步方式：

```javascript
// stores/user.js
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isLoading: false
  }),
  actions: {
    async fetchUser(id) {
      this.isLoading = true
      this.user = await fetchUserAPI(id)
      this.isLoading = false
    }
  }
})
```

在服务端：

```javascript
import { createPinia } from 'pinia'

export async function render(url) {
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  
  // 使用 store
  const userStore = useUserStore(pinia)
  await userStore.fetchUser(123)
  
  const html = await renderToString(app)
  
  // Pinia 提供了获取所有 store 状态的方法
  const piniaState = JSON.stringify(pinia.state.value)
  
  return `
    <div id="app">${html}</div>
    <script>window.__PINIA_STATE__ = ${piniaState}</script>
  `
}
```

在客户端：

```javascript
const app = createSSRApp(App)
const pinia = createPinia()

// 恢复状态
if (window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}

app.use(pinia)
app.mount('#app')
```

Pinia 会自动处理多个 store 的状态同步，不需要手动管理每个 store。

## 组合式 API 中的数据获取

Vue 3 的组合式 API 带来了新的数据获取模式。Nuxt 3 提供的 `useFetch` 和 `useAsyncData` 封装了状态同步的复杂性：

```javascript
// Nuxt 3 组件
export default {
  async setup() {
    // useFetch 会自动处理 SSR 状态同步
    const { data: user } = await useFetch('/api/user/123')
    
    return { user }
  }
}
```

背后的实现原理是：在服务端执行时，`useFetch` 获取数据并将结果存储在一个与调用位置关联的 key 下。这个数据会被序列化到 HTML 中。在客户端，`useFetch` 检查是否已有缓存的数据，如果有就直接使用，不再发起请求。

```javascript
// useFetch 的简化实现原理
export function useFetch(url) {
  const nuxtApp = useNuxtApp()
  const key = `fetch:${url}`
  
  // 检查是否有服务端预取的数据
  if (nuxtApp.payload[key]) {
    return { data: ref(nuxtApp.payload[key]) }
  }
  
  // 服务端：获取数据并存储
  if (process.server) {
    const data = await fetch(url).then(r => r.json())
    nuxtApp.payload[key] = data
    return { data: ref(data) }
  }
  
  // 客户端：实时获取（这种情况不应该发生在 SSR 场景）
  const data = ref(null)
  fetch(url).then(r => r.json()).then(d => data.value = d)
  return { data }
}
```

## 状态时效性

一个容易被忽视的问题是状态的时效性。服务端渲染时获取的数据，在用户看到页面时可能已经过时了。

考虑一个股票价格显示组件。服务端渲染时获取的价格是 100.00，但当用户看到页面时，真实价格可能已经变成 100.50。如果始终使用服务端的数据，用户看到的就是过时的信息。

解决这个问题需要在设计时考虑数据的刷新策略：

```javascript
export default {
  setup() {
    const { data: price, refresh } = useFetch('/api/stock/price')
    
    // 水合后定期刷新
    onMounted(() => {
      const interval = setInterval(refresh, 5000)
      onUnmounted(() => clearInterval(interval))
    })
    
    return { price }
  }
}
```

对于实时性要求高的数据，水合后立即或定期刷新是必要的。服务端数据用于首屏显示，之后由客户端接管数据更新。

状态同步是 SSR 应用中最容易出问题的环节之一。理解它的原理和常见陷阱，有助于构建健壮的同构应用。在下一章中，我们会讨论另一种渲染策略：静态站点生成（SSG）。
