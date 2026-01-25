# 同构渲染设计目标

上一章我们介绍了同构应用的基本概念。现在我们来讨论一个更深入的问题：设计一个优秀的同构渲染框架，需要达成哪些目标？Vue SSR 的设计者们在做架构决策时考虑了哪些因素？

理解这些设计目标，有助于我们在后续阅读源码时把握设计意图，而不是迷失在实现细节中。

## 目标一：渲染结果的一致性

同构渲染最基本的要求是：同一套组件代码，在服务端和客户端渲染的结果必须一致。如果服务端生成的 HTML 结构是 A，客户端渲染出来的结构是 B，两者不匹配，就会出现问题。

这种不一致被称为"水合不匹配"（Hydration Mismatch）。当客户端尝试"接管"服务端渲染的 HTML 时，它会将现有 DOM 与虚拟 DOM 进行对比。如果两者不一致，Vue 会发出警告，在某些情况下甚至需要丢弃服务端渲染的内容，重新在客户端渲染。这会导致页面闪烁、性能下降，违背了 SSR 的初衷。

为了保证一致性，Vue 的渲染逻辑必须在两个环境中表现相同。给定相同的组件、相同的 props、相同的状态，无论在哪里渲染，产生的 DOM 结构必须完全一致。

```javascript
// 这段代码会导致不一致
export default {
  data() {
    return {
      // 时间在服务端和客户端渲染时不同
      timestamp: Date.now()
    }
  },
  template: `<div>{{ timestamp }}</div>`
}
```

上面的代码在服务端渲染时记录一个时间戳，客户端水合时又会得到一个新的时间戳。两者必然不同，导致水合不匹配。避免这类问题需要开发者遵循一些约定：数据应该在服务端获取后传递给客户端，而不是在两端各自生成。

Vue 的设计通过状态序列化和反序列化来解决这个问题。服务端渲染时的状态会被序列化到 HTML 中，客户端加载时读取这些状态并用于初始化，确保两端使用相同的数据。

## 目标二：最小化服务端开销

服务端资源是有成本的。每增加一毫秒的渲染时间，在高并发场景下都会被放大。因此，服务端渲染必须尽可能高效。

Vue SSR 在这方面做了很多优化。首先是避免创建真实 DOM。在浏览器中，Vue 通过虚拟 DOM diff 来更新真实 DOM。但在服务端，我们不需要真实 DOM，只需要生成 HTML 字符串。Vue 的服务端渲染器直接将虚拟 DOM 序列化为字符串，跳过了 DOM 操作这个昂贵的步骤。

```javascript
// 客户端渲染需要操作真实 DOM
const el = document.createElement('div')
el.className = 'container'
el.appendChild(document.createTextNode('Hello'))
parent.appendChild(el)

// 服务端渲染只需要生成字符串
const html = '<div class="container">Hello</div>'
```

字符串拼接比 DOM 操作快几个数量级。Vue 的服务端渲染器使用高效的 Buffer 机制来累积 HTML 字符串，进一步优化了性能。

另一个优化是跳过不必要的工作。服务端渲染不需要建立响应式系统——数据在渲染时是静态的，不会发生变化。因此 Vue 的 `createSSRApp` 创建的应用实例会跳过响应式代理的创建，减少了开销。

## 目标三：支持异步数据获取

真实的应用几乎都需要从数据库或 API 获取数据。同构渲染框架必须优雅地支持异步数据获取。

这里有一个微妙的问题：在客户端渲染中，组件挂载后再发起数据请求，数据返回后更新状态触发重渲染，这是很自然的流程。但在服务端渲染中，我们需要在开始渲染之前就获取好所有数据，因为渲染过程是同步的，一旦开始就不能暂停等待数据。

```javascript
// 服务端需要预先获取数据
export async function render(url) {
  const app = createSSRApp(App)
  const router = createRouter()
  const store = createStore()
  
  app.use(router)
  app.use(store)
  
  await router.push(url)
  await router.isReady()
  
  // 找出当前路由匹配的组件
  const matchedComponents = router.currentRoute.value.matched.map(
    record => record.components.default
  )
  
  // 调用每个组件的数据预取方法
  await Promise.all(
    matchedComponents.map(component => {
      if (component.asyncData) {
        return component.asyncData({ store, route: router.currentRoute.value })
      }
    })
  )
  
  // 数据准备就绪，开始渲染
  const html = await renderToString(app)
  
  return { html, state: store.state }
}
```

这段代码展示了一种常见的数据预取模式。在渲染之前，我们遍历当前路由匹配的所有组件，如果组件定义了 `asyncData` 方法就调用它。等所有数据获取完成后，再开始渲染。

