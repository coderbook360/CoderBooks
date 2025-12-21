# 类操作：addClass/removeClass/toggleClass

类操作是最常用的 DOM 操作之一。这一章，我们实现完整的类操作方法。

## addClass()：添加类

```javascript
$('.item').addClass('active');
$('.item').addClass('active highlight');  // 多个类
```

### 实现

```javascript
jQuery.fn.addClass = function(className) {
  return this.each(function(index) {
    if (this.nodeType !== 1) return;
    
    // 处理函数参数
    const classes = typeof className === 'function'
      ? className.call(this, index, this.className)
      : className;
    
    if (typeof classes !== 'string' || !classes) return;
    
    // 分割并添加
    classes.split(/\s+/).forEach(cls => {
      if (cls) {
        this.classList.add(cls);
      }
    });
  });
};
```

使用 `classList.add()` 是最高效的方式，它会自动处理：
- 去重（不会重复添加）
- 空字符串（会忽略）

## removeClass()：移除类

```javascript
$('.item').removeClass('active');
$('.item').removeClass('active highlight');
$('.item').removeClass();  // 移除所有类
```

### 实现

```javascript
jQuery.fn.removeClass = function(className) {
  return this.each(function(index) {
    if (this.nodeType !== 1) return;
    
    // 无参数：移除所有类
    if (className === undefined) {
      this.className = '';
      return;
    }
    
    // 处理函数参数
    const classes = typeof className === 'function'
      ? className.call(this, index, this.className)
      : className;
    
    if (typeof classes !== 'string' || !classes) return;
    
    classes.split(/\s+/).forEach(cls => {
      if (cls) {
        this.classList.remove(cls);
      }
    });
  });
};
```

## toggleClass()：切换类

```javascript
$('.item').toggleClass('active');       // 切换
$('.item').toggleClass('active', true);  // 强制添加
$('.item').toggleClass('active', false); // 强制移除
```

### 实现

```javascript
jQuery.fn.toggleClass = function(className, state) {
  return this.each(function(index) {
    if (this.nodeType !== 1) return;
    
    // 处理函数参数
    let classes = typeof className === 'function'
      ? className.call(this, index, this.className, state)
      : className;
    
    // 无参数：切换所有类
    if (classes === undefined) {
      // 保存或恢复类名
      const storedClasses = jQuery.data(this, '__storedClasses__');
      if (storedClasses !== undefined) {
        this.className = storedClasses;
        jQuery.removeData(this, '__storedClasses__');
      } else {
        jQuery.data(this, '__storedClasses__', this.className);
        this.className = '';
      }
      return;
    }
    
    if (typeof classes !== 'string') return;
    
    classes.split(/\s+/).forEach(cls => {
      if (!cls) return;
      
      if (state === undefined) {
        // 切换
        this.classList.toggle(cls);
      } else if (state) {
        // 强制添加
        this.classList.add(cls);
      } else {
        // 强制移除
        this.classList.remove(cls);
      }
    });
  });
};
```

## hasClass()：检查类

```javascript
$('.item').hasClass('active');  // true/false
```

### 实现

```javascript
jQuery.fn.hasClass = function(className) {
  if (!className || typeof className !== 'string') {
    return false;
  }
  
  // 只检查第一个元素
  const elem = this[0];
  if (!elem || elem.nodeType !== 1) {
    return false;
  }
  
  return elem.classList.contains(className);
};
```

注意：`hasClass()` 只检查单个类名，不支持空格分隔的多个类。

## 完整实现

```javascript
// src/attributes/class.js

export function installClassMethods(jQuery) {
  
  jQuery.fn.addClass = function(className) {
    return this.each(function(index) {
      if (this.nodeType !== 1) return;
      
      const classes = typeof className === 'function'
        ? className.call(this, index, this.className)
        : className;
      
      if (typeof classes === 'string' && classes) {
        classes.split(/\s+/).forEach(cls => {
          if (cls) this.classList.add(cls);
        });
      }
    });
  };
  
  jQuery.fn.removeClass = function(className) {
    return this.each(function(index) {
      if (this.nodeType !== 1) return;
      
      if (className === undefined) {
        this.className = '';
        return;
      }
      
      const classes = typeof className === 'function'
        ? className.call(this, index, this.className)
        : className;
      
      if (typeof classes === 'string' && classes) {
        classes.split(/\s+/).forEach(cls => {
          if (cls) this.classList.remove(cls);
        });
      }
    });
  };
  
  jQuery.fn.toggleClass = function(className, state) {
    return this.each(function(index) {
      if (this.nodeType !== 1) return;
      
      const classes = typeof className === 'function'
        ? className.call(this, index, this.className, state)
        : className;
      
      if (typeof classes !== 'string' || !classes) return;
      
      classes.split(/\s+/).forEach(cls => {
        if (!cls) return;
        
        if (state === undefined) {
          this.classList.toggle(cls);
        } else if (state) {
          this.classList.add(cls);
        } else {
          this.classList.remove(cls);
        }
      });
    });
  };
  
  jQuery.fn.hasClass = function(className) {
    const elem = this[0];
    return elem?.nodeType === 1 && 
           typeof className === 'string' && 
           elem.classList.contains(className);
  };
}
```

