# 字面量类型与类型收窄

**思考一个问题**：`'hello'` 和 `string` 有什么区别？

在 TypeScript 中，`'hello'` 是一个**字面量类型**，它比 `string` 更精确——只允许一个特定的值。

## 字面量类型

### 什么是字面量类型

字面量类型是将具体值作为类型：

```typescript
// 字符串字面量类型
type Greeting = 'hello';
let greeting: Greeting = 'hello'; // ✅
// greeting = 'hi'; // ❌ 错误：'hi' 不能赋值给 'hello'

// 数字字面量类型
type One = 1;
let one: One = 1; // ✅
// one = 2; // ❌ 错误

// 布尔字面量类型
type True = true;
let isTrue: True = true; // ✅
```

### 为什么需要字面量类型

字面量类型让你能够**精确限制**允许的值：

```typescript
// ❌ 使用 string，接受任何字符串
function setDirection(direction: string) {
  // 'up', 'sideways', 'diagonal', 'banana' 都合法
}

// ✅ 使用字面量联合，只接受特定值
function setDirection(direction: 'up' | 'down' | 'left' | 'right') {
  // 只有这四个值合法
}

setDirection('up');    // ✅
setDirection('north'); // ❌ 编译错误
```

## 类型收窄（Type Narrowing）

### 什么是类型收窄

类型收窄是指 TypeScript 根据代码流程，将一个宽泛的类型**缩小**为更具体的类型。

```typescript
function process(value: string | number) {
  // 这里 value 是 string | number
  
  if (typeof value === 'string') {
    // 这里 value 被收窄为 string
    return value.toUpperCase();
  }
  
  // 这里 value 被收窄为 number
  return value.toFixed(2);
}
```

### 控制流分析

TypeScript 的类型收窄基于**控制流分析**——分析代码的执行路径。

```typescript
function example(x: string | number | boolean) {
  if (typeof x === 'string') {
    // x: string
    console.log(x.length);
  } else if (typeof x === 'number') {
    // x: number
    console.log(x.toFixed(2));
  } else {
    // x: boolean（排除了 string 和 number）
    console.log(x ? 'yes' : 'no');
  }
}
```

## 收窄的方式

### 1. typeof 收窄

```typescript
function printValue(value: string | number | boolean) {
  if (typeof value === 'string') {
    console.log(`String: ${value.toUpperCase()}`);
  } else if (typeof value === 'number') {
    console.log(`Number: ${value.toFixed(2)}`);
  } else {
    console.log(`Boolean: ${value}`);
  }
}
```

### 2. 真值收窄

```typescript
function printName(name: string | null | undefined) {
  if (name) {
    // name: string
    console.log(name.toUpperCase());
  } else {
    // name: null | undefined | ""
    console.log('No name provided');
  }
}
```

**注意**：空字符串 `""` 也是假值，会走 else 分支。

### 3. 相等性收窄

```typescript
function compare(a: string | number, b: string | number) {
  if (a === b) {
    // a 和 b 都是 string 或都是 number
    console.log(a.length); // ❌ 不一定是 string
  }
}

function handleValue(x: 'a' | 'b' | 'c') {
  if (x === 'a') {
    // x: 'a'
  } else if (x === 'b') {
    // x: 'b'
  } else {
    // x: 'c'
  }
}
```

### 4. in 收窄

```typescript
interface Admin {
  role: 'admin';
  permissions: string[];
}

interface User {
  role: 'user';
  email: string;
}

function logInfo(account: Admin | User) {
  if ('permissions' in account) {
    // account: Admin
    console.log(account.permissions);
  } else {
    // account: User
    console.log(account.email);
  }
}
```

### 5. instanceof 收窄

```typescript
function processValue(value: Date | string) {
  if (value instanceof Date) {
    // value: Date
    console.log(value.getFullYear());
  } else {
    // value: string
    console.log(value.toUpperCase());
  }
}
```

## const 断言

### 问题：字面量类型的丢失

```typescript
const point = { x: 10, y: 20 };
// point 的类型是 { x: number; y: number }，不是 { x: 10; y: 20 }

const colors = ['red', 'green', 'blue'];
// colors 的类型是 string[]，不是 ['red', 'green', 'blue']
```

### 解决：as const

```typescript
const point = { x: 10, y: 20 } as const;
// point 的类型是 { readonly x: 10; readonly y: 20 }

const colors = ['red', 'green', 'blue'] as const;
// colors 的类型是 readonly ['red', 'green', 'blue']
```

### 应用场景

**1. 配置对象**

```typescript
const config = {
  apiUrl: '/api',
  timeout: 5000,
  retries: 3
} as const;

// 类型是 { readonly apiUrl: '/api'; readonly timeout: 5000; readonly retries: 3 }
```

**2. 枚举替代**

```typescript
const Status = {
  Pending: 'pending',
  Success: 'success',
  Error: 'error'
} as const;

type StatusType = typeof Status[keyof typeof Status];
// 'pending' | 'success' | 'error'
```

**3. 元组**

```typescript
function useCoordinate() {
  return [10, 20] as const;
  // 返回类型是 readonly [10, 20]，而不是 number[]
}

const [x, y] = useCoordinate();
// x: 10, y: 20
```

## 赋值收窄

```typescript
let value: string | number;

value = 'hello';
// 这里 value 是 string

value = 42;
// 这里 value 是 number
```

## 实践模式

### 模式 1：状态机

```typescript
type State = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; message: string };

function render(state: State) {
  switch (state.status) {
    case 'idle':
      return 'Ready';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data;
    case 'error':
      return `Error: ${state.message}`;
  }
}
```

### 模式 2：安全的配置

```typescript
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethod = typeof ALLOWED_METHODS[number];

function request(method: HttpMethod, url: string) {
  // method 只能是 'GET' | 'POST' | 'PUT' | 'DELETE'
}
```

### 模式 3：类型安全的事件

```typescript
const EventTypes = {
  Click: 'click',
  Hover: 'hover',
  Focus: 'focus'
} as const;

type EventType = typeof EventTypes[keyof typeof EventTypes];

function on(event: EventType, handler: () => void) {
  // ...
}

on('click', () => {}); // ✅
on('scroll', () => {}); // ❌ 编译错误
```

## 总结

**字面量类型**：
- 比基础类型更精确
- 常与联合类型结合使用
- `as const` 保留字面量类型

**类型收窄**：
- TypeScript 通过控制流分析自动收窄
- `typeof`、`in`、`instanceof`、相等性检查都触发收窄
- 辨别式联合利用字面量属性收窄

**最佳实践**：
- 用字面量联合替代宽泛的 string/number
- 用 `as const` 保留配置对象的精确类型
- 用辨别式联合管理复杂状态

接下来，我们将学习 `never` 类型和穷尽性检查——确保处理了所有可能情况的技术。
