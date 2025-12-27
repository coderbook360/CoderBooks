# 运行时类型检查

TypeScript 类型只在编译时存在，运行时会被擦除。

对于外部数据（API 响应、用户输入），需要**运行时验证**。

## 问题：编译时 vs 运行时

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// 编译时：类型正确
async function getUser(): Promise<User> {
  const res = await fetch('/api/user');
  return res.json();  // 实际返回什么？不确定！
}

// 运行时：可能崩溃
const user = await getUser();
console.log(user.email.toLowerCase());  // 如果 email 是 null 就崩溃
```

## Zod：Schema 验证库

[Zod](https://zod.dev) 是最流行的运行时验证库。

### 基本使用

```typescript
import { z } from 'zod';

// 定义 Schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150).optional()
});

// 从 Schema 推断类型
type User = z.infer<typeof UserSchema>;
// { id: string; name: string; email: string; age?: number }

// 验证数据
const result = UserSchema.safeParse(data);
if (result.success) {
  console.log(result.data);  // User 类型
} else {
  console.error(result.error);  // ZodError
}
```

### 常用验证

```typescript
// 字符串
z.string()
z.string().min(1)
z.string().max(100)
z.string().email()
z.string().url()
z.string().uuid()
z.string().regex(/^[a-z]+$/)

// 数字
z.number()
z.number().int()
z.number().positive()
z.number().min(0).max(100)

// 布尔
z.boolean()

// 日期
z.date()
z.string().datetime()  // ISO 日期字符串

// 枚举
z.enum(['admin', 'user', 'guest'])

// 字面量
z.literal('active')

// 联合类型
z.union([z.string(), z.number()])
z.string().or(z.number())

// 可选
z.string().optional()

// 可空
z.string().nullable()

// 默认值
z.string().default('anonymous')
```

### 对象验证

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/)
});

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  address: AddressSchema,  // 嵌套对象
  tags: z.array(z.string()),  // 数组
  metadata: z.record(z.string(), z.any())  // Record 类型
});

// 部分可选
const PartialUserSchema = UserSchema.partial();

// 只取部分字段
const UserBasicSchema = UserSchema.pick({ name: true, email: true });

// 排除部分字段
const UserWithoutAddressSchema = UserSchema.omit({ address: true });

// 扩展
const AdminSchema = UserSchema.extend({
  role: z.literal('admin'),
  permissions: z.array(z.string())
});
```

### 数组验证

```typescript
const NumberArraySchema = z.array(z.number());
const NonEmptyArraySchema = z.array(z.string()).nonempty();
const LimitedArraySchema = z.array(z.string()).min(1).max(10);

// 元组
const PointSchema = z.tuple([z.number(), z.number()]);
type Point = z.infer<typeof PointSchema>;  // [number, number]
```

### 可辨识联合

```typescript
const ResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.any() }),
  z.object({ status: z.literal('error'), error: z.string() })
]);

type Result = z.infer<typeof ResultSchema>;
// { status: 'success'; data: any } | { status: 'error'; error: string }
```

## API 响应验证

```typescript
const APIResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string()
    }).optional()
  });

const UsersResponseSchema = APIResponseSchema(z.array(UserSchema));

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  const json = await res.json();
  
  const result = UsersResponseSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid API response: ${result.error.message}`);
  }
  
  return result.data.data;
}
```

## 表单验证

```typescript
const LoginFormSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string().min(8, '密码至少8位')
});

const RegisterFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword']
});

// React Hook Form 集成
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(LoginFormSchema)
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button type="submit">登录</button>
    </form>
  );
}
```

## 环境变量验证

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_URL: z.string().url(),
  API_KEY: z.string().min(1),
  DEBUG: z.string().transform(s => s === 'true').default('false')
});

// 验证并导出
const env = EnvSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  apiUrl: env.API_URL,
  apiKey: env.API_KEY,
  debug: env.DEBUG
};
```

## io-ts 替代方案

```typescript
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';

const User = t.type({
  id: t.string,
  name: t.string,
  email: t.string
});

type User = t.TypeOf<typeof User>;

const result = User.decode(data);
if (isRight(result)) {
  console.log(result.right);  // User
} else {
  console.error(result.left);  // Errors
}
```

## 自定义验证

```typescript
// 自定义验证逻辑
const PasswordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), '需要大写字母')
  .refine(val => /[a-z]/.test(val), '需要小写字母')
  .refine(val => /[0-9]/.test(val), '需要数字');

// 转换
const NumberFromString = z.string().transform(val => parseInt(val, 10));
type Num = z.infer<typeof NumberFromString>;  // number

// 带类型守卫的验证
function isUser(data: unknown): data is User {
  return UserSchema.safeParse(data).success;
}
```

## 总结

**运行时验证要点**：

- **外部数据必须验证**：API 响应、用户输入、环境变量
- **Zod 是首选**：类型推断、验证、转换一体
- **Schema = 类型 + 验证**：不需要重复定义

**Zod 核心**：
- `z.object/array/string/number`：基本 Schema
- `safeParse/parse`：验证方法
- `z.infer<typeof Schema>`：类型推断
- `refine/transform`：自定义逻辑

**记住**：编译时类型 + 运行时验证 = 完整的类型安全。
