# 类型守卫

当我们有一个联合类型时，如何安全地使用特定类型的操作？

答案是**类型守卫（Type Guards）**——在运行时检查类型，让 TypeScript 收窄类型。

## 为什么需要类型守卫

```typescript
function process(value: string | number) {
  // 此时 value 是 string | number
  // 不能直接调用 string 或 number 特有的方法
  
  if (typeof value === 'string') {
    // TypeScript 知道这里 value 是 string
    return value.toUpperCase();
  }
  
  // TypeScript 知道这里 value 是 number
  return value.toFixed(2);
}
```

类型守卫让编译器理解：**经过某个条件检查后，类型被收窄了**。

## 内置类型守卫

### typeof

检查原始类型：

```typescript
function padLeft(value: string | number, padding: string | number): string {
  if (typeof padding === 'number') {
    // padding: number
    return ' '.repeat(padding) + value;
  }
  // padding: string
  return padding + value;
}
```

**支持的类型**：`'string'`, `'number'`, `'boolean'`, `'symbol'`, `'bigint'`, `'undefined'`, `'object'`, `'function'`

**注意**：`typeof null` 返回 `'object'`（JavaScript 历史遗留问题）。

### instanceof

检查是否是某个类的实例：

```typescript
class Dog {
  bark() { console.log('Woof!'); }
}

class Cat {
  meow() { console.log('Meow!'); }
}

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark();  // animal: Dog
  } else {
    animal.meow();  // animal: Cat
  }
}
```

### in

检查属性是否存在：

```typescript
interface Fish {
  swim(): void;
}

interface Bird {
  fly(): void;
}

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim(); // animal: Fish
  } else {
    animal.fly();  // animal: Bird
  }
}
```

### 相等性检查

```typescript
type Status = 'loading' | 'success' | 'error';

function handleStatus(status: Status) {
  if (status === 'loading') {
    // status: 'loading'
    return 'Loading...';
  }
  if (status === 'success') {
    // status: 'success'
    return 'Done!';
  }
  // status: 'error'
  return 'Error!';
}
```

### 真值检查

```typescript
function printName(name: string | null | undefined) {
  if (name) {
    // name: string（排除了 null 和 undefined）
    console.log(name.toUpperCase());
  }
}
```

**注意**：空字符串 `''` 和 `0` 也会被当作假值。

## 自定义类型守卫

### 类型谓词（Type Predicates）

使用 `parameterName is Type` 语法：

```typescript
interface Cat {
  meow(): void;
}

interface Dog {
  bark(): void;
}

// 类型谓词：告诉 TypeScript 返回 true 时 animal 是 Cat
function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function makeSound(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // animal: Cat
  } else {
    animal.bark(); // animal: Dog
  }
}
```

### 实际应用示例

**1. API 响应类型检查**

```typescript
interface SuccessResponse {
  success: true;
  data: unknown;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

function isSuccess(response: ApiResponse): response is SuccessResponse {
  return response.success === true;
}

async function fetchData() {
  const response: ApiResponse = await api.get('/data');
  
  if (isSuccess(response)) {
    console.log(response.data); // 安全访问 data
  } else {
    console.error(response.error); // 安全访问 error
  }
}
```

**2. 数组过滤**

```typescript
const items: (string | null)[] = ['a', null, 'b', null, 'c'];

// 使用类型谓词
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const filtered: string[] = items.filter(isNotNull);
// ['a', 'b', 'c']，类型正确
```

**3. 对象属性检查**

```typescript
interface User {
  name: string;
  email?: string;
}

function hasEmail(user: User): user is User & { email: string } {
  return user.email !== undefined;
}

function sendEmail(user: User) {
  if (hasEmail(user)) {
    // user.email 一定存在
    console.log(`Sending to ${user.email}`);
  }
}
```

## 断言函数（Assertion Functions）

TypeScript 3.7+ 支持断言函数，抛出异常时收窄类型：

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Expected string');
  }
}

function process(value: unknown) {
  assertIsString(value);
  // 这之后 value 是 string
  console.log(value.toUpperCase());
}
```

### 断言非空

```typescript
function assertDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is not defined');
  }
}

function getUser(): User | null {
  return null;
}

const user = getUser();
assertDefined(user);
// user 现在是 User 类型
console.log(user.name);
```

## 辨别式联合（Discriminated Unions）

使用共同的字面量属性作为"标签"：

```typescript
interface Circle {
  kind: 'circle';
  radius: number;
}

interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}

interface Triangle {
  kind: 'triangle';
  base: number;
  height: number;
}

type Shape = Circle | Rectangle | Triangle;

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      // shape: Circle
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      // shape: Rectangle
      return shape.width * shape.height;
    case 'triangle':
      // shape: Triangle
      return (shape.base * shape.height) / 2;
  }
}
```

**优势**：
- TypeScript 自动根据 `kind` 收窄类型
- 编译器可以检查是否处理了所有情况

## 最佳实践

### 1. 优先使用内置守卫

```typescript
// ✅ 简单直接
if (typeof value === 'string') { ... }

// ❌ 不必要的自定义守卫
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

### 2. 使用辨别式联合

```typescript
// ✅ 清晰的状态管理
type State = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

// ❌ 难以管理的可选属性
type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: Data;
  error?: Error;
};
```

### 3. 类型谓词要准确

```typescript
// ❌ 危险：类型谓词不准确
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object'; // 不够严格
}

// ✅ 安全：完整检查
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    typeof (obj as User).id === 'number' &&
    typeof (obj as User).name === 'string'
  );
}
```

## 总结

| 类型守卫 | 适用场景 |
|---------|---------|
| `typeof` | 原始类型检查 |
| `instanceof` | 类实例检查 |
| `in` | 属性存在检查 |
| `===` | 字面量类型检查 |
| 类型谓词 | 复杂自定义检查 |
| 断言函数 | 验证+抛异常 |
| 辨别式联合 | 状态管理 |

**核心理解**：类型守卫让 TypeScript 理解运行时的类型收窄，是安全处理联合类型的关键工具。

接下来，我们将学习字面量类型和类型收窄的更多细节。
