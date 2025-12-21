# axios 函数与实例的双重身份

这是 Axios 最有趣的设计之一。观察下面的代码：

```typescript
// 当函数调用
axios('/api/users');
axios({ url: '/api/users', method: 'GET' });

// 当对象使用
axios.get('/api/users');
axios.defaults.baseURL = 'https://api.example.com';
```

`axios` 到底是什么？函数？对象？答案是：**两者都是**。

## 本节目标

通过本节学习，你将：

1. 理解 JavaScript "函数也是对象"的特性
2. 掌握 `bind` 方法在保持 `this` 绑定中的作用
3. 实现 Axios 的双重身份设计
4. 理解 `axios.create()` 的实现原理

## JavaScript 的秘密：函数也是对象

在 JavaScript 中，函数是一等公民，本质上也是对象。这意味着：

```typescript
function foo() {
  console.log('I am a function');
}

// 可以给函数添加属性
foo.bar = 'I am a property';
foo.baz = function() {
  console.log('I am a method');
};

// 调用
foo();         // I am a function
foo.baz();     // I am a method
console.log(foo.bar); // I am a property
```

**这是 JavaScript 独特且强大的特性！**

在其他语言（如 Java、C#）中，函数和对象是完全不同的概念。但在 JavaScript 中，函数本身就是一种特殊的对象，可以：
- 被调用（这是函数特有的能力）
- 拥有属性和方法（这是对象的能力）

Axios 正是巧妙地利用了这个特性。

## 实现思路

我们需要实现一个既能当函数调用，又有方法和属性的对象：

```
┌───────────────────────────────────────────────────────────┐
│                        axios                               │
├───────────────────────────────────────────────────────────┤
│  作为函数：axios(config) → 调用 Axios.request(config)      │
├───────────────────────────────────────────────────────────┤
│  作为对象：                                                │
│    .get()    → 调用 Axios.get()                           │
│    .post()   → 调用 Axios.post()                          │
│    .defaults → 访问 Axios.defaults                         │
│    .create() → 创建新实例                                  │
└───────────────────────────────────────────────────────────┘
```

实现步骤：

1. 创建一个**函数**，作为 `axios` 本身
2. 把 `Axios` 实例的**所有方法**都复制到这个函数上
3. 确保方法的 `this` 绑定正确

## 理解 `this` 绑定问题

在深入实现之前，先理解一个关键问题：

```typescript
class Axios {
  defaults = { timeout: 5000 };
  
  request(config) {
    console.log(this.defaults.timeout);  // 需要访问 this
  }
}

const axios = new Axios();
axios.request({});  // ✅ 正常工作，this 指向 axios 实例

// 但如果把方法赋值给变量...
const request = axios.request;
request({});  // ❌ 错误！this 是 undefined

// 或者复制到另一个对象...
const myAxios = { request: axios.request };
myAxios.request({});  // ❌ 错误！this 指向 myAxios，没有 defaults
```

**问题**：当方法被"取出"并单独调用时，`this` 会丢失。

**解决方案**：使用 `bind` 永久绑定 `this`。

```typescript
const request = axios.request.bind(axios);
request({});  // ✅ this 永远指向 axios 实例
```

## 实现 createInstance

创建 `src/axios.ts`：

```typescript
// src/axios.ts

import { Axios } from './core/Axios';
import { AxiosRequestConfig, AxiosInstance, AxiosStatic } from './types';

function createInstance(defaultConfig: AxiosRequestConfig): AxiosStatic {
  // 1. 创建 Axios 实例
  const context = new Axios(defaultConfig);
  
  // 2. 创建一个函数，绑定到 context.request
  const instance = Axios.prototype.request.bind(context);
  
  // 3. 把 Axios.prototype 上的方法复制到 instance 上
  Object.getOwnPropertyNames(Axios.prototype).forEach(key => {
    if (key === 'constructor') return;
    
    const descriptor = Object.getOwnPropertyDescriptor(Axios.prototype, key);
    if (descriptor) {
      if (typeof descriptor.value === 'function') {
        // 方法需要绑定 this
        (instance as any)[key] = descriptor.value.bind(context);
      } else {
        Object.defineProperty(instance, key, descriptor);
      }
    }
  });
  
  // 4. 把 context 的属性复制到 instance 上
  Object.assign(instance, context);
  
  // 5. 添加 create 方法
  (instance as AxiosStatic).create = function(config?: AxiosRequestConfig) {
    return createInstance({ ...defaultConfig, ...config });
  };
  
  return instance as AxiosStatic;
}

// 创建默认实例
const axios = createInstance({});

export default axios;
export { Axios, AxiosRequestConfig, AxiosInstance };
```

