---
sidebar_position: 32
title: "throwError 与 EMPTY"
---

# throwError 与 EMPTY

`throwError` 和 `EMPTY` 是两个特殊的创建操作符，分别用于错误处理和表示空流。

## throwError

立即发射错误并终止：

```javascript
throwError(() => new Error('Something went wrong'))
  .subscribe({
    next: v => console.log('Next:', v),
    error: err => console.error('Error:', err.message),
    complete: () => console.log('Complete')
  })
// Error: Something went wrong
```

### 实现 throwError

```javascript
// 现代写法：接收工厂函数
function throwError(errorFactory) {
  return new Observable(subscriber => {
    subscriber.error(
      typeof errorFactory === 'function' 
        ? errorFactory() 
        : errorFactory
    )
  })
}
```

### 为什么用工厂函数

```javascript
// 旧写法（已废弃）
throwError(new Error('error'))  // Error 在调用时创建

// 新写法
throwError(() => new Error('error'))  // Error 在订阅时创建
```

差异在于堆栈追踪：

```javascript
// 工厂函数方式，堆栈指向订阅位置
someObservable$.pipe(
  switchMap(() => throwError(() => new Error('failed')))
).subscribe()  // 错误堆栈从这里开始
```

### 常见用途

**条件错误**：

```javascript
function fetchUser(id) {
  if (!id) {
    return throwError(() => new Error('ID is required'))
  }
  return from(fetch(`/api/users/${id}`))
}
```

**配合 catchError**：

```javascript
source$.pipe(
  catchError(err => {
    if (err.status === 404) {
      return of(null)  // 恢复
    }
    return throwError(() => err)  // 继续抛出
  })
)
```

## EMPTY

立即完成，不发射任何值：

```javascript
EMPTY.subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（没有 next）
```

### 实现 EMPTY

```javascript
const EMPTY = new Observable(subscriber => {
  subscriber.complete()
})
```

或者作为函数：

```javascript
function empty() {
  return new Observable(subscriber => {
    subscriber.complete()
  })
}
```

### 常见用途

**忽略结果**：

```javascript
source$.pipe(
  switchMap(value => {
    if (shouldIgnore(value)) {
      return EMPTY
    }
    return processValue(value)
  })
)
```

**静默错误**：

```javascript
source$.pipe(
  catchError(() => EMPTY)  // 出错时静默完成
)
```

**条件执行**：

```javascript
function maybeDoSomething(condition) {
  return condition ? doSomething$() : EMPTY
}
```

## NEVER

另一个特殊常量，永不完成：

```javascript
const NEVER = new Observable(() => {
  // 不调用任何回调
})

NEVER.subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// 什么都不会输出
```

### NEVER 的用途

**占位符**：

```javascript
const paused$ = isPaused ? NEVER : source$

// 暂停时不发射任何值
```

**测试**：

```javascript
// 测试超时行为
const test$ = source$.pipe(
  timeout(1000),
  catchError(() => of('timeout'))
)

// 用 NEVER 确保触发超时
NEVER.pipe(timeout(100))  // 会触发超时
```

## 对比总结

| 操作符 | 发射值 | 完成 | 错误 |
|--------|-------|------|------|
| `throwError` | ❌ | ❌ | ✅ 立即 |
| `EMPTY` | ❌ | ✅ 立即 | ❌ |
| `NEVER` | ❌ | ❌ | ❌ |

## 实战模式

### 验证并抛错

```javascript
function validateAndFetch(params) {
  const errors = validate(params)
  if (errors.length > 0) {
    return throwError(() => new ValidationError(errors))
  }
  return from(fetch('/api', { body: params }))
}
```

### 条件流切换

```javascript
const result$ = condition$.pipe(
  switchMap(cond => {
    switch (cond) {
      case 'active': return active$
      case 'paused': return EMPTY
      case 'stopped': return NEVER
      default: return throwError(() => new Error('Unknown condition'))
    }
  })
)
```

### 错误恢复策略

```javascript
source$.pipe(
  catchError((err, caught) => {
    if (err.retryable) {
      return caught  // 重试
    }
    if (err.ignorable) {
      return EMPTY  // 静默
    }
    return throwError(() => err)  // 继续抛出
  })
)
```

## 本章小结

- `throwError` 创建立即发射错误的 Observable
- 使用工厂函数形式获得更好的堆栈追踪
- `EMPTY` 立即完成，不发射任何值
- `NEVER` 永不完成，用于占位或测试
- 这些特殊 Observable 在错误处理和条件逻辑中很有用

下一章开始实现转换操作符，从 `map` 开始。
