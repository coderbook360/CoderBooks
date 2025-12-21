# 遍历方法的设计哲学

DOM 遍历是 jQuery 最常用的功能之一。这一章，我们探讨如何设计一套优雅、一致的遍历 API。

## 为什么需要遍历方法

原生 DOM 提供了基础的遍历属性：

```javascript
element.parentNode
element.children
element.nextElementSibling
element.previousElementSibling
```

但它们有几个问题：

1. **只能获取一步**：想要获取所有祖先，需要循环
2. **不支持过滤**：想要满足条件的父元素，需要自己判断
3. **返回单个元素**：不能批量操作
4. **不能链式调用**：每次都要重新选择

jQuery 的遍历方法解决了这些问题：

```javascript
// 获取所有祖先中的 .container
$('.item').parents('.container')

// 找到最近的 form 祖先
$('input').closest('form')

// 获取所有兄弟元素
$('.active').siblings()
```

## 遍历方法的分类

按照遍历方向，可以分为四类：

### 向上遍历（祖先方向）

| 方法 | 说明 |
|------|------|
| `parent()` | 直接父元素 |
| `parents()` | 所有祖先元素 |
| `parentsUntil()` | 到指定元素之前的祖先 |
| `closest()` | 最近的匹配祖先（包括自己） |

### 向下遍历（后代方向）

| 方法 | 说明 |
|------|------|
| `children()` | 直接子元素 |
| `find()` | 所有匹配的后代 |
| `contents()` | 所有子节点（包括文本） |

### 水平遍历（兄弟方向）

| 方法 | 说明 |
|------|------|
| `siblings()` | 所有兄弟元素 |
| `next()` | 下一个兄弟 |
| `nextAll()` | 之后所有兄弟 |
| `nextUntil()` | 到指定元素之前的兄弟 |
| `prev()` | 上一个兄弟 |
| `prevAll()` | 之前所有兄弟 |
| `prevUntil()` | 到指定元素之前的兄弟 |

### 过滤操作

| 方法 | 说明 |
|------|------|
| `filter()` | 保留匹配的元素 |
| `not()` | 排除匹配的元素 |
| `has()` | 保留包含指定后代的元素 |
| `eq()` | 获取指定索引的元素 |
| `first()` | 第一个元素 |
| `last()` | 最后一个元素 |

## 设计原则

### 原则 1：返回新的 jQuery 对象

所有遍历方法都应该返回新的 jQuery 对象，保持原对象不变：

```javascript
const $parent = $('.item').parent();
// $parent 是新对象
// $('.item') 不受影响
```

### 原则 2：支持选择器过滤

大多数遍历方法都接受选择器参数：

```javascript
// 所有父元素
$('.item').parents()

// 只要 div 父元素
$('.item').parents('div')
```

### 原则 3：维护文档顺序

遍历结果应该按照文档顺序排列：

```javascript
$('.item').parents()
// 结果按从近到远的顺序，符合 DOM 文档结构
```

### 原则 4：自动去重

多个源元素可能产生重复结果，应该自动去重：

```javascript
// li1 和 li2 可能有相同的祖先
$('li').parents()
// 结果中每个元素只出现一次
```

### 原则 5：支持链式回退

通过 `end()` 可以回到上一个选择集：

```javascript
$('.list')
  .find('.item')      // 进入子元素
  .addClass('found')
  .end()              // 回到 .list
  .addClass('searched');
```

## 核心遍历函数

我们需要一个通用的遍历函数作为基础：

```javascript
// 沿着指定方向遍历 DOM
function traverse(elem, direction, until) {
  const matched = [];
  let current = elem[direction];
  
  while (current) {
    // 只收集元素节点
    if (current.nodeType === 1) {
      // 如果指定了终止条件
      if (until && matches(current, until)) {
        break;
      }
      matched.push(current);
    }
    current = current[direction];
  }
  
  return matched;
}

// 检查元素是否匹配选择器
function matches(elem, selector) {
  return elem.matches(selector);
}
```

使用这个基础函数：

```javascript
// 获取所有祖先
traverse(element, 'parentNode');

// 获取到 .container 之前的祖先
traverse(element, 'parentNode', '.container');

// 获取之后的所有兄弟
traverse(element, 'nextElementSibling');
```

## 遍历方法的实现模式

大多数遍历方法遵循相同的模式：

