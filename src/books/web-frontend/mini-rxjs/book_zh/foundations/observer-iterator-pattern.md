---
sidebar_position: 5
title: 观察者模式与迭代器模式
---

# 观察者模式与迭代器模式

Observable 的设计融合了两个经典设计模式：**观察者模式（Observer Pattern）** 和 **迭代器模式（Iterator Pattern）**。理解这两个模式，是理解 Observable 内部机制的关键。

## 迭代器模式：Pull 的基石

迭代器模式定义了一种**顺序访问集合元素**的方式，而无需暴露集合的内部结构。

### 迭代器协议

JavaScript 中，迭代器遵循一个简单的协议：

```typescript
interface Iterator<T> {
  next(): IteratorResult<T>
}

interface IteratorResult<T> {
  value: T
  done: boolean
}
```

任何实现了 `next()` 方法的对象都是迭代器：

```typescript
// 手动实现一个迭代器
function createRangeIterator(start: number, end: number): Iterator<number> {
  let current = start
  
  return {
    next() {
      if (current <= end) {
        return { value: current++, done: false }
      }
      return { value: undefined as any, done: true }
    }
  }
}

const iterator = createRangeIterator(1, 3)
console.log(iterator.next())  // { value: 1, done: false }
console.log(iterator.next())  // { value: 2, done: false }
console.log(iterator.next())  // { value: 3, done: false }
console.log(iterator.next())  // { value: undefined, done: true }
```

### 可迭代协议

可迭代对象实现 `Symbol.iterator` 方法，返回迭代器：

```typescript
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>
}
```

这使得对象可以用 `for...of` 遍历：

```typescript
const range = {
  from: 1,
  to: 3,
  
  [Symbol.iterator]() {
    let current = this.from
    const last = this.to
    
    return {
      next() {
        if (current <= last) {
          return { value: current++, done: false }
        }
        return { value: undefined as any, done: true }
      }
    }
  }
}

for (const num of range) {
  console.log(num)  // 1, 2, 3
}
```

### Generator：迭代器的语法糖

Generator 函数简化了迭代器的创建：

```typescript
function* range(start: number, end: number) {
  for (let i = start; i <= end; i++) {
    yield i
  }
}

const iterator = range(1, 3)
console.log([...iterator])  // [1, 2, 3]
```

Generator 的特点：
- **惰性求值**：只有调用 `next()` 时才计算下一个值
- **可暂停**：执行到 `yield` 时暂停，等待下次 `next()`
- **双向通信**：可以通过 `next(value)` 向 generator 传值

### 迭代器的局限性

迭代器是同步的、Pull 模式的。面对异步场景，它力不从心：

```typescript
// 这样写不行
function* fetchUsers() {
  const response = yield fetch('/api/users')  // yield 不能等待 Promise
  return response.json()
}
```

虽然 ES2018 引入了异步迭代器（`Symbol.asyncIterator`），但它仍然是 Pull 模式，无法处理"生产者主动推送"的场景。

## 观察者模式：Push 的基石

观察者模式定义了对象间的**一对多依赖关系**，当一个对象状态改变时，所有依赖它的对象都会收到通知。

### 经典实现

```typescript
// 被观察者（Subject）
class EventEmitter<T> {
  private observers: Set<(value: T) => void> = new Set()
  
  // 添加观察者
  subscribe(observer: (value: T) => void): () => void {
    this.observers.add(observer)
    // 返回取消订阅函数
    return () => this.observers.delete(observer)
  }
  
  // 通知所有观察者
  emit(value: T): void {
    this.observers.forEach(observer => observer(value))
  }
}

// 使用
const emitter = new EventEmitter<string>()

const unsubscribe = emitter.subscribe(msg => {
  console.log('收到消息:', msg)
})

emitter.emit('Hello')  // 收到消息: Hello
emitter.emit('World')  // 收到消息: World

unsubscribe()
emitter.emit('Goodbye')  // 无输出
```

