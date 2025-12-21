# 尺寸系列：width 与 height

jQuery 提供了一系列尺寸方法：`width()`、`height()`、`innerWidth()`、`innerHeight()`、`outerWidth()`、`outerHeight()`。它们返回数值而非字符串，使用更方便。

## 尺寸概念

一个元素的尺寸包含多个层次：

```
+------------------------------------------+
|              margin                       |
|  +--------------------------------------+ |
|  |            border                    | |
|  |  +--------------------------------+  | |
|  |  |          padding               |  | |
|  |  |  +------------------------+    |  | |
|  |  |  |       content          |    |  | |
|  |  |  +------------------------+    |  | |
|  |  +--------------------------------+  | |
|  +--------------------------------------+ |
+------------------------------------------+
```

- **content**：内容区域
- **padding**：内边距
- **border**：边框
- **margin**：外边距

## 尺寸方法对照

| 方法 | 包含内容 | 对应属性 |
|------|----------|----------|
| `width()` | content | - |
| `innerWidth()` | content + padding | clientWidth |
| `outerWidth()` | content + padding + border | offsetWidth |
| `outerWidth(true)` | content + padding + border + margin | - |

## 基础实现

### width() 和 height()

获取内容区域尺寸：

```javascript
jQuery.fn.width = function(value) {
  // 设置模式
  if (value !== undefined) {
    return this.css('width', value);
  }
  
  // 获取模式
  const elem = this[0];
  if (!elem) return undefined;
  
  // window
  if (elem === window) {
    return window.innerWidth;
  }
  
  // document
  if (elem.nodeType === 9) {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    );
  }
  
  // 普通元素：使用 getBoundingClientRect
  return elem.getBoundingClientRect().width -
         parseFloat(getComputedStyle(elem).paddingLeft) -
         parseFloat(getComputedStyle(elem).paddingRight) -
         parseFloat(getComputedStyle(elem).borderLeftWidth) -
         parseFloat(getComputedStyle(elem).borderRightWidth);
};

jQuery.fn.height = function(value) {
  if (value !== undefined) {
    return this.css('height', value);
  }
  
  const elem = this[0];
  if (!elem) return undefined;
  
  if (elem === window) {
    return window.innerHeight;
  }
  
  if (elem.nodeType === 9) {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
  }
  
  return elem.getBoundingClientRect().height -
         parseFloat(getComputedStyle(elem).paddingTop) -
         parseFloat(getComputedStyle(elem).paddingBottom) -
         parseFloat(getComputedStyle(elem).borderTopWidth) -
         parseFloat(getComputedStyle(elem).borderBottomWidth);
};
```

### innerWidth() 和 innerHeight()

包含 padding：

```javascript
jQuery.fn.innerWidth = function() {
  const elem = this[0];
  if (!elem) return undefined;
  
  if (elem === window) {
    return window.innerWidth;
  }
  
  // clientWidth = content + padding
  return elem.clientWidth;
};

jQuery.fn.innerHeight = function() {
  const elem = this[0];
  if (!elem) return undefined;
  
  if (elem === window) {
    return window.innerHeight;
  }
  
  return elem.clientHeight;
};
```

### outerWidth() 和 outerHeight()

包含 padding 和 border，可选 margin：

```javascript
jQuery.fn.outerWidth = function(includeMargin) {
  const elem = this[0];
  if (!elem) return undefined;
  
  if (elem === window) {
    return window.outerWidth;
  }
  
  // offsetWidth = content + padding + border
  let width = elem.offsetWidth;
  
  if (includeMargin) {
    const style = getComputedStyle(elem);
    width += parseFloat(style.marginLeft) + parseFloat(style.marginRight);
  }
  
  return width;
};

jQuery.fn.outerHeight = function(includeMargin) {
  const elem = this[0];
  if (!elem) return undefined;
  
  if (elem === window) {
    return window.outerHeight;
  }
  
  let height = elem.offsetHeight;
  
  if (includeMargin) {
    const style = getComputedStyle(elem);
    height += parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  }
  
  return height;
};
```

## 完整实现

