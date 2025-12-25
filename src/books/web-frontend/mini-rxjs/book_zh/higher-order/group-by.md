---
sidebar_position: 65
title: "groupBy"
---

# groupBy

`groupBy` 根据键将源分组为多个 Observable。

## 基本用法

```javascript
const people = [
  { name: 'Alice', department: 'Engineering' },
  { name: 'Bob', department: 'Sales' },
  { name: 'Charlie', department: 'Engineering' },
  { name: 'David', department: 'Sales' }
]

from(people).pipe(
  groupBy(person => person.department)
).subscribe(group$ => {
  console.log(`Group: ${group$.key}`)
  group$.subscribe(person => {
    console.log(`  ${person.name}`)
  })
})
// Group: Engineering
//   Alice
//   Charlie
// Group: Sales
//   Bob
//   David
```

## 实现 groupBy

```javascript
function groupBy(keySelector, elementSelector, durationSelector, subjectSelector) {
  return (source) => new Observable(subscriber => {
    const groups = new Map()
    
    const sourceSubscription = source.subscribe({
      next(value) {
        const key = keySelector(value)
        const element = elementSelector ? elementSelector(value) : value
        
        if (!groups.has(key)) {
          // 创建新分组
          const subject = subjectSelector 
            ? subjectSelector() 
            : new Subject()
          
          const groupObservable = subject.asObservable()
          groupObservable.key = key
          
          groups.set(key, subject)
          
          // 如果有 durationSelector，设置组的生命周期
          if (durationSelector) {
            const duration$ = durationSelector(groupObservable)
            duration$.pipe(take(1)).subscribe({
              complete() {
                subject.complete()
                groups.delete(key)
              }
            })
          }
          
          subscriber.next(groupObservable)
        }
        
        // 发射到对应组
        groups.get(key).next(element)
      },
      error(err) {
        groups.forEach(subject => subject.error(err))
        subscriber.error(err)
      },
      complete() {
        groups.forEach(subject => subject.complete())
        subscriber.complete()
      }
    })

    return () => {
      groups.forEach(subject => subject.complete())
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 实战示例

### 按类型分组处理

```javascript
const events$ = eventSource$

events$.pipe(
  groupBy(event => event.type)
).subscribe(group$ => {
  switch (group$.key) {
    case 'click':
      group$.subscribe(handleClick)
      break
    case 'input':
      group$.pipe(debounceTime(300)).subscribe(handleInput)
      break
    case 'scroll':
      group$.pipe(throttleTime(100)).subscribe(handleScroll)
      break
  }
})
```

### 按用户分组统计

```javascript
const actions$ = userActionStream$

actions$.pipe(
  groupBy(action => action.userId),
  mergeMap(userGroup$ => 
    userGroup$.pipe(
      count(),
      map(count => ({ userId: userGroup$.key, actionCount: count }))
    )
  )
).subscribe(({ userId, actionCount }) => {
  console.log(`User ${userId}: ${actionCount} actions`)
})
```

### 股票行情按代码分组

```javascript
const quotes$ = stockQuoteStream$

quotes$.pipe(
  groupBy(quote => quote.symbol),
  mergeMap(symbolGroup$ => 
    symbolGroup$.pipe(
      bufferTime(1000),
      filter(quotes => quotes.length > 0),
      map(quotes => ({
        symbol: symbolGroup$.key,
        avgPrice: quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length,
        count: quotes.length
      }))
    )
  )
).subscribe(summary => {
  updateStockDisplay(summary)
})
```

### 分组超时

```javascript
// 分组5秒内无数据则关闭
source$.pipe(
  groupBy(
    x => x.id,
    x => x,
    group$ => group$.pipe(debounceTime(5000))  // duration
  )
)
```

## 收集分组结果

常见模式：收集每组的所有值

```javascript
from(people).pipe(
  groupBy(p => p.department),
  mergeMap(group$ => 
    group$.pipe(
      toArray(),
      map(items => ({ department: group$.key, members: items }))
    )
  )
).subscribe(console.log)
// { department: 'Engineering', members: [...] }
// { department: 'Sales', members: [...] }
```

## 转换分组值

```javascript
// elementSelector 参数
from(people).pipe(
  groupBy(
    p => p.department,
    p => p.name  // 只保留名字
  ),
  mergeMap(group$ => group$.pipe(toArray()))
).subscribe(console.log)
// ['Alice', 'Charlie'] (Engineering)
// ['Bob', 'David'] (Sales)
```

## 使用 ReplaySubject

```javascript
// 使用 ReplaySubject 缓存组内的值
source$.pipe(
  groupBy(
    x => x.key,
    x => x,
    undefined,
    () => new ReplaySubject(10)  // 缓存最近10个
  )
)
```

## groupBy vs partition

```javascript
// partition: 只能二分
const [evens$, odds$] = partition(numbers$, x => x % 2 === 0)

// groupBy: 多分组
numbers$.pipe(
  groupBy(x => x % 3)  // 0, 1, 2 三组
)
```

| 特性 | partition | groupBy |
|------|-----------|---------|
| 分组数 | 固定2个 | 动态多个 |
| 返回值 | 元组 | 高阶 Observable |
| 使用场景 | 布尔条件 | 任意键 |

## 常见陷阱

### 内存泄漏

```javascript
// 危险：组永远不完成
source$.pipe(
  groupBy(x => x.key),
  mergeMap(group$ => 
    group$.pipe(/* 永不取消订阅 */)
  )
)

// 解决：使用 durationSelector 或 take
source$.pipe(
  groupBy(
    x => x.key,
    x => x,
    group$ => group$.pipe(debounceTime(30000))  // 30秒无数据关闭组
  )
)
```

### 订阅时机

```javascript
// 问题：异步订阅可能错过值
source$.pipe(
  groupBy(x => x.key)
).subscribe(group$ => {
  setTimeout(() => {
    group$.subscribe(...)  // 可能错过同步值
  }, 100)
})

// 解决：使用 ReplaySubject
source$.pipe(
  groupBy(x => x.key, x => x, undefined, () => new ReplaySubject())
)
```

### 键比较

```javascript
// 对象键默认使用引用比较
source$.pipe(
  groupBy(x => ({ a: x.a }))  // 每次都是新对象，无法分组
)

// 解决：使用基本类型键
source$.pipe(
  groupBy(x => x.a)  // 或 JSON.stringify(x.a)
)
```

## TypeScript 类型

```typescript
function groupBy<T, K>(
  keySelector: (value: T) => K
): OperatorFunction<T, GroupedObservable<K, T>>

function groupBy<T, K, E>(
  keySelector: (value: T) => K,
  elementSelector: (value: T) => E
): OperatorFunction<T, GroupedObservable<K, E>>

function groupBy<T, K, E>(
  keySelector: (value: T) => K,
  elementSelector: (value: T) => E,
  durationSelector: (grouped: GroupedObservable<K, E>) => Observable<any>
): OperatorFunction<T, GroupedObservable<K, E>>

interface GroupedObservable<K, T> extends Observable<T> {
  readonly key: K
}
```

## 本章小结

- `groupBy` 按键动态创建分组 Observable
- 每个组是独立的 Observable，有 `key` 属性
- 使用 `durationSelector` 控制组的生命周期
- 适合按类别分流处理的场景

下一章实现 `window` 和 `windowTime` 操作符。
