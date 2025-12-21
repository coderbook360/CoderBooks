# Realm 与多全局对象：iframe 中的隔离机制

当你在网页中嵌入一个iframe时，虽然看起来是同一个页面的一部分，但iframe中的JavaScript运行在一个独立的环境中。这个环境在ECMAScript规范中被称为`Realm`。每个Realm都有自己的全局对象、内置对象和执行上下文。本章将探讨V8如何实现Realm隔离，以及这种隔离机制带来的影响。

## Realm的基本概念

一个`Realm`包含了JavaScript代码执行所需的完整环境：

```javascript
// 主页面的Realm
console.log(Array);  // 主页面的Array构造函数

// iframe中的Realm
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const iframeArray = iframe.contentWindow.Array;

// 两个Array是不同的对象
console.log(Array === iframeArray);  // false

// instanceof检查受Realm影响
const arr = new iframeArray(1, 2, 3);
console.log(arr instanceof Array);       // false
console.log(arr instanceof iframeArray); // true
```

Realm的结构：

```
┌─────────────────────────────────────────────────────┐
│                    Realm                             │
├─────────────────────────────────────────────────────┤
│  Global Object (globalThis/window)                  │
├─────────────────────────────────────────────────────┤
│  Global Environment Record                          │
├─────────────────────────────────────────────────────┤
│  Intrinsic Objects (内置对象)                       │
│  ├── Object                                         │
│  ├── Array                                          │
│  ├── Function                                       │
│  ├── Error                                          │
│  └── ...                                            │
├─────────────────────────────────────────────────────┤
│  Host-defined Fields (宿主定义字段)                 │
└─────────────────────────────────────────────────────┘
```

## V8中的Context

V8使用`Context`来表示Realm。每个Context都是独立的执行环境：

```javascript
// V8的Context结构（简化）
class V8Context {
  constructor() {
    // 全局对象
    this.global = this.createGlobalObject();
    
    // 内置对象的原型
    this.intrinsics = {
      objectPrototype: {},
      arrayPrototype: [],
      functionPrototype: function() {},
      // ...
    };
    
    // 安全令牌（用于跨Context访问控制）
    this.securityToken = null;
  }
  
  createGlobalObject() {
    const global = {};
    
    // 添加全局属性
    global.Object = this.createObjectConstructor();
    global.Array = this.createArrayConstructor();
    global.Function = this.createFunctionConstructor();
    // ...
    
    return global;
  }
}
```

## 跨Realm的对象交互

不同Realm之间的对象可以交互，但需要注意身份判断：

```javascript
// 创建iframe获取另一个Realm
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const otherWindow = iframe.contentWindow;

// 跨Realm传递对象
const mainObj = { type: 'main' };
otherWindow.receivedObj = mainObj;

// 在iframe中访问
// iframe.html:
console.log(receivedObj.type);  // 'main'
console.log(receivedObj instanceof Object);  // false!
// 因为Object是iframe的Object，不是main的Object

// 安全的类型检查
function isPlainObject(obj) {
  // 不依赖instanceof
  return Object.prototype.toString.call(obj) === '[object Object]';
}

// 跨Realm的数组检查
function isArray(obj) {
  // Array.isArray专门处理跨Realm情况
  return Array.isArray(obj);  // true，即使来自不同Realm
}
```

## 内置对象的隔离

每个Realm都有自己的内置对象实例：

```javascript
// 演示内置对象隔离
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const iframeWindow = iframe.contentWindow;

// Error对象
const mainError = new Error('main');
const iframeError = new iframeWindow.Error('iframe');

console.log(mainError instanceof Error);  // true
console.log(iframeError instanceof Error);  // false
console.log(iframeError instanceof iframeWindow.Error);  // true

// Promise对象
const mainPromise = Promise.resolve(1);
const iframePromise = iframeWindow.Promise.resolve(1);

console.log(mainPromise instanceof Promise);  // true
console.log(iframePromise instanceof Promise);  // false

// Symbol
const mainSymbol = Symbol.for('shared');
const iframeSymbol = iframeWindow.Symbol.for('shared');

// Symbol.for使用全局注册表，跨Realm相同
console.log(mainSymbol === iframeSymbol);  // true
```

## 安全边界与同源策略

V8的Context与浏览器的安全模型紧密集成：

```javascript
// 同源iframe可以完全访问
const sameOriginIframe = document.createElement('iframe');
sameOriginIframe.src = '/page.html';  // 同源
document.body.appendChild(sameOriginIframe);

sameOriginIframe.onload = () => {
  const win = sameOriginIframe.contentWindow;
  console.log(win.document);  // 可以访问
  console.log(win.someFunction());  // 可以调用
};

// 跨源iframe受限制
const crossOriginIframe = document.createElement('iframe');
crossOriginIframe.src = 'https://other-domain.com/page.html';
document.body.appendChild(crossOriginIframe);

crossOriginIframe.onload = () => {
  const win = crossOriginIframe.contentWindow;
  
  try {
    console.log(win.document);  // SecurityError
  } catch (e) {
    console.log('跨源访问被阻止');
  }
  
  // 只能使用postMessage通信
  win.postMessage({ type: 'hello' }, 'https://other-domain.com');
};
```

## ShadowRealm提案

TC39正在推进`ShadowRealm`提案，提供更轻量级的Realm创建方式：

```javascript
// ShadowRealm API（提案阶段）
const shadowRealm = new ShadowRealm();

// 在ShadowRealm中执行代码
const result = shadowRealm.evaluate('1 + 2');
console.log(result);  // 3

// 导入模块
const add = await shadowRealm.importValue('./math.js', 'add');
console.log(add(1, 2));  // 3

// ShadowRealm的特点：
// 1. 没有DOM访问
// 2. 独立的全局对象
// 3. 原始值可以跨Realm传递
// 4. 对象不能直接跨Realm（需要包装）
```

