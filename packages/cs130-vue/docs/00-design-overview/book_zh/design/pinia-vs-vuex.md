# Pinia vs Vuex 架构对比

Pinia 和 Vuex 代表了 Vue 生态状态管理的两代方案。理解它们的架构差异，有助于做出正确的技术选型，也能帮助老项目平滑迁移。

## 核心概念对比

Vuex 的核心概念包括五个：state、getters、mutations、actions、modules。

```javascript
// Vuex store
const store = createStore({
  state: {
    count: 0
  },
  getters: {
    doubleCount: state => state.count * 2
  },
  mutations: {
    INCREMENT(state) {
      state.count++
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => {
        commit('INCREMENT')
      }, 1000)
    }
  }
})
```

Pinia 简化为三个：state、getters、actions。

```javascript
// Pinia store
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubleCount: state => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    },
    async incrementAsync() {
      await delay(1000)
      this.count++
    }
  }
})
```

最显著的变化是移除了 mutations。在 Vuex 中，mutations 是同步修改 state 的唯一途径，actions 中的异步操作最终要通过 commit 调用 mutations。这个设计的初衷是让状态变化可追踪，但实践中增加了大量样板代码。

Pinia 允许在 actions 中直接修改 state。Vue 3 的响应式系统已经能够追踪所有状态变化，mutations 的强制分离变得不再必要。

## 模块化架构

Vuex 采用单一状态树配合嵌套模块的架构：

```javascript
const store = createStore({
  state: { ... },
  modules: {
    user: {
      namespaced: true,
      state: { ... },
      mutations: { ... },
      actions: { ... },
      modules: {
        profile: { ... }  // 可以继续嵌套
      }
    },
    cart: {
      namespaced: true,
      state: { ... }
    }
  }
})
```

这种设计有几个问题。模块需要预先注册，不支持动态创建。namespaced 的字符串路径容易写错。跨模块访问需要 rootState/rootGetters，代码冗长。

Pinia 采用扁平化的多 store 架构：

```javascript
// stores/user.js
export const useUserStore = defineStore('user', { ... })

// stores/cart.js
export const useCartStore = defineStore('cart', { ... })

// 组件中使用
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const user = useUserStore()
const cart = useCartStore()
```

每个 store 是独立的，按需导入。不需要预先注册，支持 tree-shaking。store 间的依赖通过普通的 import 表达，清晰明了。

## 类型推断

Vuex 的类型支持需要额外的努力：

```typescript
// Vuex 中需要手动声明类型
interface State {
  count: number
}

const store = createStore<State>({
  state: {
    count: 0
  },
  mutations: {
    // 这里的 state 需要手动标注
    INCREMENT(state: State) {
      state.count++
    }
  }
})

// 使用时
store.state.count  // OK
store.commit('INCREMENT')  // 字符串，没有类型检查
```

Pinia 的类型推断是自动的：

```typescript
// Pinia 自动推断类型
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  actions: {
    increment() {
      this.count++  // this 的类型自动推断
    }
  }
})

const store = useCounterStore()
store.count         // 类型: number
store.increment()   // 参数和返回值类型自动检查
```

这种差异在大型项目中影响显著。Pinia 的类型支持让 IDE 能提供准确的自动补全，减少运行时错误。

## 状态访问

Vuex 中访问状态有多种方式：

```javascript
// 直接访问
store.state.count

// mapState 辅助函数
computed: {
  ...mapState(['count'])
}

// 通过 getters
store.getters.doubleCount

// mapGetters
computed: {
  ...mapGetters(['doubleCount'])
}
```

mapState 和 mapGetters 是为 Options API 设计的，在 Composition API 中使用不便。

Pinia 的访问更直接：

```javascript
const store = useCounterStore()

// 直接访问 state
store.count

// 直接访问 getter
store.doubleCount

// 解构（需要 storeToRefs 保持响应式）
const { count, doubleCount } = storeToRefs(store)
```

API 更简洁，与 Composition API 的风格一致。

## 修改状态

Vuex 要求通过 mutations 修改状态：

```javascript
// 必须通过 commit
store.commit('INCREMENT')
store.commit('SET_COUNT', 10)

// 在 actions 中
actions: {
  async fetchData({ commit }) {
    const data = await api.getData()
    commit('SET_DATA', data)
  }
}
```

Pinia 可以直接修改，也可以使用 $patch：

```javascript
// 直接修改
store.count++

// 批量修改
store.$patch({
  count: 10,
  name: 'New Name'
})

// 函数式 patch
store.$patch(state => {
  state.items.push(newItem)
  state.count++
})

// 在 actions 中直接修改
actions: {
  async fetchData() {
    const data = await api.getData()
    this.data = data
  }
}
```

$patch 提供了批量更新的能力，可以将多个状态变化合并为一次更新。

## 插件系统

Vuex 的插件订阅 mutations：

```javascript
const myPlugin = store => {
  store.subscribe((mutation, state) => {
    console.log(mutation.type)
    console.log(mutation.payload)
  })
}
```

Pinia 的插件可以订阅更多事件：

```javascript
const myPlugin = ({ store }) => {
  store.$subscribe((mutation, state) => {
    // 状态变化
  })
  
  store.$onAction(({ name, args, after, onError }) => {
    // action 调用
    after(result => {
      // action 完成后
    })
  })
}
```

Pinia 的插件能力更强，可以拦截 actions、添加新属性、修改返回值等。

## 开发工具

两者都支持 Vue DevTools，但 Pinia 的支持更完善。

Vuex DevTools：
- 查看状态快照
- 时间旅行调试
- 查看 mutations 历史

Pinia DevTools：
- 查看所有 store 状态
- 直接编辑状态
- 时间旅行调试
- Actions 调用追踪
- Store 创建追踪

## 迁移建议

从 Vuex 迁移到 Pinia，主要的工作包括：

1. 将模块拆分为独立的 store 文件
2. 移除 mutations，将其逻辑合并到 actions
3. 更新组件中的 mapState/mapGetters 为 store 直接访问
4. 更新 commit 调用为 action 调用或直接修改

对于大型项目，可以采用渐进式迁移。Vuex 和 Pinia 可以共存，逐步将模块迁移为 Pinia store。

迁移后的代码更简洁，类型更安全，开发体验更好。这是 Vue 3 项目的推荐选择。
