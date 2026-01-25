# 插件订阅扩展

插件可以利用 $subscribe 和 $onAction 实现强大的扩展功能。这一章分析如何在插件中有效使用这些订阅机制。

## 插件中的 $subscribe

```typescript
pinia.use(({ store }) => {
  store.$subscribe((mutation, state) => {
    console.log(`[${store.$id}] 状态变化:`, mutation.type)
  })
})
```

每个 Store 创建时自动注册订阅。

## 插件中的 $onAction

```typescript
pinia.use(({ store }) => {
  store.$onAction(({ name, store, args, after, onError }) => {
    console.log(`[${store.$id}] Action ${name} 被调用`)
  })
})
```

## 实现日志插件

完整的日志插件：

```typescript
function createLoggerPlugin(options = {}) {
  const { enabled = true, logState = true, logActions = true } = options
  
  return ({ store }) => {
    if (!enabled) return
    
    const prefix = `[Pinia:${store.$id}]`
    
    // 状态日志
    if (logState) {
      store.$subscribe((mutation, state) => {
        const { type, storeId, events } = mutation
        
        console.group(`${prefix} State Changed`)
        console.log('Type:', type)
        console.log('Events:', events)
        console.log('New State:', JSON.parse(JSON.stringify(state)))
        console.groupEnd()
      })
    }
    
    // Action 日志
    if (logActions) {
      store.$onAction(({ name, args, after, onError }) => {
        const startTime = performance.now()
        
        console.log(`${prefix} Action "${name}" started with args:`, args)
        
        after((result) => {
          const duration = performance.now() - startTime
          console.log(`${prefix} Action "${name}" finished in ${duration.toFixed(2)}ms`)
          if (result !== undefined) {
            console.log(`${prefix} Action "${name}" returned:`, result)
          }
        })
        
        onError((error) => {
          const duration = performance.now() - startTime
          console.error(`${prefix} Action "${name}" failed after ${duration.toFixed(2)}ms:`, error)
        })
      })
    }
  }
}

// 使用
pinia.use(createLoggerPlugin({
  enabled: process.env.NODE_ENV !== 'production',
  logState: true,
  logActions: true
}))
```

## 实现持久化插件

使用 $subscribe 实现状态持久化：

```typescript
function persistPlugin({ store, options }) {
  const persistConfig = options.persist
  
  if (!persistConfig) return
  
  const key = `pinia-${store.$id}`
  const storage = persistConfig.storage || localStorage
  
  // 恢复状态
  const saved = storage.getItem(key)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      store.$patch(data)
    } catch (e) {
      console.warn(`Failed to restore ${store.$id}:`, e)
    }
  }
  
  // 持久化状态变化
  store.$subscribe(
    (mutation, state) => {
      try {
        // 过滤要持久化的字段
        const toPersist = persistConfig.paths
          ? pick(state, persistConfig.paths)
          : state
        
        storage.setItem(key, JSON.stringify(toPersist))
      } catch (e) {
        console.warn(`Failed to persist ${store.$id}:`, e)
      }
    },
    { detached: true }  // 组件卸载后继续监听
  )
}

function pick(obj, paths) {
  const result = {}
  for (const path of paths) {
    result[path] = obj[path]
  }
  return result
}
```

## 实现撤销/重做

```typescript
function undoRedoPlugin({ store }) {
  const history = []
  let currentIndex = -1
  let skipSubscribe = false
  
  // 保存初始状态
  history.push(JSON.stringify(store.$state))
  currentIndex = 0
  
  // 监听状态变化
  store.$subscribe((mutation, state) => {
    if (skipSubscribe) return
    
    // 清除重做历史
    history.splice(currentIndex + 1)
    
    // 保存新状态
    history.push(JSON.stringify(state))
    currentIndex++
    
    // 限制历史长度
    if (history.length > 50) {
      history.shift()
      currentIndex--
    }
  })
  
  return {
    undo() {
      if (currentIndex <= 0) return false
      
      skipSubscribe = true
      currentIndex--
      store.$patch(JSON.parse(history[currentIndex]))
      skipSubscribe = false
      return true
    },
    
    redo() {
      if (currentIndex >= history.length - 1) return false
      
      skipSubscribe = true
      currentIndex++
      store.$patch(JSON.parse(history[currentIndex]))
      skipSubscribe = false
      return true
    },
    
    canUndo: () => currentIndex > 0,
    canRedo: () => currentIndex < history.length - 1
  }
}
```

## 实现乐观更新

