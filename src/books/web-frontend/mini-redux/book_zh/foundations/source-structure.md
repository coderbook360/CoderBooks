# Redux 源码结构导读

在开始实现 Mini-Redux 之前，让我们先看看 Redux 官方源码是如何组织的。理解源码结构有助于我们把握全局，知道每个模块的职责和边界。

## Redux 源码概览

Redux 的核心代码非常精简。让我们看看它的目录结构：

```
redux/src/
├── index.ts              # 入口文件，导出所有公共 API
├── createStore.ts        # 核心：创建 Store
├── combineReducers.ts    # 组合多个 Reducer
├── bindActionCreators.ts # 将 Action Creator 绑定到 dispatch
├── applyMiddleware.ts    # 应用中间件
├── compose.ts            # 函数组合工具
└── types/                # TypeScript 类型定义
    ├── actions.ts
    ├── middleware.ts
    ├── reducers.ts
    └── store.ts
```

整个核心代码加起来不到 200 行！这正是 Redux 的魅力所在：用最少的代码实现强大的功能。

## 核心模块解析

### 1. createStore.ts —— 一切的起点

`createStore` 是 Redux 最核心的函数。它创建一个 Store 对象，包含以下方法：

```typescript
interface Store {
  getState(): State           // 获取当前状态
  dispatch(action): Action    // 派发 Action
  subscribe(listener): Unsubscribe  // 订阅状态变化
  replaceReducer(nextReducer): void // 替换 Reducer（热更新用）
  [Symbol.observable](): Observable // 支持 Observable 协议
}
```

核心实现思路：

```javascript
function createStore(reducer, preloadedState, enhancer) {
  let currentState = preloadedState
  let currentReducer = reducer
  let listeners = []

  function getState() {
    return currentState
  }

  function dispatch(action) {
    currentState = currentReducer(currentState, action)
    listeners.forEach(listener => listener())
    return action
  }

  function subscribe(listener) {
    listeners.push(listener)
    return function unsubscribe() {
      listeners = listeners.filter(l => l !== listener)
    }
  }

  // 初始化：派发一个特殊 Action 让每个 Reducer 返回初始状态
  dispatch({ type: '@@redux/INIT' })

  return { getState, dispatch, subscribe }
}
```

### 2. combineReducers.ts —— Reducer 拆分与组合

当应用变大时，一个巨大的 Reducer 会变得难以维护。`combineReducers` 让你可以拆分 Reducer，每个 Reducer 只管理状态树的一部分。

```javascript
// 拆分 Reducer
const userReducer = (state = {}, action) => { /* ... */ }
const todosReducer = (state = [], action) => { /* ... */ }

// 组合成一个 rootReducer
const rootReducer = combineReducers({
  user: userReducer,
  todos: todosReducer
})

// 生成的状态树结构
// { user: {...}, todos: [...] }
```

核心实现思路：

```javascript
function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  
  return function combination(state = {}, action) {
    const nextState = {}
    
    for (const key of reducerKeys) {
      const reducer = reducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      nextState[key] = nextStateForKey
    }
    
    return nextState
  }
}
```

### 3. applyMiddleware.ts —— 扩展 dispatch

中间件是 Redux 最强大的扩展点。它让你可以在 Action 到达 Reducer 之前对其进行拦截、转换、延迟甚至取消。

```javascript
// 使用中间件
const store = createStore(
  reducer,
  applyMiddleware(logger, thunk, crashReporter)
)
```

中间件的签名看起来有点复杂，但其实很有规律：

```javascript
// 中间件签名
const middleware = store => next => action => {
  // 在 action 到达 reducer 之前做些事情
  console.log('dispatching', action)
  
  // 调用下一个中间件（或 dispatch）
  const result = next(action)
  
  // 在 action 到达 reducer 之后做些事情
  console.log('next state', store.getState())
  
  return result
}
```

### 4. compose.ts —— 函数组合的艺术

`compose` 是一个纯粹的函数式编程工具，用于将多个函数从右到左组合成一个函数。

```javascript
// compose(f, g, h) 等价于 (...args) => f(g(h(...args)))

function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }
  if (funcs.length === 1) {
    return funcs[0]
  }
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
```

