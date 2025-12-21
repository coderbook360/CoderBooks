# 查询参数的序列化机制

上一节我们留了一个 `serializeParams` 函数，这一节详细展开查询参数的序列化。这是 HTTP 客户端的核心功能之一。

## 本节目标

通过本节学习，你将掌握：

1. **序列化原理**：理解为什么需要序列化以及序列化规则
2. **类型处理**：处理数字、布尔、日期、数组、对象等不同类型
3. **数组格式**：支持 brackets、repeat、comma、indices 等多种数组格式
4. **自定义序列化**：允许用户完全控制序列化逻辑

## 为什么需要序列化？

请求参数可以是各种 JavaScript 类型，但 URL 只能包含字符串。我们需要将 JavaScript 值转换为 URL 查询字符串格式。

```typescript
axios.get('/users', {
  params: {
    id: 123,                    // 数字
    name: 'John Doe',           // 字符串（含空格）
    active: true,               // 布尔
    tags: ['a', 'b', 'c'],      // 数组
    date: new Date(),           // 日期
    filter: { status: 'open' }, // 对象
  }
});
```

这些参数需要转换成 URL 查询字符串：

```
?id=123&name=John+Doe&active=true&tags[]=a&tags[]=b&tags[]=c&date=2024-01-01T00:00:00.000Z&filter=%7B%22status%22%3A%22open%22%7D
```

### 类型转换规则

| 类型 | 转换规则 | 示例 |
|------|---------|------|
| 字符串 | 直接使用 | `'hello'` → `hello` |
| 数字 | 转字符串 | `123` → `123` |
| 布尔 | 转字符串 | `true` → `true` |
| 日期 | ISO 格式 | `new Date()` → `2024-01-01T00:00:00.000Z` |
| 数组 | 多种格式 | `[1,2]` → `key[]=1&key[]=2` |
| 对象 | JSON 字符串 | `{a:1}` → `%7B%22a%22%3A1%7D` |
| null/undefined | 忽略 | 不出现在查询字符串中 |

## 基础实现

理解了序列化需求后，让我们实现基础版本。核心思路是：遍历参数对象 → 根据类型转换 → 编码 → 拼接。

创建 `src/helpers/serializeParams.ts`：

```typescript
// src/helpers/serializeParams.ts

/**
 * 序列化查询参数
 * 
 * 将 JavaScript 对象转换为 URL 查询字符串格式
 * 支持：基本类型、数组、日期、嵌套对象
 * 
 * @param params - 参数对象
 * @returns 序列化后的字符串（不含 ?）
 * 
 * @example
 * serializeParams({ name: 'test', ids: [1, 2] })
 * // 返回: 'name=test&ids[]=1&ids[]=2'
 */
export function serializeParams(params: Record<string, any>): string {
  const parts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    // 忽略 null 和 undefined
    // 这是约定俗成的做法，这些值不应该出现在 URL 中
    if (value === null || value === undefined) {
      return;
    }

    // 处理数组：将单值包装成数组统一处理
    let values: any[];
    if (Array.isArray(value)) {
      values = value;
      key = `${key}[]`;  // 数组使用 key[] 格式（brackets 格式）
    } else {
      values = [value];
    }

    // 遍历所有值并编码
    values.forEach(val => {
      // 类型转换
      if (val instanceof Date) {
        // 日期转 ISO 字符串
        // 这是最通用的格式，服务器一般都能解析
        val = val.toISOString();
      } else if (typeof val === 'object' && val !== null) {
        // 对象转 JSON 字符串
        // 注意：深层对象会被完全序列化
        val = JSON.stringify(val);
      }
      
      // 编码 key 和 value，然后拼接
      parts.push(`${encode(key)}=${encode(val)}`);
    });
  });

  return parts.join('&');
}

/**
 * URL 编码
 * 
 * 基于 encodeURIComponent，但不编码某些特殊字符
 * 这些字符在 URL 中常见且安全，不编码可以提高可读性
 * 
 * @param val - 要编码的值
 * @returns 编码后的字符串
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')   // 冒号：常见于时间格式
    .replace(/%24/g, '$')    // 美元符：某些 API 使用
    .replace(/%2C/gi, ',')   // 逗号：常见分隔符
    .replace(/%20/g, '+')    // 空格变加号：更紧凑
    .replace(/%5B/gi, '[')   // 左方括号：数组格式
    .replace(/%5D/gi, ']');  // 右方括号：数组格式
}
```

