# 默认请求头配置

Axios 允许配置默认请求头，并按方法分组。这一节实现这个功能。

## 本节目标

通过本节学习，你将：
- 理解为什么需要按 HTTP 方法分组配置请求头
- 掌握 headers 的分层结构设计
- 实现请求头的扁平化合并
- 完成默认请求头的集成

## 需求分析

Axios 支持这样的用法：

```typescript
// 全局默认头 —— 所有请求都会带
axios.defaults.headers.common['Authorization'] = 'Bearer token';

// 按方法设置默认头
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.get['Accept'] = 'application/json';

// 实例级别配置
const instance = axios.create({
  headers: {
    common: {
      'X-Custom-Header': 'value',
    },
    post: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  },
});
```

### 为什么要按方法分组？

| 方法类型 | 典型请求头需求 |
|----------|---------------|
| **所有请求** | Authorization、Accept、X-Request-ID |
| **POST/PUT/PATCH** | Content-Type（告诉服务器请求体格式） |
| **GET/DELETE** | 通常不需要 Content-Type（无请求体） |

## 头配置结构

定义头配置的类型：

```typescript
// src/types/index.ts

export interface HeadersDefaults {
  common: Record<string, string>;   // 所有请求
  delete: Record<string, string>;   // DELETE 请求
  get: Record<string, string>;      // GET 请求
  head: Record<string, string>;     // HEAD 请求
  post: Record<string, string>;     // POST 请求
  put: Record<string, string>;      // PUT 请求
  patch: Record<string, string>;    // PATCH 请求
  options: Record<string, string>;  // OPTIONS 请求
  [method: string]: Record<string, string>;  // 索引签名，支持其他方法
}

export interface AxiosDefaults extends AxiosRequestConfig {
  headers: HeadersDefaults;
}
```

### 结构可视化

```
axios.defaults.headers
├── common/          ← 所有请求都会带的头
│   ├── Accept
│   └── Authorization
├── get/             ← 只有 GET 请求会带
├── post/            ← 只有 POST 请求会带
│   └── Content-Type
├── put/
├── patch/
├── delete/
└── ...
```
```

## 默认头配置

创建默认配置：

```typescript
// src/defaults/headers.ts

import { HeadersDefaults } from '../types';

/**
 * 默认请求头配置
 * 
 * 设计原则：
 * 1. common 中放所有请求都需要的头
 * 2. post/put/patch 默认 JSON 格式（现代 API 最常用）
 * 3. get/delete 等留空（通常不需要 Content-Type）
 */
export const defaultHeaders: HeadersDefaults = {
  common: {
    // Accept 头告诉服务器客户端能接受什么格式
    // 优先 JSON，也接受纯文本和任意类型
    'Accept': 'application/json, text/plain, */*',
  },
  
  // 无请求体的方法，不需要默认头
  delete: {},
  get: {},
  head: {},
  options: {},
  
  // 有请求体的方法，默认 JSON 格式
  post: {
    'Content-Type': 'application/json;charset=utf-8',
  },
  put: {
    'Content-Type': 'application/json;charset=utf-8',
  },
  patch: {
    'Content-Type': 'application/json;charset=utf-8',
  },
};
```

### 为什么这样设计？

| 头 | 值 | 原因 |
|---|---|------|
| `Accept` | `application/json, ...` | 告诉服务器优先返回 JSON |
| `Content-Type` (POST) | `application/json` | 现代 API 默认使用 JSON |
| `Content-Type` (GET) | 不设置 | GET 请求通常没有请求体 |

## 合并请求头

发送请求时，需要将分层的 headers 合并为一个扁平对象：

**合并规则**：`common` + `方法特定` + `请求配置`（后者覆盖前者）

```typescript
// src/helpers/flattenHeaders.ts

import { HeadersDefaults } from '../types';
import { normalizeHeaders, normalizeHeaderName } from './headers';

export interface FlattenHeadersOptions {
  headers?: Record<string, any> & Partial<HeadersDefaults>;
  method?: string;
}

/**
 * 扁平化请求头
 * 
 * 将 { common, get, post, ... } 结构合并为单一对象
 * 
 * 优先级：请求级配置 > 方法特定配置 > common 配置
 */
export function flattenHeaders(options: FlattenHeadersOptions): Record<string, string> {
  const { method = 'get' } = options;
  const headers = { ...options.headers } || {};
  
  // ==================== 第一步：提取各层 headers ====================
  const commonHeaders = headers.common || {};
  const methodHeaders = headers[method.toLowerCase()] || {};
  
  // ==================== 第二步：提取请求级 headers ====================
  // 删除特殊属性（common、get、post 等），剩下的就是请求级配置
  const specialKeys = [
    'common', 'delete', 'get', 'head', 'post', 'put', 'patch', 'options'
  ];
  
  const requestHeaders: Record<string, any> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (!specialKeys.includes(key.toLowerCase())) {
      requestHeaders[key] = value;
    }
  });
  
  // ==================== 第三步：按优先级合并 ====================
  // common → method → request（后者覆盖前者）
  const merged = {
    ...commonHeaders,
    ...methodHeaders,
    ...requestHeaders,
  };
  
  // 规范化头名称并返回
  return normalizeHeaders(merged);
}
```

### 合并过程可视化

```
POST 请求的 headers 合并过程：

输入 headers：
{
  common: { Accept: 'application/json' },
  post: { 'Content-Type': 'application/json' },
  'Authorization': 'Bearer token'  ← 请求级
}

