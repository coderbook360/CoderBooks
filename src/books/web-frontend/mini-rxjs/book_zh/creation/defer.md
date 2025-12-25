---
sidebar_position: 30
title: "defer：延迟创建 Observable"
---

# defer：延迟创建 Observable

`defer` 延迟 Observable 的创建，直到有订阅者订阅时才调用工厂函数创建真正的 Observable。

## 为什么需要 defer

看这个问题：

```javascript
// 创建时立即发起请求
const request$ = from(fetch('/api/data'))

// 不管是否订阅，请求已经发出
```

使用 `defer` 实现惰性：

```javascript
// 订阅时才发起请求
const request$ = defer(() => fetch('/api/data'))

// 此时没有任何请求
// ...

request$.subscribe()  // 现在才发起请求
```

## 实现 defer

```javascript
function defer(observableFactory) {
  return new Observable(subscriber => {
    // 订阅时才调用工厂函数
    const source = observableFactory()
    
    // 处理工厂返回值
    const observable = source instanceof Observable 
      ? source 
      : from(source)
    
    // 订阅并返回
    return observable.subscribe(subscriber)
  })
}
```

## 处理多种返回值

工厂函数可以返回：
- Observable
- Promise
- 可迭代对象

```javascript
function defer(observableFactory) {
  return new Observable(subscriber => {
    let source
    
    try {
      source = observableFactory()
    } catch (err) {
      subscriber.error(err)
      return
    }

    // 转换为 Observable
    const observable = from(source)
    
    return observable.subscribe(subscriber)
  })
}
```

## 每次订阅都重新创建

`defer` 的关键特性：每次订阅都调用工厂函数：

```javascript
let count = 0

const deferred$ = defer(() => {
  count++
  console.log(`Factory called: ${count}`)
  return of(count)
})

deferred$.subscribe(v => console.log('Sub 1:', v))
// Factory called: 1
// Sub 1: 1

deferred$.subscribe(v => console.log('Sub 2:', v))
// Factory called: 2
// Sub 2: 2
```

对比没有 defer：

```javascript
let count = 0
count++
const eager$ = of(count)

eager$.subscribe(v => console.log('Sub 1:', v))
// Sub 1: 1

eager$.subscribe(v => console.log('Sub 2:', v))
// Sub 2: 1（同一个值）
```

## 实战示例

### 惰性 HTTP 请求

```javascript
// 不使用 defer：立即请求
const eager$ = from(fetch('/api/users'))

// 使用 defer：订阅时请求
const lazy$ = defer(() => fetch('/api/users'))

// 可以安全地传递 lazy$，不会触发请求
// 只有订阅时才真正执行
```

### 获取当前时间

```javascript
// 错误：创建时的时间
const wrong$ = of(new Date())

// 正确：订阅时的时间
const right$ = defer(() => of(new Date()))

setTimeout(() => {
  wrong$.subscribe(d => console.log('Wrong:', d))
  right$.subscribe(d => console.log('Right:', d))
}, 1000)
// Wrong: （1秒前的时间）
// Right: （当前时间）
```

### 条件创建

```javascript
const conditional$ = defer(() => {
  if (Math.random() > 0.5) {
    return of('heads')
  } else {
    return of('tails')
  }
})

conditional$.subscribe(console.log)  // 'heads' 或 'tails'
conditional$.subscribe(console.log)  // 再次随机
```

### 重试场景

```javascript
const retryable$ = defer(() => {
  console.log('Attempting request...')
  return from(fetch('/api/flaky'))
}).pipe(
  retry(3)
)

// 每次重试都会重新执行工厂函数
retryable$.subscribe()
// Attempting request...
// (失败)
// Attempting request...
// (失败)
// Attempting request...
```

### 配合 shareReplay

```javascript
// 惰性创建但共享结果
const shared$ = defer(() => {
  console.log('Fetching data...')
  return fetch('/api/data')
}).pipe(
  shareReplay(1)
)

// 第一次订阅触发请求
shared$.subscribe(console.log)
// Fetching data...

// 后续订阅复用结果
shared$.subscribe(console.log)
// （无输出，直接使用缓存）
```

## defer vs 直接使用 from

```javascript
// 这两个在行为上相似
const a$ = defer(() => fetch('/api'))
const b$ = from(fetch('/api'))  // Promise 已创建

// 但 defer 真正实现了惰性
// 因为 fetch() 在 defer 工厂内，订阅时才调用
```

## TypeScript 类型

```typescript
function defer<T>(
  observableFactory: () => ObservableInput<T>
): Observable<T> {
  return new Observable(subscriber => {
    const source = observableFactory()
    return from(source).subscribe(subscriber)
  })
}
```

## 本章小结

- `defer` 延迟 Observable 创建到订阅时
- 每次订阅都重新调用工厂函数
- 用于惰性 HTTP 请求、动态值创建
- 配合 `retry` 实现真正的重试
- 配合 `shareReplay` 实现惰性共享

下一章实现 `range` 数值范围发射操作符。
