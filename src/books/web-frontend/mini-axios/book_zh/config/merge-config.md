# 实现配置合并策略

配置合并是 Axios 的核心机制之一。当多个配置源存在时，如何正确地合并它们？

## 本节目标

通过本节学习，你将：

1. 理解为什么配置合并需要"策略模式"
2. 掌握深度合并的实现技巧
3. 了解不同配置项的合并规则差异
4. 实现一个完整的 `mergeConfig` 函数

## 问题的复杂性

思考这个场景：

```typescript
// 库默认配置
const libraryDefaults = {
  timeout: 0,
  headers: {
    common: { 'Accept': 'application/json' }
  }
};

// 实例配置
const instanceConfig = {
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    common: { 'Authorization': 'Bearer token' }
  }
};

// 请求配置
const requestConfig = {
  url: '/users',
  timeout: 10000,
  headers: {
    'X-Custom-Header': 'value'
  }
};
```

最终配置应该是什么？

- `timeout` 应该是 `10000`（请求配置优先）
- `baseURL` 应该是 `'https://api.example.com'`（来自实例配置）
- `headers` 应该怎么合并？完全覆盖还是深度合并？

**这就是问题的复杂性所在：不同的配置项需要不同的合并逻辑。**

如果我们简单地用 `{ ...defaults, ...userConfig }` 来合并，`headers` 会被完全覆盖，用户就丢失了 `Accept` 头。

## 为什么需要策略模式？

面对不同字段需要不同合并逻辑的问题，我们有两种选择：

**方案一：if-else 判断**

```typescript
function mergeConfig(config1, config2) {
  const result = {};
  
  if (key === 'url') {
    result.url = config2.url; // 只取用户配置
  } else if (key === 'headers') {
    result.headers = deepMerge(config1.headers, config2.headers); // 深度合并
  } else if (key === 'timeout') {
    result.timeout = config2.timeout ?? config1.timeout; // 优先用户配置
  }
  // ... 每个字段都要判断
}
```

这种方式的问题：
- 代码冗长，每加一个字段就要加一个分支
- 难以维护，相同策略的字段分散在各处
- 不符合开闭原则（对扩展开放，对修改封闭）

**方案二：策略模式**

```typescript
// 定义策略
const strategies = {
  url: fromVal2Strategy,
  headers: deepMergeStrategy,
  timeout: defaultStrategy,
};

// 应用策略
function mergeConfig(config1, config2) {
  const result = {};
  for (const key of allKeys) {
    const strategy = strategies[key] || defaultStrategy;
    result[key] = strategy(config1[key], config2[key]);
  }
  return result;
}
```

策略模式的优势：
- 代码清晰，每种策略独立定义
- 易于扩展，新字段只需指定使用哪种策略
- 相同策略的字段可以批量配置

## 合并策略详解

不同的配置字段需要不同的合并策略：

### 策略一：默认策略（优先取 val2）

```typescript
/**
 * 默认合并策略
 * 
 * 逻辑：如果 val2 存在就用 val2，否则用 val1
 * 这符合"用户配置覆盖默认配置"的直觉
 */
function defaultStrategy(val1: any, val2: any): any {
  return val2 !== undefined ? val2 : val1;
}
```

**适用字段**：`timeout`、`baseURL`、`responseType` 等大多数配置项

**示例**：
```typescript
// 默认超时 0，用户设置 5000
defaultStrategy(0, 5000); // → 5000

// 默认超时 0，用户未设置
defaultStrategy(0, undefined); // → 0
```

### 策略二：只取 val2（忽略默认值）

```typescript
/**
 * 只取用户配置，忽略默认配置
 * 
 * 为什么需要这个策略？
 * 某些字段是"请求特有"的，不应该从默认配置继承
 */
function fromVal2Strategy(val1: any, val2: any): any {
  return val2;
}
```

**适用字段**：`url`、`method`、`data`

**为什么这些字段不能继承？**

想象这个场景：

```typescript
const instance = axios.create({
  url: '/default-endpoint'  // 如果不小心设置了默认 url
});

instance.get('/users');  // 用户期望请求 /users
// 如果用默认策略，url 会是 /users（正确）
// 但如果用户不传 url：instance.get() 
// 就会请求 /default-endpoint，这通常不是期望的行为
```

**更重要的是 `data` 字段**：

