# transformResponse：响应数据的反序列化

服务器返回的数据通常是 JSON 字符串，需要转换成 JavaScript 对象才能使用。本节我们实现响应数据的自动转换。

## 本节目标

通过本节学习，你将掌握：

1. **转换原理**：理解为什么需要响应转换以及默认转换逻辑
2. **responseType 处理**：不同 responseType 的数据处理策略
3. **自定义转换**：如何实现解密、数据提取等自定义转换
4. **错误处理**：转换失败时的容错策略

## 默认转换逻辑

Axios 默认将 JSON 字符串解析为 JavaScript 对象。让我们实现这个转换函数：

```typescript
// src/helpers/transformData.ts

/**
 * 默认的响应数据转换函数
 * 尝试将 JSON 字符串解析为对象
 * 
 * 设计原则：
 * 1. 只处理字符串类型的数据
 * 2. 解析失败不抛错，返回原始数据
 * 3. 已经是对象的数据直接返回
 * 
 * @param data - 响应数据（可能是字符串、对象或其他类型）
 * @returns 转换后的数据
 */
export function defaultTransformResponse(data: any): any {
  // 只处理字符串
  if (typeof data !== 'string') {
    return data;
  }

  // 空字符串直接返回
  if (!data.trim()) {
    return data;
  }

  // 尝试 JSON 解析
  try {
    return JSON.parse(data);
  } catch {
    // 解析失败返回原始字符串
    // 这可能是 HTML、纯文本或其他格式
    return data;
  }
}
```

### 为什么要 try-catch？

| 场景 | 数据示例 | 处理方式 |
|------|---------|---------|
| JSON 响应 | `'{"name":"test"}'` | 解析为对象 |
| HTML 页面 | `'<html>...'` | 返回原始字符串 |
| 纯文本 | `'Hello World'` | 返回原始字符串 |
| 空字符串 | `''` | 返回空字符串 |
| 无效 JSON | `'{invalid}'` | 返回原始字符串 |

解析失败时返回原始数据，让用户自行处理，而不是抛出错误导致整个请求失败。

## 完整的转换流程

了解了默认转换函数后，让我们看看它如何集成到请求流程中。转换发生在适配器返回响应之后、Promise resolve 之前。

```
┌─────────────────────────────────────────────────────────────────┐
│                    响应转换流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  服务器响应: '{"name":"test","id":1}'  (JSON 字符串)             │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │          transformResponse[0]            │                   │
│  │      (defaultTransformResponse)          │                   │
│  │                                          │                   │
│  │  JSON.parse → { name: 'test', id: 1 }   │                   │
│  └─────────────────────────────────────────┘                    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │          transformResponse[1]            │                   │
│  │         (自定义转换函数)                  │                   │
│  │                                          │                   │
│  │  可选：进一步处理数据                     │                   │
│  └─────────────────────────────────────────┘                    │
│         │                                                       │
│         ▼                                                       │
│  最终数据: { name: 'test', id: 1 }                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// src/core/dispatchRequest.ts

import { transform, defaultTransformRequest, defaultTransformResponse } from '../helpers/transformData';

export function dispatchRequest<T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // 确保有默认转换函数
  // 如果用户没有配置，使用默认的
  const transformRequest = config.transformRequest || [defaultTransformRequest];
  const transformResponse = config.transformResponse || [defaultTransformResponse];

  // 转换请求数据（发送前）
  config.data = transform(config.data, config.headers, transformRequest);

  // 发送请求
  const adapter = config.adapter || getDefaultAdapter();

  return adapter(config).then(
    (response) => {
      // 转换响应数据（收到后）
      // transform 函数会依次调用 transformResponse 数组中的每个函数
      response.data = transform(
        response.data,
        response.headers,
        transformResponse
      );
      return response;
    },
    (error) => {
      // 错误响应也需要转换
      // 服务器返回的错误信息可能也是 JSON
      if (error.response) {
        error.response.data = transform(
          error.response.data,
          error.response.headers,
          transformResponse
        );
      }
      return Promise.reject(error);
    }
  );
}
```
```

## 处理不同的 responseType

XMLHttpRequest 的 `responseType` 会影响返回数据的类型，我们的转换函数需要正确处理这些情况。

### responseType 类型说明

| responseType | xhr.response 类型 | 说明 |
|-------------|------------------|------|
| `''` 或 `'text'` | 字符串 | 默认，需要手动解析 |
| `'json'` | 对象/数组 | 浏览器自动解析 JSON |
| `'blob'` | Blob | 二进制数据，用于文件下载 |
| `'arraybuffer'` | ArrayBuffer | 二进制数据，用于底层处理 |
| `'document'` | Document | XML/HTML 文档 |

```typescript
// responseType = '' 或 'text'：返回字符串，需要手动解析
xhr.response; // '{"name":"test"}'

