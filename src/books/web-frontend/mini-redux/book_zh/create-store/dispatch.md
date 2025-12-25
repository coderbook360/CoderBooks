# dispatch 实现

`dispatch` 是 Redux 的核心方法。它是改变状态的唯一途径，也是整个数据流的枢纽。

## 基础实现

```javascript
function dispatch(action) {
  // 调用 reducer 计算新状态
  currentState = currentReducer(currentState, action)
  
  // 通知所有订阅者
  const listeners = currentListeners = nextListeners
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i]
    listener()
  }
  
  // 返回 action
  return action
}
```

核心逻辑只有两步：
1. 用 reducer 计算新状态
2. 通知所有订阅者

## 完整实现

让我们添加所有必要的验证和保护：

```javascript
function dispatch(action) {
  // 1. 验证 action 是普通对象
  if (!isPlainObject(action)) {
    throw new Error(
      'Actions must be plain objects. ' +
      'Use custom middleware for async actions.'
    )
  }

  // 2. 验证 action 有 type 属性
  if (typeof action.type === 'undefined') {
    throw new Error(
      'Actions may not have an undefined "type" property. ' +
      'Have you misspelled a constant?'
    )
  }

  // 3. 防止嵌套 dispatch
  if (isDispatching) {
    throw new Error('Reducers may not dispatch actions.')
  }

  // 4. 执行 reducer
  try {
    isDispatching = true
    currentState = currentReducer(currentState, action)
  } finally {
    isDispatching = false
  }

  // 5. 通知订阅者
  const listeners = currentListeners = nextListeners
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i]
    listener()
  }

  // 6. 返回 action
  return action
}
```

### isPlainObject 辅助函数

```javascript
function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}
```

这个函数检查对象是否是"普通对象"——即通过对象字面量 `{}` 或 `new Object()` 创建的对象。

```javascript
isPlainObject({})           // true
isPlainObject({ a: 1 })     // true
isPlainObject(new Object()) // true

isPlainObject([])           // false
isPlainObject(new Date())   // false
isPlainObject(null)         // false
isPlainObject(() => {})     // false
```

## 深入理解每个步骤

### 步骤 1-2：Action 验证

```javascript
if (!isPlainObject(action)) {
  throw new Error('Actions must be plain objects.')
}

if (typeof action.type === 'undefined') {
  throw new Error('Actions may not have an undefined "type" property.')
}
```

**为什么 action 必须是普通对象？**

- 普通对象可以序列化，便于日志记录和调试
- 确保 action 是同步的（不是 Promise 或函数）
- 中间件可以统一处理

**为什么必须有 type？**

type 是 reducer 识别 action 的唯一标识。没有 type，reducer 无法知道应该做什么。

### 步骤 3：防止嵌套 dispatch

```javascript
if (isDispatching) {
  throw new Error('Reducers may not dispatch actions.')
}
```

如果在 reducer 中调用 dispatch，会导致：
- 无限循环的风险
- 状态更新顺序混乱
- 难以追踪的 bug

```javascript
// ❌ 这会抛出错误
function badReducer(state, action) {
  store.dispatch({ type: 'ANOTHER_ACTION' })
  return state
}
```

### 步骤 4：执行 reducer

```javascript
try {
  isDispatching = true
  currentState = currentReducer(currentState, action)
} finally {
  isDispatching = false
}
```

使用 try-finally 确保即使 reducer 抛出异常，`isDispatching` 也会被重置。

```javascript
function reducer(state, action) {
  if (action.type === 'ERROR') {
    throw new Error('Something went wrong')
  }
  return state
}

// 即使 reducer 抛出错误，isDispatching 也会重置为 false
try {
  store.dispatch({ type: 'ERROR' })
} catch (e) {
  // isDispatching 已经是 false 了
  store.dispatch({ type: 'RECOVER' })  // 可以正常 dispatch
}
```

### 步骤 5：通知订阅者

```javascript
const listeners = currentListeners = nextListeners
for (let i = 0; i < listeners.length; i++) {
  const listener = listeners[i]
  listener()
}
```

注意这里的赋值顺序：
1. `nextListeners` 赋给 `currentListeners`
2. 保存到局部变量 `listeners`
3. 遍历 `listeners`

这确保了在遍历过程中，即使有新的 subscribe 或 unsubscribe，也不影响当前遍历。