模拟ShadowRealm的基本功能：

```javascript
// 使用iframe模拟ShadowRealm
class PseudoShadowRealm {
  constructor() {
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    document.body.appendChild(this.iframe);
    this.global = this.iframe.contentWindow;
  }
  
  evaluate(code) {
    // 在iframe中执行代码
    const result = this.global.eval(code);
    
    // 只允许原始值返回
    if (typeof result === 'object' && result !== null) {
      throw new TypeError('Cannot return object from ShadowRealm');
    }
    
    return result;
  }
  
  async importValue(specifier, exportName) {
    // 动态导入模块
    const module = await this.global.eval(`
      import('${specifier}').then(m => m['${exportName}'])
    `);
    
    // 包装函数以确保正确的Realm
    if (typeof module === 'function') {
      return (...args) => {
        // 验证参数都是原始值
        for (const arg of args) {
          if (typeof arg === 'object' && arg !== null) {
            throw new TypeError('Cannot pass object to ShadowRealm');
          }
        }
        return module(...args);
      };
    }
    
    return module;
  }
  
  destroy() {
    this.iframe.remove();
  }
}
```

## Realm与闭包

闭包会保持对创建它的Realm的引用：

```javascript
// 创建返回闭包的函数
function createCounter(iframe) {
  const iframeWindow = iframe.contentWindow;
  
  // 在iframe的Realm中创建计数器
  const counter = iframeWindow.eval(`
    (function() {
      let count = 0;
      return {
        increment() { return ++count; },
        getArray() { return new Array(count).fill(0); }
      };
    })()
  `);
  
  return counter;
}

const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const counter = createCounter(iframe);

console.log(counter.increment());  // 1
console.log(counter.increment());  // 2

const arr = counter.getArray();
console.log(arr instanceof Array);  // false
console.log(arr instanceof iframe.contentWindow.Array);  // true
```

## 性能考量

Realm隔离有性能影响：

```javascript
// 测试跨Realm调用开销
function benchmarkRealmCalls() {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  
  // 同Realm函数
  function localAdd(a, b) { return a + b; }
  
  // 跨Realm函数
  iframe.contentWindow.eval(`
    function remoteAdd(a, b) { return a + b; }
  `);
  const remoteAdd = iframe.contentWindow.remoteAdd;
  
  const iterations = 1000000;
  
  // 测试本地调用
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    localAdd(1, 2);
  }
  console.log(`本地调用: ${performance.now() - start}ms`);
  
  // 测试跨Realm调用
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    remoteAdd(1, 2);
  }
  console.log(`跨Realm调用: ${performance.now() - start}ms`);
  
  iframe.remove();
}

// 典型结果：
// 本地调用: 5ms
// 跨Realm调用: 50ms
// 跨Realm调用约慢10倍
```

## 最佳实践

### 跨Realm类型检查

```javascript
// 可靠的类型检查方法
const typeChecks = {
  isArray: Array.isArray,  // 内置支持跨Realm
  
  isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  },
  
  isFunction(value) {
    return typeof value === 'function';
  },
  
  isError(value) {
    return Object.prototype.toString.call(value) === '[object Error]';
  },
  
  isPromise(value) {
    return Object.prototype.toString.call(value) === '[object Promise]';
  },
  
  isDate(value) {
    return Object.prototype.toString.call(value) === '[object Date]';
  }
};
```

### 安全的数据传递

```javascript
// 跨Realm安全传递数据
function safeTransfer(value, targetRealm) {
  // 原始值直接传递
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  // 数组使用目标Realm的Array
  if (Array.isArray(value)) {
    const TargetArray = targetRealm.Array;
    return TargetArray.from(value, item => safeTransfer(item, targetRealm));
  }
  
  // 普通对象使用目标Realm的Object
  if (Object.prototype.toString.call(value) === '[object Object]') {
    const TargetObject = targetRealm.Object;
    const result = new TargetObject();
    
    for (const [key, val] of Object.entries(value)) {
      result[key] = safeTransfer(val, targetRealm);
    }
    
    return result;
  }
  
  // 其他类型使用JSON序列化
  return targetRealm.JSON.parse(JSON.stringify(value));
}
```

### 隔离执行环境

```javascript
// 创建安全的代码执行环境
function createSandbox() {
  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts';  // 限制功能
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const sandbox = {
    execute(code) {
      // 清理全局环境
      iframe.contentWindow.eval(`
        // 删除危险的全局变量
        delete window.fetch;
        delete window.XMLHttpRequest;
        delete window.localStorage;
      `);
      
      return iframe.contentWindow.eval(code);
    },
    
    destroy() {
      iframe.remove();
    }
  };
  
  return sandbox;
}

const sandbox = createSandbox();
console.log(sandbox.execute('1 + 2'));  // 3
sandbox.destroy();
```

## 本章小结

Realm是JavaScript执行环境的核心概念，V8通过Context实现了完整的Realm隔离。理解Realm机制对于处理iframe、Web Workers和未来的ShadowRealm都很重要。

核心要点：

- **独立环境**：每个Realm都有独立的全局对象和内置对象
- **身份判断**：`instanceof`受Realm影响，跨Realm对象检查需要特殊处理
- **安全边界**：同源策略限制跨源Realm的访问
- **性能开销**：跨Realm调用比同Realm调用慢约10倍
- **类型检查**：使用`Object.prototype.toString`或`Array.isArray`进行可靠的跨Realm类型检查

理解Realm隔离机制，能帮助你正确处理多执行环境场景下的代码交互。下一章，我们将学习Chrome DevTools的性能分析功能，掌握实用的性能优化工具。
