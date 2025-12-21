# 兄弟遍历：siblings/next/prev

水平遍历用于获取元素的兄弟节点。这一章，我们实现完整的兄弟遍历方法家族。

## siblings()：所有兄弟元素

`siblings()` 获取元素的所有兄弟（不包括自己）：

```javascript
$('.current').siblings()        // 所有兄弟
$('.current').siblings('.item') // 匹配 .item 的兄弟
```

### 实现

```javascript
function getSiblings(elem) {
  const siblings = [];
  let sibling = elem.parentNode?.firstElementChild;
  
  while (sibling) {
    if (sibling !== elem) {
      siblings.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }
  
  return siblings;
}

jQuery.fn.siblings = function(selector) {
  const result = [];
  
  this.each(function() {
    result.push(...getSiblings(this));
  });
  
  return this.pushStack(winnow(result, selector));
};
```

使用示例：

```javascript
// HTML:
// <ul>
//   <li>A</li>
//   <li class="current">B</li>
//   <li>C</li>
// </ul>

$('.current').siblings();
// 返回：[li:A, li:C]

$('.current').siblings(':last-child');
// 返回：[li:C]
```

## next()：下一个兄弟

`next()` 获取紧邻的下一个兄弟元素：

```javascript
$('.current').next()        // 下一个兄弟
$('.current').next('.item') // 下一个是 .item 才返回
```

### 实现

```javascript
jQuery.fn.next = function(selector) {
  const result = [];
  
  this.each(function() {
    const next = this.nextElementSibling;
    if (next) {
      result.push(next);
    }
  });
  
  return this.pushStack(winnow(result, selector));
};
```

注意 `selector` 参数的作用：

```javascript
// HTML: <li class="a"></li><li class="b"></li><li class="c"></li>

$('.a').next();
// 返回：[li.b]

$('.a').next('.c');
// 返回：[]（下一个是 .b，不是 .c）

$('.a').next('.b');
// 返回：[li.b]（下一个确实是 .b）
```

这和 `$('.a').nextAll('.c')` 不同！

## prev()：上一个兄弟

与 `next()` 对称：

```javascript
jQuery.fn.prev = function(selector) {
  const result = [];
  
  this.each(function() {
    const prev = this.previousElementSibling;
    if (prev) {
      result.push(prev);
    }
  });
  
  return this.pushStack(winnow(result, selector));
};
```

## nextAll()：之后所有兄弟

```javascript
$('.current').nextAll()        // 之后所有兄弟
$('.current').nextAll('.item') // 之后所有 .item 兄弟
```

### 实现

```javascript
jQuery.fn.nextAll = function(selector) {
  const result = [];
  
  this.each(function() {
    result.push(...dir(this, 'nextElementSibling'));
  });
  
  return this.pushStack(winnow(result, selector));
};
```

使用 `dir` 辅助函数沿指定方向遍历：

```javascript
// HTML:
// <li>A</li>
// <li class="current">B</li>
// <li class="item">C</li>
// <li>D</li>
// <li class="item">E</li>

$('.current').nextAll();
// 返回：[li:C, li:D, li:E]

$('.current').nextAll('.item');
// 返回：[li:C, li:E]
```

## prevAll()：之前所有兄弟

与 `nextAll()` 对称：

```javascript
jQuery.fn.prevAll = function(selector) {
  const result = [];
  
  this.each(function() {
    result.push(...dir(this, 'previousElementSibling'));
  });
  
  return this.pushStack(winnow(result, selector));
};
```

### 结果顺序

`prevAll()` 返回的顺序是从近到远：

```javascript
// HTML: <li>A</li><li>B</li><li class="current">C</li>

$('.current').prevAll();
// 返回：[li:B, li:A]（B 在前，因为更近）
```

## nextUntil()：到指定元素之前

```javascript
$('.start').nextUntil('.end')
// 从 .start 之后到 .end 之前的所有兄弟
```

### 实现

```javascript
jQuery.fn.nextUntil = function(until, selector) {
  const result = [];
  
  this.each(function() {
    result.push(...dir(this, 'nextElementSibling', until));
  });
  
  return this.pushStack(winnow(result, selector));
};
```

### 使用示例

```javascript
// HTML:
// <li class="start">Start</li>
// <li>A</li>
// <li>B</li>
// <li class="end">End</li>
// <li>C</li>

$('.start').nextUntil('.end');
// 返回：[li:A, li:B]（不包括 .end）

$('.start').nextAll();
// 返回：[li:A, li:B, li.end, li:C]（包括所有）
```

## prevUntil()：到指定元素之前

