---
sidebar_position: 19
title: Options Store 设计理念
---

# Options Store 设计理念

在第三部分中，我们实现了 `defineStore` 的函数签名解析，它能够识别用户传入的是 Options Store 还是 Setup Store。本章我们将深入 Options Store 的设计理念，理解 Pinia 为什么要提供这种风格，以及它与 Vuex 的传承关系。

## 为什么需要 Options Store？

首先要问一个问题：既然 Vue 3 推崇 Composition API，Pinia 为什么还要保留类似 Vuex 的 Options 风格？

答案是**渐进式迁移**和**心智模型的多样性**。

### 从 Vuex 迁移的考量

大量现有项目使用 Vuex，它们的 Store 结构是这样的：

```javascript
// Vuex Store
export default {
  state: () => ({
    count: 0,
    items: []
  }),
  getters: {
    doubleCount: state => state.count * 2
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    async fetchItems({ commit }) {
      const items = await api.getItems()
      commit('setItems', items)
    }
  }
}
```

如果 Pinia 只提供 Setup Store 风格，迁移成本会非常高。Options Store 让迁移变得平滑：

```javascript
// Pinia Options Store - 结构高度相似
export const useStore = defineStore('main', {
  state: () => ({
    count: 0,
    items: []
  }),
  getters: {
    doubleCount: state => state.count * 2
  },
  // 注意：没有 mutations，actions 可以直接修改 state
  actions: {
    increment() {
      this.count++
    },
    async fetchItems() {
      this.items = await api.getItems()
    }
  }
})
```

### 心智模型的选择

不同开发者有不同的思维习惯：

- **Options 风格**：结构清晰，state、getters、actions 分离，适合喜欢「分类整理」的开发者
- **Setup 风格**：灵活自由，适合喜欢「函数式组合」的开发者

Pinia 不强制选择，而是提供两种风格，让团队根据实际情况决定。

## Options Store 的数据结构

Options Store 的核心是一个配置对象，包含三个主要部分：

```typescript
interface DefineStoreOptions<Id, S, G, A> {
  id: Id
  state?: () => S
  getters?: G & ThisType<...>
  actions?: A & ThisType<...>
}
```

让我们逐一解析：

### state：状态工厂函数

`state` 必须是一个**返回对象的函数**，而不是直接的对象：

```javascript
// ✅ 正确：函数返回对象
state: () => ({
  count: 0,
  user: null
})

// ❌ 错误：直接传对象
state: {
  count: 0,
  user: null
}
```

为什么是函数？因为**每次调用 `useStore()` 都需要独立的状态副本**。如果直接传对象，所有组件会共享同一个引用，导致状态污染。

思考一下：这和 Vue 组件的 `data` 选项为什么要是函数，是同一个道理。

### getters：计算属性映射

`getters` 是一个对象，每个属性是一个函数，接收 `state` 作为第一个参数：

```javascript
getters: {
  // 基础 getter
  doubleCount(state) {
    return state.count * 2
  },
  
  // 访问其他 getter（通过 this）
  quadrupleCount() {
    return this.doubleCount * 2
  },
  
  // 返回函数的 getter（带参数）
  getItemById(state) {
    return (id) => state.items.find(item => item.id === id)
  }
}
```

getters 会被转换为 `computed`，因此具有缓存特性。

### actions：方法集合

`actions` 是一个对象，每个属性是一个函数，通过 `this` 访问 Store 实例：

```javascript
actions: {
  increment() {
    this.count++  // 直接修改 state
  },
  
  async fetchUser(id) {
    this.loading = true
    try {
      this.user = await api.getUser(id)
    } finally {
      this.loading = false
    }
  },
  
  // 调用其他 action
  reset() {
    this.count = 0
    this.clearUser()  // 调用另一个 action
  },
  
  clearUser() {
    this.user = null
  }
}
```

与 Vuex 最大的不同：**Pinia 没有 mutations**。actions 可以直接修改 state，同步异步都可以。

