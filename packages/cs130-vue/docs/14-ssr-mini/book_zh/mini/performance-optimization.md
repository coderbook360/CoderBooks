# 性能优化

SSR 应用的性能直接影响用户体验和服务器成本。本章介绍服务端和客户端的关键优化策略。

## 性能指标

```typescript
// src/shared/metrics.ts

export interface SSRMetrics {
  // 服务端
  renderTime: number      // 渲染耗时
  dataFetchTime: number   // 数据获取耗时
  serializeTime: number   // 序列化耗时
  totalSSRTime: number    // 总 SSR 时间
  
  // 客户端
  hydrateTime: number     // Hydration 耗时
  firstPaint: number      // FP
  firstContentfulPaint: number  // FCP
  timeToInteractive: number     // TTI
  largestContentfulPaint: number // LCP
}

export function createMetricsCollector() {
  const metrics: Partial<SSRMetrics> = {}
  const marks: Record<string, number> = {}
  
  return {
    mark(name: string) {
      marks[name] = performance.now()
    },
    
    measure(name: keyof SSRMetrics, start: string, end?: string) {
      const startTime = marks[start]
      const endTime = end ? marks[end] : performance.now()
      metrics[name] = endTime - startTime
    },
    
    getMetrics() {
      return { ...metrics }
    },
    
    report() {
      console.log('[SSR Metrics]', metrics)
      // 发送到监控服务
      if (typeof window !== 'undefined') {
        navigator.sendBeacon?.('/api/metrics', JSON.stringify(metrics))
      }
    }
  }
}
```

## 服务端缓存

```typescript
// src/server/cache.ts

interface CacheEntry<T> {
  value: T
  expires: number
  tags: string[]
}

export class SSRCache {
  private cache = new Map<string, CacheEntry<string>>()
  private maxSize: number
  
  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize || 100
  }
  
  // 获取缓存
  get(key: string): string | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // 检查过期
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }
  
  // 设置缓存
  set(
    key: string,
    value: string,
    options: { ttl?: number; tags?: string[] } = {}
  ) {
    // 检查大小限制
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }
    
    this.cache.set(key, {
      value,
      expires: options.ttl ? Date.now() + options.ttl : 0,
      tags: options.tags || []
    })
  }
  
  // 按标签失效
  invalidateByTag(tag: string) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
      }
    }
  }
  
  // 驱逐策略（FIFO）
  private evict() {
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      this.cache.delete(firstKey)
    }
  }
  
  clear() {
    this.cache.clear()
  }
}

// 页面级缓存
export function createPageCache() {
  const cache = new SSRCache({ maxSize: 1000 })
  
  return async function cacheMiddleware(
    render: () => Promise<string>,
    cacheKey: string,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<string> {
    // 尝试从缓存获取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    // 渲染并缓存
    const html = await render()
    cache.set(cacheKey, html, options)
    
    return html
  }
}
```

## 组件级缓存

```typescript
// src/server/component-cache.ts

const componentCache = new Map<string, string>()

// 缓存组件渲染结果
export function cacheComponent(
  cacheKey: string,
  render: () => string
): string {
  const cached = componentCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  const html = render()
  componentCache.set(cacheKey, html)
  
  return html
}

// 可缓存组件装饰器
export function cacheable(
  getCacheKey: (props: any) => string,
  ttl?: number
): (component: Component) => Component {
  return (component) => {
    const cache = new Map<string, { html: string; expires: number }>()
    
    return {
      ...component,
      __ssrRender(props: any) {
        const key = getCacheKey(props)
        const cached = cache.get(key)
        
        if (cached && (!cached.expires || cached.expires > Date.now())) {
          return cached.html
        }
        
        // 渲染组件
        const html = renderComponent(component, props)
        
        cache.set(key, {
          html,
          expires: ttl ? Date.now() + ttl : 0
        })
        
        return html
      }
    }
  }
}

// 使用示例
const CachedUserCard = cacheable(
  (props) => `user-card-${props.userId}`,
  60000 // 1分钟
)(UserCard)
```

## 流式渲染优化

```typescript
// 分块渲染提升 TTFB
export function createOptimizedStream(
  renderApp: () => AsyncGenerator<string>,
  options: {
    chunkSize?: number
    flushInterval?: number
  } = {}
) {
  const chunkSize = options.chunkSize || 16 * 1024 // 16KB
  const flushInterval = options.flushInterval || 100 // 100ms
  
  return new ReadableStream({
    async start(controller) {
      let buffer = ''
      let lastFlush = Date.now()
      
      const flush = () => {
        if (buffer) {
          controller.enqueue(buffer)
          buffer = ''
          lastFlush = Date.now()
        }
      }
      
      for await (const chunk of renderApp()) {
        buffer += chunk
        
        // 按大小或时间刷新
        if (
          buffer.length >= chunkSize ||
          Date.now() - lastFlush >= flushInterval
        ) {
          flush()
        }
      }
      
      flush()
      controller.close()
    }
  })
}

// 优先渲染关键内容
async function* renderWithPriority(vnode: VNode) {
  // 1. 先渲染 head 和关键 CSS
  yield '<!DOCTYPE html><html><head>'
  yield '<style>' + criticalCSS + '</style>'
  yield '</head><body>'
  
  // 2. 渲染首屏内容
  yield '<div id="app">'
  yield await renderCriticalContent(vnode)
  
  // 3. 流式渲染剩余内容
  for await (const chunk of renderDeferredContent(vnode)) {
    yield chunk
  }
  
  yield '</div>'
  
  // 4. 注入脚本和状态
  yield '<script src="/client.js" defer></script>'
  yield '</body></html>'
}
```

## 懒加载优化

