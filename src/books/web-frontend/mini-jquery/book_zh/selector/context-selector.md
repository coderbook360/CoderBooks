# 上下文选择：在指定范围内查找

jQuery 的选择器支持第二个参数 `context`，用于限制查找范围：

```javascript
$('.item', '#container')  // 只在 #container 内查找 .item
```

这一章，我们深入理解上下文选择的实现和应用场景。

## 为什么需要上下文选择？

### 性能优化

在大型页面中，全局查询可能很慢：

```javascript
// 在整个文档中查找（可能有上百个匹配）
$('.item')

// 只在特定容器中查找（通常只有几个）
$('.item', '#my-widget')
```

限制查找范围可以显著提升性能。

### 组件隔离

在组件化开发中，避免选择器影响其他组件：

```javascript
// 可能意外选中其他组件的元素
$('.btn')

// 只选中当前组件内的元素
$('.btn', this.$el)
```

### 动态内容

处理动态加载的内容：

```javascript
// 新加载的 HTML
const html = await fetch('/api/content').then(r => r.text());
const $container = $('<div>').html(html);

// 在新内容中查找
$('.item', $container)
```

## 上下文的多种形式

`context` 参数可以是多种类型：

### 1. 选择器字符串

```javascript
$('.item', '#container')
$('li', 'ul.menu')
```

### 2. DOM 元素

```javascript
const container = document.getElementById('container');
$('.item', container)
```

### 3. jQuery 对象

```javascript
const $container = $('#container');
$('.item', $container)
```

### 4. Document 或 DocumentFragment

```javascript
$('div', document)
$('span', myDocumentFragment)
```

## 实现上下文选择

更新 `_handleSelector` 方法来完整支持上下文：

```javascript
_handleSelector: function(selector, context) {
  // 解析上下文
  const roots = this._resolveContext(context);
  
  if (!roots.length) {
    this.length = 0;
    return this;
  }
  
  // 在所有根元素中查找
  const allElements = [];
  
  for (const root of roots) {
    try {
      const elements = root.querySelectorAll(selector);
      allElements.push(...elements);
    } catch (e) {
      // 无效选择器，忽略
    }
  }
  
  this._setElements(allElements);
  return this;
},

_resolveContext: function(context) {
  // 没有上下文，使用 document
  if (!context) {
    return [document];
  }
  
  // 字符串选择器
  if (typeof context === 'string') {
    return [...document.querySelectorAll(context)];
  }
  
  // DOM 元素
  if (context.nodeType) {
    return [context];
  }
  
  // jQuery 对象
  if (context.jquery) {
    return context.toArray();
  }
  
  // 类数组
  if (context.length !== undefined) {
    return Array.from(context);
  }
  
  return [document];
}
```

### 多上下文查找

当 context 是多个元素时，需要在每个元素中查找：

```javascript
// 在所有 .box 中查找 .item
$('.item', '.box')
```

这会在每个 `.box` 中分别查找 `.item`，然后合并去重。

## find 方法的实现

`find` 方法是最常用的上下文查找方式：

```javascript
$('#container').find('.item')
```

它与 `$('.item', '#container')` 效果相同，但更直观。

```javascript
find: function(selector) {
  // 如果没有选择器，返回空集合
  if (!selector) {
    return this.pushStack([]);
  }
  
  const result = [];
  
  this.each(function() {
    try {
      const found = this.querySelectorAll(selector);
      result.push(...found);
    } catch (e) {
      // 无效选择器
    }
  });
  
  return this.pushStack(result);
}
```

## 上下文选择 vs find 方法

两种写法看起来等价：

```javascript
$('.item', '#container')  // 方式一
$('#container').find('.item')  // 方式二
```

但有一些细微差别：

### 性能差异

```javascript
// 方式一：两次 DOM 查询
// 1. querySelectorAll('#container')
// 2. container.querySelectorAll('.item')
$('.item', '#container')

// 方式二：同样两次，但更明确
$('#container').find('.item')
```

性能基本相同。

### 链式调用

```javascript
// find 可以链式调用
$('#container')
  .css('border', '1px solid red')
  .find('.item')
  .css('color', 'blue');

// 上下文方式不行
$('.item', '#container')  // 直接返回 .item，没有对 #container 的引用
```

### 多上下文处理

```javascript
// 在多个容器中查找
$('.item', '.container')  // 自动合并所有结果

// find 方式
$('.container').find('.item')  // 同样效果
```

## 实用方法扩展

添加一些与上下文相关的实用方法：

### children - 直接子元素

与 `find` 不同，`children` 只查找直接子元素：

```javascript
$('#container').children()         // 所有直接子元素
$('#container').children('.item')  // 匹配选择器的直接子元素
```

实现：

```javascript
children: function(selector) {
  const result = [];
  
  this.each(function() {
    const kids = this.children;  // HTMLCollection
    for (let i = 0; i < kids.length; i++) {
      if (!selector || kids[i].matches(selector)) {
        result.push(kids[i]);
      }
    }
  });
  
  return this.pushStack(result);
}
```

### contents - 所有子节点

包括文本节点：

```javascript
contents: function() {
  const result = [];
  
  this.each(function() {
    result.push(...this.childNodes);
  });
  
  return this.pushStack(result);
}
```

## 完整的选择器模块

更新 `src/selector/index.js`：