### 序列化流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    参数序列化流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入: { id: 123, name: 'test', tags: ['a', 'b'] }              │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ Object.entries  │ → [['id', 123], ['name', 'test'], ...]     │
│  └─────────┬───────┘                                            │
│            │                                                    │
│    ┌───────┼───────────────────────────────┐                    │
│    │       ▼                               │                    │
│    │  ┌───────────┐  ┌───────────┐  ┌─────────────┐             │
│    │  │ id: 123   │  │name: test │  │tags: [a,b]  │             │
│    │  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘             │
│    │        │              │               │                    │
│    │        ▼              ▼               ▼                    │
│    │  ┌─────────┐    ┌─────────┐    ┌────────────────┐          │
│    │  │ id=123  │    │name=test│    │tags[]=a&tags[]=b│         │
│    │  └─────────┘    └─────────┘    └────────────────┘          │
│    │                                                            │
│    └────────────────────┬───────────────────────────┘           │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────┐                │
│  │  parts.join('&')                             │               │
│  └─────────────────────────────────────────────┘                │
│                         │                                       │
│                         ▼                                       │
│  输出: 'id=123&name=test&tags[]=a&tags[]=b'                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 处理数组的多种方式

不同后端对数组参数有不同的约定，这是一个常见的痛点。我们需要支持多种格式。

### 四种数组格式对比

| 格式 | 名称 | 输出示例 | 常见框架 |
|------|------|---------|---------|
| brackets | 方括号格式 | `ids[]=1&ids[]=2&ids[]=3` | PHP, Rails |
| repeat | 重复 key 格式 | `ids=1&ids=2&ids=3` | Express, Java |
| comma | 逗号分隔格式 | `ids=1,2,3` | Python, 自定义 |
| indices | 带索引格式 | `ids[0]=1&ids[1]=2&ids[2]=3` | PHP (某些版本) |

```typescript
// 方式 1：brackets 格式（默认）
// ids[]=1&ids[]=2&ids[]=3
serializeParams({ ids: [1, 2, 3] });

// 方式 2：repeat 格式
// ids=1&ids=2&ids=3
serializeParams({ ids: [1, 2, 3] }, { arrayFormat: 'repeat' });

// 方式 3：comma 格式
// ids=1,2,3
serializeParams({ ids: [1, 2, 3] }, { arrayFormat: 'comma' });

// 方式 4：indices 格式
// ids[0]=1&ids[1]=2&ids[2]=3
serializeParams({ ids: [1, 2, 3] }, { arrayFormat: 'indices' });
```

### 扩展支持多种数组格式

