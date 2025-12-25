---
sidebar_position: 98
title: "状态管理模式"
---

# 状态管理模式

本章介绍使用 RxJS 实现状态管理。

## 核心概念

### 为什么用 RxJS 做状态管理

1. **响应式**：状态变化自动通知订阅者
2. **可组合**：使用操作符处理复杂逻辑
3. **可测试**：纯函数和数据流易于测试
4. **可追踪**：数据流清晰可调试

### 基本模式

```javascript
// 最简单的状态管理
const state$ = new BehaviorSubject(initialState)

// 读取状态
state$.subscribe(state => render(state))

// 更新状态
state$.next(newState)
```

## Store 实现

### 简单 Store

```javascript
function createStore(initialState) {
  const state$ = new BehaviorSubject(initialState)
  
  return {
    state$: state$.asObservable(),
    
    getState() {
      return state$.getValue()
    },
    
    setState(updater) {
      const current = state$.getValue()
      const next = typeof updater === 'function'
        ? updater(current)
        : { ...current, ...updater }
      state$.next(next)
    },
    
    select(selector) {
      return state$.pipe(
        map(selector),
        distinctUntilChanged()
      )
    }
  }
}

// 使用
const store = createStore({
  user: null,
  todos: [],
  loading: false
})

// 订阅特定字段
store.select(s => s.user).subscribe(user => {
  console.log('User changed:', user)
})

// 更新状态
store.setState({ loading: true })
store.setState(s => ({ ...s, todos: [...s.todos, newTodo] }))
```

### 带 Action 的 Store

```javascript
function createActionStore(initialState, reducers) {
  const state$ = new BehaviorSubject(initialState)
  const action$ = new Subject()
  
  // 处理 action
  action$.pipe(
    scan((state, action) => {
      const reducer = reducers[action.type]
      return reducer ? reducer(state, action.payload) : state
    }, initialState)
  ).subscribe(state => state$.next(state))
  
  return {
    state$: state$.asObservable(),
    
    dispatch(action) {
      action$.next(action)
    },
    
    select(selector) {
      return state$.pipe(
        map(selector),
        distinctUntilChanged()
      )
    }
  }
}

// 定义 reducers
const reducers = {
  'todos/add': (state, todo) => ({
    ...state,
    todos: [...state.todos, todo]
  }),
  
  'todos/remove': (state, id) => ({
    ...state,
    todos: state.todos.filter(t => t.id !== id)
  }),
  
  'todos/toggle': (state, id) => ({
    ...state,
    todos: state.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
  }),
  
  'loading/set': (state, loading) => ({
    ...state,
    loading
  })
}

// 使用
const store = createActionStore(
  { todos: [], loading: false },
  reducers
)

store.dispatch({ type: 'todos/add', payload: { id: 1, text: 'Learn RxJS' } })
store.dispatch({ type: 'todos/toggle', payload: 1 })
```

### 带 Effects 的 Store

```javascript
function createEffectStore(initialState, reducers, effects) {
  const state$ = new BehaviorSubject(initialState)
  const action$ = new Subject()
  const effect$ = new Subject()
  
  // Reducer 处理
  action$.pipe(
    scan((state, action) => {
      const reducer = reducers[action.type]
      return reducer ? reducer(state, action.payload) : state
    }, initialState)
  ).subscribe(state => state$.next(state))
  
  // Effect 处理
  effect$.pipe(
    mergeMap(action => {
      const effect = effects[action.type]
      if (!effect) return EMPTY
      
      return effect(action.payload, {
        getState: () => state$.getValue(),
        dispatch: (a) => action$.next(a)
      }).pipe(
        catchError(err => {
          console.error(`Effect error in ${action.type}:`, err)
          return EMPTY
        })
      )
    })
  ).subscribe(action => {
    if (action) action$.next(action)
  })
  
  return {
    state$: state$.asObservable(),
    
    dispatch(action) {
      action$.next(action)
      effect$.next(action)
    },
    
    select(selector) {
      return state$.pipe(
        map(selector),
        distinctUntilChanged()
      )
    }
  }
}

// 定义 effects
const effects = {
  'todos/fetch': (_, { dispatch }) => {
    dispatch({ type: 'loading/set', payload: true })
    
    return fetchTodos().pipe(
      map(todos => ({ type: 'todos/loaded', payload: todos })),
      tap(() => dispatch({ type: 'loading/set', payload: false }))
    )
  },
  
  'todos/save': (todo, { dispatch, getState }) => {
    return saveTodo(todo).pipe(
      map(saved => ({ type: 'todos/add', payload: saved })),
      catchError(err => {
        dispatch({ type: 'error/set', payload: err.message })
        return EMPTY
      })
    )
  }
}
```

