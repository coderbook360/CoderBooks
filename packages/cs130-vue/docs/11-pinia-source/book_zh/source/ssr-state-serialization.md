# SSR 状态序列化

服务端状态需要序列化后传递到客户端。这一章分析序列化的实现细节。

## 序列化流程

```
服务端 State → JSON.stringify → HTML 内嵌 → 客户端解析 → 恢复 State
```

## 基本序列化

```typescript
// 服务端
const state = pinia.state.value
const serialized = JSON.stringify(state)

// 注入 HTML
const html = `
<script>
  window.__PINIA_STATE__ = ${serialized}
</script>
`
```

## 安全问题

直接使用 JSON.stringify 可能有 XSS 风险：

```typescript
// 危险：如果 state 包含 </script>
const state = { content: '</script><script>alert("xss")' }
JSON.stringify(state)
// {"content":"</script><script>alert(\"xss\")"}
// 会破坏 HTML 结构
```

## 安全序列化

使用转义：

```typescript
function safeSerialize(state: any): string {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022')
}

// 使用
const html = `
<script>
  window.__PINIA_STATE__ = ${safeSerialize(state)}
</script>
`
```

## devalue 库

Pinia 推荐使用 devalue 处理复杂类型：

```typescript
import { uneval } from 'devalue'

// 支持更多类型
const serialized = uneval(state)
// 支持 Date、RegExp、Map、Set 等
```

## 自定义序列化

处理特殊类型：

```typescript
function customSerialize(state: any): string {
  return JSON.stringify(state, (key, value) => {
    // Date
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }
    
    // Map
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) }
    }
    
    // Set
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) }
    }
    
    // 跳过函数
    if (typeof value === 'function') {
      return undefined
    }
    
    return value
  })
}
```

## 自定义反序列化

客户端恢复特殊类型：

```typescript
function customDeserialize(json: string): any {
  return JSON.parse(json, (key, value) => {
    if (value?.__type === 'Date') {
      return new Date(value.value)
    }
    
    if (value?.__type === 'Map') {
      return new Map(value.value)
    }
    
    if (value?.__type === 'Set') {
      return new Set(value.value)
    }
    
    return value
  })
}

// 客户端使用
if (window.__PINIA_STATE_RAW__) {
  pinia.state.value = customDeserialize(window.__PINIA_STATE_RAW__)
}
```

## 部分序列化

只序列化需要的 Store：

```typescript
function serializeStores(pinia: Pinia, storeIds: string[]): string {
  const partial: Record<string, any> = {}
  
  for (const id of storeIds) {
    if (pinia.state.value[id]) {
      partial[id] = pinia.state.value[id]
    }
  }
  
  return safeSerialize(partial)
}

// 只序列化特定 Store
const serialized = serializeStores(pinia, ['user', 'product'])
```

## 字段过滤

排除不需要的字段：

```typescript
function serializeWithFilter(
  state: any,
  filter: (key: string, value: any) => boolean
): string {
  return JSON.stringify(state, (key, value) => {
    if (key && !filter(key, value)) {
      return undefined
    }
    return value
  })
}

// 使用
const serialized = serializeWithFilter(state, (key, value) => {
  // 排除临时数据
  if (key.startsWith('_')) return false
  // 排除敏感数据
  if (['token', 'password'].includes(key)) return false
  return true
})
```

## 大状态处理

状态过大时的处理策略：

```typescript
function compressState(state: any): string {
  const json = JSON.stringify(state)
  
  // 如果太大，考虑压缩
  if (json.length > 100000) {
    console.warn('SSR state is large:', json.length, 'bytes')
    // 可以使用 lz-string 等压缩
  }
  
  return json
}
```

## 分离静态数据

静态数据不需要序列化：

