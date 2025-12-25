---
sidebar_position: 53
title: "combineLatest"
---

# combineLatest

`combineLatest` 将多个源的最新值组合成数组，任一源发射时都会触发。

## 基本用法

```javascript
const a$ = new Subject()
const b$ = new Subject()

combineLatest([a$, b$]).subscribe(console.log)

a$.next(1)      // 不发射（b$ 还没值）
b$.next('A')    // [1, 'A']
a$.next(2)      // [2, 'A']
b$.next('B')    // [2, 'B']
```

时间线：

```
a$: --1-----2-------->
b$: ----A-------B---->
out:----[1,A]-[2,A]-[2,B]->
```

**关键特征**：必须所有源都至少发射过一次值，才会开始输出。

## 实现 combineLatest

```javascript
function combineLatest(sources) {
  return new Observable(subscriber => {
    const n = sources.length
    const values = new Array(n)
    const hasValue = new Array(n).fill(false)
    let hasValueCount = 0
    let completedCount = 0
    const subscriptions = []

    sources.forEach((source, index) => {
      const subscription = source.subscribe({
        next(value) {
          values[index] = value
          
          if (!hasValue[index]) {
            hasValue[index] = true
            hasValueCount++
          }

          // 只有所有源都有值才发射
          if (hasValueCount === n) {
            subscriber.next([...values])
          }
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          completedCount++
          if (completedCount === n) {
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

RxJS 7+ 支持对象形式：

```javascript
combineLatest({
  user: user$,
  settings: settings$,
  theme: theme$
}).subscribe(({ user, settings, theme }) => {
  render(user, settings, theme)
})
```

### 实现对象形式

```javascript
function combineLatestObject(sourcesObj) {
  const keys = Object.keys(sourcesObj)
  const sources = keys.map(k => sourcesObj[k])

  return combineLatest(sources).pipe(
    map(values => {
      const result = {}
      keys.forEach((key, i) => {
        result[key] = values[i]
      })
      return result
    })
  )
}
```

## 实战示例

### 表单验证

```javascript
const username$ = fromEvent(usernameInput, 'input').pipe(
  map(e => e.target.value),
  startWith('')
)
const password$ = fromEvent(passwordInput, 'input').pipe(
  map(e => e.target.value),
  startWith('')
)

combineLatest([username$, password$]).pipe(
  map(([username, password]) => ({
    valid: username.length >= 3 && password.length >= 6,
    errors: {
      username: username.length < 3 ? 'Too short' : null,
      password: password.length < 6 ? 'Too short' : null
    }
  }))
).subscribe(({ valid, errors }) => {
  submitBtn.disabled = !valid
  showErrors(errors)
})
```

### 多维度筛选

```javascript
const category$ = categorySelect$.pipe(startWith('all'))
const price$ = priceRange$.pipe(startWith([0, Infinity]))
const sort$ = sortSelect$.pipe(startWith('default'))

combineLatest([category$, price$, sort$]).pipe(
  debounceTime(300),
  switchMap(([category, [minPrice, maxPrice], sort]) =>
    fetchProducts({ category, minPrice, maxPrice, sort })
  )
).subscribe(products => {
  renderProducts(products)
})
```

### 权限计算

```javascript
const user$ = userService.currentUser$
const permissions$ = permissionService.permissions$
const feature$ = featureFlags$

combineLatest([user$, permissions$, feature$]).pipe(
  map(([user, permissions, features]) => ({
    canEdit: user.role === 'admin' && permissions.includes('edit'),
    canDelete: user.role === 'admin' && permissions.includes('delete'),
    showBeta: features.betaFeatures && user.betaTester
  }))
).subscribe(abilities => {
  updateUI(abilities)
})
```

### 响应式布局

```javascript
const windowWidth$ = fromEvent(window, 'resize').pipe(
  map(() => window.innerWidth),
  startWith(window.innerWidth)
)
const sidebarOpen$ = sidebarState$

combineLatest([windowWidth$, sidebarOpen$]).pipe(
  map(([width, sidebarOpen]) => {
    if (width < 768) return 'mobile'
    if (sidebarOpen) return 'desktop-sidebar'
    return 'desktop-full'
  }),
  distinctUntilChanged()
).subscribe(layout => {
  setLayout(layout)
})
```

## combineLatest vs withLatestFrom

```javascript
const a$ = interval(1000).pipe(map(x => `A${x}`))
const b$ = interval(2500).pipe(map(x => `B${x}`))

// combineLatest: 任一源发射都触发
combineLatest([a$, b$]).subscribe(console.log)
// [A0, B0], [A1, B0], [A2, B0], [A2, B1], ...

// withLatestFrom: 只有主源发射才触发
a$.pipe(
  withLatestFrom(b$)
).subscribe(console.log)
// [A2, B0], [A3, B0], [A4, B1], ...
```

| 特性 | combineLatest | withLatestFrom |
|------|---------------|----------------|
| 触发条件 | 任一源发射 | 主源发射 |
| 等待策略 | 等所有源有值 | 等辅助源有值 |
| 适用场景 | 多源对等组合 | 主从关系 |

## 常见陷阱

### 初始值问题

```javascript
// 问题：永远不发射（如果某个源从不发射）
combineLatest([
  user$,
  neverEmits$
])

// 解决：使用 startWith
combineLatest([
  user$.pipe(startWith(null)),
  settings$.pipe(startWith(defaultSettings))
])
```

### 频繁触发

```javascript
// 问题：多个源同时变化，触发多次
combineLatest([a$, b$, c$])
// a变 -> 触发
// b变 -> 触发
// c变 -> 触发

// 解决：使用 debounceTime
combineLatest([a$, b$, c$]).pipe(
  debounceTime(0)  // 合并同步变化
)
```

## TypeScript 类型

```typescript
function combineLatest<A extends readonly unknown[]>(
  sources: [...ObservableInputTuple<A>]
): Observable<A>

function combineLatest<T extends Record<string, ObservableInput<any>>>(
  sourcesObject: T
): Observable<{ [K in keyof T]: ObservedValueOf<T[K]> }>

function withLatestFrom<T, R extends readonly unknown[]>(
  ...inputs: [...ObservableInputTuple<R>]
): OperatorFunction<T, [T, ...R]>
```

## 本章小结

- `combineLatest` 等所有源都有值后，任一变化都触发
- 常用于组合多个状态流
- 使用 `startWith` 解决初始值问题
- 区别于 `withLatestFrom` 的主从关系

下一章实现 `withLatestFrom` 操作符。
