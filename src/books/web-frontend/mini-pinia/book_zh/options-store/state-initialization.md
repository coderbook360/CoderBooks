---
sidebar_position: 21
title: State 初始化与响应式处理
---

# State 初始化与响应式处理

State 是 Store 的核心，本章深入探讨 State 初始化的完整流程，包括工厂函数调用时机、响应式包装、全局状态树注册，以及 SSR 场景下的状态恢复。

## State 工厂函数

回顾一下 Options Store 的 state 定义方式：

```javascript
defineStore('counter', {
  state: () => ({
    count: 0,
    items: [],
    user: null
  })
})
```

为什么 state 是一个函数而不是直接的对象？这个问题值得深入思考。

### 避免状态共享

如果 state 是直接的对象引用：

```javascript
// ❌ 错误示例：直接使用对象
const stateObject = {
  count: 0
}

defineStore('counter', {
  state: stateObject  // 所有实例共享同一个对象
})
```

问题在于：在 SSR 场景下，多个请求会共享同一个 state 对象，导致状态污染。

使用工厂函数，每次调用都返回新对象：

```javascript
// ✅ 正确：使用工厂函数
defineStore('counter', {
  state: () => ({
    count: 0  // 每次调用返回新对象
  })
})
```

### 延迟初始化

工厂函数还支持延迟初始化，只在真正需要时才创建状态：

```javascript
defineStore('heavy', {
  state: () => {
    console.log('State initialized!')
    return {
      data: computeExpensiveInitialData()
    }
  }
})
```

如果组件从未使用这个 Store，状态就不会被初始化，节省资源。

## 初始化流程

State 初始化的完整流程：

```javascript
function initializeState(id, stateFn, pinia) {
  const stateTree = pinia.state.value
  
  // Step 1: 检查是否已存在
  if (id in stateTree) {
    // SSR hydration 或热更新，复用已有状态
    return stateTree[id]
  }
  
  // Step 2: 调用工厂函数
  const initialState = stateFn ? stateFn() : {}
  
  // Step 3: 注册到全局状态树
  stateTree[id] = initialState
  
  // Step 4: 返回状态引用
  return stateTree[id]
}
```

让我们逐步分析每个步骤。

### Step 1: 检查已有状态

为什么要检查状态是否已存在？

**SSR Hydration 场景**：

```javascript
// 服务端渲染时，状态被序列化
const serverState = { counter: { count: 5 } }

// 客户端接收后，在 createPinia 时注入
const pinia = createPinia()
pinia.state.value = serverState

// 之后调用 useStore，应该复用服务端状态
const store = useCounterStore()
// store.count 应该是 5，而不是重新初始化为 0
```

**热更新场景**：

```javascript
// 开发环境下，代码修改后模块热更新
// Store 定义可能被重新执行，但状态应该保留
if (import.meta.hot) {
  import.meta.hot.accept()
}
```

### Step 2: 调用工厂函数

工厂函数调用有一些细节需要注意：

```javascript
function initializeState(id, stateFn, pinia) {
  // 处理 state 未定义的情况
  if (!stateFn) {
    // 允许没有 state 的 Store（纯 actions/getters）
    pinia.state.value[id] = {}
    return pinia.state.value[id]
  }
  
  // 调用工厂函数
  const initialState = stateFn()
  
  // 验证返回值
  if (typeof initialState !== 'object' || initialState === null) {
    console.warn(
      `[Pinia]: state() should return an object, got ${typeof initialState}`
    )
    return {}
  }
  
  return initialState
}
```

### Step 3: 注册到全局状态树

全局状态树 `pinia.state` 是一个 ref，包含所有 Store 的状态：

```javascript
// pinia.state 结构
const state = ref({
  counter: { count: 0 },
  user: { name: '', age: 0 },
  cart: { items: [] }
})
```

注册到全局状态树的好处：

1. **统一管理**：所有状态集中在一个地方
2. **DevTools 支持**：Vue DevTools 可以展示完整的状态树
3. **状态快照**：方便实现时间旅行调试
4. **SSR 序列化**：一次性序列化所有状态

```javascript
// 状态注册
pinia.state.value[id] = initialState

// 整个状态树是响应式的
// 所以 pinia.state.value[id] 也是响应式的
```

## 响应式处理

State 注册到全局状态树后，需要正确处理响应式：

```javascript
function setupStateReactivity(id, pinia, store) {
  // 获取状态引用
  const state = pinia.state.value[id]
  
  // 方案一：使用 toRefs 展开
  const stateRefs = toRefs(state)
  
  // 将每个属性添加到 store
  for (const key in stateRefs) {
    store[key] = stateRefs[key]
  }
  
  // 现在可以直接访问
  // store.count 等同于 pinia.state.value[id].count
}
```

### 为什么使用 toRefs？

`toRefs` 将响应式对象的每个属性转换为 ref：

```javascript
const state = reactive({ count: 0, name: 'Alice' })

// 错误：直接解构会丢失响应性
const { count } = state
count++  // 不会触发更新

// 正确：使用 toRefs
const { count } = toRefs(state)
count.value++  // 触发更新，state.count 也变成 1
```

