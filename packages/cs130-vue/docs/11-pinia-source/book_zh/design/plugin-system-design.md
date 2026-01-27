# 插件系统设计

Pinia 的插件系统是其核心扩展机制。通过插件，你可以为所有 Store 添加新的属性和方法，订阅状态变化，或者在特定生命周期节点注入逻辑。这一章我们将从设计层面分析 Pinia 插件系统的架构思想。

## 插件的设计目标

Pinia 插件系统的设计围绕几个核心目标。

首先是通用扩展能力。插件应该能够扩展所有 Store，而不是某个特定 Store。这意味着一次编写，到处生效。持久化插件、日志插件、调试插件都应该能以这种方式工作。

其次是类型安全。插件添加的属性和方法应该能获得 TypeScript 支持。使用插件扩展的功能时，IDE 应该能提供自动补全，编译器应该能检查类型。

第三是非侵入性。插件不应该改变 Store 的原有行为。它可以添加新功能，但不应该破坏已有功能。Store 不知道、也不需要知道有哪些插件在工作。

第四是可组合性。多个插件应该能共存，互不干扰。每个插件做好自己的事情，不需要关心其他插件。

## 插件的基本结构

Pinia 插件是一个接收 context 对象的函数。context 包含了当前 Store 实例及其相关信息：

```typescript
import { PiniaPluginContext } from 'pinia'

function myPlugin(context: PiniaPluginContext) {
  // context.pinia - Pinia 实例
  // context.app - Vue 应用实例
  // context.store - 当前 Store 实例
  // context.options - defineStore 时传入的选项
}

const pinia = createPinia()
pinia.use(myPlugin)
```

插件函数会在每个 Store 被创建时调用一次。这意味着如果你有 10 个 Store，插件函数会被调用 10 次，每次 context.store 是不同的 Store 实例。

插件可以返回一个对象，该对象的属性会被添加到 Store 上：

```typescript
function timestampPlugin() {
  return {
    createdAt: new Date()
  }
}

// 使用后，每个 Store 都会有 createdAt 属性
const store = useUserStore()
console.log(store.createdAt)  // Date 实例
```

## 扩展 Store 能力

插件最常见的用途是为 Store 添加新的属性或方法。

```typescript
function persistencePlugin({ store }: PiniaPluginContext) {
  // 从 localStorage 恢复状态
  const savedState = localStorage.getItem(store.$id)
  if (savedState) {
    store.$patch(JSON.parse(savedState))
  }
  
  // 添加持久化方法
  return {
    $persist() {
      localStorage.setItem(store.$id, JSON.stringify(store.$state))
    },
    
    $clearPersistence() {
      localStorage.removeItem(store.$id)
    }
  }
}
```

这个插件做了两件事：在 Store 创建时从 localStorage 恢复状态；为 Store 添加 `$persist` 和 `$clearPersistence` 方法供手动调用。

更高级的用法是根据 Store 的配置决定行为：

```typescript
function persistencePlugin({ store, options }: PiniaPluginContext) {
  // 只处理明确标记需要持久化的 Store
  if (!options.persist) return
  
  const config = typeof options.persist === 'object' 
    ? options.persist 
    : { key: store.$id }
  
  // 恢复状态
  const saved = localStorage.getItem(config.key)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 自动持久化
  store.$subscribe(() => {
    localStorage.setItem(config.key, JSON.stringify(store.$state))
  })
}

// 使用时在 Store 定义中配置
const useUserStore = defineStore('user', {
  state: () => ({ name: '' }),
  persist: true  // 启用持久化
})

const useSettingsStore = defineStore('settings', {
  state: () => ({ theme: 'light' }),
  persist: { key: 'app-settings' }  // 自定义存储键
})
```

## 订阅机制

Pinia 提供了两个订阅 API，插件可以利用它们监控 Store 的变化。

`$subscribe` 订阅状态变化：

```typescript
function loggingPlugin({ store }: PiniaPluginContext) {
  store.$subscribe((mutation, state) => {
    console.log(`[${store.$id}] State changed:`, mutation.type)
    console.log('New state:', state)
  })
}
```

