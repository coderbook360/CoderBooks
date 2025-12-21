# 从一个简单的请求开始

在深入复杂的架构之前，让我们先写一个能跑的最简版本。这个版本虽然简陋，但它是一切的起点。

## 本节目标

通过本节学习，你将：
- 理解 XMLHttpRequest 的基本用法
- 学会将回调式 API 封装为 Promise
- 实现一个最简单的 HTTP 请求函数
- 发现这个简单实现的不足，引出后续章节

## 目标

实现一个最简单的 `request` 函数，能够：

1. 发送 GET 请求
2. 返回 Promise
3. 获取响应数据

就这三个要求，没有拦截器，没有配置合并，没有错误处理。**先让它跑起来**。

## 最简实现

创建 `src/core/request.ts`：

```typescript
// src/core/request.ts

// ==================== 类型定义 ====================

export interface RequestConfig {
  url: string;                           // 请求 URL（必填）
  method?: string;                       // 请求方法，默认 GET
  data?: any;                            // 请求体数据
  headers?: Record<string, string>;      // 请求头
}

export interface Response<T = any> {
  data: T;                               // 响应数据（已解析的 JSON）
  status: number;                        // HTTP 状态码
  statusText: string;                    // 状态文本
  headers: Record<string, string>;       // 响应头
  config: RequestConfig;                 // 请求配置（用于调试）
}

// ==================== 请求函数 ====================

export function request<T = any>(config: RequestConfig): Promise<Response<T>> {
  return new Promise((resolve, reject) => {
    // 1. 创建 XMLHttpRequest 实例
    const xhr = new XMLHttpRequest();
    
    // 2. 配置请求：方法、URL、是否异步
    xhr.open(
      config.method?.toUpperCase() || 'GET',  // 默认 GET，转大写
      config.url,                              // 请求 URL
      true                                     // true = 异步请求
    );
    
    // 3. 设置请求头
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    
    // 4. 监听状态变化
    xhr.onreadystatechange = function () {
      // readyState 说明：
      // 0 = UNSENT, 1 = OPENED, 2 = HEADERS_RECEIVED
      // 3 = LOADING, 4 = DONE
      if (xhr.readyState !== 4) return;  // 只在完成时处理
      
      // 5. 根据状态码判断成功/失败
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          data: JSON.parse(xhr.responseText),  // 假设响应是 JSON
          status: xhr.status,
          statusText: xhr.statusText,
          headers: {},                          // 暂时忽略
          config: config,
        });
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };
    
    // 6. 发送请求
    xhr.send(config.data ? JSON.stringify(config.data) : null);
  });
}
```

## 代码解析

让我们逐步分析这段代码：

### 第一步：定义类型

```typescript
export interface RequestConfig {
  url: string;         // url 是必需的
  method?: string;     // 其他都是可选的
  // ...
}
```

`Response` 使用泛型 `T` 描述响应数据的类型，调用时可以指定：

```typescript
const response = await request<User>({ url: '/user/1' });
// response.data 的类型是 User
```

### 第二步：Promise 包装

```typescript
return new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
```

XMLHttpRequest 是回调式 API，我们用 Promise 包装它，使其支持 `async/await`。

### 第三步：配置并发送请求

```typescript
xhr.open(config.method?.toUpperCase() || 'GET', config.url, true);
xhr.send(config.data ? JSON.stringify(config.data) : null);
```

- `open()` 的第三个参数 `true` 表示异步请求
- HTTP 方法需要大写（虽然不是强制，但这是惯例）
- `send()` 发送请求体，GET 请求传 null

### 第四步：处理响应

```typescript
xhr.onreadystatechange = function () {
  if (xhr.readyState !== 4) return;
  // 根据状态码决定 resolve 或 reject
};
```

`readyState === 4` 表示请求已完成，然后根据 HTTP 状态码判断成功与否。

## 使用示例

```typescript
import { request } from './core/request';

// 发送 GET 请求
request({
  url: 'https://jsonplaceholder.typicode.com/posts/1'
}).then(response => {
  console.log(response.data);
});

// 发送 POST 请求
request({
  url: 'https://jsonplaceholder.typicode.com/posts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    title: 'foo',
    body: 'bar',
    userId: 1
  }
}).then(response => {
  console.log(response.data);
});
```

## 发现问题

这个最简版本能用，但问题很多。让我们来分析：

