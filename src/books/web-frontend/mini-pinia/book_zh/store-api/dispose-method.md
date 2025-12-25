---
sidebar_position: 37
title: $dispose 方法实现
---

# $dispose 方法实现

`$dispose` 方法用于销毁 Store 实例，释放资源并清理订阅。本章探讨其设计和实现细节。

## $dispose 的用途

```javascript
const store = useCounterStore()

// Store 使用完毕后销毁
store.$dispose()

// 销毁后：
// - 所有订阅被移除
// - effectScope 被停止
// - Store 从 pinia._s 中移除
```

典型使用场景：
- 组件卸载时清理局部 Store
- 动态创建的 Store 生命周期管理
- 测试用例的清理

## $dispose 实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)  // detached scope
  const subscriptions = []
  const actionSubscriptions = []
  
  function $dispose() {
    // 1. 停止 effectScope
    scope.stop()
    
    // 2. 清空订阅
    subscriptions.length = 0
    actionSubscriptions.length = 0
    
    // 3. 从 Pinia 中移除
    pinia._s.delete(id)
    
    // 4. 删除全局 state（可选）
    // delete pinia.state.value[id]
  }
  
  // 将 $dispose 添加到 store
  Object.defineProperty(store, '$dispose', {
    value: $dispose.bind(store),
    writable: false,
    enumerable: false
  })
  
  return store
}
```

## effectScope.stop() 的作用

`effectScope` 管理所有响应式副作用：

```javascript
const scope = effectScope(true)

const setupResult = scope.run(() => {
  const count = ref(0)
  
  // computed 创建了 effect
  const double = computed(() => count.value * 2)
  
  // watch 创建了 effect
  watch(count, () => {
    console.log('count changed')
  })
  
  return { count, double }
})

// 停止 scope 会清理所有 effect
scope.stop()

// 之后修改 count 不会触发 watch 和 computed
setupResult.count.value++  // 无日志输出
```

这确保 Store 销毁后：
- computed 不再重新计算
- watch 不再执行回调
- 相关内存可以被回收

## 清空订阅数组

订阅通过数组管理：

```javascript
const subscriptions = []

function $subscribe(callback) {
  subscriptions.push(callback)
  
  // 返回取消函数
  return () => {
    const index = subscriptions.indexOf(callback)
    if (index > -1) {
      subscriptions.splice(index, 1)
    }
  }
}

function $dispose() {
  // 清空订阅，使所有回调失效
  subscriptions.length = 0
}
```

为什么用 `length = 0` 而不是重新赋值？

```javascript
// ✅ 清空数组，保留原引用
subscriptions.length = 0

// ❌ 创建新数组，原引用仍存在
subscriptions = []  // 外部引用不受影响
```

使用 `length = 0` 确保任何持有该数组引用的代码也会看到清空效果。

## 从 Pinia 中移除

```javascript
function $dispose() {
  // ...
  
  // 从 Store 注册表中移除
  pinia._s.delete(id)
  
  // 移除后，再次调用 useStore() 会创建新实例
}
```

验证移除效果：

```javascript
const store1 = useCounterStore()
console.log(pinia._s.has('counter'))  // true

store1.$dispose()
console.log(pinia._s.has('counter'))  // false

const store2 = useCounterStore()
console.log(store1 === store2)  // false，新创建的实例
```

## 全局 State 的处理

是否删除 `pinia.state.value[id]` 是一个设计决策：

### 选项 1：保留 state

```javascript
function $dispose() {
  scope.stop()
  subscriptions.length = 0
  pinia._s.delete(id)
  // 不删除 pinia.state.value[id]
}
```

优点：
- 重新创建 Store 时可以恢复状态
- SSR 场景友好
- DevTools 可以查看历史状态

### 选项 2：删除 state

```javascript
function $dispose() {
  scope.stop()
  subscriptions.length = 0
  pinia._s.delete(id)
  delete pinia.state.value[id]  // 彻底清除
}
```

优点：
- 彻底释放内存
- 下次创建是全新状态
- 避免旧数据干扰

Pinia 官方选择**保留 state**，符合"状态可能需要恢复"的预期。

## 手动控制销毁时机

在某些场景需要手动管理：

```javascript
// 动态 Store
function createDynamicStore(userId) {
  const useUserStore = defineStore(`user-${userId}`, {
    state: () => ({ profile: null }),
    actions: {
      async load() {
        this.profile = await api.getUser(userId)
      }
    }
  })
  
  return useUserStore()
}

