# never 类型与穷尽性检查

**思考一个问题**：如何确保你处理了联合类型的所有情况？

TypeScript 提供了一个强大的技巧：利用 `never` 类型进行**穷尽性检查（Exhaustive Check）**。

## never 类型是什么

`never` 表示**永远不会发生**的类型。

### never 的产生场景

**1. 抛出异常的函数**

```typescript
function throwError(message: string): never {
  throw new Error(message);
}
```

**2. 无限循环**

```typescript
function infiniteLoop(): never {
  while (true) {
    // 永远不会返回
  }
}
```

**3. 类型收窄后的不可能情况**

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // value: string
  } else if (typeof value === 'number') {
    // value: number
  } else {
    // value: never（不可能到达这里）
  }
}
```

### never 的特性

```typescript
// never 可以赋值给任何类型
const a: string = throwError('error');  // 合法，但永远不会执行
const b: number = throwError('error');  // 合法

// 任何类型都不能赋值给 never（除了 never 本身）
let n: never;
// n = 1;      // ❌ 错误
// n = 'a';    // ❌ 错误
// n = null;   // ❌ 错误
```

## 穷尽性检查

### 什么是穷尽性检查

穷尽性检查确保你处理了联合类型的**所有可能情况**。

```typescript
type Shape = 'circle' | 'square' | 'triangle';

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * 10 * 10;
    case 'square':
      return 10 * 10;
    case 'triangle':
      return (10 * 10) / 2;
    // 如果 Shape 新增了一个值，这里会漏掉
  }
}
```

**问题**：如果以后 `Shape` 新增了 `'rectangle'`，上面的函数不会报错，但会返回 `undefined`。

### 使用 never 实现穷尽性检查

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

type Shape = 'circle' | 'square' | 'triangle';

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * 10 * 10;
    case 'square':
      return 10 * 10;
    case 'triangle':
      return (10 * 10) / 2;
    default:
      return assertNever(shape);
      // 如果所有情况都处理了，shape 是 never
      // 如果漏了情况，shape 不是 never，编译报错
  }
}
```

**现在，如果新增类型**：

```typescript
type Shape = 'circle' | 'square' | 'triangle' | 'rectangle';

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * 10 * 10;
    case 'square':
      return 10 * 10;
    case 'triangle':
      return (10 * 10) / 2;
    default:
      return assertNever(shape);
      // ❌ 编译错误：'rectangle' 不能赋值给 never
  }
}
```

编译器会告诉你：你漏掉了 `'rectangle'`！

### 原理解释

在 switch 的每个 case 中，TypeScript 会从联合类型中排除已处理的类型：

```typescript
function getArea(shape: Shape): number {
  // shape: 'circle' | 'square' | 'triangle' | 'rectangle'
  
  switch (shape) {
    case 'circle':
      // shape: 'circle'
      return ...;
    case 'square':
      // shape: 'square'
      return ...;
    case 'triangle':
      // shape: 'triangle'
      return ...;
    default:
      // shape: 'rectangle'（还没处理的）
      return assertNever(shape); // 期望 never，实际是 'rectangle'，报错！
  }
}
```

## 实际应用

### 应用 1：Redux Action 处理

```typescript
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET'; payload: number };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    case 'DECREMENT':
      return state - 1;
    case 'RESET':
      return action.payload;
    default:
      return assertNever(action);
      // 确保处理了所有 action 类型
  }
}
```

### 应用 2：状态机

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

function render(state: State): string {
  switch (state.status) {
    case 'idle':
      return 'Ready';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data;
    case 'error':
      return state.error.message;
    default:
      return assertNever(state);
  }
}
```

### 应用 3：API 响应处理

```typescript
type ApiResponse =
  | { code: 200; data: User[] }
  | { code: 401; message: 'Unauthorized' }
  | { code: 404; message: 'Not Found' }
  | { code: 500; message: 'Server Error' };

function handleResponse(response: ApiResponse): string {
  switch (response.code) {
    case 200:
      return `Got ${response.data.length} users`;
    case 401:
      return 'Please login';
    case 404:
      return 'Resource not found';
    case 500:
      return 'Server error, try later';
    default:
      return assertNever(response);
  }
}
```

## 变体实现

### 方案 1：断言函数

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
```

### 方案 2：仅编译时检查（不抛异常）

```typescript
function exhaustiveCheck(value: never): never {
  return value;
}

// 使用
switch (action.type) {
  // ...cases
  default:
    exhaustiveCheck(action);
    // 编译时检查，但运行时不抛异常
}
```

### 方案 3：类型级别检查

```typescript
type AssertNever<T extends never> = T;

// 如果 T 不是 never，编译报错
```

## never 在类型操作中的作用

### 条件类型中的过滤

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | null | undefined>;
// Result = string
```

### 从联合类型中排除

```typescript
type Exclude<T, U> = T extends U ? never : T;

type Result = Exclude<'a' | 'b' | 'c', 'a'>;
// Result = 'b' | 'c'
```

### 空联合类型

```typescript
type Empty = never;

type Combined = string | never;
// Combined = string（never 被忽略）
```

## 最佳实践

### 1. 所有 switch 都加 default

```typescript
switch (value) {
  case 'a': return 1;
  case 'b': return 2;
  default: return assertNever(value);
}
```

### 2. 辨别式联合配合使用

```typescript
// 用 status/type/kind 等属性作为辨别器
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };
```

### 3. 更新类型时立即处理编译错误

```typescript
// 新增类型后，编译器会指出所有需要更新的地方
type Status = 'pending' | 'active' | 'completed' | 'archived'; // 新增 archived
// 所有 switch 语句都会报错，提醒你处理新状态
```

## 总结

**never 类型**：
- 表示永不发生的情况
- 是所有类型的子类型
- 用于函数永不返回的场景

**穷尽性检查**：
- 利用 `never` 确保处理所有联合类型成员
- 新增类型时编译器自动报错
- 是类型安全的重要保障

**实践模式**：
- 使用 `assertNever` 辅助函数
- 所有 switch 都加 default 分支
- 配合辨别式联合使用效果最佳

穷尽性检查是 TypeScript 最强大的特性之一，它让你的代码在类型变化时自动"提醒"你需要更新哪些地方。

至此，TypeScript 类型系统基础已经讲完。接下来我们将进入 SOLID 原则的学习——这些原则将指导我们如何设计可维护的代码。
