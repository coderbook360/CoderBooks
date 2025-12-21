# 响应头的解析策略

服务器返回的响应头是一个长字符串，需要解析成对象才能方便使用。本节我们实现响应头解析功能。

## 本节目标

通过本节学习，你将掌握：

1. **响应头格式**：理解 HTTP 响应头的原始格式和结构
2. **解析算法**：实现将字符串解析为对象的算法
3. **边界处理**：处理空行、多值 header、value 中包含冒号等情况
4. **访问器模式**：提供大小写不敏感的 header 访问接口

## 原始响应头格式

XMLHttpRequest 返回的响应头是这样的：

```typescript
const headersString = xhr.getAllResponseHeaders();
// "content-type: application/json; charset=utf-8\r\n
//  date: Mon, 01 Jan 2024 00:00:00 GMT\r\n
//  x-custom-header: custom-value\r\n"
```

### 格式特点分析

| 特点 | 说明 | 处理策略 |
|------|------|---------|
| 每行一个 header | 格式为 `name: value` | 按行分割 |
| 行分隔符 | `\r\n`（CRLF）或 `\n` | 用正则 `/\r?\n/` 兼容 |
| 名称与值用冒号分隔 | value 中也可能有冒号 | 只在第一个冒号处分割 |
| 可能有空行 | 特别是末尾 | 过滤空行 |

```
┌─────────────────────────────────────────────────────────────────┐
│                    响应头字符串结构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "content-type: application/json\r\n"  ← 第一行                 │
│  "date: Mon, 01 Jan 2024 00:00:00 GMT\r\n"  ← 第二行            │
│  "x-custom: value\r\n"  ← 第三行                                │
│  ""  ← 可能有空行                                                │
│                                                                 │
│  解析后：                                                        │
│  {                                                              │
│    "content-type": "application/json",                          │
│    "date": "Mon, 01 Jan 2024 00:00:00 GMT",                     │
│    "x-custom": "value"                                          │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 解析响应头

理解了格式特点后，我们来实现解析函数。核心思路是：按行分割 → 过滤无效行 → 分离 name 和 value。

创建 `src/helpers/parseHeaders.ts`：

```typescript
// src/helpers/parseHeaders.ts

/**
 * 解析响应头字符串
 * 将 "name: value\r\nname2: value2" 格式解析为对象
 * 
 * 解析流程：
 * 1. 按换行符分割成数组
 * 2. 遍历每行，跳过无效行
 * 3. 找到第一个冒号，分离 name 和 value
 * 4. 存入结果对象（name 小写化）
 * 
 * @param headers - 响应头字符串
 * @returns 解析后的 headers 对象
 * 
 * @example
 * parseHeaders('Content-Type: application/json\r\nX-Custom: value')
 * // 返回: { 'content-type': 'application/json', 'x-custom': 'value' }
 */
export function parseHeaders(headers: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  // 空字符串直接返回空对象
  if (!headers) {
    return parsed;
  }

  // 按行分割，兼容 \r\n 和 \n
  const lines = headers.split(/\r?\n/);

  lines.forEach(line => {
    // 跳过空行（常见于字符串末尾）
    if (!line.trim()) {
      return;
    }

    // 找到第一个冒号的位置
    // 注意：value 中可能包含冒号（如 URL、时间格式）
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;  // 无效行（无冒号），跳过
    }

    // 分离 name 和 value
    const name = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    // 名称为空视为无效
    if (!name) {
      return;
    }

    // 存入结果，名称小写化
    // 小写化的原因：HTTP 头名称不区分大小写
    // 小写化后用户访问时不需要关心原始大小写
    parsed[name.toLowerCase()] = value;
  });

  return parsed;
}
```

### 为什么用 `toLowerCase()`？

| 原因 | 说明 |
|------|------|
| HTTP 规范 | 头名称不区分大小写（RFC 7230） |
| 用户友好 | 访问时不需要猜测大小写 |
| 便于比较 | `headers['content-type']` 统一访问方式 |
| 一致性 | 避免 `Content-Type` 和 `content-type` 共存 |

## 处理特殊情况

基础实现已经能处理大多数情况，但有一些边界情况需要额外考虑。

### 多值 Header

某些 header 可能有多个值（如 `Set-Cookie`）：

```
Set-Cookie: sessionId=abc; Path=/
Set-Cookie: userId=123; Path=/
```

> **注意**：`Set-Cookie` 是 HTTP 中唯一允许出现多次的响应头。不同于其他 header，浏览器会保留所有 `Set-Cookie` 值。

扩展解析函数以支持多值：

```typescript
// src/helpers/parseHeaders.ts

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 是否将多个同名 header 合并为数组 */
  arrayValues?: boolean;
}

