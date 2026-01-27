# 错误处理

SSR 应用的错误处理比客户端更复杂。服务端错误可能导致页面无法渲染，需要优雅降级。客户端 hydration 错误需要妥善恢复。

## 错误类型

```typescript
// src/shared/errors.ts

// SSR 错误类型
export enum SSRErrorCode {
  // 渲染错误
  RENDER_ERROR = 'RENDER_ERROR',
  // 组件错误
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  // 数据获取错误
  DATA_FETCH_ERROR = 'DATA_FETCH_ERROR',
  // 序列化错误
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  // Hydration 不匹配
  HYDRATION_MISMATCH = 'HYDRATION_MISMATCH',
  // 超时错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  // 异步组件加载错误
  ASYNC_COMPONENT_ERROR = 'ASYNC_COMPONENT_ERROR'
}

// SSR 错误类
export class SSRError extends Error {
  code: SSRErrorCode
  component?: string
  vnode?: VNode
  originalError?: Error
  
  constructor(
    code: SSRErrorCode,
    message: string,
    options?: {
      component?: string
      vnode?: VNode
      cause?: Error
    }
  ) {
    super(message)
    this.name = 'SSRError'
    this.code = code
    this.component = options?.component
    this.vnode = options?.vnode
    this.originalError = options?.cause
  }
}

// 创建错误工厂
export function createSSRError(
  code: SSRErrorCode,
  message: string,
  options?: any
): SSRError {
  return new SSRError(code, message, options)
}
```

## 错误边界组件

```typescript
// src/shared/error-boundary.ts

export interface ErrorBoundaryProps {
  fallback?: Component | ((error: Error) => VNode)
  onError?: (error: Error, info: ErrorInfo) => void
}

export interface ErrorInfo {
  component: string
  stack: string[]
}

// 错误边界组件
export const ErrorBoundary: Component = {
  name: 'ErrorBoundary',
  
  props: {
    fallback: [Object, Function],
    onError: Function
  },
  
  setup(props, { slots }) {
    let error: Error | null = null
    let errorInfo: ErrorInfo | null = null
    
    // 错误处理器
    const handleError = (err: Error, info: ErrorInfo) => {
      error = err
      errorInfo = info
      
      if (props.onError) {
        props.onError(err, info)
      }
    }
    
    return () => {
      if (error) {
        // 渲染 fallback
        if (props.fallback) {
          if (typeof props.fallback === 'function') {
            return props.fallback(error)
          }
          return h(props.fallback, { error, info: errorInfo })
        }
        
        // 默认错误展示
        return h('div', { class: 'error-boundary' }, [
          h('h2', null, 'Something went wrong'),
          h('pre', null, error.message)
        ])
      }
      
      // 正常渲染子组件
      return slots.default?.()
    }
  }
}
```

## 服务端错误处理

```typescript
// src/server/error-handler.ts

export interface ErrorHandlerOptions {
  // 开发模式显示详细错误
  isDev?: boolean
  // 自定义错误页面
  errorTemplate?: (error: Error) => string
  // 错误上报
  onError?: (error: Error, context: SSRContext) => void
  // 降级策略
  fallback?: 'empty' | 'error-page' | 'client-only'
}

export function createErrorHandler(options: ErrorHandlerOptions = {}) {
  return async function handleSSRError(
    error: Error,
    context: SSRContext
  ): Promise<string> {
    // 上报错误
    if (options.onError) {
      options.onError(error, context)
    }
    
    // 记录错误
    console.error('[SSR Error]', error)
    
    // 根据策略处理
    switch (options.fallback) {
      case 'empty':
        return renderEmptyShell()
      
      case 'client-only':
        return renderClientOnly(context)
      
      case 'error-page':
      default:
        return renderErrorPage(error, options.isDev)
    }
  }
}

// 渲染空壳（仅包含挂载点）
function renderEmptyShell(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <div id="app"></div>
  <script src="/client.js"></script>
</body>
</html>
  `.trim()
}

// 渲染客户端渲染模式
function renderClientOnly(context: SSRContext): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${context.head.join('\n  ')}
</head>
<body>
  <div id="app">
    <div class="loading">Loading...</div>
  </div>
  <script>window.__SSR_FALLBACK__ = true</script>
  <script src="/client.js"></script>
