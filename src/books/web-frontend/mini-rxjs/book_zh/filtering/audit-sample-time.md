---
sidebar_position: 49
title: "auditTime 与 sampleTime"
---

# auditTime 与 sampleTime

`auditTime` 和 `sampleTime` 是两种不同的采样策略。

## auditTime

源发射后等待指定时间，然后发射该时间内的最后一个值：

```javascript
fromEvent(document, 'click').pipe(
  auditTime(1000)
).subscribe(console.log)
// 点击后等待1秒，发射期间最后一次点击
```

### 实现 auditTime

```javascript
function auditTime(duration) {
  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false
    let timeoutId = null

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true

        if (timeoutId === null) {
          // 开始审计窗口
          timeoutId = setTimeout(() => {
            if (hasValue) {
              subscriber.next(lastValue)
              hasValue = false
            }
            timeoutId = null
          }, duration)
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
      sourceSubscription.unsubscribe()
    }
  })
}
```

### auditTime 工作原理

```
源:     --a-b-c-----d-e-f----g-->
        |--1s--|    |--1s--|
输出:   ------c-----------f----g-->
```

- 收到 a，开始计时
- 1秒内收到 b, c
- 1秒后发射 c（最后一个）
- 收到 d，重新开始计时...

## sampleTime

固定间隔采样，发射每个间隔内的最后一个值：

```javascript
fromEvent(document, 'mousemove').pipe(
  sampleTime(1000)
).subscribe(console.log)
// 每秒采样一次鼠标位置
```

### 实现 sampleTime

```javascript
function sampleTime(period) {
  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    const intervalId = setInterval(() => {
      if (hasValue) {
        subscriber.next(lastValue)
        hasValue = false
      }
    }, period)

    return () => {
      clearInterval(intervalId)
      sourceSubscription.unsubscribe()
    }
  })
}
```

### sampleTime 工作原理

```
源:     --a-b-c-----d-e-f----g-->
采样:   ---|-----|-----|-----|-->  (每秒)
输出:   ---c-----c-----f-----g-->
```

- 固定每秒采样一次
- 发射该秒内最后一个值
- 无值时不发射

## audit vs auditTime

```javascript
// auditTime - 固定时间
source$.pipe(auditTime(1000))

// audit - 动态时间
source$.pipe(
  audit(value => timer(value.delay))
)
```

## sample vs sampleTime

```javascript
// sampleTime - 固定间隔
source$.pipe(sampleTime(1000))

// sample - 外部信号触发采样
source$.pipe(
  sample(clicks$)  // 每次点击采样一次
)
```

### 实现 sample

```javascript
function sample(notifier) {
  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    const notifierSubscription = notifier.subscribe({
      next() {
        if (hasValue) {
          subscriber.next(lastValue)
          hasValue = false
        }
      },
      error(err) {
        subscriber.error(err)
      }
    })

    return () => {
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

## 四种限流策略对比

| 操作符 | 触发条件 | 发射时机 | 发射的值 |
|--------|---------|----------|---------|
| debounceTime | 静默 N ms | 静默后 | 最后一个 |
| throttleTime | 间隔 N ms | 窗口开始/结束 | 第一个/最后一个 |
| auditTime | 值后 N ms | 等待后 | 最后一个 |
| sampleTime | 固定 N ms | 固定间隔 | 最后一个 |

时间线对比：

```
源:     a-b-c---d-e-f---g-h-i

debounce(500ms):
        ------c-------f------i  (等待静默)

throttle(500ms, leading):
        a-----d-----g-----      (窗口开始)

audit(500ms):
        ----c-----f-----i       (值后等待)

sample(500ms):
        --c---c---f---f---i     (固定间隔)
```

## 实战示例

### 实时统计

```javascript
// 每秒更新一次统计
events$.pipe(
  scan((count, _) => count + 1, 0),
  sampleTime(1000)
).subscribe(count => {
  display.textContent = `${count} events`
})
```

### 拖拽优化

```javascript
// 拖拽时节流位置更新
fromEvent(element, 'drag').pipe(
  auditTime(16)  // 约 60fps
).subscribe(e => {
  updatePosition(e)
})
```

### 用户行为采样

```javascript
// 每分钟采样一次用户活动
userActivity$.pipe(
  sampleTime(60000)
).subscribe(activity => {
  logAnalytics(activity)
})
```

## TypeScript 类型

```typescript
function auditTime<T>(duration: number): OperatorFunction<T, T>
function audit<T>(
  durationSelector: (value: T) => ObservableInput<any>
): OperatorFunction<T, T>

function sampleTime<T>(period: number): OperatorFunction<T, T>
function sample<T>(notifier: Observable<any>): OperatorFunction<T, T>
```

## 本章小结

- `auditTime` 在值发射后等待，发射等待期间的最后值
- `sampleTime` 固定间隔采样
- `sample` 使用外部信号触发采样
- 选择取决于具体的业务需求

下一章实现 `elementAt` 和 `single` 操作符。
