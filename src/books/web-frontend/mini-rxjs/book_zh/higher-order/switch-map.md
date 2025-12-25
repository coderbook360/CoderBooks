---
sidebar_position: 60
title: "switchMap"
---

# switchMap

`switchMap` 将值映射为 Observable，并切换到新的内部 Observable，取消之前的。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.pipe(
  switchMap(() => interval(1000))
).subscribe(console.log)
// 每次点击重新开始计数：0, 1, 2... 点击... 0, 1, 2...
```

时间线：

```
clicks$: ----c---------c-------->
inner:       |--0--1--2--|--0--1--2-->
                   取消^    新订阅
output:  ------0--1--2----0--1--2-->
```

## 实现 switchMap

```javascript
function switchMap(project) {
  return (source) => new Observable(subscriber => {
    let innerSubscription = null
    let index = 0
    let isComplete = false

    const sourceSubscription = source.subscribe({
      next(value) {
        // 取消之前的内部订阅
        if (innerSubscription) {
          innerSubscription.unsubscribe()
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
        // 只有内部也完成才完成
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

## switchMapTo

不需要外部值，直接切换到固定的 Observable：

```javascript
// switchMapTo 是 switchMap 的简化
clicks$.pipe(
  switchMapTo(interval(1000))
)

// 等价于
clicks$.pipe(
  switchMap(() => interval(1000))
)
```

### 实现 switchMapTo

```javascript
function switchMapTo(innerObservable) {
  return switchMap(() => innerObservable)
}
```

## 实战示例

### 搜索建议

```javascript
const search$ = fromEvent(searchInput, 'input').pipe(
  map(e => e.target.value),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => {
    if (term.length < 2) {
      return of([])
    }
    return ajax(`/api/suggestions?q=${term}`).pipe(
      map(res => res.response),
      catchError(() => of([]))
    )
  })
)

search$.subscribe(suggestions => {
  renderSuggestions(suggestions)
})
```

### 路由数据加载

```javascript
const routeParams$ = router.params$

routeParams$.pipe(
  switchMap(({ id }) => 
    forkJoin({
      user: fetchUser(id),
      posts: fetchUserPosts(id)
    })
  )
).subscribe(({ user, posts }) => {
  renderProfile(user, posts)
})
```

### 轮询控制

```javascript
const polling$ = isPollingEnabled$.pipe(
  switchMap(enabled => {
    if (enabled) {
      return interval(5000).pipe(
        startWith(0),
        switchMap(() => fetchData())
      )
    }
    return EMPTY
  })
)

polling$.subscribe(data => {
  updateUI(data)
})
```

### Tab 切换

```javascript
const activeTab$ = fromEvent(tabs, 'click').pipe(
  map(e => e.target.dataset.tab)
)

activeTab$.pipe(
  switchMap(tabId => loadTabContent(tabId))
).subscribe(content => {
  renderTabContent(content)
})
```

## switch 静态函数

将高阶 Observable 展平：

```javascript
const higherOrder$ = of(
  interval(1000).pipe(take(3)),
  interval(500).pipe(take(3))
)

// switch 自动切换到最新的内部 Observable
higherOrder$.pipe(
  switchAll()  // RxJS 中叫 switchAll
).subscribe(console.log)
```

### 实现 switchAll

```javascript
function switchAll() {
  return switchMap(inner => inner)
}
```

## switchMap vs mergeMap

```javascript
const clicks$ = fromEvent(document, 'click')

// switchMap: 取消之前的
clicks$.pipe(
  switchMap(() => ajax('/api/data'))
).subscribe(...)
// 快速点击3次：只有最后一次请求完成

// mergeMap: 并发所有
clicks$.pipe(
  mergeMap(() => ajax('/api/data'))
).subscribe(...)
// 快速点击3次：3个请求都会完成
```

何时选择 switchMap：
- 只关心最新结果
- 之前的结果已过时
- 需要避免竞态条件

何时选择 mergeMap：
- 所有请求都需要完成
- 结果独立，不会过时
- 需要并行处理

## 常见陷阱

### 请求竞态

```javascript
// 问题：旧请求可能比新请求慢
// 如果用户输入 "ab"，然后快速改成 "a"
// 可能 "a" 的结果先返回，"ab" 的结果后返回覆盖了
mergeMap(term => ajax(`/api/search?q=${term}`))

// 解决：用 switchMap
switchMap(term => ajax(`/api/search?q=${term}`))
// "ab" 的请求被取消
```

### 完成时机

```javascript
// 源完成 + 内部完成 = 整体完成
of(1, 2, 3).pipe(
  switchMap(x => of(x).pipe(delay(1000)))
).subscribe({
  complete: () => console.log('done')
})
// 因为 switchMap 取消之前的，只有 3 的内部完成后才 complete
```

### 错误处理

```javascript
// 内部错误会终止整个流
source$.pipe(
  switchMap(x => mayFail(x))  // 如果失败，整个流终止
)

// 解决：在内部处理错误
source$.pipe(
  switchMap(x => mayFail(x).pipe(
    catchError(err => {
      logError(err)
      return EMPTY  // 或 of(fallbackValue)
    })
  ))
)
```

## TypeScript 类型

```typescript
function switchMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>

function switchMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  resultSelector: (
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperatorFunction<T, R>

function switchMapTo<R>(
  innerObservable: ObservableInput<R>
): OperatorFunction<any, R>

function switchAll<T>(): OperatorFunction<ObservableInput<T>, T>
```

## 本章小结

- `switchMap` 切换到新的内部 Observable，取消之前的
- 适合搜索、路由、Tab 切换等场景
- 自动处理竞态条件
- 错误需要在内部处理以避免终止流

下一章实现 `mergeMap` 操作符。
