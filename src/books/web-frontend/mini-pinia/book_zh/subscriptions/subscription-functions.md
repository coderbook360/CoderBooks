---
sidebar_position: 49
title: 订阅函数管理与清理
---

# 订阅函数管理与清理

订阅系统需要妥善管理订阅函数的生命周期，包括添加、移除和批量清理。本章探讨订阅管理的最佳实践。

## 订阅存储结构

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 状态订阅列表
  const subscriptions = []
  
  // Action 订阅列表
  const actionSubscriptions = []
  
  // 每个订阅包含回调和选项
  // { callback: Function, flush?: string, detached?: boolean }
}
```

## 添加订阅

```javascript
function addSubscription(subscriptions, callback, options, cleanup) {
  const subscription = {
    callback,
    ...options
  }
  
  subscriptions.push(subscription)
  
  // 返回移除函数
  const removeSubscription = () => {
    const index = subscriptions.indexOf(subscription)
    if (index > -1) {
      subscriptions.splice(index, 1)
    }
    if (cleanup) {
      cleanup()
    }
  }
  
  return removeSubscription
}
```

## 自动清理机制

### 基于 effectScope

```javascript
import { getCurrentScope, onScopeDispose } from 'vue'

function $subscribe(callback, options = {}) {
  const { detached = false } = options
  
  const remove = addSubscription(subscriptions, callback, options, stopWatcher)
  
  // 获取当前 scope（组件的 scope）
  const currentScope = getCurrentScope()
  
  if (!detached && currentScope) {
    // 组件卸载时自动移除
    onScopeDispose(remove)
  }
  
  return remove
}
```

### 工作原理

```javascript
// 组件的 effectScope
const componentScope = effectScope()

componentScope.run(() => {
  // 组件 setup 代码
  const store = useStore()
  
  // 订阅在组件 scope 内注册
  store.$subscribe(callback)  // 会调用 getCurrentScope()
})

// 组件卸载
componentScope.stop()  // 触发 onScopeDispose 回调
```

## 手动清理

### 单个订阅

```javascript
const unsubscribe = store.$subscribe(callback)

// 手动取消
unsubscribe()
```

### 多个订阅

```javascript
const unsubscribes = []

unsubscribes.push(store.$subscribe(callback1))
unsubscribes.push(store.$subscribe(callback2))
unsubscribes.push(store.$onAction(callback3))

// 清理所有
function cleanup() {
  unsubscribes.forEach(fn => fn())
  unsubscribes.length = 0
}
```

## Store 销毁时的清理

$dispose 需要清理所有订阅：

```javascript
function $dispose() {
  // 停止 effectScope
  scope.stop()
  
  // 清空订阅列表
  subscriptions.length = 0
  actionSubscriptions.length = 0
  
  // 从 Pinia 移除
  pinia._s.delete(id)
}
```

## 防止内存泄漏

### 问题：重复订阅

```javascript
// ❌ 每次组件重新渲染都添加新订阅
export default {
  setup() {
    const store = useStore()
    
    // 这在 Composition API 中不是问题
    // 但在某些场景可能导致重复
    watch(someValue, () => {
      store.$subscribe(callback)  // 可能重复添加
    })
  }
}
```

### 解决方案

```javascript
// ✅ 追踪并清理
export default {
  setup() {
    const store = useStore()
    let unsubscribe = null
    
    watch(someValue, () => {
      // 先清理旧订阅
      if (unsubscribe) {
        unsubscribe()
      }
      unsubscribe = store.$subscribe(callback)
    })
    
    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })
  }
}
```

## 订阅触发时的安全性

触发订阅时需要防止回调修改订阅列表：

```javascript
function triggerSubscriptions(mutation, state) {
  // 复制数组，防止回调中修改原数组
  const subs = subscriptions.slice()
  
  subs.forEach(({ callback }) => {
    try {
      callback(mutation, state)
    } catch (error) {
      console.error('Error in subscription callback:', error)
    }
  })
}
```

### 为什么需要复制？

```javascript
store.$subscribe((mutation, state) => {
  // 在回调中取消订阅
  unsubscribe()  // 修改了 subscriptions 数组
})

