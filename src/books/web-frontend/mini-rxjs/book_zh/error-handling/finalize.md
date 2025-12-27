# finalize：最终清理

`finalize` 在 Observable 完成或错误时执行清理逻辑，类似于 `try-finally`。

## 基本用法

```typescript
ajax('/api/data').pipe(
  tap(() => showLoading()),
  finalize(() => hideLoading())
).subscribe(
  data => console.log(data),
  error => console.error(error)
)

// 无论成功还是失败，都会执行 hideLoading()
```

## 实现

```typescript
function finalize<T>(callback: () => void) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      const subscription = source.subscribe(subscriber)
      
      return () => {
        try {
          callback()
        } finally {
          subscription.unsubscribe()
        }
      }
    })
  }
}
```

## 实战场景

### 加载状态管理

```typescript
const loading$ = new BehaviorSubject(false)

fetchData().pipe(
  tap(() => loading$.next(true)),
  finalize(() => loading$.next(false))
).subscribe()
```

### 资源清理

```typescript
createResource().pipe(
  // 使用资源
  tap(resource => resource.use()),
  finalize(() => {
    // 清理资源
    resource.dispose()
  })
).subscribe()
```

### 性能监控

```typescript
const start = Date.now()

expensiveOperation().pipe(
  finalize(() => {
    const duration = Date.now() - start
    console.log(`耗时: ${duration}ms`)
  })
).subscribe()
```

## 与 tap 的区别

```typescript
// tap: 只在 complete 时执行
source.pipe(
  tap({
    complete: () => console.log('完成')
  })
)

// finalize: 在 complete 和 error 时都执行
source.pipe(
  finalize(() => console.log('总是执行'))
)
```

## 总结

- 在 Observable 终止时执行清理
- 无论成功、失败或取消都会执行
- 类似于 try-finally
- 适合清理资源、隐藏加载状态等
