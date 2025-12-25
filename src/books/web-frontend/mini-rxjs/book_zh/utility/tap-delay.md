---
sidebar_position: 72
title: "tap 与 delay"
---

# tap 与 delay

`tap` 用于执行副作用，`delay` 用于延迟发射。

## tap

执行副作用但不改变值：

```javascript
of(1, 2, 3).pipe(
  tap(x => console.log('Before:', x)),
  map(x => x * 2),
  tap(x => console.log('After:', x))
).subscribe()
// Before: 1, After: 2
// Before: 2, After: 4
// Before: 3, After: 6
```

### 实现 tap

```javascript
function tap(observerOrNext, error, complete) {
  const observer = typeof observerOrNext === 'function'
    ? { next: observerOrNext, error, complete }
    : observerOrNext

  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        observer.next?.(value)
        subscriber.next(value)
      },
      error(err) {
        observer.error?.(err)
        subscriber.error(err)
      },
      complete() {
        observer.complete?.()
        subscriber.complete()
      }
    })
  })
}
```

### 完整 observer 形式

```javascript
source$.pipe(
  tap({
    next: value => console.log('Value:', value),
    error: err => console.log('Error:', err),
    complete: () => console.log('Complete'),
    subscribe: () => console.log('Subscribed'),
    unsubscribe: () => console.log('Unsubscribed'),
    finalize: () => console.log('Finalized')
  })
)
```

### tap 使用场景

```javascript
// 日志
source$.pipe(
  tap(x => console.log('Received:', x))
)

// 更新 UI
source$.pipe(
  tap(data => renderData(data))
)

// 缓存
source$.pipe(
  tap(data => cache.set(key, data))
)

// 追踪
source$.pipe(
  tap(event => analytics.track(event))
)
```

## delay

延迟发射所有值：

```javascript
of(1, 2, 3).pipe(
  delay(1000)
).subscribe(console.log)
// (1秒后) 1, 2, 3
```

时间线：

```
source$: (1)(2)(3)|
delay:   ---------(1)(2)(3)|
                  ^1秒延迟
```

### 实现 delay

```javascript
function delay(delayTime) {
  return (source) => new Observable(subscriber => {
    const subscription = source.subscribe({
      next(value) {
        setTimeout(() => {
          subscriber.next(value)
        }, delayTime)
      },
      error(err) {
        setTimeout(() => {
          subscriber.error(err)
        }, delayTime)
      },
      complete() {
        setTimeout(() => {
          subscriber.complete()
        }, delayTime)
      }
    })

    return subscription
  })
}
```

### delay vs debounceTime

```javascript
// delay: 所有值延迟相同时间
of(1, 2, 3).pipe(delay(1000))
// 1秒后: 1, 2, 3

// debounceTime: 等待静默期
of(1, 2, 3).pipe(debounceTime(1000))
// 1秒后: 3（只有最后一个）
```

## delayWhen

动态延迟：

```javascript
source$.pipe(
  delayWhen(value => timer(value * 100))
)
// 每个值延迟不同时间
```

### 实现 delayWhen

```javascript
function delayWhen(delayDurationSelector) {
  return (source) => new Observable(subscriber => {
    let pendingComplete = false
    let activeCount = 0

    const subscription = source.subscribe({
      next(value) {
        activeCount++
        const delayDuration$ = delayDurationSelector(value)
        
        delayDuration$.pipe(take(1)).subscribe({
          next() {
            subscriber.next(value)
            activeCount--
            if (pendingComplete && activeCount === 0) {
              subscriber.complete()
            }
          }
        })
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        pendingComplete = true
        if (activeCount === 0) {
          subscriber.complete()
        }
      }
    })

    return subscription
  })
}
```

使用示例：

```javascript
// 根据优先级延迟
messages$.pipe(
  delayWhen(msg => timer(msg.priority * 100))
)

// 随机延迟
source$.pipe(
  delayWhen(() => timer(Math.random() * 1000))
)
```

