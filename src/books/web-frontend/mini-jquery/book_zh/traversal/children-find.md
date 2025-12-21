# 后代遍历：children/find

向下遍历用于获取元素的后代。这一章，我们实现 `children()` 和 `find()` 方法。

## children()：直接子元素

`children()` 只获取直接子元素，不包括更深层的后代：

```javascript
$('.list').children()        // 所有直接子元素
$('.list').children('.item') // 匹配 .item 的直接子元素
```

### 实现

```javascript
jQuery.fn.children = function(selector) {
  const result = [];
  
  this.each(function() {
    // this.children 是 HTMLCollection，只包含元素节点
    result.push(...this.children);
  });
  
  return this.pushStack(winnow(result, selector));
};
```

### children vs find

```javascript
// HTML:
// <ul class="list">
//   <li>
//     <span class="item">A</span>
//   </li>
//   <li class="item">B</li>
// </ul>

$('.list').children('.item');
// 返回：[li.item]
// 只匹配直接子元素

$('.list').find('.item');
// 返回：[span.item, li.item]
// 匹配所有后代
```

## find()：所有匹配的后代

`find()` 在后代中搜索匹配的元素：

```javascript
$('.container').find('.item')
// 相当于 $('.container .item')，但更明确
```

### 基础实现

```javascript
jQuery.fn.find = function(selector) {
  const result = [];
  
  this.each(function() {
    // 在每个元素内搜索
    const found = this.querySelectorAll(selector);
    result.push(...found);
  });
  
  return this.pushStack(winnow(result));
};
```

### 支持元素参数

jQuery 的 `find()` 也支持传入元素或 jQuery 对象：

```javascript
// 查找后代中是否包含某元素
const target = document.querySelector('.target');
$('.container').find(target);
```

增强实现：

```javascript
jQuery.fn.find = function(selector) {
  const result = [];
  
  // 选择器字符串
  if (typeof selector === 'string') {
    this.each(function() {
      const found = this.querySelectorAll(selector);
      result.push(...found);
    });
  }
  // DOM 元素
  else if (selector?.nodeType) {
    this.each(function() {
      if (this.contains(selector) && this !== selector) {
        result.push(selector);
      }
    });
  }
  // jQuery 对象
  else if (selector?.each) {
    const self = this;
    selector.each(function() {
      self.each(function() {
        if (this.contains(selector) && this !== selector) {
          result.push(selector);
        }
      });
    });
  }
  
  return this.pushStack(winnow(result));
};
```

## contents()：所有子节点

`contents()` 获取所有子节点，包括文本节点和注释节点：

```javascript
$('.container').contents()
// 返回所有子节点，不只是元素
```

### 实现

```javascript
jQuery.fn.contents = function() {
  const result = [];
  
  this.each(function() {
    // 特殊处理 iframe
    if (this.nodeName === 'IFRAME') {
      try {
        const doc = this.contentDocument || this.contentWindow?.document;
        if (doc) {
          result.push(doc);
        }
      } catch (e) {
        // 跨域 iframe 无法访问
      }
    } else {
      // 普通元素：获取所有子节点
      result.push(...this.childNodes);
    }
  });
  
  return this.pushStack(result);
};
```

### contents() 的用途

#### 用途 1：操作文本节点

```javascript
// HTML: <p>Hello <strong>World</strong></p>

$('p').contents().filter(function() {
  return this.nodeType === 3; // 文本节点
}).wrap('<span class="text">');

// 结果: <p><span class="text">Hello </span><strong>World</strong></p>
```

#### 用途 2：访问 iframe 内容

```javascript
// 获取同域 iframe 的文档
$('iframe').contents().find('body').css('background', 'red');
```

## 完整的后代遍历模块

