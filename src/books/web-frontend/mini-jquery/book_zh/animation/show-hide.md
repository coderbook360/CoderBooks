# show 与 hide：显示隐藏动画

在第六部分我们实现了即时的 `show()` 和 `hide()`。现在我们让它们支持动画效果。

## 动画版本

```javascript
$('.box').show(400);   // 400ms 内显示
$('.box').hide(400);   // 400ms 内隐藏
$('.box').toggle(400); // 400ms 切换
```

## show 动画的效果

`show()` 动画同时改变三个属性：

- **width**：从 0 到原始宽度
- **height**：从 0 到原始高度
- **opacity**：从 0 到 1

视觉效果是元素从左上角"生长"出来。

## hide 动画的效果

`hide()` 是相反的过程：

- **width**：从原始宽度到 0
- **height**：从原始高度到 0
- **opacity**：从 1 到 0

## 保存原始尺寸

动画前需要记住原始尺寸，以便恢复：

```javascript
const originalData = new WeakMap();

function saveOriginalSize(elem) {
  if (originalData.has(elem)) return;
  
  originalData.set(elem, {
    width: elem.offsetWidth,
    height: elem.offsetHeight,
    overflow: elem.style.overflow,
    display: getComputedStyle(elem).display
  });
}

function getOriginalSize(elem) {
  return originalData.get(elem);
}
```

## show 实现

```javascript
jQuery.fn.show = function(duration, callback) {
  // 无参数：即时显示
  if (duration === undefined) {
    return this.each(function() {
      showImmediate(this);
    });
  }
  
  // 有参数：动画显示
  return this.each(function() {
    const elem = this;
    
    // 已经可见
    if (getComputedStyle(elem).display !== 'none') {
      return;
    }
    
    // 先显示但透明
    const original = getOriginalSize(elem) || {
      width: 'auto',
      height: 'auto'
    };
    
    elem.style.display = original.display || 'block';
    elem.style.overflow = 'hidden';
    elem.style.width = '0px';
    elem.style.height = '0px';
    elem.style.opacity = '0';
    
    // 获取目标尺寸
    const targetWidth = original.width || elem.scrollWidth;
    const targetHeight = original.height || elem.scrollHeight;
    
    // 执行动画
    $(elem).animate({
      width: targetWidth,
      height: targetHeight,
      opacity: 1
    }, duration, function() {
      // 恢复
      elem.style.overflow = original.overflow || '';
      elem.style.width = '';
      elem.style.height = '';
      callback?.call(elem);
    });
  });
};
```

## hide 实现

```javascript
jQuery.fn.hide = function(duration, callback) {
  // 无参数：即时隐藏
  if (duration === undefined) {
    return this.each(function() {
      hideImmediate(this);
    });
  }
  
  // 有参数：动画隐藏
  return this.each(function() {
    const elem = this;
    
    // 已经隐藏
    if (getComputedStyle(elem).display === 'none') {
      return;
    }
    
    // 保存原始尺寸
    saveOriginalSize(elem);
    
    elem.style.overflow = 'hidden';
    
    // 执行动画
    $(elem).animate({
      width: 0,
      height: 0,
      opacity: 0
    }, duration, function() {
      elem.style.display = 'none';
      elem.style.overflow = '';
      elem.style.width = '';
      elem.style.height = '';
      elem.style.opacity = '';
      callback?.call(elem);
    });
  });
};
```

## toggle 实现

```javascript
jQuery.fn.toggle = function(duration, callback) {
  return this.each(function() {
    if (getComputedStyle(this).display === 'none') {
      $(this).show(duration, callback);
    } else {
      $(this).hide(duration, callback);
    }
  });
};
```

## 完整实现

