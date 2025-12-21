# querySelectorAll 的优雅封装

`querySelectorAll` 是现代浏览器提供的强大选择器 API，但直接使用它有一些不便之处。这一章，我们来看看如何优雅地封装它。

## querySelectorAll 的特点

### 返回 NodeList

```javascript
const items = document.querySelectorAll('.item');
console.log(items instanceof NodeList);  // true
console.log(Array.isArray(items));       // false
```

`NodeList` 是类数组，有 `length` 和索引访问，但没有大多数数组方法。

### 静态集合

`querySelectorAll` 返回的是**静态 NodeList**，不会随 DOM 变化而更新：

```javascript
const items = document.querySelectorAll('.item');
console.log(items.length);  // 3

// 添加新元素
document.body.appendChild(document.createElement('div'));
document.body.lastChild.className = 'item';

console.log(items.length);  // 仍然是 3！
```

而 `getElementsByClassName` 返回的是**动态 HTMLCollection**：

```javascript
const items = document.getElementsByClassName('item');
console.log(items.length);  // 3

document.body.appendChild(document.createElement('div'));
document.body.lastChild.className = 'item';

console.log(items.length);  // 变成 4
```

静态集合的好处是**可预测**，在遍历时不会因为 DOM 变化而出问题。

### 支持复杂选择器

```javascript
// 支持所有 CSS 选择器
document.querySelectorAll('.container > .item:first-child');
document.querySelectorAll('input[type="text"]');
document.querySelectorAll('.box:not(.disabled)');
document.querySelectorAll('div, span, p');  // 多选择器
```

## 封装的目标

我们的封装要实现：

1. **统一返回 jQuery 对象**：有丰富的链式方法
2. **错误处理**：无效选择器不应该抛出异常
3. **上下文支持**：可以在指定元素内查找
4. **结果去重**：多选择器可能匹配重复元素

## 选择器处理函数

更新 `_handleSelector` 方法：

