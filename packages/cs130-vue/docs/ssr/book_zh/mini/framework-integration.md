# 框架集成

将 Mini SSR 框架与现有生态系统集成，包括路由、状态管理、UI 库等。本章介绍关键的集成模式。

## 路由集成

```typescript
// src/router/index.ts

export interface Route {
  path: string
  component: Component | AsyncComponent
  meta?: Record<string, any>
  children?: Route[]
}

export interface Router {
  routes: Route[]
  currentRoute: Route | null
  push(path: string): void
  replace(path: string): void
  resolve(path: string): Route | null
}

// 创建路由器
export function createRouter(options: {
  routes: Route[]
  history?: 'hash' | 'history'
}): Router {
  const routes = options.routes
  let currentRoute: Route | null = null
  const listeners: Array<(route: Route) => void> = []
  
  const router: Router = {
    routes,
    
    get currentRoute() {
      return currentRoute
    },
    
    push(path: string) {
      const route = this.resolve(path)
      if (route) {
        currentRoute = route
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', path)
        }
        listeners.forEach(fn => fn(route))
      }
    },
    
    replace(path: string) {
      const route = this.resolve(path)
      if (route) {
        currentRoute = route
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', path)
        }
        listeners.forEach(fn => fn(route))
      }
    },
    
    resolve(path: string): Route | null {
      return matchRoute(routes, path)
    }
  }
  
  return router
}

// 路由匹配
function matchRoute(routes: Route[], path: string): Route | null {
  for (const route of routes) {
    if (matchPath(route.path, path)) {
      return route
    }
    
    if (route.children) {
      const child = matchRoute(route.children, path)
      if (child) return child
    }
  }
  return null
}

function matchPath(pattern: string, path: string): boolean {
  // 简单的路径匹配（生产环境使用 path-to-regexp）
  if (pattern === path) return true
  
  // 动态路由
  const regex = pattern
    .replace(/:([^/]+)/g, '([^/]+)')
    .replace(/\*/g, '.*')
  
  return new RegExp(`^${regex}$`).test(path)
}
```

## SSR 路由处理

```typescript
// server/router.ts

export async function handleSSRRoute(
  router: Router,
  url: string,
  context: SSRContext
): Promise<string> {
  // 解析路由
  const route = router.resolve(url)
  
  if (!route) {
    // 404 处理
    return render404Page()
  }
  
  // 预取数据
  if (route.meta?.fetchData) {
    const data = await route.meta.fetchData(route)
    context.state.data.pageData = data
  }
  
  // 渲染页面
  const RouterView = createRouterView(router, route)
  const html = await renderToString(h(RouterView, null))
  
  return html
}

// RouterView 组件
function createRouterView(router: Router, initialRoute: Route): Component {
  return {
    setup() {
      let currentRoute = initialRoute
      
      return () => {
        if (!currentRoute) {
          return h('div', null, '404 Not Found')
        }
        
        return h(currentRoute.component, null)
      }
    }
  }
}

// 客户端路由
export function setupClientRouter(router: Router, app: App) {
  // 监听浏览器导航
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      const path = window.location.pathname
      const route = router.resolve(path)
      if (route) {
        // 触发重新渲染
        app.update()
      }
    })
    
    // 初始化当前路由
    const initialPath = window.location.pathname
    router.push(initialPath)
  }
}
```

## 状态管理集成

```typescript
// src/store/index.ts

export interface StoreOptions<S> {
  state: () => S
  mutations?: Record<string, (state: S, payload: any) => void>
  actions?: Record<string, (context: ActionContext<S>, payload: any) => any>
  getters?: Record<string, (state: S) => any>
}

export interface ActionContext<S> {
  state: S
  commit: (mutation: string, payload?: any) => void
  dispatch: (action: string, payload?: any) => Promise<any>
}

export function createStore<S>(options: StoreOptions<S>) {
  let state = options.state()
  const listeners: Array<() => void> = []
  
  const store = {
    get state() {
      return state
    },
    
    commit(mutation: string, payload?: any) {
      const handler = options.mutations?.[mutation]
      if (handler) {
        handler(state, payload)
        listeners.forEach(fn => fn())
      }
    },
    
    dispatch(action: string, payload?: any): Promise<any> {
      const handler = options.actions?.[action]
      if (handler) {
        return Promise.resolve(handler({
          state,
          commit: store.commit,
          dispatch: store.dispatch
        }, payload))
      }
      return Promise.reject(new Error(`Unknown action: ${action}`))
    },
    
    getters: {} as Record<string, any>,
    
    subscribe(listener: () => void) {
      listeners.push(listener)
      return () => {
        const index = listeners.indexOf(listener)
        if (index > -1) listeners.splice(index, 1)
      }
    },
    
    // SSR 序列化
    toJSON() {
      return state
    },
    
    // SSR 恢复
    replaceState(newState: S) {
      state = newState
    }
  }
  
  // 设置 getters
  if (options.getters) {
    for (const key in options.getters) {
      Object.defineProperty(store.getters, key, {
        get: () => options.getters![key](state)
      })
    }
  }
  
  return store
}

// SSR 集成
export function useSSRStore<S>(
  createFn: () => ReturnType<typeof createStore<S>>
) {
  if (typeof window === 'undefined') {
    // 服务端：创建新实例
    const store = createFn()
    
    // 渲染后收集状态
    const context = getSSRContext()
    context.state.store = store.state
    
    return store
  }
  
  // 客户端：恢复状态
  const store = createFn()
  const ssrState = getInitialState()
  
  if (ssrState?.store) {
    store.replaceState(ssrState.store as S)
  }
  
  return store
}
```

