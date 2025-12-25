# Reducer 纯函数设计

Reducer 是 Redux 的核心。它接收当前状态和一个 Action，返回新的状态。听起来简单，但要写好 Reducer，需要深入理解纯函数的概念。

## 什么是 Reducer？

Reducer 这个名字来自数组的 `reduce` 方法：

```javascript
// 数组的 reduce
const numbers = [1, 2, 3, 4, 5]
const sum = numbers.reduce((acc, num) => acc + num, 0)
// 15

// Redux 的 Reducer 签名完全一样
// (previousState, action) => newState
function counterReducer(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1
    default:
      return state
  }
}
```

两者的共同点：接收"累积值"和"当前值"，返回"新的累积值"。

## 纯函数的定义

Reducer 必须是**纯函数**。什么是纯函数？

纯函数有两个特点：

1. **相同输入，相同输出**：给定相同的参数，永远返回相同的结果
2. **没有副作用**：不修改外部变量，不进行 I/O 操作

```javascript
// ✅ 纯函数
function add(a, b) {
  return a + b
}

add(1, 2)  // 永远是 3
add(1, 2)  // 还是 3

// ❌ 非纯函数：依赖外部状态
let multiplier = 2
function multiply(x) {
  return x * multiplier  // 结果取决于外部变量
}

multiply(3)  // 6
multiplier = 3
multiply(3)  // 9，同样的输入，不同的输出

// ❌ 非纯函数：有副作用
let total = 0
function addToTotal(x) {
  total += x  // 修改了外部变量
  return total
}
```

## 为什么 Reducer 必须是纯函数？

**1. 可预测性**

纯函数让状态变化变得可预测。给定相同的 state 和 action，结果永远相同：

```javascript
const state = { count: 0 }
const action = { type: 'INCREMENT' }

counterReducer(state, action)  // { count: 1 }
counterReducer(state, action)  // { count: 1 }，永远一样
```

**2. 可测试性**

纯函数测试起来非常简单，不需要 mock 任何东西：

```javascript
test('INCREMENT increases count', () => {
  const state = { count: 0 }
  const action = { type: 'INCREMENT' }
  
  expect(counterReducer(state, action)).toEqual({ count: 1 })
})
```

**3. 时间旅行调试**

Redux DevTools 的时间旅行功能依赖于纯函数。因为 Reducer 是纯函数，我们可以"回放" Action 序列来重建任意时刻的状态：

```javascript
const actions = [
  { type: 'INCREMENT' },
  { type: 'INCREMENT' },
  { type: 'DECREMENT' }
]

// 从初始状态开始，依次应用所有 action
const finalState = actions.reduce(counterReducer, { count: 0 })
// { count: 1 }
```

**4. 性能优化**

React-Redux 使用浅比较来决定是否重新渲染。如果 Reducer 返回了新的对象引用，React 就知道状态变了。如果返回原来的对象，就知道状态没变。

```javascript
function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      if (state.value === action.payload) {
        return state  // 值没变，返回原 state，不触发重新渲染
      }
      return { ...state, value: action.payload }  // 值变了，返回新对象
    default:
      return state
  }
}
```

## Reducer 的基本结构

一个标准的 Reducer 长这样：

```javascript
const initialState = {
  items: [],
  isLoading: false,
  error: null
}

function todosReducer(state = initialState, action) {
  switch (action.type) {
    case 'todos/fetching':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'todos/fetched':
      return {
        ...state,
        items: action.payload,
        isLoading: false
      }
    
    case 'todos/fetchFailed':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      }
    
    case 'todos/added':
      return {
        ...state,
        items: [...state.items, action.payload]
      }
    
    default:
      return state
  }
}
```

### 关键点解析

**1. 默认参数提供初始状态**

```javascript
function reducer(state = initialState, action) {
  // state 为 undefined 时使用 initialState
}
```

Redux 初始化时会 dispatch 一个 `@@redux/INIT` Action，此时 state 是 `undefined`，所以 Reducer 会返回 `initialState`。

**2. switch 语句**

switch 是处理多种 Action 类型的常见方式。如果你不喜欢 switch，也可以用对象查找表：

