# 接口与类型别名的选择

**这是 TypeScript 中最常被问到的问题之一**：什么时候用 `interface`，什么时候用 `type`？

让我们彻底弄清楚。

## 基本语法

### interface

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

const user: User = {
  id: 1,
  name: 'Alice'
};
```

### type

```typescript
type User = {
  id: number;
  name: string;
  email?: string;
};

const user: User = {
  id: 1,
  name: 'Alice'
};
```

对于对象类型，两者看起来几乎一样。那么区别在哪里？

## 核心区别

### 1. 扩展方式不同

**interface：使用 extends**
```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

const dog: Dog = { name: 'Max', breed: 'Labrador' };
```

**type：使用交叉类型 &**
```typescript
type Animal = {
  name: string;
};

type Dog = Animal & {
  breed: string;
};

const dog: Dog = { name: 'Max', breed: 'Labrador' };
```

### 2. 声明合并（Declaration Merging）

**interface 可以声明合并**：
```typescript
interface User {
  id: number;
}

interface User {
  name: string;
}

// 自动合并为：
// interface User {
//   id: number;
//   name: string;
// }

const user: User = { id: 1, name: 'Alice' }; // 必须同时有 id 和 name
```

**type 不能声明合并**：
```typescript
type User = {
  id: number;
};

type User = {  // ❌ 错误：重复定义
  name: string;
};
```

**声明合并的用途**：扩展第三方库的类型

```typescript
// 扩展 Express 的 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

### 3. type 能做的，interface 做不了的

**联合类型**：
```typescript
type Status = 'pending' | 'success' | 'error';
type StringOrNumber = string | number;

// interface 无法定义联合类型
```

**映射类型**：
```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// interface 无法使用映射类型
```

**条件类型**：
```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

// interface 无法使用条件类型
```

**元组类型**：
```typescript
type Point = [number, number];
type Response = [boolean, string];

// interface 可以表示元组，但语法更繁琐
interface Point {
  0: number;
  1: number;
  length: 2;
}
```

### 4. 类实现（implements）

两者都可以被类实现：

```typescript
interface Printable {
  print(): void;
}

type Loggable = {
  log(): void;
};

class Document implements Printable, Loggable {
  print() { console.log('Printing...'); }
  log() { console.log('Logging...'); }
}
```

## 性能考量

TypeScript 团队曾提到：`interface` 的类型检查性能略优于 `type` 的交叉类型。

```typescript
// 性能更好
interface Dog extends Animal {
  breed: string;
}

// 性能略差（但通常可以忽略）
type Dog = Animal & {
  breed: string;
};
```

在大型项目中，过多使用交叉类型可能导致类型检查变慢。

## 实践指南

### 推荐：使用 interface 的场景

1. **定义对象的形状**（最常见用途）
   ```typescript
   interface User {
     id: number;
     name: string;
   }
   ```

2. **需要声明合并**（扩展第三方库）
   ```typescript
   interface Window {
     myCustomProperty: string;
   }
   ```

3. **定义公共 API**（库作者）
   ```typescript
   // 允许用户扩展
   export interface PluginOptions {
     name: string;
   }
   ```

4. **类的契约**
   ```typescript
   interface Repository<T> {
     find(id: string): T | null;
     save(entity: T): void;
   }
   ```

### 推荐：使用 type 的场景

1. **联合类型**
   ```typescript
   type Status = 'loading' | 'success' | 'error';
   type Result<T> = T | Error;
   ```

2. **元组**
   ```typescript
   type Coordinate = [number, number];
   ```

3. **复杂类型操作**
   ```typescript
   type Partial<T> = { [K in keyof T]?: T[K] };
   type Pick<T, K extends keyof T> = { [P in K]: T[P] };
   ```

4. **函数类型别名**
   ```typescript
   type Handler = (event: Event) => void;
   type Reducer<S, A> = (state: S, action: A) => S;
   ```

5. **原始类型别名**
   ```typescript
   type UserId = string;
   type Timestamp = number;
   ```

## 团队规范建议

### 方案一：默认使用 interface

```typescript
// 对象类型用 interface
interface User {
  id: number;
  name: string;
}

// 只在 interface 做不到时用 type
type Status = 'active' | 'inactive';
type Handler = () => void;
```

这是 TypeScript 官方推荐的方式。

### 方案二：统一使用 type

```typescript
// 所有类型都用 type
type User = {
  id: number;
  name: string;
};

type Status = 'active' | 'inactive';
```

这种方式更一致，但失去了声明合并能力。

### 关键原则

**保持一致性**：团队内统一规范，比选择哪个更重要。

## 快速决策流程

```
需要联合类型或映射类型？
  └─ 是 → 使用 type
  └─ 否 → 继续

需要声明合并？
  └─ 是 → 使用 interface
  └─ 否 → 继续

定义对象形状？
  └─ 是 → 使用 interface（推荐）或 type（都可以）
  └─ 否 → 使用 type
```

## 总结

| 特性 | interface | type |
|------|-----------|------|
| 对象类型 | ✅ | ✅ |
| 扩展 | extends | & |
| 声明合并 | ✅ | ❌ |
| 联合类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 类实现 | ✅ | ✅ |

**简单规则**：
- 定义对象形状 → `interface`
- 其他情况 → `type`
- 团队统一 → 最重要

接下来，我们将学习联合类型和交叉类型——TypeScript 类型组合的核心机制。
