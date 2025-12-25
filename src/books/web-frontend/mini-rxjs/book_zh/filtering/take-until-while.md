---
sidebar_position: 43
title: "takeUntil 与 takeWhile：条件取值"
---

# takeUntil 与 takeWhile：条件取值

`takeUntil` 在信号发射时停止，`takeWhile` 在条件不满足时停止。

## takeUntil

当通知 Observable 发射时停止取值：

```javascript
const source$ = interval(500)
const stop$ = timer(2100)

source$.pipe(
  takeUntil(stop$)
).subscribe(console.log)
// 0, 1, 2, 3（2100ms 后停止）
```

### 实现 takeUntil

```javascript
function takeUntil(notifier) {
  return (source) => new Observable(subscriber => {
    const sourceSubscription = source.subscribe({
      next(value) {
        subscriber.next(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    const notifierSubscription = notifier.subscribe({
      next() {
        subscriber.complete()
      },
      error(err) {
        subscriber.error(err)
      }
      // notifier complete 不影响源
    })

    return () => {
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

### 常见用途：组件销毁

```javascript
class MyComponent {
  destroy$ = new Subject()

  ngOnInit() {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(console.log)
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

## takeWhile

满足条件时继续取值，不满足时停止：

```javascript
of(1, 2, 3, 4, 5, 1, 2).pipe(
  takeWhile(x => x < 4)
).subscribe(console.log)
// 1, 2, 3（遇到4停止，后面的1,2也不会取）
```

### 实现 takeWhile

```javascript
function takeWhile(predicate, inclusive = false) {
  return (source) => new Observable(subscriber => {
    let index = 0

    const subscription = source.subscribe({
      next(value) {
        try {
          const pass = predicate(value, index++)

          if (pass) {
            subscriber.next(value)
          } else {
            if (inclusive) {
              subscriber.next(value)
            }
            subscriber.complete()
            subscription.unsubscribe()
          }
        } catch (err) {
          subscriber.error(err)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => subscription.unsubscribe()
  })
}
```

### inclusive 参数

是否包含第一个不满足条件的值：

```javascript
of(1, 2, 3, 4, 5).pipe(
  takeWhile(x => x < 4)
).subscribe(console.log)
// 1, 2, 3

of(1, 2, 3, 4, 5).pipe(
  takeWhile(x => x < 4, true)  // inclusive
).subscribe(console.log)
// 1, 2, 3, 4（包含第一个不满足的值）
```

## takeUntil vs takeWhile

| 特性 | takeUntil | takeWhile |
|------|-----------|-----------|
| 停止条件 | 外部信号 | 值判断 |
| 参数 | Observable | 函数 |
| 适用场景 | 组件销毁、用户操作 | 条件终止 |

## 实战示例

### 拖拽结束

```javascript
const mousedown$ = fromEvent(element, 'mousedown')
const mousemove$ = fromEvent(document, 'mousemove')
const mouseup$ = fromEvent(document, 'mouseup')

mousedown$.pipe(
  switchMap(() => 
    mousemove$.pipe(
      takeUntil(mouseup$)
    )
  )
).subscribe(e => {
  // 拖拽中
})
```

### 点击外部关闭

```javascript
// 菜单打开后，点击外部关闭
menuOpen$.pipe(
  switchMap(() =>
    fromEvent(document, 'click').pipe(
      filter(e => !menu.contains(e.target)),
      take(1)
    )
  )
).subscribe(() => {
  closeMenu()
})
```

### 条件轮询

```javascript
// 轮询直到任务完成
interval(1000).pipe(
  switchMap(() => checkTaskStatus()),
  takeWhile(status => status !== 'complete', true)
).subscribe(status => {
  console.log('Status:', status)
})
```

### 加载更多

```javascript
// 滚动加载，直到没有更多数据
scroll$.pipe(
  filter(nearBottom),
  switchMap(() => loadMore()),
  takeWhile(data => data.length > 0)
).subscribe(data => {
  appendData(data)
})
```

## 组合使用

```javascript
// 取值直到停止信号或条件不满足
source$.pipe(
  takeWhile(predicate),
  takeUntil(stop$)
)

// 或者用 race
source$.pipe(
  takeUntil(
    race(
      stop$,
      source$.pipe(filter(x => !predicate(x)), take(1))
    )
  )
)
```

## TypeScript 类型

```typescript
function takeUntil<T>(notifier: Observable<any>): OperatorFunction<T, T>

function takeWhile<T>(
  predicate: (value: T, index: number) => boolean,
  inclusive?: boolean
): OperatorFunction<T, T>
```

## 本章小结

- `takeUntil` 在外部信号发射时停止
- `takeWhile` 在条件不满足时停止
- `takeUntil` 是管理订阅生命周期的关键
- `takeWhile` 的 `inclusive` 参数控制是否包含边界值

下一章实现 `skip` 和 `skipUntil` 跳过操作符。