// 如果直接遍历 subscriptions，会导致问题
```

## 订阅去重

避免同一回调重复订阅：

```javascript
function $subscribe(callback, options = {}) {
  // 检查是否已存在
  const existing = subscriptions.find(s => s.callback === callback)
  if (existing) {
    // 可以选择：跳过、更新选项、或警告
    if (__DEV__) {
      console.warn('Subscription callback already registered')
    }
    return () => {}  // 返回空函数
  }
  
  // 正常添加
  // ...
}
```

## 订阅优先级

某些场景需要控制回调执行顺序：

```javascript
const subscriptions = []

function addSubscription(callback, options = {}) {
  const { priority = 0 } = options
  
  const subscription = { callback, priority, ...options }
  
  // 按优先级插入
  const index = subscriptions.findIndex(s => s.priority < priority)
  if (index === -1) {
    subscriptions.push(subscription)
  } else {
    subscriptions.splice(index, 0, subscription)
  }
  
  return () => { /* remove */ }
}

// 使用
store.$subscribe(callback, { priority: 10 })  // 先执行
store.$subscribe(callback, { priority: 1 })   // 后执行
```

## 完整的订阅管理器

```javascript
function createSubscriptionManager() {
  const subscriptions = []
  
  return {
    add(callback, options = {}) {
      const subscription = { callback, ...options }
      subscriptions.push(subscription)
      
      let isRemoved = false
      
      const remove = () => {
        if (isRemoved) return
        isRemoved = true
        
        const index = subscriptions.indexOf(subscription)
        if (index > -1) {
          subscriptions.splice(index, 1)
        }
      }
      
      // 自动清理
      if (!options.detached) {
        const scope = getCurrentScope()
        if (scope) {
          onScopeDispose(remove)
        }
      }
      
      return remove
    },
    
    trigger(...args) {
      subscriptions.slice().forEach(({ callback }) => {
        try {
          callback(...args)
        } catch (error) {
          if (__DEV__) {
            console.error('Subscription error:', error)
          }
        }
      })
    },
    
    clear() {
      subscriptions.length = 0
    },
    
    get size() {
      return subscriptions.length
    }
  }
}

// 使用
const stateSubscriptions = createSubscriptionManager()
const actionSubscriptions = createSubscriptionManager()
```

## 调试订阅

开发环境下追踪订阅：

```javascript
if (__DEV__) {
  function addSubscription(callback, options) {
    console.log(`[${id}] Subscription added:`, {
      callback: callback.name || 'anonymous',
      options
    })
    
    const remove = originalAddSubscription(callback, options)
    
    return () => {
      console.log(`[${id}] Subscription removed`)
      remove()
    }
  }
}
```

## 测试订阅清理

```javascript
describe('Subscription cleanup', () => {
  test('manual unsubscribe works', () => {
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
  
  test('$dispose clears all subscriptions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 }),
      actions: { inc() { this.count++ } }
    })
    
    const store = useStore()
    const stateCallback = vi.fn()
    const actionCallback = vi.fn()
    
    store.$subscribe(stateCallback)
    store.$onAction(actionCallback)
    
    store.$dispose()
    
    // 创建新 store（因为旧的被移除了）
    const newStore = useStore()
    newStore.count = 10
    newStore.inc()
    
    // 旧订阅不应该触发
    expect(stateCallback).not.toHaveBeenCalled()
    expect(actionCallback).not.toHaveBeenCalled()
  })
  
  test('scope disposal cleans non-detached subscriptions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    const scope = effectScope()
    scope.run(() => {
      store.$subscribe(callback, { detached: false })
    })
    
    scope.stop()
    
    store.count = 10
    
    expect(callback).not.toHaveBeenCalled()
  })
  
  test('detached subscription survives scope disposal', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    const scope = effectScope()
    scope.run(() => {
      store.$subscribe(callback, { detached: true })
    })
    
    scope.stop()
    
    store.count = 10
    
    expect(callback).toHaveBeenCalled()
  })
})
```

## 本章小结

本章探讨了订阅管理：

- **存储结构**：数组存储订阅对象
- **自动清理**：基于 effectScope 的生命周期管理
- **安全触发**：复制数组防止并发修改
- **内存泄漏**：避免重复订阅，正确清理
- **调试支持**：开发环境追踪订阅

完成订阅系统，下一章进入辅助函数部分。
