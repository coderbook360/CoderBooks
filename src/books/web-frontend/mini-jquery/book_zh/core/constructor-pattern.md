# 构造器模式：无 new 调用的秘密

上一章结尾，我们发现了一个问题：每个 jQuery 对象都有自己的方法副本。

```javascript
const $a = $('.item');
const $b = $('#box');
console.log($a.css === $b.css);  // false
```

这不仅浪费内存，还让扩展变得困难。解决方案是：**使用原型链共享方法**。

但在实现原型链之前，我们先要解决另一个问题：**如何让 `$()` 不需要 `new` 就能创建实例？**

## 普通的构造函数需要 new

在 JavaScript 中，如果你想创建一个类的实例，通常需要 `new`：

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }
  sayHello() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

const john = new Person('John');  // 必须用 new
john.sayHello();
```

如果不用 `new` 会怎样？

```javascript
const john = Person('John');  // TypeError: Class constructor cannot be invoked without 'new'
```

直接报错。

## jQuery 不需要 new

但 jQuery 不一样：

```javascript
$('#box');  // 没有 new，却能工作！
```

这是怎么做到的？

秘密在于：**`$` 函数内部帮你调用了 `new`**。

让我们来实现这个机制。

## 第一版：工厂函数

最简单的方式是用工厂函数：

```javascript
// $ 是一个普通函数，不是构造函数
function jQuery(selector) {
  // 内部创建并返回真正的实例
  return new jQuery.fn.init(selector);
}

// 真正的构造函数
jQuery.fn = jQuery.prototype = {
  constructor: jQuery,
  init: function(selector) {
    // 初始化逻辑
    const elements = document.querySelectorAll(selector);
    this.length = elements.length;
    for (let i = 0; i < elements.length; i++) {
      this[i] = elements[i];
    }
    return this;
  }
};

// 让 init 的实例也能使用 jQuery.prototype 上的方法
jQuery.fn.init.prototype = jQuery.fn;
```

这段代码有点绕，让我们一步步分析。

### 第一步：理解 jQuery.fn

```javascript
jQuery.fn = jQuery.prototype = { ... };
```

这行做了两件事：

1. 创建 `jQuery.prototype` 对象
2. 用 `jQuery.fn` 作为别名（写 `$.fn` 比写 `$.prototype` 更短）

所有挂在 `jQuery.fn` 上的方法，都会被所有 jQuery 实例共享。

### 第二步：理解 init

`init` 是真正的构造函数，负责初始化 jQuery 对象：

```javascript
init: function(selector) {
  const elements = document.querySelectorAll(selector);
  this.length = elements.length;
  for (let i = 0; i < elements.length; i++) {
    this[i] = elements[i];
  }
  return this;
}
```

当我们调用 `new jQuery.fn.init(selector)` 时：

1. 创建一个新对象
2. 新对象的 `__proto__` 指向 `jQuery.fn.init.prototype`
3. 执行 `init` 函数，`this` 指向新对象
4. 返回这个新对象

### 第三步：关键的一行

```javascript
jQuery.fn.init.prototype = jQuery.fn;
```

这行是整个机制的关键。

默认情况下，`jQuery.fn.init.prototype` 是一个空对象。我们把它指向 `jQuery.fn`，这样 `init` 创建的实例就能访问 `jQuery.fn` 上的所有方法。

用图表示：

```
$('#box')
    ↓
new jQuery.fn.init('#box')
    ↓
创建新对象 obj
    ↓
obj.__proto__ = jQuery.fn.init.prototype
               = jQuery.fn
               = jQuery.prototype
    ↓
obj 可以访问 jQuery.prototype 上的所有方法
```

## 验证原型链

```javascript
const $box = $('#box');

console.log($box instanceof jQuery.fn.init);  // true
console.log($box.constructor === jQuery);      // true（因为 jQuery.fn.constructor = jQuery）

// 方法是共享的
const $item = $('.item');
console.log($box.css === $item.css);  // true!
```

现在方法是共享的了！

## 完整实现

让我们把代码整理成完整版本：

```javascript
// src/core/init.js

// jQuery 入口函数
function jQuery(selector) {
  return new jQuery.fn.init(selector);
}

