# 状态传递

SSR 应用需要在服务端获取数据渲染页面，然后将状态传递给客户端，避免客户端重复请求。状态传递是 SSR 数据流的关键环节。

## 状态传递原理

```typescript
// 状态传递流程：
//
// 1. 服务端获取数据
// 2. 使用数据渲染 HTML
// 3. 序列化状态嵌入 HTML
// 4. 客户端解析状态
// 5. 使用状态初始化应用
//
// <script>window.__INITIAL_STATE__ = {...}</script>
```

## 状态容器

```typescript
// src/shared/state.ts

export interface SSRState {
  // 页面数据
  data: Record<string, any>
  // 组件状态
  components: Map<string, Record<string, any>>
  // 全局状态（如 store）
  store: Record<string, any>
  // 环境配置
  config: Record<string, any>
}

export function createSSRState(): SSRState {
  return {
    data: {},
    components: new Map(),
    store: {},
    config: {}
  }
}

// 服务端上下文
export interface SSRContext {
  state: SSRState
  teleports: Map<string, string>
  head: string[]
}

export function createSSRContext(): SSRContext {
  return {
    state: createSSRState(),
    teleports: new Map(),
    head: []
  }
}
```

## 服务端收集状态

```typescript
// src/server/state.ts

// 当前请求上下文
let currentContext: SSRContext | null = null

export function setSSRContext(ctx: SSRContext) {
  currentContext = ctx
}

export function getSSRContext(): SSRContext {
  if (!currentContext) {
    throw new Error('SSR context not available')
  }
  return currentContext
}

// 收集页面数据
export function collectData(key: string, data: any) {
  const ctx = getSSRContext()
  ctx.state.data[key] = data
}

// 收集组件状态
export function collectComponentState(
  componentId: string,
  state: Record<string, any>
) {
  const ctx = getSSRContext()
  ctx.state.components.set(componentId, state)
}

// 收集 store 状态
export function collectStoreState(state: Record<string, any>) {
  const ctx = getSSRContext()
  ctx.state.store = state
}
```

## 状态序列化

```typescript
// src/shared/serialize.ts

export function serializeState(state: SSRState): string {
  // 处理特殊类型
  const serialized = {
    data: state.data,
    components: Object.fromEntries(state.components),
    store: state.store,
    config: state.config
  }
  
  // 安全序列化
  return serialize(serialized)
}

// 安全的 JSON 序列化
function serialize(data: any): string {
  const json = JSON.stringify(data, replacer)
  
  // 转义危险字符，防止 XSS
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

// 处理特殊类型
function replacer(key: string, value: any): any {
  if (value === undefined) {
    return { __type: 'undefined' }
  }
  
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() }
  }
  
  if (value instanceof Map) {
    return {
      __type: 'Map',
      value: Array.from(value.entries())
    }
  }
  
  if (value instanceof Set) {
    return {
      __type: 'Set',
      value: Array.from(value.values())
    }
  }
  
  if (value instanceof RegExp) {
    return {
      __type: 'RegExp',
      source: value.source,
      flags: value.flags
    }
  }
  
  if (typeof value === 'bigint') {
    return { __type: 'BigInt', value: value.toString() }
  }
  
  return value
}
```

## 嵌入 HTML

```typescript
// src/server/inject.ts

export function injectState(html: string, state: SSRState): string {
  const serialized = serializeState(state)
  
  // 创建脚本标签
  const script = `<script>window.__INITIAL_STATE__=${serialized}</script>`
  
  // 注入到 </body> 前或 </head> 后
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`)
  }
  
  if (html.includes('</head>')) {
    return html.replace('</head>', `</head>${script}`)
  }
  
  // 追加到末尾
  return html + script
}

