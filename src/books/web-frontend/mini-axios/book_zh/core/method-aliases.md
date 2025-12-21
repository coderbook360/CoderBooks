# 请求方法别名：get、post、put、delete

上一节我们在 `Axios` 类中定义了 `get`、`post` 等方法，这些方法都是 `request` 方法的别名。让我们深入理解这个设计。

## 本节目标

通过本节学习，你将：
- 理解方法别名的设计意图
- 掌握有请求体和无请求体方法的区别
- 学会使用泛型实现类型安全的响应
- 了解批量生成方法别名的技巧

## 为什么需要方法别名

对比两种调用方式：

```typescript
// 方式一：通用 request 方法（繁琐）
axios.request({
  url: '/api/users',
  method: 'GET'
});

// 方式二：方法别名（简洁）
axios.get('/api/users');
```

### 方法别名的好处

| 优点 | 说明 |
|------|------|
| **代码更简洁** | 少写 `method` 字段，减少样板代码 |
| **语义更清晰** | 一眼就能看出是什么类型的请求 |
| **IDE 友好** | 可以获得更好的类型提示和自动补全 |
| **减少错误** | 避免 method 拼写错误（如 `'GETT'`） |

## 方法分类

HTTP 方法分为两类，它们的函数签名不同：

### 无请求体方法

GET、DELETE、HEAD、OPTIONS 通常不携带请求体：

```typescript
// 签名：(url, config?) => Promise
axios.get(url, config?)
axios.delete(url, config?)
axios.head(url, config?)
axios.options(url, config?)
```

### 有请求体方法

POST、PUT、PATCH 通常需要发送数据：

```typescript
// 签名：(url, data?, config?) => Promise
axios.post(url, data?, config?)
axios.put(url, data?, config?)
axios.patch(url, data?, config?)
```

### 参数顺序的差异

```
无请求体：axios.get(url, config)
                   ↑     ↑
                  URL   配置

有请求体：axios.post(url, data, config)
                    ↑     ↑      ↑
                   URL   数据   配置
```

注意 `data` 是第二个参数，这样更符合使用习惯：`axios.post('/api', { name: 'test' })`

## 实现细节

让我们看看这两类方法的实现区别：

### 无请求体方法

```typescript
get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return this.request<T>({
    ...config,      // 1. 先展开用户配置
    url,            // 2. 然后覆盖 url
    method: 'GET'   // 3. 最后覆盖 method
  });
}
```

**关键点**：`url` 和 `method` 放在最后，确保覆盖用户配置中可能传入的同名属性。

```typescript
// 如果用户错误地在 config 中传了 url，我们的 url 参数会覆盖它
axios.get('/correct', { url: '/wrong' });  // 实际请求 /correct
```

### 有请求体方法

```typescript
post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return this.request<T>({
    ...config,
    url,
    method: 'POST',
    data            // 额外传入 data
  });
}
```

**关键点**：`data` 作为独立参数，与 `config` 分开，这样更符合使用习惯。

## 为什么这样设计参数顺序

思考一个问题：为什么不统一成一种签名？

```typescript
// 假设统一成这样（data 放在 config 里）
axios.post('/api', { data: { name: 'test' }, headers: {...} });
```

对比现在的设计：

```typescript
// 现在的设计（data 是独立参数）
axios.post('/api', { name: 'test' }, { headers: {...} });
```

### 现在设计的优势

| 方面 | 统一签名 | 分离签名（当前设计） |
|------|----------|---------------------|
| **直觉性** | 需要记住 data 是 config 的属性 | 第二个参数就是数据 |
| **简洁性** | 需要包一层 `{ data: ... }` | 直接传数据 |
| **区分度** | 数据和配置混在一起 | 数据和配置分离 |

```typescript
// 当前设计的调用更加直观
axios.post('/api/users', { name: 'test' });  // 一眼就知道 { name: 'test' } 是要发送的数据
```

## 使用泛型支持类型推断

每个方法都使用泛型 `T` 来支持响应数据的类型推断：

```typescript
// 定义响应数据类型
interface User {
  id: number;
  name: string;
  email: string;
}

// 指定泛型类型
const response = await axios.get<User>('/api/user/1');

// response.data 的类型是 User
console.log(response.data.name);  // ✅ 类型安全，IDE 有自动补全
console.log(response.data.age);   // ❌ TypeScript 报错：User 没有 age 属性
```

如果不指定泛型，`data` 的类型是 `any`：

```typescript
const response = await axios.get('/api/user/1');
// response.data 的类型是 any
// 没有类型检查，容易出错
```

> **最佳实践**：始终为 API 调用指定响应类型，这样可以获得完整的类型安全。

## 批量生成方法别名

