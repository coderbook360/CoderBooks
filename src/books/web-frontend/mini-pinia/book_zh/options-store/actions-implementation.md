---
sidebar_position: 24
title: Actions 实现：方法绑定与上下文
---

# Actions 实现：方法绑定与上下文

Actions 是 Store 中执行业务逻辑的方法，可以修改 state、调用其他 action、执行异步操作。本章深入实现 Actions，重点是 `this` 上下文绑定和方法包装。

## Actions 的设计理念

与 Vuex 不同，Pinia 没有 mutations。在 Vuex 中：

```javascript
// Vuex：必须通过 mutation 修改 state
mutations: {
  increment(state) {
    state.count++
  }
},
actions: {
  incrementAsync({ commit }) {
    setTimeout(() => {
      commit('increment')
    }, 1000)
  }
}
```

在 Pinia 中：

```javascript
// Pinia：actions 直接修改 state
actions: {
  increment() {
    this.count++  // 直接修改
  },
  async incrementAsync() {
    await delay(1000)
    this.count++  // 同样直接修改
  }
}
```

为什么可以这样？

1. **Vue 3 响应式改进**：Proxy 可以追踪任意属性的修改
2. **DevTools 支持**：Pinia 通过 `$patch` 和订阅系统追踪变更
3. **简化 API**：减少样板代码，提升开发体验

## Action 函数签名

Action 是普通函数，通过 `this` 访问 Store：

```javascript
actions: {
  // 同步 action
  increment() {
    this.count++
  },
  
  // 带参数
  incrementBy(amount) {
    this.count += amount
  },
  
  // 访问 getter
  doubleIncrement() {
    this.count += this.double
  },
  
  // 调用其他 action
  reset() {
    this.count = 0
    this.clearItems()  // 调用另一个 action
  },
  
  // 异步 action
  async fetchUser(id) {
    this.loading = true
    try {
      this.user = await api.getUser(id)
    } finally {
      this.loading = false
    }
  }
}
```

## 实现 Actions 绑定

核心是将 action 函数的 `this` 绑定到 Store 实例：

```javascript
function setupActions(actions, store) {
  if (!actions) return
  
  for (const actionName in actions) {
    const action = actions[actionName]
    
    // 绑定 this 为 store
    store[actionName] = action.bind(store)
  }
}
```

但这个简单实现不支持 `$onAction` 订阅。我们需要包装 action：

```javascript
function wrapAction(name, action, store) {
  return function wrappedAction(...args) {
    // 执行原始 action，绑定 this
    return action.apply(store, args)
  }
}

function setupActions(actions, store) {
  if (!actions) return
  
  for (const actionName in actions) {
    const action = actions[actionName]
    store[actionName] = wrapAction(actionName, action, store)
  }
}
```

## Action 的 this 上下文

`this` 上可以访问 Store 的所有内容：

```javascript
actions: {
  demonstrateThis() {
    // 访问 state
    console.log(this.count)
    
    // 修改 state
    this.count++
    
    // 访问 getter
    console.log(this.double)
    
    // 调用其他 action
    this.otherAction()
    
    // 访问 Store API
    this.$patch({ count: 0 })
    this.$reset()
    
    // 访问 Store 元信息
    console.log(this.$id)
  }
}
```

### 验证 this 绑定

确保 action 在各种调用场景下 `this` 正确：

```javascript
// 场景1：直接调用
store.increment()

// 场景2：解构调用
const { increment } = store
increment()  // this 应该仍指向 store

// 场景3：作为回调
setTimeout(store.increment, 1000)  // this 应该仍指向 store

// 场景4：传给其他函数
someFunction(store.increment)  // this 应该仍指向 store
```

使用 `bind` 或箭头函数包装可以确保所有场景正确。

## 支持 $onAction 订阅

Pinia 的 `$onAction` 允许订阅 action 的执行：

