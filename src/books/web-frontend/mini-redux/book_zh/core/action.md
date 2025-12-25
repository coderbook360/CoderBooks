# Action 设计与规范

Action 是 Redux 中信息的载体，它是把数据从应用传递到 Store 的唯一途径。理解 Action 的设计，是写好 Redux 代码的关键。

## Action 是什么？

Action 本质上就是一个普通的 JavaScript 对象，它描述了"发生了什么事"：

```javascript
// 最简单的 Action
{ type: 'INCREMENT' }

// 携带数据的 Action
{ 
  type: 'todos/added',
  payload: { id: 1, text: '学习 Redux' }
}
```

Action 有一个必须的属性：`type`。它是一个字符串，用来标识这个 Action 的类型。

**思考一下：为什么 Action 必须是普通对象？**

因为普通对象可以被序列化。这意味着：
- 可以记录到日志
- 可以存储和回放
- 可以在网络间传输
- 可以实现时间旅行调试

如果 Action 是类实例或函数，这些都无法实现。

## type 的命名规范

`type` 的命名非常重要，它决定了你的代码是否易于理解和调试。

### 命名风格

社区主流有两种风格：

**风格一：领域/事件（推荐）**

```javascript
// 模式：domain/eventName
{ type: 'todos/added' }
{ type: 'todos/toggled' }
{ type: 'todos/removed' }
{ type: 'user/loggedIn' }
{ type: 'cart/itemAdded' }
```

这种风格的好处：
- 领域清晰（todos、user、cart）
- 动作明确（added、toggled、loggedIn）
- 便于按领域分组查看

**风格二：全大写 + 下划线**

```javascript
// 模式：DOMAIN_ACTION
{ type: 'ADD_TODO' }
{ type: 'TOGGLE_TODO' }
{ type: 'USER_LOGIN' }
```

这是早期 Redux 的风格，现在仍然有人使用。

### 命名最佳实践

1. **使用过去时或被动语态描述已发生的事**

```javascript
// ✅ 描述已发生的事
{ type: 'todos/added' }      // 已添加
{ type: 'user/loggedOut' }   // 已登出

// ❌ 命令式
{ type: 'todos/add' }        // "添加"是命令
{ type: 'user/logout' }      // "登出"是命令
```

**为什么？** Action 描述的是"发生了什么事"，而不是"要做什么"。当你 dispatch 一个 Action 时，这个事件已经在逻辑上发生了。

2. **避免过于通用的名称**

```javascript
// ❌ 太通用
{ type: 'UPDATE' }
{ type: 'SET_DATA' }
{ type: 'CHANGE' }

// ✅ 具体明确
{ type: 'user/nameUpdated' }
{ type: 'settings/themeChanged' }
```

3. **保持一致性**

选定一种风格后，全项目保持一致。不要一会儿 `todos/added`，一会儿 `ADD_TODO`。

### 使用常量

为了避免拼写错误，通常把 type 定义为常量：

```javascript
// actionTypes.js
export const TODO_ADDED = 'todos/added'
export const TODO_TOGGLED = 'todos/toggled'
export const TODO_REMOVED = 'todos/removed'

// 使用时
import { TODO_ADDED } from './actionTypes'

dispatch({ type: TODO_ADDED, payload: { text: 'Learn Redux' } })
```

如果你使用 Redux Toolkit，可以跳过这一步，因为 createSlice 会自动生成 type。

## payload 约定

`payload` 是 Action 携带数据的标准属性名。这不是 Redux 强制的，而是社区约定（来自 Flux Standard Action）。

```javascript
// ✅ 使用 payload
{
  type: 'todos/added',
  payload: { id: 1, text: '学习 Redux', completed: false }
}

// ✅ payload 可以是任何类型
{ type: 'counter/incrementedBy', payload: 5 }
{ type: 'todos/removed', payload: 1 }  // ID
{ type: 'user/updated', payload: { name: 'Bob', email: 'bob@example.com' } }

// ❌ 不推荐：自定义属性名
{
  type: 'todos/added',
  todo: { id: 1, text: '学习 Redux' }  // 应该用 payload
}
```

### 为什么要用 payload？

1. **一致性**：所有 Action 的数据都在同一个位置
2. **可预测**：Reducer 知道去哪里找数据
3. **工具友好**：Redux DevTools 等工具对 payload 有特殊处理

## Flux Standard Action（FSA）

Flux Standard Action 是一个社区规范，定义了 Action 的标准结构：

