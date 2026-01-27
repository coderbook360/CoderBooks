# renderToStream 实现

流式渲染是 SSR 性能优化的关键技术。它允许在渲染完成前就开始发送 HTML，提升首字节时间（TTFB）和感知性能。

## 为什么需要流式渲染

传统 `renderToString` 的问题：

1. 必须等待完整渲染才能响应
2. 大页面占用大量内存
3. 用户等待时间长

流式渲染的优势：

1. 边渲染边发送
2. 内存占用稳定
3. 更快的首屏内容

## 基础实现

```typescript
// src/server/stream.ts

import { VNode, VNodeType, Text, Fragment, Component } from '../shared/vnode'
import { Readable } from 'stream'

export function renderToStream(vnode: VNode): Readable {
  const stream = new Readable({
    read() {}  // 使用 push 模式
  })
  
  // 异步渲染
  renderAsync(vnode, stream).then(() => {
    stream.push(null)  // 结束流
  }).catch(err => {
    stream.destroy(err)
  })
  
  return stream
}

async function renderAsync(
  vnode: VNode, 
  stream: Readable
): Promise<void> {
  const html = renderVNodeChunk(vnode)
  stream.push(html)
}
```

## 分块渲染

更精细的分块控制：

```typescript
interface RenderContext {
  stream: Readable
  depth: number
  maxDepth: number
}

async function renderVNodeStreaming(
  vnode: VNode,
  ctx: RenderContext
): Promise<void> {
  const { stream, depth, maxDepth } = ctx
  
  // 文本节点
  if (vnode.shapeFlag & VNodeType.TEXT) {
    stream.push(escapeHtml(vnode.children as string))
    return
  }
  
  // Fragment
  if (vnode.shapeFlag & VNodeType.FRAGMENT) {
    const children = vnode.children as VNode[]
    for (const child of children) {
      await renderVNodeStreaming(child, ctx)
    }
    return
  }
  
  // 组件
  if (vnode.shapeFlag & VNodeType.COMPONENT) {
    const subTree = renderComponent(vnode)
    await renderVNodeStreaming(subTree, ctx)
    return
  }
  
  // 元素
  if (vnode.shapeFlag & VNodeType.ELEMENT) {
    const tag = vnode.type as string
    
    // 开标签
    stream.push(`<${tag}${renderProps(vnode.props)}>`)
    
    // 自闭合标签
    if (VOID_TAGS.has(tag)) {
      return
    }
    
    // 子节点
    if (vnode.children) {
      if (typeof vnode.children === 'string') {
        stream.push(escapeHtml(vnode.children))
      } else if (Array.isArray(vnode.children)) {
        // 在一定深度后让出事件循环
        if (depth >= maxDepth) {
          await yieldToEventLoop()
        }
        
        for (const child of vnode.children) {
          await renderVNodeStreaming(child, {
            ...ctx,
            depth: depth + 1
          })
        }
      }
    }
    
    // 闭标签
    stream.push(`</${tag}>`)
  }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}
```

## Web Streams 实现

支持 Web Streams API：

```typescript
export function renderToWebStream(vnode: VNode): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        await renderToController(vnode, controller, encoder)
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    }
  })
}

async function renderToController(
  vnode: VNode,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): Promise<void> {
  const html = renderVNode(vnode)
  controller.enqueue(encoder.encode(html))
}
```

## 简化的回调模式

```typescript
interface StreamCallbacks {
  push: (chunk: string) => boolean
  destroy: (error?: Error) => void
}

export function renderToSimpleStream(
  vnode: VNode,
  callbacks: StreamCallbacks
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await renderWithCallbacks(vnode, callbacks)
      resolve()
    } catch (err) {
      callbacks.destroy(err as Error)
      reject(err)
    }
  })
}

async function renderWithCallbacks(
  vnode: VNode,
  callbacks: StreamCallbacks
): Promise<void> {
  const html = renderVNode(vnode)
  
  // 分块发送
  const chunkSize = 16384  // 16KB
  
  for (let i = 0; i < html.length; i += chunkSize) {
    const chunk = html.slice(i, i + chunkSize)
    const canContinue = callbacks.push(chunk)
    
    if (!canContinue) {
      // 背压处理
      await new Promise(resolve => setImmediate(resolve))
    }
  }
}
```

## 真正的逐节点流式

