# ISR 增量静态再生

上一章我们讨论了 SSG 的优势和局限。SSG 最大的问题是内容更新需要完整重建。对于大型站点，这个过程可能很耗时。增量静态再生（Incremental Static Regeneration，简称 ISR）是解决这个问题的一种创新方案。

## ISR 的核心概念

ISR 结合了 SSG 的性能优势和 SSR 的动态特性。页面在构建时预生成，但可以在运行时按需重新生成。

基本工作流程是这样的：首次请求时，如果页面已经预生成，直接返回静态 HTML。同时，后台可能会触发重新生成，更新缓存的页面。后续请求会获得更新后的内容。

```
传统 SSG：
构建时生成 → 部署 → 页面永远不变（除非重新构建）

ISR：
构建时生成 → 部署 → 运行时可按条件重新生成 → 新版本替换旧版本
```

ISR 有几种常见的重新生成策略。

第一种是基于时间的重新生成。设置一个有效期，过期后的第一个请求会触发后台重新生成。

```javascript
// Next.js 风格的 ISR 配置
export async function getStaticProps() {
  const data = await fetchData()
  
  return {
    props: { data },
    revalidate: 60  // 60 秒后可以重新生成
  }
}
```

这个配置表示页面在生成后 60 秒内直接返回缓存版本。60 秒后，当有请求到来时，先返回旧版本，同时在后台触发重新生成。新版本生成完成后替换旧版本，后续请求获得新内容。

第二种是按需重新生成。通过 API 调用主动触发特定页面的重新生成，通常用于内容管理系统的发布流程。

```javascript
// 重新生成 API
app.post('/api/revalidate', async (req, res) => {
  const { path, secret } = req.body
  
  // 验证请求合法性
  if (secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' })
  }
  
  // 触发重新生成
  await regeneratePage(path)
  
  res.json({ revalidated: true })
})
```

当 CMS 中的内容更新时，可以调用这个 API 触发相关页面的重新生成，实现近实时的内容更新。

## 实现原理

ISR 的实现需要一个能够在运行时生成和缓存页面的系统。这通常涉及以下组件：

缓存层存储预生成的页面。这可以是文件系统、Redis、或 CDN 的边缘缓存。每个缓存条目包含 HTML 内容和元数据（生成时间、有效期等）。

生成器负责在需要时渲染页面。它执行与 SSG 构建时相同的渲染逻辑，但在运行时执行。

调度器决定何时触发重新生成。它检查缓存的有效性，处理并发请求，避免重复生成。

```javascript
// ISR 请求处理的简化逻辑
async function handleRequest(path) {
  const cached = await cache.get(path)
  
  if (cached) {
    const age = Date.now() - cached.generatedAt
    
    if (age < cached.revalidateAfter) {
      // 缓存仍然有效，直接返回
      return cached.html
    }
    
    // 缓存过期，触发后台重新生成
    triggerBackgroundRegeneration(path)
    
    // 同时返回旧版本（stale-while-revalidate）
    return cached.html
  }
  
  // 没有缓存，同步生成
  const html = await generatePage(path)
  await cache.set(path, { html, generatedAt: Date.now() })
  return html
}

async function triggerBackgroundRegeneration(path) {
  // 避免重复生成
  if (isRegenerating(path)) return
  
  markAsRegenerating(path)
  
  try {
    const html = await generatePage(path)
    await cache.set(path, { html, generatedAt: Date.now() })
  } finally {
    clearRegeneratingFlag(path)
  }
}
```

这个实现采用了"stale-while-revalidate"策略：即使缓存过期，也先返回旧内容，同时在后台更新。这确保了用户始终能快速获得响应。

## Nuxt 中的 ISR

Nuxt 3 通过 `routeRules` 配置支持 ISR 风格的缓存策略：

```javascript
// nuxt.config.js
export default {
  routeRules: {
    // 博客文章：使用 ISR，每小时重新验证
    '/blog/**': { isr: 3600 },
    
    // 产品页面：使用 ISR，每 10 分钟重新验证
    '/products/**': { isr: 600 },
    
    // 首页：使用 SSR，不缓存
    '/': { ssr: true },
    
    // 关于页面：完全静态
    '/about': { prerender: true }
  }
}
```

不同的路由可以使用不同的策略，实现细粒度的优化。

## ISR 的适用场景

ISR 特别适合以下场景：

内容更新频率中等的站点。新闻网站的文章每小时更新一次可能就够了。产品目录每天更新几次。这种频率使用 ISR 比完整 SSG 重建更高效。

长尾内容很多的站点。一个有十万篇文章的博客，大多数文章很少被访问。使用 ISR，只有被请求的页面才会重新生成，节省了构建资源。

需要兼顾性能和时效性的场景。电商网站需要快速的页面加载，但也需要相对及时地反映库存和价格变化。ISR 提供了这种平衡。

## 注意事项

使用 ISR 需要注意几个问题。

首先是数据一致性。由于页面可能在不同时间生成，同一个用户在不同页面可能看到不同时间点的数据。比如首页显示"最新文章：A"，但点进去可能看到的是更早的文章 B（因为文章列表刚刚更新，但详情页还是旧版本）。

其次是缓存失效的复杂性。当数据变化时，可能需要同时失效多个相关页面。一篇文章更新时，除了文章详情页，可能还需要更新文章列表页、分类页、标签页、作者页等。

第三是调试困难。由于页面可能是在任意时刻生成的，重现和调试问题变得更复杂。需要良好的日志和监控来追踪页面生成的时间线。

```javascript
// 在生成的页面中包含调试信息（仅开发环境）
function wrapHtml(html, meta) {
  if (process.env.NODE_ENV === 'development') {
    return html + `
      <!-- 
        Generated at: ${meta.generatedAt}
        Data fetched at: ${meta.dataFetchedAt}
        Build ID: ${meta.buildId}
      -->
    `
  }
  return html
}
```

ISR 是 SSG 和 SSR 之间的一个重要折中方案。它保留了静态生成的大部分性能优势，同时提供了内容更新的灵活性。在设计渲染策略时，ISR 是一个值得考虑的选项。

在下一章中，我们会讨论 SSR 应用中的一个棘手问题：跨请求状态污染。