**监听器不接收参数**

注意 `listener()` 不传递任何参数。监听器需要自己调用 `getState()` 获取最新状态：

```javascript
store.subscribe(() => {
  const state = store.getState()  // 自己获取状态
  console.log('New state:', state)
})
```

**为什么不传递新状态？**

- 保持接口简单
- 监听器可能只关心状态的一部分
- 避免每次都创建闭包

### 步骤 6：返回 action

```javascript
return action
```

返回传入的 action。这个设计让 dispatch 可以链式调用（虽然不常用）：

```javascript
const action = store.dispatch({ type: 'INCREMENT' })
console.log(action)  // { type: 'INCREMENT' }
```

更重要的是，它为中间件提供了扩展点。中间件可以修改返回值：

```javascript
// thunk 中间件返回 thunk 的执行结果
const result = store.dispatch(async dispatch => {
  const data = await fetchData()
  dispatch({ type: 'DATA_LOADED', payload: data })
  return data
})
```

## TypeScript 实现

```typescript
type Dispatch<A extends Action = AnyAction> = (action: A) => A

function createStore<S, A extends Action>(
  reducer: Reducer<S, A>,
  preloadedState?: S
) {
  let currentState: S | undefined = preloadedState
  let currentReducer = reducer
  let currentListeners: (() => void)[] = []
  let nextListeners = currentListeners
  let isDispatching = false

  function dispatch(action: A): A {
    if (!isPlainObject(action)) {
      throw new Error('Actions must be plain objects.')
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions must have a type property.')
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState as S, action)
    } finally {
      isDispatching = false
    }

    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  // ...

  return { dispatch, /* ... */ }
}
```

## 测试用例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createStore } from './createStore'

describe('dispatch', () => {
  it('updates state through reducer', () => {
    const reducer = (state = 0, action: any) => {
      if (action.type === 'INCREMENT') return state + 1
      return state
    }
    const store = createStore(reducer)

    store.dispatch({ type: 'INCREMENT' })

    expect(store.getState()).toBe(1)
  })

  it('notifies subscribers', () => {
    const reducer = (state = 0) => state
    const store = createStore(reducer)
    const listener = vi.fn()

    store.subscribe(listener)
    store.dispatch({ type: 'TEST' })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('returns the dispatched action', () => {
    const reducer = (state = 0) => state
    const store = createStore(reducer)
    const action = { type: 'TEST' }

    const result = store.dispatch(action)

    expect(result).toBe(action)
  })

  it('throws if action is not plain object', () => {
    const reducer = (state = 0) => state
    const store = createStore(reducer)

    expect(() => {
      store.dispatch(() => {})  // 函数不是普通对象
    }).toThrow('Actions must be plain objects')
  })

  it('throws if action has no type', () => {
    const reducer = (state = 0) => state
    const store = createStore(reducer)

    expect(() => {
      store.dispatch({} as any)  // 没有 type
    }).toThrow('undefined "type"')
  })

  it('throws if dispatching during reducer', () => {
    const store = createStore((state = 0, action: any) => {
      if (action.type === 'DISPATCH_IN_REDUCER') {
        store.dispatch({ type: 'NESTED' })
      }
      return state
    })

    expect(() => {
      store.dispatch({ type: 'DISPATCH_IN_REDUCER' })
    }).toThrow('Reducers may not dispatch actions')
  })
})
```

## dispatch 的同步性

基础的 dispatch 是**完全同步的**：

```javascript
console.log('Before:', store.getState())  // 0

store.dispatch({ type: 'INCREMENT' })

console.log('After:', store.getState())   // 1
```

这意味着：
- dispatch 返回后，状态已经更新
- 订阅者已经被通知
- 可以立即读取新状态

中间件可以改变这一行为，支持异步 action。

## 本章小结

`dispatch` 的核心职责：

- **验证 action**：必须是普通对象，必须有 type
- **防止嵌套**：reducer 中不能 dispatch
- **更新状态**：调用 reducer 计算新状态
- **通知订阅者**：让 UI 和其他组件知道状态变了
- **返回 action**：便于中间件扩展

dispatch 是 Redux 数据流的核心枢纽，理解它是理解整个 Redux 的关键。

> 下一章，我们将实现 subscribe 订阅机制。
