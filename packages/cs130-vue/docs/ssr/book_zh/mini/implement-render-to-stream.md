# 实现流式渲染

本章实现 renderToStream，将 VNode 渲染为 Node.js 可读流，实现边渲染边输出。

## 流式渲染架构

流式渲染的核心是将渲染过程分成多个小块，每完成一块就输出，而不是等全部完成。

```typescript
// src/server/render-stream.ts

import { Readable, ReadableOptions } from 'stream'
import { VNode, SSRContext, createSSRContext } from '../shared'

/**
 * 将 VNode 渲染为可读流
 */
export function renderToStream(
  vnode: VNode,
  context?: SSRContext
): Readable {
  const ctx = context || createSSRContext()
  
  return new SSRReadableStream(vnode, ctx)
}

/**
 * SSR 可读流
 */
class SSRReadableStream extends Readable {
  private vnode: VNode
  private context: SSRContext
  private buffer: string = ''
  private finished: boolean = false
  private iterator: AsyncGenerator<string> | null = null
  
  constructor(vnode: VNode, context: SSRContext, options?: ReadableOptions) {
    super({
      ...options,
      encoding: 'utf-8'
    })
    
    this.vnode = vnode
    this.context = context
  }
  
  async _read(size: number): Promise<void> {
    try {
      // 初始化迭代器
      if (!this.iterator) {
        this.iterator = this.renderAsync()
      }
      
      // 填充缓冲区
      while (this.buffer.length < size && !this.finished) {
        const { value, done } = await this.iterator.next()
        
        if (done) {
          this.finished = true
          break
        }
        
        if (value) {
          this.buffer += value
        }
      }
      
      // 输出缓冲区内容
      if (this.buffer.length > 0) {
        const chunk = this.buffer.slice(0, size)
        this.buffer = this.buffer.slice(size)
        this.push(chunk)
      }
      
      // 结束流
      if (this.finished && this.buffer.length === 0) {
        this.push(null)
      }
    } catch (error) {
      this.destroy(error as Error)
    }
  }
  
  /**
   * 异步渲染生成器
   */
  private async *renderAsync(): AsyncGenerator<string> {
    yield* this.renderVNodeStream(this.vnode)
  }
  
  /**
   * 流式渲染 VNode
   */
  private async *renderVNodeStream(vnode: VNode): AsyncGenerator<string> {
    // 根据类型分发
    const { type, shapeFlag } = vnode
    
    if (type === Text) {
      yield escapeHtml(String(vnode.children))
      return
    }
    
    if (type === Comment) {
      yield `<!--${escapeHtmlComment(String(vnode.children))}-->`
      return
    }
    
    if (type === Fragment) {
      yield* this.renderChildrenStream(vnode.children)
      return
    }
    
    if (shapeFlag & ShapeFlags.ELEMENT) {
      yield* this.renderElementStream(vnode)
      return
    }
    
    if (shapeFlag & ShapeFlags.COMPONENT) {
      yield* this.renderComponentStream(vnode)
      return
    }
  }
}
```

## 流式元素渲染

```typescript
/**
 * 流式渲染元素
 */
private async *renderElementStream(vnode: VNode): AsyncGenerator<string> {
  const tag = vnode.type as string
  const { props, children } = vnode
  
  // 开始标签
  let openTag = `<${tag}`
  
  // 渲染属性
  if (props) {
    openTag += renderAttrs(props, tag)
  }
  
  // 自闭合标签
  if (VOID_TAGS.has(tag)) {
    yield openTag + '>'
    return
  }
  
  yield openTag + '>'
  
  // 流式渲染子节点
  if (children != null) {
    if (RAW_TEXT_TAGS.has(tag)) {
      // 原始文本标签
      yield String(children)
    } else {
      // 正常子节点
      yield* this.renderChildrenStream(children)
    }
  }
  
  // 结束标签
  yield `</${tag}>`
}

/**
 * 流式渲染子节点
 */
private async *renderChildrenStream(children: any): AsyncGenerator<string> {
  if (children == null) return
  
  if (typeof children === 'string') {
    yield escapeHtml(children)
    return
  }
  
  if (typeof children === 'number') {
    yield escapeHtml(String(children))
    return
  }
  
  if (Array.isArray(children)) {
    for (const child of children) {
      yield* this.renderChildrenStream(child)
    }
    return
  }
  
  if (isVNode(children)) {
    yield* this.renderVNodeStream(children)
  }
}
```

