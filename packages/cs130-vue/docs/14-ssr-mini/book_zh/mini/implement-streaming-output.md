# 实现流式输出

本章深入流式输出的高级特性，包括输出缓冲、背压处理、以及与 HTTP 响应的集成。

## 输出缓冲策略

合理的缓冲策略可以平衡吞吐量和延迟。

```typescript
// src/server/stream-buffer.ts

/**
 * 缓冲区管理器
 */
export class StreamBuffer {
  private chunks: string[] = []
  private totalSize: number = 0
  private highWaterMark: number
  private lowWaterMark: number
  
  constructor(options: BufferOptions = {}) {
    this.highWaterMark = options.highWaterMark || 16 * 1024  // 16KB
    this.lowWaterMark = options.lowWaterMark || 4 * 1024    // 4KB
  }
  
  /**
   * 写入数据
   */
  write(chunk: string): boolean {
    this.chunks.push(chunk)
    this.totalSize += chunk.length
    
    // 返回是否需要暂停写入
    return this.totalSize < this.highWaterMark
  }
  
  /**
   * 读取数据
   */
  read(): string | null {
    if (this.chunks.length === 0) return null
    
    const result = this.chunks.join('')
    this.chunks = []
    this.totalSize = 0
    
    return result
  }
  
  /**
   * 是否可以继续写入
   */
  canWrite(): boolean {
    return this.totalSize < this.highWaterMark
  }
  
  /**
   * 是否应该刷新
   */
  shouldFlush(): boolean {
    return this.totalSize >= this.lowWaterMark
  }
  
  /**
   * 获取当前大小
   */
  get size(): number {
    return this.totalSize
  }
  
  /**
   * 是否为空
   */
  get isEmpty(): boolean {
    return this.chunks.length === 0
  }
}

interface BufferOptions {
  highWaterMark?: number
  lowWaterMark?: number
}
```

## 背压处理

当下游消费速度跟不上生产速度时，需要暂停渲染。

```typescript
/**
 * 带背压支持的渲染流
 */
export class BackpressureAwareStream extends Readable {
  private vnode: VNode
  private context: SSRContext
  private generator: AsyncGenerator<string> | null = null
  private paused: boolean = false
  private buffer: StreamBuffer
  
  constructor(vnode: VNode, context: SSRContext) {
    super({ encoding: 'utf-8' })
    this.vnode = vnode
    this.context = context
    this.buffer = new StreamBuffer()
  }
  
  async _read(): Promise<void> {
    // 如果暂停了，恢复
    if (this.paused) {
      this.paused = false
      this.resume()
    }
    
    // 初始化生成器
    if (!this.generator) {
      this.generator = this.renderAsync()
      this.startRendering()
    }
    
    // 从缓冲区读取
    this.flushBuffer()
  }
  
  private async startRendering(): Promise<void> {
    try {
      for await (const chunk of this.generator!) {
        // 写入缓冲区
        const canContinue = this.buffer.write(chunk)
        
        // 缓冲区满了，暂停渲染
        if (!canContinue) {
          this.paused = true
          await this.waitForDrain()
        }
        
        // 定期刷新
        if (this.buffer.shouldFlush()) {
          this.flushBuffer()
        }
      }
      
      // 渲染完成，刷新剩余内容
      this.flushBuffer()
      this.push(null)
    } catch (error) {
      this.destroy(error as Error)
    }
  }
  
  private flushBuffer(): void {
    const data = this.buffer.read()
    if (data) {
      this.push(data)
    }
  }
  
  private waitForDrain(): Promise<void> {
    return new Promise(resolve => {
      this.once('drain', resolve)
    })
  }
}
```

## 分块编码

HTTP 分块传输编码需要特殊格式。

```typescript
/**
 * 分块编码流
 */
export class ChunkedEncodingStream extends Transform {
  constructor() {
    super({ encoding: 'utf-8' })
  }
  
  _transform(
    chunk: Buffer | string,
    encoding: string,
    callback: TransformCallback
  ): void {
    const data = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
    
    // 跳过空块
    if (data.length === 0) {
      callback()
      return
    }
    
    // 分块格式: 长度(16进制)\r\n内容\r\n
    const hex = data.length.toString(16)
    this.push(`${hex}\r\n${data}\r\n`)
    
    callback()
  }
  
  _flush(callback: TransformCallback): void {
    // 结束块
    this.push('0\r\n\r\n')
    callback()
  }
}

/**
 * 创建分块编码的渲染流
 */
export function renderToChunkedResponse(
  vnode: VNode,
  context?: SSRContext
): Readable {
  const ctx = context || createSSRContext()
  const renderStream = renderToStream(vnode, ctx)
  const chunkedStream = new ChunkedEncodingStream()
  
  return renderStream.pipe(chunkedStream)
}
```

