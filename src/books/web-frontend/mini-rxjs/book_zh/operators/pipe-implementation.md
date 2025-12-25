---
sidebar_position: 22
title: 实现 pipe 方法
---

# 实现 pipe 方法

`pipe` 是 RxJS 最重要的方法之一，它让操作符组合成为可能。本章我们来实现它。

## pipe 的作用

`pipe` 接收多个操作符函数，依次应用到 Observable 上：

```javascript
source$.pipe(
  operatorA,
  operatorB,
  operatorC
)
// 等价于 operatorC(operatorB(operatorA(source$)))
```

## 函数组合基础

在实现 pipe 之前，先理解函数组合：

```javascript
// 简单函数
const addOne = x => x + 1
const double = x => x * 2
const square = x => x * x

// 手动组合
const result = square(double(addOne(2)))
// addOne(2) = 3
// double(3) = 6
// square(6) = 36
console.log(result) // 36
```

## 实现 pipe 函数

`pipe` 本质是函数组合：

```javascript
// 独立的 pipe 函数
function pipe(...fns) {
  return function(input) {
    return fns.reduce((acc, fn) => fn(acc), input)
  }
}

// 使用
const transform = pipe(addOne, double, square)
transform(2) // 36
```

更简洁的写法：

```javascript
const pipe = (...fns) => (input) => 
  fns.reduce((acc, fn) => fn(acc), input)
```

## Observable 的 pipe 方法

将 `pipe` 添加到 Observable 类：

```javascript
class Observable {
  constructor(subscribe) {
    this._subscribe = subscribe
  }

  subscribe(observer) {
    return this._subscribe(observer)
  }

  // 关键方法
  pipe(...operators) {
    // 如果没有操作符，返回自身
    if (operators.length === 0) {
      return this
    }

    // 依次应用每个操作符
    return operators.reduce(
      (source, operator) => operator(source),
      this  // 初始值是当前 Observable
    )
  }
}
```

## 验证实现

```javascript
// 定义操作符
function map(project) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) { subscriber.next(project(value)) },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}

function filter(predicate) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        if (predicate(value)) {
          subscriber.next(value)
        }
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}

// 使用
const source$ = of(1, 2, 3, 4, 5)

source$.pipe(
  filter(x => x % 2 === 0),
  map(x => x * 10)
).subscribe(console.log)
// 输出：20, 40
```

## pipe 的执行流程

逐步分析：

```javascript
source$.pipe(filter(x => x > 2), map(x => x * 2))
```

1. `filter(x => x > 2)` 返回操作符函数 `filterOp`
2. `map(x => x * 2)` 返回操作符函数 `mapOp`
3. `pipe(filterOp, mapOp)` 执行：
   - `filterOp(source$)` → `filteredObs$`
   - `mapOp(filteredObs$)` → `mappedObs$`（最终返回）

```
source$
  │
  ▼
filterOp(source$) → filteredObs$
                        │
                        ▼
              mapOp(filteredObs$) → mappedObs$
```

## 边界情况处理

完善的 pipe 实现：

```javascript
pipe(...operators) {
  // 没有操作符，返回自身
  if (operators.length === 0) {
    return this
  }

  // 只有一个操作符，直接调用
  if (operators.length === 1) {
    return operators[0](this)
  }

  // 多个操作符，reduce 组合
  return operators.reduce(
    (source, operator) => operator(source),
    this
  )
}
```

## pipeFromArray 辅助函数

RxJS 源码中使用辅助函数：

```javascript
function pipeFromArray(fns) {
  if (fns.length === 0) {
    return identity
  }

  if (fns.length === 1) {
    return fns[0]
  }

  return function piped(input) {
    return fns.reduce((prev, fn) => fn(prev), input)
  }
}

function identity(x) {
  return x
}
```

Observable 使用它：

```javascript
class Observable {
  pipe(...operators) {
    return pipeFromArray(operators)(this)
  }
}
```

## 独立的 pipe 函数

RxJS 也导出独立的 `pipe` 函数：

```javascript
import { pipe } from 'rxjs'
import { map, filter } from 'rxjs/operators'

// 创建可复用的操作符管道
const processNumbers = pipe(
  filter(x => x > 0),
  map(x => x * 2)
)

// 应用到任意 Observable
of(1, -2, 3, -4, 5).pipe(processNumbers).subscribe(console.log)
// 2, 6, 10
```

实现：

```javascript
function pipe(...fns) {
  return pipeFromArray(fns)
}
```

## 本章小结

- `pipe` 是函数组合在 Observable 上的应用
- 核心是 `reduce`，依次将每个操作符应用到源 Observable
- 每个操作符接收 Observable，返回新的 Observable
- 独立的 `pipe` 函数可以创建可复用的操作符管道

下一章我们将探讨操作符工厂函数的设计模式。
