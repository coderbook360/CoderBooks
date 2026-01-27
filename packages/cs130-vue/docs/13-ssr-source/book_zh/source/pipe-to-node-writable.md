# pipeToNodeWritable Node 流输出

`pipeToNodeWritable` 是 Vue SSR 的流式渲染 API，它将渲染内容直接管道到 Node.js 可写流，适用于 Express、Koa 等 Node.js 服务器框架。

## 与 renderToStream 的区别

`renderToStream` 返回一个可读流，需要手动管道：

```javascript
const readable = renderToNodeStream(app)
readable.pipe(res)
```

`pipeToNodeWritable` 直接接收可写流，更加直接：

```javascript
await pipeToNodeWritable(app, {}, res)
```

## 函数签名

```typescript
function pipeToNodeWritable(
  app: App,
  context: SSRContext,
  writable: Writable,
  options?: PipeToNodeWritableOptions
): Promise<void>
```

返回 Promise，在渲染完成时 resolve，出错时 reject。

## 基本使用

```javascript
import { pipeToNodeWritable } from 'vue/server-renderer'
import express from 'express'

const app = express()

app.get('*', async (req, res) => {
  const vueApp = createSSRApp(App)
  const ctx = {}
  
  res.setHeader('Content-Type', 'text/html')
  
  // 发送 HTML 头部
  res.write('<!DOCTYPE html><html><head></head><body><div id="app">')
  
  // 管道渲染内容
  await pipeToNodeWritable(vueApp, ctx, res)
  
  // 发送 HTML 尾部
  res.write('</div></body></html>')
  res.end()
})
```

## 配置选项

```typescript
interface PipeToNodeWritableOptions {
  // 渲染完每个异步边界后调用
  onServerPrefetch?: () => void
  
  // 发生错误时调用
  onError?: (error: Error) => void
  
  // 自定义写入函数
  write?: (content: string) => void
}
```

## 核心实现

```typescript
async function pipeToNodeWritable(
  app: App,
  context: SSRContext,
  writable: Writable,
  options: PipeToNodeWritableOptions = {}
) {
  const { onError, onServerPrefetch } = options
  
  // 创建 push 函数
  const push = (content: string) => {
    if (!writable.destroyed) {
      writable.write(content)
    }
  }
  
  try {
    // 创建虚拟节点
    const vnode = createVNode(app._component, app._props)
    
    // 渲染
    await renderVNode(push, vnode, null, context)
    
    // 处理 teleports
    if (context.teleports) {
      // teleports 需要特殊处理
    }
    
  } catch (error) {
    if (onError) {
      onError(error as Error)
    } else {
      throw error
    }
  }
}
```

## 背压处理

当写入速度超过消费速度时，需要处理背压：

```typescript
async function pipeWithBackpressure(
  writable: Writable,
  render: () => AsyncGenerator<string>
) {
  for await (const chunk of render()) {
    const ok = writable.write(chunk)
    
    if (!ok) {
      // 等待 drain 事件
      await new Promise<void>(resolve => {
        writable.once('drain', resolve)
      })
    }
  }
}
```

## 错误恢复

在流式渲染中，错误发生时可能已经发送了部分内容：

```typescript
async function pipeWithErrorRecovery(app, ctx, res) {
  let contentStarted = false
  
  const push = (content: string) => {
    if (!contentStarted) {
      contentStarted = true
    }
    res.write(content)
  }
  
  try {
    await renderToStream(app, push, ctx)
  } catch (error) {
    if (!contentStarted) {
      // 还没发送内容，可以返回错误页面
      res.status(500)
      res.send(renderErrorPage(error))
    } else {
      // 已经发送了部分内容，注入错误处理脚本
      res.write(`
        <script>
          console.error('SSR Error');
          window.__SSR_ERROR__ = true;
        </script>
      `)
      res.end()
    }
  }
}
```

## 超时处理

长时间运行的渲染需要超时机制：

```typescript
async function pipeWithTimeout(
  app: App,
  ctx: SSRContext,
  writable: Writable,
  timeout: number = 10000
) {
  const controller = new AbortController()
  
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)
  
  try {
    await Promise.race([
      pipeToNodeWritable(app, ctx, writable),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('SSR timeout'))
        })
      })
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}
```

