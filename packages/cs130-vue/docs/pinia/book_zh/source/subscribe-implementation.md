# $subscribe 实现

$subscribe 用于监听 Store 状态的变化。这一章分析其内部实现。

## 基本用法

```typescript
const store = useCounterStore()

const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('State changed:', mutation.type)
  console.log('New state:', state)
})

// 取消订阅
unsubscribe()
```

## 函数签名

```typescript
$subscribe(
  callback: SubscriptionCallback<S>,
  options?: { detached?: boolean; deep?: boolean; flush?: 'pre' | 'post' | 'sync' }
): () => void
```

callback 接收两个参数：mutation 信息和当前状态。options 控制订阅行为。返回取消订阅的函数。

## 实现分析

```typescript
const $subscribe = function (
  callback: SubscriptionCallback<S>,
  options: {
    detached?: boolean
    deep?: boolean
    flush?: 'pre' | 'post' | 'sync'
  } = {}
) {
  // 添加到订阅列表
  const removeSubscription = addSubscription(
    subscriptions,
    callback,
    options.detached,
    () => stopWatcher()
  )

  // 创建 watcher 监听状态变化
  const stopWatcher = scope.run(() =>
    watch(
      () => pinia.state.value[$id] as UnwrapRef<S>,
      (state) => {
        if (options.flush === 'sync' ? isSyncListening : isListening) {
          callback(
            {
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents as DebuggerEvent,
            },
            state
          )
        }
      },
      assign({}, $subscribeOptions, options)
    )
  )!

  return removeSubscription
}
```

$subscribe 做了两件事：将回调添加到订阅列表，并创建一个 watcher。

## addSubscription 函数

```typescript
function addSubscription<T extends _Method>(
  subscriptions: T[],
  callback: T,
  detached?: boolean,
  onCleanup: () => void = noop
) {
  subscriptions.push(callback)

  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback)
    if (idx > -1) {
      subscriptions.splice(idx, 1)
      onCleanup()
    }
  }

  if (!detached && getCurrentScope()) {
    onScopeDispose(removeSubscription)
  }

  return removeSubscription
}
```

回调被添加到数组中。如果不是 detached 模式且有活跃的 effectScope，会在 scope 销毁时自动取消订阅。

## detached 选项

默认情况下，订阅与组件生命周期绑定：

```typescript
// 组件中
const store = useStore()

store.$subscribe((mutation, state) => {
  // 组件卸载时自动取消
})
```

detached 模式下，订阅独立于组件：

```typescript
store.$subscribe(
  (mutation, state) => {
    // 需要手动取消
  },
  { detached: true }
)
```

## watch 监听状态

watcher 监听 `pinia.state.value[$id]`：

```typescript
watch(
  () => pinia.state.value[$id],
  (state) => {
    if (isListening) {
      callback({ type: MutationType.direct, ... }, state)
    }
  },
  options
)
```

任何状态变化都会触发 watcher。

## isListening 标志

$patch 期间暂停监听：

```typescript
function $patch(...) {
  isListening = isSyncListening = false
  
  // 执行 patch
  
  isSyncListening = true
  nextTick().then(() => {
    isListening = true
  })
  
  // 手动触发订阅
  triggerSubscriptions(subscriptions, mutation, state)
}
```

这防止了 $patch 期间触发多次订阅。$patch 完成后手动触发一次。

## mutation 类型

```typescript
enum MutationType {
  direct = 'direct',
  patchObject = 'patch object',
  patchFunction = 'patch function',
}
```

- `direct`：直接赋值 `store.count = 5`
- `patchObject`：对象式 $patch
- `patchFunction`：函数式 $patch

## mutation 对象

```typescript
interface SubscriptionCallbackMutation<S> {
  type: MutationType
  storeId: string
  events: DebuggerEvent | DebuggerEvent[]
  payload?: any  // 仅 patchObject 有
}
```

events 在开发环境包含详细的变化信息。

## flush 选项

控制回调执行时机：

```typescript
// 同步执行（状态变化后立即）
store.$subscribe(callback, { flush: 'sync' })

// 组件更新前执行（默认）
store.$subscribe(callback, { flush: 'pre' })

// 组件更新后执行
store.$subscribe(callback, { flush: 'post' })
```

这对应 Vue watch 的 flush 选项。

## deep 选项

控制是否深度监听：

```typescript
// 深度监听（默认）
store.$subscribe(callback, { deep: true })

// 浅监听
store.$subscribe(callback, { deep: false })
```

浅监听只追踪顶层属性变化，深度监听追踪所有嵌套变化。

## 默认选项

$subscribeOptions 定义了默认行为：

```typescript
const $subscribeOptions: WatchOptions = {
  deep: true,
  flush: 'pre',
}
```

默认是深度监听，在组件更新前执行。

## triggerSubscriptions

手动触发订阅回调：

```typescript
function triggerSubscriptions<T extends _Method>(
  subscriptions: T[],
  ...args: Parameters<T>
) {
  subscriptions.slice().forEach((callback) => {
    callback(...args)
  })
}
```

使用 slice 复制数组，防止回调中修改订阅列表导致问题。

## 常见用法

持久化状态：

```typescript
store.$subscribe((mutation, state) => {
  localStorage.setItem('state', JSON.stringify(state))
})
```

同步到服务器：

```typescript
store.$subscribe(
  debounce((mutation, state) => {
    api.syncState(state)
  }, 1000)
)
```

调试日志：

```typescript
store.$subscribe((mutation, state) => {
  console.log('Mutation:', mutation.type)
  console.log('Store:', mutation.storeId)
  if (mutation.payload) {
    console.log('Payload:', mutation.payload)
  }
})
```

## 性能考量

每次状态变化都会触发订阅，需要注意性能：

```typescript
// ❌ 错误：频繁执行重计算
store.$subscribe((mutation, state) => {
  expensiveOperation(state)
})

// ✅ 正确：使用防抖
store.$subscribe(
  debounce((mutation, state) => {
    expensiveOperation(state)
  }, 100)
)
```

## 与 watch 的区别

$subscribe 与 Vue 的 watch 有些区别：

```typescript
// Vue watch：需要指定具体属性
watch(() => store.count, (newVal) => { ... })

// $subscribe：监听所有状态变化
store.$subscribe((mutation, state) => { ... })
```

$subscribe 更适合全局状态监控，watch 更适合监听特定属性。

## 清理资源

订阅可能需要清理资源：

```typescript
const unsubscribe = store.$subscribe((mutation, state) => {
  // 如果回调使用了外部资源，取消时需要清理
})

// 组件卸载或不再需要时
onUnmounted(() => {
  unsubscribe()
})
```

detached 模式下，必须手动取消订阅，否则会造成内存泄漏。

下一章我们将分析订阅选项的细节。
