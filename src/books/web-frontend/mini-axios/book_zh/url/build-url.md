# URL 拼接与 baseURL 处理

URL 处理是 HTTP 客户端的基础功能。这一节我们实现 URL 拼接逻辑。

## 本节目标

通过本节学习，你将：
- 理解绝对 URL 与相对 URL 的区别
- 掌握正则表达式判断绝对 URL 的技巧
- 实现可靠的 URL 拼接函数
- 完成查询参数的序列化处理

## 需求分析

Axios 支持这样的用法：

```typescript
const instance = axios.create({
  baseURL: 'https://api.example.com/v1'
});

// 相对路径 → 自动拼接 baseURL
instance.get('/users');        // → https://api.example.com/v1/users
instance.get('users');         // → https://api.example.com/v1/users

// 绝对路径 → 忽略 baseURL
instance.get('https://other.com/api');  // → https://other.com/api
```

### 核心实现点

```
┌────────────────────────────────────────────────────────────┐
│                      URL 处理流程                           │
├────────────────────────────────────────────────────────────┤
│  1. isAbsoluteURL(url) → 判断是否为绝对 URL                │
│  2. combineURL(base, url) → 拼接两个 URL                   │
│  3. buildURL(options) → 构建最终 URL，包含查询参数         │
└────────────────────────────────────────────────────────────┘
```

## 判断绝对 URL

首先我们需要区分绝对 URL 和相对 URL：

```typescript
// ==================== 绝对 URL ====================
'https://example.com/api'       // 完整 URL，包含协议
'http://localhost:3000'         // localhost 也是绝对的
'//cdn.example.com/image.png'   // 协议相对 URL（继承当前页面的协议）

// ==================== 相对 URL ====================
'/api/users'                    // 以 / 开头，相对于根路径
'users'                         // 相对于当前路径
'./users'                       // 明确的相对当前目录
'../users'                      // 上级目录
```

创建 `src/helpers/isAbsoluteURL.ts`：

```typescript
// src/helpers/isAbsoluteURL.ts

/**
 * 判断 URL 是否为绝对路径
 * 
 * 绝对 URL 的特征：
 * 1. 以 "协议://" 开头，如 "https://", "ftp://"
 * 2. 以 "//" 开头（协议相对 URL）
 * 
 * @param url 要判断的 URL
 * @returns 是否为绝对 URL
 */
export function isAbsoluteURL(url: string): boolean {
  // 正则表达式匹配绝对 URL
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
```

### 正则表达式详解

```
/^([a-z][a-z\d+\-.]*:)?\/\//i

拆解分析：
^                    → 字符串开头
(                    → 开始捕获组（协议部分）
  [a-z]              → 协议必须以字母开头
  [a-z\d+\-.]*       → 后面可以跟字母、数字、+、-、.
  :                  → 冒号
)?                   → 整个协议部分是可选的（处理 // 开头的情况）
\/\/                 → 双斜杠 //
i                    → 忽略大小写（HTTP 和 http 都合法）

匹配示例：
"https://example.com"  → 匹配 "https://"
"HTTP://example.com"   → 匹配 "HTTP://"
"//cdn.example.com"    → 匹配 "//"
"ftp://files.com"      → 匹配 "ftp://"
"/api/users"           → 不匹配（只有一个 /）
```

### 测试用例

```typescript
import { isAbsoluteURL } from '../src/helpers/isAbsoluteURL';

describe('isAbsoluteURL', () => {
  it('should return true for absolute URLs', () => {
    expect(isAbsoluteURL('https://example.com')).toBe(true);
    expect(isAbsoluteURL('http://example.com')).toBe(true);
    expect(isAbsoluteURL('HTTP://example.com')).toBe(true);  // 大写也行
    expect(isAbsoluteURL('//example.com')).toBe(true);       // 协议相对
    expect(isAbsoluteURL('ftp://example.com')).toBe(true);
    expect(isAbsoluteURL('file:///path/to/file')).toBe(true);
  });

  it('should return false for relative URLs', () => {
    expect(isAbsoluteURL('/api/users')).toBe(false);
    expect(isAbsoluteURL('api/users')).toBe(false);
    expect(isAbsoluteURL('./api/users')).toBe(false);
    expect(isAbsoluteURL('../api/users')).toBe(false);
  });
});
```

## 拼接 URL

创建 `src/helpers/combineURL.ts`：

```typescript
// src/helpers/combineURL.ts

/**
 * 拼接 baseURL 和相对 URL
 * 
 * 核心逻辑：确保两个 URL 之间只有一个斜杠
 * 
 * @param baseURL 基础 URL
 * @param relativeURL 相对 URL
 * @returns 拼接后的完整 URL
 */
export function combineURL(baseURL: string, relativeURL: string): string {
  // 如果没有 relativeURL，直接返回 baseURL
  if (!relativeURL) {
    return baseURL;
  }
  
  // 处理斜杠问题：
  // 1. 移除 baseURL 末尾的所有斜杠
  // 2. 移除 relativeURL 开头的所有斜杠
  // 3. 用单个斜杠连接
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
}
```