```javascript
jQuery.fn.prevUntil = function(until, selector) {
  const result = [];
  
  this.each(function() {
    result.push(...dir(this, 'previousElementSibling', until));
  });
  
  return this.pushStack(winnow(result, selector));
};
```

## 完整的兄弟遍历模块

```javascript
// src/traversing/siblings.js

import { dir, winnow } from './helpers.js';

function getSiblings(elem) {
  const siblings = [];
  let sibling = elem.parentNode?.firstElementChild;
  
  while (sibling) {
    if (sibling !== elem) {
      siblings.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }
  
  return siblings;
}

export function installSiblingMethods(jQuery) {
  
  // 所有兄弟
  jQuery.fn.siblings = function(selector) {
    const result = [];
    this.each(function() {
      result.push(...getSiblings(this));
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 下一个兄弟
  jQuery.fn.next = function(selector) {
    const result = [];
    this.each(function() {
      const next = this.nextElementSibling;
      if (next) result.push(next);
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 上一个兄弟
  jQuery.fn.prev = function(selector) {
    const result = [];
    this.each(function() {
      const prev = this.previousElementSibling;
      if (prev) result.push(prev);
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 之后所有兄弟
  jQuery.fn.nextAll = function(selector) {
    const result = [];
    this.each(function() {
      result.push(...dir(this, 'nextElementSibling'));
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 之前所有兄弟
  jQuery.fn.prevAll = function(selector) {
    const result = [];
    this.each(function() {
      result.push(...dir(this, 'previousElementSibling'));
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 到指定元素之前的后续兄弟
  jQuery.fn.nextUntil = function(until, selector) {
    const result = [];
    this.each(function() {
      result.push(...dir(this, 'nextElementSibling', until));
    });
    return this.pushStack(winnow(result, selector));
  };
  
  // 到指定元素之前的前序兄弟
  jQuery.fn.prevUntil = function(until, selector) {
    const result = [];
    this.each(function() {
      result.push(...dir(this, 'previousElementSibling', until));
    });
    return this.pushStack(winnow(result, selector));
  };
}
```

## 实际应用场景

### 场景 1：高亮当前行

```javascript
$('tr').on('click', function() {
  $(this)
    .addClass('selected')
    .siblings()
    .removeClass('selected');
});
```

### 场景 2：手风琴展开

```javascript
$('.accordion-header').on('click', function() {
  const $content = $(this).next('.accordion-content');
  
  // 关闭其他
  $(this).siblings('.accordion-header')
    .next('.accordion-content')
    .slideUp();
  
  // 切换当前
  $content.slideToggle();
});
```

### 场景 3：标签页切换

```javascript
$('.tab').on('click', function() {
  const index = $(this).index();
  
  // 切换标签状态
  $(this)
    .addClass('active')
    .siblings()
    .removeClass('active');
  
  // 切换内容面板
  $('.panel').eq(index)
    .show()
    .siblings()
    .hide();
});
```

### 场景 4：范围选择

选择两个元素之间的所有元素：

```javascript
function selectBetween($start, $end) {
  const startIndex = $start.index();
  const endIndex = $end.index();
  
  if (startIndex < endIndex) {
    return $start.nextUntil($end).addBack().add($end);
  } else {
    return $start.prevUntil($end).addBack().add($end);
  }
}

// 使用
selectBetween($('.item-2'), $('.item-5')).addClass('selected');
```

### 场景 5：导航状态

```javascript
// 标记当前页和前后页
$('.nav-current')
  .addClass('current')
  .prev().addClass('prev-page')
  .end()
  .next().addClass('next-page');
```

## next/prev 与选择器的细节

再次强调选择器参数的行为：

```javascript
// selector 是过滤条件，不是搜索条件

$('.a').next('.c');
// 只有当下一个元素匹配 .c 时才返回

// 如果想找之后第一个 .c，应该用：
$('.a').nextAll('.c').first();
```

## 本章小结

兄弟遍历方法：

| 方法 | 方向 | 范围 |
|------|------|------|
| `siblings()` | 双向 | 所有兄弟 |
| `next()` | 向后 | 紧邻的一个 |
| `prev()` | 向前 | 紧邻的一个 |
| `nextAll()` | 向后 | 所有 |
| `prevAll()` | 向前 | 所有 |
| `nextUntil()` | 向后 | 到指定元素 |
| `prevUntil()` | 向前 | 到指定元素 |

共同特点：

- 都接受 `selector` 参数进行过滤
- 都返回新的 jQuery 对象
- 都会自动去重

下一章，我们实现 `closest()` 方法——最常用的祖先查找方法。

---

**思考题**：如何实现一个 `between()` 方法，获取两个元素之间的所有兄弟（不包括两端）？
