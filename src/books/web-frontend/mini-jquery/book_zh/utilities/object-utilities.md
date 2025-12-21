# 对象工具：extend、merge

对象合并是最常用的操作之一。$.extend 是 jQuery 的核心工具方法。

## $.extend 基础用法

```javascript
// 合并对象
const result = $.extend({}, obj1, obj2);

// 直接修改目标
$.extend(target, source);

// 深拷贝
$.extend(true, target, source);
```

## 浅拷贝 vs 深拷贝

```javascript
const source = {
  name: 'John',
  address: { city: 'NYC' }
};

// 浅拷贝
const shallow = $.extend({}, source);
shallow.address.city = 'LA';
console.log(source.address.city);  // 'LA' - 被修改了！

// 深拷贝
const deep = $.extend(true, {}, source);
deep.address.city = 'LA';
console.log(source.address.city);  // 'NYC' - 不受影响
```

## 基础实现

```javascript
function extend() {
  let target = arguments[0] || {};
  let deep = false;
  let i = 1;
  
  // 第一个参数是布尔值，表示深拷贝
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1] || {};
    i = 2;
  }
  
  // 确保 target 是对象
  if (typeof target !== 'object' && typeof target !== 'function') {
    target = {};
  }
  
  // 遍历所有源对象
  for (; i < arguments.length; i++) {
    const source = arguments[i];
    
    if (source == null) continue;
    
    for (const key in source) {
      const sourceValue = source[key];
      
      // 避免循环引用
      if (sourceValue === target) continue;
      
      if (deep && sourceValue && 
          (isPlainObject(sourceValue) || Array.isArray(sourceValue))) {
        // 深拷贝
        const targetValue = target[key];
        let clone;
        
        if (Array.isArray(sourceValue)) {
          clone = Array.isArray(targetValue) ? targetValue : [];
        } else {
          clone = isPlainObject(targetValue) ? targetValue : {};
        }
        
        target[key] = extend(deep, clone, sourceValue);
      } else if (sourceValue !== undefined) {
        target[key] = sourceValue;
      }
    }
  }
  
  return target;
}
```

## 扩展 jQuery 本身

$.extend 还可以扩展 jQuery：

```javascript
// 只传一个参数时，扩展 jQuery 自身
$.extend({
  myUtil: function() { }
});

$.myUtil();  // 可用
```

实现：

```javascript
function extend() {
  let target = arguments[0] || {};
  let i = 1;
  
  // 只有一个参数，扩展自身
  if (arguments.length === 1) {
    target = this;
    i = 0;
  }
  
  // ... 其余逻辑
}
```

## $.fn.extend

扩展 jQuery 原型：

```javascript
$.fn.extend({
  check: function() {
    return this.each(function() {
      this.checked = true;
    });
  },
  uncheck: function() {
    return this.each(function() {
      this.checked = false;
    });
  }
});

$('input[type=checkbox]').check();
```

## 完整实现

