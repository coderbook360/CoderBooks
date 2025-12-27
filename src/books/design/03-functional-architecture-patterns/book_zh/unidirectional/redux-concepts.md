# Redux 核心概念详解

> Redux 是 JavaScript 应用的可预测状态容器——它通过严格的单向数据流和纯函数，让状态变化变得可追踪、可调试。

## 为什么需要 Redux？

在大型前端应用中，状态管理面临以下挑战：

```typescript
// 问题 1：状态分散在各个组件中
// UserProfile.tsx
const [user, setUser] = useState(null);

// Cart.tsx
const [cartItems, setCartItems] = useState([]);

// Notification.tsx
const [notifications, setNotifications] = useState([]);

// 问题 2：组件间状态同步困难
// 当用户登录后，需要更新多个组件的状态
// 如何确保所有组件看到一致的用户信息？

// 问题 3：状态变化难以追踪
// setUser 在哪里被调用？被谁调用？传了什么值？
```

Redux 的解决方案：**单一数据源 + 纯函数 + 单向数据流**。

## Redux 三大原则

### 1. 单一数据源（Single Source of Truth）

整个应用的状态存储在一个对象树中：

```typescript
// 整个应用只有一个 store
const store = {
  user: {
    id: '1',
    name: 'Alice',
    isLoggedIn: true
  },
  cart: {
    items: [
      { productId: '101', quantity: 2 }
    ],
    total: 199.98
  },
  notifications: [
    { id: 'n1', message: '订单已发货', read: false }
  ]
};
```

**好处**：
- 任何组件都能访问到一致的状态
- 调试时可以导出整个应用状态
- 服务端渲染时可以序列化状态

### 2. 状态只读（State is Read-Only）

唯一改变状态的方法是触发 Action：

```typescript
// ❌ 直接修改状态
store.user.name = 'Bob';

// ✅ 通过 Action 描述变化
store.dispatch({
  type: 'user/nameUpdated',
  payload: 'Bob'
});
```

**好处**：
- 所有状态变化都有记录
- 可以实现撤销/重做
- 便于调试和日志记录

### 3. 使用纯函数执行变化（Changes are Made with Pure Functions）

Reducer 是纯函数，接收旧状态和 Action，返回新状态：

```typescript
// Reducer 必须是纯函数
function userReducer(state = initialState, action: Action): UserState {
  switch (action.type) {
    case 'user/nameUpdated':
      // 返回新对象，不修改原状态
      return { ...state, name: action.payload };
    default:
      return state;
  }
}
```

**好处**：
- 状态变化可预测
- 易于测试
- 支持时间旅行调试

## 核心概念详解

### Store：状态容器

Store 是保存应用状态的地方：

```typescript
import { createStore } from 'redux';

// 创建 Store
const store = createStore(rootReducer);

// 获取当前状态
const state = store.getState();

// 订阅状态变化
const unsubscribe = store.subscribe(() => {
  console.log('State changed:', store.getState());
});

// 触发状态变化
store.dispatch({ type: 'INCREMENT' });

// 取消订阅
unsubscribe();
```

### Action：描述变化

Action 是一个普通对象，描述"发生了什么"：

```typescript
// Action 必须有 type 字段
interface Action {
  type: string;
  payload?: any;
}

// 基本 Action
const incrementAction = {
  type: 'counter/incremented'
};

// 带数据的 Action
const addTodoAction = {
  type: 'todos/added',
  payload: {
    id: '1',
    text: 'Learn Redux',
    completed: false
  }
};

// Action Creator：生成 Action 的函数
function addTodo(text: string) {
  return {
    type: 'todos/added',
    payload: {
      id: Date.now().toString(),
      text,
      completed: false
    }
  };
}

// 使用
store.dispatch(addTodo('Learn Redux'));
```

### Reducer：处理变化

Reducer 决定如何根据 Action 更新状态：

```typescript
interface CounterState {
  value: number;
}

const initialState: CounterState = { value: 0 };

function counterReducer(
  state = initialState,
  action: Action
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 };
      
    case 'counter/decremented':
      return { value: state.value - 1 };
      
    case 'counter/incrementedByAmount':
      return { value: state.value + action.payload };
      
    case 'counter/reset':
      return initialState;
      
    default:
      // 不认识的 Action，返回原状态
      return state;
  }
}
```

### Reducer 的组合

大型应用需要拆分 Reducer：

