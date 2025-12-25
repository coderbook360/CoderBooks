---
sidebar_position: 50
title: "elementAt 与 single"
---

# elementAt 与 single

`elementAt` 获取指定索引的值，`single` 确保只有一个值。

## elementAt

获取指定索引位置的值：

```javascript
of('a', 'b', 'c', 'd').pipe(
  elementAt(2)
).subscribe(console.log)
// 'c'
```

### 实现 elementAt

```javascript
function elementAt(index, defaultValue) {
  const hasDefault = arguments.length >= 2
  
  return (source) => new Observable(subscriber => {
    let i = 0
    
    const subscription = source.subscribe({
      next(value) {
        if (i === index) {
          subscriber.next(value)
          subscriber.complete()
          subscription.unsubscribe()
        }
        i++
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (hasDefault) {
          subscriber.next(defaultValue)
          subscriber.complete()
        } else {
          subscriber.error(
            new Error(`index ${index} is out of range`)
          )
        }
      }
    })

    return subscription
  })
}
```

### 使用默认值

```javascript
of('a', 'b').pipe(
  elementAt(5, 'default')
).subscribe(console.log)
// 'default'

of('a', 'b').pipe(
  elementAt(5)
).subscribe({
  error: err => console.log(err.message)
})
// 'index 5 is out of range'
```

## single

确保源只发射一个值：

```javascript
of(42).pipe(
  single()
).subscribe(console.log)
// 42

of(1, 2, 3).pipe(
  single()
).subscribe({
  error: err => console.log(err.message)
})
// 'Sequence contains more than one element'
```

### 实现 single

```javascript
function single(predicate) {
  return (source) => new Observable(subscriber => {
    let hasValue = false
    let singleValue
    let index = 0
    
    const subscription = source.subscribe({
      next(value) {
        const matches = predicate 
          ? predicate(value, index++, source)
          : true

        if (matches) {
          if (hasValue) {
            subscriber.error(
              new Error('Sequence contains more than one element')
            )
            subscription.unsubscribe()
            return
          }
          hasValue = true
          singleValue = value
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (hasValue) {
          subscriber.next(singleValue)
          subscriber.complete()
        } else {
          subscriber.error(
            new Error('No matching element found')
          )
        }
      }
    })

    return subscription
  })
}
```

### 带断言的 single

```javascript
of(1, 2, 3, 4, 5).pipe(
  single(x => x > 4)
).subscribe(console.log)
// 5 (唯一大于4的)

of(1, 2, 3, 4, 5).pipe(
  single(x => x > 3)
).subscribe({
  error: err => console.log(err.message)
})
// 'Sequence contains more than one element' (4和5都匹配)
```

## elementAt vs first vs single

```javascript
const source$ = of(10, 20, 30)

// elementAt - 获取索引位置
source$.pipe(elementAt(1))
// 20

// first - 第一个（或第一个匹配的）
source$.pipe(first())
// 10

// single - 确保只有一个
source$.pipe(single())
// Error: more than one element
```

使用场景：

| 操作符 | 场景 |
|--------|------|
| `elementAt` | 已知索引位置 |
| `first` | 只关心第一个值 |
| `single` | 确保唯一性验证 |

## 实战示例

### 获取第 N 个点击

```javascript
const clicks$ = fromEvent(document, 'click')

// 获取第5次点击
clicks$.pipe(
  elementAt(4)
).subscribe(() => {
  console.log('Fifth click!')
})
```

### 单一配置验证

```javascript
function getConfig(key) {
  return loadConfigs().pipe(
    filter(config => config.key === key),
    single(),  // 确保只有一个配置
    catchError(err => {
      if (err.message.includes('more than one')) {
        return throwError(() => 
          new Error(`Duplicate config for key: ${key}`)
        )
      }
      return throwError(() => 
        new Error(`Config not found: ${key}`)
      )
    })
  )
}
```

### 数组索引访问

```javascript
const items$ = from(fetchItems())

// 获取第一页第3项
items$.pipe(
  elementAt(2, null)
).subscribe(item => {
  if (item) {
    display(item)
  } else {
    displayEmpty()
  }
})
```

### 表单唯一性验证

```javascript
function validateUniqueEmail(email) {
  return searchUsers({ email }).pipe(
    single(),
    map(() => false),  // 找到了，不唯一
    catchError(err => {
      if (err.message.includes('No matching')) {
        return of(true)  // 没找到，是唯一的
      }
      if (err.message.includes('more than one')) {
        return of(false)  // 找到多个，不唯一
      }
      return throwError(() => err)
    })
  )
}
```

## find 与 findIndex

类似数组方法：

### 实现 find

```javascript
function find(predicate) {
  return (source) => new Observable(subscriber => {
    let index = 0
    
    const subscription = source.subscribe({
      next(value) {
        if (predicate(value, index++)) {
          subscriber.next(value)
          subscriber.complete()
          subscription.unsubscribe()
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.next(undefined)
        subscriber.complete()
      }
    })

    return subscription
  })
}
```

### 实现 findIndex

```javascript
function findIndex(predicate) {
  return (source) => new Observable(subscriber => {
    let index = 0
    
    const subscription = source.subscribe({
      next(value) {
        if (predicate(value, index)) {
          subscriber.next(index)
          subscriber.complete()
          subscription.unsubscribe()
        }
        index++
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.next(-1)
        subscriber.complete()
      }
    })

    return subscription
  })
}
```

使用示例：

```javascript
of(1, 3, 5, 8, 10).pipe(
  find(x => x % 2 === 0)
).subscribe(console.log)
// 8

of(1, 3, 5, 8, 10).pipe(
  findIndex(x => x % 2 === 0)
).subscribe(console.log)
// 3
```

## TypeScript 类型

```typescript
function elementAt<T>(
  index: number
): OperatorFunction<T, T>

function elementAt<T, D>(
  index: number,
  defaultValue: D
): OperatorFunction<T, T | D>

function single<T>(
  predicate?: (value: T, index: number) => boolean
): OperatorFunction<T, T>

function find<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, T | undefined>

function findIndex<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, number>
```

## 本章小结

- `elementAt` 获取指定索引位置的值
- `single` 确保源只发射一个匹配值
- `find` 找到第一个匹配值
- `findIndex` 找到第一个匹配值的索引
- 这些操作符都会在满足条件时提前完成订阅

下一章开始组合操作符部分，实现 `merge` 操作符。
