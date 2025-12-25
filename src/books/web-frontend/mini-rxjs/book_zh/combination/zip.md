---
sidebar_position: 55
title: "zip"
---

# zip

`zip` 将多个源按索引配对组合，像拉链一样一一对应。

## 基本用法

```javascript
const a$ = of(1, 2, 3)
const b$ = of('A', 'B', 'C')

zip(a$, b$).subscribe(console.log)
// [1, 'A']
// [2, 'B']
// [3, 'C']
```

时间线：

```
a$: -1---2------3--|
b$: ---A---B---C---|
out:---[1,A]-[2,B]-[3,C]-|
```

**关键特征**：每个位置只使用一次，必须等所有源都有对应位置的值才发射。

## 实现 zip

```javascript
function zip(...sources) {
  return new Observable(subscriber => {
    const n = sources.length
    const buffers = sources.map(() => [])
    const completed = new Array(n).fill(false)
    const subscriptions = []

    function checkEmit() {
      // 所有源都有值才发射
      if (buffers.every(buf => buf.length > 0)) {
        const values = buffers.map(buf => buf.shift())
        subscriber.next(values)
      }

      // 检查是否完成
      const shouldComplete = buffers.some((buf, i) => 
        buf.length === 0 && completed[i]
      )
      if (shouldComplete) {
        subscriber.complete()
      }
    }

    sources.forEach((source, index) => {
      const subscription = source.subscribe({
        next(value) {
          buffers[index].push(value)
          checkEmit()
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          completed[index] = true
          checkEmit()
        }
      })

      subscriptions.push(subscription)
    })

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
    }
  })
}
```

## zip vs combineLatest

```javascript
const a$ = interval(1000).pipe(take(3), map(x => `A${x}`))
const b$ = interval(1500).pipe(take(3), map(x => `B${x}`))

// zip: 按索引配对
zip(a$, b$).subscribe(console.log)
// [A0, B0] (1.5s)
// [A1, B1] (3s)
// [A2, B2] (4.5s)

// combineLatest: 任一变化就组合
combineLatest([a$, b$]).subscribe(console.log)
// [A0, B0] (1.5s)
// [A1, B0] (2s)
// [A2, B0] (3s)
// [A2, B1] (3s)
// [A2, B2] (4.5s)
```

对比：

| 特性 | zip | combineLatest |
|------|-----|---------------|
| 配对方式 | 按索引 | 最新值 |
| 触发条件 | 所有源对应位置有值 | 任一源变化 |
| 值的使用 | 每个值只用一次 | 值可重复使用 |

## 实战示例

### 请求-响应配对

```javascript
const requests$ = subject // 发送请求的 subject
const responses$ = websocket.messages$

zip(requests$, responses$).subscribe(([request, response]) => {
  matchResponse(request, response)
})
```

### 两个数组合并

```javascript
const names$ = from(['Alice', 'Bob', 'Charlie'])
const ages$ = from([25, 30, 35])

zip(names$, ages$).pipe(
  map(([name, age]) => ({ name, age }))
).subscribe(console.log)
// { name: 'Alice', age: 25 }
// { name: 'Bob', age: 30 }
// { name: 'Charlie', age: 35 }
```

### 坐标点生成

```javascript
const x$ = of(0, 100, 200)
const y$ = of(0, 50, 100)

zip(x$, y$).pipe(
  map(([x, y]) => ({ x, y }))
).subscribe(console.log)
// { x: 0, y: 0 }
// { x: 100, y: 50 }
// { x: 200, y: 100 }
```

### 分步操作配对

```javascript
const steps$ = of('Step 1', 'Step 2', 'Step 3')
const results$ = from([
  performStep1(),
  performStep2(),
  performStep3()
]).pipe(mergeAll())

zip(steps$, results$).subscribe(([step, result]) => {
  console.log(`${step}: ${result}`)
})
```

## 静态 zip vs 实例 zipWith

```javascript
// 静态方法
zip(a$, b$, c$)

// 实例方法 (RxJS 7+)
a$.pipe(zipWith(b$, c$))
```

### 实现 zipWith

```javascript
function zipWith(...sources) {
  return (source) => zip(source, ...sources)
}
```

## zipAll：高阶 Observable 版本

```javascript
of(
  of(1, 2, 3),
  of('A', 'B', 'C')
).pipe(
  zipAll()
).subscribe(console.log)
// [1, 'A'], [2, 'B'], [3, 'C']
```

### 实现 zipAll

```javascript
function zipAll() {
  return (source) => new Observable(subscriber => {
    const innerSources = []
    
    source.subscribe({
      next(inner) {
        innerSources.push(inner)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (innerSources.length === 0) {
          subscriber.complete()
          return
        }
        
        zip(...innerSources).subscribe(subscriber)
      }
    })
  })
}
```

## 常见陷阱

### 快慢源不匹配

```javascript
const fast$ = interval(100).pipe(take(10))
const slow$ = interval(1000).pipe(take(3))

zip(fast$, slow$).subscribe(console.log)
// 只发射3次（以慢的为准）
// fast$ 的 4-9 被丢弃
```

### 内存问题

```javascript
// 危险：fast$ 产生的值会积压在 buffer 中
const fast$ = interval(10)  // 非常快
const slow$ = interval(10000)  // 非常慢

zip(fast$, slow$).subscribe(...)
// fast$ 的值会无限积压
```

### 不完成的源

```javascript
// a$ 完成，b$ 不完成
const a$ = of(1, 2, 3)
const b$ = interval(1000)  // 永不完成

zip(a$, b$).subscribe({
  complete: () => console.log('done')
})
// 发射 [1,0], [2,1], [3,2]
// 然后 complete（因为 a$ 用完了）
```

## TypeScript 类型

```typescript
function zip<A extends readonly unknown[]>(
  sources: [...ObservableInputTuple<A>]
): Observable<A>

function zip<A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): Observable<A>

function zipWith<T, A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): OperatorFunction<T, [T, ...A]>

function zipAll<T>(): OperatorFunction<ObservableInput<T>, T[]>
```

## 本章小结

- `zip` 按索引配对，每个值只用一次
- 以最少值的源为准，多余值丢弃
- 适合一一对应的场景
- 注意快慢源不匹配可能导致内存问题

下一章实现 `forkJoin` 操作符。
