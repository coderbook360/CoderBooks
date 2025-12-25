---
sidebar_position: 108
title: "最佳实践总结"
---

# 最佳实践总结

本章总结 RxJS 开发的最佳实践和常见模式。

## 订阅管理

### 避免内存泄漏

```typescript
// ❌ 错误：未取消订阅
class Component {
  ngOnInit() {
    interval(1000).subscribe(x => this.update(x))
  }
}

// ✅ 正确：使用 takeUntil
class Component {
  private destroy$ = new Subject<void>()
  
  ngOnInit() {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(x => this.update(x))
  }
  
  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

### 集中管理订阅

```typescript
// ✅ 使用 Subscription 收集
class Service {
  private subscriptions = new Subscription()
  
  start() {
    this.subscriptions.add(
      stream1$.subscribe(/* ... */)
    )
    this.subscriptions.add(
      stream2$.subscribe(/* ... */)
    )
  }
  
  stop() {
    this.subscriptions.unsubscribe()
  }
}
```

## 错误处理

### 不要让错误传播

```typescript
// ❌ 错误：一个请求失败导致整个流失败
merge(api1$, api2$, api3$).subscribe()

// ✅ 正确：隔离每个请求的错误
merge(
  api1$.pipe(catchError(() => EMPTY)),
  api2$.pipe(catchError(() => EMPTY)),
  api3$.pipe(catchError(() => EMPTY))
).subscribe()
```

### 提供降级值

```typescript
// ✅ 错误时返回默认值
const user$ = fetchUser().pipe(
  catchError(err => {
    console.error('Failed to fetch user:', err)
    return of(defaultUser)
  })
)
```

### 重试策略

```typescript
// ✅ 带退避的重试
const retryWithBackoff = <T>() => (source: Observable<T>) =>
  source.pipe(
    retryWhen(errors =>
      errors.pipe(
        scan((count, err) => {
          if (count >= 3) throw err
          return count + 1
        }, 0),
        delayWhen(count => timer(1000 * Math.pow(2, count)))
      )
    )
  )

api$.pipe(retryWithBackoff()).subscribe()
```

## 性能优化

### 避免不必要的订阅

```typescript
// ❌ 错误：每次调用都创建新订阅
function getData() {
  return http.get('/api').subscribe(data => {
    // 处理数据
  })
}

// ✅ 正确：共享订阅
const data$ = http.get('/api').pipe(shareReplay(1))

function getData() {
  return data$
}
```

### 使用适当的操作符

```typescript
// ❌ 搜索用 mergeMap（可能有竞态）
search$.pipe(
  mergeMap(term => fetchResults(term))
)

// ✅ 搜索用 switchMap（取消旧请求）
search$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => fetchResults(term))
)
```

### 限制并发

```typescript
// ✅ 限制并发请求数
urls$.pipe(
  mergeMap(url => fetch(url), 3)  // 最多 3 个并发
)
```

## 代码组织

### 封装复杂流

```typescript
// ❌ 链式调用太长
source$.pipe(
  filter(x => x.valid),
  map(x => x.data),
  switchMap(data => api.save(data)),
  retry(3),
  catchError(err => of({ error: err })),
  tap(result => log(result))
).subscribe()

// ✅ 拆分为独立操作符
const validateData = () => filter<Data>(x => x.valid)
const extractData = () => map<Data, DataPayload>(x => x.data)
const saveWithRetry = () => pipe(
  switchMap((data: DataPayload) => api.save(data)),
  retry(3)
)
const handleError = () => catchError(err => of({ error: err }))

source$.pipe(
  validateData(),
  extractData(),
  saveWithRetry(),
  handleError()
).subscribe()
```

### 使用工厂函数

```typescript
// ✅ 创建可复用的流
function createPolling<T>(
  request: () => Observable<T>,
  interval: number
) {
  return timer(0, interval).pipe(
    switchMap(() => request()),
    retry(3),
    shareReplay(1)
  )
}

const users$ = createPolling(() => fetchUsers(), 30000)
const stats$ = createPolling(() => fetchStats(), 60000)
```

## Subject 使用

### 优先使用 Observable

```typescript
// ❌ 暴露 Subject
class Service {
  data$ = new Subject<Data>()  // 外部可以 next()
}

// ✅ 暴露 Observable
class Service {
  private dataSubject = new Subject<Data>()
  data$ = this.dataSubject.asObservable()  // 只读
  
