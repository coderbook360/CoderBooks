# 条件类型基础

**条件类型（Conditional Types）** 是 TypeScript 类型系统中的 if-else。

语法：`T extends U ? X : Y`

如果 T 可以赋值给 U，结果是 X，否则是 Y。

## 基本语法

```typescript
// 基本形式
type IsString<T> = T extends string ? true : false;

// 使用
type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<'hello'>;  // true（字面量是 string 的子类型）
```

## 实际应用

### 1. 类型提取

```typescript
// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : T;

type A = ElementType<string[]>;   // string
type B = ElementType<number[]>;   // number
type C = ElementType<string>;     // string（不是数组，返回原类型）
```

### 2. 条件返回类型

```typescript
// 根据输入类型返回不同结果
type IdType<T> = T extends string
  ? string
  : T extends number
  ? number
  : never;

function processId<T extends string | number>(id: T): IdType<T> {
  if (typeof id === 'string') {
    return id.toUpperCase() as IdType<T>;
  }
  return (id * 2) as IdType<T>;
}

const a = processId('abc');  // string
const b = processId(123);    // number
```

### 3. 类型过滤

```typescript
// 过滤联合类型中的特定类型
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null | undefined>;  // string
type B = NonNullable<number | null>;              // number
```

### 4. 函数类型处理

```typescript
// 提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

type Fn = (a: string, b: number) => void;
type Params = Parameters<Fn>;  // [a: string, b: number]

// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Result = ReturnType<Fn>;  // void
```

## extends 关键字

在条件类型中，`extends` 表示**子类型关系**：

```typescript
// T extends U：T 是否是 U 的子类型

// 字面量 extends 基础类型
type A = 'hello' extends string ? true : false;  // true

// 子接口 extends 父接口
interface Animal { name: string; }
interface Dog extends Animal { breed: string; }

type B = Dog extends Animal ? true : false;  // true

// 联合类型
type C = 'a' extends 'a' | 'b' ? true : false;  // true
type D = 'a' | 'b' extends 'a' ? true : false;  // false
```

## 嵌套条件类型

```typescript
// 多层条件判断
type TypeName<T> =
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends undefined ? 'undefined' :
  T extends Function ? 'function' :
  'object';

type A = TypeName<string>;        // 'string'
type B = TypeName<() => void>;    // 'function'
type C = TypeName<{ x: number }>; // 'object'
```

## 条件类型与泛型

```typescript
// 泛型约束
type MessageOf<T> = T extends { message: unknown }
  ? T['message']
  : never;

interface Email {
  message: string;
}

interface Dog {
  bark(): void;
}

type EmailMessage = MessageOf<Email>;  // string
type DogMessage = MessageOf<Dog>;      // never
```

## 常见的内置条件类型

TypeScript 内置了很多基于条件类型的工具类型：

```typescript
// Exclude：从 T 中排除 U
type Exclude<T, U> = T extends U ? never : T;
type A = Exclude<'a' | 'b' | 'c', 'a'>;  // 'b' | 'c'

// Extract：从 T 中提取 U
type Extract<T, U> = T extends U ? T : never;
type B = Extract<'a' | 'b' | 'c', 'a' | 'd'>;  // 'a'

// NonNullable：排除 null 和 undefined
type NonNullable<T> = T extends null | undefined ? never : T;
type C = NonNullable<string | null>;  // string
```

## 实战示例

### API 响应处理

```typescript
// 根据状态返回不同类型
type ApiResponse<T, S extends 'success' | 'error'> =
  S extends 'success'
    ? { status: S; data: T }
    : { status: S; error: string };

function handleResponse<T>(
  response: ApiResponse<T, 'success'> | ApiResponse<T, 'error'>
): T | null {
  if (response.status === 'success') {
    return response.data;
  }
  console.error(response.error);
  return null;
}
```

### 事件处理

```typescript
// 根据事件类型推断参数
interface EventMap {
  click: { x: number; y: number };
  change: { value: string };
  submit: { data: FormData };
}

type EventHandler<T extends keyof EventMap> = 
  (event: EventMap[T]) => void;

const handleClick: EventHandler<'click'> = (e) => {
  console.log(e.x, e.y);  // 类型安全
};
```

## 总结

**条件类型语法**：`T extends U ? X : Y`

**核心用途**：
- 类型提取（从复杂类型中提取部分）
- 类型过滤（排除不需要的类型）
- 条件返回（根据输入类型决定输出类型）

**关键点**：
- `extends` 检查子类型关系
- 可以嵌套使用
- 与泛型结合更强大

**记住**：条件类型让类型系统具备了逻辑判断能力。
