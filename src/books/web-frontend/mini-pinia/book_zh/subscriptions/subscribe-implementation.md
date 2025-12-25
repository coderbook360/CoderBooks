---
sidebar_position: 44
title: $subscribe 实现：状态变更监听
---

# $subscribe 实现：状态变更监听

`$subscribe` 是监听状态变化的核心 API。本章详细实现 $subscribe 及其工作机制。

## $subscribe 基本用法

```javascript
const store = useCounterStore()

// 订阅状态变化
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('Mutation:', mutation.type)
  console.log('New state:', state)
})

// 取消订阅
unsubscribe()
```

## 核心实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const subscriptions = []
  let isListening = true
  let isSyncListening = true
  
  function $subscribe(callback, options = {}) {
    const { flush = 'pre', detached = false } = options
    
    // 添加到订阅列表
    const subscription = { callback, flush }
    subscriptions.push(subscription)
    
    // 设置 watch 监听状态变化
    const stopWatcher = scope.run(() =>
      watch(
        () => pinia.state.value[id],
        (state, oldState) => {
          if (isSyncListening) {
            callback(
              {
                type: MutationType.direct,
                storeId: id
              },
              state
            )
          }
        },
        {
          deep: true,
          flush
        }
      )
    )
    
    // 返回取消订阅函数
    return () => {
      stopWatcher()
      const index = subscriptions.indexOf(subscription)
      if (index > -1) {
        subscriptions.splice(index, 1)
      }
    }
  }
  
  return { $subscribe }
}
```

## 触发订阅

订阅在两种情况下被触发：

### 1. 直接修改（通过 watch）

```javascript
store.count = 10  // watch 检测到变化，触发 callback
```

### 2. $patch 调用

```javascript
function $patch(partialStateOrMutator) {
  // ... 执行修改
  
  // 手动触发订阅（禁用 watch 触发）
  isSyncListening = false
  
  subscriptions.slice().forEach(({ callback }) => {
    callback(mutation, pinia.state.value[id])
  })
  
  isSyncListening = true
}
```

## 避免重复触发

$patch 后不应该再由 watch 触发：

```javascript
function $patch(partialStateOrMutator) {
  // 暂时禁用 watch 触发
  isSyncListening = false
  
  // 执行修改
  if (typeof partialStateOrMutator === 'function') {
    partialStateOrMutator(pinia.state.value[id])
  } else {
    mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
  }
  
  // 手动触发订阅
  triggerSubscriptions(mutation)
  
  // 恢复 watch 触发
  nextTick(() => {
    isSyncListening = true
  })
}

function triggerSubscriptions(mutation) {
  subscriptions.slice().forEach(({ callback }) => {
    callback(mutation, pinia.state.value[id])
  })
}
```

## 订阅回调的参数

### mutation 对象

```javascript
store.$subscribe((mutation, state) => {
  // mutation 结构
  console.log(mutation.type)     // 'direct' | 'patch object' | 'patch function'
  console.log(mutation.storeId)  // 'counter'
  console.log(mutation.payload)  // 仅 'patch object' 有
  console.log(mutation.events)   // 开发环境下的调试事件
})
```

### state 参数

```javascript
store.$subscribe((mutation, state) => {
  // state 是当前最新状态
  console.log(state === store.$state)  // true
  
  // 可以直接访问
  console.log(state.count)
})
```

## 组件生命周期集成

默认情况下，订阅随组件销毁而取消：

```javascript
// 在组件中
const store = useCounterStore()

