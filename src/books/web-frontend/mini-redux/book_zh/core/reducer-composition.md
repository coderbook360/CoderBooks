# Reducer 组合模式

随着应用变大，Reducer 也会变得越来越复杂。一个包含几十个 case 的巨大 Reducer 是难以维护的。Reducer 组合模式让我们可以把大 Reducer 拆分成小的、独立的 Reducer。

## 为什么需要组合？

看看这个"巨型" Reducer：

```javascript
function rootReducer(state = initialState, action) {
  switch (action.type) {
    // 用户相关
    case 'user/loggedIn':
      return { ...state, user: { ...state.user, ...action.payload } }
    case 'user/loggedOut':
      return { ...state, user: null }
    case 'user/profileUpdated':
      return { ...state, user: { ...state.user, ...action.payload } }
    
    // 待办相关
    case 'todos/added':
      return { ...state, todos: [...state.todos, action.payload] }
    case 'todos/toggled':
      return { ...state, todos: state.todos.map(t => ...) }
    case 'todos/removed':
      return { ...state, todos: state.todos.filter(t => ...) }
    
    // 通知相关
    case 'notifications/added':
      return { ...state, notifications: [...state.notifications, action.payload] }
    case 'notifications/dismissed':
      return { ...state, notifications: state.notifications.filter(n => ...) }
    
    // UI 相关
    case 'ui/themeChanged':
      return { ...state, ui: { ...state.ui, theme: action.payload } }
    case 'ui/sidebarToggled':
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } }
    
    // ... 还有几十个 case
    
    default:
      return state
  }
}
```

问题很明显：

- **文件太长**：难以阅读和导航
- **职责混乱**：一个函数管理所有领域
- **难以测试**：测试需要构造完整的 state
- **难以复用**：无法在其他项目中复用某个领域的逻辑

## 拆分 Reducer

解决方案是按领域拆分：

```javascript
// userReducer.js
const initialUserState = null

function userReducer(state = initialUserState, action) {
  switch (action.type) {
    case 'user/loggedIn':
      return { ...action.payload }
    case 'user/loggedOut':
      return null
    case 'user/profileUpdated':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// todosReducer.js
const initialTodosState = []

function todosReducer(state = initialTodosState, action) {
  switch (action.type) {
    case 'todos/added':
      return [...state, action.payload]
    case 'todos/toggled':
      return state.map(todo =>
        todo.id === action.payload
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    case 'todos/removed':
      return state.filter(todo => todo.id !== action.payload)
    default:
      return state
  }
}

// uiReducer.js
const initialUiState = {
  theme: 'light',
  sidebarOpen: false
}

function uiReducer(state = initialUiState, action) {
  switch (action.type) {
    case 'ui/themeChanged':
      return { ...state, theme: action.payload }
    case 'ui/sidebarToggled':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    default:
      return state
  }
}
```

现在每个 Reducer：

- **职责单一**：只管理自己领域的状态
- **易于测试**：只需要构造领域状态
- **可以复用**：可以在其他项目中使用

## 手动组合

拆分后，我们需要把它们组合起来：

```javascript
function rootReducer(state = {}, action) {
  return {
    user: userReducer(state.user, action),
    todos: todosReducer(state.todos, action),
    ui: uiReducer(state.ui, action)
  }
}
```

这就是组合的本质：每个子 Reducer 只接收自己负责的状态分片，返回更新后的分片，然后组合成完整的状态树。

## combineReducers 的诞生

手动组合很快会变得冗长，所以 Redux 提供了 `combineReducers` 工具函数：

```javascript
import { combineReducers } from 'redux'

const rootReducer = combineReducers({
  user: userReducer,
  todos: todosReducer,
  ui: uiReducer
})
```

`combineReducers` 做的事情和我们手动组合完全一样，只是封装成了一个工具函数。

## 实现 combineReducers

让我们自己实现一个 `combineReducers`：

```javascript
function combineReducers(reducers) {
  // 获取所有 reducer 的键
  const reducerKeys = Object.keys(reducers)
  
  // 返回一个新的 reducer 函数
  return function combination(state = {}, action) {
    // 标记状态是否变化
    let hasChanged = false
    
    // 新的状态对象
    const nextState = {}
    
    // 遍历每个 reducer
    for (const key of reducerKeys) {
      const reducer = reducers[key]
      
      // 获取该 key 对应的旧状态
      const previousStateForKey = state[key]
      
      // 调用 reducer 获取新状态
      const nextStateForKey = reducer(previousStateForKey, action)
      
      // 保存新状态
      nextState[key] = nextStateForKey
      
      // 检查是否变化
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    
    // 检查是否有新的 key 添加
    hasChanged = hasChanged || reducerKeys.length !== Object.keys(state).length
    
    // 如果没有变化，返回原状态（保持引用）
    return hasChanged ? nextState : state
  }
}
```

