# 泛型基础

**思考一个问题**：如何写一个函数，既能处理字符串数组，也能处理数字数组，还能保持类型安全？

```typescript
// 方案一：重复定义（不 DRY）
function firstString(arr: string[]): string | undefined {
  return arr[0];
}

function firstNumber(arr: number[]): number | undefined {
  return arr[0];
}

// 方案二：使用 any（不安全）
function first(arr: any[]): any {
  return arr[0];
}

// 方案三：泛型（既 DRY 又安全）✅
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

泛型就是**类型的参数**。

## 什么是泛型

泛型允许你在定义函数、类或接口时**不预先指定具体类型**，而是在使用时才确定。

```typescript
// <T> 是类型参数，T 是类型变量
function identity<T>(value: T): T {
  return value;
}

// 使用时指定类型
const num = identity<number>(42);     // T = number
const str = identity<string>('hello'); // T = string

// TypeScript 也能自动推断
const num2 = identity(42);     // 推断 T = number
const str2 = identity('hello'); // 推断 T = string
```

**泛型的本质**：把类型当作参数传递。

## 为什么需要泛型

### 1. 代码复用

不用泛型，每个类型都要写一遍：

```typescript
// ❌ 重复代码
function reverseStrings(arr: string[]): string[] {
  return [...arr].reverse();
}

function reverseNumbers(arr: number[]): number[] {
  return [...arr].reverse();
}
```

用泛型，一次定义，处处使用：

```typescript
// ✅ 一个函数处理所有类型
function reverse<T>(arr: T[]): T[] {
  return [...arr].reverse();
}

reverse([1, 2, 3]);       // number[]
reverse(['a', 'b', 'c']); // string[]
```

### 2. 类型安全

使用 `any` 会丢失类型信息：

```typescript
// ❌ 使用 any
function first(arr: any[]): any {
  return arr[0];
}

const item = first([1, 2, 3]);
item.toUpperCase(); // 编译通过，但运行时报错！

// ✅ 使用泛型
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const item = first([1, 2, 3]);
item.toUpperCase(); // ❌ 编译错误：number 没有 toUpperCase
```

## 泛型语法

### 基本语法

```typescript
// 函数声明
function fn<T>(arg: T): T { ... }

// 箭头函数
const fn = <T>(arg: T): T => { ... };

// 在 TSX 文件中，箭头函数需要加逗号避免与 JSX 混淆
const fn = <T,>(arg: T): T => { ... };
```

### 多个类型参数

```typescript
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const result = pair('hello', 42);
// 类型是 [string, number]
```

### 常见命名约定

| 名称 | 含义 | 例子 |
|-----|------|-----|
| T | Type | 通用类型 |
| K | Key | 对象键 |
| V | Value | 对象值 |
| E | Element | 数组元素 |
| R | Return | 返回类型 |

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

## 泛型接口

```typescript
// 泛型接口
interface Container<T> {
  value: T;
  getValue(): T;
}

// 实现
const numberContainer: Container<number> = {
  value: 42,
  getValue() { return this.value; }
};

// 泛型类型别名
type Result<T> = {
  success: boolean;
  data: T;
};
```

## 泛型数组

```typescript
// 两种等价写法
const numbers: number[] = [1, 2, 3];
const numbers: Array<number> = [1, 2, 3];

// Array 是一个泛型接口
interface Array<T> {
  length: number;
  pop(): T | undefined;
  push(...items: T[]): number;
  // ...
}
```

## 实际应用

### API 响应封装

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface User {
  id: number;
  name: string;
}

// 使用
async function fetchUser(id: number): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const result = await fetchUser(1);
console.log(result.data.name); // 类型安全
```

### 状态管理

```typescript
interface State<T> {
  value: T;
  setValue: (newValue: T) => void;
}

function createState<T>(initial: T): State<T> {
  let value = initial;
  return {
    get value() { return value; },
    setValue(newValue) { value = newValue; }
  };
}

const counter = createState(0);     // State<number>
const name = createState('Alice');  // State<string>
```

## 类型推断

TypeScript 通常能自动推断泛型参数：

```typescript
function identity<T>(value: T): T {
  return value;
}

// 不需要显式指定 <number>
const num = identity(42); // T 推断为 number

// 但有时需要显式指定
const emptyArray = identity<string[]>([]); // 空数组无法推断
```

**最佳实践**：让 TypeScript 推断，推断不出时再显式指定。

## 总结

- **泛型是类型的参数**，让代码既复用又类型安全
- **语法**：`<T>` 定义类型参数，使用时指定具体类型
- **多参数**：可以有多个类型参数 `<T, U, K>`
- **类型推断**：大多数情况让 TypeScript 自动推断
- **命名约定**：T、K、V、E、R 等有常见含义

接下来，我们将学习如何用**泛型约束**限制类型参数的范围。
