# 泛型工具类型 1

TypeScript 内置了一系列**工具类型（Utility Types）**，它们是泛型的经典应用，可以对类型进行变换。

本章介绍最常用的三个：`Partial`、`Required`、`Pick`。

## Partial\<T\>

将类型 T 的所有属性变为**可选**。

### 类型定义

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

### 使用示例

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// 等价于：
// {
//   id?: number;
//   name?: string;
//   email?: string;
// }

const user: PartialUser = { name: 'Alice' }; // 只需要部分属性
```

### 实际应用

**1. 更新操作**

```typescript
function updateUser(id: number, updates: Partial<User>): User {
  const existingUser = findUser(id);
  return { ...existingUser, ...updates };
}

// 只更新需要改变的字段
updateUser(1, { name: 'Bob' });
updateUser(1, { email: 'bob@example.com' });
```

**2. 配置选项**

```typescript
interface Config {
  apiUrl: string;
  timeout: number;
  retries: number;
}

const defaultConfig: Config = {
  apiUrl: '/api',
  timeout: 5000,
  retries: 3
};

function createClient(options: Partial<Config> = {}): Config {
  return { ...defaultConfig, ...options };
}

// 只覆盖需要的选项
const client = createClient({ timeout: 10000 });
```

## Required\<T\>

将类型 T 的所有属性变为**必选**。与 Partial 相反。

### 类型定义

```typescript
type Required<T> = {
  [P in keyof T]-?: T[P];
};
```

`-?` 表示移除可选标记。

### 使用示例

```typescript
interface Config {
  apiUrl?: string;
  timeout?: number;
}

type RequiredConfig = Required<Config>;
// 等价于：
// {
//   apiUrl: string;
//   timeout: number;
// }

// ❌ 错误：缺少必需属性
const config: RequiredConfig = { apiUrl: '/api' };

// ✅ 正确
const config: RequiredConfig = { apiUrl: '/api', timeout: 5000 };
```

### 实际应用

**1. 验证后的数据**

```typescript
interface FormData {
  name?: string;
  email?: string;
  age?: number;
}

function validateForm(data: FormData): Required<FormData> {
  if (!data.name || !data.email || !data.age) {
    throw new Error('All fields are required');
  }
  return data as Required<FormData>;
}

// 验证后的数据所有字段都是必需的
const validData = validateForm({ name: 'Alice', email: 'a@b.com', age: 25 });
console.log(validData.name); // 不需要处理 undefined
```

**2. 构造函数参数**

```typescript
interface Options {
  debug?: boolean;
  cache?: boolean;
}

class Service {
  private options: Required<Options>;
  
  constructor(options: Options = {}) {
    // 内部使用时保证所有属性都有值
    this.options = {
      debug: options.debug ?? false,
      cache: options.cache ?? true
    };
  }
}
```

## Pick\<T, K\>

从类型 T 中**选取**指定的属性 K。

### 类型定义

```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};
```

### 使用示例

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
// 等价于：
// {
//   id: number;
//   name: string;
//   email: string;
// }

// 返回给前端的用户数据（不含敏感信息）
function getPublicUserInfo(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}
```

### 实际应用

**1. API 响应**

```typescript
interface Post {
  id: number;
  title: string;
  content: string;
  author: User;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

// 列表接口只返回基本信息
type PostListItem = Pick<Post, 'id' | 'title' | 'createdAt'>;

// 详情接口返回完整信息
type PostDetail = Post;

function getPostList(): PostListItem[] { /* ... */ }
function getPostDetail(id: number): PostDetail { /* ... */ }
```

**2. 表单状态**

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// 编辑表单只需要可编辑的字段
type EditableFields = Pick<User, 'name' | 'email'>;

function updateProfile(userId: number, data: EditableFields) {
  // id 和 role 不能被用户修改
}
```

**3. 组合使用**

```typescript
// Pick + Partial：部分字段的可选更新
type UserUpdate = Partial<Pick<User, 'name' | 'email'>>;

function updateUser(id: number, data: UserUpdate) {
  // name 和 email 都是可选的
}

updateUser(1, { name: 'Alice' }); // ✅
updateUser(1, { email: 'a@b.com' }); // ✅
updateUser(1, {}); // ✅
```

## 三者对比

| 工具类型 | 作用 | 使用场景 |
|---------|------|---------|
| `Partial<T>` | 全部可选 | 更新操作、配置合并 |
| `Required<T>` | 全部必需 | 验证后数据、内部状态 |
| `Pick<T, K>` | 选取部分 | API 响应、表单字段 |

## 组合技巧

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  settings?: UserSettings;
}

// 只选取必要字段，并全部设为可选
type ProfileUpdate = Partial<Pick<User, 'name' | 'email' | 'avatar'>>;

// 选取字段后，全部设为必需
type CreateUserInput = Required<Pick<User, 'name' | 'email'>>;
```

## 总结

- **Partial\<T\>**：所有属性变可选，适用于更新操作
- **Required\<T\>**：所有属性变必需，适用于验证后的数据
- **Pick\<T, K\>**：选取指定属性，适用于 API 响应和表单
- **组合使用**：这些工具类型可以灵活组合

接下来，我们将学习更多工具类型：`Omit`、`Record`、`Exclude`。