### 为什么要这样处理斜杠？

如果不处理，会出现各种问题：

```typescript
// 不处理斜杠的结果：
'https://api.com/' + '/users'   // → 'https://api.com//users' ❌ 双斜杠
'https://api.com' + 'users'     // → 'https://api.comusers'   ❌ 没有斜杠

// 处理后的结果：
combineURL('https://api.com', 'users');      // → 'https://api.com/users' ✅
combineURL('https://api.com/', 'users');     // → 'https://api.com/users' ✅
combineURL('https://api.com', '/users');     // → 'https://api.com/users' ✅
combineURL('https://api.com/', '/users');    // → 'https://api.com/users' ✅
combineURL('https://api.com/v1', 'users');   // → 'https://api.com/v1/users' ✅
combineURL('https://api.com/v1/', '/users'); // → 'https://api.com/v1/users' ✅
```

> **小技巧**：`/\/+$/` 匹配末尾的一个或多个斜杠，`/^\/+/` 匹配开头的一个或多个斜杠。

## 构建完整 URL

创建 `src/helpers/buildURL.ts`，整合所有 URL 处理逻辑：

```typescript
// src/helpers/buildURL.ts

import { isAbsoluteURL } from './isAbsoluteURL';
import { combineURL } from './combineURL';

export interface BuildURLOptions {
  url?: string;
  baseURL?: string;
  params?: Record<string, any>;
  paramsSerializer?: (params: Record<string, any>) => string;
}

/**
 * 构建完整的请求 URL
 * 
 * 处理流程：
 * 1. 拼接 baseURL（如果需要）
 * 2. 序列化查询参数
 * 3. 追加到 URL
 */
export function buildURL(options: BuildURLOptions): string {
  let { url = '', baseURL, params, paramsSerializer } = options;
  
  // ==================== 第一步：处理 baseURL ====================
  // 只有当 url 是相对路径时才拼接 baseURL
  if (baseURL && !isAbsoluteURL(url)) {
    url = combineURL(baseURL, url);
  }
  
  // ==================== 第二步：处理查询参数 ====================
  if (params) {
    // 支持自定义序列化函数
    const serializedParams = paramsSerializer 
      ? paramsSerializer(params) 
      : serializeParams(params);
    
    if (serializedParams) {
      // 处理 hash：URL 中 # 后面的部分应该被移除
      // 因为 hash 不会发送到服务器
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        url = url.slice(0, hashIndex);
      }
      
      // 判断是追加（&）还是新增（?）
      url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
    }
  }
  
  return url;
}

/**
 * 默认的参数序列化函数
 * 
 * 特性：
 * - 数组参数添加 [] 后缀
 * - Date 转换为 ISO 字符串
 * - 对象转换为 JSON 字符串
 * - 自动 URL 编码
 * - 忽略 null 和 undefined
 */
function serializeParams(params: Record<string, any>): string {
  const parts: string[] = [];
  
  Object.entries(params).forEach(([key, value]) => {
    // 忽略 null 和 undefined
    if (value === null || value === undefined) {
      return;
    }
    
    // 数组处理：转换为多个 key[]=value 对
    let values: any[];
    if (Array.isArray(value)) {
      values = value;
      key += '[]';  // 添加 [] 后缀
    } else {
      values = [value];
    }
    
    // 处理每个值
    values.forEach(val => {
      if (val instanceof Date) {
        val = val.toISOString();  // Date → ISO 字符串
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);  // 对象 → JSON
      }
      // URL 编码并添加到结果
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    });
  });
  
  return parts.join('&');
}
```

### 序列化示例

```typescript
serializeParams({ name: '张三', age: 25 });
// → 'name=%E5%BC%A0%E4%B8%89&age=25'

serializeParams({ ids: [1, 2, 3] });
// → 'ids[]=1&ids[]=2&ids[]=3'

serializeParams({ date: new Date('2024-01-01') });
// → 'date=2024-01-01T00:00:00.000Z'

serializeParams({ filter: { status: 'active' } });
// → 'filter=%7B%22status%22%3A%22active%22%7D'

serializeParams({ a: 1, b: null, c: undefined });
// → 'a=1'  (null 和 undefined 被忽略)
```
```

## 在适配器中使用

更新 `src/adapters/xhr.ts`，使用 buildURL：

```typescript
import { buildURL } from '../helpers/buildURL';

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // ==================== 使用 buildURL 构建完整 URL ====================
    // 这一步处理：
    // 1. baseURL 拼接
    // 2. 查询参数序列化
    const url = buildURL({
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
      paramsSerializer: config.paramsSerializer,
    });
    
    xhr.open(config.method?.toUpperCase() || 'GET', url, true);
    
    // ... 其余代码不变
  });
}
```

### 完整的 URL 处理流程

```
用户调用：axios.get('/users', { params: { page: 1 } })

