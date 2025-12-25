---
sidebar_position: 44
title: "skip 与 skipUntil：跳过值"
---

# skip 与 skipUntil：跳过值

`skip` 跳过前 N 个值，`skipUntil` 和 `skipWhile` 根据条件跳过。

## skip

```javascript
of(1, 2, 3, 4, 5).pipe(
  skip(2)
).subscribe(console.log)
// 3, 4, 5
```

### 实现 skip

```javascript
function skip(count) {
  return (source) => new Observable(subscriber => {
    let skipped = 0

    return source.subscribe({
      next(value) {
        if (skipped < count) {
          skipped++
        } else {
          subscriber.next(value)
        }
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

## skipLast

跳过最后 N 个值：

```javascript
of(1, 2, 3, 4, 5).pipe(
  skipLast(2)
).subscribe(console.log)
// 1, 2, 3
```

### 实现 skipLast

```javascript
function skipLast(count) {
  return (source) => new Observable(subscriber => {
    const buffer = []

    return source.subscribe({
      next(value) {
        buffer.push(value)
        if (buffer.length > count) {
          subscriber.next(buffer.shift())
        }
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

## skipUntil

跳过直到通知 Observable 发射：

```javascript
const source$ = interval(500)
const start$ = timer(2000)

source$.pipe(
  skipUntil(start$)
).subscribe(console.log)
// 4, 5, 6, ...（从2秒后开始）
```

### 实现 skipUntil

```javascript
function skipUntil(notifier) {
  return (source) => new Observable(subscriber => {
    let skipping = true

    const notifierSubscription = notifier.subscribe({
      next() {
        skipping = false
        notifierSubscription.unsubscribe()
      }
    })

    const sourceSubscription = source.subscribe({
      next(value) {
        if (!skipping) {
          subscriber.next(value)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => {
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

## skipWhile

条件满足时跳过，条件不满足后开始取值：

```javascript
of(1, 2, 3, 4, 5, 1, 2).pipe(
  skipWhile(x => x < 4)
).subscribe(console.log)
// 4, 5, 1, 2（一旦开始取值，不再跳过）
```

### 实现 skipWhile

```javascript
function skipWhile(predicate) {
  return (source) => new Observable(subscriber => {
    let skipping = true
    let index = 0

    return source.subscribe({
      next(value) {
        if (skipping) {
          try {
            skipping = predicate(value, index++)
          } catch (err) {
            subscriber.error(err)
            return
          }
        }
        if (!skipping) {
          subscriber.next(value)
        }
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

## skip 系列对比

| 操作符 | 跳过条件 | 开始取值后 |
|--------|---------|-----------|
| `skip(n)` | 前 n 个 | 全部取值 |
| `skipLast(n)` | 最后 n 个 | - |
| `skipUntil(obs$)` | obs$ 发射前 | 全部取值 |
| `skipWhile(fn)` | fn 返回 true | 全部取值 |

## 与 take 系列对比

```javascript
// skip + take 配合
of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).pipe(
  skip(2),      // 跳过 1, 2
  take(3)       // 取 3, 4, 5
).subscribe(console.log)
// 3, 4, 5

// 切片操作
function slice(start, end) {
  return pipe(
    skip(start),
    take(end - start)
  )
}

of(1, 2, 3, 4, 5, 6).pipe(
  slice(2, 5)
).subscribe(console.log)
// 3, 4, 5
```

## 实战示例

### 跳过初始值

```javascript
// 跳过初始加载状态
loading$.pipe(
  skip(1)  // 跳过初始值
).subscribe(loading => {
  // 只关注后续变化
})
```

### 跳过预热期

```javascript
// 传感器预热
sensorData$.pipe(
  skipUntil(timer(5000))  // 跳过前5秒
).subscribe(data => {
  // 稳定后的数据
})
```

### 跳过空闲状态

```javascript
// 跳过空闲状态，从忙碌开始
status$.pipe(
  skipWhile(s => s === 'idle')
).subscribe(status => {
  console.log('Status changed:', status)
})
```

## TypeScript 类型

```typescript
function skip<T>(count: number): OperatorFunction<T, T>
function skipLast<T>(count: number): OperatorFunction<T, T>
function skipUntil<T>(notifier: Observable<any>): OperatorFunction<T, T>
function skipWhile<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, T>
```

## 本章小结

- `skip(n)` 跳过前 n 个值
- `skipLast(n)` 跳过最后 n 个值
- `skipUntil(obs$)` 跳过直到 obs$ 发射
- `skipWhile(fn)` 跳过满足条件的值
- 可与 take 系列组合实现切片

下一章实现 `first` 和 `last` 首尾取值操作符。
