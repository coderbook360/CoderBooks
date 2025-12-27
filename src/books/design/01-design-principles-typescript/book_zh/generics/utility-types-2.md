# 泛型工具类型 2

本章继续介绍三个重要的工具类型：`Omit`、`Record`、`Exclude`。

## Omit\<T, K\>

从类型 T 中**排除**指定的属性 K。与 Pick 相反。

### 类型定义

```typescript
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

### 使用示例

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type PublicUser = Omit<User, 'password'>;
// 等价于：
// {
//   id: number;
//   name: string;
//   email: string;
// }

type CreateUserInput = Omit<User, 'id'>;
// 创建时不需要 id（服务端生成）
```

### 实际应用

**1. 移除敏感字段**

```typescript
interface DatabaseUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt: Date;
}

// API 响应不含敏感信息
type ApiUser = Omit<DatabaseUser, 'passwordHash'>;

function toApiUser(user: DatabaseUser): ApiUser {
  const { passwordHash, ...publicData } = user;
  return publicData;
}
```

**2. 创建输入类型**

```typescript
interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

// 创建时服务端自动生成的字段
type CreatePostInput = Omit<Post, 'id' | 'createdAt' | 'updatedAt'>;

function createPost(input: CreatePostInput): Post {
  return {
    ...input,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
```

**3. 扩展组件 Props**

```typescript
interface ButtonProps {
  type: 'button' | 'submit' | 'reset';
  onClick: () => void;
  disabled: boolean;
}

// 自定义按钮，onClick 由内部处理
type CustomButtonProps = Omit<ButtonProps, 'onClick'> & {
  onCustomClick: (data: CustomData) => void;
};
```

## Record\<K, V\>

创建一个对象类型，键为 K，值为 V。

### 类型定义

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

### 使用示例

```typescript
// 字符串键，数字值
type StringNumberMap = Record<string, number>;
const scores: StringNumberMap = {
  alice: 100,
  bob: 90
};

// 特定键的映射
type Status = 'pending' | 'success' | 'error';
type StatusMessages = Record<Status, string>;

const messages: StatusMessages = {
  pending: 'Loading...',
  success: 'Done!',
  error: 'Failed!'
};
```

### 实际应用

**1. 状态配置**

```typescript
type Theme = 'light' | 'dark' | 'auto';

interface ThemeConfig {
  background: string;
  text: string;
  accent: string;
}

const themes: Record<Theme, ThemeConfig> = {
  light: { background: '#fff', text: '#000', accent: '#007bff' },
  dark: { background: '#1a1a1a', text: '#fff', accent: '#4dabf7' },
  auto: { background: 'inherit', text: 'inherit', accent: '#007bff' }
};
```

**2. 权限映射**

```typescript
type Role = 'admin' | 'editor' | 'viewer';
type Permission = 'read' | 'write' | 'delete';

const permissions: Record<Role, Permission[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read']
};

function hasPermission(role: Role, permission: Permission): boolean {
  return permissions[role].includes(permission);
}
```

**3. 缓存结构**

```typescript
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

type Cache<T> = Record<string, CacheEntry<T>>;

const userCache: Cache<User> = {
  'user:1': { value: user1, expiry: Date.now() + 3600000 },
  'user:2': { value: user2, expiry: Date.now() + 3600000 }
};
```

**4. 表单验证**

```typescript
type FormFields = 'name' | 'email' | 'password';

interface FieldError {
  message: string;
  type: 'required' | 'format' | 'length';
}

type FormErrors = Record<FormFields, FieldError | null>;

const errors: FormErrors = {
  name: null,
  email: { message: 'Invalid email', type: 'format' },
  password: { message: 'Too short', type: 'length' }
};
```

## Exclude\<T, U\>

从联合类型 T 中**排除**可以赋值给 U 的类型。

### 类型定义

```typescript
type Exclude<T, U> = T extends U ? never : T;
```

### 使用示例

```typescript
type AllTypes = string | number | boolean | null | undefined;

type NonNullTypes = Exclude<AllTypes, null | undefined>;
// string | number | boolean

type Primitives = Exclude<AllTypes, null | undefined | boolean>;
// string | number
```

### 原理解释

Exclude 利用了**分布式条件类型**：

```typescript
type Exclude<T, U> = T extends U ? never : T;

// Exclude<'a' | 'b' | 'c', 'a'> 的计算过程：
// = ('a' extends 'a' ? never : 'a') | ('b' extends 'a' ? never : 'b') | ('c' extends 'a' ? never : 'c')
// = never | 'b' | 'c'
// = 'b' | 'c'
```

### 实际应用

**1. 过滤事件类型**

```typescript
type MouseEvent = 'click' | 'dblclick' | 'mousedown' | 'mouseup';
type KeyboardEvent = 'keydown' | 'keyup' | 'keypress';
type AllEvents = MouseEvent | KeyboardEvent;

type NonClickEvents = Exclude<AllEvents, 'click' | 'dblclick'>;
// 'mousedown' | 'mouseup' | 'keydown' | 'keyup' | 'keypress'
```

**2. 移除某些状态**

```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
type ActiveStatus = Exclude<Status, 'idle'>;
// 'loading' | 'success' | 'error'

function handleActiveState(status: ActiveStatus) {
  // 只处理活跃状态
}
```

**3. 配合 keyof**

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type PublicKeys = Exclude<keyof User, 'password'>;
// 'id' | 'name' | 'email'

type PublicUser = Pick<User, PublicKeys>;
```

## 相关工具类型

### Extract\<T, U\>

与 Exclude 相反，**提取**可以赋值给 U 的类型。

```typescript
type Extract<T, U> = T extends U ? T : never;

type AllTypes = string | number | boolean | null;
type StringOrNumber = Extract<AllTypes, string | number>;
// string | number
```

### NonNullable\<T\>

排除 null 和 undefined。

```typescript
type NonNullable<T> = Exclude<T, null | undefined>;

type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string
```

## 三者对比

| 工具类型 | 作用对象 | 功能 |
|---------|---------|------|
| `Omit<T, K>` | 对象类型 | 排除指定属性 |
| `Record<K, V>` | 创建新类型 | 定义键值对类型 |
| `Exclude<T, U>` | 联合类型 | 排除指定成员 |

## 组合使用

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

// 1. 排除 id 字段
type UserWithoutId = Omit<User, 'id'>;

// 2. 只允许非 guest 角色
type ActiveRole = Exclude<User['role'], 'guest'>;

// 3. 创建角色权限映射
type RolePermissions = Record<ActiveRole, string[]>;

const permissions: RolePermissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write']
};
```

## 总结

- **Omit\<T, K\>**：从对象类型中排除属性，适用于创建输入类型
- **Record\<K, V\>**：创建键值对类型，适用于映射和配置
- **Exclude\<T, U\>**：从联合类型中排除成员，适用于类型过滤
- **组合使用**：这些工具类型可以灵活搭配

接下来，我们将学习如何创建自定义工具类型。