处理流程：
┌─────────────────────────────────────────────────────────────┐
│  1. config.url = '/users'                                   │
│  2. config.baseURL = 'https://api.example.com'             │
│  3. config.params = { page: 1 }                             │
│                                                             │
│  buildURL 处理：                                            │
│  ├─ 判断 '/users' 是相对路径                                │
│  ├─ 拼接 baseURL → 'https://api.example.com/users'         │
│  └─ 添加参数 → 'https://api.example.com/users?page=1'      │
└─────────────────────────────────────────────────────────────┘
```
```

## 测试 URL 构建

```typescript
import { describe, it, expect } from 'vitest';
import { buildURL } from '../src/helpers/buildURL';

describe('buildURL', () => {
  describe('baseURL handling', () => {
    // 测试基本的 URL 拼接
    it('should combine baseURL and url', () => {
      const url = buildURL({
        baseURL: 'https://api.example.com',
        url: '/users'
      });
      expect(url).toBe('https://api.example.com/users');
    });

    // 测试绝对 URL 忽略 baseURL
    it('should not use baseURL for absolute url', () => {
      const url = buildURL({
        baseURL: 'https://api.example.com',
        url: 'https://other.com/api'
      });
      expect(url).toBe('https://other.com/api');
    });

    // 测试没有 baseURL 的情况
    it('should handle missing baseURL', () => {
      const url = buildURL({ url: '/users' });
      expect(url).toBe('/users');
    });
  });

  describe('params handling', () => {
    // 测试追加查询参数
    it('should append params to url', () => {
      const url = buildURL({
        url: '/users',
        params: { id: 1, name: 'test' }
      });
      expect(url).toBe('/users?id=1&name=test');
    });

    // 测试 URL 已有查询参数的情况
    it('should append params to url with existing query', () => {
      const url = buildURL({
        url: '/users?page=1',
        params: { limit: 10 }
      });
      expect(url).toBe('/users?page=1&limit=10');
    });

    // 测试数组参数
    it('should handle array params with [] suffix', () => {
      const url = buildURL({
        url: '/users',
        params: { ids: [1, 2, 3] }
      });
      expect(url).toBe('/users?ids[]=1&ids[]=2&ids[]=3');
    });

    // 测试忽略 null 和 undefined
    it('should ignore null and undefined values', () => {
      const url = buildURL({
        url: '/users',
        params: { a: 1, b: null, c: undefined, d: 2 }
      });
      expect(url).toBe('/users?a=1&d=2');
    });
    
    // 测试移除 hash
    it('should remove hash from url before appending params', () => {
      const url = buildURL({
        url: '/users#section',
        params: { id: 1 }
      });
      expect(url).toBe('/users?id=1');
    });
  });
});
```

## 小结

本节我们实现了 URL 处理的核心功能：

### 核心函数

| 函数 | 功能 | 关键点 |
|------|------|--------|
| `isAbsoluteURL` | 判断是否为绝对 URL | 正则匹配 `协议://` 或 `//` |
| `combineURL` | 拼接两个 URL | 正确处理斜杠边界 |
| `buildURL` | 构建完整请求 URL | 整合 baseURL + 参数序列化 |

### 设计决策

1. **绝对 URL 优先**：如果 URL 是绝对路径，直接使用，忽略 baseURL
2. **斜杠规范化**：确保拼接结果只有一个斜杠分隔
3. **参数追加**：使用 `?` 或 `&` 追加查询参数，不覆盖已有参数
4. **Hash 移除**：查询参数前移除 hash，因为 hash 不发送到服务器

## 常见问题解答

**Q1: 为什么协议相对 URL `//example.com` 被认为是绝对 URL？**

A: 协议相对 URL 会继承当前页面的协议（http 或 https），本质上是完整的 URL，不需要拼接 baseURL。

**Q2: 如何自定义参数序列化格式？**

A: 使用 `paramsSerializer` 配置项：
```typescript
axios.get('/api', {
  params: { ids: [1, 2, 3] },
  paramsSerializer: params => {
    // 自定义格式：ids=1,2,3
    return Object.entries(params)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
      .join('&');
  }
});
```

**Q3: 空字符串参数会被序列化吗？**

A: 会。只有 `null` 和 `undefined` 被忽略，空字符串 `''` 会被序列化为 `key=`。

---

下一节我们详细讲解查询参数的编码规则。