</body>
</html>
  `.trim()
}

// 渲染错误页面
function renderErrorPage(error: Error, isDev?: boolean): string {
  const errorDetails = isDev
    ? `<pre class="error-stack">${escapeHtml(error.stack || error.message)}</pre>`
    : ''
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
  <style>
    body { font-family: sans-serif; padding: 40px; }
    .error-container { max-width: 600px; margin: 0 auto; }
    .error-title { color: #e53e3e; }
    .error-stack { background: #f7f7f7; padding: 16px; overflow: auto; }
  </style>
</head>
<body>
  <div class="error-container">
    <h1 class="error-title">Server Error</h1>
    <p>An error occurred while rendering the page.</p>
    ${errorDetails}
    <a href="/">Return to home</a>
  </div>
</body>
</html>
  `.trim()
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
```

## 组件级错误捕获

```typescript
// 渲染过程中捕获错误
async function safeRenderComponent(
  vnode: VNode,
  context: SSRContext
): Promise<string> {
  const comp = vnode.type as Component
  
  try {
    return await renderComponent(vnode)
  } catch (error) {
    const ssrError = new SSRError(
      SSRErrorCode.COMPONENT_ERROR,
      `Error rendering component: ${comp.name || 'Anonymous'}`,
      { component: comp.name, vnode, cause: error as Error }
    )
    
    // 查找最近的错误边界
    const errorBoundary = findErrorBoundary(vnode)
    
    if (errorBoundary) {
      // 渲染 fallback
      return renderErrorFallback(errorBoundary, ssrError)
    }
    
    // 无错误边界，向上传播
    throw ssrError
  }
}

// 查找错误边界
function findErrorBoundary(vnode: VNode): VNode | null {
  let parent = vnode.parent
  
  while (parent) {
    if ((parent.type as Component).name === 'ErrorBoundary') {
      return parent
    }
    parent = parent.parent
  }
  
  return null
}

// 渲染错误 fallback
function renderErrorFallback(
  boundary: VNode,
  error: SSRError
): string {
  const props = boundary.props as ErrorBoundaryProps
  
  if (props.fallback) {
    if (typeof props.fallback === 'function') {
      return renderVNode(props.fallback(error))
    }
    return renderVNode(h(props.fallback, { error }))
  }
  
  return `<!-- Error: ${escapeHtml(error.message)} -->`
}
```

## 客户端错误处理

```typescript
// src/runtime/error-handler.ts

// 全局错误处理
export function setupErrorHandling(app: App) {
  // Vue 错误处理器
  app.config = app.config || {}
  app.config.errorHandler = (err, instance, info) => {
    console.error('[App Error]', err)
    console.error('Component:', instance)
    console.error('Info:', info)
    
    // 可以上报到错误监控服务
    reportError(err as Error, { instance, info })
  }
  
  // 全局未捕获错误
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('[Global Error]', event.error)
      reportError(event.error)
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Rejection]', event.reason)
      reportError(event.reason)
    })
  }
}

// 错误上报
function reportError(
  error: Error,
  context?: Record<string, any>
) {
  // 发送到监控服务
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        url: window.location.href,
        timestamp: Date.now()
      })
    }).catch(() => {})
  }
}
```

## Hydration 错误处理

```typescript
// Hydration 错误恢复
interface HydrationErrorHandler {
  onMismatch: (info: MismatchInfo) => void
  onError: (error: Error) => void
  recover: boolean
}

interface MismatchInfo {
  type: 'tag' | 'text' | 'children' | 'attrs'
  expected: any
  actual: any
  node: Node
  vnode: VNode
}

function createHydrationErrorHandler(): HydrationErrorHandler {
  const mismatches: MismatchInfo[] = []
  
  return {
    onMismatch(info) {
      mismatches.push(info)
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Hydration Mismatch]', info)
      }
    },
    
    onError(error) {
      console.error('[Hydration Error]', error)
      
      // 严重错误，切换到客户端渲染
      if (mismatches.length > 10) {
        console.warn('Too many hydration mismatches, falling back to client render')
        // 触发完整重新渲染
        forceClientRender()
      }
    },
    
    recover: true
  }
}

