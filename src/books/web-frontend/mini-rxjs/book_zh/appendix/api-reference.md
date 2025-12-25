---
sidebar_position: 105
title: "API 速查"
---

# API 速查

本章提供 Mini RxJS 的完整 API 参考。

## Observable

### 构造函数

```typescript
new Observable<T>(subscribe: (subscriber: Subscriber<T>) => TeardownLogic)
```

### 实例方法

```typescript
// 订阅
subscribe(observer?: Partial<Observer<T>>): Subscription
subscribe(next?: (value: T) => void, error?: (err: any) => void, complete?: () => void): Subscription

// 管道
pipe<R>(...operations: OperatorFunction<any, any>[]): Observable<R>
```

## 创建函数

### of

```typescript
of<T>(...values: T[]): Observable<T>
```

同步发出指定的值，然后完成。

### from

```typescript
from<T>(input: ObservableInput<T>): Observable<T>
```

将数组、Promise、Iterable 或 Observable 转换为 Observable。

### fromEvent

```typescript
fromEvent<T>(target: EventTarget, eventName: string): Observable<T>
```

从 DOM 事件创建 Observable。

### interval

```typescript
interval(period: number): Observable<number>
```

每隔指定毫秒发出递增数字。

### timer

```typescript
timer(dueTime: number, period?: number): Observable<number>
```

延迟后发出，可选持续发出。

### defer

```typescript
defer<T>(factory: () => ObservableInput<T>): Observable<T>
```

延迟创建 Observable 直到订阅。

### range

```typescript
range(start: number, count: number): Observable<number>
```

发出指定范围的数字序列。

### merge

```typescript
merge<T>(...sources: Observable<T>[]): Observable<T>
```

合并多个 Observable，并行发出。

### concat

```typescript
concat<T>(...sources: Observable<T>[]): Observable<T>
```

顺序连接多个 Observable。

### combineLatest

```typescript
combineLatest<T>(sources: Observable<T>[]): Observable<T[]>
```

组合多个 Observable 的最新值。

### forkJoin

```typescript
forkJoin<T>(sources: Observable<T>[]): Observable<T[]>
```

等待所有 Observable 完成，发出最后值。

### race

```typescript
race<T>(...sources: Observable<T>[]): Observable<T>
```

使用最先发出值的 Observable。

### zip

```typescript
zip<T>(sources: Observable<T>[]): Observable<T[]>
```

配对组合多个 Observable 的值。

## 转换操作符

### map

```typescript
map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R>
```

### pluck

```typescript
pluck<T, R>(...properties: string[]): OperatorFunction<T, R>
```

### mapTo

```typescript
mapTo<T, R>(value: R): OperatorFunction<T, R>
```

### scan

```typescript
scan<T, R>(accumulator: (acc: R, value: T, index: number) => R, seed?: R): OperatorFunction<T, R>
```

### reduce

```typescript
reduce<T, R>(accumulator: (acc: R, value: T, index: number) => R, seed?: R): OperatorFunction<T, R>
```

### buffer

```typescript
buffer<T>(closingNotifier: Observable<any>): OperatorFunction<T, T[]>
```

### bufferCount

```typescript
bufferCount<T>(bufferSize: number, startBufferEvery?: number): OperatorFunction<T, T[]>
```

### bufferTime

```typescript
bufferTime<T>(bufferTimeSpan: number): OperatorFunction<T, T[]>
```

### toArray

```typescript
toArray<T>(): OperatorFunction<T, T[]>
```

### pairwise

```typescript
pairwise<T>(): OperatorFunction<T, [T, T]>
```

### groupBy

```typescript
groupBy<T, K>(keySelector: (value: T) => K): OperatorFunction<T, GroupedObservable<K, T>>
```

### partition

```typescript
partition<T>(predicate: (value: T, index: number) => boolean): [Observable<T>, Observable<T>]
```

## 过滤操作符

### filter

```typescript
filter<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T>
```

