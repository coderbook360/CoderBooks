# Proxy 与 Reflect：元编程的底层支持

ES6引入的`Proxy`和`Reflect`为JavaScript带来了强大的元编程能力。通过Proxy，你可以拦截并自定义对象的基本操作；通过Reflect，你可以以函数方式执行这些操作。然而，这种灵活性是有代价的——V8需要在每次操作时检查是否存在代理处理器。本章将探讨这两个特性的底层实现，以及如何在保持灵活性的同时优化性能。

## Proxy的基本机制

`Proxy`创建一个对象的代理，可以拦截13种基本操作：

```javascript
const target = { x: 1, y: 2 };

const handler = {
  get(target, key, receiver) {
    console.log(`Getting ${key}`);
    return Reflect.get(target, key, receiver);
  },
  
  set(target, key, value, receiver) {
    console.log(`Setting ${key} = ${value}`);
    return Reflect.set(target, key, value, receiver);
  }
};

const proxy = new Proxy(target, handler);

proxy.x;      // "Getting x" -> 1
proxy.z = 3;  // "Setting z = 3"
```

V8内部的Proxy对象结构：

```
┌─────────────────────────────────────┐
│            JSProxy                   │
├─────────────────────────────────────┤
│  target: 被代理的目标对象            │
├─────────────────────────────────────┤
│  handler: 处理器对象                 │
├─────────────────────────────────────┤
│  revoked: 是否已撤销                 │
└─────────────────────────────────────┘
```

## 可拦截的操作

ECMAScript定义了13种内部方法，Proxy可以拦截所有这些操作：

```javascript
const fullHandler = {
  // 属性访问
  get(target, key, receiver) {},
  set(target, key, value, receiver) {},
  has(target, key) {},  // in操作符
  deleteProperty(target, key) {},
  
  // 属性描述
  getOwnPropertyDescriptor(target, key) {},
  defineProperty(target, key, descriptor) {},
  
  // 原型操作
  getPrototypeOf(target) {},
  setPrototypeOf(target, prototype) {},
  
  // 对象状态
  isExtensible(target) {},
  preventExtensions(target) {},
  
  // 枚举
  ownKeys(target) {},
  
  // 函数调用（仅当target是函数时）
  apply(target, thisArg, args) {},
  construct(target, args, newTarget) {}
};
```

每个trap的调用时机：

```javascript
const obj = { x: 1 };
const proxy = new Proxy(obj, fullHandler);

proxy.x;                    // get
proxy.x = 2;                // set
'x' in proxy;               // has
delete proxy.x;             // deleteProperty
Object.keys(proxy);         // ownKeys
Object.getPrototypeOf(proxy);  // getPrototypeOf

// 函数代理
const fnProxy = new Proxy(function() {}, {
  apply(target, thisArg, args) {
    console.log('Function called');
    return Reflect.apply(target, thisArg, args);
  },
  construct(target, args) {
    console.log('Constructor called');
    return Reflect.construct(target, args);
  }
});

fnProxy();      // "Function called"
new fnProxy();  // "Constructor called"
```

## V8中的Proxy实现

当V8遇到Proxy对象时，需要执行额外的检查：

```javascript
// V8内部的属性访问流程（简化）
function getProperty(object, key) {
  // 检查是否是Proxy
  if (isProxy(object)) {
    return proxyGet(object, key);
  }
  
  // 普通对象的快速路径
  return normalGet(object, key);
}

function proxyGet(proxy, key) {
  // 检查代理是否已撤销
  if (proxy.revoked) {
    throw new TypeError('Cannot perform operation on revoked proxy');
  }
  
  const handler = proxy.handler;
  const target = proxy.target;
  
  // 查找get trap
  const trap = handler.get;
  
  if (trap === undefined) {
    // 没有trap，直接访问target
    return Reflect.get(target, key, proxy);
  }
  
  // 调用trap
  const result = trap.call(handler, target, key, proxy);
  
  // 不变性检查
  validateGetResult(target, key, result);
  
  return result;
}

function validateGetResult(target, key, result) {
  const desc = Object.getOwnPropertyDescriptor(target, key);
  
  if (desc) {
    // 如果属性不可配置且不可写，trap必须返回相同值
    if (!desc.configurable && !desc.writable) {
      if (result !== desc.value) {
        throw new TypeError('Proxy invariant violation');
      }
    }
    
    // 如果是不可配置的accessor且没有getter，必须返回undefined
    if (!desc.configurable && desc.get === undefined) {
      if (result !== undefined) {
        throw new TypeError('Proxy invariant violation');
      }
    }
  }
}
```

## Reflect：规范化的对象操作

`Reflect`对象提供了与Proxy handler方法对应的静态方法：