```javascript
store.$onAction(({ name, store, args, after, onError }) => {
  console.log(`Action ${name} started with args:`, args)
  
  after((result) => {
    console.log(`Action ${name} finished with result:`, result)
  })
  
  onError((error) => {
    console.log(`Action ${name} failed with error:`, error)
  })
})
```

为了支持这个 API，action 需要更复杂的包装：

```javascript
function wrapAction(name, action, store) {
  return function wrappedAction(...args) {
    // 准备订阅回调收集器
    const afterCallbacks = []
    const errorCallbacks = []
    
    function after(callback) {
      afterCallbacks.push(callback)
    }
    
    function onError(callback) {
      errorCallbacks.push(callback)
    }
    
    // 触发订阅：action 开始
    triggerSubscriptions(store._actionSubscribers, {
      name,
      store,
      args,
      after,
      onError
    })
    
    let result
    try {
      // 执行原始 action
      result = action.apply(store, args)
    } catch (error) {
      // 同步错误
      triggerSubscriptions(errorCallbacks, error)
      throw error
    }
    
    // 处理返回值
    if (result instanceof Promise) {
      // 异步 action
      return result
        .then((value) => {
          triggerSubscriptions(afterCallbacks, value)
          return value
        })
        .catch((error) => {
          triggerSubscriptions(errorCallbacks, error)
          throw error
        })
    }
    
    // 同步 action 完成
    triggerSubscriptions(afterCallbacks, result)
    return result
  }
}

function triggerSubscriptions(callbacks, arg) {
  callbacks.forEach((callback) => {
    try {
      callback(arg)
    } catch (e) {
      console.error('Subscription callback error:', e)
    }
  })
}
```

## 实现 $onAction

```javascript
function createOnAction(store) {
  return function $onAction(callback, detached = false) {
    // 添加到订阅列表
    store._actionSubscribers.push(callback)
    
    // 返回取消订阅函数
    const removeSubscription = () => {
      const index = store._actionSubscribers.indexOf(callback)
      if (index > -1) {
        store._actionSubscribers.splice(index, 1)
      }
    }
    
    // 如果不是 detached 模式，组件卸载时自动取消
    if (!detached && getCurrentScope()) {
      onScopeDispose(removeSubscription)
    }
    
    return removeSubscription
  }
}
```

`detached` 参数的作用：

- `detached: false`（默认）：组件卸载时自动取消订阅
- `detached: true`：手动控制取消，适合全局监听

## Action 返回值处理

Action 可以返回任意值：

```javascript
actions: {
  // 返回计算结果
  getFormattedCount() {
    return `Count is: ${this.count}`
  },
  
  // 返回 Promise
  async fetchData() {
    const data = await api.getData()
    this.data = data
    return data  // 调用者可以获取结果
  },
  
  // 返回其他 action 的结果
  async processAndFetch() {
    await this.fetchData()
    return this.getFormattedCount()
  }
}

// 使用
const formatted = store.getFormattedCount()
const data = await store.fetchData()
```

包装器需要正确传递返回值：

```javascript
function wrapAction(name, action, store) {
  return function wrappedAction(...args) {
    // ... 订阅逻辑 ...
    
    const result = action.apply(store, args)
    
    // 确保返回值正确传递
    return result
  }
}
```

## 完整实现

