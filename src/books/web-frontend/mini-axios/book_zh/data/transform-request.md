# transformRequest：请求数据的序列化

Axios 在发送请求前会对数据进行转换。这一节我们实现 `transformRequest` 功能。

## 本节目标

通过本节学习，你将：
- 理解为什么需要请求数据转换
- 掌握不同数据类型的处理策略
- 实现管道式的多重转换功能
- 学会在实际项目中自定义转换逻辑

## 为什么需要转换？

XMLHttpRequest 的 `send()` 方法接受的数据类型有限：

```typescript
// ==================== 可以直接发送的类型 ====================
xhr.send(null);                              // 空请求体
xhr.send('string');                          // 字符串
xhr.send(formData);                          // FormData
xhr.send(blob);                              // Blob（二进制大对象）
xhr.send(arrayBuffer);                       // ArrayBuffer（二进制数据）

// ==================== 不能直接发送的类型 ====================
xhr.send({ name: 'test' });                  // ❌ 对象！会被转成 "[object Object]"
```

**问题**：我们在写业务代码时，通常直接传对象：

```typescript
axios.post('/api/users', { name: '张三', age: 25 });
```

**解决方案**：在发送前，将对象序列化为 JSON 字符串：

```
{ name: '张三', age: 25 }  →  '{"name":"张三","age":25}'
```

## 默认转换逻辑

创建 `src/helpers/transformData.ts`：

```typescript
// src/helpers/transformData.ts

import { isPlainObject, isFormData, isBlob, isArrayBuffer } from './utils';

export type TransformFn = (data: any, headers?: Record<string, any>) => any;

/**
 * 默认的请求数据转换函数
 * 核心逻辑：只对普通对象进行 JSON 序列化，其他类型直接透传
 */
export function defaultTransformRequest(
  data: any,
  headers?: Record<string, any>
): any {
  // ==================== 直接透传的类型 ====================
  
  // FormData：浏览器会自动设置 multipart/form-data 和 boundary
  if (isFormData(data)) {
    return data;
  }
  
  // Blob：二进制大对象，如文件
  if (isBlob(data)) {
    return data;
  }
  
  // ArrayBuffer：原始二进制数据
  if (isArrayBuffer(data)) {
    return data;
  }
  
  // URLSearchParams：表单编码格式 a=1&b=2
  if (data instanceof URLSearchParams) {
    return data;
  }
  
  // 字符串：已经序列化
  if (typeof data === 'string') {
    return data;
  }

  // ArrayBufferView（如 Uint8Array）：TypedArray
  if (ArrayBuffer.isView(data)) {
    return data;
  }

  // ==================== 需要转换的类型 ====================
  
  // 普通对象 → JSON 字符串
  if (isPlainObject(data)) {
    return JSON.stringify(data);
  }

  return data;
}
```

### 为什么这样处理？

| 类型 | 处理方式 | 原因 |
|------|----------|------|
| `FormData` | 直接透传 | 浏览器自动处理 Content-Type 和 boundary |
| `Blob` | 直接透传 | 二进制数据，XHR 原生支持 |
| `ArrayBuffer` | 直接透传 | 二进制数据，XHR 原生支持 |
| `URLSearchParams` | 直接透传 | XHR 会自动设置正确的 Content-Type |
| `string` | 直接透传 | 已经是可发送格式 |
| `普通对象` | **JSON.stringify** | 需要序列化才能发送 |

> **注意**：如果你手动处理 FormData 的 Content-Type，会丢失 boundary 导致服务器解析失败。

## 支持多个转换函数

Axios 允许配置多个转换函数，按顺序执行，形成「管道」：

```typescript
axios.post('/api', data, {
  transformRequest: [
    function (data, headers) {
      // 第一步：添加时间戳
      return { ...data, timestamp: Date.now() };
    },
    function (data, headers) {
      // 第二步：序列化为 JSON
      return JSON.stringify(data);
    },
  ],
});
```

### 管道执行流程

```
原始数据
    │
    ▼
┌─────────────────┐
│  transform[0]   │  添加 timestamp
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  transform[1]   │  JSON.stringify
└────────┬────────┘
         │
         ▼
   最终数据 → 发送到服务器
```

### 实现管道处理

