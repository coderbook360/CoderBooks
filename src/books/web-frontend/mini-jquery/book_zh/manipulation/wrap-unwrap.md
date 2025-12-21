# 包装元素：wrap/unwrap

包装方法用于给元素添加或移除外层包装。这一章，我们实现四个包装相关的方法。

## wrap()：包装每个元素

`wrap()` 用新元素包装每个匹配的元素：

```javascript
$('.item').wrap('<div class="wrapper"></div>');
```

执行前：
```html
<span class="item">A</span>
<span class="item">B</span>
```

执行后：
```html
<div class="wrapper">
  <span class="item">A</span>
</div>
<div class="wrapper">
  <span class="item">B</span>
</div>
```

每个元素都有自己的包装。

## wrapAll()：包装所有元素

`wrapAll()` 用一个元素包装所有匹配的元素：

```javascript
$('.item').wrapAll('<div class="wrapper"></div>');
```

执行后：
```html
<div class="wrapper">
  <span class="item">A</span>
  <span class="item">B</span>
</div>
```

所有元素共享一个包装。

## wrapInner()：包装内容

`wrapInner()` 包装元素的内容，而不是元素本身：

```javascript
$('.item').wrapInner('<strong></strong>');
```

执行前：
```html
<span class="item">text</span>
```

执行后：
```html
<span class="item"><strong>text</strong></span>
```

## unwrap()：移除包装

`unwrap()` 移除元素的父元素（包装）：

```javascript
$('.item').unwrap();
```

执行前：
```html
<div class="wrapper">
  <span class="item">A</span>
</div>
```

执行后：
```html
<span class="item">A</span>
```

## wrap() 实现

```javascript
jQuery.fn.wrap = function(wrapper) {
  // 处理函数参数
  const getWrapper = typeof wrapper === 'function' 
    ? wrapper 
    : () => wrapper;
  
  return this.each(function(index) {
    // 获取包装元素
    let wrap = getWrapper.call(this, index);
    
    // 解析为 DOM 元素
    if (typeof wrap === 'string') {
      const template = document.createElement('template');
      template.innerHTML = wrap.trim();
      wrap = template.content.firstElementChild;
    } else if (wrap.jquery) {
      wrap = wrap[0];
    }
    
    // 克隆包装（每个元素用独立的包装）
    wrap = wrap.cloneNode(true);
    
    // 找到包装的最内层元素
    let innermost = wrap;
    while (innermost.firstElementChild) {
      innermost = innermost.firstElementChild;
    }
    
    // 在当前元素位置插入包装
    this.parentNode.insertBefore(wrap, this);
    
    // 把当前元素移到包装内
    innermost.appendChild(this);
  });
};
```

### 关键点：最内层元素

包装可能是嵌套的：

```javascript
$('.item').wrap('<div class="outer"><div class="inner"></div></div>');
```

元素应该放在最内层：

```html
<div class="outer">
  <div class="inner">
    <span class="item">A</span>  <!-- 放在 .inner 里 -->
  </div>
</div>
```

## wrapAll() 实现

```javascript
jQuery.fn.wrapAll = function(wrapper) {
  if (!this.length) return this;
  
  // 处理函数参数
  if (typeof wrapper === 'function') {
    return this.each(function(index) {
      jQuery(this).wrapAll(wrapper.call(this, index));
    });
  }
  
  // 解析包装元素
  let wrap = wrapper;
  if (typeof wrap === 'string') {
    const template = document.createElement('template');
    template.innerHTML = wrap.trim();
    wrap = template.content.firstElementChild.cloneNode(true);
  } else if (wrap.jquery) {
    wrap = wrap[0].cloneNode(true);
  } else if (wrap.nodeType) {
    wrap = wrap.cloneNode(true);
  }
  
  // 找到最内层
  let innermost = wrap;
  while (innermost.firstElementChild) {
    innermost = innermost.firstElementChild;
  }
  
  // 在第一个元素的位置插入包装
  const first = this[0];
  first.parentNode.insertBefore(wrap, first);
  
  // 把所有元素移到包装内
  this.each(function() {
    innermost.appendChild(this);
  });
  
  return this;
};
```

## wrapInner() 实现

```javascript
jQuery.fn.wrapInner = function(wrapper) {
  return this.each(function(index) {
    const $this = jQuery(this);
    const contents = $this.contents();
    
    if (contents.length) {
      // 有内容，包装内容
      contents.wrapAll(
        typeof wrapper === 'function' 
          ? wrapper.call(this, index) 
          : wrapper
      );
    } else {
      // 无内容，直接 append
      $this.append(wrapper);
    }
  });
};
```

## unwrap() 实现

```javascript
jQuery.fn.unwrap = function(selector) {
  // 获取所有父元素（去重）
  this.parent()
    // 过滤：如果指定了选择器，只移除匹配的父元素
    .filter(selector || '*')
    // 排除 body 和 html
    .not('body, html')
    .each(function() {
      const $parent = jQuery(this);
      // 用子元素替换父元素
      $parent.replaceWith($parent.contents());
    });
  
  return this;
};
```