// responseType = 'json'：浏览器自动解析
xhr.response; // { name: 'test' }

// responseType = 'blob'：返回 Blob 对象
xhr.response; // Blob { size: 100, type: 'image/png' }

// responseType = 'arraybuffer'：返回 ArrayBuffer
xhr.response; // ArrayBuffer(100)
```

更新适配器以正确处理 responseType：

```typescript
// src/adapters/xhr.ts

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 设置 responseType
    // 必须在 open() 之后、send() 之前设置
    if (config.responseType) {
      xhr.responseType = config.responseType;
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 0) return;

      // 根据 responseType 获取响应数据
      let responseData: any;
      if (!config.responseType || config.responseType === 'text') {
        // text 类型使用 responseText（更兼容）
        responseData = xhr.responseText;
      } else {
        // 其他类型使用 response
        responseData = xhr.response;
      }

      const response: AxiosResponse<T> = {
        data: responseData,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        config,
        request: xhr,
      };

      resolve(response);
    };

    // ...
  });
}
```

### 优化转换函数处理已解析的 JSON

当 `responseType: 'json'` 时，浏览器已经解析过了，我们的转换函数不应该再尝试解析：

```typescript
// src/helpers/transformData.ts

export function defaultTransformResponse(data: any): any {
  // 如果已经是对象（浏览器自动解析了 JSON），直接返回
  // 这发生在 responseType: 'json' 的情况
  if (typeof data === 'object' && data !== null) {
    return data;
  }

  // 只处理字符串
  if (typeof data !== 'string') {
    return data;
  }

  // 空字符串直接返回
  const trimmed = data.trim();
  if (!trimmed) {
    return data;
  }

  // 快速检查是否可能是 JSON
  // 避免对明显不是 JSON 的字符串调用 JSON.parse
  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  const looksLikeJSON = 
    (firstChar === '{' && lastChar === '}') ||
    (firstChar === '[' && lastChar === ']');

  if (!looksLikeJSON) {
    // 明显不是 JSON，直接返回
    return data;
  }

  // 尝试 JSON 解析
  try {
    return JSON.parse(trimmed);
  } catch {
    return data;
  }
}
```

> **性能优化**：通过检查首尾字符快速判断是否像 JSON，可以避免对 HTML 等长字符串调用 `JSON.parse`，后者会触发完整的解析过程。
```

## 自定义转换函数

`transformResponse` 支持数组形式，可以配置多个转换函数形成管道。这在实际项目中非常有用。

### 常见自定义场景

用户可以完全自定义响应转换：

```typescript
// ========================================
// 场景 1：解密响应数据
// 服务器返回加密的数据，需要先解密再解析 JSON
// ========================================
const api = axios.create({
  transformResponse: [
    // 第一步：解密
    function decrypt(data) {
      if (typeof data === 'string') {
        return decryptData(data);  // 自定义解密函数
      }
      return data;
    },
    // 第二步：解析 JSON
    defaultTransformResponse,
  ],
});

// ========================================
// 场景 2：提取嵌套数据
// 服务器统一返回 { code, data, message } 格式
// 我们只关心 data 字段
// ========================================
axios.get('/api/users', {
  transformResponse: [
    defaultTransformResponse,
    function extractData(data) {
      // 服务器返回: { code: 0, data: [...], message: 'ok' }
      // 我们只要: [...]
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data;
      }
      return data;
    },
  ],
});

// ========================================
// 场景 3：日期字符串转 Date 对象
// 将 ISO 日期字符串自动转换为 Date 对象
// ========================================
function dateReviver(data: any): any {
  // ISO 日期格式正则
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  
  if (typeof data === 'string' && dateRegex.test(data)) {
    return new Date(data);
  }
  
  // 递归处理对象和数组
  if (typeof data === 'object' && data !== null) {
    Object.keys(data).forEach(key => {
      data[key] = dateReviver(data[key]);
    });
  }
  
  return data;
}

axios.get('/api/events', {
  transformResponse: [
    defaultTransformResponse,
    dateReviver,
  ],
});

// 结果：event.createdAt 是 Date 对象，而非字符串
```

