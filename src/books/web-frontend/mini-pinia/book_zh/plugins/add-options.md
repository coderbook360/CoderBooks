---
sidebar_position: 67
title: 添加自定义选项
---

# 添加自定义选项

通过自定义选项，可以在 Store 定义时配置插件行为。本章讲解如何设计和使用自定义选项。

## 什么是自定义选项

在 defineStore 时添加的非标准属性：

```javascript
const useCounterStore = defineStore('counter', {
  // 标准选项
  state: () => ({ count: 0 }),
  getters: { /* ... */ },
  actions: { /* ... */ },
  
  // 自定义选项
  persist: true,
  debounce: { increment: 300 },
  syncInterval: 5000
})
```

## 读取自定义选项

在插件中通过 `context.options` 访问：

```javascript
function myPlugin({ store, options }) {
  console.log(options.persist)       // true
  console.log(options.debounce)      // { increment: 300 }
  console.log(options.syncInterval)  // 5000
}
```

## 设计自定义选项

### 布尔选项

最简单的开关：

```javascript
// Store 定义
const useStore = defineStore('example', {
  state: () => ({}),
  persist: true
})

// 插件处理
function persistPlugin({ store, options }) {
  if (options.persist) {
    // 启用持久化
    setupPersistence(store)
  }
}
```

### 对象选项

提供更多配置：

```javascript
// Store 定义
const useStore = defineStore('example', {
  state: () => ({}),
  persist: {
    enabled: true,
    storage: 'localStorage',
    keys: ['importantData'],
    ttl: 3600000  // 1 小时
  }
})

// 插件处理
function persistPlugin({ store, options }) {
  const config = options.persist
  
  if (!config || config.enabled === false) {
    return
  }
  
  const storage = config.storage === 'sessionStorage'
    ? sessionStorage
    : localStorage
  
  const keys = config.keys || Object.keys(store.$state)
  const ttl = config.ttl || Infinity
  
  // 使用配置实现持久化
  setupPersistence(store, { storage, keys, ttl })
}
```

### 函数选项

允许自定义逻辑：

```javascript
// Store 定义
const useStore = defineStore('example', {
  state: () => ({ items: [] }),
  transformState: (state) => ({
    ...state,
    items: state.items.filter(item => !item.deleted)
  })
})

// 插件处理
function transformPlugin({ store, options }) {
  if (typeof options.transformState === 'function') {
    store.$subscribe(() => {
      const transformed = options.transformState(store.$state)
      // 使用转换后的状态
    })
  }
}
```

### 映射选项

为特定 action/state 配置：

```javascript
// Store 定义
const useStore = defineStore('example', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ },
    decrement() { this.count-- },
    fetchData() { /* ... */ }
  },
  
  // 为特定 action 配置
  debounce: {
    increment: 300,
    decrement: 300
  },
  loading: {
    fetchData: 'isLoading'
  }
})

// 插件处理
function debouncePlugin({ store, options }) {
  const debounceConfig = options.debounce
  
  if (!debounceConfig) return
  
  Object.entries(debounceConfig).forEach(([actionName, wait]) => {
    const originalAction = store[actionName]
    
    if (typeof originalAction === 'function') {
      store[actionName] = debounce(originalAction.bind(store), wait)
    }
  })
}
```

## 默认值处理

```javascript
function pluginWithDefaults({ store, options }) {
  // 定义默认配置
  const defaultConfig = {
    enabled: false,
    interval: 1000,
    retries: 3
  }
  
  // 合并用户配置和默认值
  const config = {
    ...defaultConfig,
    ...(options.sync || {})
  }
  
  if (config.enabled) {
    setupSync(store, config)
  }
}
```

## 验证选项

```javascript
function validatedPlugin({ store, options }) {
  const config = options.myPlugin
  
  if (config) {
    // 类型验证
    if (typeof config.interval !== 'number') {
      console.warn(
        `[MyPlugin] interval should be a number, got ${typeof config.interval}`
      )
      return
    }
    
    // 范围验证
    if (config.interval < 100) {
      console.warn(
        `[MyPlugin] interval too small, minimum is 100ms`
      )
      config.interval = 100
    }
    
    // 必填验证
    if (!config.handler) {
      console.error(
        `[MyPlugin] handler is required`
      )
      return
    }
    
    setupPlugin(store, config)
  }
}
```

