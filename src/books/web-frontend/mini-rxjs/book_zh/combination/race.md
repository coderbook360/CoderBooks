---
sidebar_position: 57
title: "race"
---

# race

`race` 选择第一个发射值的 Observable，忽略其他源。

## 基本用法

```javascript
const fast$ = timer(100).pipe(mapTo('fast'))
const slow$ = timer(500).pipe(mapTo('slow'))

race([fast$, slow$]).subscribe(console.log)
// 'fast'
// slow$ 被取消订阅
```

时间线：

```
fast$: --fast|
slow$: -----slow|
race:  --fast|
       (slow$ 取消订阅)
```

**关键特征**：第一个发射的源"获胜"，其他源立即取消。

## 实现 race

```javascript
function race(...sources) {
  // 支持数组或多参数
  if (sources.length === 1 && Array.isArray(sources[0])) {
    sources = sources[0]
  }

  return new Observable(subscriber => {
    const subscriptions = []
    let hasWinner = false

    sources.forEach((source, index) => {
      const subscription = source.subscribe({
        next(value) {
          if (!hasWinner) {
            hasWinner = true
            // 取消其他订阅
            subscriptions.forEach((s, i) => {
              if (i !== index) s.unsubscribe()
            })
          }
          subscriber.next(value)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          subscriber.complete()
        }
      })

      subscriptions.push(subscription)
    })

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
    }
  })
}
```

## 实战示例

### 请求超时

```javascript
const request$ = ajax('/api/data')
const timeout$ = timer(5000).pipe(
  switchMap(() => throwError(() => new Error('Timeout')))
)

race([request$, timeout$]).subscribe({
  next: data => handleData(data),
  error: err => handleError(err)
})
```

### 多源择优

```javascript
// 多个数据源，取最快响应的
const sources = [
  ajax('https://server1.com/api'),
  ajax('https://server2.com/api'),
  ajax('https://server3.com/api')
]

race(sources).subscribe(data => {
  console.log('Fastest server responded')
  useData(data)
})
```

### 用户取消

```javascript
const longOperation$ = performLongTask()
const cancelClick$ = fromEvent(cancelBtn, 'click').pipe(
  switchMap(() => throwError(() => new Error('Cancelled')))
)

race([longOperation$, cancelClick$]).subscribe({
  next: result => showResult(result),
  error: err => {
    if (err.message === 'Cancelled') {
      showCancelledMessage()
    }
  }
})
```

### 首次交互检测

```javascript
const click$ = fromEvent(document, 'click').pipe(take(1))
const keypress$ = fromEvent(document, 'keypress').pipe(take(1))
const scroll$ = fromEvent(document, 'scroll').pipe(take(1))

race([click$, keypress$, scroll$]).subscribe(event => {
  console.log('First interaction:', event.type)
  trackFirstInteraction(event.type)
})
```

## 静态 race vs 实例 raceWith

```javascript
// 静态方法
race([a$, b$, c$])

// 实例方法 (RxJS 7+)
a$.pipe(raceWith(b$, c$))
```

### 实现 raceWith

```javascript
function raceWith(...sources) {
  return (source) => race([source, ...sources])
}
```

## race vs merge

```javascript
const a$ = timer(100).pipe(mapTo('A'))
const b$ = timer(200).pipe(mapTo('B'))

// race: 只取第一个
race([a$, b$]).subscribe(console.log)
// 'A' (b$ 取消)

// merge: 取所有
merge(a$, b$).subscribe(console.log)
// 'A', 'B'
```

## 持续竞争

```javascript
// 注意：race 在第一个值后就确定了获胜者
const a$ = interval(1000).pipe(map(x => `A${x}`))
const b$ = interval(500).pipe(map(x => `B${x}`), delay(100))

race([a$, b$]).subscribe(console.log)
// B0, B1, B2, B3, ...
// (a$ 被取消，不会再发射)
```

如果需要每次都竞争：

```javascript
// 每次事件都竞争
trigger$.pipe(
  switchMap(() => race([
    source1$.pipe(take(1)),
    source2$.pipe(take(1))
  ]))
).subscribe(...)
```

## timeout 操作符

基于 race 的常用模式封装：

### 实现 timeout

```javascript
function timeout(config) {
  const { each, first, with: withObservable } = 
    typeof config === 'number' 
      ? { each: config } 
      : config

  return (source) => new Observable(subscriber => {
    let timeoutId
    let hasFirstValue = false
    const timeoutDuration = first ?? each

    function scheduleTimeout(duration) {
      clearTimeout(timeoutId)
      if (duration != null) {
        timeoutId = setTimeout(() => {
          if (withObservable) {
            withObservable.subscribe(subscriber)
          } else {
            subscriber.error(new Error('Timeout'))
          }
        }, duration)
      }
    }

    // 初始超时
    if (first != null || each != null) {
      scheduleTimeout(first ?? each)
    }

    const subscription = source.subscribe({
      next(value) {
        hasFirstValue = true
        subscriber.next(value)
        // 每次值后重新计时
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

使用示例：

```javascript
// 简单超时
ajax('/api/data').pipe(
  timeout(5000)
).subscribe({
  error: err => console.log('Timed out')
})

// 首个值超时 vs 每个值超时
source$.pipe(
  timeout({ first: 10000, each: 3000 })
)

// 超时后切换到备用
source$.pipe(
  timeout({ each: 5000, with: backupSource$ })
)
```

## 常见陷阱

### 同步源

```javascript
// 同步源第一个总是赢
race([
  of(1),  // 同步
  of(2)   // 永远不会被订阅
])
// 1
```

### 错误也是"赢"

```javascript
race([
  timer(100).pipe(switchMap(() => throwError(() => 'error'))),
  timer(200).pipe(mapTo('success'))
]).subscribe({
  error: err => console.log(err)  // 'error'
})
// 错误源先发射，其他取消
```

## TypeScript 类型

```typescript
function race<A extends readonly unknown[]>(
  inputs: [...ObservableInputTuple<A>]
): Observable<A[number]>

function raceWith<T, A extends readonly unknown[]>(
  ...inputs: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]>

interface TimeoutConfig<T, O extends ObservableInput<any>> {
  each?: number
  first?: number
  with?: O
}

function timeout<T>(
  config: number | TimeoutConfig<T, any>
): OperatorFunction<T, T>
```

## 本章小结

- `race` 选择第一个发射值的源
- 获胜后其他源被取消订阅
- 适合超时、多源竞争、用户取消
- `timeout` 操作符是 race 模式的封装

下一章实现 `partition` 操作符。
