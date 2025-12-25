---
sidebar_position: 20
title: 操作符是什么：Observable 到 Observable 的转换
---

# 操作符是什么：Observable 到 Observable 的转换

操作符是 RxJS 的核心。它们是纯函数，接收一个 Observable 作为输入，返回一个新的 Observable。

## 为什么需要操作符

假设有一个发射数字的 Observable，想要过滤出偶数并乘以 2：

```javascript
// 不使用操作符的笨拙方式
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)
  subscriber.next(4)
})

source$.subscribe(value => {
  if (value % 2 === 0) {
    const result = value * 2
    console.log(result)
  }
})
```

问题：逻辑混在订阅回调里，难以复用和测试。

## 操作符的本质

操作符是 **Observable 到 Observable 的转换函数**：

```javascript
// 操作符签名
type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>
```

用操作符重写上面的例子：

```javascript
source$.pipe(
  filter(x => x % 2 === 0),
  map(x => x * 2)
).subscribe(console.log)
// 输出：4, 8
```

## 手写第一个操作符

实现一个简单的 `double` 操作符：

```javascript
function double() {
  // 返回一个函数，接收源 Observable
  return function(source) {
    // 返回新的 Observable
    return new Observable(subscriber => {
      // 订阅源 Observable
      const subscription = source.subscribe({
        next(value) {
          subscriber.next(value * 2) // 转换值
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          subscriber.complete()
        }
      })

      // 返回清理函数
      return () => subscription.unsubscribe()
    })
  }
}
```

使用：

```javascript
const source$ = of(1, 2, 3)
source$.pipe(double()).subscribe(console.log)
// 输出：2, 4, 6
```

## 操作符的组合

操作符可以链式组合，每个操作符处理前一个的输出：

```javascript
source$.pipe(
  double(),     // 1,2,3 → 2,4,6
  filter(x => x > 3),  // 2,4,6 → 4,6
  double()      // 4,6 → 8,12
).subscribe(console.log)
// 输出：8, 12
```

数据流经过每个操作符时都会被转换：

```
源: 1 → 2 → 3
    │   │   │
double: 2 → 4 → 6
        │   │   │
filter: 2 → 4 → 6 (过滤掉 2)
            │   │
double:     8 → 12
```

## 操作符的分类

按功能分类：

**创建型** - 创建新的 Observable
- `of`, `from`, `interval`, `fromEvent`

**转换型** - 转换发射的值
- `map`, `scan`, `buffer`, `pluck`

**过滤型** - 过滤发射的值
- `filter`, `take`, `skip`, `debounceTime`

**组合型** - 组合多个 Observable
- `merge`, `concat`, `combineLatest`, `zip`

**错误处理** - 处理错误
- `catchError`, `retry`, `retryWhen`

**工具型** - 副作用和调试
- `tap`, `delay`, `timeout`

## 操作符模式总结

每个操作符遵循相同的模式：

```javascript
function operator(config) {
  return function(source) {
    return new Observable(subscriber => {
      // 1. 订阅源 Observable
      // 2. 转换/过滤/组合值
      // 3. 发射给 subscriber
      // 4. 返回清理函数
    })
  }
}
```

## 本章小结

- 操作符是 Observable 到 Observable 的纯函数转换
- 操作符可以链式组合，形成数据处理管道
- 每个操作符内部订阅源 Observable，转换后发射给下游
- RxJS 操作符按功能分为创建、转换、过滤、组合、错误处理等类型

下一章我们将深入了解 Pipeable 操作符与创建操作符的区别。
