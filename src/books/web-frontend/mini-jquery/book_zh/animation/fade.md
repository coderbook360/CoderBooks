# fadeIn 与 fadeOut：淡入淡出

淡入淡出是最常用的动画效果，只改变透明度，视觉上更加优雅。

## 基本用法

```javascript
$('.box').fadeIn(400);   // 淡入
$('.box').fadeOut(400);  // 淡出
$('.box').fadeToggle(400); // 切换
$('.box').fadeTo(400, 0.5); // 淡到指定透明度
```

## fadeIn 效果

```
opacity: 0 → opacity: 1
display: none → display: block
```

## fadeOut 效果

```
opacity: 1 → opacity: 0
然后 display: block → display: none
```

## 与 show/hide 的区别

| 方法 | 变化的属性 |
|------|------------|
| show/hide | width, height, opacity |
| fadeIn/fadeOut | 只有 opacity |

fade 系列更平滑，不会改变元素尺寸。

## fadeIn 实现

```javascript
jQuery.fn.fadeIn = function(duration, easing, callback) {
  // 参数规范化
  if (typeof easing === 'function') {
    callback = easing;
    easing = undefined;
  }
  
  return this.each(function() {
    const elem = this;
    const $elem = $(elem);
    
    // 已经可见
    if (getComputedStyle(elem).display !== 'none' && 
        parseFloat(getComputedStyle(elem).opacity) === 1) {
      return;
    }
    
    // 显示但透明
    if (getComputedStyle(elem).display === 'none') {
      elem.style.display = '';
      // 如果还是 none，设为 block
      if (getComputedStyle(elem).display === 'none') {
        elem.style.display = 'block';
      }
    }
    
    elem.style.opacity = '0';
    
    // 动画到透明度 1
    $elem.animate({ opacity: 1 }, {
      duration: normalizeDuration(duration),
      easing,
      complete: callback
    });
  });
};
```

## fadeOut 实现

```javascript
jQuery.fn.fadeOut = function(duration, easing, callback) {
  if (typeof easing === 'function') {
    callback = easing;
    easing = undefined;
  }
  
  return this.each(function() {
    const elem = this;
    const $elem = $(elem);
    
    // 已经隐藏
    if (getComputedStyle(elem).display === 'none') {
      return;
    }
    
    // 动画到透明度 0
    $elem.animate({ opacity: 0 }, {
      duration: normalizeDuration(duration),
      easing,
      complete() {
        elem.style.display = 'none';
        elem.style.opacity = '';  // 清除内联样式
        callback?.call(elem);
      }
    });
  });
};
```

## fadeToggle 实现

```javascript
jQuery.fn.fadeToggle = function(duration, easing, callback) {
  return this.each(function() {
    const isHidden = getComputedStyle(this).display === 'none' ||
                     parseFloat(getComputedStyle(this).opacity) === 0;
    
    $(this)[isHidden ? 'fadeIn' : 'fadeOut'](duration, easing, callback);
  });
};
```

## fadeTo 实现

淡到指定透明度（不隐藏元素）：

```javascript
jQuery.fn.fadeTo = function(duration, opacity, easing, callback) {
  if (typeof easing === 'function') {
    callback = easing;
    easing = undefined;
  }
  
  return this.each(function() {
    const elem = this;
    const $elem = $(elem);
    
    // 如果隐藏，先显示
    if (getComputedStyle(elem).display === 'none') {
      elem.style.display = 'block';
      elem.style.opacity = '0';
    }
    
    $elem.animate({ opacity }, {
      duration: normalizeDuration(duration),
      easing,
      complete: callback
    });
  });
};
```

## 完整实现

