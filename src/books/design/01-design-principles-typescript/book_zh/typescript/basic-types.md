# 基础类型与类型注解

**思考一个问题**：TypeScript 的基础类型和 JavaScript 有什么区别？

答案是：类型本身几乎一样，但 TypeScript 让它们**显式化**，并在编译时强制检查。

## 原始类型

### string, number, boolean

最常用的三种类型：

```typescript
// 类型注解语法：变量名: 类型
const name: string = 'Alice';
const age: number = 25;
const isActive: boolean = true;

// 类型推断（推荐：让 TS 自动推断）
const name = 'Alice';      // 推断为 string
const age = 25;            // 推断为 number
const isActive = true;     // 推断为 boolean
```

**注意**：使用小写 `string`，不是 `String`。大写版本是 JavaScript 的包装对象，几乎不该使用。

```typescript
// ❌ 错误做法
const name: String = 'Alice';

// ✅ 正确做法
const name: string = 'Alice';
```

### null 和 undefined

在 `strictNullChecks` 模式下，它们是独立类型：

```typescript
// 明确表示可能为空
let user: User | null = null;
let value: string | undefined = undefined;

// 函数可能不返回值
function logMessage(msg: string): void {
  console.log(msg);
  // 没有 return
}
```

**最佳实践**：
- 使用 `null` 表示"有意为空"
- 使用 `undefined` 表示"未初始化"

### symbol 和 bigint

较少使用的原始类型：

```typescript
// Symbol：唯一标识符
const id: symbol = Symbol('id');

// BigInt：大整数（ES2020+）
const bigNumber: bigint = 9007199254740991n;
```

## 数组类型

两种语法，等价：

```typescript
// 语法一：类型[]
const numbers: number[] = [1, 2, 3];
const names: string[] = ['a', 'b', 'c'];

// 语法二：Array<类型>
const numbers: Array<number> = [1, 2, 3];
const names: Array<string> = ['a', 'b', 'c'];
```

**推荐使用** `类型[]` 语法，更简洁。

### 只读数组

```typescript
const numbers: readonly number[] = [1, 2, 3];
// numbers.push(4); // ❌ 错误：readonly 数组不能修改
```

## 元组类型

固定长度、每个位置有特定类型的数组：

```typescript
// 元组：[类型1, 类型2, ...]
const point: [number, number] = [10, 20];
const entry: [string, number] = ['age', 25];

// 访问元素
const x = point[0]; // number
const y = point[1]; // number

// 常见用途：函数返回多个值
function useState<T>(initial: T): [T, (value: T) => void] {
  let state = initial;
  const setState = (value: T) => { state = value; };
  return [state, setState];
}

const [count, setCount] = useState(0);
```

### 带标签的元组（TypeScript 4.0+）

```typescript
type Point = [x: number, y: number];
type Response = [success: boolean, data: string];
```

## 对象类型

### 内联对象类型

```typescript
function printUser(user: { name: string; age: number }) {
  console.log(`${user.name} is ${user.age} years old`);
}
```

### 可选属性

使用 `?` 标记：

```typescript
interface User {
  name: string;
  age: number;
  email?: string;  // 可选
}

const user: User = { name: 'Alice', age: 25 }; // ✅ 不需要 email
```

### 只读属性

```typescript
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

const config: Config = { apiUrl: '/api', timeout: 5000 };
// config.apiUrl = '/v2'; // ❌ 错误：readonly 不能修改
```

## 函数类型

### 函数声明的类型注解

```typescript
// 参数和返回值类型
function add(a: number, b: number): number {
  return a + b;
}

// 箭头函数
const multiply = (a: number, b: number): number => a * b;
```

### 函数类型表达式

```typescript
// 定义函数类型
type MathOperation = (a: number, b: number) => number;

// 使用函数类型
const add: MathOperation = (a, b) => a + b;
const subtract: MathOperation = (a, b) => a - b;
```

### 可选参数和默认值

```typescript
// 可选参数（必须在必选参数后面）
function greet(name: string, greeting?: string): string {
  return `${greeting ?? 'Hello'}, ${name}`;
}

// 默认值（自动推断类型）
function greet(name: string, greeting = 'Hello'): string {
  return `${greeting}, ${name}`;
}
```

### 剩余参数

```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

sum(1, 2, 3, 4, 5); // 15
```

## 特殊类型

### any：逃生舱

```typescript
let value: any = 'hello';
value = 42;          // ✅ 合法
value = { x: 1 };    // ✅ 合法
value.foo.bar.baz;   // ✅ 合法（但运行时可能报错）
```

**警告**：`any` 绕过所有类型检查。仅在以下情况使用：
- 迁移遗留代码
- 与第三方库交互且无类型定义
- 确实无法确定类型

### unknown：安全的 any

```typescript
let value: unknown = 'hello';

// value.toUpperCase(); // ❌ 错误：unknown 不能直接使用

// 必须先检查类型
if (typeof value === 'string') {
  value.toUpperCase(); // ✅ 安全
}
```

**推荐**：用 `unknown` 替代 `any`，强制进行类型检查。

### void：无返回值

```typescript
function logMessage(msg: string): void {
  console.log(msg);
}
```

### never：永不发生

```typescript
// 抛出异常的函数
function throwError(message: string): never {
  throw new Error(message);
}

// 无限循环
function infiniteLoop(): never {
  while (true) {}
}
```

## 类型断言

告诉编译器"我比你更清楚这个类型"：

```typescript
// 语法一：as 关键字（推荐）
const input = document.getElementById('input') as HTMLInputElement;
input.value = 'hello';

// 语法二：尖括号（JSX 中不可用）
const input = <HTMLInputElement>document.getElementById('input');
```

**警告**：类型断言不进行运行时检查，使用不当会导致运行时错误。

```typescript
// 危险：如果 data 实际上不是 User，运行时会出错
const user = data as User;
```

## 总结

- **原始类型**：`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`
- **复合类型**：数组 `T[]`、元组 `[T, U]`、对象 `{ key: T }`
- **函数类型**：`(params) => ReturnType`
- **特殊类型**：`any`（慎用）、`unknown`（安全）、`void`、`never`
- **最佳实践**：尽量让 TypeScript 推断类型，函数参数和返回值显式标注

接下来，我们将讨论 `interface` 和 `type` 的区别与选择。
