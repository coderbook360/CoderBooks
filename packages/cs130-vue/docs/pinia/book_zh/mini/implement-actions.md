# 实现 Actions

Actions 是 Store 中处理业务逻辑的方法。这一章实现 Actions 机制。

## Actions 特性

- 可以是同步或异步
- 通过 this 访问 State 和 Getters
- 可以调用其他 Actions
- 可以访问其他 Store

## Options Store Actions

```typescript
actions: {
  increment() {
    this.count++
  },
  
  async fetchData() {
    const data = await api.getData()
    this.data = data
  }
}
```

## 实现原理

将 action 的 this 绑定到 store：

```typescript
function createActions(
  actions: Record<string, Function>,
  store: Store
) {
  const boundActions: Record<string, Function> = {}
  
  for (const key in actions) {
    const action = actions[key]
    
    // 绑定 this 为 store
    boundActions[key] = function (...args: any[]) {
      return action.apply(store, args)
    }
  }
  
  return boundActions
}
```

## 代理到 Store

```typescript
function proxyActionsToStore(
  store: Store,
  actions: Record<string, Function>
) {
  for (const key in actions) {
    store[key] = actions[key]
  }
}
```

## 完整实现

```typescript
// src/actions.ts
import type { Store } from './types'

/**
 * 创建 Actions
 * 将 action 的 this 绑定到 store
 */
export function createActions<A extends Record<string, Function>>(
  actions: A,
  store: Store
): A {
  const boundActions: Record<string, Function> = {}
  
  for (const key in actions) {
    const action = actions[key]
    
    boundActions[key] = function (this: Store, ...args: any[]) {
      // 使用 apply 绑定 this 并传递参数
      return action.apply(store, args)
    }
  }
  
  return boundActions as A
}

/**
 * 将 Actions 代理到 Store
 */
export function proxyActionsToStore(
  store: Store,
  actions: Record<string, Function>
): void {
  for (const key in actions) {
    // 直接赋值到 store
    ;(store as any)[key] = actions[key]
  }
}
```

## 异步 Action

Actions 天然支持异步：

```typescript
actions: {
  async fetchUser(id: number) {
    try {
      this.loading = true
      this.user = await api.getUser(id)
    } catch (error) {
      this.error = error
    } finally {
      this.loading = false
    }
  }
}
```

绑定后的 action 会正确返回 Promise：

```typescript
const action = actions.fetchUser

boundActions.fetchUser = function (...args) {
  // action.apply 返回 Promise，直接返回即可
  return action.apply(store, args)
}

// 使用
await store.fetchUser(1)
```

## 调用其他 Actions

通过 this 调用：

```typescript
actions: {
  increment() {
    this.count++
  },
  
  incrementTwice() {
    this.increment()
    this.increment()
  }
}
```

因为 this 绑定到 store，store 上已经有 increment，所以可以直接调用。

## 访问其他 Store

在 action 内部调用 useStore：

```typescript
actions: {
  async checkout() {
    const cart = useCartStore()
    const user = useUserStore()
    
    if (!user.isLoggedIn) {
      throw new Error('Please login first')
    }
    
    await api.checkout(cart.items)
    cart.$reset()
  }
}
```

## Setup Store Actions

Setup Store 中直接定义函数：

```typescript
defineStore('counter', () => {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  async function fetchData() {
    const data = await api.getData()
    // 处理数据
  }
  
  return { count, increment, fetchData }
})
```

处理：

```typescript
if (typeof value === 'function') {
  // 函数作为 action
  store[key] = value
}
```

## 集成到 createOptionsStore

```typescript
function createOptionsStore(id, options, pinia) {
  const { state: stateFn, getters, actions } = options
  
  const state = reactive(stateFn ? stateFn() : {})
  const store = reactive({ $id: id }) as Store
  
  // 代理 State
  proxyStateToStore(store, state)
  
  // 创建并代理 Getters
  if (getters) {
    const computedGetters = createGetters(getters, state, store)
    proxyGettersToStore(store, computedGetters)
  }
  
  // 创建并代理 Actions
  if (actions) {
    const boundActions = createActions(actions, store)
    proxyActionsToStore(store, boundActions)
  }
  
  // ... 后续处理
}
```

## Action Context

有时需要在 action 中访问更多上下文：

```typescript
interface ActionContext<S, G, A> {
  store: Store<S, G, A>
  args: any[]
}

// 高级用法：action 可以接收 context
actions: {
  someAction(this: Store, ...args) {
    // this 就是 store
  }
}
```

## 测试

```typescript
// tests/actions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('Actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should mutate state', () => {
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
  
  it('should access state and getters', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 2 }),
      getters: {
        double: (state) => state.count * 2
      },
      actions: {
        setToDouble() {
          this.count = this.double
        }
      }
    })
    
    const store = useStore()
    store.setToDouble()
    expect(store.count).toBe(4)
  })
  
  it('should support async actions', async () => {
    const mockApi = vi.fn().mockResolvedValue('data')
    
    const useStore = defineStore('test', {
      state: () => ({ data: null as string | null }),
      actions: {
        async fetchData() {
          this.data = await mockApi()
        }
      }
    })
    
    const store = useStore()
    await store.fetchData()
    
    expect(mockApi).toHaveBeenCalled()
    expect(store.data).toBe('data')
  })
  
  it('should call other actions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        },
        incrementTwice() {
          this.increment()
          this.increment()
        }
      }
    })
    
    const store = useStore()
    store.incrementTwice()
    expect(store.count).toBe(2)
  })
  
  it('should receive arguments', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        add(amount: number) {
          this.count += amount
        }
      }
    })
    
    const store = useStore()
    store.add(5)
    expect(store.count).toBe(5)
  })
  
  it('should return value', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 10 }),
      actions: {
        getDouble() {
          return this.count * 2
        }
      }
    })
    
    const store = useStore()
    expect(store.getDouble()).toBe(20)
  })
  
  it('should access other stores', () => {
    const useStoreA = defineStore('a', {
      state: () => ({ value: 10 })
    })
    
    const useStoreB = defineStore('b', {
      state: () => ({ result: 0 }),
      actions: {
        compute() {
          const storeA = useStoreA()
          this.result = storeA.value * 2
        }
      }
    })
    
    const storeB = useStoreB()
    storeB.compute()
    expect(storeB.result).toBe(20)
  })
})
```

## 错误处理

Action 中的错误处理：

```typescript
actions: {
  async fetchData() {
    try {
      this.loading = true
      this.error = null
      this.data = await api.getData()
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Unknown error'
      throw e  // 可以选择重新抛出
    } finally {
      this.loading = false
    }
  }
}
```

调用时捕获：

```typescript
try {
  await store.fetchData()
} catch (e) {
  console.error('Action failed:', e)
}
```

下一章我们实现 `$patch` 方法。
