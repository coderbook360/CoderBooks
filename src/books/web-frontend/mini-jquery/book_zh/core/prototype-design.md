# 原型链设计：让实例共享方法

前面几章，我们多次提到"方法共享"。这一章，我们深入理解 jQuery 的原型链设计。

## 问题回顾

如果每个 jQuery 对象都有自己的方法副本：

```javascript
const $a = { css: function() {...}, each: function() {...} };
const $b = { css: function() {...}, each: function() {...} };
const $c = { css: function() {...}, each: function() {...} };
```

创建 1000 个对象就有 1000 份函数，内存浪费严重。

解决方案：**把方法放在原型上，所有实例共享**。

## 原型链基础

每个 JavaScript 对象都有一个内部属性 `[[Prototype]]`（可以通过 `__proto__` 访问），指向它的原型对象。

当访问对象的属性时，如果对象本身没有，就会沿着原型链向上查找：

```javascript
const obj = { name: 'John' };
console.log(obj.toString());  // "[object Object]"
```

`obj` 本身没有 `toString` 方法，但它的原型 `Object.prototype` 有，所以能调用。

## 构造函数与原型

当使用 `new` 调用构造函数时：

```javascript
function Person(name) {
  this.name = name;
}
Person.prototype.sayHello = function() {
  console.log(`Hello, I'm ${this.name}`);
};

const john = new Person('John');
const jane = new Person('Jane');

// 方法是共享的
console.log(john.sayHello === jane.sayHello);  // true
```

原型链：

```
john                    Person.prototype         Object.prototype
┌─────────────┐        ┌─────────────────┐       ┌────────────────┐
│ name: 'John'│───────▶│ sayHello: fn    │──────▶│ toString: fn   │──▶ null
└─────────────┘        │ constructor: fn │       │ hasOwnProperty │
  __proto__            └─────────────────┘       └────────────────┘
```

## jQuery 的原型链

jQuery 的原型链设计稍微复杂一些：

```javascript
function jQuery(selector) {
  return new jQuery.fn.init(selector);
}

jQuery.fn = jQuery.prototype = {
  constructor: jQuery,
  init: function(selector) { ... },
  css: function() { ... },
  each: function() { ... }
};

// 关键的一行
jQuery.fn.init.prototype = jQuery.fn;
```

让我们画出这个原型链：

```
$('#box')
    │
    ▼
new jQuery.fn.init('#box')
    │
    ▼ (创建的实例)
┌─────────────────┐
│ 0: <div#box>    │
│ length: 1       │
│ __proto__ ──────┼──────┐
└─────────────────┘      │
                         ▼
              jQuery.fn.init.prototype
                    ‖
              jQuery.fn (jQuery.prototype)
              ┌─────────────────────────┐
              │ constructor: jQuery      │
              │ init: function()         │
              │ css: function()          │
              │ each: function()         │
              │ __proto__ ───────────────┼──▶ Object.prototype
              └─────────────────────────┘
```

关键点：

1. `$('#box')` 调用 `new jQuery.fn.init('#box')`
2. `init` 创建的实例，其 `__proto__` 指向 `jQuery.fn.init.prototype`
3. 而 `jQuery.fn.init.prototype = jQuery.fn`
4. 所以实例可以访问 `jQuery.fn` 上的所有方法

## 为什么不直接用 jQuery 作为构造函数？

你可能会问，为什么要绕这么一个弯？直接这样不行吗：

```javascript
function jQuery(selector) {
  this.length = 0;
  // ... 初始化
}
jQuery.prototype.css = function() { ... };

// 使用
const $box = new jQuery('#box');
```

这样当然可以，但问题是：**必须用 `new`**。

```javascript
$('#box');      // 不行，this 指向 window
new $('#box');  // 可以，但太丑了
```

jQuery 的设计目标是 `$('#box')` 这种简洁的调用方式。所以需要一个中间层：

```javascript
function jQuery(selector) {
  return new jQuery.fn.init(selector);  // 内部帮你 new
}
```

## 验证原型链

```javascript
const $box = $('#box');

// 检查原型链
console.log($box.__proto__ === jQuery.fn);  // true
console.log($box.__proto__ === jQuery.prototype);  // true
console.log($box.__proto__ === jQuery.fn.init.prototype);  // true

// 方法来自原型
console.log($box.hasOwnProperty('css'));  // false
console.log($box.__proto__.hasOwnProperty('css'));  // true

// 所有实例共享同一个方法
const $item = $('.item');
console.log($box.css === $item.css);  // true
```

## 添加新方法

原型链设计的一个好处是：**可以随时添加新方法，所有已创建的实例都能使用**。

```javascript
// 添加新方法
jQuery.fn.highlight = function() {
  return this.css('backgroundColor', 'yellow');
};

