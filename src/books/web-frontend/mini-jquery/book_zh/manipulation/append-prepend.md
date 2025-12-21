# 插入内容：append/prepend

DOM 操作的核心就是"增删改查"。上一章我们学习了如何获取和设置内容（改），这一章来实现内容的插入（增）。

`append()` 和 `prepend()` 是 jQuery 中使用频率最高的 DOM 插入方法。它们看起来简单，但内部要处理各种类型的输入参数，实现起来还挺有意思的。

## append()：往末尾加东西

`append()` 在元素**内部**的**末尾**添加内容。注意两个关键词：内部、末尾。

```javascript
$('.list').append('<li>new item</li>');
```

执行前：
```html
<ul class="list">
  <li>item 1</li>
  <li>item 2</li>
</ul>
```

执行后：
```html
<ul class="list">
  <li>item 1</li>
  <li>item 2</li>
  <li>new item</li>  <!-- 新增在最后 -->
</ul>
```

## prepend()：往开头加东西

`prepend()` 在元素**内部**的**开头**添加内容：

```javascript
$('.list').prepend('<li>first item</li>');
```

执行后：
```html
<ul class="list">
  <li>first item</li>  <!-- 新增在最前 -->
  <li>item 1</li>
  <li>item 2</li>
</ul>
```

## 设计思考：参数的多样性

在实现之前，先想一下：用户可能往 `append()` 里传什么参数？

```javascript
// 1. HTML 字符串
$('.list').append('<li>item</li>');

// 2. 纯文本
$('.list').append('plain text');

// 3. DOM 元素
$('.list').append(document.createElement('li'));

// 4. jQuery 对象
$('.list').append($otherList.children());

// 5. 多个参数
$('.list').append('<li>a</li>', '<li>b</li>', '<li>c</li>');

// 6. 函数（根据每个目标元素生成不同内容）
$('.list').append(function(index, html) {
  return '<li>item ' + index + '</li>';
});
```

这就是 jQuery API 的特点：**一个方法，多种用法**。内部需要根据参数类型做不同处理。

## 核心实现：内容解析器

首先，我们需要一个函数把各种输入统一转换成 DOM 节点数组：

```javascript
// 解析内容为 DOM 节点数组
function parseContent(content, context) {
  // HTML 字符串
  if (typeof content === 'string') {
    // 检查是否是 HTML（以 < 开头）
    if (content.trim().startsWith('<')) {
      // 用 template 元素解析 HTML（这是现代浏览器的最佳实践）
      const template = document.createElement('template');
      template.innerHTML = content;
      return [...template.content.childNodes];
    }
    // 普通文本，创建文本节点
    return [document.createTextNode(content)];
  }
  
  // DOM 节点，直接包装成数组
  if (content.nodeType) {
    return [content];
  }
  
  // 类数组对象（jQuery 对象、NodeList）
  if (content.length !== undefined) {
    return [...content].filter(n => n.nodeType);
  }
  
  return [];
}
```

为什么用 `<template>` 而不是 `div.innerHTML`？因为 `<template>` 可以正确解析任何 HTML，包括 `<tr>`、`<td>` 等需要特定父元素的标签。

接下来实现插入方法：

```javascript
jQuery.fn.append = function(...contents) {
  // 没有内容，直接返回
  if (!contents.length) return this;
  
  // 遍历目标元素
  return this.each(function(targetIndex) {
    // 只对元素节点操作
    if (this.nodeType !== 1) return;
    
    // 处理每个内容参数
    contents.forEach((content, contentIndex) => {
      // 处理函数参数
      if (typeof content === 'function') {
        content = content.call(this, targetIndex, this.innerHTML);
      }
      
      // 解析为节点
      const nodes = parseContent(content);
      
      // 插入节点
      nodes.forEach((node, nodeIndex) => {
        // 非第一个目标需要克隆
        const insertNode = (targetIndex === 0 && contentIndex === 0)
          ? node
          : node.cloneNode(true);
        
        this.appendChild(insertNode);
      });
    });
  });
};
```

### 问题：克隆逻辑

上面的克隆逻辑有问题。正确的逻辑是：