```javascript
// src/animation/fade.js

const speeds = {
  slow: 600,
  fast: 200,
  _default: 400
};

function normalizeDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (duration in speeds) return speeds[duration];
  return speeds._default;
}

export function installFadeMethods(jQuery) {
  
  jQuery.fn.fadeIn = function(duration, easing, callback) {
    if (typeof duration === 'function') {
      callback = duration;
      duration = undefined;
      easing = undefined;
    } else if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    const dur = normalizeDuration(duration);
    
    return this.each(function() {
      const elem = this;
      const style = getComputedStyle(elem);
      
      // 显示元素
      if (style.display === 'none') {
        elem.style.opacity = '0';
        elem.style.display = '';
        if (getComputedStyle(elem).display === 'none') {
          elem.style.display = 'block';
        }
      }
      
      $(elem).animate({ opacity: 1 }, {
        duration: dur,
        easing,
        complete: callback
      });
    });
  };
  
  jQuery.fn.fadeOut = function(duration, easing, callback) {
    if (typeof duration === 'function') {
      callback = duration;
      duration = undefined;
      easing = undefined;
    } else if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    const dur = normalizeDuration(duration);
    
    return this.each(function() {
      const elem = this;
      
      if (getComputedStyle(elem).display === 'none') {
        callback?.call(elem);
        return;
      }
      
      $(elem).animate({ opacity: 0 }, {
        duration: dur,
        easing,
        complete() {
          elem.style.display = 'none';
          elem.style.opacity = '';
          callback?.call(elem);
        }
      });
    });
  };
  
  jQuery.fn.fadeToggle = function(duration, easing, callback) {
    return this.each(function() {
      const style = getComputedStyle(this);
      const isHidden = style.display === 'none' || 
                       parseFloat(style.opacity) === 0;
      
      $(this)[isHidden ? 'fadeIn' : 'fadeOut'](duration, easing, callback);
    });
  };
  
  jQuery.fn.fadeTo = function(duration, opacity, easing, callback) {
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    const dur = normalizeDuration(duration);
    
    return this.each(function() {
      const elem = this;
      
      if (getComputedStyle(elem).display === 'none') {
        elem.style.opacity = '0';
        elem.style.display = 'block';
      }
      
      $(elem).animate({ opacity }, {
        duration: dur,
        easing,
        complete: callback
      });
    });
  };
}
```

## 实际应用场景

### 场景 1：模态框

```javascript
function showModal() {
  $('.overlay').fadeIn(200);
  $('.modal').fadeIn(300);
}

function hideModal() {
  $('.modal').fadeOut(200);
  $('.overlay').fadeOut(300);
}
```

### 场景 2：图片轮播

```javascript
let current = 0;
const $slides = $('.slide');

function nextSlide() {
  $slides.eq(current).fadeOut(500);
  current = (current + 1) % $slides.length;
  $slides.eq(current).fadeIn(500);
}

setInterval(nextSlide, 3000);
```

### 场景 3：通知提示

```javascript
function showToast(message, duration = 3000) {
  const $toast = $('<div class="toast">').text(message);
  
  $('body').append($toast);
  
  $toast
    .fadeIn(200)
    .delay(duration)
    .fadeOut(200, function() {
      $(this).remove();
    });
}
```

### 场景 4：悬停效果

```javascript
$('.card').hover(
  function() {
    $(this).find('.overlay').stop().fadeTo(200, 0.8);
  },
  function() {
    $(this).find('.overlay').stop().fadeOut(200);
  }
);
```

### 场景 5：加载状态

```javascript
function setLoading(isLoading) {
  if (isLoading) {
    $('.content').fadeTo(200, 0.5);
    $('.spinner').fadeIn(200);
  } else {
    $('.spinner').fadeOut(200);
    $('.content').fadeTo(200, 1);
  }
}
```

### 场景 6：高亮效果

```javascript
function highlight($elem) {
  $elem
    .fadeTo(100, 0.3)
    .fadeTo(100, 1)
    .fadeTo(100, 0.3)
    .fadeTo(100, 1);
}
```

## 与 CSS 过渡对比

```css
/* CSS 方式 */
.fade-enter {
  opacity: 0;
}
.fade-enter-active {
  opacity: 1;
  transition: opacity 0.4s;
}
```

```javascript
// jQuery 方式
$('.box').fadeIn(400);
```

CSS 过渡更适合简单场景，jQuery 动画更适合需要回调和复杂控制的场景。

## 本章小结

fade 系列方法：

- **fadeIn()**：淡入显示
- **fadeOut()**：淡出隐藏
- **fadeToggle()**：切换淡入淡出
- **fadeTo()**：淡到指定透明度

实现要点：

- 只操作 opacity 属性
- fadeOut 完成后设置 display: none
- fadeTo 不改变 display

下一章，我们实现滑动效果。

---

**思考题**：`fadeOut()` 后元素的 opacity 被清除了，但如果元素有 CSS 设置的 opacity: 0.5，恢复后应该是多少？