上一节我们手写了每个方法，代码有些重复。可以用一个更优雅的方式批量生成：

```typescript
// 无请求体的方法
const methodsWithoutData = ['get', 'delete', 'head', 'options'] as const;

// 有请求体的方法
const methodsWithData = ['post', 'put', 'patch'] as const;

// ==================== 批量添加无请求体方法 ====================
methodsWithoutData.forEach(method => {
  Axios.prototype[method] = function(url: string, config?: AxiosRequestConfig) {
    return this.request({ ...config, url, method });
  };
});

// ==================== 批量添加有请求体方法 ====================
methodsWithData.forEach(method => {
  Axios.prototype[method] = function(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request({ ...config, url, method, data });
  };
});
```

### 两种实现方式对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| 手写每个方法 | 类型安全，IDE 支持好 | 代码重复 |
| 动态生成 | DRY，代码简洁 | 需要额外的类型声明 |

在实际的 Axios 源码中，使用的是动态生成方式，同时通过类型声明文件保证类型安全。

## 完整的方法别名实现

更新 `src/core/Axios.ts`：

```typescript
import { AxiosRequestConfig, AxiosResponse, Method } from '../types';
import { dispatchRequest } from './dispatchRequest';

export class Axios {
  defaults: AxiosRequestConfig;

  constructor(config: AxiosRequestConfig = {}) {
    this.defaults = config;
  }

  request<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let mergedConfig: AxiosRequestConfig;
    
    if (typeof configOrUrl === 'string') {
      mergedConfig = { ...config, url: configOrUrl };
    } else {
      mergedConfig = configOrUrl;
    }

    mergedConfig = { ...this.defaults, ...mergedConfig };
    return dispatchRequest<T>(mergedConfig);
  }

  // 无请求体方法
  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  head<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'HEAD' });
  }

  options<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'OPTIONS' });
  }

  // 有请求体方法
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }
}
```

## 测试方法别名

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Axios } from '../src/core/Axios';

describe('Axios method aliases', () => {
  // ... mock 代码省略

  // 使用 it.each 批量测试无请求体方法
  describe('methods without data', () => {
    it.each(['get', 'delete', 'head', 'options'] as const)(
      'should call request with %s method',
      async (method) => {
        const axios = new Axios();
        const spy = vi.spyOn(axios, 'request');
        
        // 调用方法别名
        axios[method]('/api/test', { headers: { 'X-Custom': 'value' } });
        
        // 验证 request 被正确调用
        expect(spy).toHaveBeenCalledWith({
          url: '/api/test',
          method: method.toUpperCase(),
          headers: { 'X-Custom': 'value' }
        });
      }
    );
  });

  // 使用 it.each 批量测试有请求体方法
  describe('methods with data', () => {
    it.each(['post', 'put', 'patch'] as const)(
      'should call request with %s method and data',
      async (method) => {
        const axios = new Axios();
        const spy = vi.spyOn(axios, 'request');
        
        // 调用方法别名，传入 data
        axios[method]('/api/test', { name: 'test' }, { headers: { 'X-Custom': 'value' } });
        
        // 验证 request 被正确调用，包含 data
        expect(spy).toHaveBeenCalledWith({
          url: '/api/test',
          method: method.toUpperCase(),
          data: { name: 'test' },
          headers: { 'X-Custom': 'value' }
        });
      }
    );
  });
});
```

> **测试技巧**：`it.each` 可以用一个测试用例覆盖多个相似场景，减少代码重复。

## 小结

这一节我们详细讲解了方法别名的设计。

### 核心要点

| 要点 | 说明 |
|------|------|
| **两类方法** | 无请求体（GET 等）和有请求体（POST 等） |
| **参数设计** | 数据和配置分离，符合使用直觉 |
| **泛型支持** | `axios.get<User>()` 支持响应类型推断 |
| **实现方式** | 所有方法最终都委托给 `request` 方法 |

### 方法签名速记

```
无请求体：axios.get(url, config?)         → 2 个参数
有请求体：axios.post(url, data?, config?) → 3 个参数
```

## 常见问题解答

**Q1: DELETE 请求可以带请求体吗？**

A: HTTP 规范允许，但不推荐。很多服务器和代理会忽略 DELETE 请求的请求体。如果确实需要，可以用通用的 `request` 方法：
```typescript
axios.request({ method: 'DELETE', url: '/api', data: {...} });
```

**Q2: 为什么 Axios 没有提供 CONNECT 和 TRACE 方法？**

A: 这两个方法主要用于代理和调试，Web 开发中几乎不用，所以 Axios 没有提供别名。

---

下一节，我们来解决一个有趣的问题：如何让 `axios` 既可以当函数调用，又可以当对象使用？
