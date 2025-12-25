---
sidebar_position: 18
title: 清理函数（Teardown）设计
---

# 清理函数（Teardown）设计

Teardown 是 RxJS 资源管理的核心概念。本章深入探讨清理函数的设计原则和最佳实践。

## Teardown 是什么

Teardown 是 Observable 执行结束时需要运行的清理逻辑：

```typescript
const source$ = new Observable(subscriber => {
  const timer = setInterval(() => {
    subscriber.next(Date.now())
  }, 1000)

  // 返回 teardown
  return () => {
    clearInterval(timer)
  }
})
```

当订阅结束（complete、error 或 unsubscribe）时，teardown 会被执行。

## 为什么需要 Teardown

### 场景一：定时器

```typescript
const timer$ = new Observable(subscriber => {
  const id = setInterval(() => subscriber.next('tick'), 1000)
  
  return () => clearInterval(id)  // 必须清理，否则定时器永远运行
})
```

### 场景二：事件监听

```typescript
const click$ = new Observable(subscriber => {
  const handler = (e: MouseEvent) => subscriber.next(e)
  document.addEventListener('click', handler)
  
  return () => document.removeEventListener('click', handler)  // 必须移除监听
})
```

### 场景三：WebSocket

```typescript
const ws$ = new Observable(subscriber => {
  const ws = new WebSocket('wss://api.example.com')
  
  ws.onmessage = e => subscriber.next(e.data)
  ws.onerror = e => subscriber.error(e)
  ws.onclose = () => subscriber.complete()
  
  return () => ws.close()  // 必须关闭连接
})
```

### 场景四：请求取消

```typescript
const fetch$ = new Observable(subscriber => {
  const controller = new AbortController()
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      subscriber.next(data)
      subscriber.complete()
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        subscriber.error(err)
      }
    })
  
  return () => controller.abort()  // 取消请求
})
```

## TeardownLogic 类型

RxJS 支持多种 teardown 类型：

```typescript
type TeardownLogic =
  | (() => void)       // 清理函数
  | Unsubscribable     // 有 unsubscribe 方法的对象
  | Subscription       // Subscription 实例
  | void               // 无需清理
```

### 类型一：清理函数

最常用的形式：

```typescript
return () => {
  // 清理逻辑
}
```

### 类型二：Unsubscribable 对象

任何有 `unsubscribe` 方法的对象：

```typescript
return {
  unsubscribe() {
    // 清理逻辑
  }
}
```

### 类型三：Subscription

返回另一个订阅：

```typescript
const inner$ = someOther$.subscribe(subscriber)
return inner  // 取消时会自动取消 inner
```

### 类型四：void

不需要清理时可以不返回：

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
  // 不返回任何东西
})
```

## Teardown 执行时机

### 时机一：complete

数据流正常结束：

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.complete()
  
  return () => console.log('teardown')
})

source$.subscribe({
  complete: () => console.log('complete')
})

// 输出:
// complete
// teardown
```

### 时机二：error

数据流异常结束：

```typescript
const source$ = new Observable(subscriber => {
  subscriber.error(new Error('oops'))
  
  return () => console.log('teardown')
})

source$.subscribe({
  error: () => console.log('error')
})

// 输出:
// error
// teardown
```

### 时机三：unsubscribe

手动取消订阅：

```typescript
const source$ = new Observable(subscriber => {
  setInterval(() => subscriber.next('tick'), 1000)
  
  return () => console.log('teardown')
})

const sub = source$.subscribe(console.log)

setTimeout(() => {
  sub.unsubscribe()
}, 2500)

// 输出:
// tick
// tick
// teardown
```

## 设计原则

### 原则一：幂等性

teardown 应该可以安全地多次执行：

```typescript
// ❌ 非幂等
return () => {
  element.innerHTML = ''  // 第二次执行可能报错
}

// ✅ 幂等
let cleaned = false
return () => {
  if (cleaned) return
  cleaned = true
  element.innerHTML = ''
}
```

实际上 RxJS 保证 teardown 只执行一次，但幂等设计是良好习惯。

### 原则二：无副作用传播

teardown 不应该影响外部状态：

```typescript
// ❌ 有副作用
return () => {
  globalState.count--  // 影响全局状态
}

// ✅ 只清理自己创建的资源
return () => {
  clearInterval(myTimer)  // 只清理自己的定时器
}
```

### 原则三：错误处理

teardown 中的错误会被捕获并异步抛出：

```typescript
return () => {
  throw new Error('清理失败')  // 不会阻止其他清理
}
```

但最好还是避免在 teardown 中抛出错误：