```typescript
// src/helpers/serializeParams.ts

/**
 * 数组格式类型
 */
export type ArrayFormat = 'brackets' | 'repeat' | 'comma' | 'indices';

/**
 * 序列化选项
 */
export interface SerializeOptions {
  /** 数组格式，默认 'brackets' */
  arrayFormat?: ArrayFormat;
  /** 是否进行 URL 编码，默认 true */
  encode?: boolean;
}

/**
 * 增强版参数序列化
 */
export function serializeParams(
  params: Record<string, any>,
  options: SerializeOptions = {}
): string {
  const { arrayFormat = 'brackets', encode: shouldEncode = true } = options;
  const parts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    // 忽略 null 和 undefined
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      // 根据 arrayFormat 处理数组
      handleArray(key, value, arrayFormat, parts, shouldEncode);
    } else {
      // 处理单值
      const val = formatValue(value);
      parts.push(formatParam(key, val, shouldEncode));
    }
  });

  return parts.join('&');
}

/**
 * 处理数组参数
 */
function handleArray(
  key: string,
  values: any[],
  format: ArrayFormat,
  parts: string[],
  shouldEncode: boolean
): void {
  switch (format) {
    case 'brackets':
      // key[]=1&key[]=2
      values.forEach(val => {
        parts.push(formatParam(`${key}[]`, formatValue(val), shouldEncode));
      });
      break;

    case 'repeat':
      // key=1&key=2
      values.forEach(val => {
        parts.push(formatParam(key, formatValue(val), shouldEncode));
      });
      break;

    case 'comma':
      // key=1,2,3
      const joined = values.map(formatValue).join(',');
      parts.push(formatParam(key, joined, shouldEncode));
      break;

    case 'indices':
      // key[0]=1&key[1]=2
      values.forEach((val, index) => {
        parts.push(formatParam(`${key}[${index}]`, formatValue(val), shouldEncode));
      });
      break;
  }
}

/**
 * 格式化值
 * 将各种类型转换为字符串
 */
function formatValue(val: any): string {
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * 格式化单个参数
 */
function formatParam(key: string, value: string, shouldEncode: boolean): string {
  if (shouldEncode) {
    return `${encode(key)}=${encode(value)}`;
  }
  return `${key}=${value}`;
}

/**
 * URL 编码
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}
```
```

## 自定义序列化函数

有时候内置的序列化逻辑无法满足需求，Axios 允许用户完全自定义序列化逻辑。

### paramsSerializer 配置

```typescript
// 使用场景：后端要求特殊的参数格式
axios.get('/api', {
  params: { ids: [1, 2, 3] },
  paramsSerializer: (params) => {
    // 自定义：使用 qs 库
    return qs.stringify(params, { arrayFormat: 'repeat' });
  }
});

// 另一个例子：完全自定义格式
axios.get('/api', {
  params: { filters: { status: 'active', type: 'user' } },
  paramsSerializer: (params) => {
    // 将对象展开为扁平格式
    // filters.status=active&filters.type=user
    const parts: string[] = [];
    Object.entries(params.filters).forEach(([key, value]) => {
      parts.push(`filters.${key}=${value}`);
    });
    return parts.join('&');
  }
});
```

### 更新类型定义

```typescript
// src/types/index.ts

export interface AxiosRequestConfig {
  // ...其他配置
  
  /** 查询参数对象 */
  params?: Record<string, any>;
  
  /** 
   * 自定义参数序列化函数
   * 如果提供，将完全接管序列化过程
   */
  paramsSerializer?: (params: Record<string, any>) => string;
}
```

### 在 buildURL 中使用

```typescript
// src/helpers/buildURL.ts

export interface BuildURLOptions {
  url: string;
  baseURL?: string;
  params?: Record<string, any>;
  paramsSerializer?: (params: Record<string, any>) => string;
}

