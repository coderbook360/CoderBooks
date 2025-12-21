# 链式调用：返回 this 的艺术

链式调用是 jQuery 最具标志性的特征：

```javascript
$('#box')
  .addClass('active')
  .css('color', 'red')
  .fadeIn(300)
  .on('click', handler);
```

一行代码完成多个操作，代码既简洁又易读。这一章，我们深入理解链式调用的实现。

## 链式调用的本质

链式调用的实现原理非常简单：**每个方法返回 `this`**。

```javascript
const obj = {
  value: 0,
  
  add(n) {
    this.value += n;
    return this;  // 返回自身
  },
  
  multiply(n) {
    this.value *= n;
    return this;  // 返回自身
  },
  
  log() {
    console.log(this.value);
    return this;  // 返回自身
  }
};

obj.add(5).multiply(2).log();  // 10
```

因为每个方法都返回 `this`，所以可以继续调用下一个方法。

## jQuery 的链式调用

在 jQuery 中，大多数方法都返回 `this`：

```javascript
jQuery.fn = jQuery.prototype = {
  // ...
  
  css: function(prop, value) {
    // 如果是 getter（只读取），返回值
    if (value === undefined && typeof prop === 'string') {
      return this[0] ? getComputedStyle(this[0])[prop] : undefined;
    }
    // 如果是 setter（设置），返回 this
    this.each(function() {
      if (typeof prop === 'object') {
        for (const key in prop) {
          this.style[key] = prop[key];
        }
      } else {
        this.style[prop] = value;
      }
    });
    return this;  // 关键：返回 this
  },
  
  addClass: function(className) {
    this.each(function() {
      this.classList.add(className);
    });
    return this;  // 返回 this
  },
  
  removeClass: function(className) {
    this.each(function() {
      this.classList.remove(className);
    });
    return this;  // 返回 this
  }
};
```

## Getter vs Setter

jQuery 的很多方法既是 getter 又是 setter，行为取决于参数：

```javascript
// Getter：返回值
$('#box').css('color');  // "rgb(0, 0, 0)"

// Setter：返回 this，支持链式调用
$('#box').css('color', 'red').css('fontSize', '14px');
```

实现这种模式的关键：

```javascript
css: function(prop, value) {
  // 判断是 getter 还是 setter
  if (value === undefined && typeof prop === 'string') {
    // Getter：返回值，链式调用到此结束
    return this[0] ? getComputedStyle(this[0])[prop] : undefined;
  }
  
  // Setter：执行操作后返回 this
  // ...
  return this;
}
```

**注意**：Getter 返回值，链式调用到此结束。之后不能再调用其他方法。

```javascript
$('#box')
  .css('color')      // 返回 "rgb(0, 0, 0)"
  .addClass('foo');  // TypeError: Cannot read property 'addClass' of undefined
```

## 特殊的链式调用：pushStack

普通的链式调用返回同一个 jQuery 对象。但有些方法需要返回**新的 jQuery 对象**：

```javascript
$('ul')           // 所有 ul
  .find('li')     // 所有 li（新对象）
  .filter('.active')  // 只有 .active 的 li（新对象）
  .css('color', 'red');
```

`find` 和 `filter` 不能返回原来的 jQuery 对象，因为包含的元素变了。

jQuery 使用 `pushStack` 来处理这种情况：

```javascript
jQuery.fn = jQuery.prototype = {
  // ...
  
  // 创建新的 jQuery 对象，并记录"上一个"对象
  pushStack: function(elements) {
    // 创建新的 jQuery 对象
    const ret = jQuery(elements);
    // 保存对前一个对象的引用
    ret.prevObject = this;
    return ret;
  },
  
  // 回到上一个对象
  end: function() {
    return this.prevObject || jQuery();
  }
};
```

### 实现 find

```javascript
find: function(selector) {
  const result = [];
  this.each(function() {
    const found = this.querySelectorAll(selector);
    result.push(...found);
  });
  // 用 pushStack 创建新对象
  return this.pushStack(result);
}
```

### 实现 filter

```javascript
filter: function(selector) {
  const result = [];
  this.each(function() {
    if (this.matches(selector)) {
      result.push(this);
    }
  });
  return this.pushStack(result);
}
```

### 使用 end() 回退

```javascript
$('ul')
  .css('border', '1px solid black')
  .find('li')
  .css('color', 'red')
  .end()  // 回到 ul
  .css('padding', '10px');
```

`end()` 返回 `prevObject`，实现链式调用的"回退"。

## 完整实现

让我们把目前的代码整理成完整版本：

