# 异步组件

异步组件是优化应用加载性能的关键技术。在 SSR 中，异步组件需要特殊处理，确保服务端渲染完整内容，客户端正确 hydration。

## 异步组件定义

```typescript
// src/shared/async-component.ts

export interface AsyncComponentOptions<T extends Component = Component> {
  // 加载函数
  loader: () => Promise<T | { default: T }>
  // 加载中组件
  loadingComponent?: Component
  // 错误组件
  errorComponent?: Component
  // 延迟显示 loading（毫秒）
  delay?: number
  // 超时时间（毫秒）
  timeout?: number
  // 是否 SSR
  ssr?: boolean
  // 重试次数
  retries?: number
}

export interface AsyncComponent<T extends Component = Component> {
  __asyncLoader: () => Promise<T>
  __asyncResolved?: T
  __asyncError?: Error
}

// 定义异步组件
export function defineAsyncComponent<T extends Component>(
  source: (() => Promise<T | { default: T }>) | AsyncComponentOptions<T>
): AsyncComponent<T> {
  const options: AsyncComponentOptions<T> = 
    typeof source === 'function' 
      ? { loader: source }
      : source
  
  let resolvedComp: T | undefined
  let pendingPromise: Promise<T> | null = null
  let retryCount = 0
  
  const loader = async (): Promise<T> => {
    if (resolvedComp) {
      return resolvedComp
    }
    
    if (pendingPromise) {
      return pendingPromise
    }
    
    pendingPromise = options.loader()
      .then(module => {
        // 处理 ES module default export
        const comp = (module as any).default || module
        resolvedComp = comp
        return comp
      })
      .catch(err => {
        // 重试逻辑
        if (options.retries && retryCount < options.retries) {
          retryCount++
          pendingPromise = null
          return loader()
        }
        throw err
      })
      .finally(() => {
        pendingPromise = null
      })
    
    return pendingPromise
  }
  
  const asyncComp: AsyncComponent<T> = {
    __asyncLoader: loader
  }
  
  // 附加选项
  Object.assign(asyncComp, {
    loadingComponent: options.loadingComponent,
    errorComponent: options.errorComponent,
    delay: options.delay ?? 200,
    timeout: options.timeout,
    ssr: options.ssr ?? true
  })
  
  return asyncComp
}
```

## 服务端渲染异步组件

```typescript
// src/server/async.ts

interface AsyncContext {
  promises: Promise<any>[]
  resolved: Map<AsyncComponent, Component>
  errors: Map<AsyncComponent, Error>
}

let asyncContext: AsyncContext | null = null

export function createAsyncContext(): AsyncContext {
  return {
    promises: [],
    resolved: new Map(),
    errors: new Map()
  }
}

export function setAsyncContext(ctx: AsyncContext) {
  asyncContext = ctx
}

// 服务端异步组件渲染
async function renderAsyncComponent(vnode: VNode): Promise<string> {
  const asyncComp = vnode.type as AsyncComponent
  
  // 检查是否已解析
  if (asyncComp.__asyncResolved) {
    const resolvedVNode = {
      ...vnode,
      type: asyncComp.__asyncResolved
    }
    return renderVNode(resolvedVNode)
  }
  
  // 检查 SSR 选项
  if ((asyncComp as any).ssr === false) {
    // 不在服务端渲染，返回占位符
    return '<!--async-component-->'
  }
  
  try {
    // 加载组件
    const comp = await asyncComp.__asyncLoader()
    asyncComp.__asyncResolved = comp
    
    // 渲染解析后的组件
    const resolvedVNode = {
      ...vnode,
      type: comp
    }
    return renderVNode(resolvedVNode)
  } catch (error) {
    asyncComp.__asyncError = error as Error
    
    // 渲染错误组件
    const errorComp = (asyncComp as any).errorComponent
    if (errorComp) {
      return renderVNode(h(errorComp, { error }))
    }
    
    throw error
  }
}

// 批量预加载异步组件
export async function prefetchAsyncComponents(
  vnode: VNode
): Promise<void> {
  const asyncComponents: AsyncComponent[] = []
  
  // 遍历收集异步组件
  function collect(node: VNode) {
    if (isAsyncComponent(node.type)) {
      asyncComponents.push(node.type as AsyncComponent)
    }
    
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === 'object' && child) {
          collect(child as VNode)
        }
      }
    }
  }
  
  collect(vnode)
  
  // 并行加载
  await Promise.all(
    asyncComponents.map(async comp => {
      try {
        await comp.__asyncLoader()
      } catch (e) {
        // 忽略加载错误，渲染时再处理
      }
    })
  )
}

function isAsyncComponent(type: any): type is AsyncComponent {
  return type && '__asyncLoader' in type
}
```

