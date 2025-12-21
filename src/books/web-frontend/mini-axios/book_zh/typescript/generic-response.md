# 泛型响应类型

泛型让 Axios 能够推断响应数据的类型，实现端到端的类型安全。

## 本节目标

通过本节学习，你将掌握：

1. **理解 Axios 的泛型设计**：T、R、D 三个泛型参数的含义
2. **实现类型安全的 API 调用**：让编译器帮你检查响应数据
3. **封装类型化的 API 函数**：减少重复的类型声明
4. **使用高级泛型技巧**：条件类型、映射类型等进阶用法

## 问题：响应数据默认是 `any`

没有使用泛型时，TypeScript 无法知道响应数据的结构：

```typescript
const response = await axios.get('/api/user/1');
// response.data 是 any 类型，没有类型提示

console.log(response.data.name);    // 没有提示，可能拼错属性名
console.log(response.data.nmae);    // 不会报错，但运行时是 undefined
console.log(response.data.age);     // 不确定是否存在
```

**问题**：类型安全完全丢失，IDE 无法提供智能提示，拼写错误只有运行时才能发现。

## 解决方案：泛型响应

使用泛型告诉 TypeScript 响应数据的类型：

```typescript
// 定义响应数据的类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 使用泛型指定响应类型
const response = await axios.get<User>('/api/user/1');

// 现在 response.data 有完整的类型信息
console.log(response.data.name);    // ✅ 有智能提示
console.log(response.data.nmae);    // ❌ 编译错误：拼写错误
console.log(response.data.age);     // ❌ 编译错误：属性不存在
```

## 泛型在类型定义中的应用

理解 Axios 的泛型设计是掌握类型安全的关键：

```typescript
// AxiosResponse 接收泛型 T，用于 data 字段的类型定义
export interface AxiosResponse<T = any, D = any> {
  data: T;           // T 就是响应数据的类型
  status: number;
  statusText: string;
  headers: AxiosResponseHeaders;
  config: AxiosRequestConfig<D>;  // D 是请求数据类型
  request?: any;
}

// 方法签名使用泛型
interface Axios {
  get<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    config?: AxiosRequestConfig<D>
  ): Promise<R>;
  
  post<T = any, R = AxiosResponse<T>, D = any>(
    url: string,
    data?: D,          // D 类型的请求数据
    config?: AxiosRequestConfig<D>
  ): Promise<R>;       // 返回 R 类型的响应
}
```

### 泛型参数速查表

| 泛型 | 含义 | 默认值 | 使用场景 |
|------|------|--------|---------|
| `T` | 响应数据类型 | `any` | `response.data` 的类型 |
| `R` | 完整响应类型 | `AxiosResponse<T>` | 自定义响应结构 |
| `D` | 请求数据类型 | `any` | `config.data` 的类型 |

大多数情况下，只需要指定 `T` 即可：

```typescript
// 只指定 T（最常用）
axios.get<User>('/api/user/1');

// 同时指定 T 和 D
axios.post<User, AxiosResponse<User>, CreateUserDto>('/api/users', userData);
```

## 实践模式

### 模式一：定义 API 响应类型

```typescript
// types/api.ts

// 通用响应包装（后端返回的标准格式）
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 业务实体
interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author: User;
  createdAt: string;
}

// 分页响应
interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 模式二：封装类型化 API 函数

```typescript
// api/user.ts

import axios from 'axios';
import type { ApiResponse, User, PaginatedResponse } from './types';

export const userApi = {
  // 获取单个用户
  getById(id: number) {
    return axios.get<ApiResponse<User>>(`/api/users/${id}`);
  },

  // 获取用户列表
  getList(params: { page: number; pageSize: number }) {
    return axios.get<ApiResponse<PaginatedResponse<User>>>('/api/users', {
      params,
    });
  },

  // 创建用户
  create(data: Omit<User, 'id'>) {
    return axios.post<ApiResponse<User>>('/api/users', data);
  },

  // 更新用户
  update(id: number, data: Partial<User>) {
    return axios.patch<ApiResponse<User>>(`/api/users/${id}`, data);
  },

  // 删除用户
  delete(id: number) {
    return axios.delete<ApiResponse<null>>(`/api/users/${id}`);
  },
};

