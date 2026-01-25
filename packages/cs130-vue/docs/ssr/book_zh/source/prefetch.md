# prefetch 数据预取

数据预取是提升用户体验的关键优化。在用户需要数据之前提前获取，可以消除加载等待时间。

## 预取策略

```typescript
enum PrefetchStrategy {
  // 鼠标悬停时预取
  HOVER = 'hover',
  
  // 链接进入视口时预取
  VISIBLE = 'visible',
  
  // 空闲时预取
  IDLE = 'idle',
  
  // 手动触发
  MANUAL = 'manual'
}
```

## 链接预取

```typescript
function usePrefetch() {
  const prefetchCache = new Map<string, Promise<any>>()
  
  function prefetch(url: string): Promise<any> {
    // 检查缓存
    if (prefetchCache.has(url)) {
      return prefetchCache.get(url)!
    }
    
    // 发起请求
    const promise = fetch(url).then(res => res.json())
    
    prefetchCache.set(url, promise)
    
    return promise
  }
  
  function setupHoverPrefetch(el: HTMLElement, url: string) {
    let prefetched = false
    
    el.addEventListener('mouseenter', () => {
      if (!prefetched) {
        prefetch(url)
        prefetched = true
      }
    }, { once: true })
  }
  
  return {
    prefetch,
    setupHoverPrefetch,
    cache: prefetchCache
  }
}
```

## 路由预取

```typescript
interface RoutePrefetch {
  path: string
  data: () => Promise<any>
}

function createRoutePrefetcher(routes: RoutePrefetch[]) {
  const cache = new Map<string, any>()
  const pending = new Map<string, Promise<any>>()
  
  function prefetchRoute(path: string) {
    // 已有缓存
    if (cache.has(path)) {
      return Promise.resolve(cache.get(path))
    }
    
    // 正在请求
    if (pending.has(path)) {
      return pending.get(path)
    }
    
    // 找到路由配置
    const route = routes.find(r => r.path === path)
    if (!route) return Promise.resolve(null)
    
    // 发起预取
    const promise = route.data().then(data => {
      cache.set(path, data)
      pending.delete(path)
      return data
    })
    
    pending.set(path, promise)
    
    return promise
  }
  
  return {
    prefetch: prefetchRoute,
    get: (path: string) => cache.get(path),
    has: (path: string) => cache.has(path)
  }
}
```

## 视口预取

```typescript
function setupViewportPrefetch(
  container: Element,
  prefetch: (url: string) => void
) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement
          const url = link.getAttribute('data-prefetch')
          
          if (url) {
            prefetch(url)
            observer.unobserve(link)
          }
        }
      }
    },
    {
      rootMargin: '100px'  // 提前 100px 预取
    }
  )
  
  // 观察所有标记的链接
  container.querySelectorAll('[data-prefetch]').forEach(el => {
    observer.observe(el)
  })
  
  return () => observer.disconnect()
}
```

## 空闲预取

```typescript
function idlePrefetch(urls: string[], prefetch: (url: string) => void) {
  const queue = [...urls]
  
  function processNext(deadline: IdleDeadline) {
    while (queue.length > 0 && deadline.timeRemaining() > 10) {
      const url = queue.shift()!
      prefetch(url)
    }
    
    if (queue.length > 0) {
      requestIdleCallback(processNext)
    }
  }
  
  requestIdleCallback(processNext, { timeout: 2000 })
}
```

## 预取优先级

```typescript
interface PrefetchTask {
  url: string
  priority: 'high' | 'normal' | 'low'
  prefetch: () => Promise<any>
}

class PrefetchScheduler {
  private queue: PrefetchTask[] = []
  private running = 0
  private maxConcurrent = 2
  
  add(task: PrefetchTask) {
    this.queue.push(task)
    this.queue.sort((a, b) => {
      const priority = { high: 0, normal: 1, low: 2 }
      return priority[a.priority] - priority[b.priority]
    })
    
    this.process()
  }
  
  private async process() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!
      this.running++
      
      try {
        await task.prefetch()
      } catch (e) {
        console.warn(`Prefetch failed for ${task.url}`, e)
      } finally {
        this.running--
        this.process()
      }
    }
  }
}
```

## 智能预取

基于用户行为预测：

```typescript
interface UserBehavior {
  visitHistory: string[]
  clickPatterns: Map<string, string[]>  // 当前页 -> 下一页
}

class SmartPrefetcher {
  private behavior: UserBehavior = {
    visitHistory: [],
    clickPatterns: new Map()
  }
  
  recordVisit(path: string) {
    const previous = this.behavior.visitHistory[this.behavior.visitHistory.length - 1]
    
    if (previous) {
      // 记录转换模式
      const patterns = this.behavior.clickPatterns.get(previous) || []
      patterns.push(path)
      this.behavior.clickPatterns.set(previous, patterns)
    }
    
    this.behavior.visitHistory.push(path)
  }
  
  predictNext(currentPath: string): string[] {
    const patterns = this.behavior.clickPatterns.get(currentPath) || []
    
    // 统计频率
    const frequency = new Map<string, number>()
    for (const path of patterns) {
      frequency.set(path, (frequency.get(path) || 0) + 1)
    }
    
    // 返回最可能的下一页
    return [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([path]) => path)
  }
  
  prefetchPredicted(currentPath: string, prefetch: (url: string) => void) {
    const predictions = this.predictNext(currentPath)
    
    requestIdleCallback(() => {
      for (const path of predictions) {
        prefetch(path)
      }
    })
  }
}
```