// 已创建的对象也能用
$box.highlight();  // 有效！
```

这就是 jQuery 插件系统的基础：往 `$.fn` 上挂方法。

## 静态方法 vs 实例方法

jQuery 有两种方法：

### 实例方法

挂在 `jQuery.prototype`（即 `$.fn`）上，通过 jQuery 对象调用：

```javascript
$('#box').css('color', 'red');
$('.item').each(function() { ... });
```

### 静态方法

直接挂在 `jQuery` 函数上，不需要 jQuery 对象：

```javascript
$.ajax({ url: '/api' });
$.each([1, 2, 3], function(i, v) { ... });
$.extend({}, obj1, obj2);
```

实现：

```javascript
// 实例方法
jQuery.fn.css = function() { ... };

// 静态方法
jQuery.ajax = function() { ... };
jQuery.each = function() { ... };
```

## 完整示例

```javascript
// src/core/init.js

function jQuery(selector) {
  return new jQuery.fn.init(selector);
}

// 原型对象
jQuery.fn = jQuery.prototype = {
  jquery: '1.0.0',
  constructor: jQuery,
  length: 0,
  
  splice: Array.prototype.splice,
  
  [Symbol.iterator]: function* () {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  },
  
  init: function(selector) {
    if (!selector) return this;
    
    if (typeof selector === 'string') {
      if (selector[0] === '<') {
        this._setElements(this._parseHTML(selector));
      } else {
        this._setElements(document.querySelectorAll(selector));
      }
      return this;
    }
    
    if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    if (typeof selector === 'function') {
      document.addEventListener('DOMContentLoaded', selector);
      return this;
    }
    
    if (selector.length !== undefined) {
      this._setElements(selector);
    }
    
    return this;
  },
  
  _setElements: function(elements) {
    this.length = elements.length;
    for (let i = 0; i < elements.length; i++) {
      this[i] = elements[i];
    }
  },
  
  _parseHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return [...template.content.childNodes];
  },
  
  toArray: function() {
    return Array.from(this);
  },
  
  get: function(index) {
    if (index === undefined) return this.toArray();
    if (index < 0) index = this.length + index;
    return this[index];
  },
  
  each: function(callback) {
    for (let i = 0; i < this.length; i++) {
      if (callback.call(this[i], i, this[i]) === false) break;
    }
    return this;
  },
  
  css: function(prop, value) {
    if (value === undefined && typeof prop === 'string') {
      return this[0] ? getComputedStyle(this[0])[prop] : undefined;
    }
    return this.each(function() {
      if (typeof prop === 'object') {
        for (const key in prop) {
          this.style[key] = prop[key];
        }
      } else {
        this.style[prop] = value;
      }
    });
  }
};

// 让 init 实例共享 jQuery.fn
jQuery.fn.init.prototype = jQuery.fn;

// 静态方法：遍历数组或对象
jQuery.each = function(obj, callback) {
  if (Array.isArray(obj) || obj.length !== undefined) {
    for (let i = 0; i < obj.length; i++) {
      if (callback.call(obj[i], i, obj[i]) === false) break;
    }
  } else {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (callback.call(obj[key], key, obj[key]) === false) break;
      }
    }
  }
  return obj;
};

// 静态方法：类型判断
jQuery.isArray = Array.isArray;
jQuery.isFunction = (fn) => typeof fn === 'function';
jQuery.isPlainObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

window.$ = window.jQuery = jQuery;

export default jQuery;
```

## 测试

```html
<script type="module">
  import $ from './src/index.js';
  
  // 实例方法
  $('.item').css('color', 'blue');
  
  // 方法共享验证
  const $a = $('#box1');
  const $b = $('#box2');
  console.log('方法共享:', $a.css === $b.css);  // true
  
  // 静态方法
  $.each([1, 2, 3], function(i, v) {
    console.log(i, v);
  });
  
  $.each({ a: 1, b: 2 }, function(key, value) {
    console.log(key, value);
  });
  
  // 类型判断
  console.log('isArray:', $.isArray([1, 2, 3]));  // true
  console.log('isFunction:', $.isFunction(() => {}));  // true
  console.log('isPlainObject:', $.isPlainObject({}));  // true
  
  // 动态添加方法
  $.fn.highlight = function() {
    return this.css('backgroundColor', 'yellow');
  };
  
  $a.highlight();  // 有效
  $b.highlight();  // 有效
</script>
```

## 本章小结

jQuery 的原型链设计：

1. **`jQuery.fn = jQuery.prototype`**：所有实例方法都放这里
2. **`jQuery.fn.init`**：真正的构造函数
3. **`jQuery.fn.init.prototype = jQuery.fn`**：让 init 创建的实例共享 jQuery.fn 的方法
4. **静态方法直接挂在 jQuery 上**：如 `$.each`、`$.ajax`

这个设计实现了：

- 方法共享，节省内存
- 无 new 调用
- 可扩展的插件机制

下一章，我们深入链式调用的实现细节。

---

**思考题**：如果我们写 `jQuery.prototype = { ... }` 之后，又写 `jQuery.prototype.newMethod = function() {}`，会有什么问题？