```typescript
interface FluxStandardAction {
  type: string       // 必须
  payload?: any      // 可选：携带的数据
  error?: boolean    // 可选：是否表示错误
  meta?: any         // 可选：额外元信息
}
```

### error 属性

当 `error` 为 `true` 时，`payload` 应该是一个 Error 对象：

```javascript
// 成功的 Action
{
  type: 'user/fetched',
  payload: { id: 1, name: 'Alice' }
}

// 失败的 Action
{
  type: 'user/fetched',
  payload: new Error('Network error'),
  error: true
}
```

### meta 属性

`meta` 用于携带不属于 payload 的附加信息：

```javascript
{
  type: 'todos/added',
  payload: { id: 1, text: '学习 Redux' },
  meta: {
    timestamp: Date.now(),
    source: 'user-input',
    analytics: { category: 'todos', action: 'add' }
  }
}
```

常见用途：
- 时间戳
- 请求 ID
- 分析数据
- 中间件配置

## 实现 Action 类型检查

让我们为 Mini-Redux 实现 FSA 的类型定义：

```typescript
// types.ts

/**
 * 基础 Action 接口
 */
export interface Action<T = any> {
  type: T
}

/**
 * Flux Standard Action
 */
export interface FSA<P = any, M = any> extends Action<string> {
  payload?: P
  error?: boolean
  meta?: M
}

/**
 * 错误 Action
 */
export interface ErrorFSA<M = any> extends FSA<Error, M> {
  error: true
}

/**
 * 类型守卫：判断是否是 FSA
 */
export function isFSA(action: any): action is FSA {
  return (
    typeof action === 'object' &&
    action !== null &&
    typeof action.type === 'string'
  )
}

/**
 * 类型守卫：判断是否是错误 Action
 */
export function isError(action: FSA): action is ErrorFSA {
  return action.error === true
}
```

使用示例：

```typescript
function todoReducer(state: TodoState, action: FSA) {
  if (isError(action)) {
    // 处理错误
    console.error('Action failed:', action.payload)
    return { ...state, error: action.payload.message }
  }

  switch (action.type) {
    case 'todos/added':
      return { ...state, items: [...state.items, action.payload] }
    default:
      return state
  }
}
```

## Action 设计检查清单

设计 Action 时，检查以下几点：

1. **type 是字符串吗？** 必须是。

2. **type 是否具有描述性？** 应该一眼就能看出发生了什么。

3. **使用了 payload 吗？** 统一使用 payload 存放数据。

4. **需要 error 或 meta 吗？** 根据场景决定。

5. **Action 可序列化吗？** 不要在 Action 中放函数、类实例或 Symbol。

## 常见错误

### 错误一：在 Action 中放不可序列化的值

```javascript
// ❌ 错误：函数不可序列化
{
  type: 'modal/opened',
  payload: {
    onClose: () => console.log('closed')  // 函数！
  }
}

// ❌ 错误：类实例
{
  type: 'user/loaded',
  payload: new User(1, 'Alice')  // 类实例！
}

// ✅ 正确：只用普通对象和原始值
{
  type: 'user/loaded',
  payload: { id: 1, name: 'Alice' }
}
```

### 错误二：Action 过于庞大

```javascript
// ❌ Action 携带了太多数据
{
  type: 'page/loaded',
  payload: {
    users: [...],      // 几百个用户
    products: [...],   // 几千个商品
    orders: [...]      // 上万条订单
  }
}

// ✅ 拆分成多个 Action
dispatch({ type: 'users/loaded', payload: users })
dispatch({ type: 'products/loaded', payload: products })
dispatch({ type: 'orders/loaded', payload: orders })
```

### 错误三：Action 过于细碎

```javascript
// ❌ 太细碎，导致多次渲染
dispatch({ type: 'form/firstNameChanged', payload: 'John' })
dispatch({ type: 'form/lastNameChanged', payload: 'Doe' })
dispatch({ type: 'form/emailChanged', payload: 'john@example.com' })

// ✅ 合并成一个 Action
dispatch({
  type: 'form/updated',
  payload: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
})
```

## 本章小结

Action 设计的核心要点：

- **type 必须**：字符串，描述发生了什么
- **payload 约定**：统一用 payload 存放数据
- **FSA 规范**：type、payload、error、meta
- **可序列化**：不放函数、类实例、Symbol
- **粒度适中**：不要太大也不要太细

好的 Action 设计让你的代码自文档化——看 Action 就知道发生了什么。

> 下一章，我们将学习 Action Creator 函数，它能简化 Action 的创建过程。
