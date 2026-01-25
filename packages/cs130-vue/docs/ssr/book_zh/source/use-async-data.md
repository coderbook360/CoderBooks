# useAsyncData 异步数据获取

`useAsyncData` 是 SSR 应用中处理异步数据获取的核心模式。它确保服务端和客户端获取相同的数据，并在水合时正确恢复状态。

## 核心挑战

SSR 中的异步数据面临几个问题：

1. 服务端需要等待数据获取完成再渲染
2. 客户端需要复用服务端已获取的数据
3. 避免客户端重复请求
4. 支持客户端导航时的数据刷新

## 基础实现

```typescript
interface AsyncDataOptions<T> {
  // 数据获取函数
  handler: () => Promise<T>
  
  // 唯一标识
  key: string
  
  // 默认值
  default?: () => T
  
  // 是否立即执行
  immediate?: boolean
  
  // 是否在客户端刷新
  refresh?: boolean
  
  // 缓存时间
  cacheTime?: number
}

interface AsyncDataReturn<T> {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
}

function useAsyncData<T>(
  options: AsyncDataOptions<T>
): AsyncDataReturn<T> {
  const { key, handler, default: defaultValue, immediate = true } = options
  
  const data = ref<T | null>(defaultValue?.() ?? null)
  const pending = ref(false)
  const error = ref<Error | null>(null)
  
  const nuxtApp = useNuxtApp()
  
  // 检查是否有服务端预取的数据
  if (nuxtApp.payload.data[key]) {
    data.value = nuxtApp.payload.data[key]
  } else if (immediate) {
    // 执行数据获取
    fetchData()
  }
  
  async function fetchData() {
    pending.value = true
    error.value = null
    
    try {
      const result = await handler()
      data.value = result
      
      // 服务端：保存到 payload
      if (import.meta.server) {
        nuxtApp.payload.data[key] = result
      }
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }
  
  return {
    data,
    pending,
    error,
    refresh: fetchData
  }
}
```

## 服务端等待

服务端需要等待所有异步数据：

```typescript
async function setupAsyncData(instance: ComponentInternalInstance) {
  const asyncDataPromises: Promise<any>[] = []
  
  // 收集组件的 asyncData
  if (instance.type.asyncData) {
    const promise = instance.type.asyncData({
      params: route.params,
      query: route.query
    })
    asyncDataPromises.push(promise)
  }
  
  // 执行 setup 中的 useAsyncData
  const setupResult = instance.type.setup?.()
  
  if (setupResult instanceof Promise) {
    asyncDataPromises.push(setupResult)
  }
  
  // 等待所有异步数据
  await Promise.all(asyncDataPromises)
}
```

## Payload 管理

```typescript
interface SSRPayload {
  data: Record<string, any>
  state: Record<string, any>
  _errors: Record<string, Error>
}

function createPayload(): SSRPayload {
  return {
    data: {},
    state: {},
    _errors: {}
  }
}

// 服务端：序列化 payload
function serializePayload(payload: SSRPayload): string {
  return `<script>window.__NUXT__=${devalue(payload)}</script>`
}

// 客户端：恢复 payload
function hydratePayload(): SSRPayload {
  return (window as any).__NUXT__ || createPayload()
}
```

## 数据去重

```typescript
const dataCache = new Map<string, { data: any; timestamp: number }>()

function useAsyncDataWithCache<T>(
  key: string,
  handler: () => Promise<T>,
  options: { cacheTime?: number } = {}
): AsyncDataReturn<T> {
  const { cacheTime = 30000 } = options  // 默认 30 秒
  
  // 检查缓存
  const cached = dataCache.get(key)
  if (cached && Date.now() - cached.timestamp < cacheTime) {
    return {
      data: ref(cached.data),
      pending: ref(false),
      error: ref(null),
      refresh: () => Promise.resolve()
    }
  }
  
  // 检查正在进行的请求（去重）
  const pending = pendingRequests.get(key)
  if (pending) {
    return pending
  }
  
  // 执行请求
  const result = useAsyncData({ key, handler })
  
  // 缓存结果
  watch(result.data, (value) => {
    if (value !== null) {
      dataCache.set(key, { data: value, timestamp: Date.now() })
    }
  })
  
  return result
}
```

## Suspense 集成

```typescript
function useAsyncDataWithSuspense<T>(
  key: string,
  handler: () => Promise<T>
): Ref<T> {
  const nuxtApp = useNuxtApp()
  
  // 服务端已有数据
  if (nuxtApp.payload.data[key]) {
    return ref(nuxtApp.payload.data[key])
  }
  
  // 抛出 Promise 让 Suspense 捕获
  const promise = handler().then(data => {
    nuxtApp.payload.data[key] = data
    return data
  })
  
  // 这会被 Suspense 捕获
  throw promise
}
```

## 错误处理

