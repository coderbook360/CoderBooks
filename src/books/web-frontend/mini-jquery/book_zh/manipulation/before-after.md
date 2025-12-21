# 相邻插入：before/after

`before()` 和 `after()` 用于在元素外部的相邻位置插入内容。这一章，我们实现这两个方法。

## after()：在元素后面插入

`after()` 在目标元素的后面插入内容：

```javascript
$('.target').after('<span>new</span>');
```

执行前：
```html
<div class="container">
  <span class="target">target</span>
  <span class="other">other</span>
</div>
```

执行后：
```html
<div class="container">
  <span class="target">target</span>
  <span>new</span>  <!-- 新增 -->
  <span class="other">other</span>
</div>
```

## before()：在元素前面插入

`before()` 在目标元素的前面插入内容：

```javascript
$('.target').before('<span>new</span>');
```

执行后：
```html
<div class="container">
  <span>new</span>  <!-- 新增 -->
  <span class="target">target</span>
  <span class="other">other</span>
</div>
```

## 与 append/prepend 的区别

这四个方法经常让人混淆：

```javascript
// append/prepend：在元素内部
$('.box').append(content);   // 内部末尾
$('.box').prepend(content);  // 内部开头

// before/after：在元素外部
$('.box').after(content);    // 外部后面
$('.box').before(content);   // 外部前面
```

用图示会更清晰：

```
          before
             ↓
┌────────────────────┐
│ prepend → ○ ← append │  ← .box
└────────────────────┘
             ↑
          after
```

## 核心实现

使用上一章的 `domManip` 函数：

```javascript
jQuery.fn.after = function(...args) {
  return domManip(this, args, function(nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    
    const next = this.nextSibling;
    nodes.forEach(node => {
      parent.insertBefore(node, next);
    });
  });
};

jQuery.fn.before = function(...args) {
  return domManip(this, args, function(nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    
    nodes.forEach(node => {
      parent.insertBefore(node, this);
    });
  });
};
```

### 注意事项

1. **需要父元素**：如果元素没有父元素（未插入 DOM），before/after 无效
2. **使用 insertBefore**：DOM 没有 insertAfter，用 insertBefore(node, nextSibling) 实现

## 反向方法

```javascript
jQuery.fn.insertAfter = function(target) {
  jQuery(target).after(this);
  return this;
};

jQuery.fn.insertBefore = function(target) {
  jQuery(target).before(this);
  return this;
};
```

### 正向 vs 反向对比

```javascript
// 正向：在 .target 后面插入内容
$('.target').after('<span>new</span>');
// 返回：$('.target')

// 反向：把内容插入到 .target 后面
$('<span>new</span>').insertAfter('.target');
// 返回：$('<span>new</span>')
```

反向版本适合继续操作插入的内容：

```javascript
$('<div class="notice">')
  .text('提示信息')
  .insertAfter('.header')
  .delay(3000)
  .fadeOut();
```

## 多目标处理

当有多个目标时，内容会被复制：

```javascript
// HTML:
// <span class="item">A</span>
// <span class="item">B</span>

$('.item').after('<i>!</i>');

// 结果：
// <span class="item">A</span><i>!</i>
// <span class="item">B</span><i>!</i>
```

## 完整实现

```javascript
// src/manipulation/adjacent.js

import { domManip } from './domManip.js';

export function installAdjacentMethods(jQuery) {
  
  jQuery.fn.after = function(...args) {
    return domManip(this, args, function(nodes) {
      const parent = this.parentNode;
      if (!parent) return;
      
      const next = this.nextSibling;
      nodes.forEach(node => {
        parent.insertBefore(node, next);
      });
    });
  };
  
  jQuery.fn.before = function(...args) {
    return domManip(this, args, function(nodes) {
      const parent = this.parentNode;
      if (!parent) return;
      
      nodes.forEach(node => {
        parent.insertBefore(node, this);
      });
    });
  };
  
  jQuery.fn.insertAfter = function(target) {
    jQuery(target).after(this);
    return this;
  };
  
  jQuery.fn.insertBefore = function(target) {
    jQuery(target).before(this);
    return this;
  };
}
```

## 支持的参数类型

和 append/prepend 一样，支持多种类型：

```javascript
// HTML 字符串
$('.item').after('<span>text</span>');

// DOM 元素
$('.item').after(document.createElement('hr'));

// jQuery 对象
$('.item').after($('<span>text</span>'));

// 多个参数
$('.item').after('<span>A</span>', '<span>B</span>');

// 函数
$('.item').after(function(index) {
  return `<span>Item ${index + 1}</span>`;
});
```

## 实际应用场景

### 场景 1：错误提示

在输入框后面显示错误信息：

```javascript
function showError($input, message) {
  // 移除已有的错误
  $input.next('.error').remove();
  
  // 添加新的错误提示
  $('<span class="error">')
    .text(message)
    .insertAfter($input);
}
```

### 场景 2：分隔线

在元素之间插入分隔线：

```javascript
$('.section').not(':last').after('<hr class="divider">');
```

### 场景 3：广告插入

在文章段落之间插入广告：

```javascript
$('article p').eq(2).after(`
  <div class="ad-block">
    <span>Advertisement</span>
  </div>
`);
```

### 场景 4：表格行操作

在当前行后面插入新行：

```javascript
$('.add-row').on('click', function() {
  const $row = $(this).closest('tr');
  $row.after($row.clone().find('input').val('').end());
});
```

### 场景 5：提示气泡

```javascript
$('.help-icon').on('mouseenter', function() {
  const $tip = $('<div class="tooltip">')
    .text($(this).data('tip'))
    .insertAfter(this);
  
  $(this).on('mouseleave', () => $tip.remove());
});
```

## 边界情况

### 未插入 DOM 的元素

```javascript
const $div = $('<div>');
$div.after('<span>test</span>');
// 没有效果，因为 $div 没有父元素
```

### 文档片段

```javascript
const fragment = document.createDocumentFragment();
// fragment 不能作为 before/after 的目标
```

## 与原生方法对比

原生 DOM 现在也有类似方法：

```javascript
// 原生（现代浏览器）
element.after(newNode);
element.before(newNode);

// jQuery
$(element).after(newNode);
$(element).before(newNode);
```

jQuery 的优势：

- 支持 HTML 字符串
- 支持批量操作
- 支持链式调用
- 自动处理克隆

## 插入方法总结

八个插入方法的完整对照：

| 方法 | 位置 | 操作对象 |
|------|------|----------|
| `append()` | 内部末尾 | 容器 |
| `prepend()` | 内部开头 | 容器 |
| `after()` | 外部后面 | 目标 |
| `before()` | 外部前面 | 目标 |
| `appendTo()` | 内部末尾 | 内容 |
| `prependTo()` | 内部开头 | 内容 |
| `insertAfter()` | 外部后面 | 内容 |
| `insertBefore()` | 外部前面 | 内容 |

选择原则：

- **正向**（append/after/等）：关注目标位置，链式操作目标
- **反向**（appendTo/insertAfter/等）：关注内容，链式操作内容

## 本章小结

`before()` 和 `after()` 的要点：

- **位置**：在元素外部的相邻位置
- **依赖父元素**：元素必须已在 DOM 中
- **实现关键**：使用 `insertBefore(node, nextSibling)`

与 append/prepend 的区别：

- append/prepend：内部插入，改变元素内容
- before/after：外部插入，改变兄弟关系

下一章，我们实现包装方法：`wrap()` 和 `unwrap()`。

---

**思考题**：`$('.a').after($('.b'))` 会发生什么？如果 .a 和 .b 都有多个元素呢？