## 优先级输出

关键内容应该优先输出。

```typescript
/**
 * 优先级队列
 */
class PriorityQueue<T> {
  private queues: Map<number, T[]> = new Map()
  private priorities: number[] = []
  
  enqueue(item: T, priority: number = 0): void {
    if (!this.queues.has(priority)) {
      this.queues.set(priority, [])
      this.priorities.push(priority)
      this.priorities.sort((a, b) => b - a)  // 高优先级在前
    }
    
    this.queues.get(priority)!.push(item)
  }
  
  dequeue(): T | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)
      if (queue && queue.length > 0) {
        return queue.shift()
      }
    }
    return undefined
  }
  
  isEmpty(): boolean {
    return this.priorities.every(p => {
      const queue = this.queues.get(p)
      return !queue || queue.length === 0
    })
  }
}

/**
 * 优先级感知的渲染流
 */
export class PriorityRenderStream extends Readable {
  private queue: PriorityQueue<string> = new PriorityQueue()
  
  /**
   * 高优先级输出（如关键 CSS）
   */
  pushCritical(chunk: string): void {
    this.queue.enqueue(chunk, 10)
    this.emitIfReady()
  }
  
  /**
   * 正常优先级输出
   */
  pushNormal(chunk: string): void {
    this.queue.enqueue(chunk, 5)
    this.emitIfReady()
  }
  
  /**
   * 低优先级输出（如预加载提示）
   */
  pushLow(chunk: string): void {
    this.queue.enqueue(chunk, 1)
    this.emitIfReady()
  }
  
  private emitIfReady(): void {
    while (!this.queue.isEmpty()) {
      const chunk = this.queue.dequeue()
      if (chunk) {
        this.push(chunk)
      }
    }
  }
}
```

## 渐进式 HTML 输出

```typescript
/**
 * 渐进式 HTML 流
 */
export function createProgressiveStream(
  vnode: VNode,
  options: ProgressiveOptions = {}
): Readable {
  const {
    head = '',
    tail = '',
    injectHead = true,
    injectScripts = true
  } = options
  
  const context = createSSRContext()
  const readable = new Readable({ read() {} })
  
  // 输出 HTML 头部
  readable.push('<!DOCTYPE html><html><head>')
  readable.push(head)
  
  // 开始渲染
  ;(async () => {
    try {
      // 渲染主体
      readable.push('</head><body>')
      
      const stream = renderToStream(vnode, context)
      
      for await (const chunk of streamToAsyncIterator(stream)) {
        readable.push(chunk)
      }
      
      // 注入收集到的资源
      if (injectHead && context.head.length > 0) {
        readable.push(`<script>__$SSR_HEAD__(${JSON.stringify(context.head)})</script>`)
      }
      
      // 注入状态
      if (Object.keys(context.state.data).length > 0) {
        readable.push(
          `<script>window.__SSR_STATE__=${serializeState(context.state)}</script>`
        )
      }
      
      // 注入脚本
      if (injectScripts && context.modules) {
        for (const mod of context.modules) {
          readable.push(`<link rel="modulepreload" href="${mod}">`)
        }
      }
      
      // 输出尾部
      readable.push(tail)
      readable.push('</body></html>')
      readable.push(null)
    } catch (error) {
      readable.destroy(error as Error)
    }
  })()
  
  return readable
}

interface ProgressiveOptions {
  head?: string
  tail?: string
  injectHead?: boolean
  injectScripts?: boolean
}

/**
 * 将 Node.js 流转换为异步迭代器
 */
async function* streamToAsyncIterator(
  stream: Readable
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    yield chunk.toString()
  }
}
```

## Early Hints 支持