## 选择器

### 基础选择器

```javascript
function createSelector(selector, equalityFn = Object.is) {
  return (state$) => state$.pipe(
    map(selector),
    distinctUntilChanged(equalityFn)
  )
}

// 使用
const selectTodos = createSelector(s => s.todos)
const selectUser = createSelector(s => s.user)

selectTodos(store.state$).subscribe(todos => {
  console.log('Todos:', todos)
})
```

### 组合选择器

```javascript
function createComputedSelector(...selectors) {
  const resultFn = selectors.pop()
  
  return (state$) => {
    const selected$ = selectors.map(sel => 
      state$.pipe(
        map(sel),
        distinctUntilChanged()
      )
    )
    
    return combineLatest(selected$).pipe(
      map(values => resultFn(...values)),
      distinctUntilChanged()
    )
  }
}

// 使用
const selectCompletedTodos = createComputedSelector(
  s => s.todos,
  s => s.filter,
  (todos, filter) => {
    switch (filter) {
      case 'completed':
        return todos.filter(t => t.done)
      case 'active':
        return todos.filter(t => !t.done)
      default:
        return todos
    }
  }
)

selectCompletedTodos(store.state$).subscribe(todos => {
  renderTodos(todos)
})
```

### 带缓存的选择器

```javascript
function createMemoizedSelector(...selectors) {
  const resultFn = selectors.pop()
  let lastInputs = null
  let lastResult = null
  
  return (state$) => {
    return state$.pipe(
      map(state => {
        const inputs = selectors.map(sel => sel(state))
        
        // 检查输入是否变化
        if (lastInputs && inputs.every((v, i) => v === lastInputs[i])) {
          return lastResult
        }
        
        lastInputs = inputs
        lastResult = resultFn(...inputs)
        return lastResult
      }),
      distinctUntilChanged()
    )
  }
}
```

## 模块化 Store

### Store 模块

```javascript
function createStoreModule(name, config) {
  const {
    initialState,
    reducers = {},
    effects = {},
    selectors = {}
  } = config
  
  return {
    name,
    initialState,
    reducers: Object.fromEntries(
      Object.entries(reducers).map(([key, reducer]) => [
        `${name}/${key}`,
        reducer
      ])
    ),
    effects: Object.fromEntries(
      Object.entries(effects).map(([key, effect]) => [
        `${name}/${key}`,
        effect
      ])
    ),
    selectors: Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [
        key,
        (state$) => state$.pipe(
          map(s => s[name]),
          switchMap(moduleState => selector(of(moduleState)))
        )
      ])
    ),
    actions: Object.fromEntries(
      Object.keys({ ...reducers, ...effects }).map(key => [
        key,
        (payload) => ({ type: `${name}/${key}`, payload })
      ])
    )
  }
}

// 使用
const todosModule = createStoreModule('todos', {
  initialState: {
    items: [],
    loading: false
  },
  reducers: {
    add: (state, todo) => ({
      ...state,
      items: [...state.items, todo]
    }),
    remove: (state, id) => ({
      ...state,
      items: state.items.filter(t => t.id !== id)
    }),
    setLoading: (state, loading) => ({
      ...state,
      loading
    })
  },
  effects: {
    fetch: (_, { dispatch }) => {
      dispatch(todosModule.actions.setLoading(true))
      return fetchTodos().pipe(
        tap(items => {
          items.forEach(item => 
            dispatch(todosModule.actions.add(item))
          )
          dispatch(todosModule.actions.setLoading(false))
        })
      )
    }
  },
  selectors: {
    all: (state$) => state$.pipe(map(s => s.items)),
    loading: (state$) => state$.pipe(map(s => s.loading))
  }
})
```

### 组合模块

```javascript
function combineModules(...modules) {
  const initialState = {}
  const reducers = {}
  const effects = {}
  
  modules.forEach(module => {
    initialState[module.name] = module.initialState
    Object.assign(reducers, module.reducers)
    Object.assign(effects, module.effects)
  })
  
  return {
    initialState,
    reducers,
    effects
  }
}

// 使用
const { initialState, reducers, effects } = combineModules(
  todosModule,
  userModule,
  settingsModule
)

const store = createEffectStore(initialState, reducers, effects)
```

## 中间件

### 日志中间件

```javascript
function createLoggerMiddleware(store) {
  const originalDispatch = store.dispatch.bind(store)
  
  store.dispatch = (action) => {
    console.group(action.type)
    console.log('Prev State:', store.getState())
    console.log('Action:', action)
    originalDispatch(action)
    console.log('Next State:', store.getState())
    console.groupEnd()
  }
}
```

