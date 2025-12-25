---
sidebar_position: 58
title: "partition"
---

# partition

`partition` 将一个源分成两个 Observable：满足条件的和不满足条件的。

## 基本用法

```javascript
const numbers$ = of(1, 2, 3, 4, 5, 6)

const [evens$, odds$] = partition(numbers$, x => x % 2 === 0)

evens$.subscribe(x => console.log('Even:', x))
// Even: 2, Even: 4, Even: 6

odds$.subscribe(x => console.log('Odd:', x))
// Odd: 1, Odd: 3, Odd: 5
```

类似数组的 `filter`，但同时得到过滤掉的部分。

## 实现 partition

```javascript
function partition(source, predicate) {
  return [
    source.pipe(filter(predicate)),
    source.pipe(filter((value, index) => !predicate(value, index)))
  ]
}
```

简单但有问题：源被订阅了两次。改进版：

```javascript
function partition(source, predicate) {
  // 共享源，避免多次订阅
  const shared$ = source.pipe(share())
  
  return [
    shared$.pipe(filter(predicate)),
    shared$.pipe(filter((value, index) => !predicate(value, index)))
  ]
}
```

完整实现：

```javascript
function partition(source, predicate) {
  const trueSubject = new Subject()
  const falseSubject = new Subject()
  let subscription = null
  let refCount = 0

  function subscribe() {
    if (subscription) return
    
    subscription = source.subscribe({
      next(value) {
        if (predicate(value)) {
          trueSubject.next(value)
        } else {
          falseSubject.next(value)
        }
      },
      error(err) {
        trueSubject.error(err)
        falseSubject.error(err)
      },
      complete() {
        trueSubject.complete()
        falseSubject.complete()
      }
    })
  }

  function createPartition(subject) {
    return new Observable(subscriber => {
      refCount++
      subscribe()
      
      const sub = subject.subscribe(subscriber)
      
      return () => {
        sub.unsubscribe()
        refCount--
        if (refCount === 0 && subscription) {
          subscription.unsubscribe()
          subscription = null
        }
      }
    })
  }

  return [
    createPartition(trueSubject),
    createPartition(falseSubject)
  ]
}
```

## 实战示例

### 区分成功和失败

```javascript
const results$ = from(items).pipe(
  mergeMap(item => processItem(item).pipe(
    map(result => ({ success: true, item, result })),
    catchError(err => of({ success: false, item, error: err }))
  ))
)

const [successes$, failures$] = partition(
  results$,
  r => r.success
)

successes$.subscribe(({ item, result }) => {
  displaySuccess(item, result)
})

failures$.subscribe(({ item, error }) => {
  logError(item, error)
  retryLater(item)
})
```

### 消息分类

```javascript
const messages$ = websocket.messages$

const [commands$, data$] = partition(
  messages$,
  msg => msg.type === 'command'
)

commands$.subscribe(cmd => handleCommand(cmd))
data$.subscribe(data => processData(data))
```

### 用户分流

```javascript
const users$ = fetchUsers()

const [admins$, regularUsers$] = partition(
  users$,
  user => user.role === 'admin'
)

admins$.pipe(
  mergeMap(admin => loadAdminDashboard(admin))
).subscribe(...)

regularUsers$.pipe(
  mergeMap(user => loadUserDashboard(user))
).subscribe(...)
```

### 表单验证

```javascript
const inputs$ = fromEvent(form, 'input').pipe(
  map(() => getFormData())
)

const [valid$, invalid$] = partition(
  inputs$,
  data => validateForm(data).isValid
)

valid$.subscribe(data => {
  enableSubmit()
  clearErrors()
})

invalid$.subscribe(data => {
  disableSubmit()
  showErrors(validateForm(data).errors)
})
```

### 缓存策略

```javascript
const requests$ = requestSubject.asObservable()

const [cached$, uncached$] = partition(
  requests$,
  req => cache.has(req.url)
)

// 从缓存返回
cached$.subscribe(req => {
  req.callback(cache.get(req.url))
})

// 发起网络请求
uncached$.pipe(
  mergeMap(req => 
    ajax(req.url).pipe(
      tap(response => cache.set(req.url, response)),
      map(response => ({ req, response }))
    )
  )
).subscribe(({ req, response }) => {
  req.callback(response)
})
```

## partition vs groupBy

```javascript
const numbers$ = of(1, 2, 3, 4, 5, 6)

// partition: 二分（true/false）
const [evens$, odds$] = partition(numbers$, x => x % 2 === 0)

// groupBy: 多分组
numbers$.pipe(
  groupBy(x => x % 3),
  mergeMap(group$ => 
    group$.pipe(
      toArray(),
      map(values => ({ key: group$.key, values }))
    )
  )
).subscribe(console.log)
// { key: 1, values: [1, 4] }
// { key: 2, values: [2, 5] }
// { key: 0, values: [3, 6] }
```

选择：

| 场景 | 选择 |
|------|------|
| 二分类 | `partition` |
| 多分类 | `groupBy` |
| 简单条件过滤 | `filter` |

## 多级分类

```javascript
const events$ = eventSource$

// 第一级：按类型分
const [userEvents$, systemEvents$] = partition(
  events$,
  e => e.category === 'user'
)

// 第二级：用户事件细分
const [clicks$, inputs$] = partition(
  userEvents$,
  e => e.type === 'click'
)

// 处理各类事件
clicks$.subscribe(handleClick)
inputs$.subscribe(handleInput)
systemEvents$.subscribe(handleSystem)
```

## 常见陷阱

### 必须订阅两个分支

```javascript
const [evens$, odds$] = partition(source$, x => x % 2 === 0)

// 问题：只订阅一个，另一个的值丢失
evens$.subscribe(console.log)
// odds$ 的值不会触发任何处理

// 如果源是热的，odds$ 的值就丢失了
```

### 订阅顺序

```javascript
const source$ = of(1, 2, 3).pipe(share())
const [evens$, odds$] = partition(source$, x => x % 2 === 0)

// 同步源：必须先订阅两个分支
evens$.subscribe(console.log)  // 2
odds$.subscribe(console.log)   // 可能错过 1, 3
```

解决：

```javascript
const source$ = of(1, 2, 3).pipe(shareReplay())
const [evens$, odds$] = partition(source$, x => x % 2 === 0)

evens$.subscribe(console.log)  // 2
odds$.subscribe(console.log)   // 1, 3
```

## TypeScript 类型

```typescript
function partition<T, U extends T>(
  source: Observable<T>,
  predicate: (value: T, index: number) => value is U
): [Observable<U>, Observable<Exclude<T, U>>]

function partition<T>(
  source: Observable<T>,
  predicate: (value: T, index: number) => boolean
): [Observable<T>, Observable<T>]
```

类型守卫示例：

```typescript
interface Cat { type: 'cat'; meow(): void }
interface Dog { type: 'dog'; bark(): void }
type Animal = Cat | Dog

const animals$: Observable<Animal> = ...

const [cats$, dogs$] = partition(
  animals$,
  (a): a is Cat => a.type === 'cat'
)

cats$.subscribe(cat => cat.meow())  // 类型正确
dogs$.subscribe(dog => dog.bark())  // 类型正确
```

## 本章小结

- `partition` 将源分成满足和不满足条件的两个流
- 类似带"else"的 filter
- 注意源的订阅时机和共享
- 适合二分类场景

下一章开始高阶 Observable 部分，实现 `switchMap` 操作符。