```typescript
const useProductStore = defineStore('product', {
  state: () => ({
    // 动态数据 - 需要序列化
    selectedId: null,
    cart: [],
    
    // 静态数据 - 不需要序列化
    categories: STATIC_CATEGORIES  // 来自常量
  })
})

// 序列化时排除
function serializeExcludeStatic(state: any): string {
  return JSON.stringify(state, (key, value) => {
    if (['categories', 'constants'].includes(key)) {
      return undefined
    }
    return value
  })
}
```

## 懒加载状态

某些状态可以延迟加载：

```typescript
const useHeavyStore = defineStore('heavy', {
  state: () => ({
    // 首屏需要
    summary: null,
    
    // 可以延迟加载
    details: null,
    history: []
  })
})

// 服务端只预取必要数据
onServerPrefetch(async () => {
  await store.fetchSummary()
  // 不预取 details 和 history
})

// 客户端按需加载
onMounted(async () => {
  await store.fetchDetails()
  await store.fetchHistory()
})
```

## 状态版本

处理客户端缓存的旧状态：

```typescript
interface SerializedState {
  version: number
  timestamp: number
  data: any
}

function serialize(state: any): string {
  const wrapped: SerializedState = {
    version: STATE_VERSION,
    timestamp: Date.now(),
    data: state
  }
  return JSON.stringify(wrapped)
}

function deserialize(json: string, currentVersion: number): any {
  const wrapped = JSON.parse(json) as SerializedState
  
  // 版本检查
  if (wrapped.version !== currentVersion) {
    console.warn('State version mismatch, using fresh state')
    return null
  }
  
  // 过期检查
  if (Date.now() - wrapped.timestamp > MAX_AGE) {
    console.warn('State expired')
    return null
  }
  
  return wrapped.data
}
```

## 错误处理

序列化/反序列化错误处理：

```typescript
// 服务端
function safeSerialize(state: any): string {
  try {
    return JSON.stringify(state)
  } catch (error) {
    console.error('State serialization failed:', error)
    // 返回空对象
    return '{}'
  }
}

// 客户端
function safeDeserialize(json: string): any {
  try {
    return JSON.parse(json)
  } catch (error) {
    console.error('State deserialization failed:', error)
    return {}
  }
}

// 恢复状态
if (window.__PINIA_STATE__) {
  try {
    pinia.state.value = window.__PINIA_STATE__
  } catch (error) {
    console.error('State hydration failed:', error)
    // 继续使用默认状态
  }
}
```

## 循环引用检测

```typescript
function hasCircularReference(obj: any, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false
  }
  
  if (seen.has(obj)) {
    return true
  }
  
  seen.add(obj)
  
  for (const value of Object.values(obj)) {
    if (hasCircularReference(value, seen)) {
      return true
    }
  }
  
  return false
}

// 序列化前检查
if (hasCircularReference(state)) {
  console.error('State has circular reference, cannot serialize')
  return '{}'
}
```

## 性能优化

减少序列化开销：

```typescript
// 缓存序列化结果
let cachedState: string | null = null
let lastStateSnapshot: any = null

function getSerializedState(pinia: Pinia): string {
  const currentState = pinia.state.value
  
  // 简单比较，如果没变就用缓存
  if (currentState === lastStateSnapshot && cachedState) {
    return cachedState
  }
  
  lastStateSnapshot = currentState
  cachedState = JSON.stringify(currentState)
  return cachedState
}
```

## 与框架集成

Nuxt 的处理方式：

```typescript
// Nuxt 自动处理
// 使用 useState 或 Pinia 时自动序列化

// 可以自定义序列化
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:rendered', () => {
    // 自定义处理
  })
})
```

## 调试技巧

```typescript
// 开发环境输出状态大小
if (__DEV__) {
  const serialized = JSON.stringify(pinia.state.value)
  console.log('SSR state size:', (serialized.length / 1024).toFixed(2), 'KB')
  
  // 按 Store 分析
  for (const [id, state] of Object.entries(pinia.state.value)) {
    const size = JSON.stringify(state).length
    console.log(`  ${id}: ${(size / 1024).toFixed(2)} KB`)
  }
}
```

下一章我们将分析 SSR 状态水合的过程。