```javascript
// src/core/init.js

function jQuery(selector) {
  return new jQuery.fn.init(selector);
}

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
    
    // 数组或类数组
    if (selector.length !== undefined) {
      this._setElements(selector);
    }
    
    return this;
  },
  
  _setElements: function(elements) {
    // 去重
    const unique = [...new Set(elements)];
    this.length = unique.length;
    for (let i = 0; i < unique.length; i++) {
      this[i] = unique[i];
    }
  },
  
  _parseHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return [...template.content.childNodes];
  },
  
  // 创建新的 jQuery 对象并保持链式调用链
  pushStack: function(elements) {
    const ret = jQuery(elements);
    ret.prevObject = this;
    return ret;
  },
  
  // 回退到上一个对象
  end: function() {
    return this.prevObject || jQuery();
  },
  
  // 转换为数组
  toArray: function() {
    return Array.from(this);
  },
  
  // 获取原生元素
  get: function(index) {
    if (index === undefined) return this.toArray();
    if (index < 0) index = this.length + index;
    return this[index];
  },
  
  // 获取指定索引的 jQuery 对象
  eq: function(index) {
    if (index < 0) index = this.length + index;
    return this.pushStack(this[index] ? [this[index]] : []);
  },
  
  // 第一个元素
  first: function() {
    return this.eq(0);
  },
  
  // 最后一个元素
  last: function() {
    return this.eq(-1);
  },
  
  // 遍历
  each: function(callback) {
    for (let i = 0; i < this.length; i++) {
      if (callback.call(this[i], i, this[i]) === false) break;
    }
    return this;
  },
  
  // 映射
  map: function(callback) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      const value = callback.call(this[i], i, this[i]);
      if (value != null) {
        result.push(value);
      }
    }
    return this.pushStack(result);
  },
  
  // 过滤
  filter: function(selector) {
    const result = [];
    if (typeof selector === 'function') {
      this.each(function(i, el) {
        if (selector.call(el, i, el)) {
          result.push(el);
        }
      });
    } else {
      this.each(function() {
        if (this.matches(selector)) {
          result.push(this);
        }
      });
    }
    return this.pushStack(result);
  },
  
  // 查找
  find: function(selector) {
    const result = [];
    this.each(function() {
      const found = this.querySelectorAll(selector);
      result.push(...found);
    });
    return this.pushStack(result);
  },
  
  // CSS
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
  },
  
  // 添加类
  addClass: function(className) {
    return this.each(function() {
      this.classList.add(...className.split(/\s+/));
    });
  },
  
  // 移除类
  removeClass: function(className) {
    if (!className) {
      return this.each(function() {
        this.className = '';
      });
    }
    return this.each(function() {
      this.classList.remove(...className.split(/\s+/));
    });
  },
  
  // 切换类
  toggleClass: function(className) {
    return this.each(function() {
      className.split(/\s+/).forEach(cls => {
        this.classList.toggle(cls);
      });
    });
  },
  
  // 检测类
  hasClass: function(className) {
    return this[0] ? this[0].classList.contains(className) : false;
  }
};

jQuery.fn.init.prototype = jQuery.fn;

// 静态方法
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

jQuery.isArray = Array.isArray;
jQuery.isFunction = (fn) => typeof fn === 'function';
jQuery.isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';

window.$ = window.jQuery = jQuery;

export default jQuery;
```

## 测试链式调用

```html
<script type="module">
  import $ from './src/index.js';
  
  // 基础链式调用
  $('.item')
    .css('color', 'blue')
    .addClass('highlighted')
    .css('padding', '10px');
  
  // pushStack 链式调用
  const $found = $('ul')
    .css('border', '1px solid #ccc')
    .find('li')
    .css('color', 'green');
  
  console.log('find 后的长度:', $found.length);
  
  // end() 回退
  $('ul')
    .find('li')
    .css('color', 'red')
    .end()  // 回到 ul
    .css('backgroundColor', '#f5f5f5');
  
  // filter
  $('.item')
    .filter(':first-child')
    .css('fontWeight', 'bold');
  
  // eq, first, last
  $('.item').eq(1).css('textDecoration', 'underline');
  $('.item').first().css('borderTop', '2px solid blue');
  $('.item').last().css('borderBottom', '2px solid blue');
  
  // map
  const texts = $('.item').map(function(i, el) {
    return el.textContent;
  });
  console.log('map 结果:', texts.toArray());
</script>
```

## 链式调用的中断

有两种情况会中断链式调用：

### 1. Getter 方法

```javascript
const color = $('#box').css('color');  // 返回颜色值
color.addClass('foo');  // Error! color 是字符串，不是 jQuery 对象
```

### 2. 返回 undefined 或 null

如果方法返回 undefined，链式调用会出错：

```javascript
$.fn.broken = function() {
  console.log('I forgot to return this');
  // 没有 return this
};

$('#box').broken().css('color', 'red');  // TypeError
```

**教训**：写 jQuery 插件时，一定要 `return this`（除非是 getter）。

## 本章小结

链式调用的核心：

1. **Setter 方法返回 `this`**：允许继续调用其他方法
2. **Getter 方法返回值**：链式调用到此结束
3. **`pushStack` 创建新对象**：保持链式调用，同时改变作用元素
4. **`end()` 回退**：返回上一个对象

这种设计让代码既简洁又富有表达力。

下一章，我们实现 `extend` 方法，它是 jQuery 扩展机制的基础。

---

**思考题**：如果我们想让 getter 也支持链式调用，比如 `$('#box').css('color').addClass('foo')`，应该怎么设计？（提示：可以考虑返回一个特殊对象）
