# tap：副作用操作

`tap` 用于执行副作用，不修改流中的值，常用于调试、日志记录等。

## 基本用法

```typescript
of(1, 2, 3).pipe(
  tap(x => console.log('值:', x)),
  map(x => x * 2),
  tap(x => console.log('翻倍后:', x))
).subscribe()

// 输出：
// 值: 1
// 翻倍后: 2
// 值: 2
// 翻倍后: 4
// 值: 3
// 翻倍后: 6
```

## 实现

```typescript
function tap<T>(
  observerOrNext?: Partial<Observer<T>> | ((value: T) => void)
) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      const tapObserver = typeof observerOrNext === 'function'
        ? { next: observerOrNext }
        : observerOrNext
      
      return source.subscribe({
        next: value => {
          tapObserver?.next?.(value)
          subscriber.next(value)
        },
        error: err => {
          tapObserver?.error?.(err)
          subscriber.error(err)
        },
        complete: () => {
          tapObserver?.complete?.()
          subscriber.complete()
        }
      })
    })
  }
}
```

## 实战场景

### 调试

```typescript
source$.pipe(
  tap(x => console.log('步骤1:', x)),
  map(x => x * 2),
  tap(x => console.log('步骤2:', x)),
  filter(x => x > 5),
  tap(x => console.log('步骤3:', x))
).subscribe()
```

### 日志记录

```typescript
ajax('/api/data').pipe(
  tap({
    next: data => logger.info('接收数据', data),
    error: err => logger.error('请求失败', err),
    complete: () => logger.info('请求完成')
  })
).subscribe()
```

### 状态更新

```typescript
searchInput$.pipe(
  tap(() => setLoading(true)),
  debounceTime(300),
  switchMap(query => ajax(`/api/search?q=${query}`)),
  tap(() => setLoading(false))
).subscribe()
```

### 缓存

```typescript
const cache = new Map()

getData(id).pipe(
  tap(data => cache.set(id, data))
).subscribe()
```

## 常见用法

### 完整观察者

```typescript
source$.pipe(
  tap({
    next: value => console.log('next:', value),
    error: err => console.error('error:', err),
    complete: () => console.log('complete')
  })
)
```

### 只监听 next

```typescript
source$.pipe(
  tap(value => console.log(value))
)
```

### 性能监控

```typescript
const start = Date.now()

source$.pipe(
  tap(() => {
    console.log('耗时:', Date.now() - start)
  })
).subscribe()
```

## 注意事项

### 不要修改值

```typescript
// ❌ 错误：tap 不应该修改值
source$.pipe(
  tap(obj => obj.modified = true)
)

// ✅ 正确：使用 map 修改值
source$.pipe(
  map(obj => ({ ...obj, modified: true }))
)
```

### 避免副作用依赖

```typescript
// ❌ 危险：依赖副作用的结果
let count = 0
source$.pipe(
  tap(() => count++),
  map(() => count) // 依赖 tap 的副作用
)

// ✅ 正确：使用 scan
source$.pipe(
  scan((acc) => acc + 1, 0)
)
```

## 总结

- 执行副作用，不修改值
- 适合调试、日志、状态更新
- 接受完整观察者或单个函数
- 不要在 tap 中修改流中的值
