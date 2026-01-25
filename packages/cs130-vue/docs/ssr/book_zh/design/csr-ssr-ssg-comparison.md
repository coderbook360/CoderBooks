# CSR vs SSR vs SSG

上一章我们回顾了服务端渲染的发展历程，提到了 CSR、SSR 这些术语。在深入 Vue SSR 实现之前，我们需要先厘清这些渲染策略的本质区别。理解它们各自的工作原理和适用场景，是做出正确技术选型的前提。

## 三种渲染策略的本质

当用户在浏览器中输入一个 URL 并按下回车，到他看到完整的页面内容，这中间发生了什么？不同的渲染策略给出了不同的答案。

客户端渲染（Client-Side Rendering，简称 CSR）把渲染工作完全交给浏览器。服务器返回一个最小化的 HTML 外壳，包含必要的脚本引用。浏览器下载并执行 JavaScript，由 JavaScript 调用 API 获取数据，然后动态生成 DOM 结构。用户第一次看到有意义的内容，往往要等到 JavaScript 完成执行。

服务端渲染（Server-Side Rendering，简称 SSR）把渲染工作放在服务器上完成。每次请求到来时，服务器获取数据、执行渲染逻辑、生成完整的 HTML。浏览器收到的是可以直接显示的页面内容，不依赖 JavaScript 就能呈现。

静态站点生成（Static Site Generation，简称 SSG）则更进一步——它在构建阶段就完成了渲染。页面内容被预先生成为静态 HTML 文件，部署到 CDN 上。用户请求时，CDN 直接返回这些预生成的文件，根本不需要服务器实时计算。

这三种策略可以用一个简单的问题来区分：**渲染发生在什么时候？**CSR 是用户访问时在浏览器中渲染，SSR 是用户访问时在服务器上渲染，SSG 是项目构建时提前渲染。

## CSR：客户端渲染的工作流程

让我们具体看看 CSR 的工作流程。当用户访问一个 CSR 应用时，整个过程可以分为几个阶段。

浏览器首先向服务器请求 HTML 文件。服务器返回的 HTML 通常非常简单，只包含一个挂载点和脚本引用。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>My App</title>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <div id="app">
    <!-- 这里是空的，等待 JavaScript 填充 -->
  </div>
  <script src="/js/chunk-vendors.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>
```

这个 HTML 文件体积很小，服务器几乎不需要做任何计算就能返回。但用户此时看到的是一个空白页面（或者一个加载提示）。

接下来浏览器开始下载 JavaScript 文件。现代前端应用的 JavaScript bundle 可能有几百 KB 甚至几 MB，这需要时间。下载完成后，浏览器开始解析和执行 JavaScript。Vue 或 React 这样的框架会初始化，创建虚拟 DOM，处理路由，建立响应式系统。

然后应用开始获取数据。通常会调用后端 API，等待响应返回。这又是一个网络往返的延迟。数据到达后，框架才能真正开始渲染——更新虚拟 DOM，生成真实 DOM 节点，插入到页面中。

从用户输入 URL 到看到完整内容，经历了多次网络请求和大量的客户端计算。在网络条件差或设备性能低的情况下，这个等待时间可能相当漫长。

CSR 的优势在于服务器压力小，因为渲染工作都在客户端完成。一旦首次加载完成，后续的页面导航非常流畅，因为框架可以直接更新 DOM，不需要再请求完整的 HTML。这种模式也让前后端完全解耦，前端可以作为独立的静态资源部署。

但 CSR 的劣势同样明显。首屏加载时间（Time to First Contentful Paint）往往较长。搜索引擎爬虫在抓取页面时，可能看不到 JavaScript 渲染的内容，影响 SEO。对于低端设备，执行大量 JavaScript 可能导致卡顿。

## SSR：服务端渲染的工作流程

SSR 的流程与 CSR 截然不同。当用户访问页面时，服务器扮演了更重要的角色。

请求到达服务器后，服务器首先获取渲染这个页面所需的数据。然后执行前端框架的渲染逻辑——在 Node.js 环境中运行 Vue 组件，将组件树渲染为 HTML 字符串。最后，服务器将完整的 HTML 返回给浏览器。

```javascript
// Express 服务器中的 SSR 处理示例
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import App from './App.vue'