/**
 * 增强版解析函数，支持多值 header
 * 
 * @param headers - 响应头字符串
 * @param options - 解析选项
 * @returns 解析后的 headers 对象
 */
export function parseHeaders(
  headers: string,
  options: ParseOptions = {}
): Record<string, string | string[]> {
  const { arrayValues = false } = options;
  const parsed: Record<string, string | string[]> = {};

  if (!headers) {
    return parsed;
  }

  const lines = headers.split(/\r?\n/);

  lines.forEach(line => {
    if (!line.trim()) return;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const name = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (!name) return;

    if (arrayValues && parsed[name] !== undefined) {
      // 已存在该 header，需要转为数组
      const existing = parsed[name];
      if (Array.isArray(existing)) {
        // 已经是数组，直接追加
        existing.push(value);
      } else {
        // 首次重复，转为数组
        parsed[name] = [existing, value];
      }
    } else {
      // 不启用数组模式，或首次出现
      // 后值覆盖前值（默认行为）
      parsed[name] = value;
    }
  });

  return parsed;
}
```

### Value 中包含冒号

URL 或时间格式中可能包含冒号，这是最容易出错的边界情况：

```
Location: https://example.com:8080/path
Date: Mon, 01 Jan 2024 12:30:45 GMT
```

我们的实现已经正确处理了这种情况：

```typescript
// 只在第一个冒号处分割
const colonIndex = line.indexOf(':');
const name = line.slice(0, colonIndex);         // "Location"
const value = line.slice(colonIndex + 1).trim(); // "https://example.com:8080/path"
```

### 解析流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    parseHeaders 处理流程                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  输入: "Content-Type: application/json\r\nDate: Mon...\r\n"     │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                            │
│  │ split(/\r?\n/)  │ → 按换行分割成数组                          │
│  └─────────┬───────┘                                            │
│            ▼                                                    │
│  ┌─────────────────┐                                            │
│  │  forEach(line)  │ → 遍历每一行                                │
│  └─────────┬───────┘                                            │
│            ▼                                                    │
│  ┌─────────────────┐                                            │
│  │ line.trim()     │ → 空行？ ──Yes──→ 跳过                      │
│  └─────────┬───────┘                                            │
│            │ No                                                 │
│            ▼                                                    │
│  ┌─────────────────┐                                            │
│  │ indexOf(':')    │ → 无冒号？ ──Yes──→ 跳过                    │
│  └─────────┬───────┘                                            │
│            │ 找到冒号                                            │
│            ▼                                                    │
│  ┌─────────────────┐                                            │
│  │ slice 分离      │ → name 为空？ ──Yes──→ 跳过                 │
│  └─────────┬───────┘                                            │
│            │ name 有效                                          │
│            ▼                                                    │
│  ┌─────────────────┐                                            │
│  │ parsed[name] =  │ → 存入结果对象                              │
│  │   value         │                                            │
│  └─────────────────┘                                            │
│                                                                 │
│  输出: { 'content-type': '...', 'date': '...' }                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 在适配器中使用

解析函数完成后，需要在 XHR 适配器中调用它，将原始字符串转换为对象。

更新 XHR 适配器：

```typescript
// src/adapters/xhr.ts

