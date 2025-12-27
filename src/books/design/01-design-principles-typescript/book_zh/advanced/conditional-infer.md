# 条件类型与 infer

**infer** 是条件类型中用于**类型推断**的关键字。

它可以在条件类型的 extends 子句中声明一个待推断的类型变量。

## 基本语法

```typescript
// infer 声明一个类型变量 R
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 使用
type Fn = (x: string) => number;
type Result = ReturnType<Fn>;  // number
```

**工作原理**：
1. 检查 T 是否是函数类型
2. 如果是，推断返回类型并赋给 R
3. 返回 R

## 常见用法

### 1. 提取函数返回类型

```typescript
type ReturnType<T extends (...args: any[]) => any> = 
  T extends (...args: any[]) => infer R ? R : never;

type A = ReturnType<() => string>;           // string
type B = ReturnType<() => Promise<number>>; // Promise<number>
```

### 2. 提取函数参数类型

```typescript
type Parameters<T extends (...args: any[]) => any> = 
  T extends (...args: infer P) => any ? P : never;

type Fn = (name: string, age: number) => void;
type Params = Parameters<Fn>;  // [name: string, age: number]

// 获取第一个参数
type FirstArg<T extends (...args: any[]) => any> = 
  T extends (first: infer F, ...rest: any[]) => any ? F : never;

type First = FirstArg<Fn>;  // string
```

### 3. 提取数组元素类型

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type A = ArrayElement<string[]>;   // string
type B = ArrayElement<number[]>;   // number
type C = ArrayElement<[1, 2, 3]>;  // 1 | 2 | 3
```

### 4. 提取 Promise 值类型

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;

type A = Awaited<Promise<string>>;  // string
type B = Awaited<Promise<number>>; // number
type C = Awaited<string>;           // string（非 Promise 返回原类型）

// 递归版本（处理嵌套 Promise）
type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type D = DeepAwaited<Promise<Promise<string>>>;  // string
```

### 5. 提取构造函数参数

```typescript
type ConstructorParameters<T extends new (...args: any[]) => any> =
  T extends new (...args: infer P) => any ? P : never;

class User {
  constructor(public name: string, public age: number) {}
}

type Params = ConstructorParameters<typeof User>;  // [string, number]
```

### 6. 提取实例类型

```typescript
type InstanceType<T extends new (...args: any[]) => any> =
  T extends new (...args: any[]) => infer R ? R : never;

class User {
  name: string = '';
}

type Instance = InstanceType<typeof User>;  // User
```

## 多个 infer

可以在同一个条件类型中使用多个 infer：

```typescript
// 同时提取参数和返回类型
type FunctionParts<T> = T extends (...args: infer A) => infer R
  ? { args: A; return: R }
  : never;

type Fn = (x: string, y: number) => boolean;
type Parts = FunctionParts<Fn>;
// { args: [x: string, y: number]; return: boolean }
```

## infer 位置

infer 可以出现在不同位置：

```typescript
// 函数参数位置
type ParamType<T> = T extends (x: infer P) => any ? P : never;

// 函数返回位置
type ReturnType<T> = T extends () => infer R ? R : never;

// 数组元素位置
type ElementType<T> = T extends (infer E)[] ? E : never;

// 对象属性位置
type PropType<T, K extends keyof T> = T extends { [key in K]: infer V } ? V : never;

// 元组位置
type First<T> = T extends [infer F, ...any[]] ? F : never;
type Last<T> = T extends [...any[], infer L] ? L : never;
```

## 实战示例

### 事件处理器类型提取

```typescript
type EventHandler<T> = (event: T) => void;

// 提取事件类型
type EventType<T> = T extends EventHandler<infer E> ? E : never;

type ClickHandler = EventHandler<MouseEvent>;
type Event = EventType<ClickHandler>;  // MouseEvent
```

### 提取对象方法的参数

```typescript
type MethodParams<T, K extends keyof T> = 
  T[K] extends (...args: infer P) => any ? P : never;

interface API {
  getUser(id: string): User;
  createUser(name: string, age: number): User;
}

type GetUserParams = MethodParams<API, 'getUser'>;     // [id: string]
type CreateUserParams = MethodParams<API, 'createUser'>; // [name: string, age: number]
```

### 提取泛型参数

```typescript
type UnwrapArray<T> = T extends Array<infer U> ? U : T;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type UnwrapFunction<T> = T extends () => infer U ? U : T;

// 组合使用
type Unwrap<T> = 
  T extends Promise<infer U> ? U :
  T extends Array<infer U> ? U :
  T extends () => infer U ? U :
  T;

type A = Unwrap<Promise<string>>;  // string
type B = Unwrap<number[]>;          // number
type C = Unwrap<() => boolean>;     // boolean
```

## infer 的约束

TypeScript 4.7+ 支持 infer 约束：

```typescript
// 约束推断的类型
type FirstString<T> = T extends [infer S extends string, ...any[]] 
  ? S 
  : never;

type A = FirstString<['hello', 1, 2]>;  // 'hello'
type B = FirstString<[1, 2, 3]>;         // never
```

## 总结

**infer 的作用**：在条件类型中声明待推断的类型变量。

**常见提取**：
- `ReturnType`：函数返回类型
- `Parameters`：函数参数类型
- `Awaited`：Promise 值类型
- `InstanceType`：类实例类型

**使用技巧**：
- infer 只能在 extends 子句中使用
- 可以同时使用多个 infer
- 可以出现在不同位置（参数、返回值、数组元素等）

**记住**：infer 是类型体操的核心工具，用于从复杂类型中"挖"出你需要的部分。