```typescript
const instance = axios.create();
instance.post('/create', { name: 'test' });
// 之后
instance.get('/list');  // 如果 data 被继承，GET 请求会带上之前 POST 的数据！
```

所以这三个字段必须"只看当前请求，不看默认配置"。

### 策略三：深度合并

```typescript
/**
 * 深度合并策略
 * 
 * 当两个值都是对象时，递归合并它们的属性
 * 而不是简单地覆盖整个对象
 */
function deepMergeStrategy(val1: any, val2: any): any {
  if (isPlainObject(val2)) {
    // val2 是对象，进行深度合并
    return deepMerge(val1 || {}, val2);
  } else if (val2 !== undefined) {
    // val2 不是对象但有值，直接使用
    return val2;
  } else if (isPlainObject(val1)) {
    // val2 没有值，复制 val1（避免引用共享）
    return deepMerge({}, val1);
  } else {
    // 都不是对象，返回 val1
    return val1;
  }
}
```

**适用字段**：`headers`、`params`、`auth`

**为什么 headers 需要深度合并？**

```typescript
// 默认配置
const defaults = {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

// 用户配置
const userConfig = {
  headers: {
    'Authorization': 'Bearer token'
  }
};

// 如果用简单覆盖：
{ ...defaults.headers, ...userConfig.headers }
// 结果丢失了 Accept 和 Content-Type！

// 深度合并：
deepMerge(defaults.headers, userConfig.headers)
// 结果：{ Accept, Content-Type, Authorization } ✓
```

## 实现 mergeConfig

创建 `src/core/mergeConfig.ts`：

```typescript
// src/core/mergeConfig.ts

import { AxiosRequestConfig } from '../types';

/**
 * 判断是否是纯对象（Plain Object）
 * 
 * 纯对象：通过 {} 或 new Object() 创建的对象
 * 非纯对象：数组、函数、Date、RegExp、DOM 元素等
 * 
 * 为什么需要这个判断？
 * 我们只想深度合并纯对象，数组等应该直接覆盖
 */
function isPlainObject(val: any): val is Record<string, any> {
  return Object.prototype.toString.call(val) === '[object Object]';
}

/**
 * 深度合并多个对象
 * 
 * 示例：
 * deepMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 }, c: 3 })
 * 结果：{ a: 1, b: { x: 1, y: 2 }, c: 3 }
 */
function deepMerge(...objs: any[]): any {
  const result: Record<string, any> = {};
  
  // 遍历所有要合并的对象
  objs.forEach(obj => {
    if (!obj) return;  // 跳过 null/undefined
    
    // 遍历对象的每个键
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      
      if (isPlainObject(val)) {
        // 值是对象，递归合并
        if (isPlainObject(result[key])) {
          // 结果中已有同名对象，合并它们
          result[key] = deepMerge(result[key], val);
        } else {
          // 结果中没有同名对象，创建新对象（避免引用共享）
          result[key] = deepMerge({}, val);
        }
      } else if (val !== undefined) {
        // 值不是对象，直接赋值（后面的覆盖前面的）
        result[key] = val;
      }
      // undefined 值被忽略，保持原有值
    });
  });
  
  return result;
}

// ============ 策略定义 ============

// 策略映射表：字段名 → 合并策略
const strategies: Record<string, (val1: any, val2: any) => any> = {};

// 默认策略：优先取 val2
function defaultStrategy(val1: any, val2: any): any {
  return val2 !== undefined ? val2 : val1;
}

// 只取 val2 策略：这些字段不从默认配置继承
function fromVal2Strategy(val1: any, val2: any): any {
  return val2;
}

// 深度合并策略：对象类型的字段需要递归合并
function deepMergeStrategy(val1: any, val2: any): any {
  if (isPlainObject(val2)) {
    return deepMerge(val1 || {}, val2);
  } else if (val2 !== undefined) {
    return val2;
  } else if (isPlainObject(val1)) {
    return deepMerge({}, val1);
  } else {
    return val1;
  }
}

// 配置各字段的合并策略
const fromVal2Keys = ['url', 'method', 'data'];
fromVal2Keys.forEach(key => {
  strategies[key] = fromVal2Strategy;
});

const deepMergeKeys = ['headers', 'params', 'auth'];
deepMergeKeys.forEach(key => {
  strategies[key] = deepMergeStrategy;
});

/**
 * 合并两个配置对象
 * 
 * @param config1 默认配置（低优先级）
 * @param config2 用户配置（高优先级）
 * @returns 合并后的配置
 * 
 * 工作流程：
 * 1. 遍历 config2 的所有键，根据策略合并
 * 2. 遍历 config1 中 config2 没有的键，补充到结果中
 */
export function mergeConfig(
  config1: AxiosRequestConfig,
  config2: AxiosRequestConfig = {}
): AxiosRequestConfig {
  const result: AxiosRequestConfig = {};
  
  // 处理 config2 中的所有键
  Object.keys(config2).forEach(key => {
    const strategy = strategies[key] || defaultStrategy;
    (result as any)[key] = strategy((config1 as any)[key], (config2 as any)[key]);
  });
  
  // 处理 config1 中有但 config2 中没有的键
  // 这确保默认配置不会丢失
  Object.keys(config1).forEach(key => {
    if (!(key in result)) {
      const strategy = strategies[key] || defaultStrategy;
      (result as any)[key] = strategy((config1 as any)[key], (config2 as any)[key]);
    }
  });
  
  return result;
}
```

