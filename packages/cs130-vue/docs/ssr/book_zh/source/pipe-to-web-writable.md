# pipeToWebWritable Web 流输出

`pipeToWebWritable` 是 Vue SSR 针对 Web Streams API 的流式渲染接口。它适用于 Cloudflare Workers、Deno、Bun 等支持 Web 标准的运行时环境。

## Web Streams API

Web Streams 是浏览器和现代 JavaScript 运行时的标准流 API：

```javascript
// ReadableStream - 数据源
const readable = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello')
    controller.enqueue('World')
    controller.close()
  }
})

// WritableStream - 数据目标
const writable = new WritableStream({
  write(chunk) {
    console.log(chunk)
  }
})

// 管道
readable.pipeTo(writable)
```

## 函数签名

```typescript
function pipeToWebWritable(
  app: App,
  context: SSRContext,
  writable: WritableStream
): Promise<void>
```

## 基本使用

```javascript
import { pipeToWebWritable } from 'vue/server-renderer'

export default {
  async fetch(request) {
    const app = createSSRApp(App)
    const ctx = {}
    
    // 创建 TransformStream
    const { readable, writable } = new TransformStream()
    
    // 开始渲染（不等待完成）
    pipeToWebWritable(app, ctx, writable).catch(console.error)
    
    return new Response(readable, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
```

## 核心实现

```typescript
async function pipeToWebWritable(
  app: App,
  context: SSRContext,
  writable: WritableStream
) {
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  
  const push = (content: string) => {
    writer.write(encoder.encode(content))
  }
  
  try {
    const vnode = createVNode(app._component, app._props)
    await renderVNode(push, vnode, null, context)
  } finally {
    await writer.close()
  }
}
```

## 与 Node.js 流的区别

Web Streams 和 Node.js Streams 有几个关键区别：

**异步写入**。Web Streams 的写入是异步的：

```javascript
// Node.js - 同步返回
const ok = writable.write(chunk)

// Web Streams - 返回 Promise
await writer.write(chunk)
```

**编码处理**。Web Streams 需要手动编码字符串：

```javascript
// 需要 TextEncoder
const encoder = new TextEncoder()
await writer.write(encoder.encode('Hello'))
```

**背压机制**。Web Streams 通过 Promise 自然处理背压：

```javascript
// 如果消费者慢，write() 的 Promise 会延迟 resolve
await writer.write(chunk)  // 自动等待
```

## Cloudflare Workers

在 Cloudflare Workers 中使用：

```javascript
import { createSSRApp } from 'vue'
import { pipeToWebWritable } from 'vue/server-renderer'
import App from './App.vue'

export default {
  async fetch(request, env, ctx) {
    const app = createSSRApp(App)
    const ssrContext = {}
    
    const { readable, writable } = new TransformStream()
    
    // 使用 waitUntil 确保渲染完成
    ctx.waitUntil((async () => {
      const writer = writable.getWriter()
      
      try {
        // 写入 HTML 头部
        await writer.write(new TextEncoder().encode(`
          <!DOCTYPE html>
          <html>
          <head><title>App</title></head>
          <body><div id="app">
        `))
        
        // 渲染 Vue 应用
        await pipeToWebWritable(app, ssrContext, writable)
        
        // 写入 HTML 尾部
        await writer.write(new TextEncoder().encode(`
          </div></body></html>
        `))
      } finally {
        await writer.close()
      }
    })())
    
    return new Response(readable, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}
```

## Deno 集成

在 Deno 中使用：

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createSSRApp } from 'vue'
import { pipeToWebWritable } from 'vue/server-renderer'

serve(async (request: Request) => {
  const app = createSSRApp(App)
  
  const { readable, writable } = new TransformStream()
  
  // 异步渲染
  (async () => {
    const writer = writable.getWriter()
    const encoder = new TextEncoder()
    
    await writer.write(encoder.encode('<!DOCTYPE html><html><body><div id="app">'))
    await pipeToWebWritable(app, {}, writable)
    await writer.write(encoder.encode('</div></body></html>'))
    await writer.close()
  })()
  
  return new Response(readable, {
    headers: { 'Content-Type': 'text/html' }
  })
})
```

## Bun 集成

Bun 同样支持 Web Streams：

```typescript
import { createSSRApp } from 'vue'
import { pipeToWebWritable } from 'vue/server-renderer'