## 函数参数的用法

所有类方法都支持函数参数：

```javascript
// 根据索引添加不同的类
$('.item').addClass(function(index, currentClass) {
  return 'item-' + index;
});

// 根据当前类决定要添加的类
$('.item').addClass(function(index, currentClass) {
  if (currentClass.includes('special')) {
    return 'highlight';
  }
  return '';
});

// toggleClass 函数接收额外的 state 参数
$('.item').toggleClass(function(index, currentClass, state) {
  return state ? 'enabled' : 'disabled';
}, isEnabled);
```

## 实际应用场景

### 场景 1：激活状态

```javascript
$('.nav-item').on('click', function() {
  $(this)
    .addClass('active')
    .siblings()
    .removeClass('active');
});
```

### 场景 2：条件样式

```javascript
$('.form-field').each(function() {
  const isValid = validateField(this);
  $(this)
    .toggleClass('valid', isValid)
    .toggleClass('invalid', !isValid);
});
```

### 场景 3：主题切换

```javascript
$('.theme-toggle').on('click', function() {
  $('body').toggleClass('dark-theme');
  $(this).toggleClass('active');
});
```

### 场景 4：动画触发

```javascript
$('.card').on('mouseenter', function() {
  $(this).addClass('hover');
}).on('mouseleave', function() {
  $(this).removeClass('hover');
});

// 或者用 toggleClass
$('.card').on('mouseenter mouseleave', function() {
  $(this).toggleClass('hover');
});
```

### 场景 5：状态指示

```javascript
function updateLoadingState(isLoading) {
  $('button')
    .toggleClass('loading', isLoading)
    .prop('disabled', isLoading);
  
  $('.spinner').toggleClass('visible', isLoading);
}
```

### 场景 6：批量样式

```javascript
// 根据数据添加样式
$('.product').each(function() {
  const stock = $(this).data('stock');
  
  $(this)
    .toggleClass('in-stock', stock > 0)
    .toggleClass('low-stock', stock > 0 && stock < 10)
    .toggleClass('out-of-stock', stock === 0);
});
```

## classList vs className

我们使用 `classList` 而不是操作 `className` 字符串：

```javascript
// classList 方法（推荐）
element.classList.add('class1');
element.classList.remove('class2');
element.classList.toggle('class3');
element.classList.contains('class4');

// className 操作（麻烦）
element.className += ' class1';
element.className = element.className.replace(/\bclass2\b/, '');
```

`classList` 的优势：
- 更简洁
- 自动处理空格
- 不会重复添加
- 性能更好

## 链式调用

类操作可以链式调用：

```javascript
$('.element')
  .addClass('visible')
  .removeClass('hidden')
  .toggleClass('animate')
  .addClass('ready');
```

## 与 attr() 的关系

```javascript
// 这两种方式结果相同
$('div').addClass('new');
$('div').attr('class', $('div').attr('class') + ' new');

// 但 addClass 更安全，会处理：
// - 去重
// - 空格
// - 多个元素
```

## 本章小结

类操作方法：

| 方法 | 功能 | 返回 |
|------|------|------|
| `addClass()` | 添加类 | jQuery |
| `removeClass()` | 移除类 | jQuery |
| `toggleClass()` | 切换类 | jQuery |
| `hasClass()` | 检查类 | Boolean |

共同特点：

- 支持多个类（空格分隔）
- 支持函数参数
- 使用 classList API

下一章，我们实现样式读取方法：`css()`。

---

**思考题**：如何实现一个 `replaceClass(oldClass, newClass)` 方法，原子性地替换类？
