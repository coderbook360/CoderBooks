# renderToNodeStream Node 流

本章深入分析 Vue SSR 中 Node.js 流的实现。

## Node.js Readable 流

Vue 的 `renderToNodeStream` 返回一个 Node.js Readable 流，可以直接 pipe 到 HTTP 响应。

```typescript
// packages/server-renderer/src/renderToStream.ts

import { Readable } from 'stream'

export function renderToNodeStream(
  input: App | VNode,
  context: SSRContext = {}
): Readable {
  const { promise, push, destroy } = createPushStream()
  
  // 创建 Readable 流
  const stream = new Readable({
    read() {
      // 空实现，数据由 push 主动推送
    },
    destroy(error, callback) {
      destroy(error || undefined)
      callback(error)
    }
  })
  
  // 异步执行渲染
  promise
    .then(() => {
      stream.push(null) // 信号流结束
    })
    .catch((error) => {
      stream.destroy(error)
    })
  
  // 设置 push 函数将数据推入流
  const originalPush = push
  push = (chunk: string | null) => {
    if (chunk !== null) {
      stream.push(chunk)
    }
    originalPush(chunk)
  }
  
  // 开始渲染
  renderToSimpleStream(input, context, {
    push,
    destroy
  })
  
  return stream
}
```

## 背压处理

当下游消费者处理速度跟不上生产速度时，会产生背压。正确处理背压对于内存效率至关重要。

```typescript
/**
 * 带背压处理的流式渲染
 */
export function renderToNodeStreamWithBackpressure(
  input: App | VNode,
  context: SSRContext = {}
): Readable {
  let isPaused = false
  let pendingChunks: string[] = []
  let resolveWait: (() => void) | null = null
  
  const stream = new Readable({
    read() {
      // 当消费者准备好接收更多数据时调用
      if (isPaused) {
        isPaused = false
        
        // 发送积压的数据
        while (pendingChunks.length > 0 && !isPaused) {
          const chunk = pendingChunks.shift()!
          if (!stream.push(chunk)) {
            isPaused = true
          }
        }
        
        // 恢复渲染
        if (resolveWait) {
          resolveWait()
          resolveWait = null
        }
      }
    }
  })
  
  const push = async (chunk: string) => {
    if (isPaused) {
      // 暂停状态，等待恢复
      pendingChunks.push(chunk)
      await new Promise<void>(resolve => {
        resolveWait = resolve
      })
    } else {
      // 尝试推送
      if (!stream.push(chunk)) {
        // 返回 false 表示需要暂停
        isPaused = true
        pendingChunks.push(chunk)
      }
    }
  }
  
  // 开始渲染
  doRenderToStreamAsync(input, context, push)
    .then(() => {
      // 发送剩余数据
      for (const chunk of pendingChunks) {
        stream.push(chunk)
      }
      stream.push(null)
    })
    .catch((error) => {
      stream.destroy(error)
    })
  
  return stream
}
```

## 高水位线配置

Node.js 流支持配置 highWaterMark 来控制缓冲行为。

```typescript
interface NodeStreamOptions {
  /**
   * 高水位线（字节）
   * 超过此值时 push 返回 false
   */
  highWaterMark?: number
}

export function renderToNodeStreamWithOptions(
  input: App | VNode,
  context: SSRContext = {},
  options: NodeStreamOptions = {}
): Readable {
  const highWaterMark = options.highWaterMark ?? 16384 // 默认 16KB
  
  const stream = new Readable({
    highWaterMark,
    read() {}
  })
  
  // ... 渲染逻辑
  
  return stream
}
```

## 与 HTTP 集成

在实际应用中，流通常直接 pipe 到 HTTP 响应。

```typescript
import { createServer, IncomingMessage, ServerResponse } from 'http'

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // 创建应用实例
  const app = createSSRApp(App)
  const context: SSRContext = {}
  
  // 设置响应头
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  
  try {
    // 获取流
    const stream = renderToNodeStream(app, context)
    
    // 发送 HTML 开头
    res.write('<!DOCTYPE html><html><head>')
    res.write('<title>SSR App</title>')
    res.write('</head><body>')
    
    // pipe 渲染内容
    stream.pipe(res, { end: false })
    
    stream.on('end', () => {
      // 添加脚本和关闭标签
      res.write('<script src="/client.js"></script>')
      res.write('</body></html>')
      res.end()
    })
    
    stream.on('error', (error) => {
      console.error('Stream error:', error)
      res.statusCode = 500
      res.end('Internal Server Error')
    })
  } catch (error) {
    console.error('Render error:', error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(3000)
```

## Transform 流处理

有时需要在渲染输出中间进行转换，这时可以使用 Transform 流。

```typescript
import { Transform } from 'stream'

/**
 * 创建 HTML 压缩 Transform 流
 */
function createMinifyTransform(): Transform {
  return new Transform({
    transform(chunk, encoding, callback) {
      // 简单的空白压缩
      const minified = chunk
        .toString()
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
      
      callback(null, minified)
    }
  })
}

// 使用
const stream = renderToNodeStream(app, context)
const minifyStream = createMinifyTransform()

stream.pipe(minifyStream).pipe(res)
```

## 小结

本章分析了 Vue SSR 的 Node.js 流实现：

1. **Readable 流**：返回可直接使用的流对象
2. **背压处理**：正确处理消费者速度差异
3. **高水位线**：控制内存使用
4. **HTTP 集成**：与服务器框架协作
5. **Transform 流**：支持中间处理

理解 Node.js 流机制有助于构建高性能的 SSR 服务。