```javascript
// src/traversing/children.js

import { winnow } from './helpers.js';

export function installChildMethods(jQuery) {
  
  jQuery.fn.children = function(selector) {
    const result = [];
    
    this.each(function() {
      result.push(...this.children);
    });
    
    return this.pushStack(winnow(result, selector));
  };
  
  jQuery.fn.find = function(selector) {
    const result = [];
    
    if (typeof selector === 'string') {
      this.each(function() {
        const found = this.querySelectorAll(selector);
        result.push(...found);
      });
    } else if (selector?.nodeType) {
      this.each(function() {
        if (this !== selector && this.contains(selector)) {
          result.push(selector);
        }
      });
    } else if (selector?.jquery) {
      const targets = selector.get();
      this.each(function() {
        const container = this;
        targets.forEach(target => {
          if (container !== target && container.contains(target)) {
            result.push(target);
          }
        });
      });
    }
    
    return this.pushStack(winnow(result));
  };
  
  jQuery.fn.contents = function() {
    const result = [];
    
    this.each(function() {
      if (this.nodeName === 'IFRAME') {
        try {
          const doc = this.contentDocument || this.contentWindow?.document;
          if (doc) result.push(doc);
        } catch (e) {
          // 跨域无法访问
        }
      } else {
        result.push(...this.childNodes);
      }
    });
    
    return this.pushStack(result);
  };
}
```

## 性能考量

### find() vs 上下文选择器

两种写法结果相同，但有细微差别：

```javascript
// 方式 1：find()
$('.container').find('.item');

// 方式 2：上下文选择器
$('.item', '.container');

// 方式 3：后代选择器
$('.container .item');
```

性能比较：

- **find()**：先选择容器，再在每个容器内搜索
- **上下文选择器**：同 find()
- **后代选择器**：浏览器一次解析，通常最快

推荐：

```javascript
// 已有 jQuery 对象时用 find()
const $container = $('.container');
$container.find('.item');

// 直接查询时用后代选择器
$('.container .item');
```

### children() vs find()

`children()` 只遍历一层，比 `find()` 快：

```javascript
// 确定是直接子元素时用 children()
$('.list').children('li');

// 不确定层级时用 find()
$('.container').find('.item');
```

## 实际应用场景

### 场景 1：遍历直接子菜单

```javascript
$('.nav').children('li').each(function() {
  const $subMenu = $(this).children('ul');
  if ($subMenu.length) {
    $(this).addClass('has-submenu');
  }
});
```

### 场景 2：搜索特定后代

```javascript
// 在表单中找到所有输入框
const $inputs = $('form').find('input, select, textarea');
```

### 场景 3：处理富文本

```javascript
// 替换文本内容中的关键词
$('.content').contents().filter(function() {
  return this.nodeType === 3 && this.textContent.includes('关键词');
}).each(function() {
  const $span = $('<span class="highlight">').text(this.textContent);
  $(this).replaceWith($span);
});
```

### 场景 4：表格操作

```javascript
// 获取表格的直接行（排除嵌套表格的行）
$('table').children('tbody').children('tr');
```

## 与过滤方法的配合

后代遍历经常和过滤方法配合使用：

```javascript
// 获取第一个子元素
$('.list').children().first();

// 获取奇数位置的子元素
$('.list').children().filter(':nth-child(odd)');

// 获取不含特定类的后代
$('.container').find('div').not('.excluded');
```

## 本章小结

后代遍历方法对比：

| 方法 | 范围 | 返回内容 |
|------|------|----------|
| `children()` | 直接子元素 | 只包含元素 |
| `find()` | 所有后代 | 只包含元素 |
| `contents()` | 直接子节点 | 包含文本节点 |

关键实现点：

- **children()**：使用 `this.children` 获取直接子元素
- **find()**：使用 `querySelectorAll()` 搜索后代
- **contents()**：使用 `this.childNodes` 获取所有节点

下一章，我们实现兄弟遍历方法：`siblings()`、`next()`、`prev()` 及其变体。

---

**思考题**：如何实现一个 `findParent()` 方法，在祖先中搜索匹配的元素？它和 `closest()` 有什么区别？
