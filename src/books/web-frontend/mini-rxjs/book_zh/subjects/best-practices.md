---
sidebar_position: 83
title: "Subject 最佳实践"
---

# Subject 最佳实践

本章总结 Subject 的使用模式和最佳实践。

## 封装原则

### 不要暴露 Subject

```javascript
// ❌ 错误：暴露 Subject
class UserService {
  currentUser$ = new BehaviorSubject(null)
}

// 外部可以随意修改
service.currentUser$.next({ name: 'Hacker' })
service.currentUser$.complete()

// ✅ 正确：只暴露 Observable
class UserService {
  private _currentUser$ = new BehaviorSubject(null)
  
  // 只读访问
  get currentUser$() {
    return this._currentUser$.asObservable()
  }
  
  // 通过方法修改
  setUser(user) {
    this._currentUser$.next(user)
  }
}
```

### 提供类型安全的 API

```javascript
// ✅ 完整的类型安全封装
class Store<T> {
  private state$: BehaviorSubject<T>
  
  constructor(initialState: T) {
    this.state$ = new BehaviorSubject(initialState)
  }
  
  // 只读 Observable
  select<K>(selector: (state: T) => K): Observable<K> {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    )
  }
  
  // 获取当前值快照
  getSnapshot(): T {
    return this.state$.getValue()
  }
  
  // 类型安全的更新
  update(updater: (state: T) => T): void {
    const current = this.state$.getValue()
    this.state$.next(updater(current))
  }
  
  // 部分更新
  patch(partial: Partial<T>): void {
    this.update(state => ({ ...state, ...partial }))
  }
}
```

## 生命周期管理

### 组件级 Subject

```javascript
class Component {
  private destroy$ = new Subject<void>()
  private data$ = new BehaviorSubject<Data>(null)
  
  init() {
    // 使用 takeUntil 自动清理
    api.getData().pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.data$.next(data)
    })
    
    // 所有订阅都应该使用 takeUntil
    this.data$.pipe(
      takeUntil(this.destroy$),
      filter(d => d !== null)
    ).subscribe(data => {
      this.render(data)
    })
  }
  
  destroy() {
    this.destroy$.next()
    this.destroy$.complete()
    this.data$.complete()
  }
}
```

### 服务级 Subject

```javascript
// 应用级服务，不需要销毁
class AuthService {
  private user$ = new BehaviorSubject<User>(null)
  
  // 服务生命周期与应用相同，不需要 complete
}

// 模块级服务，需要管理生命周期
class FeatureService {
  private data$ = new BehaviorSubject<Data>(null)
  private subscriptions = new Subscription()
  
  init() {
    this.subscriptions.add(
      source$.subscribe(v => this.data$.next(v))
    )
  }
  
  dispose() {
    this.subscriptions.unsubscribe()
    this.data$.complete()
  }
}
```

## 错误处理

### Subject 的错误会终止流

```javascript
const subject = new Subject()

subject.subscribe({
  next: console.log,
  error: console.error
})

subject.next(1)  // 1
subject.error(new Error('oops'))  // Error
subject.next(2)  // 不会输出，Subject 已停止
```

### 避免 Subject 出错

```javascript
// ❌ 错误：让 Subject 接收错误
api.getData().subscribe(subject)  // 可能出错

// ✅ 正确：在外部处理错误
api.getData().subscribe({
  next: data => subject.next(data),
  error: err => {
    console.error('API error:', err)
    // 不传递错误给 Subject
  }
})

// ✅ 或者使用 catchError
api.getData().pipe(
  catchError(err => {
    console.error('API error:', err)
    return EMPTY
  })
).subscribe(subject)
```

### 错误恢复模式

```javascript
class DataService {
  private data$ = new BehaviorSubject<Data>(null)
  private error$ = new Subject<Error>()
  
  fetch() {
    api.getData().subscribe({
      next: data => this.data$.next(data),
      error: err => {
        this.error$.next(err)
        // data$ 保持之前的值，不受影响
      }
    })
  }
  
  // 分开订阅数据和错误
  get data() { return this.data$.asObservable() }
  get errors() { return this.error$.asObservable() }
}
```

## 性能优化

### 避免不必要的发射

```javascript
// ❌ 每次都发射
class Counter {
  count$ = new BehaviorSubject(0)
  
  set(value) {
    this.count$.next(value)  // 即使值相同也会发射
  }
}

// ✅ 只在值变化时发射
class Counter {
  private _count$ = new BehaviorSubject(0)
  count$ = this._count$.pipe(distinctUntilChanged())
  
  set(value) {
    this._count$.next(value)
  }
}

// ✅ 或者在写入时检查
class Counter {
  count$ = new BehaviorSubject(0)
  
  set(value) {
    if (value !== this.count$.getValue()) {
      this.count$.next(value)
    }
  }
}
```

### 批量更新

```javascript
// ❌ 多次发射
class Form {
  name$ = new BehaviorSubject('')
  email$ = new BehaviorSubject('')
  
  reset() {
    this.name$.next('')  // 触发订阅者
    this.email$.next('') // 再次触发
  }
}

// ✅ 合并状态，一次发射
class Form {
  state$ = new BehaviorSubject({ name: '', email: '' })
  
  reset() {
    this.state$.next({ name: '', email: '' })  // 只触发一次
  }
  
  get name$() {
    return this.state$.pipe(
      map(s => s.name),
      distinctUntilChanged()
    )
  }
  
  get email$() {
    return this.state$.pipe(
      map(s => s.email),
      distinctUntilChanged()
    )
  }
}
```

### 懒初始化

