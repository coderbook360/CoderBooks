# SSR 的设计挑战

服务端渲染（SSR）让 Vue 应用可以在服务器上渲染 HTML，提升首屏加载速度和 SEO 效果。但 SSR 也带来了独特的技术挑战。

## 同构代码的限制

SSR 要求同一份代码在服务器和浏览器两个环境运行。这两个环境有本质差异。

浏览器有 DOM、window、document、localStorage 等 API。服务器没有这些，但有 fs、http、process 等 Node.js API。

```javascript
// 这段代码在服务器上会报错
export default {
  mounted() {
    // window 在服务器上不存在
    window.addEventListener('scroll', this.handleScroll)
  }
}
```

同构代码必须避免在服务端执行时访问浏览器专属 API。常见的做法是使用环境判断：

```javascript
if (typeof window !== 'undefined') {
  // 只在浏览器执行
  window.addEventListener('scroll', handleScroll)
}
```

或者将浏览器相关代码放在 onMounted 等只在客户端执行的生命周期钩子中：

```javascript
onMounted(() => {
  // onMounted 只在客户端执行
  window.addEventListener('scroll', handleScroll)
})
```

## 状态隔离

在传统的单页应用中，状态存储在内存中，用户各自有独立的浏览器实例，状态天然隔离。

服务器是多用户共享的。如果状态是单例，不同用户的请求会互相污染：

```javascript
// 错误：单例状态会被所有请求共享
const store = createStore({
  state: { user: null }
})

export default store  // 不同请求访问同一个 store
```

正确的做法是为每个请求创建新的实例：

```javascript
// 正确：工厂函数为每个请求创建新实例
export function createApp() {
  const app = createSSRApp(App)
  const store = createStore()
  const router = createRouter()
  
  app.use(store)
  app.use(router)
  
  return { app, store, router }
}
```

这个原则适用于 Vue 应用实例、路由器、状态管理、以及任何全局状态。

## 数据预取的时机

SPA 可以在组件挂载后异步获取数据，先渲染空状态，数据到达后更新 UI。SSR 需要在渲染 HTML 之前获取所有必要的数据。

```javascript
// SPA 模式：先渲染，后获取数据
export default {
  async mounted() {
    this.data = await fetchData()
  }
}

// SSR 模式：先获取数据，后渲染
export default {
  async serverPrefetch() {
    await this.fetchData()  // 服务端等待数据
  },
  async mounted() {
    if (!this.data) {
      await this.fetchData()  // 客户端回退
    }
  }
}
```

Vue 提供了 `serverPrefetch` 钩子，它只在服务端渲染时执行，返回的 Promise 会被等待。

数据预取带来了额外的复杂性。需要确定哪些数据是首屏必需的，哪些可以延迟加载。预取过多会增加首屏时间，预取过少会导致水合时数据不一致。

## 水合的复杂性

服务端渲染的 HTML 到达浏览器后，Vue 需要"激活"这些静态标记，让它们成为响应式的。这个过程称为水合（hydration）。

水合要求客户端渲染的虚拟 DOM 与服务端生成的 HTML 完全匹配。如果不匹配，Vue 会发出警告，并可能导致 UI 错误。

常见的不匹配原因：

```javascript
// 时间相关的内容
<span>{{ new Date().toLocaleString() }}</span>
// 服务器和客户端的时间可能不同

// 随机内容
<div :id="`item-${Math.random()}`">
// 每次执行结果不同

// 浏览器专属 API
<div>{{ window.innerWidth }}</div>
// 服务端没有 window
```

解决方案是使用 `<ClientOnly>` 包装这些内容，或者在水合完成后才渲染动态部分。

## 第三方库的兼容性

不是所有的 JavaScript 库都支持 SSR。一些库依赖浏览器 API，在服务端导入就会报错。

```javascript
// 某些库在顶层就访问 window
import someLibrary from 'some-library'
// 在服务端直接报错
```

解决方案包括：

动态导入：只在客户端导入有问题的库。

```javascript
let someLibrary
if (typeof window !== 'undefined') {
  someLibrary = await import('some-library')
}
```

使用 Nuxt 等框架的 `<ClientOnly>` 组件。

寻找 SSR 兼容的替代库。

## 性能与缓存

SSR 在每个请求时都要执行渲染，这比直接返回静态 HTML 耗费更多服务器资源。

```javascript
// 每个请求都执行完整渲染
app.get('*', async (req, res) => {
  const html = await renderToString(app)  // CPU 密集
  res.send(html)
})
```

优化策略包括：

页面级缓存：对于不含用户数据的页面，缓存整个 HTML。

```javascript
const cache = new LRU({ max: 100 })

app.get('/about', async (req, res) => {
  if (cache.has('/about')) {
    return res.send(cache.get('/about'))
  }
  const html = await renderToString(app)
  cache.set('/about', html)
  res.send(html)
})
```

组件级缓存：缓存不变化的组件渲染结果。

流式渲染：边渲染边发送，减少首字节时间。

## 错误处理

SSR 的错误处理比 SPA 复杂。服务端渲染出错可能导致整个请求失败。

```javascript
app.get('*', async (req, res) => {
  try {
    const html = await renderToString(app)
    res.send(html)
  } catch (error) {
    // 渲染错误的处理策略
    console.error('SSR Error:', error)
    
    // 选项1：返回错误页面
    res.status(500).send('Server Error')
    
    // 选项2：回退到客户端渲染
    res.send(clientOnlyHtml)
  }
})
```

需要考虑：哪些错误应该返回 500，哪些应该重试，哪些应该回退到客户端渲染。

## 开发体验

SSR 增加了开发的复杂性。需要同时考虑两个环境的行为，调试问题时需要分辨是服务端还是客户端的问题。

热更新在 SSR 模式下更复杂。不仅要更新客户端代码，还要更新服务端的渲染逻辑。

Nuxt、Vite 等工具提供了开箱即用的 SSR 开发体验，大大简化了这些问题。

## 何时使用 SSR

SSR 不是银弹。它增加了复杂性和服务器成本，只有在特定场景下才值得使用：

需要 SEO 的公开内容网站。

需要快速首屏加载的面向用户应用。

需要在社交媒体正确预览的页面。

对于内部工具、登录后才能访问的应用、交互密集的应用，SPA 通常是更简单的选择。