// 完整的 SSR 渲染
export async function renderToHTML(
  app: Component,
  context: SSRContext
): Promise<string> {
  setSSRContext(context)
  
  try {
    // 渲染应用
    const appHtml = await renderToString(h(app, null, null))
    
    // 组装完整 HTML
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${context.head.join('\n  ')}
</head>
<body>
  <div id="app" data-server-rendered="true">${appHtml}</div>
</body>
</html>
    `.trim()
    
    // 注入状态
    html = injectState(html, context.state)
    
    // 处理 teleport
    for (const [selector, content] of context.teleports) {
      html = html.replace(
        new RegExp(`<${selector}[^>]*>`, 'i'),
        (match) => match + content
      )
    }
    
    return html
  } finally {
    setSSRContext(null as any)
  }
}
```

## 客户端恢复状态

```typescript
// src/runtime/hydrate-state.ts

export function deserializeState(serialized: string): SSRState {
  const raw = JSON.parse(serialized, reviver)
  
  return {
    data: raw.data || {},
    components: new Map(Object.entries(raw.components || {})),
    store: raw.store || {},
    config: raw.config || {}
  }
}

// 恢复特殊类型
function reviver(key: string, value: any): any {
  if (value && typeof value === 'object' && '__type' in value) {
    switch (value.__type) {
      case 'undefined':
        return undefined
      case 'Date':
        return new Date(value.value)
      case 'Map':
        return new Map(value.value)
      case 'Set':
        return new Set(value.value)
      case 'RegExp':
        return new RegExp(value.source, value.flags)
      case 'BigInt':
        return BigInt(value.value)
    }
  }
  return value
}

// 从 window 获取初始状态
export function getInitialState(): SSRState | null {
  if (typeof window === 'undefined') return null
  
  const raw = (window as any).__INITIAL_STATE__
  if (!raw) return null
  
  // 如果已经是对象（非字符串）
  if (typeof raw === 'object') {
    return {
      data: raw.data || {},
      components: new Map(Object.entries(raw.components || {})),
      store: raw.store || {},
      config: raw.config || {}
    }
  }
  
  return deserializeState(raw)
}
```

## useSSRData Hook

```typescript
// src/runtime/use-ssr-data.ts

let initialState: SSRState | null = null

// 初始化
export function initSSRState() {
  if (typeof window !== 'undefined') {
    initialState = getInitialState()
  }
}

// 获取 SSR 数据
export function useSSRData<T>(
  key: string,
  fetcher: () => Promise<T>
): { data: T | null; pending: boolean; error: Error | null } {
  // 检查是否有 SSR 数据
  if (initialState?.data[key] !== undefined) {
    return {
      data: initialState.data[key] as T,
      pending: false,
      error: null
    }
  }
  
  // 服务端：执行 fetcher
  if (typeof window === 'undefined') {
    const ctx = getSSRContext()
    
    // 同步返回占位，实际通过 async 处理
    let data: T | null = null
    let error: Error | null = null
    
    // 注册异步操作
    const promise = fetcher()
      .then(result => {
        data = result
        ctx.state.data[key] = result
      })
      .catch(err => {
        error = err
      })
    
    // 返回 pending 状态
    return { data, pending: true, error }
  }
  
  // 客户端：无 SSR 数据时需要重新获取
  return { data: null, pending: true, error: null }
}

// 清理已使用的 SSR 数据（防止内存泄漏）
export function consumeSSRData(key: string) {
  if (initialState) {
    delete initialState.data[key]
  }
}
```

## Store 状态传递

```typescript
// src/runtime/store.ts

export interface Store<S = any> {
  state: S
  getState(): S
  setState(partial: Partial<S>): void
}

export function createStore<S extends Record<string, any>>(
  initialState: S
): Store<S> {
  let state = initialState
  
  return {
    get state() {
      return state
    },
    getState() {
      return state
    },
    setState(partial) {
      state = { ...state, ...partial }
    }
  }
}

// 服务端创建 store
export function createServerStore<S extends Record<string, any>>(
  initialState: S,
  context: SSRContext
): Store<S> {
  const store = createStore(initialState)
  
  // 渲染后收集状态
  const originalGetState = store.getState
  store.getState = () => {
    const state = originalGetState()
    context.state.store = state
    return state
  }
  
  return store
}

// 客户端恢复 store
export function hydrateStore<S extends Record<string, any>>(
  createFn: (initial: S) => Store<S>,
  fallback: S
): Store<S> {
  const ssrState = getInitialState()
  const initial = (ssrState?.store as S) || fallback
  
  return createFn(initial)
}
```

## 组件级状态传递

```typescript
// 每个组件的状态独立管理
let componentIdCounter = 0

function generateComponentId(): string {
  return `comp_${++componentIdCounter}`
}

// 组件内收集状态
export function useComponentState<T extends Record<string, any>>(
  initial: T
): T {
  const componentId = generateComponentId()
  
  if (typeof window === 'undefined') {
    // 服务端：收集状态
    const ctx = getSSRContext()
    ctx.state.components.set(componentId, initial)
    return initial
  }
  
  // 客户端：恢复状态
  const ssrState = getInitialState()
  const saved = ssrState?.components.get(componentId)
  
  if (saved) {
    // 清理已使用的状态
    ssrState?.components.delete(componentId)
    return saved as T
  }
  
  return initial
}
```

## 完整示例

```typescript
// 服务端
async function handleRequest(req: Request): Promise<Response> {
  const context = createSSRContext()
  
  // 获取数据
  const posts = await fetchPosts()
  context.state.data.posts = posts
  
  // 创建 store
  const store = createServerStore({ user: null, theme: 'light' }, context)
  
  // 认证
  const user = await authenticate(req)
  if (user) {
    store.setState({ user })
  }
  
  // 渲染
  const html = await renderToHTML(App, context)
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

// 客户端入口
import { createSSRApp } from './runtime'
import { initSSRState, hydrateStore } from './runtime/store'
import App from './App'

// 初始化 SSR 状态
initSSRState()

// 恢复 store
const store = hydrateStore(createStore, { user: null, theme: 'light' })

// 挂载应用
const app = createSSRApp(App)
app.provide('store', store)
app.mount('#app')

// 组件中使用
const PostList: Component = {
  setup() {
    const { data: posts } = useSSRData('posts', () => fetchPosts())
    
    return () => h('ul', null, 
      posts?.map(post => 
        h('li', { key: post.id }, post.title)
      )
    )
  }
}
```

## 安全考虑

```typescript
// 过滤敏感数据
function sanitizeState(state: SSRState): SSRState {
  const clone = JSON.parse(JSON.stringify(state))
  
  // 移除敏感字段
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey']
  
  function removeSensitive(obj: any) {
    if (typeof obj !== 'object' || obj === null) return
    
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        delete obj[key]
      } else {
        removeSensitive(obj[key])
      }
    }
  }
  
  removeSensitive(clone)
  return clone
}

// 验证状态完整性
function validateState(state: any): state is SSRState {
  return (
    state &&
    typeof state === 'object' &&
    'data' in state &&
    'store' in state
  )
}
```

## 性能优化

```typescript
// 1. 按需传递状态
function selectState(state: SSRState, keys: string[]): Partial<SSRState> {
  return {
    data: pick(state.data, keys),
    store: state.store,
    config: state.config,
    components: state.components
  }
}

function pick<T>(obj: T, keys: string[]): Partial<T> {
  const result: any = {}
  for (const key of keys) {
    if (key in (obj as any)) {
      result[key] = (obj as any)[key]
    }
  }
  return result
}

// 2. 压缩状态
import { compress, decompress } from 'lz-string'

function compressState(state: SSRState): string {
  const json = serializeState(state)
  return compress(json)
}

function decompressState(compressed: string): SSRState {
  const json = decompress(compressed)
  return deserializeState(json)
}

// 3. 增量状态更新
function patchState(base: SSRState, patch: Partial<SSRState>): SSRState {
  return {
    ...base,
    data: { ...base.data, ...patch.data },
    store: { ...base.store, ...patch.store }
  }
}
```

## 小结

状态传递的核心流程：

1. **服务端收集**：在渲染过程中收集数据和状态
2. **安全序列化**：处理特殊类型，防止 XSS
3. **注入 HTML**：将状态嵌入响应页面
4. **客户端恢复**：解析并恢复状态
5. **初始化应用**：使用恢复的状态启动

正确的状态传递避免了客户端重复请求，实现了无缝的 SSR 体验。