`applyMiddleware` 内部就使用 `compose` 来串联多个中间件。

### 5. bindActionCreators.ts —— 简化 dispatch 调用

`bindActionCreators` 是一个便利函数，它将 Action Creator 和 `dispatch` 绑定在一起，这样你就不需要每次都写 `dispatch(actionCreator(args))`。

```javascript
// 未绑定时
dispatch(addTodo('Learn Redux'))
dispatch(removeTodo(1))

// 绑定后
const actions = bindActionCreators({ addTodo, removeTodo }, dispatch)
actions.addTodo('Learn Redux')
actions.removeTodo(1)
```

实现非常简单：

```javascript
function bindActionCreators(actionCreators, dispatch) {
  const boundActionCreators = {}
  
  for (const key in actionCreators) {
    const actionCreator = actionCreators[key]
    boundActionCreators[key] = (...args) => dispatch(actionCreator(...args))
  }
  
  return boundActionCreators
}
```

## 类型系统：types 目录

Redux 使用 TypeScript 编写，类型定义是源码的重要组成部分。

### Action 类型

```typescript
// types/actions.ts
interface Action<T = any> {
  type: T
}

interface AnyAction extends Action {
  [extraProps: string]: any
}

interface ActionCreator<A, P extends any[] = any[]> {
  (...args: P): A
}
```

### Store 类型

```typescript
// types/store.ts
interface Store<S = any, A extends Action = AnyAction> {
  dispatch: Dispatch<A>
  getState(): S
  subscribe(listener: () => void): Unsubscribe
  replaceReducer(nextReducer: Reducer<S, A>): void
}

type Dispatch<A extends Action = AnyAction> = (action: A) => A
```

### Reducer 类型

```typescript
// types/reducers.ts
type Reducer<S = any, A extends Action = AnyAction> = (
  state: S | undefined,
  action: A
) => S
```

### Middleware 类型

```typescript
// types/middleware.ts
interface MiddlewareAPI<D extends Dispatch = Dispatch, S = any> {
  dispatch: D
  getState(): S
}

type Middleware<S = any, D extends Dispatch = Dispatch> = (
  api: MiddlewareAPI<D, S>
) => (next: D) => (action: any) => any
```

## 入口文件：index.ts

入口文件非常简洁，只负责导出公共 API：

```typescript
// index.ts
export { createStore } from './createStore'
export { combineReducers } from './combineReducers'
export { bindActionCreators } from './bindActionCreators'
export { applyMiddleware } from './applyMiddleware'
export { compose } from './compose'

// 类型导出
export type { Store, Dispatch, Reducer, Middleware, Action, AnyAction }
```

## Mini-Redux 项目结构

基于官方源码结构，我们的 Mini-Redux 将采用类似的组织方式：

```
mini-redux/
├── src/
│   ├── index.ts              # 入口文件
│   ├── createStore.ts        # 核心 Store 实现
│   ├── combineReducers.ts    # Reducer 组合
│   ├── bindActionCreators.ts # Action 绑定
│   ├── applyMiddleware.ts    # 中间件系统
│   ├── compose.ts            # 函数组合
│   └── types.ts              # 类型定义
├── middleware/               # 常用中间件实现
│   ├── thunk.ts
│   ├── logger.ts
│   └── promise.ts
└── react-redux/              # React 绑定
    ├── Provider.tsx
    ├── connect.tsx
    ├── hooks.ts
    └── index.ts
```

## 源码阅读建议

阅读 Redux 源码时，建议按以下顺序：

1. **compose.ts**：最简单，理解函数组合
2. **createStore.ts**：核心实现，理解 Store 的本质
3. **combineReducers.ts**：理解状态树拆分
4. **applyMiddleware.ts**：理解中间件机制
5. **bindActionCreators.ts**：简单的工具函数

每个文件都很短，完全可以逐行阅读理解。

## 本章小结

Redux 源码的组织体现了几个优秀的设计原则：

- **单一职责**：每个模块只做一件事
- **小而精**：核心代码不到 200 行
- **类型安全**：完整的 TypeScript 类型定义
- **可组合**：模块之间可以灵活组合

理解了源码结构，我们就可以开始动手实现了。

> 下一章，我们将搭建开发环境，准备开始编写 Mini-Redux。
