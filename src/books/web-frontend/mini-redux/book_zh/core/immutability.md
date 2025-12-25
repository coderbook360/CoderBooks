# 不可变性原则与实现

不可变性（Immutability）是 Redux 的基石。如果你不理解不可变性，就无法正确使用 Redux。这一章我们将深入探讨什么是不可变性，为什么需要它，以及如何在实践中实现它。

## 什么是不可变性？

不可变性意味着**数据一旦创建就不能被修改**。如果你想"修改"数据，必须创建一个新的数据副本。

```javascript
// 可变操作（直接修改）
const user = { name: 'Alice', age: 25 }
user.name = 'Bob'  // 直接修改原对象

// 不可变操作（创建新对象）
const user = { name: 'Alice', age: 25 }
const newUser = { ...user, name: 'Bob' }  // 创建新对象
```

在 JavaScript 中，原始类型（string、number、boolean）天生就是不可变的：

```javascript
let str = 'hello'
str.toUpperCase()  // 返回 'HELLO'，但 str 仍然是 'hello'

let num = 42
num + 1  // 返回 43，但 num 仍然是 42
```

但对象和数组是可变的：

```javascript
const arr = [1, 2, 3]
arr.push(4)  // arr 变成了 [1, 2, 3, 4]

const obj = { a: 1 }
obj.b = 2  // obj 变成了 { a: 1, b: 2 }
```

## 为什么 Redux 需要不可变性？

### 1. 变化检测

React-Redux 使用浅比较（shallow comparison）来决定是否重新渲染：

```javascript
// 浅比较
const prevState = { count: 1 }
const nextState = { count: 2 }

prevState === nextState  // false，是新对象，需要重新渲染

// 如果直接修改
const state = { count: 1 }
state.count = 2

prevState === state  // true，同一个对象，不会重新渲染！
```

如果你直接修改 state，引用没变，React 就不知道状态变了，不会触发重新渲染。

### 2. 时间旅行调试

Redux DevTools 的时间旅行功能需要保存状态的历史记录：

```javascript
const history = []

// 每次状态变化，保存一个快照
function saveState(state) {
  history.push(state)
}

// 可以回到任意时刻
function goToState(index) {
  return history[index]
}
```

如果状态是可变的，修改当前状态会同时修改历史记录中的"同一个对象"，时间旅行就失效了。

### 3. 纯函数要求

Reducer 必须是纯函数，不能修改输入参数：

```javascript
// ❌ 违反纯函数原则
function reducer(state, action) {
  state.count++  // 修改了输入参数
  return state
}

// ✅ 遵守纯函数原则
function reducer(state, action) {
  return { ...state, count: state.count + 1 }  // 返回新对象
}
```

### 4. 避免意外的 bug

可变操作容易导致难以追踪的 bug：

```javascript
const todos = [{ id: 1, text: 'Learn Redux', completed: false }]

// 某处代码意外修改了原数组
function checkTodo(todos, id) {
  const todo = todos.find(t => t.id === id)
  todo.completed = true  // 修改了原对象！
}

checkTodo(todos, 1)
// 现在 todos[0].completed 变成了 true，但没有触发任何更新
```

## 不可变更新模式

让我们学习各种不可变更新的模式：

### 对象操作

```javascript
// 添加/更新属性
const obj = { a: 1, b: 2 }
const newObj = { ...obj, c: 3 }  // { a: 1, b: 2, c: 3 }

// 删除属性
const { b, ...rest } = obj  // rest = { a: 1 }

// 更新嵌套属性
const user = {
  name: 'Alice',
  address: {
    city: 'Beijing',
    street: '...'
  }
}

const newUser = {
  ...user,
  address: {
    ...user.address,
    city: 'Shanghai'
  }
}
```

### 数组操作

```javascript
const arr = [1, 2, 3]

// 添加元素
const added = [...arr, 4]  // [1, 2, 3, 4]
const prepended = [0, ...arr]  // [0, 1, 2, 3]

// 删除元素
const removed = arr.filter(x => x !== 2)  // [1, 3]
const withoutFirst = arr.slice(1)  // [2, 3]
const withoutLast = arr.slice(0, -1)  // [1, 2]

// 更新元素
const updated = arr.map(x => x === 2 ? 20 : x)  // [1, 20, 3]

// 插入元素
const index = 1
const inserted = [
  ...arr.slice(0, index),
  1.5,
  ...arr.slice(index)
]  // [1, 1.5, 2, 3]
```

### 嵌套更新

嵌套更新是最容易出错的地方：

