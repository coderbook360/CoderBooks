---
sidebar_position: 68
title: "catchError"
---

# catchError

`catchError` 捕获错误并返回一个替代的 Observable 或重新抛出错误。

## 基本用法

```javascript
source$.pipe(
  catchError(err => {
    console.log('Error:', err)
    return of('fallback value')
  })
).subscribe(console.log)
```

时间线：

```
source$: --1--2--X
              error
catch:   --1--2--fallback|
```

## 实现 catchError

```javascript
function catchError(selector) {
  return (source) => new Observable(subscriber => {
    let subscription

    subscription = source.subscribe({
      next(value) {
        subscriber.next(value)
      },
      error(err) {
        let result
        try {
          // selector 接收错误和源 Observable
          result = selector(err, source)
        } catch (selectorError) {
          subscriber.error(selectorError)
          return
        }

        // 订阅替代 Observable
        subscription = result.subscribe(subscriber)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })
}
```

## 错误恢复策略

### 返回默认值

```javascript
ajax('/api/data').pipe(
  catchError(err => of({ data: [], error: err.message }))
).subscribe(result => {
  if (result.error) {
    showError(result.error)
  }
  render(result.data)
})
```

### 返回空流

```javascript
ajax('/api/optional').pipe(
  catchError(() => EMPTY)  // 静默失败
).subscribe(console.log)
```

### 重新抛出

```javascript
source$.pipe(
  catchError(err => {
    logError(err)
    return throwError(() => err)  // 继续传递错误
  })
)
```

### 重试后放弃

```javascript
source$.pipe(
  catchError((err, caught) => {
    if (retryCount < 3) {
      retryCount++
      return caught  // 重新订阅源
    }
    return throwError(() => err)
  })
)
```

## 实战示例

### API 错误处理

```javascript
function fetchUser(id) {
  return ajax(`/api/users/${id}`).pipe(
    map(res => res.response),
    catchError(err => {
      if (err.status === 404) {
        return of(null)  // 用户不存在
      }
      if (err.status === 401) {
        logout()
        return EMPTY
      }
      return throwError(() => new Error('Network error'))
    })
  )
}
```

### 多级错误处理

```javascript
source$.pipe(
  // 第一层：尝试处理特定错误
  catchError(err => {
    if (err.code === 'NETWORK') {
      return retryWithBackoff()
    }
    return throwError(() => err)
  }),
  // 第二层：通用错误处理
  catchError(err => {
    showNotification(`Error: ${err.message}`)
    return of(getDefaultValue())
  })
)
```

### 并行请求容错

```javascript
forkJoin({
  user: ajax('/api/user').pipe(
    catchError(() => of({ error: 'Failed to load user' }))
  ),
  posts: ajax('/api/posts').pipe(
    catchError(() => of({ error: 'Failed to load posts' }))
  ),
  settings: ajax('/api/settings').pipe(
    catchError(() => of({ error: 'Failed to load settings' }))
  )
}).subscribe(({ user, posts, settings }) => {
  // 每个可能是数据或错误对象
  render(user, posts, settings)
})
```

### 流不中断

```javascript
// 搜索：单个请求失败不影响后续
searchInput$.pipe(
  debounceTime(300),
  switchMap(term => 
    ajax(`/api/search?q=${term}`).pipe(
      catchError(() => of([]))  // 失败返回空结果
    )
  )
).subscribe(results => {
  renderResults(results)
})
```

## caught 参数

第二个参数是源 Observable，可用于重试：

```javascript
let retries = 0

source$.pipe(
  catchError((err, caught) => {
    if (retries++ < 3) {
      return timer(1000).pipe(
        switchMap(() => caught)  // 1秒后重试
      )
    }
    return throwError(() => err)
  })
)
```

## catchError vs try-catch

```javascript
// try-catch 只能捕获同步错误
try {
  source$.subscribe(...)  // 异步错误捕获不到
} catch (e) { }

// catchError 捕获 Observable 中的错误
source$.pipe(
  catchError(err => ...)
).subscribe(...)
```

## 位置很重要

```javascript
// 在 switchMap 外部：整个流终止
source$.pipe(
  switchMap(x => mayFail(x)),
  catchError(err => of('fallback'))
)
// 一次错误后，流结束

// 在 switchMap 内部：只影响当前内部 Observable
source$.pipe(
  switchMap(x => 
    mayFail(x).pipe(
      catchError(err => of('fallback'))
    )
  )
)
// 单次失败不影响后续
```

## 与 finalize 配合

```javascript
source$.pipe(
  catchError(err => {
    return of({ error: err })
  }),
  finalize(() => {
    // 无论成功还是失败都会执行
    hideLoading()
  })
)
```

## 常见陷阱

### 忘记返回 Observable

```javascript
// 错误：返回普通值
source$.pipe(
  catchError(err => 'fallback')  // 错误！
)

// 正确：返回 Observable
source$.pipe(
  catchError(err => of('fallback'))
)
```

### 吞掉所有错误

```javascript
// 危险：无法知道发生了什么
source$.pipe(
  catchError(() => EMPTY)
)

// 更好：至少记录
source$.pipe(
  catchError(err => {
    console.error('Error:', err)
    return EMPTY
  })
)
```

## TypeScript 类型

```typescript
function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): OperatorFunction<T, T | ObservedValueOf<O>>
```

## 本章小结

- `catchError` 捕获错误，返回替代 Observable
- 可以恢复（返回值）、传递（throwError）或重试（caught）
- 位置决定了错误处理的范围
- 是构建健壮应用的关键操作符

下一章实现 `retry` 和 `retryWhen` 操作符。
