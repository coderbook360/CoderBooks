# 扩展与探索

本章探索 SSR 实现的扩展方向和高级特性。

## 编译时优化

服务端渲染的性能瓶颈之一是运行时的 VNode 创建和遍历开销。通过编译时优化，我们可以将部分工作提前到编译阶段完成。

```typescript
// src/compiler/ssr-optimize.ts

/**
 * 静态提升
 * 将静态内容提取为常量，避免重复创建
 */
export function hoistStatic(template: string): CompiledSSR {
  const ast = parse(template)
  const hoisted: string[] = []
  
  function analyze(node: ASTNode): StaticType {
    if (node.type === 'element') {
      // 检查是否完全静态
      const childrenStatic = node.children.every(
        child => analyze(child) === StaticType.FULL_STATIC
      )
      
      const propsStatic = Object.values(node.props).every(
        prop => !prop.isDynamic
      )
      
      if (childrenStatic && propsStatic) {
        // 完全静态，可以预渲染为字符串
        const html = renderStaticNode(node)
        const index = hoisted.length
        hoisted.push(html)
        return StaticType.FULL_STATIC
      }
      
      if (propsStatic) {
        return StaticType.PROPS_STATIC
      }
    }
    
    return StaticType.DYNAMIC
  }
  
  // 分析整个模板
  analyze(ast)
  
  // 生成优化后的渲染代码
  return generateSSRCode(ast, hoisted)
}

enum StaticType {
  DYNAMIC = 0,
  PROPS_STATIC = 1,
  FULL_STATIC = 2
}
```

静态提升的效果非常显著。对于一个包含大量静态内容的页面，预渲染静态部分可以减少 50% 以上的运行时开销。

```typescript
/**
 * 字符串拼接优化
 * 将相邻的静态内容合并为单个字符串
 */
export function optimizeStringConcat(
  segments: SSRSegment[]
): SSRSegment[] {
  const result: SSRSegment[] = []
  let currentStatic = ''
  
  for (const segment of segments) {
    if (segment.type === 'static') {
      // 累积静态内容
      currentStatic += segment.content
    } else {
      // 遇到动态内容，先输出累积的静态内容
      if (currentStatic) {
        result.push({ type: 'static', content: currentStatic })
        currentStatic = ''
      }
      result.push(segment)
    }
  }
  
  // 输出剩余的静态内容
  if (currentStatic) {
    result.push({ type: 'static', content: currentStatic })
  }
  
  return result
}
```

## 缓存层设计

对于高并发场景，缓存是提升 SSR 性能的关键手段。

```typescript
// src/cache/ssr-cache.ts

interface CacheEntry {
  html: string
  timestamp: number
  ttl: number
  tags: string[]
}

/**
 * SSR 缓存管理器
 */
class SSRCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private cleanupInterval: NodeJS.Timer
  
  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000
    
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      options.cleanupInterval ?? 60000
    )
  }
  
  /**
   * 生成缓存键
   */
  generateKey(
    component: string,
    props: Record<string, any>,
    context?: Record<string, any>
  ): string {
    const propsHash = this.hashObject(props)
    const contextHash = context ? this.hashObject(context) : ''
    return `${component}:${propsHash}:${contextHash}`
  }
  
  /**
   * 获取缓存
   */
  get(key: string): string | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // 检查是否过期
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.html
  }
  
  /**
   * 设置缓存
   */
  set(
    key: string,
    html: string,
    options: { ttl?: number; tags?: string[] } = {}
  ): void {
    // 检查容量
    if (this.cache.size >= this.maxSize) {
      this.evict()
    }
    
    this.cache.set(key, {
      html,
      timestamp: Date.now(),
      ttl: options.ttl ?? 300000, // 默认 5 分钟
      tags: options.tags ?? []
    })
  }
  
  /**
   * 按标签失效
   */
  invalidateByTag(tag: string): number {
    let count = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }
    
    return count
  }
  
  /**
   * LRU 淘汰
   */
  private evict(): void {
    // 简单实现：删除最旧的 10%
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    const deleteCount = Math.ceil(this.maxSize * 0.1)
    
    for (let i = 0; i < deleteCount; i++) {
      this.cache.delete(entries[i][0])
    }
  }
  
  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * 对象哈希
   */
  private hashObject(obj: Record<string, any>): string {
    return JSON.stringify(obj)
      .split('')
      .reduce((hash, char) => {
        hash = ((hash << 5) - hash) + char.charCodeAt(0)
        return hash & hash
      }, 0)
      .toString(36)
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
  }
}

// 使用示例
const cache = new SSRCache({ maxSize: 500 })

async function renderWithCache(
  component: Component,
  props: Record<string, any>
): Promise<string> {
  const key = cache.generateKey(component.name, props)
  
  // 尝试从缓存获取
  const cached = cache.get(key)
  if (cached) {
    return cached
  }
  
  // 渲染并缓存
  const html = await renderToString(h(component, props))
  cache.set(key, html, { 
    ttl: 60000,
    tags: ['component', component.name] 
  })
  
  return html
}
```