- 第一个目标元素：使用原节点（移动）
- 后续目标元素：使用克隆节点

修正版：

```javascript
jQuery.fn.append = function(...contents) {
  if (!contents.length) return this;
  
  // 预先收集所有节点
  let allNodes = [];
  
  contents.forEach(content => {
    if (typeof content !== 'function') {
      allNodes.push(...parseContent(content));
    }
  });
  
  return this.each(function(index) {
    if (this.nodeType !== 1) return;
    
    // 处理函数类型的内容
    contents.forEach(content => {
      if (typeof content === 'function') {
        const result = content.call(this, index, this.innerHTML);
        allNodes.push(...parseContent(result));
      }
    });
    
    // 插入节点
    allNodes.forEach(node => {
      // 第一个目标用原节点，后续用克隆
      const insertNode = index === 0 ? node : node.cloneNode(true);
      this.appendChild(insertNode);
    });
  });
};
```

## 更优雅的实现

抽取公共的 `domManip` 函数：

```javascript
// 通用 DOM 操作函数
function domManip(collection, args, callback) {
  const first = collection[0];
  if (!first) return collection;
  
  // 预处理所有非函数内容
  let staticNodes = [];
  args.forEach(arg => {
    if (typeof arg !== 'function') {
      staticNodes.push(...parseContent(arg));
    }
  });
  
  collection.each(function(index) {
    if (this.nodeType !== 1) return;
    
    let nodes = [...staticNodes];
    
    // 处理函数参数
    args.forEach(arg => {
      if (typeof arg === 'function') {
        const result = arg.call(this, index, this.innerHTML);
        nodes.push(...parseContent(result));
      }
    });
    
    // 非第一个目标需要克隆
    if (index > 0) {
      nodes = nodes.map(n => n.cloneNode(true));
    }
    
    // 执行插入回调
    callback.call(this, nodes);
  });
  
  return collection;
}
```

使用 `domManip` 实现方法：

```javascript
jQuery.fn.append = function(...args) {
  return domManip(this, args, function(nodes) {
    nodes.forEach(node => this.appendChild(node));
  });
};

jQuery.fn.prepend = function(...args) {
  return domManip(this, args, function(nodes) {
    const first = this.firstChild;
    // 逆序插入，保持原顺序
    nodes.reverse().forEach(node => {
      this.insertBefore(node, first);
    });
  });
};
```

等等，`prepend` 的逆序有问题。修正：

```javascript
jQuery.fn.prepend = function(...args) {
  return domManip(this, args, function(nodes) {
    const first = this.firstChild;
    nodes.forEach(node => {
      this.insertBefore(node, first);
    });
  });
};
```

不对，这样会导致顺序反转。让我们仔细想想：

```javascript
// nodes = [A, B, C]
// 目标是在最前面按 A, B, C 顺序插入

// 方法1：获取第一个子节点，依次在它之前插入
// insertBefore(A, first) -> A, first...
// insertBefore(B, first) -> A, B, first...  // 错！B 应该在 A 后面
```

正确的做法：

```javascript
jQuery.fn.prepend = function(...args) {
  return domManip(this, args, function(nodes) {
    // 保存第一个子节点的引用
    let first = this.firstChild;
    // 按顺序插入，每次都在 first 之前
    nodes.forEach(node => {
      this.insertBefore(node, first);
    });
  });
};
```

再验证：
```javascript
// 初始：<div>X</div>，first = X
// nodes = [A, B, C]
// insertBefore(A, X) -> <div>A X</div>
// insertBefore(B, X) -> <div>A B X</div>
// insertBefore(C, X) -> <div>A B C X</div>
```

正确！因为 `first` 始终指向原来的第一个节点 X，新节点总是在 X 之前插入。

## 支持多参数

`append()` 可以一次插入多个内容：

```javascript
$('.box').append('<span>A</span>', '<span>B</span>', '<span>C</span>');
```

我们的实现已经支持，因为使用了 `...args`。

## appendTo 和 prependTo

反向版本的实现：

```javascript
jQuery.fn.appendTo = function(target) {
  jQuery(target).append(this);
  return this;
};

jQuery.fn.prependTo = function(target) {
  jQuery(target).prepend(this);
  return this;
};
```

