# Store 数据结构

在上一章，我们从设计层面了解了 `createStore`。现在让我们深入 Store 的内部数据结构，理解它是如何组织的。

## Store 的内部状态

Store 内部维护着几个关键变量：

```javascript
function createStore(reducer, preloadedState, enhancer) {
  // 当前的 reducer
  let currentReducer = reducer
  
  // 当前的状态
  let currentState = preloadedState
  
  // 当前的监听器列表
  let currentListeners = []
  
  // 下一次 dispatch 时要使用的监听器列表
  let nextListeners = currentListeners
  
  // 是否正在 dispatch
  let isDispatching = false
  
  // ...
}
```

让我们逐一理解这些变量的用途。

## currentReducer

`currentReducer` 保存当前使用的 reducer 函数：

```javascript
let currentReducer = reducer
```

它可以通过 `replaceReducer` 方法替换：

```javascript
function replaceReducer(nextReducer) {
  currentReducer = nextReducer
  dispatch({ type: '@@redux/REPLACE' })
}
```

**使用场景：**

1. **代码分割**：动态加载的模块可能带有新的 reducer
2. **热模块替换（HMR）**：开发时无需刷新页面即可更新 reducer

```javascript
// 代码分割示例
const asyncReducer = await import('./features/newFeature/reducer')
store.replaceReducer(combineReducers({
  ...staticReducers,
  newFeature: asyncReducer.default
}))
```

## currentState

`currentState` 保存当前的应用状态：

```javascript
let currentState = preloadedState
```

初始值可以是：
- `undefined`：让 reducer 使用默认初始状态
- 预加载的状态：比如从 localStorage 或服务端获取的状态

```javascript
// 从 localStorage 恢复状态
const persistedState = JSON.parse(localStorage.getItem('reduxState'))
const store = createStore(reducer, persistedState)

// 服务端渲染预加载状态
const store = createStore(reducer, window.__PRELOADED_STATE__)
```

## 监听器列表的特殊设计

这是 Store 数据结构中最精妙的部分。为什么有两个监听器列表？

```javascript
let currentListeners = []
let nextListeners = currentListeners
```

### 问题场景

想象这个场景：

```javascript
const unsubscribe1 = store.subscribe(() => {
  console.log('Listener 1')
  unsubscribe2()  // 在 listener 1 执行时取消 listener 2
})

const unsubscribe2 = store.subscribe(() => {
  console.log('Listener 2')
})

store.dispatch({ type: 'TEST' })
```

如果我们直接修改正在遍历的数组：

```javascript
// ❌ 简单实现的问题
function dispatch(action) {
  currentState = currentReducer(currentState, action)
  
  // 正在遍历 listeners
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i]
    listener()  // listener 1 执行时调用 unsubscribe2
                // listeners 数组被修改，可能导致遍历出错
  }
}
```

### 解决方案：快照模式

Redux 使用"快照"模式解决这个问题：

```javascript
let currentListeners = []
let nextListeners = currentListeners

// 确保 nextListeners 是 currentListeners 的浅拷贝
function ensureCanMutateNextListeners() {
  if (nextListeners === currentListeners) {
    nextListeners = currentListeners.slice()
  }
}

function subscribe(listener) {
  // 修改的是 nextListeners，不是 currentListeners
  ensureCanMutateNextListeners()
  nextListeners.push(listener)
  
  return function unsubscribe() {
    ensureCanMutateNextListeners()
    const index = nextListeners.indexOf(listener)
    nextListeners.splice(index, 1)
  }
}

function dispatch(action) {
  currentState = currentReducer(currentState, action)
  
  // dispatch 时使用当前快照
  const listeners = currentListeners = nextListeners
  
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i]
    listener()  // 即使这里修改 nextListeners，也不影响当前遍历的 listeners
  }
}
```

**工作原理：**

1. `subscribe/unsubscribe` 修改的是 `nextListeners`
2. `dispatch` 开始时，把 `nextListeners` 赋值给 `currentListeners`
3. 遍历 `currentListeners`（此时它是一个快照）
4. 即使在遍历过程中修改 `nextListeners`，也不影响当前遍历

## isDispatching 标志

`isDispatching` 用于防止在 reducer 执行过程中调用 dispatch：

```javascript
let isDispatching = false

function dispatch(action) {
  if (isDispatching) {
    throw new Error('Reducers may not dispatch actions.')
  }
  
  try {
    isDispatching = true
    currentState = currentReducer(currentState, action)
  } finally {
    isDispatching = false
  }
  
  // ...
}
```

**为什么需要这个保护？**

