# 常见使用场景与最佳实践

本附录汇总了使用 Axios（及我们的 Mini-Axios）时的常见场景和最佳实践。

## API 客户端封装

### 创建统一的 API 模块

```typescript
// src/api/client.ts

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 创建实例
const client: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    // 添加认证 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
client.interceptors.response.use(
  (response) => response.data, // 直接返回 data
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 跳转登录
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

### 模块化 API 定义

```typescript
// src/api/modules/user.ts

import client from '../client';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export const userApi = {
  // 获取当前用户
  getCurrentUser(): Promise<User> {
    return client.get('/user/me');
  },
  
  // 用户列表
  getUsers(params?: { page?: number; limit?: number }): Promise<User[]> {
    return client.get('/users', { params });
  },
  
  // 用户详情
  getUserById(id: number): Promise<User> {
    return client.get(`/users/${id}`);
  },
  
  // 创建用户
  createUser(data: Omit<User, 'id'>): Promise<User> {
    return client.post('/users', data);
  },
  
  // 更新用户
  updateUser(id: number, data: Partial<User>): Promise<User> {
    return client.put(`/users/${id}`, data);
  },
  
  // 删除用户
  deleteUser(id: number): Promise<void> {
    return client.delete(`/users/${id}`);
  },
  
  // 登录
  login(params: LoginParams): Promise<{ token: string; user: User }> {
    return client.post('/auth/login', params);
  }
};
```

### 统一导出

```typescript
// src/api/index.ts

export { default as client } from './client';
export { userApi } from './modules/user';
export { productApi } from './modules/product';
export { orderApi } from './modules/order';
```

## 认证处理

### Token 刷新机制

```typescript
// src/api/auth.ts

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Token 过期
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 等待刷新完成
        return new Promise(resolve => {
          subscribeTokenRefresh(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(client(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { token } = await refreshTokenApi(refreshToken);
        
        localStorage.setItem('token', token);
        client.defaults.headers.Authorization = `Bearer ${token}`;
        
        onTokenRefreshed(token);
        
        return client(originalRequest);
      } catch (refreshError) {
        // 刷新失败，跳转登录
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
```

## 错误处理

### 全局错误处理

```typescript
// src/api/errorHandler.ts

import type { AxiosError } from 'axios';

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export function handleApiError(error: AxiosError<ApiError>): never {
  if (!error.response) {
    // 网络错误
    throw new Error('网络连接失败，请检查网络设置');
  }
  
  const { status, data } = error.response;
  
  switch (status) {
    case 400:
      throw new Error(data.message || '请求参数错误');
      
    case 401:
      throw new Error('登录已过期，请重新登录');
      
    case 403:
      throw new Error('没有权限执行此操作');
      
    case 404:
      throw new Error('请求的资源不存在');
      
    case 422:
      // 表单验证错误
      if (data.details) {
        const messages = Object.values(data.details).flat();
        throw new Error(messages.join(', '));
      }
      throw new Error(data.message || '数据验证失败');
      
    case 429:
      throw new Error('请求过于频繁，请稍后再试');
      
    case 500:
      throw new Error('服务器错误，请稍后再试');
      
    default:
      throw new Error(data.message || '未知错误');
  }
}

// 在拦截器中使用
client.interceptors.response.use(
  response => response,
  error => {
    handleApiError(error);
  }
);
```

### 组件级错误处理

```typescript
// React 示例
import { useState } from 'react';
import { userApi } from '@/api';

function UserProfile() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  async function loadUser() {
    setLoading(true);
    setError(null);
    
    try {
      const user = await userApi.getCurrentUser();
      // 处理用户数据
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      {loading && <div>加载中...</div>}
    </div>
  );
}
```

## 请求取消

### 组件卸载时取消

```typescript
// React Hook
import { useEffect, useRef } from 'react';

function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetcher(controller.signal)
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
        }
      })
      .finally(() => setLoading(false));
    
    return () => controller.abort();
  }, []);
  
  return { data, loading, error };
}

// 使用
function UserList() {
  const { data, loading, error } = useApi((signal) =>
    client.get('/users', { signal })
  );
  
  // ...
}
```

### 搜索防抖

```typescript
import { useRef, useCallback } from 'react';
import debounce from 'lodash/debounce';

function SearchInput() {
  const controllerRef = useRef<AbortController>();
  
  const search = useCallback(
    debounce(async (query: string) => {
      // 取消之前的请求
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();
      
      try {
        const results = await client.get('/search', {
          params: { q: query },
          signal: controllerRef.current.signal
        });
        // 处理结果
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    }, 300),
    []
  );
  
  return (
    <input
      type="text"
      onChange={(e) => search(e.target.value)}
      placeholder="搜索..."
    />
  );
}
```

## 文件上传

### 带进度的上传

```typescript
interface UploadOptions {
  file: File;
  onProgress?: (percent: number) => void;
}

async function uploadFile({ file, onProgress }: UploadOptions) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await client.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    }
  });
  
  return response.data;
}