```typescript
// src/helpers/transformData.ts

/**
 * 应用转换函数
 * 
 * 使用 reduce 实现管道模式：
 * 每个函数的输出是下一个函数的输入
 * 
 * @param data 原始数据
 * @param headers 请求头（可在转换函数中修改）
 * @param fns 转换函数或函数数组
 */
export function transform(
  data: any,
  headers: Record<string, any> | undefined,
  fns?: TransformFn | TransformFn[]
): any {
  // 没有转换函数，直接返回原数据
  if (!fns) {
    return data;
  }

  // 统一转为数组处理
  const transformers = Array.isArray(fns) ? fns : [fns];

  // 管道处理：reduce 的累加器 acc 就是上一个函数的输出
  return transformers.reduce((acc, fn) => {
    return fn(acc, headers);
  }, data);
}
```

> **为什么用 reduce？** reduce 天然适合管道模式，累加器保存中间结果，初始值是原始数据。
```

## 更新类型定义

```typescript
// src/types/index.ts

export type TransformFn = (data: any, headers?: Record<string, any>) => any;

export interface AxiosRequestConfig {
  // ...
  transformRequest?: TransformFn | TransformFn[];
  transformResponse?: TransformFn | TransformFn[];
}
```

## 更新默认配置

```typescript
// src/defaults/index.ts

import { defaultTransformRequest } from '../helpers/transformData';

export const defaults: AxiosDefaults = {
  // ...
  transformRequest: [defaultTransformRequest],
  transformResponse: [defaultTransformResponse],  // 下一节实现
};
```

## 在请求流程中应用

更新 `dispatchRequest`，在发送前应用转换：

```typescript
// src/core/dispatchRequest.ts

import { transform } from '../helpers/transformData';

export function dispatchRequest<T = any>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // ==================== 1. 应用请求转换 ====================
  // 在发送前，对 data 进行转换
  config.data = transform(
    config.data,
    config.headers,
    config.transformRequest
  );

  // ==================== 2. 选择适配器并发送请求 ====================
  const adapter = config.adapter || getDefaultAdapter();
  
  return adapter(config).then(
    (response) => {
      // ==================== 3. 应用响应转换 ====================
      // 请求成功，转换响应数据
      response.data = transform(
        response.data,
        response.headers,
        config.transformResponse
      );
      return response;
    },
    (error) => {
      // ==================== 4. 错误响应也需要转换 ====================
      // 服务器返回了错误响应（如 400、500），也要转换 data
      if (error.response) {
        error.response.data = transform(
          error.response.data,
          error.response.headers,
          config.transformResponse
        );
      }
      return Promise.reject(error);
    }
  );
}
```

### 完整的转换流程

```
请求阶段：
原始 data → transformRequest[] → 转换后的 data → 发送

响应阶段：
收到 response.data → transformResponse[] → 转换后的 data → 返回给调用者
```
```

## 实际使用场景

### 场景1：加密请求数据

在金融、医疗等安全敏感场景，请求数据需要加密：

```typescript
import { encrypt } from './crypto';

const api = axios.create({
  transformRequest: [
    // 第一步：序列化并加密
    function encryptData(data) {
      if (!data) return data;
      return encrypt(JSON.stringify(data));  // 加密后的字符串
    },
    // 第二步：添加加密标记
    function addHeaders(data, headers) {
      if (headers) {
        headers['X-Encrypted'] = 'true';
        headers['Content-Type'] = 'application/octet-stream';
      }
      return data;
    },
  ],
});
```

### 场景2：添加公共参数

每个请求都需要携带 appId、时间戳等公共参数：

```typescript
import { defaultTransformRequest } from 'axios/lib/defaults';

axios.defaults.transformRequest = [
  // 第一步：添加公共参数（在序列化之前）
  function addCommonParams(data) {
    if (isPlainObject(data)) {
      return {
        ...data,
        appId: 'my-app',
        timestamp: Date.now(),
        version: '1.0.0',
      };
    }
    return data;
  },
  // 第二步：使用默认的 JSON 序列化
  ...defaultTransformRequest,
];
```

> **注意**：自定义 transformRequest 会覆盖默认行为，如果还需要 JSON 序列化，记得包含 defaultTransformRequest。

### 场景3：对象转 FormData

文件上传时，需要将对象转为 FormData：

