---
sidebar_position: 82
title: "Subject 与 Observable 的区别"
---

# Subject 与 Observable 的区别

本章深入对比 Subject 和 Observable。

## 核心区别

### Observable：单播

```javascript
const observable = new Observable(subscriber => {
  console.log('Observable 执行')
  subscriber.next(Math.random())
  subscriber.complete()
})

// 每次订阅都独立执行
observable.subscribe(x => console.log('A:', x))  // Observable 执行, A: 0.123
observable.subscribe(x => console.log('B:', x))  // Observable 执行, B: 0.456
```

### Subject：多播

```javascript
const subject = new Subject()

// 多个订阅者共享同一个执行
subject.subscribe(x => console.log('A:', x))
subject.subscribe(x => console.log('B:', x))

subject.next(1)
// A: 1
// B: 1
```

## 数据流方向

### Observable：拉取模型

```javascript
// Observable 在被订阅时才开始产生数据
const cold$ = new Observable(subscriber => {
  // 订阅时执行
  subscriber.next('data')
})
```

### Subject：推送模型

```javascript
// Subject 可以随时推送数据
const subject = new Subject()

// 先推送的数据，后订阅者收不到
subject.next('early')  // 没人收到

subject.subscribe(console.log)

subject.next('late')  // 'late'
```

## 生产者位置

### Observable：生产者在内部

```javascript
const observable = new Observable(subscriber => {
  // 生产者定义在这里
  subscriber.next(1)
  subscriber.next(2)
})
```

### Subject：生产者在外部

```javascript
const subject = new Subject()

// 生产者在外部
document.addEventListener('click', () => {
  subject.next('clicked')
})

subject.subscribe(console.log)
```

## 热与冷

### Cold Observable

```javascript
// 每次订阅创建新的执行
const cold$ = interval(1000)

const sub1 = cold$.subscribe(x => console.log('A:', x))

setTimeout(() => {
  // B 从 0 开始，独立于 A
  const sub2 = cold$.subscribe(x => console.log('B:', x))
}, 2500)
```

### Hot Subject

```javascript
const hot$ = new Subject()

// 外部事件源
setInterval(() => hot$.next(Date.now()), 1000)

hot$.subscribe(x => console.log('A:', x))

setTimeout(() => {
  // B 从当前值继续，不是从头开始
  hot$.subscribe(x => console.log('B:', x))
}, 2500)
```

## 使用场景对比

### 何时用 Observable

1. **独立的数据流**：每个订阅者需要独立数据
2. **HTTP 请求**：每次订阅发起新请求
3. **计时器**：每个订阅者独立计时
4. **封装异步操作**：包装 Promise、回调等

```javascript
// 每次订阅发起新请求
function fetchUser(id) {
  return new Observable(subscriber => {
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        subscriber.next(data)
        subscriber.complete()
      })
      .catch(err => subscriber.error(err))
  })
}
```

### 何时用 Subject

1. **事件总线**：多个组件监听同一事件
2. **状态管理**：共享状态
3. **手动控制**：需要在外部推送数据
4. **多播转换**：将单播转为多播

```javascript
// 事件总线
const eventBus = new Subject()

// 组件 A
eventBus.pipe(
  filter(e => e.type === 'user-login')
).subscribe(handleLogin)

// 组件 B
eventBus.pipe(
  filter(e => e.type === 'user-login')
).subscribe(updateUI)

// 登录时
eventBus.next({ type: 'user-login', user: currentUser })
```

## 转换关系

### Observable 转 Subject（多播）

```javascript
const source$ = interval(1000)
const subject = new Subject()

// 连接源到 Subject
source$.subscribe(subject)

// 多个订阅者共享
subject.subscribe(x => console.log('A:', x))
subject.subscribe(x => console.log('B:', x))
```

### 使用 share 操作符

```javascript
const shared$ = interval(1000).pipe(
  share()  // 内部使用 Subject 实现多播
)

shared$.subscribe(x => console.log('A:', x))
shared$.subscribe(x => console.log('B:', x))
// A 和 B 收到相同的值
```

## 最佳实践

### 1. 优先使用 Observable

```javascript
// ✅ 封装为 Observable
function getData() {
  return new Observable(subscriber => {
    // ...
  })
}

// ❌ 不必要地使用 Subject
const subject = new Subject()
function getData() {
  fetch(url).then(data => subject.next(data))
  return subject.asObservable()
}
```

### 2. Subject 作为私有实现

```javascript
class DataService {
  private _data$ = new BehaviorSubject<Data>(null)
  
  // 暴露为 Observable，隐藏 Subject
  get data$(): Observable<Data> {
    return this._data$.asObservable()
  }
  
  updateData(data: Data) {
    this._data$.next(data)
  }
}
```

### 3. 明确多播需求

```javascript
// 需要多播时显式声明
const source$ = fetchData().pipe(
  shareReplay(1)  // 明确表示这是多播
)
```

## 本章小结

| 特性 | Observable | Subject |
|------|------------|---------|
| 订阅模式 | 单播 | 多播 |
| 数据流 | 冷 | 热 |
| 生产者 | 内部 | 外部 |
| 惰性 | 订阅时执行 | 立即可用 |
| 用途 | 封装异步 | 事件总线、状态 |

选择原则：
- 默认使用 Observable
- 需要多播或外部推送时使用 Subject
- 隐藏 Subject 实现细节

下一章学习多播操作符。
