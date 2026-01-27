# renderToStream 入口

本章分析 Vue SSR 流式渲染的入口函数。

## 流式渲染概述

流式渲染允许服务器在完成整个页面渲染之前就开始向客户端发送内容。这显著改善了首字节时间（TTFB）和用户感知的加载速度。

```typescript
// packages/server-renderer/src/renderToStream.ts

import { Readable } from 'stream'

/**
 * 渲染为 Node.js 可读流
 */
export function renderToNodeStream(
  input: App | VNode,
  context: SSRContext = {}
): Readable {
  // 创建可读流
  const stream = new Readable({
    read() {}
  })
  
  // 异步渲染
  Promise.resolve().then(() => {
    doRenderToStream(input, context, (chunk) => {
      stream.push(chunk)
    })
      .then(() => {
        stream.push(null) // 结束流
      })
      .catch((error) => {
        stream.destroy(error)
      })
  })
  
  return stream
}
```

## 核心渲染逻辑

```typescript
/**
 * 流式渲染核心函数
 */
async function doRenderToStream(
  input: App | VNode,
  context: SSRContext,
  push: (chunk: string) => void
): Promise<void> {
  // 获取 VNode
  let vnode: VNode
  
  if (isVNode(input)) {
    vnode = input
  } else {
    // App 实例
    const app = input
    vnode = createVNode(app._component, app._props)
    vnode.appContext = app._context
  }
  
  // 创建缓冲区
  const buffer = createBuffer()
  
  // 渲染
  await renderComponentVNode(buffer.push, vnode, context)
  
  // 刷新缓冲区
  const result = buffer.getBuffer()
  
  // 分块输出
  for (const item of result) {
    if (typeof item === 'string') {
      push(item)
    } else if (isPromise(item)) {
      const resolved = await item
      push(resolved)
    }
  }
}
```

## 分块策略

为了平衡性能和响应性，需要合理控制分块大小。

```typescript
interface StreamOptions {
  /**
   * 缓冲区大小阈值（字节）
   * 达到阈值后自动刷新
   */
  bufferSize?: number
}

/**
 * 带分块控制的流式渲染
 */
export function renderToNodeStreamWithChunks(
  input: App | VNode,
  context: SSRContext = {},
  options: StreamOptions = {}
): Readable {
  const bufferSize = options.bufferSize ?? 8192 // 默认 8KB
  
  const stream = new Readable({
    read() {}
  })
  
  let buffer = ''
  
  const push = (chunk: string) => {
    buffer += chunk
    
    // 达到阈值时刷新
    if (buffer.length >= bufferSize) {
      stream.push(buffer)
      buffer = ''
    }
  }
  
  const flush = () => {
    if (buffer.length > 0) {
      stream.push(buffer)
      buffer = ''
    }
  }
  
  Promise.resolve().then(async () => {
    try {
      await doRenderToStreamWithPush(input, context, push)
      flush() // 刷新剩余内容
      stream.push(null)
    } catch (error) {
      stream.destroy(error as Error)
    }
  })
  
  return stream
}
```

## Web Streams 支持

除了 Node.js 流，Vue 也支持 Web Streams API，这在边缘运行时（如 Cloudflare Workers）中特别有用。

```typescript
/**
 * 渲染为 Web ReadableStream
 */
export function renderToWebStream(
  input: App | VNode,
  context: SSRContext = {}
): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      try {
        await doRenderToStream(input, context, (chunk) => {
          controller.enqueue(chunk)
        })
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
```

## 管道输出

对于需要直接写入 HTTP 响应的场景，Vue 提供了 pipe 函数。

```typescript
import { ServerResponse } from 'http'

/**
 * 管道输出到 HTTP 响应
 */
export async function pipeToNodeWritable(
  input: App | VNode,
  context: SSRContext = {},
  writable: ServerResponse
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = renderToNodeStream(input, context)
    
    stream.on('error', reject)
    stream.on('end', resolve)
    
    stream.pipe(writable)
  })
}
```

## 错误处理

流式渲染中的错误处理需要特别注意，因为一旦开始发送数据就无法回退。

```typescript
/**
 * 带错误边界的流式渲染
 */
export function renderToStreamWithErrorBoundary(
  input: App | VNode,
  context: SSRContext = {},
  onError?: (error: Error) => string
): Readable {
  const stream = new Readable({
    read() {}
  })
  
  Promise.resolve().then(async () => {
    try {
      await doRenderToStream(input, context, (chunk) => {
        stream.push(chunk)
      })
      stream.push(null)
    } catch (error) {
      if (onError) {
        // 输出错误回退内容
        const fallback = onError(error as Error)
        stream.push(fallback)
        stream.push(null)
      } else {
        stream.destroy(error as Error)
      }
    }
  })
  
  return stream
}

// 使用示例
const stream = renderToStreamWithErrorBoundary(
  app,
  context,
  (error) => `<div class="error">渲染出错：${escapeHtml(error.message)}</div>`
)
```

## 小结

本章分析了 Vue SSR 流式渲染的入口：

1. **Node.js 流**：使用 Readable 输出
2. **Web Streams**：支持边缘运行时
3. **分块策略**：控制缓冲区大小
4. **管道输出**：直接写入 HTTP 响应
5. **错误处理**：提供回退机制

流式渲染是优化大型页面 SSR 性能的关键技术。
