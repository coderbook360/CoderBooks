# concatAll：顺序订阅

`concatAll` 将高阶 Observable 扁平化，顺序订阅内层 Observable，前一个完成后再订阅下一个。

## 基本概念

```typescript
const higher$ = of(
  of(1, 2, 3),
  of(4, 5, 6),
  of(7, 8, 9)
)

higher$.pipe(concatAll()).subscribe(console.log)
// 输出：1, 2, 3, 4, 5, 6, 7, 8, 9
```

时间线：

```
外层: ---A$---B$---C$-|

内层:
A$: ---1---2---3-|
B$: ---4---5-|
C$: ---6---7-|

concatAll:
    ---1---2---3-4---5-6---7-|
       └─A$完成─┘└B$┘└─C$─┘
```

## 实现 concatAll

```typescript
function concatAll<T>() {
  return (source: Observable<Observable<T>>) => {
    return new Observable<T>(subscriber => {
      const buffer: Observable<T>[] = []
      let activeInner: Subscription | null = null
      let outerComplete = false
      
      function subscribeNext() {
        if (activeInner || buffer.length === 0) {
          return
        }
        
        const next = buffer.shift()!
        
        activeInner = next.subscribe({
          next: value => subscriber.next(value),
          error: err => subscriber.error(err),
          complete: () => {
            activeInner = null
            
            if (buffer.length > 0) {
              subscribeNext()
            } else if (outerComplete) {
              subscriber.complete()
            }
          }
        })
      }
      
      const outerSub = source.subscribe({
        next: inner$ => {
          buffer.push(inner$)
          subscribeNext()
        },
        error: err => subscriber.error(err),
        complete: () => {
          outerComplete = true
          if (!activeInner && buffer.length === 0) {
            subscriber.complete()
          }
        }
      })
      
      return () => {
        outerSub.unsubscribe()
        activeInner?.unsubscribe()
      }
    })
  }
}
```

## 保证顺序

**关键特性**：严格按顺序执行。

```typescript
const tasks$ = of(
  delay(1000).pipe(mapTo('Task 3')), // 慢
  delay(100).pipe(mapTo('Task 2')),  // 快
  delay(500).pipe(mapTo('Task 1'))   // 中
)

tasks$.pipe(concatAll()).subscribe(console.log)

// 输出顺序：Task 3, Task 2, Task 1
// 即使 Task 2 更快完成，也要等 Task 3
```

## 实战场景

### 场景1：顺序执行任务

```typescript
const tasks$ = of(
  () => saveData(),
  () => sendNotification(),
  () => updateUI()
)

tasks$.pipe(
  map(fn => defer(() => fn())),
  concatAll() // 严格顺序执行
).subscribe()
```

### 场景2：动画队列

```typescript
const animations$ = of(
  animate('#box1', { x: 100 }),
  animate('#box2', { y: 100 }),
  animate('#box3', { scale: 2 })
)

animations$.pipe(
  concatAll() // 动画依次执行
).subscribe()
```

### 场景3：有依赖的API调用

```typescript
// 步骤1：登录
// 步骤2：获取用户信息
// 步骤3：加载数据

of(
  login(),
  getUserInfo(),
  loadData()
).pipe(
  concatAll() // 保证执行顺序
).subscribe()
```

## 与其他操作符对比

```typescript
const fast$ = of('fast').pipe(delay(100))
const slow$ = of('slow').pipe(delay(1000))

// mergeAll：并行，快的先输出
of(slow$, fast$).pipe(mergeAll()).subscribe()
// 输出：fast, slow

// concatAll：顺序，等前一个完成
of(slow$, fast$).pipe(concatAll()).subscribe()
// 输出：slow, fast
```

## 性能影响

```typescript
// 总耗时 = 所有内层 Observable 耗时之和

const observables$ = of(
  delay(1000).pipe(mapTo(1)), // 1秒
  delay(2000).pipe(mapTo(2)), // 2秒
  delay(1000).pipe(mapTo(3))  // 1秒
)

observables$.pipe(concatAll()).subscribe()
// 总耗时：4秒
```

## 错误处理

```typescript
const observables$ = of(
  of(1, 2, 3),
  throwError('错误'),
  of(7, 8, 9) // 不会执行
)

observables$.pipe(
  concatAll()
).subscribe({
  next: console.log,
  error: console.error // 第二个错误后停止
})
```

## 总结

**concatAll**：
- 顺序订阅内层 Observable
- 等待前一个完成再订阅下一个
- 保证输出顺序与输入顺序一致

**使用场景**：
- 顺序执行任务
- 有依赖关系的操作
- 需要保证执行顺序

**性能特点**：
- 串行执行，耗时累加
- 适合需要严格顺序的场景
