# 请求头的标准化处理

HTTP 请求头是客户端与服务器沟通的重要渠道。这一节我们实现请求头的规范化处理。

## 本节目标

通过本节学习，你将：
- 理解 HTTP 头名称大小写不敏感的特性
- 实现头名称的标准化转换
- 掌握头操作的常用工具函数
- 避免重复设置同一个头的问题

## 为什么需要标准化？

HTTP 头名称**不区分大小写**（RFC 7230），但这带来了问题：

```typescript
// 用户可能这样写
config.headers = {
  'content-type': 'application/json',
  'Content-Type': 'text/plain',     // 重复了！
  'CONTENT-TYPE': 'text/html',      // 又重复了！
};

// 三个不同写法，实际是同一个头
// 最终哪个生效？不确定！
```

### 我们需要解决的问题

| 问题 | 解决方案 |
|------|----------|
| 头名称大小写不一致 | 统一转换为标准格式（如 `Content-Type`） |
| 可能重复设置同一个头 | 合并时使用规范化的名称作为 key |
| 查找头时需要忽略大小写 | 提供忽略大小写的查找函数 |

## 头名称规范化

创建 `src/helpers/normalizeHeaderName.ts`：

```typescript
// src/helpers/normalizeHeaderName.ts

/**
 * 规范化 header 名称
 * 将 header 名称转换为标准格式：每个单词首字母大写，连字符分隔
 * 
 * 转换规则：
 * 1. 全部转小写
 * 2. 按连字符分割
 * 3. 每个单词首字母大写
 * 4. 用连字符重新连接
 * 
 * @example
 * normalizeHeaderName('content-type')  → 'Content-Type'
 * normalizeHeaderName('CONTENT-TYPE')  → 'Content-Type'
 * normalizeHeaderName('x-custom-header') → 'X-Custom-Header'
 */
export function normalizeHeaderName(name: string): string {
  return name
    .toLowerCase()                    // 'CONTENT-TYPE' → 'content-type'
    .split('-')                       // ['content', 'type']
    .map(word =>                      // 每个单词首字母大写
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('-');                       // 'Content-Type'
}
```

### 测试用例

```typescript
import { normalizeHeaderName } from '../src/helpers/normalizeHeaderName';

describe('normalizeHeaderName', () => {
  it('should normalize lowercase header name', () => {
    expect(normalizeHeaderName('content-type')).toBe('Content-Type');
  });

  it('should normalize uppercase header name', () => {
    expect(normalizeHeaderName('CONTENT-TYPE')).toBe('Content-Type');
  });

  it('should normalize mixed case header name', () => {
    expect(normalizeHeaderName('Content-type')).toBe('Content-Type');
  });

  it('should handle single word', () => {
    expect(normalizeHeaderName('accept')).toBe('Accept');
  });

  it('should handle multiple parts', () => {
    expect(normalizeHeaderName('x-custom-header')).toBe('X-Custom-Header');
  });
});
```

## 处理 headers 对象

有了名称规范化函数后，我们需要构建一套完整的 headers 操作工具集，包括：规范化、获取、设置和删除等操作。

### headers 工具函数设计

```
┌─────────────────────────────────────────────────────────────────┐
│                    headers 工具函数体系                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  normalizeHeaders()  ──→  统一规范化整个 headers 对象            │
│         │                                                       │
│         ├── getHeader()      获取指定 header（忽略大小写）        │
│         │                                                       │
│         ├── setHeaderIfUnset() 安全设置（不覆盖已有值）           │
│         │                                                       │
│         └── deleteHeader()   删除指定 header                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

创建 `src/helpers/headers.ts`：

```typescript
// src/helpers/headers.ts

import { normalizeHeaderName } from './normalizeHeaderName';

/**
 * 原始 headers 类型
 * 值可以是任意类型，会在处理时转为字符串
 */
export type RawHeaders = Record<string, any>;

/**
 * 规范化 headers 对象
 * 
 * 处理流程：
 * 1. 遍历所有 header 条目
 * 2. 跳过 null/undefined 值
 * 3. 规范化 header 名称
 * 4. 将值转为字符串
 * 
 * @param headers - 原始 headers 对象
 * @returns 规范化后的 headers 对象
 * 
 * @example
 * normalizeHeaders({
 *   'content-type': 'application/json',
 *   'ACCEPT': 'text/html',
 *   'x-empty': null
 * })
 * // 返回: { 'Content-Type': 'application/json', 'Accept': 'text/html' }
 */
