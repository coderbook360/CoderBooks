---
sidebar_position: 45
title: 订阅选项：flush 与 detached
---

# 订阅选项：flush 与 detached

$subscribe 接受配置选项来控制回调的执行时机和生命周期。本章详细解析 flush 和 detached 选项。

## 选项概览

```javascript
store.$subscribe(callback, {
  flush: 'pre' | 'post' | 'sync',
  detached: boolean
})
```

## flush 选项

flush 控制回调的执行时机，与 Vue watch 的 flush 选项一致。

### flush: 'pre'（默认）

```javascript
store.$subscribe((mutation, state) => {
  console.log('Pre flush - before DOM update')
}, { flush: 'pre' })
```

特点：
- 在 DOM 更新**之前**执行
- Vue 的默认行为
- 适合大多数场景

### flush: 'post'

```javascript
store.$subscribe((mutation, state) => {
  // DOM 已更新，可以安全访问
  const element = document.getElementById('counter')
  console.log('Element text:', element.textContent)
}, { flush: 'post' })
```

特点：
- 在 DOM 更新**之后**执行
- 可以访问更新后的 DOM
- 适合需要读取 DOM 的场景

### flush: 'sync'

```javascript
store.$subscribe((mutation, state) => {
  console.log('Sync flush - immediate')
}, { flush: 'sync' })
```

特点：
- **立即同步**执行
- 不等待批处理
- 可能影响性能，谨慎使用

## flush 时机对比

```javascript
const store = useCounterStore()

store.$subscribe(() => console.log('1. sync'), { flush: 'sync' })
store.$subscribe(() => console.log('2. pre'), { flush: 'pre' })
store.$subscribe(() => console.log('3. post'), { flush: 'post' })

store.count = 10

// 输出顺序：
// 1. sync    <- 立即执行
// 2. pre     <- DOM 更新前
// 3. post    <- DOM 更新后
```

## detached 选项

detached 控制订阅是否随组件生命周期管理。

### detached: false（默认）

```javascript
// 在组件中
export default {
  setup() {
    const store = useCounterStore()
    
    // 默认：组件卸载时自动取消订阅
    store.$subscribe((mutation, state) => {
      console.log('State changed')
    })
  }
}
```

### detached: true

```javascript
// 在组件中
export default {
  setup() {
    const store = useCounterStore()
    
    // 组件卸载后仍然保持订阅
    store.$subscribe((mutation, state) => {
      console.log('State changed')
    }, { detached: true })
  }
}
```

## detached 实现原理

```javascript
function $subscribe(callback, options = {}) {
  const { detached = false } = options
  
  const removeSubscription = () => {
    // 移除逻辑...
  }
  
  // 获取当前 effectScope（组件的 scope）
  const currentScope = getCurrentScope()
  
  if (!detached && currentScope) {
    // 注册到当前 scope，组件卸载时自动执行
    onScopeDispose(removeSubscription)
  }
  
  return removeSubscription
}
```

## 使用场景

### flush: 'post' - 读取 DOM

```javascript
const store = useUIStore()

store.$subscribe((mutation, state) => {
  // 需要等 DOM 更新后读取尺寸
  const height = document.getElementById('list').offsetHeight
  console.log('List height:', height)
}, { flush: 'post' })
```

### flush: 'sync' - 调试

```javascript
// 调试时需要立即看到日志
if (__DEV__) {
  store.$subscribe((mutation, state) => {
    console.log('[DEBUG]', mutation)
  }, { flush: 'sync' })
}
```

### detached: true - 全局监听

```javascript
// 在 main.js 中设置全局日志
const store = useAppStore()

store.$subscribe((mutation, state) => {
  // 发送到日志服务
  logService.send({
    type: 'state-change',
    store: mutation.storeId,
    mutation: mutation.type
  })
}, { detached: true })  // 不随任何组件销毁
```

### detached: true - 持久化

```javascript
// 持久化插件
pinia.use(({ store }) => {
  store.$subscribe((mutation, state) => {
    localStorage.setItem(`pinia-${store.$id}`, JSON.stringify(state))
  }, { detached: true })  // 始终保持订阅
})
```

## 选项组合