  updateData(data: Data) {
    this.dataSubject.next(data)
  }
}
```

### 选择正确的 Subject

```typescript
// BehaviorSubject - 需要当前值
const currentUser$ = new BehaviorSubject<User | null>(null)

// ReplaySubject - 需要缓存历史
const messages$ = new ReplaySubject<Message>(50)

// Subject - 仅事件通知
const events$ = new Subject<Event>()
```

## 测试策略

### 使用 Marble 测试

```typescript
// ✅ 精确测试时间行为
it('should debounce', () => {
  testScheduler.run(({ cold, expectObservable }) => {
    const source = cold('a-b---c|')
    const expected =    '--b-----c|'
    expectObservable(source.pipe(debounceTime(2))).toBe(expected)
  })
})
```

### 隔离副作用

```typescript
// ✅ 依赖注入便于测试
class DataService {
  constructor(private http: HttpClient) {}
  
  getData() {
    return this.http.get('/api')
  }
}

// 测试时注入 mock
const mockHttp = { get: () => of(mockData) }
const service = new DataService(mockHttp)
```

## 常见模式

### 防抖搜索

```typescript
const search$ = fromEvent(input, 'input').pipe(
  map(e => (e.target as HTMLInputElement).value),
  debounceTime(300),
  distinctUntilChanged(),
  filter(term => term.length >= 2),
  switchMap(term => searchApi(term)),
  catchError(() => of([]))
)
```

### 轮询刷新

```typescript
const data$ = timer(0, 30000).pipe(
  switchMap(() => fetchData()),
  retry(3),
  shareReplay(1)
)
```

### 表单验证

```typescript
const isValid$ = combineLatest([
  name$.pipe(map(v => v.length > 0)),
  email$.pipe(map(v => isEmail(v))),
  age$.pipe(map(v => v >= 18))
]).pipe(
  map(([name, email, age]) => name && email && age)
)
```

### 加载状态

```typescript
const loading$ = new BehaviorSubject(false)

function fetchWithLoading<T>(request: Observable<T>) {
  return defer(() => {
    loading$.next(true)
    return request.pipe(
      finalize(() => loading$.next(false))
    )
  })
}
```

### 缓存请求

```typescript
const cache = new Map<string, Observable<any>>()

function cachedRequest<T>(key: string, request: () => Observable<T>) {
  if (!cache.has(key)) {
    cache.set(key, request().pipe(shareReplay(1)))
  }
  return cache.get(key)!
}
```

## 调试技巧

### 使用 tap 记录

```typescript
source$.pipe(
  tap({
    next: v => console.log('Next:', v),
    error: e => console.error('Error:', e),
    complete: () => console.log('Complete')
  })
)
```

### 追踪订阅

```typescript
let subscriptionCount = 0

const tracked$ = source$.pipe(
  tap({
    subscribe: () => console.log('Subscribe:', ++subscriptionCount),
    unsubscribe: () => console.log('Unsubscribe:', --subscriptionCount)
  })
)
```

## 检查清单

### 创建 Observable 时

- [ ] 是否需要共享订阅？使用 `share/shareReplay`
- [ ] 是否需要延迟创建？使用 `defer`
- [ ] 是否处理了空值？

### 使用操作符时

- [ ] 选择正确的高阶操作符（switch/merge/concat/exhaust）
- [ ] 是否需要去重？使用 `distinctUntilChanged`
- [ ] 是否需要防抖/节流？

### 订阅时

- [ ] 是否管理了订阅生命周期？
- [ ] 是否处理了错误？
- [ ] 是否有清理逻辑？

### 测试时

- [ ] 是否测试了正常路径？
- [ ] 是否测试了错误路径？
- [ ] 是否测试了边界情况？
- [ ] 是否测试了取消订阅？

## 本章小结

- 始终管理订阅，避免内存泄漏
- 隔离错误，提供降级方案
- 选择正确的操作符
- 封装复杂流为可复用单元
- Subject 优先暴露为 Observable
- 使用 Marble 图精确测试

---

**恭喜完成 Mini RxJS 学习之旅！**

通过这本书，你应该已经掌握了：
- RxJS 的核心概念和设计思想
- 从零实现 Observable、操作符、Subject
- 响应式编程的最佳实践
- 如何阅读和理解 RxJS 源码

希望这些知识能帮助你在实际项目中更好地使用 RxJS！
