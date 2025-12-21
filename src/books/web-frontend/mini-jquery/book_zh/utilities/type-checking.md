# 类型检测工具

JavaScript 是弱类型语言，这既是它的灵活之处，也是它的坑所在。类型检测是每个 JavaScript 开发者都会遇到的问题，jQuery 提供了一套经过实战检验的解决方案。

## 为什么类型检测这么难？

先来看看原生 JavaScript 类型检测的问题：

```javascript
typeof null           // 'object'  ← 著名的 bug，但无法修复（会破坏太多代码）
typeof []             // 'object'  ← 数组也是对象，但我们经常需要区分
typeof new Date()     // 'object'  ← 日期也是对象
typeof /regex/        // 'object'  ← 正则也是对象
typeof function(){}   // 'function' ← 这个倒是能区分
```

问题出在哪里？`typeof` 只能区分**原始类型**（number、string、boolean、undefined、symbol、bigint）和函数，对于对象类型的细分无能为力。

那 `instanceof` 呢？

```javascript
[] instanceof Array           // true ✓
new Date() instanceof Date    // true ✓

// 但跨 iframe 时就出问题了
iframeArray instanceof Array  // false ✗ 不同 window 的 Array 不是同一个
```

`instanceof` 依赖原型链，当对象来自不同的全局环境（如 iframe）时就失效了。

## Object.prototype.toString：终极解决方案

JavaScript 规范定义了一个内部方法 `[[Class]]`，可以通过 `Object.prototype.toString` 访问：

```javascript
Object.prototype.toString.call(null)       // '[object Null]'
Object.prototype.toString.call([])         // '[object Array]'
Object.prototype.toString.call(new Date()) // '[object Date]'
Object.prototype.toString.call(/regex/)    // '[object RegExp]'
Object.prototype.toString.call(() => {})   // '[object Function]'
Object.prototype.toString.call({})         // '[object Object]'
```

这个方法返回的字符串格式是 `[object Type]`，其中 `Type` 就是我们想要的类型名。这是目前最可靠的类型检测方法，跨 iframe 也能正常工作。

## 实现 $.type

有了这个知识，实现 `$.type` 就很简单了：

```javascript
const class2type = {};
const toString = Object.prototype.toString;

// 预填充映射表
'Boolean Number String Function Array Date RegExp Object Error Symbol'.split(' ')
  .forEach(name => {
    class2type['[object ' + name + ']'] = name.toLowerCase();
  });

function type(obj) {
  if (obj == null) {
    return obj + '';  // 'null' 或 'undefined'
  }
  
  const typeString = toString.call(obj);
  return class2type[typeString] || 'object';
}
```

使用：

```javascript
$.type(null)          // 'null'
$.type(undefined)     // 'undefined'
$.type(true)          // 'boolean'
$.type(123)           // 'number'
$.type('str')         // 'string'
$.type([])            // 'array'
$.type({})            // 'object'
$.type(/regex/)       // 'regexp'
$.type(new Date())    // 'date'
$.type(function(){})  // 'function'
```

## 便捷方法

```javascript
$.isArray = Array.isArray;

$.isFunction = function(obj) {
  return typeof obj === 'function';
};

$.isPlainObject = function(obj) {
  // 必须是对象
  if (!obj || $.type(obj) !== 'object') {
    return false;
  }
  
  // 必须是通过 {} 或 new Object() 创建的
  const proto = Object.getPrototypeOf(obj);
  return proto === null || proto === Object.prototype;
};

$.isEmptyObject = function(obj) {
  for (const key in obj) {
    return false;
  }
  return true;
};

$.isNumeric = function(obj) {
  const type = $.type(obj);
  return (type === 'number' || type === 'string') && 
         !isNaN(obj - parseFloat(obj));
};

$.isWindow = function(obj) {
  return obj != null && obj === obj.window;
};
```

## 完整实现

