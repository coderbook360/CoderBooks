# 流式渲染设计

在前面的章节中，我们讨论了 SSR 的基本原理和水合优化策略。现在让我们来探讨另一个重要的性能优化技术：流式渲染（Streaming Rendering）。

## 传统 SSR 的瓶颈

传统的服务端渲染采用"缓冲模式"：服务器完整地渲染整个页面，将结果存储在内存中，然后一次性发送给客户端。这种模式简单直接，但存在几个问题。

首先是首字节时间（TTFB）较长。服务器必须等待整个页面渲染完成才能开始发送响应。如果页面复杂或者需要获取多个数据源，这个等待时间可能很长。

```javascript
// 传统缓冲模式
app.get('/', async (req, res) => {
  // 必须等待所有数据
  const [user, posts, recommendations] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchRecommendations()  // 可能很慢
  ])
  
  // 必须等待完整渲染
  const html = await renderToString(app)
  
  // 最后才能发送
  res.send(html)
})
```

在这个例子中，即使 user 和 posts 很快就准备好了，也必须等待最慢的 recommendations 完成。整个页面渲染完成后才能发送第一个字节。

其次是内存使用峰值较高。整个 HTML 字符串需要在内存中完整构建，对于大型页面，这可能占用相当多的内存。在高并发场景下，内存可能成为瓶颈。

## 流式渲染的优势

流式渲染改变了这种"全有或全无"的模式。服务器可以边渲染边发送，不需要等待整个页面完成。

```javascript
// 流式渲染模式
app.get('/', async (req, res) => {
  const stream = renderToNodeStream(app)
  
  // 立即开始发送，不等待完成
  stream.pipe(res)
})
```

使用流式渲染，服务器可以在渲染完 `<head>` 和页面开头后就开始发送。浏览器可以更早开始解析 HTML、加载 CSS 和 JavaScript。

这带来了几个直接的好处。首字节时间大幅缩短——服务器不需要等待整个页面渲染完成就能开始响应。用户感知的加载速度更快——浏览器可以更早开始渲染已接收的内容。内存使用更平稳——不需要在内存中持有完整的 HTML 字符串。

```
缓冲模式时间线：
[获取数据 A][获取数据 B][获取数据 C][渲染完整页面][-------- 发送完整响应 --------]
                                                                              ↓
                                                                          [浏览器开始解析]

流式模式时间线：
[获取数据 A][渲染并发送头部][浏览器开始解析]
       [获取数据 B][渲染并发送主内容][浏览器继续渲染]
              [获取数据 C][渲染并发送剩余部分][完成]
```

## HTTP 分块传输

流式渲染依赖于 HTTP 的分块传输编码（Chunked Transfer Encoding）。在这种模式下，服务器不需要预先知道响应的总长度，可以分多个块发送响应。

```http
HTTP/1.1 200 OK
Content-Type: text/html
Transfer-Encoding: chunked

23
<!DOCTYPE html><html><head>
1a
<title>My App</title>
...
0

```

每个块包含长度信息和数据。最后发送一个长度为 0 的块表示响应结束。现代浏览器都支持分块传输，并且可以在接收过程中逐步解析和渲染。

## Vue 的流式渲染 API

Vue 提供了多个流式渲染 API，适用于不同的运行环境和使用场景。

`renderToNodeStream` 返回一个 Node.js Readable Stream，适合在 Express 或 Koa 等框架中使用：

```javascript
import { renderToNodeStream } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.vue'

app.get('/', async (req, res) => {
  const app = createSSRApp(App)
  const stream = renderToNodeStream(app)
  
  res.setHeader('Content-Type', 'text/html')
  
  // 发送 HTML 开头
  res.write('<!DOCTYPE html><html><head>')
  res.write('<link rel="stylesheet" href="/style.css">')
  res.write('</head><body><div id="app">')
  
  // 流式发送应用内容
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    res.write('</div>')
    res.write('<script src="/app.js"></script>')
    res.write('</body></html>')
    res.end()
  })
})
```

这个例子展示了一个完整的流式渲染流程。我们先发送 HTML 的开头部分，然后将 Vue 应用的渲染流管道到响应，最后发送 HTML 的结尾部分。

`renderToWebStream` 返回一个 Web Streams API 的 ReadableStream，适合在 Edge Runtime 或 Cloudflare Workers 等环境中使用：

