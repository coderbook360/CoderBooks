---
sidebar_position: 66
title: "window 与 windowTime"
---

# window 与 windowTime

`window` 将源值收集到嵌套的 Observable 窗口中，类似 `buffer`，但返回 Observable 而非数组。

## window

根据通知信号分割窗口：

```javascript
const source$ = interval(100)
const notifier$ = interval(400)

source$.pipe(
  window(notifier$),
  mergeMap((window$, i) => 
    window$.pipe(
      toArray(),
      map(values => `Window ${i}: [${values}]`)
    )
  )
).subscribe(console.log)
// Window 0: [0,1,2,3]
// Window 1: [4,5,6,7]
// Window 2: [8,9,10,11]
```

时间线：

```
source$:   0-1-2-3-4-5-6-7-8-9-->
notifier$: ----n-------n-------n-->
windows:   |----0-1-2-3|
               |---4-5-6-7|
                       |---8-9-->
```

### 实现 window

```javascript
function window(notifier) {
  return (source) => new Observable(subscriber => {
    let currentWindow = new Subject()
    subscriber.next(currentWindow.asObservable())

    const sourceSubscription = source.subscribe({
      next(value) {
        currentWindow.next(value)
      },
      error(err) {
        currentWindow.error(err)
        subscriber.error(err)
      },
      complete() {
        currentWindow.complete()
        subscriber.complete()
      }
    })

    const notifierSubscription = notifier.subscribe({
      next() {
        currentWindow.complete()
        currentWindow = new Subject()
        subscriber.next(currentWindow.asObservable())
      },
      error(err) {
        currentWindow.error(err)
        subscriber.error(err)
      }
    })

    return () => {
      currentWindow.complete()
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

## windowTime

按时间间隔分割窗口：

```javascript
source$.pipe(
  windowTime(1000),  // 每秒一个窗口
  mergeMap(window$ => window$.pipe(toArray()))
).subscribe(console.log)
```

### 实现 windowTime

```javascript
function windowTime(windowTimeSpan, windowCreationInterval) {
  return (source) => new Observable(subscriber => {
    let currentWindow = new Subject()
    subscriber.next(currentWindow.asObservable())

    // 窗口时间到，开启新窗口
    const intervalId = setInterval(() => {
      currentWindow.complete()
      currentWindow = new Subject()
      subscriber.next(currentWindow.asObservable())
    }, windowCreationInterval || windowTimeSpan)

    const subscription = source.subscribe({
      next(value) {
        currentWindow.next(value)
      },
      error(err) {
        clearInterval(intervalId)
        currentWindow.error(err)
        subscriber.error(err)
      },
      complete() {
        clearInterval(intervalId)
        currentWindow.complete()
        subscriber.complete()
      }
    })

    return () => {
      clearInterval(intervalId)
      currentWindow.complete()
      subscription.unsubscribe()
    }
  })
}
```

## windowCount

按数量分割窗口：

```javascript
source$.pipe(
  windowCount(3),  // 每3个值一个窗口
  mergeMap(window$ => window$.pipe(toArray()))
).subscribe(console.log)
// [1,2,3], [4,5,6], [7,8,9]...
```

### 实现 windowCount

```javascript
function windowCount(windowSize, startWindowEvery = windowSize) {
  return (source) => new Observable(subscriber => {
    let windows = []
    let count = 0

    function createWindow() {
      const window = new Subject()
      windows.push(window)
      subscriber.next(window.asObservable())
    }

    createWindow()

    const subscription = source.subscribe({
      next(value) {
        // 发射到所有活跃窗口
        windows.forEach(w => w.next(value))
        count++

        // 检查是否需要关闭窗口
        const windowsToClose = windows.filter((_, i) => 
          count - i * startWindowEvery >= windowSize
        )
        windowsToClose.forEach(w => {
          w.complete()
          windows = windows.filter(x => x !== w)
        })

        // 检查是否需要开启新窗口
        if (count % startWindowEvery === 0) {
          createWindow()
        }
      },
      error(err) {
        windows.forEach(w => w.error(err))
        subscriber.error(err)
      },
      complete() {
        windows.forEach(w => w.complete())
        subscriber.complete()
      }
    })

    return () => {
      windows.forEach(w => w.complete())
      subscription.unsubscribe()
    }
  })
}
```

## windowToggle

开关控制窗口：

```javascript
const opens$ = fromEvent(openBtn, 'click')
const closes$ = fromEvent(closeBtn, 'click')