// 创建
const store = createDynamicStore('user-123')

// 使用完毕后销毁
store.$dispose()
```

## 与组件生命周期集成

在组件中使用时，通常不需要手动调用 `$dispose`：

```javascript
// Store 是全局的，组件卸载不影响 Store
const store = useCounterStore()

onUnmounted(() => {
  // 通常不需要调用 $dispose
  // Store 状态可能被其他组件使用
})
```

但局部 Store 可能需要清理：

```javascript
// 局部 Store：只在当前组件使用
const localStore = defineStore(`local-${uid}`, {
  state: () => ({ data: null })
})()

onUnmounted(() => {
  localStore.$dispose()  // 清理局部 Store
})
```

## 销毁后的行为

调用 `$dispose` 后，Store 的行为：

```javascript
const store = useCounterStore()
store.$dispose()

// ⚠️ 以下操作行为未定义，应该避免
store.count = 10  // 可能工作，也可能不工作
store.$patch({})  // 订阅不会触发
store.$subscribe() // 添加到已清空的数组
```

最佳实践：**销毁后不再使用该 Store 实例**。

## 测试用例

```javascript
describe('$dispose method', () => {
  test('$dispose stops effectScope', () => {
    let watchCalled = false
    
    const useStore = defineStore('test', () => {
      const count = ref(0)
      
      watch(count, () => {
        watchCalled = true
      })
      
      return { count }
    })
    
    const store = useStore()
    store.$dispose()
    
    watchCalled = false
    store.count = 10
    
    // watch 不应该被触发
    expect(watchCalled).toBe(false)
  })
  
  test('$dispose removes from pinia._s', () => {
    const pinia = createPinia()
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    useStore(pinia)
    expect(pinia._s.has('test')).toBe(true)
    
    const store = pinia._s.get('test')
    store.$dispose()
    
    expect(pinia._s.has('test')).toBe(false)
  })
  
  test('$dispose clears subscriptions', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    const callback = vi.fn()
    
    store.$subscribe(callback)
    store.$dispose()
    
    // 触发状态变化
    const pinia = getActivePinia()
    pinia.state.value.test.count = 10
    
    // 订阅不应该被调用
    expect(callback).not.toHaveBeenCalled()
  })
  
  test('new store is created after dispose', () => {
    const pinia = createPinia()
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store1 = useStore(pinia)
    store1.count = 100
    store1.$dispose()
    
    const store2 = useStore(pinia)
    
    // store2 是新实例
    expect(store1).not.toBe(store2)
    
    // 但 state 可能被保留（取决于实现）
    // expect(store2.count).toBe(100)  // 如果保留 state
    // expect(store2.count).toBe(0)    // 如果删除 state
  })
  
  test('$dispose is idempotent', () => {
    const useStore = defineStore('test', {
      state: () => ({ count: 0 })
    })
    
    const store = useStore()
    
    // 多次调用不应该报错
    expect(() => {
      store.$dispose()
      store.$dispose()
      store.$dispose()
    }).not.toThrow()
  })
})
```

## 完整实现

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  
  let subscriptions = []
  let actionSubscriptions = []
  let isDisposed = false
  
  function $dispose() {
    if (isDisposed) return
    isDisposed = true
    
    // 停止所有响应式副作用
    scope.stop()
    
    // 清空订阅
    subscriptions.length = 0
    actionSubscriptions.length = 0
    
    // 从注册表移除
    pinia._s.delete(id)
    
    // 可选：删除全局 state
    // delete pinia.state.value[id]
  }
  
  const store = reactive({
    $id: id
  })
  
  Object.defineProperty(store, '$dispose', {
    value: $dispose,
    writable: false,
    enumerable: false,
    configurable: false
  })
  
  // ... 其他 Store 逻辑
  
  return store
}
```

## 本章小结

本章实现了 `$dispose` 方法：

- **核心功能**：销毁 Store，释放资源
- **effectScope.stop()**：停止所有响应式副作用
- **清空订阅**：使 `$subscribe` 和 `$onAction` 回调失效
- **移除注册**：从 `pinia._s` 中删除
- **State 处理**：官方选择保留，可根据需求删除
- **幂等性**：多次调用安全

下一章探讨 Store 内部属性的设计。
