# SSRContext 渲染上下文

在 Vue SSR 中，`SSRContext` 是一个贯穿整个渲染过程的上下文对象。它承担着信息传递、资源收集、状态管理等多种职责。理解 SSRContext 对于正确使用 Vue SSR 至关重要。

## 基本概念

SSRContext 是一个普通的 JavaScript 对象，在调用 `renderToString` 时作为第二个参数传入：

```javascript
const context = {}
const html = await renderToString(app, context)

// 渲染完成后，context 中会包含收集到的信息
console.log(context.teleports)  // Teleport 内容
console.log(context.modules)    // 使用的模块
```

这个对象在渲染过程中被传递给所有组件，组件可以读取或写入信息。渲染完成后，开发者可以从中获取收集到的数据。

## 类型定义

SSRContext 的类型定义相当灵活：

```typescript
export interface SSRContext {
  [key: string]: any
  teleports?: Record<string, string>
  __teleportBuffers?: Record<string, SSRBuffer>
}
```

除了几个内置属性外，开发者可以在 context 上存储任意数据。这种灵活性支持了各种使用场景。

## 如何访问 SSRContext

组件内部可以通过 `useSSRContext()` 组合式函数访问 SSRContext：

```javascript
import { useSSRContext } from 'vue'

export default {
  setup() {
    const ctx = useSSRContext()
    
    if (ctx) {
      // 在服务端渲染时，ctx 是传入的 context 对象
      // 在客户端渲染时，ctx 是 undefined
      ctx.someData = 'collected during SSR'
    }
  }
}
```

这个函数的实现很简单——它从 provide/inject 系统中获取之前注入的 context：

```typescript
export function useSSRContext(): SSRContext | undefined {
  if (!__SSR__) {
    // 客户端环境，返回 undefined
    return undefined
  }
  
  const ctx = inject(ssrContextKey)
  return ctx
}
```

回顾 `renderToString` 的实现，我们看到 context 是这样注入的：

```javascript
app._context.provides[ssrContextKey] = context
```

这样所有组件都可以通过 inject 获取到它。

## 常见用途

SSRContext 有几个典型的使用场景。

第一个是收集页面元信息。在渲染过程中，组件可能需要设置页面标题、meta 标签等：

```javascript
// 组件中
export default {
  setup() {
    const ctx = useSSRContext()
    if (ctx) {
      ctx.title = '文章标题'
      ctx.meta = [
        { name: 'description', content: '文章描述' }
      ]
    }
  }
}

// 服务端
const context = {}
const html = await renderToString(app, context)

const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${context.title || 'Default Title'}</title>
  ${context.meta?.map(m => `<meta name="${m.name}" content="${m.content}">`).join('')}
</head>
<body>
  <div id="app">${html}</div>
</body>
</html>
`
```

第二个是收集使用的模块和资源。Vite 的 SSR 构建会将使用的模块信息写入 context，用于生成预加载指令：

```javascript
const context = {}
const html = await renderToString(app, context)

// Vite 会在 context.modules 中记录使用的模块
const preloadLinks = context.modules
  .map(id => moduleToPreloadTag(id))
  .join('')
```

第三个是处理 Teleport 内容。Teleport 组件允许将内容"传送"到 DOM 的其他位置。在 SSR 中，这些内容会被收集到 context.teleports 中：

```javascript
const context = {}
const html = await renderToString(app, context)

// context.teleports 包含了 Teleport 的内容
// 例如 { '#modal': '<div class="modal">...</div>' }

const fullHtml = `
<body>
  <div id="app">${html}</div>
  <div id="modal">${context.teleports?.['#modal'] || ''}</div>
</body>
`
```

## 内部使用的属性

除了开发者使用的属性外，Vue 内部也使用 SSRContext 存储一些信息：

```typescript
interface SSRContext {
  // Teleport 相关
  teleports?: Record<string, string>
  __teleportBuffers?: Record<string, SSRBuffer>
  
  // 异步组件相关
  __asyncLoader?: () => Promise<any>
  
  // 内部标志
  __watcherHandles?: WatchHandle[]
}
```

`__teleportBuffers` 用于在流式渲染中收集 Teleport 内容。因为流式渲染的内容会分批发送，Teleport 的内容需要单独收集。

`__watcherHandles` 用于追踪渲染过程中创建的 watcher，以便在渲染完成后清理。

## 请求级别的隔离

SSRContext 的一个重要特性是请求级别的隔离。每个请求都应该有自己的 context 对象：

```javascript
app.get('*', async (req, res) => {
  // 每个请求创建新的 context
  const context = {}
  
  const app = createSSRApp(App)
  const html = await renderToString(app, context)
  
  // 这个 context 只包含这次请求的数据
  res.send(buildPage(html, context))
})
```

如果多个请求共享同一个 context，就会出现数据污染问题。这与我们之前讨论的"跨请求状态污染"是同样的问题。

## Nuxt 的扩展

Nuxt 对 SSRContext 进行了扩展，添加了更多功能：

```javascript
// Nuxt 的 SSR context
interface NuxtSSRContext extends SSRContext {
  url: string           // 请求 URL
  event: H3Event        // H3 事件对象
  payload: object       // 要传递给客户端的数据
  _payloadRendered?: boolean
}
```

这些扩展让 Nuxt 可以更方便地处理路由、数据传递等问题。

## 与状态管理的关系

SSRContext 与状态管理（Pinia、Vuex）是互补的关系。状态管理库管理应用的业务状态，SSRContext 管理渲染过程的元信息。

```javascript
// 状态管理：业务数据
const store = useStore()
store.user = { name: 'Alice' }

// SSRContext：渲染元信息
const ctx = useSSRContext()
ctx.title = `${store.user.name} 的个人主页`
ctx.renderedAt = Date.now()
```

两者配合使用，可以完整地处理 SSR 的各种需求。

## 小结

SSRContext 是 Vue SSR 中的重要机制：

1. 它在渲染过程中传递上下文信息
2. 用于收集 Teleport 内容、模块依赖、页面元信息等
3. 通过 `useSSRContext()` 在组件中访问
4. 每个请求必须有独立的 context 以避免污染
5. 可以存储任意自定义数据

在下一章中，我们将深入 `renderComponentVNode`，看看组件是如何被渲染为 HTML 的。
