# Vuex 的设计与局限

Vuex 是 Vue 官方的状态管理库，它将 Flux 架构与 Vue 的响应式系统深度结合，成为 Vue 2 时代的事实标准。理解 Vuex 的设计决策和局限性，是理解 Pinia 为什么存在的关键。

## Vuex 的核心设计

Vuex 定义了五个核心概念：State、Getters、Mutations、Actions 和 Modules。这套概念体系比 Redux 的结构更加明确，每个部分的职责清晰分离。

**State** 是存储数据的地方，它是一个响应式对象。当组件从 State 读取数据时，Vue 的响应式系统会自动建立依赖关系，State 变化时组件自动更新。

**Getters** 类似于组件的计算属性。当你需要基于 State 派生出新的数据时，可以定义 Getter。Getter 的结果会被缓存，只有依赖的 State 变化时才会重新计算。

**Mutations** 是修改 State 的唯一方式。每个 Mutation 都有一个字符串类型的事件名和一个处理函数。在处理函数中，你可以直接修改 State——这里与 Redux 不同，不需要返回新对象，因为 Vue 的响应式系统可以追踪对象内部属性的变化。

**Actions** 类似于 Mutations，但有两个关键区别：Actions 可以包含异步操作，Actions 不直接修改 State 而是提交 Mutations。

**Modules** 用于将大型 Store 拆分成模块。每个模块可以有自己的 State、Getters、Mutations 和 Actions，还可以嵌套子模块。

让我们看一个完整的 Vuex Store 定义：

```javascript
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    count: 0,
    todos: []
  },
  
  getters: {
    completedTodos(state) {
      return state.todos.filter(todo => todo.completed)
    },
    
    todoCount(state) {
      return state.todos.length
    }
  },
  
  mutations: {
    INCREMENT(state) {
      state.count++
    },
    
    ADD_TODO(state, todo) {
      state.todos.push(todo)
    }
  },
  
  actions: {
    async fetchTodos({ commit }) {
      const response = await fetch('/api/todos')
      const todos = await response.json()
      todos.forEach(todo => commit('ADD_TODO', todo))
    }
  }
})

export default store
```

这个设计有几个优点。首先，职责分离明确：State 存数据，Getters 派生数据，Mutations 同步修改，Actions 异步处理。其次，与 Vue 响应式系统无缝集成：State 是响应式的，Getters 有缓存。第三，Mutations 的存在使得状态变更可追踪——DevTools 可以记录每个 Mutation 和对应的状态快照。

## Mutations 的设计争议

Vuex 最受争议的设计就是 Mutations。为什么修改状态必须通过 Mutations？为什么 Mutations 必须是同步的？

官方的解释是：当 DevTools 捕捉到一个 Mutation 时，需要保存当时的状态快照。如果 Mutation 中包含异步操作，状态快照就不准确了，因为你不知道异步操作什么时候完成，快照可能在异步操作完成之前就被记录了。

这个理由在技术上是合理的，但在实践中带来了大量样板代码。每次状态更新，你都需要定义一个 Mutation：

```javascript
// mutations.js
export const SET_USER = 'SET_USER'
export const SET_LOADING = 'SET_LOADING'
export const SET_ERROR = 'SET_ERROR'

export default {
  [SET_USER](state, user) {
    state.user = user
  },
  [SET_LOADING](state, loading) {
    state.loading = loading
  },
  [SET_ERROR](state, error) {
    state.error = error
  }
}

// actions.js
export default {
  async fetchUser({ commit }, userId) {
    commit('SET_LOADING', true)
    try {
      const user = await api.getUser(userId)
      commit('SET_USER', user)
    } catch (error) {
      commit('SET_ERROR', error.message)
    } finally {
      commit('SET_LOADING', false)
    }
  }
}
```

一个简单的"获取用户"功能，需要定义三个 Mutations 和一个 Action。随着应用规模增长，Mutations 的数量会急剧膨胀，很多 Mutation 只是简单的赋值操作，却不得不写出来。

更让人困惑的是，Mutations 必须同步这条规则只是一个"约定"，Vuex 并不会在你写异步代码时报错。很多新手在不知情的情况下在 Mutations 中写了异步代码，程序也能正常运行，只是 DevTools 的时间旅行功能不准确了。这种"可以违反但不应该违反"的规则，增加了心智负担。

## TypeScript 支持的困境

Vuex 的另一个痛点是 TypeScript 支持。这不是后来补丁式添加的问题，而是 API 设计本身与类型推导不兼容。

问题出在 Vuex 大量使用字符串作为标识符。当你 commit 一个 Mutation 或 dispatch 一个 Action 时：

```typescript
this.$store.commit('user/SET_NAME', 'Alice')
this.$store.dispatch('user/fetchProfile', userId)
```