## UI 库集成

```typescript
// 集成第三方 UI 组件库

// 1. 按需导入组件
import { Button, Input, Modal } from 'ui-library'

const UIComponents: Record<string, Component> = {
  'ui-button': Button,
  'ui-input': Input,
  'ui-modal': Modal
}

// 注册到应用
export function registerUIComponents(app: App) {
  for (const [name, component] of Object.entries(UIComponents)) {
    app.component(name, component)
  }
}

// 2. SSR 兼容适配
// 某些组件可能不兼容 SSR，需要包装

function createSSRCompatible(component: Component): Component {
  return {
    setup(props, { slots }) {
      // 服务端渲染占位符
      if (typeof window === 'undefined') {
        return () => h('div', { 
          class: 'ssr-placeholder',
          'data-component': component.name 
        })
      }
      
      // 客户端正常渲染
      return () => h(component, props, slots)
    }
  }
}

// 3. CSS-in-JS 支持
interface StyleContext {
  styles: Map<string, string>
}

const styleContext: StyleContext = { styles: new Map() }

export function collectStyles(): string {
  return Array.from(styleContext.styles.values()).join('\n')
}

export function injectStyle(id: string, css: string) {
  if (typeof window === 'undefined') {
    styleContext.styles.set(id, css)
  } else {
    // 客户端注入
    let styleEl = document.getElementById(id)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = id
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css
  }
}
```

## 数据获取库集成

```typescript
// 集成 axios 或 fetch

// 创建 SSR 兼容的 HTTP 客户端
export function createHttpClient(options: {
  baseURL: string
  headers?: Record<string, string>
}) {
  const client = {
    async get<T>(url: string, config?: any): Promise<T> {
      const fullUrl = options.baseURL + url
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          ...options.headers,
          ...config?.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return response.json()
    },
    
    async post<T>(url: string, data?: any, config?: any): Promise<T> {
      const fullUrl = options.baseURL + url
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          ...config?.headers
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      return response.json()
    }
  }
  
  return client
}

// SSR 请求上下文
export function createSSRHttpClient(req: any) {
  return createHttpClient({
    baseURL: process.env.API_URL || 'http://localhost:3001',
    headers: {
      // 转发请求头
      Cookie: req.headers.cookie || '',
      Authorization: req.headers.authorization || ''
    }
  })
}

// 数据获取 hook
export function useFetch<T>(
  url: string,
  options?: { immediate?: boolean }
): {
  data: T | null
  error: Error | null
  loading: boolean
  execute: () => Promise<void>
} {
  let data: T | null = null
  let error: Error | null = null
  let loading = false
  
  const execute = async () => {
    loading = true
    error = null
    
    try {
      const client = getHttpClient()
      data = await client.get<T>(url)
    } catch (e) {
      error = e as Error
    } finally {
      loading = false
    }
  }
  
  // 检查 SSR 数据
  const ssrKey = `fetch:${url}`
  const ssrState = getInitialState()
  
  if (ssrState?.data[ssrKey]) {
    data = ssrState.data[ssrKey] as T
  } else if (options?.immediate !== false) {
    // SSR 或 CSR 立即执行
    execute()
  }
  
  return { data, error, loading, execute }
}
```

## 表单库集成

