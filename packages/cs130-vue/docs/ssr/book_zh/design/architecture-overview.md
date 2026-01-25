# 架构总览

经过前面十五章的讨论，我们已经理解了 SSR 的设计思想、核心概念和各种策略。现在让我们把这些知识整合起来，形成一个完整的架构视图。这将为第二部分的源码解析和第三部分的实践实现打下基础。

## Vue SSR 的整体架构

Vue SSR 的实现分布在几个核心包中：

`@vue/server-renderer` 是服务端渲染的核心。它提供了 `renderToString`、`renderToNodeStream` 等 API，负责将 Vue 组件树渲染为 HTML 字符串或流。

`@vue/runtime-core` 包含了运行时的核心逻辑，包括组件实例创建、虚拟 DOM 处理、响应式系统等。它被服务端渲染器和客户端运行时共同使用。

`@vue/runtime-dom` 是浏览器端的运行时，包含了 DOM 操作和水合逻辑。客户端水合的核心实现在这里。

```
Vue SSR 架构图：

┌─────────────────────────────────────────────────────────────┐
│                     应用代码（组件、路由、状态）                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    服务端渲染流程         │     │    客户端水合流程         │
│  @vue/server-renderer   │     │   @vue/runtime-dom      │
│                         │     │                         │
│  ┌───────────────────┐  │     │  ┌───────────────────┐  │
│  │ renderToString    │  │     │  │ createHydration   │  │
│  │ renderToStream    │  │     │  │ Renderer          │  │
│  └───────────────────┘  │     │  └───────────────────┘  │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            ▼                               ▼
     ┌──────────────┐               ┌──────────────┐
     │  HTML 字符串  │               │   可交互页面   │
     └──────────────┘               └──────────────┘
```

## 服务端渲染流程

服务端渲染的入口是 `renderToString` 或流式渲染 API。整个流程可以分为几个阶段：

第一阶段是应用实例创建。通过 `createSSRApp` 创建 Vue 应用实例，配置路由和状态管理。

```javascript
const app = createSSRApp(App)
const router = createRouter()
const store = createStore()

app.use(router)
app.use(store)
```

第二阶段是路由解析和数据获取。根据请求的 URL 确定要渲染的页面，获取渲染所需的数据。

```javascript
await router.push(requestUrl)
await router.isReady()

// 数据预取
const matchedComponents = router.currentRoute.value.matched
for (const component of matchedComponents) {
  if (component.asyncData) {
    await component.asyncData({ store, route: router.currentRoute.value })
  }
}
```

第三阶段是组件树渲染。渲染器递归遍历组件树，将每个组件渲染为对应的 HTML 片段。

在这个阶段，渲染器会处理各种类型的虚拟节点：元素节点（`<div>`、`<span>`）、组件节点（自定义组件）、文本节点、注释节点、Fragment 等。对于每种节点类型，渲染器都有专门的处理逻辑。

第四阶段是结果输出。将渲染结果作为字符串返回，或通过流式 API 逐步发送。

```javascript
const html = await renderToString(app)
// 或
const stream = renderToNodeStream(app)
```

## 客户端水合流程

客户端水合的目标是让服务端渲染的静态 HTML "活"起来。这个过程同样可以分为几个阶段。

第一阶段是应用初始化。客户端创建与服务端相同的应用实例，恢复服务端传递的状态。

```javascript
const app = createSSRApp(App)
const router = createRouter()
const store = createStore()

// 恢复服务端状态
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__)
}

app.use(router)
app.use(store)
```

第二阶段是 DOM 遍历和匹配。Vue 从容器元素开始，递归遍历现有 DOM 和虚拟 DOM，确认两者匹配。

水合过程中，Vue 会复用现有的 DOM 节点，而不是创建新的。这就是水合比重新渲染更高效的原因。

第三阶段是事件绑定和响应式建立。在确认 DOM 匹配后，Vue 为需要交互的元素附加事件监听器，建立响应式追踪。

完成这三个阶段后，页面变得完全可交互。用户的操作会触发事件处理函数，状态变化会驱动 DOM 更新。

## 状态流转

理解状态在整个 SSR 周期中的流转对于调试和优化很重要。

```
状态流转：

服务端：
  获取数据 → 存入 Store → 渲染组件 → 序列化状态到 HTML

传输：
  HTML（包含内容和序列化的状态）→ 发送给客户端

客户端：
  解析 HTML（用户看到内容）→ 加载 JS → 读取序列化状态 → 恢复 Store → 水合组件
```

状态同步的正确性是整个流程的关键。如果服务端和客户端使用不同的状态，就会出现水合不匹配。

## 错误边界

健壮的 SSR 架构需要在多个层面处理错误。

路由级别的错误处理捕获页面渲染过程中的异常，可以返回错误页面或降级到 CSR。

组件级别的错误边界隔离单个组件的失败，防止整个页面崩溃。

请求级别的超时和重试确保数据获取的可靠性。

```javascript
// 多层错误处理示例
app.get('*', async (req, res) => {
  try {
    const html = await renderWithTimeout(req.url, 5000)
    res.send(html)
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      // 超时降级到 CSR
      res.send(getCSRFallback())
    } else if (error.code === 'NOT_FOUND') {
      // 404 页面
      res.status(404).send(get404Page())
    } else {
      // 500 错误页面
      console.error(error)
      res.status(500).send(get500Page())
    }
  }
})
```

## 性能优化点

了解架构有助于识别性能优化的机会。

组件级缓存可以避免重复渲染不变的组件。如果某个组件的输入没有变化，可以直接使用之前渲染的 HTML。

数据缓存避免重复的 API 调用。对于不常变化的数据，可以在服务端维护缓存。

流式渲染让用户更早看到内容。对于复杂页面，流式渲染的收益可能很显著。

代码分割确保只加载当前页面需要的代码。这对客户端性能至关重要。

## 从设计到实现

第一部分我们讨论的是"为什么"和"是什么"——SSR 的动机、概念和设计决策。

在接下来的第二部分，我们将深入"怎么做"——阅读 Vue SSR 的源码，理解这些设计是如何实现的。我们会逐行解析 `renderToString`、组件渲染、属性处理、流式渲染、客户端水合等核心逻辑。

第三部分，我们将亲手实现一个简化版的 SSR 方案。通过实践，将理论知识转化为真正的理解。

有了第一部分建立的概念基础，我们已经准备好深入源码的世界了。
