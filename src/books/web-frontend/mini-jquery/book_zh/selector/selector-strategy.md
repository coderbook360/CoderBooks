# 选择器策略：从简单到复杂

jQuery 最核心的功能就是选择器。`$('.item')` 能选中页面上所有 class 为 `item` 的元素，这看起来很简单，但背后有很多值得思考的设计决策。

## 现代浏览器的选择器 API

在开始实现之前，先了解一下现代浏览器提供的原生选择器 API：

### document.querySelector

返回匹配选择器的**第一个**元素：

```javascript
const box = document.querySelector('#box');
const firstItem = document.querySelector('.item');
const firstDiv = document.querySelector('div');
```

### document.querySelectorAll

返回匹配选择器的**所有**元素（NodeList）：

```javascript
const items = document.querySelectorAll('.item');
const divs = document.querySelectorAll('div');
const complex = document.querySelectorAll('.container > .item:first-child');
```

### 其他选择器方法

```javascript
document.getElementById('box');           // 单个元素
document.getElementsByClassName('item');  // HTMLCollection
document.getElementsByTagName('div');     // HTMLCollection
```

## 选择策略分析

我们有多种选择器 API 可以使用，应该如何选择？

### 策略一：全部使用 querySelectorAll

最简单的方案是统一使用 `querySelectorAll`：

```javascript
function $(selector) {
  return document.querySelectorAll(selector);
}
```

**优点**：
- 实现简单
- 支持所有 CSS 选择器

**缺点**：
- 对于简单选择器（如 ID），效率可能不是最优

### 策略二：针对性优化

对常见选择器做专门优化：

```javascript
function $(selector) {
  // ID 选择器：#id
  if (selector[0] === '#' && !selector.includes(' ')) {
    return document.getElementById(selector.slice(1));
  }
  
  // 类选择器：.class
  if (selector[0] === '.' && !selector.includes(' ')) {
    return document.getElementsByClassName(selector.slice(1));
  }
  
  // 标签选择器：div
  if (/^[a-z]+$/i.test(selector)) {
    return document.getElementsByTagName(selector);
  }
  
  // 其他：使用 querySelectorAll
  return document.querySelectorAll(selector);
}
```

这种策略对简单选择器有微小的性能提升，但代码复杂度增加了。

### 我们的选择

在现代 Chrome 浏览器中，`querySelectorAll` 已经高度优化，性能差异微乎其微。

我们选择**策略一**，理由是：

1. **代码简洁**：一行代码搞定
2. **功能完整**：支持所有 CSS 选择器
3. **性能足够**：现代浏览器优化得很好
4. **可维护性**：简单的代码更容易维护

## jQuery 选择器的输入类型

jQuery 的 `$()` 函数可以接受多种输入：

```javascript
// 1. CSS 选择器字符串
$('#box')
$('.item')
$('div > p')

// 2. HTML 字符串
$('<div class="new">Hello</div>')

// 3. DOM 元素
$(document.body)
$(event.target)

// 4. jQuery 对象
$($('.item'))

// 5. 函数（DOM ready）
$(function() {
  console.log('DOM ready');
})

// 6. 空值
$()
$(null)
$(undefined)
```

我们需要在 `init` 函数中处理所有这些情况。

## 输入类型判断

如何区分这些输入类型？

### 字符串：选择器 vs HTML

两者都是字符串，如何区分？

```javascript
'#box'                    // 选择器
'<div>Hello</div>'        // HTML
'.item > span'            // 选择器
'<span class="highlight">'  // HTML
```

简单的判断方法：**HTML 以 `<` 开头**。

```javascript
if (typeof selector === 'string') {
  if (selector[0] === '<') {
    // HTML 字符串
  } else {
    // CSS 选择器
  }
}
```

jQuery 实际上使用更复杂的正则表达式：

```javascript
// jQuery 源码中的快速匹配
const quickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
```

但对于我们的 Mini-jQuery，简单判断就够了。

### DOM 元素

检测是否是 DOM 元素：

```javascript
if (selector.nodeType) {
  // 是 DOM 元素
}
```

所有 DOM 节点都有 `nodeType` 属性：

- `1`：元素节点（Element）
- `3`：文本节点（Text）
- `9`：文档节点（Document）

### jQuery 对象

jQuery 对象有一个特殊标记：

```javascript
if (selector.jquery) {
  // 是 jQuery 对象
}
```

或者检查是否是类数组且有 jQuery 方法：

```javascript
if (selector instanceof jQuery.fn.init) {
  // 是 jQuery 对象
}
```

### 函数

```javascript
if (typeof selector === 'function') {
  // DOM ready 回调
}
```

