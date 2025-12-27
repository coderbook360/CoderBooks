# delay 与 delayWhen：延迟发射

`delay` 和 `delayWhen` 操作符用于延迟 Observable 的发射。

## delay：固定延迟

```typescript
of(1, 2, 3).pipe(
  delay(1000) // 延迟 1 秒
).subscribe(console.log)
```

### 实现

```typescript
function delay<T>(dueTime: number) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      const subscription = source.subscribe({
        next: value => {
          setTimeout(() => subscriber.next(value), dueTime)
        },
        error: err => subscriber.error(err),
        complete: () => {
          setTimeout(() => subscriber.complete(), dueTime)
        }
      })
      
      return subscription
    })
  }
}
```

## delayWhen：动态延迟

```typescript
source$.pipe(
  delayWhen(value => timer(value * 1000))
).subscribe(console.log)
```

### 实现

```typescript
function delayWhen<T>(
  delayDurationSelector: (value: T) => Observable<any>
) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      return source.subscribe({
        next: value => {
          const duration$ = delayDurationSelector(value)
          duration$.subscribe(() => {
            subscriber.next(value)
          })
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })
    })
  }
}
```

## 实战场景

### 延迟通知

```typescript
notification$.pipe(
  delay(3000) // 3秒后显示
).subscribe(showNotification)
```

### 动画队列

```typescript
animations$.pipe(
  delayWhen((_, i) => timer(i * 500))
).subscribe(playAnimation)
```

## 总结

- `delay`：固定延迟时间
- `delayWhen`：根据值动态延迟
- 适合动画、通知等场景
