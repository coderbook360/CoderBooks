---
sidebar_position: 38
title: "buffer 与 bufferCount：值缓冲"
---

# buffer 与 bufferCount：值缓冲

缓冲操作符将源 Observable 的值收集到数组中，在满足条件时发射。

## bufferCount

按数量缓冲：

```javascript
of(1, 2, 3, 4, 5, 6).pipe(
  bufferCount(3)
).subscribe(console.log)
// [1, 2, 3]
// [4, 5, 6]
```

### 实现 bufferCount

```javascript
function bufferCount(bufferSize, startBufferEvery = null) {
  return (source) => new Observable(subscriber => {
    let buffer = []
    const step = startBufferEvery || bufferSize

    return source.subscribe({
      next(value) {
        buffer.push(value)

        if (buffer.length === bufferSize) {
          subscriber.next(buffer)
          buffer = buffer.slice(step)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        // 发射剩余的缓冲
        if (buffer.length > 0) {
          subscriber.next(buffer)
        }
        subscriber.complete()
      }
    })
  })
}
```

### startBufferEvery 参数

控制下一个缓冲区的起始位置：

```javascript
// 滑动窗口
of(1, 2, 3, 4, 5).pipe(
  bufferCount(3, 1)  // 每次移动1位
).subscribe(console.log)
// [1, 2, 3]
// [2, 3, 4]
// [3, 4, 5]
// [4, 5]
// [5]

// 跳跃窗口
of(1, 2, 3, 4, 5, 6).pipe(
  bufferCount(2, 3)  // 每次跳过3位
).subscribe(console.log)
// [1, 2]
// [4, 5]
```

## buffer

按信号缓冲：

```javascript
const source$ = interval(100)
const signal$ = interval(500)

source$.pipe(
  buffer(signal$)
).subscribe(console.log)
// [0, 1, 2, 3, 4]  // 500ms 时
// [5, 6, 7, 8, 9]  // 1000ms 时
// ...
```

### 实现 buffer

```javascript
function buffer(closingNotifier) {
  return (source) => new Observable(subscriber => {
    let buffer = []

    const sourceSubscription = source.subscribe({
      next(value) {
        buffer.push(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (buffer.length > 0) {
          subscriber.next(buffer)
        }
        subscriber.complete()
      }
    })

    const notifierSubscription = closingNotifier.subscribe({
      next() {
        const emitBuffer = buffer
        buffer = []
        subscriber.next(emitBuffer)
      },
      error(err) {
        subscriber.error(err)
      }
      // 不监听 complete，让源决定何时完成
    })

    return () => {
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

## bufferTime

按时间缓冲（结合 buffer 和 interval）：

```javascript
function bufferTime(bufferTimeSpan) {
  return (source) => source.pipe(
    buffer(interval(bufferTimeSpan))
  )
}

// 使用
source$.pipe(
  bufferTime(1000)  // 每秒发射一次缓冲
).subscribe(console.log)
```

## 实战示例

### 批量处理

```javascript
// 批量保存
changes$.pipe(
  bufferTime(1000),
  filter(batch => batch.length > 0),
  mergeMap(batch => saveBatch(batch))
).subscribe()
```

### 点击统计

```javascript
// 统计每秒点击次数
fromEvent(document, 'click').pipe(
  bufferTime(1000),
  map(clicks => clicks.length)
).subscribe(count => {
  console.log(`Clicks per second: ${count}`)
})
```

### 分组发送

```javascript
// 每10条消息发送一次
messages$.pipe(
  bufferCount(10)
).subscribe(batch => {
  sendBatchToServer(batch)
})
```

### 滑动窗口平均

```javascript
// 计算滑动窗口平均值
sensorData$.pipe(
  bufferCount(5, 1),
  map(window => window.reduce((a, b) => a + b, 0) / window.length)
).subscribe(average => {
  console.log('Moving average:', average)
})
```

## bufferWhen

动态决定何时关闭缓冲：

```javascript
function bufferWhen(closingSelector) {
  return (source) => new Observable(subscriber => {
    let buffer = []
    let closingSubscription

    function openBuffer() {
      const closing$ = closingSelector()
      
      closingSubscription = closing$.subscribe({
        next() {
          const emitBuffer = buffer
          buffer = []
          subscriber.next(emitBuffer)
          closingSubscription.unsubscribe()
          openBuffer()
        }
      })
    }

    const sourceSubscription = source.subscribe({
      next(value) {
        buffer.push(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (buffer.length > 0) {
          subscriber.next(buffer)
        }
        subscriber.complete()
      }
    })

    openBuffer()

    return () => {
      sourceSubscription.unsubscribe()
      closingSubscription?.unsubscribe()
    }
  })
}
```

使用：

```javascript
// 随机间隔缓冲
source$.pipe(
  bufferWhen(() => interval(Math.random() * 1000))
)
```

## 本章小结

- `bufferCount(n)` 每 n 个值发射一次缓冲数组
- `bufferCount(n, m)` 支持滑动窗口和跳跃窗口
- `buffer(notifier$)` 在 notifier 发射时发射缓冲
- `bufferTime(ms)` 按时间间隔发射缓冲
- 缓冲操作符适合批量处理、统计、滑动窗口等场景

下一章实现 `toArray` 收集操作符。
