---
sidebar_position: 30
title: effectScope 在 Store 中的应用
---

# effectScope 在 Store 中的应用

`effectScope` 是 Vue 3.2 引入的 API，用于批量管理响应式副作用。本章深入探讨它在 Pinia Store 中的核心作用。

## 什么是 effectScope？

`effectScope` 创建一个作用域，可以收集在其中创建的所有响应式副作用（computed、watch、watchEffect 等）：

```javascript
import { effectScope, ref, computed, watch } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  
  // 这些副作用都被 scope 收集
  const double = computed(() => count.value * 2)
  
  watch(count, (val) => {
    console.log('count changed:', val)
  })
  
  watchEffect(() => {
    console.log('count is:', count.value)
  })
})

// 一次性停止所有副作用
scope.stop()
```

## 为什么 Store 需要 effectScope？

### 问题场景

没有 effectScope，Store 中的副作用难以管理：

```javascript
// 没有 effectScope
function createStore() {
  const count = ref(0)
  
  // 这些副作用如何清理？
  const double = computed(() => count.value * 2)
  
  watch(count, () => {
    // 日志...
  })
  
  // 无法统一管理和清理这些副作用
}
```

### 解决方案

使用 effectScope 统一管理：

```javascript
function createStore() {
  const scope = effectScope()
  
  let store
  
  scope.run(() => {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    watch(count, () => {
      console.log('count changed')
    })
    
    store = { count, double }
  })
  
  // dispose 方法
  store.$dispose = () => {
    scope.stop()  // 一次性清理所有副作用
  }
  
  return store
}
```

## Store 中 effectScope 的使用

### 创建 Scope

```javascript
function createSetupStore(id, setup, options, pinia) {
  // 创建独立的 scope
  // true 参数表示 detached（与父 scope 分离）
  const scope = effectScope(true)
  
  let setupResult
  
  scope.run(() => {
    // setup 中的所有副作用都被收集
    setupResult = setup()
  })
  
  // 保存 scope 引用，用于后续清理
  store._scope = scope
  
  return store
}
```

### Detached 模式

`effectScope(true)` 创建 detached scope：

```javascript
// 父 scope
const parentScope = effectScope()

parentScope.run(() => {
  // 普通子 scope，随父 scope 停止
  const childScope = effectScope()
  
  // detached scope，独立于父 scope
  const detachedScope = effectScope(true)
  
  // 当 parentScope.stop() 时：
  // - childScope 会被停止
  // - detachedScope 不受影响
})
```

Store 使用 detached 模式的原因：

1. Store 的生命周期独立于创建它的组件
2. 多个组件可能共享同一个 Store
3. Store 应该在显式调用 `$dispose` 时才清理

### $dispose 实现

```javascript
function createDispose(scope, pinia, id) {
  return function $dispose() {
    // 1. 停止 scope，清理所有副作用
    scope.stop()
    
    // 2. 清理订阅
    this._actionSubscribers = []
    
    // 3. 从 Pinia 注销
    pinia._s.delete(id)
    
    // 4. 可选：从全局 state 移除
    // delete pinia.state.value[id]
  }
}
```

## 在 Options Store 中的应用

Options Store 同样使用 effectScope：

```javascript
function createOptionsStore(id, options, pinia) {
  const scope = effectScope(true)
  
  scope.run(() => {
    // getters 转换为 computed，被 scope 收集
    for (const name in options.getters) {
      const getter = options.getters[name]
      store[name] = computed(() => {
        return getter.call(store, store.$state)
      })
    }
  })
  
  store._scope = scope
}
```

## 嵌套 Scope

Setup 函数内可以创建嵌套 scope：

```javascript
defineStore('store', () => {
  const count = ref(0)
  
  // 在 setup 内创建子 scope
  // 这个子 scope 被外层 Store scope 管理
  const innerScope = effectScope()
  
  innerScope.run(() => {
    watch(count, () => {
      console.log('count changed')
    })
  })
  
  function stopWatching() {
    innerScope.stop()  // 只停止内部 watch
  }
  
  return { count, stopWatching }
})
```