```javascript
import { renderToWebStream } from '@vue/server-renderer'

export async function handleRequest(request) {
  const app = createSSRApp(App)
  const stream = renderToWebStream(app)
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

`renderToSimpleStream` 是最底层的 API，它接受一个包含 `push` 和 `destroy` 方法的对象，让你可以完全控制输出过程：

```javascript
import { renderToSimpleStream } from '@vue/server-renderer'

const chunks = []

renderToSimpleStream(app, {
  push(content) {
    if (content) {
      chunks.push(content)
    }
  },
  destroy(err) {
    if (err) {
      console.error(err)
    }
  }
})
```

## 与 Suspense 的配合

流式渲染与 Vue 的 Suspense 组件配合使用时特别强大。Suspense 可以定义异步边界，流式渲染器会在边界内的异步内容准备好之前先发送占位符。

```vue
<template>
  <div>
    <Header />  <!-- 立即渲染和发送 -->
    
    <Suspense>
      <template #default>
        <AsyncMainContent />  <!-- 等待数据后发送 -->
      </template>
      <template #fallback>
        <LoadingSpinner />  <!-- 先发送这个占位符 -->
      </template>
    </Suspense>
    
    <Footer />  <!-- 可能在 MainContent 之前发送 -->
  </div>
</template>
```

渲染器的行为取决于配置。在默认模式下，Suspense 边界会阻塞——等待异步内容准备好后再继续。但可以配置为非阻塞模式，先发送 fallback 内容，稍后通过脚本注入真实内容。

## 乱序流式渲染

更高级的流式渲染支持"乱序"发送。这意味着页面的不同部分可以按照它们准备好的顺序发送，而不是按照它们在 DOM 中的顺序。

```
顺序流式渲染：
[发送 Header][等待 MainContent 数据][发送 MainContent][发送 Footer]

乱序流式渲染：
[发送 Header][发送 Footer][发送 MainContent 占位符]
                                  [MainContent 数据到达]
                                  [发送脚本，将 MainContent 插入正确位置]
```

乱序渲染需要在客户端执行一小段脚本，将后到达的内容插入正确的 DOM 位置。React 18 的流式 SSR 就采用了这种方式。

```html
<!-- 初始发送的内容 -->
<div id="main-content">
  <template id="main-placeholder"></template>
  Loading...
</div>

<!-- 稍后发送的脚本 -->
<script>
  const placeholder = document.getElementById('main-placeholder')
  const content = document.createElement('div')
  content.innerHTML = '...'  // 真实内容
  placeholder.replaceWith(content)
</script>
```

## 错误处理

流式渲染的错误处理比缓冲模式更复杂。在缓冲模式下，如果渲染过程中发生错误，可以返回一个错误页面。但在流式模式下，响应可能已经开始发送了。

```javascript
stream.on('error', (err) => {
  // 此时可能已经发送了部分响应
  // 不能再发送完整的错误页面
  console.error('Streaming error:', err)
  
  // 只能尝试发送一些错误提示
  res.write('<script>console.error("Rendering failed")</script>')
  res.end()
})
```

一种更健壮的策略是在开始流式渲染之前进行一些预检查，确保关键数据已经就绪。只有确认渲染大概率会成功时，才开始流式响应。

```javascript
app.get('/', async (req, res) => {
  try {
    // 预获取关键数据
    const criticalData = await fetchCriticalData()
    
    // 数据就绪，开始流式渲染
    const stream = renderToNodeStream(app)
    stream.pipe(res)
    
  } catch (err) {
    // 还没开始流式响应，可以返回错误页面
    res.status(500).send(renderErrorPage(err))
  }
})
```

## 性能考量

流式渲染并不总是比缓冲渲染快。在某些场景下，它可能带来额外的开销。

如果页面很小，渲染时间本来就很短，流式渲染的优势不明显，反而可能因为分块传输的开销而略微变慢。

如果服务器和客户端之间有缓存层（如 CDN），流式响应可能更难缓存。缓冲响应可以被完整缓存和重用，流式响应则需要特殊处理。

网络条件也会影响效果。在高延迟网络上，流式渲染的优势更明显，因为浏览器可以在等待后续内容时处理已收到的内容。在低延迟网络上，差异可能不太显著。

选择使用流式渲染还是缓冲渲染，需要根据具体场景权衡。对于复杂的、数据获取耗时的页面，流式渲染通常是更好的选择。对于简单的、已经很快的页面，可能不需要引入流式渲染的复杂性。

在下一章中，我们会讨论 SSR 应用中另一个重要话题：状态同步设计。