```javascript
// src/utilities/type-checking.js

const class2type = {};
const toString = Object.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;

// 初始化类型映射
[
  'Boolean', 'Number', 'String', 'Function', 'Array',
  'Date', 'RegExp', 'Object', 'Error', 'Symbol', 'Map',
  'Set', 'WeakMap', 'WeakSet', 'Promise'
].forEach(name => {
  class2type['[object ' + name + ']'] = name.toLowerCase();
});

export function installTypeChecking(jQuery) {
  
  // 核心类型检测
  jQuery.type = function(obj) {
    if (obj == null) {
      return obj + '';
    }
    
    // 基本类型直接用 typeof
    const t = typeof obj;
    if (t !== 'object' && t !== 'function') {
      return t;
    }
    
    // 对象类型用 toString
    return class2type[toString.call(obj)] || 'object';
  };
  
  // 是否是数组
  jQuery.isArray = Array.isArray;
  
  // 是否是函数
  jQuery.isFunction = function(obj) {
    return typeof obj === 'function';
  };
  
  // 是否是纯对象
  jQuery.isPlainObject = function(obj) {
    if (!obj || toString.call(obj) !== '[object Object]') {
      return false;
    }
    
    const proto = Object.getPrototypeOf(obj);
    
    // Object.create(null) 创建的对象
    if (!proto) {
      return true;
    }
    
    // 通过 {} 或 new Object() 创建的对象
    const Ctor = hasOwn.call(proto, 'constructor') && proto.constructor;
    return typeof Ctor === 'function' && 
           Ctor.toString() === Object.toString();
  };
  
  // 是否是空对象
  jQuery.isEmptyObject = function(obj) {
    for (const key in obj) {
      if (hasOwn.call(obj, key)) {
        return false;
      }
    }
    return true;
  };
  
  // 是否是数字或数字字符串
  jQuery.isNumeric = function(obj) {
    const type = jQuery.type(obj);
    return (type === 'number' || type === 'string') && 
           !isNaN(obj - parseFloat(obj));
  };
  
  // 是否是 window 对象
  jQuery.isWindow = function(obj) {
    return obj != null && obj === obj.window;
  };
  
  // 是否是类数组
  jQuery.isArrayLike = function(obj) {
    if (obj == null || jQuery.isWindow(obj)) {
      return false;
    }
    
    // 函数有 length，但不是类数组
    if (typeof obj === 'function') {
      return false;
    }
    
    const length = obj.length;
    
    // 必须有 length 属性且为非负整数
    if (typeof length !== 'number' || length < 0 || !Number.isInteger(length)) {
      return false;
    }
    
    // 空数组或最后一个索引存在
    return length === 0 || (length - 1) in obj;
  };
  
  // 是否是 jQuery 对象
  jQuery.isJQuery = function(obj) {
    return obj instanceof jQuery;
  };
  
  // 是否是 DOM 元素
  jQuery.isElement = function(obj) {
    return obj && obj.nodeType === 1;
  };
  
  // 是否是 Promise
  jQuery.isPromise = function(obj) {
    return obj && typeof obj.then === 'function';
  };
}
```

## 使用示例

### 参数验证

```javascript
function processData(data) {
  if (!$.isPlainObject(data)) {
    throw new Error('data must be a plain object');
  }
  
  if (!$.isArray(data.items)) {
    throw new Error('data.items must be an array');
  }
  
  // ...
}
```

### 类型分支

```javascript
function handle(input) {
  switch ($.type(input)) {
    case 'string':
      return parseString(input);
    case 'array':
      return input.map(handle);
    case 'object':
      return handleObject(input);
    case 'function':
      return handle(input());
    default:
      return input;
  }
}
```

### 深拷贝类型处理

```javascript
function deepClone(obj) {
  const type = $.type(obj);
  
  switch (type) {
    case 'null':
    case 'undefined':
    case 'boolean':
    case 'number':
    case 'string':
    case 'symbol':
      return obj;
    
    case 'date':
      return new Date(obj.getTime());
    
    case 'regexp':
      return new RegExp(obj.source, obj.flags);
    
    case 'array':
      return obj.map(item => deepClone(item));
    
    case 'object':
      if ($.isPlainObject(obj)) {
        const result = {};
        for (const key in obj) {
          result[key] = deepClone(obj[key]);
        }
        return result;
      }
      return obj;  // 其他对象返回引用
    
    default:
      return obj;
  }
}
```

### 安全的属性访问

```javascript
function getProperty(obj, path) {
  if (!$.isPlainObject(obj) && !$.isArray(obj)) {
    return undefined;
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}
```

## isPlainObject 的重要性

区分"普通对象"和"类实例"：

```javascript
class User {
  constructor(name) {
    this.name = name;
  }
}

const user = new User('John');
const obj = { name: 'John' };

$.isPlainObject(user)  // false - 类实例
$.isPlainObject(obj)   // true  - 普通对象

// extend 时很重要
$.extend(true, target, user)  // 不会深拷贝类实例
$.extend(true, target, obj)   // 会深拷贝普通对象
```

## 本章小结

类型检测工具：

- **$.type()**：精确的类型字符串
- **$.isArray()**：是否数组
- **$.isFunction()**：是否函数
- **$.isPlainObject()**：是否纯对象
- **$.isEmptyObject()**：是否空对象
- **$.isNumeric()**：是否数字
- **$.isArrayLike()**：是否类数组

核心原理：

- Object.prototype.toString.call() 获取精确类型
- 预建映射表快速查找

下一章，我们实现数组工具函数。

---

**思考题**：`$.isArrayLike()` 为什么要特判函数？函数也有 `length` 属性，但为什么不能当作类数组？
