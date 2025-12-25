---
sidebar_position: 56
title: "forkJoin"
---

# forkJoin

`forkJoin` 等待所有源完成，然后发射每个源的最后一个值组成的数组。

## 基本用法

```javascript
const user$ = ajax('/api/user')
const posts$ = ajax('/api/posts')
const comments$ = ajax('/api/comments')

forkJoin([user$, posts$, comments$]).subscribe(
  ([user, posts, comments]) => {
    renderPage(user, posts, comments)
  }
)
```

时间线：

```
user$:     ---u|
posts$:    -----p|
comments$: --c|
output:    -----[u,p,c]|
```

**关键特征**：类似 `Promise.all`，等所有都完成，只发射一次。

## 实现 forkJoin

```javascript
function forkJoin(sources) {
  // 支持数组和对象两种形式
  const isObject = !Array.isArray(sources)
  const keys = isObject ? Object.keys(sources) : null
  const sourcesArray = isObject ? Object.values(sources) : sources

  return new Observable(subscriber => {
    const n = sourcesArray.length
    
    if (n === 0) {
      subscriber.next(isObject ? {} : [])
      subscriber.complete()
      return
    }

    const values = new Array(n)
    const hasValue = new Array(n).fill(false)
    let completedCount = 0
    const subscriptions = []

    sourcesArray.forEach((source, index) => {
      const subscription = source.subscribe({
        next(value) {
          values[index] = value
          hasValue[index] = true
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          completedCount++
          
          if (completedCount === n) {
            // 检查所有源都有值
            if (hasValue.every(Boolean)) {
              if (isObject) {
                const result = {}
                keys.forEach((key, i) => {
                  result[key] = values[i]
                })
                subscriber.next(result)
              } else {
                subscriber.next(values)
              }
            }
            subscriber.complete()
          }
        }
      })

      subscriptions.push(subscription)
    })

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
    }
  })
}
```

## 使用对象形式

```javascript
forkJoin({
  user: ajax('/api/user'),
  posts: ajax('/api/posts'),
  settings: ajax('/api/settings')
}).subscribe(({ user, posts, settings }) => {
  // 直接解构使用
  init(user, posts, settings)
})
```

## 实战示例

### 并行 API 请求

```javascript
function loadDashboard() {
  return forkJoin({
    stats: fetchStats(),
    notifications: fetchNotifications(),
    tasks: fetchTasks()
  })
}

loadDashboard().subscribe(data => {
  renderDashboard(data)
})
```

### 页面初始化

```javascript
// 等待所有必需数据加载完成
forkJoin({
  config: loadConfig(),
  i18n: loadTranslations(locale),
  user: getCurrentUser()
}).subscribe({
  next: ({ config, i18n, user }) => {
    initApp(config, i18n, user)
  },
  error: err => {
    showFatalError(err)
  }
})
```

### 批量操作

```javascript
const ids = [1, 2, 3, 4, 5]

forkJoin(
  ids.map(id => deleteItem(id))
).subscribe({
  complete: () => {
    showSuccess('All items deleted')
    refreshList()
  },
  error: err => {
    showError('Some deletions failed')
  }
})
```

### 文件批量上传

```javascript
const files = Array.from(fileInput.files)

forkJoin(
  files.map(file => uploadFile(file))
).subscribe({
  next: results => {
    console.log('All uploaded:', results)
  },
  error: err => {
    console.log('Upload failed:', err)
  }
})
```

## forkJoin vs combineLatest

```javascript
const a$ = of(1, 2, 3)
const b$ = of('A', 'B', 'C')

// forkJoin: 只发射一次（最后值）
forkJoin([a$, b$]).subscribe(console.log)
// [3, 'C']

// combineLatest: 发射多次
combineLatest([a$, b$]).subscribe(console.log)
// [3, 'A'], [3, 'B'], [3, 'C']
```

对比：

| 场景 | 选择 |
|------|------|
| 一次性数据加载 | `forkJoin` |
| 持续状态组合 | `combineLatest` |
| 类似 Promise.all | `forkJoin` |
| 表单字段联动 | `combineLatest` |

## 错误处理

### 任一失败则失败

```javascript
forkJoin([
  ajax('/api/a'),
  throwError(() => new Error('failed')),
  ajax('/api/c')
]).subscribe({
  error: err => console.log(err)  // 'failed'
})
// a 和 c 的结果丢失
```

### 独立错误处理

```javascript
forkJoin([
  ajax('/api/a').pipe(
    catchError(err => of({ error: err, source: 'a' }))
  ),
  ajax('/api/b').pipe(
    catchError(err => of({ error: err, source: 'b' }))
  ),
  ajax('/api/c').pipe(
    catchError(err => of({ error: err, source: 'c' }))
  )
]).subscribe(([a, b, c]) => {
  // 每个结果可能是数据或错误对象
  if (a.error) handleError(a)
  else useData(a)
})
```

## 常见陷阱

### 空源

```javascript
// 空数组：立即完成，发射空数组
forkJoin([]).subscribe(console.log)
// []

// 有源但无值：不发射，直接完成
forkJoin([EMPTY]).subscribe({
  next: v => console.log('next', v),  // 不触发
  complete: () => console.log('complete')  // 触发
})
```

### 永不完成的源

```javascript
// 问题：interval 永不完成
forkJoin([
  of(1),
  interval(1000)  // 永不完成
]).subscribe(...)
// 永远不会发射

// 解决：使用 take 限制
forkJoin([
  of(1),
  interval(1000).pipe(take(5))
]).subscribe(console.log)
// [1, 4]
```

### 与 Promise 混用

```javascript
// 可以混用（会自动转换）
forkJoin({
  rxjsResult: ajax('/api/data'),
  promiseResult: fetch('/api/other').then(r => r.json())
}).subscribe(console.log)
```

## TypeScript 类型

```typescript
function forkJoin<A extends readonly unknown[]>(
  sources: [...ObservableInputTuple<A>]
): Observable<A>

function forkJoin<T extends Record<string, ObservableInput<any>>>(
  sources: T
): Observable<{ [K in keyof T]: ObservedValueOf<T[K]> }>

// 空数组
function forkJoin(sources: []): Observable<never>
```

## 本章小结

- `forkJoin` 等所有源完成，发射最后值数组
- 类似 `Promise.all` 的行为
- 适合一次性并行数据加载
- 任一源失败则整体失败
- 源必须能完成，否则永远等待

下一章实现 `race` 操作符。