```typescript
// src/runtime/lazy.ts

// 懒加载 Hydration
export function createLazyHydration(
  trigger: 'visible' | 'idle' | 'interaction' | 'media',
  options?: any
): (vnode: VNode, el: Element) => void {
  switch (trigger) {
    case 'visible':
      return (vnode, el) => {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              observer.disconnect()
              hydrateNode(el.firstChild!, vnode)
            }
          },
          { rootMargin: options?.rootMargin || '50px' }
        )
        observer.observe(el)
      }
    
    case 'idle':
      return (vnode, el) => {
        requestIdleCallback(() => {
          hydrateNode(el.firstChild!, vnode)
        }, { timeout: options?.timeout || 2000 })
      }
    
    case 'interaction':
      return (vnode, el) => {
        const events = ['click', 'focus', 'touchstart', 'mouseenter']
        
        const hydrate = () => {
          events.forEach(e => el.removeEventListener(e, hydrate))
          hydrateNode(el.firstChild!, vnode)
        }
        
        events.forEach(e => el.addEventListener(e, hydrate, { once: true }))
      }
    
    case 'media':
      return (vnode, el) => {
        const mq = window.matchMedia(options?.query || '(min-width: 768px)')
        
        if (mq.matches) {
          hydrateNode(el.firstChild!, vnode)
        } else {
          mq.addEventListener('change', function handler(e) {
            if (e.matches) {
              mq.removeEventListener('change', handler)
              hydrateNode(el.firstChild!, vnode)
            }
          })
        }
      }
  }
}

// Islands 架构
export function createIsland(
  component: Component,
  hydrationTrigger: 'visible' | 'idle' | 'interaction' = 'visible'
) {
  return {
    __island: true,
    component,
    hydrationTrigger
  }
}
```

## 数据预取优化

```typescript
// 并行数据获取
export async function prefetchPageData(
  route: Route
): Promise<Record<string, any>> {
  const fetchers = route.meta?.fetchers || []
  
  // 并行执行所有 fetcher
  const results = await Promise.all(
    fetchers.map(async (fetcher: any) => {
      const startTime = performance.now()
      
      try {
        const data = await fetcher.fn(route)
        return {
          key: fetcher.key,
          data,
          time: performance.now() - startTime
        }
      } catch (error) {
        return {
          key: fetcher.key,
          error,
          time: performance.now() - startTime
        }
      }
    })
  )
  
  // 组装数据
  const data: Record<string, any> = {}
  for (const result of results) {
    if ('data' in result) {
      data[result.key] = result.data
    }
  }
  
  return data
}

// 数据缓存和去重
const dataCache = new Map<string, Promise<any>>()

export function dedupeDataFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (dataCache.has(key)) {
    return dataCache.get(key)!
  }
  
  const promise = fetcher().finally(() => {
    // 请求完成后移除
    setTimeout(() => dataCache.delete(key), 100)
  })
  
  dataCache.set(key, promise)
  return promise
}
```

## 内存优化

```typescript
// 限制并发渲染数量
class RenderPool {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private maxConcurrent: number
  
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent
  }
  
  async run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          this.next()
        }
      }
      
      if (this.running < this.maxConcurrent) {
        execute()
      } else {
        this.queue.push(execute)
      }
    })
  }
  
  private next() {
    const task = this.queue.shift()
    if (task) {
      task()
    }
  }
}

const renderPool = new RenderPool(50)

// 使用
app.get('*', (req, res) => {
  renderPool.run(async () => {
    const html = await renderPage(req)
    res.send(html)
  })
})
```

## 客户端优化

```typescript
// 批量更新
let pendingUpdates: Set<ComponentInstance> = new Set()
let updateScheduled = false

function scheduleUpdate(instance: ComponentInstance) {
  pendingUpdates.add(instance)
  
  if (!updateScheduled) {
    updateScheduled = true
    queueMicrotask(flushUpdates)
  }
}

function flushUpdates() {
  const updates = Array.from(pendingUpdates)
  pendingUpdates.clear()
  updateScheduled = false
  
  // 按深度排序，父组件先更新
  updates.sort((a, b) => getDepth(a) - getDepth(b))
  
  for (const instance of updates) {
    instance.update()
  }
}

// 静态内容提升
function hoistStatic(vnode: VNode): VNode {
  if (vnode.patchFlag === PatchFlags.HOISTED) {
    // 静态节点只创建一次
    if (!vnode._cached) {
      vnode._cached = renderVNode(vnode)
    }
    return vnode
  }
  
  // 递归处理子节点
  if (Array.isArray(vnode.children)) {
    vnode.children = vnode.children.map(child => 
      typeof child === 'object' ? hoistStatic(child as VNode) : child
    )
  }
  
  return vnode
}
```

## 性能监控

```typescript
// 集成 Web Vitals
export function setupPerformanceMonitoring() {
  if (typeof window === 'undefined') return
  
  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    console.log('LCP:', lastEntry.startTime)
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  
  // FID
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FID:', (entry as any).processingStart - entry.startTime)
    }
  }).observe({ type: 'first-input', buffered: true })
  
  // CLS
  let clsValue = 0
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
    console.log('CLS:', clsValue)
  }).observe({ type: 'layout-shift', buffered: true })
  
  // Hydration 时间
  const hydrateStart = performance.now()
  window.addEventListener('load', () => {
    console.log('Hydration time:', performance.now() - hydrateStart)
  })
}
```

## 小结

SSR 性能优化的关键策略：

1. **服务端缓存**：页面级和组件级缓存
2. **流式渲染**：优化 TTFB，分块输出
3. **懒加载**：按需 hydration，Islands 架构
4. **数据优化**：并行获取，去重缓存
5. **内存控制**：并发限制，资源池
6. **监控分析**：Web Vitals，性能指标

持续优化让 SSR 应用保持最佳性能表现。
