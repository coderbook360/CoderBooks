# 最近匹配：closest 实现

`closest()` 是最常用的祖先查找方法，在事件处理和组件开发中经常用到。

## closest() 的作用

从当前元素开始，向上查找第一个匹配的元素（包括自己）：

```javascript
$('.item').closest('.container')
```

与 `parents()` 的区别：

```javascript
// parents() - 不包括自己，返回所有匹配
$('.item').parents('.wrapper');

// closest() - 包括自己，只返回第一个
$('.item').closest('.wrapper');
```

## 基础实现

```javascript
jQuery.fn.closest = function(selector) {
  const result = [];
  
  this.each(function() {
    let current = this;
    
    while (current && current.nodeType === 1) {
      if (current.matches(selector)) {
        result.push(current);
        break; // 找到第一个就停止
      }
      current = current.parentNode;
    }
  });
  
  return this.pushStack(winnow(result));
};
```

## 使用原生 closest()

现代浏览器已经原生支持 `closest()` 方法：

```javascript
jQuery.fn.closest = function(selector) {
  const result = [];
  
  if (typeof selector === 'string') {
    this.each(function() {
      const closest = this.closest(selector);
      if (closest) {
        result.push(closest);
      }
    });
  }
  
  return this.pushStack(winnow(result));
};
```

原生 `closest()` 的优势：

- 浏览器原生实现，性能更好
- 代码更简洁
- 行为完全一致

## 支持多种参数类型

jQuery 的 `closest()` 还支持其他参数类型：

```javascript
// 选择器字符串
$('.item').closest('.container');

// DOM 元素
$('.item').closest(document.body);

// jQuery 对象
$('.item').closest($('.container'));
```

完整实现：

```javascript
jQuery.fn.closest = function(selector, context) {
  const result = [];
  
  // 处理不同的 selector 类型
  let targets = null;
  
  if (typeof selector !== 'string') {
    // DOM 元素或 jQuery 对象
    targets = selector.nodeType 
      ? [selector] 
      : selector.get?.() || [];
  }
  
  this.each(function() {
    let current = this;
    
    while (current && current.nodeType === 1) {
      // 检查 context 限制
      if (context && !context.contains(current)) {
        break;
      }
      
      // 匹配检查
      let matched = false;
      
      if (targets) {
        matched = targets.includes(current);
      } else {
        matched = current.matches(selector);
      }
      
      if (matched) {
        result.push(current);
        break;
      }
      
      current = current.parentNode;
    }
  });
  
  return this.pushStack(winnow(result));
};
```

## context 参数

`context` 限制查找范围：

```javascript
// 只在 .modal 内查找最近的 .container
$('.item').closest('.container', document.querySelector('.modal'));
```

如果祖先超出了 context，就停止查找：

```javascript
// HTML:
// <div class="outer container">
//   <div class="modal">
//     <div class="inner container">
//       <span class="item">text</span>
//     </div>
//   </div>
// </div>

const modal = document.querySelector('.modal');

$('.item').closest('.container');
// 返回：.inner.container（找到第一个）

$('.item').closest('.container', modal);
// 返回：.inner.container（在 modal 范围内找到）

$('.item').closest('.outer', modal);
// 返回：[]（.outer 在 modal 外面）
```

## 实际应用场景

### 场景 1：事件委托

最常见的用途——找到触发事件的逻辑容器：

```javascript
document.addEventListener('click', function(e) {
  // 找到被点击的按钮
  const button = e.target.closest('button');
  if (button) {
    handleButtonClick(button);
  }
});

// jQuery 写法
$(document).on('click', function(e) {
  const $button = $(e.target).closest('button');
  if ($button.length) {
    handleButtonClick($button);
  }
});
```

### 场景 2：表单元素定位

找到输入框所属的表单或表单组：

```javascript
$('input').on('invalid', function() {
  // 找到包含这个输入框的表单组，显示错误样式
  $(this).closest('.form-group').addClass('has-error');
});
```

### 场景 3：组件边界检测

判断元素是否在某个组件内：

```javascript
function isInModal(element) {
  return $(element).closest('.modal').length > 0;
}

// 使用
if (isInModal(clickedElement)) {
  // 在模态框内，阻止冒泡
}
```

### 场景 4：动态内容更新

更新包含某元素的容器：

```javascript
$('.delete-btn').on('click', function() {
  const $row = $(this).closest('tr');
  
  // 发送删除请求
  $.ajax({
    url: '/delete/' + $row.data('id'),
    success: () => $row.remove()
  });
});
```

### 场景 5：层级导航

高亮当前菜单项的父级：

```javascript
$('.nav-link.active').closest('li').addClass('active');
$('.nav-link.active').closest('.nav-group').addClass('expanded');
```

## closest() vs parents().first()

两者看似相同，但有关键区别：

```javascript
// closest() 包括自己
$('.container').closest('.container').length; // 1

// parents() 不包括自己
$('.container').parents('.container').first().length; // 0（如果没有祖先 .container）
```

另外，`closest()` 在找到第一个后就停止遍历，性能更好：

```javascript
// closest() - 找到就停止
$('.deep-element').closest('.wrapper'); // O(depth)

// parents().first() - 遍历所有祖先再取第一个
$('.deep-element').parents('.wrapper').first(); // O(n)
```

## 与 is() 的配合

检查元素或其祖先是否匹配：

```javascript
// 检查自己是否匹配
$('.item').is('.active');

// 检查自己或祖先是否匹配
$('.item').closest('.active').length > 0;

// 封装成方法
jQuery.fn.closestIs = function(selector) {
  return this.closest(selector).length > 0;
};

$('.item').closestIs('.active'); // true/false
```

## 完整实现

```javascript
// src/traversing/closest.js

import { winnow } from './helpers.js';

export function installClosestMethod(jQuery) {
  
  jQuery.fn.closest = function(selector, context) {
    const result = [];
    
    // 处理 context
    const contextElem = context?.nodeType 
      ? context 
      : context?.[0] || null;
    
    // 处理 selector 类型
    let targets = null;
    if (typeof selector !== 'string') {
      targets = selector?.nodeType 
        ? [selector] 
        : selector?.get?.() || [];
    }
    
    this.each(function() {
      let current = this;
      
      while (current && current.nodeType === 1) {
        // context 边界检查
        if (contextElem && !contextElem.contains(current)) {
          break;
        }
        
        // 匹配检查
        const matched = targets 
          ? targets.includes(current)
          : current.matches(selector);
        
        if (matched) {
          result.push(current);
          break;
        }
        
        // 如果到达 context，停止
        if (current === contextElem) {
          break;
        }
        
        current = current.parentNode;
      }
    });
    
    return this.pushStack(winnow(result));
  };
}
```

## 本章小结

`closest()` 的核心特点：

- **包括自己**：从当前元素开始匹配
- **返回第一个**：找到就停止
- **支持 context**：可以限制查找范围
- **支持多种参数**：选择器、元素、jQuery 对象

使用场景：

- 事件委托中定位触发元素
- 查找元素所属的容器或组件
- 检查元素是否在某个上下文中

与其他方法对比：

| 方法 | 包括自己 | 返回数量 |
|------|----------|----------|
| `closest()` | ✓ | 第一个 |
| `parents()` | ✗ | 所有 |
| `parent()` | ✗ | 直接父级 |

下一章，我们实现过滤方法：`filter()`、`not()`、`has()`。

---

**思考题**：如何实现一个 `selfOrClosest()` 方法，如果自己匹配就返回自己，否则返回最近的匹配祖先？（提示：这正是 `closest()` 的行为，思考什么情况下需要区分）