```javascript
// src/selector/index.js

import jQuery from '../core/init.js';

jQuery.fn.extend({
  // 查找后代
  find: function(selector) {
    if (!selector) {
      return this.pushStack([]);
    }
    
    const result = [];
    
    this.each(function() {
      try {
        const found = this.querySelectorAll(selector);
        result.push(...found);
      } catch (e) {
        // 无效选择器
      }
    });
    
    return this.pushStack(result);
  },
  
  // 直接子元素
  children: function(selector) {
    const result = [];
    
    this.each(function() {
      const kids = this.children;
      for (let i = 0; i < kids.length; i++) {
        if (!selector || kids[i].matches(selector)) {
          result.push(kids[i]);
        }
      }
    });
    
    return this.pushStack(result);
  },
  
  // 所有子节点（包括文本）
  contents: function() {
    const result = [];
    
    this.each(function() {
      // 处理 iframe
      if (this.nodeName === 'IFRAME') {
        try {
          result.push(this.contentDocument || this.contentWindow.document);
        } catch (e) {
          // 跨域 iframe
        }
      } else {
        result.push(...this.childNodes);
      }
    });
    
    return this.pushStack(result);
  },
  
  // 检测是否匹配
  is: function(selector) {
    if (!this[0] || !selector) {
      return false;
    }
    
    if (typeof selector === 'string') {
      return this[0].matches(selector);
    }
    
    if (selector.nodeType) {
      return this[0] === selector;
    }
    
    if (selector.jquery) {
      return this[0] === selector[0];
    }
    
    if (typeof selector === 'function') {
      return !!selector.call(this[0], 0, this[0]);
    }
    
    return false;
  },
  
  // 排除元素
  not: function(selector) {
    const result = [];
    
    if (typeof selector === 'string') {
      this.each(function() {
        if (!this.matches(selector)) {
          result.push(this);
        }
      });
    } else if (typeof selector === 'function') {
      this.each(function(i, el) {
        if (!selector.call(el, i, el)) {
          result.push(el);
        }
      });
    } else if (selector && selector.nodeType) {
      this.each(function() {
        if (this !== selector) {
          result.push(this);
        }
      });
    } else if (selector && selector.jquery) {
      const exclude = selector.toArray();
      this.each(function() {
        if (!exclude.includes(this)) {
          result.push(this);
        }
      });
    }
    
    return this.pushStack(result);
  },
  
  // 保留包含后代的元素
  has: function(target) {
    const result = [];
    
    this.each(function() {
      if (typeof target === 'string') {
        if (this.querySelector(target)) {
          result.push(this);
        }
      } else if (target && target.nodeType) {
        if (this.contains(target) && this !== target) {
          result.push(this);
        }
      }
    });
    
    return this.pushStack(result);
  },
  
  // 截取
  slice: function(start, end) {
    return this.pushStack(this.toArray().slice(start, end));
  },
  
  // 添加到集合
  add: function(selector, context) {
    const newElements = jQuery(selector, context).toArray();
    const combined = [...new Set([...this.toArray(), ...newElements])];
    return this.pushStack(combined);
  },
  
  // 索引
  index: function(selector) {
    if (!selector) {
      if (!this[0] || !this[0].parentNode) {
        return -1;
      }
      return Array.from(this[0].parentNode.children).indexOf(this[0]);
    }
    
    if (typeof selector === 'string') {
      return jQuery(selector).toArray().indexOf(this[0]);
    }
    
    const element = selector.jquery ? selector[0] : selector;
    return this.toArray().indexOf(element);
  }
});

export default jQuery;
```

## 测试

```html
<script type="module">
  import $ from './src/index.js';
  
  // 上下文选择
  console.log('上下文选择:');
  console.log('$(".item", "#box1"):', $('.item', '#box1').length);
  console.log('$(".item", ".box"):', $('.item', '.box').length);
  
  // DOM 元素作为上下文
  const box1 = document.getElementById('box1');
  console.log('$(".item", box1):', $('.item', box1).length);
  
  // jQuery 对象作为上下文
  const $box = $('#box1');
  console.log('$(".item", $box):', $('.item', $box).length);
  
  // find 方法
  console.log('\nfind 方法:');
  console.log('$("#box1").find(".item"):', $('#box1').find('.item').length);
  
  // children 方法
  console.log('\nchildren 方法:');
  console.log('$(".list").children():', $('.list').children().length);
  console.log('$(".list").children(".active"):', $('.list').children('.active').length);
  
  // 链式调用
  console.log('\n链式调用:');
  $('#box1')
    .css('border', '2px solid blue')
    .find('.item')
    .css('color', 'blue')
    .end()
    .find('p')
    .css('fontWeight', 'bold');
</script>
```

## 最佳实践

### 1. 优先使用 find

```javascript
// 推荐
$container.find('.item')

// 不太直观
$('.item', $container)
```

### 2. 缓存容器引用

```javascript
const $container = $('#container');

// 多次在同一容器中查找
$container.find('.item').css('color', 'red');
$container.find('.btn').on('click', handler);
$container.find('input').val('');
```

### 3. 避免过深的嵌套

```javascript
// 差
$('#app').find('.module').find('.section').find('.item')

// 好
$('#app .module .section .item')
// 或
$('#app').find('.module .section .item')
```

## 本章小结

上下文选择的核心：

1. **限制查找范围**：提升性能，避免意外选中
2. **多种上下文类型**：字符串、DOM 元素、jQuery 对象
3. **find 方法**：最常用的上下文查找方式
4. **children 方法**：只查找直接子元素

下一章，我们探讨选择器结果的缓存优化。

---

**思考题**：`$('#box').find('.item')` 和 `$('#box .item')` 在功能上等价，但在以下场景有什么不同？

```javascript
const $box = $('#box').addClass('active');
$box.find('.item')  // 场景 A
$('#box .item')     // 场景 B
```