如果允许在 reducer 中 dispatch，会导致无限循环：

```javascript
// ❌ 危险的 reducer
function badReducer(state, action) {
  if (action.type === 'INCREMENT') {
    store.dispatch({ type: 'INCREMENT' })  // 又触发 INCREMENT
    // 无限循环！
  }
  return state
}
```

同样，在 dispatch 过程中不允许：
- `getState()`：可能获取到中间状态
- `subscribe()`：可能导致监听器列表不一致

```javascript
function getState() {
  if (isDispatching) {
    throw new Error('You may not call store.getState() while the reducer is executing.')
  }
  return currentState
}

function subscribe(listener) {
  if (isDispatching) {
    throw new Error('You may not call store.subscribe() while the reducer is executing.')
  }
  // ...
}
```

## Store 对象结构

最终返回的 Store 对象：

```javascript
const store = {
  getState,
  dispatch,
  subscribe,
  replaceReducer,
  [Symbol.observable]: observable  // 可选，支持 Observable
}
```

### getState

```javascript
function getState() {
  if (isDispatching) {
    throw new Error('...')
  }
  return currentState
}
```

直接返回当前状态的引用。注意：不是副本，是引用。

### dispatch

```javascript
function dispatch(action) {
  // 1. 验证 action
  if (!isPlainObject(action)) {
    throw new Error('Actions must be plain objects.')
  }
  if (typeof action.type === 'undefined') {
    throw new Error('Actions must have a type property.')
  }
  
  // 2. 防止嵌套 dispatch
  if (isDispatching) {
    throw new Error('Reducers may not dispatch actions.')
  }
  
  // 3. 执行 reducer
  try {
    isDispatching = true
    currentState = currentReducer(currentState, action)
  } finally {
    isDispatching = false
  }
  
  // 4. 通知订阅者
  const listeners = currentListeners = nextListeners
  for (let i = 0; i < listeners.length; i++) {
    listeners[i]()
  }
  
  // 5. 返回 action
  return action
}
```

### subscribe

```javascript
function subscribe(listener) {
  // 验证
  if (typeof listener !== 'function') {
    throw new Error('Expected the listener to be a function.')
  }
  if (isDispatching) {
    throw new Error('...')
  }
  
  // 添加监听器
  let isSubscribed = true
  ensureCanMutateNextListeners()
  nextListeners.push(listener)
  
  // 返回取消订阅函数
  return function unsubscribe() {
    if (!isSubscribed) {
      return  // 防止重复取消
    }
    if (isDispatching) {
      throw new Error('...')
    }
    
    isSubscribed = false
    ensureCanMutateNextListeners()
    const index = nextListeners.indexOf(listener)
    nextListeners.splice(index, 1)
    currentListeners = null  // 标记需要重新获取
  }
}
```

## 类型定义

用 TypeScript 描述 Store 的类型：

```typescript
interface Store<S = any, A extends Action = AnyAction> {
  getState(): S
  dispatch: Dispatch<A>
  subscribe(listener: () => void): Unsubscribe
  replaceReducer(nextReducer: Reducer<S, A>): void
  [Symbol.observable](): Observable<S>
}

type Dispatch<A extends Action = AnyAction> = (action: A) => A

type Unsubscribe = () => void

interface Observable<T> {
  subscribe(observer: Observer<T>): { unsubscribe: Unsubscribe }
}
```

## 内存布局

从内存角度看 Store：

```
┌─────────────────────────────────────────────┐
│                 Store 闭包                   │
├─────────────────────────────────────────────┤
│  currentReducer ──→ [Function: reducer]     │
│                                             │
│  currentState ──→ { count: 0, ... }         │
│                                             │
│  currentListeners ──→ [listener1, ...]      │
│                     ↑                       │
│  nextListeners ─────┘ (可能指向同一数组)      │
│                                             │
│  isDispatching ──→ false                    │
├─────────────────────────────────────────────┤
│  返回的 Store 对象                           │
│  { getState, dispatch, subscribe, ... }     │
│  这些方法通过闭包访问上面的变量                 │
└─────────────────────────────────────────────┘
```

Store 使用闭包来封装内部状态，外部只能通过暴露的方法访问。

## 本章小结

Store 的数据结构设计：

- **currentReducer**：可替换的 reducer
- **currentState**：应用状态，通过 reducer 更新
- **监听器快照**：两个列表实现安全的迭代
- **isDispatching**：防止 dispatch 嵌套
- **闭包封装**：内部变量对外不可见

理解这些数据结构，是理解 Redux 工作原理的基础。

> 下一章，我们将实现 getState 方法。
