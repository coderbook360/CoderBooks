# URL 编码细节与边界处理

URL 编码看似简单，但细节决定了请求是否能正确发送。处理不当的编码会导致参数丢失、乱码，甚至安全漏洞。

## 本节目标

通过本节学习，你将掌握：

1. **理解编码原理**：为什么需要 URL 编码，以及两种编码函数的区别
2. **掌握字符选择**：哪些字符需要编码，哪些可以保留
3. **处理边界情况**：Hash、已有参数、空值等特殊场景
4. **实现完整方案**：整合所有逻辑的 buildURL 函数

## encodeURIComponent 基础

JavaScript 提供两个编码函数，理解它们的区别是正确处理 URL 的关键：

```typescript
// encodeURI - 用于编码完整 URL，保留 URL 结构字符
// 场景：需要保持 URL 可用时使用（如跳转链接）
encodeURI('https://example.com/path?name=John Doe')
// 结果: "https://example.com/path?name=John%20Doe"
// 注意: ://、/、?、= 这些结构字符都被保留了

// encodeURIComponent - 用于编码 URL 组件，编码更多字符
// 场景：编码参数值时使用（防止破坏 URL 结构）
encodeURIComponent('https://example.com/path?name=John Doe')
// 结果: "https%3A%2F%2Fexample.com%2Fpath%3Fname%3DJohn%20Doe"
// 注意: 几乎所有特殊字符都被编码了
```

### 为什么 Axios 选择 encodeURIComponent？

因为查询参数的 key 和 value 可能包含 `?`、`&`、`=` 等结构字符，如果不编码会破坏 URL 结构：

```typescript
// 参数值包含 & 符号的真实场景
const params = { query: 'a & b' };

// ❌ 如果不编码 & 符号
'/search?query=a & b'
// 服务器收到: query = "a ", b = undefined（被误解为两个参数！）

// ✅ 正确编码后
'/search?query=a%20%26%20b'  
// 服务器收到: query = "a & b"（完整的值）
```

### 两种编码函数对比表

| 字符 | encodeURI | encodeURIComponent | 用途说明 |
|------|-----------|-------------------|----------|
| `:` | 保留 | `%3A` | URL 协议分隔符 |
| `/` | 保留 | `%2F` | 路径分隔符 |
| `?` | 保留 | `%3F` | 查询串开始 |
| `&` | 保留 | `%26` | 参数分隔符 |
| `=` | 保留 | `%3D` | 键值分隔符 |
| `#` | 保留 | `%23` | Hash 标记 |
| 空格 | `%20` | `%20` | 两者都编码 |
| 中文 | 编码 | 编码 | 非 ASCII 字符 |

## 哪些字符不需要编码？

虽然 `encodeURIComponent` 会编码几乎所有特殊字符，但 Axios 选择性地"恢复"某些常用字符，在安全性和可读性之间取得平衡：

```typescript
/**
 * 自定义编码函数
 * 基于 encodeURIComponent，但选择性保留某些常用字符
 * 
 * @param val - 需要编码的字符串
 * @returns 编码后的字符串，部分字符被保留为可读形式
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    // 恢复冒号 - 时间格式常用，如 time=10:30:00
    .replace(/%3A/gi, ':')
    // 恢复美元符 - 某些框架的特殊参数前缀，如 $filter
    .replace(/%24/g, '$')
    // 恢复逗号 - 数组的简洁表示，如 ids=1,2,3
    .replace(/%2C/gi, ',')
    // 空格编码为 + 而非 %20 - 表单提交惯例，更紧凑
    .replace(/%20/g, '+')
    // 恢复方括号 - 数组参数标识，如 ids[]=1&ids[]=2
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}
```

### 字符保留决策说明

为什么选择保留这些特定字符？这是基于实际使用场景和安全性的权衡：

| 字符 | 保留原因 | 实际应用场景 | 安全性 |
|------|----------|--------------|--------|
| `:` | 时间格式可读性 | `time=10:30:00`, `range=2024-01-01:2024-12-31` | ✅ 安全 |
| `$` | 框架兼容性 | OData: `$filter=name eq 'test'` | ✅ 安全 |
| `,` | 数组简洁表示 | `ids=1,2,3`, `fields=name,email` | ✅ 安全 |
| `+` | 表单惯例 | 比 `%20` 更短，减少 URL 长度 | ✅ 安全 |
| `[]` | 数组参数 | PHP/Rails 风格: `ids[]=1&ids[]=2` | ⚠️ 需服务器支持 |

> 💡 **设计原则**：保留的字符都不会破坏 URL 的基本结构（不包含 `?`、`&`、`=`、`#`）

