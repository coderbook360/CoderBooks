# 位置系列：offset 与 position

jQuery 提供了两个位置方法：`offset()` 返回相对于文档的位置，`position()` 返回相对于定位父元素的位置。

## 两种位置的区别

```
+------------------+ document
|                  |
|  +------------+  |  position: relative (offsetParent)
|  |   margin   |  |
|  |  +------+  |  |
|  |  | elem |  |  |
|  |  +------+  |  |
|  +------------+  |
|                  |
+------------------+

offset()   → 相对于 document 左上角
position() → 相对于 offsetParent 的内容区
```

## offset()

### 获取位置

```javascript
const pos = $('.box').offset();
console.log(pos.left, pos.top);  // 相对于文档
```

### 实现

```javascript
jQuery.fn.offset = function(options) {
  // 设置模式
  if (options !== undefined) {
    return setOffset(this, options);
  }
  
  // 获取模式
  const elem = this[0];
  if (!elem) return undefined;
  
  // 获取边界矩形
  const rect = elem.getBoundingClientRect();
  
  // 加上滚动偏移
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
};
```

`getBoundingClientRect()` 返回相对于视口的位置，加上滚动距离就是相对于文档的位置。

### 设置位置

```javascript
$('.box').offset({ top: 100, left: 200 });
```

设置位置需要计算当前偏移并调整：

```javascript
function setOffset($elem, options) {
  return $elem.each(function() {
    const elem = this;
    const position = getComputedStyle(elem).position;
    
    // 必须是定位元素
    if (position === 'static') {
      elem.style.position = 'relative';
    }
    
    const currentOffset = $elem.offset();
    const currentCSS = {
      top: parseFloat(getComputedStyle(elem).top) || 0,
      left: parseFloat(getComputedStyle(elem).left) || 0
    };
    
    const props = {};
    
    if (options.top !== undefined) {
      props.top = options.top - currentOffset.top + currentCSS.top;
    }
    if (options.left !== undefined) {
      props.left = options.left - currentOffset.left + currentCSS.left;
    }
    
    $elem.css(props);
  });
}
```

## position()

### 获取位置

```javascript
const pos = $('.box').position();
console.log(pos.left, pos.top);  // 相对于定位父元素
```

### 实现

```javascript
jQuery.fn.position = function() {
  const elem = this[0];
  if (!elem) return undefined;
  
  // 获取 offsetParent
  let offsetParent = elem.offsetParent || document.documentElement;
  
  // 获取元素相对于文档的位置
  const offset = this.offset();
  
  // 获取 offsetParent 相对于文档的位置
  let parentOffset = { top: 0, left: 0 };
  
  if (offsetParent !== document.documentElement) {
    const $parent = new jQuery(offsetParent);
    parentOffset = $parent.offset();
    
    // 加上 offsetParent 的边框
    parentOffset.top += parseFloat(getComputedStyle(offsetParent).borderTopWidth) || 0;
    parentOffset.left += parseFloat(getComputedStyle(offsetParent).borderLeftWidth) || 0;
  }
  
  // 减去元素的 margin
  return {
    top: offset.top - parentOffset.top - 
         (parseFloat(getComputedStyle(elem).marginTop) || 0),
    left: offset.left - parentOffset.left - 
          (parseFloat(getComputedStyle(elem).marginLeft) || 0)
  };
};
```

## offsetParent()

获取定位父元素：

```javascript
jQuery.fn.offsetParent = function() {
  return this.map(function() {
    let offsetParent = this.offsetParent;
    
    while (offsetParent && getComputedStyle(offsetParent).position === 'static') {
      offsetParent = offsetParent.offsetParent;
    }
    
    return offsetParent || document.documentElement;
  });
};
```

## 完整实现

