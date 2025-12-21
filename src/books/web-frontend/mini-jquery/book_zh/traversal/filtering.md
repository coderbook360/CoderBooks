# 过滤方法：filter/not/has

过滤方法用于在已选择的元素中进一步筛选。这一章，我们实现三个核心过滤方法。

## filter()：保留匹配的元素

`filter()` 从当前集合中保留符合条件的元素：

```javascript
$('li').filter('.active')           // 保留有 active 类的
$('li').filter(':first-child')      // 保留是第一个子元素的
$('li').filter(function() { ... })  // 保留回调返回 true 的
```

### 基础实现

```javascript
jQuery.fn.filter = function(selector) {
  const result = [];
  
  // 选择器字符串
  if (typeof selector === 'string') {
    this.each(function() {
      if (this.matches(selector)) {
        result.push(this);
      }
    });
  }
  // 函数
  else if (typeof selector === 'function') {
    this.each(function(index) {
      if (selector.call(this, index, this)) {
        result.push(this);
      }
    });
  }
  // 元素或 jQuery 对象
  else if (selector) {
    const targets = selector.nodeType 
      ? [selector] 
      : [...selector];
    
    this.each(function() {
      if (targets.includes(this)) {
        result.push(this);
      }
    });
  }
  
  return this.pushStack(result);
};
```

### 回调函数的用法

回调函数提供更灵活的筛选：

```javascript
// 保留内容长度大于 10 的元素
$('p').filter(function(index, element) {
  return $(this).text().length > 10;
});

// 保留偶数位置的元素
$('li').filter(function(index) {
  return index % 2 === 0;
});

// 保留有特定属性的元素
$('input').filter(function() {
  return this.value.trim() !== '';
});
```

### 与选择器的区别

`filter()` 只在**已选择的元素**中筛选：

```javascript
// 两种写法的区别
$('li.active');           // 直接选择
$('li').filter('.active'); // 先选所有 li，再筛选

// 结果相同，但执行路径不同
// filter() 适合动态筛选或链式操作中使用
```

## not()：排除匹配的元素

`not()` 是 `filter()` 的反向操作：

```javascript
$('li').not('.disabled')   // 排除有 disabled 类的
$('li').not(':first')      // 排除第一个
$('li').not(function() {}) // 排除回调返回 true 的
```

### 实现

```javascript
jQuery.fn.not = function(selector) {
  const result = [];
  
  // 选择器字符串
  if (typeof selector === 'string') {
    this.each(function() {
      if (!this.matches(selector)) {
        result.push(this);
      }
    });
  }
  // 函数
  else if (typeof selector === 'function') {
    this.each(function(index) {
      if (!selector.call(this, index, this)) {
        result.push(this);
      }
    });
  }
  // 元素或 jQuery 对象
  else if (selector) {
    const targets = selector.nodeType 
      ? [selector] 
      : [...selector];
    
    this.each(function() {
      if (!targets.includes(this)) {
        result.push(this);
      }
    });
  }
  
  return this.pushStack(result);
};
```

### 使用示例

```javascript
// 排除已处理的元素
$('.item').not('.processed').addClass('pending');

// 排除特定元素
const $current = $('.current');
$('.item').not($current).fadeOut();

// 排除空值输入
$('input').not(function() {
  return this.value === '';
}).addClass('has-value');
```

## has()：保留包含指定后代的元素

`has()` 保留包含匹配后代的元素：

```javascript
$('li').has('ul')         // 保留包含 ul 的 li
$('div').has('.active')   // 保留包含 .active 后代的 div
```

### 实现

```javascript
jQuery.fn.has = function(selector) {
  const result = [];
  
  // 选择器字符串
  if (typeof selector === 'string') {
    this.each(function() {
      if (this.querySelector(selector)) {
        result.push(this);
      }
    });
  }
  // DOM 元素
  else if (selector?.nodeType) {
    this.each(function() {
      if (this.contains(selector) && this !== selector) {
        result.push(this);
      }
    });
  }
  
  return this.pushStack(result);
};
```

### 使用示例

```javascript
// 找出有子菜单的菜单项
$('.menu-item').has('.submenu').addClass('has-children');

// 找出包含图片的段落
$('p').has('img').addClass('with-image');

// 找出有输入错误的表单组
$('.form-group').has('.error').addClass('has-error');
```

## 代码重构：抽取公共逻辑

三个方法有很多相似之处，可以重构：