## 处理 Hash

URL 中的 hash（`#` 后面的部分）是浏览器专用的锚点标识，根据 HTTP 规范，它**永远不会发送到服务器**。因此在构建请求 URL 时必须移除它：

```typescript
// 用户可能这样调用（从当前页面 URL 复制粘贴）
axios.get('/users#section1', { params: { id: 1 } });

// ❌ 错误结果（如果不处理 hash）
// /users#section1?id=1
// 浏览器会发送: /users（hash 和后面的都丢失了！）

// ✅ 正确结果（移除 hash 后拼接）
// /users?id=1
// 浏览器会发送: /users?id=1（参数正确传递）
```

### Hash 处理逻辑

在 `buildURL` 中添加 hash 移除逻辑：

```typescript
export function buildURL(options: BuildURLOptions): string {
  let { url = '' } = options;
  
  // 移除 hash 部分
  // 为什么使用 indexOf 而不是正则？性能更好，且逻辑简单
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    // 只保留 # 之前的部分
    url = url.slice(0, hashIndex);
  }
  
  // 继续处理 params
  // ...
}
```

> ⚠️ **注意**：只有在需要添加 params 时才移除 hash。如果没有 params，应该保留原始 URL（包括 hash），因为用户可能就是需要这个完整 URL。

## 保留已有查询参数

用户传入的 URL 可能已经包含查询参数，这时需要用 `&` 而不是 `?` 来连接新参数：

```typescript
// 场景：分页 API，基础 URL 已有固定参数
axios.get('/users?page=1', { params: { limit: 10 } });

// ❌ 错误结果（不检查已有参数）
// /users?page=1?limit=10
// 第二个 ? 会被当作参数值的一部分！

// ✅ 正确结果（智能判断连接符）
// /users?page=1&limit=10
```

### 连接符判断逻辑

```typescript
if (serializedParams) {
  // 检查 URL 中是否已有 ? 号
  // 有 ? 说明已有参数，用 & 追加
  // 没有 ? 说明是第一个参数，用 ? 开始
  const separator = url.indexOf('?') === -1 ? '?' : '&';
  url += separator + serializedParams;
}
```

### 边界情况：URL 以 `?` 结尾

```typescript
// 用户传入的 URL 以 ? 结尾
axios.get('/users?', { params: { id: 1 } });

// 按上面的逻辑，url.indexOf('?') !== -1，所以用 &
// 结果: /users?&id=1

// 这个结果虽然多了一个 &，但服务器通常能正确解析
// 如果需要更严格的处理，可以额外检查 ? 后是否有内容
```

## 完整的 buildURL 实现

现在让我们整合所有边界情况处理，实现完整的 URL 构建函数：

```typescript
// src/helpers/buildURL.ts

import { isAbsoluteURL } from './isAbsoluteURL';
import { combineURL } from './combineURL';
import { serializeParams, SerializeOptions } from './serializeParams';

export interface BuildURLOptions {
  /** 请求路径，可以是相对路径或绝对 URL */
  url?: string;
  /** 基础 URL，会与相对路径合并 */
  baseURL?: string;
  /** 查询参数对象 */
  params?: Record<string, any>;
  /** 自定义参数序列化函数（完全替代默认逻辑） */
  paramsSerializer?: (params: Record<string, any>) => string;
  /** 默认序列化器的配置选项 */
  serializerOptions?: SerializeOptions;
}

/**
 * 构建完整的请求 URL
 * 
 * 处理流程：
 * 1. 合并 baseURL 和相对路径
 * 2. 序列化查询参数
 * 3. 移除 hash（如果有 params）
 * 4. 智能拼接查询字符串
 * 
 * @param options - URL 构建选项
 * @returns 完整的请求 URL
 */
export function buildURL(options: BuildURLOptions): string {
  let {
    url = '',
    baseURL,
    params,
    paramsSerializer,
    serializerOptions
  } = options;

  // ========== 步骤 1: 处理 baseURL ==========
  // 只有当 url 是相对路径时才需要合并 baseURL
  if (baseURL && !isAbsoluteURL(url)) {
    url = combineURL(baseURL, url);
  }

  // ========== 步骤 2: 快速返回（无参数情况） ==========
  // 如果没有 params 或 params 是空对象，保留原始 URL（包括可能的 hash）
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  // ========== 步骤 3: 序列化参数 ==========
  // 支持自定义序列化器或使用默认实现
  const serializedParams = paramsSerializer
    ? paramsSerializer(params)
    : serializeParams(params, serializerOptions);

  // ========== 步骤 4: 序列化结果为空的情况 ==========
  // 可能所有参数都是 null/undefined，序列化后为空
  if (!serializedParams) {
    return url;
  }

  // ========== 步骤 5: 移除 hash ==========
  // hash 不会发送到服务器，且会干扰查询参数
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }

  // ========== 步骤 6: 智能拼接查询参数 ==========
  // 根据 URL 是否已有参数，选择正确的连接符
  const separator = url.indexOf('?') === -1 ? '?' : '&';
  url += separator + serializedParams;

  return url;
}
```