app.get('*', async (req, res) => {
  // 创建 Vue 应用实例
  const app = createSSRApp(App)
  
  // 获取数据（实际场景中可能是异步操作）
  const data = await fetchDataForRoute(req.url)
  
  // 渲染为 HTML 字符串
  const html = await renderToString(app)
  
  // 返回完整的 HTML 页面
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>My App</title></head>
    <body>
      <div id="app">${html}</div>
      <script>window.__INITIAL_STATE__ = ${JSON.stringify(data)}</script>
      <script src="/js/app.js"></script>
    </body>
    </html>
  `)
})
```

这段代码展示了 SSR 的核心逻辑。服务器使用 `renderToString` 将 Vue 应用渲染为 HTML 字符串，然后嵌入到完整的 HTML 文档中返回。注意我们还把初始数据序列化后注入到页面中，这是为了客户端水合时能够使用相同的数据。

浏览器收到这个响应后，可以立即开始渲染 HTML。用户很快就能看到完整的页面内容，不需要等待 JavaScript 加载和执行。这就是 SSR 能够提升首屏性能的原因。

但故事还没有结束。浏览器随后会加载 JavaScript 文件，Vue 框架会"接管"这个已经渲染好的页面。这个过程就是我们之前提到的水合（Hydration）。水合完成后，页面变成了一个完整的 SPA，后续的交互和导航都由客户端处理。

SSR 的优势在于首屏性能。用户更快看到内容，搜索引擎爬虫也能抓取到完整的页面内容。对于内容型网站、电商产品页、营销落地页这类对首屏性能和 SEO 有要求的场景，SSR 是很有价值的。

SSR 的代价是服务器压力增大。每个请求都需要服务器执行渲染逻辑，这比简单地返回静态文件要消耗更多资源。同时，SSR 的开发复杂度也更高，需要处理服务端和客户端环境的差异，需要考虑水合过程中的各种边界情况。

## SSG：静态站点生成的工作流程

SSG 把渲染工作提前到了构建阶段。在项目构建时，SSG 工具会遍历所有的页面路由，为每个路由生成一个静态 HTML 文件。

```javascript
// 构建时预渲染的概念示例
async function buildStaticSite() {
  const routes = ['/home', '/about', '/blog/post-1', '/blog/post-2']
  
  for (const route of routes) {
    // 获取这个路由需要的数据
    const data = await fetchDataForRoute(route)
    
    // 渲染为 HTML
    const html = await renderRoute(route, data)
    
    // 写入静态文件
    await writeFile(`dist${route}/index.html`, html)
  }
}
```

构建完成后，得到的是一组静态 HTML 文件。这些文件可以部署到任何静态托管服务上，比如 Netlify、Vercel、GitHub Pages，或者放到 CDN 上。

用户访问时，CDN 直接返回预生成的 HTML 文件。没有服务器计算，没有数据库查询，响应速度极快。全球各地的 CDN 节点都可以缓存这些文件，用户从最近的节点获取内容，延迟极低。

SSG 同样需要客户端水合。虽然 HTML 是预生成的，但为了让页面具有交互能力，浏览器仍然需要加载 JavaScript 并执行水合过程。

SSG 的优势是极致的性能和可扩展性。静态文件可以被无限缓存，CDN 可以轻松处理巨大的流量。同时，不需要维护运行时的服务器，运维成本很低。

SSG 的局限在于它适合内容相对静态的场景。如果页面内容需要根据用户身份或实时数据变化，SSG 就不太适用了。另外，如果站点有成千上万的页面，构建时间可能变得很长。

## 选择合适的渲染策略

这三种策略没有绝对的好坏之分，选择取决于具体的业务场景和技术约束。

如果你的应用是一个管理后台、数据看板这类不需要 SEO、用户量有限的内部工具，CSR 通常是最简单的选择。开发体验好，部署简单，完全不需要考虑服务端渲染的复杂性。

如果你的应用需要好的 SEO，或者首屏性能是核心指标，就要考虑 SSR 或 SSG。对于内容更新不频繁的网站，比如博客、文档站、营销页面，SSG 是理想选择。对于内容需要实时更新的场景，比如电商商品页（价格、库存实时变化）、社交媒体信息流，SSR 更合适。

实际项目中，这些策略往往是混合使用的。一个电商网站可能用 SSG 生成商品列表页，用 SSR 渲染商品详情页（因为价格库存需要实时数据），用 CSR 处理购物车和结算流程（因为这些页面不需要 SEO）。Nuxt 3 和 Next.js 这样的现代框架都支持在路由级别选择不同的渲染策略。

## 性能指标的差异

从性能角度来看，三种策略在不同指标上各有优劣。

首字节时间（TTFB）衡量的是从请求发出到收到第一个字节的时间。SSG 通常最快，因为 CDN 可以直接返回缓存的文件。CSR 次之，因为服务器只需要返回一个小的 HTML 文件。SSR 可能最慢，因为服务器需要执行渲染逻辑。

首次内容绘制（FCP）衡量的是用户首次看到任何内容的时间。SSR 和 SSG 在这个指标上通常表现更好，因为 HTML 中已经包含了内容。CSR 则需要等待 JavaScript 加载和执行。

可交互时间（TTI）衡量的是页面完全可交互的时间。这个指标三种策略差距不大，因为都需要等待 JavaScript 加载完成。SSR 和 SSG 可能略有优势，因为用户可以更早开始阅读内容，即使页面还没有完全可交互。

## 总结

理解了 CSR、SSR、SSG 的工作原理和适用场景，我们就能更好地理解 Vue SSR 要解决的问题。Vue SSR 的核心目标是让 Vue 应用能够在服务器上渲染为 HTML，同时保持客户端的交互能力。这涉及到服务端渲染逻辑、客户端水合、状态同步等一系列技术挑战。

在接下来的章节中，我们会深入探讨 SSR 的优势与挑战，以及 Vue 是如何设计它的 SSR 方案来应对这些挑战的。