使用场景对比：

```javascript
// 正向：关注容器
$('.container').append($('<div class="new">'));

// 反向：关注内容，方便继续链式操作
$('<div class="new">')
  .prependTo('.container')
  .addClass('highlight')
  .fadeIn();
```

## 完整实现

```javascript
// src/manipulation/insert.js

// 解析内容
function parseContent(content) {
  if (typeof content === 'string') {
    if (content.trim().startsWith('<')) {
      const template = document.createElement('template');
      template.innerHTML = content;
      return [...template.content.childNodes];
    }
    return [document.createTextNode(content)];
  }
  
  if (content?.nodeType) {
    return [content];
  }
  
  if (content?.length !== undefined) {
    return [...content].filter(n => n?.nodeType);
  }
  
  return [];
}

// 通用 DOM 操作
function domManip(collection, args, callback, reverse = false) {
  if (!collection.length || !args.length) {
    return collection;
  }
  
  // 收集静态内容节点
  let staticNodes = [];
  args.forEach(arg => {
    if (typeof arg !== 'function') {
      staticNodes.push(...parseContent(arg));
    }
  });
  
  collection.each(function(index) {
    if (this.nodeType !== 1) return;
    
    let nodes = [...staticNodes];
    
    // 处理函数参数
    args.forEach(arg => {
      if (typeof arg === 'function') {
        const result = arg.call(this, index, this.innerHTML);
        nodes.push(...parseContent(result));
      }
    });
    
    // 克隆处理
    if (index > 0) {
      nodes = nodes.map(n => n.cloneNode(true));
    }
    
    // 执行回调
    callback.call(this, nodes);
  });
  
  return collection;
}

export function installInsertMethods(jQuery) {
  
  jQuery.fn.append = function(...args) {
    return domManip(this, args, function(nodes) {
      nodes.forEach(node => this.appendChild(node));
    });
  };
  
  jQuery.fn.prepend = function(...args) {
    return domManip(this, args, function(nodes) {
      const first = this.firstChild;
      nodes.forEach(node => this.insertBefore(node, first));
    });
  };
  
  jQuery.fn.appendTo = function(target) {
    jQuery(target).append(this);
    return this;
  };
  
  jQuery.fn.prependTo = function(target) {
    jQuery(target).prepend(this);
    return this;
  };
}
```

## 实际应用场景

### 场景 1：动态添加列表项

```javascript
$('.add-btn').on('click', function() {
  const text = $('input').val();
  $('<li>')
    .text(text)
    .appendTo('.list')
    .hide()
    .fadeIn();
});
```

### 场景 2：加载更多

```javascript
async function loadMore() {
  const data = await fetch('/api/items?page=' + page);
  const html = data.items.map(item => 
    `<div class="item">${item.title}</div>`
  ).join('');
  
  $('.items').append(html);
  page++;
}
```

### 场景 3：动态表单字段

```javascript
$('.add-field').on('click', function() {
  const index = $('.field').length;
  
  $(`<div class="field">
    <input name="field[${index}]" placeholder="Field ${index + 1}">
    <button class="remove-field">×</button>
  </div>`).appendTo('.form-fields');
});
```

### 场景 4：函数参数

```javascript
// 根据索引生成不同内容
$('.item').append(function(index) {
  return `<span class="badge">${index + 1}</span>`;
});
```

## 本章小结

`append()` 和 `prepend()` 的核心要点：

- **位置**：append 在末尾，prepend 在开头
- **输入类型**：HTML 字符串、DOM 元素、jQuery 对象、函数
- **克隆处理**：多目标时自动克隆
- **反向版本**：appendTo/prependTo 方便链式调用

关键实现：

- `parseContent()`：统一解析各种输入
- `domManip()`：处理批量操作和克隆
- 使用 `insertBefore(node, firstChild)` 实现 prepend

下一章，我们实现相邻插入方法：`before()` 和 `after()`。

---

**思考题**：如果 `append()` 的参数是一个已经在 DOM 中的元素会发生什么？这个行为符合预期吗？