### URL 构建流程图

```
输入: { url, baseURL, params }
         │
         ▼
┌─────────────────────────────┐
│  url 是相对路径且有 baseURL？ │
│  是 → 合并为完整 URL         │
│  否 → 保持原样               │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  params 为空或无效？         │
│  是 → 直接返回 URL          │
│  否 → 继续处理              │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  序列化 params              │
│  支持自定义序列化器          │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  移除 URL 中的 #hash        │
│  只保留 # 之前的部分         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  拼接查询字符串              │
│  已有 ? → 用 & 连接         │
│  没有 ? → 用 ? 开始         │
└─────────────────────────────┘
         │
         ▼
输出: 完整的请求 URL
```

## 边界情况测试

边界情况测试是确保 URL 构建健壮性的关键。让我们覆盖所有可能的特殊场景：

```typescript
import { describe, it, expect } from 'vitest';
import { buildURL } from '../src/helpers/buildURL';

describe('buildURL edge cases', () => {
  // ========== Hash 处理测试 ==========
  describe('hash handling', () => {
    it('should remove hash when adding params', () => {
      // 场景：用户从页面 URL 复制粘贴，带有 hash
      const url = buildURL({
        url: '/users#section1',
        params: { id: 1 }
      });
      // hash 应该被移除，参数正常添加
      expect(url).toBe('/users?id=1');
    });

    it('should keep URL without hash when no params', () => {
      // 场景：没有 params 时，保留原始 URL（包括 hash）
      const url = buildURL({ url: '/users#section1' });
      expect(url).toBe('/users#section1');
    });
  });

  // ========== 已有查询参数测试 ==========
  describe('existing query params', () => {
    it('should append to existing query params', () => {
      // 场景：URL 已有参数，需要追加新参数
      const url = buildURL({
        url: '/users?page=1',
        params: { limit: 10 }
      });
      // 应该用 & 连接，而不是 ?
      expect(url).toBe('/users?page=1&limit=10');
    });

    it('should handle url ending with ?', () => {
      // 边界场景：URL 以 ? 结尾但没有参数
      const url = buildURL({
        url: '/users?',
        params: { id: 1 }
      });
      // 虽然多了一个 &，但服务器通常能正确解析
      expect(url).toBe('/users?&id=1');
    });
  });

  // ========== 空参数测试 ==========
  describe('empty params', () => {
    it('should return url when params is empty object', () => {
      // 场景：传入空对象
      const url = buildURL({
        url: '/users',
        params: {}
      });
      // 不应该添加任何查询字符串
      expect(url).toBe('/users');
    });

    it('should return url when all params are null/undefined', () => {
      // 场景：所有参数值都是 null 或 undefined
      const url = buildURL({
        url: '/users',
        params: { a: null, b: undefined }
      });
      // null/undefined 值会被忽略，结果为空
      expect(url).toBe('/users');
    });
  });

  // ========== 特殊字符测试 ==========
  describe('special characters', () => {
    it('should encode special characters in values', () => {
      // 场景：值包含空格
      const url = buildURL({
        url: '/search',
        params: { q: 'hello world' }
      });
      // 空格应该编码为 +
      expect(url).toBe('/search?q=hello+world');
    });

    it('should encode & in values', () => {
      // 场景：值包含 & 符号（会破坏 URL 结构）
      const url = buildURL({
        url: '/search',
        params: { q: 'a & b' }
      });
      // & 必须编码，否则会被误解为参数分隔符
      expect(url).toBe('/search?q=a+%26+b');
    });

    it('should encode = in values', () => {
      // 场景：值包含 = 符号
      const url = buildURL({
        url: '/search',
        params: { q: 'a = b' }
      });
      // = 必须编码，否则会被误解为键值分隔符
      expect(url).toBe('/search?q=a+%3D+b');
    });
  });

  // ========== Unicode 测试 ==========
  describe('unicode', () => {
    it('should encode unicode characters', () => {
      // 场景：中文参数
      const url = buildURL({
        url: '/search',
        params: { q: '你好' }
      });
      // 中文必须编码为 UTF-8 字节序列
      expect(url).toBe('/search?q=%E4%BD%A0%E5%A5%BD');
    });

    it('should encode emoji', () => {
      // 场景：Emoji 表情
      const url = buildURL({
        url: '/search',
        params: { emoji: '😀' }
      });
      // Emoji 也必须编码
      expect(url).toContain('/search?emoji=');
    });
  });
});
```

