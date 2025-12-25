---
sidebar_position: 70
title: "throwError 与 finalize"
---

# throwError 与 finalize

`throwError` 创建一个立即报错的 Observable，`finalize` 在流结束时执行清理。

## throwError

```javascript
throwError(() => new Error('Something went wrong'))
  .subscribe({
    error: err => console.log(err.message)
  })
// 'Something went wrong'
```

### 实现 throwError

```javascript
function throwError(errorFactory) {
  return new Observable(subscriber => {
    const error = typeof errorFactory === 'function' 
      ? errorFactory() 
      : errorFactory
    subscriber.error(error)
  })
}
```

### 为什么用工厂函数

```javascript
// 旧方式（已废弃）
throwError(new Error('oops'))  // 错误对象在创建时生成

// 新方式（推荐）
throwError(() => new Error('oops'))  // 错误在订阅时生成

// 区别：延迟求值
const error$ = throwError(() => new Error(`Time: ${Date.now()}`))

// 每次订阅都有新的时间戳
error$.subscribe({ error: console.log })  // Time: 1234567890
error$.subscribe({ error: console.log })  // Time: 1234567891
```

### 使用场景

```javascript
// 条件错误
source$.pipe(
  switchMap(value => {
    if (!value) {
      return throwError(() => new Error('Value required'))
    }
    return processValue(value)
  })
)

// API 错误转换
ajax('/api/data').pipe(
  switchMap(response => {
    if (response.status !== 200) {
      return throwError(() => new Error(`HTTP ${response.status}`))
    }
    return of(response.data)
  })
)
```

## finalize

无论成功、失败或取消订阅，都执行清理：

```javascript
source$.pipe(
  finalize(() => {
    console.log('Cleanup!')
  })
).subscribe({
  complete: () => console.log('Complete'),
  error: () => console.log('Error')
})
```

### 实现 finalize

```javascript
function finalize(callback) {
  return (source) => new Observable(subscriber => {
    const subscription = source.subscribe({
      next(value) {
        subscriber.next(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => {
      subscription.unsubscribe()
      callback()  // 在取消订阅时执行
    }
  })
}
```

更完整的实现（错误和完成时也调用）：

```javascript
function finalize(callback) {
  return (source) => new Observable(subscriber => {
    let hasFinalized = false

    function fin() {
      if (!hasFinalized) {
        hasFinalized = true
        callback()
      }
    }

    const subscription = source.subscribe({
      next(value) {
        subscriber.next(value)
      },
      error(err) {
        fin()
        subscriber.error(err)
      },
      complete() {
        fin()
        subscriber.complete()
      }
    })

    return () => {
      fin()
      subscription.unsubscribe()
    }
  })
}
```

### 触发时机

```javascript
// 成功完成
of(1, 2, 3).pipe(
  finalize(() => console.log('finalize'))
).subscribe({ complete: () => console.log('complete') })
// 1, 2, 3, complete, finalize

// 错误
throwError(() => new Error('oops')).pipe(
  finalize(() => console.log('finalize'))
).subscribe({ error: () => console.log('error') })
// error, finalize

// 取消订阅
const sub = interval(1000).pipe(
  finalize(() => console.log('finalize'))
).subscribe()
setTimeout(() => sub.unsubscribe(), 2500)
// 0, 1, finalize
```

## 实战示例

### 加载状态

```javascript
function fetchWithLoading(url) {
  showLoading()
  
  return ajax(url).pipe(
    finalize(() => hideLoading())
  )
}

fetchWithLoading('/api/data').subscribe({
  next: data => render(data),
  error: err => showError(err)
})
// 无论成功还是失败，loading 都会隐藏
```

### 资源清理

```javascript
function createConnection() {
  const ws = new WebSocket('ws://example.com')
  
  return new Observable(subscriber => {
    ws.onmessage = e => subscriber.next(e.data)
    ws.onerror = e => subscriber.error(e)
    ws.onclose = () => subscriber.complete()
    
    return () => ws.close()
  }).pipe(
    finalize(() => {
      console.log('Connection cleaned up')
    })
  )
}
```

### 计时器

```javascript
function timedOperation() {
  const startTime = Date.now()
  
  return source$.pipe(
    finalize(() => {
      const duration = Date.now() - startTime
      console.log(`Operation took ${duration}ms`)
    })
  )
}
```

### 多个 finalize

```javascript
source$.pipe(
  finalize(() => console.log('Finalize 1')),
  map(x => x * 2),
  finalize(() => console.log('Finalize 2')),
  filter(x => x > 10),
  finalize(() => console.log('Finalize 3'))
)
// 按管道顺序依次执行：Finalize 3, Finalize 2, Finalize 1
```

## tap 的 finalize 回调

`tap` 也支持 finalize：

```javascript
source$.pipe(
  tap({
    next: v => console.log('Value:', v),
    error: e => console.log('Error:', e),
    complete: () => console.log('Complete'),
    finalize: () => console.log('Finalize')
  })
)
```

## 错误处理完整模式

```javascript
function robustFetch(url) {
  return ajax(url).pipe(
    // 重试
    retry({
      count: 3,
      delay: (error, retryCount) => {
        const delay = Math.pow(2, retryCount) * 1000
        console.log(`Retry ${retryCount} in ${delay}ms`)
        return timer(delay)
      }
    }),
    // 最终失败的处理
    catchError(err => {
      logError(err)
      return throwError(() => new Error('Request failed after retries'))
    }),
    // 清理
    finalize(() => {
      console.log('Request completed')
    })
  )
}
```

## NEVER 和 EMPTY

相关的常量 Observable：

```javascript
// NEVER: 永不发射、永不完成、永不报错
const NEVER = new Observable(() => {})

// EMPTY: 立即完成，不发射任何值
const EMPTY = new Observable(subscriber => {
  subscriber.complete()
})

// 使用场景
source$.pipe(
  switchMap(value => {
    if (!value) return EMPTY    // 静默跳过
    if (condition) return NEVER  // 挂起
    return processValue(value)
  })
)
```

## TypeScript 类型

```typescript
function throwError<T>(
  errorFactory: () => any
): Observable<T>

function throwError<T>(
  error: any
): Observable<T>

function finalize<T>(
  callback: () => void
): OperatorFunction<T, T>

declare const NEVER: Observable<never>
declare const EMPTY: Observable<never>
```

## 本章小结

- `throwError` 创建立即报错的 Observable
- 使用工厂函数延迟创建错误
- `finalize` 在流结束时清理资源
- `finalize` 对成功、失败、取消都有效
- `EMPTY` 和 `NEVER` 是常用辅助常量

下一章实现 `onErrorResumeNext` 和 `timeout` 操作符。
