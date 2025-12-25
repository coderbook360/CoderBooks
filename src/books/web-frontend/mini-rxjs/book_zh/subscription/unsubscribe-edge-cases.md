---
sidebar_position: 20
title: 取消订阅的边界情况
---

# 取消订阅的边界情况

取消订阅看似简单，但有许多边界情况需要注意。本章详细探讨这些情况及处理方式。

## 边界情况一：同步 Observable

同步 Observable 在 subscribe 调用期间就完成了：

```typescript
const sync$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
  
  return () => console.log('teardown')
})

const sub = sync$.subscribe({
  next: v => console.log('next:', v),
  complete: () => console.log('complete')
})

console.log('closed:', sub.closed)

// 输出:
// next: 1
// next: 2
// complete
// teardown
// closed: true
```

**注意**：subscribe 返回时，订阅已经关闭。

### 问题：在回调中使用 subscription

```typescript
// ❌ 危险：同步 Observable 中 sub 可能未定义
const sub = sync$.subscribe(value => {
  if (value > 5) sub.unsubscribe()  // sub 是 undefined！
})
```

这是因为赋值操作在 subscribe 返回后才完成，但同步 Observable 的回调在返回前就执行了。

### 解决方案

```typescript
// 方案一：使用 take 或 takeWhile
sync$.pipe(
  takeWhile(v => v <= 5)
).subscribe(console.log)

// 方案二：使用 setTimeout
let sub: Subscription
sub = sync$.subscribe(value => {
  if (value > 5) {
    setTimeout(() => sub.unsubscribe(), 0)
  }
})

// 方案三：检查 undefined
let sub: Subscription | undefined
sub = sync$.subscribe(value => {
  if (value > 5 && sub) {
    sub.unsubscribe()
  }
})
```

## 边界情况二：已关闭的 Subscription

对已关闭的 Subscription 调用 unsubscribe 是安全的：

```typescript
const sub = source$.subscribe(console.log)

sub.unsubscribe()
console.log(sub.closed)  // true

sub.unsubscribe()  // 无操作，不会报错
sub.unsubscribe()  // 仍然安全
```

**设计原则**：幂等性让代码更健壮。

## 边界情况三：在 teardown 中再次取消

```typescript
const sub = new Subscription(() => {
  console.log('teardown 开始')
  sub.unsubscribe()  // 在 teardown 中再次取消
  console.log('teardown 结束')
})

sub.unsubscribe()

// 输出:
// teardown 开始
// teardown 结束
```

由于 `closed` 在执行 teardown 前就设为 true，再次调用 unsubscribe 会直接返回。

## 边界情况四：添加到已关闭的 Subscription

```typescript
const sub = new Subscription()
sub.unsubscribe()

console.log(sub.closed)  // true

// 添加清理函数到已关闭的 Subscription
sub.add(() => console.log('会立即执行'))

// 输出:
// 会立即执行
```

**设计**：添加到已关闭的 Subscription 会立即执行清理逻辑。

## 边界情况五：循环引用

```typescript
const sub1 = new Subscription(() => console.log('sub1'))
const sub2 = new Subscription(() => console.log('sub2'))

sub1.add(sub2)
sub2.add(sub1)  // 循环引用

sub1.unsubscribe()

// 输出:
// sub1
// sub2
```

RxJS 的实现能正确处理循环引用，不会导致无限循环。原因：

1. unsubscribe 首先设置 `closed = true`
2. 尝试取消子 Subscription 时，检测到已关闭直接返回

## 边界情况六：在 next 中取消订阅

```typescript
let count = 0
const sub = interval(100).subscribe(value => {
  console.log(value)
  count++
  if (count >= 3) {
    sub.unsubscribe()
  }
})

// 输出:
// 0
// 1
// 2
```

**注意**：在 next 回调中取消订阅是安全的，后续值不会发送。

## 边界情况七：complete/error 后再 unsubscribe

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.complete()
  
  return () => console.log('teardown')
})

const sub = source$.subscribe({
  complete: () => console.log('complete')
})

// 此时 teardown 已经执行过了

sub.unsubscribe()  // 无操作

// 输出:
// complete
// teardown
// (unsubscribe 没有额外输出)
```

complete 和 error 会自动触发 teardown 和关闭订阅，后续 unsubscribe 无操作。

## 边界情况八：teardown 中抛出错误

```typescript
vi.useFakeTimers()

const sub = new Subscription(() => {
  throw new Error('teardown 错误')
})

sub.add(() => console.log('其他清理'))

sub.unsubscribe()

console.log('unsubscribe 正常返回')

vi.runAllTimers()  // 触发异步错误