mutation 对象包含以下信息：type 表示变更类型（'direct'、'patch object'、'patch function'）；storeId 是 Store 的 ID；payload 是传入 $patch 的数据（如果适用）。

`$onAction` 订阅 action 调用：

```typescript
function actionTrackingPlugin({ store }: PiniaPluginContext) {
  store.$onAction(({ name, store, args, after, onError }) => {
    const startTime = Date.now()
    console.log(`[${store.$id}] Action "${name}" started with:`, args)
    
    after((result) => {
      const duration = Date.now() - startTime
      console.log(`[${store.$id}] Action "${name}" finished in ${duration}ms`)
      console.log('Result:', result)
    })
    
    onError((error) => {
      const duration = Date.now() - startTime
      console.error(`[${store.$id}] Action "${name}" failed after ${duration}ms`)
      console.error('Error:', error)
    })
  })
}
```

$onAction 提供了丰富的钩子：name 是 action 名称；args 是调用参数；after 回调在 action 成功完成后执行；onError 回调在 action 抛出错误时执行。这使得我们可以实现性能监控、错误追踪、审计日志等功能。

## 类型扩展

为了让插件添加的属性获得类型支持，需要使用 TypeScript 的模块扩展：

```typescript
// plugins/persistence.ts
import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomProperties {
    $persist: () => void
    $clearPersistence: () => void
  }
  
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | { key?: string }
  }
}
```

`PiniaCustomProperties` 定义了所有 Store 实例上的新属性。`DefineStoreOptionsBase` 定义了 defineStore 选项中可以接受的新配置。

声明之后，TypeScript 就能识别这些扩展：

```typescript
const store = useUserStore()
store.$persist()  // 类型正确，有自动补全

const useMyStore = defineStore('my', {
  state: () => ({}),
  persist: true  // 类型正确
})
```

## 插件的组合

多个插件按照 use 的顺序依次执行。每个插件独立工作，但它们的效果会叠加：

```typescript
const pinia = createPinia()
pinia.use(loggingPlugin)      // 第一个执行
pinia.use(persistencePlugin)  // 第二个执行
pinia.use(analyticsPlugin)    // 第三个执行
```

当 Store 创建时，这三个插件依次被调用。logging 插件设置日志订阅，persistence 插件恢复状态并设置持久化，analytics 插件设置追踪逻辑。每个插件添加的属性都会附加到 Store 上。

插件之间应该保持独立，避免依赖其他插件的执行顺序。如果确实需要依赖，应该在文档中明确说明。

## 与 Vuex 插件的对比

Vuex 的插件机制相对简单，主要是订阅 mutations：

```javascript
// Vuex 插件
const myPlugin = store => {
  store.subscribe((mutation, state) => {
    console.log(mutation.type, mutation.payload)
  })
}
```

Pinia 插件更加灵活和强大。除了订阅状态变化，还可以订阅 action 调用（包括异步 action 的完成和失败）；可以为 Store 添加属性和方法；可以根据 Store 的配置决定行为；有完整的类型系统支持。

这种设计使得 Pinia 插件可以实现更复杂的功能，同时保持代码的清晰和可维护。

## 插件设计的最佳实践

设计 Pinia 插件时，有几个原则值得遵循。

保持插件职责单一。一个插件做好一件事，不要试图把所有功能塞进一个插件。持久化是一个插件，日志是另一个插件，分析追踪是第三个插件。

提供合理的默认值。插件应该开箱即用，同时允许用户自定义配置。比如持久化插件默认使用 localStorage 和 Store ID 作为键名，但允许用户指定其他存储后端和键名。

清理副作用。如果插件设置了订阅或定时器，应该在适当的时候清理。Pinia 的 Store 可以被 $dispose，插件应该响应这个生命周期。

提供类型声明。在 TypeScript 项目中，没有类型声明的插件使用体验会大打折扣。确保插件导出正确的类型扩展。

下一章，我们将探讨 DevTools 集成设计，了解 Pinia 如何与 Vue DevTools 协作，提供强大的调试能力。
