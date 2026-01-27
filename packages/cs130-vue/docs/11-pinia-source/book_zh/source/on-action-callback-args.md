# $onAction 回调参数

$onAction 回调接收一个上下文对象，包含 action 的所有相关信息。这一章详细分析每个属性。

## 上下文对象结构

```typescript
interface StoreOnActionListenerContext<Id, S, G, A> {
  name: string
  store: Store<Id, S, G, A>
  args: unknown[]
  after: (callback: (result: unknown) => void) => void
  onError: (callback: (error: unknown) => void) => void
}
```

## name 属性

action 的方法名：

```typescript
store.$onAction(({ name }) => {
  console.log(`Action called: ${name}`)
})

store.increment()
// 输出：Action called: increment

store.fetchUser('123')
// 输出：Action called: fetchUser
```

name 对应 Store 中定义的方法名，不包含 Store 前缀。

利用 name 进行条件处理：

```typescript
store.$onAction(({ name, args }) => {
  // 只监控特定 action
  if (name === 'createOrder') {
    analytics.track('order_attempted', args[0])
  }
  
  // 匹配模式
  if (name.startsWith('fetch')) {
    loadingIndicator.show()
  }
})
```

## store 属性

Store 实例的引用：

```typescript
store.$onAction(({ store }) => {
  // 可以访问 Store 的状态
  console.log('Current count:', store.count)
  
  // 可以调用其他方法
  store.$patch({ lastActionTime: Date.now() })
})
```

store 是完整的 Store 实例，包含状态、getters、actions 和内置方法。

## args 属性

传递给 action 的参数数组：

```typescript
store.$onAction(({ name, args }) => {
  console.log(`${name} called with:`, args)
})

store.updateUser('123', { name: 'Alice' })
// 输出：updateUser called with: ['123', { name: 'Alice' }]
```

args 是参数的数组，顺序与调用时相同。

验证参数：

```typescript
store.$onAction(({ name, args }) => {
  if (name === 'transfer') {
    const [fromId, toId, amount] = args
    if (amount < 0) {
      console.warn('Negative transfer amount detected')
    }
  }
})
```

## after 回调

注册 action 成功完成后的回调：

```typescript
store.$onAction(({ name, after }) => {
  after((result) => {
    console.log(`${name} completed, result:`, result)
  })
})

const user = await store.fetchUser('123')
// 输出：fetchUser completed, result: { id: '123', name: 'Alice' }
```

after 回调接收 action 的返回值。

### 多个 after 回调

可以注册多个 after 回调：

```typescript
store.$onAction(({ after }) => {
  after((result) => console.log('After 1:', result))
  after((result) => console.log('After 2:', result))
})

// 两个回调都会执行
```

### 同步和异步

after 在适当时机触发：

```typescript
// 同步 action
actions: {
  increment() {
    this.count++
    return this.count
  }
}

store.$onAction(({ after }) => {
  after((result) => {
    // 同步 action 后立即执行
    console.log('New count:', result)
  })
})

// 异步 action
actions: {
  async fetchData() {
    const data = await api.fetch()
    return data
  }
}

store.$onAction(({ after }) => {
  after((result) => {
    // Promise resolve 后执行
    console.log('Data:', result)
  })
})
```

## onError 回调

注册 action 出错时的回调：

```typescript
store.$onAction(({ name, onError }) => {
  onError((error) => {
    console.error(`${name} failed:`, error)
    
    // 发送错误报告
    errorReporter.capture(error, { action: name })
  })
})
```

### 同步和异步错误

两种错误都会触发 onError：

```typescript
// 同步错误
actions: {
  riskySync() {
    throw new Error('Sync error')
  }
}

// 异步错误
actions: {
  async riskyAsync() {
    throw new Error('Async error')
  }
}

store.$onAction(({ onError }) => {
  onError((error) => {
    // 两种错误都会触发
    console.error(error)
  })
})
```

### 错误不会被吞掉

onError 只是观察者，错误仍然传播：

```typescript
store.$onAction(({ onError }) => {
  onError((error) => {
    console.log('Error observed')
  })
})

try {
  await store.riskyAction()
} catch (e) {
  console.log('Error caught by caller')
}

// 输出：
// Error observed
// Error caught by caller
```

## 计时示例

使用 after 测量执行时间：

```typescript
store.$onAction(({ name, after, onError }) => {
  const start = performance.now()
  
  after(() => {
    const duration = performance.now() - start
    console.log(`${name} took ${duration.toFixed(2)}ms`)
  })
  
  onError(() => {
    const duration = performance.now() - start
    console.log(`${name} failed after ${duration.toFixed(2)}ms`)
  })
})
```

## 日志完整示例

```typescript
store.$onAction(({ name, store, args, after, onError }) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    action: name,
    args,
    storeId: store.$id,
  }
  
  console.log('[ACTION START]', logEntry)
  
  after((result) => {
    console.log('[ACTION SUCCESS]', {
      ...logEntry,
      result,
      duration: Date.now() - new Date(timestamp).getTime()
    })
  })
  
  onError((error) => {
    console.log('[ACTION ERROR]', {
      ...logEntry,
      error: error.message,
      duration: Date.now() - new Date(timestamp).getTime()
    })
  })
})
```

## 注意事项

args 是引用，修改可能影响 action：

```typescript
store.$onAction(({ args }) => {
  // ⚠️ 修改会影响 action 接收的参数
  args[0] = modifiedValue
})
```

除非有意为之，否则避免修改 args。

after/onError 回调不能是异步的：

```typescript
store.$onAction(({ after }) => {
  // ❌ 错误：异步回调不会等待
  after(async (result) => {
    await asyncOperation()
  })
  
  // ✅ 正确：可以在回调中启动异步操作，但不等待
  after((result) => {
    asyncOperation()  // fire-and-forget
  })
})
```

## 类型问题

args 和 result 的类型是 unknown[]：

```typescript
store.$onAction(({ args }) => {
  // args: unknown[]
  // 需要类型断言
  const [userId, data] = args as [string, UserData]
})
```

这是因为一个订阅可能监听多个不同的 action。

下一章我们将分析 $dispose 的实现。
