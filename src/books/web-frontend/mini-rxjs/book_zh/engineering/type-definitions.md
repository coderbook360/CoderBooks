---
sidebar_position: 100
title: "完整 TypeScript 类型定义"
---

# 完整 TypeScript 类型定义

本章介绍 Mini RxJS 的 TypeScript 类型系统设计。

## 核心类型

### Observer 类型

```typescript
interface Observer<T> {
  next: (value: T) => void
  error: (err: any) => void
  complete: () => void
}

type PartialObserver<T> = Partial<Observer<T>>

// 订阅参数类型
type ObserverOrNext<T> = 
  | PartialObserver<T>
  | ((value: T) => void)
```

### Observable 类型

```typescript
type TeardownLogic = Subscription | (() => void) | void

type SubscribeFunction<T> = (subscriber: Subscriber<T>) => TeardownLogic

class Observable<T> {
  constructor(subscribe?: SubscribeFunction<T>)
  
  subscribe(observer?: PartialObserver<T>): Subscription
  subscribe(
    next?: (value: T) => void,
    error?: (err: any) => void,
    complete?: () => void
  ): Subscription
  
  pipe(): Observable<T>
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>
  ): Observable<C>
  // ... 更多重载
}
```

### Subscription 类型

```typescript
interface SubscriptionLike {
  unsubscribe(): void
  readonly closed: boolean
}

class Subscription implements SubscriptionLike {
  closed: boolean
  
  constructor(teardown?: TeardownLogic)
  
  unsubscribe(): void
  add(teardown: TeardownLogic): void
  remove(subscription: Subscription): void
}
```

## 操作符类型

### 基础操作符函数类型

```typescript
// 一元函数
type UnaryFunction<T, R> = (source: T) => R

// 操作符函数
type OperatorFunction<T, R> = UnaryFunction<Observable<T>, Observable<R>>

// 单类型操作符
type MonoTypeOperatorFunction<T> = OperatorFunction<T, T>
```

### 常用操作符类型

```typescript
// map
declare function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R>

// filter
declare function filter<T>(
  predicate: (value: T, index: number) => boolean
): MonoTypeOperatorFunction<T>

// filter with type guard
declare function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): OperatorFunction<T, S>

// switchMap
declare function switchMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>

// mergeMap
declare function mergeMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent?: number
): OperatorFunction<T, R>
```

## ObservableInput 类型

```typescript
type ObservableInput<T> = 
  | Observable<T>
  | InteropObservable<T>
  | AsyncIterable<T>
  | PromiseLike<T>
  | ArrayLike<T>
  | Iterable<T>
  | ReadableStreamLike<T>

interface InteropObservable<T> {
  [Symbol.observable]: () => Subscribable<T>
}

interface Subscribable<T> {
  subscribe(observer: Partial<Observer<T>>): Unsubscribable
}

interface Unsubscribable {
  unsubscribe(): void
}
```

## Subject 类型

```typescript
class Subject<T> extends Observable<T> implements Observer<T> {
  observers: Observer<T>[]
  closed: boolean
  isStopped: boolean
  hasError: boolean
  thrownError: any
  
  next(value: T): void
  error(err: any): void
  complete(): void
  
  asObservable(): Observable<T>
}

class BehaviorSubject<T> extends Subject<T> {
  constructor(initialValue: T)
  
  get value(): T
  getValue(): T
}

class ReplaySubject<T> extends Subject<T> {
  constructor(bufferSize?: number, windowTime?: number)
}

class AsyncSubject<T> extends Subject<T> {}
```

## 创建函数类型

```typescript
declare function of<T>(...values: T[]): Observable<T>

declare function from<T>(input: ObservableInput<T>): Observable<T>

declare function fromEvent<T>(
  target: EventTarget | EventEmitter,
  eventName: string
): Observable<T>

declare function interval(period: number): Observable<number>

declare function timer(
  dueTime: number | Date,
  period?: number
): Observable<number>

declare function merge<T>(...sources: Observable<T>[]): Observable<T>

declare function combineLatest<T>(
  sources: Observable<T>[]
): Observable<T[]>

declare function combineLatest<T1, T2>(
  sources: [Observable<T1>, Observable<T2>]
): Observable<[T1, T2]>

declare function forkJoin<T>(
  sources: Observable<T>[]
): Observable<T[]>

declare function forkJoin<T extends Record<string, Observable<any>>>(
  sources: T
): Observable<{ [K in keyof T]: ObservedValueOf<T[K]> }>
```

## 工具类型

```typescript
// 获取 Observable 的值类型
type ObservedValueOf<O> = O extends Observable<infer T> ? T : never

// 获取操作符输入类型
type OperatorInput<T> = T extends OperatorFunction<infer I, any> ? I : never

// 获取操作符输出类型
type OperatorOutput<T> = T extends OperatorFunction<any, infer O> ? O : never

// 元组转联合类型
type TupleToUnion<T extends any[]> = T[number]

// 判断是否为 Observable
type IsObservable<T> = T extends Observable<any> ? true : false
```

## Scheduler 类型

```typescript
interface SchedulerLike {
  now(): number
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}

interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription
}

declare const asyncScheduler: SchedulerLike
declare const asapScheduler: SchedulerLike
declare const queueScheduler: SchedulerLike
declare const animationFrameScheduler: SchedulerLike
```

## 条件类型

```typescript
// 根据操作符参数推断返回类型
type MapResult<T, R> = R extends undefined 
  ? Observable<T> 
  : Observable<R>

// 带条件的 filter 返回类型
type FilterResult<T, S> = S extends T 
  ? Observable<S> 
  : Observable<T>

// 组合多个 Observable 类型
type CombineLatestResult<T extends Observable<any>[]> = 
  Observable<{ [K in keyof T]: ObservedValueOf<T[K]> }>
```

## 类型守卫

```typescript
function isObservable<T>(obj: any): obj is Observable<T> {
  return obj instanceof Observable || 
    (obj && typeof obj.subscribe === 'function')
}

function isSubscription(obj: any): obj is Subscription {
  return obj instanceof Subscription ||
    (obj && typeof obj.unsubscribe === 'function')
}

function isObserver<T>(obj: any): obj is Observer<T> {
  return obj && typeof obj.next === 'function'
}
```

## 本章小结

- Observer 和 Observable 是核心类型
- 操作符使用泛型保持类型安全
- ObservableInput 支持多种输入类型
- 工具类型简化复杂类型操作
- 类型守卫提供运行时检查

下一章学习泛型的高级应用。