```typescript
class StreamRenderer {
  private stream: Readable
  private buffer: string = ''
  private bufferSize: number = 4096  // 4KB
  
  constructor(stream: Readable) {
    this.stream = stream
  }
  
  private write(chunk: string): void {
    this.buffer += chunk
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush()
    }
  }
  
  private flush(): void {
    if (this.buffer) {
      this.stream.push(this.buffer)
      this.buffer = ''
    }
  }
  
  async render(vnode: VNode): Promise<void> {
    await this.renderNode(vnode)
    this.flush()
  }
  
  private async renderNode(vnode: VNode): Promise<void> {
    // 文本
    if (vnode.shapeFlag & VNodeType.TEXT) {
      this.write(escapeHtml(vnode.children as string))
      return
    }
    
    // Fragment
    if (vnode.shapeFlag & VNodeType.FRAGMENT) {
      for (const child of vnode.children as VNode[]) {
        await this.renderNode(child)
      }
      return
    }
    
    // 组件
    if (vnode.shapeFlag & VNodeType.COMPONENT) {
      const subTree = this.renderComponent(vnode)
      await this.renderNode(subTree)
      return
    }
    
    // 元素
    if (vnode.shapeFlag & VNodeType.ELEMENT) {
      await this.renderElement(vnode)
    }
  }
  
  private async renderElement(vnode: VNode): Promise<void> {
    const tag = vnode.type as string
    
    // 开标签
    this.write(`<${tag}`)
    this.write(renderProps(vnode.props))
    this.write('>')
    
    // 自闭合
    if (VOID_TAGS.has(tag)) {
      return
    }
    
    // innerHTML
    if (vnode.props?.innerHTML) {
      this.write(vnode.props.innerHTML)
    } else if (vnode.children) {
      // 子节点
      if (typeof vnode.children === 'string') {
        this.write(escapeHtml(vnode.children))
      } else {
        for (const child of vnode.children as VNode[]) {
          await this.renderNode(child)
          
          // 定期让出事件循环
          await yieldToEventLoop()
        }
      }
    }
    
    // 闭标签
    this.write(`</${tag}>`)
  }
  
  private renderComponent(vnode: VNode): VNode {
    const comp = vnode.type as Component
    const props = vnode.props || {}
    
    const context = {
      slots: { default: () => vnode.children as VNode[] || [] },
      emit: () => {}
    }
    
    if (comp.setup) {
      const result = comp.setup(props)
      return typeof result === 'function' ? result() : comp.render(props, context)
    }
    
    return comp.render(props, context)
  }
}

export function renderToStreamAdvanced(vnode: VNode): Readable {
  const stream = new Readable({ read() {} })
  
  const renderer = new StreamRenderer(stream)
  
  renderer.render(vnode).then(() => {
    stream.push(null)
  }).catch(err => {
    stream.destroy(err)
  })
  
  return stream
}
```

## HTTP 集成

```typescript
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { h } from '../shared/h'

const App = {
  render() {
    return h('html', null, [
      h('head', null, [
        h('title', null, 'SSR App')
      ]),
      h('body', null, [
        h('div', { id: 'app' }, [
          h('h1', null, 'Hello SSR'),
          h('p', null, 'Streaming!')
        ])
      ])
    ])
  }
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  
  const stream = renderToStream(h(App, null, null))
  
  // 发送 DOCTYPE（不是 VNode 的一部分）
  res.write('<!DOCTYPE html>')
  
  // 管道流式内容
  stream.pipe(res)
  
  stream.on('error', (err) => {
    console.error('Render error:', err)
    res.end('Server Error')
  })
})

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
```

## 背压处理

```typescript
class BackpressureRenderer {
  private stream: Readable
  private paused: boolean = false
  private resumeCallback: (() => void) | null = null
  
  constructor(stream: Readable) {
    this.stream = stream
    
    // 监听 drain 事件
    stream.on('drain', () => {
      this.paused = false
      if (this.resumeCallback) {
        this.resumeCallback()
        this.resumeCallback = null
      }
    })
  }
  
  private async write(chunk: string): Promise<void> {
    const canContinue = this.stream.push(chunk)
    
    if (!canContinue) {
      this.paused = true
      await this.waitForDrain()
    }
  }
  
  private waitForDrain(): Promise<void> {
    return new Promise(resolve => {
      this.resumeCallback = resolve
    })
  }
  
  // ... 其他渲染方法使用 this.write
}
```

## 错误处理

```typescript
export function renderToStreamSafe(vnode: VNode): Readable {
  const stream = new Readable({ read() {} })
  
  const render = async () => {
    try {
      const html = renderVNode(vnode)
      stream.push(html)
      stream.push(null)
    } catch (err) {
      // 发送错误页面
      stream.push('<div class="error">Render Error</div>')
      stream.push(null)
      
      // 记录错误
      console.error('SSR Error:', err)
    }
  }
  
  render()
  
  return stream
}
```

## 使用示例

```typescript
import { createServer } from 'http'
import { renderToStream } from './stream'
import { h } from '../shared/h'

// 大型页面组件
const LargePage = {
  render() {
    const items = Array.from({ length: 1000 }, (_, i) => 
      h('div', { class: 'item' }, `Item ${i + 1}`)
    )
    
    return h('div', { class: 'container' }, items)
  }
}

// 服务器
createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.write('<!DOCTYPE html><html><body>')
  
  const stream = renderToStream(h(LargePage, null, null))
  
  stream.on('data', chunk => {
    res.write(chunk)
  })
  
  stream.on('end', () => {
    res.end('</body></html>')
  })
  
}).listen(3000)
```

## 小结

流式渲染的关键点：

1. **分块输出**：边渲染边发送
2. **背压处理**：响应客户端接收速度
3. **事件循环**：定期让出，保持响应性
4. **错误处理**：优雅处理渲染错误
5. **内存控制**：使用缓冲区管理内存

流式渲染显著提升了大型页面的用户体验。