source$.pipe(
  windowToggle(opens$, () => closes$),
  mergeMap(window$ => window$.pipe(toArray()))
).subscribe(console.log)
```

### 实现 windowToggle

```javascript
function windowToggle(openings, closingSelector) {
  return (source) => new Observable(subscriber => {
    const windows = []

    const openSubscription = openings.subscribe({
      next(openValue) {
        const window = new Subject()
        windows.push(window)
        subscriber.next(window.asObservable())

        const closing$ = closingSelector(openValue)
        closing$.pipe(take(1)).subscribe({
          complete() {
            window.complete()
            const index = windows.indexOf(window)
            if (index !== -1) {
              windows.splice(index, 1)
            }
          }
        })
      }
    })

    const sourceSubscription = source.subscribe({
      next(value) {
        windows.forEach(w => w.next(value))
      },
      error(err) {
        windows.forEach(w => w.error(err))
        subscriber.error(err)
      },
      complete() {
        windows.forEach(w => w.complete())
        subscriber.complete()
      }
    })

    return () => {
      windows.forEach(w => w.complete())
      openSubscription.unsubscribe()
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 实战示例

### 实时统计

```javascript
// 每秒统计点击率
fromEvent(document, 'click').pipe(
  windowTime(1000),
  mergeMap(window$ => window$.pipe(count())),
).subscribe(clicksPerSecond => {
  console.log(`Clicks per second: ${clicksPerSecond}`)
})
```

### 滑动窗口分析

```javascript
// 滑动窗口：每个元素开启新窗口，持续5秒
source$.pipe(
  windowTime(5000, 1000),  // 5秒窗口，1秒间隔
  mergeMap(window$ => 
    window$.pipe(
      toArray(),
      map(values => calculateMetrics(values))
    )
  )
).subscribe(metrics => {
  updateDashboard(metrics)
})
```

### 批量处理

```javascript
// 收集请求，批量发送
requests$.pipe(
  windowTime(100),
  mergeMap(window$ => 
    window$.pipe(
      toArray(),
      filter(batch => batch.length > 0)
    )
  ),
  mergeMap(batch => sendBatch(batch))
).subscribe(responses => {
  handleResponses(responses)
})
```

## window vs buffer

```javascript
// buffer: 返回数组
source$.pipe(
  bufferTime(1000)
).subscribe(arr => {
  // arr 是数组 [1, 2, 3]
})

// window: 返回 Observable
source$.pipe(
  windowTime(1000)
).subscribe(window$ => {
  // window$ 是 Observable
  window$.subscribe(value => {
    // 可以对窗口内的值做流处理
  })
})
```

何时用 window：
- 需要对窗口内的值做流处理（map, filter等）
- 需要提前处理，不等待窗口关闭
- 大量数据，避免内存中缓存整个数组

何时用 buffer：
- 只需要收集结果
- 处理逻辑简单
- 数据量小

## TypeScript 类型

```typescript
function window<T>(
  windowBoundaries: Observable<any>
): OperatorFunction<T, Observable<T>>

function windowTime<T>(
  windowTimeSpan: number
): OperatorFunction<T, Observable<T>>

function windowTime<T>(
  windowTimeSpan: number,
  windowCreationInterval: number
): OperatorFunction<T, Observable<T>>

function windowCount<T>(
  windowSize: number,
  startWindowEvery?: number
): OperatorFunction<T, Observable<T>>

function windowToggle<T, O>(
  openings: Observable<O>,
  closingSelector: (openValue: O) => Observable<any>
): OperatorFunction<T, Observable<T>>
```

## 本章小结

- `window` 按信号分割窗口
- `windowTime` 按时间分割
- `windowCount` 按数量分割
- 返回高阶 Observable，可对窗口做流处理
- buffer 是 window + toArray 的简化版

下一章实现 `mergeScan` 操作符。