### 问题一：API 不够友好

每次都要传完整的配置对象，太繁琐了：

```typescript
// 我们的 API（繁琐）
request({ url: '/api/users', method: 'GET' });

// 期望的 API（简洁）
axios.get('/api/users');
```

### 问题二：没有默认配置

如果有 baseURL，每次都要写完整路径：

```typescript
// 每次都要写完整 URL（重复）
request({ url: 'https://api.example.com/users' });
request({ url: 'https://api.example.com/posts' });

// 期望只写路径
axios.get('/users');
axios.get('/posts');
```

### 问题三：响应处理太简单

- ❌ 假设响应一定是 JSON（实际可能是 XML、text 等）
- ❌ 没有处理网络错误（如断网）
- ❌ 没有超时控制
- ❌ 没有解析响应头

### 问题四：只支持浏览器

使用了 `XMLHttpRequest`，在 Node.js 中无法运行。真正的 Axios 使用适配器模式解决这个问题。

## 演进路线

接下来的章节，我们会逐一解决这些问题：

| 问题 | 解决方案 | 章节 |
|------|----------|------|
| API 不友好 | 创建 Axios 类，添加方法别名 | 本章后续 |
| 没有默认配置 | 实现 defaults 和配置合并 | 第二章 |
| 响应处理简单 | 数据转换和错误处理 | 第五、九章 |
| 只支持浏览器 | 适配器模式 | 第六章 |

## 测试我们的代码

创建 `test/request.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from '../src/core/request';

// ==================== 模拟 XMLHttpRequest ====================
// 因为 Node.js 中没有 XMLHttpRequest，我们需要模拟它

const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  readyState: 4,                                     // 模拟请求已完成
  status: 200,                                        // 模拟成功状态码
  statusText: 'OK',
  responseText: JSON.stringify({ id: 1, title: 'Test' }),
  onreadystatechange: null as any,
};

// 用 mock 替换全局的 XMLHttpRequest
vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR));

// ==================== 测试用例 ====================

describe('request', () => {
  // 每个测试前清理 mock 状态
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send GET request with correct URL', async () => {
    const promise = request({ url: '/api/test' });
    
    // 手动触发响应（模拟异步完成）
    mockXHR.onreadystatechange();
    
    const response = await promise;
    
    // 验证 open 被正确调用
    expect(mockXHR.open).toHaveBeenCalledWith('GET', '/api/test', true);
    // 验证响应数据
    expect(response.data).toEqual({ id: 1, title: 'Test' });
    expect(response.status).toBe(200);
  });

  it('should send POST request with JSON body', async () => {
    const promise = request({
      url: '/api/test',
      method: 'POST',
      data: { name: 'test' }
    });
    
    mockXHR.onreadystatechange();
    
    await promise;
    
    // 验证方法和数据
    expect(mockXHR.open).toHaveBeenCalledWith('POST', '/api/test', true);
    expect(mockXHR.send).toHaveBeenCalledWith('{"name":"test"}');
  });
});
```

> **测试技巧**：在 Node.js 环境测试浏览器 API 时，需要 mock 全局对象。Vitest 的 `vi.stubGlobal()` 很方便做到这一点。

## 小结

这一节我们实现了一个最简单的请求函数。虽然功能简陋，但它展示了 HTTP 请求的核心流程：

```
┌─────────────────────────────────────────────────────────┐
│                    请求生命周期                          │
├─────────────────────────────────────────────────────────┤
│  1. new XMLHttpRequest()     创建 XHR 对象              │
│  2. xhr.open(method, url)    配置请求参数               │
│  3. xhr.setRequestHeader()   设置请求头                 │
│  4. xhr.send(body)           发送请求                   │
│  5. onreadystatechange       监听响应                   │
│  6. resolve/reject           根据状态码决定结果         │
└─────────────────────────────────────────────────────────┘
```

### 核心知识点

| 概念 | 说明 |
|------|------|
| `XMLHttpRequest` | 浏览器内置的 HTTP 请求 API |
| `readyState` | 请求状态，4 表示完成 |
| Promise 封装 | 将回调 API 转换为 Promise |
| 泛型响应 | `Response<T>` 支持类型推断 |

### 下一步

接下来，我们要把这个函数包装成一个类，提供更友好的 API：

```typescript
// 目标：实现这样的调用方式
axios.get('/users');
axios.post('/users', { name: 'test' });
```
