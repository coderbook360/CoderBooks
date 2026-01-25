# stateSerialization 状态序列化

状态序列化是 SSR 的关键环节，负责将服务端的应用状态传递到客户端。正确的序列化确保水合时状态一致，避免闪烁和不匹配。

## 序列化挑战

服务端状态序列化面临几个问题：

1. **循环引用**：对象之间可能相互引用
2. **特殊类型**：Date、Map、Set、RegExp 等
3. **函数和符号**：无法序列化
4. **XSS 安全**：需要转义危险字符
5. **体积优化**：减少传输大小

## 基础序列化

```typescript
function serializeState(state: any): string {
  try {
    return JSON.stringify(state)
  } catch (e) {
    console.error('State serialization failed:', e)
    return '{}'
  }
}

function deserializeState(str: string): any {
  try {
    return JSON.parse(str)
  } catch (e) {
    console.error('State deserialization failed:', e)
    return {}
  }
}
```

## 高级序列化（devalue）

处理复杂类型：

```typescript
function devalue(value: any): string {
  const counts = new Map<any, number>()
  const keys = new Map<any, string>()
  
  // 第一遍：统计引用次数
  function count(val: any) {
    if (typeof val === 'object' && val !== null) {
      if (counts.has(val)) {
        counts.set(val, counts.get(val)! + 1)
      } else {
        counts.set(val, 1)
        
        if (Array.isArray(val)) {
          val.forEach(count)
        } else if (val instanceof Map) {
          val.forEach((v, k) => { count(k); count(v) })
        } else if (val instanceof Set) {
          val.forEach(count)
        } else if (val instanceof Date) {
          // Date 不需要递归
        } else {
          Object.values(val).forEach(count)
        }
      }
    }
  }
  
  count(value)
  
  // 为重复引用分配 key
  let keyCounter = 0
  counts.forEach((count, val) => {
    if (count > 1) {
      keys.set(val, `$${keyCounter++}`)
    }
  })
  
  // 第二遍：序列化
  const refs: string[] = []
  
  function stringify(val: any): string {
    if (val === undefined) return 'undefined'
    if (val === null) return 'null'
    if (val !== val) return 'NaN'  // NaN
    if (val === Infinity) return 'Infinity'
    if (val === -Infinity) return '-Infinity'
    
    const type = typeof val
    
    if (type === 'boolean' || type === 'number') {
      return String(val)
    }
    
    if (type === 'string') {
      return escapeString(val)
    }
    
    if (type === 'bigint') {
      return `BigInt("${val}")`
    }
    
    // 检查是否是重复引用
    if (keys.has(val)) {
      const key = keys.get(val)!
      if (refs.includes(key)) {
        return key
      }
    }
    
    if (val instanceof Date) {
      return `new Date(${val.getTime()})`
    }
    
    if (val instanceof RegExp) {
      return `new RegExp(${escapeString(val.source)}, "${val.flags}")`
    }
    
    if (val instanceof Map) {
      return `new Map([${
        [...val.entries()]
          .map(([k, v]) => `[${stringify(k)},${stringify(v)}]`)
          .join(',')
      }])`
    }
    
    if (val instanceof Set) {
      return `new Set([${
        [...val.values()].map(stringify).join(',')
      }])`
    }
    
    if (Array.isArray(val)) {
      const key = keys.get(val)
      const result = `[${val.map(stringify).join(',')}]`
      
      if (key) {
        refs.push(key)
        return `(${key}=${result})`
      }
      return result
    }
    
    // 普通对象
    const key = keys.get(val)
    const props = Object.entries(val)
      .map(([k, v]) => `${escapeKey(k)}:${stringify(v)}`)
      .join(',')
    const result = `{${props}}`
    
    if (key) {
      refs.push(key)
      return `(${key}=${result})`
    }
    return result
  }
  
  return `(function(){return ${stringify(value)}})()`
}

function escapeString(str: string): string {
  return JSON.stringify(str)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/<\//g, '<\\/')  // XSS 保护
}

function escapeKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
    ? key
    : escapeString(key)
}
```

## XSS 防护

