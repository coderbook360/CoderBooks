# 从一个函数开始：实现 $ 入口

jQuery 最神奇的地方在于那个 `$` 符号。

```javascript
$('#box').addClass('active').fadeIn();
```

一个简单的美元符号，却能做这么多事。它是怎么做到的？

这一章，我们来实现 `$` 函数的核心逻辑。

## 从最简单的开始

上一章我们写了一个占位函数：

```javascript
function jQuery(selector) {
  console.log('jQuery called with:', selector);
}
```

现在让它真正工作起来。第一步：**选择 DOM 元素**。

```javascript
// src/core/init.js

function jQuery(selector) {
  // 使用原生 API 获取元素
  const elements = document.querySelectorAll(selector);
  return elements;
}
```

测试一下：

```javascript
const items = $('.item');
console.log(items);  // NodeList(3) [div.item, div.item, div.item]
```

能工作！但这不是我们要的。返回的是原生 `NodeList`，没有 jQuery 的方法。

## 包装成 jQuery 对象

我们需要返回一个"jQuery 对象"，而不是原生 `NodeList`。

什么是 jQuery 对象？本质上，它是一个**包含 DOM 元素的容器**，同时还挂载了各种操作方法。

```javascript
// src/core/init.js

function jQuery(selector) {
  // 获取元素
  const elements = document.querySelectorAll(selector);
  
  // 创建 jQuery 对象
  const jQueryObject = {
    length: elements.length,
    // 把元素存进去
    // ...
  };
  
  // 把元素逐个存入
  for (let i = 0; i < elements.length; i++) {
    jQueryObject[i] = elements[i];
  }
  
  return jQueryObject;
}
```

测试：

```javascript
const $items = $('.item');
console.log($items.length);  // 3
console.log($items[0]);      // <div class="item">Item 1</div>
console.log($items[1]);      // <div class="item">Item 2</div>
```

现在我们有了一个类数组对象。但每次调用 `$()` 都会创建一个新对象，这些对象互相独立，没有共享任何方法。

## 添加方法

让我们给 jQuery 对象添加一个方法：

```javascript
function jQuery(selector) {
  const elements = document.querySelectorAll(selector);
  
  const jQueryObject = {
    length: elements.length,
    
    // 添加一个方法
    each(callback) {
      for (let i = 0; i < this.length; i++) {
        callback.call(this[i], i, this[i]);
      }
      return this;
    },
    
    // 再加一个
    css(prop, value) {
      for (let i = 0; i < this.length; i++) {
        this[i].style[prop] = value;
      }
      return this;
    }
  };
  
  for (let i = 0; i < elements.length; i++) {
    jQueryObject[i] = elements[i];
  }
  
  return jQueryObject;
}
```

测试链式调用：

```javascript
$('.item')
  .css('color', 'red')
  .css('backgroundColor', '#f0f0f0');
```

有效！所有 `.item` 元素都变成了红色文字和灰色背景。

## 发现问题

但这个实现有一个严重问题：**每次调用 `$()` 都会创建一个新对象，包含所有方法的副本**。

```javascript
const $a = $('.item');
const $b = $('#box');

console.log($a.css === $b.css);  // false！
```

两个 jQuery 对象的 `css` 方法是不同的函数！这意味着：

1. **内存浪费**：创建 1000 个 jQuery 对象，就有 1000 份 `css` 函数
2. **无法扩展**：后续添加新方法时，已创建的对象不会获得新方法

这就是我们下一章要解决的问题——用原型链实现方法共享。

## 完整代码

目前的实现：

```javascript
// src/core/init.js

function jQuery(selector) {
  // 获取元素
  const elements = document.querySelectorAll(selector);
  
  // 创建 jQuery 对象
  const jQueryObject = {
    length: elements.length,
    
    each(callback) {
      for (let i = 0; i < this.length; i++) {
        callback.call(this[i], i, this[i]);
      }
      return this;
    },
    
    css(prop, value) {
      for (let i = 0; i < this.length; i++) {
        this[i].style[prop] = value;
      }
      return this;
    }
  };
  
  // 存入元素
  for (let i = 0; i < elements.length; i++) {
    jQueryObject[i] = elements[i];
  }
  
  return jQueryObject;
}

// 挂载到全局
window.$ = window.jQuery = jQuery;

export default jQuery;
```

