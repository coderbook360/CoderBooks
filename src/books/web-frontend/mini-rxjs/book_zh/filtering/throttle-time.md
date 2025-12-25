---
sidebar_position: 48
title: "throttleTime：节流"
---

# throttleTime：节流

`throttleTime` 在指定时间窗口内只发射第一个值（或最后一个值），忽略其余。

## 基本用法

```javascript
fromEvent(document, 'scroll').pipe(
  throttleTime(100)
).subscribe(() => {
  console.log('Scroll event')
})
// 每100ms最多处理一次滚动
```

## 实现 throttleTime

```javascript
function throttleTime(duration, config = {}) {
  const { leading = true, trailing = false } = config

  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false
    let throttled = false
    let timeoutId

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true

        if (!throttled) {
          // 开始节流窗口
          throttled = true

          if (leading) {
            subscriber.next(value)
            hasValue = false
          }

          timeoutId = setTimeout(() => {
            if (trailing && hasValue) {
              subscriber.next(lastValue)
              hasValue = false
            }
            throttled = false
          }, duration)
        }
      },
      error(err) {
        clearTimeout(timeoutId)
        subscriber.error(err)
      },
      complete() {
        clearTimeout(timeoutId)
        if (trailing && hasValue) {
          subscriber.next(lastValue)
        }
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

## 配置选项

### leading（前沿触发）

```javascript
// 默认 leading: true - 立即发射第一个
source$.pipe(throttleTime(1000, { leading: true, trailing: false }))

// 时间线：
// 源:    a-b-c-d-e-----f-g-h
//        |----1000ms---|----1000ms---|
// 输出:  a-------------f
```

### trailing（后沿触发）

```javascript
// trailing: true - 窗口结束时发射最后一个
source$.pipe(throttleTime(1000, { leading: false, trailing: true }))

// 时间线：
// 源:    a-b-c-d-e-----f-g-h
//        |----1000ms---|----1000ms---|
// 输出:  -----e---------h
```

### 同时启用

```javascript
source$.pipe(throttleTime(1000, { leading: true, trailing: true }))

// 时间线：
// 源:    a-b-c-d-e-----f-g-h
//        |----1000ms---|----1000ms---|
// 输出:  a----e--------f---h
```

## throttle vs throttleTime

```javascript
// throttleTime - 固定时间
source$.pipe(throttleTime(1000))

// throttle - 动态时间
source$.pipe(
  throttle(value => interval(value.duration))
)
```

### 实现 throttle

```javascript
function throttle(durationSelector, config = {}) {
  const { leading = true, trailing = false } = config

  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false
    let durationSubscription

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true

        if (!durationSubscription) {
          if (leading) {
            subscriber.next(value)
            hasValue = false
          }

          const duration$ = durationSelector(value)
          durationSubscription = duration$.subscribe({
            next() {
              if (trailing && hasValue) {
                subscriber.next(lastValue)
                hasValue = false
              }
              durationSubscription.unsubscribe()
              durationSubscription = null
            }
          })
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (trailing && hasValue) {
          subscriber.next(lastValue)
        }
        subscriber.complete()
      }
    })

    return () => {
      durationSubscription?.unsubscribe()
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 常见用途

### 滚动事件

```javascript
fromEvent(window, 'scroll').pipe(
  throttleTime(100)
).subscribe(() => {
  checkScrollPosition()
})
```

### 按钮点击

```javascript
// 防止重复点击
fromEvent(button, 'click').pipe(
  throttleTime(1000)
).subscribe(() => {
  submitForm()
})
```

### 鼠标移动

```javascript
fromEvent(element, 'mousemove').pipe(
  throttleTime(50)
).subscribe(e => {
  updateTooltipPosition(e)
})
```

## throttle vs debounce

| 特性 | throttle | debounce |
|------|----------|----------|
| 发射时机 | 固定间隔 | 静默后 |
| 首次发射 | 立即（leading） | 等待 |
| 持续输入 | 定期发射 | 不发射 |
| 适用场景 | 滚动、拖拽 | 搜索输入 |

```javascript
// 持续快速点击10秒
// throttleTime(1000): 发射约10次
// debounceTime(1000): 发射1次（停止点击后）
```

## 视觉对比

```
源:     --a-b-c-d-e-f-g-h-i-j-->
                                
throttle(300ms, leading):
        --a-----d-----g-----j-->
        
throttle(300ms, trailing):
        -----c-----f-----i----->

debounce(300ms):
        -------------------j--->
```

## TypeScript 类型

```typescript
interface ThrottleConfig {
  leading?: boolean
  trailing?: boolean
}

function throttleTime<T>(
  duration: number,
  config?: ThrottleConfig
): OperatorFunction<T, T>

function throttle<T>(
  durationSelector: (value: T) => ObservableInput<any>,
  config?: ThrottleConfig
): OperatorFunction<T, T>
```

## 本章小结

- `throttleTime` 在时间窗口内限制发射频率
- `leading` 控制是否发射窗口开始的值
- `trailing` 控制是否发射窗口结束的值
- 适合滚动、拖拽、按钮点击等高频事件
- 与 debounce 的选择取决于需求

下一章实现 `auditTime` 和 `sampleTime` 采样操作符。
