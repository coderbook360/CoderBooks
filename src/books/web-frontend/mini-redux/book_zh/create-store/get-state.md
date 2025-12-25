# getState 实现

`getState` 是 Store 最简单的方法，但也有一些值得讨论的细节。

## 基础实现

```javascript
function getState() {
  return currentState
}
```

就这么简单。它直接返回当前状态的引用。

## 添加保护

Redux 添加了一个保护措施：在 dispatch 过程中不允许调用 getState：

```javascript
function getState() {
  if (isDispatching) {
    throw new Error(
      'You may not call store.getState() while the reducer is executing. ' +
      'The reducer has already received the state as an argument. ' +
      'Pass it down from the top reducer instead of reading it from the store.'
    )
  }
  
  return currentState
}
```

**为什么要这样限制？**

在 reducer 执行过程中，状态正在被更新。如果此时调用 getState，可能获取到"中间状态"——既不是更新前，也不是更新后的状态：

```javascript
// 假设有多个 reducer
function rootReducer(state, action) {
  return {
    user: userReducer(state.user, action),      // 已更新
    todos: todosReducer(state.todos, action),   // 正在更新
    ui: uiReducer(state.ui, action)             // 还未更新
  }
}
```

如果在 `todosReducer` 中调用 `getState()`，会获取到一个不一致的状态。

**正确的做法是**：reducer 已经接收了 state 作为参数，直接使用即可。

## TypeScript 实现

```typescript
function createStore<S, A extends Action>(
  reducer: Reducer<S, A>,
  preloadedState?: S
) {
  let currentState: S | undefined = preloadedState
  let isDispatching = false

  function getState(): S {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing.'
      )
    }

    return currentState as S
  }

  // ...
}
```

注意类型断言 `as S`。因为 `currentState` 的类型是 `S | undefined`（考虑到初始化前的情况），但在正常使用中，`getState` 总是返回 `S` 类型。

## 测试用例

```typescript
import { describe, it, expect } from 'vitest'
import { createStore } from './createStore'

describe('getState', () => {
  it('returns the current state', () => {
    const reducer = (state = { count: 0 }) => state
    const store = createStore(reducer)

    expect(store.getState()).toEqual({ count: 0 })
  })

  it('returns the preloaded state', () => {
    const reducer = (state = { count: 0 }) => state
    const store = createStore(reducer, { count: 10 })

    expect(store.getState()).toEqual({ count: 10 })
  })

  it('returns updated state after dispatch', () => {
    const reducer = (state = 0, action: any) => {
      if (action.type === 'INCREMENT') return state + 1
      return state
    }
    const store = createStore(reducer)

    store.dispatch({ type: 'INCREMENT' })

    expect(store.getState()).toBe(1)
  })

  it('returns the same reference if state unchanged', () => {
    const initialState = { count: 0 }
    const reducer = (state = initialState) => state
    const store = createStore(reducer)

    const state1 = store.getState()
    store.dispatch({ type: 'UNKNOWN' })
    const state2 = store.getState()

    expect(state1).toBe(state2)  // 同一个引用
  })
})
```

## 返回引用 vs 返回副本

Redux 的 `getState` 返回的是状态的**引用**，而不是副本：

```javascript
const state = store.getState()
state === store.getState()  // true，同一个对象
```

**为什么不返回副本？**

1. **性能**：深拷贝大型状态树开销很大
2. **不可变性约定**：Redux 假设开发者不会直接修改状态
3. **浅比较**：React-Redux 依赖引用比较来优化渲染

**这意味着：**

```javascript
const state = store.getState()

// ❌ 不要这样做
state.count = 100  // 直接修改了 store 中的状态！

// ✅ 通过 dispatch 修改
store.dispatch({ type: 'SET_COUNT', payload: 100 })
```

## 与其他状态管理库的对比

不同的状态管理库对此有不同的处理方式：

**Redux**：返回引用，依赖开发者遵守不可变性

```javascript
// Redux
const state = store.getState()
state.count++  // 危险！但 Redux 不会阻止你
```

**MobX**：返回可观察对象，可以直接修改

```javascript
// MobX
const store = observable({ count: 0 })
store.count++  // 合法，会自动触发更新
```

**Zustand**：返回不可变快照

```javascript
// Zustand
const count = useStore(state => state.count)
// 返回的是原始值或不可变对象
```

## 冻结状态（开发模式）

在开发模式下，你可以使用 `Object.freeze` 来防止意外修改：

```javascript
function createStore(reducer, preloadedState) {
  let currentState = preloadedState

  function dispatch(action) {
    currentState = reducer(currentState, action)
    
    // 开发模式下冻结状态
    if (process.env.NODE_ENV !== 'production') {
      currentState = deepFreeze(currentState)
    }
    
    // ...
  }

  function getState() {
    return currentState
  }

  // ...
}

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  Object.freeze(obj)
  
  Object.keys(obj).forEach(key => {
    deepFreeze(obj[key])
  })
  
  return obj
}
```

这样，尝试修改状态会抛出错误：

```javascript
const state = store.getState()
state.count = 100  // TypeError: Cannot assign to read only property 'count'
```

Redux Toolkit 的 `configureStore` 默认在开发模式下启用这个检查。

## 本章小结

`getState` 的要点：

- **简单直接**：返回当前状态的引用
- **受保护**：dispatch 过程中不可调用
- **返回引用**：不是副本，依赖不可变性约定
- **开发检查**：可以用 freeze 防止意外修改

虽然 `getState` 实现简单，但理解它的设计决策很重要。

> 下一章，我们将实现 dispatch 方法，这是 Redux 的核心。
