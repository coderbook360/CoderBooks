# DOM 操作的设计思路

DOM 操作是 jQuery 最常用的功能模块。这一章，我们探讨如何设计一套直观、强大的 DOM 操作 API。

## 原生 DOM 操作的痛点

原生 DOM 操作有几个明显的问题：

### 问题 1：API 不一致

```javascript
// 插入元素的几种方式
parent.appendChild(child);
parent.insertBefore(child, reference);
parent.replaceChild(newChild, oldChild);

// 参数顺序、方法命名都不一致
```

### 问题 2：只能操作单个节点

```javascript
// 想要在多个元素后面插入内容？
document.querySelectorAll('.item').forEach(el => {
  const span = document.createElement('span');
  span.textContent = 'new';
  el.appendChild(span);
});

// 每次都要循环，每次都要创建新元素
```

### 问题 3：HTML 字符串处理繁琐

```javascript
// 想要插入 HTML 字符串
const html = '<span class="badge">New</span>';
const temp = document.createElement('div');
temp.innerHTML = html;
const newElement = temp.firstChild;
parent.appendChild(newElement);
```

## jQuery 的解决方案

jQuery 提供了简洁、一致的 API：

```javascript
// 统一的插入方法
$('.item').append('<span>new</span>');

// 批量操作
$('.item').append('<span>new</span>'); // 自动对所有元素执行

// 直接使用 HTML 字符串
$('.item').append('<span class="badge">New</span>');
```

## DOM 操作方法分类

按照操作类型，可以分为五类：

### 插入操作

| 方法 | 位置 | 说明 |
|------|------|------|
| `append()` | 内部末尾 | 在元素内部末尾插入 |
| `prepend()` | 内部开头 | 在元素内部开头插入 |
| `after()` | 外部后面 | 在元素后面插入 |
| `before()` | 外部前面 | 在元素前面插入 |

### 反向插入

| 方法 | 说明 |
|------|------|
| `appendTo()` | 把当前元素插入到目标内部末尾 |
| `prependTo()` | 把当前元素插入到目标内部开头 |
| `insertAfter()` | 把当前元素插入到目标后面 |
| `insertBefore()` | 把当前元素插入到目标前面 |

### 包装操作

| 方法 | 说明 |
|------|------|
| `wrap()` | 用新元素包装每个元素 |
| `wrapAll()` | 用新元素包装所有元素 |
| `wrapInner()` | 包装元素的内容 |
| `unwrap()` | 移除父元素 |

### 移除操作

| 方法 | 说明 |
|------|------|
| `remove()` | 移除元素及其数据和事件 |
| `detach()` | 移除元素但保留数据和事件 |
| `empty()` | 清空元素内容 |

### 替换和克隆

| 方法 | 说明 |
|------|------|
| `replaceWith()` | 用新内容替换元素 |
| `replaceAll()` | 反向替换 |
| `clone()` | 克隆元素 |

## 设计原则

### 原则 1：接受多种输入类型

所有插入方法都应该支持：

```javascript
// HTML 字符串
$('.box').append('<span>text</span>');

// DOM 元素
$('.box').append(document.createElement('span'));

// jQuery 对象
$('.box').append($('<span>text</span>'));

// 函数（动态生成内容）
$('.box').append(function(index, html) {
  return `<span>Item ${index}</span>`;
});
```

### 原则 2：自动处理批量操作

对多个目标元素插入时，内容需要克隆：

```javascript
const $span = $('<span>new</span>');

$('.item').append($span);
// 对第一个 .item：移动 $span
// 对后续 .item：克隆 $span
```

### 原则 3：保持链式调用

所有操作方法都返回 jQuery 对象：

```javascript
$('.box')
  .append('<span>A</span>')
  .prepend('<span>B</span>')
  .addClass('modified');
```

### 原则 4：提供正向和反向版本

```javascript
// 正向：在 .box 中插入内容
$('.box').append('<span>new</span>');

// 反向：把内容插入到 .box
$('<span>new</span>').appendTo('.box');
```

两种写法结果相同，但语义和链式调用的后续元素不同。

## 核心辅助函数

### 解析内容

统一处理各种输入类型：