### 合并过程图解

```
config1 (defaults)           config2 (user)              result
────────────────────         ────────────────           ────────────────
timeout: 0                   timeout: 5000      →       timeout: 5000 (defaultStrategy)
baseURL: undefined           baseURL: '/api'    →       baseURL: '/api' (defaultStrategy)
url: '/old'                  url: '/new'        →       url: '/new' (fromVal2Strategy)
headers: {                   headers: {         →       headers: {
  Accept: 'json'               Auth: 'token'              Accept: 'json' (deepMerge)
}                            }                            Auth: 'token'
                                                        }
```

## 在 Axios 类中使用

更新 `src/core/Axios.ts`：

```typescript
import { mergeConfig } from './mergeConfig';

export class Axios {
  defaults: AxiosRequestConfig;

  constructor(config: AxiosRequestConfig = {}) {
    this.defaults = config;
  }

  request<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    let requestConfig: AxiosRequestConfig;
    
    if (typeof configOrUrl === 'string') {
      requestConfig = { ...config, url: configOrUrl };
    } else {
      requestConfig = configOrUrl;
    }

    // 使用 mergeConfig 合并配置
    const mergedConfig = mergeConfig(this.defaults, requestConfig);

    return dispatchRequest<T>(mergedConfig);
  }
  
  // ... 其他方法
}
```

## 测试配置合并

```typescript
import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../src/core/mergeConfig';

describe('mergeConfig', () => {
  it('should use config2 value when both exist', () => {
    const result = mergeConfig(
      { timeout: 1000 },
      { timeout: 5000 }
    );
    expect(result.timeout).toBe(5000);
  });

  it('should use config1 value when config2 is undefined', () => {
    const result = mergeConfig(
      { timeout: 1000 },
      {}
    );
    expect(result.timeout).toBe(1000);
  });

  it('should not inherit url from config1', () => {
    const result = mergeConfig(
      { url: '/default' },
      {}
    );
    expect(result.url).toBeUndefined();
  });

  it('should deep merge headers', () => {
    const result = mergeConfig(
      { 
        headers: { 
          'Accept': 'application/json',
          'Authorization': 'old-token'
        } 
      },
      { 
        headers: { 
          'Authorization': 'new-token',
          'X-Custom': 'value'
        } 
      }
    );
    
    expect(result.headers).toEqual({
      'Accept': 'application/json',
      'Authorization': 'new-token',
      'X-Custom': 'value'
    });
  });

  it('should deep merge params', () => {
    const result = mergeConfig(
      { params: { a: 1, b: 2 } },
      { params: { b: 3, c: 4 } }
    );
    
    expect(result.params).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should handle nested objects in headers', () => {
    const result = mergeConfig(
      { 
        headers: { 
          common: { 'Accept': 'application/json' }
        } as any
      },
      { 
        headers: { 
          common: { 'Authorization': 'token' }
        } as any
      }
    );
    
    expect((result.headers as any).common).toEqual({
      'Accept': 'application/json',
      'Authorization': 'token'
    });
  });
});
```

## 完整合并流程

当发起一个请求时，配置的合并流程如下：