```javascript
const obj = { x: 1 };

// 传统方式 vs Reflect方式
// 获取属性
obj.x;
Reflect.get(obj, 'x');

// 设置属性
obj.y = 2;
Reflect.set(obj, 'y', 2);

// 删除属性
delete obj.x;
Reflect.deleteProperty(obj, 'x');

// 检查属性
'x' in obj;
Reflect.has(obj, 'x');

// 定义属性
Object.defineProperty(obj, 'z', { value: 3 });
Reflect.defineProperty(obj, 'z', { value: 3 });

// Reflect的优势：返回布尔值而非抛出异常
const success = Reflect.defineProperty(obj, 'z', { 
  value: 3,
  configurable: false 
});
console.log(success);  // true 或 false
```

Reflect方法在Proxy trap中特别有用：

```javascript
const handler = {
  get(target, key, receiver) {
    console.log(`Accessing ${key}`);
    // 使用Reflect确保正确的receiver
    return Reflect.get(target, key, receiver);
  },
  
  set(target, key, value, receiver) {
    console.log(`Setting ${key} = ${value}`);
    // Reflect.set返回布尔值，可直接作为trap返回值
    return Reflect.set(target, key, value, receiver);
  }
};
```

## 性能影响分析

Proxy操作比直接对象访问慢，因为每次操作都需要额外的检查和可能的trap调用：

```javascript
function benchmarkProxy() {
  const iterations = 1000000;
  
  // 普通对象
  const obj = { x: 1 };
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    obj.x;
    obj.x = i;
  }
  const normalTime = performance.now() - start;
  
  // 空handler的Proxy
  const emptyProxy = new Proxy({ x: 1 }, {});
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    emptyProxy.x;
    emptyProxy.x = i;
  }
  const emptyProxyTime = performance.now() - start;
  
  // 带trap的Proxy
  const trapProxy = new Proxy({ x: 1 }, {
    get(t, k) { return t[k]; },
    set(t, k, v) { t[k] = v; return true; }
  });
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    trapProxy.x;
    trapProxy.x = i;
  }
  const trapProxyTime = performance.now() - start;
  
  console.log(`普通对象: ${normalTime.toFixed(2)}ms`);
  console.log(`空Proxy: ${emptyProxyTime.toFixed(2)}ms`);
  console.log(`带trap的Proxy: ${trapProxyTime.toFixed(2)}ms`);
}

benchmarkProxy();
// 典型输出：
// 普通对象: 3ms
// 空Proxy: 45ms
// 带trap的Proxy: 120ms
```

## Proxy的不变性约束

为了保证JavaScript的基本语义，Proxy必须遵守不变性（Invariants）约束：

```javascript
// 不变性示例
const target = {};
Object.defineProperty(target, 'x', {
  value: 1,
  writable: false,
  configurable: false
});

const proxy = new Proxy(target, {
  get(target, key) {
    return 42;  // 尝试返回不同的值
  }
});

// 抛出TypeError: 'get' on proxy: property 'x' is a read-only and 
// non-configurable data property on the proxy target but the proxy 
// did not return its actual value
try {
  proxy.x;
} catch (e) {
  console.log(e.message);
}
```

主要的不变性约束：

```javascript
// 1. getPrototypeOf：如果target不可扩展，必须返回target的实际原型
// 2. setPrototypeOf：如果target不可扩展，不能修改原型
// 3. isExtensible：必须返回target的实际可扩展性
// 4. preventExtensions：只有在target真正不可扩展时才能返回true
// 5. getOwnPropertyDescriptor：不能报告不存在的属性存在
// 6. defineProperty：不能添加不可配置属性，除非target也有
// 7. has：不能隐藏不可配置属性
// 8. get：不可配置不可写属性必须返回实际值
// 9. set：不能修改不可配置不可写属性
// 10. deleteProperty：不能删除不可配置属性
// 11. ownKeys：必须包含所有不可配置属性

function testInvariants() {
  const target = {};
  Object.defineProperty(target, 'permanent', {
    value: 'fixed',
    configurable: false
  });
  
  const proxy = new Proxy(target, {
    ownKeys() {
      return [];  // 尝试隐藏permanent属性
    }
  });
  
  // TypeError: 'ownKeys' on proxy: trap result did not include 'permanent'
  Object.keys(proxy);
}
```

## 可撤销代理

`Proxy.revocable`创建可撤销的代理：

```javascript
function createRevocableProxy(target, handler) {
  const { proxy, revoke } = Proxy.revocable(target, handler);
  
  return {
    proxy,
    revoke() {
      revoke();
      // 撤销后的proxy变成"死对象"
      // 任何操作都会抛出TypeError
    }
  };
}

const { proxy, revoke } = createRevocableProxy({ x: 1 }, {
  get(target, key) {
    console.log(`Accessing ${key}`);
    return target[key];
  }
});

console.log(proxy.x);  // "Accessing x" -> 1

revoke();

try {
  proxy.x;  // TypeError: Cannot perform 'get' on a proxy that has been revoked
} catch (e) {
  console.log('Proxy revoked');
}
```

