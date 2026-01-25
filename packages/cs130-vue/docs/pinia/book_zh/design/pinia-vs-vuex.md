# Pinia vs Vuex 对比

理论上的设计目标需要通过具体的代码来验证。这一章，我们将通过实际的代码对比，深入理解 Pinia 和 Vuex 在各个方面的差异。这不是为了证明谁更好，而是帮助你理解两者的设计取舍，以及 Pinia 如何在实践中兑现它的设计承诺。

## Store 定义对比

让我们从最基本的 Store 定义开始。假设我们要实现一个用户模块，包含用户信息和登录登出功能。

Vuex 的写法需要分别定义 state、getters、mutations、actions 四个部分：

```javascript
// store/modules/user.js
export default {
  namespaced: true,
  
  state: () => ({
    user: null,
    isLoading: false,
    error: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.user,
    userName: (state) => state.user?.name ?? 'Guest'
  },
  
  mutations: {
    SET_USER(state, user) {
      state.user = user
    },
    SET_LOADING(state, loading) {
      state.isLoading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    }
  },
  
  actions: {
    async login({ commit }, credentials) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        const user = await api.login(credentials)
        commit('SET_USER', user)
        return user
      } catch (error) {
        commit('SET_ERROR', error.message)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    logout({ commit }) {
      commit('SET_USER', null)
    }
  }
}
```

Pinia 的写法简洁得多，不需要 mutations 这一层：

```typescript
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    error: null as string | null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.user,
    userName: (state) => state.user?.name ?? 'Guest'
  },
  
  actions: {
    async login(credentials: Credentials) {
      this.isLoading = true
      this.error = null
      try {
        this.user = await api.login(credentials)
        return this.user
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    logout() {
      this.user = null
    }
  }
})
```

对比这两段代码，差异非常明显。Vuex 版本需要定义三个 mutations（SET_USER、SET_LOADING、SET_ERROR），每个 mutation 只是简单的赋值操作。Action 中每次状态更新都要调用 `commit`。Pinia 版本直接通过 `this` 访问和修改状态，代码量减少了约三分之一，而且逻辑更加直观。

## 组件中使用对比

Store 定义完成后，我们需要在组件中使用它。两者的使用方式也有显著差异。

Vuex 在 Options API 中通常使用辅助函数：

```javascript
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  computed: {
    ...mapState('user', ['user', 'isLoading', 'error']),
    ...mapGetters('user', ['isLoggedIn', 'userName'])
  },
  methods: {
    ...mapActions('user', ['login', 'logout'])
  }
}
```

在 Composition API 中使用 useStore：

```javascript
import { computed } from 'vue'
import { useStore } from 'vuex'

export default {
  setup() {
    const store = useStore()
    
    const user = computed(() => store.state.user.user)
    const isLoading = computed(() => store.state.user.isLoading)
    const isLoggedIn = computed(() => store.getters['user/isLoggedIn'])
    
    async function handleLogin(credentials) {
      await store.dispatch('user/login', credentials)
    }
    
    return { user, isLoading, isLoggedIn, handleLogin }
  }
}
```

Pinia 的使用方式更加简洁：

```typescript
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

export default {
  setup() {
    const userStore = useUserStore()
    
    // storeToRefs 保持响应性
    const { user, isLoading, isLoggedIn } = storeToRefs(userStore)
    
    // actions 可以直接解构
    const { login, logout } = userStore
    
    return { user, isLoading, isLoggedIn, login, logout }
  }
}
```

Pinia 的 Store 就像一个普通的响应式对象，可以直接访问属性和调用方法。不需要记忆 `state.module.property`、`getters['module/getter']`、`dispatch('module/action')` 这样复杂的访问模式。`storeToRefs` 工具函数可以将 state 和 getters 解构为 ref，保持响应性。Actions 可以直接解构使用。

## TypeScript 类型支持对比

类型支持是 Pinia 相对于 Vuex 最大的优势之一。

Vuex 中，即使你添加了类型声明，使用时依然困难：

```typescript
// Vuex：类型声明繁琐，使用时缺乏推导
interface UserState {
  user: User | null
  isLoading: boolean
}

declare module 'vuex' {
  interface RootState {
    user: UserState
  }
}

// 使用时，这个字符串没有类型检查
store.dispatch('user/login', credentials)
// 如果拼错了 'user/logn'，只有运行时才会发现
```

Pinia 从定义到使用全程有类型推导：

```typescript
// Pinia：定义时自动推导类型
const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    isLoading: false
  }),
  
  actions: {
    async login(credentials: Credentials): Promise<User> {
      // ...
    }
  }
})

// 使用时完整的类型支持
const userStore = useUserStore()

userStore.user      // 类型: User | null
userStore.isLoading // 类型: boolean
userStore.login({ username: '', password: '' }) // 参数类型检查
userStore.login('wrong')  // 编译错误：类型不匹配
userStore.logn() // 编译错误：属性不存在
```

这种类型安全不仅能在编译时捕获错误，还能提供更好的开发体验。IDE 可以提供精确的自动补全，重构时能自动更新引用，代码导航可以直接跳转到定义。

## 模块化方案对比

随着应用规模增长，Store 需要被拆分成多个模块。两者的模块化策略完全不同。

