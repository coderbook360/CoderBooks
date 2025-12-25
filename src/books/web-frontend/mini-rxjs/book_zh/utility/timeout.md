---
sidebar_position: 73
title: "timeout 与 timeInterval"
---

# timeout 与 timeInterval

`timeout` 在超时时报错，`timeInterval` 测量值之间的时间间隔。

## timeout

超时未收到值则报错：

```javascript
ajax('/api/slow').pipe(
  timeout(5000)
).subscribe({
  error: err => console.log('Timed out!')
})
```

### 实现 timeout

```javascript
function timeout(config) {
  const {
    each,
    first = each,
    with: withObservable
  } = typeof config === 'number' ? { each: config } : config

  return (source) => new Observable(subscriber => {
    let timeoutId = null
    let hasFirstValue = false

    function scheduleTimeout(duration) {
      clearTimeout(timeoutId)
      if (duration != null) {
        timeoutId = setTimeout(() => {
          if (withObservable) {
            withObservable().subscribe(subscriber)
          } else {
            subscriber.error(new Error('Timeout'))
          }
        }, duration)
      }
    }

    // 初始超时
    scheduleTimeout(first)

    const subscription = source.subscribe({
      next(value) {
        hasFirstValue = true
        clearTimeout(timeoutId)
        subscriber.next(value)
        // 为下一个值设置超时
        if (each != null) {
          scheduleTimeout(each)
        }
      },
      error(err) {
        clearTimeout(timeoutId)
        subscriber.error(err)
      },
      complete() {
        clearTimeout(timeoutId)
        subscriber.complete()
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  })
}
```

### timeout 配置

```javascript
// 简单超时：每个值都必须在5秒内
source$.pipe(timeout(5000))

// 首个值超时
source$.pipe(
  timeout({ first: 10000 })  // 第一个值必须在10秒内
)

// 每个值超时
source$.pipe(
  timeout({ each: 3000 })  // 后续每个值必须在3秒内
)

// 首个和后续分开
source$.pipe(
  timeout({ first: 10000, each: 3000 })
)

// 超时后切换
source$.pipe(
  timeout({
    each: 5000,
    with: () => of('fallback')
  })
)
```

## 实战示例

### API 超时

```javascript
function fetchWithTimeout(url, timeoutMs = 5000) {
  return ajax(url).pipe(
    timeout(timeoutMs),
    catchError(err => {
      if (err.message === 'Timeout') {
        return throwError(() => new Error(`Request to ${url} timed out`))
      }
      return throwError(() => err)
    })
  )
}
```

### WebSocket 心跳

```javascript
const ws$ = websocket.messages$

ws$.pipe(
  timeout({
    each: 30000,  // 30秒内必须收到消息
    with: () => {
      console.log('Connection seems dead, reconnecting...')
      return reconnect()
    }
  })
)
```

### 用户活动检测

```javascript
const userActivity$ = merge(
  fromEvent(document, 'mousemove'),
  fromEvent(document, 'keydown'),
  fromEvent(document, 'click')
)

userActivity$.pipe(
  timeout({
    each: 5 * 60 * 1000,  // 5分钟
    with: () => {
      showIdleWarning()
      return userActivity$.pipe(take(1))
    }
  })
).subscribe()
```

## timeInterval

测量值之间的时间间隔：

```javascript
interval(1000).pipe(
  timeInterval()
).subscribe(console.log)
// { value: 0, interval: 1003 }
// { value: 1, interval: 1001 }
// { value: 2, interval: 999 }
```

### 实现 timeInterval

```javascript
function timeInterval() {
  return (source) => new Observable(subscriber => {
    let lastTime = Date.now()

    return source.subscribe({
      next(value) {
        const now = Date.now()
        const interval = now - lastTime
        lastTime = now
        subscriber.next({ value, interval })
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })
  })
}
```

### 使用场景