### 关键点解析

**1. 每个 reducer 只接收自己的状态分片**

```javascript
const previousStateForKey = state[key]
const nextStateForKey = reducer(previousStateForKey, action)
```

`userReducer` 只接收 `state.user`，`todosReducer` 只接收 `state.todos`。

**2. 状态变化检测**

```javascript
hasChanged = hasChanged || nextStateForKey !== previousStateForKey
```

通过引用比较来检测状态是否变化。如果所有子状态都没变，就返回原来的 state 对象，避免不必要的重新渲染。

**3. 所有 reducer 都会被调用**

每次 dispatch action，所有 reducer 都会被调用。每个 reducer 检查 action.type，只处理自己关心的 action，其他的返回原 state。

## 嵌套组合

`combineReducers` 可以嵌套使用：

```javascript
// 先组合 entities 下的 reducer
const entitiesReducer = combineReducers({
  users: usersReducer,
  posts: postsReducer,
  comments: commentsReducer
})

// 再组合顶层 reducer
const rootReducer = combineReducers({
  entities: entitiesReducer,  // 嵌套的 combineReducers
  ui: uiReducer,
  auth: authReducer
})
```

这会生成这样的状态树结构：

```javascript
{
  entities: {
    users: {},
    posts: {},
    comments: {}
  },
  ui: {},
  auth: {}
}
```

## Reducer 增强模式

有时候我们需要增强现有的 reducer，比如添加日志、处理通用逻辑等。

### 高阶 Reducer

```javascript
// 添加重置功能的高阶 reducer
function withReset(reducer, resetActionType = 'RESET') {
  const initialState = reducer(undefined, { type: '@@INIT' })
  
  return function enhancedReducer(state, action) {
    if (action.type === resetActionType) {
      return initialState
    }
    return reducer(state, action)
  }
}

// 使用
const todosReducer = withReset(baseTodosReducer)

// 现在可以重置 todos 状态
dispatch({ type: 'RESET' })
```

### 添加日志

```javascript
function withLogging(reducer) {
  return function loggingReducer(state, action) {
    console.log('Action:', action.type)
    console.log('Prev State:', state)
    
    const nextState = reducer(state, action)
    
    console.log('Next State:', nextState)
    return nextState
  }
}
```

### 处理通用 Action

```javascript
// 处理加载状态的高阶 reducer
function withLoadingState(reducer, { loadingAction, successAction, errorAction }) {
  return function enhancedReducer(state, action) {
    switch (action.type) {
      case loadingAction:
        return { ...state, isLoading: true, error: null }
      case successAction:
        return { ...reducer(state, action), isLoading: false }
      case errorAction:
        return { ...state, isLoading: false, error: action.payload }
      default:
        return reducer(state, action)
    }
  }
}

// 使用
const todosReducer = withLoadingState(baseTodosReducer, {
  loadingAction: 'todos/fetching',
  successAction: 'todos/fetched',
  errorAction: 'todos/fetchFailed'
})
```

## 跨 Reducer 通信

有时候一个 action 需要影响多个领域的状态。比如"用户登出"需要同时清空用户信息和购物车。

### 方式一：让多个 reducer 处理同一个 action

```javascript
// userReducer.js
case 'auth/loggedOut':
  return null

// cartReducer.js
case 'auth/loggedOut':
  return []  // 清空购物车

// notificationsReducer.js
case 'auth/loggedOut':
  return []  // 清空通知
```

### 方式二：使用 reducer 增强器

```javascript
function crossSliceReducer(state, action) {
  if (action.type === 'auth/loggedOut') {
    // 清空相关状态
    return {
      ...state,
      user: null,
      cart: [],
      notifications: []
    }
  }
  return state
}

function rootReducer(state, action) {
  // 先运行组合的 reducer
  const intermediateState = combineReducers({
    user: userReducer,
    cart: cartReducer,
    notifications: notificationsReducer
  })(state, action)
  
  // 再运行跨切片逻辑
  return crossSliceReducer(intermediateState, action)
}
```

## 本章小结

Reducer 组合的核心思想：

- **按领域拆分**：每个 reducer 只管理一个状态分片
- **combineReducers**：自动组合子 reducer
- **嵌套组合**：可以多层嵌套
- **高阶 reducer**：增强现有 reducer 的功能
- **跨切片通信**：让多个 reducer 处理同一个 action

合理的 reducer 拆分让代码更易于维护、测试和复用。

> 下一章，我们将深入讨论不可变性原则，这是 reducer 正确工作的基础。