## 与 Express 集成

完整的 Express 集成示例：

```javascript
import express from 'express'
import { pipeToNodeWritable, createSSRApp } from 'vue'
import App from './App.vue'

const server = express()

server.get('*', async (req, res, next) => {
  const app = createSSRApp(App)
  const ctx = { url: req.url }
  
  // 设置响应头
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  
  // HTML 头部
  const htmlStart = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vue SSR</title>
    </head>
    <body>
      <div id="app">
  `
  
  // HTML 尾部
  const htmlEnd = `
      </div>
      <script type="module" src="/client.js"></script>
    </body>
    </html>
  `
  
  try {
    res.write(htmlStart)
    
    await pipeToNodeWritable(app, ctx, res, {
      onError(error) {
        console.error('Streaming Error:', error)
        // 可以选择如何处理错误
      }
    })
    
    res.write(htmlEnd)
    res.end()
  } catch (error) {
    next(error)
  }
})

// 错误处理中间件
server.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send('Server Error')
})

server.listen(3000)
```

## 与 Koa 集成

Koa 的集成略有不同：

```javascript
import Koa from 'koa'
import { PassThrough } from 'stream'
import { pipeToNodeWritable } from 'vue/server-renderer'

const app = new Koa()

app.use(async (ctx) => {
  const vueApp = createSSRApp(App)
  const ssrCtx = {}
  
  // 创建 PassThrough 流
  const stream = new PassThrough()
  
  ctx.set('Content-Type', 'text/html')
  ctx.body = stream
  
  stream.write('<!DOCTYPE html><html><body><div id="app">')
  
  await pipeToNodeWritable(vueApp, ssrCtx, stream)
  
  stream.write('</div></body></html>')
  stream.end()
})
```

## 条件渲染

可以根据条件选择渲染策略：

```typescript
async function render(req, res) {
  const app = createSSRApp(App)
  
  // 根据请求类型选择渲染方式
  if (req.headers['accept']?.includes('text/html')) {
    // 流式渲染
    res.setHeader('Content-Type', 'text/html')
    await pipeToNodeWritable(app, {}, res)
  } else {
    // 返回 JSON
    const html = await renderToString(app)
    res.json({ html })
  }
}
```

## 分段发送

可以在渲染过程中分段发送：

```typescript
async function renderWithChunks(app, res) {
  const chunks: string[] = []
  let chunkSize = 0
  const CHUNK_SIZE = 4096  // 4KB
  
  const push = (content: string) => {
    chunks.push(content)
    chunkSize += content.length
    
    if (chunkSize >= CHUNK_SIZE) {
      res.write(chunks.join(''))
      chunks.length = 0
      chunkSize = 0
    }
  }
  
  await renderVNode(push, app._component, ...)
  
  // 发送剩余内容
  if (chunks.length > 0) {
    res.write(chunks.join(''))
  }
}
```

## 性能监控

监控流式渲染的性能：

```typescript
async function renderWithMetrics(app, ctx, res) {
  const startTime = process.hrtime.bigint()
  let bytesWritten = 0
  
  const originalWrite = res.write.bind(res)
  res.write = (chunk: string | Buffer) => {
    bytesWritten += Buffer.byteLength(chunk)
    return originalWrite(chunk)
  }
  
  try {
    await pipeToNodeWritable(app, ctx, res)
  } finally {
    const endTime = process.hrtime.bigint()
    const duration = Number(endTime - startTime) / 1e6  // 转换为毫秒
    
    console.log({
      url: ctx.url,
      duration: `${duration.toFixed(2)}ms`,
      bytesWritten
    })
  }
}
```

## 流的生命周期

理解流的生命周期很重要：

```typescript
writable.on('close', () => {
  // 客户端断开连接
  // 应该中止渲染
})

writable.on('error', (error) => {
  // 写入错误
  console.error('Stream error:', error)
})

writable.on('finish', () => {
  // 所有数据已写入
})
```

## 小结

`pipeToNodeWritable` 提供直接的流式输出：

1. 直接管道到 Node.js 可写流
2. 返回 Promise，便于异步控制
3. 需要处理背压和错误
4. 可以与 Express、Koa 等框架集成
5. 支持性能监控和超时控制

这个 API 适合需要精细控制流式渲染过程的场景。
