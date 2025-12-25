---
sidebar_position: 63
title: "exhaustMap"
---

# exhaustMap

`exhaustMap` 在内部 Observable 执行期间忽略新值，直到当前内部完成。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.pipe(
  exhaustMap(() => interval(1000).pipe(take(3)))
).subscribe(console.log)
// 点击：0, 1, 2
// 期间再点击被忽略
// 完成后点击：0, 1, 2
```

时间线：

```
clicks$: --c--c--c-----c---->
               忽略^  忽略^
inner:     |--0--1--2|
                     |--0--1--2|
output:  ----0--1--2---0--1--2-->
```

## 实现 exhaustMap

```javascript
function exhaustMap(project) {
  return (source) => new Observable(subscriber => {
    let innerSubscription = null
    let index = 0
    let isComplete = false

    const sourceSubscription = source.subscribe({
      next(value) {
        // 如果有活跃的内部订阅，忽略这个值
        if (innerSubscription) {
          return
        }

        const innerObservable = project(value, index++)
        
        innerSubscription = innerObservable.subscribe({
          next(innerValue) {
            subscriber.next(innerValue)
          },
          error(err) {
            subscriber.error(err)
          },
          complete() {
            innerSubscription = null
            if (isComplete) {
              subscriber.complete()
            }
          }
        })
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        isComplete = true
        if (!innerSubscription) {
          subscriber.complete()
        }
      }
    })

    return () => {
      if (innerSubscription) {
        innerSubscription.unsubscribe()
      }
      sourceSubscription.unsubscribe()
    }
  })
}
```

## exhaustMapTo

固定内部 Observable：

```javascript
clicks$.pipe(
  exhaustMapTo(ajax('/api/submit'))
)

// 等价于
clicks$.pipe(
  exhaustMap(() => ajax('/api/submit'))
)
```

### 实现 exhaustMapTo

```javascript
function exhaustMapTo(innerObservable) {
  return exhaustMap(() => innerObservable)
}
```

## 实战示例

### 防止重复提交

```javascript
const submitBtn = document.getElementById('submit')

fromEvent(submitBtn, 'click').pipe(
  exhaustMap(() => {
    submitBtn.disabled = true
    return submitForm().pipe(
      finalize(() => {
        submitBtn.disabled = false
      })
    )
  })
).subscribe({
  next: result => showSuccess(result),
  error: err => showError(err)
})
```

### 防止重复登录

```javascript
const loginForm$ = fromEvent(loginForm, 'submit').pipe(
  tap(e => e.preventDefault()),
  map(() => getFormData())
)

loginForm$.pipe(
  exhaustMap(credentials => 
    authService.login(credentials).pipe(
      tap(user => {
        setCurrentUser(user)
        redirect('/dashboard')
      }),
      catchError(err => {
        showLoginError(err)
        return EMPTY
      })
    )
  )
).subscribe()
```

### 刷新按钮

```javascript
const refreshBtn$ = fromEvent(refreshBtn, 'click')

refreshBtn$.pipe(
  exhaustMap(() => {
    showLoading()
    return fetchData().pipe(
      finalize(() => hideLoading())
    )
  })
).subscribe(data => {
  renderData(data)
})
```

### 确认对话框

```javascript
const deleteBtn$ = fromEvent(deleteBtn, 'click')

deleteBtn$.pipe(
  exhaustMap(() => 
    showConfirmDialog('确定删除？').pipe(
      filter(confirmed => confirmed),
      switchMap(() => deleteItem())
    )
  )
).subscribe({
  next: () => showSuccess('已删除'),
  error: err => showError(err)
})
```

## exhaustAll

展平高阶 Observable（忽略繁忙时的新 Observable）：

```javascript
source$.pipe(
  map(x => fetchData(x)),
  exhaustAll()
)
```

### 实现 exhaustAll

```javascript
function exhaustAll() {
  return exhaustMap(inner => inner)
}
```

## 四种扁平化策略对比

```javascript
const source$ = interval(100).pipe(take(4))
const project = x => of(x).pipe(delay(250))

// mergeMap: 并行执行
source$.pipe(mergeMap(project))
// 0 1 2 3 (几乎同时，250ms后)

// switchMap: 取消之前的
source$.pipe(switchMap(project))
// 3 (只有最后一个)

// concatMap: 串行排队
source$.pipe(concatMap(project))
// 0 1 2 3 (串行，共1000ms)

// exhaustMap: 忽略繁忙时的
source$.pipe(exhaustMap(project))
// 0 3 (0完成后，1,2已过，只处理3)
```

时间线：

```
source$: 0-1-2-3|     (100ms间隔)

mergeMap:
         |---0---|
           |---1---|
             |---2---|
               |---3---|
输出:    -----0-1-2-3-->

switchMap:
         |---(取消)
           |---(取消)
             |---(取消)
               |---3---|
输出:    -----------3-->

concatMap:
         |---0---|---1---|---2---|---3---|
输出:    -----0-------1-------2-------3-->

exhaustMap:
         |---0---|
           (忽略)
             (忽略)
               |---3---|
输出:    -----0-------3-->
```

## 常见场景选择

| 场景 | 推荐操作符 | 原因 |
|------|-----------|------|
| 搜索建议 | switchMap | 只需最新结果 |
| 表单提交 | exhaustMap | 防止重复提交 |
| 批量下载 | mergeMap | 并行加速 |
| 文件上传序列 | concatMap | 保证顺序 |

## 常见陷阱

### 丢失请求

```javascript
// exhaustMap 会丢弃繁忙时的请求
// 如果每个请求都重要，不应该用 exhaustMap
importantEvents$.pipe(
  exhaustMap(e => processEvent(e))  // 繁忙时的事件会丢失!
)

// 如果都重要，用 concatMap 或 mergeMap
importantEvents$.pipe(
  concatMap(e => processEvent(e))  // 排队处理
)
```

### 长时间内部操作

```javascript
// 如果内部操作很长，可能会长时间无响应
source$.pipe(
  exhaustMap(() => veryLongOperation())
)

// 考虑添加超时
source$.pipe(
  exhaustMap(() => 
    veryLongOperation().pipe(
      timeout(10000),
      catchError(() => of(null))
    )
  )
)
```

## TypeScript 类型

```typescript
function exhaustMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>

function exhaustMapTo<R>(
  innerObservable: ObservableInput<R>
): OperatorFunction<any, R>

function exhaustAll<T>(): OperatorFunction<ObservableInput<T>, T>
```

## 本章小结

- `exhaustMap` 在内部执行期间忽略新值
- 完美解决重复提交问题
- 被忽略的值永远丢失
- 适合"繁忙时拒绝"的场景

下一章实现 `expand` 操作符。
