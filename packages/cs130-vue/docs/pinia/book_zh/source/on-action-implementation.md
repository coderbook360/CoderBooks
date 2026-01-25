# $onAction 实现

$onAction 用于监听 Store 的 action 调用。这一章分析其实现机制。

## 基本用法

```typescript
const store = useCounterStore()

store.$onAction(({ name, store, args, after, onError }) => {
  console.log(`Action "${name}" called with args:`, args)
  
  after((result) => {
    console.log(`Action "${name}" completed with result:`, result)
  })
  
  onError((error) => {
    console.error(`Action "${name}" failed:`, error)
  })
})
```

## 函数签名

```typescript
$onAction(
  callback: StoreOnActionListener<Id, S, G, A>,
  detached?: boolean
): () => void
```

callback 接收 action 上下文对象，detached 控制是否独立于组件生命周期。

## 实现分析

```typescript
function $onAction(
  callback: StoreOnActionListener<Id, S, G, A>,
  detached?: boolean
): () => void {
  return addSubscription(
    actionSubscriptions,
    callback,
    detached
  )
}
```

实现非常简洁：将回调添加到 actionSubscriptions 数组中。

## actionSubscriptions 数组

```typescript
// createSetupStore 中初始化
const actionSubscriptions: StoreOnActionListener<Id, S, G, A>[] = []
```

这个数组存储所有 action 监听器。

## 触发时机

action 被调用时触发订阅：

```typescript
// wrapAction 中
function wrapAction(name: string, action: _Method) {
  return function(...args) {
    // 创建回调列表
    const afterCallbackList: Array<(result: any) => void> = []
    const onErrorCallbackList: Array<(error: unknown) => void> = []
    
    function after(callback) {
      afterCallbackList.push(callback)
    }
    function onError(callback) {
      onErrorCallbackList.push(callback)
    }

    // 触发订阅
    triggerSubscriptions(actionSubscriptions, {
      args,
      name,
      store,
      after,
      onError,
    })

    // 执行 action...
  }
}
```

订阅在 action 执行前触发，传递上下文对象。

## 上下文对象

```typescript
interface StoreOnActionListenerContext<S, G, A> {
  name: string           // action 名称
  store: Store<S, G, A>  // Store 实例
  args: any[]            // 调用参数
  after: (callback: (result: any) => void) => void
  onError: (callback: (error: unknown) => void) => void
}
```

name：被调用的 action 名称。

store：Store 实例，可以访问状态和其他方法。

args：调用 action 时传入的参数。

after：注册 action 成功完成后的回调。

onError：注册 action 出错时的回调。

## after 回调机制

after 回调在 action 完成后执行：

```typescript
// 同步 action
try {
  ret = action.apply(this, args)
} catch (error) {
  triggerSubscriptions(onErrorCallbackList, error)
  throw error
}

triggerSubscriptions(afterCallbackList, ret)
return ret
```

```typescript
// 异步 action
if (ret instanceof Promise) {
  return ret
    .then((value) => {
      triggerSubscriptions(afterCallbackList, value)
      return value
    })
    .catch((error) => {
      triggerSubscriptions(onErrorCallbackList, error)
      return Promise.reject(error)
    })
}
```

同步 action 直接触发 after，异步 action 在 Promise resolve 后触发。

## onError 回调机制

错误发生时触发 onError：

```typescript
// 同步错误
try {
  ret = action.apply(this, args)
} catch (error) {
  triggerSubscriptions(onErrorCallbackList, error)
  throw error  // 重新抛出
}

// 异步错误
.catch((error) => {
  triggerSubscriptions(onErrorCallbackList, error)
  return Promise.reject(error)  // 重新 reject
})
```

错误会触发 onError 回调，但也会继续传播，调用者仍能捕获。

## 多个订阅者

可以添加多个订阅者：

```typescript
// 日志
store.$onAction(({ name, args }) => {
  console.log(`[LOG] ${name}`, args)
})

// 性能监控
store.$onAction(({ name, after }) => {
  const start = performance.now()
  after(() => {
    console.log(`[PERF] ${name} took ${performance.now() - start}ms`)
  })
})

// 错误追踪
store.$onAction(({ name, onError }) => {
  onError((error) => {
    errorTracker.capture(error, { action: name })
  })
})
```

所有订阅者按添加顺序执行。

## detached 选项

与 $subscribe 类似，detached 控制生命周期：

```typescript
// 绑定组件生命周期（默认）
store.$onAction(callback)

// 独立于组件
store.$onAction(callback, true)
```

detached 订阅需要手动取消：

```typescript
const unsubscribe = store.$onAction(callback, true)

// 需要时取消
unsubscribe()
```

## 常见用法

日志记录：

```typescript
store.$onAction(({ name, args, after, onError }) => {
  console.log(`[${new Date().toISOString()}] ${name}`, args)
  
  after((result) => {
    console.log(`[${new Date().toISOString()}] ${name} -> success`)
  })
  
  onError((error) => {
    console.error(`[${new Date().toISOString()}] ${name} -> error:`, error)
  })
})
```

性能追踪：

```typescript
store.$onAction(({ name, after }) => {
  const startTime = performance.now()
  
  after(() => {
    const duration = performance.now() - startTime
    if (duration > 100) {
      console.warn(`Slow action: ${name} took ${duration}ms`)
    }
  })
})
```

加载状态管理：

```typescript
store.$onAction(({ name, after, onError }) => {
  if (name.startsWith('fetch')) {
    loadingStore.start(name)
    
    after(() => loadingStore.finish(name))
    onError(() => loadingStore.finish(name))
  }
})
```

## 修改参数或结果

$onAction 可以在执行前修改参数：

```typescript
store.$onAction(({ args }) => {
  // ⚠️ 直接修改 args 数组会影响 action
  args[0] = sanitize(args[0])
})
```

但不能修改 after 回调的结果——那只是接收结果，不是拦截。

## 拦截和取消

$onAction 不能取消 action 执行。如果需要拦截：

```typescript
// 包装 action
const originalIncrement = store.increment
store.increment = function(...args) {
  if (shouldBlock()) {
    console.log('Action blocked')
    return
  }
  return originalIncrement.apply(this, args)
}
```

## 类型安全

TypeScript 正确推断上下文类型：

```typescript
store.$onAction(({ name, args, store }) => {
  // name: string
  // args: any[]
  // store: 完整的 Store 类型
  
  if (name === 'increment') {
    // 可以收窄类型，但 args 仍是 any[]
  }
})
```

对于更精确的类型，可能需要类型守卫。

## 取消订阅

```typescript
const unsubscribe = store.$onAction(callback)

// 取消
unsubscribe()

// 或在组件卸载时自动取消（非 detached 模式）
```

下一章我们将分析 $onAction 回调参数的细节。
