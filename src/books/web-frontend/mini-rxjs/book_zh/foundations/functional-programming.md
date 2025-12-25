---
sidebar_position: 6
title: 函数式编程基础：纯函数与组合
---

# 函数式编程基础：纯函数与组合

RxJS 的操作符设计深受函数式编程影响。理解纯函数、函数组合、高阶函数这些核心概念，是理解操作符工作原理的关键。

## 为什么 RxJS 需要函数式编程

思考一下 RxJS 的操作符是如何工作的：

```typescript
source$.pipe(
  map(x => x * 2),
  filter(x => x > 5),
  take(3)
)
```

每个操作符：
- **接收一个 Observable，返回新的 Observable**
- **不修改原 Observable**
- **可以自由组合**

这些特性正是函数式编程的核心思想。

## 纯函数：可预测的基石

### 什么是纯函数

纯函数满足两个条件：

1. **相同输入永远得到相同输出**
2. **没有副作用**

```typescript
// 纯函数
function add(a: number, b: number): number {
  return a + b
}

add(2, 3)  // 永远是 5
add(2, 3)  // 还是 5

// 不纯函数：依赖外部状态
let base = 10
function addToBase(x: number): number {
  return base + x  // 结果取决于外部变量
}

addToBase(5)  // 15
base = 20
addToBase(5)  // 25，相同输入不同输出
```

### 副作用

副作用是指函数对外部世界产生的影响：

```typescript
// 有副作用：修改外部变量
let count = 0
function increment(): number {
  count++  // 修改了外部状态
  return count
}

// 有副作用：IO 操作
function logValue(x: number): number {
  console.log(x)  // 输出到控制台
  return x
}

// 有副作用：修改参数
function addItem(arr: number[], item: number): void {
  arr.push(item)  // 修改了传入的数组
}
```

### RxJS 中的纯函数

RxJS 的操作符都是纯函数：

```typescript
const source$ = of(1, 2, 3)
const doubled$ = source$.pipe(map(x => x * 2))

// source$ 完全不受影响
source$.subscribe(console.log)   // 1, 2, 3
doubled$.subscribe(console.log)  // 2, 4, 6
```

这带来巨大优势：

- **可预测**：相同输入总是产生相同输出
- **可测试**：不依赖外部状态，测试简单
- **可缓存**：相同输入可以复用结果
- **可并行**：无共享状态，天然线程安全

## 不可变性：数据的安全网

### 可变数据的危险

```typescript
const user = { name: 'Alice', age: 30 }

function celebrateBirthday(user: User) {
  user.age++  // 危险：修改了原对象
  return user
}

celebrateBirthday(user)
console.log(user.age)  // 31，原对象被意外修改了
```

### 不可变更新

```typescript
function celebrateBirthday(user: User): User {
  return { ...user, age: user.age + 1 }  // 返回新对象
}

const user = { name: 'Alice', age: 30 }
const olderUser = celebrateBirthday(user)

console.log(user.age)       // 30，原对象不变
console.log(olderUser.age)  // 31，新对象
```

### RxJS 的不可变性

每个操作符都返回新的 Observable，从不修改原有的：

```typescript
const source$ = of(1, 2, 3)

// 每次 pipe 返回新的 Observable
const a$ = source$.pipe(map(x => x * 2))
const b$ = source$.pipe(filter(x => x > 1))
const c$ = a$.pipe(take(2))

// source$, a$, b$, c$ 都是独立的 Observable
```

## 高阶函数：函数的函数

高阶函数是指**接收函数作为参数**或**返回函数作为结果**的函数。

### 函数作为参数

```typescript
// map 接收一个转换函数
const numbers = [1, 2, 3]
const doubled = numbers.map(x => x * 2)  // [2, 4, 6]

// filter 接收一个断言函数
const evens = numbers.filter(x => x % 2 === 0)  // [2]

// reduce 接收一个累积函数
const sum = numbers.reduce((acc, x) => acc + x, 0)  // 6
```

### 函数作为返回值

```typescript
// 创建一个加法器工厂
function createAdder(base: number) {
  return function(x: number) {
    return base + x
  }
}

const add5 = createAdder(5)
add5(3)  // 8
add5(10) // 15
```

### RxJS 操作符是高阶函数

RxJS 的 pipeable 操作符都是高阶函数——接收配置，返回一个处理函数：

```typescript
// map 操作符的简化实现
function map<T, R>(project: (value: T) => R) {
  // 返回一个函数，这个函数接收 Observable 返回新 Observable
  return function(source: Observable<T>): Observable<R> {
    return new Observable(subscriber => {
      return source.subscribe({
        next: value => subscriber.next(project(value)),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })
    })
  }
}

// 使用
source$.pipe(
  map(x => x * 2)  // map(x => x * 2) 返回一个函数
)
```

## 函数组合：搭建管道

### 基础组合

函数组合是将多个函数串联起来，前一个函数的输出作为后一个函数的输入：

```typescript
const double = (x: number) => x * 2
const addOne = (x: number) => x + 1
const square = (x: number) => x * x

// 手动组合
const result = square(addOne(double(5)))  // ((5 * 2) + 1)² = 121

// 定义 compose 函数
function compose<T>(...fns: Array<(x: T) => T>) {
  return function(initial: T): T {
    return fns.reduceRight((acc, fn) => fn(acc), initial)
  }
}

const compute = compose(square, addOne, double)
compute(5)  // 121
```

### pipe 函数

`compose` 从右到左执行，不太直观。`pipe` 从左到右，更符合阅读习惯：

