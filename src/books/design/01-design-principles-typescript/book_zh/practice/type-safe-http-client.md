# 实战：类型安全的 HTTP 客户端

HTTP 请求是前端应用与后端通信的核心。类型安全的 HTTP 客户端可以防止 URL 拼错、参数类型错误。

## 问题：不安全的请求

```typescript
// ❌ 松散类型
const response = await fetch('/api/users/123');
const data = await response.json();  // any

// 使用时没有类型提示
console.log(data.username);  // 可能拼错
console.log(data.age + 1);   // age 可能是字符串
```

## 步骤 1：定义 API 类型

```typescript
import { z } from 'zod';

// 用户相关 API
const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  createdAt: z.string().datetime()
});

const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
const UpdateUserSchema = CreateUserSchema.partial();

type User = z.infer<typeof UserSchema>;
type CreateUser = z.infer<typeof CreateUserSchema>;
type UpdateUser = z.infer<typeof UpdateUserSchema>;

// API 端点定义
interface APIEndpoints {
  'GET /users': {
    response: User[];
  };
  'GET /users/:id': {
    params: { id: string };
    response: User;
  };
  'POST /users': {
    body: CreateUser;
    response: User;
  };
  'PUT /users/:id': {
    params: { id: string };
    body: UpdateUser;
    response: User;
  };
  'DELETE /users/:id': {
    params: { id: string };
    response: void;
  };
}
```

## 步骤 2：类型安全的请求函数

```typescript
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type Endpoint<M extends HTTPMethod, P extends string> = `${M} ${P}`;

type EndpointParams<E extends keyof APIEndpoints> = 
  APIEndpoints[E] extends { params: infer P } ? P : never;

type EndpointBody<E extends keyof APIEndpoints> = 
  APIEndpoints[E] extends { body: infer B } ? B : never;

type EndpointResponse<E extends keyof APIEndpoints> = 
  APIEndpoints[E] extends { response: infer R } ? R : never;

// 构建请求选项类型
type RequestOptions<E extends keyof APIEndpoints> = 
  (EndpointParams<E> extends never ? {} : { params: EndpointParams<E> }) &
  (EndpointBody<E> extends never ? {} : { body: EndpointBody<E> });
```

## 步骤 3：实现 HTTP 客户端

```typescript
class TypedHTTPClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url = url.replace(`:${key}`, value);
      }
    }
    return `${this.baseUrl}${url}`;
  }

  async request<E extends keyof APIEndpoints>(
    endpoint: E,
    options?: RequestOptions<E>
  ): Promise<EndpointResponse<E>> {
    const [method, path] = (endpoint as string).split(' ');
    
    const opts = options as { params?: Record<string, string>; body?: unknown };
    const url = this.buildUrl(path, opts?.params);
    
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (opts?.body) {
      fetchOptions.body = JSON.stringify(opts.body);
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (response.status === 204) {
      return undefined as EndpointResponse<E>;
    }
    
    return response.json();
  }

  // 便捷方法
  get<E extends keyof APIEndpoints & `GET ${string}`>(
    endpoint: E,
    options?: RequestOptions<E>
  ) {
    return this.request(endpoint, options);
  }

  post<E extends keyof APIEndpoints & `POST ${string}`>(
    endpoint: E,
    options: RequestOptions<E>
  ) {
    return this.request(endpoint, options);
  }

  put<E extends keyof APIEndpoints & `PUT ${string}`>(
    endpoint: E,
    options: RequestOptions<E>
  ) {
    return this.request(endpoint, options);
  }

  delete<E extends keyof APIEndpoints & `DELETE ${string}`>(
    endpoint: E,
    options?: RequestOptions<E>
  ) {
    return this.request(endpoint, options);
  }
}
```

## 步骤 4：使用客户端

```typescript
const api = new TypedHTTPClient('https://api.example.com');

// ✅ 完全类型安全
const users = await api.get('GET /users');
// users: User[]

const user = await api.get('GET /users/:id', {
  params: { id: '123' }
});
// user: User

const newUser = await api.post('POST /users', {
  body: {
    username: 'john',
    email: 'john@example.com',
    role: 'user'
  }
});
// newUser: User

await api.delete('DELETE /users/:id', {
  params: { id: '123' }
});

// ❌ 类型错误
// api.get('GET /users/:id');  // 缺少 params
// api.post('POST /users', { body: { name: 'john' } });  // 字段错误
```

## 步骤 5：添加运行时验证

```typescript
// 端点 Schema 映射
const EndpointSchemas: Partial<Record<keyof APIEndpoints, z.ZodType>> = {
  'GET /users': z.array(UserSchema),
  'GET /users/:id': UserSchema,
  'POST /users': UserSchema,
  'PUT /users/:id': UserSchema
};

class ValidatedHTTPClient extends TypedHTTPClient {
  async request<E extends keyof APIEndpoints>(
    endpoint: E,
    options?: RequestOptions<E>
  ): Promise<EndpointResponse<E>> {
    const data = await super.request(endpoint, options);
    
    const schema = EndpointSchemas[endpoint];
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        console.error('API response validation failed:', result.error);
        throw new Error('Invalid API response');
      }
      return result.data;
    }
    
    return data;
  }
}
```

## 步骤 6：错误处理

```typescript
// 错误类型
interface APIError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

type APIResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: APIError };

class SafeHTTPClient extends TypedHTTPClient {
  async safeRequest<E extends keyof APIEndpoints>(
    endpoint: E,
    options?: RequestOptions<E>
  ): Promise<APIResult<EndpointResponse<E>>> {
    try {
      const data = await this.request(endpoint, options);
      return { ok: true, data };
    } catch (error) {
      if (error instanceof Response) {
        const apiError = await error.json() as APIError;
        return { ok: false, error: apiError };
      }
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// 使用
const result = await api.safeRequest('GET /users/:id', {
  params: { id: '123' }
});

if (result.ok) {
  console.log(result.data.username);  // User
} else {
  console.error(result.error.message);  // APIError
}
```

## 步骤 7：请求拦截器

```typescript
type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class InterceptableHTTPClient extends TypedHTTPClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }
}

// 使用
const api = new InterceptableHTTPClient('https://api.example.com');

// 添加 Authorization header
api.addRequestInterceptor(config => ({
  ...config,
  headers: {
    ...config.headers,
    Authorization: `Bearer ${getToken()}`
  }
}));

// 处理 401 响应
api.addResponseInterceptor(response => {
  if (response.status === 401) {
    redirectToLogin();
  }
  return response;
});
```

## 步骤 8：React Query 集成

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// 类型安全的 hooks
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('GET /users')
  });
}

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get('GET /users/:id', { params: { id } })
  });
}

function useCreateUser() {
  return useMutation({
    mutationFn: (data: CreateUser) => 
      api.post('POST /users', { body: data })
  });
}

// 使用
function UserList() {
  const { data: users, isLoading } = useUsers();
  
  if (isLoading) return <Spinner />;
  
  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.username}</li>
      ))}
    </ul>
  );
}
```

## 总结

**类型安全 HTTP 客户端要点**：

- **端点类型定义**：方法 + 路径 + 参数 + 响应
- **泛型请求函数**：根据端点推断类型
- **运行时验证**：Zod 校验响应
- **错误处理**：Result 类型包装

**好处**：
- URL 和参数自动补全
- 响应类型自动推断
- 编译时发现 API 调用错误
- 与 React Query 完美集成

**记住**：类型安全的 HTTP 客户端让 API 调用更可靠。
