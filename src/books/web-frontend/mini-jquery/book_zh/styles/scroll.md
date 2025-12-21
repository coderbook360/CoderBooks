# 滚动系列：scrollTop 与 scrollLeft

`scrollTop()` 和 `scrollLeft()` 用于获取或设置元素的滚动位置。

## 基础用法

```javascript
// 获取滚动位置
const top = $(window).scrollTop();
const left = $('.container').scrollLeft();

// 设置滚动位置
$(window).scrollTop(0);
$('.container').scrollLeft(100);
```

## window 的滚动

对于 window 对象，使用 `window.scrollY` 和 `window.scrollX`：

```javascript
// 获取
window.scrollY  // 垂直滚动距离
window.scrollX  // 水平滚动距离

// 设置
window.scrollTo(x, y)
window.scrollTo({ top: y, left: x, behavior: 'smooth' })
```

## 元素的滚动

对于普通元素，使用 `element.scrollTop` 和 `element.scrollLeft`：

```javascript
element.scrollTop   // 获取
element.scrollTop = 100  // 设置
```

## 实现

```javascript
// src/offset/scroll.js

export function installScrollMethods(jQuery) {
  
  jQuery.fn.scrollTop = function(value) {
    const elem = this[0];
    
    // 没有元素
    if (!elem) {
      return value === undefined ? undefined : this;
    }
    
    const isWindow = elem === window || elem === document;
    
    // 设置模式
    if (value !== undefined) {
      return this.each(function() {
        if (this === window || this === document) {
          window.scrollTo(window.scrollX, value);
        } else {
          this.scrollTop = value;
        }
      });
    }
    
    // 获取模式
    if (isWindow) {
      return window.scrollY;
    }
    
    return elem.scrollTop;
  };
  
  jQuery.fn.scrollLeft = function(value) {
    const elem = this[0];
    
    if (!elem) {
      return value === undefined ? undefined : this;
    }
    
    const isWindow = elem === window || elem === document;
    
    // 设置模式
    if (value !== undefined) {
      return this.each(function() {
        if (this === window || this === document) {
          window.scrollTo(value, window.scrollY);
        } else {
          this.scrollLeft = value;
        }
      });
    }
    
    // 获取模式
    if (isWindow) {
      return window.scrollX;
    }
    
    return elem.scrollLeft;
  };
}
```

## 滚动范围

元素可滚动的最大距离：

```javascript
// 最大滚动高度
const maxScrollTop = element.scrollHeight - element.clientHeight;

// 最大滚动宽度
const maxScrollLeft = element.scrollWidth - element.clientWidth;
```

## 平滑滚动

### 使用 CSS

```css
html {
  scroll-behavior: smooth;
}
```

### 使用 JavaScript

```javascript
element.scrollTo({
  top: 100,
  behavior: 'smooth'
});
```

### 封装平滑滚动

```javascript
jQuery.fn.smoothScrollTop = function(target, duration = 300) {
  return this.each(function() {
    const elem = this === window ? document.documentElement : this;
    const start = elem.scrollTop;
    const distance = target - start;
    const startTime = performance.now();
    
    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      elem.scrollTop = start + distance * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    
    requestAnimationFrame(step);
  });
};
```

## 实际应用场景

### 场景 1：返回顶部

```javascript
$('#back-to-top').on('click', function() {
  $(window).scrollTop(0);
});

// 带动画
$('#back-to-top').on('click', function() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});
```

### 场景 2：滚动到指定元素

```javascript
function scrollToElement($elem) {
  const targetTop = $elem.offset().top;
  
  window.scrollTo({
    top: targetTop,
    behavior: 'smooth'
  });
}

// 使用
$('.nav-link').on('click', function(e) {
  e.preventDefault();
  const target = $(this).attr('href');
  scrollToElement($(target));
});
```

### 场景 3：无限滚动

```javascript
$(window).on('scroll', function() {
  const scrollTop = $(this).scrollTop();
  const windowHeight = $(this).height();
  const docHeight = $(document).height();
  
  // 距离底部 100px 时加载更多
  if (scrollTop + windowHeight >= docHeight - 100) {
    loadMoreContent();
  }
});
```