## 流式组件渲染

```typescript
/**
 * 流式渲染组件
 */
private async *renderComponentStream(vnode: VNode): AsyncGenerator<string> {
  const Component = vnode.type as any
  
  // 函数组件
  if (typeof Component === 'function' && !Component.prototype?.render) {
    yield* this.renderFunctionalComponentStream(vnode)
    return
  }
  
  // 有状态组件
  yield* this.renderStatefulComponentStream(vnode)
}

/**
 * 流式渲染函数组件
 */
private async *renderFunctionalComponentStream(
  vnode: VNode
): AsyncGenerator<string> {
  const Component = vnode.type as Function
  const props = vnode.props || {}
  const slots = normalizeSlots(vnode.children)
  
  try {
    const result = Component(props, { slots, attrs: {}, emit: () => {} })
    
    if (result == null) return
    
    const subTree = result instanceof Promise ? await result : result
    
    yield* this.renderVNodeStream(subTree)
  } catch (error) {
    this.context.errors.push(error as Error)
  }
}

/**
 * 流式渲染有状态组件
 */
private async *renderStatefulComponentStream(
  vnode: VNode
): AsyncGenerator<string> {
  const Component = vnode.type as any
  
  // 创建实例
  const instance = createComponentInstance(vnode)
  setCurrentInstance(instance)
  
  try {
    // 初始化
    initProps(instance, Component, vnode.props)
    initSlots(instance, vnode.children)
    
    // 执行 setup
    await setupComponent(instance, Component)
    
    // serverPrefetch
    if (Component.serverPrefetch) {
      await Component.serverPrefetch.call(instance.proxy)
    }
    
    // 获取 render
    const render = instance.render || Component.render
    if (!render) return
    
    // 渲染子树
    const subTree = render.call(instance.proxy)
    if (!subTree) return
    
    yield* this.renderVNodeStream(subTree)
  } catch (error) {
    this.context.errors.push(error as Error)
  } finally {
    setCurrentInstance(null)
  }
}
```

## 分块输出

```typescript
/**
 * 分块渲染配置
 */
interface ChunkOptions {
  minChunkSize: number      // 最小块大小
  maxWaitTime: number       // 最大等待时间
  onChunk?: (chunk: string) => void
}

/**
 * 带分块的流式渲染
 */
export function renderToChunkedStream(
  vnode: VNode,
  options: ChunkOptions = { minChunkSize: 1024, maxWaitTime: 10 }
): Readable {
  const context = createSSRContext()
  
  return new ChunkedSSRStream(vnode, context, options)
}

class ChunkedSSRStream extends SSRReadableStream {
  private chunkBuffer: string = ''
  private lastFlush: number = Date.now()
  private options: ChunkOptions
  
  constructor(vnode: VNode, context: SSRContext, options: ChunkOptions) {
    super(vnode, context)
    this.options = options
  }
  
  protected shouldFlush(): boolean {
    const { minChunkSize, maxWaitTime } = this.options
    const elapsed = Date.now() - this.lastFlush
    
    return (
      this.chunkBuffer.length >= minChunkSize ||
      elapsed >= maxWaitTime
    )
  }
  
  protected flush(): string | null {
    if (this.chunkBuffer.length === 0) return null
    
    const chunk = this.chunkBuffer
    this.chunkBuffer = ''
    this.lastFlush = Date.now()
    
    if (this.options.onChunk) {
      this.options.onChunk(chunk)
    }
    
    return chunk
  }
}
```

## Suspense 流式支持

