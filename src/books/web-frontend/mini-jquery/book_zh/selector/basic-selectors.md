# 基础选择器实现：ID、类名、标签

上一章我们设计了选择器策略。这一章，我们实现基础选择器，并添加一些便捷方法来操作选择结果。

## 三种基础选择器

CSS 选择器有很多种，最基础的三种是：

### ID 选择器

```javascript
$('#box')           // 选择 id="box" 的元素
$('#main-content')  // 选择 id="main-content" 的元素
```

特点：
- 以 `#` 开头
- ID 在页面中应该唯一
- 返回 0 或 1 个元素

### 类选择器

```javascript
$('.item')          // 选择所有 class 包含 item 的元素
$('.btn.primary')   // 选择同时有 btn 和 primary 类的元素
```

特点：
- 以 `.` 开头
- 可以选中多个元素
- 可以组合多个类

### 标签选择器

```javascript
$('div')            // 选择所有 div 元素
$('p')              // 选择所有 p 元素
$('input')          // 选择所有 input 元素
```

特点：
- 直接使用标签名
- 选中该类型的所有元素

## 实现测试页面

首先更新测试页面，添加更多测试元素：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini-jQuery 选择器测试</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 0 20px;
    }
    .box {
      padding: 20px;
      margin: 10px 0;
      background: #f0f0f0;
      border-radius: 8px;
    }
    .item {
      padding: 10px;
      margin: 5px 0;
      background: #e0e0e0;
      border-radius: 4px;
    }
    .highlight {
      background: #fff3cd;
    }
    .active {
      background: #d4edda;
    }
  </style>
</head>
<body>
  <h1 id="title">Mini-jQuery 选择器测试</h1>
  
  <div id="app">
    <div class="box" id="box1">
      <p>这是第一个盒子</p>
      <ul class="list">
        <li class="item">Item 1</li>
        <li class="item active">Item 2</li>
        <li class="item">Item 3</li>
      </ul>
    </div>
    
    <div class="box" id="box2">
      <p>这是第二个盒子</p>
      <button class="btn primary" id="btn1">按钮 1</button>
      <button class="btn secondary" id="btn2">按钮 2</button>
    </div>
    
    <div class="box" id="box3">
      <form id="form1">
        <input type="text" name="username" placeholder="用户名">
        <input type="password" name="password" placeholder="密码">
        <input type="submit" value="提交">
      </form>
    </div>
  </div>

  <script type="module">
    import $ from './src/index.js';
    
    // 测试代码将在这里
  </script>
</body>
</html>
```

## 测试基础选择器

```javascript
// ID 选择器
const $title = $('#title');
console.log('ID 选择器:', $title.length, $title[0]);

// 类选择器
const $items = $('.item');
console.log('类选择器:', $items.length);

// 标签选择器
const $buttons = $('button');
console.log('标签选择器:', $buttons.length);

// 组合类选择器
const $primaryBtn = $('.btn.primary');
console.log('组合类选择器:', $primaryBtn.length);

// 复杂选择器
const $listItems = $('.box .item');
console.log('复杂选择器:', $listItems.length);
```

## 便捷查询方法

除了 `$()` 入口，jQuery 还提供了一些便捷的查询方法：

### is() - 检测是否匹配选择器

```javascript
$('.item').first().is('.active');  // false
$('.item').eq(1).is('.active');    // true
```

实现：

```javascript
is: function(selector) {
  if (!this[0] || !selector) {
    return false;
  }
  
  // 如果是字符串选择器
  if (typeof selector === 'string') {
    return this[0].matches(selector);
  }
  
  // 如果是 DOM 元素
  if (selector.nodeType) {
    return this[0] === selector;
  }
  
  // 如果是 jQuery 对象
  if (selector.jquery) {
    return this[0] === selector[0];
  }
  
  // 如果是函数
  if (typeof selector === 'function') {
    return selector.call(this[0], 0, this[0]);
  }
  
  return false;
}
```

### not() - 排除匹配的元素

```javascript
$('.item').not('.active');  // 返回不包含 active 类的 item
```

实现：

```javascript
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
  } else if (selector.nodeType) {
    this.each(function() {
      if (this !== selector) {
        result.push(this);
      }
    });
  } else if (selector.jquery) {
    const exclude = selector.toArray();
    this.each(function() {
      if (!exclude.includes(this)) {
        result.push(this);
      }
    });
  }
  
  return this.pushStack(result);
}
```

### has() - 保留包含指定后代的元素

```javascript
$('.box').has('.active');  // 只返回包含 .active 后代的 .box
```

实现：

```javascript
has: function(selector) {
  const result = [];
  
  this.each(function() {
    // 检查是否有匹配的后代
    if (this.querySelector(selector)) {
      result.push(this);
    }
  });
  
  return this.pushStack(result);
}
```

### slice() - 截取子集

```javascript
$('.item').slice(0, 2);   // 前两个
$('.item').slice(1);      // 从第二个开始
$('.item').slice(-1);     // 最后一个
```

实现：

```javascript
slice: function(start, end) {
  const arr = this.toArray().slice(start, end);
  return this.pushStack(arr);
}
```

注意：我们已经在原型上有 `splice` 用于控制台显示，`slice` 是不同的方法。

## 完整的选择器模块

创建 `src/selector/index.js`：

```javascript
// src/selector/index.js