```javascript
// 检测卡顿
source$.pipe(
  timeInterval(),
  filter(({ interval }) => interval > 100)
).subscribe(({ value, interval }) => {
  console.warn(`Slow emission: ${interval}ms`, value)
})

// 计算吞吐量
messages$.pipe(
  timeInterval(),
  scan((stats, { interval }) => ({
    count: stats.count + 1,
    totalTime: stats.totalTime + interval,
    avgInterval: (stats.totalTime + interval) / (stats.count + 1)
  }), { count: 0, totalTime: 0, avgInterval: 0 })
).subscribe(stats => {
  console.log(`Average interval: ${stats.avgInterval}ms`)
})
```

## timestamp

为每个值添加时间戳：

```javascript
source$.pipe(
  timestamp()
).subscribe(console.log)
// { value: 'a', timestamp: 1234567890123 }
```

### 实现 timestamp

```javascript
function timestamp() {
  return map(value => ({
    value,
    timestamp: Date.now()
  }))
}
```

### 使用场景

```javascript
// 事件记录
events$.pipe(
  timestamp(),
  tap(({ value, timestamp }) => {
    logEvent(value, timestamp)
  })
)

// 计算延迟
const sent$ = sendMessage$.pipe(timestamp())
const received$ = receiveMessage$.pipe(timestamp())

zip(sent$, received$).pipe(
  map(([sent, received]) => ({
    message: sent.value,
    latency: received.timestamp - sent.timestamp
  }))
)
```

## timeoutWith（已废弃）

RxJS 7 之前的写法，现在使用 `timeout({ with })` 替代：

```javascript
// 旧写法
source$.pipe(
  timeoutWith(5000, of('fallback'))
)

// 新写法
source$.pipe(
  timeout({ each: 5000, with: () => of('fallback') })
)
```

## 组合使用

```javascript
// 带超时和重试的请求
function robustFetch(url) {
  return ajax(url).pipe(
    timeout({
      each: 5000,
      with: () => throwError(() => new Error('Timeout'))
    }),
    retry(3),
    catchError(err => {
      console.error('All retries failed:', err)
      return of(null)
    })
  )
}

// 带性能追踪的流
source$.pipe(
  timestamp(),
  tap(({ value, timestamp }) => {
    metrics.record('emission', timestamp)
  }),
  timeInterval(),
  tap(({ interval }) => {
    if (interval > 1000) {
      console.warn('Slow stream')
    }
  }),
  map(({ value }) => value.value)  // 解包
)
```

## 常见陷阱

### 超时与重试

```javascript
// 问题：每次重试都重置超时
ajax('/api').pipe(
  timeout(5000),
  retry(3)  // 每次重试有5秒
)
// 最长可能等待 5 * 4 = 20 秒

// 如果需要总体超时
race([
  ajax('/api').pipe(retry(3)),
  timer(10000).pipe(switchMap(() => throwError(() => new Error('Total timeout'))))
])
```

### timeout 位置

```javascript
// 在 switchMap 外：整个流超时
source$.pipe(
  switchMap(x => slowRequest(x)),
  timeout(5000)
)

// 在 switchMap 内：每个请求超时
source$.pipe(
  switchMap(x => 
    slowRequest(x).pipe(timeout(5000))
  )
)
```

## TypeScript 类型

```typescript
interface TimeoutConfig<T, R> {
  each?: number
  first?: number
  with?: () => ObservableInput<R>
}

function timeout<T>(
  config: number | TimeoutConfig<T, any>
): OperatorFunction<T, T>

interface TimeInterval<T> {
  value: T
  interval: number
}

function timeInterval<T>(): OperatorFunction<T, TimeInterval<T>>

interface Timestamp<T> {
  value: T
  timestamp: number
}

function timestamp<T>(): OperatorFunction<T, Timestamp<T>>
```

## 本章小结

- `timeout` 在超时时报错或切换
- `timeInterval` 测量值间隔
- `timestamp` 添加时间戳
- 适合检测卡顿、心跳检测、性能监控

下一章实现 `observeOn` 和 `subscribeOn` 调度操作符。
