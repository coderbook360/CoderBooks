# 订阅清理机制

订阅需要正确清理以避免内存泄漏和意外行为。这一章分析 Pinia 的订阅清理机制。

## 自动清理机制

非 detached 订阅会自动清理：

```typescript
function addSubscription(
  subscriptions,
  callback,
  detached,
  onCleanup = noop
) {
  subscriptions.push(callback)

  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback)
    if (idx > -1) {
      subscriptions.splice(idx, 1)
      onCleanup()
    }
  }

  // 关键：如果不是 detached 且有活跃 scope，自动清理
  if (!detached && getCurrentScope()) {
    onScopeDispose(removeSubscription)
  }

  return removeSubscription
}
```

onScopeDispose 在当前 effectScope 销毁时执行清理。

## 组件生命周期绑定

组件 setup 运行在 effectScope 中：

```typescript
// 组件 setup
export default {
  setup() {
    const store = useStore()
    
    // 订阅绑定到组件的 effectScope
    store.$subscribe((mutation, state) => {
      console.log('State changed')
    })
    
    store.$onAction(({ name }) => {
      console.log('Action called:', name)
    })
    
    // 组件卸载时，effectScope 销毁，订阅自动取消
  }
}
```

## getCurrentScope

getCurrentScope 检测当前的 effectScope：

```typescript
import { getCurrentScope } from 'vue'

// 在组件 setup 中
getCurrentScope()  // 返回组件的 scope

// 在普通函数中
getCurrentScope()  // 可能返回 null
```

如果没有活跃的 scope，订阅不会自动清理。

## detached 订阅

detached 订阅跳过自动清理：

```typescript
store.$subscribe(callback, { detached: true })
store.$onAction(callback, true)
```

detached 订阅的生命周期独立于组件，必须手动管理。

## 手动取消订阅

所有订阅函数返回取消函数：

```typescript
const unsubscribe = store.$subscribe(callback)
const unsubscribeAction = store.$onAction(actionCallback)

// 手动取消
unsubscribe()
unsubscribeAction()
```

## $dispose 的清理

$dispose 清空所有订阅：

```typescript
function $dispose() {
  scope.stop()
  subscriptions.splice(0)        // 清空 $subscribe 订阅
  actionSubscriptions.splice(0)  // 清空 $onAction 订阅
  pinia._s.delete($id)
}
```

splice(0) 移除数组中所有元素，所有订阅立即失效。

## $subscribe 的 watcher 清理

$subscribe 创建的 watcher 也需要清理：

```typescript
const $subscribe = function(callback, options = {}) {
  const removeSubscription = addSubscription(
    subscriptions,
    callback,
    options.detached,
    () => stopWatcher()  // 清理时停止 watcher
  )

  const stopWatcher = scope.run(() =>
    watch(...)  // watcher 运行在 Store 的 scope 中
  )!

  return removeSubscription
}
```

取消订阅时，onCleanup 回调调用 stopWatcher。

此外，watcher 运行在 Store 的 effectScope 中，$dispose 时 scope.stop() 也会停止它。

## 多重清理保护

removeSubscription 有保护机制：

```typescript
const removeSubscription = () => {
  const idx = subscriptions.indexOf(callback)
  if (idx > -1) {
    subscriptions.splice(idx, 1)
    onCleanup()
  }
}
```

检查 idx > -1 确保即使多次调用也安全。

## 常见内存泄漏场景

闭包捕获大对象：

```typescript
// ❌ 可能泄漏
store.$subscribe(
  (mutation, state) => {
    // callback 捕获了 largeData
    processData(largeData, state)
  },
  { detached: true }
)

// 如果忘记取消，largeData 无法回收
```

忘记取消 detached 订阅：

```typescript
// ❌ 忘记取消
function initStore() {
  store.$subscribe(callback, { detached: true })
}

// ✅ 正确管理
let unsubscribe: (() => void) | null = null

function initStore() {
  unsubscribe = store.$subscribe(callback, { detached: true })
}

function cleanup() {
  unsubscribe?.()
  unsubscribe = null
}
```

## 测试中的清理

测试需要清理订阅以隔离测试：

```typescript
describe('Store tests', () => {
  beforeEach(() => {
    // 每个测试使用新的 Pinia
    setActivePinia(createPinia())
  })

  afterEach(() => {
    // 销毁所有 Store
    const pinia = getActivePinia()
    pinia._s.forEach(store => store.$dispose())
  })
})
```

## 订阅数量监控

调试时可以监控订阅数量：

```typescript
if (__DEV__) {
  console.log('Subscriptions:', subscriptions.length)
  console.log('Action subscriptions:', actionSubscriptions.length)
}
```

订阅数量异常增长可能表明泄漏。

## 弱引用替代方案

对于某些场景，可以考虑弱引用：

```typescript
// 使用 WeakRef（实验性）
const callbacks = new Set<WeakRef<Function>>()

function addWeakSubscription(callback: Function) {
  const ref = new WeakRef(callback)
  callbacks.add(ref)
  
  return () => callbacks.delete(ref)
}
```

但 Pinia 没有使用这种方式，因为订阅通常需要可靠触发。

## 最佳实践

优先使用非 detached 模式：

```typescript
// 组件内，自动清理
store.$subscribe(callback)
```

detached 模式显式管理：

```typescript
const unsubscribes: Array<() => void> = []

function setup() {
  unsubscribes.push(
    store.$subscribe(callback, { detached: true })
  )
}

function teardown() {
  unsubscribes.forEach(fn => fn())
  unsubscribes.length = 0
}
```

避免在循环中创建订阅：

```typescript
// ❌ 可能创建大量订阅
items.forEach(item => {
  store.$subscribe(callback)
})

// ✅ 单个订阅处理所有情况
store.$subscribe((mutation, state) => {
  items.forEach(item => processItem(item, state))
})
```

## 调试订阅泄漏

```typescript
// 开发时添加追踪
if (__DEV__) {
  const originalSubscribe = store.$subscribe
  store.$subscribe = function(callback, options) {
    console.trace('Subscription created')
    return originalSubscribe.call(this, callback, options)
  }
}
```

使用 console.trace 可以看到订阅创建的调用栈。

下一章我们将分析 storeToRefs 辅助函数。
