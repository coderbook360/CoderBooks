# SSG 静态生成设计

在前面的章节中，我们主要讨论了 SSR——每次请求时服务器动态渲染页面。现在让我们来看另一种渲染策略：静态站点生成（Static Site Generation，简称 SSG）。

## SSG 的核心思想

SSG 的核心思想非常简单：在构建阶段而不是请求阶段完成页面渲染。构建工具遍历所有可能的路由，为每个路由生成一个静态 HTML 文件。这些文件被部署到静态托管服务或 CDN 上，用户请求时直接返回预生成的文件。

```
SSR 流程：
用户请求 → 服务器获取数据 → 服务器渲染 → 返回 HTML

SSG 流程：
构建时：生成所有页面的静态 HTML → 部署到 CDN
用户请求 → CDN 直接返回静态 HTML
```

这种方式带来了显著的性能优势。静态文件可以被全球各地的 CDN 节点缓存，用户从最近的节点获取内容，延迟极低。服务器不需要进行任何计算，可以处理海量请求。

## 构建时渲染

让我们看一个 SSG 构建过程的简化示例：

```javascript
// SSG 构建脚本的概念实现
async function buildStaticSite() {
  // 获取所有需要生成的路由
  const routes = await getRoutes()
  
  for (const route of routes) {
    // 获取这个路由需要的数据
    const data = await fetchDataForRoute(route)
    
    // 创建应用实例
    const app = createSSRApp(App)
    const router = createRouter()
    
    app.use(router)
    
    // 设置路由
    await router.push(route)
    await router.isReady()
    
    // 注入数据
    app.provide('pageData', data)
    
    // 渲染为 HTML
    const html = await renderToString(app)
    
    // 写入文件
    const filePath = routeToFilePath(route)
    await fs.writeFile(filePath, wrapInHtmlDocument(html, data))
  }
}

function routeToFilePath(route) {
  // /about → dist/about/index.html
  // /blog/post-1 → dist/blog/post-1/index.html
  if (route === '/') return 'dist/index.html'
  return `dist${route}/index.html`
}
```

这个脚本会在构建时执行，生成所有页面的静态 HTML。生成的文件结构可能像这样：

```
dist/
├── index.html           # 首页
├── about/
│   └── index.html       # 关于页
├── blog/
│   ├── index.html       # 博客列表
│   ├── post-1/
│   │   └── index.html   # 文章 1
│   └── post-2/
│       └── index.html   # 文章 2
└── assets/
    ├── app.js
    └── style.css
```

## 动态路由的处理

许多网站有动态路由——博客文章、产品详情页等。SSG 需要在构建时知道所有可能的路由。

在 Nuxt 3 中，可以通过 `nitro.prerender.routes` 配置或动态生成路由列表：

```javascript
// nuxt.config.js
export default {
  nitro: {
    prerender: {
      routes: ['/about', '/contact'],
      // 或者使用爬虫自动发现路由
      crawlLinks: true
    }
  }
}
```

对于数据驱动的动态路由，需要提供一个获取所有可能路径的函数：

```javascript
// pages/blog/[slug].vue
export default {
  async asyncData({ params }) {
    const post = await fetchPost(params.slug)
    return { post }
  }
}

// 在 nuxt.config.js 或钩子中
export default {
  hooks: {
    async 'nitro:config'(config) {
      // 获取所有文章的 slug
      const posts = await fetchAllPosts()
      const routes = posts.map(post => `/blog/${post.slug}`)
      
      config.prerender.routes = [
        ...config.prerender.routes,
        ...routes
      ]
    }
  }
}
```

## 数据获取与缓存

SSG 的数据获取发生在构建时。这意味着页面内容反映的是构建那一刻的数据状态。

```javascript
// 构建时获取数据
async function fetchDataForRoute(route) {
  if (route.startsWith('/blog/')) {
    const slug = route.split('/')[2]
    return await fetchPost(slug)  // 构建时调用 API
  }
  
  if (route === '/products') {
    return await fetchProducts()  // 构建时获取产品列表
  }
  
  return null
}
```

对于更新频繁的数据，可以考虑混合策略：静态生成页面骨架，客户端加载实时数据。

```html
<template>
  <div>
    <!-- 静态内容 -->
    <h1>{{ post.title }}</h1>
    <div v-html="post.content"></div>
    
    <!-- 动态内容，客户端加载 -->
    <ClientOnly>
      <CommentSection :post-id="post.id" />
      <ViewCounter :post-id="post.id" />
    </ClientOnly>
  </div>
</template>
```

这种方式让核心内容享受 SSG 的性能优势，同时保留了动态功能。

## SSG 的适用场景

SSG 最适合内容相对静态的网站：

博客和文档站点是 SSG 的典型用例。文章一旦发布就很少变化，非常适合预生成。VuePress、VitePress 这类工具专门为文档站点设计，内置了 SSG 支持。

营销和落地页同样适合 SSG。这类页面追求极致的加载速度，内容更新频率低，预生成是最优解。

电商的产品目录如果更新不频繁，也可以使用 SSG。但需要注意价格和库存等实时信息应该通过客户端动态获取。

不适合 SSG 的场景包括：内容高度个性化的页面（根据用户身份显示不同内容）、实时数据驱动的页面（股票行情、体育比分）、用户生成内容为主的社交平台。

## 构建性能考量

当站点页面数量很大时，SSG 的构建时间可能变得很长。一个有上万篇文章的博客，完整构建可能需要几十分钟。

几种优化策略可以缓解这个问题：

增量构建只重新生成变化的页面。通过比较内容 hash 或修改时间，跳过未变化的页面。

并行构建利用多核 CPU 同时生成多个页面。大多数现代 SSG 工具都支持并行构建。

分布式构建将构建任务分散到多台机器上。一些 CI/CD 平台提供了这种能力。

```javascript
// 并行构建示例
async function buildStaticSite() {
  const routes = await getRoutes()
  
  // 并行生成，限制并发数避免资源耗尽
  const concurrency = 10
  await pMap(routes, generatePage, { concurrency })
}
```

## 与客户端水合的配合

虽然页面是静态生成的，但为了让页面变得可交互，仍然需要客户端水合。SSG 生成的 HTML 会包含 JavaScript 引用，浏览器加载后执行水合过程。

```html
<!-- SSG 生成的页面 -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <div id="app">
    <!-- 预渲染的内容 -->
    <h1>Welcome</h1>
    <button>Click me</button>
  </div>
  
  <!-- 水合需要的 JavaScript -->
  <script src="/assets/app.js"></script>
</body>
</html>
```

用户首先看到预渲染的内容，然后 JavaScript 加载并水合，按钮变得可点击。这个流程与 SSR 类似，区别只在于 HTML 的生成时机。

SSG 是一种强大的渲染策略，在适合的场景下能提供最佳的性能和可扩展性。但它的静态特性也意味着内容更新需要重新构建和部署。在下一章中，我们会讨论一种介于 SSR 和 SSG 之间的策略：增量静态再生（ISR）。