```javascript
// ❌ 立即创建所有 Subject
class Service {
  feature1$ = new BehaviorSubject(null)
  feature2$ = new BehaviorSubject(null)
  feature3$ = new BehaviorSubject(null)
  // 可能用不到的功能也创建了
}

// ✅ 按需创建
class Service {
  private subjects = new Map()
  
  getFeature$(name) {
    if (!this.subjects.has(name)) {
      this.subjects.set(name, new BehaviorSubject(null))
    }
    return this.subjects.get(name).asObservable()
  }
}
```

## 测试友好

### 提供测试替身

```javascript
// 接口定义
interface IUserService {
  user$: Observable<User>
  setUser(user: User): void
}

// 实现
class UserService implements IUserService {
  private _user$ = new BehaviorSubject<User>(null)
  user$ = this._user$.asObservable()
  
  setUser(user: User) {
    this._user$.next(user)
  }
}

// 测试替身
class MockUserService implements IUserService {
  private _user$ = new BehaviorSubject<User>(null)
  user$ = this._user$.asObservable()
  
  setUser(user: User) {
    this._user$.next(user)
  }
  
  // 测试辅助方法
  mockUser(user: User) {
    this._user$.next(user)
  }
}
```

### 可控制的时间

```javascript
class TimerService {
  // 注入调度器，便于测试
  constructor(private scheduler = asyncScheduler) {}
  
  interval$(period: number) {
    return interval(period, this.scheduler)
  }
}

// 测试中使用 TestScheduler
const testScheduler = new TestScheduler()
const service = new TimerService(testScheduler)

// 可以精确控制时间
```

## 常见模式

### 状态 + 动作

```javascript
class Store<State, Action> {
  private state$: BehaviorSubject<State>
  private actions$ = new Subject<Action>()
  
  constructor(
    initialState: State,
    reducer: (state: State, action: Action) => State
  ) {
    this.state$ = new BehaviorSubject(initialState)
    
    this.actions$.pipe(
      scan((state, action) => reducer(state, action), initialState)
    ).subscribe(this.state$)
  }
  
  dispatch(action: Action) {
    this.actions$.next(action)
  }
  
  select<T>(selector: (state: State) => T) {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    )
  }
}
```

### 请求状态机

```javascript
interface RequestState<T> {
  loading: boolean
  data: T | null
  error: Error | null
}

class RequestService<T> {
  private state$ = new BehaviorSubject<RequestState<T>>({
    loading: false,
    data: null,
    error: null
  })
  
  get loading$() { return this.state$.pipe(map(s => s.loading)) }
  get data$() { return this.state$.pipe(map(s => s.data)) }
  get error$() { return this.state$.pipe(map(s => s.error)) }
  
  execute(request$: Observable<T>) {
    this.state$.next({ loading: true, data: null, error: null })
    
    return request$.pipe(
      tap({
        next: data => this.state$.next({ loading: false, data, error: null }),
        error: error => this.state$.next({ loading: false, data: null, error })
      })
    )
  }
}
```

### 选择器模式

```javascript
class Selectors<T> {
  constructor(private source$: Observable<T>) {}
  
  // 创建记忆化的选择器
  select<R>(
    selector: (state: T) => R,
    comparator = (a: R, b: R) => a === b
  ): Observable<R> {
    return this.source$.pipe(
      map(selector),
      distinctUntilChanged(comparator),
      shareReplay(1)
    )
  }
  
  // 组合选择器
  combine<R, S1, S2>(
    s1: Observable<S1>,
    s2: Observable<S2>,
    combiner: (v1: S1, v2: S2) => R
  ): Observable<R> {
    return combineLatest([s1, s2]).pipe(
      map(([v1, v2]) => combiner(v1, v2)),
      distinctUntilChanged(),
      shareReplay(1)
    )
  }
}
```

## 反模式

### 1. Subject 当 Promise 用

```javascript
// ❌ 错误
async function getData() {
  const subject = new AsyncSubject()
  api.getData().subscribe(subject)
  return subject.toPromise()  // 为什么不直接用 Promise？
}

// ✅ 正确：如果只需要一次性值，直接用 Promise
async function getData() {
  return api.getData().toPromise()
}
```

### 2. 过度使用 Subject

```javascript
// ❌ 不需要 Subject
const result$ = new Subject()
source$.pipe(map(x => x * 2)).subscribe(result$)

// ✅ 直接使用管道
const result$ = source$.pipe(map(x => x * 2))
```

### 3. Subject 链

```javascript
// ❌ 过度复杂
const a$ = new Subject()
const b$ = new Subject()
const c$ = new Subject()

a$.subscribe(b$)
b$.subscribe(c$)

// ✅ 简单管道
const c$ = a$.pipe(
  // 转换
)
```

## 检查清单

使用 Subject 时的检查清单：

```markdown
- [ ] Subject 是否需要？能否用纯 Observable 替代？
- [ ] 是否暴露了 Subject？应该用 asObservable()
- [ ] 选择了正确的 Subject 类型？
- [ ] 错误处理是否正确？Subject 不应该接收错误
- [ ] 生命周期管理是否正确？complete 时机
- [ ] 是否有内存泄漏？订阅是否清理
- [ ] 是否可测试？是否可注入
```

## 本章小结

- 不要暴露 Subject，使用 `asObservable()`
- 正确管理生命周期，使用 `takeUntil` 或手动 `complete`
- Subject 不应该接收错误，在外部处理错误
- 避免不必要的发射，使用 `distinctUntilChanged`
- 批量更新优于多次发射
- 遵循测试友好的设计

下一章进入 Scheduler 深度解析。
