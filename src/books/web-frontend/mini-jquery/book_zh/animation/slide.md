# slideUp 与 slideDown：滑动效果

滑动效果只改变元素的高度，视觉上像窗帘一样展开或收起。

## 基本用法

```javascript
$('.box').slideDown(400);  // 展开
$('.box').slideUp(400);    // 收起
$('.box').slideToggle(400); // 切换
```

## slideDown 效果

```
height: 0 → height: 原始高度
overflow: hidden（动画期间）
display: none → display: block
```

## slideUp 效果

```
height: 原始高度 → height: 0
overflow: hidden（动画期间）
最后 display: block → display: none
```

## 为什么需要 overflow: hidden

如果不设置 overflow: hidden，高度变化时内容会溢出：

```
正常：
┌───────────┐
│  内容     │
│  溢出     │  ← 高度在变化
└───────────┘

有 overflow: hidden：
┌───────────┐
│  内容     │  ← 内容被裁剪
└───────────┘
```

## slideDown 实现

```javascript
// 保存原始样式
const originalData = new WeakMap();

jQuery.fn.slideDown = function(duration, easing, callback) {
  if (typeof easing === 'function') {
    callback = easing;
    easing = undefined;
  }
  
  return this.each(function() {
    const elem = this;
    const style = getComputedStyle(elem);
    
    // 已经显示
    if (style.display !== 'none') {
      return;
    }
    
    // 先显示但高度为 0
    elem.style.display = 'block';
    elem.style.overflow = 'hidden';
    
    // 获取目标高度
    const targetHeight = elem.scrollHeight;
    
    elem.style.height = '0';
    
    // 保存原始 overflow
    originalData.set(elem, {
      overflow: style.overflow
    });
    
    $(elem).animate({ height: targetHeight }, {
      duration: normalizeDuration(duration),
      easing,
      complete() {
        // 恢复样式
        elem.style.height = '';
        elem.style.overflow = originalData.get(elem)?.overflow || '';
        callback?.call(elem);
      }
    });
  });
};
```

## slideUp 实现

```javascript
jQuery.fn.slideUp = function(duration, easing, callback) {
  if (typeof easing === 'function') {
    callback = easing;
    easing = undefined;
  }
  
  return this.each(function() {
    const elem = this;
    const style = getComputedStyle(elem);
    
    // 已经隐藏
    if (style.display === 'none') {
      return;
    }
    
    // 保存当前高度
    const currentHeight = elem.offsetHeight;
    
    // 设置固定高度和 overflow
    elem.style.height = currentHeight + 'px';
    elem.style.overflow = 'hidden';
    
    originalData.set(elem, {
      overflow: style.overflow
    });
    
    $(elem).animate({ height: 0 }, {
      duration: normalizeDuration(duration),
      easing,
      complete() {
        elem.style.display = 'none';
        elem.style.height = '';
        elem.style.overflow = originalData.get(elem)?.overflow || '';
        callback?.call(elem);
      }
    });
  });
};
```

## slideToggle 实现

```javascript
jQuery.fn.slideToggle = function(duration, easing, callback) {
  return this.each(function() {
    const isHidden = getComputedStyle(this).display === 'none';
    
    $(this)[isHidden ? 'slideDown' : 'slideUp'](duration, easing, callback);
  });
};
```

## 完整实现