```javascript
export function setupActions(options, store, pinia) {
  const { actions } = options
  if (!actions) return
  
  // 初始化订阅列表
  store._actionSubscribers = []
  
  // 包装每个 action
  for (const actionName in actions) {
    const action = actions[actionName]
    store[actionName] = createWrappedAction(actionName, action, store)
  }
  
  // 添加 $onAction 方法
  store.$onAction = createOnAction(store)
}

function createWrappedAction(name, action, store) {
  return function (...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 触发订阅
    store._actionSubscribers.forEach((sub) => {
      sub({
        name,
        store,
        args,
        after: (cb) => afterCallbacks.push(cb),
        onError: (cb) => errorCallbacks.push(cb)
      })
    })
    
    let result
    try {
      result = action.apply(store, args)
    } catch (error) {
      errorCallbacks.forEach((cb) => cb(error))
      throw error
    }
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          afterCallbacks.forEach((cb) => cb(value))
          return value
        })
        .catch((error) => {
          errorCallbacks.forEach((cb) => cb(error))
          throw error
        })
    }
    
    afterCallbacks.forEach((cb) => cb(result))
    return result
  }
}

function createOnAction(store) {
  return function (callback, detached = false) {
    store._actionSubscribers.push(callback)
    
    const remove = () => {
      const idx = store._actionSubscribers.indexOf(callback)
      if (idx > -1) store._actionSubscribers.splice(idx, 1)
    }
    
    if (!detached && getCurrentScope()) {
      onScopeDispose(remove)
    }
    
    return remove
  }
}
```

## TypeScript 类型支持

Action 的类型定义需要确保 `this` 正确：

```typescript
interface Actions {
  increment(): void
  incrementBy(amount: number): void
  fetchUser(id: string): Promise<User>
}

// Pinia 的类型体操确保：
// - this.count 可访问
// - this.increment 可调用
// - 参数和返回类型正确
```

使用 `ThisType` 实现：

```typescript
interface DefineStoreOptions<Id, S, G, A> {
  id?: Id
  state?: () => S
  getters?: G & ThisType<S & G>
  actions?: A & ThisType<
    S & G & A & StoreAPI  // actions 中 this 的类型
  >
}
```

## 测试验证

```javascript
describe('Actions', () => {
  test('action can modify state', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    store.increment()
    expect(store.count).toBe(1)
  })
  
  test('action this context', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      getters: {
        double: (state) => state.count * 2
      },
      actions: {
        incrementByDouble() {
          this.count += this.double
        }
      }
    })
    
    const store = useStore()
    store.count = 5
    store.incrementByDouble()
    expect(store.count).toBe(15)  // 5 + 10
  })
  
  test('action with return value', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        getDoubled() {
          return this.count * 2
        }
      }
    })
    
    const store = useStore()
    store.count = 5
    expect(store.getDoubled()).toBe(10)
  })
  
  test('destructured action keeps this', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    const { increment } = store
    increment()  // this 应该仍然正确
    expect(store.count).toBe(1)
  })
  
  test('$onAction subscription', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    const calls = []
    
    store.$onAction(({ name, args, after }) => {
      calls.push({ event: 'start', name, args })
      after((result) => {
        calls.push({ event: 'after', name, result })
      })
    })
    
    store.increment()
    
    expect(calls).toEqual([
      { event: 'start', name: 'increment', args: [] },
      { event: 'after', name: 'increment', result: undefined }
    ])
  })
})
```

## 常见问题

### 箭头函数作为 Action

```javascript
// ❌ 错误：箭头函数没有自己的 this
actions: {
  increment: () => {
    this.count++  // this 是 undefined 或 window
  }
}

// ✅ 正确：使用普通函数
actions: {
  increment() {
    this.count++
  }
}
```

### Action 中访问 Pinia 实例

```javascript
actions: {
  accessPinia() {
    // 通过 Store 的内部属性访问
    const pinia = this._p  // 不推荐，内部 API
    
    // 推荐：使用注入
    const pinia = inject(piniaSymbol)
  }
}
```

### 同一 Action 被多次调用

```javascript
actions: {
  async fetchData() {
    // 防止重复请求
    if (this.loading) return
    
    this.loading = true
    try {
      this.data = await api.getData()
    } finally {
      this.loading = false
    }
  }
}
```

## 本章小结

本章实现了 Actions 的核心功能：

- **this 绑定**：确保 action 中 this 指向 Store
- **方法包装**：支持订阅和错误处理
- **$onAction 订阅**：监听 action 执行的完整生命周期
- **返回值处理**：正确传递同步和异步返回值
- **TypeScript 支持**：通过 ThisType 实现类型安全

下一章，我们将深入异步 Action 和错误处理机制。
