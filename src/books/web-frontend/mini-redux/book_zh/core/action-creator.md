# Action Creator 函数

手动创建 Action 对象容易出错——可能拼错 type，可能忘记某个属性。Action Creator 就是为了解决这个问题而诞生的。

## 什么是 Action Creator？

Action Creator 是一个返回 Action 的函数：

```javascript
// 手动创建 Action
dispatch({ type: 'todos/added', payload: { id: 1, text: '学习 Redux' } })

// 使用 Action Creator
function addTodo(id, text) {
  return {
    type: 'todos/added',
    payload: { id, text, completed: false }
  }
}

dispatch(addTodo(1, '学习 Redux'))
```

看起来只是一层简单的封装，但它带来了很多好处。

## 为什么需要 Action Creator？

### 1. 避免重复和错误

没有 Action Creator，你每次都要手写完整的 Action 对象：

```javascript
// ❌ 容易出错
dispatch({ type: 'todos/added', payload: { id: 1, text: '任务1' } })
dispatch({ type: 'todos/added', payload: { id: 2, text: '任务2' } })
dispatch({ type: 'todos/addd', payload: { id: 3, text: '任务3' } })  // 拼错了！

// ✅ 使用 Action Creator
dispatch(addTodo(1, '任务1'))
dispatch(addTodo(2, '任务2'))
dispatch(addTodo(3, '任务3'))  // 不可能拼错
```

### 2. 封装业务逻辑

Action Creator 可以包含一些简单的逻辑：

```javascript
let nextTodoId = 0

function addTodo(text) {
  return {
    type: 'todos/added',
    payload: {
      id: ++nextTodoId,  // 自动生成 ID
      text,
      completed: false,
      createdAt: Date.now()  // 自动添加时间戳
    }
  }
}
```

### 3. 类型安全

使用 TypeScript 时，Action Creator 提供了类型推断：

```typescript
interface AddTodoPayload {
  id: number
  text: string
  completed: boolean
}

function addTodo(id: number, text: string): FSA<AddTodoPayload> {
  return {
    type: 'todos/added',
    payload: { id, text, completed: false }
  }
}

// TypeScript 会检查参数类型
addTodo(1, '学习 Redux')  // ✅
addTodo('1', '学习 Redux')  // ❌ 类型错误
```

### 4. 便于测试

Action Creator 是纯函数，非常容易测试：

```javascript
import { describe, it, expect } from 'vitest'
import { addTodo } from './actions'

describe('addTodo', () => {
  it('creates ADD_TODO action', () => {
    const action = addTodo(1, '学习 Redux')
    
    expect(action.type).toBe('todos/added')
    expect(action.payload).toEqual({
      id: 1,
      text: '学习 Redux',
      completed: false
    })
  })
})
```

## 实现 Action Creator

让我们实现一些常见的 Action Creator：

### 基础 Action Creator

```javascript
// todoActions.js

// 添加待办
export function addTodo(text) {
  return {
    type: 'todos/added',
    payload: {
      id: Date.now(),
      text,
      completed: false
    }
  }
}

// 切换完成状态
export function toggleTodo(id) {
  return {
    type: 'todos/toggled',
    payload: id
  }
}

// 删除待办
export function removeTodo(id) {
  return {
    type: 'todos/removed',
    payload: id
  }
}

// 编辑待办
export function editTodo(id, text) {
  return {
    type: 'todos/edited',
    payload: { id, text }
  }
}

// 清除已完成
export function clearCompleted() {
  return {
    type: 'todos/completedCleared'
  }
}
```

### 带 meta 的 Action Creator

```javascript
// 带分析数据的 Action Creator
export function addTodoWithAnalytics(text, source = 'unknown') {
  return {
    type: 'todos/added',
    payload: {
      id: Date.now(),
      text,
      completed: false
    },
    meta: {
      analytics: {
        category: 'todos',
        action: 'add',
        label: source
      }
    }
  }
}
```

### 错误 Action Creator

```javascript
// 创建错误 Action
export function fetchTodosFailed(error) {
  return {
    type: 'todos/fetchFailed',
    payload: error,
    error: true
  }
}

// 使用
try {
  const todos = await api.fetchTodos()
  dispatch(todosFetched(todos))
} catch (error) {
  dispatch(fetchTodosFailed(error))
}
```

## TypeScript 实现

