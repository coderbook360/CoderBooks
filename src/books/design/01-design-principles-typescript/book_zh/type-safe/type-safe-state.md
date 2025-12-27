# 类型安全的状态管理

状态管理是前端应用的核心。类型安全的状态管理可以防止很多运行时错误。

## 问题：不安全的状态

```typescript
// ❌ 松散类型，容易出错
const state = {
  user: null,
  loading: false,
  error: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };  // payload 是什么类型？
    default:
      return state;
  }
}
```

## 定义状态类型

```typescript
// ✅ 明确的状态类型
interface User {
  id: string;
  name: string;
  email: string;
}

interface AppState {
  user: User | null;
  posts: Post[];
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
  };
}

const initialState: AppState = {
  user: null,
  posts: [],
  ui: {
    theme: 'light',
    sidebarOpen: true
  }
};
```

## 类型安全的 Actions

### 使用可辨识联合

```typescript
type Action =
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_USER' }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'REMOVE_POST'; payload: string }  // post id
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };  // payload 类型安全
    case 'CLEAR_USER':
      return { ...state, user: null };
    case 'ADD_POST':
      return { ...state, posts: [...state.posts, action.payload] };
    case 'REMOVE_POST':
      return { 
        ...state, 
        posts: state.posts.filter(p => p.id !== action.payload) 
      };
    case 'SET_THEME':
      return { ...state, ui: { ...state.ui, theme: action.payload } };
    case 'TOGGLE_SIDEBAR':
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } };
  }
}
```

### Action Creators

```typescript
const actions = {
  setUser: (user: User): Action => ({ type: 'SET_USER', payload: user }),
  clearUser: (): Action => ({ type: 'CLEAR_USER' }),
  addPost: (post: Post): Action => ({ type: 'ADD_POST', payload: post }),
  removePost: (id: string): Action => ({ type: 'REMOVE_POST', payload: id }),
  setTheme: (theme: 'light' | 'dark'): Action => ({ type: 'SET_THEME', payload: theme }),
  toggleSidebar: (): Action => ({ type: 'TOGGLE_SIDEBAR' })
};

// 使用
dispatch(actions.setUser({ id: '1', name: 'John', email: 'john@example.com' }));
```

## 异步状态模式

### 加载状态

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

interface AppState {
  users: AsyncState<User[]>;
  currentUser: AsyncState<User>;
}

// 使用
function UserList({ state }: { state: AsyncState<User[]> }) {
  switch (state.status) {
    case 'idle':
      return <div>Ready to load</div>;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <ul>{state.data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
    case 'error':
      return <Error message={state.error.message} />;
  }
}
```

### 异步 Action

```typescript
type AsyncAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; payload: Error };

function asyncReducer<T>(
  state: AsyncState<T>, 
  action: AsyncAction<T>
): AsyncState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { status: 'error', error: action.payload };
  }
}
```

## Selector 类型安全

```typescript
// 定义 Selector 类型
type Selector<S, R> = (state: S) => R;

// 创建类型安全的 Selector
const selectUser: Selector<AppState, User | null> = state => state.user;
const selectTheme: Selector<AppState, 'light' | 'dark'> = state => state.ui.theme;
const selectPostCount: Selector<AppState, number> = state => state.posts.length;

// 组合 Selector
function createSelector<S, A, R>(
  selectorA: Selector<S, A>,
  combiner: (a: A) => R
): Selector<S, R> {
  return state => combiner(selectorA(state));
}

const selectIsLoggedIn = createSelector(
  selectUser,
  user => user !== null
);
```

## 深度更新的类型安全

```typescript
// 类型安全的深度更新
type Path<T> = T extends object
  ? { [K in keyof T]: K extends string ? K | `${K}.${Path<T[K]>}` : never }[keyof T]
  : never;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T ? PathValue<T[K], Rest> : never
  : P extends keyof T ? T[P] : never;

function updateState<P extends Path<AppState>>(
  state: AppState,
  path: P,
  value: PathValue<AppState, P>
): AppState {
  // 实现深度更新
  const keys = (path as string).split('.');
  // ... 实现略
  return state;
}

// 使用
const newState = updateState(state, 'ui.theme', 'dark');  // ✅ 类型安全
// updateState(state, 'ui.theme', 123);  // ❌ 类型错误
```

## React 集成

```typescript
// 创建类型安全的 Context
const StateContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

function useAppState() {
  const context = React.useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within StateProvider');
  }
  return context;
}

// Provider
function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}

// 使用
function Component() {
  const { state, dispatch } = useAppState();
  dispatch(actions.setTheme('dark'));  // ✅ 类型安全
}
```

## 状态不变性

```typescript
// 使用 DeepReadonly 确保状态不被直接修改
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type ImmutableState = DeepReadonly<AppState>;

// 状态是只读的，强制使用 reducer 更新
function useImmutableState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state: state as ImmutableState, dispatch };
}
```

## 总结

**类型安全状态管理要点**：

- **定义清晰的状态类型**
- **使用可辨识联合定义 Action**
- **异步状态使用 AsyncState 模式**
- **Selector 保持类型安全**
- **使用 DeepReadonly 确保不变性**

**好处**：
- 编译时发现状态操作错误
- 自动补全 Action 类型
- 重构时自动更新
- 减少运行时状态错误

**记住**：类型是状态管理的第一道防线。
