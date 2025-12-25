---
sidebar_position: 65
title: 扩展 Store 功能
---

# 扩展 Store 功能

通过插件可以为所有 Store 添加新功能。本章讲解扩展 Store 的各种方式。

## 添加属性

### 添加静态属性

```javascript
function secretPlugin({ store }) {
  // 添加简单属性
  store.$secret = 'my secret value'
  
  // 添加方法
  store.$hello = () => {
    console.log(`Hello from ${store.$id}`)
  }
}

// 使用
const store = useMyStore()
console.log(store.$secret)
store.$hello()
```

### 添加响应式属性

```javascript
function sharedStatePlugin({ store }) {
  // 添加响应式 ref
  store.sharedRef = ref('shared value')
  
  // 添加响应式 reactive
  store.sharedReactive = reactive({
    count: 0,
    items: []
  })
}
```

### 添加计算属性

```javascript
function statsPlugin({ store }) {
  // 基于现有 state 的计算属性
  store.$stateSize = computed(() => {
    return JSON.stringify(store.$state).length
  })
  
  // 基于外部数据的计算属性
  store.$now = computed(() => Date.now())
}
```

## 添加方法

### 工具方法

```javascript
function utilsPlugin({ store }) {
  // 序列化方法
  store.$toJSON = () => {
    return JSON.stringify(store.$state, null, 2)
  }
  
  // 克隆方法
  store.$clone = () => {
    return JSON.parse(JSON.stringify(store.$state))
  }
  
  // 比较方法
  store.$equals = (otherState) => {
    return JSON.stringify(store.$state) === JSON.stringify(otherState)
  }
}
```

### 异步方法

```javascript
function syncPlugin({ store }) {
  store.$syncToServer = async () => {
    await fetch(`/api/stores/${store.$id}`, {
      method: 'POST',
      body: JSON.stringify(store.$state)
    })
  }
  
  store.$loadFromServer = async () => {
    const response = await fetch(`/api/stores/${store.$id}`)
    const data = await response.json()
    store.$patch(data)
  }
}
```

## 包装现有方法

### 包装 $patch

```javascript
function patchLoggerPlugin({ store }) {
  const originalPatch = store.$patch
  
  store.$patch = function(partialStateOrMutator) {
    console.log(`[${store.$id}] Before patch:`, { ...store.$state })
    
    const result = originalPatch.call(store, partialStateOrMutator)
    
    console.log(`[${store.$id}] After patch:`, { ...store.$state })
    
    return result
  }
}
```

### 包装 actions

```javascript
function actionWrapperPlugin({ store, options }) {
  if (!options.actions) return
  
  Object.keys(options.actions).forEach(actionName => {
    const originalAction = store[actionName]
    
    store[actionName] = async function(...args) {
      const startTime = performance.now()
      
      try {
        const result = await originalAction.apply(store, args)
        
        const endTime = performance.now()
        console.log(
          `[${store.$id}] ${actionName} completed in ${endTime - startTime}ms`
        )
        
        return result
      } catch (error) {
        console.error(`[${store.$id}] ${actionName} failed:`, error)
        throw error
      }
    }
  })
}
```

## 使用返回值添加属性

```javascript
function metaPlugin({ store }) {
  // 通过返回值添加
  return {
    $createdAt: Date.now(),
    $version: '1.0.0',
    $debug: () => {
      console.log('Store:', store.$id)
      console.log('State:', store.$state)
    }
  }
}

// 效果相同
function metaPlugin2({ store }) {
  store.$createdAt = Date.now()
  store.$version = '1.0.0'
  store.$debug = () => {
    console.log('Store:', store.$id)
    console.log('State:', store.$state)
  }
}
```

## 注入外部依赖

### 注入 Router

```javascript
function routerPlugin({ store, app }) {
  store.$router = markRaw(app.config.globalProperties.$router)
  store.$route = computed(() => app.config.globalProperties.$route)
}

// 在 Store 中使用
const useAuthStore = defineStore('auth', {
  actions: {
    async logout() {
      // 使用注入的 router
      await api.logout()
      this.$router.push('/login')
    }
  }
})
```

### 注入 HTTP 客户端

```javascript
function httpPlugin({ store }) {
  store.$http = axios.create({
    baseURL: '/api'
  })
  
  // 请求拦截器
  store.$http.interceptors.request.use(config => {
    // 添加认证 token
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })
}
```

### 注入国际化

```javascript
function i18nPlugin({ store, app }) {
  const i18n = app.config.globalProperties.$i18n
  
  store.$t = (key, ...args) => i18n.t(key, ...args)
  store.$locale = computed({
    get: () => i18n.locale,
    set: (value) => { i18n.locale = value }
  })
}
```

## 条件扩展

### 基于 Store ID

```javascript
function conditionalPlugin({ store }) {
  // 只为特定 Store 添加功能
  if (store.$id === 'user') {
    store.$logout = async () => {
      store.$reset()
      // 额外清理
    }
  }
  
  // 排除特定 Store
  if (store.$id !== 'config') {
    store.$sync = () => { /* ... */ }
  }
}
```

### 基于自定义选项

```javascript
function featurePlugin({ store, options }) {
  if (options.enableHistory) {
    const history = []
    
    store.$history = history
    store.$undo = () => {
      if (history.length > 0) {
        const previous = history.pop()
        store.$patch(previous)
      }
    }
    
    store.$subscribe((mutation, state) => {
      history.push({ ...state })
    })
  }
}

// Store 定义
const useEditorStore = defineStore('editor', {
  state: () => ({ content: '' }),
  enableHistory: true  // 启用历史功能
})
```

## 类型安全扩展

```typescript
// 扩展 Store 类型
declare module 'pinia' {
  interface PiniaCustomProperties {
    $router: Router
    $http: AxiosInstance
    $createdAt: number
    $debug: () => void
  }
}

// 插件实现
function typedPlugin({ store, app }: PiniaPluginContext) {
  store.$router = markRaw(app.config.globalProperties.$router)
  store.$http = axios
  store.$createdAt = Date.now()
  store.$debug = () => console.log(store.$state)
}
```

## 测试扩展功能

```javascript
describe('Store Extensions', () => {
  test('adds custom properties', () => {
    const pinia = createPinia()
    
    pinia.use(({ store }) => ({
      $custom: 'value',
      $method: () => 'result'
    }))
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(store.$custom).toBe('value')
    expect(store.$method()).toBe('result')
  })
  
  test('wraps existing methods', () => {
    const pinia = createPinia()
    const patchCalls = []
    
    pinia.use(({ store }) => {
      const originalPatch = store.$patch
      store.$patch = function(...args) {
        patchCalls.push(args)
        return originalPatch.apply(store, args)
      }
    })
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$patch({ count: 1 })
    
    expect(patchCalls).toHaveLength(1)
    expect(store.count).toBe(1)
  })
})
```

## 本章小结

本章讲解了扩展 Store 功能：

- **添加属性**：静态、响应式、计算属性
- **添加方法**：工具方法、异步方法
- **包装方法**：增强 $patch、actions
- **注入依赖**：Router、HTTP、i18n
- **条件扩展**：基于 ID 或自定义选项
- **类型安全**：扩展 PiniaCustomProperties

下一章讲解添加 state 的方式。