```typescript
function optimisticPlugin({ store }) {
  store.$onAction(async ({ name, args, after, onError }) => {
    // 检查是否标记为乐观更新
    const actionConfig = store.$options?.optimistic?.[name]
    if (!actionConfig) return
    
    // 保存当前状态
    const snapshot = JSON.stringify(store.$state)
    
    // 乐观更新
    if (actionConfig.optimisticUpdate) {
      actionConfig.optimisticUpdate(store, ...args)
    }
    
    // 失败时回滚
    onError(() => {
      store.$patch(JSON.parse(snapshot))
    })
  })
}

// 使用
const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),
  actions: {
    async removeItem(id) {
      await api.removeItem(id)
    }
  },
  optimistic: {
    removeItem: {
      optimisticUpdate(store, id) {
        store.items = store.items.filter(item => item.id !== id)
      }
    }
  }
})
```

## 实现性能监控

```typescript
function performancePlugin({ store }) {
  const metrics = {
    actionCalls: {},
    stateMutations: 0,
    slowActions: []
  }
  
  store.$onAction(({ name, after, onError }) => {
    const start = performance.now()
    
    // 记录调用次数
    metrics.actionCalls[name] = (metrics.actionCalls[name] || 0) + 1
    
    const recordDuration = () => {
      const duration = performance.now() - start
      
      // 记录慢 Action
      if (duration > 100) {
        metrics.slowActions.push({
          name,
          duration,
          timestamp: Date.now()
        })
      }
    }
    
    after(recordDuration)
    onError(recordDuration)
  })
  
  store.$subscribe(() => {
    metrics.stateMutations++
  })
  
  return {
    $metrics: metrics,
    $getPerformanceReport() {
      return {
        ...metrics,
        averageActionDuration: calculateAverage(metrics)
      }
    }
  }
}
```

## 实现错误边界

```typescript
function errorBoundaryPlugin({ store, app }) {
  const errorHandler = app.config.globalProperties.$errorHandler
  
  store.$onAction(({ name, onError }) => {
    onError((error) => {
      // 统一错误处理
      const errorInfo = {
        store: store.$id,
        action: name,
        error,
        timestamp: Date.now()
      }
      
      // 报告错误
      if (errorHandler) {
        errorHandler.report(errorInfo)
      }
      
      // 可选：阻止错误继续抛出
      // return false
    })
  })
}
```

## 订阅选项的使用

detached 选项很重要：

```typescript
pinia.use(({ store }) => {
  // 默认行为：组件卸载时取消订阅
  store.$subscribe((mutation, state) => {
    // 可能在组件卸载后停止
  })
  
  // detached: true：始终保持订阅
  store.$subscribe(
    (mutation, state) => {
      // 即使组件卸载也继续运行
      saveToLocalStorage(state)
    },
    { detached: true }
  )
})
```

## 条件订阅

根据配置决定是否订阅：

```typescript
pinia.use(({ store, options }) => {
  // 只对启用日志的 Store 添加订阅
  if (options.enableLogging) {
    store.$subscribe((mutation) => {
      console.log('State changed:', mutation)
    })
  }
  
  // 只对特定 Store 添加订阅
  if (['user', 'auth'].includes(store.$id)) {
    store.$onAction(({ name }) => {
      console.log(`Security-sensitive action: ${name}`)
    })
  }
})
```

## 清理订阅

保存取消订阅函数：

```typescript
pinia.use(({ store }) => {
  // 保存取消函数
  const unsubscribe = store.$subscribe((mutation) => {
    // ...
  })
  
  // 添加到 Store，允许手动取消
  return {
    $unsubscribeLogger: unsubscribe
  }
})

// 使用时可以手动取消
store.$unsubscribeLogger()
```

## 组合多个订阅

```typescript
function createFullPlugin() {
  return ({ store }) => {
    // 状态订阅
    store.$subscribe((mutation, state) => {
      persistState(store.$id, state)
      logMutation(store.$id, mutation)
    }, { detached: true })
    
    // Action 订阅
    store.$onAction(({ name, args, after, onError }) => {
      const context = {
        store: store.$id,
        action: name,
        args,
        startTime: Date.now()
      }
      
      logActionStart(context)
      
      after((result) => {
        logActionEnd(context, result)
        trackAnalytics(context)
      })
      
      onError((error) => {
        logActionError(context, error)
        reportError(context, error)
      })
    })
    
    return {
      // 返回工具方法
      $clearHistory: () => clearPersistedState(store.$id)
    }
  }
}
```

## 注意事项

避免在订阅中触发状态变化导致无限循环：

```typescript
// ❌ 危险：可能导致无限循环
store.$subscribe((mutation, state) => {
  store.lastUpdated = Date.now()  // 触发新的订阅
})

// ✅ 安全：使用标记跳过
let updating = false
store.$subscribe((mutation, state) => {
  if (updating) return
  updating = true
  store.lastUpdated = Date.now()
  updating = false
})
```

下一章我们将分析持久化插件的完整实现。
