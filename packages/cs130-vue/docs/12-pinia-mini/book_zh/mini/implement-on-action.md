# 实现 $onAction

`$onAction` 允许订阅 Action 调用。这一章实现 Action 监听机制。

## $onAction 特性

- 在 action 调用前后执行回调
- 提供 action 名称、参数等信息
- 可以监听 action 完成或错误
- 返回取消订阅函数

## 基本用法

```typescript
const unsubscribe = store.$onAction(({
  name,      // action 名称
  store,     // store 实例
  args,      // 调用参数
  after,     // 成功后回调
  onError    // 错误时回调
}) => {
  console.log(`Action ${name} called with:`, args)
  
  after((result) => {
    console.log(`Action ${name} finished with:`, result)
  })
  
  onError((error) => {
    console.error(`Action ${name} failed:`, error)
  })
})
```

## 回调参数类型

```typescript
interface ActionContext<S, A> {
  name: string
  store: Store<S, A>
  args: any[]
  after: (callback: (result: any) => void) => void
  onError: (callback: (error: Error) => void) => void
}

type OnActionCallback<S, A> = (context: ActionContext<S, A>) => void
```

## 实现原理

包装每个 action，在调用前后触发订阅：

```typescript
function wrapAction(name, action, store, actionSubscriptions) {
  return function (...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 触发订阅
    triggerActionSubscriptions(actionSubscriptions, {
      name,
      store,
      args,
      after: (cb) => afterCallbacks.push(cb),
      onError: (cb) => errorCallbacks.push(cb)
    })
    
    let result
    try {
      result = action.apply(store, args)
    } catch (error) {
      errorCallbacks.forEach(cb => cb(error))
      throw error
    }
    
    // 处理异步 action
    if (result instanceof Promise) {
      return result
        .then((value) => {
          afterCallbacks.forEach(cb => cb(value))
          return value
        })
        .catch((error) => {
          errorCallbacks.forEach(cb => cb(error))
          throw error
        })
    }
    
    afterCallbacks.forEach(cb => cb(result))
    return result
  }
}
```

## 完整实现

```typescript
// src/onAction.ts
import type { Store } from './types'

export interface ActionContext {
  name: string
  store: Store
  args: any[]
  after: (callback: (result: any) => void) => void
  onError: (callback: (error: unknown) => void) => void
}

export type OnActionCallback = (context: ActionContext) => void

/**
 * 包装 Action 以支持订阅
 */
export function wrapAction(
  name: string,
  action: Function,
  store: Store,
  actionSubscriptions: Set<OnActionCallback>
): Function {
  return function (this: Store, ...args: any[]) {
    const afterCallbacks: Array<(result: any) => void> = []
    const errorCallbacks: Array<(error: unknown) => void> = []
    
    // 触发所有订阅
    actionSubscriptions.forEach((callback) => {
      callback({
        name,
        store,
        args,
        after: (cb) => afterCallbacks.push(cb),
        onError: (cb) => errorCallbacks.push(cb)
      })
    })
    
    let result: any
    
    try {
      result = action.apply(store, args)
    } catch (error) {
      // 同步错误
      errorCallbacks.forEach((cb) => cb(error))
      throw error
    }
    
    // 处理 Promise
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
    
    // 同步成功
    afterCallbacks.forEach((cb) => cb(result))
    return result
  }
}

/**
 * 创建 $onAction 方法
 */
export function createOnAction(
  actionSubscriptions: Set<OnActionCallback>
) {
  return function $onAction(
    callback: OnActionCallback,
    detached = false
  ): () => void {
    actionSubscriptions.add(callback)
    
    const unsubscribe = () => {
      actionSubscriptions.delete(callback)
    }
    
    // 非 detached 模式自动清理
    if (!detached && getCurrentScope()) {
      onScopeDispose(unsubscribe)
    }
    
    return unsubscribe
  }
}

import { getCurrentScope, onScopeDispose } from 'vue'
```

## 集成到 Actions 创建

修改 createActions 使用包装后的 action：

```typescript
export function createActions(
  actions: Record<string, Function>,
  store: Store,
  actionSubscriptions: Set<OnActionCallback>
): Record<string, Function> {
  const wrappedActions: Record<string, Function> = {}
  
  for (const name in actions) {
    const action = actions[name]
    
    // 使用 wrapAction 包装
    wrappedActions[name] = wrapAction(
      name,
      action,
      store,
      actionSubscriptions
    )
  }
  
  return wrappedActions
}
```

## 集成到 Store