更新 `src/index.js`：

```javascript
// src/index.js
export { default } from './core/init.js';
```

## 测试页面

更新 `index.html` 的测试代码：

```html
<script type="module">
  import $ from './src/index.js';
  
  // 测试选择器
  const $items = $('.item');
  console.log('选中元素数量:', $items.length);
  
  // 测试 each
  $items.each(function(index, element) {
    console.log(`第 ${index} 个:`, element.textContent);
  });
  
  // 测试链式调用
  $items
    .css('color', 'blue')
    .css('padding', '15px');
  
  // 测试 ID 选择器
  $('#box1').css('border', '2px solid red');
</script>
```

## 处理更多输入类型

目前我们只处理了字符串选择器。但 jQuery 的 `$()` 可以接受多种输入：

```javascript
$('#box')           // 字符串选择器
$(document.body)    // DOM 元素
$($('.item'))       // 另一个 jQuery 对象
$('<div>hello</div>')  // HTML 字符串
$(function() {})    // DOM ready 回调
```

让我们扩展一下：

```javascript
function jQuery(selector) {
  // 空值处理
  if (!selector) {
    return createjQueryObject([]);
  }
  
  // 如果是字符串
  if (typeof selector === 'string') {
    // 如果是 HTML 字符串（以 < 开头）
    if (selector[0] === '<') {
      const elements = parseHTML(selector);
      return createjQueryObject(elements);
    }
    // 否则当作选择器
    const elements = document.querySelectorAll(selector);
    return createjQueryObject(elements);
  }
  
  // 如果是 DOM 元素
  if (selector.nodeType) {
    return createjQueryObject([selector]);
  }
  
  // 如果是函数（DOM ready）
  if (typeof selector === 'function') {
    document.addEventListener('DOMContentLoaded', selector);
    return createjQueryObject([]);
  }
  
  // 如果是类数组（NodeList、jQuery 对象等）
  if (selector.length !== undefined) {
    return createjQueryObject([...selector]);
  }
  
  return createjQueryObject([]);
}

// 辅助函数：创建 jQuery 对象
function createjQueryObject(elements) {
  const obj = {
    length: elements.length,
    each(callback) {
      for (let i = 0; i < this.length; i++) {
        callback.call(this[i], i, this[i]);
      }
      return this;
    },
    css(prop, value) {
      for (let i = 0; i < this.length; i++) {
        this[i].style[prop] = value;
      }
      return this;
    }
  };
  
  for (let i = 0; i < elements.length; i++) {
    obj[i] = elements[i];
  }
  
  return obj;
}

// 辅助函数：解析 HTML 字符串
function parseHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return [...template.content.childNodes];
}
```

现在我们可以这样用：

```javascript
// 选择器
$('.item').css('color', 'red');

// DOM 元素
$(document.body).css('margin', '0');

// HTML 字符串
const $div = $('<div class="new">New Element</div>');
document.body.appendChild($div[0]);

// DOM ready
$(function() {
  console.log('DOM 加载完成！');
});
```

## 本章小结

我们实现了 `$` 函数的基础版本：

1. **接受选择器**：使用 `querySelectorAll` 获取元素
2. **返回 jQuery 对象**：类数组结构，包含选中的元素
3. **链式调用**：每个方法返回 `this`
4. **多种输入类型**：字符串、DOM 元素、HTML 字符串、函数

但还有一个问题没解决：**方法没有共享，每个 jQuery 对象都有自己的方法副本**。

下一章，我们用原型链解决这个问题。

---

**思考题**：如果让你实现方法共享，你会怎么做？（提示：JavaScript 的原型链）
