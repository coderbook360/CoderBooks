# 分布式条件类型

当条件类型作用于**裸类型参数**的联合类型时，会**自动分发**到联合的每个成员。

这就是**分布式条件类型（Distributive Conditional Types）**。

## 分发机制

```typescript
// 定义条件类型
type ToArray<T> = T extends any ? T[] : never;

// 传入联合类型
type A = ToArray<string | number>;

// 分发过程：
// ToArray<string | number>
// = ToArray<string> | ToArray<number>  // 自动分发
// = string[] | number[]
```

## 什么是"裸类型参数"

**裸类型参数**：直接使用的类型参数，没有被包装。

```typescript
// 裸类型参数：T 直接出现
type Naked<T> = T extends any ? T[] : never;

// 非裸类型参数：T 被包装在其他类型中
type Wrapped<T> = [T] extends [any] ? T[] : never;
```

## 分发 vs 非分发

```typescript
// 分发：T 是裸类型参数
type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>;  // string[] | number[]

// 非分发：T 被包装
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type B = ToArrayNonDist<string | number>;  // (string | number)[]
```

关键区别：
- 分发：每个成员独立处理 → `string[] | number[]`
- 非分发：整体处理 → `(string | number)[]`

## 实际应用

### 1. Exclude 类型

从联合类型中排除特定类型：

```typescript
type Exclude<T, U> = T extends U ? never : T;

type A = Exclude<'a' | 'b' | 'c', 'a'>;
// 分发过程：
// = Exclude<'a', 'a'> | Exclude<'b', 'a'> | Exclude<'c', 'a'>
// = never | 'b' | 'c'
// = 'b' | 'c'
```

### 2. Extract 类型

从联合类型中提取特定类型：

```typescript
type Extract<T, U> = T extends U ? T : never;

type A = Extract<'a' | 'b' | 'c', 'a' | 'd'>;
// 分发过程：
// = Extract<'a', 'a' | 'd'> | Extract<'b', 'a' | 'd'> | Extract<'c', 'a' | 'd'>
// = 'a' | never | never
// = 'a'
```

### 3. NonNullable 类型

排除 null 和 undefined：

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null | undefined>;
// 分发过程：
// = NonNullable<string> | NonNullable<null> | NonNullable<undefined>
// = string | never | never
// = string
```

### 4. 类型过滤

过滤联合类型中的特定类型：

```typescript
// 只保留函数类型
type FunctionsOnly<T> = T extends (...args: any[]) => any ? T : never;

type Mixed = string | number | (() => void) | ((x: number) => string);
type Fns = FunctionsOnly<Mixed>;  // (() => void) | ((x: number) => string)
```

## 阻止分发

有时你不希望分发，可以用包装阻止：

```typescript
// 分发行为
type IsString<T> = T extends string ? true : false;
type A = IsString<string | number>;  // true | false = boolean

// 阻止分发
type IsStringNonDist<T> = [T] extends [string] ? true : false;
type B = IsStringNonDist<string | number>;  // false（整体不是 string）
```

### 实际场景

```typescript
// 判断类型是否是联合类型
type IsUnion<T, U = T> = T extends any
  ? [U] extends [T] ? false : true
  : never;

type A = IsUnion<string>;           // false
type B = IsUnion<string | number>;  // true

// 原理：
// IsUnion<string | number>
// 分发：IsUnion<string, string | number> | IsUnion<number, string | number>
// = ([string | number] extends [string] ? false : true) | ...
// = true | true
// = true
```

## never 与分发

`never` 是空联合类型，分发时会直接返回 `never`：

```typescript
type ToArray<T> = T extends any ? T[] : never;

type A = ToArray<never>;  // never

// 因为 never 是空联合，没有成员可以分发
```

阻止方法：

```typescript
type ToArraySafe<T> = [T] extends [never] 
  ? never 
  : T extends any ? T[] : never;
```

## 分发与泛型约束

```typescript
// 有约束的分发
type NumberProps<T> = T extends object 
  ? { [K in keyof T]: T[K] extends number ? K : never }[keyof T]
  : never;

interface User {
  id: number;
  name: string;
  age: number;
}

type NumKeys = NumberProps<User>;  // 'id' | 'age'
```

## 实战示例

### 类型安全的事件处理

```typescript
type EventMap = {
  click: { x: number; y: number };
  change: { value: string };
  submit: { data: FormData };
};

// 提取包含特定属性的事件
type EventsWithProperty<K extends string> = {
  [E in keyof EventMap]: EventMap[E] extends { [key in K]: any } ? E : never
}[keyof EventMap];

type HasValue = EventsWithProperty<'value'>;  // 'change'
type HasData = EventsWithProperty<'data'>;    // 'submit'
```

### 函数类型过滤

```typescript
interface API {
  getUser: (id: string) => User;
  setUser: (user: User) => void;
  version: string;
  config: { debug: boolean };
}

// 只提取方法名
type Methods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T];

type APIMethods = Methods<API>;  // 'getUser' | 'setUser'
```

## 总结

**分布式条件类型**：条件类型作用于裸类型参数的联合时，会自动分发。

**分发条件**：
- 类型参数必须是"裸"的（不被包装）
- 必须是泛型条件类型

**阻止分发**：用 `[T] extends [U]` 包装类型参数。

**常见应用**：
- `Exclude<T, U>`：排除类型
- `Extract<T, U>`：提取类型
- `NonNullable<T>`：排除空值
- 类型过滤

**记住**：分发是自动行为，理解它有助于正确使用条件类型。
