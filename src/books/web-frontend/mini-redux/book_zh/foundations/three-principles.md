# Redux 三大原则

Redux 的设计基于三条核心原则。这不是教条，而是从实践中提炼出的智慧。理解这三条原则，就理解了 Redux 为什么能让状态管理变得可预测。

## 原则一：单一数据源

> 整个应用的 state 被存储在一棵对象树中，且这个对象树只存在于唯一的 store 中。

### 为什么需要单一数据源？

想象你在管理一个电商应用的状态。用户信息可能存在这里，购物车数据存在那里，订单状态又在另一个地方。当你需要回答"用户买了什么"这个问题时，你需要从多个地方收集数据。

```javascript
// ❌ 分散的状态管理
class UserStore {
  user = { id: 1, name: 'Alice' }
}

class CartStore {
  items = [{ productId: 101, quantity: 2 }]
}

class OrderStore {
  orders = [{ id: 1001, userId: 1, items: [...] }]
}
```

问题来了：这些数据之间如何保持同步？当用户下单后，购物车应该清空，但 CartStore 和 OrderStore 是独立的——你需要手动协调它们。

**单一数据源解决了这个问题：**

```javascript
// ✅ 单一状态树
const state = {
  user: { id: 1, name: 'Alice' },
  cart: {
    items: [{ productId: 101, quantity: 2 }]
  },
  orders: [
    { id: 1001, userId: 1, items: [...] }
  ]
}
```

所有状态都在一个对象中，你可以轻松地：

- **调试**：打印一个对象就能看到完整状态
- **持久化**：一次性保存和恢复整个状态
- **服务端渲染**：将服务端状态序列化，发送到客户端

### 单一数据源的实践

```javascript
import { createStore } from 'redux'

// 整个应用只创建一个 store
const store = createStore(rootReducer)

// 任何时候都能获取完整状态
console.log(store.getState())
// { user: {...}, cart: {...}, orders: [...] }
```

## 原则二：State 是只读的

> 唯一改变 state 的方法是触发 action，action 是一个描述已发生事件的普通对象。

### 为什么 State 必须只读？

让我们看看如果允许直接修改 state 会发生什么：

```javascript
// ❌ 直接修改 state
const state = store.getState()
state.user.name = 'Bob'  // 谁改的？什么时候改的？为什么改？

// 另一个地方
state.cart.items.push(newItem)  // 又一次隐蔽的修改
```

这样的代码有几个致命问题：

1. **无法追踪变化**：你不知道是谁、在什么时候、因为什么原因修改了状态
2. **无法实现撤销/重做**：直接修改会丢失历史记录
3. **渲染优化失效**：React 依赖引用比较来决定是否重新渲染

**通过 Action 修改状态解决了这些问题：**

```javascript
// ✅ 通过 Action 修改
store.dispatch({
  type: 'user/nameUpdated',
  payload: 'Bob'
})

store.dispatch({
  type: 'cart/itemAdded',
  payload: { productId: 102, quantity: 1 }
})
```

现在每次修改都有明确的：
- **类型**：是什么操作（`user/nameUpdated`）
- **数据**：携带的数据（`'Bob'`）
- **时间点**：可以记录每个 Action 的时间戳

### Action 的结构

Action 是一个普通的 JavaScript 对象，必须有 `type` 属性：

```javascript
// 最简 Action
{ type: 'INCREMENT' }

// 带数据的 Action（推荐使用 payload 命名）
{
  type: 'todos/added',
  payload: {
    id: 1,
    text: '学习 Redux',
    completed: false
  }
}

// Action 可以携带额外的元信息
{
  type: 'todos/added',
  payload: { id: 1, text: '学习 Redux' },
  meta: { timestamp: Date.now() }
}
```

## 原则三：使用纯函数执行修改

> 为了描述 action 如何改变 state tree，你需要编写 reducers。Reducer 是纯函数，接收先前的 state 和 action，返回新的 state。

### 什么是纯函数？