// 原型对象（所有实例共享的方法都放这里）
jQuery.fn = jQuery.prototype = {
  // 标记这是 jQuery 对象
  jquery: '1.0.0',
  
  constructor: jQuery,
  
  // 默认长度为 0
  length: 0,
  
  // 构造函数
  init: function(selector) {
    // 空值处理
    if (!selector) {
      return this;
    }
    
    // 字符串处理
    if (typeof selector === 'string') {
      // HTML 字符串
      if (selector[0] === '<') {
        const elements = this._parseHTML(selector);
        this._setElements(elements);
        return this;
      }
      // CSS 选择器
      const elements = document.querySelectorAll(selector);
      this._setElements(elements);
      return this;
    }
    
    // DOM 元素
    if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    // 函数（DOM ready）
    if (typeof selector === 'function') {
      document.addEventListener('DOMContentLoaded', selector);
      return this;
    }
    
    // 类数组
    if (selector.length !== undefined) {
      this._setElements(selector);
      return this;
    }
    
    return this;
  },
  
  // 内部方法：设置元素
  _setElements: function(elements) {
    this.length = elements.length;
    for (let i = 0; i < elements.length; i++) {
      this[i] = elements[i];
    }
  },
  
  // 内部方法：解析 HTML
  _parseHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return [...template.content.childNodes];
  },
  
  // 遍历方法
  each: function(callback) {
    for (let i = 0; i < this.length; i++) {
      // callback 的 this 指向当前元素
      // 参数是 (index, element)
      const result = callback.call(this[i], i, this[i]);
      // 如果返回 false，中断循环
      if (result === false) {
        break;
      }
    }
    return this;
  },
  
  // CSS 方法
  css: function(prop, value) {
    // Getter
    if (value === undefined && typeof prop === 'string') {
      return this[0] ? getComputedStyle(this[0])[prop] : undefined;
    }
    // Setter
    return this.each(function() {
      if (typeof prop === 'object') {
        // 对象形式：css({ color: 'red', fontSize: '14px' })
        for (const key in prop) {
          this.style[key] = prop[key];
        }
      } else {
        // 单个属性：css('color', 'red')
        this.style[prop] = value;
      }
    });
  }
};

// 关键：让 init 的实例共享 jQuery.fn 的方法
jQuery.fn.init.prototype = jQuery.fn;

// 挂载到全局
window.$ = window.jQuery = jQuery;

export default jQuery;
```

## 测试

更新测试代码：

```html
<script type="module">
  import $ from './src/index.js';
  
  // 测试基本选择
  const $items = $('.item');
  console.log('长度:', $items.length);
  console.log('jQuery 版本:', $items.jquery);
  
  // 测试方法共享
  const $box = $('#box1');
  console.log('方法共享:', $items.css === $box.css);  // true
  
  // 测试链式调用
  $items
    .css('color', 'blue')
    .css({ 
      backgroundColor: '#e8f4fc',
      padding: '12px'
    });
  
  // 测试 each
  $items.each(function(i, el) {
    console.log(i, el.textContent);
  });
  
  // 测试 DOM 元素包装
  $(document.body).css('margin', '0');
  
  // 测试 HTML 创建
  const $newDiv = $('<div class="new">新创建的元素</div>');
  console.log('新元素:', $newDiv[0]);
  
  // 测试 DOM ready
  $(function() {
    console.log('DOM Ready!');
  });
</script>
```

## 为什么这样设计？

你可能会问：为什么不直接用 `class` 语法？

```javascript
class jQuery {
  constructor(selector) {
    // ...
  }
  css() { ... }
}
// 用户必须：new jQuery('#box')
```

原因：

1. **API 简洁性**：`$('#box')` 比 `new $('#box')` 更简洁
2. **历史习惯**：jQuery 从 2006 年就是这样用的
3. **模式复用**：很多库（如 Lodash）都采用这种模式

这种"无 new 调用"的模式叫做**工厂模式（Factory Pattern）**：用一个普通函数包装构造逻辑，对使用者隐藏 `new` 操作。

## 本章小结

我们实现了 jQuery 的"无 new 调用"机制：

1. **入口函数 `$()`**：普通函数，内部调用 `new`
2. **真正的构造函数 `init`**：负责初始化实例
3. **原型共享**：`jQuery.fn.init.prototype = jQuery.fn`，让所有实例共享方法
4. **别名 `$.fn`**：方便扩展

现在我们的方法是共享的，内存效率提高了。

下一章，我们深入探讨 jQuery 对象的类数组结构。

---

**思考题**：`jQuery.fn.init.prototype = jQuery.fn` 这行如果忘记写会怎样？实例还能调用 `.css()` 方法吗？
