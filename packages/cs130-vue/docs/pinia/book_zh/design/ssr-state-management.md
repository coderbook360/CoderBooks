# SSR 状态管理设计

服务端渲染（SSR）为状态管理带来了独特的挑战。状态在服务端生成，需要序列化后传输到客户端，然后在客户端"水合"恢复。Pinia 从设计之初就考虑了 SSR 场景，提供了完善的解决方案。

## SSR 中的状态管理挑战

在传统的客户端渲染应用中，状态管理相对简单。Store 在浏览器中创建，状态保存在内存中，组件直接访问。但在 SSR 场景下，事情变得复杂。

第一个挑战是状态的跨环境传递。服务端渲染时，Store 中可能已经填充了数据（比如从 API 获取的用户信息、商品列表等）。这些数据需要随 HTML 一起发送到客户端，否则客户端还需要重新请求一遍，造成闪烁和性能浪费。

第二个挑战是状态隔离。服务端是多用户共享的，如果不同用户的请求共用同一个 Store 实例，会导致状态污染。用户 A 的数据可能泄露给用户 B，这是严重的安全问题。

第三个挑战是水合匹配。客户端水合时，需要将服务端的状态准确恢复。如果客户端的初始状态与服务端不一致，会导致水合失败，产生警告甚至渲染错误。

## Pinia 的 SSR 设计原则

Pinia 通过几个关键设计解决这些问题。

首先是每请求独立的 Pinia 实例。服务端每处理一个请求，都创建一个新的 Pinia 实例。这确保了不同用户的状态完全隔离：

```typescript
// server entry
export async function render(url: string) {
  // 每个请求创建新的 Pinia 实例
  const pinia = createPinia()
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 渲染应用...
}
```

其次是统一的状态序列化入口。所有 Store 的状态可以通过 `pinia.state.value` 一次性获取。这是一个包含所有 Store 状态的对象，可以直接 JSON 序列化：

```typescript
// 服务端：收集状态
const state = JSON.stringify(pinia.state.value)

// 嵌入 HTML
const html = `
  <script>
    window.__PINIA_STATE__ = ${state}
  </script>
`
```

第三是客户端水合机制。客户端创建 Pinia 实例后，可以用服务端的状态初始化：

```typescript
// client entry
const pinia = createPinia()

// 水合：用服务端状态覆盖初始状态
if (window.__PINIA_STATE__) {
  pinia.state.value = JSON.parse(window.__PINIA_STATE__)
}

app.use(pinia)
```

## 状态序列化细节

`pinia.state.value` 是一个 reactive 对象，其键是 Store ID，值是对应 Store 的 state：

```typescript
// 假设有两个 Store
const useUserStore = defineStore('user', {
  state: () => ({ name: 'Alice', age: 25 })
})

const useCartStore = defineStore('cart', {
  state: () => ({ items: [] })
})

// pinia.state.value 的结构
{
  user: { name: 'Alice', age: 25 },
  cart: { items: [] }
}
```

序列化时需要注意几个问题。首先是循环引用。如果 state 中包含循环引用的对象，JSON.stringify 会失败。需要确保 state 是可序列化的。

其次是特殊类型。Date、Map、Set、RegExp 等对象在 JSON 序列化后会丢失类型信息。如果 state 中包含这些类型，需要自定义序列化逻辑：

```typescript
// 自定义序列化
function serializeState(state: any) {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) }
    }
    return value
  })
}

// 自定义反序列化
function deserializeState(json: string) {
  return JSON.parse(json, (key, value) => {
    if (value && value.__type === 'Date') {
      return new Date(value.value)
    }
    if (value && value.__type === 'Map') {
      return new Map(value.value)
    }
    return value
  })
}
```

## 懒加载 Store 的处理

在 SSR 中，Store 的创建时机很重要。只有在渲染过程中实际使用的 Store 才会被创建并填充数据。未使用的 Store 不会出现在 `pinia.state.value` 中。

这意味着如果某个 Store 在服务端没有被访问，它的状态不会被序列化传输。客户端首次访问这个 Store 时，会使用初始状态，而不是服务端的状态（因为没有）。

