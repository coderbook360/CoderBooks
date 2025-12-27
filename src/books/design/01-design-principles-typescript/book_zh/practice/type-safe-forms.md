# 实战：类型安全的表单系统

表单是前端应用的核心功能。类型安全的表单可以防止字段名拼错、类型不匹配。

## 问题：不安全的表单

```typescript
// ❌ 松散类型，容易出错
const [formData, setFormData] = useState({});

function handleChange(e) {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value  // 任何字段名都可以
  });
}

function handleSubmit() {
  console.log(formData.usename);  // 拼写错误不报错
}
```

## 步骤 1：定义表单 Schema

```typescript
import { z } from 'zod';

// 用户注册表单 Schema
const RegisterFormSchema = z.object({
  username: z.string()
    .min(3, '用户名至少 3 个字符')
    .max(20, '用户名最多 20 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字和下划线'),
  
  email: z.string()
    .email('请输入有效的邮箱地址'),
  
  password: z.string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '需要至少一个大写字母')
    .regex(/[0-9]/, '需要至少一个数字'),
  
  confirmPassword: z.string(),
  
  age: z.number()
    .min(18, '必须年满 18 岁')
    .max(120, '年龄不能超过 120'),
  
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: '必须同意服务条款' })
  })
}).refine(data => data.password === data.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword']
});

// 从 Schema 推断类型
type RegisterForm = z.infer<typeof RegisterFormSchema>;
```

## 步骤 2：类型安全的表单状态

```typescript
// 表单字段状态
interface FieldState<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

// 表单状态类型
type FormState<T> = {
  [K in keyof T]: FieldState<T[K]>
};

// 创建初始状态
function createInitialState<T extends Record<string, any>>(
  defaults: T
): FormState<T> {
  const state = {} as FormState<T>;
  for (const key in defaults) {
    state[key] = {
      value: defaults[key],
      error: null,
      touched: false,
      dirty: false
    };
  }
  return state;
}

// 使用
const initialState = createInitialState<RegisterForm>({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  age: 18,
  agreeToTerms: false
});
```

## 步骤 3：React Hook Form 集成

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterForm>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: 18,
      agreeToTerms: false
    }
  });

  const onSubmit = async (data: RegisterForm) => {
    // data 是完全类型安全的
    await api.register(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('username')} placeholder="用户名" />
        {errors.username && <span>{errors.username.message}</span>}
      </div>

      <div>
        <input {...register('email')} placeholder="邮箱" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input 
          type="password" 
          {...register('password')} 
          placeholder="密码" 
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <div>
        <input 
          type="password" 
          {...register('confirmPassword')} 
          placeholder="确认密码" 
        />
        {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      </div>

      <div>
        <input 
          type="number" 
          {...register('age', { valueAsNumber: true })} 
        />
        {errors.age && <span>{errors.age.message}</span>}
      </div>

      <div>
        <label>
          <input type="checkbox" {...register('agreeToTerms')} />
          同意服务条款
        </label>
        {errors.agreeToTerms && <span>{errors.agreeToTerms.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '提交中...' : '注册'}
      </button>
    </form>
  );
}
```

## 步骤 4：通用表单组件

```typescript
// 类型安全的 Input 组件
interface InputProps<T extends Record<string, any>> {
  name: keyof T;
  label: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: 'text' | 'email' | 'password' | 'number';
}

function Input<T extends Record<string, any>>({
  name,
  label,
  register,
  errors,
  type = 'text'
}: InputProps<T>) {
  const error = errors[name];
  
  return (
    <div className="field">
      <label htmlFor={String(name)}>{label}</label>
      <input
        id={String(name)}
        type={type}
        {...register(name)}
        className={error ? 'error' : ''}
      />
      {error && (
        <span className="error-message">
          {error.message as string}
        </span>
      )}
    </div>
  );
}

// 使用
<Input<RegisterForm>
  name="username"
  label="用户名"
  register={register}
  errors={errors}
/>
```

## 步骤 5：动态表单字段

```typescript
import { useFieldArray } from 'react-hook-form';

// Schema 包含数组
const OrderFormSchema = z.object({
  customer: z.string().min(1),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1)
  })).min(1, '至少添加一个商品')
});

type OrderForm = z.infer<typeof OrderFormSchema>;

function OrderForm() {
  const { register, control, handleSubmit } = useForm<OrderForm>({
    resolver: zodResolver(OrderFormSchema)
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('customer')} />
      
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`items.${index}.productId`)} />
          <input 
            type="number" 
            {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
          />
          <button type="button" onClick={() => remove(index)}>
            删除
          </button>
        </div>
      ))}
      
      <button 
        type="button" 
        onClick={() => append({ productId: '', quantity: 1 })}
      >
        添加商品
      </button>
      
      <button type="submit">提交订单</button>
    </form>
  );
}
```

## 步骤 6：条件验证

```typescript
// 根据条件启用不同验证规则
const ContactFormSchema = z.object({
  contactMethod: z.enum(['email', 'phone', 'mail']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional()
}).refine(data => {
  switch (data.contactMethod) {
    case 'email':
      return !!data.email;
    case 'phone':
      return !!data.phone;
    case 'mail':
      return !!data.address;
  }
}, {
  message: '请填写对应的联系方式',
  path: ['contactMethod']
});

// 或使用 superRefine 进行更精细控制
const ContactFormSchemaV2 = z.object({
  contactMethod: z.enum(['email', 'phone']),
  email: z.string().optional(),
  phone: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.contactMethod === 'email' && !data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '请填写邮箱',
      path: ['email']
    });
  }
  if (data.contactMethod === 'phone' && !data.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '请填写电话',
      path: ['phone']
    });
  }
});
```

## 步骤 7：表单与 API 类型统一

```typescript
// 共享 Schema
// schemas/user.ts
export const CreateUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8)
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

// 表单使用
function RegisterForm() {
  const form = useForm<CreateUser>({
    resolver: zodResolver(CreateUserSchema)
  });
  // ...
}

// API 使用
async function createUser(data: CreateUser) {
  // 发送前再次验证
  const validated = CreateUserSchema.parse(data);
  return api.post('/users', validated);
}
```

## 总结

**类型安全表单要点**：

- **Zod Schema**：类型 + 验证统一
- **React Hook Form**：类型安全的表单库
- **zodResolver**：连接 Zod 和 RHF
- **泛型组件**：可复用的类型安全组件

**好处**：
- 字段名自动补全
- 验证规则集中管理
- 类型与 API 统一
- 编译时发现错误

**记住**：表单类型安全 = 更少的 bug + 更好的开发体验。