```javascript
const handlers = {
  'todos/added': (state, action) => ({
    ...state,
    items: [...state.items, action.payload]
  }),
  'todos/removed': (state, action) => ({
    ...state,
    items: state.items.filter(item => item.id !== action.payload)
  })
}

function todosReducer(state = initialState, action) {
  const handler = handlers[action.type]
  return handler ? handler(state, action) : state
}
```

**3. 返回新对象**

Reducer 永远不能修改传入的 state，而是返回一个新对象：

```javascript
// ❌ 错误：直接修改 state
function badReducer(state, action) {
  state.items.push(action.payload)  // 直接修改了原数组
  return state
}

// ✅ 正确：返回新对象
function goodReducer(state, action) {
  return {
    ...state,
    items: [...state.items, action.payload]  // 新数组
  }
}
```

**4. default 返回原 state**

对于不认识的 Action，必须返回原 state：

```javascript
default:
  return state
```

这确保了：
- 其他 Reducer 可以处理这个 Action
- 状态不会意外丢失

## 不可变更新模式

不可变更新是 Reducer 的核心技能。让我们看看各种场景：

### 更新对象属性

```javascript
// 更新一个属性
return {
  ...state,
  name: action.payload
}

// 更新嵌套属性
return {
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      name: action.payload
    }
  }
}
```

### 添加数组元素

```javascript
// 末尾添加
return {
  ...state,
  items: [...state.items, newItem]
}

// 开头添加
return {
  ...state,
  items: [newItem, ...state.items]
}

// 指定位置插入
return {
  ...state,
  items: [
    ...state.items.slice(0, index),
    newItem,
    ...state.items.slice(index)
  ]
}
```

### 删除数组元素

```javascript
// 按索引删除
return {
  ...state,
  items: state.items.filter((_, i) => i !== index)
}

// 按 ID 删除
return {
  ...state,
  items: state.items.filter(item => item.id !== id)
}
```

### 更新数组中的元素

```javascript
// 更新指定项
return {
  ...state,
  items: state.items.map(item =>
    item.id === id
      ? { ...item, completed: !item.completed }
      : item
  )
}
```

## Reducer 禁止做的事

Reducer 必须是纯函数，所以以下行为都是禁止的：

### 1. 修改参数

```javascript
// ❌ 禁止
function reducer(state, action) {
  state.count++  // 直接修改 state
  return state
}
```

### 2. 执行副作用

```javascript
// ❌ 禁止
function reducer(state, action) {
  // 发送网络请求
  fetch('/api/save', { body: JSON.stringify(state) })
  
  // 写入 localStorage
  localStorage.setItem('state', JSON.stringify(state))
  
  // 打印日志（严格来说也是副作用，但通常可以接受）
  console.log('State updated')
  
  return { ...state, saved: true }
}
```

### 3. 调用非纯函数

```javascript
// ❌ 禁止
function reducer(state, action) {
  return {
    ...state,
    id: Math.random(),  // 每次结果不同
    timestamp: Date.now()  // 每次结果不同
  }
}
```

**那怎么处理需要随机数或时间戳的场景呢？**

在 Action Creator 或中间件中处理，而不是在 Reducer 中：

```javascript
// ✅ 在 Action Creator 中生成
function addTodo(text) {
  return {
    type: 'todos/added',
    payload: {
      id: generateId(),  // 在这里生成
      text,
      createdAt: Date.now()  // 在这里生成
    }
  }
}

// Reducer 只是简单地使用传入的值
function reducer(state, action) {
  return {
    ...state,
    items: [...state.items, action.payload]  // 直接使用
  }
}
```

## 本章小结

Reducer 设计的核心原则：

- **纯函数**：相同输入，相同输出，无副作用
- **不可变更新**：永远返回新对象，不修改原 state
- **处理未知 Action**：default 返回原 state
- **初始状态**：通过默认参数提供
- **禁止副作用**：不做 API 调用、不写 localStorage、不用 Math.random()

掌握了这些原则，你就掌握了 Redux 的核心。

> 下一章，我们将学习如何组合多个 Reducer，管理复杂的状态树。