```typescript
import { combineReducers } from 'redux';

// 用户相关状态
function userReducer(state = initialUserState, action: Action) {
  switch (action.type) {
    case 'user/login':
      return { ...state, isLoggedIn: true, ...action.payload };
    case 'user/logout':
      return initialUserState;
    default:
      return state;
  }
}

// 购物车相关状态
function cartReducer(state = initialCartState, action: Action) {
  switch (action.type) {
    case 'cart/itemAdded':
      return { ...state, items: [...state.items, action.payload] };
    case 'cart/itemRemoved':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    default:
      return state;
  }
}

// 组合所有 Reducer
const rootReducer = combineReducers({
  user: userReducer,
  cart: cartReducer
});

// 状态结构
// {
//   user: { ... },
//   cart: { ... }
// }
```

## 数据流详解

Redux 的数据流是严格单向的：

```
    ┌─────────────────────────────────────────────┐
    │                                             │
    │  ① 用户操作触发 Action                      ▼
    │                                          ┌──────┐
    │  ┌────────────┐   dispatch(action)       │      │
    │  │    UI      │ ─────────────────────►   │Store │
    │  └────────────┘                          │      │
    │        ▲                                 └──┬───┘
    │        │                                    │
    │        │ ④ 重新渲染                         │ ② 调用 Reducer
    │        │                                    │
    │  ┌─────┴──────┐    ③ 返回新 State      ┌────▼─────┐
    │  │ mapState   │ ◄───────────────────── │ Reducer  │
    │  └────────────┘                        └──────────┘
    │                                             │
    └─────────────────────────────────────────────┘
```

1. **用户操作**：点击按钮、提交表单等
2. **Dispatch Action**：描述发生了什么
3. **Reducer 处理**：根据 Action 计算新状态
4. **Store 更新**：通知订阅者状态已变化
5. **UI 更新**：组件获取新状态并重新渲染

## 实战示例：计数器

```typescript
// types.ts
interface CounterState {
  value: number;
}

type CounterAction =
  | { type: 'counter/incremented' }
  | { type: 'counter/decremented' }
  | { type: 'counter/incrementedByAmount'; payload: number };

// reducer.ts
const initialState: CounterState = { value: 0 };

function counterReducer(
  state = initialState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1 };
    case 'counter/decremented':
      return { value: state.value - 1 };
    case 'counter/incrementedByAmount':
      return { value: state.value + action.payload };
    default:
      return state;
  }
}

// actions.ts
const increment = () => ({ type: 'counter/incremented' as const });
const decrement = () => ({ type: 'counter/decremented' as const });
const incrementByAmount = (amount: number) => ({
  type: 'counter/incrementedByAmount' as const,
  payload: amount
});

// store.ts
import { createStore } from 'redux';

const store = createStore(counterReducer);

// 使用
console.log(store.getState()); // { value: 0 }

store.dispatch(increment());
console.log(store.getState()); // { value: 1 }

store.dispatch(incrementByAmount(5));
console.log(store.getState()); // { value: 6 }

store.dispatch(decrement());
console.log(store.getState()); // { value: 5 }
```

## 与 React 集成

```typescript
import { useSelector, useDispatch } from 'react-redux';

function Counter() {
  // 从 Store 中选择状态
  const count = useSelector((state: RootState) => state.counter.value);
  
  // 获取 dispatch 函数
  const dispatch = useDispatch();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
      <button onClick={() => dispatch(incrementByAmount(10))}>+10</button>
    </div>
  );
}
```

## Redux 的优缺点

### 优点

1. **可预测性**：状态变化完全可追踪
2. **调试友好**：Redux DevTools 支持时间旅行
3. **中心化**：状态集中管理，避免不一致
4. **生态丰富**：大量中间件和工具

### 缺点

1. **样板代码多**：Action、Reducer、Types 需要大量代码
2. **学习曲线**：概念较多，需要时间理解
3. **过度工程**：简单应用可能不需要 Redux

## 总结

Redux 的核心概念：

1. **Store**：唯一的状态容器
2. **Action**：描述"发生了什么"
3. **Reducer**：纯函数，决定状态如何变化
4. **三大原则**：单一数据源、状态只读、纯函数变化

Redux 通过严格的约束换取可预测性和可调试性。下一章我们将学习 Redux Toolkit，它大大简化了 Redux 的使用方式。