## 完整的选择器处理流程

```javascript
init: function(selector) {
  // 1. 空值处理
  if (!selector) {
    return this;
  }
  
  // 2. 字符串处理
  if (typeof selector === 'string') {
    selector = selector.trim();
    
    // HTML 字符串
    if (selector[0] === '<') {
      return this._handleHTML(selector);
    }
    
    // CSS 选择器
    return this._handleSelector(selector);
  }
  
  // 3. DOM 元素
  if (selector.nodeType) {
    this[0] = selector;
    this.length = 1;
    return this;
  }
  
  // 4. 函数（DOM ready）
  if (typeof selector === 'function') {
    return this._handleReady(selector);
  }
  
  // 5. 类数组（包括 jQuery 对象、NodeList 等）
  if (selector.length !== undefined) {
    return this._handleArrayLike(selector);
  }
  
  // 6. Window 对象
  if (selector === window) {
    this[0] = selector;
    this.length = 1;
    return this;
  }
  
  return this;
}
```

## 处理函数实现

### 处理 CSS 选择器

```javascript
_handleSelector: function(selector) {
  try {
    const elements = document.querySelectorAll(selector);
    this._setElements(elements);
  } catch (e) {
    // 无效的选择器
    console.warn('Invalid selector:', selector);
    this.length = 0;
  }
  return this;
}
```

### 处理 HTML 字符串

```javascript
_handleHTML: function(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const elements = [...template.content.childNodes].filter(
    node => node.nodeType === 1  // 只保留元素节点
  );
  this._setElements(elements);
  return this;
}
```

### 处理 DOM ready

```javascript
_handleReady: function(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM 已经加载完成，直接执行
    callback();
  }
  return this;
}
```

### 处理类数组

```javascript
_handleArrayLike: function(arrayLike) {
  // 如果是 jQuery 对象，直接使用它的元素
  if (arrayLike.jquery) {
    this._setElements(arrayLike.toArray());
  } else {
    // NodeList、HTMLCollection 或普通数组
    this._setElements(arrayLike);
  }
  return this;
}
```

## 更新 init.js

将选择器逻辑整理到 `init.js` 中：

```javascript
// src/core/init.js

function jQuery(selector, context) {
  return new jQuery.fn.init(selector, context);
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
  
  init: function(selector, context) {
    // 空值处理
    if (!selector) {
      return this;
    }
    
    // 字符串处理
    if (typeof selector === 'string') {
      selector = selector.trim();
      
      if (selector[0] === '<') {
        return this._handleHTML(selector);
      }
      
      return this._handleSelector(selector, context);
    }
    
    // DOM 元素
    if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    // Window 对象
    if (selector === window) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    // 函数（DOM ready）
    if (typeof selector === 'function') {
      return this._handleReady(selector);
    }
    
    // 类数组
    if (selector.length !== undefined) {
      return this._handleArrayLike(selector);
    }
    
    return this;
  },
  
  _handleSelector: function(selector, context) {
    const root = context ? jQuery(context)[0] : document;
    if (!root) {
      this.length = 0;
      return this;
    }
    
    try {
      const elements = root.querySelectorAll(selector);
      this._setElements(elements);
    } catch (e) {
      console.warn('Invalid selector:', selector);
      this.length = 0;
    }
    return this;
  },
  
  _handleHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const elements = [...template.content.childNodes].filter(
      node => node.nodeType === 1
    );
    this._setElements(elements);
    return this;
  },
  
  _handleReady: function(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
    return this;
  },
  
  _handleArrayLike: function(arrayLike) {
    if (arrayLike.jquery) {
      this._setElements(arrayLike.toArray());
    } else {
      this._setElements(arrayLike);
    }
    return this;
  },
  
  _setElements: function(elements) {
    const arr = Array.from(elements);
    // 去重
    const unique = [...new Set(arr)];
    this.length = unique.length;
    for (let i = 0; i < unique.length; i++) {
      this[i] = unique[i];
    }
  },
  
  // ... 其他方法保持不变
};

jQuery.fn.init.prototype = jQuery.fn;
```

## 本章小结

选择器策略的核心决策：

1. **统一使用 querySelectorAll**：简单高效，支持所有 CSS 选择器
2. **多种输入类型**：字符串、DOM 元素、函数、类数组
3. **输入类型判断**：通过特征区分不同输入
4. **上下文支持**：可以在指定范围内查找

下一章，我们详细实现基础选择器，并添加一些便捷方法。

---

**思考题**：`$('<div><span>Hello</span></div>')` 会创建几个元素？`.length` 是多少？