V8内部的撤销实现：

```javascript
// V8内部处理
function revokeProxy(proxy) {
  // 设置撤销标志
  proxy.revoked = true;
  
  // 清除target和handler引用
  // 允许它们被垃圾回收
  proxy.target = null;
  proxy.handler = null;
}
```

## 实际应用场景

### 数据验证

```javascript
function createValidatedObject(schema) {
  return new Proxy({}, {
    set(target, key, value) {
      const validator = schema[key];
      
      if (validator && !validator(value)) {
        throw new TypeError(`Invalid value for ${key}`);
      }
      
      target[key] = value;
      return true;
    }
  });
}

const user = createValidatedObject({
  age: (v) => typeof v === 'number' && v >= 0,
  name: (v) => typeof v === 'string' && v.length > 0
});

user.name = 'Alice';  // OK
user.age = 25;        // OK

try {
  user.age = -1;      // TypeError: Invalid value for age
} catch (e) {
  console.log(e.message);
}
```

### 访问日志

```javascript
function createLoggingProxy(target, name = 'object') {
  return new Proxy(target, {
    get(target, key, receiver) {
      console.log(`[${name}] GET ${String(key)}`);
      const value = Reflect.get(target, key, receiver);
      
      // 递归代理嵌套对象
      if (typeof value === 'object' && value !== null) {
        return createLoggingProxy(value, `${name}.${String(key)}`);
      }
      
      return value;
    },
    
    set(target, key, value, receiver) {
      console.log(`[${name}] SET ${String(key)} = ${JSON.stringify(value)}`);
      return Reflect.set(target, key, value, receiver);
    }
  });
}

const data = createLoggingProxy({ user: { name: 'Alice' } });
data.user.name = 'Bob';
// [object] GET user
// [object.user] SET name = "Bob"
```

### 响应式系统

```javascript
// 简化的响应式实现（类似Vue 3）
const targetMap = new WeakMap();
let activeEffect = null;

function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 收集依赖
      track(target, key);
      
      const result = Reflect.get(target, key, receiver);
      
      if (typeof result === 'object' && result !== null) {
        return reactive(result);
      }
      
      return result;
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      
      if (oldValue !== value) {
        // 触发更新
        trigger(target, key);
      }
      
      return result;
    }
  });
}

function track(target, key) {
  if (!activeEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  
  deps.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const deps = depsMap.get(key);
  if (deps) {
    deps.forEach(effect => effect());
  }
}

function effect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

// 使用示例
const state = reactive({ count: 0 });

effect(() => {
  console.log(`Count is: ${state.count}`);
});
// 输出: "Count is: 0"

state.count++;
// 输出: "Count is: 1"
```

## 性能优化建议

### 减少trap复杂度

```javascript
// 避免在trap中执行复杂操作
const slowHandler = {
  get(target, key) {
    // 每次访问都执行复杂计算 - 不推荐
    return expensiveComputation(target[key]);
  }
};

// 推荐：缓存计算结果
const cache = new WeakMap();

const fastHandler = {
  get(target, key) {
    let cached = cache.get(target);
    if (!cached) {
      cached = {};
      cache.set(target, cached);
    }
    
    if (!(key in cached)) {
      cached[key] = expensiveComputation(target[key]);
    }
    
    return cached[key];
  }
};
```

### 限制Proxy使用范围

```javascript
// 只在必要时使用Proxy
class DataStore {
  constructor() {
    this._data = {};
    this._listeners = new Set();
  }
  
  // 只代理公开接口
  createProxy() {
    return new Proxy(this, {
      get(target, key) {
        if (key === 'data') {
          return target._data;
        }
        return Reflect.get(target, key);
      }
    });
  }
  
  // 内部操作直接访问
  _internalUpdate(key, value) {
    this._data[key] = value;
    this._notify();
  }
}
```

## 本章小结

Proxy和Reflect是JavaScript元编程的核心特性，V8为它们提供了完整的底层支持，但也带来了性能开销。

核心要点：

- **拦截机制**：Proxy可以拦截13种对象基本操作，每种操作对应一个trap
- **Reflect配合**：Reflect提供与trap对应的方法，确保正确的默认行为
- **不变性约束**：Proxy必须遵守不变性规则，保证JavaScript语义一致性
- **性能代价**：Proxy操作比直接访问慢10-40倍，应谨慎使用
- **实际应用**：数据验证、访问日志、响应式系统等场景适合使用Proxy

理解Proxy的底层机制，能帮助你在合适的场景使用这一强大特性，同时避免性能陷阱。下一章，我们将探索Symbol的内部实现，了解这种唯一标识符类型的工作原理。