```typescript
function pipe<T>(...fns: Array<(x: T) => T>) {
  return function(initial: T): T {
    return fns.reduce((acc, fn) => fn(acc), initial)
  }
}

const compute = pipe(double, addOne, square)
compute(5)  // ((5 * 2) + 1)² = 121
```

### RxJS 的 pipe 方法

Observable 的 `pipe` 方法正是基于这个原理：

```typescript
// pipe 方法的简化实现
class Observable<T> {
  pipe<R>(...operators: Array<(source: Observable<any>) => Observable<any>>): Observable<R> {
    return operators.reduce(
      (source, operator) => operator(source),
      this as Observable<any>
    ) as Observable<R>
  }
}

// 使用
source$.pipe(
  map(x => x * 2),     // Observable<T> -> Observable<number>
  filter(x => x > 5),  // Observable<number> -> Observable<number>
  take(3)              // Observable<number> -> Observable<number>
)
```

每个操作符都是 `Observable<A> -> Observable<B>` 的函数，`pipe` 将它们串联起来。

## 柯里化：参数的分步传递

柯里化（Currying）是将多参数函数转换为一系列单参数函数：

```typescript
// 普通函数
function add(a: number, b: number): number {
  return a + b
}
add(2, 3)  // 5

// 柯里化版本
function curriedAdd(a: number) {
  return function(b: number): number {
    return a + b
  }
}
curriedAdd(2)(3)  // 5

// 更简洁的写法
const curriedAdd2 = (a: number) => (b: number) => a + b
```

### 柯里化的优势：部分应用

```typescript
const add5 = curriedAdd(5)  // 固定第一个参数
add5(3)   // 8
add5(10)  // 15

// 实际应用
const formatPrice = (currency: string) => (amount: number) => 
  `${currency}${amount.toFixed(2)}`

const formatUSD = formatPrice('$')
const formatCNY = formatPrice('¥')

formatUSD(99.5)  // '$99.50'
formatCNY(99.5)  // '¥99.50'
```

### RxJS 操作符的柯里化设计

RxJS 操作符本质上就是柯里化的函数：

```typescript
// map 是柯里化的：先接收 project 函数，再接收 source Observable
const mapDouble = map((x: number) => x * 2)  // 部分应用
source$.pipe(mapDouble)  // 完成调用

// 等价于
source$.pipe(map(x => x * 2))
```

这种设计使得操作符可以预配置、复用：

```typescript
// 创建可复用的操作符组合
const processUser = pipe(
  filter((user: User) => user.active),
  map(user => user.name),
  take(10)
)

users$.pipe(processUser)
admins$.pipe(processUser)
```

## 实现一个迷你 pipe

让我们从零实现一个类型安全的 `pipe` 函数：

```typescript
// 最简版本：不考虑类型
function pipe<T>(...fns: Array<(x: any) => any>) {
  return (initial: T) => fns.reduce((acc, fn) => fn(acc), initial)
}

// 类型安全版本：使用函数重载
function pipe<A>(source: A): A
function pipe<A, B>(source: A, fn1: (a: A) => B): B
function pipe<A, B, C>(source: A, fn1: (a: A) => B, fn2: (b: B) => C): C
function pipe<A, B, C, D>(
  source: A, 
  fn1: (a: A) => B, 
  fn2: (b: B) => C,
  fn3: (c: C) => D
): D
// ... 可以继续扩展
function pipe(source: any, ...fns: Array<(x: any) => any>): any {
  return fns.reduce((acc, fn) => fn(acc), source)
}

// 使用
const result = pipe(
  5,
  (x: number) => x * 2,      // number -> number
  (x: number) => x.toString(), // number -> string
  (x: string) => x.length    // string -> number
)
// result 的类型是 number
```

## 实现操作符工厂

理解了这些概念，我们可以设计操作符的标准形式：

```typescript
// 操作符类型定义
type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>

// 操作符工厂：接收配置，返回操作符函数
function map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R> {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(subscriber => {
      let index = 0
      return source.subscribe({
        next: value => {
          try {
            subscriber.next(project(value, index++))
          } catch (err) {
            subscriber.error(err)
          }
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })
    })
  }
}
```

这个模式有几个特点：

1. **外层函数**接收操作符的配置（如 `project` 函数）
2. **返回的函数**接收 source Observable
3. **最内层**返回新的 Observable
4. **订阅 source** 并转换值后推送给 subscriber

## 函数式编程在 RxJS 中的体现

| 函数式概念 | RxJS 体现 |
|-----------|----------|
| 纯函数 | 操作符不修改原 Observable |
| 不可变性 | 每次操作返回新 Observable |
| 高阶函数 | 操作符接收/返回函数 |
| 函数组合 | pipe 方法串联操作符 |
| 柯里化 | 操作符分步接收参数 |

## 本章小结

本章我们学习了函数式编程的核心概念：

- **纯函数**：相同输入相同输出，无副作用
- **不可变性**：不修改数据，返回新数据
- **高阶函数**：函数作为参数或返回值
- **函数组合**：将多个函数串联成管道
- **柯里化**：多参数函数转为单参数函数链

这些概念是理解 RxJS 操作符设计的基础。在后续章节实现具体操作符时，我们会反复运用这些模式。

至此，第一部分"起步——响应式编程基础"完成。我们已经建立了必要的理论基础：响应式思想、Push/Pull 模型、观察者与迭代器模式、函数式编程。下一章开始，我们将进入 Observable 核心实现，真正开始编写代码。

---

**思考题**：

1. 为什么纯函数更容易测试？试着写出测试 `map` 操作符的测试用例。
2. 如果 `map` 操作符不是纯函数（会修改原 Observable），会导致什么问题？
3. 尝试用柯里化的方式实现一个 `filter` 操作符工厂。
