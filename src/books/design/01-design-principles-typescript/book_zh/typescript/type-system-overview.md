# TypeScript 类型系统概览

**思考一个问题**：为什么 TypeScript 能让大型项目更可维护？

答案在于它的**类型系统**。类型系统是 TypeScript 最核心的能力，理解它是写好 TypeScript 的前提。

## 类型系统是什么

### 静态类型 vs 动态类型

**JavaScript（动态类型）**：
```javascript
let value = 'hello';
value = 42;        // 合法，但可能导致 bug
value.toUpperCase(); // 运行时错误
```

**TypeScript（静态类型）**：
```typescript
let value: string = 'hello';
value = 42;        // 编译错误：不能将 number 赋给 string
value.toUpperCase(); // 安全，编译器知道 value 是 string
```

**关键差异**：TypeScript 在**编译时**捕获错误，而非运行时。

### 类型系统的核心价值

1. **错误预防**：在代码运行前发现问题
2. **代码文档**：类型即文档，表明函数期望什么、返回什么
3. **智能提示**：IDE 能提供精确的自动补全
4. **重构安全**：修改接口时，编译器告诉你哪些地方需要更新

## TypeScript 类型系统的特点

### 1. 结构化类型（Structural Typing）

TypeScript 使用"鸭子类型"——如果它看起来像鸭子，叫起来像鸭子，就是鸭子。

```typescript
interface Point {
  x: number;
  y: number;
}

function printPoint(point: Point) {
  console.log(`(${point.x}, ${point.y})`);
}

// 不需要显式声明 implements Point
const myPoint = { x: 10, y: 20 };
printPoint(myPoint); // ✅ 合法，因为结构匹配
```

对比 Java（名义类型）：
```java
// Java 中必须显式声明 implements
class MyPoint implements Point { ... }
```

### 2. 类型推断

TypeScript 能自动推断类型，减少冗余标注：

```typescript
// 显式标注
const numbers: number[] = [1, 2, 3];
const sum: number = numbers.reduce((a, b) => a + b, 0);

// 类型推断（推荐）
const numbers = [1, 2, 3]; // 推断为 number[]
const sum = numbers.reduce((a, b) => a + b, 0); // 推断为 number
```

**最佳实践**：
- 函数参数和返回值：显式标注
- 局部变量：让 TypeScript 推断

### 3. 可空性检查

启用 `strictNullChecks` 后，`null` 和 `undefined` 是独立类型：

```typescript
function getUser(id: string): User | null {
  // 可能返回 null
}

const user = getUser('123');
// user.name; // ❌ 错误：user 可能为 null
if (user) {
  user.name; // ✅ 安全
}
```

### 4. 控制流分析

TypeScript 追踪代码执行路径，自动收窄类型：

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // 这里 value 的类型是 string
    return value.toUpperCase();
  }
  // 这里 value 的类型是 number
  return value.toFixed(2);
}
```

## 类型系统的层次结构

```
                    unknown
                       │
         ┌─────────────┼─────────────┐
         │             │             │
      object       primitive        function
         │             │
    ┌────┼────┐    ┌───┼───┬───┐
    │    │    │    │   │   │   │
  Array Date ...  string number boolean symbol
                                   │
                                  ...
                                   │
                                 never
```

- **unknown**：顶层类型，任何值都可以赋给它
- **never**：底层类型，表示永不发生的情况
- **any**：逃生舱，绕过类型检查（谨慎使用）

## 核心类型分类

| 分类 | 类型 | 说明 |
|------|------|------|
| 原始类型 | `string`, `number`, `boolean`, `symbol`, `bigint` | 基础值类型 |
| 特殊类型 | `null`, `undefined`, `void`, `never`, `unknown`, `any` | 特殊用途 |
| 对象类型 | `object`, `{}`, 接口, 类 | 复合类型 |
| 函数类型 | `(a: T) => R` | 函数签名 |
| 组合类型 | 联合 `\|`, 交叉 `&` | 类型组合 |
| 工具类型 | `Partial`, `Required`, `Pick`, `Omit` | 类型变换 |

## 类型标注的位置

```typescript
// 变量
const name: string = 'Alice';

// 函数参数和返回值
function greet(name: string): string {
  return `Hello, ${name}`;
}

// 对象属性
interface User {
  id: number;
  name: string;
  email?: string; // 可选属性
}

// 数组
const numbers: number[] = [1, 2, 3];
const names: Array<string> = ['a', 'b'];

// 泛型
function identity<T>(value: T): T {
  return value;
}
```

## 常见配置选项

```json
{
  "compilerOptions": {
    "strict": true,              // 启用所有严格检查
    "strictNullChecks": true,    // null/undefined 检查
    "noImplicitAny": true,       // 禁止隐式 any
    "strictFunctionTypes": true  // 函数类型严格检查
  }
}
```

**强烈建议**：新项目开启 `strict: true`，老项目逐步迁移。

## 总结

- **类型系统是 TypeScript 的核心**，在编译时捕获错误
- **结构化类型**：基于形状匹配，而非名称匹配
- **类型推断**：减少冗余标注，保持代码简洁
- **控制流分析**：自动收窄类型，提供安全保障
- **严格模式**：新项目务必开启 `strict: true`

接下来，我们将深入学习各种基础类型的细节和最佳实践。