## 资源预取

不只是数据，还包括 JS/CSS：

```typescript
function prefetchResources(paths: string[]) {
  for (const path of paths) {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = path
    document.head.appendChild(link)
  }
}

function preloadResources(paths: string[]) {
  for (const path of paths) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = path
    
    // 根据扩展名设置类型
    if (path.endsWith('.js')) {
      link.as = 'script'
    } else if (path.endsWith('.css')) {
      link.as = 'style'
    } else if (path.match(/\.(png|jpg|gif|webp)$/)) {
      link.as = 'image'
    }
    
    document.head.appendChild(link)
  }
}
```

## 组件预取

```typescript
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: Loading,
  errorComponent: Error,
  delay: 200
})

// 预取组件
function prefetchComponent(loader: () => Promise<any>) {
  requestIdleCallback(() => {
    loader()
  })
}

// 使用
prefetchComponent(() => import('./HeavyComponent.vue'))
```

## SSR 预取集成

```typescript
// 服务端：识别需要预取的链接
function extractPrefetchLinks(html: string): string[] {
  const links: string[] = []
  const regex = /href="([^"]+)"/g
  
  let match
  while ((match = regex.exec(html)) !== null) {
    const href = match[1]
    if (href.startsWith('/') && !href.startsWith('//')) {
      links.push(href)
    }
  }
  
  return links
}

// 注入预取提示
function injectPrefetchHints(html: string, links: string[]): string {
  const hints = links
    .slice(0, 5)  // 限制数量
    .map(link => `<link rel="prefetch" href="${link}">`)
    .join('\n')
  
  return html.replace('</head>', `${hints}\n</head>`)
}
```

## 预取指令

```typescript
const vPrefetch = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const url = binding.value || el.getAttribute('href')
    const strategy = binding.arg || 'hover'
    
    const { prefetch } = usePrefetch()
    
    switch (strategy) {
      case 'hover':
        el.addEventListener('mouseenter', () => prefetch(url), { once: true })
        break
      
      case 'visible':
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            prefetch(url)
            observer.disconnect()
          }
        })
        observer.observe(el)
        break
      
      case 'idle':
        requestIdleCallback(() => prefetch(url))
        break
    }
  }
}
```

```vue
<template>
  <!-- 悬停预取 -->
  <a href="/posts/1" v-prefetch:hover>Post 1</a>
  
  <!-- 可见时预取 -->
  <a href="/posts/2" v-prefetch:visible>Post 2</a>
  
  <!-- 空闲预取 -->
  <a href="/posts/3" v-prefetch:idle>Post 3</a>
</template>
```

## 缓存策略

```typescript
interface CacheConfig {
  maxAge: number      // 最大缓存时间
  maxSize: number     // 最大缓存条目数
  staleWhileRevalidate: boolean
}

class PrefetchCache {
  private cache = new Map<string, {
    data: any
    timestamp: number
  }>()
  
  private config: CacheConfig
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxAge: 60000,    // 1 分钟
      maxSize: 50,
      staleWhileRevalidate: true,
      ...config
    }
  }
  
  set(key: string, data: any) {
    // 检查大小限制
    if (this.cache.size >= this.config.maxSize) {
      // 移除最旧的
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
      this.cache.delete(oldest[0])
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  get(key: string): { data: any; stale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const age = Date.now() - entry.timestamp
    const stale = age > this.config.maxAge
    
    if (stale && !this.config.staleWhileRevalidate) {
      this.cache.delete(key)
      return null
    }
    
    return {
      data: entry.data,
      stale
    }
  }
}
```

## 完整示例

```typescript
// prefetch.ts
export function setupPrefetching() {
  const cache = new PrefetchCache({ maxAge: 120000 })
  const scheduler = new PrefetchScheduler()
  const smartPrefetcher = new SmartPrefetcher()
  
  // 预取函数
  async function prefetch(url: string, priority: 'high' | 'normal' | 'low' = 'normal') {
    const cached = cache.get(url)
    if (cached && !cached.stale) {
      return cached.data
    }
    
    return new Promise((resolve) => {
      scheduler.add({
        url,
        priority,
        prefetch: async () => {
          const data = await fetch(url).then(r => r.json())
          cache.set(url, data)
          resolve(data)
        }
      })
    })
  }
  
  // 设置悬停预取
  document.querySelectorAll('a[data-prefetch]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      prefetch((el as HTMLAnchorElement).href)
    }, { once: true })
  })
  
  // 视口预取
  setupViewportPrefetch(document.body, prefetch)
  
  // 智能预取
  const router = useRouter()
  router.afterEach((to) => {
    smartPrefetcher.recordVisit(to.path)
    smartPrefetcher.prefetchPredicted(to.path, prefetch)
  })
  
  return { prefetch, cache }
}
```

## 小结

数据预取策略：

1. **悬停预取**：用户意图最明确
2. **视口预取**：内容即将可见
3. **空闲预取**：利用空闲时间
4. **智能预取**：基于行为预测
5. **路由预取**：页面导航前预取

预取是提升感知性能的重要手段，让应用感觉更快更响应。但要注意不要过度预取，浪费带宽和服务器资源。