// 使用
async function demo() {
  const { data: response } = await userApi.getById(1);
  // response 是 ApiResponse<User>
  // response.data 是 User
  console.log(response.data.name);
}
```

### 模式三：带请求体类型约束

```typescript
// 定义请求和响应类型
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

interface CreateUserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

// D 泛型约束请求体类型
const response = await axios.post<
  CreateUserResponse,    // T: 响应数据类型
  AxiosResponse<CreateUserResponse>,  // R: 完整响应类型
  CreateUserRequest      // D: 请求体类型
>('/api/users', {
  name: 'Alice',
  email: 'alice@example.com',
  password: '123456',
  // age: 25,  // ❌ 编译错误：不存在于 CreateUserRequest
});
```

### 模式四：工厂函数封装

```typescript
// utils/createApi.ts

import axios, { AxiosRequestConfig } from 'axios';

interface ApiConfig extends AxiosRequestConfig {
  baseURL: string;
}

export function createApi(config: ApiConfig) {
  const instance = axios.create(config);

  return {
    get<T>(url: string, config?: AxiosRequestConfig) {
      return instance.get<T>(url, config).then(res => res.data);
    },

    post<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) {
      return instance.post<T>(url, data, config).then(res => res.data);
    },

    put<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig) {
      return instance.put<T>(url, data, config).then(res => res.data);
    },

    delete<T>(url: string, config?: AxiosRequestConfig) {
      return instance.delete<T>(url, config).then(res => res.data);
    },
  };
}

// 使用
const api = createApi({ baseURL: '/api' });

// 返回值直接是 User，而不是 AxiosResponse<User>
const user = await api.get<User>('/users/1');
console.log(user.name);  // 类型正确
```

## 高级技巧

### 技巧一：条件类型推断

```typescript
// 根据 responseType 自动推断返回类型
type InferResponseType<T extends ResponseType | undefined> = 
  T extends 'blob' ? Blob :
  T extends 'arraybuffer' ? ArrayBuffer :
  T extends 'text' ? string :
  T extends 'document' ? Document :
  any;

// 增强的 get 方法
declare function get<
  T = any,
  RT extends ResponseType = 'json'
>(
  url: string,
  config?: AxiosRequestConfig & { responseType?: RT }
): Promise<AxiosResponse<RT extends 'json' ? T : InferResponseType<RT>>>;

// 使用
const jsonResponse = await get<User>('/api/user');
// jsonResponse.data 的类型是 User

const blobResponse = await get('/api/file', { responseType: 'blob' });
// blobResponse.data 的类型是 Blob
```

### 技巧二：映射类型批量定义

```typescript
// 定义资源类型
interface Resources {
  users: User;
  posts: Post;
  comments: Comment;
}

// 自动生成 CRUD API 类型
type CrudApi<T extends Record<string, any>> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: (id: number) => Promise<T[K]>;
} & {
  [K in keyof T as `create${Capitalize<string & K>}`]: (
    data: Omit<T[K], 'id'>
  ) => Promise<T[K]>;
} & {
  [K in keyof T as `update${Capitalize<string & K>}`]: (
    id: number,
    data: Partial<T[K]>
  ) => Promise<T[K]>;
} & {
  [K in keyof T as `delete${Capitalize<string & K>}`]: (
    id: number
  ) => Promise<void>;
};

// 生成的类型
type Api = CrudApi<Resources>;
// {
//   getUsers: (id: number) => Promise<User>;
//   createUsers: (data: Omit<User, 'id'>) => Promise<User>;
//   updateUsers: (id: number, data: Partial<User>) => Promise<User>;
//   deleteUsers: (id: number) => Promise<void>;
//   getPosts: ...
//   ...
// }
```

### 技巧三：类型安全的拦截器

```typescript
// 确保拦截器返回值类型正确
axios.interceptors.response.use(
  // fulfilled 回调必须返回 AxiosResponse 类型
  (response: AxiosResponse): AxiosResponse => {
    // 处理响应...
    return response;  // ✅ 类型正确
  },
  
  // rejected 回调可以返回 AxiosResponse 或抛出错误
  (error: AxiosError): Promise<AxiosResponse> | never => {
    if (error.response?.status === 401) {
      // 重试...
      return axios.request(error.config!);  // ✅ 返回新请求
    }
    throw error;  // ✅ 抛出错误
  }
);
```

## 常见错误与解决

### 错误一：泛型参数顺序错误

```typescript
// ❌ 错误：T 和 R 顺序搞混
const response = await axios.get<AxiosResponse<User>, User>('/api/user');