export function buildURL(options: BuildURLOptions): string {
  const { url, params, paramsSerializer } = options;
  
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  
  // 优先使用自定义序列化函数
  const serializedParams = paramsSerializer 
    ? paramsSerializer(params) 
    : serializeParams(params);
  
  if (!serializedParams) {
    return url;
  }
  
  // 拼接 URL 和查询字符串
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${serializedParams}`;
}
```

> **设计理念**：`paramsSerializer` 提供了"逃生舱"，当内置逻辑无法满足需求时，用户可以完全控制序列化过程。这比试图支持所有可能的格式更实用。

## 处理特殊字符

URL 中某些字符有特殊含义，需要正确编码。但过度编码会降低可读性，我们需要在安全和可读之间找平衡。

### encode 函数解析

```typescript
// src/helpers/serializeParams.ts

/**
 * URL 编码
 * 
 * 为什么不直接用 encodeURIComponent？
 * 因为它会编码一些实际上安全的字符，导致 URL 难以阅读。
 * 
 * 我们选择性地还原某些字符：
 */
function encode(val: string): string {
  return encodeURIComponent(val)
    // 冒号：在时间格式中常见 (12:30:45)
    .replace(/%3A/gi, ':')
    // 美元符：某些 API 使用（如 MongoDB 查询）
    .replace(/%24/g, '$')
    // 逗号：列表分隔符
    .replace(/%2C/gi, ',')
    // 空格变加号：更紧凑，也是标准做法
    .replace(/%20/g, '+')
    // 方括号：数组格式必需
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']');
}
```

### 编码对比

| 字符 | encodeURIComponent | 我们的 encode | 原因 |
|-----|-------------------|--------------|------|
| 空格 | `%20` | `+` | 更紧凑，标准做法 |
| `:` | `%3A` | `:` | 时间格式可读性 |
| `,` | `%2C` | `,` | 列表分隔符 |
| `[` | `%5B` | `[` | 数组格式 |
| `]` | `%5D` | `]` | 数组格式 |
| `$` | `%24` | `$` | API 查询语法 |

### 为什么这样选择？

1. **可读性**：`?name=John+Doe` 比 `?name=John%20Doe` 更易读
2. **兼容性**：大多数服务器能正确解析这些字符
3. **惯例**：Axios 延续了 jQuery.param 的处理方式，保持一致性
4. **安全性**：这些字符在查询字符串中不会造成歧义

> **注意**：如果你的后端无法正确解析这些字符，可以使用 `paramsSerializer` 自定义编码逻辑。

## 测试用例

完整的测试用例覆盖各种类型和边界情况：

```typescript
import { describe, it, expect } from 'vitest';
import { serializeParams } from '../src/helpers/serializeParams';

describe('serializeParams', () => {
  
  // ========================================
  // 测试组 1: 基础类型
  // ========================================
  it('should serialize basic types', () => {
    const result = serializeParams({
      str: 'hello',
      num: 123,
      bool: true,
    });
    expect(result).toBe('str=hello&num=123&bool=true');
  });

  it('should ignore null and undefined', () => {
    const result = serializeParams({
      a: 1,
      b: null,
      c: undefined,
      d: 2,
    });
    // null 和 undefined 不应该出现在结果中
    expect(result).toBe('a=1&d=2');
  });

  // ========================================
  // 测试组 2: 数组格式
  // ========================================
  it('should serialize arrays with brackets format (default)', () => {
    const result = serializeParams(
      { ids: [1, 2, 3] },
      { arrayFormat: 'brackets' }
    );
    expect(result).toBe('ids[]=1&ids[]=2&ids[]=3');
  });

  it('should serialize arrays with repeat format', () => {
    const result = serializeParams(
      { ids: [1, 2, 3] },
      { arrayFormat: 'repeat' }
    );
    expect(result).toBe('ids=1&ids=2&ids=3');
  });

  it('should serialize arrays with comma format', () => {
    const result = serializeParams(
      { ids: [1, 2, 3] },
      { arrayFormat: 'comma' }
    );
    expect(result).toBe('ids=1,2,3');
  });

  it('should serialize arrays with indices format', () => {
    const result = serializeParams(
      { ids: [1, 2, 3] },
      { arrayFormat: 'indices' }
    );
    expect(result).toBe('ids[0]=1&ids[1]=2&ids[2]=3');
  });

  // ========================================
  // 测试组 3: 特殊类型
  // ========================================
  it('should serialize Date to ISO string', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const result = serializeParams({ date });
    expect(result).toBe('date=2024-01-01T00:00:00.000Z');
  });

  it('should serialize objects to JSON', () => {
    const result = serializeParams({
      filter: { status: 'open' },
    });
    expect(result).toContain('filter=');
    expect(decodeURIComponent(result)).toContain('{"status":"open"}');
  });

  // ========================================
  // 测试组 4: 编码
  // ========================================
  it('should encode special characters', () => {
    const result = serializeParams({ name: 'John Doe' });
    // 空格应该变成 +
    expect(result).toBe('name=John+Doe');
  });

  it('should not encode safe characters', () => {
    const result = serializeParams({ 
      time: '12:30',
      list: 'a,b,c',
    });
    // 冒号和逗号不应该被编码
    expect(result).toContain(':');
    expect(result).toContain(',');
  });

  it('should encode unsafe characters', () => {
    const result = serializeParams({ 
      query: 'hello&world=test',
    });
    // & 和 = 应该被编码，否则会破坏查询字符串结构
    expect(result).toContain('%26');  // &
    expect(result).toContain('%3D');  // =
  });

  // ========================================
  // 测试组 5: 边界情况
  // ========================================
  it('should handle empty params', () => {
    const result = serializeParams({});
    expect(result).toBe('');
  });

  it('should handle empty array', () => {
    const result = serializeParams({ ids: [] });
    expect(result).toBe('');
  });

  it('should skip encoding when encode option is false', () => {
    const result = serializeParams(
      { name: 'test value' },
      { encode: false }
    );
    // 不编码，保持原样
    expect(result).toBe('name=test value');
  });
});
```

## 小结

本节我们实现了完整的参数序列化机制，将 JavaScript 对象转换为 URL 查询字符串。

### 核心实现总结

| 功能 | 实现 | 说明 |
|------|------|------|
| 类型转换 | `formatValue` | 数字/布尔/日期/对象 → 字符串 |
| 数组处理 | `handleArray` | 支持 4 种格式 |
| URL 编码 | `encode` | 选择性编码，保持可读性 |
| 自定义 | `paramsSerializer` | 完全控制序列化 |

### 类型转换规则

| 类型 | 转换结果 | 示例 |
|------|---------|------|
| 数字 | 直接转字符串 | `123` → `'123'` |
| 布尔 | 直接转字符串 | `true` → `'true'` |
| 日期 | ISO 字符串 | `Date` → `'2024-01-01T...'` |
| 对象 | JSON 字符串 | `{a:1}` → `'{"a":1}'` |
| null/undefined | 忽略 | 不出现在 URL 中 |

### 数组格式对比

| 格式 | 示例 | 适用场景 |
|------|------|---------|
| brackets | `ids[]=1&ids[]=2` | PHP, Rails（默认） |
| repeat | `ids=1&ids=2` | Express, Java |
| comma | `ids=1,2` | Python, 自定义 |
| indices | `ids[0]=1&ids[1]=2` | 需要顺序保证 |

### 设计决策

| 决策 | 原因 |
|------|------|
| 忽略 null/undefined | 这些值不应该出现在 URL |
| 支持多种数组格式 | 适配不同后端约定 |
| 允许自定义序列化 | "逃生舱"设计 |
| 空格编码为 `+` | 更紧凑，也是标准做法 |

### 常见问题解答

**Q1: 为什么空格用 `+` 而不是 `%20`？**

两者都是有效的 URL 编码：
- `+` 更紧凑，是 `application/x-www-form-urlencoded` 格式的标准
- `%20` 是 RFC 3986 的标准
- 大多数服务器都能正确解析两种格式

**Q2: 嵌套对象如何处理？**

默认转为 JSON 字符串。如果后端期望 `filter[status]=open` 格式，使用 `paramsSerializer` 配合 `qs` 库：
```typescript
paramsSerializer: (params) => qs.stringify(params, { allowDots: true })
```

**Q3: 空数组会怎样？**

空数组不产生任何输出，因为没有元素需要序列化。

**Q4: 如何选择数组格式？**

取决于后端：
- PHP/Rails：`brackets`
- Express/Spring：`repeat`
- 自定义 API：查阅 API 文档或咨询后端

下一节我们讨论 URL 编码的细节。
