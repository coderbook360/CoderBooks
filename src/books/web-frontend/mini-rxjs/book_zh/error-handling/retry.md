---
sidebar_position: 69
title: "retry 与 retryWhen"
---

# retry 与 retryWhen

`retry` 在错误时重新订阅源 Observable。

## retry 基本用法

```javascript
ajax('/api/data').pipe(
  retry(3)  // 最多重试3次
).subscribe({
  next: data => console.log(data),
  error: err => console.log('Failed after 3 retries')
})
```

时间线：

```
source$: --1--X
retry 1:      --1--X
retry 2:           --1--X
retry 3:                --1--2--|
输出:    --1-----1-----1-----1--2--|
```

## 实现 retry

```javascript
function retry(count = Infinity) {
  return (source) => new Observable(subscriber => {
    let retries = 0
    let subscription

    function subscribe() {
      subscription = source.subscribe({
        next(value) {
          subscriber.next(value)
        },
        error(err) {
          retries++
          if (retries <= count) {
            subscribe()  // 重新订阅
          } else {
            subscriber.error(err)
          }
        },
        complete() {
          subscriber.complete()
        }
      })
    }

    subscribe()

    return () => {
      subscription.unsubscribe()
    }
  })
}
```

## retry 配置对象

RxJS 7+ 支持配置对象：

```javascript
source$.pipe(
  retry({
    count: 3,
    delay: 1000,  // 重试间隔
    resetOnSuccess: true  // 成功后重置计数
  })
)
```

### 实现配置版 retry

```javascript
function retry(config = {}) {
  const {
    count = Infinity,
    delay: delayTime = 0,
    resetOnSuccess = false
  } = typeof config === 'number' ? { count: config } : config

  return (source) => new Observable(subscriber => {
    let retries = 0
    let subscription

    function subscribe() {
      subscription = source.subscribe({
        next(value) {
          if (resetOnSuccess) {
            retries = 0
          }
          subscriber.next(value)
        },
        error(err) {
          retries++
          if (retries <= count) {
            if (delayTime > 0) {
              setTimeout(subscribe, delayTime)
            } else {
              subscribe()
            }
          } else {
            subscriber.error(err)
          }
        },
        complete() {
          subscriber.complete()
        }
      })
    }

    subscribe()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  })
}
```

## retryWhen

更灵活的重试策略：

```javascript
source$.pipe(
  retryWhen(errors$ => 
    errors$.pipe(
      delay(1000),  // 每次错误后等1秒再重试
      take(3)       // 最多3次
    )
  )
)
```

### 实现 retryWhen

```javascript
function retryWhen(notifier) {
  return (source) => new Observable(subscriber => {
    let subscription
    const errors$ = new Subject()
    let retriesComplete = false

    const notifierSubscription = notifier(errors$).subscribe({
      next() {
        // 收到信号，重新订阅
        if (subscription) {
          subscription.unsubscribe()
        }
        subscribe()
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        retriesComplete = true
      }
    })

    function subscribe() {
      subscription = source.subscribe({
        next(value) {
          subscriber.next(value)
        },
        error(err) {
          if (retriesComplete) {
            subscriber.error(err)
          } else {
            errors$.next(err)  // 发送错误到 notifier
          }
        },
        complete() {
          subscriber.complete()
        }
      })
    }

    subscribe()

    return () => {
      errors$.complete()
      notifierSubscription.unsubscribe()
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  })
}
```

## 实战示例

### 指数退避

```javascript
source$.pipe(
  retryWhen(errors$ => 
    errors$.pipe(
      mergeMap((err, i) => {
        const retryAttempt = i + 1
        if (retryAttempt > 3) {
          return throwError(() => err)
        }
        const delay = Math.pow(2, retryAttempt) * 1000
        console.log(`Retry ${retryAttempt} in ${delay}ms`)
        return timer(delay)
      })
    )
  )
)
```

