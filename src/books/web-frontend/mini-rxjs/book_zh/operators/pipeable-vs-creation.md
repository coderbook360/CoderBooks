---
sidebar_position: 21
title: Pipeable 操作符 vs 创建操作符
---

# Pipeable 操作符 vs 创建操作符

RxJS 操作符分为两大类：Pipeable 操作符和创建操作符。理解它们的区别是高效使用 RxJS 的关键。

## 创建操作符

创建操作符是独立函数，直接返回 Observable，不需要源 Observable：

```javascript
import { of, from, interval, fromEvent } from 'rxjs'

// 创建操作符直接调用，返回 Observable
const obs1$ = of(1, 2, 3)
const obs2$ = from([1, 2, 3])
const obs3$ = interval(1000)
const obs4$ = fromEvent(document, 'click')
```

### 实现 of 创建操作符

```javascript
function of(...values) {
  return new Observable(subscriber => {
    for (const value of values) {
      subscriber.next(value)
    }
    subscriber.complete()
  })
}

// 使用
of(1, 2, 3).subscribe(console.log) // 1, 2, 3
```

### 实现 from 创建操作符

```javascript
function from(input) {
  return new Observable(subscriber => {
    // 处理数组和可迭代对象
    if (Symbol.iterator in input) {
      for (const value of input) {
        subscriber.next(value)
      }
      subscriber.complete()
      return
    }

    // 处理 Promise
    if (input instanceof Promise) {
      input
        .then(value => {
          subscriber.next(value)
          subscriber.complete()
        })
        .catch(err => subscriber.error(err))
      return
    }

    throw new TypeError('Input is not iterable or Promise')
  })
}
```

## Pipeable 操作符

Pipeable 操作符需要一个源 Observable，在 `pipe()` 方法中使用：

```javascript
import { of } from 'rxjs'
import { map, filter, take } from 'rxjs/operators'

of(1, 2, 3, 4, 5).pipe(
  filter(x => x % 2 === 0),
  map(x => x * 10),
  take(2)
).subscribe(console.log) // 20, 40
```

### Pipeable 操作符的结构

```javascript
// 操作符工厂函数
function map(project) {
  // 返回操作符函数
  return function(source) {
    // 返回新的 Observable
    return new Observable(subscriber => {
      return source.subscribe({
        next(value) {
          subscriber.next(project(value))
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          subscriber.complete()
        }
      })
    })
  }
}
```

## 两种操作符的对比

| 特性 | 创建操作符 | Pipeable 操作符 |
|------|-----------|----------------|
| 输入 | 原始数据 | Observable |
| 输出 | Observable | Observable |
| 调用方式 | 直接调用 | 在 pipe() 中 |
| 示例 | `of(1,2,3)` | `.pipe(map(x=>x*2))` |

## 为什么需要 Pipeable

RxJS v5 之前，操作符是 Observable 原型上的方法：

```javascript
// 旧版方式（已废弃）
source$
  .filter(x => x > 0)
  .map(x => x * 2)
  .take(5)
```

问题：
1. **Tree-shaking 困难** - 所有操作符打包进来
2. **命名冲突** - 操作符名可能与原型属性冲突
3. **扩展困难** - 自定义操作符需要修改原型

Pipeable 操作符解决了这些问题：

```javascript
// 新版方式
import { filter, map, take } from 'rxjs/operators'

source$.pipe(
  filter(x => x > 0),
  map(x => x * 2),
  take(5)
)
```

优点：
1. **完美 Tree-shaking** - 只打包使用的操作符
2. **无命名冲突** - 操作符是独立函数
3. **易于扩展** - 自定义操作符与内置操作符使用方式相同

## 混合使用

实际开发中，两种操作符经常一起使用：

```javascript
import { fromEvent } from 'rxjs'  // 创建操作符
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators'  // Pipeable

// 创建操作符创建源 Observable
fromEvent(input, 'input').pipe(
  // Pipeable 操作符处理流
  map(e => e.target.value),
  debounceTime(300),
  distinctUntilChanged()
).subscribe(value => console.log(value))
```

## 自定义操作符应该选哪种

**创建操作符** - 当你需要从非 Observable 数据源创建 Observable：
- 从 WebSocket 创建流
- 从特定 API 创建流

**Pipeable 操作符** - 当你需要转换已有的 Observable：
- 自定义过滤逻辑
- 自定义转换逻辑
- 组合多个内置操作符

## 本章小结

- **创建操作符**：直接返回 Observable，如 `of`, `from`, `interval`
- **Pipeable 操作符**：接收源 Observable 返回新 Observable，在 `pipe()` 中使用
- Pipeable 设计支持 Tree-shaking，是现代 RxJS 的推荐方式
- 两种操作符各有用途，实际开发中混合使用

下一章我们将实现 `pipe` 方法，理解操作符组合的核心机制。