// ✅ 正确：T 是数据类型，R 是响应类型
const response = await axios.get<User, AxiosResponse<User>>('/api/user');

// ✅ 通常只需要第一个泛型（推荐）
const response = await axios.get<User>('/api/user');
```

### 错误二：忘记解构 data

```typescript
// ❌ 容易混淆：user 不是 User 类型！
const user = await axios.get<User>('/api/user');
// user 的类型是 AxiosResponse<User>，而不是 User
// user.name 会报错！

// ✅ 正确做法：解构出 data
const { data: user } = await axios.get<User>('/api/user');
// user 的类型才是 User
console.log(user.name);  // ✅ 正确
```

### 错误三：类型断言滥用

```typescript
// ❌ 危险：类型断言可能掩盖错误
const response = await axios.get('/api/user');
const user = response.data as User;  // 绕过类型检查
// 如果 API 返回的结构变了，这里不会报错，但运行时会出问题

// ✅ 安全：使用泛型
const response = await axios.get<User>('/api/user');
const user = response.data;  // 编译器验证类型
```

## 常见问题解答

### Q: 什么时候需要使用第二个泛型参数 R？

当你需要自定义完整响应类型时，比如使用拦截器解包 data：

```typescript
// 拦截器已经返回 data 而非 AxiosResponse
axios.interceptors.response.use(res => res.data);

// 此时需要告诉 TypeScript 返回类型变了
const user = await axios.get<User, User>('/api/user');
// 返回的直接是 User，不是 AxiosResponse<User>
```

### Q: 泛型和类型断言 (as) 有什么区别？

| 方式 | 类型检查 | 安全性 | 使用场景 |
|------|---------|--------|---------|
| 泛型 | 编译器验证 | 高 | 常规 API 调用 |
| 类型断言 | 跳过检查 | 低 | 你确定比编译器更了解类型时 |

### Q: 如何处理后端返回的嵌套结构？

```typescript
// 后端返回：{ code: 0, data: { id: 1, name: 'John' } }
interface ApiResponse<T> {
  code: number;
  data: T;
}

// 方式一：使用嵌套泛型
const response = await axios.get<ApiResponse<User>>('/api/user');
const user = response.data.data;  // 两层 .data

// 方式二：封装解包函数（推荐）
async function api<T>(url: string): Promise<T> {
  const { data } = await axios.get<ApiResponse<T>>(url);
  return data.data;
}
const user = await api<User>('/api/user');  // 直接是 User
```

## 小结

本节我们学习了 Axios 的泛型响应类型系统：

```
泛型响应类型体系
├── 三个泛型参数
│   ├── T - 响应数据类型（最常用）
│   ├── R - 完整响应类型（自定义场景）
│   └── D - 请求数据类型（表单/DTO）
├── 实践模式
│   ├── 直接使用泛型
│   ├── 封装类型化 API 函数
│   └── 创建 API 工厂函数
└── 高级技巧
    ├── 条件类型推断 responseType
    └── 映射类型批量生成 CRUD
```

**核心要点**：

| 要点 | 说明 |
|------|------|
| 基础用法 | `axios.get<ResponseType>(url)` |
| 三个泛型参数 | T（数据）、R（响应）、D（请求体） |
| 封装模式 | 创建类型化的 API 函数减少重复 |
| 避免断言 | 优先使用泛型，避免 `as` 滥用 |

**最佳实践**：

1. 始终为 API 调用指定响应类型
2. 将 API 类型定义集中管理（如 `types/api.ts`）
3. 优先使用泛型，避免类型断言
4. 封装可复用的类型化 API 函数

下一章，我们进入测试与发布流程。