```javascript
// 通用筛选函数
function grep(elements, callback, invert) {
  const result = [];
  
  elements.each(function(index) {
    const match = callback.call(this, index, this);
    // invert 为 true 时反转结果
    if (match !== invert) {
      result.push(this);
    }
  });
  
  return result;
}

// 将选择器转换为匹配函数
function getMatcher(selector) {
  if (typeof selector === 'string') {
    return function() {
      return this.matches(selector);
    };
  }
  
  if (typeof selector === 'function') {
    return selector;
  }
  
  if (selector?.nodeType) {
    return function() {
      return this === selector;
    };
  }
  
  if (selector?.length !== undefined) {
    const targets = [...selector];
    return function() {
      return targets.includes(this);
    };
  }
  
  return function() {
    return false;
  };
}

// 使用重构后的代码
jQuery.fn.filter = function(selector) {
  return this.pushStack(
    grep(this, getMatcher(selector), false)
  );
};

jQuery.fn.not = function(selector) {
  return this.pushStack(
    grep(this, getMatcher(selector), true)
  );
};
```

## 完整的过滤模块

```javascript
// src/traversing/filtering.js

export function installFilterMethods(jQuery) {
  
  // 内部筛选函数
  function grep(elements, callback, invert) {
    const result = [];
    const callbackInverse = !invert;
    
    for (let i = 0; i < elements.length; i++) {
      const match = !!callback.call(elements[i], i, elements[i]);
      if (match !== invert) {
        result.push(elements[i]);
      }
    }
    
    return result;
  }
  
  jQuery.fn.filter = function(selector) {
    let callback;
    
    if (typeof selector === 'string') {
      callback = function() {
        return this.matches(selector);
      };
    } else if (typeof selector === 'function') {
      callback = selector;
    } else if (selector) {
      const targets = selector.nodeType ? [selector] : [...selector];
      callback = function() {
        return targets.includes(this);
      };
    } else {
      return this.pushStack([]);
    }
    
    return this.pushStack(grep(this, callback, false));
  };
  
  jQuery.fn.not = function(selector) {
    let callback;
    
    if (typeof selector === 'string') {
      callback = function() {
        return this.matches(selector);
      };
    } else if (typeof selector === 'function') {
      callback = selector;
    } else if (selector) {
      const targets = selector.nodeType ? [selector] : [...selector];
      callback = function() {
        return targets.includes(this);
      };
    } else {
      return this.pushStack([...this]);
    }
    
    return this.pushStack(grep(this, callback, true));
  };
  
  jQuery.fn.has = function(selector) {
    const result = [];
    
    if (typeof selector === 'string') {
      this.each(function() {
        if (this.querySelector(selector)) {
          result.push(this);
        }
      });
    } else if (selector?.nodeType) {
      this.each(function() {
        if (this !== selector && this.contains(selector)) {
          result.push(this);
        }
      });
    }
    
    return this.pushStack(result);
  };
}
```

## 实际应用场景

### 场景 1：表单验证

```javascript
// 获取所有空的必填字段
$('input[required]').filter(function() {
  return this.value.trim() === '';
}).addClass('error');

// 获取所有有效的字段
$('input').not('.error').addClass('valid');
```

### 场景 2：条件显示

```javascript
// 只显示满足条件的卡片
$('.card').filter(function() {
  const price = parseFloat($(this).data('price'));
  return price >= minPrice && price <= maxPrice;
}).show().end().not().hide();
```

### 场景 3：动态内容处理

```javascript
// 排除已加载的内容
$('.lazy-image').not('.loaded').each(function() {
  loadImage(this);
});
```

### 场景 4：导航状态

```javascript
// 除了当前页面，其他都可点击
$('.nav-link').not('.current').on('click', handleNavigation);
```

### 场景 5：嵌套菜单处理

```javascript
// 有子菜单的项添加展开按钮
$('.menu-item').has('.submenu').each(function() {
  $(this).prepend('<button class="expand-btn">+</button>');
});
```

## 性能考量

### filter() vs 选择器

对于静态筛选，直接使用选择器更快：

```javascript
// 慢
$('li').filter('.active');

// 快
$('li.active');
```

但在链式操作或动态筛选时，`filter()` 更合适：

```javascript
// 链式操作
$('.items')
  .find('li')
  .filter(':visible')
  .addClass('processed');

// 动态条件
$('li').filter(function() {
  return $(this).data('score') > threshold;
});
```

### 避免在循环中使用

```javascript
// 不推荐
$('.item').each(function() {
  if ($(this).filter('.active').length) {
    // ...
  }
});

// 推荐
$('.item.active').each(function() {
  // ...
});
```

## 本章小结

过滤方法对比：

| 方法 | 功能 | 参数类型 |
|------|------|----------|
| `filter()` | 保留匹配的 | 选择器/函数/元素 |
| `not()` | 排除匹配的 | 选择器/函数/元素 |
| `has()` | 保留有指定后代的 | 选择器/元素 |

共同特点：

- 返回新的 jQuery 对象
- 不修改原对象
- 支持链式调用

下一章，我们实现索引方法：`eq()`、`first()`、`last()`。

---

**思考题**：如何实现一个 `toggle()` 过滤方法，根据条件决定是保留还是排除？例如 `$('li').toggle('.active', showActive)` 在 `showActive` 为 true 时保留 `.active`，否则排除。