```javascript
// src/dimensions/dimensions.js

function getComputedValue(elem, prop) {
  return parseFloat(getComputedStyle(elem)[prop]) || 0;
}

export function installDimensionMethods(jQuery) {
  
  // 生成尺寸方法的工厂函数
  function createDimensionMethod(dimension) {
    const prop = dimension === 'width' ? 'Width' : 'Height';
    const lower = dimension;
    const upper = prop;
    
    return function(value) {
      const elem = this[0];
      
      // 设置模式
      if (value !== undefined) {
        return this.css(lower, value);
      }
      
      if (!elem) return undefined;
      
      // window
      if (elem === window) {
        return window['inner' + upper];
      }
      
      // document
      if (elem.nodeType === 9) {
        const doc = elem.documentElement;
        return Math.max(
          elem.body['scroll' + upper],
          doc['scroll' + upper],
          elem.body['offset' + upper],
          doc['offset' + upper],
          doc['client' + upper]
        );
      }
      
      // 普通元素：content 尺寸
      const rect = elem.getBoundingClientRect();
      const style = getComputedStyle(elem);
      
      if (dimension === 'width') {
        return rect.width -
               getComputedValue(elem, 'paddingLeft') -
               getComputedValue(elem, 'paddingRight') -
               getComputedValue(elem, 'borderLeftWidth') -
               getComputedValue(elem, 'borderRightWidth');
      } else {
        return rect.height -
               getComputedValue(elem, 'paddingTop') -
               getComputedValue(elem, 'paddingBottom') -
               getComputedValue(elem, 'borderTopWidth') -
               getComputedValue(elem, 'borderBottomWidth');
      }
    };
  }
  
  // 生成 inner 方法
  function createInnerMethod(dimension) {
    const upper = dimension === 'width' ? 'Width' : 'Height';
    
    return function() {
      const elem = this[0];
      if (!elem) return undefined;
      
      if (elem === window) {
        return window['inner' + upper];
      }
      
      return elem['client' + upper];
    };
  }
  
  // 生成 outer 方法
  function createOuterMethod(dimension) {
    const upper = dimension === 'width' ? 'Width' : 'Height';
    const marginProps = dimension === 'width' 
      ? ['marginLeft', 'marginRight']
      : ['marginTop', 'marginBottom'];
    
    return function(includeMargin) {
      const elem = this[0];
      if (!elem) return undefined;
      
      if (elem === window) {
        return window['outer' + upper];
      }
      
      let size = elem['offset' + upper];
      
      if (includeMargin) {
        size += getComputedValue(elem, marginProps[0]) +
                getComputedValue(elem, marginProps[1]);
      }
      
      return size;
    };
  }
  
  // 安装方法
  jQuery.fn.width = createDimensionMethod('width');
  jQuery.fn.height = createDimensionMethod('height');
  jQuery.fn.innerWidth = createInnerMethod('width');
  jQuery.fn.innerHeight = createInnerMethod('height');
  jQuery.fn.outerWidth = createOuterMethod('width');
  jQuery.fn.outerHeight = createOuterMethod('height');
}
```

## box-sizing 的影响

现代 CSS 通常使用 `box-sizing: border-box`：

```css
* {
  box-sizing: border-box;
}
```

这会影响 `width()` 的计算：

```javascript
// border-box 模式下
// CSS width = content + padding + border
// 我们的 width() 仍然返回 content 尺寸
```

我们的实现不受 `box-sizing` 影响，始终返回正确的内容尺寸。

## 实际应用场景

### 场景 1：居中定位

```javascript
function centerElement($elem) {
  const windowWidth = $(window).width();
  const windowHeight = $(window).height();
  const elemWidth = $elem.outerWidth();
  const elemHeight = $elem.outerHeight();
  
  $elem.css({
    left: (windowWidth - elemWidth) / 2,
    top: (windowHeight - elemHeight) / 2
  });
}
```

### 场景 2：等高布局

```javascript
function equalizeHeights($elements) {
  let maxHeight = 0;
  
  $elements.each(function() {
    const h = $(this).height();
    if (h > maxHeight) maxHeight = h;
  });
  
  $elements.height(maxHeight);
}
```

### 场景 3：响应式检测

```javascript
function getViewportType() {
  const width = $(window).width();
  
  if (width < 576) return 'xs';
  if (width < 768) return 'sm';
  if (width < 992) return 'md';
  if (width < 1200) return 'lg';
  return 'xl';
}
```

### 场景 4：内容自适应

```javascript
// 使容器高度适应内容
$('.container').height($('.container')[0].scrollHeight);
```

### 场景 5：计算可用空间

```javascript
function getAvailableHeight() {
  const windowHeight = $(window).height();
  const headerHeight = $('header').outerHeight(true);
  const footerHeight = $('footer').outerHeight(true);
  
  return windowHeight - headerHeight - footerHeight;
}

$('.main-content').height(getAvailableHeight());
```

## 与 CSS 方法的区别

```javascript
// css() 返回字符串
$('.box').css('width')      // "100px"

// width() 返回数值
$('.box').width()           // 100

// css() 可以获取任何样式
$('.box').css('display')    // "block"

// width() 专注于尺寸计算
$('.box').width()           // 准确的内容宽度
```

## 本章小结

尺寸方法体系：

| 方法 | 返回值 | 包含 |
|------|--------|------|
| `width()` | 数值 | content |
| `innerWidth()` | 数值 | content + padding |
| `outerWidth()` | 数值 | content + padding + border |
| `outerWidth(true)` | 数值 | + margin |

核心 API：

- `clientWidth/Height`：padding-box 尺寸
- `offsetWidth/Height`：border-box 尺寸
- `getBoundingClientRect()`：精确的边界尺寸

下一章，我们实现位置相关方法。

---

**思考题**：`element.offsetWidth` 返回整数，而 `getBoundingClientRect().width` 返回小数。在高 DPI 屏幕上，哪个更准确？为什么？
