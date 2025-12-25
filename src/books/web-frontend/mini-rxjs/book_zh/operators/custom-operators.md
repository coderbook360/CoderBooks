---
sidebar_position: 24
title: 自定义操作符开发指南
---

# 自定义操作符开发指南

掌握了操作符的设计模式，就可以创建自己的操作符了。本章提供实用的开发指南。

## 何时需要自定义操作符

1. **封装重复逻辑** - 多处使用相同的操作符组合
2. **领域特定需求** - 业务逻辑封装
3. **复杂数据处理** - 内置操作符组合无法满足

## 方法一：组合现有操作符

最简单的方式是组合现有操作符：

```javascript
import { pipe, map, filter, debounceTime } from 'rxjs'

// 搜索输入处理管道
function searchInput() {
  return pipe(
    map(event => event.target.value),
    map(value => value.trim()),
    filter(value => value.length >= 2),
    debounceTime(300)
  )
}

// 使用
fromEvent(input, 'input')
  .pipe(searchInput())
  .subscribe(term => console.log('Search:', term))
```

## 方法二：从零实现

需要更多控制时，从零实现：

```javascript
function filterNullish() {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        if (value !== null && value !== undefined) {
          subscriber.next(value)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}

// 使用
of(1, null, 2, undefined, 3)
  .pipe(filterNullish())
  .subscribe(console.log)
// 1, 2, 3
```

## 实战示例

### 示例1：debug 操作符

开发调试用的操作符：

```javascript
function debug(tag = 'debug') {
  return (source) => new Observable(subscriber => {
    console.log(`[${tag}] Subscribed`)

    return source.subscribe({
      next(value) {
        console.log(`[${tag}] Next:`, value)
        subscriber.next(value)
      },
      error(err) {
        console.error(`[${tag}] Error:`, err)
        subscriber.error(err)
      },
      complete() {
        console.log(`[${tag}] Complete`)
        subscriber.complete()
      }
    })
  })
}

// 使用
source$.pipe(
  debug('before-filter'),
  filter(x => x > 0),
  debug('after-filter')
).subscribe()
```

### 示例2：retryWithDelay 操作符

带延迟的重试：

```javascript
function retryWithDelay(maxRetries, delayMs) {
  return (source) => new Observable(subscriber => {
    let retries = 0

    function doSubscribe() {
      source.subscribe({
        next(value) { subscriber.next(value) },
        error(err) {
          retries++
          if (retries <= maxRetries) {
            console.log(`Retry ${retries}/${maxRetries} in ${delayMs}ms`)
            setTimeout(doSubscribe, delayMs)
          } else {
            subscriber.error(err)
          }
        },
        complete() { subscriber.complete() }
      })
    }

    doSubscribe()
  })
}

// 使用
httpRequest$.pipe(
  retryWithDelay(3, 1000)
).subscribe()
```

### 示例3：filterByProperty 操作符

按属性过滤对象：

```javascript
function filterByProperty(prop, predicate) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(obj) {
        try {
          if (obj && predicate(obj[prop])) {
            subscriber.next(obj)
          }
        } catch (err) {
          subscriber.error(err)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}

// 使用
of(
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 17 },
  { name: 'Charlie', age: 30 }
).pipe(
  filterByProperty('age', age => age >= 18)
).subscribe(console.log)
// { name: 'Alice', age: 25 }
// { name: 'Charlie', age: 30 }
```

### 示例4：bufferUntilIdle 操作符

空闲时缓冲发射：

```javascript
function bufferUntilIdle(idleTime) {
  return (source) => new Observable(subscriber => {
    let buffer = []
    let timeoutId = null

    return source.subscribe({
      next(value) {
        buffer.push(value)

        // 清除之前的定时器
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        // 设置新的空闲定时器
        timeoutId = setTimeout(() => {
          subscriber.next([...buffer])
          buffer = []
        }, idleTime)
      },
      error(err) {
        if (timeoutId) clearTimeout(timeoutId)
        subscriber.error(err)
      },
      complete() {
        if (timeoutId) clearTimeout(timeoutId)
        if (buffer.length > 0) {
          subscriber.next(buffer)
        }
        subscriber.complete()
      }
    })
  })
}
```

## 开发清单

创建自定义操作符时的检查清单：

**基本要求**
- [ ] 返回新的 Observable
- [ ] 正确订阅源 Observable
- [ ] 转发 error 和 complete

**健壮性**
- [ ] 捕获用户回调中的错误
- [ ] 处理取消订阅
- [ ] 考虑边界情况（空流、同步完成等）

**性能**
- [ ] 避免不必要的对象创建
- [ ] 及时清理资源

**可用性**
- [ ] 良好的类型定义（TypeScript）
- [ ] 清晰的参数命名

## TypeScript 类型定义

```typescript
import { Observable, OperatorFunction } from 'rxjs'

function filterNullish<T>(): OperatorFunction<T | null | undefined, T> {
  return (source: Observable<T | null | undefined>): Observable<T> => {
    return new Observable(subscriber => {
      return source.subscribe({
        next(value) {
          if (value !== null && value !== undefined) {
            subscriber.next(value)
          }
        },
        error(err) { subscriber.error(err) },
        complete() { subscriber.complete() }
      })
    })
  }
}
```

## 本章小结

- 组合现有操作符是最简单的自定义方式
- 从零实现时遵循标准操作符模板
- 务必处理错误、完成和取消订阅
- 开发时使用清单确保健壮性

下一章我们开始实现创建操作符，从 `of` 开始。
