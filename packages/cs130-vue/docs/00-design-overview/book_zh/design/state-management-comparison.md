# 与 Redux/Zustand 设计对比

状态管理是前端应用的核心问题。Vue 生态有 Pinia，React 生态有 Redux 和 Zustand。这些方案解决相同的问题，但设计理念有明显差异。

## 核心模型

Redux 基于 Flux 架构，严格遵循单向数据流：

```javascript
// Redux 的核心模型
// Action -> Reducer -> Store -> View -> Action

// Action
{ type: 'INCREMENT', payload: 1 }

// Reducer（纯函数）
function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + action.payload
    default:
      return state
  }
}

// 触发更新
store.dispatch({ type: 'INCREMENT', payload: 1 })
```

Redux 强调不可变性和纯函数。Reducer 接收旧状态和 action，返回新状态，不能直接修改原状态。

Zustand 是 Redux 的简化版，保留了核心理念但大幅减少了样板代码：

```javascript
// Zustand 的核心模型
const useStore = create((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}))

// 使用
const count = useStore(state => state.count)
const increment = useStore(state => state.increment)
```

Zustand 也使用不可变更新，但不强制使用 action types 和 reducer 的分离。

Pinia 采用可变更新模型：

```javascript
// Pinia 的核心模型
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++  // 直接修改
    }
  }
})

// 使用
const store = useCounterStore()
store.increment()
```

Pinia 利用 Vue 的响应式系统追踪变化，不需要手动返回新状态。

## 样板代码

Redux 以样板代码多著称。一个简单的功能需要定义 action types、action creators、reducer：

```javascript
// Redux 传统写法
// actions/counter.js
export const INCREMENT = 'INCREMENT'
export const increment = (amount) => ({
  type: INCREMENT,
  payload: amount
})

// reducers/counter.js
import { INCREMENT } from '../actions/counter'

export default function counterReducer(state = 0, action) {
  switch (action.type) {
    case INCREMENT:
      return state + action.payload
    default:
      return state
  }
}
```

Redux Toolkit 大幅减少了样板代码：

```javascript
// Redux Toolkit
const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: (state, action) => state + action.payload
  }
})

export const { increment } = counterSlice.actions
export default counterSlice.reducer
```

Zustand 更简洁：

```javascript
const useStore = create((set) => ({
  count: 0,
  increment: (amount) => set(state => ({ count: state.count + amount }))
}))
```

Pinia 同样简洁：

```javascript
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment(amount) {
      this.count += amount
    }
  }
})
```

## 中间件与插件

Redux 通过中间件扩展功能。中间件是一个柯里化的函数：

```javascript
// Redux 中间件
const logger = store => next => action => {
  console.log('dispatching', action)
  const result = next(action)
  console.log('next state', store.getState())
  return result
}

const store = createStore(reducer, applyMiddleware(logger))
```

中间件可以拦截、修改、延迟 action，实现异步操作、日志记录等功能。Redux Thunk 和 Redux Saga 就是通过中间件实现异步逻辑。

Zustand 的中间件更简单：

```javascript
// Zustand 中间件
const log = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('  applying', args)
      set(...args)
      console.log('  new state', get())
    },
    get,
    api
  )

const useStore = create(log((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
})))
```

Pinia 的插件系统前面已经讨论过，它可以订阅状态变化和 action 执行，但不使用中间件的链式模式。

## 异步处理

Redux 本身是同步的，异步操作需要中间件支持。常见的方案有 Redux Thunk 和 Redux Saga：

```javascript
// Redux Thunk
const fetchUser = (id) => async (dispatch) => {
  dispatch({ type: 'FETCH_USER_PENDING' })
  try {
    const user = await api.getUser(id)
    dispatch({ type: 'FETCH_USER_SUCCESS', payload: user })
  } catch (error) {
    dispatch({ type: 'FETCH_USER_FAILED', error })
  }
}
```

Zustand 原生支持异步：

```javascript
const useStore = create((set) => ({
  user: null,
  loading: false,
  fetchUser: async (id) => {
    set({ loading: true })
    const user = await api.getUser(id)
    set({ user, loading: false })
  }
}))
```

Pinia 的 actions 也原生支持异步：

```javascript
const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    loading: false
  }),
  actions: {
    async fetchUser(id) {
      this.loading = true
      this.user = await api.getUser(id)
      this.loading = false
    }
  }
})
```

## 状态选择与性能

Redux 使用 selector 函数选择需要的状态：

```javascript
// React Redux
const count = useSelector(state => state.counter.count)
```

当 store 中任何状态变化时，selector 会重新执行。如果返回值变化，组件重新渲染。可以使用 reselect 库创建记忆化的 selector。

Zustand 也使用 selector：

```javascript
const count = useStore(state => state.count)
```

默认使用 Object.is 比较，可以配置自定义比较函数。

Pinia 利用 Vue 的响应式系统自动追踪依赖：

```javascript
const store = useCounterStore()
// 在模板或 computed 中使用 store.count
// Vue 自动追踪依赖，只在 count 变化时更新
```

不需要手动编写 selector，响应式系统自动处理细粒度的更新。

## 类型安全

Redux 的类型支持需要额外的工作：

```typescript
// Redux with TypeScript
interface RootState {
  counter: number
}

const count = useSelector<RootState, number>(state => state.counter)
```

Redux Toolkit 改善了类型推断，但仍需要配置。

Zustand 的类型支持较好：

```typescript
interface State {
  count: number
  increment: () => void
}

const useStore = create<State>((set) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}))
```

Pinia 提供最完整的类型推断：

```typescript
// 类型完全自动推断
const store = useCounterStore()
store.count  // 推断为 number
store.increment()  // 参数和返回值类型自动检查
```

## 开发工具

Redux DevTools 功能强大，支持时间旅行调试、action 录制回放、状态导入导出。Zustand 也可以集成 Redux DevTools。

Pinia 集成 Vue DevTools，提供类似的功能：状态查看、时间旅行、action 追踪。

三者的开发工具都很成熟，这方面差异不大。

## 设计哲学

Redux 强调可预测性和调试性。严格的单向数据流、不可变更新、纯函数 reducer，这些约束让状态变化可追踪、可重现。代价是更多的样板代码和学习成本。

Zustand 保留了 Redux 的核心理念，但去除了严格的约束，用更少的代码实现相同的功能。它是"简化版 Redux"。

Pinia 选择了不同的路线。它利用 Vue 的响应式系统，采用可变更新模型。更少的约束带来更简洁的代码，但也意味着放弃了 Redux 的某些优势（如 reducer 的可测试性）。

选择哪种方案取决于框架（Vue/React）、团队经验和项目需求。没有绝对的优劣，只有适合与不适合。