## Options Store 的 this 上下文

Options Store 的一个关键设计是 `this` 的绑定。在 getters 和 actions 中，`this` 指向 Store 实例：

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubleCount() {
      // this 指向 Store 实例
      return this.count * 2  // 等价于 state.count * 2
    }
  },
  actions: {
    increment() {
      // this 指向 Store 实例
      this.count++           // 修改 state
      console.log(this.doubleCount)  // 访问 getter
    }
  }
})
```

`this` 上可以访问：

- 所有 state 属性
- 所有 getters（作为属性，不是方法）
- 所有 actions（作为方法）
- Store API（如 `$patch`、`$reset` 等）

这种设计让代码更简洁，不需要像 Vuex 那样传入 `{ state, commit, dispatch }`。

## TypeScript 类型推断

Options Store 的另一个设计目标是**完美的类型推断**。用户不需要手动标注类型：

```typescript
const useUserStore = defineStore('user', {
  state: () => ({
    name: '',        // 推断为 string
    age: 0,          // 推断为 number
    isAdmin: false   // 推断为 boolean
  }),
  getters: {
    // 返回类型自动推断
    greeting(state) {
      return `Hello, ${state.name}!`  // 推断为 string
    }
  },
  actions: {
    // 参数和返回类型都能正确推断
    setName(name: string) {
      this.name = name
    }
  }
})

// 使用时类型完整
const userStore = useUserStore()
userStore.name        // string
userStore.age         // number
userStore.greeting    // string（getter）
userStore.setName('Alice')  // 正确
userStore.setName(123)      // 类型错误！
```

实现这种类型推断需要复杂的泛型和条件类型，我们将在后续章节详细讨论。

## Options Store vs Setup Store 对比

两种风格各有优劣：

**Options Store 优势**：

- 结构清晰，一目了然
- 从 Vuex 迁移方便
- IDE 支持更好（自动补全更准确）
- 适合简单到中等复杂度的 Store

**Options Store 劣势**：

- 灵活性较低
- 复用逻辑困难
- 无法使用 Composables

**Setup Store 优势**：

- 完全灵活，任意组合
- 可以使用任何 Composable
- 更接近原生 Composition API
- 适合复杂逻辑

**Setup Store 劣势**：

- 需要手动管理响应式
- 结构自由可能导致混乱
- $reset 需要额外处理

## 实现思路预览

在接下来的章节中，我们将实现 `createOptionsStore` 函数，它的核心任务是：

1. **解析 options 对象**：提取 state、getters、actions
2. **初始化响应式 state**：将 state 工厂函数的返回值包装为响应式对象
3. **处理 getters**：将每个 getter 转换为 `computed`
4. **处理 actions**：绑定正确的 `this` 上下文
5. **组装 Store 实例**：合并 state、getters、actions 和 Store API

伪代码如下：

```javascript
function createOptionsStore(id, options, pinia) {
  const { state, getters, actions } = options
  
  // 1. 创建响应式 state
  const initialState = state ? state() : {}
  pinia.state.value[id] = initialState
  
  // 2. 创建 store 对象
  const store = reactive({
    $id: id,
    // state 属性展开
    ...toRefs(pinia.state.value[id]),
    // getters 转为 computed
    ...computedGetters,
    // actions 绑定 this
    ...boundActions,
    // Store API
    $patch,
    $reset,
    $subscribe,
    $onAction
  })
  
  return store
}
```

## 本章小结

本章我们理解了 Options Store 的设计理念：

- **渐进式迁移**：为 Vuex 用户提供平滑的迁移路径
- **结构化风格**：state、getters、actions 分离，清晰明了
- **this 上下文**：在 getters 和 actions 中通过 `this` 访问 Store
- **类型推断**：无需手动标注，TypeScript 自动推断

下一章，我们将开始实现 `createOptionsStore` 函数，将这些设计理念转化为可运行的代码。
