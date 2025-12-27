# observeOn 与 subscribeOn：调度控制

`observeOn` 和 `subscribeOn` 用于控制 Observable 的执行上下文。

## observeOn：控制观察位置

```typescript
source$.pipe(
  observeOn(asyncScheduler)
).subscribe(console.log)
```

**作用**：控制下游操作符和观察者在哪个调度器上执行。

### 实现

```typescript
function observeOn<T>(scheduler: Scheduler) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      return source.subscribe({
        next: value => {
          scheduler.schedule(() => subscriber.next(value))
        },
        error: err => {
          scheduler.schedule(() => subscriber.error(err))
        },
        complete: () => {
          scheduler.schedule(() => subscriber.complete())
        }
      })
    })
  }
}
```

## subscribeOn：控制订阅位置

```typescript
source$.pipe(
  subscribeOn(asyncScheduler)
).subscribe(console.log)
```

**作用**：控制 Observable 的订阅在哪个调度器上执行。

### 实现

```typescript
function subscribeOn<T>(scheduler: Scheduler) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      let subscription: Subscription
      
      scheduler.schedule(() => {
        subscription = source.subscribe(subscriber)
      })
      
      return () => subscription?.unsubscribe()
    })
  }
}
```

## 区别

| 操作符 | 影响范围 | 位置 |
|--------|---------|------|
| subscribeOn | 订阅时机 | 只影响订阅 |
| observeOn | 发射时机 | 影响下游操作符 |

## 实战场景

### UI 更新

```typescript
heavyComputation$.pipe(
  observeOn(asyncScheduler) // 在下一个事件循环更新 UI
).subscribe(updateUI)
```

### 异步订阅

```typescript
source$.pipe(
  subscribeOn(asyncScheduler) // 异步订阅
).subscribe()
```

## 总结

- `observeOn`：控制下游执行上下文
- `subscribeOn`：控制订阅执行上下文
- 用于优化性能和避免阻塞