### 转换管道图示

```
┌─────────────────────────────────────────────────────────────────┐
│                    自定义转换管道示例                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  服务器响应: 'encrypted_base64_string...'                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │  transform[0]: decrypt()                 │                   │
│  │  → '{"users":[...],"createdAt":"2024..."}'│                  │
│  └─────────────────────────────────────────┘                    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │  transform[1]: defaultTransformResponse  │                   │
│  │  → { users: [...], createdAt: '2024...' }│                   │
│  └─────────────────────────────────────────┘                    │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                    │
│  │  transform[2]: dateReviver               │                   │
│  │  → { users: [...], createdAt: Date }     │                   │
│  └─────────────────────────────────────────┘                    │
│         │                                                       │
│         ▼                                                       │
│  最终结果: { users: [...], createdAt: Date 对象 }                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 错误响应的转换

一个容易忽略的点是：**即使请求失败（4xx、5xx），响应数据也应该被转换**。服务器返回的错误信息通常也是 JSON 格式。

```typescript
// 服务器返回 400 错误，响应体是 JSON
axios.post('/api/users', invalidData).catch(error => {
  // error.response.data 应该是对象而非字符串
  console.log(error.response.data);
  // { code: 400, message: 'Invalid input', errors: [...] }
});
```

这已经在 `dispatchRequest` 中处理了：

```typescript
return adapter(config).then(
  (response) => { 
    // 成功响应转换
    response.data = transform(...);
    return response;
  },
  (error) => {
    if (error.response) {
      // 失败响应也转换！
      // 这样 error.response.data 就是对象而非字符串
      error.response.data = transform(
        error.response.data,
        error.response.headers,
        config.transformResponse
      );
    }
    return Promise.reject(error);
  }
);
```

> **设计理念**：无论成功还是失败，数据格式应该保持一致。这样用户在错误处理时可以直接访问 `error.response.data.message` 等属性，而不需要再手动解析 JSON。

## 测试

完整的测试用例覆盖各种数据类型和边界情况：

```typescript
import { describe, it, expect } from 'vitest';
import { defaultTransformResponse, transform } from '../src/helpers/transformData';

