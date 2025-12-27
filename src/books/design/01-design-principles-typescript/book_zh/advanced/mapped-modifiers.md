# 映射类型修饰符

映射类型可以**添加**或**移除** `readonly` 和 `?` 修饰符。

## 修饰符语法

```typescript
// 添加修饰符：直接写
type AddReadonly<T> = {
  readonly [K in keyof T]: T[K]
};

// 移除修饰符：使用 - 前缀
type RemoveReadonly<T> = {
  -readonly [K in keyof T]: T[K]
};
```

## readonly 修饰符

### 添加 readonly

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
};

interface User {
  id: number;
  name: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string }

const user: ReadonlyUser = { id: 1, name: 'John' };
user.name = 'Jane';  // ❌ 错误：不能修改只读属性
```

### 移除 readonly

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
};

interface FrozenUser {
  readonly id: number;
  readonly name: string;
}

type MutableUser = Mutable<FrozenUser>;
// { id: number; name: string }

const user: MutableUser = { id: 1, name: 'John' };
user.name = 'Jane';  // ✅ 可以修改
```

## 可选修饰符 ?

### 添加可选

```typescript
type Partial<T> = {
  [K in keyof T]?: T[K]
};

interface Config {
  debug: boolean;
  timeout: number;
}

type PartialConfig = Partial<Config>;
// { debug?: boolean; timeout?: number }

const config: PartialConfig = { debug: true };  // timeout 可省略
```

### 移除可选

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

const options: RequiredOptions = {
  debug: true,
  timeout: 3000  // 必须提供
};
```

## 组合使用

### 同时添加 readonly 和可选

```typescript
type ReadonlyPartial<T> = {
  readonly [K in keyof T]?: T[K]
};

interface State {
  count: number;
  name: string;
}

type Props = ReadonlyPartial<State>;
// { readonly count?: number; readonly name?: string }
```

### 同时移除 readonly 和可选

```typescript
type MutableRequired<T> = {
  -readonly [K in keyof T]-?: T[K]
};

interface FrozenPartialState {
  readonly count?: number;
  readonly name?: string;
}

type EditableState = MutableRequired<FrozenPartialState>;
// { count: number; name: string }
```

## 保留原有修饰符

默认情况下，映射类型会**保留**原有修饰符：

```typescript
type Clone<T> = {
  [K in keyof T]: T[K]
};

interface User {
  readonly id: number;
  name?: string;
}

type ClonedUser = Clone<User>;
// { readonly id: number; name?: string }
// 原有修饰符被保留
```

## 选择性修改

### 只对部分属性操作

```typescript
// 只让指定属性可选
type PartialBy<T, K extends keyof T> = 
  Omit<T, K> & Partial<Pick<T, K>>;

interface User {
  id: number;
  name: string;
  email: string;
}

type OptionalEmail = PartialBy<User, 'email'>;
// { id: number; name: string; email?: string }
```

### 只让指定属性只读

```typescript
// 只让指定属性只读
type ReadonlyBy<T, K extends keyof T> = 
  Omit<T, K> & Readonly<Pick<T, K>>;

interface User {
  id: number;
  name: string;
}

type IdReadonly = ReadonlyBy<User, 'id'>;
// { id: readonly number; name: string } 
// 等同于 { readonly id: number; name: string }
```

## 实战示例

### 表单数据与只读视图

```typescript
interface FormData {
  username: string;
  email: string;
  age: number;
}

// 编辑模式：全部可修改
type EditableForm = FormData;

// 查看模式：全部只读
type ReadonlyForm = Readonly<FormData>;

// 部分可编辑
type PartialEditForm = Readonly<Omit<FormData, 'email'>> & Pick<FormData, 'email'>;
// { readonly username: string; readonly age: number; email: string }
```

### 配置合并

```typescript
interface FullConfig {
  debug: boolean;
  timeout: number;
  retries: number;
  baseUrl: string;
}

// 用户配置：全部可选
type UserConfig = Partial<FullConfig>;

// 默认配置：必须完整
type DefaultConfig = Required<FullConfig>;

// 合并函数
function mergeConfig(
  defaults: DefaultConfig, 
  user: UserConfig
): DefaultConfig {
  return { ...defaults, ...user };
}
```

### 状态管理

```typescript
interface AppState {
  user: User | null;
  posts: Post[];
  loading: boolean;
}

// 初始化时：全部可选
type InitialState = Partial<AppState>;

// 运行时：全部必填且只读
type RuntimeState = Readonly<Required<AppState>>;

// 更新时：Partial 且去掉 readonly
type StateUpdate = Partial<{
  -readonly [K in keyof AppState]: AppState[K]
}>;
```

### 深度修饰符

```typescript
// 深度只读
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object 
    ? DeepReadonly<T[K]> 
    : T[K]
};

// 深度可选
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object 
    ? DeepPartial<T[K]> 
    : T[K]
};

interface Nested {
  a: {
    b: {
      c: number;
    };
  };
}

type DeepRO = DeepReadonly<Nested>;
// { readonly a: { readonly b: { readonly c: number } } }
```

## 总结

**修饰符操作**：
- `readonly`：添加只读
- `-readonly`：移除只读
- `?`：添加可选
- `-?`：移除可选

**内置类型**：
- `Readonly<T>`：添加 readonly
- `Partial<T>`：添加 ?
- `Required<T>`：移除 ?

**组合策略**：
- 可以同时操作多个修饰符
- 用 `Pick`/`Omit` 选择性操作部分属性
- 递归实现深度修饰

**记住**：修饰符控制类型的可变性和可选性，是类型安全的重要工具。