## 增量渲染

对于大型页面，增量渲染可以显著降低首屏时间。

```typescript
// src/server/incremental-render.ts

/**
 * 增量渲染配置
 */
interface IncrementalConfig {
  // 首屏优先区域
  prioritySelectors: string[]
  // 延迟加载区域
  deferredSelectors: string[]
  // 骨架屏
  skeletons: Record<string, string>
}

/**
 * 增量渲染器
 */
class IncrementalRenderer {
  private config: IncrementalConfig
  
  constructor(config: IncrementalConfig) {
    this.config = config
  }
  
  /**
   * 渲染首屏
   */
  async renderInitial(vnode: VNode): Promise<{
    html: string
    deferred: DeferredTask[]
  }> {
    const deferred: DeferredTask[] = []
    
    const html = await this.renderNode(vnode, {
      onDeferred: (task) => deferred.push(task)
    })
    
    return { html, deferred }
  }
  
  /**
   * 渲染延迟内容
   */
  async renderDeferred(tasks: DeferredTask[]): Promise<{
    id: string
    html: string
  }[]> {
    return Promise.all(
      tasks.map(async task => ({
        id: task.id,
        html: await renderToString(task.vnode)
      }))
    )
  }
  
  /**
   * 生成内联脚本
   */
  generateInlineScript(deferred: { id: string; html: string }[]): string {
    return `
      <script>
        window.__DEFERRED_CONTENT__ = ${JSON.stringify(deferred)};
        (function() {
          var content = window.__DEFERRED_CONTENT__;
          content.forEach(function(item) {
            var el = document.getElementById(item.id);
            if (el) {
              el.outerHTML = item.html;
            }
          });
        })();
      </script>
    `
  }
}
```

## Islands 架构

Islands 架构允许在静态页面中嵌入交互式组件岛。

```typescript
// src/islands/island.ts

/**
 * Island 组件标记
 */
export function defineIsland<T extends Component>(
  component: T,
  options: IslandOptions = {}
): T & { __island: true } {
  return Object.assign(component, {
    __island: true as const,
    __islandOptions: options
  })
}

interface IslandOptions {
  // 激活策略
  hydrate?: 'load' | 'idle' | 'visible' | 'media' | 'interaction'
  // 媒体查询（hydrate: 'media' 时使用）
  media?: string
  // 交互事件（hydrate: 'interaction' 时使用）
  on?: string[]
}

/**
 * Island 渲染器
 */
class IslandRenderer {
  private islands: Map<string, { component: Component; props: any }> = new Map()
  private idCounter = 0
  
  /**
   * 渲染 Island
   */
  async render(
    component: Component & { __island: true },
    props: Record<string, any>
  ): Promise<string> {
    const id = `island-${++this.idCounter}`
    const options = (component as any).__islandOptions || {}
    
    // 存储 Island 信息
    this.islands.set(id, { component, props })
    
    // 渲染静态内容
    const html = await renderToString(h(component, props))
    
    // 包装为 Island 容器
    return `
      <div 
        data-island="${id}" 
        data-hydrate="${options.hydrate || 'load'}"
        ${options.media ? `data-media="${options.media}"` : ''}
        ${options.on ? `data-on="${options.on.join(',')}"` : ''}
      >
        ${html}
      </div>
    `
  }
  
  /**
   * 生成 Island 激活脚本
   */
  generateScript(): string {
    const islandData = Array.from(this.islands.entries()).map(
      ([id, { props }]) => ({ id, props })
    )
    
    return `
      <script type="module">
        import { hydrateIslands } from '/islands-runtime.js';
        hydrateIslands(${JSON.stringify(islandData)});
      </script>
    `
  }
}
```

客户端激活代码实现了多种激活策略。