合并步骤：
┌─────────────────────────────────────────────────────┐
│ 1. common        { Accept: 'application/json' }    │
│    ↓ 合并                                           │
│ 2. + post        { Accept, Content-Type }          │
│    ↓ 合并                                           │
│ 3. + 请求级      { Accept, Content-Type, Auth }    │
└─────────────────────────────────────────────────────┘

输出：
{
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: 'Bearer token'
}
```

## 集成到 Axios 类

更新 Axios 类以支持 headers 配置：

```typescript
// src/core/Axios.ts

import { flattenHeaders } from '../helpers/flattenHeaders';
import { defaultHeaders } from '../defaults/headers';

export class Axios {
  defaults: AxiosDefaults;

  constructor(instanceConfig: AxiosRequestConfig = {}) {
    this.defaults = {
      ...instanceConfig,
      headers: {
        ...defaultHeaders,
        ...instanceConfig.headers,
      },
    } as AxiosDefaults;
  }

  request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // 合并配置
    const mergedConfig = mergeConfig(this.defaults, config);
    
    // 扁平化 headers
    mergedConfig.headers = flattenHeaders({
      headers: mergedConfig.headers,
      method: mergedConfig.method,
    });
    
    return dispatchRequest(mergedConfig);
  }
}
```

## 修改默认头

用户可以修改默认头：

```typescript
// 添加全局认证头
axios.defaults.headers.common['Authorization'] = 'Bearer token';

// 修改 POST 默认 Content-Type
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

// 添加自定义头
axios.defaults.headers.common['X-Request-Id'] = () => generateUUID();
```

支持函数值：

```typescript
// src/helpers/flattenHeaders.ts

function resolveHeaderValue(value: any): string | undefined {
  if (typeof value === 'function') {
    return value();
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

export function flattenHeaders(options: FlattenHeadersOptions): Record<string, string> {
  // ... 合并逻辑

  // 解析函数值
  const resolved: Record<string, string> = {};
  Object.entries(merged).forEach(([name, value]) => {
    const resolvedValue = resolveHeaderValue(value);
    if (resolvedValue !== undefined) {
      resolved[normalizeHeaderName(name)] = resolvedValue;
    }
  });

  return resolved;
}
```

## 实例级别配置

每个实例可以有自己的默认头：

```typescript
const api = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    common: {
      'X-API-Key': 'my-api-key',
    },
  },
});

// 这个请求会带上 X-API-Key
api.get('/users');

// 全局 axios 不受影响
axios.get('/other');  // 没有 X-API-Key
```

## 测试

```typescript
import { describe, it, expect } from 'vitest';
import { flattenHeaders } from '../src/helpers/flattenHeaders';

describe('flattenHeaders', () => {
  it('should merge common and method headers', () => {
    const result = flattenHeaders({
      headers: {
        common: { 'Accept': 'application/json' },
        post: { 'Content-Type': 'application/json' },
      },
      method: 'post',
    });
    expect(result['Accept']).toBe('application/json');
    expect(result['Content-Type']).toBe('application/json');
  });

  it('should prioritize request headers over method headers', () => {
    const result = flattenHeaders({
      headers: {
        post: { 'Content-Type': 'application/json' },
        'Content-Type': 'text/plain',  // 请求级覆盖
      },
      method: 'post',
    });
    expect(result['Content-Type']).toBe('text/plain');
  });

  it('should prioritize method headers over common', () => {
    const result = flattenHeaders({
      headers: {
        common: { 'Accept': 'text/html' },
        get: { 'Accept': 'application/json' },
      },
      method: 'get',
    });
    expect(result['Accept']).toBe('application/json');
  });

  it('should ignore other method headers', () => {
    const result = flattenHeaders({
      headers: {
        post: { 'Content-Type': 'application/json' },
      },
      method: 'get',  // GET 请求不会带上 POST 的头
    });
    expect(result['Content-Type']).toBeUndefined();
  });

  it('should remove special keys from result', () => {
    const result = flattenHeaders({
      headers: {
        common: { 'Accept': 'application/json' },
        post: {},
        get: {},
      },
      method: 'get',
    });
    expect(result['common']).toBeUndefined();
    expect(result['post']).toBeUndefined();
  });

  it('should resolve function values', () => {
    const result = flattenHeaders({
      headers: {
        'X-Request-Id': () => 'uuid-123',
      },
      method: 'get',
    });
    expect(result['X-Request-Id']).toBe('uuid-123');
  });
});
```

## 小结

本节我们实现了默认请求头的分层配置和合并机制。

### 核心设计

| 层级 | 作用 | 优先级 |
|------|------|--------|
| `common` | 所有请求共享 | 最低 |
| `post`/`get`/... | 特定方法专用 | 中等 |
| 请求级配置 | 单次请求特有 | 最高 |

### 合并流程

```
发送 POST 请求时的 headers 合并：

common headers
    │
    ▼
  合并 ←── post headers
    │
    ▼
  合并 ←── 请求级 headers
    │
    ▼
扁平化为单一对象 → 发送
```

## 常见问题解答

**Q1: 如何为所有请求添加认证头？**

A: 使用 `common`：
```typescript
axios.defaults.headers.common['Authorization'] = 'Bearer token';
```

**Q2: 如何为 POST 请求设置不同的 Content-Type？**

A: 有两种方式：
```typescript
// 方式一：修改默认配置（影响所有 POST）
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

// 方式二：请求级配置（只影响这一次）
axios.post('/api', data, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
```

**Q3: 实例配置会影响全局默认吗？**

A: 不会。每个实例独立：
```typescript
const api = axios.create({
  headers: { common: { 'X-Custom': 'value' } }
});
// 只有 api 的请求带 X-Custom，全局 axios 不受影响
```

---

至此，请求头处理模块完成。下一章我们处理请求体的转换。