### unwrap 的选择器参数

可以指定只移除匹配的包装：

```javascript
// 只移除 .wrapper 包装
$('.item').unwrap('.wrapper');

// 不会移除其他类型的父元素
$('.item').unwrap('div');  // 只移除 div 父元素
```

## 完整实现

```javascript
// src/manipulation/wrap.js

export function installWrapMethods(jQuery) {
  
  jQuery.fn.wrap = function(wrapper) {
    const getWrapper = typeof wrapper === 'function' 
      ? wrapper 
      : () => wrapper;
    
    return this.each(function(index) {
      let wrap = getWrapper.call(this, index);
      
      // 解析
      if (typeof wrap === 'string') {
        const template = document.createElement('template');
        template.innerHTML = wrap.trim();
        wrap = template.content.firstElementChild;
      } else if (wrap?.jquery) {
        wrap = wrap[0];
      }
      
      if (!wrap) return;
      
      // 克隆
      wrap = wrap.cloneNode(true);
      
      // 最内层
      let innermost = wrap;
      while (innermost.firstElementChild) {
        innermost = innermost.firstElementChild;
      }
      
      // 插入包装
      if (this.parentNode) {
        this.parentNode.insertBefore(wrap, this);
        innermost.appendChild(this);
      }
    });
  };
  
  jQuery.fn.wrapAll = function(wrapper) {
    if (!this.length) return this;
    
    if (typeof wrapper === 'function') {
      return this.each(function(index) {
        jQuery(this).wrapAll(wrapper.call(this, index));
      });
    }
    
    let wrap = wrapper;
    if (typeof wrap === 'string') {
      const template = document.createElement('template');
      template.innerHTML = wrap.trim();
      wrap = template.content.firstElementChild;
    } else if (wrap?.jquery) {
      wrap = wrap[0];
    }
    
    if (!wrap) return this;
    
    wrap = wrap.cloneNode(true);
    
    let innermost = wrap;
    while (innermost.firstElementChild) {
      innermost = innermost.firstElementChild;
    }
    
    const first = this[0];
    if (first.parentNode) {
      first.parentNode.insertBefore(wrap, first);
      this.each(function() {
        innermost.appendChild(this);
      });
    }
    
    return this;
  };
  
  jQuery.fn.wrapInner = function(wrapper) {
    return this.each(function(index) {
      const $this = jQuery(this);
      const contents = $this.contents();
      
      const html = typeof wrapper === 'function'
        ? wrapper.call(this, index)
        : wrapper;
      
      if (contents.length) {
        contents.wrapAll(html);
      } else {
        $this.append(html);
      }
    });
  };
  
  jQuery.fn.unwrap = function(selector) {
    this.parent()
      .filter(selector || '*')
      .not('body, html')
      .each(function() {
        const $parent = jQuery(this);
        $parent.replaceWith($parent.contents());
      });
    
    return this;
  };
}
```

## 实际应用场景

### 场景 1：添加链接包装

```javascript
// 给图片添加链接
$('img').wrap(function() {
  return `<a href="${this.src}" target="_blank"></a>`;
});
```

### 场景 2：表单分组

```javascript
// 把相关字段包装在一起
$('.form-field').wrapAll('<fieldset></fieldset>');
```

### 场景 3：添加外框

```javascript
// 给代码块添加容器
$('pre code').wrap('<div class="code-container"></div>');
```

### 场景 4：强调内容

```javascript
// 给段落内容加粗
$('.important').wrapInner('<strong></strong>');
```

### 场景 5：简化结构

```javascript
// 移除不需要的包装层
$('.content').unwrap('.legacy-wrapper');
```

### 场景 6：响应式包装

```javascript
// 根据条件添加或移除包装
if (isMobile) {
  $('.card').wrap('<div class="mobile-stack"></div>');
} else {
  $('.card').unwrap('.mobile-stack');
}
```

## 包装方法对比

| 方法 | 作用对象 | 结果 |
|------|----------|------|
| `wrap()` | 每个元素 | 每个元素独立包装 |
| `wrapAll()` | 所有元素 | 所有元素共用包装 |
| `wrapInner()` | 元素内容 | 内容被包装 |
| `unwrap()` | 父元素 | 移除父元素 |

## 本章小结

包装方法的核心要点：

- **wrap()**：每个元素独立包装，需要克隆
- **wrapAll()**：所有元素共用一个包装
- **wrapInner()**：使用 contents() + wrapAll() 实现
- **unwrap()**：使用 replaceWith(contents()) 实现

关键实现技巧：

- **找最内层**：循环查找 firstElementChild
- **insertBefore + appendChild**：先插入包装，再移入元素

下一章，我们实现克隆方法：`clone()`。

---

**思考题**：如果包装元素本身已经有内容，会发生什么？例如 `$('.item').wrap('<div>existing</div>')`
