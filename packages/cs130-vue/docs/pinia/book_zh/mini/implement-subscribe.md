# 实现 $subscribe

`$subscribe` 允许订阅 State 变化。这一章实现订阅机制。

## $subscribe 特性

- 监听 state 变化
- 提供变化的详细信息
- 返回取消订阅函数
- 可选的 detached 模式

## 基本用法

```typescript
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('State changed:', mutation.type)
  console.log('Store ID:', mutation.storeId)
  console.log('New state:', state)
})

// 取消订阅
unsubscribe()
```

## Mutation 类型

```typescript
interface SubscriptionCallbackMutation {
  type: 'direct' | 'patch object' | 'patch function'
  storeId: string
  payload?: any  // $patch 的参数
}
```

## 实现原理

使用 Vue 的 watch 监听 state 变化：

```typescript
import { watch } from 'vue'

function $subscribe(callback, options = {}) {
  const stopWatch = watch(
    () => pinia.state.value[$id],
    (state) => {
      callback(
        { type: 'direct', storeId: $id },
        state
      )
    },
    { deep: true, ...options }
  )
  
  return stopWatch
}
```

## 完整实现

```typescript
// src/subscribe.ts
import { watch, WatchOptions } from 'vue'
import type { StateTree } from './types'

export type MutationType = 'direct' | 'patch object' | 'patch function'

export interface SubscriptionCallbackMutation {
  type: MutationType
  storeId: string
  payload?: any
}

export type SubscriptionCallback<S = StateTree> = (
  mutation: SubscriptionCallbackMutation,
  state: S
) => void

export interface SubscriptionOptions {
  detached?: boolean
  flush?: 'pre' | 'post' | 'sync'
  immediate?: boolean
}

/**
 * 创建 $subscribe 方法
 */
export function createSubscribe<S extends StateTree>(
  $id: string,
  getState: () => S,
  subscriptions: Set<SubscriptionCallback<S>>
) {
  return function $subscribe(
    callback: SubscriptionCallback<S>,
    options: SubscriptionOptions = {}
  ): () => void {
    // 添加到订阅列表
    subscriptions.add(callback)
    
    // 创建 watch
    const stopWatch = watch(
      getState,
      (state) => {
        callback(
          {
            type: 'direct',
            storeId: $id
          },
          state
        )
      },
      {
        deep: true,
        flush: options.flush || 'sync',
        immediate: options.immediate
      }
    )
    
    // 返回取消函数
    const unsubscribe = () => {
      stopWatch()
      subscriptions.delete(callback)
    }
    
    return unsubscribe
  }
}

/**
 * 触发订阅回调
 */
export function triggerSubscriptions<S extends StateTree>(
  subscriptions: Set<SubscriptionCallback<S>>,
  mutation: SubscriptionCallbackMutation,
  state: S
): void {
  subscriptions.forEach((callback) => {
    callback(mutation, state)
  })
}
```

## 与 $patch 集成

$patch 需要手动触发订阅，提供正确的 mutation 类型：

```typescript
function createPatchWithSubscription(
  $id: string,
  getState: () => StateTree,
  subscriptions: Set<SubscriptionCallback>
) {
  return function $patch(
    partialStateOrMutator: Partial<StateTree> | ((state: StateTree) => void)
  ): void {
    const state = getState()
    const type = typeof partialStateOrMutator === 'function'
      ? 'patch function'
      : 'patch object'
    
    // 执行更新
    if (typeof partialStateOrMutator === 'function') {
      partialStateOrMutator(state)
    } else {
      mergeReactiveObjects(state, partialStateOrMutator)
    }
    
    // 触发订阅
    triggerSubscriptions(subscriptions, {
      type,
      storeId: $id,
      payload: partialStateOrMutator
    }, state)
  }
}
```

## Detached 模式

默认情况下，组件卸载时订阅自动清理。detached 模式保持订阅：

```typescript
// 组件卸载后仍然生效
store.$subscribe(callback, { detached: true })
```

实现：

```typescript
import { getCurrentScope, onScopeDispose } from 'vue'

function $subscribe(callback, options = {}) {
  // ...
  
  // 非 detached 模式，组件卸载时自动清理
  if (!options.detached && getCurrentScope()) {
    onScopeDispose(unsubscribe)
  }
  
  return unsubscribe
}
```

## Flush 时机

控制回调执行时机：

```typescript
// 同步执行（默认）
store.$subscribe(callback, { flush: 'sync' })

// DOM 更新前
store.$subscribe(callback, { flush: 'pre' })

// DOM 更新后
store.$subscribe(callback, { flush: 'post' })
```

## 集成到 Store

```typescript
function createOptionsStore(id, options, pinia) {
  // 订阅集合
  const subscriptions = new Set<SubscriptionCallback>()
  
  // ... 创建 state、getters、actions
  
  // 创建 $subscribe
  store.$subscribe = createSubscribe(
    id,
    () => pinia.state.value[id],
    subscriptions
  )
  
  // 创建带订阅的 $patch
  store.$patch = createPatchWithSubscription(
    id,
    () => pinia.state.value[id],
    subscriptions
  )
  
  // ...
}
```

## 测试

```typescript
// tests/subscribe.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'
import { nextTick } from 'vue'

describe('$subscribe', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should trigger on state change', async () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$subscribe(callback)
    
    store.count++
    await nextTick()
    
    expect(callback).toHaveBeenCalled()
    expect(callback.mock.calls[0][0].storeId).toBe('test')
  })
  
  it('should provide mutation type', async () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$subscribe(callback)
    
    // 直接修改
    store.count++
    await nextTick()
    expect(callback.mock.calls[0][0].type).toBe('direct')
    
    // $patch 对象模式
    store.$patch({ count: 10 })
    expect(callback.mock.calls[1][0].type).toBe('patch object')
    
    // $patch 函数模式
    store.$patch((s) => { s.count++ })
    expect(callback.mock.calls[2][0].type).toBe('patch function')
  })
  
  it('should unsubscribe', async () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const unsubscribe = store.$subscribe(callback)
    
    store.count++
    await nextTick()
    expect(callback).toHaveBeenCalledTimes(1)
    
    unsubscribe()
    
    store.count++
    await nextTick()
    expect(callback).toHaveBeenCalledTimes(1)
  })
  
  it('should provide current state', async () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    let receivedState: any
    store.$subscribe((mutation, state) => {
      receivedState = state
    })
    
    store.count = 42
    await nextTick()
    
    expect(receivedState.count).toBe(42)
  })
  
  it('should support immediate option', () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    store.$subscribe(callback, { immediate: true })
    
    // 立即触发一次
    expect(callback).toHaveBeenCalledTimes(1)
  })
  
  it('should detect nested changes', async () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({
        user: { name: 'John' }
      })
    })
    
    const store = useStore()
    store.$subscribe(callback)
    
    store.user.name = 'Jane'
    await nextTick()
    
    expect(callback).toHaveBeenCalled()
  })
})
```

## 实际应用场景

### 1. 状态持久化

```typescript
store.$subscribe((mutation, state) => {
  localStorage.setItem('store', JSON.stringify(state))
}, { detached: true })
```

### 2. 日志记录

```typescript
store.$subscribe((mutation, state) => {
  console.log(`[${mutation.storeId}] ${mutation.type}`, state)
})
```

### 3. 同步到后端

```typescript
store.$subscribe(
  debounce((mutation, state) => {
    api.saveState(state)
  }, 1000),
  { flush: 'post' }
)
```

下一章我们实现 `$onAction` 方法。
