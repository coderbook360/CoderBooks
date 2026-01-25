# 实战应用：在真实项目中使用

本章展示如何在实际项目中应用响应式系统，包括状态管理、表单处理、数据缓存等场景。

## 简易状态管理

使用响应式系统构建类似 Pinia 的状态管理：

```typescript
import { reactive, computed, effectScope, watch } from './mini-reactivity'

interface StoreDefinition<S, G, A> {
  state: () => S
  getters?: G & ThisType<S & G>
  actions?: A & ThisType<S & G & A>
}

export function defineStore<
  S extends object,
  G extends Record<string, () => any>,
  A extends Record<string, (...args: any[]) => any>
>(definition: StoreDefinition<S, G, A>) {
  const scope = effectScope()
  
  return scope.run(() => {
    // 创建响应式 state
    const state = reactive(definition.state())
    
    // 处理 getters
    const getters: Record<string, any> = {}
    if (definition.getters) {
      for (const key in definition.getters) {
        getters[key] = computed(() => 
          definition.getters![key].call(state)
        )
      }
    }
    
    // 处理 actions
    const actions: Record<string, Function> = {}
    if (definition.actions) {
      for (const key in definition.actions) {
        actions[key] = definition.actions[key].bind({
          ...state,
          ...getters,
          ...actions
        })
      }
    }
    
    return {
      ...state,
      ...getters,
      ...actions,
      $dispose: () => scope.stop()
    }
  })!
}
```

使用示例：

```typescript
const useCounterStore = () => defineStore({
  state: () => ({
    count: 0
  }),
  getters: {
    double() {
      return this.count * 2
    }
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

const store = useCounterStore()
console.log(store.count)   // 0
console.log(store.double.value)  // 0

store.increment()
console.log(store.count)   // 1
console.log(store.double.value)  // 2
```

## 表单处理

响应式表单验证：

```typescript
import { reactive, computed, watch } from './mini-reactivity'

interface FormField<T> {
  value: T
  error: string
  touched: boolean
  valid: boolean
}

interface FormRules<T> {
  [K in keyof T]?: Array<(value: T[K]) => string | true>
}

export function useForm<T extends object>(
  initialValues: T,
  rules: FormRules<T> = {}
) {
  // 创建表单字段
  const fields = {} as Record<keyof T, FormField<T[keyof T]>>
  
  for (const key in initialValues) {
    fields[key] = reactive({
      value: initialValues[key],
      error: '',
      touched: false,
      valid: true
    })
  }
  
  // 验证函数
  const validate = (key: keyof T) => {
    const field = fields[key]
    const fieldRules = rules[key] || []
    
    for (const rule of fieldRules) {
      const result = rule(field.value as any)
      if (result !== true) {
        field.error = result
        field.valid = false
        return false
      }
    }
    
    field.error = ''
    field.valid = true
    return true
  }
  
  // 监听变化自动验证
  for (const key in fields) {
    watch(
      () => fields[key].value,
      () => {
        if (fields[key].touched) {
          validate(key)
        }
      }
    )
  }
  
  // 表单整体状态
  const isValid = computed(() => {
    return Object.values(fields).every(field => (field as any).valid)
  })
  
  // 获取表单值
  const values = computed(() => {
    const result = {} as T
    for (const key in fields) {
      result[key] = fields[key].value as T[keyof T]
    }
    return result
  })
  
  return {
    fields,
    isValid,
    values,
    validate,
    validateAll: () => {
      let allValid = true
      for (const key in fields) {
        fields[key].touched = true
        if (!validate(key)) {
          allValid = false
        }
      }
      return allValid
    },
    reset: () => {
      for (const key in fields) {
        fields[key].value = initialValues[key]
        fields[key].error = ''
        fields[key].touched = false
        fields[key].valid = true
      }
    }
  }
}
```

使用示例：

```typescript
const form = useForm(
  {
    email: '',
    password: ''
  },
  {
    email: [
      v => !!v || '邮箱必填',
      v => /.+@.+/.test(v) || '邮箱格式不正确'
    ],
    password: [
      v => !!v || '密码必填',
      v => v.length >= 6 || '密码至少6位'
    ]
  }
)

// 使用
form.fields.email.value = 'test'
form.fields.email.touched = true

console.log(form.fields.email.error)  // "邮箱格式不正确"
console.log(form.isValid.value)       // false
```

## 数据缓存

带缓存的异步数据获取：

