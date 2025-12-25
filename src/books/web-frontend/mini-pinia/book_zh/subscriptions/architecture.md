---
sidebar_position: 40
title: 订阅系统架构设计
---

# 订阅系统架构设计

Pinia 的订阅系统让开发者能够监听状态变化和 Action 调用。本章从架构角度剖析订阅系统的设计。

## 订阅系统的目标

订阅系统要解决的核心问题：

1. **状态持久化**：状态变化时自动保存
2. **日志记录**：记录所有状态变更和 Action
3. **调试工具**：为 DevTools 提供数据源
4. **副作用管理**：在特定状态变化时执行操作

## 两种订阅类型

Pinia 提供两种订阅：

```javascript
// 1. $subscribe - 订阅状态变化
store.$subscribe((mutation, state) => {
  console.log('State changed:', mutation)
})

// 2. $onAction - 订阅 Action 调用
store.$onAction(({ name, args, after, onError }) => {
  console.log('Action called:', name)
})
```

两者关注点不同：
- **$subscribe**：关注"状态变成了什么"
- **$onAction**：关注"做了什么操作"

## 发布-订阅模式

订阅系统基于发布-订阅模式：

```javascript
class EventEmitter {
  constructor() {
    this.listeners = new Map()
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) callbacks.splice(index, 1)
    }
  }
  
  emit(event, ...args) {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(cb => cb(...args))
  }
}
```

Pinia 使用数组而非 Map 简化实现：

```javascript
// Store 内部
const subscriptions = []
const actionSubscriptions = []

function $subscribe(callback) {
  subscriptions.push(callback)
  return () => {
    const index = subscriptions.indexOf(callback)
    if (index > -1) subscriptions.splice(index, 1)
  }
}

function triggerSubscriptions(mutation, state) {
  subscriptions.forEach(cb => cb(mutation, state))
}
```

## 订阅数据结构

### $subscribe 的 mutation 对象

```javascript
interface SubscriptionCallback {
  (mutation: MutationInfo, state: StateTree): void
}

interface MutationInfo {
  type: 'direct' | 'patch object' | 'patch function'
  storeId: string
  events?: DebuggerEvent | DebuggerEvent[]
}
```

### $onAction 的 context 对象

```javascript
interface ActionContext {
  name: string           // Action 名称
  store: Store           // Store 实例
  args: unknown[]        // 调用参数
  after: (callback: (result) => void) => void   // 成功回调
  onError: (callback: (error) => void) => void  // 错误回调
}
```

## 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                      Store                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │                    State                             ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             ││
│  │  │  count  │  │  name   │  │  items  │             ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘             ││
│  └───────┼────────────┼────────────┼────────────────────┘│
│          │            │            │                      │
│          └────────────┴────────────┘                      │
│                       │                                   │
│                       ▼                                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │              State Change Detection                  ││
│  │         (Vue Reactivity / $patch / direct)          ││
│  └────────────────────────┬────────────────────────────┘│
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │              $subscribe Subscribers                  ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            ││
│  │  │ persist  │ │  logger  │ │ devtools │            ││
│  │  └──────────┘ └──────────┘ └──────────┘            ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │                   Actions                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            ││
│  │  │increment │ │ fetchData│ │  reset   │            ││
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            ││
│  └───────┼────────────┼────────────┼────────────────────┘│
│          │            │            │                      │
│          └────────────┴────────────┘                      │
│                       │                                   │
│                       ▼                                   │
│  ┌─────────────────────────────────────────────────────┐│
│  │              $onAction Subscribers                   ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            ││
│  │  │  logger  │ │analytics │ │ devtools │            ││
│  │  └──────────┘ └──────────┘ └──────────┘            ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 订阅管理器设计

```javascript
function createSubscriptionManager() {
  const subscriptions = []
  
  return {
    // 添加订阅
    add(callback, options = {}) {
      const sub = { callback, ...options }
      subscriptions.push(sub)
      
      return () => this.remove(sub)
    },
    
    // 移除订阅
    remove(sub) {
      const index = subscriptions.indexOf(sub)
      if (index > -1) {
        subscriptions.splice(index, 1)
      }
    },
    
    // 触发订阅
    trigger(...args) {
      // 复制数组，防止回调中修改订阅列表
      const subs = subscriptions.slice()
      subs.forEach(sub => {
        try {
          sub.callback(...args)
        } catch (error) {
          console.error('Subscription callback error:', error)
        }
      })
    },
    
    // 清空所有订阅
    clear() {
      subscriptions.length = 0
    },
    
    // 获取订阅数量
    get size() {
      return subscriptions.length
    }
  }
}
```

## 触发时机

### $subscribe 触发时机

```javascript
// 1. 直接修改 state
store.count = 10  // mutation.type = 'direct'

// 2. $patch 对象模式
store.$patch({ count: 10 })  // mutation.type = 'patch object'

// 3. $patch 函数模式
store.$patch(state => { state.count = 10 })  // mutation.type = 'patch function'

// 4. $state 整体替换
store.$state = { count: 10 }  // 内部调用 $patch
```

### $onAction 触发时机

```javascript
// Action 被调用时
store.increment()  // 触发 $onAction

// 注意：直接修改 state 不会触发 $onAction
store.count++  // 不触发 $onAction
```

## 异步订阅处理

$onAction 需要处理异步 Action：

```javascript
store.$onAction(({ name, after, onError }) => {
  const startTime = Date.now()
  
  after((result) => {
    // Action 成功完成后
    console.log(`${name} completed in ${Date.now() - startTime}ms`)
  })
  
  onError((error) => {
    // Action 抛出错误后
    console.error(`${name} failed:`, error)
  })
})
```

实现需要处理 Promise：

```javascript
function wrapAction(store, actionName, action) {
  return function(...args) {
    const afterCallbacks = []
    const errorCallbacks = []
    
    // 通知订阅者
    triggerActionSubscribers({
      name: actionName,
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
    
    // 处理异步 Action
    if (result instanceof Promise) {
      return result
        .then(value => {
          afterCallbacks.forEach(cb => cb(value))
          return value
        })
        .catch(error => {
          errorCallbacks.forEach(cb => cb(error))
          throw error
        })
    }
    
    afterCallbacks.forEach(cb => cb(result))
    return result
  }
}
```

## 订阅选项

### $subscribe 选项

```javascript
store.$subscribe(callback, {
  flush: 'sync' | 'pre' | 'post',  // 调用时机
  detached: boolean                 // 是否独立于组件生命周期
})
```

### $onAction 选项

```javascript
store.$onAction(callback, detached)  // 第二个参数是 detached
```

## 与 Vue 响应式的集成

$subscribe 利用 Vue 的 `watch`：

```javascript
function $subscribe(callback, options = {}) {
  const { flush = 'pre', detached = false } = options
  
  // 使用 Vue 的 watch 监听状态变化
  const stopWatcher = scope.run(() => 
    watch(
      () => pinia.state.value[id],
      (state) => {
        callback({ type: 'direct', storeId: id }, state)
      },
      { deep: true, flush }
    )
  )
  
  subscriptions.push({ callback, stopWatcher })
  
  return () => {
    stopWatcher()
    // 从订阅列表移除...
  }
}
```

## 本章小结

本章从架构角度分析了订阅系统：

- **两种订阅**：$subscribe（状态）和 $onAction（操作）
- **发布-订阅模式**：核心设计模式
- **数据结构**：mutation 对象和 action context
- **触发时机**：不同操作触发不同类型的订阅
- **异步处理**：after 和 onError 回调
- **Vue 集成**：利用 watch 实现状态监听

下一章实现 $patch 的对象模式。