```javascript
// src/animation/show-hide.js

const originalData = new WeakMap();

function saveOriginal(elem) {
  if (originalData.has(elem)) return originalData.get(elem);
  
  const style = getComputedStyle(elem);
  const data = {
    display: style.display,
    width: elem.offsetWidth,
    height: elem.offsetHeight,
    overflow: elem.style.overflow
  };
  
  originalData.set(elem, data);
  return data;
}

function showImmediate(elem) {
  const original = originalData.get(elem);
  elem.style.display = original?.display || 'block';
}

function hideImmediate(elem) {
  saveOriginal(elem);
  elem.style.display = 'none';
}

export function installShowHideMethods(jQuery) {
  
  jQuery.fn.show = function(duration, easing, callback) {
    // 参数规范化
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    if (duration === undefined) {
      return this.each(function() {
        showImmediate(this);
      });
    }
    
    return this.each(function() {
      const elem = this;
      const $elem = $(elem);
      const style = getComputedStyle(elem);
      
      if (style.display !== 'none') return;
      
      // 获取原始尺寸
      const original = originalData.get(elem) || {};
      const display = original.display || 'block';
      
      // 设置初始状态
      elem.style.display = display;
      elem.style.overflow = 'hidden';
      
      const targetWidth = original.width || elem.scrollWidth;
      const targetHeight = original.height || elem.scrollHeight;
      
      elem.style.width = '0px';
      elem.style.height = '0px';
      elem.style.opacity = '0';
      
      // 动画
      $elem.animate({
        width: targetWidth,
        height: targetHeight,
        opacity: 1
      }, {
        duration,
        easing,
        complete() {
          elem.style.overflow = original.overflow || '';
          elem.style.width = '';
          elem.style.height = '';
          callback?.call(elem);
        }
      });
    });
  };
  
  jQuery.fn.hide = function(duration, easing, callback) {
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    if (duration === undefined) {
      return this.each(function() {
        hideImmediate(this);
      });
    }
    
    return this.each(function() {
      const elem = this;
      const $elem = $(elem);
      
      if (getComputedStyle(elem).display === 'none') return;
      
      saveOriginal(elem);
      elem.style.overflow = 'hidden';
      
      $elem.animate({
        width: 0,
        height: 0,
        opacity: 0
      }, {
        duration,
        easing,
        complete() {
          elem.style.display = 'none';
          elem.style.overflow = '';
          elem.style.width = '';
          elem.style.height = '';
          elem.style.opacity = '';
          callback?.call(elem);
        }
      });
    });
  };
  
  jQuery.fn.toggle = function(duration, easing, callback) {
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    return this.each(function() {
      const isHidden = getComputedStyle(this).display === 'none';
      $(this)[isHidden ? 'show' : 'hide'](duration, easing, callback);
    });
  };
}
```

## 快捷方式

jQuery 提供预设速度：

```javascript
$('.box').show('fast');   // 200ms
$('.box').show('slow');   // 600ms
$('.box').show();         // 400ms（默认）
```

实现：

```javascript
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
```

## 实际应用场景

### 场景 1：点击展开

```javascript
$('.header').click(function() {
  $(this).next('.content').toggle(300);
});
```

### 场景 2：加载提示

```javascript
function startLoading() {
  $('.loading').show(200);
}

function endLoading() {
  $('.loading').hide(200);
}
```

### 场景 3：通知消息

```javascript
function showNotification(message) {
  $('.notification')
    .text(message)
    .show(300)
    .delay(2000)
    .hide(300);
}
```

### 场景 4：菜单

```javascript
$('.menu-toggle').click(function() {
  $('.menu').toggle(400, function() {
    console.log('菜单动画完成');
  });
});
```

## 与 CSS 动画的对比

```javascript
// jQuery 动画
$('.box').hide(400);

// CSS 过渡
.box {
  transition: all 0.4s;
}
.box.hidden {
  width: 0;
  height: 0;
  opacity: 0;
}
```

各有优势：

| 方面 | jQuery | CSS |
|------|--------|-----|
| 性能 | JavaScript | GPU 加速 |
| 灵活性 | 高 | 受限 |
| 回调 | 方便 | 需要事件监听 |
| 兼容性 | 一致 | 可能有差异 |

## 本章小结

show/hide 动画的要点：

- **三属性变化**：width、height、opacity
- **保存原始值**：用于恢复
- **overflow:hidden**：防止内容溢出

实现细节：

- 区分即时版本和动画版本
- 使用 WeakMap 存储原始尺寸
- 动画完成后清理内联样式

下一章，我们实现淡入淡出效果。

---

**思考题**：`show()` 动画从左上角开始，如果想从中心展开，应该如何修改？