```typescript
// 表单验证集成
interface FieldState {
  value: any
  error: string | null
  touched: boolean
}

interface FormState {
  fields: Record<string, FieldState>
  isValid: boolean
  isSubmitting: boolean
}

export function useForm<T extends Record<string, any>>(options: {
  initialValues: T
  validate?: (values: T) => Record<string, string>
  onSubmit: (values: T) => Promise<void>
}) {
  const fields: Record<string, FieldState> = {}
  
  for (const key in options.initialValues) {
    fields[key] = {
      value: options.initialValues[key],
      error: null,
      touched: false
    }
  }
  
  let isSubmitting = false
  
  const form = {
    fields,
    
    get isValid() {
      return Object.values(fields).every(f => !f.error)
    },
    
    get values(): T {
      const result: any = {}
      for (const key in fields) {
        result[key] = fields[key].value
      }
      return result
    },
    
    setFieldValue(name: string, value: any) {
      if (fields[name]) {
        fields[name].value = value
        this.validateField(name)
      }
    },
    
    setFieldTouched(name: string) {
      if (fields[name]) {
        fields[name].touched = true
      }
    },
    
    validateField(name: string) {
      if (options.validate) {
        const errors = options.validate(this.values)
        fields[name].error = errors[name] || null
      }
    },
    
    validate() {
      if (options.validate) {
        const errors = options.validate(this.values)
        for (const key in fields) {
          fields[key].error = errors[key] || null
        }
      }
      return this.isValid
    },
    
    async submit() {
      this.validate()
      
      if (!this.isValid) return
      
      isSubmitting = true
      try {
        await options.onSubmit(this.values)
      } finally {
        isSubmitting = false
      }
    },
    
    // 生成表单字段 props
    getFieldProps(name: string) {
      return {
        value: fields[name]?.value,
        onInput: (e: Event) => {
          this.setFieldValue(name, (e.target as HTMLInputElement).value)
        },
        onBlur: () => this.setFieldTouched(name)
      }
    }
  }
  
  return form
}

// SSR 表单状态恢复
export function useSSRForm<T extends Record<string, any>>(
  key: string,
  options: Parameters<typeof useForm<T>>[0]
) {
  const ssrState = getInitialState()
  
  // 恢复表单值
  if (ssrState?.data[`form:${key}`]) {
    options.initialValues = {
      ...options.initialValues,
      ...ssrState.data[`form:${key}`]
    }
  }
  
  return useForm(options)
}
```

## 国际化集成

```typescript
// i18n 集成
interface I18nOptions {
  locale: string
  messages: Record<string, Record<string, string>>
  fallbackLocale?: string
}

export function createI18n(options: I18nOptions) {
  let currentLocale = options.locale
  
  const i18n = {
    get locale() {
      return currentLocale
    },
    
    setLocale(locale: string) {
      if (options.messages[locale]) {
        currentLocale = locale
      }
    },
    
    t(key: string, params?: Record<string, string>): string {
      const messages = options.messages[currentLocale] 
        || options.messages[options.fallbackLocale || 'en']
      
      let message = messages?.[key] || key
      
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          message = message.replace(`{${k}}`, v)
        }
      }
      
      return message
    }
  }
  
  return i18n
}

// SSR i18n
export function useSSRi18n(
  createFn: (locale: string) => ReturnType<typeof createI18n>,
  detectLocale: (req?: any) => string
) {
  if (typeof window === 'undefined') {
    // 服务端：从请求检测语言
    const context = getSSRContext()
    const locale = detectLocale((context as any).req)
    const i18n = createFn(locale)
    context.state.config.locale = locale
    return i18n
  }
  
  // 客户端：恢复语言设置
  const ssrState = getInitialState()
  const locale = ssrState?.config.locale || 'en'
  return createFn(locale)
}
```

## 插件系统

```typescript
// 统一的插件接口
export interface Plugin {
  name: string
  install(app: App, options?: any): void
  // SSR 钩子
  onServerRender?(context: SSRContext): void | Promise<void>
  onClientHydrate?(context: any): void
}

export function createPluginSystem() {
  const plugins: Plugin[] = []
  
  return {
    register(plugin: Plugin, options?: any) {
      plugins.push(plugin)
      return (app: App) => plugin.install(app, options)
    },
    
    async runServerHooks(context: SSRContext) {
      for (const plugin of plugins) {
        if (plugin.onServerRender) {
          await plugin.onServerRender(context)
        }
      }
    },
    
    runClientHooks(context: any) {
      for (const plugin of plugins) {
        if (plugin.onClientHydrate) {
          plugin.onClientHydrate(context)
        }
      }
    }
  }
}

// 使用示例
const pluginSystem = createPluginSystem()

// 注册插件
pluginSystem.register({
  name: 'analytics',
  install(app) {
    // 安装分析插件
  },
  onClientHydrate() {
    // 客户端初始化分析
    analytics.init()
  }
})
```

## 小结

框架集成的关键模式：

1. **路由集成**：服务端路由匹配、客户端导航
2. **状态管理**：SSR 序列化、客户端恢复
3. **UI 库**：兼容性适配、按需加载
4. **数据获取**：请求上下文、SSR 预取
5. **插件系统**：统一生命周期钩子

良好的集成设计让 Mini SSR 可以无缝融入现有技术栈。
