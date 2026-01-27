# 插件系统设计

Pinia 的插件系统让开发者可以扩展 store 的功能。通过插件，可以添加全局属性、拦截操作、实现持久化等。

## 插件的基本结构

Pinia 插件是一个接收 context 对象的函数：

```javascript
function myPlugin(context) {
  // context 包含：
  // - app: Vue 应用实例
  // - pinia: Pinia 实例
  // - store: 当前 store 实例
  // - options: defineStore 的选项
  
  console.log(`Store ${context.store.$id} 被创建`)
}

const pinia = createPinia()
pinia.use(myPlugin)
```

插件在每个 store 创建时调用。可以在这个时机添加属性、设置监听器、修改行为。

## 添加全局属性

插件可以为所有 store 添加新属性：

```javascript
function routerPlugin({ store }) {
  store.router = markRaw(router)
}

// 现在所有 store 都可以访问 router
const userStore = useUserStore()
userStore.router.push('/login')
```

`markRaw` 告诉 Vue 不要将 router 转换为响应式。对于第三方对象，这可以避免不必要的代理和潜在的问题。

也可以使用 TypeScript 声明扩展 store 的类型：

```typescript
declare module 'pinia' {
  export interface PiniaCustomProperties {
    router: Router
  }
}
```

## 订阅状态变化

`$subscribe` 方法让插件可以监听状态变化：

```javascript
function loggerPlugin({ store }) {
  store.$subscribe((mutation, state) => {
    console.log('Store:', store.$id)
    console.log('Mutation type:', mutation.type)
    console.log('New state:', JSON.stringify(state))
  })
}
```

mutation 对象包含变化的类型和详情。type 可以是 'direct'（直接修改）、'patch object'（$patch 对象）或 'patch function'（$patch 函数）。

这个能力可以用于日志记录、状态同步、持久化等场景。

## 拦截 Actions

`$onAction` 方法让插件可以拦截 action 的执行：

```javascript
function actionLoggerPlugin({ store }) {
  store.$onAction(({ name, store, args, after, onError }) => {
    const startTime = Date.now()
    console.log(`Action ${name} 开始执行，参数:`, args)
    
    after((result) => {
      const duration = Date.now() - startTime
      console.log(`Action ${name} 完成，耗时 ${duration}ms`)
    })
    
    onError((error) => {
      console.error(`Action ${name} 出错:`, error)
    })
  })
}
```

这种拦截能力可以用于：

- 性能监控：记录 action 的执行时间
- 错误上报：捕获并上报 action 中的错误
- 乐观更新：在 action 开始时预先更新 UI
- 权限检查：在执行前验证用户权限

## 持久化插件示例

一个常见的需求是将 store 状态持久化到 localStorage：

```javascript
function persistPlugin({ store, options }) {
  // 检查是否启用持久化
  if (!options.persist) return
  
  const key = `pinia-${store.$id}`
  
  // 从 localStorage 恢复状态
  const saved = localStorage.getItem(key)
  if (saved) {
    store.$patch(JSON.parse(saved))
  }
  
  // 订阅变化，保存到 localStorage
  store.$subscribe((mutation, state) => {
    localStorage.setItem(key, JSON.stringify(state))
  })
}

// 使用
export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    preferences: {}
  }),
  persist: true  // 启用持久化
})
```

实际项目中可以使用 pinia-plugin-persistedstate 等成熟的插件库，它们处理了更多边界情况。

## 添加新方法

插件可以为 store 添加新方法：

```javascript
function resetPlugin({ store }) {
  // 保存初始状态
  const initialState = JSON.parse(JSON.stringify(store.$state))
  
  // 添加 reset 方法
  store.reset = function() {
    this.$patch(initialState)
  }
}

// 使用
const store = useUserStore()
store.reset()  // 重置为初始状态
```

这种方式可以统一添加通用功能，避免在每个 store 中重复实现。

## 插件的组合

多个插件可以组合使用，它们按注册顺序依次执行：

```javascript
const pinia = createPinia()
pinia.use(loggerPlugin)
pinia.use(persistPlugin)
pinia.use(routerPlugin)
```

插件之间相互独立，每个插件处理自己的逻辑。但要注意执行顺序可能影响行为，比如日志插件通常应该最先注册。

## 条件性应用

插件可以根据条件选择性应用：

```javascript
function devOnlyPlugin({ store }) {
  if (process.env.NODE_ENV !== 'development') return
  
  // 只在开发环境执行的逻辑
  store.$subscribe((mutation, state) => {
    console.log('State changed:', state)
  })
}
```

也可以根据 store 的配置决定是否应用：

```javascript
function selectivePlugin({ store, options }) {
  if (!options.enablePlugin) return
  
  // 只对启用了 enablePlugin 选项的 store 生效
}
```

## 与 Vue 应用的集成

插件可以访问 Vue 应用实例，这让与其他 Vue 功能的集成成为可能：

```javascript
function i18nPlugin({ app, store }) {
  // 访问应用级的 i18n 实例
  store.$t = app.config.globalProperties.$t
}

// 在 store 中使用翻译
const userStore = useUserStore()
userStore.$t('welcome')
```

这种集成能力让 Pinia 可以与 Vue 生态的其他库协同工作。

## 设计原则

Pinia 插件系统的设计遵循几个原则：

**非侵入性**。插件不会改变 store 的基本行为，只是添加额外的功能。

**组合性**。多个插件可以独立工作，不需要相互了解。

**可预测性**。插件的执行时机和顺序是确定的。

**类型安全**。通过 TypeScript 声明合并，可以为插件添加的属性提供类型支持。

这些原则让插件生态可以健康发展，开发者可以放心使用第三方插件，也可以轻松开发自己的插件。