封装为可复用函数：

```javascript
function retryWithBackoff(maxRetries = 3, baseDelay = 1000) {
  return retryWhen(errors$ =>
    errors$.pipe(
      mergeMap((err, i) => {
        const attempt = i + 1
        if (attempt > maxRetries) {
          return throwError(() => err)
        }
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          30000  // 最大30秒
        )
        return timer(delay)
      })
    )
  )
}

// 使用
ajax('/api/data').pipe(
  retryWithBackoff(3, 1000)
)
```

### 条件重试

```javascript
source$.pipe(
  retryWhen(errors$ =>
    errors$.pipe(
      mergeMap(err => {
        // 只重试网络错误
        if (err.name === 'NetworkError') {
          return timer(1000)
        }
        // 其他错误直接抛出
        return throwError(() => err)
      }),
      take(3)
    )
  )
)
```

### 带确认的重试

```javascript
source$.pipe(
  retryWhen(errors$ =>
    errors$.pipe(
      switchMap(err => 
        showConfirmDialog(`请求失败: ${err.message}，是否重试？`).pipe(
          switchMap(confirmed => 
            confirmed ? of(true) : throwError(() => err)
          )
        )
      )
    )
  )
)
```

### 重试时更新 UI

```javascript
let retryCount = 0

ajax('/api/data').pipe(
  tap({
    subscribe: () => {
      showLoading()
      retryCount = 0
    }
  }),
  retryWhen(errors$ =>
    errors$.pipe(
      tap(() => {
        retryCount++
        showRetryMessage(`重试中... (${retryCount}/3)`)
      }),
      delay(2000),
      take(3)
    )
  ),
  finalize(() => hideLoading())
)
```

## repeat

成功完成后重新订阅（与 retry 相对）：

```javascript
source$.pipe(
  repeat(3)  // 成功完成后重复3次
)
```

### 实现 repeat

```javascript
function repeat(count = Infinity) {
  return (source) => new Observable(subscriber => {
    let repeats = 0
    let subscription

    function subscribe() {
      subscription = source.subscribe({
        next(value) {
          subscriber.next(value)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          repeats++
          if (repeats < count) {
            subscribe()
          } else {
            subscriber.complete()
          }
        }
      })
    }

    subscribe()

    return () => {
      subscription.unsubscribe()
    }
  })
}
```

## retry + repeat

```javascript
// 重试失败的请求，成功后继续轮询
interval(10000).pipe(
  switchMap(() => 
    ajax('/api/status').pipe(
      retry(3)  // 失败重试3次
    )
  ),
  repeat()  // 无限重复
)
```

## 常见陷阱

### 无限重试

```javascript
// 危险：永远重试
source$.pipe(
  retry()  // 默认 Infinity
)

// 总是设置上限
source$.pipe(
  retry(5)
)
```

### 重试热源

```javascript
// 注意：retry 重新订阅，对热源可能无意义
hotSource$.pipe(
  retry(3)  // 热源不会"重播"
)

// 对于热源，考虑缓存或使用 shareReplay
hotSource$.pipe(
  shareReplay(1),
  retry(3)
)
```

## TypeScript 类型

```typescript
interface RetryConfig {
  count?: number
  delay?: number | ((error: any, retryCount: number) => Observable<any>)
  resetOnSuccess?: boolean
}

function retry<T>(count?: number): OperatorFunction<T, T>
function retry<T>(config: RetryConfig): OperatorFunction<T, T>

function retryWhen<T>(
  notifier: (errors: Observable<any>) => Observable<any>
): OperatorFunction<T, T>

function repeat<T>(count?: number): OperatorFunction<T, T>
```

## 本章小结

- `retry` 简单重试固定次数
- `retryWhen` 提供完全控制的重试策略
- 指数退避是常用模式
- 注意设置重试上限

下一章实现 `throwError` 和 `finalize` 操作符。
