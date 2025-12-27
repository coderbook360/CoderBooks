# TestScheduler：时间控制测试

`TestScheduler` 允许在测试中控制时间，实现同步测试异步代码。

## 基本用法

```typescript
import { TestScheduler } from 'rxjs/testing'

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected)
})

scheduler.run(({ cold, hot, expectObservable }) => {
  const source = cold('--a--b--c--|')
  const expected =    '--a--b--c--|'
  
  expectObservable(source).toBe(expected)
})
```

## cold vs hot

### cold：从订阅开始

```typescript
const source = cold('--a--b--c--|')
```

### hot：已经在运行

```typescript
const source = hot('--a--b--c--|')
```

## 测试操作符

### map

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--b--c--|')
  const expected =    '--A--B--C--|'
  
  const result = source.pipe(
    map(x => x.toUpperCase())
  )
  
  expectObservable(result).toBe(expected)
})
```

### filter

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--1--2--3--4--|', { 1: 1, 2: 2, 3: 3, 4: 4 })
  const expected =    '-----2-----4--|'
  
  const result = source.pipe(
    filter(x => x % 2 === 0)
  )
  
  expectObservable(result).toBe(expected, { 2: 2, 4: 4 })
})
```

### debounceTime

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--b--c-----|')
  const expected =    '--------c-----|'
  
  const result = source.pipe(
    debounceTime(30, scheduler)
  )
  
  expectObservable(result).toBe(expected)
})
```

## 时间控制

### 虚拟时间

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a 1s b 500ms c--|')
  
  // 虚拟时间，立即完成测试
  expectObservable(source).toBe('--a 1s b 500ms c--|')
})
```

### flush

```typescript
scheduler.flush()  // 立即执行所有待处理的任务
```

## 测试订阅时机

```typescript
scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
  const source = cold('--a--b--c--|')
  const subs =        '^----------!'
  
  expectObservable(source).toBe('--a--b--c--|')
  expectSubscriptions(source.subscriptions).toBe(subs)
})
```

## 测试错误

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--#')
  const expected =    '--a--#'
  
  expectObservable(source).toBe(expected)
})
```

## 实战示例

### 测试 switchMap

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a-----b-----c-|')
  const inner =       '   --1--2--3|'
  const expected =    '----1--2--1--2--1--2--3-|'
  
  const result = source.pipe(
    switchMap(() => cold(inner))
  )
  
  expectObservable(result).toBe(expected)
})
```

### 测试 retry

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--b--#')
  const expected =    '--a--b----a--b----a--b--#'
  
  const result = source.pipe(
    retry(2)
  )
  
  expectObservable(result).toBe(expected)
})
```

## 总结

- TestScheduler 提供虚拟时间
- 使用 Marble 语法编写测试
- cold 创建冷 Observable
- hot 创建热 Observable
- expectObservable 验证结果
- 同步测试异步代码