纯函数是指：
1. **相同输入，相同输出**：给定相同的参数，永远返回相同的结果
2. **没有副作用**：不修改外部变量，不进行 I/O 操作

```javascript
// ✅ 纯函数
function add(a, b) {
  return a + b
}

// ❌ 非纯函数：依赖外部变量
let count = 0
function increment() {
  return ++count  // 每次调用结果不同
}

// ❌ 非纯函数：有副作用
function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user))  // 副作用
  return user
}
```

### 为什么 Reducer 必须是纯函数？

**1. 可预测性**

```javascript
// 给定相同的 state 和 action，结果永远相同
const state = { count: 0 }
const action = { type: 'INCREMENT' }

counterReducer(state, action)  // { count: 1 }
counterReducer(state, action)  // { count: 1 }，永远是同样的结果
```

**2. 可测试性**

```javascript
// 测试变得极其简单
test('INCREMENT increases count by 1', () => {
  const prevState = { count: 0 }
  const action = { type: 'INCREMENT' }
  const nextState = counterReducer(prevState, action)
  
  expect(nextState.count).toBe(1)
})
```

**3. 时间旅行调试**

因为 Reducer 是纯函数，我们可以"回放" Action 序列来重建任意时刻的状态：

```javascript
const actions = [
  { type: 'INCREMENT' },
  { type: 'INCREMENT' },
  { type: 'DECREMENT' }
]

// 从初始状态开始，依次执行 actions，得到最终状态
const finalState = actions.reduce(
  (state, action) => counterReducer(state, action),
  { count: 0 }
)
// { count: 1 }
```

### Reducer 示例

```javascript
// ✅ 正确的 Reducer
function todosReducer(state = [], action) {
  switch (action.type) {
    case 'todos/added':
      // 返回新数组，不修改原 state
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

// ❌ 错误的 Reducer：直接修改 state
function badReducer(state = [], action) {
  switch (action.type) {
    case 'todos/added':
      state.push(action.payload)  // 直接修改了原数组！
      return state
    default:
      return state
  }
}
```

## 三大原则的协同作用

这三条原则不是孤立的，它们相互配合，共同创造了可预测的状态管理：

1. **单一数据源** → 状态集中管理，便于调试和持久化
2. **State 只读** → 变化可追踪，支持撤销/重做
3. **纯函数修改** → 结果可预测，便于测试和时间旅行

```
┌─────────────────────────────────────────────────┐
│                   Store（单一）                   │
│  ┌─────────────────────────────────────────┐   │
│  │              State Tree                  │   │
│  │  { users, todos, ui, ... }              │   │
│  └─────────────────────────────────────────┘   │
│                      ↑                          │
│               Reducer（纯函数）                   │
│                      ↑                          │
│              Action（只读修改）                   │
└─────────────────────────────────────────────────┘
```

## 违反原则的代价

如果你违反这些原则会怎样？

**违反单一数据源：**
```javascript
// 状态分散在多个地方
const userStore = createStore(userReducer)
const todoStore = createStore(todoReducer)
// 两个 store 之间如何同步？如何保证一致性？
```

**违反 State 只读：**
```javascript
// 在组件中直接修改状态
const state = store.getState()
state.count++  // 状态变了，但 store 不知道！订阅者不会被通知
```

**违反纯函数：**
```javascript
function badReducer(state, action) {
  // 在 reducer 中发起网络请求
  fetch('/api/save', { body: JSON.stringify(state) })
  return { ...state, saved: true }
}
// 测试时每次都会发起请求，结果不可预测
```

## 本章小结

Redux 的三大原则是状态管理的基石：

| 原则 | 含义 | 收益 |
|------|------|------|
| 单一数据源 | 一个应用只有一个 Store | 便于调试、持久化、同步 |
| State 只读 | 只能通过 Action 修改 | 变化可追踪、支持撤销/重做 |
| 纯函数修改 | Reducer 必须是纯函数 | 可预测、可测试、时间旅行 |

理解并遵循这些原则，你的状态管理就不会出大问题。

> 下一章，我们将深入 Redux 源码结构，了解 Redux 是如何组织代码的。