```typescript
// src/islands/client-runtime.ts

/**
 * 激活所有 Islands
 */
export async function hydrateIslands(
  islandData: { id: string; props: any }[]
): Promise<void> {
  const islands = document.querySelectorAll('[data-island]')
  
  for (const el of islands) {
    const id = el.getAttribute('data-island')!
    const strategy = el.getAttribute('data-hydrate') || 'load'
    const data = islandData.find(d => d.id === id)
    
    if (!data) continue
    
    await scheduleHydration(el as HTMLElement, strategy, data)
  }
}

/**
 * 调度激活
 */
async function scheduleHydration(
  el: HTMLElement,
  strategy: string,
  data: { id: string; props: any }
): Promise<void> {
  switch (strategy) {
    case 'load':
      await hydrateIsland(el, data)
      break
    
    case 'idle':
      requestIdleCallback(() => hydrateIsland(el, data))
      break
    
    case 'visible':
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          hydrateIsland(el, data)
        }
      })
      observer.observe(el)
      break
    
    case 'media':
      const query = el.getAttribute('data-media')!
      const mql = matchMedia(query)
      
      if (mql.matches) {
        await hydrateIsland(el, data)
      } else {
        mql.addEventListener('change', () => {
          if (mql.matches) hydrateIsland(el, data)
        }, { once: true })
      }
      break
    
    case 'interaction':
      const events = (el.getAttribute('data-on') || 'click').split(',')
      
      const handler = () => {
        events.forEach(e => el.removeEventListener(e, handler))
        hydrateIsland(el, data)
      }
      
      events.forEach(e => el.addEventListener(e, handler, { once: true }))
      break
  }
}

/**
 * 激活单个 Island
 */
async function hydrateIsland(
  el: HTMLElement,
  data: { id: string; props: any }
): Promise<void> {
  // 动态导入组件
  const componentId = data.id.split('-')[1]
  const module = await import(`/islands/${componentId}.js`)
  const component = module.default
  
  // 激活
  hydrate(h(component, data.props), el)
}
```

## 边缘渲染

边缘渲染将 SSR 推到 CDN 边缘节点，进一步降低延迟。

```typescript
// src/edge/edge-render.ts

/**
 * 边缘渲染处理器
 */
export async function handleEdgeRequest(
  request: Request,
  env: EdgeEnv
): Promise<Response> {
  const url = new URL(request.url)
  const cacheKey = generateCacheKey(url, request.headers)
  
  // 检查边缘缓存
  const cached = await env.CACHE.get(cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: { 
        'Content-Type': 'text/html',
        'X-Cache': 'HIT'
      }
    })
  }
  
  // 边缘渲染
  const html = await renderAtEdge(url, env)
  
  // 缓存结果
  await env.CACHE.put(cacheKey, html, { ttl: 300 })
  
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html',
      'X-Cache': 'MISS'
    }
  })
}

/**
 * 边缘渲染
 */
async function renderAtEdge(url: URL, env: EdgeEnv): Promise<string> {
  // 获取页面数据
  const data = await fetchPageData(url, env)
  
  // 渲染页面
  const App = await importApp(url.pathname)
  const html = await renderToString(h(App, { data }))
  
  // 注入 HTML 模板
  return injectToTemplate(html, data)
}

/**
 * 生成缓存键
 */
function generateCacheKey(url: URL, headers: Headers): string {
  const parts = [
    url.pathname,
    url.search,
    headers.get('Accept-Language') || '',
    headers.get('Cookie')?.match(/theme=(\w+)/)?.[1] || 'light'
  ]
  
  return parts.join(':')
}
```

## 未来方向

SSR 技术仍在快速发展。Partial Prerendering 结合了静态生成和动态渲染的优势，在构建时预渲染静态部分，运行时填充动态内容。React Server Components 将组件分为服务器组件和客户端组件，服务器组件永不发送到客户端，减少 bundle 大小。Streaming with Suspense 允许在数据就绪时逐步发送内容，改善用户体验。

这些新特性都指向同一个目标：在保持开发体验的同时，最大化渲染性能。随着 Web 标准的演进和浏览器能力的增强，SSR 将继续发挥重要作用。

## 小结

本章探索了 SSR 的扩展方向：

1. **编译时优化**：静态提升、字符串拼接
2. **缓存层设计**：LRU 缓存、标签失效
3. **增量渲染**：首屏优先、延迟加载
4. **Islands 架构**：选择性激活、多种策略
5. **边缘渲染**：CDN 集成、缓存策略
6. **未来方向**：Partial Prerendering、RSC

这些扩展为构建高性能 SSR 应用提供了更多可能性。