```typescript
import { ref, computed, watch, shallowRef } from './mini-reactivity'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: {
    key: string
    ttl?: number  // 缓存时间（毫秒）
    immediate?: boolean
  }
) {
  const cache = new Map<string, CacheEntry<T>>()
  
  const data = shallowRef<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  
  const fetch = async () => {
    const { key, ttl = 60000 } = options
    
    // 检查缓存
    const cached = cache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      data.value = cached.data
      return cached.data
    }
    
    loading.value = true
    error.value = null
    
    try {
      const result = await fetcher()
      
      // 存入缓存
      cache.set(key, {
        data: result,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      })
      
      data.value = result
      return result
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }
  
  // 立即执行
  if (options.immediate) {
    fetch()
  }
  
  return {
    data,
    error,
    loading,
    fetch,
    invalidate: () => {
      cache.delete(options.key)
    }
  }
}
```

使用示例：

```typescript
const { data, loading, error, fetch } = useAsyncData(
  () => fetch('/api/users').then(r => r.json()),
  { key: 'users', ttl: 30000, immediate: true }
)

watch(data, (users) => {
  console.log('Users loaded:', users)
})
```

## 路由状态

简易的响应式路由：

```typescript
import { reactive, computed, watch } from './mini-reactivity'

interface Route {
  path: string
  query: Record<string, string>
  params: Record<string, string>
}

export function createRouter() {
  const current = reactive<Route>({
    path: window.location.pathname,
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    params: {}
  })
  
  // 监听浏览器导航
  window.addEventListener('popstate', () => {
    current.path = window.location.pathname
    current.query = Object.fromEntries(
      new URLSearchParams(window.location.search)
    )
  })
  
  const push = (path: string, query: Record<string, string> = {}) => {
    const search = new URLSearchParams(query).toString()
    const url = search ? `${path}?${search}` : path
    
    history.pushState(null, '', url)
    current.path = path
    current.query = query
  }
  
  const replace = (path: string, query: Record<string, string> = {}) => {
    const search = new URLSearchParams(query).toString()
    const url = search ? `${path}?${search}` : path
    
    history.replaceState(null, '', url)
    current.path = path
    current.query = query
  }
  
  return {
    current,
    push,
    replace
  }
}
```

## 主题切换

响应式主题管理：

```typescript
import { ref, watch, computed } from './mini-reactivity'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const theme = ref<Theme>(
    (localStorage.getItem('theme') as Theme) || 'system'
  )
  
  const systemDark = ref(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      systemDark.value = e.matches
    })
  
  const isDark = computed(() => {
    if (theme.value === 'system') {
      return systemDark.value
    }
    return theme.value === 'dark'
  })
  
  // 应用主题
  watch(isDark, (dark) => {
    document.documentElement.classList.toggle('dark', dark)
  }, { immediate: true })
  
  // 持久化
  watch(theme, (value) => {
    localStorage.setItem('theme', value)
  })
  
  return {
    theme,
    isDark,
    toggle: () => {
      theme.value = isDark.value ? 'light' : 'dark'
    }
  }
}
```

## 实时数据订阅

WebSocket 数据同步：

```typescript
import { ref, shallowRef, onScopeDispose, effectScope } from './mini-reactivity'

export function useWebSocket<T>(url: string) {
  const scope = effectScope()
  
  return scope.run(() => {
    const data = shallowRef<T | null>(null)
    const status = ref<'connecting' | 'open' | 'closed'>('connecting')
    const error = ref<Error | null>(null)
    
    let ws: WebSocket | null = null
    
    const connect = () => {
      ws = new WebSocket(url)
      
      ws.onopen = () => {
        status.value = 'open'
      }
      
      ws.onmessage = (event) => {
        try {
          data.value = JSON.parse(event.data)
        } catch (e) {
          data.value = event.data
        }
      }
      
      ws.onerror = (e) => {
        error.value = new Error('WebSocket error')
      }
      
      ws.onclose = () => {
        status.value = 'closed'
      }
    }
    
    const send = (message: any) => {
      if (ws && status.value === 'open') {
        ws.send(JSON.stringify(message))
      }
    }
    
    const close = () => {
      ws?.close()
    }
    
    // 自动清理
    onScopeDispose(() => {
      close()
    })
    
    connect()
    
    return {
      data,
      status,
      error,
      send,
      close,
      reconnect: connect
    }
  })!
}
```

## 本章小结

响应式系统的实战应用：

1. **状态管理**：类 Pinia 的 store 实现
2. **表单处理**：自动验证、状态追踪
3. **数据缓存**：带 TTL 的异步数据
4. **路由状态**：响应式路由管理
5. **主题切换**：自动持久化、系统主题跟随
6. **实时数据**：WebSocket 数据同步

这些示例展示了响应式系统在真实项目中的强大能力。理解这些模式，可以帮助你在自己的项目中更好地应用响应式编程。