```javascript
// 同步 + 独立
store.$subscribe(callback, {
  flush: 'sync',
  detached: true
})

// DOM 更新后 + 随组件销毁
store.$subscribe(callback, {
  flush: 'post',
  detached: false
})
```

## 完整实现

```javascript
function $subscribe(callback, options = {}) {
  const { flush = 'pre', detached = false } = options
  
  const subscription = { callback, flush, detached }
  
  // 移除函数
  const removeSubscription = () => {
    const index = subscriptions.indexOf(subscription)
    if (index > -1) {
      subscriptions.splice(index, 1)
      stopWatcher()
    }
  }
  
  // 添加到订阅列表
  subscriptions.push(subscription)
  
  // 生命周期管理
  const currentScope = getCurrentScope()
  if (!detached && currentScope) {
    onScopeDispose(removeSubscription)
  }
  
  // 创建 watcher
  const stopWatcher = scope.run(() =>
    watch(
      () => pinia.state.value[id],
      (state) => {
        // 根据 flush 类型判断是否触发
        const shouldTrigger = flush === 'sync' 
          ? isSyncListening 
          : isListening
        
        if (shouldTrigger) {
          callback(
            { type: MutationType.direct, storeId: id },
            state
          )
        }
      },
      { deep: true, flush }
    )
  )
  
  return removeSubscription
}
```

## 注意事项

### flush: 'sync' 的性能影响

```javascript
// ❌ 可能导致性能问题
store.$subscribe((mutation, state) => {
  expensiveOperation(state)
}, { flush: 'sync' })

// ✅ 更好的做法
store.$subscribe((mutation, state) => {
  expensiveOperation(state)
}, { flush: 'pre' })  // 默认，有批处理优化
```

### detached 的内存泄漏风险

```javascript
// ⚠️ 可能导致内存泄漏
export default {
  setup() {
    const store = useStore()
    
    // 组件反复创建/销毁会累积订阅
    store.$subscribe(callback, { detached: true })
  }
}

// ✅ 正确做法
let unsubscribe = null

export default {
  setup() {
    const store = useStore()
    
    onMounted(() => {
      // 确保只有一个订阅
      if (!unsubscribe) {
        unsubscribe = store.$subscribe(callback, { detached: true })
      }
    })
  }
}
```

## 测试用例

```javascript
describe('$subscribe options', () => {
  describe('flush option', () => {
    test('flush sync executes immediately', async () => {
      const order = []
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      
      store.$subscribe(() => order.push('sync'), { flush: 'sync' })
      store.$subscribe(() => order.push('pre'), { flush: 'pre' })
      
      store.count = 1
      
      // sync 应该已经执行
      expect(order).toContain('sync')
      
      // pre 需要等 nextTick
      await nextTick()
      expect(order).toContain('pre')
    })
  })
  
  describe('detached option', () => {
    test('non-detached subscription is cleaned up with scope', async () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      const callback = vi.fn()
      
      const scope = effectScope()
      scope.run(() => {
        store.$subscribe(callback, { detached: false })
      })
      
      store.count = 1
      await nextTick()
      expect(callback).toHaveBeenCalledTimes(1)
      
      // 停止 scope
      scope.stop()
      
      store.count = 2
      await nextTick()
      
      // 不应该再被调用
      expect(callback).toHaveBeenCalledTimes(1)
    })
    
    test('detached subscription survives scope cleanup', async () => {
      const useStore = defineStore('test', {
        state: () => ({ count: 0 })
      })
      
      const store = useStore()
      const callback = vi.fn()
      
      const scope = effectScope()
      scope.run(() => {
        store.$subscribe(callback, { detached: true })
      })
      
      // 停止 scope
      scope.stop()
      
      store.count = 1
      await nextTick()
      
      // 仍然被调用
      expect(callback).toHaveBeenCalled()
    })
  })
})
```

## 本章小结

本章详解了订阅选项：

- **flush**：控制回调执行时机（sync/pre/post）
- **detached**：控制是否随组件生命周期管理
- **使用场景**：DOM 访问、全局监听、持久化
- **注意事项**：性能影响、内存泄漏

下一章实现 $onAction。
