---
sidebar_position: 77
title: "defaultIfEmpty 与条件操作符"
---

# defaultIfEmpty 与条件操作符

条件操作符在特定条件下产生或转换值。

## defaultIfEmpty

源为空时返回默认值：

```javascript
EMPTY.pipe(
  defaultIfEmpty('默认值')
).subscribe(console.log)
// 默认值

of(1, 2, 3).pipe(
  defaultIfEmpty('默认值')
).subscribe(console.log)
// 1, 2, 3（不触发默认值）
```

### 实现 defaultIfEmpty

```javascript
function defaultIfEmpty(defaultValue) {
  return (source) => new Observable(subscriber => {
    let hasValue = false
    
    return source.subscribe({
      next(value) {
        hasValue = true
        subscriber.next(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (!hasValue) {
          subscriber.next(defaultValue)
        }
        subscriber.complete()
      }
    })
  })
}
```

## throwIfEmpty

源为空时抛出错误：

```javascript
EMPTY.pipe(
  throwIfEmpty(() => new Error('数据为空'))
).subscribe({
  error: err => console.error(err.message)
})
// 数据为空
```

### 实现 throwIfEmpty

```javascript
function throwIfEmpty(errorFactory = () => new Error('EmptyError')) {
  return (source) => new Observable(subscriber => {
    let hasValue = false
    
    return source.subscribe({
      next(value) {
        hasValue = true
        subscriber.next(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (!hasValue) {
          subscriber.error(errorFactory())
        } else {
          subscriber.complete()
        }
      }
    })
  })
}
```

## every

检查所有值是否满足条件：

```javascript
of(2, 4, 6, 8).pipe(
  every(x => x % 2 === 0)
).subscribe(console.log)
// true

of(2, 4, 5, 8).pipe(
  every(x => x % 2 === 0)
).subscribe(console.log)
// false（遇到 5 立即返回）
```

### 实现 every

```javascript
function every(predicate) {
  return (source) => new Observable(subscriber => {
    let index = 0
    
    const subscription = source.subscribe({
      next(value) {
        try {
          if (!predicate(value, index++)) {
            subscriber.next(false)
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
        subscriber.next(true)
        subscriber.complete()
      }
    })
    
    return subscription
  })
}
```

## isEmpty

检查源是否为空：

```javascript
EMPTY.pipe(isEmpty()).subscribe(console.log)
// true

of(1).pipe(isEmpty()).subscribe(console.log)
// false（遇到第一个值立即返回）
```

### 实现 isEmpty

```javascript
function isEmpty() {
  return (source) => new Observable(subscriber => {
    const subscription = source.subscribe({
      next() {
        subscriber.next(false)
        subscriber.complete()
        subscription.unsubscribe()
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.next(true)
        subscriber.complete()
      }
    })
    
    return subscription
  })
}
```

## sequenceEqual

比较两个 Observable 是否相等：

```javascript
const a$ = of(1, 2, 3)
const b$ = of(1, 2, 3)

a$.pipe(
  sequenceEqual(b$)
).subscribe(console.log)
// true

const c$ = of(1, 2, 4)
a$.pipe(
  sequenceEqual(c$)
).subscribe(console.log)
// false
```

### 实现 sequenceEqual

```javascript
function sequenceEqual(compareTo, comparator = (a, b) => a === b) {
  return (source) => new Observable(subscriber => {
    const sourceValues = []
    const compareValues = []
    let sourceComplete = false
    let compareComplete = false
    
    function checkSequences() {
      // 比较已收集的值
      while (sourceValues.length > 0 && compareValues.length > 0) {
        const a = sourceValues.shift()
        const b = compareValues.shift()
        
        if (!comparator(a, b)) {
          subscriber.next(false)
          subscriber.complete()
          return
        }
      }
      
      // 两边都完成
      if (sourceComplete && compareComplete) {
        // 检查是否有剩余值
        if (sourceValues.length === 0 && compareValues.length === 0) {
          subscriber.next(true)
        } else {
          subscriber.next(false)
        }
        subscriber.complete()
      }
      
      // 一边完成但另一边还有值
      if (sourceComplete && compareValues.length > 0) {
        subscriber.next(false)
        subscriber.complete()
      }
      
      if (compareComplete && sourceValues.length > 0) {
        subscriber.next(false)
        subscriber.complete()
      }
    }
    
    const sourceSubscription = source.subscribe({
      next(value) {
        sourceValues.push(value)
        checkSequences()
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        sourceComplete = true
        checkSequences()
      }
    })
    
    const compareSubscription = compareTo.subscribe({
      next(value) {
        compareValues.push(value)
        checkSequences()
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        compareComplete = true
        checkSequences()
      }
    })
    
    return () => {
      sourceSubscription.unsubscribe()
      compareSubscription.unsubscribe()
    }
  })
}
```

