# 同构应用架构设计

同构应用（Isomorphic Application）是指同一份代码可以在服务器和客户端两个环境运行的应用。这种架构结合了服务端渲染的 SEO 优势和单页应用的交互体验。

## 同构的核心思想

传统的 Web 应用有两种模式。服务端渲染模式中，每次页面跳转都请求新的 HTML，服务器负责所有渲染。单页应用模式中，首次加载获取空 HTML 和 JavaScript，后续渲染完全在客户端进行。

同构应用结合了两者：首次请求返回服务端渲染的完整 HTML，后续的页面跳转在客户端完成。

```
首次访问 /home
  └── 服务器渲染 HTML → 浏览器显示 → 水合激活

点击链接跳转到 /about
  └── 客户端路由接管 → 客户端渲染
```

用户获得了快速的首屏加载，同时保留了 SPA 的流畅导航体验。

## 入口分离

同构应用通常有两个入口：服务端入口和客户端入口。

```javascript
// entry-server.js
import { createSSRApp } from 'vue'
import App from './App.vue'
import { createRouter } from './router'
import { createStore } from './store'

export async function render(url) {
  const app = createSSRApp(App)
  const router = createRouter()
  const store = createStore()
  
  app.use(router)
  app.use(store)
  
  router.push(url)
  await router.isReady()
  
  const html = await renderToString(app)
  const state = store.state
  
  return { html, state }
}
```

```javascript
// entry-client.js
import { createSSRApp } from 'vue'
import App from './App.vue'
import { createRouter } from './router'
import { createStore } from './store'

const app = createSSRApp(App)
const router = createRouter()
const store = createStore()

// 恢复服务端状态
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__)
}

app.use(router)
app.use(store)

router.isReady().then(() => {
  app.mount('#app')
})
```

服务端入口是一个工厂函数，每次请求创建新的应用实例。客户端入口只执行一次，挂载应用到 DOM。

## 路由同步

服务端需要根据请求的 URL 渲染对应的页面。客户端需要在水合时使用相同的路由状态。

```javascript
// 服务端
export async function render(url) {
  const { app, router } = createApp()
  
  // 设置服务端路由
  router.push(url)
  await router.isReady()
  
  // 渲染当前路由对应的组件
  const html = await renderToString(app)
  return html
}
```

```javascript
// 服务端的 HTTP 处理
app.get('*', async (req, res) => {
  const html = await render(req.url)
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `)
})
```

客户端水合时，路由会自动同步到当前 URL，不需要额外处理。

## 状态传递

服务端获取的数据需要传递给客户端，否则客户端水合时会重新获取，造成闪烁和性能浪费。

```javascript
// 服务端渲染后，将状态序列化到 HTML
app.get('*', async (req, res) => {
  const { html, state } = await render(req.url)
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="app">${html}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(state)}
        </script>
        <script src="/client.js"></script>
      </body>
    </html>
  `)
})
```

```javascript
// 客户端恢复状态
const store = createStore()
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__)
}
```

注意状态序列化可能有安全风险（XSS），需要转义特殊字符。

## 数据获取策略

同构应用需要在服务端获取首屏数据。常见的策略有组件级和路由级两种。

组件级数据获取使用 `serverPrefetch` 或 `asyncData`：

```javascript
export default {
  async serverPrefetch() {
    // 只在服务端执行
    await this.$store.dispatch('fetchData')
  }
}
```

路由级数据获取在路由守卫中处理：

```javascript
// 路由配置
{
  path: '/user/:id',
  component: User,
  meta: {
    fetchData: (store, route) => store.dispatch('fetchUser', route.params.id)
  }
}

// 服务端渲染前获取数据
const matchedComponents = router.getMatchedComponents()
await Promise.all(
  matchedComponents.map(component => {
    if (component.meta?.fetchData) {
      return component.meta.fetchData(store, router.currentRoute)
    }
  })
)
```

Nuxt 提供了更优雅的 `useFetch` 和 `useAsyncData` API，统一处理这些场景。

## 生命周期差异

并非所有生命周期钩子都在两端执行。

只在服务端执行：`serverPrefetch`

只在客户端执行：`mounted`、`updated`、`unmounted`、`onMounted`、`onUpdated`、`onUnmounted`

两端都执行：`setup`、`beforeCreate`、`created`

```javascript
export default {
  setup() {
    // 两端都执行
    const data = ref(null)
    
    onMounted(() => {
      // 只在客户端执行
      startAnimation()
    })
    
    return { data }
  },
  
  async serverPrefetch() {
    // 只在服务端执行
    this.data = await fetchData()
  }
}
```

## 构建配置

同构应用需要两套构建产物：服务端 bundle 和客户端 bundle。

```javascript
// vite.config.js
export default {
  build: {
    // 客户端构建配置
    outDir: 'dist/client'
  },
  
  ssr: {
    // 服务端构建配置
    target: 'node'
  }
}
```

Vite 原生支持 SSR 构建。构建命令分别产出两套文件：

```bash
vite build --outDir dist/client
vite build --ssr --outDir dist/server
```

## 开发模式

开发时需要同时支持服务端渲染和热更新。Vite 的 SSR 开发模式提供了良好的体验：

```javascript
// dev-server.js
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom'
})

app.use(vite.middlewares)

app.get('*', async (req, res) => {
  const { render } = await vite.ssrLoadModule('/src/entry-server.js')
  const html = await render(req.url)
  res.send(html)
})
```

修改代码后，服务端和客户端都会自动更新，无需手动重启。

## 架构选择

实现完整的同构架构需要处理很多细节。对于大多数项目，推荐使用成熟的框架：

Nuxt 是 Vue 生态最成熟的同构框架，提供了开箱即用的 SSR 支持。

Vite SSR 适合需要更多控制的场景，可以自定义服务端逻辑。

如果应用不需要 SEO 和快速首屏，SPA 模式仍然是更简单的选择。