在 Store 中，我们需要：

```javascript
const store = useStore()

// 直接访问属性
store.count++  // 应该触发更新

// 解构使用
const { count } = storeToRefs(store)
count.value++  // 应该触发更新
```

使用 `toRefs` 确保了这种行为。

### 双向同步

`toRefs` 创建的 ref 与原对象保持双向同步：

```javascript
const state = reactive({ count: 0 })
const refs = toRefs(state)

// 修改 ref，原对象也变
refs.count.value = 5
console.log(state.count)  // 5

// 修改原对象，ref 也变
state.count = 10
console.log(refs.count.value)  // 10
```

这确保了修改 `store.count` 会同步到全局状态树。

## $state 属性实现

Store 的 `$state` 属性提供对完整状态对象的访问：

```javascript
const store = useCounterStore()

// 读取完整状态
console.log(store.$state)  // { count: 0 }

// 替换完整状态
store.$state = { count: 100 }
```

实现方式：

```javascript
function setupStateProperty(id, pinia, store) {
  Object.defineProperty(store, '$state', {
    get() {
      return pinia.state.value[id]
    },
    set(newState) {
      // 不能直接赋值，需要使用 $patch 保持订阅工作
      store.$patch(($state) => {
        Object.assign($state, newState)
      })
    }
  })
}
```

为什么 setter 要用 `$patch`？

直接赋值 `pinia.state.value[id] = newState` 会绕过订阅系统，导致 `$subscribe` 的回调不会触发。使用 `$patch` 确保状态变更被正确追踪。

## SSR 状态恢复

在 SSR 场景下，状态需要从服务端传递到客户端：

```javascript
// 服务端
export async function renderApp() {
  const pinia = createPinia()
  const app = createSSRApp(App)
  app.use(pinia)
  
  // 渲染应用
  const html = await renderToString(app)
  
  // 序列化状态
  const state = JSON.stringify(pinia.state.value)
  
  return `
    <div id="app">${html}</div>
    <script>window.__PINIA_STATE__ = ${state}</script>
  `
}

// 客户端
const pinia = createPinia()

// 恢复状态
if (window.__PINIA_STATE__) {
  pinia.state.value = JSON.parse(window.__PINIA_STATE__)
}

const app = createApp(App)
app.use(pinia)
app.mount('#app')
```

状态恢复需要注意：

1. **时机**：在 `app.use(pinia)` 之前恢复
2. **格式**：确保序列化/反序列化正确处理特殊类型
3. **安全**：防止 XSS，正确转义 JSON

## 类型安全

State 初始化需要保证类型安全：

```typescript
interface DefineStoreOptions<Id, S, G, A> {
  id?: Id
  state?: () => S
  getters?: G & ThisType<...>
  actions?: A & ThisType<...>
}

// 类型推断示例
const useStore = defineStore('counter', {
  state: () => ({
    count: 0,        // 推断为 number
    name: 'Alice',   // 推断为 string
    items: [] as string[]  // 显式标注
  })
})

const store = useStore()
store.count  // number
store.name   // string
store.items  // string[]
```

对于复杂类型，可以使用接口定义：

```typescript
interface UserState {
  user: User | null
  loading: boolean
  error: string | null
}

const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: null,
    loading: false,
    error: null
  })
})
```

## 边界情况处理

### 空 State

允许定义没有 state 的 Store：

```javascript
const useActionsStore = defineStore('actions', {
  // 没有 state
  actions: {
    doSomething() {
      console.log('doing something')
    }
  }
})
```

实现时需要处理：

```javascript
const initialState = stateFn ? stateFn() : {}
pinia.state.value[id] = initialState
```

### 嵌套对象

State 可以包含嵌套对象，Vue 的响应式系统会自动处理：

```javascript
state: () => ({
  user: {
    profile: {
      name: '',
      avatar: ''
    },
    settings: {
      theme: 'light'
    }
  }
})
```

修改嵌套属性也是响应式的：

```javascript
store.user.profile.name = 'Alice'  // 触发更新
```

### 特殊类型

某些类型需要特殊处理：

```javascript
state: () => ({
  // Map 和 Set 需要使用 shallowRef
  userMap: new Map(),
  
  // 日期对象
  createdAt: new Date(),
  
  // 正则表达式
  pattern: /test/g
})
```

Vue 3 的响应式系统对 Map/Set 有特殊支持，但序列化时需要注意。

## 本章小结

本章深入探讨了 State 初始化的完整流程：

- **工厂函数设计**：避免状态共享，支持延迟初始化
- **全局状态树**：统一管理，支持 DevTools 和 SSR
- **响应式处理**：使用 toRefs 保持响应性和双向同步
- **$state 属性**：通过 $patch 确保订阅正常工作
- **SSR 支持**：正确的状态序列化和恢复
- **边界情况**：空 state、嵌套对象、特殊类型

下一章，我们将实现 Getters，将 getter 函数转换为 computed 属性。