```typescript
/**
 * 支持 HTTP 103 Early Hints
 */
export function renderWithEarlyHints(
  vnode: VNode,
  res: ServerResponse,
  hints: EarlyHint[]
): Readable {
  // 发送 103 Early Hints
  if (res.writeEarlyHints) {
    const links: string[] = hints.map(hint => {
      let link = `<${hint.href}>; rel=${hint.rel}`
      if (hint.as) link += `; as=${hint.as}`
      if (hint.crossorigin) link += `; crossorigin`
      return link
    })
    
    res.writeEarlyHints({
      link: links
    })
  }
  
  // 正常渲染
  const context = createSSRContext()
  return renderToStream(vnode, context)
}

interface EarlyHint {
  href: string
  rel: 'preload' | 'preconnect' | 'prefetch' | 'modulepreload'
  as?: 'script' | 'style' | 'font' | 'image'
  crossorigin?: boolean
}
```

## HTTP 集成

```typescript
/**
 * Express 中间件
 */
export function ssrMiddleware(
  createApp: (url: string) => VNode
): RequestHandler {
  return async (req, res, next) => {
    try {
      const vnode = createApp(req.url)
      const context = createSSRContext()
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Transfer-Encoding', 'chunked')
      
      // 流式输出
      const stream = renderToStream(vnode, context)
      
      res.write('<!DOCTYPE html>')
      
      stream.pipe(res, { end: false })
      
      stream.on('end', () => {
        res.end()
      })
      
      stream.on('error', (error) => {
        console.error('SSR Error:', error)
        if (!res.headersSent) {
          res.status(500).send('Server Error')
        } else {
          res.end('<!-- Error -->')
        }
      })
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Koa 中间件
 */
export function koaSSRMiddleware(
  createApp: (url: string) => VNode
): Middleware {
  return async (ctx, next) => {
    const vnode = createApp(ctx.url)
    const context = createSSRContext()
    
    ctx.type = 'html'
    ctx.body = renderToStream(vnode, context)
    
    await next()
  }
}
```

## 错误边界

```typescript
/**
 * 流式错误处理
 */
export class ErrorBoundaryStream extends Readable {
  private innerStream: Readable
  private errorHtml: string
  private hasError: boolean = false
  
  constructor(
    innerStream: Readable,
    errorHtml: string = '<!-- Render Error -->'
  ) {
    super()
    this.innerStream = innerStream
    this.errorHtml = errorHtml
    
    this.setup()
  }
  
  private setup(): void {
    this.innerStream.on('data', (chunk) => {
      if (!this.hasError) {
        this.push(chunk)
      }
    })
    
    this.innerStream.on('end', () => {
      if (!this.hasError) {
        this.push(null)
      }
    })
    
    this.innerStream.on('error', (error) => {
      this.hasError = true
      console.error('Stream error:', error)
      
      // 输出错误占位符
      this.push(this.errorHtml)
      this.push(null)
    })
  }
  
  _read(): void {
    // 由内部流驱动
  }
}

/**
 * 包装流以添加错误处理
 */
export function wrapWithErrorBoundary(
  stream: Readable,
  fallback: string
): Readable {
  return new ErrorBoundaryStream(stream, fallback)
}
```

## 使用示例

```typescript
import express from 'express'

const app = express()

// 使用中间件
app.use('/ssr', ssrMiddleware((url) => {
  return h(App, { url })
}))

// 手动控制
app.get('/manual', async (req, res) => {
  const vnode = h(App, { url: req.url })
  
  // 发送 Early Hints
  res.writeEarlyHints({
    link: [
      '</styles/main.css>; rel=preload; as=style',
      '</scripts/app.js>; rel=modulepreload'
    ]
  })
  
  // 设置响应头
  res.setHeader('Content-Type', 'text/html')
  
  // 输出 HTML 结构
  res.write('<!DOCTYPE html><html><head>')
  res.write('<link rel="stylesheet" href="/styles/main.css">')
  res.write('</head><body><div id="app">')
  
  // 流式渲染
  const stream = renderToStream(vnode)
  const safe = wrapWithErrorBoundary(stream, '<p>Error loading content</p>')
  
  safe.pipe(res, { end: false })
  
  safe.on('end', () => {
    res.write('</div>')
    res.write('<script type="module" src="/scripts/app.js"></script>')
    res.end('</body></html>')
  })
})

app.listen(3000)
```

## 小结

本章实现了流式输出的高级特性：

1. **缓冲管理**：高低水位线控制
2. **背压处理**：避免内存溢出
3. **分块编码**：HTTP 协议支持
4. **优先级输出**：关键内容优先
5. **渐进式 HTML**：完整的响应结构
6. **Early Hints**：提前通知浏览器
7. **错误边界**：优雅处理渲染错误

这些特性确保了流式渲染在生产环境中的稳定性和性能。
