# 插件上下文

插件函数接收一个上下文对象，包含丰富的信息。这一章详细分析上下文的各个属性。

## 上下文结构

```typescript
interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: DefineStoreOptionsInPlugin
}
```

## pinia 属性

pinia 实例本身：

```typescript
pinia.use(({ pinia }) => {
  // pinia 实例
  console.log(pinia)
  
  // 已注册的所有 Store
  console.log(pinia._s)  // Map<string, Store>
  
  // 全局状态
  console.log(pinia.state.value)
  
  // Vue App 实例
  console.log(pinia._a)
})
```

可以通过 pinia 访问其他 Store：

```typescript
pinia.use(({ pinia, store }) => {
  // 检查其他 Store 是否存在
  if (pinia._s.has('user')) {
    const userStore = pinia._s.get('user')
  }
})
```

## app 属性

Vue 应用实例：

```typescript
pinia.use(({ app }) => {
  // Vue App 实例
  console.log(app)
  
  // 访问全局属性
  const router = app.config.globalProperties.$router
  
  // 访问全局组件
  app.component('GlobalComponent')
  
  // 使用 provide/inject
  const theme = app._context.provides.theme
})
```

## store 属性

当前正在创建的 Store 实例：

```typescript
pinia.use(({ store }) => {
  // Store ID
  console.log(store.$id)
  
  // Store 状态
  console.log(store.$state)
  
  // Store 方法
  store.$subscribe((mutation, state) => {})
  store.$onAction((context) => {})
  store.$patch({})
  store.$reset()
})
```

Store 实例包含所有 state、getters、actions。

## options 属性

Store 的定义选项：

```typescript
pinia.use(({ options }) => {
  console.log(options)
  // {
  //   id: 'user',
  //   state?: () => ({ ... }),
  //   getters?: { ... },
  //   actions?: { ... }
  // }
})
```

### Options Store 的 options

```typescript
const useUserStore = defineStore('user', {
  state: () => ({ name: 'John' }),
  getters: { upperName: (s) => s.name.toUpperCase() },
  actions: { setName(n) { this.name = n } }
})

// 插件中
pinia.use(({ options }) => {
  options.state  // () => ({ name: 'John' })
  options.getters  // { upperName: ... }
  options.actions  // { setName: ... }
})
```

### Setup Store 的 options

```typescript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, double, increment }
})

// 插件中
pinia.use(({ options }) => {
  // Setup Store 没有 state、getters、actions 属性
  options.state  // undefined
  options.getters  // undefined
  options.actions  // undefined
})
```

## 区分 Store 类型

```typescript
pinia.use(({ options, store }) => {
  // 判断是 Options Store 还是 Setup Store
  const isOptionsStore = typeof options.state === 'function'
  
  if (isOptionsStore) {
    // Options Store 特定逻辑
    console.log('Options Store')
  } else {
    // Setup Store 特定逻辑
    console.log('Setup Store')
  }
})
```

## 自定义选项

在定义 Store 时传入自定义选项：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({ name: '' }),
  // 自定义选项
  persist: {
    enabled: true,
    storage: 'localStorage'
  },
  debounce: {
    save: 300
  }
})

// 插件中访问
pinia.use(({ options }) => {
  if (options.persist?.enabled) {
    console.log('启用持久化')
    console.log('存储位置:', options.persist.storage)
  }
  
  if (options.debounce) {
    console.log('防抖配置:', options.debounce)
  }
})
```

## 为自定义选项添加类型

```typescript
// types.d.ts
declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: {
      enabled: boolean
      storage?: 'localStorage' | 'sessionStorage'
      key?: string
    }
    debounce?: Record<string, number>
  }
}

// 现在定义 Store 时有类型提示
const useStore = defineStore('test', {
  state: () => ({}),
  persist: {
    enabled: true,
    storage: 'localStorage'  // 有类型提示
  }
})
```

## 实际应用：持久化插件

```typescript
interface PersistOptions {
  enabled: boolean
  storage?: 'localStorage' | 'sessionStorage'
  key?: string
}

