# 祖先遍历：parent/parents/parentsUntil

向上遍历是最常用的遍历操作之一。这一章，我们实现三个祖先遍历方法。

## parent()：直接父元素

`parent()` 获取每个元素的直接父元素：

```javascript
$('.item').parent()        // 所有 .item 的父元素
$('.item').parent('.list') // 父元素中匹配 .list 的
```

### 实现

```javascript
jQuery.fn.parent = function(selector) {
  const result = [];
  
  this.each(function() {
    const parent = this.parentNode;
    // 确保是元素节点（排除 document）
    if (parent && parent.nodeType === 1) {
      result.push(parent);
    }
  });
  
  // 去重并过滤
  return this.pushStack(winnow(result, selector));
};
```

使用示例：

```javascript
// HTML: <ul><li class="item">A</li><li class="item">B</li></ul>

$('.item').parent();
// 返回 ul（虽然有两个 li，但父元素相同，去重后只有一个）

$('.item').parent('ul');
// 返回 ul（匹配选择器）

$('.item').parent('div');
// 返回空集合（父元素不是 div）
```

## parents()：所有祖先元素

`parents()` 获取从父元素到根元素的所有祖先：

```javascript
$('.item').parents()        // 所有祖先
$('.item').parents('.list') // 祖先中匹配 .list 的
```

### 向上遍历辅助函数

```javascript
function dir(elem, direction, until) {
  const matched = [];
  let current = elem[direction];
  
  while (current) {
    if (current.nodeType === 1) {
      // 检查终止条件
      if (until !== undefined) {
        if (typeof until === 'string') {
          if (current.matches(until)) break;
        } else if (current === until) {
          break;
        }
      }
      matched.push(current);
    }
    current = current[direction];
  }
  
  return matched;
}
```

### parents 实现

```javascript
jQuery.fn.parents = function(selector) {
  const result = [];
  
  this.each(function() {
    // 沿 parentNode 向上遍历
    const ancestors = dir(this, 'parentNode');
    result.push(...ancestors);
  });
  
  return this.pushStack(winnow(result, selector));
};
```

### 结果顺序

`parents()` 返回的顺序是从近到远：

```javascript
// HTML:
// <div class="a">
//   <div class="b">
//     <div class="c">
//       <span class="item">text</span>
//     </div>
//   </div>
// </div>

$('.item').parents();
// 顺序：[div.c, div.b, div.a, body, html]
```

如果需要反向（从远到近），可以用 `get().reverse()`：

```javascript
$('.item').parents().get().reverse();
// 顺序：[html, body, div.a, div.b, div.c]
```

## parentsUntil()：限定范围的祖先

`parentsUntil()` 获取祖先，但在遇到指定元素时停止：

```javascript
$('.item').parentsUntil('.container')
// 从父元素开始，到 .container 之前（不包括 .container）
```

### 实现

```javascript
jQuery.fn.parentsUntil = function(until, selector) {
  const result = [];
  
  this.each(function() {
    // 使用 until 作为终止条件
    const ancestors = dir(this, 'parentNode', until);
    result.push(...ancestors);
  });
  
  return this.pushStack(winnow(result, selector));
};
```

### 使用示例

```javascript
// HTML:
// <div class="container">
//   <div class="wrapper">
//     <ul class="list">
//       <li class="item">text</li>
//     </ul>
//   </div>
// </div>

$('.item').parentsUntil('.container');
// 返回：[ul.list, div.wrapper]
// 不包括 .container

$('.item').parentsUntil('.container', 'div');
// 返回：[div.wrapper]
// 只要 div 元素
```

### until 参数的多种形式

```javascript
// 选择器字符串
$('.item').parentsUntil('.container');

// DOM 元素
const container = document.querySelector('.container');
$('.item').parentsUntil(container);

// jQuery 对象
$('.item').parentsUntil($('.container'));
```

增强 `dir` 函数以支持这些形式：

```javascript
function dir(elem, direction, until) {
  const matched = [];
  let current = elem[direction];
  
  // 预处理 until
  let untilElem = null;
  let untilSelector = null;
  
  if (until) {
    if (typeof until === 'string') {
      untilSelector = until;
    } else if (until.nodeType) {
      untilElem = until;
    } else if (until[0]) {
      // jQuery 对象，取第一个元素
      untilElem = until[0];
    }
  }
  
  while (current && current.nodeType === 1) {
    // 检查终止条件
    if (untilSelector && current.matches(untilSelector)) {
      break;
    }
    if (untilElem && current === untilElem) {
      break;
    }
    
    matched.push(current);
    current = current[direction];
  }
  
  return matched;
}
```

