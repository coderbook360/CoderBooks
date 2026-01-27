# Flux 架构与 Redux

上一章我们梳理了状态管理的发展历程，提到了 Flux 和 Redux 这两个里程碑式的解决方案。Pinia 的很多设计思想可以追溯到这里——理解它们，有助于我们理解 Pinia 为什么要这样设计，又在哪些地方做了不同的选择。

## Flux：单向数据流的开创者

2014 年的 Facebook 面临着一个棘手的问题。他们的 Web 应用越来越复杂，数据在组件之间流动的方式变得难以追踪。一个典型的例子是消息通知：当用户收到新消息时，顶部导航栏的通知数字要更新，聊天窗口要显示新消息，消息列表也要同步。这三个组件各自维护着自己的状态，当它们之间的同步出现问题时，用户可能看到通知数字是 3，但打开消息列表只有 2 条消息。

这个问题的根源在于数据流的混乱。在传统的 MVC 模式中，Model 和 View 可以相互影响：View 可以修改 Model，Model 的变化又触发 View 更新，View 的更新可能再次触发 Model 变化。当这种双向绑定在多个组件之间发生时，数据的流向变得像一团乱麻。

Flux 的解决方案是强制单向数据流。它定义了四个角色：

**Store** 是数据的唯一来源。所有的应用状态都存储在 Store 中，组件只能从 Store 读取数据，不能直接修改。

**View** 是数据的展示层。它订阅 Store 的变化，当 Store 更新时自动重新渲染。

**Action** 是用户意图的描述。当用户点击按钮、提交表单时，View 不直接修改 Store，而是创建一个 Action 对象，描述"用户想做什么"。

**Dispatcher** 是行动的调度中心。它接收所有的 Action，然后分发给对应的 Store 处理。

```
用户操作 → Action → Dispatcher → Store → View → 用户看到更新
                         ↑                    |
                         └────────────────────┘
```

这个单向循环确保了数据流的可预测性。任何状态变化都必须经过 Action → Dispatcher → Store 这条路径，我们可以在 Dispatcher 这个"咽喉要道"记录所有的 Action，轻松追踪状态变化的来源。

Flux 的问题在于它只是一个架构模式，而非具体实现。Facebook 开源的 Flux 实现比较原始，使用起来需要大量样板代码。而且，Flux 允许多个 Store 存在，Store 之间可能存在依赖关系，这增加了复杂性。

## Redux：单一状态树的哲学

Redux 是 Dan Abramov 在 2015 年基于 Flux 思想开发的状态管理库。它做了几个重要的简化和改进，确立了三条核心原则。

**单一数据源（Single Source of Truth）**：整个应用只有一个 Store，所有状态存储在一棵状态树中。这比 Flux 的多 Store 模式更简单——不用考虑 Store 之间的依赖和同步问题。

**状态只读（State is Read-Only）**：不能直接修改状态，修改状态的唯一方式是派发 Action。这确保了状态变更的可追踪性。

**纯函数更新（Changes are Made with Pure Functions）**：状态的更新逻辑写在 Reducer 中，Reducer 必须是纯函数。给定相同的当前状态和 Action，必须返回相同的新状态，不能有任何副作用。

Reducer 的纯函数特性是 Redux 最精妙的设计。让我们看一个计数器的例子：

```typescript
// 定义状态类型
interface CounterState {
  count: number
}

// 初始状态
const initialState: CounterState = {
  count: 0
}

// Reducer：接收当前状态和 action，返回新状态
function counterReducer(
  state = initialState, 
  action: { type: string; payload?: number }
): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }
    case 'DECREMENT':
      return { ...state, count: state.count - 1 }
    case 'SET':
      return { ...state, count: action.payload ?? 0 }
    default:
      return state
  }
}
```

注意 Reducer 的返回值：它不是修改原有的 state 对象，而是返回一个新的对象。这种不可变更新（Immutable Update）模式有几个好处。首先，我们可以保留历史状态，实现时间旅行调试。其次，判断状态是否变化只需要比较引用是否相等，这让 React 的 shouldComponentUpdate 优化变得简单。

