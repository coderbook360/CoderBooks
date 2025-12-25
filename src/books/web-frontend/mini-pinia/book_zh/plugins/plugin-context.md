---
sidebar_position: 63
title: 插件 Context 对象
---

# 插件 Context 对象

插件函数接收一个 context 对象，包含扩展 Store 所需的所有信息。本章详细讲解各属性。

## Context 结构

```typescript
interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: DefineStoreOptions
}
```

## context.store

当前正在创建的 Store 实例：

```javascript
function plugin({ store }) {
  // 访问 Store ID
  console.log(store.$id)
  
  // 访问 state
  console.log(store.$state)
  
  // 调用 action
  store.someAction?.()
  
  // 订阅变化
  store.$subscribe((mutation) => {
    console.log(mutation)
  })
}
```

### Store 的可用属性

```javascript
function plugin({ store }) {
  // 核心属性
  store.$id          // Store 标识符
  store.$state       // 完整状态对象
  
  // 核心方法
  store.$patch       // 批量更新状态
  store.$reset       // 重置状态（Options Store）
  store.$subscribe   // 订阅状态变化
  store.$onAction    // 订阅 action
  store.$dispose     // 销毁 Store
  
  // 内部属性
  store._p           // Pinia 实例引用
}
```

## context.pinia

Pinia 实例：

```javascript
function plugin({ pinia }) {
  // 访问全局状态
  console.log(pinia.state.value)
  
  // 访问所有已创建的 Store
  pinia._s.forEach((store, id) => {
    console.log(`Store: ${id}`)
  })
  
  // 访问 effect scope
  pinia._e
}
```

### Pinia 的结构

```javascript
interface Pinia {
  // 安装方法
  install: (app: App) => void
  use: (plugin: PiniaPlugin) => Pinia
  
  // 状态
  state: Ref<Record<string, StateTree>>
  
  // 内部
  _p: PiniaPlugin[]      // 已注册插件
  _s: Map<string, Store> // Store 实例映射
  _e: EffectScope        // effect 作用域
}
```

## context.app

Vue 应用实例：

```javascript
function plugin({ app }) {
  // 访问全局属性
  const router = app.config.globalProperties.$router
  const i18n = app.config.globalProperties.$i18n
  
  // 访问 provide/inject
  // 注意：需要在 setup 上下文中才能使用 inject
}
```

### 常见用途

```javascript
// 注入 router
function routerPlugin({ store, app }) {
  store.$router = markRaw(app.config.globalProperties.$router)
  store.$route = computed(() => 
    app.config.globalProperties.$route
  )
}

// 注入 i18n
function i18nPlugin({ store, app }) {
  store.$t = app.config.globalProperties.$t
}
```

## context.options

Store 定义时的选项：

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: state => state.count * 2
  },
  actions: {
    increment() { this.count++ }
  },
  // 自定义选项
  persist: true,
  debounce: { increment: 300 }
})

function plugin({ options }) {
  console.log(options.state)    // () => ({ count: 0 })
  console.log(options.getters)  // { doubleCount: ... }
  console.log(options.actions)  // { increment: ... }
  console.log(options.persist)  // true
  console.log(options.debounce) // { increment: 300 }
}
```

### 使用自定义选项

```javascript
// 定义带自定义选项的 Store
const useStore = defineStore('example', {
  state: () => ({ value: 0 }),
  
  // 自定义选项
  persist: {
    enabled: true,
    storage: 'localStorage',
    keys: ['value']
  }
})

// 在插件中读取
function persistPlugin({ store, options }) {
  const persist = options.persist
  
  if (persist?.enabled) {
    // 根据选项实现持久化
    const storage = persist.storage === 'localStorage'
      ? localStorage
      : sessionStorage
    
    const keys = persist.keys || Object.keys(store.$state)
    
    // 恢复状态
    const saved = storage.getItem(store.$id)
    if (saved) {
      store.$patch(JSON.parse(saved))
    }
    
    // 保存变化
    store.$subscribe(() => {
      const toSave = {}
      keys.forEach(key => {
        toSave[key] = store.$state[key]
      })
      storage.setItem(store.$id, JSON.stringify(toSave))
    })
  }
}
```

## 完整 Context 示例

```javascript
function comprehensivePlugin(context) {
  const { store, pinia, app, options } = context
  
  // 1. 记录 Store 创建
  console.log(`[Plugin] Creating store: ${store.$id}`)
  
  // 2. 添加全局属性
  if (!store.$http) {
    store.$http = app.config.globalProperties.$http
  }
  
  // 3. 处理自定义选项
  if (options.syncWithServer) {
    setupServerSync(store, options.syncWithServer)
  }
  
  // 4. 添加到全局追踪
  if (!pinia._storeCount) {
    pinia._storeCount = 0
  }
  pinia._storeCount++
  
  // 5. 订阅状态变化
  store.$subscribe((mutation, state) => {
    console.log(`[${store.$id}] ${mutation.type}`)
  })
  
  // 6. 返回附加属性
  return {
    $createdAt: Date.now(),
    $storeIndex: pinia._storeCount
  }
}
```

## Context 的 TypeScript 类型

```typescript
import type { PiniaPluginContext } from 'pinia'

// 扩展选项类型
declare module 'pinia' {
  interface DefineStoreOptionsBase<S, Store> {
    // 添加自定义选项
    persist?: boolean | PersistOptions
    debounce?: Record<string, number>
  }
}

interface PersistOptions {
  enabled: boolean
  storage?: 'localStorage' | 'sessionStorage'
  keys?: string[]
}

// 类型安全的插件
function typedPlugin(context: PiniaPluginContext) {
  const { store, options } = context
  
  // options.persist 现在有类型
  if (options.persist) {
    // ...
  }
}
```

## Context 与 Store 类型的关系

```typescript
function genericPlugin<S extends Store>(context: PiniaPluginContext) {
  const { store } = context
  
  // store 是联合类型，包含所有 Store
  // 需要类型收窄才能访问特定 Store 的属性
  
  if (store.$id === 'counter') {
    // 这里仍然需要类型断言
    const counterStore = store as ReturnType<typeof useCounterStore>
    console.log(counterStore.count)
  }
}
```

## 测试 Context

```javascript
describe('Plugin Context', () => {
  test('receives correct context', () => {
    const pinia = createPinia()
    const receivedContext = {}
    
    pinia.use((context) => {
      Object.assign(receivedContext, context)
    })
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ value: 0 }),
      customOption: true
    })
    
    const store = useStore()
    
    expect(receivedContext.store.$id).toBe('test')
    expect(receivedContext.pinia).toBe(pinia)
    expect(receivedContext.app).toBe(app)
    expect(receivedContext.options.customOption).toBe(true)
  })
})
```

## 本章小结

本章详细讲解了插件 context 对象：

- **store**：当前 Store 实例，可添加属性和订阅
- **pinia**：Pinia 实例，可访问全局状态和其他 Store
- **app**：Vue 应用实例，可获取全局属性
- **options**：Store 定义选项，可读取自定义配置

下一章实现 pinia.use() 方法。
