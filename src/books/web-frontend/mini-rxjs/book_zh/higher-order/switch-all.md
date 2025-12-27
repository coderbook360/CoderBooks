# switchAll：切换订阅

`switchAll` 将高阶 Observable 扁平化，当新的内层 Observable 到来时，取消前一个订阅。

## 基本概念

```typescript
const higher$ = interval(1000).pipe(
  take(3),
  map(i => interval(500).pipe(
    take(3),
    map(j => `${i}-${j}`)
  ))
)

higher$.pipe(switchAll()).subscribe(console.log)

// 输出：
// 0-0
// 0-1
// 1-0  ← 新的到来，取消 0-x
// 1-1
// 2-0  ← 新的到来，取消 1-x
// 2-1
// 2-2
```

时间线：

```
外层: ---A$-----B$-----C$-|

内层:
A$: ---1---2---3-|
B$:       ---4---5-|
C$:             ---6---7-|

switchAll:
    ---1---2-4---5-6---7-|
       └取消A$ └取消B$
```

## 实现 switchAll

```typescript
function switchAll<T>() {
  return (source: Observable<Observable<T>>) => {
    return new Observable<T>(subscriber => {
      let innerSubscription: Subscription | null = null
      let outerComplete = false
      let hasInner = false
      
      const outerSub = source.subscribe({
        next: inner$ => {
          hasInner = true
          
          // 取消前一个订阅
          innerSubscription?.unsubscribe()
          
          // 订阅新的
          innerSubscription = inner$.subscribe({
            next: value => subscriber.next(value),
            error: err => subscriber.error(err),
            complete: () => {
              innerSubscription = null
              hasInner = false
              
              if (outerComplete) {
                subscriber.complete()
              }
            }
          })
        },
        error: err => subscriber.error(err),
        complete: () => {
          outerComplete = true
          if (!hasInner) {
            subscriber.complete()
          }
        }
      })
      
      return () => {
        outerSub.unsubscribe()
        innerSubscription?.unsubscribe()
      }
    })
  }
}
```

## 核心特性：取消机制

**思考一下，为什么需要取消前一个订阅？**

```typescript
// 搜索场景
const searchInput$ = fromEvent(input, 'input')

const results$ = searchInput$.pipe(
  map(event => ajax(`/api/search?q=${event.target.value}`)),
  switchAll() // 新搜索时取消旧请求
)
```

**好处**：
1. 避免结果乱序
2. 节省网络资源
3. 确保显示最新结果

## 实战场景

### 场景1：搜索自动补全

```typescript
const searchInput$ = fromEvent(input, 'input')

searchInput$.pipe(
  debounceTime(300),
  map(event => ajax(`/api/search?q=${event.target.value}`)),
  switchAll()
).subscribe(displayResults)
```

### 场景2：切换标签页

```typescript
const tabClick$ = fromEvent(tabs, 'click')

tabClick$.pipe(
  map(event => {
    const tabId = event.target.dataset.tab
    return ajax(`/api/tab/${tabId}`)
  }),
  switchAll() // 切换标签页时取消前一个请求
).subscribe(displayContent)
```

### 场景3：实时预览

```typescript
const textChange$ = fromEvent(editor, 'input')

textChange$.pipe(
  debounceTime(500),
  map(event => renderMarkdown(event.target.value)), // 返回 Observable
  switchAll() // 新输入时取消旧的渲染
).subscribe(updatePreview)
```

## 与其他操作符对比

### switchAll vs mergeAll

```typescript
const clicks$ = fromEvent(button, 'click')

// switchAll：点击时取消前一个定时器
clicks$.pipe(
  map(() => interval(1000)),
  switchAll()
)

// mergeAll：点击时创建新定时器，同时运行
clicks$.pipe(
  map(() => interval(1000)),
  mergeAll()
)
```

### switchAll vs concatAll

```typescript
const source$ = interval(500).pipe(take(3))

// switchAll：快速切换，后面的会覆盖前面的
source$.pipe(
  map(i => interval(300).pipe(take(2), map(j => `${i}-${j}`))),
  switchAll()
)

// concatAll：等待前一个完成
source$.pipe(
  map(i => interval(300).pipe(take(2), map(j => `${i}-${j}`))),
  concatAll()
)
```

## 内存管理

```typescript
// ✅ switchAll 自动取消旧订阅，防止内存泄漏
searchInput$.pipe(
  map(query => ajax(`/api?q=${query}`)),
  switchAll()
)

// ❌ mergeAll 不取消，可能导致大量并发
searchInput$.pipe(
  map(query => ajax(`/api?q=${query}`)),
  mergeAll() // 每次输入都创建新请求
)
```

## 错误处理

```typescript
const source$ = interval(1000).pipe(take(3))

source$.pipe(
  map(i => {
    if (i === 1) {
      return throwError('错误')
    }
    return of(i)
  }),
  switchAll()
).subscribe({
  next: console.log,
  error: console.error // 内层错误传递到外层
})
```

## 完成时机

```typescript
const outer$ = interval(1000).pipe(take(3))

outer$.pipe(
  map(() => interval(500).pipe(take(2))),
  switchAll()
).subscribe({
  complete: () => {
    // 当外层完成 且 最后一个内层也完成时触发
    console.log('完成')
  }
})
```

## 性能优化

```typescript
// 避免频繁切换
searchInput$.pipe(
  debounceTime(300), // 先防抖
  distinctUntilChanged(), // 去重
  map(query => ajax(`/api?q=${query}`)),
  switchAll()
)
```

## 常见陷阱

### 陷阱1：前一个请求可能被取消

```typescript
// ❌ 快速切换可能导致没有结果
fastChanging$.pipe(
  map(() => ajax('/api/data')),
  switchAll()
)

// ✅ 加防抖
fastChanging$.pipe(
  debounceTime(300),
  map(() => ajax('/api/data')),
  switchAll()
)
```

### 陷阱2：副作用丢失

```typescript
// ❌ 副作用可能不完整
source$.pipe(
  map(() => doSideEffect()),
  switchAll()
)

// ✅ 在 map 中执行副作用
source$.pipe(
  tap(() => doSideEffect()),
  map(() => ajax('/api')),
  switchAll()
)
```

## 总结

**switchAll**：
- 切换到最新的内层 Observable
- 自动取消前一个订阅
- 确保只处理最新的流

**使用场景**：
- 搜索自动补全
- 标签页切换
- 实时预览
- 需要最新结果的场景

**关键特性**：
- 取消机制：防止资源浪费
- 顺序保证：确保结果是最新的
- 内存友好：自动清理旧订阅