```typescript
function sanitizeForScript(code: string): string {
  return code
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022')
}

function injectState(state: any): string {
  const serialized = devalue(state)
  const sanitized = sanitizeForScript(serialized)
  
  return `<script>window.__INITIAL_STATE__=${sanitized}</script>`
}
```

## 分块序列化

大状态分块传输：

```typescript
interface ChunkedState {
  chunks: Record<string, any>
  order: string[]
}

function serializeChunked(state: Record<string, any>): ChunkedState {
  const chunks: Record<string, any> = {}
  const order: string[] = []
  
  for (const [key, value] of Object.entries(state)) {
    chunks[key] = value
    order.push(key)
  }
  
  return { chunks, order }
}

function injectChunkedState(state: ChunkedState): string {
  let html = '<script>window.__STATE_CHUNKS__={};</script>\n'
  
  for (const key of state.order) {
    const chunk = devalue(state.chunks[key])
    html += `<script>window.__STATE_CHUNKS__["${key}"]=${chunk};</script>\n`
  }
  
  html += '<script>window.__INITIAL_STATE__=window.__STATE_CHUNKS__;</script>'
  
  return html
}
```

## 流式状态注入

配合流式 SSR：

```typescript
function createStreamingStateInjector() {
  const pending = new Map<string, any>()
  let injected = false
  
  return {
    // 添加待注入的状态
    addState(key: string, value: any) {
      pending.set(key, value)
    },
    
    // 生成注入脚本
    flush(): string {
      if (pending.size === 0) return ''
      
      let script = ''
      
      if (!injected) {
        script += '<script>window.__STREAMING_STATE__={};</script>\n'
        injected = true
      }
      
      for (const [key, value] of pending.entries()) {
        script += `<script>window.__STREAMING_STATE__["${key}"]=${devalue(value)};</script>\n`
      }
      
      pending.clear()
      
      return script
    }
  }
}
```

## Pinia 状态序列化

```typescript
import { createPinia, type Pinia } from 'pinia'

function serializePiniaState(pinia: Pinia): string {
  const state: Record<string, any> = {}
  
  pinia._s.forEach((store, id) => {
    state[id] = store.$state
  })
  
  return devalue(state)
}

function hydratePiniaState(pinia: Pinia, serializedState: string) {
  const state = eval(serializedState)
  
  for (const [id, storeState] of Object.entries(state)) {
    const store = pinia._s.get(id)
    if (store) {
      store.$patch(storeState as any)
    }
  }
}

// 服务端
const pinia = createPinia()
const app = createSSRApp(App)
app.use(pinia)

const html = await renderToString(app)
const stateScript = `<script>window.__pinia=${serializePiniaState(pinia)}</script>`

// 客户端
const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

if (window.__pinia) {
  hydratePiniaState(pinia, window.__pinia)
}
```

## 敏感数据过滤

```typescript
interface SanitizeOptions {
  // 要移除的字段
  removeFields: string[]
  
  // 要脱敏的字段
  maskFields: string[]
  
  // 自定义处理器
  processors: Record<string, (value: any) => any>
}

function sanitizeState(
  state: Record<string, any>,
  options: SanitizeOptions
): Record<string, any> {
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(state)) {
    // 移除敏感字段
    if (options.removeFields.includes(key)) {
      continue
    }
    
    // 脱敏处理
    if (options.maskFields.includes(key)) {
      result[key] = maskValue(value)
      continue
    }
    
    // 自定义处理
    if (options.processors[key]) {
      result[key] = options.processors[key](value)
      continue
    }
    
    // 递归处理对象
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeState(value, options)
    } else {
      result[key] = value
    }
  }
  
  return result
}

function maskValue(value: any): any {
  if (typeof value === 'string') {
    if (value.length <= 4) return '****'
    return value.slice(0, 2) + '***' + value.slice(-2)
  }
  return '***'
}
```

## 压缩优化

