# 配置优先级与覆盖规则

理解配置的优先级和覆盖规则，对于正确使用 Axios 至关重要。

## 本节目标

通过本节学习，你将：
- 理解 Axios 的三层配置体系
- 掌握配置合并时的优先级规则
- 学会处理 headers 的特殊合并逻辑
- 了解常见的配置边界情况

## 三层配置

Axios 的配置分为三层，像洋葱一样层层包裹：

```
          ┌─────────────────────────────────┐
          │     请求级配置（最高优先级）      │ ← 每次请求单独指定
          │  ┌───────────────────────────┐  │
          │  │   实例级配置（中等优先级）  │  │ ← axios.create() 时指定
          │  │  ┌─────────────────────┐  │  │
          │  │  │  库默认配置（最低）   │  │  │ ← 内置的合理默认值
          │  │  └─────────────────────┘  │  │
          │  └───────────────────────────┘  │
          └─────────────────────────────────┘
          
合并方向：从内到外，外层覆盖内层
```

### 层级一：库默认配置

定义在 `defaults.ts` 中，是所有请求的基础配置：

```typescript
// 内置默认值 —— 这些是 Axios 预设的合理值
{
  method: 'GET',                         // 默认 GET 请求
  timeout: 0,                            // 默认不超时
  headers: {
    'Accept': 'application/json, text/plain, */*'  // 接受 JSON 和纯文本
  },
  validateStatus: (status) => status >= 200 && status < 300  // 2xx 视为成功
}
```

> **为什么需要库默认配置？** 减少用户配置量。大部分请求都是 GET，大部分 API 返回 JSON，这些常见情况不应该每次都配置。

### 层级二：实例级配置

通过 `axios.create()` 或直接修改 `axios.defaults` 设置，影响该实例的所有请求：

```typescript
// 方式一：创建实例时传入
const instance = axios.create({
  baseURL: 'https://api.example.com',  // 所有请求都会加上这个前缀
  timeout: 5000                         // 所有请求的超时时间
});

// 方式二：直接修改全局默认配置
axios.defaults.headers.common['Authorization'] = 'Bearer token';
```

### 层级三：请求级配置

每次请求时传入，优先级最高，可以覆盖一切：

```typescript
axios.get('/users', {
  timeout: 10000,  // 这个请求需要更长的超时时间
  headers: {
    'X-Request-ID': 'abc123'  // 这个请求特有的头
  }
});
```

## 实际案例

让我们通过一个完整的例子来理解优先级：

```typescript
import axios from 'mini-axios';

// ==================== 层级一：库默认 ====================
// timeout = 0（内置默认值）

// ==================== 层级二：创建实例 ====================
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000  // 覆盖库默认的 0
});

// ==================== 层级三：发送请求 ====================

// 请求 1：使用实例配置
api.get('/users');
// → timeout = 5000（来自实例配置）

// 请求 2：请求级配置覆盖实例配置
api.get('/slow-endpoint', { timeout: 10000 });
// → timeout = 10000（请求级覆盖）

// 请求 3：显式设为 0（不超时）
api.get('/stream', { timeout: 0 });
// → timeout = 0（请求级覆盖，注意 0 是有效值）
```

### 配置来源追踪

```
请求 api.get('/slow-endpoint', { timeout: 10000 }) 的 timeout 值：

层级       配置源                    值
─────────────────────────────────────────────
库默认     defaults.ts              0
实例级     axios.create()           5000    ← 覆盖库默认
请求级     get() 的第二个参数        10000   ← 覆盖实例配置
─────────────────────────────────────────────
最终值                               10000
```

## 动态修改配置

### 修改默认配置

```typescript
// 修改默认实例的配置
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 5000;

// 之后的所有请求都会使用新配置
axios.get('/users');  // baseURL = 'https://api.example.com'
```

### 修改实例配置

```typescript
const instance = axios.create({ timeout: 1000 });

// 动态修改
instance.defaults.timeout = 5000;

// 之后的请求使用新的超时时间
instance.get('/users');  // timeout = 5000
```

## headers 的特殊处理

`headers` 配置比较特殊，它支持按请求方法分组设置：

```typescript
axios.defaults.headers = {
  common: {
    'Accept': 'application/json'        // 所有请求都带
  },
  get: {},                               // GET 请求特有的头
  post: {
    'Content-Type': 'application/json'  // POST 请求默认 JSON
  },
  put: {},
  patch: {},
  delete: {},
  head: {},
  options: {}
};
```

### 为什么要分组？

不同类型的请求需要不同的头：
- **POST/PUT/PATCH**：需要 `Content-Type` 告诉服务器请求体格式
- **GET/DELETE**：通常不带请求体，不需要 `Content-Type`
- **所有请求**：可能都需要 `Accept` 头

### 合并时的处理

发送请求时，需要将分组的 headers 扁平化为一个对象：

