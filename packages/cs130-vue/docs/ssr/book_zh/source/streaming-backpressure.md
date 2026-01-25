# 流式渲染背压处理

本章深入分析 SSR 流式渲染中的背压（Backpressure）处理机制。

## 背压问题

当生产者（渲染器）生成数据的速度超过消费者（网络传输）处理速度时，就会产生背压。如果不正确处理，会导致内存无限增长。

```typescript
// 问题示例：未处理背压
async function badRender(stream: Writable, app: App): Promise<void> {
  const result = await renderToString(app)
  
  // 一次性写入大量数据，可能导致内存问题
  stream.write(result) // 忽略了返回值
}
```

正确的做法是检查 `write()` 的返回值，并在返回 false 时等待 drain 事件。

## 背压感知渲染

```typescript
// packages/server-renderer/src/renderToStream.ts

/**
 * 背压感知的推送函数
 */
interface BackpressureAwarePush {
  (chunk: string): Promise<void>
  flush(): Promise<void>
}

function createBackpressureAwarePush(
  writable: NodeJS.WritableStream
): BackpressureAwarePush {
  let drainPromise: Promise<void> | null = null
  
  const push = async (chunk: string): Promise<void> => {
    // 等待之前的 drain
    if (drainPromise) {
      await drainPromise
      drainPromise = null
    }
    
    // 尝试写入
    const canContinue = writable.write(chunk)
    
    if (!canContinue) {
      // 需要等待 drain
      drainPromise = new Promise((resolve) => {
        writable.once('drain', resolve)
      })
    }
  }
  
  push.flush = async () => {
    if (drainPromise) {
      await drainPromise
    }
  }
  
  return push
}
```

## 在渲染中应用背压

将背压机制集成到渲染流程中需要修改渲染函数的签名。

```typescript
/**
 * 带背压处理的流式渲染
 */
export async function renderToStreamWithBackpressure(
  input: App | VNode,
  context: SSRContext,
  writable: NodeJS.WritableStream
): Promise<void> {
  const push = createBackpressureAwarePush(writable)
  
  // 渲染根节点
  await renderVNodeWithBackpressure(
    push,
    isVNode(input) ? input : createVNode(input._component),
    context
  )
  
  // 确保所有数据都已写入
  await push.flush()
}

/**
 * 渲染 VNode（支持背压）
 */
async function renderVNodeWithBackpressure(
  push: BackpressureAwarePush,
  vnode: VNode,
  context: SSRContext
): Promise<void> {
  const { type, props, children } = vnode
  
  if (typeof type === 'string') {
    // 元素节点
    await push(`<${type}`)
    
    // 渲染属性
    if (props) {
      const attrs = renderAttrs(props)
      if (attrs) {
        await push(attrs)
      }
    }
    
    // 自闭合标签
    if (isVoidTag(type)) {
      await push('>')
      return
    }
    
    await push('>')
    
    // 渲染子节点
    if (children) {
      await renderChildrenWithBackpressure(push, children, context)
    }
    
    await push(`</${type}>`)
  } else if (typeof type === 'object' || typeof type === 'function') {
    // 组件节点
    await renderComponentWithBackpressure(push, vnode, context)
  }
}
```

## 缓冲与批处理

过于频繁的小块写入会增加系统调用开销。合理的缓冲策略可以平衡响应性和效率。

```typescript
interface BufferedPush {
  (chunk: string): Promise<void>
  flush(): Promise<void>
}

function createBufferedPush(
  writable: NodeJS.WritableStream,
  bufferSize: number = 8192
): BufferedPush {
  let buffer = ''
  let drainPromise: Promise<void> | null = null
  
  const flushBuffer = async () => {
    if (buffer.length === 0) return
    
    if (drainPromise) {
      await drainPromise
      drainPromise = null
    }
    
    const chunk = buffer
    buffer = ''
    
    const canContinue = writable.write(chunk)
    
    if (!canContinue) {
      drainPromise = new Promise(resolve => {
        writable.once('drain', resolve)
      })
    }
  }
  
  const push = async (chunk: string) => {
    buffer += chunk
    
    if (buffer.length >= bufferSize) {
      await flushBuffer()
    }
  }
  
  push.flush = async () => {
    await flushBuffer()
    if (drainPromise) {
      await drainPromise
    }
  }
  
  return push
}
```

## 异步边界处理

在遇到异步组件时，需要特别处理背压和渲染顺序。

```typescript
/**
 * 异步组件的背压处理
 */
async function renderAsyncComponentWithBackpressure(
  push: BufferedPush,
  vnode: VNode,
  context: SSRContext
): Promise<void> {
  const component = vnode.type as AsyncComponentLoader
  
  try {
    // 加载组件
    const resolvedComponent = await component()
    
    // 创建新的 VNode
    const resolvedVNode = createVNode(
      resolvedComponent,
      vnode.props,
      vnode.children
    )
    
    // 渲染
    await renderVNodeWithBackpressure(push, resolvedVNode, context)
  } catch (error) {
    // 渲染错误回退
    if (vnode.props?.onError) {
      const fallback = vnode.props.onError(error)
      await renderVNodeWithBackpressure(push, fallback, context)
    } else {
      throw error
    }
  }
}
```

## 监控与调试

```typescript
/**
 * 带监控的背压处理
 */
function createMonitoredPush(
  writable: NodeJS.WritableStream,
  onMetrics?: (metrics: BackpressureMetrics) => void
): BackpressureAwarePush {
  let totalBytes = 0
  let drainCount = 0
  let drainWaitTime = 0
  
  const push = createBackpressureAwarePush(writable)
  const originalPush = push
  
  const monitoredPush = async (chunk: string) => {
    totalBytes += chunk.length
    
    const start = Date.now()
    await originalPush(chunk)
    const elapsed = Date.now() - start
    
    if (elapsed > 0) {
      drainCount++
      drainWaitTime += elapsed
    }
    
    if (onMetrics) {
      onMetrics({
        totalBytes,
        drainCount,
        drainWaitTime,
        averageDrainWait: drainCount > 0 ? drainWaitTime / drainCount : 0
      })
    }
  }
  
  monitoredPush.flush = push.flush
  
  return monitoredPush
}

interface BackpressureMetrics {
  totalBytes: number
  drainCount: number
  drainWaitTime: number
  averageDrainWait: number
}
```

## 小结

本章分析了 SSR 流式渲染的背压处理：

1. **背压问题**：生产速度超过消费速度
2. **drain 事件**：等待消费者准备好
3. **缓冲策略**：平衡响应性和效率
4. **异步处理**：正确处理异步组件
5. **监控调试**：追踪背压指标

正确的背压处理确保了 SSR 服务在高负载下的稳定性。