```typescript
// 使用短键名
function compressKeys(state: any, keyMap: Map<string, string>): any {
  if (typeof state !== 'object' || state === null) {
    return state
  }
  
  if (Array.isArray(state)) {
    return state.map(item => compressKeys(item, keyMap))
  }
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(state)) {
    const shortKey = keyMap.get(key) || key
    result[shortKey] = compressKeys(value, keyMap)
  }
  
  return result
}

// 生成键映射
function generateKeyMap(state: any): Map<string, string> {
  const keyFrequency = new Map<string, number>()
  
  function countKeys(obj: any) {
    if (typeof obj !== 'object' || obj === null) return
    
    for (const key of Object.keys(obj)) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1)
      countKeys(obj[key])
    }
  }
  
  countKeys(state)
  
  // 按频率排序，高频键用短名
  const sorted = [...keyFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
  
  const keyMap = new Map<string, string>()
  let counter = 0
  
  for (const [key, frequency] of sorted) {
    if (frequency > 1 && key.length > 2) {
      keyMap.set(key, `_${counter++}`)
    }
  }
  
  return keyMap
}
```

## 完整序列化流程

```typescript
interface SerializationContext {
  state: Record<string, any>
  keyMap?: Map<string, string>
  sanitizeOptions?: SanitizeOptions
}

function createStateSerializer(ctx: SerializationContext) {
  let state = ctx.state
  
  // 1. 过滤敏感数据
  if (ctx.sanitizeOptions) {
    state = sanitizeState(state, ctx.sanitizeOptions)
  }
  
  // 2. 压缩键名
  let keyMapScript = ''
  if (ctx.keyMap) {
    state = compressKeys(state, ctx.keyMap)
    
    // 客户端需要反向映射
    const reverseMap = Object.fromEntries(
      [...ctx.keyMap.entries()].map(([k, v]) => [v, k])
    )
    keyMapScript = `window.__KEY_MAP__=${JSON.stringify(reverseMap)};`
  }
  
  // 3. 序列化
  const serialized = devalue(state)
  
  // 4. 生成脚本
  return `<script>${keyMapScript}window.__INITIAL_STATE__=${serialized}</script>`
}

// 客户端恢复
function hydrateState(): Record<string, any> {
  let state = (window as any).__INITIAL_STATE__ || {}
  
  // 恢复键名
  const keyMap = (window as any).__KEY_MAP__
  if (keyMap) {
    state = decompressKeys(state, keyMap)
  }
  
  return state
}

function decompressKeys(state: any, keyMap: Record<string, string>): any {
  if (typeof state !== 'object' || state === null) {
    return state
  }
  
  if (Array.isArray(state)) {
    return state.map(item => decompressKeys(item, keyMap))
  }
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(state)) {
    const originalKey = keyMap[key] || key
    result[originalKey] = decompressKeys(value, keyMap)
  }
  
  return result
}
```

## 调试支持

```typescript
function createDebugSerializer() {
  return {
    serialize(state: any): string {
      // 开发环境：可读格式
      if (__DEV__) {
        return `<script>
          console.log('[SSR State]', ${JSON.stringify(state, null, 2)});
          window.__INITIAL_STATE__ = ${devalue(state)};
        </script>`
      }
      
      // 生产环境：压缩格式
      return `<script>window.__INITIAL_STATE__=${devalue(state)}</script>`
    },
    
    validate(serverState: any, clientState: any): string[] {
      const differences: string[] = []
      
      function compare(path: string, server: any, client: any) {
        if (typeof server !== typeof client) {
          differences.push(`${path}: type mismatch (server: ${typeof server}, client: ${typeof client})`)
          return
        }
        
        if (typeof server === 'object' && server !== null) {
          for (const key of new Set([...Object.keys(server), ...Object.keys(client)])) {
            compare(`${path}.${key}`, server[key], client[key])
          }
        } else if (server !== client) {
          differences.push(`${path}: value mismatch (server: ${server}, client: ${client})`)
        }
      }
      
      compare('root', serverState, clientState)
      
      return differences
    }
  }
}
```

## 小结

状态序列化的关键点：

1. **完整性**：支持各种 JavaScript 类型
2. **安全性**：防止 XSS 攻击
3. **效率**：处理循环引用，压缩体积
4. **隐私**：过滤敏感数据
5. **调试**：提供验证和调试支持

正确的状态序列化确保了 SSR 应用的数据一致性，是构建可靠 SSR 应用的基础。
