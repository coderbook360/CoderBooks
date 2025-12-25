---
sidebar_position: 46
title: $onAction 实现：Action 生命周期
---

# $onAction 实现：Action 生命周期

`$onAction` 允许监听 Action 的调用，包括执行前、成功后和失败后的回调。本章详细实现这个功能。

## $onAction 基本用法

```javascript
const store = useCounterStore()

store.$onAction(({ name, store, args, after, onError }) => {
  console.log(`Action "${name}" called with:`, args)
  
  after((result) => {
    console.log(`Action "${name}" succeeded with:`, result)
  })
  
  onError((error) => {
    console.error(`Action "${name}" failed:`, error)
  })
})
```

## Action Context 结构

```typescript
interface ActionContext {
  name: string           // Action 名称
  store: Store           // Store 实例
  args: unknown[]        // 调用参数
  after: (callback: (result: unknown) => void) => void
  onError: (callback: (error: unknown) => void) => void
}
```

## 核心实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const actionSubscriptions = []
  
  function $onAction(callback, detached = false) {
    const subscription = { callback, detached }
    actionSubscriptions.push(subscription)
    
    // 生命周期管理
    const currentScope = getCurrentScope()
    const removeSubscription = () => {
      const index = actionSubscriptions.indexOf(subscription)
      if (index > -1) {
        actionSubscriptions.splice(index, 1)
      }
    }
    
    if (!detached && currentScope) {
      onScopeDispose(removeSubscription)
    }
    
    return removeSubscription
  }
  
  return { $onAction }
}
```

## Action 包装

每个 Action 需要被包装以支持订阅：

```javascript
function wrapAction(store, actionName, action) {
  return function wrappedAction(...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 触发 $onAction 订阅
    triggerActionSubscribers(store, actionName, args, (cb) => {
      afterCallbacks.push(cb)
    }, (cb) => {
      errorCallbacks.push(cb)
    })
    
    let result
    
    try {
      // 执行原始 Action
      result = action.apply(store, args)
    } catch (error) {
      // 同步错误
      errorCallbacks.forEach(cb => cb(error))
      throw error
    }
    
    // 处理 Promise
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
    
    // 同步成功
    afterCallbacks.forEach(cb => cb(result))
    return result
  }
}

function triggerActionSubscribers(store, name, args, addAfter, addError) {
  const context = {
    name,
    store,
    args,
    after: addAfter,
    onError: addError
  }
  
  store._actionSubscriptions.slice().forEach(({ callback }) => {
    callback(context)
  })
}
```

## 同步 vs 异步 Action

### 同步 Action

```javascript
const store = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
      return this.count
    }
  }
})()

store.$onAction(({ name, after, onError }) => {
  console.log(`Starting ${name}`)
  
  after((result) => {
    console.log(`${name} returned:`, result)
  })
})

store.increment()
// 输出：
// Starting increment
// increment returned: 1
```

### 异步 Action

```javascript
const store = defineStore('user', {
  state: () => ({ user: null }),
  actions: {
    async fetchUser(id) {
      const response = await fetch(`/api/users/${id}`)
      this.user = await response.json()
      return this.user
    }
  }
})()

store.$onAction(({ name, after, onError }) => {
  const startTime = Date.now()
  
  after((result) => {
    console.log(`${name} took ${Date.now() - startTime}ms`)
  })
  
  onError((error) => {
    console.error(`${name} failed after ${Date.now() - startTime}ms`)
  })
})

await store.fetchUser(1)
```

## 错误处理

```javascript
const store = defineStore('api', {
  actions: {
    async riskyOperation() {
      if (Math.random() > 0.5) {
        throw new Error('Random failure')
      }
      return 'success'
    }
  }
})()

store.$onAction(({ name, after, onError }) => {
  onError((error) => {
    // 记录错误
    errorLogger.log({
      action: name,
      error: error.message,
      timestamp: Date.now()
    })
    
    // 可以发送到监控服务
    monitoring.reportError(error)
  })
})
```

## 取消订阅

```javascript
const unsubscribe = store.$onAction(({ name }) => {
  console.log(`Action: ${name}`)
})

// 取消订阅
unsubscribe()