这通常是期望的行为——只序列化实际需要的数据，减少传输量。但如果你需要预加载某些数据，要确保在服务端渲染过程中访问对应的 Store：

```typescript
// 在服务端入口预加载数据
async function render(url: string) {
  const pinia = createPinia()
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 预加载关键数据
  const userStore = useUserStore(pinia)
  await userStore.fetchUser()
  
  const configStore = useConfigStore(pinia)
  await configStore.loadConfig()
  
  // 这些 Store 的状态会包含在序列化结果中
  const html = await renderToString(app)
  return { html, state: pinia.state.value }
}
```

## Nuxt 集成

Nuxt 3 内置了 Pinia 支持，大大简化了 SSR 配置：

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt']
})
```

Nuxt 会自动处理 Pinia 实例的创建、状态序列化和水合。在组件中正常使用 Store 即可：

```typescript
// composables/stores/user.ts
export const useUserStore = defineStore('user', {
  state: () => ({ user: null }),
  actions: {
    async fetchUser() {
      const user = await $fetch('/api/user')
      this.user = user
    }
  }
})

// pages/profile.vue
<script setup>
const userStore = useUserStore()

// 在 SSR 中获取数据
await userStore.fetchUser()
</script>
```

Nuxt 的 useAsyncData 或 useFetch 可以与 Pinia 结合使用，处理数据获取的去重和缓存。

## Setup Store 在 SSR 中的考虑

Setup Store 在 SSR 场景下需要注意一点：不能使用只在浏览器环境存在的 API。

```typescript
// ❌ 这在 SSR 中会出错
export const useSettingsStore = defineStore('settings', () => {
  // localStorage 在服务端不存在
  const theme = ref(localStorage.getItem('theme') || 'light')
  
  return { theme }
})

// ✅ 正确做法：使用环境检测
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')
  
  // 只在客户端执行
  if (typeof window !== 'undefined') {
    theme.value = localStorage.getItem('theme') || 'light'
  }
  
  return { theme }
})

// ✅ 或者在 onMounted 中执行（组件级别）
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')
  
  function initFromStorage() {
    theme.value = localStorage.getItem('theme') || 'light'
  }
  
  return { theme, initFromStorage }
})

// 组件中
onMounted(() => {
  settingsStore.initFromStorage()
})
```

## 状态水合的时机

客户端水合的时机很重要。水合必须在 Pinia 安装之后、组件渲染之前完成：

```typescript
// 正确的顺序
const pinia = createPinia()

// 水合
if (typeof window !== 'undefined' && window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}

// 安装
app.use(pinia)

// 挂载
app.mount('#app')
```

如果顺序错误，可能导致组件使用初始状态而非服务端状态，产生水合不匹配的警告。

## 安全考虑

序列化状态时要注意安全问题。`pinia.state.value` 会被嵌入 HTML 中，如果状态包含用户敏感信息或特殊字符，可能导致 XSS 攻击。

推荐使用专门的序列化库来处理状态：

```typescript
import devalue from 'devalue'

// 安全的序列化
const serialized = devalue(pinia.state.value)

// 嵌入 HTML
const html = `
  <script>
    window.__PINIA_STATE__ = ${serialized}
  </script>
`
```

devalue 库可以安全处理特殊字符，避免 XSS 风险，同时支持 Date、Map、Set 等特殊类型的序列化。

## 与 Vuex SSR 的对比

Vuex 的 SSR 方案与 Pinia 类似，都是通过序列化/水合来传递状态。但 Pinia 有几个优势。

首先，Pinia 的状态结构更扁平，序列化更简单。Vuex 的嵌套模块会产生复杂的状态树。

其次，Pinia 的类型推导在 SSR 场景下同样有效。服务端和客户端使用相同的类型定义，减少了类型不一致的风险。

第三，Setup Store 可以使用更灵活的初始化逻辑，根据环境选择不同的行为。

下一章，我们将探讨 Pinia 的设计权衡与取舍，全面总结这个状态管理库的设计哲学。