## offsetParent()：定位父元素

一个特殊的祖先遍历方法，获取最近的定位祖先：

```javascript
jQuery.fn.offsetParent = function() {
  const result = [];
  
  this.each(function() {
    let parent = this.offsetParent;
    
    // offsetParent 可能是 null（隐藏元素）
    // 此时返回 documentElement
    if (!parent) {
      parent = document.documentElement;
    }
    
    result.push(parent);
  });
  
  return this.pushStack([...new Set(result)]);
};
```

`offsetParent` 是 CSS 定位计算的参照元素：

```javascript
// HTML:
// <div style="position: relative;">
//   <div style="position: static;">
//     <span class="item">text</span>
//   </div>
// </div>

$('.item').offsetParent();
// 返回 position: relative 的 div
// 跳过了 position: static 的 div
```

## 完整的祖先遍历模块

```javascript
// src/traversing/parents.js

import { dir, winnow } from './helpers.js';

export function installParentMethods(jQuery) {
  
  jQuery.fn.parent = function(selector) {
    const result = [];
    
    this.each(function() {
      const parent = this.parentNode;
      if (parent && parent.nodeType === 1) {
        result.push(parent);
      }
    });
    
    return this.pushStack(winnow(result, selector));
  };
  
  jQuery.fn.parents = function(selector) {
    const result = [];
    
    this.each(function() {
      result.push(...dir(this, 'parentNode'));
    });
    
    return this.pushStack(winnow(result, selector));
  };
  
  jQuery.fn.parentsUntil = function(until, selector) {
    const result = [];
    
    this.each(function() {
      result.push(...dir(this, 'parentNode', until));
    });
    
    return this.pushStack(winnow(result, selector));
  };
  
  jQuery.fn.offsetParent = function() {
    const result = [];
    
    this.each(function() {
      let parent = this.offsetParent || document.documentElement;
      result.push(parent);
    });
    
    return this.pushStack([...new Set(result)]);
  };
}
```

## 实际应用场景

### 场景 1：事件委托定位

找到触发事件的元素的容器：

```javascript
$('.list').on('click', '.item', function() {
  // 找到所属的 section
  const $section = $(this).parents('.section').first();
  $section.addClass('active');
});
```

### 场景 2：表单元素定位

找到输入框所属的表单：

```javascript
$('input').on('focus', function() {
  $(this).parents('form').addClass('focused');
});
```

### 场景 3：限定查找范围

只在特定容器内查找：

```javascript
// 在 .modal 内找祖先，不超出模态框范围
$('.item').parentsUntil('.modal').filter('.panel');
```

### 场景 4：面包屑导航

生成面包屑路径：

```javascript
const path = $('.current').parents('li')
  .map(function() {
    return $(this).find('> a').text();
  })
  .get()
  .reverse()
  .join(' > ');
```

## 性能优化

### 优化 1：提前返回

如果只需要检查是否有符合条件的祖先，用 `closest()`：

```javascript
// 不推荐
if ($('.item').parents('.container').length) { ... }

// 推荐
if ($('.item').closest('.container').length) { ... }
```

`closest()` 找到第一个匹配就停止，而 `parents()` 会遍历到根。

### 优化 2：缓存结果

频繁访问时缓存：

```javascript
// 在组件初始化时缓存
class Component {
  constructor(el) {
    this.$el = $(el);
    this.$form = this.$el.parents('form').first();
    this.$section = this.$el.parents('.section').first();
  }
}
```

### 优化 3：使用原生方法

简单场景可以直接用原生：

```javascript
// jQuery
$('.item').parent();

// 原生（更快）
element.parentElement;
```

## 本章小结

祖先遍历方法：

| 方法 | 功能 | 参数 |
|------|------|------|
| `parent()` | 直接父元素 | selector（可选） |
| `parents()` | 所有祖先 | selector（可选） |
| `parentsUntil()` | 限定范围的祖先 | until, selector |
| `offsetParent()` | 定位祖先 | 无 |

关键实现点：

- **`dir()` 辅助函数**：统一处理向上遍历
- **去重**：多个源元素可能有相同祖先
- **支持选择器过滤**：灵活筛选结果

下一章，我们实现后代遍历方法：`children()` 和 `find()`。

---

**思考题**：如何实现一个 `ancestorOf()` 方法，检查当前元素是否是某个元素的祖先？