## 客户端异步组件处理

```typescript
// src/runtime/async.ts

function processAsyncComponent(
  n1: VNode | null,
  n2: VNode,
  container: Element,
  anchor: Node | null
) {
  const asyncComp = n2.type as AsyncComponent
  
  if (asyncComp.__asyncResolved) {
    // 已解析，使用真实组件
    const resolvedVNode = {
      ...n2,
      type: asyncComp.__asyncResolved
    }
    processComponent(n1, resolvedVNode, container, anchor)
    return
  }
  
  if (asyncComp.__asyncError) {
    // 加载出错
    const errorComp = (asyncComp as any).errorComponent
    if (errorComp) {
      const errorVNode = h(errorComp, { 
        error: asyncComp.__asyncError 
      })
      patch(null, errorVNode, container, anchor)
    }
    return
  }
  
  // 显示 loading 组件
  const loadingComp = (asyncComp as any).loadingComponent
  const delay = (asyncComp as any).delay || 200
  const timeout = (asyncComp as any).timeout
  
  let loadingVNode: VNode | null = null
  let loadingTimer: any = null
  let timeoutTimer: any = null
  
  // 延迟显示 loading
  if (loadingComp && delay > 0) {
    loadingTimer = setTimeout(() => {
      loadingVNode = h(loadingComp)
      patch(null, loadingVNode, container, anchor)
    }, delay)
  } else if (loadingComp) {
    loadingVNode = h(loadingComp)
    patch(null, loadingVNode, container, anchor)
  }
  
  // 设置超时
  if (timeout) {
    timeoutTimer = setTimeout(() => {
      asyncComp.__asyncError = new Error(
        `Async component timed out after ${timeout}ms`
      )
      
      // 显示错误组件
      const errorComp = (asyncComp as any).errorComponent
      if (errorComp) {
        const errorVNode = h(errorComp, { 
          error: asyncComp.__asyncError 
        })
        
        if (loadingVNode) {
          patch(loadingVNode, errorVNode, container, null)
        } else {
          patch(null, errorVNode, container, anchor)
        }
      }
    }, timeout)
  }
  
  // 加载组件
  asyncComp.__asyncLoader()
    .then(comp => {
      clearTimeout(loadingTimer)
      clearTimeout(timeoutTimer)
      
      asyncComp.__asyncResolved = comp
      
      // 渲染真实组件
      const resolvedVNode = {
        ...n2,
        type: comp
      }
      
      if (loadingVNode) {
        patch(loadingVNode, resolvedVNode, container, null)
      } else {
        patch(null, resolvedVNode, container, anchor)
      }
    })
    .catch(error => {
      clearTimeout(loadingTimer)
      clearTimeout(timeoutTimer)
      
      asyncComp.__asyncError = error
      
      const errorComp = (asyncComp as any).errorComponent
      if (errorComp) {
        const errorVNode = h(errorComp, { error })
        
        if (loadingVNode) {
          patch(loadingVNode, errorVNode, container, null)
        } else {
          patch(null, errorVNode, container, anchor)
        }
      } else {
        console.error('Async component load failed:', error)
      }
    })
}
```

## Hydration 处理

```typescript
// 异步组件 hydration
function hydrateAsyncComponent(
  node: Node,
  vnode: VNode
): Node | null {
  const asyncComp = vnode.type as AsyncComponent
  
  // 检查是否已在服务端解析
  if (asyncComp.__asyncResolved) {
    const resolvedVNode = {
      ...vnode,
      type: asyncComp.__asyncResolved
    }
    return hydrateComponent(node, resolvedVNode)
  }
  
  // 服务端未渲染（ssr: false）
  if (node.nodeType === Node.COMMENT_NODE &&
      (node as Comment).textContent === 'async-component') {
    // 创建组件实例并加载
    const container = node.parentElement!
    const anchor = node.nextSibling
    
    // 移除占位符
    container.removeChild(node)
    
    // 挂载异步组件
    processAsyncComponent(null, vnode, container, anchor)
    
    return anchor
  }
  
  // 尝试加载并匹配
  asyncComp.__asyncLoader().then(comp => {
    asyncComp.__asyncResolved = comp
  })
  
  return node.nextSibling
}
```