store.increment()  // 不再触发回调
```

## detached 参数

```javascript
// 在组件中
export default {
  setup() {
    const store = useStore()
    
    // 默认：随组件销毁
    store.$onAction(callback)
    
    // detached: true - 独立于组件生命周期
    store.$onAction(callback, true)
  }
}
```

## 完整实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  const actionSubscriptions = []
  
  // $onAction 实现
  function $onAction(callback, detached = false) {
    const subscription = { callback, detached }
    actionSubscriptions.push(subscription)
    
    const removeSubscription = () => {
      const index = actionSubscriptions.indexOf(subscription)
      if (index > -1) {
        actionSubscriptions.splice(index, 1)
      }
    }
    
    const currentScope = getCurrentScope()
    if (!detached && currentScope) {
      onScopeDispose(removeSubscription)
    }
    
    return removeSubscription
  }
  
  // 包装 Action
  function wrapAction(name, action) {
    return function(...args) {
      const afterCallbacks = []
      const errorCallbacks = []
      
      // 通知订阅者
      actionSubscriptions.slice().forEach(({ callback }) => {
        callback({
          name,
          store,
          args: args.slice(),
          after: (cb) => afterCallbacks.push(cb),
          onError: (cb) => errorCallbacks.push(cb)
        })
      })
      
      let result
      
      try {
        result = action.apply(store, args)
      } catch (error) {
        errorCallbacks.forEach(cb => cb(error))
        throw error
      }
      
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
  
  // 处理 setup 结果中的函数
  const setupResult = scope.run(() => setup())
  
  for (const key in setupResult) {
    const value = setupResult[key]
    if (typeof value === 'function') {
      // 包装为可监听的 Action
      store[key] = wrapAction(key, value)
    }
  }
  
  Object.defineProperty(store, '$onAction', {
    value: $onAction,
    enumerable: false
  })
  
  // 内部存储订阅列表
  store._actionSubscriptions = actionSubscriptions
  
  return store
}
```

## 实际应用

### 性能监控

```javascript
store.$onAction(({ name, args, after, onError }) => {
  const start = performance.now()
  
  after(() => {
    const duration = performance.now() - start
    metrics.record('action_duration', {
      name,
      duration,
      success: true
    })
  })
  
  onError(() => {
    const duration = performance.now() - start
    metrics.record('action_duration', {
      name,
      duration,
      success: false
    })
  })
}, true)
```

### 操作日志

```javascript
store.$onAction(({ name, store, args, after }) => {
  const entry = {
    timestamp: new Date().toISOString(),
    store: store.$id,
    action: name,
    args: JSON.stringify(args)
  }
  
  after((result) => {
    entry.result = JSON.stringify(result)
    auditLog.push(entry)
  })
}, true)
```

## 测试用例

```javascript
describe('$onAction', () => {
  test('calls callback when action is invoked', () => {
    const useStore = defineStore('test', {
      actions: {
        testAction() {
          return 'result'
        }
      }
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$onAction(callback)
    store.testAction()
    
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'testAction',
        args: []
      })
    )
  })
  
  test('after callback receives result', () => {
    const useStore = defineStore('test', {
      actions: {
        getValue() {
          return 42
        }
      }
    })
    
    const store = useStore()
    let result
    
    store.$onAction(({ after }) => {
      after((r) => { result = r })
    })
    
    store.getValue()
    
    expect(result).toBe(42)
  })
  
  test('onError callback receives error', () => {
    const useStore = defineStore('test', {
      actions: {
        failingAction() {
          throw new Error('Test error')
        }
      }
    })
    
    const store = useStore()
    let caughtError
    
    store.$onAction(({ onError }) => {
      onError((e) => { caughtError = e })
    })
    
    expect(() => store.failingAction()).toThrow()
    expect(caughtError.message).toBe('Test error')
  })
  
  test('works with async actions', async () => {
    const useStore = defineStore('test', {
      actions: {
        async asyncAction() {
          return 'async result'
        }
      }
    })
    
    const store = useStore()
    let result
    
    store.$onAction(({ after }) => {
      after((r) => { result = r })
    })
    
    await store.asyncAction()
    
    expect(result).toBe('async result')
  })
  
  test('unsubscribe stops callbacks', () => {
    const useStore = defineStore('test', {
      actions: {
        testAction() {}
      }
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    const unsubscribe = store.$onAction(callback)
    unsubscribe()
    
    store.testAction()
    
    expect(callback).not.toHaveBeenCalled()
  })
})
```

## 本章小结

本章实现了 $onAction：

- **核心功能**：监听 Action 调用的生命周期
- **Context 对象**：name、store、args、after、onError
- **异步支持**：正确处理 Promise
- **错误处理**：onError 回调捕获异常
- **生命周期**：支持 detached 选项

下一章深入 after 与 onError 回调。