### take

```typescript
take<T>(count: number): OperatorFunction<T, T>
```

### takeUntil

```typescript
takeUntil<T>(notifier: Observable<any>): OperatorFunction<T, T>
```

### takeWhile

```typescript
takeWhile<T>(predicate: (value: T, index: number) => boolean, inclusive?: boolean): OperatorFunction<T, T>
```

### takeLast

```typescript
takeLast<T>(count: number): OperatorFunction<T, T>
```

### skip

```typescript
skip<T>(count: number): OperatorFunction<T, T>
```

### skipUntil

```typescript
skipUntil<T>(notifier: Observable<any>): OperatorFunction<T, T>
```

### skipWhile

```typescript
skipWhile<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T>
```

### first

```typescript
first<T>(predicate?: (value: T, index: number) => boolean, defaultValue?: T): OperatorFunction<T, T>
```

### last

```typescript
last<T>(predicate?: (value: T, index: number) => boolean, defaultValue?: T): OperatorFunction<T, T>
```

### single

```typescript
single<T>(predicate?: (value: T, index: number) => boolean): OperatorFunction<T, T>
```

### find

```typescript
find<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T | undefined>
```

### findIndex

```typescript
findIndex<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, number>
```

### elementAt

```typescript
elementAt<T>(index: number, defaultValue?: T): OperatorFunction<T, T>
```

### distinct

```typescript
distinct<T, K>(keySelector?: (value: T) => K): OperatorFunction<T, T>
```

### distinctUntilChanged

```typescript
distinctUntilChanged<T>(comparator?: (previous: T, current: T) => boolean): OperatorFunction<T, T>
```

### distinctUntilKeyChanged

```typescript
distinctUntilKeyChanged<T, K extends keyof T>(key: K): OperatorFunction<T, T>
```

### debounceTime

```typescript
debounceTime<T>(dueTime: number): OperatorFunction<T, T>
```

### debounce

```typescript
debounce<T>(durationSelector: (value: T) => Observable<any>): OperatorFunction<T, T>
```

### throttleTime

```typescript
throttleTime<T>(duration: number, config?: ThrottleConfig): OperatorFunction<T, T>
```

### throttle

```typescript
throttle<T>(durationSelector: (value: T) => Observable<any>): OperatorFunction<T, T>
```

### auditTime

```typescript
auditTime<T>(duration: number): OperatorFunction<T, T>
```

### sampleTime

```typescript
sampleTime<T>(period: number): OperatorFunction<T, T>
```

### sample

```typescript
sample<T>(notifier: Observable<any>): OperatorFunction<T, T>
```

## 组合操作符

### mergeMap / flatMap

```typescript
mergeMap<T, R>(project: (value: T, index: number) => ObservableInput<R>, concurrent?: number): OperatorFunction<T, R>
```

### switchMap

```typescript
switchMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>
```

### concatMap

```typescript
concatMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>
```

### exhaustMap

```typescript
exhaustMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>
```

### withLatestFrom

```typescript
withLatestFrom<T, R>(...sources: Observable<any>[]): OperatorFunction<T, [T, ...any[]]>
```

### combineLatestWith

```typescript
combineLatestWith<T, R>(...sources: Observable<R>[]): OperatorFunction<T, [T, ...R[]]>
```

### mergeWith

```typescript
mergeWith<T>(...sources: Observable<T>[]): OperatorFunction<T, T>
```

### concatWith

```typescript
concatWith<T>(...sources: Observable<T>[]): OperatorFunction<T, T>
```

### startWith

```typescript
startWith<T>(...values: T[]): OperatorFunction<T, T>
```

### endWith

```typescript
endWith<T>(...values: T[]): OperatorFunction<T, T>
```

## 错误处理操作符

### catchError

```typescript
catchError<T, R>(selector: (err: any, caught: Observable<T>) => ObservableInput<R>): OperatorFunction<T, T | R>
```

### retry