// 使用
function FileUploader() {
  const [progress, setProgress] = useState(0);
  
  async function handleUpload(file: File) {
    const result = await uploadFile({
      file,
      onProgress: setProgress
    });
    console.log('Uploaded:', result.url);
  }
  
  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <progress value={progress} max={100} />
    </div>
  );
}
```

### 分片上传

```typescript
const CHUNK_SIZE = 1024 * 1024; // 1MB

async function uploadLargeFile(file: File, onProgress?: (percent: number) => void) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = await initUpload(file.name, totalChunks);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(uploadId, i, chunk);
    
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
  
  return completeUpload(uploadId);
}

async function initUpload(filename: string, totalChunks: number) {
  const { uploadId } = await client.post('/upload/init', {
    filename,
    totalChunks
  });
  return uploadId;
}

async function uploadChunk(uploadId: string, index: number, chunk: Blob) {
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('index', String(index));
  
  await client.post(`/upload/${uploadId}/chunk`, formData);
}

async function completeUpload(uploadId: string) {
  const { url } = await client.post(`/upload/${uploadId}/complete`);
  return url;
}
```

## 缓存策略

### 简单内存缓存

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function cachedGet<T>(url: string, ttl = CACHE_TTL): Promise<T> {
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await client.get<T>(url);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

// 清除缓存
function invalidateCache(urlPattern?: RegExp) {
  if (urlPattern) {
    for (const key of cache.keys()) {
      if (urlPattern.test(key)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
```

### SWR 模式（Stale-While-Revalidate）

```typescript
async function swrGet<T>(url: string): Promise<T> {
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  
  // 返回缓存，同时后台刷新
  if (cached) {
    // 后台刷新
    client.get<T>(url).then(data => {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    });
    
    return cached.data;
  }
  
  // 无缓存，等待请求
  const data = await client.get<T>(url);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

## 并发控制

### 请求队列

```typescript
class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;
  
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }
  
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const fn = this.queue.shift()!;
    
    try {
      await fn();
    } finally {
      this.running--;
      this.process();
    }
  }
}

// 使用
const queue = new RequestQueue(3);

const promises = urls.map(url =>
  queue.add(() => client.get(url))
);

const results = await Promise.all(promises);
```

## 测试 Mock

### Jest Mock

```typescript
// __mocks__/axios.ts
export default {
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(),
  post: jest.fn()
};

// 测试文件
import axios from 'axios';
import { userApi } from '@/api';

jest.mock('axios');

describe('User API', () => {
  it('should fetch users', async () => {
    const mockUsers = [{ id: 1, name: 'John' }];
    (axios.get as jest.Mock).mockResolvedValue({ data: mockUsers });
    
    const users = await userApi.getUsers();
    
    expect(users).toEqual(mockUsers);
    expect(axios.get).toHaveBeenCalledWith('/users', expect.any(Object));
  });
});
```

### MSW（Mock Service Worker）

```typescript
// mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ])
    );
  }),
  
  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.json({ id: 3, ...body })
    );
  })
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// setupTests.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 性能优化

### 请求合并

```typescript
class BatchRequester {
  private pending: Map<string, {
    resolve: (data: any) => void;
    reject: (error: any) => void;
  }[]> = new Map();
  
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  
  constructor(delay = 50) {
    this.delay = delay;
  }
  
  get<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const callbacks = this.pending.get(id) || [];
      callbacks.push({ resolve, reject });
      this.pending.set(id, callbacks);
      
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delay);
      }
    });
  }
  
  private async flush() {
    const ids = Array.from(this.pending.keys());
    const pendingMap = new Map(this.pending);
    
    this.pending.clear();
    this.timer = null;
    
    try {
      // 批量请求
      const results = await client.get('/batch', { params: { ids } });
      
      // 分发结果
      for (const [id, data] of Object.entries(results)) {
        pendingMap.get(id)?.forEach(({ resolve }) => resolve(data));
      }
    } catch (error) {
      // 分发错误
      for (const callbacks of pendingMap.values()) {
        callbacks.forEach(({ reject }) => reject(error));
      }
    }
  }
}

// 使用
const batcher = new BatchRequester();

// 这些请求会被合并成一个批量请求
const [user1, user2, user3] = await Promise.all([
  batcher.get('user:1'),
  batcher.get('user:2'),
  batcher.get('user:3')
]);
```

## 小结

本附录涵盖了实际开发中常见的 Axios 使用场景：

1. **API 模块化**：统一管理、类型安全
2. **认证处理**：Token 刷新、自动重试
3. **错误处理**：全局统一、用户友好
4. **请求取消**：防止内存泄漏、避免竞态
5. **文件上传**：进度监控、分片上传
6. **缓存策略**：减少请求、提高性能
7. **并发控制**：限流、队列
8. **测试 Mock**：单元测试、集成测试

掌握这些模式，能帮助你构建健壮、可维护的前端应用。