## TypeScript 类型定义

```typescript
// 定义选项类型
interface PersistOptions {
  enabled?: boolean
  storage?: 'localStorage' | 'sessionStorage'
  keys?: string[]
  ttl?: number
}

interface DebounceOptions {
  [actionName: string]: number
}

// 扩展 Pinia 类型
declare module 'pinia' {
  interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistOptions
    debounce?: DebounceOptions
    syncInterval?: number
  }
}

// 类型安全的插件
function typedPlugin({ options }: PiniaPluginContext) {
  // options.persist 有正确的类型
  if (options.persist) {
    const config = typeof options.persist === 'boolean'
      ? { enabled: options.persist }
      : options.persist
    
    // config 类型是 PersistOptions
  }
}
```

## Setup Store 的自定义选项

Setup Store 需要通过第三个参数传递选项：

```javascript
// Setup Store 使用选项
const useStore = defineStore('example', () => {
  const count = ref(0)
  const increment = () => count.value++
  
  return { count, increment }
}, {
  // 自定义选项在第三个参数
  persist: true,
  debounce: { increment: 300 }
})

// 插件访问方式相同
function plugin({ options }) {
  console.log(options.persist)  // true
}
```

## 实际应用示例

### 防抖插件

```javascript
function debouncePlugin({ store, options }) {
  const debounceMap = options.debounce
  
  if (!debounceMap) return
  
  Object.entries(debounceMap).forEach(([actionName, wait]) => {
    const original = store[actionName]
    
    if (typeof original !== 'function') {
      console.warn(`[Debounce] ${actionName} is not an action`)
      return
    }
    
    let timeoutId = null
    
    store[actionName] = function(...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        original.apply(store, args)
      }, wait)
    }
  })
}
```

### 加载状态插件

```javascript
function loadingPlugin({ store, options }) {
  const loadingMap = options.loading
  
  if (!loadingMap) return
  
  Object.entries(loadingMap).forEach(([actionName, stateKey]) => {
    const original = store[actionName]
    
    if (typeof original !== 'function') return
    
    // 添加加载状态
    if (!store.$state.hasOwnProperty(stateKey)) {
      store.$patch({ [stateKey]: false })
    }
    
    store[actionName] = async function(...args) {
      store.$patch({ [stateKey]: true })
      
      try {
        return await original.apply(store, args)
      } finally {
        store.$patch({ [stateKey]: false })
      }
    }
  })
}
```

## 测试自定义选项

```javascript
describe('Custom Options', () => {
  test('reads custom options', () => {
    const pinia = createPinia()
    const receivedOptions = {}
    
    pinia.use(({ options }) => {
      Object.assign(receivedOptions, options)
    })
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({}),
      customOption: { value: 42 }
    })
    
    useStore()
    
    expect(receivedOptions.customOption).toEqual({ value: 42 })
  })
  
  test('applies debounce option', async () => {
    const pinia = createPinia()
    
    pinia.use(debouncePlugin)
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() { this.count++ }
      },
      debounce: { increment: 100 }
    })
    
    const store = useStore()
    
    // 快速调用多次
    store.increment()
    store.increment()
    store.increment()
    
    // 立即检查，应该还是 0
    expect(store.count).toBe(0)
    
    // 等待防抖时间
    await new Promise(r => setTimeout(r, 150))
    
    // 只执行了一次
    expect(store.count).toBe(1)
  })
})
```

## 本章小结

本章讲解了添加自定义选项：

- **选项类型**：布尔、对象、函数、映射
- **读取方式**：通过 context.options
- **默认值**：合并默认配置
- **验证**：类型、范围、必填检查
- **TypeScript**：扩展 DefineStoreOptionsBase
- **Setup Store**：使用第三个参数

下一章实现一个完整的持久化插件。
