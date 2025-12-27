# 映射类型

**映射类型（Mapped Types）** 可以基于现有类型创建新类型。

核心思想：遍历类型的键，对每个键进行转换。

## 基本语法

```typescript
type MappedType<T> = {
  [K in keyof T]: T[K]
};

// K in keyof T：遍历 T 的所有键
// T[K]：获取键 K 对应的值类型
```

## 基本示例

### 复制类型

```typescript
type Clone<T> = {
  [K in keyof T]: T[K]
};

interface User {
  id: number;
  name: string;
}

type ClonedUser = Clone<User>;
// { id: number; name: string }
```

### 所有属性可选

```typescript
type Partial<T> = {
  [K in keyof T]?: T[K]
};

interface User {
  id: number;
  name: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string }
```

### 所有属性必填

```typescript
type Required<T> = {
  [K in keyof T]-?: T[K]
};

interface Options {
  debug?: boolean;
  timeout?: number;
}

type RequiredOptions = Required<Options>;
// { debug: boolean; timeout: number }
```

### 所有属性只读

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
};

interface State {
  count: number;
  name: string;
}

type ReadonlyState = Readonly<State>;
// { readonly count: number; readonly name: string }
```

## 值类型转换

不仅可以修改修饰符，还可以转换值类型：

```typescript
// 所有属性变成 boolean
type Flags<T> = {
  [K in keyof T]: boolean
};

interface Config {
  debug: string;
  verbose: string;
}

type ConfigFlags = Flags<Config>;
// { debug: boolean; verbose: boolean }
```

### 包装值类型

```typescript
// 所有属性包装成 Promise
type Async<T> = {
  [K in keyof T]: Promise<T[K]>
};

interface API {
  getUser: () => User;
  getList: () => Item[];
}

type AsyncAPI = Async<API>;
// { getUser: Promise<() => User>; getList: Promise<() => Item[]> }
```

### 函数化属性

```typescript
// 所有属性变成 getter
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

## 键重映射（Key Remapping）

TypeScript 4.1+ 支持使用 `as` 重映射键：

```typescript
type Rename<T> = {
  [K in keyof T as `new_${string & K}`]: T[K]
};

interface Config {
  debug: boolean;
  timeout: number;
}

type RenamedConfig = Rename<Config>;
// { new_debug: boolean; new_timeout: number }
```

### 过滤键

```typescript
// 只保留 string 类型的属性
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
};

interface Mixed {
  id: number;
  name: string;
  email: string;
}

type OnlyStrings = StringKeys<Mixed>;
// { name: string; email: string }
```

### 排除特定键

```typescript
type OmitByKey<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
};

interface User {
  id: number;
  name: string;
  password: string;
}

type PublicUser = OmitByKey<User, 'password'>;
// { id: number; name: string }
```

## 内置映射类型

TypeScript 内置了常用的映射类型：

```typescript
// Partial<T>：所有属性可选
type A = Partial<{ a: string; b: number }>;
// { a?: string; b?: number }

// Required<T>：所有属性必填
type B = Required<{ a?: string; b?: number }>;
// { a: string; b: number }

// Readonly<T>：所有属性只读
type C = Readonly<{ a: string }>;
// { readonly a: string }

// Record<K, V>：创建键值类型
type D = Record<'a' | 'b', number>;
// { a: number; b: number }

// Pick<T, K>：选取部分属性
type E = Pick<{ a: string; b: number }, 'a'>;
// { a: string }

// Omit<T, K>：排除部分属性
type F = Omit<{ a: string; b: number }, 'a'>;
// { b: number }
```

## 实战示例

### 表单状态

```typescript
interface FormFields {
  username: string;
  email: string;
  age: number;
}

// 每个字段的状态
type FieldState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
    touched: boolean;
  }
};

type FormState = FieldState<FormFields>;
// {
//   username: { value: string; error: string | null; touched: boolean };
//   email: { value: string; error: string | null; touched: boolean };
//   age: { value: number; error: string | null; touched: boolean };
// }
```

### API 响应包装

```typescript
interface Endpoints {
  users: User[];
  posts: Post[];
  comments: Comment[];
}

// 包装成 API 响应格式
type APIResponse<T> = {
  [K in keyof T]: {
    data: T[K];
    loading: boolean;
    error: Error | null;
  }
};

type AppState = APIResponse<Endpoints>;
```

### 事件处理器映射

```typescript
interface Events {
  click: MouseEvent;
  keydown: KeyboardEvent;
  scroll: Event;
}

// 生成事件处理器类型
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]: (event: T[K]) => void
};

type Handlers = EventHandlers<Events>;
// {
//   onClick: (event: MouseEvent) => void;
//   onKeydown: (event: KeyboardEvent) => void;
//   onScroll: (event: Event) => void;
// }
```

## 总结

**映射类型语法**：`{ [K in keyof T]: ... }`

**核心能力**：
- 遍历对象类型的所有键
- 添加/移除修饰符（`?`, `readonly`）
- 转换值类型
- 重映射键名（`as` 语法）

**常用内置类型**：
- `Partial<T>` / `Required<T>`
- `Readonly<T>`
- `Pick<T, K>` / `Omit<T, K>`
- `Record<K, V>`

**记住**：映射类型是基于现有类型批量生成新类型的利器。