```
┌─────────────────────────────────────────┐
│         库默认配置 (defaults.ts)         │
│  timeout: 0, headers: { Accept: ... }   │
└────────────────────┬────────────────────┘
                     │ mergeConfig
                     ▼
┌─────────────────────────────────────────┐
│   实例默认配置 (axios.create 传入的)      │
│  baseURL: 'https://api.example.com'     │
│  timeout: 5000                          │
└────────────────────┬────────────────────┘
                     │ mergeConfig
                     ▼
┌─────────────────────────────────────────┐
│      请求级配置 (axios.get 传入的)        │
│  url: '/users', timeout: 10000          │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│              最终配置                    │
│  baseURL: 'https://api.example.com'     │
│  url: '/users'                          │
│  timeout: 10000  ← 请求级优先           │
│  headers: { Accept: ... }               │
└─────────────────────────────────────────┘
```

代码表示：

```typescript
// 在 createInstance 中
const config = mergeConfig(defaults, instanceConfig);
const context = new Axios(config);

// 在 Axios.request 中
const finalConfig = mergeConfig(this.defaults, requestConfig);
```

## 小结

这一节我们实现了配置合并的核心逻辑：

- **不同字段不同策略**：url/method 不继承，headers 深度合并
- **深度合并算法**：递归合并嵌套对象
- **优先级规则**：请求配置 > 实例配置 > 库默认配置

下一节我们详细讨论配置优先级和一些边界情况。

## 边界情况处理

在实际开发中，还有一些边界情况需要考虑：

### null vs undefined

```typescript
const result = mergeConfig(
  { timeout: 5000 },
  { timeout: null }  // 用户显式设置为 null
);
// result.timeout 应该是什么？
```

在当前实现中，`null` 会覆盖默认值。这通常是期望的行为——用户显式传了值就应该使用它。

如果需要区分"未设置"和"显式设为null"，可以这样修改：

```typescript
function defaultStrategy(val1: any, val2: any): any {
  // 只有 undefined 才表示"未设置"
  return val2 !== undefined ? val2 : val1;
}
```

### 数组的处理

```typescript
const result = mergeConfig(
  { transformRequest: [fn1] },
  { transformRequest: [fn2] }
);
// 是合并成 [fn1, fn2] 还是覆盖成 [fn2]？
```

在 Axios 的设计中，数组是**覆盖**而不是合并。因为 `isPlainObject([])` 返回 `false`。

如果需要合并数组，可以添加专门的策略：

```typescript
function arrayMergeStrategy(val1: any, val2: any): any {
  if (Array.isArray(val2)) {
    return Array.isArray(val1) ? [...val1, ...val2] : val2;
  }
  return val2 ?? val1;
}
```

### 避免引用共享

深度合并时的一个常见陷阱：

```typescript
const defaults = { headers: { Accept: 'json' } };
const config1 = mergeConfig(defaults, {});
const config2 = mergeConfig(defaults, {});

config1.headers.Accept = 'xml';
console.log(defaults.headers.Accept);  // 应该还是 'json'
```

我们的实现通过 `deepMerge({}, val1)` 创建新对象来避免引用共享。

## 常见问题解答

### Q: 为什么要用策略映射表而不是 switch-case？

A: 策略映射表有几个优势：
1. **可扩展性**：添加新字段只需在数组中加一项，不用修改逻辑代码
2. **可配置性**：策略可以在运行时动态修改
3. **清晰性**：一眼就能看出哪些字段用哪种策略

### Q: headers 里面嵌套的 common、get、post 对象怎么处理？

A: 深度合并策略会递归处理嵌套对象：

```typescript
const defaults = {
  headers: {
    common: { Accept: 'json' },
    post: { 'Content-Type': 'json' }
  }
};

const userConfig = {
  headers: {
    common: { Authorization: 'token' }
  }
};

// 结果：
{
  headers: {
    common: { Accept: 'json', Authorization: 'token' },
    post: { 'Content-Type': 'json' }
  }
}
```

### Q: 如果我想让某个字段完全覆盖而不是合并怎么办？

A: 传入非对象类型的值即可：

```typescript
// 完全覆盖 headers
axios.get('/api', {
  headers: null  // 或者 undefined
});
// 使用 fromVal2Strategy 的字段会被设为 null
```

或者在使用前展开：

```typescript
axios.get('/api', {
  headers: {
    // 只有这些头，不要默认的
    'X-Custom': 'value'
  }
});
```