Bun.serve({
  async fetch(request) {
    const app = createSSRApp(App)
    
    const { readable, writable } = new TransformStream()
    
    pipeToWebWritable(app, {}, writable)
    
    return new Response(readable, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
})
```

## TransformStream 使用

`TransformStream` 是连接读写的桥梁：

```typescript
const { readable, writable } = new TransformStream({
  transform(chunk, controller) {
    // 可以在这里处理数据
    controller.enqueue(chunk)
  },
  flush(controller) {
    // 流结束时调用
  }
})
```

也可以用于数据转换：

```typescript
// 压缩流
const compressionStream = new CompressionStream('gzip')

const { readable, writable } = new TransformStream()
readable.pipeThrough(compressionStream)

return new Response(readable.pipeThrough(compressionStream), {
  headers: {
    'Content-Type': 'text/html',
    'Content-Encoding': 'gzip'
  }
})
```

## 错误处理

Web Streams 的错误处理：

```typescript
async function pipeWithErrorHandling(app, context, writable) {
  const writer = writable.getWriter()
  
  try {
    await renderToStream(app, context, writer)
    await writer.close()
  } catch (error) {
    console.error('SSR Error:', error)
    
    // 尝试写入错误信息
    try {
      await writer.write(
        new TextEncoder().encode(`<pre>Error: ${error.message}</pre>`)
      )
    } catch {
      // 写入失败，忽略
    }
    
    await writer.abort(error)
  }
}
```

## 取消处理

Web Streams 支持取消：

```typescript
async function renderWithCancellation(request: Request, app: App) {
  const { readable, writable } = new TransformStream()
  
  // 监听请求取消
  const abortPromise = new Promise<void>((_, reject) => {
    request.signal.addEventListener('abort', () => {
      reject(new Error('Request aborted'))
    })
  })
  
  // 渲染与取消竞争
  Promise.race([
    pipeToWebWritable(app, {}, writable),
    abortPromise
  ]).catch(() => {
    writable.abort()
  })
  
  return new Response(readable)
}
```

## 性能优化

**分块大小**。控制写入的分块大小：

```typescript
async function renderWithChunking(app, writable, chunkSize = 4096) {
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  
  let buffer = ''
  
  const push = async (content: string) => {
    buffer += content
    
    if (buffer.length >= chunkSize) {
      await writer.write(encoder.encode(buffer))
      buffer = ''
    }
  }
  
  await renderVNode(push, app._component, ...)
  
  // 刷新剩余内容
  if (buffer) {
    await writer.write(encoder.encode(buffer))
  }
  
  await writer.close()
}
```

**高水位线**。`TransformStream` 可以设置高水位线：

```typescript
const { readable, writable } = new TransformStream(
  {},
  { highWaterMark: 1024 * 16 },  // 写入侧 16KB
  { highWaterMark: 1024 * 16 }   // 读取侧 16KB
)
```

## 边缘计算场景

在边缘计算环境中，流式渲染特别有价值：

```typescript
// Cloudflare Workers 边缘渲染
export default {
  async fetch(request, env, ctx) {
    // 检查缓存
    const cached = await env.CACHE.get(request.url)
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'text/html' }
      })
    }
    
    // 流式渲染
    const { readable, writable } = new TransformStream()
    
    // 收集内容用于缓存
    const chunks: Uint8Array[] = []
    const cachingWriter = new WritableStream({
      write(chunk) {
        chunks.push(chunk)
      },
      close() {
        // 存入缓存
        const content = new Blob(chunks).text()
        ctx.waitUntil(env.CACHE.put(request.url, content))
      }
    })
    
    // 同时写入响应和缓存
    pipeToWebWritable(app, {}, writable)
    
    return new Response(readable, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
```

## 小结

`pipeToWebWritable` 针对 Web Streams API：

1. 适用于 Cloudflare Workers、Deno、Bun 等环境
2. 使用标准的 Web Streams API
3. 异步写入，自动处理背压
4. 需要 TextEncoder 编码字符串
5. 通过 TransformStream 连接读写

随着边缘计算的普及，Web Streams 的重要性日益增加。掌握这个 API，可以让 Vue SSR 在更多平台上运行。