import jQuery from '../core/init.js';

// 扩展实例方法
jQuery.fn.extend({
  // 检测是否匹配选择器
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
  
  // 排除匹配的元素
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
  
  // 保留包含指定后代的元素
  has: function(selector) {
    const result = [];
    
    this.each(function() {
      if (typeof selector === 'string') {
        if (this.querySelector(selector)) {
          result.push(this);
        }
      } else if (selector && selector.nodeType) {
        if (this.contains(selector)) {
          result.push(this);
        }
      }
    });
    
    return this.pushStack(result);
  },
  
  // 截取子集（覆盖 Array.prototype.slice）
  slice: function(start, end) {
    return this.pushStack(this.toArray().slice(start, end));
  },
  
  // 添加元素到结果集
  add: function(selector, context) {
    const newElements = jQuery(selector, context).toArray();
    const combined = [...new Set([...this.toArray(), ...newElements])];
    return this.pushStack(combined);
  },
  
  // 获取所有元素的索引
  index: function(selector) {
    // 没有参数：返回在父元素中的索引
    if (!selector) {
      if (!this[0] || !this[0].parentNode) {
        return -1;
      }
      const siblings = this[0].parentNode.children;
      return Array.from(siblings).indexOf(this[0]);
    }
    
    // 有参数：返回指定元素在当前集合中的索引
    if (typeof selector === 'string') {
      return jQuery(selector).toArray().indexOf(this[0]);
    }
    
    const element = selector.jquery ? selector[0] : selector;
    return this.toArray().indexOf(element);
  }
});

export default jQuery;
```

## 更新入口文件

更新 `src/index.js` 引入选择器模块：

```javascript
// src/index.js

// 导入核心模块
import jQuery from './core/init.js';

// 导入选择器扩展
import './selector/index.js';

// 导出
export default jQuery;
```

## 测试

```html
<script type="module">
  import $ from './src/index.js';
  
  // is() 测试
  console.log('is 测试:');
  console.log('第一个 item 是 .active?', $('.item').first().is('.active'));
  console.log('第二个 item 是 .active?', $('.item').eq(1).is('.active'));
  
  // not() 测试
  console.log('\nnot 测试:');
  const $notActive = $('.item').not('.active');
  console.log('不是 active 的 item 数量:', $notActive.length);
  
  // has() 测试
  console.log('\nhas 测试:');
  const $boxWithActive = $('.box').has('.active');
  console.log('包含 .active 的 box 数量:', $boxWithActive.length);
  
  // slice() 测试
  console.log('\nslice 测试:');
  console.log('前两个 item:', $('.item').slice(0, 2).length);
  console.log('最后一个 item:', $('.item').slice(-1).length);
  
  // add() 测试
  console.log('\nadd 测试:');
  const $combined = $('.item').add('.btn');
  console.log('item + btn 数量:', $combined.length);
  
  // index() 测试
  console.log('\nindex 测试:');
  console.log('第二个 item 在 item 集合中的索引:', $('.item').eq(1).index('.item'));
  console.log('#btn1 在 .btn 集合中的索引:', $('#btn1').index('.btn'));
  
  // 视觉效果
  $notActive.css('border', '2px solid blue');
  $boxWithActive.css('borderLeft', '4px solid green');
</script>
```

## 选择器性能提示

虽然现代浏览器的 `querySelectorAll` 已经很快，但还是有一些最佳实践：

### 1. 尽量具体

```javascript
// 慢：遍历整个 DOM 树
$('.item')

// 快：限制搜索范围
$('#app .item')
```

### 2. 避免过度复杂的选择器

```javascript
// 慢：多层嵌套
$('body > div > ul > li > a > span')

// 快：直接定位
$('.link-text')
```

### 3. 缓存选择结果

```javascript
// 差：每次都查询 DOM
$('.item').css('color', 'red');
$('.item').addClass('active');
$('.item').fadeIn();

// 好：缓存结果
const $items = $('.item');
$items.css('color', 'red');
$items.addClass('active');
$items.fadeIn();
```

### 4. 使用 ID 选择器

```javascript
// ID 选择器是最快的
$('#specific-element')
```

## 本章小结

我们实现了基础选择器和一些便捷查询方法：

| 方法 | 作用 |
|------|------|
| `is(selector)` | 检测是否匹配选择器 |
| `not(selector)` | 排除匹配的元素 |
| `has(selector)` | 保留包含指定后代的元素 |
| `slice(start, end)` | 截取子集 |
| `add(selector)` | 添加元素到结果集 |
| `index(selector)` | 获取元素索引 |

这些方法让元素选择更加灵活。

下一章，我们深入 `querySelectorAll` 的封装细节。

---

**思考题**：`$('.item').not('.active')` 和 `$('.item:not(.active)')` 有什么区别？哪个性能更好？
