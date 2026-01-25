# renderToWebStream Web 流

本章分析 Vue SSR 对 Web Streams API 的支持。

## Web Streams 概述

Web Streams API 是浏览器和现代运行时（如 Deno、Cloudflare Workers）的标准流接口。Vue 3.3+ 提供了原生支持。

```typescript
// packages/server-renderer/src/renderToStream.ts

export function renderToWebStream(
  input: App | VNode,
  context: SSRContext = {}
): ReadableStream<string> {
  // 渲染回调
  let onData: (chunk: string) => void
  let onEnd: () => void
  let onError: (error: Error) => void
  
  // 创建 Web ReadableStream
  const stream = new ReadableStream<string>({
    start(controller) {
      onData = (chunk: string) => {
        controller.enqueue(chunk)
      }
      
      onEnd = () => {
        controller.close()
      }
      
      onError = (error: Error) => {
        controller.error(error)
      }
    },
    
    cancel() {
      // 流被取消时的清理逻辑
    }
  })
  
  // 异步执行渲染
  renderToSimpleStream(input, context, {
    push: onData,
    destroy: onError
  })
    .then(onEnd)
    .catch(onError)
  
  return stream
}
```

## 与 Fetch API 集成

Web Streams 可以直接用作 Fetch Response 的 body。

```typescript
// 边缘函数示例（Cloudflare Workers）
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // 创建应用
    const app = createSSRApp(App)
    const context: SSRContext = {}
    
    // 获取 Web Stream
    const stream = renderToWebStream(app, context)
    
    // 创建 TransformStream 包装 HTML
    const { readable, writable } = new TransformStream()
    
    // 写入 HTML 模板
    const writer = writable.getWriter()
    const encoder = new TextEncoder()
    
    // 开始写入
    ;(async () => {
      try {
        // 写入 HTML 开头
        await writer.write(encoder.encode('<!DOCTYPE html><html><body>'))
        
        // 读取渲染流并写入
        const reader = stream.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await writer.write(encoder.encode(value))
        }
        
        // 写入 HTML 结尾
        await writer.write(encoder.encode('</body></html>'))
        await writer.close()
      } catch (error) {
        await writer.abort(error)
      }
    })()
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  }
}
```

## 编码转换

Web Streams 通常需要处理字符串到字节的转换。

```typescript
/**
 * 渲染为字节流
 */
export function renderToWebByteStream(
  input: App | VNode,
  context: SSRContext = {}
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const stringStream = renderToWebStream(input, context)
  
  // 转换为字节流
  return stringStream.pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(encoder.encode(chunk))
      }
    })
  )
}
```

## 分块控制

与 Node.js 流类似，Web Streams 也可以控制分块大小。

```typescript
interface WebStreamOptions {
  /**
   * 分块大小（字节）
   */
  chunkSize?: number
}

export function renderToWebStreamWithChunks(
  input: App | VNode,
  context: SSRContext = {},
  options: WebStreamOptions = {}
): ReadableStream<string> {
  const chunkSize = options.chunkSize ?? 8192
  let buffer = ''
  
  return new ReadableStream<string>({
    async start(controller) {
      try {
        await doRenderToStream(input, context, (chunk) => {
          buffer += chunk
          
          // 达到阈值时发送
          while (buffer.length >= chunkSize) {
            controller.enqueue(buffer.slice(0, chunkSize))
            buffer = buffer.slice(chunkSize)
          }
        })
        
        // 发送剩余内容
        if (buffer.length > 0) {
          controller.enqueue(buffer)
        }
        
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
```

## 取消处理

Web Streams 支持取消操作，需要正确处理。

```typescript
export function renderToWebStreamWithCancel(
  input: App | VNode,
  context: SSRContext = {}
): ReadableStream<string> {
  let isCancelled = false
  let cancelReason: any
  
  return new ReadableStream<string>({
    async start(controller) {
      try {
        await doRenderToStream(
          input,
          context,
          (chunk) => {
            if (isCancelled) {
              throw cancelReason || new Error('Stream cancelled')
            }
            controller.enqueue(chunk)
          }
        )
        
        if (!isCancelled) {
          controller.close()
        }
      } catch (error) {
        if (!isCancelled) {
          controller.error(error)
        }
      }
    },
    
    cancel(reason) {
      isCancelled = true
      cancelReason = reason
      // 可以在这里进行资源清理
    }
  })
}
```

## 多平台兼容

为了同时支持 Node.js 和 Web 环境，Vue 提供了统一的 API。

```typescript
/**
 * 通用流式渲染
 * 根据环境返回适当的流类型
 */
export function renderToStream(
  input: App | VNode,
  context: SSRContext = {}
): ReadableStream<string> | import('stream').Readable {
  // 检查是否有 Web Streams API
  if (typeof ReadableStream !== 'undefined') {
    return renderToWebStream(input, context)
  }
  
  // 回退到 Node.js 流
  const { Readable } = require('stream')
  return renderToNodeStream(input, context)
}
```

## 小结

本章分析了 Vue SSR 的 Web Streams 支持：

1. **ReadableStream**：标准 Web 流接口
2. **Fetch 集成**：直接用作 Response body
3. **编码转换**：字符串到字节流
4. **分块控制**：优化传输效率
5. **取消处理**：正确响应取消信号
6. **多平台兼容**：统一 API 设计

Web Streams 使 Vue SSR 能够在边缘运行时高效运行。
