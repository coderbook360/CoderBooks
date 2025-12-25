---
sidebar_position: 26
title: "from：从可迭代对象创建"
---

# from：从可迭代对象创建

`from` 是功能丰富的创建操作符，可以将数组、类数组、可迭代对象、Promise 等转换为 Observable。

## 基本用法

```javascript
// 数组
from([1, 2, 3]).subscribe(console.log) // 1, 2, 3

// 字符串（可迭代）
from('abc').subscribe(console.log) // 'a', 'b', 'c'

// Set
from(new Set([1, 2, 3])).subscribe(console.log) // 1, 2, 3

// Promise
from(Promise.resolve('hello')).subscribe(console.log) // 'hello'
```

## 实现 from

```javascript
function from(input) {
  // 如果已经是 Observable，直接返回
  if (input instanceof Observable) {
    return input
  }

  return new Observable(subscriber => {
    // 处理 Promise
    if (input instanceof Promise || isPromiseLike(input)) {
      input
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
      return
    }

    // 处理可迭代对象
    if (input != null && typeof input[Symbol.iterator] === 'function') {
      for (const value of input) {
        if (subscriber.closed) return
        subscriber.next(value)
      }
      subscriber.complete()
      return
    }

    // 处理类数组
    if (input != null && typeof input.length === 'number') {
      for (let i = 0; i < input.length; i++) {
        if (subscriber.closed) return
        subscriber.next(input[i])
      }
      subscriber.complete()
      return
    }

    throw new TypeError('Input is not Observable, Iterable, or Promise')
  })
}

function isPromiseLike(value) {
  return value && typeof value.then === 'function'
}
```

## 处理不同输入类型

### 数组

```javascript
from([1, 2, 3]).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Next: 1
// Next: 2
// Next: 3
// Complete
```

### Generator

```javascript
function* gen() {
  yield 1
  yield 2
  yield 3
}

from(gen()).subscribe(console.log) // 1, 2, 3
```

### Map

```javascript
const map = new Map([['a', 1], ['b', 2]])
from(map).subscribe(console.log)
// ['a', 1]
// ['b', 2]
```

### Promise

```javascript
const promise = new Promise(resolve => {
  setTimeout(() => resolve('async value'), 1000)
})

from(promise).subscribe({
  next: v => console.log('Value:', v),
  complete: () => console.log('Complete')
})
// （1秒后）
// Value: async value
// Complete
```

### Promise 错误处理

```javascript
from(Promise.reject(new Error('Failed'))).subscribe({
  next: v => console.log(v),
  error: err => console.error('Error:', err.message)
})
// Error: Failed
```

## from vs of

| 场景 | of | from |
|------|-----|------|
| 多个值 | `of(1, 2, 3)` | `from([1, 2, 3])` |
| 数组整体 | `of([1,2,3])` → `[1,2,3]` | `from([1,2,3])` → `1,2,3` |
| Promise | 不支持 | 支持 |

```javascript
// of 把数组当作单个值
of([1, 2, 3]).subscribe(console.log)
// [1, 2, 3]

// from 展开数组
from([1, 2, 3]).subscribe(console.log)
// 1
// 2
// 3
```

## 实现细节

### 异步迭代器支持

ES2018 引入了异步迭代器，完整实现需要支持：

```javascript
async function* asyncGen() {
  yield await Promise.resolve(1)
  yield await Promise.resolve(2)
}

// 扩展 from 支持异步迭代器
function from(input) {
  return new Observable(subscriber => {
    // ... 同步处理 ...

    // 处理异步迭代器
    if (typeof input[Symbol.asyncIterator] === 'function') {
      processAsyncIterable(input, subscriber)
      return
    }
  })
}

async function processAsyncIterable(asyncIterable, subscriber) {
  try {
    for await (const value of asyncIterable) {
      if (subscriber.closed) return
      subscriber.next(value)
    }
    subscriber.complete()
  } catch (err) {
    subscriber.error(err)
  }
}
```

### 取消 Promise

Promise 本身不可取消，但可以阻止回调执行：

```javascript
function from(promise) {
  return new Observable(subscriber => {
    promise.then(
      value => {
        // 检查是否已取消
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

## TypeScript 类型重载

```typescript
function from<T>(input: ObservableInput<T>): Observable<T>
function from<T>(input: T[]): Observable<T>
function from<T>(input: Iterable<T>): Observable<T>
function from<T>(input: AsyncIterable<T>): Observable<T>
function from<T>(input: PromiseLike<T>): Observable<T>

type ObservableInput<T> = 
  | Observable<T> 
  | T[] 
  | Iterable<T> 
  | AsyncIterable<T> 
  | PromiseLike<T>
```

## 本章小结

- `from` 将多种数据源转换为 Observable
- 支持数组、可迭代对象、Promise、异步迭代器
- 与 `of` 的区别：`from` 展开集合，`of` 将参数作为独立值
- Promise 值在异步发射，但可以检查取消状态

下一章实现 `fromEvent`，将 DOM 事件转换为 Observable。