describe('defaultTransformResponse', () => {
  
  // ========================================
  // 测试组 1: JSON 解析
  // ========================================
  it('should parse JSON string', () => {
    const data = '{"name":"test","value":123}';
    const result = defaultTransformResponse(data);
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('should parse JSON array', () => {
    const data = '[1,2,3]';
    const result = defaultTransformResponse(data);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle whitespace around JSON', () => {
    const data = '  {"name":"test"}  ';
    const result = defaultTransformResponse(data);
    expect(result).toEqual({ name: 'test' });
  });

  // ========================================
  // 测试组 2: 非 JSON 数据
  // ========================================
  it('should return non-JSON string as is', () => {
    const data = 'Hello, World!';
    const result = defaultTransformResponse(data);
    expect(result).toBe(data);
  });

  it('should return HTML as is', () => {
    const data = '<html><body>Hello</body></html>';
    const result = defaultTransformResponse(data);
    expect(result).toBe(data);
  });

  it('should handle invalid JSON gracefully', () => {
    // 看起来像 JSON 但实际无效
    const data = '{invalid json}';
    const result = defaultTransformResponse(data);
    // 返回原始字符串，不抛错
    expect(result).toBe(data);
  });

  // ========================================
  // 测试组 3: 特殊输入
  // ========================================
  it('should return object as is', () => {
    // 已经解析过的对象（responseType: 'json'）
    const data = { already: 'parsed' };
    const result = defaultTransformResponse(data);
    expect(result).toBe(data);  // 同一个引用
  });

  it('should return empty string as is', () => {
    const result = defaultTransformResponse('');
    expect(result).toBe('');
  });

  it('should return null/undefined as is', () => {
    expect(defaultTransformResponse(null)).toBe(null);
    expect(defaultTransformResponse(undefined)).toBe(undefined);
  });

  it('should return Blob as is', () => {
    const blob = new Blob(['test']);
    const result = defaultTransformResponse(blob);
    expect(result).toBe(blob);
  });

  it('should return ArrayBuffer as is', () => {
    const buffer = new ArrayBuffer(8);
    const result = defaultTransformResponse(buffer);
    expect(result).toBe(buffer);
  });
});

describe('transform response pipeline', () => {
  
  it('should apply multiple transforms in order', () => {
    const transforms = [
      defaultTransformResponse,              // 先解析 JSON
      (data: any) => data.users,             // 再提取 users 字段
    ];
    
    const raw = '{"users":[{"id":1},{"id":2}]}';
    const result = transform(raw, {}, transforms);
    
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should pass data through all transforms', () => {
    const callOrder: string[] = [];
    
    const transforms = [
      (data: any) => { callOrder.push('first'); return data; },
      (data: any) => { callOrder.push('second'); return data; },
      (data: any) => { callOrder.push('third'); return data; },
    ];
    
    transform('test', {}, transforms);
    
    expect(callOrder).toEqual(['first', 'second', 'third']);
  });
});
```

## 性能考虑

在实际项目中，响应转换的性能也值得关注，特别是处理大型 JSON 时。

### 避免重复解析

```typescript
// 如果设置了 responseType: 'json'，浏览器已经解析过了
// 不需要再调用 JSON.parse
if (config.responseType === 'json') {
  // 跳过 defaultTransformResponse 的 JSON.parse
  // 只需要自定义转换
  config.transformResponse = [
    (data) => data,  // 直接返回，不解析
    // 其他自定义转换...
  ];
}

// 或者直接依赖 defaultTransformResponse 的对象检测
// 它会检测到 data 已经是对象，直接返回
```

### 大数据量处理

对于大型 JSON 响应（如几 MB 的数据），可以考虑流式解析：

```typescript
// 使用 JSON 流式解析库（如 stream-json）
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

const api = axios.create({
  responseType: 'stream',
  transformResponse: [
    async function streamParse(data) {
      // 流式解析大型 JSON 数组
      const items: any[] = [];
      const pipeline = data.pipe(parser()).pipe(streamArray());
      
      for await (const { value } of pipeline) {
        items.push(value);
      }
      
      return items;
    },
  ],
});
```

### 性能对比

| 场景 | 策略 | 性能影响 |
|------|------|---------|
| `responseType: 'json'` | 浏览器解析 | 最快，原生实现 |
| `responseType: 'text'` + `JSON.parse` | 手动解析 | 稍慢，但更灵活 |
| 快速检查 + `JSON.parse` | 先检查是否像 JSON | 对非 JSON 数据更友好 |
| 流式解析 | 逐步处理 | 适合超大响应 |

## 小结

本节我们实现了响应数据的自动转换功能，将服务器返回的 JSON 字符串自动解析为 JavaScript 对象。

### 核心实现总结

| 功能 | 实现方式 | 说明 |
|------|---------|------|
| 默认转换 | `defaultTransformResponse` | 自动解析 JSON |
| 管道模式 | `transformResponse` 数组 | 支持多个转换函数 |
| 错误响应 | 在 `dispatchRequest` 中处理 | 失败响应也转换 |
| 容错处理 | try-catch | 解析失败返回原始数据 |

### 转换流程

```
响应数据 → transform[0] → transform[1] → ... → 最终数据 → 返回给用户
```

### 设计原则

| 原则 | 实现 | 好处 |
|------|------|------|
| 安全优先 | 解析失败不抛错 | 不会因为格式问题中断流程 |
| 类型感知 | 检测对象类型 | 避免重复解析 |
| 可扩展 | 数组形式配置 | 支持复杂转换管道 |
| 统一处理 | 错误响应也转换 | 一致的数据格式 |

### 常见问题解答

**Q1: transformResponse 和拦截器有什么区别？**

| 特性 | transformResponse | 响应拦截器 |
|------|-------------------|-----------|
| 执行时机 | 适配器返回后立即执行 | 在 transformResponse 之后 |
| 访问范围 | 只能访问 data 和 headers | 可以访问完整的 response |
| 典型用途 | 数据格式转换 | 错误处理、token 刷新 |

**Q2: 为什么默认转换要检查是否"看起来像 JSON"？**

避免对明显不是 JSON 的字符串调用 `JSON.parse`。虽然 `JSON.parse` 会抛错（被 try-catch 捕获），但对于大型 HTML 页面这会有不必要的性能开销。

**Q3: 使用 `responseType: 'json'` 有什么好处？**

浏览器原生解析通常比 JavaScript 解析更快，而且会自动处理 UTF-8 编码问题。推荐在明确返回 JSON 的情况下使用。

**Q4: 如何完全禁用默认转换？**

```typescript
axios.get('/api', {
  transformResponse: [(data) => data],  // 直接返回，不转换
});
```

下一节我们讨论适配器模式。
