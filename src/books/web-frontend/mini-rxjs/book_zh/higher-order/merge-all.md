# mergeAll：并行订阅

`mergeAll` 将高阶 Observable 扁平化，同时订阅所有内层 Observable。

## 基本概念

```typescript
// 高阶 Observable
const higher$ = of(
  of(1, 2, 3),
  of(4, 5, 6),
  of(7, 8, 9)
)

// 扁平化
higher$.pipe(mergeAll()).subscribe(console.log)
// 输出：1, 2, 3, 4, 5, 6, 7, 8, 9
```

时间线：

```
外层: ---A$---B$---C$-|

内层:
A$: ---1---2---3-|
B$: ---4---5-|
C$: ---6---7---8-|

mergeAll:
    ---1---2-4-3-5-6---7---8-|
```

## 实现 mergeAll

```typescript
function mergeAll<T>(concurrent = Infinity) {
  return (source: Observable<Observable<T>>) => {
    return new Observable<T>(subscriber => {
      const subscriptions: Subscription[] = []
      let active = 0
      let buffer: Observable<T>[] = []
      let outerComplete = false
      
      // 尝试订阅内层 Observable
      function trySubscribe(inner$: Observable<T>) {
        if (active < concurrent) {
          active++
          
          const innerSub = inner$.subscribe({
            next: value => subscriber.next(value),
            error: err => subscriber.error(err),
            complete: () => {
              active--
              
              // 订阅缓冲的 Observable
              if (buffer.length > 0) {
                const next = buffer.shift()!
                trySubscribe(next)
              } else if (outerComplete && active === 0) {
                subscriber.complete()
              }
            }
          })
          
          subscriptions.push(innerSub)
        } else {
          // 达到并发限制，加入缓冲
          buffer.push(inner$)
        }
      }
      
      // 订阅外层
      const outerSub = source.subscribe({
        next: inner$ => trySubscribe(inner$),
        error: err => subscriber.error(err),
        complete: () => {
          outerComplete = true
          if (active === 0) {
            subscriber.complete()
          }
        }
      })
      
      subscriptions.push(outerSub)
      
      return () => {
        subscriptions.forEach(s => s.unsubscribe())
      }
    })
  }
}
```

## 并发控制

```typescript
// 无限并发（默认）
source$.pipe(mergeAll())

// 限制并发数为2
source$.pipe(mergeAll(2))
```

**示例**：

```typescript
const requests$ = of(
  ajax('/api/1'),
  ajax('/api/2'),
  ajax('/api/3'),
  ajax('/api/4'),
  ajax('/api/5')
)

requests$.pipe(
  mergeAll(2) // 最多2个并发请求
).subscribe(console.log)
```

时间线（并发=2）：

```
请求1: ---1-|
请求2: -----2-|
请求3:        --3-|  (等请求1完成)
请求4:          --4-| (等请求2完成)
请求5:              --5-|
```

## 实战场景

### 场景1：批量API请求

```typescript
const userIds$ = of(1, 2, 3, 4, 5)

const users$ = userIds$.pipe(
  map(id => ajax(`/api/users/${id}`)),
  mergeAll(3) // 最多3个并发
)

users$.subscribe(console.log)
```

### 场景2：并行处理

```typescript
const files$ = of(
  readFile('file1.txt'),
  readFile('file2.txt'),
  readFile('file3.txt')
)

files$.pipe(
  mergeAll() // 并行读取
).subscribe(content => {
  console.log(content)
})
```

### 场景3：事件触发的流

```typescript
const clicks$ = fromEvent(button, 'click')

const timers$ = clicks$.pipe(
  map(() => interval(1000).pipe(take(5))),
  mergeAll() // 每次点击创建新定时器，同时运行
)

timers$.subscribe(console.log)
```

## 与其他操作符对比

| 操作符 | 策略 | 场景 |
|--------|------|------|
| mergeAll | 并行订阅 | 需要并发，顺序不重要 |
| concatAll | 顺序订阅 | 需要保证顺序 |
| switchAll | 切换订阅 | 只关心最新的 |
| exhaustAll | 忽略新订阅 | 防止重复触发 |

## 性能考虑

```typescript
// ❌ 无限并发可能导致问题
of(...Array(10000).fill(0)).pipe(
  map(() => heavyOperation()),
  mergeAll() // 10000个并发！
)

// ✅ 限制并发
of(...Array(10000).fill(0)).pipe(
  map(() => heavyOperation()),
  mergeAll(10) // 合理的并发数
)
```

## 错误处理

```typescript
const observables$ = of(
  of(1, 2, 3),
  throwError('错误'),
  of(7, 8, 9)
)

observables$.pipe(
  mergeAll()
).subscribe({
  next: console.log,
  error: console.error // 任何一个内层错误都会传递
})
```

## 总结

**mergeAll**：
- 并行订阅所有内层 Observable
- 支持并发数限制
- 按发射顺序输出值

**使用场景**：
- 批量API请求
- 并行处理任务
- 顺序不重要的流合并

**关键参数**：
- `concurrent`：最大并发数
- 默认 `Infinity`
- 合理设置避免过载