## getCurrentScope 和 onScopeDispose

Vue 提供了与 scope 交互的工具：

```javascript
import { getCurrentScope, onScopeDispose } from 'vue'

defineStore('store', () => {
  const count = ref(0)
  
  // 获取当前 scope
  const scope = getCurrentScope()
  console.log('In scope:', !!scope)  // true
  
  // 注册清理回调
  onScopeDispose(() => {
    console.log('Store disposed!')
    // 清理外部资源、取消订阅等
  })
  
  return { count }
})
```

### $subscribe 的 detached 选项

```javascript
store.$subscribe((mutation, state) => {
  console.log('state changed')
}, {
  detached: true  // 不随组件卸载
})
```

实现时使用 onScopeDispose：

```javascript
function createSubscribe(store) {
  return function $subscribe(callback, options = {}) {
    const { detached = false } = options
    
    // 添加订阅
    const removeSubscription = addSubscription(
      store._subscriptions,
      callback
    )
    
    // 如果不是 detached，组件卸载时自动清理
    if (!detached) {
      const currentScope = getCurrentScope()
      if (currentScope) {
        onScopeDispose(removeSubscription)
      }
    }
    
    return removeSubscription
  }
}
```

## 测试 effectScope 行为

```javascript
describe('effectScope in Store', () => {
  test('computed is collected by scope', () => {
    const useStore = defineStore('test', () => {
      const count = ref(0)
      const double = computed(() => count.value * 2)
      return { count, double }
    })
    
    const store = useStore()
    expect(store.double).toBe(0)
    
    store.count = 5
    expect(store.double).toBe(10)  // computed 正常工作
    
    store.$dispose()
    
    // dispose 后，computed 不再响应
    store.count = 10
    // 行为取决于实现，可能保持旧值或抛错
  })
  
  test('watch is stopped on dispose', () => {
    let watchCount = 0
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      
      watch(count, () => {
        watchCount++
      })
      
      return { count }
    })
    
    const store = useStore()
    
    store.count = 1
    expect(watchCount).toBe(1)
    
    store.$dispose()
    
    store.count = 2
    expect(watchCount).toBe(1)  // watch 已停止
  })
  
  test('onScopeDispose is called', () => {
    let disposed = false
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      
      onScopeDispose(() => {
        disposed = true
      })
      
      return { count }
    })
    
    const store = useStore()
    expect(disposed).toBe(false)
    
    store.$dispose()
    expect(disposed).toBe(true)
  })
})
```

## 性能考量

### 避免过多副作用

```javascript
// ❌ 避免：大量 watcher
defineStore('store', () => {
  const items = ref([])
  
  // 每个 item 一个 watcher - 性能问题！
  items.value.forEach(item => {
    watch(() => item.value, () => {
      // ...
    })
  })
  
  return { items }
})

// ✅ 更好：单个深度 watcher
defineStore('store', () => {
  const items = ref([])
  
  watch(items, () => {
    // 处理整个数组变化
  }, { deep: true })
  
  return { items }
})
```

### 条件性副作用

```javascript
defineStore('store', () => {
  const enabled = ref(false)
  const data = ref(null)
  
  // 只在启用时创建副作用
  let stopWatch = null
  
  watch(enabled, (isEnabled) => {
    if (isEnabled) {
      stopWatch = watch(data, () => {
        // 处理数据变化
      })
    } else if (stopWatch) {
      stopWatch()
      stopWatch = null
    }
  })
  
  return { enabled, data }
})
```

## 本章小结

本章深入探讨了 effectScope 在 Store 中的应用：

- **作用域管理**：统一收集和管理响应式副作用
- **Detached 模式**：Store scope 独立于创建它的组件
- **$dispose 实现**：通过 scope.stop() 一次性清理
- **清理回调**：使用 onScopeDispose 注册清理逻辑
- **性能考量**：避免过多副作用

下一章探讨 State 的自动识别与提取机制。