function persistPlugin({ store, options }) {
  const persist = options.persist as PersistOptions | undefined
  
  if (!persist?.enabled) return
  
  const storage = persist.storage === 'sessionStorage' 
    ? sessionStorage 
    : localStorage
  
  const key = persist.key ?? `pinia-${store.$id}`
  
  // 恢复状态
  const saved = storage.getItem(key)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 监听变化
  store.$subscribe((mutation, state) => {
    storage.setItem(key, JSON.stringify(state))
  })
}

pinia.use(persistPlugin)
```

## 实际应用：路由集成

```typescript
function routerPlugin({ app, store }) {
  // 获取 router
  const router = app.config.globalProperties.$router
  
  if (!router) return
  
  // 为 Store 添加导航方法
  store.$router = router
  
  store.navigate = function(to) {
    router.push(to)
  }
  
  return { $router: router }
}

// 使用
const store = useUserStore()
store.navigate('/dashboard')
```

## 实际应用：错误处理

```typescript
function errorHandlerPlugin({ store, app }) {
  // 全局错误处理
  store.$onAction(({ name, after, onError }) => {
    onError((error) => {
      // 记录错误
      console.error(`Action ${name} in ${store.$id} failed:`, error)
      
      // 发送到监控系统
      app.config.globalProperties.$sentry?.captureException(error)
      
      // 显示用户友好提示
      app.config.globalProperties.$toast?.error('操作失败，请重试')
    })
  })
}
```

## 访问其他 Store

虽然不推荐，但可以在插件中访问其他 Store：

```typescript
pinia.use(({ store, pinia }) => {
  // 延迟访问，避免循环依赖
  const getAuthStore = () => pinia._s.get('auth')
  
  store.$onAction(({ name }) => {
    const authStore = getAuthStore()
    if (authStore && !authStore.isLoggedIn) {
      console.warn(`Action ${name} called without authentication`)
    }
  })
})
```

## 类型安全的扩展

```typescript
// 声明扩展类型
declare module 'pinia' {
  export interface PiniaCustomProperties {
    $router: Router
    navigate(to: RouteLocationRaw): void
  }
}

// 插件实现
pinia.use(({ app }) => {
  const router = app.config.globalProperties.$router
  return {
    $router: router,
    navigate(to) {
      router.push(to)
    }
  }
})

// 使用时有类型提示
const store = useUserStore()
store.$router  // Router 类型
store.navigate('/home')  // 有类型提示
```

## 上下文的生命周期

上下文在每个 Store 创建时生成：

```typescript
pinia.use((context) => {
  // 每次调用 useXxxStore() 时
  // 如果 Store 不存在，会创建并执行这里
  console.log(`Store ${context.store.$id} created`)
  
  // 返回的扩展会添加到这个 Store
  return { createdAt: Date.now() }
})
```

Store 只创建一次：

```typescript
const store1 = useUserStore()  // 创建，执行插件
const store2 = useUserStore()  // 返回已有实例，不执行插件
store1 === store2  // true
```

## 注意事项

不要在上下文中存储可变引用：

```typescript
// ❌ 危险
const shared = { count: 0 }
pinia.use(({ store }) => {
  store.shared = shared  // 所有 Store 共享同一个对象
})

// ✅ 每个 Store 独立
pinia.use(({ store }) => {
  store.data = { count: 0 }  // 每个 Store 独立
})
```

避免循环依赖：

```typescript
// ❌ 可能导致问题
pinia.use(({ pinia }) => {
  const otherStore = useOtherStore(pinia)  // Store 创建中调用另一个 Store
})

// ✅ 延迟访问
pinia.use(({ pinia }) => ({
  getOther: () => useOtherStore(pinia)
}))
```

下一章我们将分析插件如何扩展订阅功能。