让我们用 TypeScript 实现类型安全的 Action Creator：

```typescript
// types.ts
export interface Todo {
  id: number
  text: string
  completed: boolean
}

export interface AddTodoAction {
  type: 'todos/added'
  payload: Todo
}

export interface ToggleTodoAction {
  type: 'todos/toggled'
  payload: number
}

export interface RemoveTodoAction {
  type: 'todos/removed'
  payload: number
}

export type TodoAction = AddTodoAction | ToggleTodoAction | RemoveTodoAction

// actions.ts
import type { AddTodoAction, ToggleTodoAction, RemoveTodoAction } from './types'

export function addTodo(text: string): AddTodoAction {
  return {
    type: 'todos/added',
    payload: {
      id: Date.now(),
      text,
      completed: false
    }
  }
}

export function toggleTodo(id: number): ToggleTodoAction {
  return {
    type: 'todos/toggled',
    payload: id
  }
}

export function removeTodo(id: number): RemoveTodoAction {
  return {
    type: 'todos/removed',
    payload: id
  }
}
```

现在 Reducer 可以利用这些类型：

```typescript
import type { Todo, TodoAction } from './types'

function todoReducer(state: Todo[] = [], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'todos/added':
      // TypeScript 知道 action.payload 是 Todo
      return [...state, action.payload]
    
    case 'todos/toggled':
      // TypeScript 知道 action.payload 是 number
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
```

## 创建 Action Creator 的工厂函数

如果你有很多相似的 Action Creator，可以用工厂函数来创建它们：

```typescript
// createAction 工厂函数
function createAction<P>(type: string) {
  return (payload: P) => ({ type, payload })
}

// 使用工厂函数
const addTodo = createAction<{ text: string }>('todos/added')
const removeTodo = createAction<number>('todos/removed')

// 调用
dispatch(addTodo({ text: '学习 Redux' }))
dispatch(removeTodo(1))
```

这个模式在 Redux Toolkit 的 `createAction` 中被广泛使用。

### 更完善的 createAction 实现

```typescript
interface ActionCreatorWithPayload<P, T extends string> {
  (payload: P): { type: T; payload: P }
  type: T
  match: (action: any) => action is { type: T; payload: P }
}

interface ActionCreatorWithoutPayload<T extends string> {
  (): { type: T }
  type: T
  match: (action: any) => action is { type: T }
}

function createAction<T extends string>(type: T): ActionCreatorWithoutPayload<T>
function createAction<P, T extends string>(type: T): ActionCreatorWithPayload<P, T>
function createAction<P, T extends string>(type: T) {
  function actionCreator(payload?: P) {
    return payload !== undefined ? { type, payload } : { type }
  }

  actionCreator.type = type
  actionCreator.match = (action: any): action is { type: T; payload: P } =>
    action?.type === type

  return actionCreator
}

// 使用
const increment = createAction('counter/incremented')
const incrementBy = createAction<number, 'counter/incrementedBy'>('counter/incrementedBy')

dispatch(increment())           // { type: 'counter/incremented' }
dispatch(incrementBy(5))        // { type: 'counter/incrementedBy', payload: 5 }

// 类型守卫
if (increment.match(action)) {
  // action 是 increment 类型
}
```

## 组织 Action Creator

在大型项目中，如何组织 Action Creator？

### 按领域组织

```
src/
├── features/
│   ├── todos/
│   │   ├── todosActions.ts    # Todo 相关 Action Creator
│   │   ├── todosReducer.ts
│   │   └── todosSelectors.ts
│   ├── user/
│   │   ├── userActions.ts     # User 相关 Action Creator
│   │   ├── userReducer.ts
│   │   └── userSelectors.ts
```

### 导出所有 Action Creator

```typescript
// features/todos/index.ts
export * from './todosActions'
export * from './todosReducer'
export * from './todosSelectors'

// 使用
import { addTodo, toggleTodo, todoReducer } from '@/features/todos'
```

## 本章小结

Action Creator 的价值：

- **避免重复**：封装 Action 创建逻辑
- **减少错误**：不会拼错 type
- **类型安全**：TypeScript 支持
- **便于测试**：纯函数易测试
- **封装逻辑**：可以包含简单的业务逻辑

Action Creator 是一个简单但强大的模式，它让 Redux 代码更加健壮和可维护。

> 下一章，我们将深入学习 Reducer 纯函数的设计。