```typescript
/**
 * Suspense 边界标记
 */
interface SuspenseBoundary {
  id: string
  content: string
  resolved: boolean
}

/**
 * 流式渲染 Suspense
 */
private async *renderSuspenseStream(
  vnode: VNode
): AsyncGenerator<string> {
  const { props, children } = vnode
  
  // 生成边界 ID
  const boundaryId = `s-${suspenseId++}`
  
  // 获取插槽
  const slots = normalizeSlots(children)
  const defaultSlot = slots.default
  const fallbackSlot = slots.fallback
  
  // 标记边界开始
  yield `<!--suspense-start:${boundaryId}-->`
  
  // 尝试渲染默认内容
  try {
    // 先输出 fallback
    if (fallbackSlot) {
      yield `<template id="${boundaryId}-fallback">`
      for await (const chunk of this.renderSlotsStream(fallbackSlot)) {
        yield chunk
      }
      yield `</template>`
    }
    
    // 渲染实际内容
    yield `<template id="${boundaryId}-content">`
    if (defaultSlot) {
      for await (const chunk of this.renderSlotsStream(defaultSlot)) {
        yield chunk
      }
    }
    yield `</template>`
    
    // 输出替换脚本
    yield `<script>__$SSR_RESOLVE__("${boundaryId}")</script>`
  } catch (error) {
    // 错误时保持 fallback
    this.context.errors.push(error as Error)
  }
  
  yield `<!--suspense-end:${boundaryId}-->`
}

let suspenseId = 0
```

## 渐进式激活标记

```typescript
/**
 * 添加激活标记
 */
private async *renderWithHydrationMarkers(
  vnode: VNode
): AsyncGenerator<string> {
  const { type, shapeFlag } = vnode
  
  // 组件边界标记
  if (shapeFlag & ShapeFlags.COMPONENT) {
    const Component = type as any
    const id = `c-${componentId++}`
    
    // 开始标记
    yield `<!--[-->`
    
    // 渲染组件
    yield* this.renderComponentStream(vnode)
    
    // 结束标记
    yield `<!--]-->`
    
    return
  }
  
  // 普通渲染
  yield* this.renderVNodeStream(vnode)
}

let componentId = 0
```

## Web Streams API 支持

```typescript
/**
 * 渲染为 Web ReadableStream
 */
export function renderToWebStream(
  vnode: VNode,
  context?: SSRContext
): ReadableStream<string> {
  const ctx = context || createSSRContext()
  
  return new ReadableStream<string>({
    async start(controller) {
      try {
        const generator = renderVNodeAsync(vnode, ctx)
        
        for await (const chunk of generator) {
          controller.enqueue(chunk)
        }
        
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

/**
 * 渲染为 Response（用于 Edge Runtime）
 */
export function renderToResponse(
  vnode: VNode,
  context?: SSRContext
): Response {
  const stream = renderToWebStream(vnode, context)
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  })
}
```

## 使用示例

```typescript
// 基本流式渲染
import { createServer } from 'http'

const server = createServer((req, res) => {
  const vnode = h('div', null, [
    h('h1', null, 'Hello SSR'),
    h('p', null, 'This is streaming!')
  ])
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.write('<!DOCTYPE html><html><body>')
  
  const stream = renderToStream(vnode)
  
  stream.on('data', chunk => {
    res.write(chunk)
  })
  
  stream.on('end', () => {
    res.end('</body></html>')
  })
  
  stream.on('error', err => {
    console.error('Stream error:', err)
    res.end('<!-- Error --></body></html>')
  })
})

// 使用 pipe
const server2 = createServer((req, res) => {
  const vnode = h(App, { url: req.url })
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.write('<!DOCTYPE html><html><body>')
  
  const stream = renderToStream(vnode)
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    res.end('</body></html>')
  })
})

// Edge Runtime
export default {
  async fetch(request: Request) {
    const vnode = h(App, { url: request.url })
    return renderToResponse(vnode)
  }
}
```

## 小结

本章实现了流式渲染：

1. **基础流**：实现 Node.js Readable 流
2. **生成器模式**：使用 async generator 控制渲染
3. **元素流式**：增量输出开始标签、内容、结束标签
4. **组件流式**：异步组件的流式处理
5. **分块输出**：可配置的块大小和刷新时机
6. **Suspense 支持**：异步边界的流式处理
7. **Web Streams**：支持现代 Web API

流式渲染大幅提升了首字节时间（TTFB），是大型应用的必备特性。
