---
sidebar_position: 47
title: after 与 onError 回调处理
---

# after 与 onError 回调处理

$onAction 的 after 和 onError 回调是处理 Action 结果的关键机制。本章深入探讨它们的实现细节和使用模式。

## 回调执行时机

```
Action 调用
    │
    ▼
┌─────────────────┐
│ $onAction 触发  │  ← 订阅回调执行
│ (注册 after/    │
│  onError)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Action 执行     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
成功 ▼         ▼ 失败
┌────────┐  ┌──────────┐
│ after  │  │ onError  │
│ 回调   │  │ 回调     │
└────────┘  └──────────┘
```

## after 回调

### 基本使用

```javascript
store.$onAction(({ name, after }) => {
  after((result) => {
    console.log(`${name} returned:`, result)
  })
})
```

### 多个 after 回调

```javascript
store.$onAction(({ after }) => {
  // 可以注册多个 after 回调
  after((result) => console.log('First callback'))
  after((result) => console.log('Second callback'))
})

// 两个回调都会执行
```

### after 的执行顺序

```javascript
store.$onAction(({ after }) => {
  after(() => console.log('1'))
})

store.$onAction(({ after }) => {
  after(() => console.log('2'))
})

store.someAction()
// 输出：1, 2（按注册顺序）
```

## onError 回调

### 捕获同步错误

```javascript
store.$onAction(({ name, onError }) => {
  onError((error) => {
    console.error(`${name} failed:`, error.message)
  })
})

// Action 抛出错误
store.failingAction()  // 触发 onError
```

### 捕获异步错误

```javascript
const store = defineStore('api', {
  actions: {
    async fetchData() {
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error('Fetch failed')
      }
      return response.json()
    }
  }
})()

store.$onAction(({ onError }) => {
  onError((error) => {
    // 异步错误也会被捕获
    console.error('Async error:', error)
  })
})
```

### onError 不阻止错误传播

```javascript
store.$onAction(({ onError }) => {
  onError((error) => {
    console.error('Logged error')
    // 错误仍会向上传播
  })
})

try {
  store.failingAction()
} catch (error) {
  // 仍然会进入这里
  console.log('Caught in try-catch')
}
```

## 实现细节

### 回调收集器

```javascript
function wrapAction(store, name, action) {
  return function(...args) {
    // 创建回调收集器
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 传递给订阅者的 after/onError 函数
    const addAfter = (callback) => afterCallbacks.push(callback)
    const addOnError = (callback) => errorCallbacks.push(callback)
    
    // 触发订阅
    triggerSubscriptions({
      name,
      store,
      args,
      after: addAfter,
      onError: addOnError
    })
    
    // 执行 Action 并处理结果
    // ...
  }
}
```

### 处理同步 Action

```javascript
function wrapAction(store, name, action) {
  return function(...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // ... 触发订阅 ...
    
    let result
    
    try {
      result = action.apply(store, args)
    } catch (error) {
      // 同步错误：执行 onError 回调
      errorCallbacks.forEach(cb => {
        try {
          cb(error)
        } catch (e) {
          console.error('Error in onError callback:', e)
        }
      })
      throw error  // 重新抛出
    }
    
    // 非 Promise：直接执行 after
    if (!(result instanceof Promise)) {
      afterCallbacks.forEach(cb => {
        try {
          cb(result)
        } catch (e) {
          console.error('Error in after callback:', e)
        }
      })
      return result
    }
    
    // 处理 Promise...
  }
}
```

### 处理异步 Action

```javascript
function wrapAction(store, name, action) {
  return function(...args) {
    // ... 前面的代码 ...
    
    if (result instanceof Promise) {
      return result
        .then((value) => {
          // Promise 成功：执行 after
          afterCallbacks.forEach(cb => {
            try {
              cb(value)
            } catch (e) {
              console.error('Error in after callback:', e)
            }
          })
          return value
        })
        .catch((error) => {
          // Promise 失败：执行 onError
          errorCallbacks.forEach(cb => {
            try {
              cb(error)
            } catch (e) {
              console.error('Error in onError callback:', e)
            }
          })
          throw error  // 重新抛出
        })
    }
  }
}
```

## 回调中的错误处理

回调本身也可能抛出错误：

```javascript
store.$onAction(({ after }) => {
  after(() => {
    throw new Error('Callback error')  // 回调中的错误
  })
})
```

实现中需要保护：

```javascript
afterCallbacks.forEach(cb => {
  try {
    cb(result)
  } catch (e) {
    // 捕获回调错误，不影响其他回调
    console.error('Error in after callback:', e)
  }
})
```

## 应用模式

### 自动重试