```javascript
// src/offset/offset.js

function parseNumber(value) {
  return parseFloat(value) || 0;
}

export function installOffsetMethods(jQuery) {
  
  jQuery.fn.offset = function(options) {
    // 函数参数
    if (typeof options === 'function') {
      return this.each(function(index) {
        const $this = new jQuery(this);
        const currentOffset = $this.offset();
        const newOffset = options.call(this, index, currentOffset);
        $this.offset(newOffset);
      });
    }
    
    // 设置模式
    if (options !== undefined) {
      return this.each(function() {
        const elem = this;
        const $elem = new jQuery(elem);
        const style = getComputedStyle(elem);
        
        // 确保是定位元素
        if (style.position === 'static') {
          elem.style.position = 'relative';
        }
        
        const currentOffset = $elem.offset();
        const currentTop = parseNumber(style.top);
        const currentLeft = parseNumber(style.left);
        
        if (options.top !== undefined) {
          elem.style.top = (options.top - currentOffset.top + currentTop) + 'px';
        }
        if (options.left !== undefined) {
          elem.style.left = (options.left - currentOffset.left + currentLeft) + 'px';
        }
      });
    }
    
    // 获取模式
    const elem = this[0];
    if (!elem) return undefined;
    
    const rect = elem.getBoundingClientRect();
    
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX
    };
  };
  
  jQuery.fn.position = function() {
    const elem = this[0];
    if (!elem) return undefined;
    
    const offset = this.offset();
    let offsetParent = elem.offsetParent || document.documentElement;
    let parentOffset = { top: 0, left: 0 };
    
    // 计算 offsetParent 的位置
    if (offsetParent !== document.documentElement) {
      const parentRect = offsetParent.getBoundingClientRect();
      parentOffset = {
        top: parentRect.top + window.scrollY,
        left: parentRect.left + window.scrollX
      };
      
      // 加上边框
      const parentStyle = getComputedStyle(offsetParent);
      parentOffset.top += parseNumber(parentStyle.borderTopWidth);
      parentOffset.left += parseNumber(parentStyle.borderLeftWidth);
    }
    
    // 减去元素的 margin
    const elemStyle = getComputedStyle(elem);
    
    return {
      top: offset.top - parentOffset.top - parseNumber(elemStyle.marginTop),
      left: offset.left - parentOffset.left - parseNumber(elemStyle.marginLeft)
    };
  };
  
  jQuery.fn.offsetParent = function() {
    return this.map(function() {
      let parent = this.offsetParent;
      
      while (parent && getComputedStyle(parent).position === 'static') {
        parent = parent.offsetParent;
      }
      
      return parent || document.documentElement;
    });
  };
}
```

## offset vs position 场景对比

### 使用 offset 的场景

```javascript
// 1. 定位到页面特定位置
$('.popup').offset({
  top: event.pageY,
  left: event.pageX
});

// 2. 滚动到元素位置
const targetTop = $('#section').offset().top;
window.scrollTo(0, targetTop);

// 3. 检测元素是否在视口中
function isInViewport($elem) {
  const offset = $elem.offset();
  const scrollTop = window.scrollY;
  const viewHeight = window.innerHeight;
  
  return offset.top >= scrollTop && 
         offset.top < scrollTop + viewHeight;
}
```

### 使用 position 的场景

```javascript
// 1. 在容器内定位
const pos = $('.item').position();
$('.indicator').css({
  top: pos.top,
  left: pos.left
});

// 2. 拖拽时保持相对位置
$('.draggable').on('mousedown', function(e) {
  const startPos = $(this).position();
  const startMouse = { x: e.pageX, y: e.pageY };
  
  $(document).on('mousemove.drag', function(e) {
    $(this).css({
      top: startPos.top + (e.pageY - startMouse.y),
      left: startPos.left + (e.pageX - startMouse.x)
    });
  });
});
```

## 实际应用场景

### 场景 1：工具提示定位

```javascript
function showTooltip($target, message) {
  const offset = $target.offset();
  const width = $target.outerWidth();
  const height = $target.outerHeight();
  
  $('<div class="tooltip">')
    .text(message)
    .css({
      position: 'absolute',
      top: offset.top + height + 5,
      left: offset.left + width / 2
    })
    .appendTo('body');
}
```

### 场景 2：滚动动画

```javascript
function scrollToElement($elem, duration = 500) {
  const targetTop = $elem.offset().top;
  const startTop = window.scrollY;
  const distance = targetTop - startTop;
  const startTime = performance.now();
  
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    window.scrollTo(0, startTop + distance * progress);
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}
```

### 场景 3：元素对齐

```javascript
function alignRight($source, $target) {
  const sourceOffset = $source.offset();
  const sourceWidth = $source.outerWidth();
  const targetWidth = $target.outerWidth();
  
  $target.offset({
    top: sourceOffset.top,
    left: sourceOffset.left + sourceWidth - targetWidth
  });
}
```

### 场景 4：碰撞检测

```javascript
function isColliding($elem1, $elem2) {
  const r1 = {
    ...($elem1.offset()),
    width: $elem1.outerWidth(),
    height: $elem1.outerHeight()
  };
  
  const r2 = {
    ...($elem2.offset()),
    width: $elem2.outerWidth(),
    height: $elem2.outerHeight()
  };
  
  return !(r1.left + r1.width < r2.left ||
           r2.left + r2.width < r1.left ||
           r1.top + r1.height < r2.top ||
           r2.top + r2.height < r1.top);
}
```

## 本章小结

位置方法对比：

| 方法 | 参考点 | 用途 |
|------|--------|------|
| `offset()` | 文档左上角 | 绝对定位、页面滚动 |
| `position()` | offsetParent | 相对定位、容器内定位 |
| `offsetParent()` | - | 获取定位父元素 |

核心 API：

- `getBoundingClientRect()`：获取视口相对位置
- `window.scrollX/Y`：页面滚动距离
- `offsetParent`：定位父元素

下一章，我们实现滚动相关方法。

---

**思考题**：`getBoundingClientRect()` 在元素使用 CSS `transform` 时返回的是变换后的位置还是原始位置？这对定位计算有什么影响？