```typescript
function createOptionsStore(id, options, pinia) {
  // Action 订阅集合
  const actionSubscriptions = new Set<OnActionCallback>()
  
  // ... 创建 state、getters
  
  // 创建带订阅支持的 actions
  if (actions) {
    const wrappedActions = createActions(actions, store, actionSubscriptions)
    proxyActionsToStore(store, wrappedActions)
  }
  
  // 创建 $onAction
  store.$onAction = createOnAction(actionSubscriptions)
  
  // ...
}
```

## 测试

```typescript
// tests/onAction.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from '../src/createPinia'
import { defineStore } from '../src/defineStore'

describe('$onAction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should trigger before action', () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        increment() {
          this.count++
        }
      }
    })
    
    const store = useStore()
    store.$onAction(callback)
    store.increment()
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'increment',
        store,
        args: []
      })
    )
  })
  
  it('should provide action arguments', () => {
    let receivedArgs: any[]
    
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: {
        add(a: number, b: number) {
          this.count += a + b
        }
      }
    })
    
    const store = useStore()
    store.$onAction(({ args }) => {
      receivedArgs = args
    })
    
    store.add(1, 2)
    
    expect(receivedArgs!).toEqual([1, 2])
  })
  
  it('should call after callback on success', () => {
    const afterCallback = vi.fn()
    
    const useStore = defineStore('test', {
      actions: {
        getValue() {
          return 42
        }
      }
    })
    
    const store = useStore()
    store.$onAction(({ after }) => {
      after(afterCallback)
    })
    
    store.getValue()
    
    expect(afterCallback).toHaveBeenCalledWith(42)
  })
  
  it('should call onError callback on failure', () => {
    const errorCallback = vi.fn()
    const error = new Error('test error')
    
    const useStore = defineStore('test', {
      actions: {
        fail() {
          throw error
        }
      }
    })
    
    const store = useStore()
    store.$onAction(({ onError }) => {
      onError(errorCallback)
    })
    
    expect(() => store.fail()).toThrow('test error')
    expect(errorCallback).toHaveBeenCalledWith(error)
  })
  
  it('should handle async actions', async () => {
    const afterCallback = vi.fn()
    
    const useStore = defineStore('test', {
      actions: {
        async asyncAction() {
          await new Promise(r => setTimeout(r, 10))
          return 'done'
        }
      }
    })
    
    const store = useStore()
    store.$onAction(({ after }) => {
      after(afterCallback)
    })
    
    await store.asyncAction()
    
    expect(afterCallback).toHaveBeenCalledWith('done')
  })
  
  it('should handle async action errors', async () => {
    const errorCallback = vi.fn()
    
    const useStore = defineStore('test', {
      actions: {
        async asyncFail() {
          await new Promise(r => setTimeout(r, 10))
          throw new Error('async error')
        }
      }
    })
    
    const store = useStore()
    store.$onAction(({ onError }) => {
      onError(errorCallback)
    })
    
    await expect(store.asyncFail()).rejects.toThrow('async error')
    expect(errorCallback).toHaveBeenCalled()
  })
  
  it('should unsubscribe', () => {
    const callback = vi.fn()
    
    const useStore = defineStore('test', {
      actions: {
        doSomething() {}
      }
    })
    
    const store = useStore()
    const unsubscribe = store.$onAction(callback)
    
    store.doSomething()
    expect(callback).toHaveBeenCalledTimes(1)
    
    unsubscribe()
    
    store.doSomething()
    expect(callback).toHaveBeenCalledTimes(1)
  })
  
  it('should support multiple subscribers', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    
    const useStore = defineStore('test', {
      actions: {
        doSomething() {}
      }
    })
    
    const store = useStore()
    store.$onAction(callback1)
    store.$onAction(callback2)
    
    store.doSomething()
    
    expect(callback1).toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })
})
```

## 实际应用场景

### 1. 日志记录

```typescript
store.$onAction(({ name, args, after, onError }) => {
  const startTime = Date.now()
  
  console.log(`[${name}] called with:`, args)
  
  after((result) => {
    console.log(`[${name}] finished in ${Date.now() - startTime}ms`)
  })
  
  onError((error) => {
    console.error(`[${name}] failed:`, error)
  })
})
```

### 2. 性能监控

```typescript
store.$onAction(({ name, after }) => {
  const start = performance.now()
  
  after(() => {
    const duration = performance.now() - start
    if (duration > 100) {
      console.warn(`Slow action: ${name} took ${duration}ms`)
    }
  })
})
```

### 3. 错误上报

```typescript
store.$onAction(({ name, onError }) => {
  onError((error) => {
    errorReportingService.report({
      action: name,
      error,
      timestamp: Date.now()
    })
  })
}, true)  // detached: true
```

下一章我们实现 `storeToRefs` 辅助函数。