export function normalizeHeaders(headers: RawHeaders = {}): Record<string, string> {
  const normalized: Record<string, string> = {};

  Object.entries(headers).forEach(([name, value]) => {
    // 跳过空值，这些 header 不需要发送
    if (value === undefined || value === null) {
      return;
    }

    // 规范化名称
    const normalizedName = normalizeHeaderName(name);
    
    // 如果已存在该 header（大小写不同），后者覆盖前者
    // 这符合 HTTP 规范：相同名称的 header 以最后出现的为准
    normalized[normalizedName] = String(value);
  });

  return normalized;
}

/**
 * 获取 header 值（忽略大小写）
 * 
 * 使用场景：检查用户是否已设置某个 header
 * 
 * @param headers - headers 对象
 * @param name - 要获取的 header 名称（任意大小写）
 * @returns header 值，不存在时返回 undefined
 * 
 * @example
 * getHeader({ 'Content-Type': 'application/json' }, 'content-type')
 * // 返回: 'application/json'
 */
export function getHeader(
  headers: RawHeaders,
  name: string
): string | undefined {
  const normalizedName = normalizeHeaderName(name);
  
  // 遍历查找，因为原始 headers 可能未规范化
  for (const [key, value] of Object.entries(headers)) {
    if (normalizeHeaderName(key) === normalizedName) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * 设置 header（如果不存在）
 * 
 * 关键设计：不覆盖用户已设置的值
 * 这确保了用户的显式配置优先级最高
 * 
 * @param headers - headers 对象（会被修改）
 * @param name - header 名称
 * @param value - 要设置的值
 * 
 * @example
 * const headers = { 'Accept': 'text/html' };
 * setHeaderIfUnset(headers, 'content-type', 'application/json');
 * // headers 变为: { 'Accept': 'text/html', 'Content-Type': 'application/json' }
 * 
 * setHeaderIfUnset(headers, 'ACCEPT', 'application/json');
 * // headers 不变，因为 Accept 已存在
 */
export function setHeaderIfUnset(
  headers: RawHeaders,
  name: string,
  value: string
): void {
  const normalizedName = normalizeHeaderName(name);
  
  // 检查是否已存在（忽略大小写）
  const exists = Object.keys(headers).some(
    key => normalizeHeaderName(key) === normalizedName
  );
  
  // 只有不存在时才设置
  if (!exists) {
    headers[normalizedName] = value;
  }
}

/**
 * 删除 header（忽略大小写）
 * 
 * 使用场景：
 * 1. FormData 请求需要删除 Content-Type（让浏览器自动设置）
 * 2. GET 请求删除不必要的 Content-Type
 * 
 * @param headers - headers 对象（会被修改）
 * @param name - 要删除的 header 名称
 */
export function deleteHeader(headers: RawHeaders, name: string): void {
  const normalizedName = normalizeHeaderName(name);
  
  // 删除所有匹配的 key（可能存在大小写不同的重复项）
  Object.keys(headers).forEach(key => {
    if (normalizeHeaderName(key) === normalizedName) {
      delete headers[key];
    }
  });
}
```

## 根据请求数据设置 Content-Type

理解了 headers 工具函数后，接下来要解决一个实际问题：**如何根据请求体类型自动设置合适的 Content-Type**。

### 不同数据类型的 Content-Type

```
┌─────────────────────────────────────────────────────────────────┐
│                 数据类型 → Content-Type 映射                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  普通对象 { }     ──→  application/json;charset=utf-8           │
│                        （需要 JSON.stringify 序列化）            │
│                                                                 │
│  URLSearchParams  ──→  application/x-www-form-urlencoded        │
│                        （表单格式：key1=value1&key2=value2）     │
│                                                                 │
│  FormData        ──→  multipart/form-data; boundary=xxx         │
│                        （浏览器自动设置，包含分隔符）             │
│                                                                 │
│  字符串/Blob等    ──→  保持用户设置或默认值                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Axios 会根据请求体类型自动设置 Content-Type：

```typescript
// 发送 JSON 对象 → 自动设置 application/json
axios.post('/api', { name: 'test' });

// 发送 FormData → 删除 Content-Type，让浏览器自动设置（带 boundary）
axios.post('/api', formData);

// 发送 URLSearchParams → 设置 application/x-www-form-urlencoded
axios.post('/api', new URLSearchParams({ name: 'test' }));

// 发送字符串 → 保持用户设置或使用默认值
axios.post('/api', 'plain text');
```

### processRequestHeaders 实现

创建 `src/helpers/processHeaders.ts`：

```typescript
// src/helpers/processHeaders.ts

import { normalizeHeaders, setHeaderIfUnset, deleteHeader } from './headers';
import { isPlainObject, isFormData, isURLSearchParams } from './utils';

/**
 * 处理请求头的配置选项
 */
export interface ProcessHeadersOptions {
  headers?: Record<string, any>;  // 用户配置的 headers
  data?: any;                      // 请求体数据
  method?: string;                 // HTTP 方法
}

/**
 * 处理请求头
 * 
 * 核心功能：
 * 1. 规范化 header 名称
 * 2. 根据请求数据类型自动设置 Content-Type
 * 3. 对特殊情况做适当处理
 * 
 * @param options - 处理选项
 * @returns 处理后的 headers 对象
 */
export function processRequestHeaders(options: ProcessHeadersOptions): Record<string, string> {
  const { data, method = 'get' } = options;
  let headers = { ...options.headers } || {};

  // 步骤 1: 规范化 headers
  headers = normalizeHeaders(headers);

  // 步骤 2: GET/HEAD/OPTIONS 请求不需要 Content-Type
  // 这些请求按规范不应该有请求体
  const methodsWithoutBody = ['get', 'head', 'options'];
  if (methodsWithoutBody.includes(method.toLowerCase())) {
    deleteHeader(headers, 'Content-Type');
    return headers;
  }

  // 步骤 3: 根据 data 类型设置 Content-Type
  if (data !== undefined && data !== null) {
    if (isFormData(data)) {
      // FormData 特殊处理：必须删除 Content-Type！
      // 原因：浏览器需要自动生成 boundary 分隔符
      // 如：Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxk
      deleteHeader(headers, 'Content-Type');
    } else if (isURLSearchParams(data)) {
      // URLSearchParams：表单编码格式
      // 数据格式：name=test&age=18
      setHeaderIfUnset(headers, 'Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
    } else if (isPlainObject(data)) {
      // 普通对象: JSON 格式
      // 数据会被 JSON.stringify 序列化
      setHeaderIfUnset(headers, 'Content-Type', 'application/json;charset=utf-8');
    }
    // 字符串、Blob、ArrayBuffer 等不自动设置
    // 保持用户设置的值，或由浏览器/服务器处理
  }

  return headers;
}
```

> **为什么 FormData 要删除 Content-Type？**
>
> FormData 的 Content-Type 必须包含 `boundary` 参数，用于分隔多个字段：
> ```
> Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123
> ```
> 这个 boundary 是浏览器在序列化 FormData 时自动生成的，如果我们手动设置 Content-Type，浏览器就无法正确添加 boundary，导致服务器无法解析数据。

### 类型判断工具函数

```typescript
// src/helpers/utils.ts

/**
 * 判断是否为普通对象
 * 
 * 使用 Object.prototype.toString 比 typeof 更准确
 * 因为 typeof null === 'object'，typeof [] === 'object'
 */
export function isPlainObject(val: unknown): val is Record<string, any> {
  return Object.prototype.toString.call(val) === '[object Object]';
}

/**
 * 判断是否为 FormData
 * 
 * 注意：需要先检查 FormData 是否存在
 * 因为在 Node.js 环境中默认没有 FormData
 */
export function isFormData(val: unknown): val is FormData {
  return typeof FormData !== 'undefined' && val instanceof FormData;
}

/**
 * 判断是否为 URLSearchParams
 * 
 * 同样需要环境检查
 */
export function isURLSearchParams(val: unknown): val is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * 判断是否为 Blob
 * 用于文件上传等场景
 */
export function isBlob(val: unknown): val is Blob {
  return typeof Blob !== 'undefined' && val instanceof Blob;
}

/**
 * 判断是否为 ArrayBuffer
 * 用于二进制数据传输
 */
export function isArrayBuffer(val: unknown): val is ArrayBuffer {
  return Object.prototype.toString.call(val) === '[object ArrayBuffer]';
}
```

## 在适配器中应用

有了 `processRequestHeaders` 函数，我们需要在 XHR 适配器中应用它，确保每个请求都有正确的 headers。

更新 XHR 适配器：

```typescript
// src/adapters/xhr.ts

import { processRequestHeaders } from '../helpers/processHeaders';
import { AxiosRequestConfig, AxiosResponse } from '../types';

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 处理请求头：规范化 + 自动设置 Content-Type
    const headers = processRequestHeaders({
      headers: config.headers,
      data: config.data,
      method: config.method,
    });

    // 构建完整 URL
    const url = buildURL(config.url!, config.params, config.paramsSerializer);
    
    // 打开连接
    xhr.open(config.method?.toUpperCase() || 'GET', url, true);

    // 设置请求头
    // 必须在 open() 之后、send() 之前调用
    Object.entries(headers).forEach(([name, value]) => {
      xhr.setRequestHeader(name, value);
    });

    // 设置响应类型
    if (config.responseType) {
      xhr.responseType = config.responseType;
    }

    // 设置超时
    if (config.timeout) {
      xhr.timeout = config.timeout;
    }

    // 处理响应...
    xhr.onreadystatechange = () => {
      // ... 响应处理逻辑
    };

    // 发送请求
    xhr.send(config.data ?? null);
  });
}
```

### 处理流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    XHR 请求发送流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  config.headers  ─┐                                             │
│                   │                                             │
│  config.data     ─┼──→  processRequestHeaders()                 │
│                   │            │                                │
│  config.method   ─┘            ▼                                │
│                      ┌─────────────────────┐                    │
│                      │  1. 规范化 headers   │                   │
│                      │  2. 检查请求方法     │                   │
│                      │  3. 自动设置 C-Type  │                   │
│                      └─────────┬───────────┘                    │
│                                │                                │
│                                ▼                                │
│                      ┌─────────────────────┐                    │
│                      │ xhr.setRequestHeader │                   │
│                      │  (逐个设置 headers)  │                   │
│                      └─────────┬───────────┘                    │
│                                │                                │
│                                ▼                                │
│                      ┌─────────────────────┐                    │
│                      │    xhr.send(data)    │                   │
│                      └─────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 测试请求头处理

完整的测试用例确保 headers 处理逻辑在各种场景下都能正确工作：

```typescript
import { describe, it, expect } from 'vitest';
import { processRequestHeaders } from '../src/helpers/processHeaders';

describe('processRequestHeaders', () => {
  
  // ========================================
  // 测试组 1: Content-Type 自动检测
  // ========================================
  describe('Content-Type auto-detection', () => {
    
    it('should set JSON Content-Type for plain object', () => {
      // 发送普通对象时，自动设置 application/json
      const headers = processRequestHeaders({
        data: { name: 'test' },
        method: 'post',
      });
      expect(headers['Content-Type']).toBe('application/json;charset=utf-8');
    });

    it('should not set Content-Type for FormData', () => {
      // FormData 必须让浏览器设置（带 boundary）
      const formData = new FormData();
      const headers = processRequestHeaders({
        data: formData,
        method: 'post',
      });
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should set form Content-Type for URLSearchParams', () => {
      // URLSearchParams 使用表单编码格式
      const params = new URLSearchParams();
      params.append('name', 'test');
      const headers = processRequestHeaders({
        data: params,
        method: 'post',
      });
      expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded;charset=utf-8');
    });

    it('should not set Content-Type for string data', () => {
      // 字符串数据不自动设置 Content-Type
      const headers = processRequestHeaders({
        data: 'plain text',
        method: 'post',
      });
      // 没有设置过，应该是 undefined
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  // ========================================
  // 测试组 2: Content-Type 保留用户设置
  // ========================================
  describe('Content-Type preservation', () => {
    
    it('should not override user-set Content-Type', () => {
      // 用户显式设置的 Content-Type 优先级最高
      const headers = processRequestHeaders({
        headers: { 'Content-Type': 'text/plain' },
        data: { name: 'test' },  // 即使是 JSON 对象
        method: 'post',
      });
      expect(headers['Content-Type']).toBe('text/plain');
    });

    it('should normalize user-set Content-Type header name', () => {
      // 用户设置的 header 名称应该被规范化
      const headers = processRequestHeaders({
        headers: { 'content-type': 'text/xml' },
        data: { name: 'test' },
        method: 'post',
      });
      // 名称规范化为 Content-Type
      expect(headers['Content-Type']).toBe('text/xml');
      // 原始 key 不存在
      expect(headers['content-type']).toBeUndefined();
    });
  });

  // ========================================
  // 测试组 3: GET 请求特殊处理
  // ========================================
  describe('GET requests', () => {
    
    it('should remove Content-Type for GET', () => {
      // GET 请求不应该有 Content-Type
      const headers = processRequestHeaders({
        headers: { 'Content-Type': 'application/json' },
        method: 'get',
      });
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should remove Content-Type for HEAD', () => {
      // HEAD 请求同样不需要 Content-Type
      const headers = processRequestHeaders({
        headers: { 'Content-Type': 'application/json' },
        method: 'head',
      });
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('should remove Content-Type for OPTIONS', () => {
      // OPTIONS 预检请求
      const headers = processRequestHeaders({
        headers: { 'Content-Type': 'application/json' },
        method: 'options',
      });
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  // ========================================
  // 测试组 4: Header 名称规范化
  // ========================================
  describe('header normalization', () => {
    
    it('should normalize header names', () => {
      // 各种大小写都应该被规范化
      const headers = processRequestHeaders({
        headers: {
          'content-type': 'text/plain',
          'x-custom-HEADER': 'value',
          'AUTHORIZATION': 'Bearer token',
        },
        method: 'post',
        data: 'text',
      });
      expect(headers['Content-Type']).toBe('text/plain');
      expect(headers['X-Custom-Header']).toBe('value');
      expect(headers['Authorization']).toBe('Bearer token');
    });

    it('should keep other headers when removing Content-Type', () => {
      // 删除 Content-Type 不应该影响其他 headers
      const headers = processRequestHeaders({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
          'X-Custom': 'value',
        },
        method: 'get',
      });
      expect(headers['Content-Type']).toBeUndefined();
      expect(headers['Authorization']).toBe('Bearer token');
      expect(headers['X-Custom']).toBe('value');
    });
  });
});
```

## 小结

本节我们实现了完整的请求头处理系统，解决了 HTTP headers 大小写不敏感与 JavaScript 对象 key 敏感之间的矛盾。

### 核心实现总结

| 函数 | 作用 | 使用场景 |
|------|------|---------|
| `normalizeHeaderName` | 规范化单个 header 名称 | 底层工具 |
| `normalizeHeaders` | 规范化整个 headers 对象 | 请求发送前 |
| `getHeader` | 获取 header 值（忽略大小写） | 检查用户设置 |
| `setHeaderIfUnset` | 安全设置 header | 自动设置默认值 |
| `deleteHeader` | 删除 header | FormData、GET 请求 |
| `processRequestHeaders` | 综合处理请求头 | 适配器中调用 |

### Content-Type 处理规则

| 数据类型 | Content-Type 处理 | 原因 |
|---------|------------------|------|
| 普通对象 `{}` | 自动设置 `application/json` | JSON 序列化 |
| `URLSearchParams` | 自动设置 `application/x-www-form-urlencoded` | 表单格式 |
| `FormData` | **删除** Content-Type | 让浏览器设置（含 boundary） |
| 字符串/Blob/等 | 保持用户设置 | 用户决定 |
| GET/HEAD/OPTIONS | **删除** Content-Type | 无请求体 |

### 设计原则

1. **用户优先**：`setHeaderIfUnset` 不覆盖用户设置
2. **规范兼容**：统一为 `Content-Type` 格式，符合 HTTP 规范
3. **特殊处理**：FormData 必须让浏览器设置 Content-Type
4. **方法感知**：GET 等请求删除不必要的 Content-Type

### 常见问题解答

**Q1: 为什么要规范化 header 名称？**

HTTP 协议规定 header 名称大小写不敏感，但 JavaScript 对象的 key 是敏感的。规范化确保：
- 不会出现重复的 header（如 `Content-Type` 和 `content-type`）
- 发送到服务器的 header 格式统一

**Q2: FormData 为什么要删除 Content-Type？**

FormData 的 Content-Type 必须包含 `boundary` 参数：
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryABC123
```
这个 boundary 由浏览器生成，用于分隔表单字段。如果手动设置 Content-Type，浏览器就不会添加 boundary，导致服务器无法解析。

**Q3: 为什么用 `Object.prototype.toString.call()` 判断类型？**

比 `typeof` 更精确：
```typescript
typeof null === 'object'           // 不准确！
typeof [] === 'object'             // 无法区分数组

Object.prototype.toString.call(null) === '[object Null]'
Object.prototype.toString.call([]) === '[object Array]'
Object.prototype.toString.call({}) === '[object Object]'
```

**Q4: GET 请求为什么要删除 Content-Type？**

根据 HTTP 规范，GET/HEAD/OPTIONS 请求不应该有请求体（body）。虽然技术上可以发送，但大多数服务器会忽略。保留 Content-Type 会造成困惑，还可能触发不必要的 CORS 预检请求。

下一节我们学习如何解析响应头。
