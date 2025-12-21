# 索引方法：eq/first/last

索引方法用于根据位置获取特定元素。这一章，我们实现三个常用的索引方法。

## eq()：按索引获取

`eq()` 获取指定索引位置的元素：

```javascript
$('li').eq(0)   // 第一个
$('li').eq(2)   // 第三个（索引从 0 开始）
$('li').eq(-1)  // 最后一个（负数从末尾计算）
```

### 实现

```javascript
jQuery.fn.eq = function(index) {
  const len = this.length;
  
  // 处理负数索引
  const i = index < 0 ? index + len : index;
  
  // 索引有效则返回单元素集合，否则返回空集合
  const result = (i >= 0 && i < len) ? [this[i]] : [];
  
  return this.pushStack(result);
};
```

### eq() vs get()

`eq()` 和 `get()` 都是按索引获取，但返回类型不同：

```javascript
$('li').eq(0);  // 返回 jQuery 对象（可链式调用）
$('li').get(0); // 返回 DOM 元素
$('li')[0];     // 返回 DOM 元素（和 get(0) 相同）
```

选择原则：

- 需要继续链式操作 → `eq()`
- 需要原生 DOM 操作 → `get()` 或 `[]`

```javascript
// 链式操作用 eq()
$('li').eq(0).addClass('first').text();

// 原生操作用 get()
$('li').get(0).focus();
$('li')[0].scrollIntoView();
```

## first()：第一个元素

`first()` 是 `eq(0)` 的快捷方式：

```javascript
$('li').first()
// 等同于
$('li').eq(0)
```

### 实现

```javascript
jQuery.fn.first = function() {
  return this.eq(0);
};
```

就这么简单，一行代码。

## last()：最后一个元素

`last()` 是 `eq(-1)` 的快捷方式：

```javascript
$('li').last()
// 等同于
$('li').eq(-1)
```

### 实现

```javascript
jQuery.fn.last = function() {
  return this.eq(-1);
};
```

## 负数索引的妙用

负数索引从末尾开始计算：

```javascript
const $items = $('li'); // 假设有 5 个

$items.eq(-1);  // 第 5 个（倒数第 1）
$items.eq(-2);  // 第 4 个（倒数第 2）
$items.eq(-5);  // 第 1 个（倒数第 5）
$items.eq(-6);  // 空集合（超出范围）
```

实际应用：

```javascript
// 删除最后一个元素
$('.item').last().remove();

// 高亮倒数第二个
$('.step').eq(-2).addClass('previous');

// 获取最后 3 个
$('.item').slice(-3);
```

## slice()：范围获取

`slice()` 获取索引范围内的元素：

```javascript
$('li').slice(0, 3)   // 前 3 个（索引 0, 1, 2）
$('li').slice(2)      // 从第 3 个开始到末尾
$('li').slice(-3)     // 最后 3 个
$('li').slice(1, -1)  // 除了首尾
```

### 实现

```javascript
jQuery.fn.slice = function(start, end) {
  // 直接使用数组的 slice
  const result = Array.prototype.slice.call(this, start, end);
  return this.pushStack(result);
};
```

利用原生的 `Array.prototype.slice`，支持所有 slice 的特性。

### 使用示例

```javascript
// 分页显示
const page = 2;
const pageSize = 10;
$('.item')
  .slice((page - 1) * pageSize, page * pageSize)
  .show();

// 除了首尾的元素
$('.nav-item').slice(1, -1).addClass('middle');

// 前半部分
const len = $('.item').length;
$('.item').slice(0, Math.ceil(len / 2)).addClass('first-half');
```

## index()：获取元素的索引

`index()` 是反向操作，获取元素在集合中的位置：

```javascript
// 无参数：在兄弟中的索引
$('.active').index();

// 选择器参数：在匹配集合中的索引
$('li').index('.active');

// 元素参数：元素在当前集合中的索引
$('li').index($('.active'));
```

### 实现

```javascript
jQuery.fn.index = function(elem) {
  // 无参数：在兄弟中的位置
  if (!elem) {
    const first = this[0];
    if (!first) return -1;
    
    let index = 0;
    let sibling = first.previousElementSibling;
    while (sibling) {
      index++;
      sibling = sibling.previousElementSibling;
    }
    return index;
  }
  
  // 选择器字符串：当前第一个元素在匹配集合中的位置
  if (typeof elem === 'string') {
    const $set = jQuery(elem);
    return $set.toArray().indexOf(this[0]);
  }
  
  // 元素或 jQuery 对象：在当前集合中的位置
  const target = elem.nodeType ? elem : elem[0];
  return this.toArray().indexOf(target);
};
```

### 使用示例