Vue 3 还提供了 `Suspense` 组件来处理异步依赖。在 Suspense 边界内，异步组件和 `async setup()` 的解析会被自动等待。这为处理复杂的异步场景提供了更优雅的方案。

## 目标四：流式渲染支持

传统的 SSR 需要等待整个页面渲染完成后才能发送响应。对于复杂的页面，这意味着用户需要等待很长时间才能看到第一个字节。

流式渲染改变了这种模式。它允许服务器边渲染边发送内容。当页面的头部渲染完成时，就可以先发送给客户端，不需要等待页面底部的渲染。

```javascript
// 字符串渲染 - 必须等待全部完成
const html = await renderToString(app)
res.send(html)

// 流式渲染 - 边渲染边发送
const stream = renderToNodeStream(app)
stream.pipe(res)
```

流式渲染的好处是显著的。首先是更快的首字节时间（TTFB）——服务器可以更早开始发送响应。其次是更好的用户感知——用户可以更早看到页面内容开始出现，即使页面还没有完全加载完。第三是更好的内存使用——服务器不需要在内存中持有整个 HTML 字符串，可以边生成边发送。

Vue 的流式渲染还支持与 `Suspense` 配合。当遇到还在等待数据的异步组件时，可以先发送占位符，数据准备好后再发送真实内容。

## 目标五：优雅的错误处理

服务端渲染的错误处理比客户端复杂得多。在客户端，一个组件渲染出错最多影响这个组件本身。但在服务端，如果渲染过程中抛出异常，可能导致整个请求失败。

一个健壮的 SSR 框架需要提供多层次的错误处理机制。

```javascript
// 渲染级别的错误处理
app.get('*', async (req, res) => {
  try {
    const html = await render(req.url)
    res.send(html)
  } catch (error) {
    console.error('SSR Error:', error)
    
    // 降级方案：返回 CSR 模式的 HTML
    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="app"></div>
        <script src="/js/app.js"></script>
      </body>
      </html>
    `)
  }
})
```

这个例子展示了一种常见的降级策略：当 SSR 失败时，返回一个 CSR 模式的 HTML，让客户端自己完成渲染。虽然失去了 SSR 的首屏性能优势，但至少用户还能看到页面。

Vue 的 `renderToString` 和流式渲染 API 都会在出错时抛出异常或发出错误事件，让开发者可以捕获并处理这些错误。

## 目标六：开发体验的一致性

同构应用的代码在两个环境中运行，但开发者不应该需要维护两套不同的心智模型。理想情况下，开发者应该能够像写普通 Vue 应用一样写代码，框架自动处理同构的复杂性。

Nuxt 在这方面做得很好。它提供了 `useFetch`、`useAsyncData` 这样的组合式 API，自动处理服务端数据获取和客户端状态同步。开发者只需要声明需要什么数据，框架会在正确的时机、正确的环境中执行获取逻辑。

```javascript
// Nuxt 3 的数据获取 - 开发者不需要关心同构细节
const { data: posts } = await useFetch('/api/posts')
```

这一行代码背后，Nuxt 会在服务端渲染时调用 API，序列化数据到 HTML 中，客户端水合时读取序列化的数据。开发者完全不需要手动处理这些复杂性。

## 目标七：可测试性

同构代码需要能够在隔离的环境中测试。测试服务端渲染逻辑不应该需要启动真正的服务器，测试客户端逻辑也不应该需要真正的浏览器。

Vue 的 `@vue/test-utils` 提供了与环境无关的测试工具。可以用 `mount` 测试组件的 DOM 输出，用 `renderToString` 测试 SSR 输出。

```javascript
import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import MyComponent from './MyComponent.vue'

test('renders correctly on server', async () => {
  const app = createSSRApp(MyComponent, { title: 'Hello' })
  const html = await renderToString(app)
  
  expect(html).toContain('<h1>Hello</h1>')
})
```

## 设计目标的权衡

这些目标之间有时会相互冲突。比如，为了保证渲染一致性，可能需要额外的运行时检查，这会增加服务端开销。为了支持流式渲染，架构需要更复杂，可能影响开发体验。

Vue SSR 的设计在这些目标之间寻找平衡。核心库提供了必要的基础能力，但保持了足够的灵活性让开发者根据具体场景做取舍。比如，水合不匹配的检测在开发模式下是开启的，帮助开发者发现问题；在生产模式下可以关闭以提升性能。

在接下来的章节中，我们会深入探讨水合（Hydration）这个核心概念，理解客户端是如何"接管"服务端渲染的 HTML 的。