这里的 `'user/SET_NAME'` 和 `'user/fetchProfile'` 只是普通字符串，TypeScript 无法知道它们对应的 payload 类型是什么。你可以传入任何类型的参数，编译器不会报错，只有运行时才会发现问题。

社区尝试了各种解决方案。vuex-class 提供了装饰器语法，vuex-module-decorators 更进一步支持模块化，vuex-smart-module 尝试通过类来定义 Store。但这些方案都有各自的局限，没有一个能完美解决类型推导问题。

根本原因是 Vuex 的 API 设计与 TypeScript 的类型系统理念冲突。TypeScript 擅长推导函数参数和返回值的类型，但对"字符串键映射到特定类型"这种模式支持有限。要获得良好的类型支持，需要从 API 设计层面重新思考。

## 模块化的复杂性

Vuex 的 Modules 设计是为了解决大型应用的 Store 组织问题，但它带来了新的复杂性。

首先是命名空间（namespaced）的问题。默认情况下，模块内的 Mutations、Actions、Getters 都注册在全局命名空间，可能发生命名冲突。设置 `namespaced: true` 后，访问模块需要加上路径前缀：

```javascript
this.$store.state.user.profile.name
this.$store.getters['user/profile/fullName']
this.$store.commit('user/profile/SET_NAME', 'Alice')
this.$store.dispatch('user/profile/fetchProfile')
```

嵌套越深，路径越长，代码越难读。而且这些路径字符串没有任何类型提示，打错一个字母就会导致运行时错误。

其次是模块间的依赖处理。如果 A 模块需要访问 B 模块的状态或调用 B 模块的 Action，需要通过 rootState 和 rootGetters：

```javascript
// 在 user 模块的 action 中访问 cart 模块
async checkout({ dispatch, rootState }) {
  const cartItems = rootState.cart.items
  await dispatch('cart/clear', null, { root: true })
}
```

这种 `{ root: true }` 的写法既不直观，也容易遗忘。

第三是动态模块注册带来的类型问题。Vuex 支持在运行时动态注册模块：

```javascript
store.registerModule('myModule', myModule)
```

这对于代码分割和按需加载很有用，但对于 TypeScript 来说是个噩梦——你无法在编译时知道 Store 上有哪些模块。

## 组合式 API 的缺失

Vue 3 引入了 Composition API，它彻底改变了组件逻辑的组织方式。我们可以将相关的状态和方法封装成一个"组合函数"（composable），然后在多个组件中复用。

但 Vuex 4（Vue 3 版本的 Vuex）并没有真正拥抱这种模式。虽然它提供了 `useStore` 函数用于在 setup 中获取 Store 实例，但 Store 的定义方式还是老样子：

```typescript
// store 定义（还是老写法）
const store = createStore({
  state: { count: 0 },
  mutations: {
    increment(state) { state.count++ }
  }
})

// 组件中使用
import { useStore } from 'vuex'

export default {
  setup() {
    const store = useStore()
    
    // 还是要用字符串访问
    const count = computed(() => store.state.count)
    const increment = () => store.commit('increment')
    
    return { count, increment }
  }
}
```

这种"换汤不换药"的改动并没有解决核心问题。字符串访问、类型推导差、样板代码多，这些问题依然存在。

开发者开始思考：既然 Composition API 本身就提供了 reactive、computed 等响应式工具，为什么不直接用它们来构建状态管理？

```typescript
// 用 Composition API 实现的简单状态管理
import { reactive, computed } from 'vue'

const state = reactive({
  count: 0
})

export function useCounter() {
  const double = computed(() => state.count * 2)
  
  function increment() {
    state.count++
  }
  
  return {
    count: computed(() => state.count),
    double,
    increment
  }
}
```

这种方式简洁、类型安全、没有样板代码。但它缺少了 Vuex 提供的生态能力：DevTools 集成、SSR 支持、插件系统、热更新。

Pinia 的诞生就是为了填补这个空白——它结合了 Composition API 的简洁性和 Vuex 的生态能力，提供了一个真正现代化的状态管理方案。

## 小结

Vuex 的设计在 Vue 2 时代是合理的选择，它为 Vue 应用提供了标准化的状态管理方案。但随着 TypeScript 的普及和 Composition API 的出现，Vuex 的一些设计决策开始显得过时：

Mutations 和 Actions 的分离导致大量样板代码。基于字符串的 API 设计与 TypeScript 类型推导不兼容。嵌套模块增加了代码复杂性。没有真正拥抱 Composition API 的理念。

这些局限性为 Pinia 的出现创造了条件。下一章，我们将深入探讨 Pinia 的设计目标，看看它如何在保留 Vuex 优点的同时解决这些问题。
