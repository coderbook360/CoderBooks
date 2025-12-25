---
sidebar_position: 28
title: "fromPromise：Promise 转 Observable"
---

# fromPromise：Promise 转 Observable

虽然 `from` 已经可以处理 Promise，但理解 Promise 到 Observable 的转换对于理解两种异步模型的差异很有帮助。

## Promise vs Observable

| 特性 | Promise | Observable |
|------|---------|------------|
| 执行时机 | 立即执行（eager） | 订阅时执行（lazy） |
| 取消 | 不可取消 | 可取消（unsubscribe） |
| 值数量 | 单值 | 多值 |
| 重试 | 需要重新创建 | retry 操作符 |

## 实现 fromPromise

```javascript
function fromPromise(promise) {
  return new Observable(subscriber => {
    promise
      .then(
        value => {
          if (!subscriber.closed) {
            subscriber.next(value)
            subscriber.complete()
          }
        },
        err => {
          if (!subscriber.closed) {
            subscriber.error(err)
          }
        }
      )
  })
}
```

## 惰性执行问题

Promise 在创建时立即执行，不管是否有人监听结果：

```javascript
const promise = new Promise(resolve => {
  console.log('Promise executor runs')
  resolve('value')
})
// 立即输出 "Promise executor runs"

fromPromise(promise).subscribe(console.log)
// 只是监听已创建的 Promise
```

要实现惰性，用工厂函数：

```javascript
function fromPromiseFactory(promiseFactory) {
  return new Observable(subscriber => {
    promiseFactory()
      .then(
        value => {
          if (!subscriber.closed) {
            subscriber.next(value)
            subscriber.complete()
          }
        },
        err => {
          if (!subscriber.closed) {
            subscriber.error(err)
          }
        }
      )
  })
}

// 使用
const lazy$ = fromPromiseFactory(() => {
  console.log('Now creating promise')
  return fetch('/api/data')
})

// 这时候还没有发起请求
// 订阅时才会执行
lazy$.subscribe(console.log)
```

这就是 RxJS 的 `defer` 操作符做的事情。

## 取消问题

Promise 无法真正取消，但可以忽略结果：

```javascript
function fromPromise(promise) {
  return new Observable(subscriber => {
    let cancelled = false

    promise
      .then(
        value => {
          if (!cancelled && !subscriber.closed) {
            subscriber.next(value)
            subscriber.complete()
          }
        },
        err => {
          if (!cancelled && !subscriber.closed) {
            subscriber.error(err)
          }
        }
      )

    // 返回清理函数
    return () => {
      cancelled = true
    }
  })
}
```

验证：

```javascript
const subscription = fromPromise(
  new Promise(resolve => {
    setTimeout(() => resolve('value'), 1000)
  })
).subscribe(console.log)

// 500ms 后取消
setTimeout(() => subscription.unsubscribe(), 500)
// 不会输出 'value'
```

## 配合 AbortController

现代 API 支持 AbortController 取消：

```javascript
function fromFetch(url, options = {}) {
  return new Observable(subscriber => {
    const controller = new AbortController()

    fetch(url, { ...options, signal: controller.signal })
      .then(response => response.json())
      .then(data => {
        subscriber.next(data)
        subscriber.complete()
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          subscriber.error(err)
        }
      })

    return () => {
      controller.abort()
    }
  })
}

// 使用
const subscription = fromFetch('/api/data').subscribe(console.log)

// 真正取消网络请求
subscription.unsubscribe()
```

## 处理多订阅

每次订阅都应该执行 Promise（惰性）：

```javascript
// 错误：共享同一个 Promise
const shared$ = fromPromise(fetch('/api'))

shared$.subscribe()  // 发起请求
shared$.subscribe()  // 复用同一个请求结果

// 正确：使用 defer
const lazy$ = defer(() => fromPromise(fetch('/api')))

lazy$.subscribe()  // 发起请求 1
lazy$.subscribe()  // 发起请求 2
```

## 错误处理

```javascript
fromPromise(Promise.reject(new Error('Failed'))).pipe(
  catchError(err => {
    console.error('Caught:', err.message)
    return of('fallback')
  })
).subscribe(console.log)
// Caught: Failed
// fallback
```

## 与 async/await 配合

```javascript
async function asyncOperation() {
  const result = await lastValueFrom(
    fromPromise(fetch('/api')).pipe(
      map(res => res.json()),
      retry(3)
    )
  )
  return result
}
```

## 实际使用建议

现代 RxJS 中，直接使用 `from` 处理 Promise：

```javascript
// 推荐
from(fetch('/api'))

// 惰性执行用 defer
defer(() => fetch('/api'))
```

## 本章小结

- Promise 立即执行，Observable 惰性执行
- `fromPromise` 包装 Promise 为 Observable
- 惰性执行需要使用 `defer` 或工厂函数
- 配合 AbortController 可以真正取消网络请求
- 现代 RxJS 推荐用 `from` 和 `defer`

下一章实现 `interval` 和 `timer` 定时器操作符。
