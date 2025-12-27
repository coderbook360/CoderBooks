# 类型安全的 API 设计

设计 API 时，让类型系统帮你**预防错误**，而不是事后修复。

## 问题：不安全的 API

```typescript
// ❌ 松散的类型，容易出错
function request(url: string, options?: object): Promise<any> {
  return fetch(url, options).then(r => r.json());
}

// 调用时没有任何提示
const data = await request('/api/users');
data.whatever;  // 不报错，但可能运行时崩溃
```

## 设计类型安全的 API

### 1. 定义清晰的请求/响应类型

```typescript
// 定义 API 端点
interface APIEndpoints {
  '/api/users': {
    GET: { response: User[] };
    POST: { body: CreateUserDTO; response: User };
  };
  '/api/users/:id': {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: UpdateUserDTO; response: User };
    DELETE: { params: { id: string }; response: void };
  };
}
```

### 2. 类型安全的请求函数

```typescript
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type EndpointConfig<
  E extends keyof APIEndpoints,
  M extends keyof APIEndpoints[E]
> = APIEndpoints[E][M];

async function api<
  E extends keyof APIEndpoints,
  M extends keyof APIEndpoints[E] & HTTPMethod
>(
  method: M,
  endpoint: E,
  options?: Omit<EndpointConfig<E, M>, 'response'>
): Promise<EndpointConfig<E, M> extends { response: infer R } ? R : never> {
  // 实现略
  return {} as any;
}

// 使用
const users = await api('GET', '/api/users');
// users 类型是 User[]

const newUser = await api('POST', '/api/users', {
  body: { name: 'John', email: 'john@example.com' }
});
// newUser 类型是 User
```

### 3. 路径参数类型安全

```typescript
// 提取路径参数
type ExtractParams<S extends string> = 
  S extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams<Rest>
    : S extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type UserParams = ExtractParams<'/api/users/:id'>;
// { id: string }

// 使用
const user = await api('GET', '/api/users/:id', {
  params: { id: '123' }  // 必须提供 id
});
```

## 类型安全的响应处理

### 使用 Result 类型

```typescript
type APIResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: APIError };

interface APIError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

async function safeApi<T>(
  fn: () => Promise<T>
): Promise<APIResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    return { 
      ok: false, 
      error: { code: 'UNKNOWN', message: String(e) } 
    };
  }
}

// 使用
const result = await safeApi(() => api('GET', '/api/users'));
if (result.ok) {
  result.data;  // User[]
} else {
  result.error;  // APIError
}
```

### 可辨识的错误类型

```typescript
type APIError = 
  | { code: 'NOT_FOUND'; resource: string }
  | { code: 'VALIDATION'; fields: Record<string, string> }
  | { code: 'UNAUTHORIZED' }
  | { code: 'FORBIDDEN' }
  | { code: 'SERVER_ERROR'; message: string };

function handleError(error: APIError) {
  switch (error.code) {
    case 'NOT_FOUND':
      console.log(`${error.resource} not found`);
      break;
    case 'VALIDATION':
      Object.entries(error.fields).forEach(([field, msg]) => {
        console.log(`${field}: ${msg}`);
      });
      break;
    case 'UNAUTHORIZED':
      redirectToLogin();
      break;
    // ...
  }
}
```

## 分页与过滤

```typescript
// 通用分页参数
interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// 分页响应
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 特定资源的过滤器
interface UserFilters {
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
  search?: string;
}

// 组合使用
async function getUsers(
  params: PaginationParams & UserFilters
): Promise<PaginatedResponse<User>> {
  // 实现
}

const result = await getUsers({
  page: 1,
  limit: 20,
  role: 'admin',
  sort: 'createdAt',
  order: 'desc'
});
```

## 泛型 API 客户端

```typescript
class APIClient<Endpoints extends Record<string, any>> {
  constructor(private baseUrl: string) {}

  async get<E extends keyof Endpoints>(
    endpoint: E
  ): Promise<Endpoints[E]['response']> {
    const res = await fetch(`${this.baseUrl}${String(endpoint)}`);
    return res.json();
  }

  async post<E extends keyof Endpoints>(
    endpoint: E,
    body: Endpoints[E]['body']
  ): Promise<Endpoints[E]['response']> {
    const res = await fetch(`${this.baseUrl}${String(endpoint)}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  }
}

// 使用
const client = new APIClient<{
  '/users': { response: User[] };
  '/users/create': { body: CreateUserDTO; response: User };
}>('https://api.example.com');

const users = await client.get('/users');  // User[]
const user = await client.post('/users/create', { name: 'John' });  // User
```

## REST API 设计模式

```typescript
// 资源 CRUD 接口
interface CRUDEndpoints<T, CreateDTO, UpdateDTO> {
  list: { response: T[] };
  get: { params: { id: string }; response: T };
  create: { body: CreateDTO; response: T };
  update: { params: { id: string }; body: UpdateDTO; response: T };
  delete: { params: { id: string }; response: void };
}

// 为用户资源生成端点
type UserEndpoints = CRUDEndpoints<User, CreateUserDTO, UpdateUserDTO>;
```

## 总结

**类型安全 API 设计要点**：

- **定义端点类型**：请求参数、响应数据都有明确类型
- **路径参数提取**：使用模板字面量类型
- **错误处理**：使用 Result 类型或可辨识联合
- **泛型复用**：创建通用的 API 客户端

**好处**：
- 编译时发现 API 调用错误
- IDE 自动补全
- 重构时自动更新所有调用点
- 减少运行时错误

**记住**：好的 API 类型设计让错误无处藏身。
