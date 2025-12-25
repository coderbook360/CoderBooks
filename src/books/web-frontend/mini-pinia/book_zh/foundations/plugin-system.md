---
sidebar_position: 4
title: Pinia 插件架构概述
---

# Pinia 插件架构概述

Pinia 的插件系统是其最强大的扩展机制之一。通过插件，我们可以在不修改核心代码的情况下，为所有 Store 添加通用功能。

本章将从设计角度介绍 Pinia 插件系统的架构，为后续的详细实现章节打下基础。

## 为什么需要插件系统？

思考一个问题：如果你想给所有 Store 添加持久化功能，应该怎么做？

**方案一：在每个 Store 中重复实现**

```javascript
// store/user.js
const useUserStore = defineStore('user', {
  state: () => {
    // 从 localStorage 恢复
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : { name: '', token: null }
  },
  actions: {
    setName(name) {
      this.name = name
      // 保存到 localStorage
      localStorage.setItem('user', JSON.stringify(this.$state))
    }
  }
})

// store/cart.js
const useCartStore = defineStore('cart', {
  state: () => {
    // 重复的恢复逻辑
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : { items: [] }
  },
  actions: {
    addItem(item) {
      this.items.push(item)
      // 重复的保存逻辑
      localStorage.setItem('cart', JSON.stringify(this.$state))
    }
  }
})
```

这种方案的问题很明显：**代码重复，难以维护**。如果持久化逻辑需要修改（比如改用 IndexedDB），需要修改每一个 Store。

**方案二：使用插件系统**

```javascript
// plugins/persistence.js
export function persistencePlugin({ store }) {
  // 恢复状态
  const saved = localStorage.getItem(store.$id)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 订阅变更
  store.$subscribe(() => {
    localStorage.setItem(store.$id, JSON.stringify(store.$state))
  })
}

// main.js
const pinia = createPinia()
pinia.use(persistencePlugin)
```

现在所有 Store 自动具有持久化能力，修改逻辑只需要改一处。

这就是插件系统的价值：**关注点分离**和**代码复用**。

## 插件系统设计目标

Pinia 插件系统的设计遵循几个核心目标：

### 1. 简洁的 API

插件就是一个函数，接收上下文对象，返回可选的扩展属性：

```javascript
function myPlugin(context) {
  // context 包含 pinia, store, app, options 等
  return {
    // 返回的属性会被添加到 store
    $customProperty: 'hello'
  }
}
```

没有复杂的注册机制，没有继承关系，就是简单的函数调用。

### 2. 完整的上下文访问

插件可以访问：
- **pinia**: Pinia 实例，可以访问所有 Store
- **store**: 当前正在创建的 Store 实例
- **app**: Vue 应用实例（如果在 Vue 环境中）
- **options**: defineStore 的原始选项

```javascript
function myPlugin({ pinia, store, app, options }) {
  // 可以根据 options 中的自定义配置决定行为
  if (options.persistence) {
    // 只对配置了 persistence 的 Store 启用持久化
    setupPersistence(store)
  }
}
```

### 3. 多种扩展方式

插件可以通过多种方式扩展 Store：

```javascript
function myPlugin({ store }) {
  // 方式1：返回新属性
  return { $hello: 'world' }
  
  // 方式2：直接修改 store
  store.$hello = 'world'
  
  // 方式3：添加 state
  store.$state.pluginState = { initialized: true }
  
  // 方式4：订阅变更
  store.$subscribe((mutation) => {
    console.log('state changed', mutation)
  })
  
  // 方式5：包装 action
  store.$onAction(({ name, after, onError }) => {
    console.log(`action ${name} started`)
    after(() => console.log(`action ${name} finished`))
    onError((error) => console.log(`action ${name} failed`, error))
  })
}
```

### 4. 类型安全

Pinia 的插件系统对 TypeScript 友好，可以正确推断扩展属性的类型：

```typescript
declare module 'pinia' {
  export interface PiniaCustomProperties {
    $hello: string
  }
}

function myPlugin(): PiniaCustomProperties {
  return { $hello: 'world' }
}

// 使用时有完整的类型提示
const store = useStore()
console.log(store.$hello) // 类型为 string
```

## 插件执行时机

插件在 Store 创建过程中执行。让我们看看具体时机：

```javascript
// 1. 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 })
})

// 2. 注册插件
const pinia = createPinia()
pinia.use(myPlugin)

// 3. 首次使用 Store 时，插件被调用
const counter = useCounterStore()
// myPlugin 在这里被调用，counter store 作为参数传入
```

关键点：

1. **延迟执行**：插件不是在 `pinia.use()` 时执行，而是在 Store 首次被使用时
2. **每个 Store 执行一次**：同一个 Store 只会调用一次插件
3. **顺序执行**：多个插件按注册顺序执行

```javascript
pinia.use(plugin1)
pinia.use(plugin2)
pinia.use(plugin3)

// 当 useStore() 被调用时：
// 1. 创建 store 基础结构
// 2. 调用 plugin1(context)
// 3. 调用 plugin2(context)
// 4. 调用 plugin3(context)
// 5. 返回完整的 store
```