```typescript
axios.post('/upload', { file, name, description }, {
  transformRequest: [
    function toFormData(data) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return formData;
      // 注意：返回 FormData 后，浏览器会自动设置正确的 Content-Type
    },
  ],
});
  ],
});
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { transform, defaultTransformRequest } from '../src/helpers/transformData';

describe('defaultTransformRequest', () => {
  // 测试核心功能：普通对象应该被序列化
  it('should stringify plain object', () => {
    const data = { name: 'test', value: 123 };
    const result = defaultTransformRequest(data);
    expect(result).toBe('{"name":"test","value":123}');
  });

  // 测试：字符串应该直接透传
  it('should not transform string', () => {
    const data = 'already a string';
    const result = defaultTransformRequest(data);
    expect(result).toBe(data);
  });

  // 测试：FormData 应该直接透传
  it('should not transform FormData', () => {
    const data = new FormData();
    const result = defaultTransformRequest(data);
    expect(result).toBe(data);  // 同一个引用
  });

  // 测试：Blob 应该直接透传
  it('should not transform Blob', () => {
    const data = new Blob(['test']);
    const result = defaultTransformRequest(data);
    expect(result).toBe(data);
  });

  // 测试：URLSearchParams 应该直接透传
  it('should not transform URLSearchParams', () => {
    const data = new URLSearchParams('a=1&b=2');
    const result = defaultTransformRequest(data);
    expect(result).toBe(data);
  });

  // 测试：ArrayBuffer 应该直接透传
  it('should not transform ArrayBuffer', () => {
    const data = new ArrayBuffer(8);
    const result = defaultTransformRequest(data);
    expect(result).toBe(data);
  });
});

describe('transform', () => {
  // 测试：单个转换函数
  it('should apply single transform function', () => {
    const fn = vi.fn((data) => data * 2);
    const result = transform(5, undefined, fn);
    expect(result).toBe(10);
    expect(fn).toHaveBeenCalledWith(5, undefined);
  });

  // 测试：多个转换函数按顺序执行
  it('should apply multiple transform functions in order', () => {
    const fns = [
      (data: number) => data + 1,   // 5 + 1 = 6
      (data: number) => data * 2,   // 6 * 2 = 12
      (data: number) => data - 3,   // 12 - 3 = 9
    ];
    const result = transform(5, undefined, fns);
    expect(result).toBe(9);
  });

  // 测试：没有转换函数时返回原数据
  it('should return data unchanged if no transforms', () => {
    const data = { test: true };
    const result = transform(data, undefined, undefined);
    expect(result).toBe(data);
  });

  // 测试：转换函数可以修改 headers
  it('should pass headers to transform function', () => {
    const fn = vi.fn((data, headers) => {
      headers['X-Custom'] = 'value';
      return data;
    });
    const headers: Record<string, string> = {};
    transform({}, headers, fn);
    expect(headers).toHaveProperty('X-Custom', 'value');
  });
});
```

## 小结

本节我们实现了 `transformRequest` 功能，让 Axios 能够自动处理各种类型的请求数据。

### 核心要点

| 要点 | 说明 |
|------|------|
| **管道模式** | 支持多个转换函数依次执行，每个输出是下个输入 |
| **默认行为** | 只对普通对象进行 JSON 序列化 |
| **透传类型** | FormData、Blob、ArrayBuffer 等直接透传 |
| **可修改头** | 转换函数可以修改请求头 |

### 转换流程可视化

```
                    transformRequest 管道
                           │
原始 data ─────────────────┼────────────────────→ 发送
    │                      │                        │
    ▼                      ▼                        ▼
{ name: '张三' }  →  添加时间戳  →  JSON.stringify  →  '{"name":"张三","timestamp":...}'
```

## 常见问题解答

**Q1: 为什么自定义 transformRequest 后对象没有被序列化？**

A: 自定义 transformRequest 会**完全覆盖**默认行为。如果你还需要 JSON 序列化，需要：
```typescript
axios.defaults.transformRequest = [
  myTransform,
  ...axios.defaults.transformRequest,  // 保留默认的
];
```

**Q2: transformRequest 和拦截器有什么区别？**

A: 
- **拦截器**：操作整个 config 对象，可以修改 url、headers 等
- **transformRequest**：只操作 data，专注于数据转换

**Q3: 可以在 transformRequest 中返回 Promise 吗？**

A: 不可以。transformRequest 是同步执行的。如果需要异步处理，应该使用请求拦截器。

---

下一节我们实现响应数据的转换 `transformResponse`。
