# 跨请求状态污染

在服务端渲染应用中，有一个容易被忽视但后果严重的问题：跨请求状态污染（Cross-Request State Pollution）。这个问题在客户端渲染中不存在，但在服务端环境中可能导致安全漏洞和难以追踪的 bug。

## 问题的根源

在浏览器中，每个用户访问页面都会创建一个独立的 JavaScript 执行环境。用户 A 的状态和用户 B 的状态天然隔离，不可能相互影响。

但在服务端，情况完全不同。Node.js 进程是长期运行的，会处理多个用户的请求。如果代码中使用了全局变量或单例对象，一个请求的数据可能"泄漏"到另一个请求中。

```javascript
// 危险：全局状态在所有请求间共享
let currentUser = null

app.get('/profile', (req, res) => {
  currentUser = await getUser(req.session.userId)
  
  // 在渲染完成之前，另一个请求可能已经修改了 currentUser
  const html = await renderProfile(currentUser)
  res.send(html)
})
```

想象这个场景：用户 Alice 请求 `/profile`，代码设置 `currentUser = Alice`。在渲染完成之前，用户 Bob 的请求到达，`currentUser` 被覆盖为 Bob。现在 Alice 的请求继续渲染，但使用的却是 Bob 的数据。Alice 可能看到了 Bob 的个人信息。

这就是跨请求状态污染——一个请求的状态影响了另一个请求。

## Vue SSR 中的常见陷阱

在 Vue SSR 应用中，有几种常见的状态污染模式。

第一种是共享的应用实例。如果所有请求共用同一个 Vue 应用实例，请求之间的状态就会混乱。

```javascript
// 错误：所有请求共享同一个应用实例
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)  // 这个实例被所有请求共享

app.get('*', async (req, res) => {
  const html = await renderToString(app)  // 危险！
  res.send(html)
})
```

Vue 应用实例包含组件状态、提供/注入的值、全局属性等。如果共享实例，这些状态会在请求之间混乱。

正确做法是为每个请求创建新的实例：

```javascript
// 正确：每个请求创建新实例
app.get('*', async (req, res) => {
  const app = createSSRApp(App)  // 每次创建新实例
  
  const html = await renderToString(app)
  res.send(html)
})
```

第二种是共享的 store 实例。Vuex 或 Pinia store 如果作为单例使用，会导致同样的问题。

```javascript
// 错误：store 是单例
// store.js
export const store = createStore({
  state: {
    user: null
  }
})

// 服务端
import { store } from './store'

app.get('*', async (req, res) => {
  store.state.user = await getUser(req)  // 污染！
  const html = await renderToString(app)
  res.send(html)
})
```

正确做法是使用工厂函数：

```javascript
// 正确：store 使用工厂函数
// store.js
export function createStore() {
  return createStore({
    state: {
      user: null
    }
  })
}

// 服务端
import { createStore } from './store'

app.get('*', async (req, res) => {
  const app = createSSRApp(App)
  const store = createStore()  // 每次创建新 store
  
  app.use(store)
  
  store.state.user = await getUser(req)
  const html = await renderToString(app)
  res.send(html)
})
```

第三种是模块级别的状态。ES 模块在首次导入时执行，之后的导入返回缓存的结果。如果模块中有可变状态，它会在所有导入者之间共享。

```javascript
// utils/cache.js - 危险
const cache = new Map()  // 这个 Map 在所有请求间共享

export function cacheData(key, value) {
  cache.set(key, value)
}

export function getCachedData(key) {
  return cache.get(key)
}
```

这种模块级缓存在服务端可能导致数据泄漏。用户 A 的数据被缓存后，用户 B 可能读取到。

## 检测状态污染

状态污染通常很难被发现。在开发环境中，往往只有一个请求在处理，问题不会暴露。只有在高并发的生产环境中，问题才会显现。

一些检测策略可以帮助发现潜在问题：

代码审查时特别关注全局变量和单例模式。任何在模块顶层定义的可变变量都是危险信号。

```javascript
// 代码审查检查清单
// ❌ 危险模式
let globalState = {}
const sharedInstance = new SomeClass()
export default createApp(App)  // 导出实例而非工厂函数

// ✅ 安全模式
export function createState() { return {} }
export function createInstance() { return new SomeClass() }
export function createApp() { return createSSRApp(App) }
```

压力测试时同时发送多个不同用户的请求，检查响应是否正确。

```javascript
// 压力测试脚本
async function testCrossRequestPollution() {
  const requests = []
  
  for (let i = 0; i < 100; i++) {
    requests.push(
      fetch('/profile', { headers: { 'X-User-Id': `user-${i}` }})
        .then(r => r.text())
        .then(html => ({ userId: i, html }))
    )
  }
  
  const results = await Promise.all(requests)
  
  for (const { userId, html } of results) {
    // 检查每个响应是否包含正确的用户 ID
    if (!html.includes(`User: user-${userId}`)) {
      console.error(`Pollution detected for user ${userId}`)
    }
  }
}
```

## 框架层面的保护

好的框架设计会从架构上避免状态污染的可能性。

Vue 3 的 `createSSRApp` 就是这种设计的体现。它不是返回一个单例，而是每次调用都创建新实例。

Nuxt 3 进一步封装了这种模式。它的运行时确保每个请求都获得独立的上下文：

```javascript
// Nuxt 3 的 composables 自动处理请求隔离
export default {
  async setup() {
    // useState 在服务端会为每个请求创建独立的状态
    const user = useState('user', () => null)
    
    // useFetch 的缓存是请求级别的
    const { data } = await useFetch('/api/profile')
    
    return { user, data }
  }
}
```

`useState` 和 `useFetch` 这些组合式函数内部使用了请求级别的上下文，确保状态隔离。

## 最佳实践

避免状态污染的最佳实践可以总结为以下几点：

始终使用工厂函数。任何需要在请求间隔离的对象（应用实例、store、router）都应该通过工厂函数创建。

避免模块级的可变状态。如果必须使用模块级状态，确保它是不可变的配置信息，而不是请求相关的数据。

```javascript
// 可以：不可变配置
const CONFIG = Object.freeze({
  apiUrl: process.env.API_URL,
  timeout: 5000
})

// 不可以：可变的请求数据
let currentRequest = null  // 危险！
```

使用框架提供的状态管理工具。Nuxt 的 `useState`、Pinia 的 `useStore` 等都内置了请求隔离。

审慎使用第三方库。某些库可能在内部使用单例模式，需要检查它们是否适合 SSR 环境。

理解并避免跨请求状态污染，是构建安全、可靠的 SSR 应用的必要条件。在下一章中，我们会讨论 SSR 架构设计中的各种权衡取舍。