Vuex 使用嵌套模块，通过配置合并到根 Store：

```javascript
// store/index.js
import Vue from 'vue'
import Vuex from 'vuex'
import user from './modules/user'
import cart from './modules/cart'
import order from './modules/order'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user,
    cart,
    order: {
      namespaced: true,
      modules: {
        history: orderHistory  // 嵌套模块
      }
    }
  }
})

// 访问嵌套模块
store.state.order.history.list
store.dispatch('order/history/fetch')
```

Pinia 使用独立的 Store，通过 import 组合：

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', { /* ... */ })

// stores/cart.ts
export const useCartStore = defineStore('cart', { /* ... */ })

// stores/order.ts
import { useUserStore } from './user'
import { useCartStore } from './cart'

export const useOrderStore = defineStore('order', {
  actions: {
    async createOrder() {
      const userStore = useUserStore()
      const cartStore = useCartStore()
      
      // 直接使用其他 Store
      const order = {
        userId: userStore.user?.id,
        items: cartStore.items
      }
      // ...
    }
  }
})

// 使用时各自独立
const userStore = useUserStore()
const orderStore = useOrderStore()
```

Pinia 的模块化更像是普通的 JavaScript 模块系统。每个 Store 是独立的单元，依赖关系通过 import 表达，非常直观。不需要考虑命名空间、根模块注册、访问路径等概念。

## 状态修改方式对比

Vuex 强制通过 Mutations 修改状态：

```javascript
// 定义 mutation
mutations: {
  INCREMENT(state) {
    state.count++
  },
  ADD_ITEM(state, item) {
    state.items.push(item)
  }
}

// 使用时必须 commit
store.commit('INCREMENT')
store.commit('ADD_ITEM', { id: 1, name: 'Item' })
```

Pinia 提供多种灵活的修改方式：

```typescript
const store = useCounterStore()

// 方式一：直接修改
store.count++

// 方式二：批量修改（对象形式）
store.$patch({
  count: store.count + 1,
  name: 'new name'
})

// 方式三：批量修改（函数形式，适合复杂逻辑）
store.$patch((state) => {
  state.items.push({ id: 1, name: 'Item' })
  state.hasNewItems = true
})

// 方式四：通过 action
store.increment()
```

`$patch` 的函数形式特别有用。当需要修改数组或执行复杂逻辑时，对象形式的 patch 可能不够用。函数形式让你可以执行任意操作，同时这些操作会被组合成一次状态变更，DevTools 中只会显示一条记录。

## 插件系统对比

两者都支持插件扩展，但 API 风格不同。

Vuex 插件通过 subscribe 订阅 mutations：

```javascript
const myPlugin = (store) => {
  store.subscribe((mutation, state) => {
    console.log(mutation.type, mutation.payload)
    localStorage.setItem('vuex-state', JSON.stringify(state))
  })
}

const store = new Vuex.Store({
  plugins: [myPlugin]
})
```

Pinia 插件更加灵活，可以扩展 Store 的能力：

```typescript
import { PiniaPluginContext } from 'pinia'

function myPlugin({ store, options }: PiniaPluginContext) {
  // 添加新属性
  store.customProperty = 'hello'
  
  // 订阅状态变化
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state))
  })
  
  // 订阅 action 调用
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`Action ${name} called with`, args)
    
    after((result) => {
      console.log(`Action ${name} finished with`, result)
    })
    
    onError((error) => {
      console.error(`Action ${name} failed:`, error)
    })
  })
}

const pinia = createPinia()
pinia.use(myPlugin)
```

Pinia 的插件可以在 action 执行前后插入逻辑，可以处理异步 action 的成功和失败，可以给 Store 添加新的属性和方法。这种能力使得持久化、日志记录、错误追踪等功能的实现更加优雅。

## 迁移成本评估

从 Vuex 迁移到 Pinia 的成本取决于项目规模和使用方式。

**低成本场景**：如果你的 Vuex 模块相对简单，主要使用 state、getters 和 actions，迁移过程相当直接。去掉 mutations，把 commit 调用改成直接赋值，把 dispatch 调用改成函数调用。

**中等成本场景**：如果使用了复杂的嵌套模块，需要将结构重新组织为扁平的独立 Store，并重新设计 Store 之间的依赖关系。

**高成本场景**：如果项目大量使用了 Vuex 的 mapState、mapGetters 等辅助函数，或者有自定义的 Vuex 插件，迁移工作量会比较大。

好消息是，Pinia 和 Vuex 可以共存。你可以渐进式地迁移，先在新功能中使用 Pinia，再逐步迁移旧代码。Pinia 官方也提供了迁移指南，帮助你处理常见的迁移场景。

## 小结

通过这一章的对比，我们可以看到 Pinia 在多个方面的改进：更少的样板代码、更好的类型支持、更直观的模块化、更灵活的状态修改方式。这些改进不是凭空产生的，而是对 Vuex 在实际使用中暴露出的问题的回应。

当然，Vuex 在某些方面仍有其价值。如果你的团队已经熟悉 Vuex，项目运行稳定，没有遇到类型问题或样板代码困扰，继续使用 Vuex 也是合理的选择。技术选型应该基于实际需求，而不是追逐新潮。

下一章，我们将探讨 Pinia 对 Composition API 风格设计的深度支持。
