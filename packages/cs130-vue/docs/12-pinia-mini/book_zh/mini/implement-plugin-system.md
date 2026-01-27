# 实现插件系统

插件系统让 Pinia 具备扩展能力。这一章实现插件机制。

## 插件系统特性

- 在 store 创建时执行
- 可以访问和扩展 store
- 可以添加新属性和方法
- 支持多个插件

## 插件基本结构

```typescript
function myPlugin(context) {
  const { store, pinia, options } = context
  
  // 可以返回要添加到 store 的属性
  return {
    newProperty: 'value'
  }
}

// 注册
pinia.use(myPlugin)
```

## 插件上下文

```typescript
interface PiniaPluginContext {
  pinia: Pinia
  store: Store
  options: DefineStoreOptions
}

type PiniaPlugin = (context: PiniaPluginContext) => void | object
```

## 实现 use 方法

在 createPinia 中添加 use：

```typescript
function createPinia(): Pinia {
  const state = ref({})
  const plugins: PiniaPlugin[] = []
  
  const pinia: Pinia = {
    state,
    _stores: new Map(),
    
    use(plugin) {
      plugins.push(plugin)
      return pinia  // 链式调用
    },
    
    _plugins: plugins,
    
    install(app) {
      // ...
    }
  }
  
  return pinia
}
```

## 在 Store 创建时执行插件

```typescript
function createOptionsStore(id, options, pinia) {
  // ... 创建 store
  
  // 执行所有插件
  pinia._plugins.forEach((plugin) => {
    const extensions = plugin({
      pinia,
      store,
      options
    })
    
    // 合并插件返回的扩展
    if (extensions) {
      Object.assign(store, extensions)
    }
  })
  
  return store
}
```

## 完整实现

```typescript
// src/plugin.ts
import type { Pinia, Store, PiniaPluginContext } from './types'

export type PiniaPlugin = (context: PiniaPluginContext) => void | Record<string, any>

/**
 * 执行所有已注册的插件
 */
export function executePlugins(
  pinia: Pinia,
  store: Store,
  options: Record<string, any>
): void {
  const context: PiniaPluginContext = {
    pinia,
    store,
    options
  }
  
  pinia._plugins.forEach((plugin) => {
    const extensions = plugin(context)
    
    if (extensions) {
      // 合并扩展属性到 store
      Object.assign(store, extensions)
    }
  })
}
```

## 更新 createPinia

```typescript
// src/createPinia.ts
import type { Pinia, PiniaPlugin } from './types'
import { ref, App } from 'vue'

export function createPinia(): Pinia {
  const state = ref<Record<string, any>>({})
  const _stores = new Map<string, any>()
  const _plugins: PiniaPlugin[] = []
  
  const pinia: Pinia = {
    state,
    _stores,
    _plugins,
    
    use(plugin: PiniaPlugin) {
      _plugins.push(plugin)
      return pinia
    },
    
    install(app: App) {
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
    }
  }
  
  return pinia
}
```

## 更新类型定义

```typescript
// src/types.ts
export interface Pinia {
  state: Ref<Record<string, StateTree>>
  _stores: Map<string, Store>
  _plugins: PiniaPlugin[]
  
  use(plugin: PiniaPlugin): Pinia
  install(app: App): void
}

export interface PiniaPluginContext {
  pinia: Pinia
  store: Store
  options: DefineStoreOptionsBase
}

export type PiniaPlugin = (
  context: PiniaPluginContext
) => void | Record<string, any>
```

## 插件示例

### 1. 添加新属性

```typescript
pinia.use(() => ({
  createdAt: new Date()
}))

// 所有 store 都有 createdAt
store.createdAt
```

### 2. 添加新方法

```typescript
pinia.use(({ store }) => ({
  log() {
    console.log('Store:', store.$id, store.$state)
  }
}))

store.log()
```

### 3. 监听变化

```typescript
pinia.use(({ store }) => {
  store.$subscribe((mutation, state) => {
    console.log('Change in', store.$id)
  })
})
```

### 4. 持久化插件

```typescript
pinia.use(({ store }) => {
  // 恢复状态
  const saved = localStorage.getItem(`pinia-${store.$id}`)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 保存变化
  store.$subscribe((mutation, state) => {
    localStorage.setItem(`pinia-${store.$id}`, JSON.stringify(state))
  })
})
```

## 测试

```typescript
// tests/plugin.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Plugin System', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should call plugin when store is created', () => {
    const plugin = vi.fn()
    const pinia = createPinia()
    pinia.use(plugin)
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    useStore()
    
    expect(plugin).toHaveBeenCalled()
  })
  
  it('should provide context to plugin', () => {
    let receivedContext: any
    
    const pinia = createPinia()
    pinia.use((context) => {
      receivedContext = context
    })
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(receivedContext.pinia).toBe(pinia)
    expect(receivedContext.store).toBe(store)
    expect(receivedContext.options).toBeDefined()
  })
  
  it('should extend store with returned object', () => {
    const pinia = createPinia()
    pinia.use(() => ({
      customProperty: 'custom value',
      customMethod() { return 42 }
    }))
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    expect(store.customProperty).toBe('custom value')
    expect(store.customMethod()).toBe(42)
  })
  
  it('should support chained use calls', () => {
    const pinia = createPinia()
    
    const result = pinia
      .use(() => ({ a: 1 }))
      .use(() => ({ b: 2 }))
    
    expect(result).toBe(pinia)
    expect(pinia._plugins.length).toBe(2)
  })
  
  it('should call multiple plugins', () => {
    const plugin1 = vi.fn(() => ({ a: 1 }))
    const plugin2 = vi.fn(() => ({ b: 2 }))
    
    const pinia = createPinia()
    pinia.use(plugin1).use(plugin2)
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({})
    })
    
    const store = useStore()
    
    expect(plugin1).toHaveBeenCalled()
    expect(plugin2).toHaveBeenCalled()
    expect(store.a).toBe(1)
    expect(store.b).toBe(2)
  })
  
  it('should work with store subscriptions', () => {
    const subscribeCallback = vi.fn()
    
    const pinia = createPinia()
    pinia.use(({ store }) => {
      store.$subscribe(subscribeCallback)
    })
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$patch({ count: 1 })
    
    expect(subscribeCallback).toHaveBeenCalled()
  })
  
  it('should work with action subscriptions', () => {
    const onActionCallback = vi.fn()
    
    const pinia = createPinia()
    pinia.use(({ store }) => {
      store.$onAction(onActionCallback)
    })
    setActivePinia(pinia)
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() { this.count++ }
      }
    })
    
    const store = useStore()
    store.increment()
    
    expect(onActionCallback).toHaveBeenCalled()
  })
})
```

## 插件开发最佳实践

### 1. 类型安全

```typescript
// 扩展 Store 类型
declare module 'mini-pinia' {
  interface Store {
    customProperty: string
  }
}

const plugin: PiniaPlugin = ({ store }) => {
  return { customProperty: 'value' }
}
```

### 2. 选项处理

```typescript
pinia.use(({ options }) => {
  // 检查 store 是否启用某功能
  if (options.persist) {
    // 启用持久化
  }
})
```

### 3. 避免循环

```typescript
pinia.use(({ store }) => {
  // ❌ 不要在插件中调用 useStore
  // const otherStore = useOtherStore()
  
  // ✅ 使用 $onAction 延迟获取
  store.$onAction(() => {
    const otherStore = useOtherStore()
  })
})
```

下一章我们设计单元测试。