让我们逐步分析这段代码：

### 步骤 1：创建 Axios 实例

```typescript
const context = new Axios(defaultConfig);
```

这个 `context` 持有 `defaults` 配置，是所有方法的执行上下文。它就像一个"幕后英雄"，虽然用户不直接使用它，但所有方法都依赖它。

### 步骤 2：创建绑定函数

```typescript
const instance = Axios.prototype.request.bind(context);
```

**这一行是核心中的核心！**

- `Axios.prototype.request` 是 `request` 方法的函数引用
- `.bind(context)` 创建一个新函数，其 `this` 永远绑定到 `context`
- `instance` 现在是一个函数，调用 `instance(config)` 等价于 `context.request(config)`

这就是为什么 `axios({ url: '/api' })` 能工作的原因！

### 步骤 3：复制方法

```typescript
Object.getOwnPropertyNames(Axios.prototype).forEach(key => {
  // ...
  (instance as any)[key] = descriptor.value.bind(context);
});
```

把 `get`、`post` 等方法都复制到 `instance` 上，同样使用 `bind` 绑定 `this`。

**为什么用 `getOwnPropertyNames` 而不是 `Object.keys`？**

`Object.keys` 只能获取可枚举属性，而原型上的方法默认是不可枚举的。`getOwnPropertyNames` 可以获取所有自有属性（包括不可枚举的）。

### 步骤 4：复制属性

```typescript
Object.assign(instance, context);
```

把 `defaults` 等属性也复制过去。这样 `axios.defaults` 就能访问了。

### 步骤 5：添加 create 方法

```typescript
(instance as AxiosStatic).create = function(config?: AxiosRequestConfig) {
  return createInstance({ ...defaultConfig, ...config });
};
```

`create` 方法创建新实例，合并默认配置。每次调用 `create` 都会得到一个全新的、独立的实例。

## 简化版本

上面的代码比较复杂，这里提供一个更易理解的简化版本：

```typescript
function createInstance(defaultConfig: AxiosRequestConfig): AxiosStatic {
  const context = new Axios(defaultConfig);
  
  // 核心：创建一个函数，内部调用 context.request
  function instance(config: AxiosRequestConfig) {
    return context.request(config);
  }
  
  // 复制方法
  instance.request = context.request.bind(context);
  instance.get = context.get.bind(context);
  instance.post = context.post.bind(context);
  instance.put = context.put.bind(context);
  instance.delete = context.delete.bind(context);
  instance.patch = context.patch.bind(context);
  instance.head = context.head.bind(context);
  instance.options = context.options.bind(context);
  
  // 复制属性
  instance.defaults = context.defaults;
  
  // 添加 create 方法
  instance.create = function(config?: AxiosRequestConfig) {
    return createInstance({ ...defaultConfig, ...config });
  };
  
  return instance as AxiosStatic;
}
```

## 为什么需要 bind？

思考这个问题：

```typescript
const axios = createInstance({});
const get = axios.get;

// 如果没有 bind，this 会丢失
get('/api/users'); // 错误：无法读取 undefined 的 'defaults' 属性
```

当方法被赋值给变量后调用，`this` 会丢失。`bind` 确保 `this` 永远正确。

**实际场景**：

```typescript
// 用户可能这样使用
const { get, post } = axios;

// 或者这样传递
someFunction(axios.get);

// 甚至在框架中
app.use(axios.get);
```

如果不用 `bind`，这些使用方式都会出错。

## 实例独立性

`axios.create()` 创建的实例是完全独立的：

```typescript
const api1 = axios.create({ baseURL: 'https://api1.com', timeout: 1000 });
const api2 = axios.create({ baseURL: 'https://api2.com', timeout: 2000 });

// 各自有独立的配置
console.log(api1.defaults.baseURL);  // https://api1.com
console.log(api2.defaults.baseURL);  // https://api2.com

// 修改一个不影响另一个
api1.defaults.timeout = 5000;
console.log(api2.defaults.timeout);  // 仍然是 2000

// 也不影响全局 axios
console.log(axios.defaults.timeout); // undefined
```

**独立性图解**：

