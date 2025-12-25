---
sidebar_position: 54
title: "withLatestFrom"
---

# withLatestFrom

`withLatestFrom` 在主源发射时，取辅助源的最新值组合。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')
const timer$ = interval(1000)

clicks$.pipe(
  withLatestFrom(timer$)
).subscribe(([click, time]) => {
  console.log(`Click at timer: ${time}`)
})
```

时间线：

```
clicks$: ----c-------c----c---->
timer$:  -0--1--2--3--4--5--6-->
output:  ----[c,1]---[c,3]-[c,4]->
```

**关键特征**：只有主源发射才触发，辅助源的值只是被采样。

## 实现 withLatestFrom

```javascript
function withLatestFrom(...inputs) {
  return (source) => new Observable(subscriber => {
    const n = inputs.length
    const latestValues = new Array(n)
    const hasValue = new Array(n).fill(false)
    let hasAllValues = false

    const inputSubscriptions = inputs.map((input, index) => {
      return input.subscribe({
        next(value) {
          latestValues[index] = value
          if (!hasValue[index]) {
            hasValue[index] = true
            hasAllValues = hasValue.every(Boolean)
          }
        },
        error(err) {
          subscriber.error(err)
        }
      })
    })

    const sourceSubscription = source.subscribe({
      next(value) {
        if (hasAllValues) {
          subscriber.next([value, ...latestValues])
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    return () => {
      inputSubscriptions.forEach(s => s.unsubscribe())
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 多个辅助源

```javascript
clicks$.pipe(
  withLatestFrom(
    user$,
    permissions$,
    settings$
  )
).subscribe(([click, user, permissions, settings]) => {
  handleClick(click, user, permissions, settings)
})
```

## 实战示例

### 点击时获取表单状态

```javascript
const form$ = formGroup.valueChanges.pipe(
  startWith(formGroup.value)
)

submitBtn.click$.pipe(
  withLatestFrom(form$)
).subscribe(([_, formValue]) => {
  submitForm(formValue)
})
```

### 操作时附带上下文

```javascript
const deleteItem$ = deleteClicks$.pipe(
  map(e => e.target.dataset.id)
)

deleteItem$.pipe(
  withLatestFrom(
    currentUser$,
    confirmDialog$
  )
).subscribe(([itemId, user, confirmed]) => {
  if (confirmed) {
    deleteItem(itemId, user.id)
  }
})
```

### 搜索建议选择

```javascript
// 用户选择建议项
suggestionClick$.pipe(
  withLatestFrom(suggestions$)
).subscribe(([clickEvent, suggestions]) => {
  const index = getClickedIndex(clickEvent)
  const selected = suggestions[index]
  applySelection(selected)
})
```

### 快捷键处理

```javascript
const keydown$ = fromEvent(document, 'keydown')

// Ctrl+S 保存
keydown$.pipe(
  filter(e => e.ctrlKey && e.key === 's'),
  withLatestFrom(document$, dirty$)
).subscribe(([event, doc, isDirty]) => {
  event.preventDefault()
  if (isDirty) {
    saveDocument(doc)
  }
})
```

## withLatestFrom vs combineLatest

```javascript
const a$ = interval(1000).pipe(map(x => `A${x}`))
const b$ = interval(3000).pipe(map(x => `B${x}`))

// withLatestFrom: a$ 是主源
a$.pipe(
  withLatestFrom(b$)
).subscribe(console.log)
// (等 b$ 有值后)
// [A3, B0], [A4, B0], [A5, B0], [A6, B1], ...

// combineLatest: 两者对等
combineLatest([a$, b$]).subscribe(console.log)
// [A2, B0], [A3, B0], [A4, B0], [A5, B0], [A5, B1], ...
```

对比：

| 场景 | 选择 |
|------|------|
| 点击时取当前状态 | `withLatestFrom` |
| 多个表单字段联动 | `combineLatest` |
| 事件 + 上下文 | `withLatestFrom` |
| 多数据源同步 | `combineLatest` |

## sample：简化版 withLatestFrom

```javascript
// sample: 只取值，不组合
source$.pipe(
  sample(notifier$)
)

// 等价于
notifier$.pipe(
  withLatestFrom(source$),
  map(([_, value]) => value)
)
```

### 实现 sample

```javascript
function sample(notifier) {
  return (source) => new Observable(subscriber => {
    let lastValue
    let hasValue = false

    const sourceSubscription = source.subscribe({
      next(value) {
        lastValue = value
        hasValue = true
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
        if (hasValue) {
          subscriber.next(lastValue)
          hasValue = false
        }
      },
      error(err) {
        subscriber.error(err)
      }
    })

    return () => {
      sourceSubscription.unsubscribe()
      notifierSubscription.unsubscribe()
    }
  })
}
```

使用示例：

```javascript
// 每次点击取当前时间
timer$.pipe(
  sample(clicks$)
).subscribe(console.log)
```

## 常见陷阱

### 辅助源没有值

```javascript
// 问题：如果 user$ 迟迟没有值，点击无效
clicks$.pipe(
  withLatestFrom(user$)
)

// 解决：确保辅助源有初始值
clicks$.pipe(
  withLatestFrom(user$.pipe(startWith(null)))
).subscribe(([click, user]) => {
  if (user) {
    handleClick(click, user)
  } else {
    showLoginPrompt()
  }
})
```

### 辅助源发射不会触发输出

```javascript
// user$ 频繁更新，但只有点击才会处理
clicks$.pipe(
  withLatestFrom(user$)
)
// user$ 的更新不会触发任何输出
```

## TypeScript 类型

```typescript
function withLatestFrom<T, R extends readonly unknown[]>(
  ...inputs: [...ObservableInputTuple<R>]
): OperatorFunction<T, [T, ...R]>

function withLatestFrom<T, R extends readonly unknown[], P>(
  ...inputs: [...ObservableInputTuple<R>, (...values: [T, ...R]) => P]
): OperatorFunction<T, P>

function sample<T>(
  notifier: Observable<any>
): OperatorFunction<T, T>
```

## 本章小结

- `withLatestFrom` 以主源为触发，取辅助源最新值
- 适合事件处理时附带上下文
- 辅助源必须有值才会输出
- `sample` 是只取值不组合的简化版

下一章实现 `zip` 操作符。