## 实战示例

### API 响应处理

```javascript
function fetchUser(id) {
  return ajax.getJSON(`/api/users/${id}`).pipe(
    // 用户不存在时返回匿名用户
    defaultIfEmpty({ id: 0, name: 'Anonymous' })
  )
}

function fetchRequired(id) {
  return ajax.getJSON(`/api/data/${id}`).pipe(
    // 必须有数据，否则报错
    throwIfEmpty(() => new Error(`Data ${id} not found`))
  )
}
```

### 表单验证

```javascript
const formValid$ = formFields$.pipe(
  every(field => field.valid)
)

formValid$.subscribe(valid => {
  submitButton.disabled = !valid
})
```

### 搜索结果检查

```javascript
const searchResults$ = query$.pipe(
  switchMap(q => search(q)),
  // 检查是否有结果
  tap(results => {
    isEmpty().subscribe(empty => {
      showEmptyState.set(empty)
    })
  })
)
```

### 缓存验证

```javascript
function validateCache(cached$, fresh$) {
  return cached$.pipe(
    sequenceEqual(fresh$)
  ).subscribe(equal => {
    if (!equal) {
      console.log('Cache invalidated')
      refreshCache()
    }
  })
}
```

### 过滤后的默认值

```javascript
items$.pipe(
  filter(item => item.type === 'premium'),
  defaultIfEmpty({ type: 'basic', name: 'Default Item' })
).subscribe(item => {
  displayItem(item)
})
```

### 条件日志

```javascript
debugEvents$.pipe(
  isEmpty()
).subscribe(empty => {
  if (empty) {
    console.warn('No debug events captured')
  }
})
```

### 配置验证

```javascript
requiredConfigs$.pipe(
  every(config => config.isValid),
  tap(allValid => {
    if (!allValid) {
      console.error('Invalid configuration')
    }
  })
).subscribe(allValid => {
  if (allValid) {
    startApplication()
  }
})
```

## 组合使用

```javascript
// 确保有数据，且所有数据有效
data$.pipe(
  throwIfEmpty(() => new Error('No data')),
  toArray(),
  switchMap(items => 
    of(...items).pipe(
      every(item => item.isValid)
    )
  ),
  tap(allValid => {
    if (!allValid) {
      throw new Error('Invalid data found')
    }
  })
)
```

## 自定义条件操作符

```javascript
// 只有在满足条件时才发出
function emitWhen(condition$) {
  return (source) => combineLatest([source, condition$]).pipe(
    filter(([_, condition]) => condition),
    map(([value]) => value)
  )
}

// 使用
click$.pipe(
  emitWhen(isEnabled$)
).subscribe(handleClick)
```

```javascript
// 首次满足条件时发出
function firstWhere(predicate) {
  return (source) => source.pipe(
    filter(predicate),
    take(1),
    throwIfEmpty(() => new Error('No matching value'))
  )
}
```

## TypeScript 类型

```typescript
function defaultIfEmpty<T>(defaultValue: T): OperatorFunction<T, T>

function throwIfEmpty<T>(
  errorFactory?: () => any
): OperatorFunction<T, T>

function every<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, boolean>

function isEmpty<T>(): OperatorFunction<T, boolean>

function sequenceEqual<T>(
  compareTo: Observable<T>,
  comparator?: (a: T, b: T) => boolean
): OperatorFunction<T, boolean>
```

## 本章小结

- `defaultIfEmpty` 为空流提供默认值
- `throwIfEmpty` 空流时抛出错误
- `every` 检查所有值是否满足条件
- `isEmpty` 检查流是否为空
- `sequenceEqual` 比较两个流是否相等

下一章进入 Subject 主题——双向数据流。