```javascript
store.$onAction(({ name, store, args, onError }) => {
  let retries = 0
  const maxRetries = 3
  
  onError(async (error) => {
    if (retries < maxRetries && isRetryable(error)) {
      retries++
      console.log(`Retrying ${name}, attempt ${retries}`)
      
      // 重新调用 Action
      await store[name](...args)
    }
  })
})
```

### 成功通知

```javascript
store.$onAction(({ name, after }) => {
  after((result) => {
    if (name.startsWith('save') || name.startsWith('create')) {
      toast.success('保存成功')
    }
  })
})
```

### 错误上报

```javascript
store.$onAction(({ name, store, args, onError }) => {
  onError((error) => {
    errorReporter.capture(error, {
      action: name,
      store: store.$id,
      args: sanitizeArgs(args),
      state: JSON.stringify(store.$state)
    })
  })
}, true)  // detached: 始终监听
```

### 性能追踪

```javascript
store.$onAction(({ name, after, onError }) => {
  const start = performance.now()
  
  const recordMetric = (success) => {
    const duration = performance.now() - start
    analytics.track('action_performance', {
      action: name,
      duration,
      success
    })
  }
  
  after(() => recordMetric(true))
  onError(() => recordMetric(false))
})
```

## 测试用例

```javascript
describe('after and onError callbacks', () => {
  describe('after callback', () => {
    test('receives action result', () => {
      const useStore = defineStore('test', {
        actions: {
          getValue() {
            return 42
          }
        }
      })
      
      const store = useStore()
      let capturedResult
      
      store.$onAction(({ after }) => {
        after((result) => {
          capturedResult = result
        })
      })
      
      store.getValue()
      
      expect(capturedResult).toBe(42)
    })
    
    test('handles async result', async () => {
      const useStore = defineStore('test', {
        actions: {
          async asyncValue() {
            return 'async'
          }
        }
      })
      
      const store = useStore()
      let capturedResult
      
      store.$onAction(({ after }) => {
        after((result) => {
          capturedResult = result
        })
      })
      
      await store.asyncValue()
      
      expect(capturedResult).toBe('async')
    })
    
    test('multiple after callbacks all execute', () => {
      const useStore = defineStore('test', {
        actions: {
          action() { return 'result' }
        }
      })
      
      const store = useStore()
      const results = []
      
      store.$onAction(({ after }) => {
        after(() => results.push(1))
        after(() => results.push(2))
      })
      
      store.action()
      
      expect(results).toEqual([1, 2])
    })
  })
  
  describe('onError callback', () => {
    test('receives sync error', () => {
      const useStore = defineStore('test', {
        actions: {
          fail() {
            throw new Error('sync error')
          }
        }
      })
      
      const store = useStore()
      let capturedError
      
      store.$onAction(({ onError }) => {
        onError((error) => {
          capturedError = error
        })
      })
      
      expect(() => store.fail()).toThrow()
      expect(capturedError.message).toBe('sync error')
    })
    
    test('receives async error', async () => {
      const useStore = defineStore('test', {
        actions: {
          async asyncFail() {
            throw new Error('async error')
          }
        }
      })
      
      const store = useStore()
      let capturedError
      
      store.$onAction(({ onError }) => {
        onError((error) => {
          capturedError = error
        })
      })
      
      await expect(store.asyncFail()).rejects.toThrow()
      expect(capturedError.message).toBe('async error')
    })
    
    test('error still propagates', () => {
      const useStore = defineStore('test', {
        actions: {
          fail() {
            throw new Error('test')
          }
        }
      })
      
      const store = useStore()
      
      store.$onAction(({ onError }) => {
        onError(() => {
          // 只是记录，不阻止传播
        })
      })
      
      expect(() => store.fail()).toThrow('test')
    })
  })
  
  describe('callback errors', () => {
    test('callback error does not stop other callbacks', () => {
      const useStore = defineStore('test', {
        actions: {
          action() { return 'result' }
        }
      })
      
      const store = useStore()
      const results = []
      
      store.$onAction(({ after }) => {
        after(() => results.push(1))
        after(() => { throw new Error('callback error') })
        after(() => results.push(3))
      })
      
      store.action()
      
      expect(results).toEqual([1, 3])  // 2 的回调失败不影响 3
    })
  })
})
```

## 本章小结

本章深入了 after 与 onError：

- **执行时机**：after 在成功后，onError 在失败后
- **多回调支持**：可注册多个回调，按顺序执行
- **异步处理**：正确处理 Promise 的成功和失败
- **错误隔离**：回调中的错误不影响其他回调
- **错误传播**：onError 不阻止错误向上传播

下一章实现 mergeReactiveObjects 工具函数。
