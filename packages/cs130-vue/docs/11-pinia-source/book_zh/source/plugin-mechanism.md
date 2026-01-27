# 插件机制

Pinia 的插件系统允许扩展 Store 功能。这一章分析插件机制的实现原理。

## 插件的作用

插件可以：

- 为所有 Store 添加新属性或方法
- 包装现有方法
- 监听状态变化
- 实现持久化、日志、DevTools 集成等功能

## 基本用法

```typescript
import { createPinia } from 'pinia'

const pinia = createPinia()

// 添加插件
pinia.use(({ store }) => {
  store.hello = 'world'
})
```

## 插件注册

createPinia 时初始化插件数组：

```typescript
function createPinia(): Pinia {
  const _p: PiniaPlugin[] = []
  
  const pinia: Pinia = {
    // ...
    use(plugin) {
      _p.push(plugin)
      return this
    },
    _p,
    // ...
  }
  
  return pinia
}
```

pinia.use() 将插件函数添加到数组。

## 插件执行时机

插件在 Store 创建时执行：

```typescript
function createSetupStore(/* ... */) {
  const store = reactive({ /* ... */ })
  
  // 执行所有插件
  pinia._p.forEach((extender) => {
    const extensions = extender({
      store,
      app: pinia._a,
      pinia,
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

每个 Store 创建时，所有插件都会被调用。

## 插件函数签名

```typescript
type PiniaPlugin = (context: PiniaPluginContext) => Partial<PiniaCustomProperties> | void

interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: DefineStoreOptionsInPlugin
}
```

插件接收上下文对象，可以返回要添加到 Store 的属性。

## 添加属性

插件返回的对象会合并到 Store：

```typescript
pinia.use(() => {
  return {
    createdAt: new Date(),
    greet() {
      console.log('Hello from plugin!')
    }
  }
})

// 所有 Store 都有这些属性
const store = useUserStore()
store.createdAt  // Date
store.greet()    // 'Hello from plugin!'
```

## 直接修改 store

也可以直接在 store 上添加属性：

```typescript
pinia.use(({ store }) => {
  store.customProperty = 'value'
  
  store.customMethod = function() {
    console.log('Custom method')
  }
})
```

两种方式效果相同。

## 响应式属性

添加响应式属性需要使用 ref：

```typescript
import { ref } from 'vue'

pinia.use(({ store }) => {
  const loading = ref(false)
  
  // 必须使用 toRefs 确保响应性
  store.loading = loading
  
  // 或返回对象
  return { loading }
})
```

## 访问 Store 信息

通过 context 访问 Store 信息：

```typescript
pinia.use(({ store, options }) => {
  // Store ID
  console.log(store.$id)
  
  // Store 定义选项
  console.log(options)
  
  // 判断 Store 类型
  if (options.state) {
    // Options Store
  }
  
  // 访问状态
  console.log(store.$state)
})
```

## 包装 Action

插件可以包装 action：

```typescript
pinia.use(({ store }) => {
  // 保存原始 action
  const originalActions = {}
  
  for (const key in store.$state) {
    if (typeof store[key] === 'function') {
      originalActions[key] = store[key]
      
      // 包装
      store[key] = function(...args) {
        console.log(`Action ${key} called with`, args)
        const result = originalActions[key].apply(this, args)
        console.log(`Action ${key} returned`, result)
        return result
      }
    }
  }
})
```

更好的方式是使用 $onAction：

```typescript
pinia.use(({ store }) => {
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`Action ${name} called`)
    
    after((result) => {
      console.log(`Action ${name} finished`)
    })
    
    onError((error) => {
      console.error(`Action ${name} failed`)
    })
  })
})
```

## 监听状态变化

使用 $subscribe：

```typescript
pinia.use(({ store }) => {
  store.$subscribe((mutation, state) => {
    console.log(`Store ${store.$id} changed:`, mutation)
  })
})
```

## 条件应用

可以根据条件决定是否应用插件逻辑：

```typescript
pinia.use(({ store }) => {
  // 只对特定 Store 应用
  if (store.$id === 'user') {
    return { isUserStore: true }
  }
  
  // 检查是否有特定选项
  if (store.$options?.persist) {
    // 应用持久化逻辑
  }
})
```

## 自定义选项

可以在 defineStore 时传入自定义选项：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({ name: '' }),
  // 自定义选项
  persist: true,
  debounce: { save: 300 }
})

// 插件中读取
pinia.use(({ options, store }) => {
  if (options.persist) {
    // 实现持久化
  }
  
  if (options.debounce) {
    // 实现防抖
  }
})
```

## 类型扩展

为添加的属性声明类型：

```typescript
// 声明模块扩展
declare module 'pinia' {
  export interface PiniaCustomProperties {
    createdAt: Date
    greet(): void
  }
  
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean
    debounce?: Record<string, number>
  }
}

// 插件实现
pinia.use(() => ({
  createdAt: new Date(),
  greet() { console.log('Hello') }
}))

// 现在 TypeScript 知道这些属性
store.createdAt  // Date，有类型提示
store.greet()    // 有类型提示
```

## 插件顺序

插件按注册顺序执行：

```typescript
pinia.use(pluginA)  // 先执行
pinia.use(pluginB)  // 后执行
```

后注册的插件可以覆盖先注册的插件添加的属性。

## 链式调用

use 返回 pinia 实例，支持链式调用：

```typescript
pinia
  .use(pluginA)
  .use(pluginB)
  .use(pluginC)
```

## 实现日志插件

```typescript
function loggerPlugin({ store }) {
  // 监听 action
  store.$onAction(({ name, args, after, onError }) => {
    const start = Date.now()
    
    console.log(`[${store.$id}] Action "${name}" started`)
    
    after((result) => {
      const duration = Date.now() - start
      console.log(`[${store.$id}] Action "${name}" finished in ${duration}ms`)
    })
    
    onError((error) => {
      console.error(`[${store.$id}] Action "${name}" failed:`, error)
    })
  })
  
  // 监听状态变化
  store.$subscribe((mutation, state) => {
    console.log(`[${store.$id}] State changed:`, mutation.type)
  })
}

pinia.use(loggerPlugin)
```

## 插件与 SSR

SSR 环境需要特殊处理：

```typescript
pinia.use(({ store, pinia }) => {
  // 检查是否是服务端
  if (typeof window === 'undefined') {
    // 服务端逻辑
    return
  }
  
  // 客户端逻辑
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state))
  })
})
```

## 注意事项

不要在插件中创建 Store：

```typescript
// ❌ 可能导致循环依赖
pinia.use(({ store }) => {
  const otherStore = useOtherStore()  // 危险
})
```

保持插件简洁：

```typescript
// ✅ 好的做法
pinia.use(({ store }) => {
  store.$onAction(logAction)
})

// ❌ 避免复杂逻辑
pinia.use(({ store }) => {
  // 大量复杂代码...
})
```

下一章我们将分析插件上下文的详细内容。