// 组件卸载时自动取消订阅
store.$subscribe((mutation, state) => {
  console.log('State changed')
})
```

实现依赖 `getCurrentScope`：

```javascript
function $subscribe(callback, options = {}) {
  const { detached = false } = options
  
  // 获取当前组件的 effectScope
  const currentScope = getCurrentScope()
  
  // 添加订阅...
  const removeSubscription = () => {
    stopWatcher()
    // 从列表移除...
  }
  
  // 如果在组件上下文中且非 detached
  if (currentScope && !detached) {
    // 组件销毁时自动取消
    onScopeDispose(removeSubscription)
  }
  
  return removeSubscription
}
```

## 完整实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  const subscriptions = []
  let isListening = true
  let isSyncListening = true
  
  function addSubscription(subscription, remove) {
    subscriptions.push(subscription)
    
    const currentScope = getCurrentScope()
    if (currentScope && !subscription.detached) {
      onScopeDispose(() => remove())
    }
  }
  
  function $subscribe(callback, options = {}) {
    const { flush = 'pre', detached = false } = options
    
    const subscription = { callback, flush, detached }
    
    const removeSubscription = () => {
      const index = subscriptions.indexOf(subscription)
      if (index > -1) {
        subscriptions.splice(index, 1)
        stopWatcher()
      }
    }
    
    addSubscription(subscription, removeSubscription)
    
    const stopWatcher = scope.run(() =>
      watch(
        () => pinia.state.value[id],
        (state) => {
          if (options.flush === 'sync' ? isSyncListening : isListening) {
            callback(
              {
                type: MutationType.direct,
                storeId: id
              },
              state
            )
          }
        },
        {
          deep: true,
          flush: options.flush || 'pre'
        }
      )
    )
    
    return removeSubscription
  }
  
  function triggerSubscriptions(mutation) {
    subscriptions.slice().forEach(sub => {
      sub.callback(mutation, pinia.state.value[id])
    })
  }
  
  function $patch(partialStateOrMutator) {
    let mutation
    
    // 禁用监听
    isListening = false
    isSyncListening = false
    
    try {
      if (typeof partialStateOrMutator === 'function') {
        partialStateOrMutator(pinia.state.value[id])
        mutation = { type: MutationType.patchFunction, storeId: id }
      } else {
        mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
        mutation = { 
          type: MutationType.patchObject, 
          storeId: id,
          payload: partialStateOrMutator
        }
      }
    } finally {
      // 恢复监听
      isListening = true
      isSyncListening = true
    }
    
    // 触发订阅
    triggerSubscriptions(mutation)
  }
  
  return { $subscribe, $patch }
}
```

## 使用示例

### 状态持久化

```javascript
store.$subscribe((mutation, state) => {
  localStorage.setItem('store-state', JSON.stringify(state))
})
```

### 状态日志

```javascript
store.$subscribe((mutation, state) => {
  console.log(`[${mutation.storeId}] ${mutation.type}`)
  if (mutation.payload) {
    console.log('Payload:', mutation.payload)
  }
})
```

### 条件订阅

```javascript
store.$subscribe((mutation, state) => {
  // 只在特定条件下处理
  if (state.count > 100) {
    notifyAdmin('Count exceeded 100')
  }
})
```

## 测试用例

```javascript
describe('$subscribe', () => {
  test('calls callback on state change', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.count = 10
    
    expect(callback).toHaveBeenCalled()
  })
  
  test('unsubscribe stops callbacks', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    const unsubscribe = store.$subscribe(callback)
    unsubscribe()
    
    store.count = 10
    
    expect(callback).not.toHaveBeenCalled()
  })
  
  test('mutation contains correct type', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    let mutationType
    
    store.$subscribe((mutation) => {
      mutationType = mutation.type
    })
    
    store.count = 10
    expect(mutationType).toBe('direct')
    
    store.$patch({ count: 20 })
    expect(mutationType).toBe('patch object')
    
    store.$patch(s => s.count++)
    expect(mutationType).toBe('patch function')
  })
  
  test('$patch triggers only once', () => {
    const useStore = defineStore('test', {
      state: () => ({ a: 0, b: 0, c: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$patch({ a: 1, b: 2, c: 3 })
    
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
```

## 本章小结

本章实现了 $subscribe：

- **核心机制**：基于 Vue watch 监听状态变化
- **触发时机**：直接修改和 $patch
- **避免重复**：$patch 时禁用 watch 触发
- **自动清理**：随组件生命周期管理
- **返回值**：取消订阅函数

下一章探讨订阅选项。
