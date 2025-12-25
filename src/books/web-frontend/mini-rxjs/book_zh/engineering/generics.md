---
sidebar_position: 101
title: "泛型在 RxJS 中的应用"
---

# 泛型在 RxJS 中的应用

本章深入探讨 RxJS 中的泛型设计。

## 基础泛型应用

### Observable 的泛型

```typescript
// T 表示 Observable 发出的值类型
class Observable<T> {
  subscribe(observer: Observer<T>): Subscription
}

// 使用
const numbers$: Observable<number> = of(1, 2, 3)
const strings$: Observable<string> = of('a', 'b', 'c')
```

### 操作符的泛型

```typescript
// map: T 输入，R 输出
function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R> {
  return (source: Observable<T>) => new Observable<R>(subscriber => {
    return source.subscribe({
      next(value) {
        subscriber.next(project(value))
      },
      error(err) { subscriber.error(err) },
      complete() { subscriber.complete() }
    })
  })
}

// 类型自动推断
of(1, 2, 3).pipe(
  map(x => x.toString())  // Observable<string>
)
```

## 类型推断

### 链式推断

```typescript
// TypeScript 自动推断每一步的类型
of(1, 2, 3)                    // Observable<number>
  .pipe(
    map(x => x * 2),           // Observable<number>
    filter(x => x > 2),        // Observable<number>
    map(x => x.toString()),    // Observable<string>
    map(x => x.length)         // Observable<number>
  )
```

### 泛型约束

```typescript
// 约束 T 必须有 id 属性
function findById<T extends { id: number }>(
  id: number
): OperatorFunction<T[], T | undefined> {
  return map(items => items.find(item => item.id === id))
}

// 使用
interface User {
  id: number
  name: string
}

of([{ id: 1, name: 'Alice' }]).pipe(
  findById(1)  // Observable<User | undefined>
)
```

## 类型守卫与 filter

### 普通 filter

```typescript
// 不改变类型
function filter<T>(
  predicate: (value: T, index: number) => boolean
): MonoTypeOperatorFunction<T>

of(1, 2, null, 3).pipe(
  filter(x => x !== null)  // 仍然是 Observable<number | null>
)
```

### 带类型守卫的 filter

```typescript
// 类型收窄
function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): OperatorFunction<T, S>

// 定义类型守卫
function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

of(1, 2, null, 3).pipe(
  filter(isNotNull)  // Observable<number>
)
```

## 条件类型

### 根据输入推断输出

```typescript
// 根据输入类型返回不同类型
type MapToType<T> = T extends number 
  ? string 
  : T extends string 
    ? number 
    : never

function smartMap<T>(value: T): MapToType<T> {
  if (typeof value === 'number') {
    return value.toString() as MapToType<T>
  }
  if (typeof value === 'string') {
    return parseInt(value, 10) as MapToType<T>
  }
  throw new Error('Unsupported type')
}
```

### infer 提取类型

```typescript
// 提取 Observable 内部类型
type ObservedValue<O> = O extends Observable<infer T> ? T : never

type A = ObservedValue<Observable<string>>  // string
type B = ObservedValue<Observable<number>>  // number

// 提取操作符输出类型
type OperatorOutput<T> = T extends OperatorFunction<any, infer R> ? R : never
```

## 元组类型

### combineLatest 类型

```typescript
// 重载实现精确类型
function combineLatest<T1>(
  sources: [Observable<T1>]
): Observable<[T1]>

function combineLatest<T1, T2>(
  sources: [Observable<T1>, Observable<T2>]
): Observable<[T1, T2]>

function combineLatest<T1, T2, T3>(
  sources: [Observable<T1>, Observable<T2>, Observable<T3>]
): Observable<[T1, T2, T3]>

// 使用
const result$ = combineLatest([
  of(1),
  of('hello'),
  of(true)
])  // Observable<[number, string, boolean]>
```

### 使用可变元组

```typescript
// TypeScript 4.0+ 可变元组
type ObservedValueTuple<T> = {
  [K in keyof T]: T[K] extends Observable<infer V> ? V : never
}

function combineLatest<T extends Observable<any>[]>(
  sources: [...T]
): Observable<ObservedValueTuple<T>>

const result$ = combineLatest([
  of(1),
  of('hello'),
  of(true)
])  // Observable<[number, string, boolean]>
```

## 映射类型

### forkJoin 对象类型

```typescript
type ObservableRecord = Record<string, Observable<any>>

type ForkJoinResult<T extends ObservableRecord> = {
  [K in keyof T]: T[K] extends Observable<infer V> ? V : never
}

function forkJoin<T extends ObservableRecord>(
  sources: T
): Observable<ForkJoinResult<T>>

// 使用
const result$ = forkJoin({
  user: of({ id: 1, name: 'Alice' }),
  posts: of([{ id: 1, title: 'Hello' }])
})
// Observable<{ user: { id: number, name: string }, posts: { id: number, title: string }[] }>
```

## 递归类型

### 嵌套 Observable 类型

```typescript
// 展开嵌套 Observable
type UnwrapObservable<T> = T extends Observable<infer U>
  ? UnwrapObservable<U>
  : T

type A = UnwrapObservable<Observable<Observable<Observable<number>>>>  // number
```

### 深度扁平化类型

```typescript
type DeepObservableInput<T> = 
  | Observable<T>
  | Observable<Observable<T>>
  | Observable<Observable<Observable<T>>>
  | Promise<T>
  | T[]

// 递归展开
type DeepUnwrap<T> = T extends Observable<infer U>
  ? DeepUnwrap<U>
  : T extends Promise<infer U>
    ? DeepUnwrap<U>
    : T extends (infer U)[]
      ? U
      : T
```

## 实际应用

### 类型安全的操作符链

```typescript
class TypedObservable<T> {
  pipe(): Observable<T>
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>
  // ... 更多重载
}

// 类型错误会被捕获
of(1, 2, 3).pipe(
  map(x => x.toString()),
  map(x => x * 2)  // 错误：string 不能乘以 number
)
```

### 泛型服务

```typescript
class DataService {
  get<T>(url: string): Observable<T> {
    return from(fetch(url).then(r => r.json() as T))
  }
  
  post<T, R>(url: string, body: T): Observable<R> {
    return from(
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(body)
      }).then(r => r.json() as R)
    )
  }
}

// 使用
interface User { id: number; name: string }

const user$ = dataService.get<User>('/api/user/1')  // Observable<User>
```

## 本章小结

- 泛型让 Observable 类型安全
- 类型守卫配合 filter 实现类型收窄
- 条件类型和 infer 提取嵌套类型
- 元组类型处理 combineLatest 等
- 映射类型处理对象形式的 forkJoin
- 良好的类型设计提升开发体验

下一章学习单元测试策略。