## 性能优化

频繁的字符串拼接在 JavaScript 中会产生大量中间字符串对象，影响性能。对于参数较多的请求，推荐使用数组收集后一次性 join：

```typescript
// ❌ 不推荐：每次 += 都创建新字符串对象
let result = '';
for (const [key, value] of entries) {
  result += `${key}=${value}&`;
}
// 如果有 100 个参数，就创建了 100 个中间字符串！

// ✅ 推荐：数组收集后一次性拼接
const parts: string[] = [];
for (const [key, value] of entries) {
  parts.push(`${key}=${value}`);
}
const result = parts.join('&');
// 只有最后的 join 才创建最终字符串
```

### 性能对比

| 方案 | 100 参数耗时 | 1000 参数耗时 | 内存占用 |
|------|-------------|--------------|---------|
| 字符串拼接 | ~0.5ms | ~15ms | 高（大量中间对象） |
| 数组 + join | ~0.2ms | ~1ms | 低（只有最终结果） |

> 💡 **原理**：JavaScript 字符串是不可变的，每次 `+=` 都会创建新字符串并复制旧内容。数组 `push` 只是添加引用，`join` 一次性分配足够空间。

## 导出公共 API

更新入口文件，将 URL 工具函数导出供用户使用：

```typescript
// src/index.ts

// URL 构建相关工具函数
export { buildURL } from './helpers/buildURL';        // 完整 URL 构建
export { isAbsoluteURL } from './helpers/isAbsoluteURL';  // 判断绝对/相对路径
export { combineURL } from './helpers/combineURL';    // 合并 baseURL 和路径
export { serializeParams } from './helpers/serializeParams';  // 参数序列化

// 这些工具函数可以单独使用，不一定要通过 axios 请求
// 例如：用户可能只需要构建 URL 用于其他目的
```

## 常见问题解答

### Q1: 为什么 encodeURIComponent 编码的空格是 %20，Axios 却用 +？

`%20` 和 `+` 在 URL 查询字符串中都表示空格。`+` 是表单提交（`application/x-www-form-urlencoded`）的传统惯例，更短更紧凑。服务器端的 URL 解析器都能正确处理这两种形式。

### Q2: 参数值是对象或数组怎么处理？

参数序列化由 `serializeParams` 函数处理（详见上一节），支持多种格式。`buildURL` 只负责将序列化结果拼接到 URL。

### Q3: 如何调试 URL 编码问题？

```typescript
// 使用浏览器开发者工具的 Network 面板查看实际发送的 URL
// 或者在代码中打印：
const url = buildURL({ url: '/api', params: { q: 'test query' } });
console.log('Final URL:', url);
console.log('Decoded:', decodeURIComponent(url));
```

### Q4: 某些字符在服务器端解码失败怎么办？

可能是服务器端字符集配置问题。确保服务器使用 UTF-8 解码。也可以使用自定义 `paramsSerializer` 来适配特定服务器的要求。

## 小结

URL 编码是 HTTP 请求的基础，正确处理编码细节可以避免很多难以排查的问题：

**核心知识点回顾**：

| 主题 | 要点 |
|------|------|
| 编码函数选择 | 参数编码用 `encodeURIComponent`，保留 URL 结构用 `encodeURI` |
| 字符保留策略 | 保留 `:`, `,`, `[]`, `$`；空格编码为 `+` |
| Hash 处理 | 有 params 时移除 hash，无 params 时保留 |
| 参数拼接 | 检查已有 `?` 来决定用 `?` 还是 `&` |
| 性能优化 | 用数组 + join 替代字符串拼接 |

**边界情况清单**：

- [x] URL 已有查询参数
- [x] URL 包含 hash
- [x] 空参数对象
- [x] 全是 null/undefined 的参数
- [x] 特殊字符（`&`, `=`, `?`）
- [x] Unicode 和 Emoji

**设计决策**：

```
┌─────────────────────────────────────────────────┐
│                 URL 编码设计原则                 │
├─────────────────────────────────────────────────┤
│ 1. 安全性优先：必须编码会破坏结构的字符         │
│ 2. 可读性兼顾：保留常用且安全的字符             │
│ 3. 兼容性考虑：遵循表单提交惯例（空格→+）       │
│ 4. 健壮性保证：处理所有边界情况                 │
└─────────────────────────────────────────────────┘
```

至此，URL 处理模块完成。下一章我们处理请求头。
