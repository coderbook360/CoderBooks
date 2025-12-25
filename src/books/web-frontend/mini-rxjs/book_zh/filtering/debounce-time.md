---
sidebar_position: 47
title: "debounceTime：防抖"
---

# debounceTime：防抖

`debounceTime` 在值发射后等待指定时间，如果期间没有新值则发射，有新值则重新计时。

## 基本用法

```javascript
fromEvent(input, 'input').pipe(
  debounceTime(300)
).subscribe(event => {
  console.log('Input:', event.target.value)
})
// 用户停止输入300ms后才发射
```

## 实现 debounceTime

```javascript
function debounceTime(dueTime) {
  return (source) => new Observable(subscriber => {
    let timeoutId = null
    let lastValue
    let hasValue = false

    const sourceSubscription = source.subscribe({
      next(value) {
        hasValue = true
        lastValue = value

        // 清除之前的定时器
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        // 设置新的定时器
        timeoutId = setTimeout(() => {
          if (hasValue) {
            subscriber.next(lastValue)
            hasValue = false
          }
        }, dueTime)
      },
      error(err) {
        clearTimeout(timeoutId)
        subscriber.error(err)
      },
      complete() {
        // 源完成时，发射最后的值
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (hasValue) {
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

## 工作原理

```
源:     --a--b--c-------d-e-f------>
                |300ms|        |300ms|
输出:   --------c---------------f--->
```

- a, b 被 c 覆盖（间隔小于300ms）
- c 发射（之后300ms无新值）
- d, e 被 f 覆盖
- f 发射

## 常见用途

### 搜索输入

```javascript
const searchInput$ = fromEvent(searchBox, 'input')

searchInput$.pipe(
  map(e => e.target.value),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => search(term))
).subscribe(results => {
  displayResults(results)
})
```

### 窗口调整

```javascript
fromEvent(window, 'resize').pipe(
  debounceTime(200)
).subscribe(() => {
  recalculateLayout()
})
```

### 自动保存

```javascript
formChanges$.pipe(
  debounceTime(1000)
).subscribe(formData => {
  autoSave(formData)
})
```

## debounce vs debounceTime

`debounce` 使用 Observable 控制等待时间：

```javascript
// debounceTime - 固定延迟
source$.pipe(debounceTime(300))

// debounce - 动态延迟
source$.pipe(
  debounce(value => {
    // 根据值决定延迟时间
    return timer(value.priority === 'high' ? 100 : 500)
  })
)
```

### 实现 debounce

```javascript
function debounce(durationSelector) {
  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false
    let durationSubscription

    const sourceSubscription = source.subscribe({
      next(value) {
        hasValue = true
        lastValue = value

        // 取消之前的等待
        durationSubscription?.unsubscribe()

        // 开始新的等待
        const duration$ = durationSelector(value)
        durationSubscription = duration$.subscribe({
          next() {
            if (hasValue) {
              subscriber.next(lastValue)
              hasValue = false
            }
            durationSubscription.unsubscribe()
          }
        })
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (hasValue) {
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

## debounce vs throttle

| 特性 | debounce | throttle |
|------|----------|----------|
| 发射时机 | 静默期后 | 固定间隔 |
| 发射的值 | 最后一个 | 第一个/最后一个 |
| 适用场景 | 搜索输入 | 滚动事件 |

```javascript
// debounce：等待停止后发射
// 连续输入 abcdef，只发射 f

// throttle：每隔一段时间发射
// 连续输入 abcdef，发射 a...d...（取决于配置）
```

## 边界情况

### 源立即完成

```javascript
of(1, 2, 3).pipe(
  debounceTime(1000)
).subscribe(console.log)
// 3（同步完成时发射最后值）
```

### 取消订阅

```javascript
const subscription = source$.pipe(
  debounceTime(1000)
).subscribe(console.log)

// 取消订阅会清除定时器
subscription.unsubscribe()
```

## TypeScript 类型

```typescript
function debounceTime<T>(dueTime: number): OperatorFunction<T, T>

function debounce<T>(
  durationSelector: (value: T) => ObservableInput<any>
): OperatorFunction<T, T>
```

## 本章小结

- `debounceTime` 等待静默期后发射最后一个值
- 适合搜索输入、窗口调整、自动保存等场景
- `debounce` 可以根据值动态决定等待时间
- 与 `throttle` 的区别在于发射时机

下一章实现 `throttleTime` 节流操作符。