### 持久化中间件

```javascript
function createPersistMiddleware(store, options = {}) {
  const {
    key = 'app_state',
    storage = localStorage,
    include = null,
    exclude = []
  } = options
  
  // 加载初始状态
  try {
    const saved = storage.getItem(key)
    if (saved) {
      const parsed = JSON.parse(saved)
      store.setState(state => ({ ...state, ...parsed }))
    }
  } catch (e) {
    console.error('Failed to load state:', e)
  }
  
  // 订阅状态变化
  store.state$.pipe(
    debounceTime(1000),
    map(state => {
      if (include) {
        return Object.fromEntries(
          include.map(key => [key, state[key]])
        )
      }
      return Object.fromEntries(
        Object.entries(state).filter(([k]) => !exclude.includes(k))
      )
    })
  ).subscribe(state => {
    try {
      storage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save state:', e)
    }
  })
}

// 使用
createPersistMiddleware(store, {
  key: 'todo_app',
  include: ['todos', 'settings'],
  exclude: ['loading']
})
```

### 撤销/重做中间件

```javascript
function createUndoMiddleware(store, options = {}) {
  const {
    maxHistory = 50,
    include = null
  } = options
  
  const history = []
  let currentIndex = -1
  
  // 保存状态
  store.state$.pipe(
    map(state => {
      if (include) {
        return Object.fromEntries(
          include.map(key => [key, state[key]])
        )
      }
      return state
    }),
    distinctUntilChanged((a, b) => 
      JSON.stringify(a) === JSON.stringify(b)
    )
  ).subscribe(state => {
    // 移除当前位置之后的历史
    history.splice(currentIndex + 1)
    
    // 添加新状态
    history.push(state)
    
    // 限制历史长度
    if (history.length > maxHistory) {
      history.shift()
    }
    
    currentIndex = history.length - 1
  })
  
  return {
    canUndo: () => currentIndex > 0,
    canRedo: () => currentIndex < history.length - 1,
    
    undo: () => {
      if (currentIndex > 0) {
        currentIndex--
        store.setState(state => ({
          ...state,
          ...history[currentIndex]
        }))
      }
    },
    
    redo: () => {
      if (currentIndex < history.length - 1) {
        currentIndex++
        store.setState(state => ({
          ...state,
          ...history[currentIndex]
        }))
      }
    }
  }
}

// 使用
const undoable = createUndoMiddleware(store, {
  include: ['todos']
})

// 撤销
if (undoable.canUndo()) {
  undoable.undo()
}
```

## 完整示例

```javascript
// store.js
class RxStore {
  constructor(config) {
    this.state$ = new BehaviorSubject(config.initialState)
    this.action$ = new Subject()
    this.reducers = config.reducers || {}
    this.effects = config.effects || {}
    
    this.setupReducers()
    this.setupEffects()
  }
  
  setupReducers() {
    this.action$.pipe(
      scan((state, action) => {
        const reducer = this.reducers[action.type]
        return reducer ? reducer(state, action.payload) : state
      }, this.state$.getValue())
    ).subscribe(state => this.state$.next(state))
  }
  
  setupEffects() {
    this.action$.pipe(
      mergeMap(action => {
        const effect = this.effects[action.type]
        if (!effect) return EMPTY
        
        return effect(action.payload, {
          getState: () => this.state$.getValue(),
          dispatch: (a) => this.dispatch(a)
        }).pipe(
          catchError(() => EMPTY)
        )
      })
    ).subscribe(action => {
      if (action) this.action$.next(action)
    })
  }
  
  getState() {
    return this.state$.getValue()
  }
  
  dispatch(action) {
    this.action$.next(action)
  }
  
  select(selector) {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    )
  }
}

// 使用
const store = new RxStore({
  initialState: { count: 0 },
  reducers: {
    increment: (state) => ({ count: state.count + 1 }),
    decrement: (state) => ({ count: state.count - 1 }),
    set: (state, value) => ({ count: value })
  },
  effects: {
    incrementAsync: (_, { dispatch }) => {
      return timer(1000).pipe(
        tap(() => dispatch({ type: 'increment' }))
      )
    }
  }
})

store.select(s => s.count).subscribe(count => {
  console.log('Count:', count)
})

store.dispatch({ type: 'increment' })
store.dispatch({ type: 'incrementAsync' })
```

## 本章小结

- BehaviorSubject 是状态管理的核心
- Reducer 保持状态更新的纯净性
- Effect 处理异步操作
- 选择器实现派生状态
- 中间件扩展 Store 功能
- 模块化提高可维护性

下一章实现表单验证。