```typescript
return () => {
  try {
    riskyCleanup()
  } catch (e) {
    console.error('清理失败:', e)
  }
}
```

### 原则四：同步执行

teardown 应该同步完成：

```typescript
// ❌ 异步清理
return async () => {
  await cleanup()  // 不保证完成
}

// ✅ 同步清理
return () => {
  cleanup()  // 立即完成
}
```

如果必须异步清理，考虑使用其他机制。

## 复杂场景处理

### 场景：多资源清理

```typescript
const source$ = new Observable(subscriber => {
  // 创建多个资源
  const timer = setInterval(() => subscriber.next('tick'), 1000)
  const handler = (e: Event) => subscriber.next(e)
  document.addEventListener('click', handler)
  const ws = new WebSocket('wss://example.com')

  // 清理所有资源
  return () => {
    clearInterval(timer)
    document.removeEventListener('click', handler)
    ws.close()
  }
})
```

### 场景：条件性资源

```typescript
const source$ = new Observable(subscriber => {
  let timer: number | undefined
  let ws: WebSocket | undefined

  if (usePolling) {
    timer = setInterval(() => fetch(), 5000)
  } else {
    ws = new WebSocket('wss://example.com')
  }

  return () => {
    // 条件性清理
    if (timer) clearInterval(timer)
    if (ws) ws.close()
  }
})
```

### 场景：使用 Subscription 管理

更优雅的方式是使用 Subscription：

```typescript
const source$ = new Observable(subscriber => {
  const cleanup = new Subscription()

  const timer = setInterval(() => subscriber.next('tick'), 1000)
  cleanup.add(() => clearInterval(timer))

  const handler = (e: Event) => subscriber.next(e)
  document.addEventListener('click', handler)
  cleanup.add(() => document.removeEventListener('click', handler))

  const ws = new WebSocket('wss://example.com')
  cleanup.add(() => ws.close())

  // 返回统一的 Subscription
  return cleanup
})
```

## 测试 Teardown

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Observable } from './Observable'

describe('Teardown', () => {
  it('complete 后应执行 teardown', () => {
    const teardown = vi.fn()
    const source$ = new Observable(subscriber => {
      subscriber.complete()
      return teardown
    })

    source$.subscribe({})

    expect(teardown).toHaveBeenCalledTimes(1)
  })

  it('error 后应执行 teardown', () => {
    const teardown = vi.fn()
    const source$ = new Observable(subscriber => {
      subscriber.error(new Error('test'))
      return teardown
    })

    source$.subscribe({ error: () => {} })

    expect(teardown).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe 应执行 teardown', () => {
    const teardown = vi.fn()
    const source$ = new Observable(subscriber => {
      return teardown
    })

    const sub = source$.subscribe({})
    expect(teardown).not.toHaveBeenCalled()

    sub.unsubscribe()
    expect(teardown).toHaveBeenCalledTimes(1)
  })

  it('支持返回 Subscription', () => {
    const innerTeardown = vi.fn()
    const source$ = new Observable(subscriber => {
      const inner = new Subscription(innerTeardown)
      return inner
    })

    const sub = source$.subscribe({})
    sub.unsubscribe()

    expect(innerTeardown).toHaveBeenCalled()
  })

  it('支持返回 Unsubscribable', () => {
    const unsubscribe = vi.fn()
    const source$ = new Observable(subscriber => {
      return { unsubscribe }
    })

    const sub = source$.subscribe({})
    sub.unsubscribe()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('teardown 只执行一次', () => {
    const teardown = vi.fn()
    const source$ = new Observable(subscriber => {
      return teardown
    })

    const sub = source$.subscribe({})
    sub.unsubscribe()
    sub.unsubscribe()
    sub.unsubscribe()

    expect(teardown).toHaveBeenCalledTimes(1)
  })
})
```

## 本章小结

本章深入探讨了 Teardown 设计：

- **定义**：Observable 执行结束时的清理逻辑
- **类型**：函数、Unsubscribable、Subscription、void
- **执行时机**：complete、error、unsubscribe
- **设计原则**：幂等、无副作用传播、错误处理、同步执行
- **复杂场景**：多资源清理、条件性资源、Subscription 管理

良好的 teardown 设计是防止资源泄漏的关键。下一章，我们将学习如何组合多个 Subscription。

---

**思考题**：

1. 如果 Observable 是同步的，teardown 会在 subscribe 返回前执行吗？
2. 如何设计一个能取消 Promise 的 teardown？
3. teardown 中的错误为什么要异步抛出而不是同步抛出？
