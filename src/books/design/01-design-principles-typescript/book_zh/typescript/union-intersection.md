# 联合类型与交叉类型

TypeScript 提供了两种强大的类型组合方式：**联合类型（Union）** 和 **交叉类型（Intersection）**。

**思考一个问题**：它们的名字听起来像集合论，但行为却相反——联合类型缩小了可用操作，交叉类型扩大了可用操作。为什么？

## 联合类型（Union Types）

### 基本语法

使用 `|` 符号连接多个类型：

```typescript
type StringOrNumber = string | number;

let value: StringOrNumber;
value = 'hello'; // ✅
value = 42;      // ✅
value = true;    // ❌ 错误：boolean 不在联合类型中
```

### 联合类型的本质

联合类型表示**"是其中之一"**。一个 `string | number` 类型的值，要么是 `string`，要么是 `number`。

**关键理解**：编译器只允许你使用**所有成员都有的操作**。

```typescript
function process(value: string | number) {
  // value.toUpperCase(); // ❌ 错误：number 没有 toUpperCase
  // value.toFixed();     // ❌ 错误：string 没有 toFixed
  
  value.toString(); // ✅ string 和 number 都有 toString
}
```

### 类型收窄（Narrowing）

要使用特定类型的操作，需要先收窄类型：

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // 这里 value 是 string
    return value.toUpperCase();
  }
  // 这里 value 是 number
  return value.toFixed(2);
}
```

### 常见应用场景

**1. 函数参数的灵活性**

```typescript
function formatId(id: string | number): string {
  return typeof id === 'number' ? `ID-${id}` : id;
}

formatId(123);     // "ID-123"
formatId('abc');   // "abc"
```

**2. 状态表示**

```typescript
type LoadingState = 
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; message: string };

function handleState(state: LoadingState) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data; // TypeScript 知道这里有 data
    case 'error':
      return state.message; // TypeScript 知道这里有 message
  }
}
```

**3. 可空类型**

```typescript
type NullableString = string | null;
type MaybeNumber = number | undefined;
```

### 字面量联合类型

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

function move(direction: Direction) {
  // direction 只能是这四个值之一
}

move('up');    // ✅
move('north'); // ❌ 错误
```

## 交叉类型（Intersection Types）

### 基本语法

使用 `&` 符号连接多个类型：

```typescript
type Named = { name: string };
type Aged = { age: number };

type Person = Named & Aged;
// 等价于 { name: string; age: number }

const person: Person = {
  name: 'Alice',
  age: 25
}; // 必须同时有 name 和 age
```

### 交叉类型的本质

交叉类型表示**"同时满足所有"**。一个 `A & B` 类型的值，必须同时满足 `A` 和 `B` 的要求。

```typescript
type A = { a: number };
type B = { b: string };

type AB = A & B;

const value: AB = {
  a: 1,     // 满足 A
  b: 'two'  // 满足 B
}; // 必须两者都有
```

### 常见应用场景

**1. 组合多个接口**

```typescript
interface Printable {
  print(): void;
}

interface Loggable {
  log(): void;
}

type PrintableAndLoggable = Printable & Loggable;

const document: PrintableAndLoggable = {
  print() { console.log('Printing...'); },
  log() { console.log('Logging...'); }
};
```

**2. 给类型添加属性**

```typescript
type WithId<T> = T & { id: string };

type User = { name: string };
type UserWithId = WithId<User>;
// { name: string; id: string }
```

**3. Mixin 模式**

```typescript
function withTimestamp<T>(obj: T): T & { createdAt: Date } {
  return { ...obj, createdAt: new Date() };
}

const user = withTimestamp({ name: 'Alice' });
// { name: string; createdAt: Date }
```

### 冲突处理

当交叉的类型有相同属性但类型不同时：

```typescript
type A = { value: string };
type B = { value: number };

type AB = A & B;
// value 的类型是 string & number，即 never

const x: AB = { value: ??? }; // 无法满足
```

**实际意义**：如果属性类型冲突，交叉类型变得不可能满足。

## 联合 vs 交叉：直观理解

### 集合论视角

| 类型 | 值的集合 | 可用操作 |
|------|---------|---------|
| `A \| B` | A 的值 ∪ B 的值（更多值） | A 和 B 共有的操作（更少） |
| `A & B` | A 的值 ∩ B 的值（更少值） | A 和 B 所有的操作（更多） |

### 代码示例

```typescript
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

// 联合类型：可能是鸟，可能是鱼
type BirdOrFish = Bird | Fish;
function doSomething(animal: BirdOrFish) {
  animal.layEggs();  // ✅ 两者都有
  // animal.fly();   // ❌ Fish 没有
  // animal.swim();  // ❌ Bird 没有
}

// 交叉类型：既是鸟又是鱼（飞鱼？）
type BirdAndFish = Bird & Fish;
function doEverything(animal: BirdAndFish) {
  animal.layEggs(); // ✅
  animal.fly();     // ✅
  animal.swim();    // ✅
}
```

## 实际应用模式

### 模式 1：可选配置的默认值

```typescript
type RequiredOptions = {
  apiUrl: string;
  timeout: number;
};

type OptionalOptions = {
  debug?: boolean;
  retry?: number;
};

type Config = RequiredOptions & OptionalOptions;

const config: Config = {
  apiUrl: '/api',
  timeout: 5000,
  // debug 和 retry 是可选的
};
```

### 模式 2：辨别式联合（Discriminated Union）

```typescript
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

function handleResult(result: Result<string, Error>) {
  if (result.success) {
    console.log(result.data);  // TypeScript 知道这里有 data
  } else {
    console.error(result.error); // TypeScript 知道这里有 error
  }
}
```

### 模式 3：类型安全的事件处理

```typescript
type ClickEvent = { type: 'click'; x: number; y: number };
type KeyEvent = { type: 'key'; key: string };
type ScrollEvent = { type: 'scroll'; delta: number };

type AppEvent = ClickEvent | KeyEvent | ScrollEvent;

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case 'click':
      console.log(`Click at (${event.x}, ${event.y})`);
      break;
    case 'key':
      console.log(`Key pressed: ${event.key}`);
      break;
    case 'scroll':
      console.log(`Scrolled: ${event.delta}`);
      break;
  }
}
```

## 总结

| 特性 | 联合类型 `A \| B` | 交叉类型 `A & B` |
|------|-----------------|-----------------|
| 语义 | A 或 B | A 且 B |
| 值的范围 | 更宽（可以是任一类型的值） | 更窄（必须同时满足） |
| 可用操作 | 只能用共有操作 | 可以用所有操作 |
| 常见用途 | 状态、可选类型、字面量枚举 | 类型组合、Mixin |

**核心理解**：
- 联合类型：值可能是多种类型之一，所以操作受限
- 交叉类型：值必须满足所有类型，所以操作丰富

接下来，我们将学习类型守卫——在运行时安全地处理联合类型。
