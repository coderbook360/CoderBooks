# 流式渲染的设计思路

传统的 SSR 需要等待整个页面渲染完成后才发送响应。流式渲染改变了这个模式，边渲染边发送，显著减少首字节时间（TTFB）。

## 传统渲染的瓶颈

传统 SSR 的流程是串行的：

```
请求 → 获取数据 → 渲染 HTML → 发送响应
        ↓
      可能很慢
```

如果页面需要多个数据源，整个请求的延迟是所有数据获取时间的总和。用户需要等待所有处理完成才能看到第一个字节。

```javascript
// 传统 SSR
app.get('/', async (req, res) => {
  // 所有数据获取完成后才能渲染
  const user = await fetchUser()
  const posts = await fetchPosts()
  const comments = await fetchComments()
  
  const html = await renderToString(app)
  res.send(html)  // 一次性发送
})
```

## 流式渲染的工作原理

流式渲染利用 HTTP 的分块传输编码（chunked transfer encoding）。服务器可以在完整响应生成之前就开始发送数据。

```javascript
// 流式 SSR
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Transfer-Encoding', 'chunked')
  
  // 立即发送 HTML 头部
  res.write('<!DOCTYPE html><html><head>...</head><body>')
  
  // 渲染并流式发送
  const stream = renderToNodeStream(app)
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    res.write('</body></html>')
    res.end()
  })
})
```

用户可以更快地看到页面开始加载，浏览器也可以更早地开始解析 HTML 和加载资源。

## Vue 的流式渲染 API

Vue 3 提供了流式渲染的 API：

```javascript
import { renderToNodeStream, renderToWebStream } from 'vue/server-renderer'

// Node.js 流
const nodeStream = renderToNodeStream(app)

// Web 标准流（适用于 Edge Runtime）
const webStream = renderToWebStream(app)
```

这些 API 返回流对象，可以直接传输给 HTTP 响应。

## Suspense 与流式渲染

Vue 的 Suspense 组件与流式渲染配合，实现了更智能的流程：

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

在流式渲染中，Suspense 的行为是：

1. 先发送 fallback 内容（如加载指示器）
2. 异步内容准备好后，发送实际内容和替换脚本
3. 客户端接收到替换脚本，更新 DOM

```html
<!-- 先发送 -->
<div id="async-1">
  <div class="loading">加载中...</div>
</div>

<!-- 异步内容准备好后发送 -->
<template id="async-1-content">
  <div>实际内容...</div>
</template>
<script>
  document.getElementById('async-1').innerHTML = 
    document.getElementById('async-1-content').innerHTML
</script>
```

这种方式让用户立即看到页面结构和加载状态，异步内容加载完成后自动填充。

## 优先级控制

流式渲染可以按优先级发送内容。首屏关键内容优先发送，非关键内容延后：

```vue
<template>
  <!-- 首屏内容，立即渲染 -->
  <header>{{ title }}</header>
  
  <main>
    <!-- 主要内容，优先级高 -->
    <Suspense>
      <ArticleContent />
    </Suspense>
  </main>
  
  <aside>
    <!-- 侧边栏，优先级低 -->
    <Suspense>
      <Recommendations />
    </Suspense>
  </aside>
</template>
```

框架会先发送 header 和 main 的结构，然后流式发送 ArticleContent，最后发送 Recommendations。

## 性能对比

流式渲染改善了几个关键指标：

TTFB（首字节时间）：从请求开始到收到第一个字节。流式渲染可以在数据加载期间就开始发送 HTML。

FCP（首次内容绘制）：用户看到第一个内容的时间。流式发送的 HTML 可以更早开始渲染。

```
传统 SSR:
请求 ━━━━[等待数据]━━━━[渲染]━━━━[发送]→ 响应
                                         ↑ TTFB

流式 SSR:
请求 ━━━━[开始发送 ━━━━ 持续发送 ━━━━ 发送完成]
         ↑ TTFB(更早)
```

## 缓存的挑战

流式渲染与传统缓存策略不完全兼容。传统的页面级缓存需要完整的 HTML，但流式响应是逐步生成的。

解决方案包括：

组件级缓存：缓存不变化的组件渲染结果。

边缘缓存：使用 CDN 的 Edge SSR 能力。

部分缓存：只缓存页面的静态部分。

```javascript
// 组件级缓存示例
const cache = new Map()

async function renderWithCache(component, key) {
  if (cache.has(key)) {
    return cache.get(key)
  }
  const html = await renderToString(component)
  cache.set(key, html)
  return html
}
```

## 错误处理

流式渲染的错误处理更复杂。一旦开始发送响应，就不能更改 HTTP 状态码。

```javascript
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  
  try {
    const stream = renderToNodeStream(app)
    stream.on('error', (err) => {
      // 已经开始发送，无法返回 500
      // 只能在 HTML 中插入错误信息
      res.write(`<script>console.error('渲染错误')</script>`)
      res.end()
    })
    stream.pipe(res)
  } catch (err) {
    // 还没开始发送，可以返回 500
    res.status(500).send('Server Error')
  }
})
```

最佳实践是在渲染前完成关键的数据验证和权限检查。

## Nuxt 的实现

Nuxt 3 原生支持流式渲染，配合 `useFetch` 和 Suspense 使用：

```vue
<script setup>
// 这个请求会触发 Suspense
const { data } = await useFetch('/api/posts')
</script>

<template>
  <Suspense>
    <PostList :posts="data" />
    <template #fallback>
      <PostsSkeleton />
    </template>
  </Suspense>
</template>
```

Nuxt 自动处理流式渲染的细节，开发者只需要使用 Suspense 和 async setup。

## 何时使用流式渲染

流式渲染最适合以下场景：

页面有多个独立的数据源，获取时间不同。

首屏内容可以在部分数据准备好后就渲染。

用户对 TTFB 敏感，需要快速反馈。

对于简单页面或数据获取很快的场景，传统渲染可能更简单。流式渲染增加了复杂性，只有在确实需要优化时才值得使用。