### DOM 事件就是观察者模式

浏览器的事件系统是观察者模式的典型应用：

```typescript
// EventTarget 是被观察者
// 事件处理函数是观察者
button.addEventListener('click', handler1)
button.addEventListener('click', handler2)

// 当事件触发时，所有 handler 都会被调用
button.click()  // handler1 和 handler2 都执行
```

### 观察者模式的局限性

传统的观察者模式也有不足：

**1. 缺少完成和错误语义**

```typescript
emitter.emit('data')  // 只能发数据
// 如何表示"数据流结束了"？
// 如何表示"发生了错误"？
```

**2. 难以组合**

```typescript
// 如何合并两个 EventEmitter？
// 如何过滤事件？
// 如何映射事件值？
```

**3. 资源清理不够系统化**

```typescript
// 每个 listener 都要记住取消订阅
// 很容易忘记，导致内存泄漏
```

## Observable：两种模式的结合

Observable 巧妙地结合了迭代器和观察者两种模式的优点：

### 从迭代器借鉴

**三态返回值**：迭代器返回 `{ value, done }`，Observable 的 Observer 有三个回调：

```typescript
// 迭代器
interface IteratorResult<T> {
  value: T       // 对应 next
  done: boolean  // 对应 complete
}

// 观察者
interface Observer<T> {
  next(value: T): void      // 接收值
  error(err: unknown): void // 接收错误
  complete(): void          // 接收完成
}
```

**惰性执行**：Observable 和迭代器一样，都是惰性的：

```typescript
// 迭代器：不调用 next 就不执行
const gen = (function* () {
  console.log('执行')
  yield 1
})()
// 此时没有输出

// Observable：不订阅就不执行
const obs = new Observable(subscriber => {
  console.log('执行')
  subscriber.next(1)
})
// 此时没有输出
```

### 从观察者模式借鉴

**推送语义**：生产者决定何时发送数据：

```typescript
const observable = new Observable(subscriber => {
  // 生产者决定发送时机
  setTimeout(() => subscriber.next(1), 1000)
  setTimeout(() => subscriber.next(2), 2000)
})

observable.subscribe(value => {
  // 消费者只能被动接收
  console.log(value)
})
```

**一对多关系**：一个 Observable 可以被多次订阅：

```typescript
const source$ = interval(1000)

// 两个订阅者，独立接收
source$.subscribe(v => console.log('A:', v))
source$.subscribe(v => console.log('B:', v))
```

### Observable 的创新

在结合两种模式的基础上，Observable 还做了关键创新：

**1. 统一的完成和错误语义**

```typescript
const observable = new Observable(subscriber => {
  try {
    subscriber.next(1)
    subscriber.next(2)
    subscriber.complete()  // 明确表示完成
  } catch (err) {
    subscriber.error(err)  // 明确表示错误
  }
})
```

**2. 可取消订阅**

```typescript
const subscription = observable.subscribe(observer)
// 随时可以取消
subscription.unsubscribe()
```

**3. 资源自动清理**

```typescript
const observable = new Observable(subscriber => {
  const timer = setInterval(() => {
    subscriber.next(Date.now())
  }, 1000)
  
  // 返回清理函数
  return () => {
    clearInterval(timer)  // 取消订阅时自动执行
  }
})
```

**4. 管道式组合**

```typescript
source$.pipe(
  filter(x => x > 0),
  map(x => x * 2),
  take(5)
).subscribe(console.log)
```

## 对偶关系的数学视角

从范畴论的角度，Iterator 和 Observer 是**对偶（Dual）** 的。

### 箭头反转

对偶意味着"把所有箭头反过来"：

```typescript
// Iterator：消费者调用生产者
interface Iterator<T> {
  next(): IteratorResult<T>  // 消费者 → 生产者
}

// Observer：生产者调用消费者
interface Observer<T> {
  next(value: T): void   // 生产者 → 消费者
  error(err: any): void  // 生产者 → 消费者
  complete(): void       // 生产者 → 消费者
}
```

