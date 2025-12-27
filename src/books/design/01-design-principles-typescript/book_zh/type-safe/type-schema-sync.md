# 类型与 Schema 统一

在大型项目中，类型定义和验证 Schema 容易**不同步**。

解决方案：**单一数据源**，从一处推导出类型和验证。

## 问题：类型与验证分离

```typescript
// ❌ 类型定义
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

// ❌ 验证逻辑（可能与类型不一致）
function validateUser(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string'
    // 忘了检查 age？类型是可选的
  );
}
```

## 方案 1：从 Schema 推断类型

使用 Zod，Schema 即类型源：

```typescript
import { z } from 'zod';

// ✅ Schema 是唯一数据源
const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).optional()
});

// 从 Schema 推断类型
type User = z.infer<typeof UserSchema>;
// { id: string; name: string; email: string; age?: number }

// 验证使用同一 Schema
const result = UserSchema.safeParse(data);
```

## 方案 2：从类型生成 Schema

使用 `zod-to-ts` 或手动保持同步：

```typescript
// 类型优先
interface User {
  id: string;
  name: string;
  email: string;
}

// Schema 必须匹配类型
const UserSchema: z.ZodType<User> = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email()
});

// 如果 Schema 不匹配 User 类型，编译报错
```

## 完整的数据层架构

```typescript
// schemas/user.ts
import { z } from 'zod';

// 基础 Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime()
});

// 从 Schema 推断类型
export type User = z.infer<typeof UserSchema>;

// 创建用户 DTO（省略 id 和 createdAt）
export const CreateUserSchema = UserSchema.omit({ 
  id: true, 
  createdAt: true 
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

// 更新用户 DTO（全部可选）
export const UpdateUserSchema = UserSchema.partial().omit({ id: true });
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// 列表响应
export const UsersResponseSchema = z.object({
  data: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number()
});
export type UsersResponse = z.infer<typeof UsersResponseSchema>;
```

## API 层类型统一

```typescript
// api/client.ts
import { z } from 'zod';

async function apiRequest<T extends z.ZodType>(
  url: string,
  schema: T,
  options?: RequestInit
): Promise<z.infer<T>> {
  const res = await fetch(url, options);
  const json = await res.json();
  
  // 运行时验证
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(`API validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

// api/users.ts
import { UserSchema, UsersResponseSchema, CreateUserSchema } from '../schemas/user';

export async function getUsers() {
  return apiRequest('/api/users', UsersResponseSchema);
}

export async function getUser(id: string) {
  return apiRequest(`/api/users/${id}`, UserSchema);
}

export async function createUser(data: CreateUser) {
  // 发送前验证
  const validated = CreateUserSchema.parse(data);
  
  return apiRequest('/api/users', UserSchema, {
    method: 'POST',
    body: JSON.stringify(validated)
  });
}
```

## 表单与 Schema 统一

```typescript
// components/UserForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUserSchema, CreateUser } from '../schemas/user';

function UserForm({ onSubmit }: { onSubmit: (data: CreateUser) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateUser>({
    resolver: zodResolver(CreateUserSchema)
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <select {...register('role')}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
        <option value="guest">Guest</option>
      </select>
      
      <button type="submit">Create</button>
    </form>
  );
}
```

## 数据库与 Schema 统一

```typescript
// 使用 Drizzle ORM 示例
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// 数据库表定义
const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// 从表定义生成 Schema
const insertUserSchema = createInsertSchema(users);
const selectUserSchema = createSelectSchema(users);

// 类型也自动生成
type InsertUser = z.infer<typeof insertUserSchema>;
type User = z.infer<typeof selectUserSchema>;
```

## OpenAPI 与 Schema 统一

```typescript
// 使用 zod-to-openapi
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  name: z.string().openapi({ example: 'John Doe' }),
  email: z.string().email().openapi({ example: 'john@example.com' })
}).openapi('User');

// 生成 OpenAPI 文档时，Schema 自动转换
```

## 多层数据同步

```typescript
// schemas/index.ts - 统一管理所有 Schema

// 核心实体
export * from './user';
export * from './post';
export * from './comment';

// API 响应
export * from './api-response';

// 表单
export * from './forms';

// 保持一致性的辅助函数
export function assertType<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function isValidType<T>(schema: z.ZodType<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}
```

## 版本化 Schema

```typescript
// 处理 API 版本变化
const UserSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

const UserSchemaV2 = UserSchemaV1.extend({
  avatar: z.string().url().optional(),
  role: z.enum(['admin', 'user'])
});

// 迁移函数
function migrateUserV1ToV2(v1: z.infer<typeof UserSchemaV1>): z.infer<typeof UserSchemaV2> {
  return {
    ...v1,
    role: 'user'  // 默认值
  };
}
```

## 总结

**类型与 Schema 统一的核心**：

- **单一数据源**：Schema 或类型二选一作为源
- **Zod 推荐**：从 Schema 推断类型最方便
- **全栈统一**：API、表单、数据库使用同一 Schema

**实践模式**：
- `z.infer<typeof Schema>` 推断类型
- `schema.parse/safeParse` 运行时验证
- `@hookform/resolvers/zod` 表单集成
- `drizzle-zod` 数据库集成

**好处**：
- 类型和验证永远一致
- 修改一处，全部更新
- 减少重复代码
- 降低出错概率

**记住**：一个 Schema，一个类型，一份代码。