## Suspense 集成

```typescript
// 异步组件与 Suspense 配合
interface SuspenseContext {
  deps: Set<Promise<any>>
  resolved: boolean
}

let suspenseContext: SuspenseContext | null = null

export function setSuspenseContext(ctx: SuspenseContext | null) {
  suspenseContext = ctx
}

// 在 Suspense 边界内注册异步依赖
function registerAsyncDep(promise: Promise<any>) {
  if (suspenseContext) {
    suspenseContext.deps.add(promise)
  }
}

// 渲染 Suspense
async function renderSuspense(vnode: VNode): Promise<string> {
  const { default: defaultSlot, fallback } = vnode.children as any
  
  const ctx: SuspenseContext = {
    deps: new Set(),
    resolved: false
  }
  
  setSuspenseContext(ctx)
  
  try {
    // 尝试渲染默认内容
    const content = await renderVNode(defaultSlot())
    
    // 等待所有异步依赖
    if (ctx.deps.size > 0) {
      await Promise.all(ctx.deps)
      // 重新渲染
      return await renderVNode(defaultSlot())
    }
    
    ctx.resolved = true
    return content
  } catch (error) {
    // 渲染 fallback
    if (fallback) {
      return await renderVNode(fallback())
    }
    throw error
  } finally {
    setSuspenseContext(null)
  }
}
```

## 使用示例

```typescript
// 定义异步组件
const AsyncUserProfile = defineAsyncComponent({
  loader: () => import('./UserProfile'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 10000,
  retries: 3
})

// 在应用中使用
const App: Component = {
  setup() {
    return () => h('div', null, [
      h('header', null, 'My App'),
      h(AsyncUserProfile, { userId: 1 })
    ])
  }
}

// 服务端渲染
const html = await renderToString(h(App, null, null))
// UserProfile 被完整渲染

// 客户端 hydration
// 如果 SSR 已渲染，直接 hydrate
// 如果未渲染，客户端加载并渲染
```

## 路由级代码分割

```typescript
// 路由配置使用异步组件
const routes = [
  {
    path: '/',
    component: defineAsyncComponent(() => import('./views/Home'))
  },
  {
    path: '/about',
    component: defineAsyncComponent({
      loader: () => import('./views/About'),
      ssr: true
    })
  },
  {
    path: '/dashboard',
    component: defineAsyncComponent({
      loader: () => import('./views/Dashboard'),
      ssr: false, // 客户端才加载
      loadingComponent: DashboardSkeleton
    })
  }
]

// 路由组件
const Router: Component = {
  setup() {
    const currentRoute = useRoute()
    
    return () => {
      const route = routes.find(r => r.path === currentRoute.path)
      if (route) {
        return h(route.component, null, null)
      }
      return h('div', null, '404 Not Found')
    }
  }
}
```

## 预加载策略

```typescript
// 预加载即将需要的组件
function prefetchComponent(asyncComp: AsyncComponent) {
  if (!asyncComp.__asyncResolved) {
    asyncComp.__asyncLoader().catch(() => {})
  }
}

// 路由预加载
function prefetchRouteComponent(path: string) {
  const route = routes.find(r => r.path === path)
  if (route && isAsyncComponent(route.component)) {
    prefetchComponent(route.component)
  }
}

// 悬停预加载
function usePrefetchOnHover(path: string) {
  let prefetched = false
  
  return {
    onMouseenter: () => {
      if (!prefetched) {
        prefetchRouteComponent(path)
        prefetched = true
      }
    }
  }
}

// 使用
const NavLink: Component = {
  props: {
    to: { type: String, required: true }
  },
  setup(props) {
    const handlers = usePrefetchOnHover(props.to)
    
    return () => h('a', {
      href: props.to,
      ...handlers
    }, props.to)
  }
}
```

## 小结

异步组件在 SSR 中的关键点：

1. **服务端预加载**：渲染前解析所有异步组件
2. **状态标记**：记录已解析/错误状态
3. **Hydration 匹配**：确保客户端正确恢复
4. **加载态处理**：Loading、Error、Timeout 组件
5. **预加载优化**：路由预测、悬停预加载

正确处理异步组件让应用既有良好的首屏体验，又有优秀的交互性能。