```typescript
function useAsyncDataWithErrorHandling<T>(
  options: AsyncDataOptions<T>
): AsyncDataReturn<T> {
  const result = useAsyncData(options)
  
  // 全局错误处理
  watch(result.error, (err) => {
    if (err) {
      // 上报错误
      reportError(err, {
        key: options.key,
        context: 'useAsyncData'
      })
      
      // 触发错误边界
      const nuxtApp = useNuxtApp()
      nuxtApp.hooks.callHook('app:error', err)
    }
  })
  
  return result
}
```

## 数据变换

```typescript
interface AsyncDataTransform<T, R> extends AsyncDataOptions<T> {
  transform: (data: T) => R
}

function useAsyncDataTransform<T, R>(
  options: AsyncDataTransform<T, R>
): AsyncDataReturn<R> {
  const { transform, ...rest } = options
  
  const result = useAsyncData(rest)
  
  const transformedData = computed(() => {
    if (result.data.value === null) return null
    return transform(result.data.value)
  })
  
  return {
    ...result,
    data: transformedData
  }
}
```

## 监听刷新

```typescript
function useAsyncDataWatch<T>(
  options: AsyncDataOptions<T>,
  watchSource: WatchSource
): AsyncDataReturn<T> {
  const result = useAsyncData({
    ...options,
    immediate: true
  })
  
  watch(watchSource, () => {
    result.refresh()
  })
  
  return result
}

// 使用
const route = useRoute()
const { data } = useAsyncDataWatch(
  {
    key: 'user',
    handler: () => fetchUser(route.params.id)
  },
  () => route.params.id
)
```

## 客户端刷新策略

```typescript
interface RefreshStrategy {
  // 页面可见时刷新
  onFocus: boolean
  
  // 定时刷新
  interval: number | false
  
  // 网络恢复时刷新
  onReconnect: boolean
}

function useAsyncDataWithRefresh<T>(
  options: AsyncDataOptions<T>,
  strategy: RefreshStrategy
): AsyncDataReturn<T> {
  const result = useAsyncData(options)
  
  onMounted(() => {
    // 页面可见时刷新
    if (strategy.onFocus) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          result.refresh()
        }
      })
    }
    
    // 定时刷新
    if (strategy.interval) {
      setInterval(result.refresh, strategy.interval)
    }
    
    // 网络恢复时刷新
    if (strategy.onReconnect) {
      window.addEventListener('online', result.refresh)
    }
  })
  
  return result
}
```

## 乐观更新

```typescript
function useAsyncDataOptimistic<T>(
  options: AsyncDataOptions<T>
): AsyncDataReturn<T> & { optimisticUpdate: (newData: T) => void } {
  const result = useAsyncData(options)
  let previousData: T | null = null
  
  function optimisticUpdate(newData: T) {
    // 保存当前数据
    previousData = result.data.value
    
    // 立即更新 UI
    result.data.value = newData
    
    // 发送请求
    updateOnServer(newData).catch(() => {
      // 失败时回滚
      result.data.value = previousData
    })
  }
  
  return {
    ...result,
    optimisticUpdate
  }
}
```

## 类型安全

```typescript
// 从 handler 推断类型
function useAsyncData<T>(
  key: string,
  handler: () => Promise<T>
): {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<Error | null>
}

// 带默认值时确保非空
function useAsyncData<T>(
  key: string,
  handler: () => Promise<T>,
  options: { default: () => T }
): {
  data: Ref<T>  // 非空
  pending: Ref<boolean>
  error: Ref<Error | null>
}
```

## 完整示例

```vue
<script setup>
// 基础用法
const { data: posts, pending, error, refresh } = useAsyncData(
  'posts',
  () => $fetch('/api/posts')
)

// 带参数
const route = useRoute()
const { data: user } = useAsyncData(
  `user-${route.params.id}`,
  () => $fetch(`/api/users/${route.params.id}`)
)

// 带转换
const { data: userNames } = useAsyncData(
  'users',
  () => $fetch('/api/users'),
  {
    transform: (users) => users.map(u => u.name)
  }
)

// 懒加载
const { data: comments, refresh: loadComments } = useAsyncData(
  'comments',
  () => $fetch('/api/comments'),
  { immediate: false }
)

// 手动触发
const loadMore = () => loadComments()
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <PostList :posts="posts" />
    <button @click="refresh">Refresh</button>
  </div>
</template>
```

## 小结

`useAsyncData` 解决了 SSR 中的异步数据获取问题：

1. **服务端等待**：确保数据获取完成再渲染
2. **Payload 传递**：将数据从服务端传到客户端
3. **避免重复请求**：水合时复用已有数据
4. **缓存管理**：智能缓存和去重
5. **类型安全**：完整的 TypeScript 支持

这是构建数据驱动的 SSR 应用的基础设施。