// 强制客户端渲染
function forceClientRender() {
  const container = document.getElementById('app')
  if (container) {
    // 清空内容
    container.innerHTML = ''
    container.removeAttribute('data-server-rendered')
    
    // 重新挂载
    // app.mount('#app')
  }
}

// 使用错误处理器
function hydrateWithErrorHandling(
  vnode: VNode,
  container: Element
) {
  const handler = createHydrationErrorHandler()
  
  try {
    hydrateNode(container.firstChild!, vnode, handler)
  } catch (error) {
    handler.onError(error as Error)
    
    if (handler.recover) {
      forceClientRender()
    }
  }
}
```

## 数据获取错误

```typescript
// 带错误处理的数据获取
export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    onError?: (error: Error) => void
    fallback?: T
    retry?: number
  } = {}
): {
  data: T | null
  error: Error | null
  pending: boolean
  refresh: () => Promise<void>
} {
  let data: T | null = null
  let error: Error | null = null
  let pending = true
  let retryCount = 0
  
  async function execute() {
    pending = true
    error = null
    
    try {
      data = await fetcher()
    } catch (e) {
      error = e as Error
      
      // 重试
      if (options.retry && retryCount < options.retry) {
        retryCount++
        await new Promise(r => setTimeout(r, 1000 * retryCount))
        return execute()
      }
      
      // 使用 fallback
      if (options.fallback !== undefined) {
        data = options.fallback
        error = null
      }
      
      // 调用错误回调
      if (options.onError) {
        options.onError(error!)
      }
    } finally {
      pending = false
    }
  }
  
  return {
    get data() { return data },
    get error() { return error },
    get pending() { return pending },
    refresh: execute
  }
}
```

## 超时处理

```typescript
// 渲染超时保护
async function renderWithTimeout(
  vnode: VNode,
  timeout: number = 10000
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new SSRError(
        SSRErrorCode.TIMEOUT_ERROR,
        `SSR render timed out after ${timeout}ms`
      ))
    }, timeout)
  })
  
  return Promise.race([
    renderToString(vnode),
    timeoutPromise
  ])
}

// 完整的安全渲染
export async function safeRender(
  app: Component,
  context: SSRContext,
  options: {
    timeout?: number
    errorHandler?: ErrorHandlerOptions
  } = {}
): Promise<string> {
  const errorHandler = createErrorHandler(options.errorHandler)
  
  try {
    const html = await renderWithTimeout(
      h(app, null, null),
      options.timeout
    )
    
    return injectState(html, context.state)
  } catch (error) {
    return errorHandler(error as Error, context)
  }
}
```

## 使用示例

```typescript
// 服务端
const handler = createErrorHandler({
  isDev: process.env.NODE_ENV === 'development',
  fallback: 'client-only',
  onError: (error, context) => {
    // 记录到日志系统
    logger.error('SSR Error', {
      error: error.message,
      stack: error.stack,
      url: context.url
    })
  }
})

app.get('*', async (req, res) => {
  const context = createSSRContext()
  
  try {
    const html = await safeRender(App, context, {
      timeout: 5000,
      errorHandler: { isDev: true, fallback: 'client-only' }
    })
    
    res.send(html)
  } catch (error) {
    const fallbackHtml = await handler(error, context)
    res.status(500).send(fallbackHtml)
  }
})

// 组件中使用错误边界
const App: Component = {
  render() {
    return h(ErrorBoundary, {
      fallback: (error: Error) => 
        h('div', { class: 'error' }, `Error: ${error.message}`),
      onError: (error, info) => {
        console.error('Caught error:', error, info)
      }
    }, () => [
      h(RiskyComponent, null, null)
    ])
  }
}
```

## 小结

SSR 错误处理的关键策略：

1. **分类处理**：区分渲染、数据、hydration 错误
2. **优雅降级**：服务端错误时回退到客户端渲染
3. **错误边界**：组件级隔离，防止整体崩溃
4. **超时保护**：防止渲染无限阻塞
5. **恢复机制**：hydration 失败时强制客户端渲染

健壮的错误处理确保应用在各种异常情况下都能正常工作。