```javascript
const state = {
  users: {
    byId: {
      '1': { id: '1', name: 'Alice', posts: ['a', 'b'] },
      '2': { id: '2', name: 'Bob', posts: ['c'] }
    },
    allIds: ['1', '2']
  }
}

// 更新用户名
const newState = {
  ...state,
  users: {
    ...state.users,
    byId: {
      ...state.users.byId,
      '1': {
        ...state.users.byId['1'],
        name: 'Alicia'
      }
    }
  }
}
```

看到了吗？每一层都需要展开。这就是深层嵌套的痛苦。

## 可变方法 vs 不可变方法

JavaScript 数组方法分为两类：

### 可变方法（会修改原数组）

```javascript
push()     // 添加到末尾
pop()      // 删除末尾
shift()    // 删除开头
unshift()  // 添加到开头
splice()   // 删除/插入
sort()     // 排序
reverse()  // 反转
```

在 Reducer 中**禁止使用**这些方法。

### 不可变方法（返回新数组）

```javascript
concat()   // 连接数组
slice()    // 提取部分
map()      // 映射
filter()   // 过滤
reduce()   // 归约
flat()     // 扁平化
flatMap()  // 映射后扁平化
```

这些方法在 Reducer 中可以安全使用。

### 替代方案

```javascript
// 代替 push
arr = [...arr, newItem]

// 代替 pop
arr = arr.slice(0, -1)

// 代替 shift
arr = arr.slice(1)

// 代替 unshift
arr = [newItem, ...arr]

// 代替 splice（删除）
arr = [...arr.slice(0, index), ...arr.slice(index + 1)]

// 代替 splice（插入）
arr = [...arr.slice(0, index), newItem, ...arr.slice(index)]

// 代替 sort
arr = [...arr].sort()

// 代替 reverse
arr = [...arr].reverse()
```

## 使用 Immer 简化不可变更新

深层嵌套的不可变更新太繁琐了。Immer 库让你可以用"可变"的写法写出不可变的代码：

```javascript
import produce from 'immer'

const state = {
  users: {
    byId: {
      '1': { id: '1', name: 'Alice' }
    }
  }
}

// 使用 Immer
const newState = produce(state, draft => {
  // 看起来是可变操作，但实际上是不可变的
  draft.users.byId['1'].name = 'Alicia'
})

// state 没有被修改
console.log(state.users.byId['1'].name)  // 'Alice'
console.log(newState.users.byId['1'].name)  // 'Alicia'
```

### Immer 的原理

Immer 使用 Proxy 来追踪对 draft 的修改，然后基于这些修改创建一个新的不可变状态：

```javascript
// 简化的 Immer 原理
function produce(baseState, recipe) {
  // 记录所有修改
  const changes = []
  
  // 创建代理
  const proxy = new Proxy(baseState, {
    set(target, key, value) {
      changes.push({ key, value })
      return true
    }
  })
  
  // 执行"可变"操作
  recipe(proxy)
  
  // 基于修改创建新对象
  return applyChanges(baseState, changes)
}
```

### Redux Toolkit 内置 Immer

Redux Toolkit 的 `createSlice` 自动使用 Immer：

```javascript
import { createSlice } from '@reduxjs/toolkit'

const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    todoAdded(state, action) {
      // 可以直接 push！Immer 会处理
      state.push(action.payload)
    },
    todoToggled(state, action) {
      const todo = state.find(t => t.id === action.payload)
      // 可以直接修改！
      todo.completed = !todo.completed
    }
  }
})
```

## 性能考虑

不可变更新会创建新对象，这会影响性能吗？

### 结构共享

不可变数据结构使用**结构共享**来优化内存使用：

```javascript
const state = {
  a: { value: 1 },
  b: { value: 2 },
  c: { value: 3 }
}

// 只更新 a
const newState = {
  ...state,
  a: { value: 10 }
}

// b 和 c 仍然是同一个对象
state.b === newState.b  // true
state.c === newState.c  // true
```

只有被修改的部分会创建新对象，其他部分共享引用。

### 实际性能

在大多数情况下，不可变更新的性能开销是可以忽略的：

- 展开运算符非常快
- 结构共享减少了内存分配
- 变化检测变得更快（只需要比较引用）

只有在处理大型数组（几万个元素）时才可能需要特别优化。

## 本章小结

不可变性的核心要点：

- **不修改原数据**：永远创建新对象/数组
- **浅比较友好**：让 React 能正确检测变化
- **时间旅行支持**：保持状态历史独立
- **使用不可变方法**：map、filter、slice 而不是 push、pop
- **Immer 简化代码**：用"可变"语法写不可变代码
- **结构共享**：性能开销通常可忽略

掌握不可变更新，你就掌握了 Redux 的核心技能。

> 下一章，我们将开始实现 createStore，这是 Redux 的核心函数。