### 场景 4：滚动进度指示

```javascript
function updateScrollProgress() {
  const scrollTop = $(window).scrollTop();
  const docHeight = $(document).height();
  const windowHeight = $(window).height();
  
  const progress = scrollTop / (docHeight - windowHeight) * 100;
  
  $('.progress-bar').css('width', progress + '%');
}

$(window).on('scroll', updateScrollProgress);
```

### 场景 5：保存和恢复滚动位置

```javascript
// 保存
function saveScrollPosition(key) {
  sessionStorage.setItem(key, $(window).scrollTop());
}

// 恢复
function restoreScrollPosition(key) {
  const position = sessionStorage.getItem(key);
  if (position) {
    $(window).scrollTop(parseInt(position));
  }
}

// 页面离开时保存
$(window).on('beforeunload', () => {
  saveScrollPosition('pageScroll');
});

// 页面加载时恢复
$(document).ready(() => {
  restoreScrollPosition('pageScroll');
});
```

### 场景 6：滚动方向检测

```javascript
let lastScrollTop = 0;

$(window).on('scroll', function() {
  const scrollTop = $(this).scrollTop();
  
  if (scrollTop > lastScrollTop) {
    // 向下滚动
    $('header').addClass('hidden');
  } else {
    // 向上滚动
    $('header').removeClass('hidden');
  }
  
  lastScrollTop = scrollTop;
});
```

### 场景 7：视差滚动

```javascript
$(window).on('scroll', function() {
  const scrollTop = $(this).scrollTop();
  
  // 背景以一半速度滚动
  $('.parallax-bg').css('transform', 
    `translateY(${scrollTop * 0.5}px)`
  );
});
```

## 滚动事件优化

滚动事件触发频繁，需要优化：

### 节流

```javascript
function throttle(fn, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

$(window).on('scroll', throttle(function() {
  // 处理滚动
}, 100));
```

### 防抖

```javascript
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

$(window).on('scroll', debounce(function() {
  // 滚动停止后执行
}, 200));
```

### requestAnimationFrame

```javascript
let ticking = false;

$(window).on('scroll', function() {
  if (!ticking) {
    requestAnimationFrame(function() {
      // 处理滚动
      ticking = false;
    });
    ticking = true;
  }
});
```

## 完整实现（含辅助方法）

```javascript
// src/offset/scroll.js

export function installScrollMethods(jQuery) {
  
  // scrollTop
  jQuery.fn.scrollTop = function(value) {
    return scrollMethod(this, 'top', value);
  };
  
  // scrollLeft
  jQuery.fn.scrollLeft = function(value) {
    return scrollMethod(this, 'left', value);
  };
  
  function scrollMethod($collection, direction, value) {
    const elem = $collection[0];
    
    if (!elem) {
      return value === undefined ? undefined : $collection;
    }
    
    const isY = direction === 'top';
    const isWindow = elem === window || elem === document;
    
    // 获取模式
    if (value === undefined) {
      if (isWindow) {
        return isY ? window.scrollY : window.scrollX;
      }
      return isY ? elem.scrollTop : elem.scrollLeft;
    }
    
    // 设置模式
    return $collection.each(function() {
      if (this === window || this === document) {
        const x = isY ? window.scrollX : value;
        const y = isY ? value : window.scrollY;
        window.scrollTo(x, y);
      } else {
        if (isY) {
          this.scrollTop = value;
        } else {
          this.scrollLeft = value;
        }
      }
    });
  }
}
```

## 本章小结

滚动方法要点：

- **scrollTop()**：获取/设置垂直滚动距离
- **scrollLeft()**：获取/设置水平滚动距离
- **window 特殊处理**：使用 `scrollY/X` 和 `scrollTo`

常用场景：

- 返回顶部
- 滚动到指定位置
- 无限滚动加载
- 滚动进度指示
- 滚动方向检测

性能优化：

- 节流/防抖
- `requestAnimationFrame`
- 避免在滚动事件中进行 DOM 操作

下一章，我们实现显示隐藏方法。

---

**思考题**：`scroll` 事件在移动端滚动时什么时候触发？与桌面浏览器有什么区别？如何处理这种差异？