```javascript
jQuery.fn.遍历方法 = function(selector) {
  const result = [];
  
  // 1. 对每个元素执行遍历
  this.each(function() {
    const elements = 遍历逻辑(this);
    result.push(...elements);
  });
  
  // 2. 去重
  const unique = [...new Set(result)];
  
  // 3. 如果有选择器，过滤结果
  const filtered = selector 
    ? unique.filter(el => el.matches(selector))
    : unique;
  
  // 4. 返回新的 jQuery 对象，支持 end()
  return this.pushStack(filtered);
};
```

## 创建遍历模块

让我们创建遍历模块的基础结构：

```javascript
// src/traversing.js

// 通用遍历辅助函数
function dir(elem, direction, until) {
  const matched = [];
  let current = elem[direction];
  
  while (current) {
    if (current.nodeType === 1) {
      if (until !== undefined) {
        if (typeof until === 'string' && current.matches(until)) {
          break;
        }
        if (until instanceof Element && current === until) {
          break;
        }
      }
      matched.push(current);
    }
    current = current[direction];
  }
  
  return matched;
}

// 获取兄弟元素
function siblings(elem, selector) {
  const matched = [];
  let sibling = elem.parentNode?.firstElementChild;
  
  while (sibling) {
    if (sibling !== elem) {
      if (!selector || sibling.matches(selector)) {
        matched.push(sibling);
      }
    }
    sibling = sibling.nextElementSibling;
  }
  
  return matched;
}

// 过滤并去重
function winnow(elements, selector) {
  // 去重
  const unique = [...new Set(elements)];
  
  // 过滤
  if (selector) {
    return unique.filter(el => 
      el.nodeType === 1 && el.matches(selector)
    );
  }
  
  return unique;
}

export { dir, siblings, winnow };
```

## 统一的遍历方法生成器

为了减少重复代码，可以使用方法生成器：

```javascript
// 创建遍历方法的工厂函数
function createTraverseMethod(fn) {
  return function(selector) {
    const result = [];
    
    this.each(function() {
      const elements = fn(this);
      result.push(...elements);
    });
    
    // 过滤、去重、返回新对象
    return this.pushStack(winnow(result, selector));
  };
}

// 使用工厂函数创建方法
jQuery.fn.parent = createTraverseMethod(elem => 
  elem.parentNode?.nodeType === 1 ? [elem.parentNode] : []
);

jQuery.fn.parents = createTraverseMethod(elem => 
  dir(elem, 'parentNode')
);

jQuery.fn.nextAll = createTraverseMethod(elem => 
  dir(elem, 'nextElementSibling')
);

jQuery.fn.prevAll = createTraverseMethod(elem => 
  dir(elem, 'previousElementSibling')
);
```

## 完整的模块入口

```javascript
// src/traversing.js

import jQuery from './core.js';
import { dir, siblings, winnow } from './traversing/helpers.js';

// 向上遍历
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

// 向下遍历
jQuery.fn.children = function(selector) {
  const result = [];
  this.each(function() {
    result.push(...this.children);
  });
  return this.pushStack(winnow(result, selector));
};

// 兄弟遍历
jQuery.fn.siblings = function(selector) {
  const result = [];
  this.each(function() {
    result.push(...siblings(this));
  });
  return this.pushStack(winnow(result, selector));
};

jQuery.fn.next = function(selector) {
  const result = [];
  this.each(function() {
    const next = this.nextElementSibling;
    if (next) result.push(next);
  });
  return this.pushStack(winnow(result, selector));
};

jQuery.fn.prev = function(selector) {
  const result = [];
  this.each(function() {
    const prev = this.previousElementSibling;
    if (prev) result.push(prev);
  });
  return this.pushStack(winnow(result, selector));
};

export default jQuery;
```

## 本章小结

遍历方法的设计哲学：

1. **方向明确**：向上、向下、水平，每个方向都有对应方法
2. **功能一致**：所有方法都返回新 jQuery 对象，支持链式调用
3. **过滤灵活**：都支持选择器参数
4. **结果可靠**：自动去重，保持文档顺序

核心实现要点：

- **通用遍历函数** `dir()`：处理单方向遍历
- **去重过滤函数** `winnow()`：统一后处理
- **工厂模式**：减少重复代码

下一章，我们将实现祖先遍历方法：`parent()`、`parents()` 和 `parentsUntil()`。

---

**思考题**：`closest()` 和 `parents()` 有什么区别？什么场景下应该使用 `closest()`？
