---
sidebar_position: 29
title: "interval 与 timer：定时器操作符"
---

# interval 与 timer：定时器操作符

`interval` 和 `timer` 创建基于时间的 Observable，是异步数据流的重要来源。

## interval

每隔固定时间发射递增数字：

```javascript
interval(1000).subscribe(console.log)
// 0（1秒后）
// 1（2秒后）
// 2（3秒后）
// ...
```

### 实现 interval

```javascript
function interval(period) {
  return new Observable(subscriber => {
    let count = 0

    const id = setInterval(() => {
      subscriber.next(count++)
    }, period)

    // 清理
    return () => clearInterval(id)
  })
}
```

## timer

更灵活的定时器：

```javascript
// 延迟后发射单值
timer(2000).subscribe(console.log)
// 0（2秒后，然后 complete）

// 延迟后周期发射
timer(2000, 1000).subscribe(console.log)
// 0（2秒后）
// 1（3秒后）
// 2（4秒后）
// ...
```

### 实现 timer

```javascript
function timer(dueTime, period) {
  return new Observable(subscriber => {
    let count = 0
    let intervalId

    // 延迟后执行
    const timeoutId = setTimeout(() => {
      subscriber.next(count++)

      // 如果没有周期，完成
      if (period === undefined) {
        subscriber.complete()
        return
      }

      // 周期执行
      intervalId = setInterval(() => {
        subscriber.next(count++)
      }, period)
    }, dueTime)

    // 清理
    return () => {
      clearTimeout(timeoutId)
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  })
}
```

## 支持 Date 作为延迟

```javascript
// 在特定时间触发
const futureDate = new Date('2024-12-31T23:59:59')
timer(futureDate).subscribe(() => {
  console.log('Happy New Year!')
})
```

扩展实现：

```javascript
function timer(dueTime, period) {
  return new Observable(subscriber => {
    // 计算延迟毫秒数
    let delay
    if (dueTime instanceof Date) {
      delay = dueTime.getTime() - Date.now()
      delay = Math.max(0, delay)
    } else {
      delay = dueTime
    }

    // ... 其余实现同上 ...
  })
}
```

## 实战示例

### 轮询

```javascript
// 每5秒检查一次
interval(5000).pipe(
  switchMap(() => fetch('/api/status').then(r => r.json())),
  takeWhile(status => status !== 'complete')
).subscribe(status => {
  console.log('Current status:', status)
})
```

### 倒计时

```javascript
function countdown(seconds) {
  return timer(0, 1000).pipe(
    map(i => seconds - i),
    take(seconds + 1)
  )
}

countdown(10).subscribe({
  next: sec => console.log(`${sec}...`),
  complete: () => console.log('Go!')
})
// 10... 9... 8... ... 1... 0... Go!
```

### 自动保存

```javascript
const save$ = formChanges$.pipe(
  debounceTime(1000),
  switchMap(data => saveToServer(data))
)

// 或者定时保存
interval(30000).pipe(
  withLatestFrom(formData$),
  switchMap(([_, data]) => saveToServer(data))
).subscribe()
```

### 动画帧

```javascript
// 简单动画循环
const frame$ = interval(0)  // 尽快执行

// 更好：使用 requestAnimationFrame
function animationFrame() {
  return new Observable(subscriber => {
    let frameId
    let count = 0

    function loop() {
      subscriber.next(count++)
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(frameId)
  })
}
```

## interval vs setInterval

| 特性 | setInterval | interval |
|------|-------------|----------|
| 取消 | clearInterval | unsubscribe |
| 组合 | 手动管理 | pipe 组合 |
| 错误处理 | try/catch | catchError |

```javascript
// setInterval 方式
const id = setInterval(() => {
  try {
    doSomething()
  } catch (e) {
    clearInterval(id)
  }
}, 1000)

// interval 方式
interval(1000).pipe(
  map(() => doSomething()),
  catchError(handleError)
).subscribe()
```

## 性能注意事项

高频率定时器要注意性能：

```javascript
// 可能导致性能问题
interval(0).subscribe(/* ... */)

// 配合 throttle 或 sample
interval(16).pipe(  // ~60fps
  // 只在需要时处理
).subscribe()
```

## 测试友好

使用 Scheduler 可以控制时间（后面章节详述）：

```javascript
function interval(period, scheduler = asyncScheduler) {
  return new Observable(subscriber => {
    let count = 0
    return scheduler.schedule(function() {
      subscriber.next(count++)
      this.schedule(undefined, period)
    }, period)
  })
}
```

## 本章小结

- `interval(ms)` 每隔 ms 毫秒发射递增数字
- `timer(delay)` 延迟后发射单值并完成
- `timer(delay, period)` 延迟后周期发射
- 返回清理函数确保定时器正确清除
- 常用于轮询、倒计时、动画等场景

下一章实现 `defer`，实现真正的惰性 Observable。