// 输出:
// 其他清理
// unsubscribe 正常返回
// Uncaught Error: teardown 错误
```

**设计**：

1. teardown 错误不阻止其他清理
2. 错误异步抛出，不影响当前流程
3. 可以被全局错误处理器捕获

## 边界情况九：Subscription.EMPTY

```typescript
const empty = Subscription.EMPTY

empty.unsubscribe()  // 无操作
empty.add(() => console.log('立即执行'))  // 立即执行

console.log(empty.closed)  // true
```

`Subscription.EMPTY` 是一个预创建的已关闭 Subscription，用于：

1. 默认值，避免 null 检查
2. 表示"无需订阅"的情况
3. 某些操作符的返回值

## 边界情况十：异步订阅的取消时机

```typescript
const async$ = new Observable(subscriber => {
  const id = setTimeout(() => {
    subscriber.next('异步值')
    subscriber.complete()
  }, 1000)
  
  return () => {
    clearTimeout(id)
    console.log('已取消')
  }
})

const sub = async$.subscribe(console.log)

// 100ms 后取消
setTimeout(() => sub.unsubscribe(), 100)

// 输出:
// 已取消
// (没有 "异步值"，因为在发送前就取消了)
```

及时取消可以阻止后续操作。

## 最佳实践

### 1. 总是保存 Subscription 引用

```typescript
// ❌ 无法取消
source$.subscribe(console.log)

// ✅ 保存引用
const sub = source$.subscribe(console.log)
```

### 2. 使用操作符而不是手动取消

```typescript
// ❌ 手动在回调中取消
let sub: Subscription
sub = source$.subscribe(v => {
  if (shouldStop(v)) sub.unsubscribe()
})

// ✅ 使用操作符
source$.pipe(
  takeWhile(v => !shouldStop(v))
).subscribe(console.log)
```

### 3. 在适当的生命周期取消

```typescript
// ❌ 只在某些条件取消
if (someCondition) sub.unsubscribe()

// ✅ 在确定的生命周期取消
componentWillUnmount() {
  this.subscription.unsubscribe()
}
```

### 4. 处理同步 Observable 的特殊性

```typescript
// ✅ 对可能同步的 Observable 使用操作符
maybeSync$.pipe(
  take(5)  // 安全地限制数量
).subscribe(console.log)
```

## 测试边界情况

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('取消订阅边界情况', () => {
  it('同步 Observable 应在 subscribe 返回前完成', () => {
    let completedBeforeReturn = false
    
    const sync$ = new Observable(subscriber => {
      subscriber.next(1)
      subscriber.complete()
    })

    const sub = sync$.subscribe({
      complete: () => { completedBeforeReturn = true }
    })

    expect(completedBeforeReturn).toBe(true)
    expect(sub.closed).toBe(true)
  })

  it('多次 unsubscribe 应该是幂等的', () => {
    const teardown = vi.fn()
    const sub = new Subscription(teardown)

    sub.unsubscribe()
    sub.unsubscribe()
    sub.unsubscribe()

    expect(teardown).toHaveBeenCalledTimes(1)
  })

  it('添加到已关闭的 Subscription 应立即执行', () => {
    const fn = vi.fn()
    const sub = new Subscription()
    
    sub.unsubscribe()
    sub.add(fn)

    expect(fn).toHaveBeenCalled()
  })

  it('teardown 错误不应阻止其他清理', () => {
    vi.useFakeTimers()

    const fn1 = vi.fn()
    const fn2 = vi.fn(() => { throw new Error('test') })
    const fn3 = vi.fn()

    const sub = new Subscription()
    sub.add(fn1)
    sub.add(fn2)
    sub.add(fn3)
    sub.unsubscribe()

    expect(fn1).toHaveBeenCalled()
    expect(fn3).toHaveBeenCalled()

    vi.useRealTimers()
  })
})
```

## 本章小结

本章详细探讨了取消订阅的边界情况：

- **同步 Observable**：subscribe 返回前就完成
- **幂等性**：多次 unsubscribe 安全
- **已关闭 Subscription**：add 会立即执行
- **循环引用**：正确处理，不会无限循环
- **回调中取消**：在 next 中取消是安全的
- **teardown 错误**：不阻止其他清理，异步抛出

理解这些边界情况有助于编写更健壮的响应式代码。至此，Subscription 部分完成。下一部分，我们将学习操作符架构。

---

**思考题**：

1. 如何设计一个"延迟取消"的 Subscription？
2. 在 error 回调中调用 unsubscribe 会怎样？
3. 如何检测 Subscription 是否正在取消中（unsubscribe 执行过程中）？