```javascript
function parseContent(content) {
  // 字符串 -> 解析为 DOM 节点
  if (typeof content === 'string') {
    const template = document.createElement('template');
    template.innerHTML = content.trim();
    return [...template.content.childNodes];
  }
  
  // DOM 节点 -> 包装为数组
  if (content.nodeType) {
    return [content];
  }
  
  // jQuery 对象或 NodeList -> 转为数组
  if (content.length !== undefined) {
    return [...content];
  }
  
  return [];
}
```

### 安全克隆

处理事件和数据的克隆：

```javascript
function cloneNode(node, withDataAndEvents = false) {
  const clone = node.cloneNode(true);
  
  if (withDataAndEvents) {
    // 复制存储的数据
    // 复制绑定的事件
    // 这需要事件系统支持，后面章节实现
  }
  
  return clone;
}
```

### 批量插入

处理多目标插入时的克隆逻辑：

```javascript
function domManip(collection, args, callback) {
  const nodes = parseContent(args[0]);
  
  collection.each(function(index) {
    // 第一个目标用原节点，后续用克隆
    const content = index === 0 
      ? nodes 
      : nodes.map(n => n.cloneNode(true));
    
    callback.call(this, content);
  });
  
  return collection;
}
```

## 模块结构

```
src/
├── manipulation/
│   ├── index.js        # 模块入口
│   ├── domManip.js     # 核心操作函数
│   ├── insert.js       # 插入方法
│   ├── wrap.js         # 包装方法
│   ├── remove.js       # 移除方法
│   └── clone.js        # 克隆方法
```

## 基础框架

```javascript
// src/manipulation/index.js

import jQuery from '../core.js';
import { parseHTML, domManip } from './domManip.js';

// 插入到内部末尾
jQuery.fn.append = function(...args) {
  return domManip(this, args, function(nodes) {
    if (this.nodeType === 1) {
      nodes.forEach(node => this.appendChild(node));
    }
  });
};

// 插入到内部开头
jQuery.fn.prepend = function(...args) {
  return domManip(this, args, function(nodes) {
    if (this.nodeType === 1) {
      const first = this.firstChild;
      nodes.forEach(node => this.insertBefore(node, first));
    }
  });
};

// 插入到外部后面
jQuery.fn.after = function(...args) {
  return domManip(this, args, function(nodes) {
    if (this.parentNode) {
      const next = this.nextSibling;
      nodes.forEach(node => this.parentNode.insertBefore(node, next));
    }
  });
};

// 插入到外部前面
jQuery.fn.before = function(...args) {
  return domManip(this, args, function(nodes) {
    if (this.parentNode) {
      nodes.forEach(node => this.parentNode.insertBefore(node, this));
    }
  });
};

export default jQuery;
```

## 反向插入方法

反向方法使用正向方法实现：

```javascript
// 把当前元素插入到目标内部末尾
jQuery.fn.appendTo = function(target) {
  jQuery(target).append(this);
  return this;
};

// 把当前元素插入到目标内部开头
jQuery.fn.prependTo = function(target) {
  jQuery(target).prepend(this);
  return this;
};

// 把当前元素插入到目标后面
jQuery.fn.insertAfter = function(target) {
  jQuery(target).after(this);
  return this;
};

// 把当前元素插入到目标前面
jQuery.fn.insertBefore = function(target) {
  jQuery(target).before(this);
  return this;
};
```

## 正向 vs 反向的使用场景

```javascript
// 正向：关注目标，内容是补充
$('.container').append('<p>new content</p>');

// 反向：关注内容，目标是补充
$('<p>new content</p>')
  .appendTo('.container')
  .addClass('new')
  .fadeIn();
```

反向版本的优势：后续链式调用操作的是插入的内容。

## 本章小结

DOM 操作的设计要点：

1. **统一 API**：所有插入方法接受相同的参数类型
2. **自动克隆**：批量操作时自动处理
3. **双向操作**：正向和反向方法满足不同场景
4. **链式调用**：所有方法返回 jQuery 对象

核心辅助函数：

- `parseContent()`：解析各种输入为 DOM 节点
- `domManip()`：统一的插入处理

下一章，我们详细实现 `append()` 和 `prepend()` 方法。

---

**思考题**：为什么 `append()` 在多目标时需要克隆内容？如果不克隆会发生什么？