```
┌─────────────────────────────────────────────────────────────────┐
│                        createInstance({})                        │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│     │   axios    │   │    api1    │   │    api2    │            │
│     │ (默认实例) │   │ (自定义1)  │   │ (自定义2)  │            │
│     ├────────────┤   ├────────────┤   ├────────────┤            │
│     │ context1   │   │ context2   │   │ context3   │            │
│     │ defaults1  │   │ defaults2  │   │ defaults3  │            │
│     └────────────┘   └────────────┘   └────────────┘            │
│           ↑               ↑               ↑                      │
│           └───────────────┴───────────────┘                      │
│                    完全独立，互不影响                              │
└─────────────────────────────────────────────────────────────────┘
```

## 更新入口文件

更新 `src/index.ts`：

```typescript
// src/index.ts

import axios from './axios';

export default axios;

// 导出类型
export type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosStatic,
  Method,
} from './types';

// 导出 Axios 类（供高级用户使用）
export { Axios } from './core/Axios';
```

## 使用示例

现在我们可以这样使用了：

```typescript
import axios from 'mini-axios';

// 作为函数调用
axios('/api/users');
axios({ url: '/api/users', method: 'GET' });

// 使用方法别名
axios.get('/api/users');
axios.post('/api/users', { name: 'test' });

// 访问默认配置
axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.timeout = 5000;

// 创建自定义实例
const instance = axios.create({
  baseURL: 'https://other-api.com',
  headers: {
    'Authorization': 'Bearer token'
  }
});

instance.get('/users');
```

## 测试双重身份

```typescript
import { describe, it, expect, vi } from 'vitest';
import axios from '../src';

describe('axios dual identity', () => {
  it('should be callable as a function', async () => {
    // 模拟代码省略...
    
    // 作为函数调用
    const promise = axios({ url: '/api/test' });
    expect(promise).toBeInstanceOf(Promise);
  });

  it('should have method aliases', () => {
    expect(typeof axios.get).toBe('function');
    expect(typeof axios.post).toBe('function');
    expect(typeof axios.put).toBe('function');
    expect(typeof axios.delete).toBe('function');
  });

  it('should have defaults property', () => {
    expect(axios.defaults).toBeDefined();
    expect(typeof axios.defaults).toBe('object');
  });

  it('should have create method', () => {
    expect(typeof axios.create).toBe('function');
    
    const instance = axios.create({ baseURL: 'https://api.example.com' });
    expect(instance.defaults.baseURL).toBe('https://api.example.com');
  });

  it('should create independent instances', () => {
    const instance1 = axios.create({ timeout: 1000 });
    const instance2 = axios.create({ timeout: 2000 });
    
    expect(instance1.defaults.timeout).toBe(1000);
    expect(instance2.defaults.timeout).toBe(2000);
    
    // 修改一个不影响另一个
    instance1.defaults.timeout = 3000;
    expect(instance2.defaults.timeout).toBe(2000);
  });
});
```

## 小结

这一节我们实现了 Axios 最巧妙的设计之一：

| 特性 | 实现方式 |
|------|----------|
| 函数也是对象 | JavaScript 语言特性 |
| `this` 绑定 | 使用 `bind(context)` |
| 方法复制 | `Object.getOwnPropertyNames` + 遍历 |
| 属性复制 | `Object.assign` |
| 创建独立实例 | `create` 方法递归调用 `createInstance` |

**核心洞察**：

```typescript
// 这两个调用本质上是一样的
axios(config);          // 调用函数
axios.request(config);  // 调用方法

// 因为 axios 这个函数就是 Axios.prototype.request.bind(context)
```

### 常见问题解答

**Q: 为什么不直接 `export default new Axios()`？**

A: 那样 `axios` 就只是一个普通对象，不能当函数调用：
```typescript
const axios = new Axios();
axios({...});  // ❌ TypeError: axios is not a function
```

**Q: `bind` 会影响性能吗？**

A: `bind` 只在 `createInstance` 时调用一次，之后每次请求不会再 `bind`。所以影响可以忽略不计。

**Q: 为什么用 `Object.assign` 而不是展开运算符？**

A: `Object.assign` 可以复制 getter/setter，而展开运算符只复制值。虽然这里 `defaults` 是普通对象，但用 `Object.assign` 更安全。

到这里，第一章"核心骨架"就完成了。我们已经有了：

- ✅ 基本的请求功能
- ✅ Axios 类结构
- ✅ 方法别名
- ✅ 双重身份设计

下一章，我们将深入请求配置系统，实现更强大的配置合并功能。