```javascript
_handleSelector: function(selector, context) {
  // 确定查找的根元素
  let root;
  
  if (context) {
    // context 可以是选择器、DOM 元素或 jQuery 对象
    if (typeof context === 'string') {
      root = document.querySelector(context);
    } else if (context.nodeType) {
      root = context;
    } else if (context.jquery) {
      root = context[0];
    } else {
      root = document;
    }
  } else {
    root = document;
  }
  
  // 如果找不到根元素，返回空集合
  if (!root) {
    this.length = 0;
    return this;
  }
  
  // 尝试查询
  try {
    const elements = root.querySelectorAll(selector);
    this._setElements(elements);
  } catch (e) {
    // 无效选择器，返回空集合
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Invalid selector: "${selector}"`, e.message);
    }
    this.length = 0;
  }
  
  return this;
}
```

## 处理特殊情况

### 空选择器

```javascript
$('');  // 应该返回空集合
```

```javascript
if (!selector || typeof selector !== 'string' || !selector.trim()) {
  this.length = 0;
  return this;
}
```

### 只有空白的选择器

```javascript
$('   ');  // 应该返回空集合
```

我们在开头 `trim()` 处理：

```javascript
selector = selector.trim();
if (!selector) {
  this.length = 0;
  return this;
}
```

### 无效选择器

```javascript
$('..invalid');  // 无效的 CSS 选择器
$('[[[');        // 语法错误
```

用 `try-catch` 捕获异常：

```javascript
try {
  const elements = root.querySelectorAll(selector);
  this._setElements(elements);
} catch (e) {
  this.length = 0;
}
```

## 结果去重

当使用多选择器或多次 `add()` 时，可能会有重复元素：

```javascript
$('div, #box1');  // 如果 #box1 也是 div，会重复
```

我们在 `_setElements` 中使用 `Set` 去重：

```javascript
_setElements: function(elements) {
  const arr = Array.from(elements);
  const unique = [...new Set(arr)];
  
  this.length = unique.length;
  for (let i = 0; i < unique.length; i++) {
    this[i] = unique[i];
  }
}
```

## 保持文档顺序

去重后还需要保持元素在文档中的顺序：

```javascript
_setElements: function(elements) {
  const arr = Array.from(elements);
  const unique = [...new Set(arr)];
  
  // 按文档顺序排序
  unique.sort((a, b) => {
    // Node.DOCUMENT_POSITION_FOLLOWING = 4
    // 如果 a 在 b 前面，返回 -1
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    return position & 4 ? -1 : 1;
  });
  
  this.length = unique.length;
  for (let i = 0; i < unique.length; i++) {
    this[i] = unique[i];
  }
}
```

`compareDocumentPosition` 返回一个位掩码，表示两个节点的相对位置：

- `4`（DOCUMENT_POSITION_FOLLOWING）：a 在 b 前面
- `2`（DOCUMENT_POSITION_PRECEDING）：a 在 b 后面

## 完整的选择器封装

更新 `src/core/init.js` 中的相关方法：

```javascript
jQuery.fn = jQuery.prototype = {
  // ... 其他代码
  
  init: function(selector, context) {
    // 空值
    if (!selector) {
      return this;
    }
    
    // 字符串
    if (typeof selector === 'string') {
      selector = selector.trim();
      
      if (!selector) {
        return this;
      }
      
      // HTML
      if (selector[0] === '<' && selector[selector.length - 1] === '>') {
        return this._handleHTML(selector);
      }
      
      // 选择器
      return this._handleSelector(selector, context);
    }
    
    // DOM 元素
    if (selector.nodeType) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    // Window
    if (selector === window) {
      this[0] = selector;
      this.length = 1;
      return this;
    }
    
    // 函数
    if (typeof selector === 'function') {
      return this._handleReady(selector);
    }
    
    // 类数组
    if (typeof selector.length === 'number') {
      return this._handleArrayLike(selector);
    }
    
    return this;
  },
  
  _handleSelector: function(selector, context) {
    // 确定根元素
    let root = document;
    
    if (context) {
      if (typeof context === 'string') {
        root = document.querySelector(context);
      } else if (context.nodeType) {
        root = context;
      } else if (context.jquery) {
        root = context[0];
      }
    }
    
    if (!root) {
      this.length = 0;
      return this;
    }
    
    try {
      const elements = root.querySelectorAll(selector);
      this._setElements(elements);
    } catch (e) {
      // 无效选择器
      this.length = 0;
    }
    
    return this;
  },
  
  _handleHTML: function(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    
    // 只保留元素节点
    const elements = Array.from(template.content.childNodes).filter(
      node => node.nodeType === 1
    );
    
    this._setElements(elements);
    return this;
  },
  
  _handleReady: function(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      // 使用 setTimeout 保证异步执行
      setTimeout(callback, 0);
    }
    return this;
  },
  
  _handleArrayLike: function(arrayLike) {
    const elements = arrayLike.jquery 
      ? arrayLike.toArray() 
      : Array.from(arrayLike);
    
    // 过滤非元素
    const filtered = elements.filter(el => el && el.nodeType === 1);
    this._setElements(filtered);
    return this;
  },
  
  _setElements: function(elements) {
    const arr = Array.from(elements);
    
    // 去重
    const unique = [...new Set(arr)];
    
    // 按文档顺序排序（如果都是 DOM 元素）
    if (unique.length > 1 && unique[0].compareDocumentPosition) {
      unique.sort((a, b) => {
        if (a === b) return 0;
        const pos = a.compareDocumentPosition(b);
        return pos & 4 ? -1 : 1;
      });
    }
    
    this.length = unique.length;
    for (let i = 0; i < unique.length; i++) {
      this[i] = unique[i];
    }
  }
  
  // ... 其他方法
};
```

## 测试封装效果

```html
<script type="module">
  import $ from './src/index.js';
  
  // 基础选择
  console.log('基础选择:');
  console.log('ID:', $('#box1').length);
  console.log('类:', $('.item').length);
  console.log('标签:', $('div').length);
  
  // 复杂选择器
  console.log('\n复杂选择器:');
  console.log('子代选择器:', $('.box > p').length);
  console.log('属性选择器:', $('input[type="text"]').length);
  console.log('伪类选择器:', $('.item:first-child').length);
  
  // 多选择器（测试去重）
  console.log('\n多选择器:');
  const $multi = $('div, .box, #box1');
  console.log('div, .box, #box1:', $multi.length);
  
  // 无效选择器（不应该报错）
  console.log('\n无效选择器:');
  const $invalid = $('..invalid');
  console.log('无效选择器长度:', $invalid.length);  // 0
  
  // 空选择器
  console.log('\n空选择器:');
  console.log('空字符串:', $('').length);
  console.log('空白字符:', $('   ').length);
  
  // 上下文选择
  console.log('\n上下文选择:');
  console.log('#box1 内的 .item:', $('.item', '#box1').length);
  console.log('#box2 内的 .item:', $('.item', '#box2').length);
</script>
```

## 性能注意事项

### 1. 避免在循环中查询

```javascript
// 差
for (let i = 0; i < 100; i++) {
  $('.item').css('color', colors[i]);  // 每次都查询 DOM
}

// 好
const $items = $('.item');
$items.each((i, el) => {
  $(el).css('color', colors[i]);
});
```

### 2. 使用更具体的选择器

```javascript
// 慢
$('div')  // 匹配页面所有 div

// 快
$('#container div')  // 限制范围
$('.specific-class')  // 更具体
```

### 3. 减少 DOM 操作

```javascript
// 差：多次 DOM 操作
const $list = $('<ul>');
for (let i = 0; i < 100; i++) {
  $list.append(`<li>Item ${i}</li>`);  // 100 次操作
}

// 好：一次性构建
let html = '<ul>';
for (let i = 0; i < 100; i++) {
  html += `<li>Item ${i}</li>`;
}
html += '</ul>';
const $list = $(html);  // 1 次操作
```

## 本章小结

`querySelectorAll` 封装的要点：

1. **错误处理**：捕获无效选择器异常
2. **结果去重**：使用 Set 去除重复元素
3. **保持顺序**：使用 `compareDocumentPosition` 排序
4. **上下文支持**：可以限制查找范围
5. **边界情况**：处理空值、空白字符串等

下一章，我们深入探讨上下文选择的实现细节。

---

**思考题**：`$('.item', '#box1')` 和 `$('#box1').find('.item')` 有什么区别？性能上哪个更好？
