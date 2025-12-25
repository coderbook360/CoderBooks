---
sidebar_position: 23
title: 操作符工厂函数设计模式
---

# 操作符工厂函数设计模式

操作符工厂函数是 RxJS 操作符的标准设计模式。本章深入分析这种模式的原理和实现技巧。

## 工厂函数模式

操作符采用两层函数结构：

```javascript
// 外层：工厂函数，接收配置参数
function map(project) {
  // 内层：操作符函数，接收源 Observable
  return function(source) {
    // 返回新的 Observable
    return new Observable(subscriber => {
      // 订阅并转换
    })
  }
}
```

为什么需要两层？

```javascript
// 使用时
source$.pipe(
  map(x => x * 2)  // map(fn) 返回操作符函数
)
```

1. `map(x => x * 2)` 调用工厂，返回操作符函数
2. `pipe` 将操作符函数应用到 source$

## 通用操作符模板

所有 Pipeable 操作符遵循相同模板：

```javascript
function operatorName(/* 配置参数 */) {
  return function(source) {
    return new Observable(subscriber => {
      const subscription = source.subscribe({
        next(value) {
          // 处理值
          subscriber.next(/* 转换后的值 */)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          subscriber.complete()
        }
      })

      // 返回清理逻辑
      return () => subscription.unsubscribe()
    })
  }
}
```

## 实现常见操作符

### map - 值映射

```javascript
function map(project) {
  return (source) => new Observable(subscriber => {
    let index = 0

    return source.subscribe({
      next(value) {
        try {
          const result = project(value, index++)
          subscriber.next(result)
        } catch (err) {
          subscriber.error(err)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}
```

### filter - 条件过滤

```javascript
function filter(predicate) {
  return (source) => new Observable(subscriber => {
    let index = 0

    return source.subscribe({
      next(value) {
        try {
          if (predicate(value, index++)) {
            subscriber.next(value)
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
```

### take - 取前 N 个

```javascript
function take(count) {
  return (source) => new Observable(subscriber => {
    let taken = 0

    const subscription = source.subscribe({
      next(value) {
        if (taken < count) {
          taken++
          subscriber.next(value)

          // 到达数量后完成
          if (taken >= count) {
            subscriber.complete()
            subscription.unsubscribe()
          }
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })

    return () => subscription.unsubscribe()
  })
}
```

### tap - 副作用

```javascript
function tap(observer) {
  // 支持函数或对象形式
  const { next, error, complete } = 
    typeof observer === 'function' 
      ? { next: observer } 
      : observer

  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        next?.(value)
        subscriber.next(value)
      },
      error(err) {
        error?.(err)
        subscriber.error(err)
      },
      complete() {
        complete?.()
        subscriber.complete()
      }
    })
  })
}
```

## 操作符抽象

发现模式：每个操作符都需要订阅源并转发事件。可以抽象出基础结构：

```javascript
function operate(init) {
  return (source) => new Observable(subscriber => {
    // init 返回订阅者配置
    const handlers = init(subscriber)

    return source.subscribe({
      next: handlers.next || (value => subscriber.next(value)),
      error: handlers.error || (err => subscriber.error(err)),
      complete: handlers.complete || (() => subscriber.complete())
    })
  })
}
```

使用抽象：

```javascript
function map(project) {
  return operate(subscriber => ({
    next(value) {
      subscriber.next(project(value))
    }
  }))
}

function filter(predicate) {
  return operate(subscriber => ({
    next(value) {
      if (predicate(value)) {
        subscriber.next(value)
      }
    }
  }))
}
```

## 带状态的操作符

某些操作符需要维护状态：

```javascript
function scan(accumulator, seed) {
  return (source) => new Observable(subscriber => {
    let acc = seed
    let hasSeed = arguments.length >= 2
    let index = 0

    return source.subscribe({
      next(value) {
        if (!hasSeed) {
          acc = value
          hasSeed = true
        } else {
          acc = accumulator(acc, value, index++)
        }
        subscriber.next(acc)
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}
```

## 错误处理最佳实践

操作符内部要捕获用户回调的错误：

```javascript
function map(project) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        try {
          // 用户的 project 函数可能抛错
          const result = project(value)
          subscriber.next(result)
        } catch (err) {
          // 捕获并传递错误
          subscriber.error(err)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}
```

## 类型安全（TypeScript）

```typescript
function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R> {
  return (source: Observable<T>): Observable<R> => {
    return new Observable<R>(subscriber => {
      let index = 0
      return source.subscribe({
        next(value) {
          subscriber.next(project(value, index++))
        },
        error(err) { subscriber.error(err) },
        complete() { subscriber.complete() }
      })
    })
  }
}
```

## 本章小结

- 操作符采用工厂函数模式：外层接收配置，内层接收源 Observable
- 所有操作符遵循相同模板：订阅源、转换、转发
- 可以抽象出 `operate` 辅助函数简化操作符实现
- 操作符内部要正确捕获用户回调的错误
- TypeScript 可以提供完整的类型推导

下一章我们将学习如何开发自定义操作符。