```typescript
retry<T>(count?: number): OperatorFunction<T, T>
```

### retryWhen

```typescript
retryWhen<T>(notifier: (errors: Observable<any>) => Observable<any>): OperatorFunction<T, T>
```

### throwIfEmpty

```typescript
throwIfEmpty<T>(errorFactory?: () => any): OperatorFunction<T, T>
```

## 工具操作符

### tap

```typescript
tap<T>(observer: Partial<Observer<T>>): OperatorFunction<T, T>
tap<T>(next: (value: T) => void): OperatorFunction<T, T>
```

### delay

```typescript
delay<T>(due: number): OperatorFunction<T, T>
```

### delayWhen

```typescript
delayWhen<T>(delayDurationSelector: (value: T) => Observable<any>): OperatorFunction<T, T>
```

### timeout

```typescript
timeout<T>(due: number): OperatorFunction<T, T>
```

### timeoutWith

```typescript
timeoutWith<T, R>(due: number, withObservable: Observable<R>): OperatorFunction<T, T | R>
```

### finalize

```typescript
finalize<T>(callback: () => void): OperatorFunction<T, T>
```

### share

```typescript
share<T>(): OperatorFunction<T, T>
```

### shareReplay

```typescript
shareReplay<T>(bufferSize?: number): OperatorFunction<T, T>
```

### observeOn

```typescript
observeOn<T>(scheduler: Scheduler): OperatorFunction<T, T>
```

### subscribeOn

```typescript
subscribeOn<T>(scheduler: Scheduler): OperatorFunction<T, T>
```

## Subject 类型

### Subject

```typescript
class Subject<T> extends Observable<T> implements Observer<T> {
  next(value: T): void
  error(err: any): void
  complete(): void
  subscribe(observer?: Partial<Observer<T>>): Subscription
}
```

### BehaviorSubject

```typescript
class BehaviorSubject<T> extends Subject<T> {
  constructor(initialValue: T)
  getValue(): T
}
```

### ReplaySubject

```typescript
class ReplaySubject<T> extends Subject<T> {
  constructor(bufferSize?: number, windowTime?: number)
}
```

### AsyncSubject

```typescript
class AsyncSubject<T> extends Subject<T> {
  // 只在 complete 时发出最后一个值
}
```

## Scheduler 类型

### 内置调度器

```typescript
import { 
  asyncScheduler,
  asapScheduler,
  queueScheduler,
  animationFrameScheduler
} from 'rxjs'
```

### Scheduler 接口

```typescript
interface Scheduler {
  now(): number
  schedule<T>(work: (state?: T) => void, delay?: number, state?: T): Subscription
}
```

## 辅助函数

### firstValueFrom

```typescript
firstValueFrom<T>(source: Observable<T>, config?: { defaultValue: T }): Promise<T>
```

### lastValueFrom

```typescript
lastValueFrom<T>(source: Observable<T>, config?: { defaultValue: T }): Promise<T>
```

### pipe

```typescript
pipe<T>(...fns: UnaryFunction<any, any>[]): UnaryFunction<T, any>
```

### identity

```typescript
identity<T>(x: T): T
```

### noop

```typescript
noop(): void
```

## 类型定义

```typescript
type Observer<T> = {
  next: (value: T) => void
  error: (err: any) => void
  complete: () => void
}

type Subscription = {
  unsubscribe(): void
  closed: boolean
  add(teardown: TeardownLogic): void
}

type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>

type ObservableInput<T> = 
  | Observable<T>
  | Promise<T>
  | ArrayLike<T>
  | Iterable<T>

type TeardownLogic = Subscription | (() => void) | void
```

## 本书完结

恭喜你完成了 Mini RxJS 的学习！

你已经掌握了：
- Observable 核心概念和实现
- 各类操作符的使用和原理
- Subject 和多播模式
- 调度器和测试技术
- 实战应用模式
- 工程化最佳实践

继续实践，成为响应式编程专家！
