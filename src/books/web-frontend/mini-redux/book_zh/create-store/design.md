# createStore 函数设计

`createStore` 是 Redux 的核心函数。整个 Redux 库的功能都围绕它展开。在这一章，我们将从设计层面理解 `createStore`，为后续实现打下基础。

## createStore 的职责

`createStore` 做了什么？一句话概括：**创建一个保存状态、响应 action、通知订阅者的容器**。

```javascript
import { createStore } from 'redux'

const store = createStore(reducer, preloadedState, enhancer)
```

它接收：
- **reducer**：状态更新逻辑
- **preloadedState**（可选）：初始状态
- **enhancer**（可选）：Store 增强器

它返回一个 Store 对象，包含以下方法：
- **getState()**：获取当前状态
- **dispatch(action)**：派发 action
- **subscribe(listener)**：订阅状态变化
- **replaceReducer(nextReducer)**：替换 reducer

## 设计思路

让我们思考一下，如果要从零设计这样一个系统，需要什么？

### 1. 状态存储

首先需要一个地方存储状态：

```javascript
let currentState = preloadedState
```

### 2. 状态获取

提供一个方法读取状态：

```javascript
function getState() {
  return currentState
}
```

### 3. 状态更新

通过 reducer 更新状态：

```javascript
function dispatch(action) {
  currentState = reducer(currentState, action)
  return action
}
```

### 4. 变化通知

维护订阅者列表，状态变化时通知他们：

```javascript
let listeners = []

function subscribe(listener) {
  listeners.push(listener)
  return function unsubscribe() {
    listeners = listeners.filter(l => l !== listener)
  }
}

function dispatch(action) {
  currentState = reducer(currentState, action)
  listeners.forEach(listener => listener())  // 通知所有订阅者
  return action
}
```

### 5. 初始化

需要初始化状态：

```javascript
dispatch({ type: '@@redux/INIT' })
```

这个特殊的 action 让每个 reducer 返回自己的初始状态。

## 最简实现

把上面的思路整合起来，就是一个最简版的 `createStore`：

```javascript
function createStore(reducer, preloadedState) {
  let currentState = preloadedState
  let listeners = []

  function getState() {
    return currentState
  }

  function dispatch(action) {
    currentState = reducer(currentState, action)
    listeners.forEach(listener => listener())
    return action
  }

  function subscribe(listener) {
    listeners.push(listener)
    return function unsubscribe() {
      listeners = listeners.filter(l => l !== listener)
    }
  }

  // 初始化
  dispatch({ type: '@@redux/INIT' })

  return { getState, dispatch, subscribe }
}
```

就这么简单！不到 30 行代码。

## 使用示例

让我们用这个最简实现来验证功能：

```javascript
// 定义 reducer
function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    case 'DECREMENT':
      return state - 1
    default:
      return state
  }
}

// 创建 store
const store = createStore(counterReducer)

// 订阅变化
const unsubscribe = store.subscribe(() => {
  console.log('State changed:', store.getState())
})

// 获取初始状态
console.log('Initial:', store.getState())  // 0

// 派发 action
store.dispatch({ type: 'INCREMENT' })  // State changed: 1
store.dispatch({ type: 'INCREMENT' })  // State changed: 2
store.dispatch({ type: 'DECREMENT' })  // State changed: 1

// 取消订阅
unsubscribe()
store.dispatch({ type: 'INCREMENT' })  // 不再打印
console.log('Final:', store.getState())  // 2
```

## 核心设计模式：发布-订阅

`createStore` 的核心是**发布-订阅模式**（Pub-Sub）：

```
┌─────────────────────────────────────┐
│              Store                  │
│  ┌─────────────────────────────┐   │
│  │         State               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    Listeners (订阅者列表)    │   │
│  │  [listener1, listener2, ...]│   │
│  └─────────────────────────────┘   │
│                                     │
│  dispatch(action)                   │
│    ↓                                │
│  1. state = reducer(state, action)  │
│  2. listeners.forEach(l => l())     │
│                                     │
└─────────────────────────────────────┘
```

订阅者（比如 React 组件）通过 `subscribe` 注册回调，当 `dispatch` 被调用时，所有订阅者都会被通知。

## 与观察者模式的区别

发布-订阅模式和观察者模式很相似，但有一个关键区别：

**观察者模式**：主题（Subject）直接通知观察者（Observer）

```javascript
class Subject {
  observers = []
  
  addObserver(observer) {
    this.observers.push(observer)
  }
  
  notify(data) {
    this.observers.forEach(o => o.update(data))
  }
}
```

**发布-订阅模式**：通过一个中间层（事件通道）解耦

```javascript
class EventChannel {
  subscribers = {}
  
  subscribe(event, callback) {
    this.subscribers[event] = this.subscribers[event] || []
    this.subscribers[event].push(callback)
  }
  
  publish(event, data) {
    const subs = this.subscribers[event] || []
    subs.forEach(cb => cb(data))
  }
}
```

Redux 更接近发布-订阅模式：Store 作为中间层，组件不直接依赖 Reducer。

## 设计约束

`createStore` 有几个重要的设计约束：

### 1. 单一 dispatch 入口

所有状态变化都必须通过 `dispatch`。这确保了变化的可追踪性：

```javascript
// ❌ 无法追踪
store.currentState.count++

// ✅ 可追踪
store.dispatch({ type: 'INCREMENT' })
```

### 2. 同步 dispatch

基础的 `dispatch` 是同步的。Action 进去，新状态立刻出来：

```javascript
console.log('Before:', store.getState())  // 0
store.dispatch({ type: 'INCREMENT' })
console.log('After:', store.getState())   // 1，同步更新
```

这让状态变化可预测。异步逻辑通过中间件处理。

### 3. 状态只读

只能通过 `getState()` 读取状态，不能直接修改：

```javascript
const state = store.getState()
state.count = 100  // 这不会影响 store 中的状态
```

### 4. Reducer 必须是纯函数

这是使用层面的约束，`createStore` 假设 reducer 是纯函数：

```javascript
// createStore 假设这是真的
currentState = reducer(currentState, action)
```

如果 reducer 有副作用，Redux 不会阻止，但会导致不可预测的行为。

## 完整 API 设计

官方 `createStore` 的完整签名：

```typescript
function createStore<S, A extends Action>(
  reducer: Reducer<S, A>,
  preloadedState?: S,
  enhancer?: StoreEnhancer
): Store<S, A>

interface Store<S, A extends Action> {
  getState(): S
  dispatch(action: A): A
  subscribe(listener: () => void): Unsubscribe
  replaceReducer(nextReducer: Reducer<S, A>): void
  [Symbol.observable](): Observable<S>
}
```

其中：
- `replaceReducer`：用于代码分割和热更新
- `[Symbol.observable]`：支持 RxJS 等响应式库

## 本章小结

`createStore` 的设计要点：

- **状态容器**：存储和管理应用状态
- **单一入口**：通过 dispatch 修改状态
- **发布-订阅**：变化时通知所有订阅者
- **同步更新**：dispatch 是同步的
- **可预测性**：基于纯函数 reducer

理解了设计思路，接下来我们将深入每个部分的实现细节。

> 下一章，我们将详细了解 Store 的数据结构设计。