```javascript
// src/utilities/object-utilities.js

export function installObjectUtilities(jQuery) {
  
  // 检测纯对象
  function isPlainObject(obj) {
    if (!obj || Object.prototype.toString.call(obj) !== '[object Object]') {
      return false;
    }
    
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
  }
  
  // 核心 extend 实现
  jQuery.extend = jQuery.fn.extend = function() {
    let target = arguments[0] || {};
    let deep = false;
    let i = 1;
    const length = arguments.length;
    
    // 检测深拷贝标志
    if (typeof target === 'boolean') {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    }
    
    // 只有一个参数（或只有 deep + 一个对象），扩展自身
    if (i === length) {
      target = this;
      i--;
    }
    
    // 确保 target 是对象
    if (typeof target !== 'object' && typeof target !== 'function') {
      target = {};
    }
    
    // 遍历源对象
    for (; i < length; i++) {
      const source = arguments[i];
      
      if (source == null) continue;
      
      for (const key in source) {
        // 跳过继承属性
        if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
        
        const srcValue = source[key];
        const targetValue = target[key];
        
        // 避免循环引用
        if (target === srcValue) continue;
        
        // 深拷贝
        if (deep && srcValue != null && 
            (isPlainObject(srcValue) || Array.isArray(srcValue))) {
          
          let clone;
          
          if (Array.isArray(srcValue)) {
            clone = Array.isArray(targetValue) ? targetValue : [];
          } else {
            clone = isPlainObject(targetValue) ? targetValue : {};
          }
          
          target[key] = jQuery.extend(deep, clone, srcValue);
          
        } else if (srcValue !== undefined) {
          // 浅拷贝
          target[key] = srcValue;
        }
      }
    }
    
    return target;
  };
  
  // 对象遍历
  jQuery.each = function(obj, callback) {
    // ... (在 array-utilities 中已实现)
  };
  
  // 对象键
  jQuery.keys = function(obj) {
    return Object.keys(obj);
  };
  
  // 对象值
  jQuery.values = function(obj) {
    return Object.values(obj);
  };
  
  // 对象条目
  jQuery.entries = function(obj) {
    return Object.entries(obj);
  };
  
  // 从条目创建对象
  jQuery.fromEntries = function(entries) {
    return Object.fromEntries(entries);
  };
  
  // 对象映射
  jQuery.mapObject = function(obj, callback) {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = callback(obj[key], key, obj);
      }
    }
    return result;
  };
  
  // 对象过滤
  jQuery.filterObject = function(obj, callback) {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (callback(obj[key], key, obj)) {
          result[key] = obj[key];
        }
      }
    }
    return result;
  };
  
  // 对象 pick
  jQuery.pick = function(obj, ...keys) {
    const result = {};
    const keySet = new Set(keys.flat());
    for (const key of keySet) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  };
  
  // 对象 omit
  jQuery.omit = function(obj, ...keys) {
    const result = { ...obj };
    const keySet = new Set(keys.flat());
    for (const key of keySet) {
      delete result[key];
    }
    return result;
  };
}
```

## 使用示例

### 合并配置

```javascript
const defaults = {
  duration: 400,
  easing: 'swing',
  complete: null
};

function animate(props, options) {
  const settings = $.extend({}, defaults, options);
  // settings 包含默认值和用户配置的合并
}
```

### 深层合并

```javascript
const base = {
  api: {
    host: 'localhost',
    port: 3000
  },
  features: {
    cache: true,
    debug: false
  }
};

const production = $.extend(true, {}, base, {
  api: {
    host: 'api.example.com',
    port: 443
  },
  features: {
    debug: false  // 只覆盖这一个
  }
});

// production.features.cache 仍然是 true
```

### 扩展 jQuery

```javascript
// 添加工具方法
$.extend({
  log: function(...args) {
    console.log('[jQuery]', ...args);
  },
  
  uuid: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
});

$.log('Hello');      // [jQuery] Hello
$.uuid();            // 'a1b2c3d4-...'
```

### 添加实例方法

```javascript
$.fn.extend({
  // 高亮元素
  highlight: function(color = 'yellow') {
    return this.css('background-color', color);
  },
  
  // 闪烁效果
  blink: function(times = 3) {
    const $this = this;
    let count = 0;
    
    const toggle = () => {
      $this.fadeToggle(200, () => {
        if (++count < times * 2) {
          toggle();
        }
      });
    };
    
    toggle();
    return this;
  }
});

$('.important').highlight();
$('.alert').blink(5);
```

### 插件模式

```javascript
$.fn.extend({
  myPlugin: function(options) {
    const settings = $.extend({
      color: 'blue',
      size: 'medium'
    }, options);
    
    return this.each(function() {
      // 应用设置到每个元素
      $(this).css('color', settings.color);
    });
  }
});

$('.text').myPlugin({ color: 'red' });
```

### 对象操作工具

```javascript
const user = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  password: 'secret',
  role: 'admin'
};

// 只取需要的字段
const publicInfo = $.pick(user, 'id', 'name', 'email');
// { id: 1, name: 'John', email: 'john@example.com' }

// 排除敏感字段
const safeUser = $.omit(user, 'password');
// { id: 1, name: 'John', email: '...', role: 'admin' }
```

## 本章小结

对象工具方法：

- **$.extend()**：合并对象（支持深拷贝）
- **$.fn.extend()**：扩展 jQuery 实例方法
- **$.pick()**：选取指定属性
- **$.omit()**：排除指定属性
- **$.mapObject()**：映射对象值
- **$.filterObject()**：过滤对象

$.extend 特点：

- 支持多个源对象
- 支持深拷贝（第一个参数为 true）
- 单参数时扩展自身
- 避免循环引用

下一章，我们实现字符串工具函数。

---

**思考题**：$.extend 深拷贝时，如何正确处理 Date、RegExp 等特殊对象？当前实现有什么问题？
