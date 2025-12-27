# 自定义工具类型

掌握了内置工具类型后，我们来学习如何**创建自己的工具类型**。

这需要综合运用泛型、映射类型、条件类型等技术。

## 设计原则

### 1. 明确用途

每个工具类型应该有**单一、明确的目的**。

```typescript
// ✅ 好：目的明确
type Nullable<T> = T | null;
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };

// ❌ 差：目的不明确
type Helper<T> = T extends string ? number : T extends number ? string : T;
```

### 2. 命名规范

- 使用 PascalCase
- 名字应该描述类型变换的作用
- 常见模式：`[形容词][名词]`

```typescript
type DeepPartial<T> = ...;      // 深度可选
type Mutable<T> = ...;          // 可变的
type NonEmptyArray<T> = ...;    // 非空数组
type Awaited<T> = ...;          // 解包 Promise
```

## 实用工具类型

### 1. Nullable\<T\>

让类型可以为 null。

```typescript
type Nullable<T> = T | null;

// 使用
type MaybeUser = Nullable<User>;
// User | null

function findUser(id: string): Nullable<User> {
  return users.get(id) ?? null;
}
```

### 2. Mutable\<T\>

移除所有 readonly 修饰符。

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

// 使用
interface ReadonlyUser {
  readonly id: number;
  readonly name: string;
}

type EditableUser = Mutable<ReadonlyUser>;
// { id: number; name: string }
```

### 3. NonEmptyArray\<T\>

确保数组至少有一个元素。

```typescript
type NonEmptyArray<T> = [T, ...T[]];

// 使用
function first<T>(arr: NonEmptyArray<T>): T {
  return arr[0]; // 不需要处理 undefined
}

first([1, 2, 3]); // ✅
first([]);        // ❌ 编译错误
```

### 4. ValueOf\<T\>

获取对象所有值的联合类型。

```typescript
type ValueOf<T> = T[keyof T];

// 使用
const Status = {
  Pending: 'pending',
  Success: 'success',
  Error: 'error'
} as const;

type StatusValue = ValueOf<typeof Status>;
// 'pending' | 'success' | 'error'
```

### 5. PartialBy\<T, K\>

只让指定的属性变为可选。

```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 使用
interface User {
  id: number;
  name: string;
  email: string;
}

type CreateUser = PartialBy<User, 'id'>;
// { name: string; email: string; id?: number }
```

### 6. RequiredBy\<T, K\>

只让指定的属性变为必需。

```typescript
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// 使用
interface Config {
  host?: string;
  port?: number;
  ssl?: boolean;
}

type ProductionConfig = RequiredBy<Config, 'host' | 'port'>;
// { ssl?: boolean; host: string; port: number }
```

### 7. PickByType\<T, U\>

选取值类型为 U 的属性。

```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

// 使用
interface Mixed {
  id: number;
  name: string;
  active: boolean;
  count: number;
}

type NumberFields = PickByType<Mixed, number>;
// { id: number; count: number }

type StringFields = PickByType<Mixed, string>;
// { name: string }
```

### 8. OmitByType\<T, U\>

排除值类型为 U 的属性。

```typescript
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

// 使用
type NonFunctionFields = OmitByType<Mixed, Function>;
```

### 9. AsyncReturnType\<T\>

获取异步函数的返回类型。

```typescript
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

// 使用
async function fetchUser(id: string): Promise<User> {
  return { id: 1, name: 'Alice' };
}

type Result = AsyncReturnType<typeof fetchUser>;
// User
```

### 10. Prettify\<T\>

展开交叉类型，让类型更易读。

```typescript
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// 使用
type Ugly = { a: string } & { b: number } & { c: boolean };
// 显示为 { a: string } & { b: number } & { c: boolean }

type Pretty = Prettify<Ugly>;
// 显示为 { a: string; b: number; c: boolean }
```

## 高级工具类型

### DeepPartial\<T\>

递归地让所有属性可选。

```typescript
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// 使用
interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
}

type PartialConfig = DeepPartial<Config>;
// 所有嵌套属性都变为可选
```

### DeepReadonly\<T\>

递归地让所有属性只读。

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// 使用
const config: DeepReadonly<Config> = { /* ... */ };
config.server.port = 3000; // ❌ 编译错误
```

### PathKeys\<T\>

获取对象的所有路径。

```typescript
type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: 
        | `${Prefix}${K}`
        | PathKeys<T[K], `${Prefix}${K}.`>
    }[keyof T & string]
  : never;

// 使用
interface User {
  id: number;
  profile: {
    name: string;
    address: {
      city: string;
    };
  };
}

type UserPaths = PathKeys<User>;
// 'id' | 'profile' | 'profile.name' | 'profile.address' | 'profile.address.city'
```

## 设计技巧

### 1. 从简单开始

先实现基本功能，再逐步增强。

```typescript
// 第一步：基本实现
type Nullable<T> = T | null;

// 第二步：考虑边界情况
type Nullable<T> = T extends null | undefined ? T : T | null;
```

### 2. 使用辅助类型

复杂类型可以拆分为多个辅助类型。

```typescript
// 辅助类型
type IsObject<T> = T extends object ? T : never;
type IsArray<T> = T extends any[] ? T : never;

// 组合使用
type DeepPartial<T> = T extends IsArray<T>
  ? DeepPartialArray<T>
  : T extends IsObject<T>
  ? DeepPartialObject<T>
  : T;
```

### 3. 添加类型测试

```typescript
// 类型测试辅助
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends 
                   (<T>() => T extends Y ? 1 : 2) ? true : false;

// 测试 Nullable
type Test1 = Expect<Equal<Nullable<string>, string | null>>;
type Test2 = Expect<Equal<Nullable<number>, number | null>>;
```

## 总结

**设计原则**：
- 单一职责
- 清晰命名
- 渐进增强

**常用技巧**：
- 映射类型修改属性
- 条件类型处理分支
- infer 提取类型
- 递归处理嵌套

**推荐工具类型**：
- `Nullable<T>` - 可空
- `Mutable<T>` - 可变
- `DeepPartial<T>` - 深度可选
- `PartialBy<T, K>` - 部分可选
- `PickByType<T, U>` - 按类型选取

创建自定义工具类型是 TypeScript 高级用法的体现，善用它们可以大大提高类型系统的表达能力。