import { parseHeaders } from '../helpers/parseHeaders';
import { AxiosRequestConfig, AxiosResponse } from '../types';

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      // 只处理完成状态
      if (xhr.readyState !== 4) return;
      
      // status 为 0 表示网络错误（请求未发出）
      if (xhr.status === 0) return;

      // 解析响应头：字符串 → 对象
      // getAllResponseHeaders() 返回所有响应头的原始字符串
      const responseHeaders = parseHeaders(xhr.getAllResponseHeaders());

      // 获取响应数据
      // 根据 responseType 决定使用 responseText 还是 response
      const responseData = config.responseType === 'text' 
        ? xhr.responseText 
        : xhr.response;

      // 构建标准响应对象
      const response: AxiosResponse<T> = {
        data: responseData,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,  // 现在是对象，方便访问
        config,
        request: xhr,
      };

      resolve(response);
    };

    // ... 其他代码
  });
}
```

## 响应头访问 API

虽然我们已经将 header 名称小写化，但为了提供更好的开发体验，可以创建一个访问器，支持任意大小写访问。

为了方便访问，提供 getter 函数：

```typescript
// src/helpers/parseHeaders.ts

/**
 * 创建响应头访问器
 * 提供大小写不敏感的 header 访问
 * 
 * 为什么需要访问器？
 * 1. 用户可能不知道 header 名称已被小写化
 * 2. 提供更直观的 API（get/has 方法）
 * 3. 隐藏内部实现细节
 * 
 * @param headers - 解析后的 headers 对象
 * @returns 访问器对象
 */
export function createHeadersAccessor(headers: Record<string, string>) {
  // 预先小写化所有 key，提高访问效率
  const normalized = Object.entries(headers).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {} as Record<string, string>);

  return {
    /**
     * 获取 header 值（大小写不敏感）
     * @param name - header 名称
     * @returns header 值，不存在返回 undefined
     */
    get(name: string): string | undefined {
      return normalized[name.toLowerCase()];
    },

    /**
     * 检查 header 是否存在
     * @param name - header 名称
     * @returns 是否存在
     */
    has(name: string): boolean {
      return name.toLowerCase() in normalized;
    },

    /**
     * 获取所有 headers 的副本
     * @returns headers 对象的浅拷贝
     */
    toJSON(): Record<string, string> {
      return { ...normalized };
    },
  };
}
```

使用示例：

```typescript
const response = await axios.get('/api');

// 方式 1：直接访问（需要知道是小写）
console.log(response.headers['content-type']);

// 方式 2：使用访问器（大小写不敏感）
const headers = createHeadersAccessor(response.headers);
console.log(headers.get('Content-Type'));   // ✓ 任意大小写都可以
console.log(headers.get('CONTENT-TYPE'));   // ✓ 同样可以
console.log(headers.has('X-Custom'));       // 检查是否存在
```

## 测试

完整的测试用例覆盖各种边界情况：

```typescript
import { describe, it, expect } from 'vitest';
import { parseHeaders, createHeadersAccessor } from '../src/helpers/parseHeaders';

describe('parseHeaders', () => {
  
  // ========================================
  // 测试组 1: 基础解析
  // ========================================
  it('should parse simple headers', () => {
    const headers = parseHeaders(
      'Content-Type: application/json\r\n' +
      'X-Custom-Header: value\r\n'
    );
    // 验证解析结果和小写化
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-custom-header']).toBe('value');
  });

  // ========================================
  // 测试组 2: 特殊情况处理
  // ========================================
  it('should handle value with colon', () => {
    // URL 和时间格式中包含冒号
    const headers = parseHeaders('Location: https://example.com:8080/path\r\n');
    expect(headers['location']).toBe('https://example.com:8080/path');
  });

  it('should handle empty string', () => {
    const headers = parseHeaders('');
    expect(headers).toEqual({});
  });

  it('should skip invalid lines', () => {
    const headers = parseHeaders(
      'Valid-Header: value\r\n' +
      'invalid line without colon\r\n' +  // 无冒号，跳过
      ': value without name\r\n'          // 无名称，跳过
    );
    expect(Object.keys(headers)).toHaveLength(1);
    expect(headers['valid-header']).toBe('value');
  });

  it('should trim whitespace', () => {
    // 首尾空白应被去除
    const headers = parseHeaders('  Content-Type  :  application/json  \r\n');
    expect(headers['content-type']).toBe('application/json');
  });

  it('should handle LF line endings', () => {
    // 兼容 \n 换行（非标准但可能出现）
    const headers = parseHeaders(
      'Content-Type: application/json\n' +
      'X-Custom: value\n'
    );
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-custom']).toBe('value');
  });

  // ========================================
  // 测试组 3: 多值 header
  // ========================================
  it('should merge duplicate headers into array when arrayValues is true', () => {
    const headers = parseHeaders(
      'Set-Cookie: sessionId=abc\r\n' +
      'Set-Cookie: userId=123\r\n',
      { arrayValues: true }
    );
    expect(headers['set-cookie']).toEqual(['sessionId=abc', 'userId=123']);
  });

  it('should use last value when arrayValues is false', () => {
    const headers = parseHeaders(
      'Set-Cookie: sessionId=abc\r\n' +
      'Set-Cookie: userId=123\r\n'
    );
    // 默认行为：后值覆盖前值
    expect(headers['set-cookie']).toBe('userId=123');
  });
});