```javascript
// src/animation/slide.js

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

// 存储原始样式
const slideData = new WeakMap();

export function installSlideMethods(jQuery) {
  
  jQuery.fn.slideDown = function(duration, easing, callback) {
    // 参数规范化
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
      
      if (style.display !== 'none') {
        callback?.call(elem);
        return;
      }
      
      // 保存原始样式
      slideData.set(elem, {
        overflow: elem.style.overflow,
        height: elem.style.height,
        paddingTop: elem.style.paddingTop,
        paddingBottom: elem.style.paddingBottom
      });
      
      // 设置初始状态
      elem.style.display = 'block';
      elem.style.overflow = 'hidden';
      
      const targetHeight = elem.scrollHeight;
      const targetPaddingTop = style.paddingTop;
      const targetPaddingBottom = style.paddingBottom;
      
      elem.style.height = '0';
      elem.style.paddingTop = '0';
      elem.style.paddingBottom = '0';
      
      $(elem).animate({
        height: targetHeight,
        paddingTop: parseFloat(targetPaddingTop),
        paddingBottom: parseFloat(targetPaddingBottom)
      }, {
        duration: dur,
        easing,
        complete() {
          // 恢复原始样式
          const data = slideData.get(elem);
          elem.style.height = data.height;
          elem.style.overflow = data.overflow;
          elem.style.paddingTop = data.paddingTop;
          elem.style.paddingBottom = data.paddingBottom;
          callback?.call(elem);
        }
      });
    });
  };
  
  jQuery.fn.slideUp = function(duration, easing, callback) {
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
      
      if (style.display === 'none') {
        callback?.call(elem);
        return;
      }
      
      // 保存原始样式
      slideData.set(elem, {
        overflow: elem.style.overflow,
        height: elem.style.height,
        paddingTop: elem.style.paddingTop,
        paddingBottom: elem.style.paddingBottom
      });
      
      // 当前尺寸
      const currentHeight = elem.offsetHeight;
      
      elem.style.height = currentHeight + 'px';
      elem.style.overflow = 'hidden';
      
      $(elem).animate({
        height: 0,
        paddingTop: 0,
        paddingBottom: 0
      }, {
        duration: dur,
        easing,
        complete() {
          elem.style.display = 'none';
          // 恢复原始样式
          const data = slideData.get(elem);
          elem.style.height = data.height;
          elem.style.overflow = data.overflow;
          elem.style.paddingTop = data.paddingTop;
          elem.style.paddingBottom = data.paddingBottom;
          callback?.call(elem);
        }
      });
    });
  };
  
  jQuery.fn.slideToggle = function(duration, easing, callback) {
    return this.each(function() {
      const isHidden = getComputedStyle(this).display === 'none';
      $(this)[isHidden ? 'slideDown' : 'slideUp'](duration, easing, callback);
    });
  };
}
```

## 处理 padding 和 margin

完整的滑动效果还需要处理 padding：

```javascript
// 动画属性
const props = {
  height: targetHeight,
  paddingTop: parseFloat(targetPaddingTop),
  paddingBottom: parseFloat(targetPaddingBottom)
};
```

为什么不处理 margin？

margin 在元素外部，如果也动画化，看起来会有"跳动"感。通常只处理高度和内边距。

## 实际应用场景

### 场景 1：手风琴菜单

```javascript
$('.accordion-header').on('click', function() {
  const $content = $(this).next('.accordion-content');
  const $allContent = $('.accordion-content').not($content);
  
  // 关闭其他
  $allContent.slideUp(300);
  
  // 切换当前
  $content.slideToggle(300);
});
```

### 场景 2：展开/收起详情

```javascript
$('.toggle-details').on('click', function() {
  const $details = $(this).siblings('.details');
  
  $details.slideToggle(300);
  
  $(this).text(
    $details.is(':visible') ? '收起' : '展开'
  );
});
```

### 场景 3：下拉菜单

```javascript
$('.dropdown').hover(
  function() {
    $(this).find('.dropdown-menu').stop().slideDown(200);
  },
  function() {
    $(this).find('.dropdown-menu').stop().slideUp(200);
  }
);
```

### 场景 4：搜索结果

```javascript
function showResults(results) {
  const $container = $('.search-results');
  
  // 先隐藏
  $container.slideUp(200, function() {
    // 更新内容
    $container.html(renderResults(results));
    // 再显示
    $container.slideDown(300);
  });
}
```

### 场景 5：表单分步

```javascript
function goToStep(step) {
  $('.step').slideUp(300);
  $(`.step-${step}`).slideDown(300);
}
```

## slide 与 fade 组合

有时需要同时淡入和滑动：

```javascript
jQuery.fn.slideFadeIn = function(duration, callback) {
  return this.each(function() {
    $(this)
      .css({ opacity: 0 })
      .slideDown(duration)
      .animate({ opacity: 1 }, duration, callback);
  });
};

jQuery.fn.slideFadeOut = function(duration, callback) {
  return this.each(function() {
    const $elem = $(this);
    $elem
      .animate({ opacity: 0 }, duration)
      .slideUp(duration, callback);
  });
};
```

## 本章小结

slide 系列方法：

- **slideDown()**：展开显示
- **slideUp()**：收起隐藏
- **slideToggle()**：切换展开收起

实现要点：

- 只操作 height 属性（和 padding）
- 必须设置 overflow: hidden
- 动画完成后恢复原始样式
- slideUp 完成后设置 display: none

下一章，我们实现自定义 animate() 方法。

---

**思考题**：如果元素的高度是 auto，scrollHeight 能正确获取目标高度吗？有什么边界情况？
