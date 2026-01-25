# 服务端数据预取

本章分析 Vue SSR 中服务端数据预取的实现模式。

## 数据预取概述

SSR 应用通常需要在渲染前获取数据。Vue 提供了多种数据预取模式。

```typescript
// 基本数据预取模式
async function renderPage(url: string): Promise<string> {
  // 1. 创建应用实例
  const app = createSSRApp(App)
  const router = createRouter()
  const pinia = createPinia()
  
  app.use(router)
  app.use(pinia)
  
  // 2. 导航到目标路由
  await router.push(url)
  await router.isReady()
  
  // 3. 执行数据预取
  await prefetchData(router.currentRoute.value, pinia)
  
  // 4. 渲染
  const html = await renderToString(app)
  
  // 5. 序列化状态
  const state = JSON.stringify(pinia.state.value)
  
  return `
    ${html}
    <script>window.__PINIA_STATE__ = ${state}</script>
  `
}
```

## 组件级数据预取

Vue 组件可以声明自己的数据需求。

```typescript
/**
 * 定义组件数据预取
 */
interface SSRDataFetchOptions<T> {
  /**
   * 数据获取函数
   */
  fetch: (context: SSRContext) => Promise<T>
  
  /**
   * 缓存键
   */
  key?: string | ((context: SSRContext) => string)
  
  /**
   * 缓存时间（毫秒）
   */
  ttl?: number
}

/**
 * 组件选项扩展
 */
declare module '@vue/runtime-core' {
  interface ComponentCustomOptions {
    ssrPrefetch?: (context: SSRContext) => Promise<void>
    asyncData?: SSRDataFetchOptions<any>
  }
}

/**
 * 执行组件数据预取
 */
async function prefetchComponentData(
  component: Component,
  instance: ComponentInternalInstance,
  context: SSRContext
): Promise<void> {
  // 检查 ssrPrefetch 钩子
  if (component.ssrPrefetch) {
    await component.ssrPrefetch.call(instance.proxy, context)
  }
  
  // 检查 asyncData 选项
  if (component.asyncData) {
    const { fetch, key } = component.asyncData
    
    const cacheKey = typeof key === 'function' 
      ? key(context) 
      : key || component.name
    
    if (cacheKey && context.cache?.has(cacheKey)) {
      // 使用缓存
      instance.data = context.cache.get(cacheKey)
    } else {
      // 获取数据
      const data = await fetch(context)
      instance.data = data
      
      if (cacheKey) {
        context.cache?.set(cacheKey, data)
      }
    }
  }
}
```

## 路由级数据预取

根据路由配置获取数据。

```typescript
/**
 * 路由数据预取配置
 */
interface RouteMeta {
  prefetch?: (route: RouteLocationNormalized, context: SSRContext) => Promise<void>
}

/**
 * 执行路由数据预取
 */
async function prefetchRouteData(
  route: RouteLocationNormalized,
  context: SSRContext
): Promise<void> {
  const matchedComponents = route.matched
    .map(record => record.components?.default)
    .filter(Boolean)
  
  // 并行执行所有组件的数据预取
  await Promise.all(
    matchedComponents.map(async (component: any) => {
      // 组件级 prefetch
      if (component.ssrPrefetch) {
        await component.ssrPrefetch(context)
      }
      
      // 检查路由 meta
      const meta = route.meta as RouteMeta
      if (meta.prefetch) {
        await meta.prefetch(route, context)
      }
    })
  )
}
```

## useAsyncData Composable

提供声明式的数据获取。

```typescript
/**
 * 异步数据 Composable
 */
export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { immediate?: boolean } = {}
): {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
} {
  const data = ref<T | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)
  
  const instance = getCurrentInstance()
  const isSSR = instance?.vnode.isSSR
  
  async function fetch(): Promise<void> {
    pending.value = true
    error.value = null
    
    try {
      data.value = await fetcher()
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }
  
  if (isSSR) {
    // SSR: 注册到 ssrContext
    const ssrContext = useSSRContext()
    
    if (ssrContext) {
      // 检查缓存
      if (ssrContext._data?.[key]) {
        data.value = ssrContext._data[key]
      } else {
        // 添加到待获取列表
        ssrContext._asyncDataPromises = ssrContext._asyncDataPromises || []
        ssrContext._asyncDataPromises.push(
          fetch().then(() => {
            ssrContext._data = ssrContext._data || {}
            ssrContext._data[key] = data.value
          })
        )
      }
    }
  } else {
    // 客户端: 从 SSR 状态恢复
    const ssrState = (window as any).__SSR_DATA__
    
    if (ssrState?.[key]) {
      data.value = ssrState[key]
    } else if (options.immediate !== false) {
      fetch()
    }
  }
  
  return {
    data,
    pending,
    error,
    refresh: fetch
  }
}
```

## 数据缓存

服务端数据缓存可以显著提升性能。

```typescript
/**
 * SSR 数据缓存
 */
class SSRDataCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private defaultTTL: number
  
  constructor(defaultTTL = 60000) {
    this.defaultTTL = defaultTTL
  }
  
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) return undefined
    
    // 检查过期
    if (Date.now() > entry.timestamp + this.defaultTTL) {
      this.cache.delete(key)
      return undefined
    }
    
    return entry.data as T
  }
  
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined
  }
  
  invalidate(pattern: string | RegExp): void {
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      } else {
        if (pattern.test(key)) {
          this.cache.delete(key)
        }
      }
    }
  }
}

// 使用
const dataCache = new SSRDataCache()

const context: SSRContext = {
  cache: dataCache
}
```

## 状态序列化

将预取的数据传递给客户端。

```typescript
/**
 * 序列化 SSR 数据
 */
function serializeSSRData(context: SSRContext): string {
  const data: Record<string, any> = {}
  
  // 收集 asyncData
  if (context._data) {
    Object.assign(data, context._data)
  }
  
  // 收集 Pinia 状态
  if (context.pinia) {
    data.__pinia = context.pinia.state.value
  }
  
  // 安全序列化
  const serialized = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  
  return `<script>window.__SSR_DATA__ = ${serialized}</script>`
}
```

## 小结

本章分析了服务端数据预取：

1. **组件级预取**：ssrPrefetch 钩子
2. **路由级预取**：基于路由配置
3. **useAsyncData**：声明式数据获取
4. **数据缓存**：提升重复请求性能
5. **状态序列化**：传递给客户端

正确的数据预取是 SSR 应用性能的关键。