## PiniaPluginContext 上下文

插件接收的上下文对象是理解插件系统的关键：

```typescript
interface PiniaPluginContext {
  // Pinia 实例
  pinia: Pinia
  
  // Vue 应用实例
  app: App
  
  // 当前 Store 实例
  store: Store
  
  // defineStore 的原始选项
  options: DefineStoreOptions
}
```

### pinia 对象

提供对 Pinia 全局状态的访问：

```javascript
function myPlugin({ pinia }) {
  // 访问所有已注册的 Store
  console.log([...pinia._s.keys()])
  
  // 访问全局状态树
  console.log(pinia.state.value)
  
  // 注册新插件（不常用）
  pinia.use(anotherPlugin)
}
```

### store 对象

当前正在创建的 Store 实例，已经包含了 state、getters、actions：

```javascript
function myPlugin({ store }) {
  // 访问 store 信息
  console.log(store.$id)
  console.log(store.$state)
  
  // 订阅状态变更
  store.$subscribe((mutation, state) => {
    console.log('mutation', mutation.type, mutation.storeId)
  })
  
  // 订阅 action 调用
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`calling ${name} with args:`, args)
  })
}
```

### options 对象

`defineStore` 的原始选项，可以用于自定义配置：

```javascript
// 定义 Store 时添加自定义选项
const useUserStore = defineStore('user', {
  state: () => ({ name: '' }),
  // 自定义选项
  debounce: {
    search: 300
  }
})

// 插件读取自定义选项
function debouncePlugin({ options, store }) {
  if (options.debounce) {
    for (const [action, delay] of Object.entries(options.debounce)) {
      // 对指定 action 应用防抖
      const original = store[action]
      store[action] = debounce(original, delay)
    }
  }
}
```

## 插件返回值处理

插件可以返回一个对象，其属性会被合并到 Store：

```javascript
function myPlugin({ store }) {
  // 返回的属性会添加到 store
  return {
    $customMethod() {
      console.log('custom method called on', store.$id)
    },
    $customRef: ref('hello')
  }
}

// 使用
const store = useStore()
store.$customMethod() // 可以调用
console.log(store.$customRef) // 可以访问
```

返回值的处理规则：

1. **属性合并**：返回对象的所有属性被添加到 store
2. **响应式保持**：如果返回 `ref`，会保持响应式
3. **冲突覆盖**：同名属性会被后注册的插件覆盖

## 常见插件模式

### 模式1：状态持久化

```javascript
function persistencePlugin({ store, options }) {
  const key = options.persist?.key || store.$id
  
  if (options.persist !== false) {
    // 恢复
    const saved = localStorage.getItem(key)
    if (saved) {
      store.$patch(JSON.parse(saved))
    }
    
    // 订阅保存
    store.$subscribe(() => {
      localStorage.setItem(key, JSON.stringify(store.$state))
    }, { detached: true })
  }
}
```

### 模式2：日志记录

```javascript
function loggerPlugin({ store }) {
  store.$subscribe((mutation) => {
    console.log(`[${store.$id}] ${mutation.type}:`, mutation.payload)
  })
  
  store.$onAction(({ name, args, after, onError }) => {
    const start = Date.now()
    
    after(() => {
      console.log(`[${store.$id}] ${name} completed in ${Date.now() - start}ms`)
    })
    
    onError((error) => {
      console.error(`[${store.$id}] ${name} failed:`, error)
    })
  })
}
```

### 模式3：共享状态同步

```javascript
function syncTabsPlugin({ store }) {
  const channel = new BroadcastChannel(`pinia-${store.$id}`)
  
  // 接收其他标签页的更新
  channel.onmessage = (event) => {
    store.$patch(event.data)
  }
  
  // 发送更新到其他标签页
  store.$subscribe((mutation, state) => {
    channel.postMessage(toRaw(state))
  }, { detached: true })
}
```

### 模式4：性能监控

```javascript
function performancePlugin({ store }) {
  store.$onAction(({ name, after, onError }) => {
    const start = performance.now()
    
    after(() => {
      const duration = performance.now() - start
      if (duration > 100) {
        console.warn(`Slow action: ${store.$id}.${name} took ${duration}ms`)
      }
    })
  })
}
```

## 本章小结

本章从设计角度介绍了 Pinia 插件系统：

1. **设计动机**：实现关注点分离和代码复用，避免在每个 Store 中重复通用逻辑。

2. **核心设计**：
   - 插件是一个函数，接收上下文对象
   - 可以返回属性扩展 Store
   - 也可以直接修改 store 或订阅变更

3. **上下文对象**：包含 pinia、store、app、options，提供完整的访问能力。

4. **执行时机**：在 Store 首次被使用时执行，每个 Store 只执行一次。

5. **常见模式**：持久化、日志、标签页同步、性能监控等。

在后续章节中，我们将详细实现插件系统的核心机制。下一章，我们将搭建开发环境，准备实现我们自己的 Mini-Pinia。

---

**下一章**：[开发环境搭建与项目结构](dev-environment.md)