Redux 的另一个创新是中间件（Middleware）机制。中间件可以拦截 Action，在它到达 Reducer 之前进行处理。这为异步操作、日志记录、错误处理等横切关注点提供了优雅的解决方案。

```typescript
// 一个简单的日志中间件
const loggerMiddleware = store => next => action => {
  console.log('dispatching', action)
  const result = next(action)
  console.log('next state', store.getState())
  return result
}
```

这个三层嵌套的函数签名初看有些奇怪，但它是函数式编程中经典的柯里化模式。每一层都有明确的职责：最外层接收 store 引用，中间层接收下一个中间件，最内层处理具体的 action。

## Redux 的争议与反思

Redux 在 React 社区取得了巨大成功，但也引发了不少争议。

最常见的批评是样板代码太多。定义一个简单的功能，你需要：

```typescript
// 1. 定义 Action Type 常量
const INCREMENT = 'counter/INCREMENT'
const DECREMENT = 'counter/DECREMENT'

// 2. 定义 Action Creator
function increment() {
  return { type: INCREMENT }
}

function decrement() {
  return { type: DECREMENT }
}

// 3. 定义 Reducer
function counterReducer(state = initialState, action) {
  switch (action.type) {
    case INCREMENT:
      return { ...state, count: state.count + 1 }
    case DECREMENT:
      return { ...state, count: state.count - 1 }
    default:
      return state
  }
}

// 4. 配置 Store
const store = createStore(counterReducer)

// 5. 连接组件
const mapStateToProps = state => ({
  count: state.count
})

const mapDispatchToProps = {
  increment,
  decrement
}

export default connect(mapStateToProps, mapDispatchToProps)(Counter)
```

这些代码分散在多个文件中，一个简单的计数器功能就需要写这么多，难怪有人调侃 Redux 是"JavaScript 疲劳"的代表。

另一个争议是关于异步处理。Redux 本身只支持同步更新，处理异步操作需要引入中间件。但选择哪个中间件？redux-thunk 简单但不够强大，redux-saga 强大但学习曲线陡峭，redux-observable 适合 RxJS 用户但更加小众。这种"选择困难"让新手感到迷茫。

Redux 团队后来推出了 Redux Toolkit（RTK），通过 createSlice 等 API 大幅减少了样板代码：

```typescript
import { createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment(state) {
      state.count++ // 看起来像直接修改，实际由 Immer 处理不可变更新
    },
    decrement(state) {
      state.count--
    }
  }
})

export const { increment, decrement } = counterSlice.actions
export default counterSlice.reducer
```

RTK 内置了 Immer，让你可以用"可变"的写法来实现不可变更新，大大简化了代码。但这已经是 2019 年的事了，在这之前，Redux 的繁琐让很多开发者转向了其他方案。

## 对 Pinia 设计的启示

回顾 Flux 和 Redux 的历史，我们可以提炼出几条状态管理的核心原则：

**集中管理胜过分散存储**。将状态集中到 Store 中，比散落在各个组件里更容易维护和调试。Pinia 继承了这一点——每个 Store 是独立的，但状态是集中管理的。

**可追踪的变更优于随意修改**。Redux 要求所有变更通过 Action 进行，这使得状态变化可以被记录和回溯。Pinia 采用了更灵活的方式：你可以直接修改 state，也可以通过 actions 修改，但两者都能被 DevTools 追踪。这得益于 Vue 响应式系统的能力——它本身就能追踪变化。

**简单优于复杂**。Redux 的样板代码问题说明，再好的架构思想，如果使用成本太高，也会被开发者抛弃。Pinia 的设计目标之一就是"像写普通 JavaScript 一样写状态管理"。

**TypeScript 优先**。Redux 诞生于 JavaScript 主导的年代，后来加入的 TypeScript 支持总有些"补丁"的感觉。Pinia 从一开始就为 TypeScript 设计，类型推导是其核心优势。

下一章我们将讨论 Vue 生态中的 Vuex，看看它如何将 Flux/Redux 的思想与 Vue 的响应式系统结合，以及它存在哪些局限——这些局限正是 Pinia 要解决的问题。