```typescript
// src/core/dispatchRequest.ts

function flattenHeaders(config: AxiosRequestConfig): Record<string, string> {
  const { headers = {}, method = 'get' } = config;
  
  const result: Record<string, string> = {};
  
  // 第一步：合并 common headers（最低优先级）
  Object.assign(result, (headers as any).common || {});
  
  // 第二步：合并方法特定的 headers（中等优先级）
  Object.assign(result, (headers as any)[method.toLowerCase()] || {});
  
  // 第三步：合并直接设置的 headers（最高优先级）
  const headersToMerge = { ...headers };
  // 排除 common 和各方法名
  ['common', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach(key => {
    delete (headersToMerge as any)[key];
  });
  Object.assign(result, headersToMerge);
  
  return result;
}
```

### 合并示例

```
POST 请求的 headers 合并过程：

headers 配置：
{
  common: { Accept: 'application/json' },
  post: { 'Content-Type': 'application/json' },
  'Authorization': 'Bearer token'  // 直接设置
}

合并步骤：
1. common     → { Accept: 'application/json' }
2. + post     → { Accept: '...', 'Content-Type': 'application/json' }
3. + 直接设置 → { Accept: '...', 'Content-Type': '...', Authorization: 'Bearer token' }
```
    delete (headersToMerge as any)[key];
  });
  Object.assign(result, headersToMerge);
  
  return result;
}
```

## 边界情况

在配置合并中，有一些容易出错的边界情况需要特别注意：

### 1. undefined vs 显式设置

```typescript
// 默认配置
axios.defaults.timeout = 5000;

// ❌ 传 undefined，不会覆盖默认值
axios.get('/api', { timeout: undefined });
// → 最终 timeout = 5000（undefined 被忽略）

// ✅ 传 0，会覆盖默认值
axios.get('/api', { timeout: 0 });
// → 最终 timeout = 0（0 是有效值）
```

> **这就是为什么我们的合并策略检查 `val2 !== undefined` 而不是 `val2`**。如果检查 `val2`，那么 `0`、`false`、`''` 这些有效值都会被跳过。

### 2. null 值处理

```typescript
// 如果想清除某个默认配置，可以传 null
axios.get('/api', { baseURL: null });
```

这种场景比较少见，我们的实现暂时不特殊处理。

### 3. 数组配置（transformRequest）

```typescript
// 默认有一个转换器
axios.defaults.transformRequest = [defaultTransform];

// ❌ 请求时传入新的数组，会完全覆盖（不是合并）
axios.get('/api', {
  transformRequest: [customTransform1, customTransform2]
});
// → 只有 customTransform1 和 customTransform2

// ✅ 如果想追加而不是覆盖，需要展开默认数组
axios.get('/api', {
  transformRequest: [
    ...axios.defaults.transformRequest,  // 保留默认的
    customTransform                       // 添加自定义的
  ]
});
```

## 配置验证

在发送请求前，应该验证配置的有效性，提前发现配置错误：

```typescript
// src/core/dispatchRequest.ts

function validateConfig(config: AxiosRequestConfig): void {
  // 必填项检查
  if (!config.url) {
    throw new Error('URL is required');
  }
  
  // 类型检查
  if (config.timeout !== undefined && config.timeout < 0) {
    throw new Error('Timeout must be a non-negative number');
  }
  
  // 枚举值检查
  if (config.responseType && !['arraybuffer', 'blob', 'document', 'json', 'text'].includes(config.responseType)) {
    throw new Error(`Invalid responseType: ${config.responseType}`);
  }
  
  // 其他验证...
}
```

## 调试技巧

开发时如何查看最终合并的配置？

```typescript
// 方法一：添加请求拦截器
axios.interceptors.request.use(config => {
  console.log('Final config:', JSON.stringify(config, null, 2));
  return config;
});

// 方法二：使用开发者工具
// 在 Network 面板查看请求头和请求体
```

## 小结

本节我们学习了 Axios 配置的优先级规则。

### 优先级总结

| 层级 | 配置源 | 优先级 | 影响范围 |
|------|--------|--------|----------|
| 请求级 | `axios.get(url, config)` | 最高 | 单个请求 |
| 实例级 | `axios.create(config)` | 中等 | 该实例所有请求 |
| 库默认 | `defaults.ts` | 最低 | 所有请求 |

### 特殊处理规则

| 配置项 | 合并策略 | 说明 |
|--------|----------|------|
| `url`, `method`, `data` | 不继承 | 只取请求级配置 |
| `headers`, `params` | 深度合并 | 合并而非覆盖 |
| 其他配置 | 简单覆盖 | 高优先级覆盖低优先级 |

## 常见问题解答

**Q1: 为什么我设置的 timeout 没生效？**

A: 检查是否有更高优先级的配置覆盖了它。使用请求拦截器打印最终配置来调试。

**Q2: 如何在请求级配置中使用默认的 transformRequest？**

A: 需要展开默认数组：
```typescript
axios.get('/api', {
  transformRequest: [...axios.defaults.transformRequest, myTransform]
});
```

**Q3: 动态修改 defaults 会影响已创建的实例吗？**

A: 不会。实例在创建时就复制了一份 defaults，之后的修改互不影响。

---

到这里，第二章"请求配置系统"就完成了。下一章我们将处理 URL 相关的逻辑。
