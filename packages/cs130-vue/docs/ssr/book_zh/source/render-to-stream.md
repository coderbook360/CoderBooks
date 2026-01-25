# renderToStream 流式渲染入口

流式渲染是 SSR 的高级模式，它允许服务器在完成整个页面渲染之前就开始向客户端发送内容。`renderToStream` 是流式渲染的入口函数。

## 为什么需要流式渲染

传统的 `renderToString` 需要等待整个应用渲染完成后才返回：

```javascript
// 阻塞模式
const html = await renderToString(app)  // 等待全部完成
res.send(html)                          // 一次性发送
```

对于大型应用或包含异步数据获取的页面，这可能导致较长的首字节时间（TTFB）。

流式渲染可以边渲染边发送：

```javascript
// 流式模式
const stream = renderToStream(app)
stream.pipe(res)  // 渐进式发送
```

用户可以更快看到页面内容，提升感知性能。

## 函数签名

```typescript
function renderToStream(
  app: App,
  context?: SSRContext
): Readable

function renderToWebStream(
  app: App,
  context?: SSRContext
): ReadableStream
```

Vue 提供两种 API：`renderToNodeStream` 返回 Node.js 可读流，`renderToWebStream` 返回 Web Streams API 的流。

## Node.js 流

```typescript
import { Readable } from 'stream'

function renderToNodeStream(
  app: App,
  context?: SSRContext
): Readable {
  const stream = new Readable({
    read() {}
  })
  
  // 异步渲染并推送内容
  renderToStreamHelper(app, context, (chunk) => {
    stream.push(chunk)
  }, () => {
    stream.push(null)  // 结束流
  }, (error) => {
    stream.destroy(error)
  })
  
  return stream
}
```

## Web Streams

```typescript
function renderToWebStream(
  app: App,
  context?: SSRContext
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      await renderToStreamHelper(
        app,
        context,
        (chunk) => controller.enqueue(chunk),
        () => controller.close(),
        (error) => controller.error(error)
      )
    }
  })
}
```

## 流式渲染核心

`renderToStreamHelper` 是核心实现：

```typescript
async function renderToStreamHelper(
  app: App,
  context: SSRContext | undefined,
  push: (chunk: string) => void,
  done: () => void,
  error: (e: Error) => void
) {
  try {
    const vnode = app._render()
    
    // 使用特殊的 push 函数进行渲染
    await renderVNodeToStream(vnode, push, context)
    
    // 渲染完成
    done()
  } catch (e) {
    error(e as Error)
  }
}
```

## 分块策略

流式渲染需要决定何时发送数据。Vue 的策略是在安全点进行分块：

```typescript
async function renderVNodeToStream(vnode, push, context) {
  const buffer: string[] = []
  let bufferSize = 0
  const FLUSH_THRESHOLD = 1024 * 4  // 4KB
  
  const bufferedPush = (content: string) => {
    buffer.push(content)
    bufferSize += content.length
    
    // 达到阈值时刷新
    if (bufferSize >= FLUSH_THRESHOLD) {
      push(buffer.join(''))
      buffer.length = 0
      bufferSize = 0
    }
  }
  
  await renderVNode(bufferedPush, vnode, null)
  
  // 刷新剩余内容
  if (buffer.length > 0) {
    push(buffer.join(''))
  }
}
```

## 组件边界分块

在组件边界进行分块是常见策略：

```typescript
async function renderComponentToStream(
  component: Component,
  push: PushFn,
  parentComponent: ComponentInternalInstance | null
) {
  // 开始组件渲染
  const instance = createComponentInstance(component, parentComponent)
  await setupComponent(instance)
  
  // 组件渲染前可以刷新缓冲区
  flushBuffer()
  
  // 渲染组件内容
  const subTree = instance.render()
  await renderVNode(push, subTree, instance)
  
  // 组件完成后再次刷新
  flushBuffer()
}
```

## 异步内容处理

流式渲染对异步内容有特殊处理：

```typescript
async function renderAsyncComponent(
  vnode: VNode,
  push: PushFn,
  context: SSRContext
) {
  // 先发送占位符
  push(`<!--async-boundary-${vnode.id}-->`)
  
  // 继续渲染后续内容
  // ...
  
  // 异步内容准备好后注入
  const asyncContent = await resolveAsyncComponent(vnode)
  context.asyncChunks.push({
    id: vnode.id,
    content: asyncContent
  })
}
```

## Express 集成

与 Express 的集成示例：

