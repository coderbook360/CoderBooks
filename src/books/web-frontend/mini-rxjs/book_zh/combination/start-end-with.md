# startWith 与 endWith

`startWith` 和 `endWith` 操作符分别在流的开头和结尾添加值。

## startWith：在开头添加值

### 基本用法

```typescript
of(4, 5, 6)
  .pipe(startWith(1, 2, 3))
  .subscribe(console.log)

// 输出：1, 2, 3, 4, 5, 6
```

时间线：

```
源: ------4---5---6-|
startWith(1,2,3):
    1-2-3-4---5---6-|
```

### 实现 startWith

```typescript
function startWith<T>(...values: T[]) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      // 先同步发射初始值
      for (const value of values) {
        subscriber.next(value)
      }
      
      // 再订阅源
      return source.subscribe(subscriber)
    })
  }
}
```

**关键点**：
- 初始值同步发射
- 然后订阅源 Observable
- 相当于 `concat(of(...values), source)`

## endWith：在结尾添加值

### 基本用法

```typescript
of(1, 2, 3)
  .pipe(endWith(4, 5, 6))
  .subscribe(console.log)

// 输出：1, 2, 3, 4, 5, 6
```

时间线：

```
源: ---1---2---3-|
endWith(4,5,6):
    ---1---2---3-4-5-6|
```

### 实现 endWith

```typescript
function endWith<T>(...values: T[]) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      return source.subscribe({
        next: value => subscriber.next(value),
        error: err => subscriber.error(err),
        complete: () => {
          // 源完成后发射附加值
          for (const value of values) {
            subscriber.next(value)
          }
          subscriber.complete()
        }
      })
    })
  }
}
```

**关键点**：
- 先透传源的所有值
- 源完成后发射附加值
- 相当于 `concat(source, of(...values))`

## 实战场景

### 场景1：提供默认值

```typescript
// 确保至少有一个值
userInput$
  .pipe(startWith('默认值'))
  .subscribe(value => {
    updateUI(value) // UI 立即显示默认值
  })
```

### 场景2：添加边界标记

```typescript
// 数据流添加开始和结束标记
dataStream$
  .pipe(
    startWith({ type: 'START' }),
    endWith({ type: 'END' })
  )
  .subscribe(event => {
    if (event.type === 'START') {
      console.log('流开始')
    } else if (event.type === 'END') {
      console.log('流结束')
    } else {
      handleData(event)
    }
  })
```

### 场景3：组合多个流

```typescript
const combined$ = combineLatest([
  stream1$.pipe(startWith(null)),
  stream2$.pipe(startWith(null)),
  stream3$.pipe(startWith(null))
])

// 即使某些流还没发射值，combineLatest 也能立即发射
```

### 场景4：初始化加载状态

```typescript
const loading$ = merge(
  searchInput$.pipe(mapTo(true)), // 开始搜索
  searchResult$.pipe(mapTo(false)) // 完成搜索
).pipe(
  startWith(false) // 初始不加载
)
```

## 与其他操作符对比

### startWith vs concat

```typescript
// startWith
source.pipe(startWith(1, 2, 3))

// 等价于
concat(of(1, 2, 3), source)
```

### endWith vs concat

```typescript
// endWith
source.pipe(endWith(1, 2, 3))

// 等价于
concat(source, of(1, 2, 3))
```

## 完整实现

```typescript
import { Observable } from '../Observable'
import { operate } from '../util/operate'

export function startWith<T>(...values: T[]) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      // 同步发射所有初始值
      for (const value of values) {
        if (subscriber.closed) {
          return
        }
        subscriber.next(value)
      }
      
      // 订阅源
      return source.subscribe(subscriber)
    })
  }
}

export function endWith<T>(...values: T[]) {
  return (source: Observable<T>) => {
    return new Observable<T>(subscriber => {
      return source.subscribe({
        next: value => subscriber.next(value),
        error: err => subscriber.error(err),
        complete: () => {
          // 源完成后发射所有附加值
          for (const value of values) {
            if (subscriber.closed) {
              return
            }
            subscriber.next(value)
          }
          subscriber.complete()
        }
      })
    })
  }
}
```

## 组合使用

```typescript
source$
  .pipe(
    startWith('开始'),
    endWith('结束')
  )
  .subscribe(console.log)

// 如果源发射：A, B, C
// 输出：开始, A, B, C, 结束
```

时间线：

```
源:        ---A---B---C-|
startWith: 开始-A---B---C-|
endWith:   开始-A---B---C-结束|
```

## 常见陷阱

### 陷阱1：startWith 值是异步的

```typescript
// ❌ 期望同步，但使用了异步操作
observable
  .pipe(
    startWith(Promise.resolve(1)) // Promise 对象，不是值
  )
  .subscribe(console.log)

// ✅ 应该等待 Promise
from(Promise.resolve(1))
  .pipe(concat(observable))
  .subscribe(console.log)
```

### 陷阱2：endWith 在错误时不执行

```typescript
observable
  .pipe(endWith('结束'))
  .subscribe({
    next: console.log,
    error: console.error
  })

// 如果 observable 发射错误，'结束' 不会发射
```

**解决**：使用 `finalize`

```typescript
observable
  .pipe(
    finalize(() => console.log('无论如何都执行')),
    endWith('结束')
  )
```

### 陷阱3：多次 startWith

```typescript
observable
  .pipe(
    startWith(1),
    startWith(2)
  )
  .subscribe(console.log)

// 输出：2, 1, ...源的值
// 注意顺序：最后的 startWith 最先执行
```

## 性能考虑

`startWith` 和 `endWith` 都是轻量级操作符，性能开销极小。

```typescript
// 大量初始值
observable.pipe(
  startWith(...Array(1000).fill(0))
)

// 性能影响：
// - 同步循环发射 1000 个值
// - 对于大量值，考虑使用 concat
```

## 类型安全

TypeScript 中的类型推导：

```typescript
const source$: Observable<number> = of(1, 2, 3)

// ✅ 类型匹配
source$.pipe(
  startWith(0) // Observable<number>
)

// ❌ 类型错误
source$.pipe(
  startWith('string') // Observable<number | string>
)

// 显式类型
source$.pipe(
  startWith<number>(0)
)
```

## 总结

**startWith**：
- 在流开头添加值
- 同步发射初始值
- 常用于提供默认值

**endWith**：
- 在流结尾添加值
- 源完成后发射
- 常用于添加结束标记

**实现要点**：
- startWith 先发射值，再订阅源
- endWith 在源的 complete 中发射值
- 都等价于 concat 的特定用法

**常见用途**：
- 提供默认初始值
- 添加流的边界标记
- 初始化组合流
- 设置初始状态