箭头方向完全相反：
- Iterator：`消费者.next()` 调用生产者
- Observer：`生产者.next(value)` 调用消费者

### 从 Iterable 到 Observable

如果我们把 Iterable 接口"对偶化"：

```typescript
// Iterable：返回 Iterator
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>
}

// 对偶：接收 Observer，返回清理函数
interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription
}
```

| Iterable | Observable |
|----------|------------|
| 返回 Iterator | 接收 Observer |
| 消费者拉取 | 生产者推送 |
| 同步遍历 | 异步推送 |
| for...of | subscribe |

这种对偶关系不是巧合，而是 RxJS 的理论基础。

## 动手实现：从模式到代码

现在让我们用这些模式的理解，写出 Observer 接口的完整定义：

```typescript
/**
 * Observer 接口 - Observable 推送数据的目标
 * 
 * 结合了迭代器的三态语义和观察者模式的推送机制
 */
export interface Observer<T> {
  /**
   * 接收下一个值
   * 可以被调用零次或多次
   */
  next: (value: T) => void
  
  /**
   * 接收错误通知
   * 调用后不会再有其他通知
   */
  error: (err: unknown) => void
  
  /**
   * 接收完成通知
   * 调用后不会再有其他通知
   */
  complete: () => void
}

/**
 * 部分 Observer - 允许只实现部分回调
 * 这是对经典观察者模式的改进
 */
export type PartialObserver<T> = Partial<Observer<T>>
```

再写出订阅函数的类型：

```typescript
/**
 * 清理逻辑类型
 * - 函数：取消订阅时调用
 * - void：无需清理
 * - Subscription：嵌套订阅
 */
export type TeardownLogic = (() => void) | void | Subscription

/**
 * Observable 的订阅函数
 * 这是迭代器 next 方法的对偶
 */
export type SubscribeFunction<T> = (subscriber: Subscriber<T>) => TeardownLogic
```

## 设计模式在 RxJS 中的体现

除了观察者和迭代器模式，RxJS 还运用了其他设计模式：

### 工厂模式：创建操作符

```typescript
// of、from、interval 都是工厂函数
const numbers$ = of(1, 2, 3)
const array$ = from([1, 2, 3])
const timer$ = interval(1000)
```

### 装饰器模式：Pipeable 操作符

```typescript
// 每个操作符都"装饰"原 Observable，返回新 Observable
source$.pipe(
  map(x => x * 2),     // 装饰：增加映射能力
  filter(x => x > 5),  // 装饰：增加过滤能力
  take(3)              // 装饰：增加限制能力
)
```

### 组合模式：Subscription

```typescript
const parent = new Subscription()
const child1 = source1$.subscribe(/*...*/)
const child2 = source2$.subscribe(/*...*/)

parent.add(child1)
parent.add(child2)

// 取消父订阅会同时取消所有子订阅
parent.unsubscribe()
```

## 本章小结

本章我们深入理解了 Observable 的设计基础：

- **迭代器模式**：定义了顺序访问的协议，提供了三态语义（value、done、throw）
- **观察者模式**：定义了一对多的推送机制，实现了解耦
- **Observable 的融合**：
  - 从迭代器借鉴了三态语义和惰性执行
  - 从观察者借鉴了推送机制和一对多关系
  - 创新了可取消、资源清理、管道组合
- **对偶关系**：Iterator 和 Observer 是数学上的对偶

这两个经典模式的深刻理解，是我们后续实现 Observable、Subscriber、Subscription 的基础。下一章，我们将探讨函数式编程的基础概念，为理解操作符的设计做准备。

---

**思考题**：

1. 为什么说 Observable 是"惰性"的？这种惰性来自迭代器模式的哪个特性？
2. Observer 接口为什么需要 error 和 complete 两个方法？只用 next 行不行？
3. 如果让你设计一个类似 Observable 的数据类型，但只支持单值推送，它和 Promise 有什么区别？
