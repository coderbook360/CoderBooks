---
sidebar_position: 42
title: "take 与 takeLast：取值限制"
---

# take 与 takeLast：取值限制

`take` 取前 N 个值，`takeLast` 取最后 N 个值。

## take

```javascript
of(1, 2, 3, 4, 5).pipe(
  take(3)
).subscribe(console.log)
// 1, 2, 3（然后 complete）
```

### 实现 take

```javascript
function take(count) {
  return (source) => new Observable(subscriber => {
    let taken = 0

    const subscription = source.subscribe({
      next(value) {
        if (taken < count) {
          taken++
          subscriber.next(value)

          if (taken === count) {
            subscriber.complete()
            subscription.unsubscribe()
          }
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => subscription.unsubscribe()
  })
}
```

### take(0) 和 take(1)

```javascript
// take(0) 立即完成
source$.pipe(take(0)).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete

// take(1) 常用于获取单值
source$.pipe(take(1))
// 类似 first()，但空流时 first 会报错
```

## takeLast

```javascript
of(1, 2, 3, 4, 5).pipe(
  takeLast(3)
).subscribe(console.log)
// 3, 4, 5
```

### 实现 takeLast

```javascript
function takeLast(count) {
  return (source) => new Observable(subscriber => {
    const buffer = []

    return source.subscribe({
      next(value) {
        buffer.push(value)
        if (buffer.length > count) {
          buffer.shift()
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        // 源完成后发射缓冲区的值
        for (const value of buffer) {
          subscriber.next(value)
        }
        subscriber.complete()
      }
    })
  })
}
```

### takeLast 特点

- 必须等待源完成才能发射
- 不适用于无限流
- 需要缓冲最后 N 个值

```javascript
// 无限流不会输出
interval(1000).pipe(
  takeLast(3)
).subscribe(console.log)
// 永远不会输出，因为 interval 不会完成

// 配合 take 限制
interval(1000).pipe(
  take(10),
  takeLast(3)
).subscribe(console.log)
// 7, 8, 9（10秒后）
```

## take vs takeLast

| 特性 | take | takeLast |
|------|------|----------|
| 发射时机 | 立即 | 源完成后 |
| 提前完成 | 是 | 否 |
| 无限流 | 可用 | 不可用 |
| 缓冲 | 不需要 | 需要 |

## 常见用途

### 限制请求次数

```javascript
// 只处理前5个请求
requests$.pipe(
  take(5)
).subscribe(handleRequest)
```

### 获取初始值

```javascript
// 获取配置的初始值
config$.pipe(
  take(1)
).subscribe(initConfig => {
  initialize(initConfig)
})
```

### 自动取消订阅

```javascript
// 用户点击后自动取消
fromEvent(button, 'click').pipe(
  take(1)
).subscribe(() => {
  console.log('First click handled')
})
// 点击后自动完成，无需手动取消
```

### 获取最新几个值

```javascript
// 获取最后3条日志
logs$.pipe(
  takeLast(3)
).subscribe(log => {
  console.log('Recent log:', log)
})
```

## 边界情况

### 源值少于请求数量

```javascript
of(1, 2).pipe(
  take(10)
).subscribe(console.log)
// 1, 2（只有2个值）

of(1, 2).pipe(
  takeLast(10)
).subscribe(console.log)
// 1, 2（返回所有值）
```

### 空流

```javascript
EMPTY.pipe(take(5)).subscribe({
  complete: () => console.log('Complete')
})
// Complete

EMPTY.pipe(takeLast(5)).subscribe({
  complete: () => console.log('Complete')
})
// Complete
```

## TypeScript 类型

```typescript
function take<T>(count: number): OperatorFunction<T, T>
function takeLast<T>(count: number): OperatorFunction<T, T>
```

## 本章小结

- `take(n)` 取前 n 个值后完成
- `takeLast(n)` 在源完成后发射最后 n 个值
- `take` 适用于无限流，`takeLast` 不适用
- `take(1)` 常用于获取单个值

下一章实现 `takeUntil` 和 `takeWhile` 条件取值操作符。