## 实战示例

### 加载提示

```javascript
// 至少显示加载动画500ms
function fetchWithMinLoading(url) {
  showLoading()
  
  return forkJoin([
    ajax(url),
    timer(500)  // 最少等待500ms
  ]).pipe(
    map(([response]) => response),
    finalize(() => hideLoading())
  )
}
```

### 请求节流

```javascript
// 防止请求过快
let lastRequest = 0
const MIN_INTERVAL = 1000

source$.pipe(
  delayWhen(() => {
    const now = Date.now()
    const waitTime = Math.max(0, lastRequest + MIN_INTERVAL - now)
    lastRequest = now + waitTime
    return timer(waitTime)
  })
)
```

### 动画序列

```javascript
of('fadeIn', 'slideUp', 'bounce').pipe(
  concatMap((animation, index) =>
    of(animation).pipe(delay(index * 300))
  )
).subscribe(animation => {
  playAnimation(animation)
})
```

### 调试流

```javascript
const debug = (label) => tap({
  subscribe: () => console.log(`[${label}] Subscribed`),
  next: v => console.log(`[${label}] Value:`, v),
  error: e => console.log(`[${label}] Error:`, e),
  complete: () => console.log(`[${label}] Complete`),
  unsubscribe: () => console.log(`[${label}] Unsubscribed`)
})

source$.pipe(
  debug('Step 1'),
  map(x => x * 2),
  debug('Step 2'),
  filter(x => x > 5),
  debug('Step 3')
)
```

### 性能追踪

```javascript
function trackPerformance(name) {
  let startTime
  
  return tap({
    subscribe: () => {
      startTime = performance.now()
      console.log(`[${name}] Started`)
    },
    next: v => {
      const elapsed = performance.now() - startTime
      console.log(`[${name}] Value at ${elapsed.toFixed(2)}ms:`, v)
    },
    complete: () => {
      const elapsed = performance.now() - startTime
      console.log(`[${name}] Completed in ${elapsed.toFixed(2)}ms`)
    }
  })
}

source$.pipe(
  trackPerformance('MyOperation')
)
```

## 常见陷阱

### tap 中的异步操作

```javascript
// 问题：tap 不等待异步
source$.pipe(
  tap(async data => {
    await saveToDatabase(data)  // 不会等待
  })
)

// 解决：使用 mergeMap/concatMap
source$.pipe(
  concatMap(data => 
    from(saveToDatabase(data)).pipe(
      mapTo(data)
    )
  )
)
```

### delay 与 取消订阅

```javascript
// 注意：delay 中的 setTimeout 需要清理
// 上面的简单实现没有处理这个问题

// 完整实现
function delay(delayTime) {
  return (source) => new Observable(subscriber => {
    const timers = []
    
    const subscription = source.subscribe({
      next(value) {
        const timerId = setTimeout(() => {
          subscriber.next(value)
        }, delayTime)
        timers.push(timerId)
      },
      // ...
    })

    return () => {
      timers.forEach(clearTimeout)
      subscription.unsubscribe()
    }
  })
}
```

## TypeScript 类型

```typescript
interface TapObserver<T> {
  next?: (value: T) => void
  error?: (err: any) => void
  complete?: () => void
  subscribe?: () => void
  unsubscribe?: () => void
  finalize?: () => void
}

function tap<T>(
  next?: (value: T) => void
): OperatorFunction<T, T>

function tap<T>(
  observer: TapObserver<T>
): OperatorFunction<T, T>

function delay<T>(
  delayMs: number
): OperatorFunction<T, T>

function delayWhen<T>(
  delayDurationSelector: (value: T) => Observable<any>
): OperatorFunction<T, T>
```

## 本章小结

- `tap` 执行副作用，不改变流
- 支持完整的 observer 配置
- `delay` 延迟所有发射
- `delayWhen` 提供动态延迟能力
- 适合日志、调试、追踪等场景

下一章实现 `timeout` 和 `timeInterval` 操作符。
