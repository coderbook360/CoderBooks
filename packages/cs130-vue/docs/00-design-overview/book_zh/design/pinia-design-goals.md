# Pinia 的设计目标

Pinia 是 Vue 官方推荐的状态管理库，也是 Vuex 的继任者。它的设计目标是提供一个更简单、更灵活、与 Vue 3 深度集成的状态管理方案。

## 简化 API

Vuex 的 API 包括 state、getters、mutations、actions、modules 五个概念。mutations 和 actions 的区别让很多开发者困惑：mutations 必须是同步的，actions 可以是异步的，修改状态必须通过 mutations。

Pinia 大幅简化了这个模型。一个 store 只有三个核心概念：state、getters、actions。

```javascript
// Pinia store
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubleCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++  // 直接修改 state
    },
    async fetchAndSet() {
      const data = await fetchData()
      this.count = data.count  // 异步操作中也可以直接修改
    }
  }
})
```

没有 mutations，actions 可以直接修改 state。同步和异步操作使用相同的方式，消除了不必要的模板代码。

## 完整的 TypeScript 支持

Vuex 的 TypeScript 支持一直是痛点。类型推断需要大量的手动声明，使用体验不佳。

Pinia 从设计之初就考虑了 TypeScript。store 的 state、getters、actions 都有完整的类型推断：

```typescript
const store = useCounterStore()

store.count        // 类型: number
store.doubleCount  // 类型: number
store.increment()  // 类型检查参数和返回值
```

IDE 可以提供准确的自动补全，类型错误在编译时就能发现。这在大型项目中尤其重要。

## Composition API 风格

Pinia 提供了 Composition API 风格的 store 定义方式：

```javascript
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  
  function increment() {
    count.value++
  }
  
  return { count, doubleCount, increment }
})
```

这种方式与组件的 setup 函数使用相同的模式。熟悉 Composition API 的开发者可以无缝迁移已有的逻辑。

setup 风格的 store 可以使用任何 Composition API 特性：watch、watchEffect、自定义 composables 等。这让状态管理与组件逻辑的边界变得模糊——这是有意为之的设计。

## 模块化设计

Vuex 使用单一状态树加模块（modules）的方式组织代码。模块需要显式注册到根 store：

```javascript
// Vuex 模块
const store = createStore({
  modules: {
    user: userModule,
    cart: cartModule
  }
})
```

Pinia 采用扁平化的多 store 设计。每个 store 是独立的，不需要预先注册：

```javascript
// Pinia stores
// stores/user.js
export const useUserStore = defineStore('user', { ... })

// stores/cart.js
export const useCartStore = defineStore('cart', { ... })

// 在组件中直接使用，无需注册
const user = useUserStore()
const cart = useCartStore()
```

这种设计让 store 的代码分割更自然。每个 store 可以按需导入，支持 tree-shaking。

## Store 间的组合

在 Vuex 中，跨模块访问需要通过 rootState 或 rootGetters：

```javascript
// Vuex 中访问其他模块
actions: {
  someAction({ rootState, rootGetters }) {
    console.log(rootState.user.name)
    console.log(rootGetters['user/isLoggedIn'])
  }
}
```

Pinia 的 store 之间可以直接相互调用：

```javascript
// Pinia 中组合 stores
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', {
  actions: {
    checkout() {
      const user = useUserStore()
      if (!user.isLoggedIn) {
        throw new Error('请先登录')
      }
      // ...
    }
  }
})
```

这种方式更直观，也更容易维护。依赖关系是显式的 import，不是隐式的 rootState。

## 开发工具支持

Pinia 提供了完善的 Vue DevTools 集成：

- 时间旅行调试：查看 state 变化历史，可以跳转到任意时间点
- 状态编辑：在 DevTools 中直接修改 state 值
- Actions 追踪：查看 actions 的调用和执行时间

这些功能帮助开发者理解应用的状态变化流程，快速定位问题。

## 服务端渲染支持

Pinia 内置了 SSR 支持。在服务端创建独立的 Pinia 实例，避免跨请求的状态污染：

```javascript
// 服务端入口
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  
  return { app, pinia }
}
```

客户端 hydration 时，Pinia 会自动恢复服务端传递的状态：

```javascript
// 客户端入口
const pinia = createPinia()
pinia.state.value = window.__PINIA_STATE__
```

## 插件系统

Pinia 提供了简洁的插件 API。插件可以扩展 store 的功能，添加新属性或拦截操作：

```javascript
const myPlugin = ({ store }) => {
  // 添加新属性
  store.$onAction(({ name, store, args, after, onError }) => {
    console.log(`Action ${name} 开始执行`)
    after((result) => {
      console.log(`Action ${name} 执行完成`)
    })
  })
}

const pinia = createPinia()
pinia.use(myPlugin)
```

插件的应用场景包括：持久化存储、日志记录、错误上报、状态同步等。

## 设计哲学

Pinia 的设计体现了几个核心理念：

**简单优先**。去掉不必要的复杂性，让 API 尽可能直观。mutations 的强制使用在 Vue 3 的响应式系统中已经不再必要，所以直接移除。

**类型安全**。在设计 API 时就考虑 TypeScript 的类型推断，而不是事后打补丁。

**组合优于继承**。store 之间通过函数调用组合，而不是通过模块树继承。

**与 Vue 深度集成**。使用 Vue 的响应式系统，遵循 Vue 的设计模式，成为 Vue 生态的自然延伸。

这些设计让 Pinia 成为 Vue 3 应用中状态管理的首选方案。