```javascript
import express from 'express'
import { renderToNodeStream } from 'vue/server-renderer'
import { createApp } from './app.js'

const server = express()

server.get('*', async (req, res) => {
  const app = createApp()
  
  res.setHeader('Content-Type', 'text/html')
  
  // 发送 HTML 开始部分
  res.write('<!DOCTYPE html><html><head><title>App</title></head><body><div id="app">')
  
  // 流式渲染 Vue 应用
  const stream = renderToNodeStream(app)
  
  stream.on('error', (err) => {
    console.error(err)
    res.status(500).end('Server Error')
  })
  
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    // 发送 HTML 结束部分
    res.write('</div></body></html>')
    res.end()
  })
})
```

## 错误处理

流式渲染的错误处理比较复杂，因为可能已经发送了部分内容：

```typescript
function createStreamWithErrorHandling(app: App) {
  let errorOccurred = false
  
  const stream = renderToNodeStream(app)
  
  stream.on('error', (error) => {
    errorOccurred = true
    
    if (!res.headersSent) {
      // 还没发送任何内容，可以返回错误页面
      res.status(500).send('Error')
    } else {
      // 已经发送了部分内容，只能注入错误处理脚本
      res.write(`<script>window.__SSR_ERROR__ = true;</script>`)
      res.end()
    }
  })
  
  return stream
}
```

## 背压处理

当客户端消费速度慢于服务器生产速度时，需要处理背压：

```typescript
function renderWithBackpressure(stream: Readable) {
  let paused = false
  
  const push = (chunk: string) => {
    if (paused) {
      // 等待恢复
      return new Promise(resolve => {
        stream.once('drain', () => {
          paused = false
          resolve(undefined)
        })
      }).then(() => push(chunk))
    }
    
    const ok = stream.push(chunk)
    if (!ok) {
      paused = true
    }
  }
  
  return push
}
```

## HTTP/2 推送

流式渲染可以与 HTTP/2 Server Push 结合：

```typescript
async function renderWithPush(app: App, res: Http2ServerResponse) {
  const stream = renderToNodeStream(app)
  
  // 在流开始时推送关键资源
  res.createPushResponse('/style.css', ...)
  res.createPushResponse('/main.js', ...)
  
  stream.pipe(res)
}
```

## 性能对比

流式渲染与阻塞渲染的对比：

```
阻塞模式:
[========渲染========] [===传输===]
                      ^ TTFB

流式模式:
[渲染][传输][渲染][传输][渲染][传输]
      ^ TTFB（更早）
```

流式渲染让用户更快看到内容，但总传输时间可能相近。

## 缓存考虑

流式渲染与缓存的结合需要注意：

```typescript
async function renderWithCache(req: Request, res: Response) {
  const cacheKey = getCacheKey(req)
  const cached = await cache.get(cacheKey)
  
  if (cached) {
    res.send(cached)
    return
  }
  
  // 流式渲染时需要收集完整内容用于缓存
  const chunks: string[] = []
  const stream = renderToNodeStream(app)
  
  stream.on('data', chunk => {
    chunks.push(chunk)
    res.write(chunk)
  })
  
  stream.on('end', () => {
    res.end()
    // 存入缓存
    cache.set(cacheKey, chunks.join(''))
  })
}
```

## Suspense 与流式渲染

Suspense 和流式渲染的结合更加复杂：

```typescript
async function renderWithSuspenseStream(app: App) {
  // 渲染 Suspense 外部内容
  // 发送占位符
  // 等待 Suspense 内容
  // 注入最终内容
}
```

这是高级特性，我们在后续章节详细讨论。

## 完整示例

```javascript
// server.js
import express from 'express'
import { renderToNodeStream } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.vue'

const server = express()

server.use(express.static('public'))

server.get('*', async (req, res) => {
  const app = createSSRApp(App)
  
  // 设置响应头
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  
  // 发送文档开始
  res.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Vue SSR</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div id="app">
  `)
  
  // 流式渲染应用
  const stream = renderToNodeStream(app)
  
  stream.on('error', err => {
    console.error('SSR Error:', err)
    if (!res.headersSent) {
      res.status(500)
    }
    res.write(`<pre>Error: ${err.message}</pre>`)
    res.end('</div></body></html>')
  })
  
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    res.write(`
      </div>
      <script type="module" src="/client.js"></script>
    </body>
    </html>
    `)
    res.end()
  })
})

server.listen(3000)
```

## 小结

`renderToStream` 提供流式渲染能力：

1. 支持 Node.js 流和 Web Streams
2. 边渲染边发送，降低 TTFB
3. 需要处理错误和背压
4. 可以在组件边界或固定大小分块
5. 与缓存结合需要收集完整内容

流式渲染是提升 SSR 性能的重要手段，特别是对于大型应用和慢速网络环境。