describe('createHeadersAccessor', () => {
  
  it('should provide case-insensitive access', () => {
    const accessor = createHeadersAccessor({
      'content-type': 'application/json',
    });
    // 任意大小写都应该能访问
    expect(accessor.get('Content-Type')).toBe('application/json');
    expect(accessor.get('CONTENT-TYPE')).toBe('application/json');
    expect(accessor.get('content-type')).toBe('application/json');
  });

  it('should check header existence', () => {
    const accessor = createHeadersAccessor({
      'content-type': 'application/json',
    });
    expect(accessor.has('content-type')).toBe(true);
    expect(accessor.has('Content-Type')).toBe(true);
    expect(accessor.has('x-not-exist')).toBe(false);
  });

  it('should return copy of headers', () => {
    const original = { 'content-type': 'application/json' };
    const accessor = createHeadersAccessor(original);
    const copy = accessor.toJSON();
    
    // 修改副本不影响原始对象
    copy['content-type'] = 'text/plain';
    expect(accessor.get('content-type')).toBe('application/json');
  });
});
```

## 小结

本节我们实现了响应头解析功能，将浏览器返回的原始字符串转换为易用的 JavaScript 对象。

### 核心实现总结

| 函数 | 作用 | 输入 → 输出 |
|------|------|------------|
| `parseHeaders` | 解析响应头字符串 | 字符串 → 对象 |
| `createHeadersAccessor` | 创建访问器 | 对象 → 访问器 |

### 解析要点

| 要点 | 实现方式 | 原因 |
|------|---------|------|
| 按行分割 | `/\r?\n/` 正则 | 兼容 CRLF 和 LF |
| 找冒号位置 | `indexOf(':')` | value 中可能有冒号 |
| 名称小写化 | `toLowerCase()` | HTTP 头不区分大小写 |
| 跳过无效行 | 检查空行和无冒号 | 容错处理 |

### 边界情况检查清单

- [x] 空字符串输入
- [x] 无效格式行（无冒号）
- [x] value 中包含冒号（URL、时间）
- [x] 首尾空白字符
- [x] 多值 header（Set-Cookie）
- [x] 只有 LF 换行（非标准）
- [x] 名称为空的行

### 常见问题解答

**Q1: 为什么不用 `split(':')` 分割？**

因为 `split(':')` 会在所有冒号处分割，导致 URL 类型的值被错误分割：
```typescript
'Location: https://example.com:8080'.split(':')
// ['Location', ' https', '//example.com', '8080']  // 错误！

'Location: https://example.com:8080'.indexOf(':')  // 8
// 只找第一个冒号，然后 slice 分离  // 正确
```

**Q2: 为什么要小写化而不是保持原样？**

HTTP 规范明确表示 header 名称不区分大小写。小写化的好处：
1. 避免 `Content-Type` 和 `content-type` 共存
2. 用户访问时不需要猜测大小写
3. 比较和查找更方便

**Q3: 多值 header 如何处理？**

默认行为是后值覆盖前值。如果需要保留所有值（如 `Set-Cookie`），使用 `arrayValues: true` 选项。

下一节我们实现默认请求头配置。