```javascript
// HTML:
// <ul>
//   <li>A</li>
//   <li class="active">B</li>
//   <li>C</li>
// </ul>

$('.active').index();
// 返回：1（在兄弟中是第 2 个）

$('li').index('.active');
// 返回：1（.active 是第 2 个 li）

$('li').index($('.active'));
// 返回：1
```

## 完整的索引模块

```javascript
// src/traversing/indexing.js

export function installIndexMethods(jQuery) {
  
  jQuery.fn.eq = function(index) {
    const len = this.length;
    const i = index < 0 ? index + len : index;
    const result = (i >= 0 && i < len) ? [this[i]] : [];
    return this.pushStack(result);
  };
  
  jQuery.fn.first = function() {
    return this.eq(0);
  };
  
  jQuery.fn.last = function() {
    return this.eq(-1);
  };
  
  jQuery.fn.slice = function(start, end) {
    const result = Array.prototype.slice.call(this, start, end);
    return this.pushStack(result);
  };
  
  jQuery.fn.index = function(elem) {
    // 无参数：在兄弟中的位置
    if (elem === undefined) {
      const first = this[0];
      if (!first || !first.parentNode) return -1;
      
      let index = 0;
      let sibling = first.previousElementSibling;
      while (sibling) {
        index++;
        sibling = sibling.previousElementSibling;
      }
      return index;
    }
    
    // 选择器：在匹配集合中的位置
    if (typeof elem === 'string') {
      return jQuery(elem).toArray().indexOf(this[0]);
    }
    
    // 元素：在当前集合中的位置
    const target = elem.nodeType ? elem : elem[0];
    return this.toArray().indexOf(target);
  };
}
```

## 实际应用场景

### 场景 1：标签页切换

```javascript
$('.tab').on('click', function() {
  const index = $(this).index();
  
  // 切换标签状态
  $(this).addClass('active')
    .siblings().removeClass('active');
  
  // 切换内容面板
  $('.panel').eq(index).show()
    .siblings().hide();
});
```

### 场景 2：轮播图

```javascript
class Carousel {
  constructor(element) {
    this.$slides = $(element).find('.slide');
    this.current = 0;
  }
  
  goto(index) {
    this.$slides.eq(this.current).removeClass('active');
    this.$slides.eq(index).addClass('active');
    this.current = index;
  }
  
  next() {
    const next = (this.current + 1) % this.$slides.length;
    this.goto(next);
  }
  
  prev() {
    const prev = (this.current - 1 + this.$slides.length) % this.$slides.length;
    this.goto(prev);
  }
}
```

### 场景 3：表格操作

```javascript
// 高亮第一行和最后一行
$('table tr').first().addClass('first-row');
$('table tr').last().addClass('last-row');

// 获取点击行的索引
$('table').on('click', 'tr', function() {
  const rowIndex = $(this).index();
  console.log(`点击了第 ${rowIndex + 1} 行`);
});
```

### 场景 4：进度指示

```javascript
function updateProgress(step) {
  $('.step')
    .slice(0, step + 1).addClass('completed')
    .end()
    .eq(step).addClass('current');
}
```

### 场景 5：键盘导航

```javascript
let currentIndex = 0;
const $items = $('.selectable-item');

$(document).on('keydown', function(e) {
  if (e.key === 'ArrowDown') {
    currentIndex = Math.min(currentIndex + 1, $items.length - 1);
  } else if (e.key === 'ArrowUp') {
    currentIndex = Math.max(currentIndex - 1, 0);
  }
  
  $items.removeClass('focused')
    .eq(currentIndex).addClass('focused');
});
```

## 边界情况处理

```javascript
// 空集合
$('.not-exist').eq(0);    // 空 jQuery 对象
$('.not-exist').first();  // 空 jQuery 对象
$('.not-exist').last();   // 空 jQuery 对象
$('.not-exist').index();  // -1

// 索引越界
$('li').eq(999);  // 空 jQuery 对象
$('li').eq(-999); // 空 jQuery 对象

// slice 越界自动处理
$('li').slice(0, 999); // 所有元素
$('li').slice(999);    // 空数组
```

## 本章小结

索引方法对比：

| 方法 | 功能 | 返回 |
|------|------|------|
| `eq(n)` | 第 n 个元素 | jQuery 对象 |
| `first()` | 第一个元素 | jQuery 对象 |
| `last()` | 最后一个元素 | jQuery 对象 |
| `slice(s, e)` | 范围内的元素 | jQuery 对象 |
| `index()` | 获取元素索引 | 数字 |

关键特点：

- `eq()` 支持负数索引
- 所有方法返回 jQuery 对象（除了 `index()`）
- 越界返回空集合，不报错

下一章，我们实现迭代方法：`each()` 和 `map()`。

---

**思考题**：如何实现一个 `odd()` 和 `even()` 方法，分别返回奇数和偶数位置的元素？考虑使用 `filter()` 还是 `slice()`？
