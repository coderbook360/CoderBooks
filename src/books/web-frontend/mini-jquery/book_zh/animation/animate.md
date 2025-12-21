# animate：自定义动画

前面的 show/hide、fade、slide 都是预设动画。animate() 让你自定义任意 CSS 属性的动画。

## 基本用法

```javascript
$('.box').animate({
  left: 100,
  top: 50,
  opacity: 0.5
}, 400);

// 带回调
$('.box').animate({ width: 200 }, 400, function() {
  console.log('完成');
});

// 带缓动
$('.box').animate({ width: 200 }, 400, 'easeOutQuad', function() {
  console.log('完成');
});
```

## API 设计

```javascript
.animate(properties, duration, easing, callback)
.animate(properties, options)
```

options 对象：

```javascript
{
  duration: 400,
  easing: 'swing',
  complete: function() {},
  step: function(now, tween) {},
  queue: true
}
```

## 核心实现思路

1. 解析目标属性值
2. 获取当前属性值
3. 计算差值
4. 使用 requestAnimationFrame 逐帧更新

## 属性值解析

CSS 属性值可能是：

```javascript
{
  width: 200,        // 纯数字，自动加 px
  width: '200px',    // 带单位
  width: '+=50',     // 相对值
  opacity: 0.5,      // 不需要单位
  color: '#ff0000'   // 颜色（复杂）
}
```

解析函数：

```javascript
function parseValue(value, currentValue) {
  // 字符串处理
  if (typeof value === 'string') {
    // 相对值 +=50 或 -=50
    const relMatch = value.match(/^([+-]=)(\d+)/);
    if (relMatch) {
      const operator = relMatch[1];
      const amount = parseFloat(relMatch[2]);
      return operator === '+=' 
        ? currentValue + amount 
        : currentValue - amount;
    }
    
    // 带单位的值
    return parseFloat(value);
  }
  
  return value;
}
```

## 获取当前值

```javascript
function getCurrentValue(elem, prop) {
  const style = getComputedStyle(elem);
  const value = style[prop];
  return parseFloat(value) || 0;
}
```

## 需要单位的属性

```javascript
const needsUnit = new Set([
  'width', 'height',
  'top', 'right', 'bottom', 'left',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontSize', 'borderWidth', 'borderRadius'
]);

function getUnit(prop) {
  return needsUnit.has(prop) ? 'px' : '';
}
```

## animate 实现

```javascript
jQuery.fn.animate = function(properties, duration, easing, callback) {
  // 参数规范化
  let options = {};
  
  if (typeof duration === 'object') {
    options = duration;
  } else {
    if (typeof duration === 'function') {
      callback = duration;
      duration = undefined;
    } else if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }
    
    options = {
      duration: normalizeDuration(duration),
      easing: easing || 'swing',
      complete: callback
    };
  }
  
  return this.each(function() {
    const elem = this;
    
    // 构建动画数据
    const animations = [];
    
    for (const prop in properties) {
      const startValue = getCurrentValue(elem, prop);
      const endValue = parseValue(properties[prop], startValue);
      const unit = getUnit(prop);
      
      animations.push({
        prop,
        start: startValue,
        end: endValue,
        unit
      });
    }
    
    // 执行动画
    runAnimation(elem, animations, options);
  });
};
```

## 动画执行器

```javascript
function runAnimation(elem, animations, options) {
  const startTime = performance.now();
  const duration = options.duration;
  const easingFn = getEasing(options.easing);
  
  function tick(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFn(progress);
    
    // 更新所有属性
    for (const anim of animations) {
      const currentValue = anim.start + (anim.end - anim.start) * easedProgress;
      elem.style[anim.prop] = currentValue + anim.unit;
      
      // step 回调
      options.step?.call(elem, currentValue, anim);
    }
    
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      // 完成
      options.complete?.call(elem);
    }
  }
  
  requestAnimationFrame(tick);
}
```

## 缓动函数

```javascript
const easings = {
  linear: t => t,
  swing: t => 0.5 - Math.cos(t * Math.PI) / 2,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

function getEasing(name) {
  return easings[name] || easings.swing;
}
```

## 完整实现

```javascript
// src/animation/animate.js

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

// 需要添加 px 单位的属性
const needsUnit = new Set([
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'top', 'right', 'bottom', 'left',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing',
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 
  'borderBottomWidth', 'borderLeftWidth',
  'borderRadius', 'outlineWidth', 'textIndent'
]);

// 默认缓动函数
const easings = {
  linear: t => t,
  swing: t => 0.5 - Math.cos(t * Math.PI) / 2,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

function getEasing(name) {
  return easings[name] || easings.swing;
}

function getUnit(prop) {
  return needsUnit.has(prop) ? 'px' : '';
}

function getCurrentValue(elem, prop) {
  const style = getComputedStyle(elem);
  return parseFloat(style[prop]) || 0;
}

function parseValue(value, currentValue) {
  if (typeof value === 'string') {
    // 相对值
    const relMatch = value.match(/^([+-]=)(-?\d+(?:\.\d+)?)/);
    if (relMatch) {
      const amount = parseFloat(relMatch[2]);
      return relMatch[1] === '+=' 
        ? currentValue + amount 
        : currentValue - amount;
    }
    return parseFloat(value);
  }
  return value;
}

function runAnimation(elem, animations, options) {
  const startTime = performance.now();
  const duration = options.duration;
  const easingFn = getEasing(options.easing);
  
  function tick(currentTime) {
    const elapsed = currentTime - startTime;
    let progress = elapsed / duration;
    
    if (progress >= 1) {
      progress = 1;
      // 设置最终值
      for (const anim of animations) {
        elem.style[anim.prop] = anim.end + anim.unit;
      }
      options.complete?.call(elem);
      return;
    }
    
    const easedProgress = easingFn(progress);
    
    for (const anim of animations) {
      const currentValue = anim.start + (anim.end - anim.start) * easedProgress;
      elem.style[anim.prop] = currentValue + anim.unit;
      
      // step 回调
      if (options.step) {
        options.step.call(elem, currentValue, {
          prop: anim.prop,
          start: anim.start,
          end: anim.end,
          now: currentValue,
          pos: easedProgress
        });
      }
    }
    
    requestAnimationFrame(tick);
  }
  
  requestAnimationFrame(tick);
}

export function installAnimateMethod(jQuery) {
  
  jQuery.fn.animate = function(properties, duration, easing, callback) {
    // 参数规范化
    let options;
    
    if (typeof duration === 'object') {
      // animate(props, options)
      options = {
        duration: normalizeDuration(duration.duration),
        easing: duration.easing || 'swing',
        complete: duration.complete,
        step: duration.step
      };
    } else {
      // animate(props, duration, easing, callback)
      if (typeof duration === 'function') {
        callback = duration;
        duration = undefined;
        easing = undefined;
      } else if (typeof easing === 'function') {
        callback = easing;
        easing = undefined;
      }
      
      options = {
        duration: normalizeDuration(duration),
        easing: easing || 'swing',
        complete: callback
      };
    }
    
    return this.each(function() {
      const elem = this;
      const animations = [];
      
      // 构建动画数据
      for (const prop in properties) {
        // 转换属性名 margin-top -> marginTop
        const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        
        const startValue = getCurrentValue(elem, camelProp);
        const endValue = parseValue(properties[prop], startValue);
        const unit = getUnit(camelProp);
        
        animations.push({
          prop: camelProp,
          start: startValue,
          end: endValue,
          unit
        });
      }
      
      // 执行动画
      if (animations.length > 0) {
        runAnimation(elem, animations, options);
      }
    });
  };
  
  // 扩展缓动函数
  jQuery.easing = easings;
}
```

## 使用示例

### 基本动画

```javascript
$('.box').animate({
  left: 200,
  top: 100
}, 500);
```

### 相对值

```javascript
// 向右移动 50px
$('.box').animate({ left: '+=50' }, 300);

// 向左移动 50px
$('.box').animate({ left: '-=50' }, 300);
```

### 多属性同时动画

```javascript
$('.box').animate({
  width: 300,
  height: 200,
  opacity: 0.5,
  left: 100,
  top: 50
}, 800);
```

### step 回调

```javascript
$('.box').animate({ left: 200 }, {
  duration: 500,
  step(now, tween) {
    console.log(`${tween.prop}: ${now}`);
    // 同步更新其他元素
    $('.shadow').css('left', now);
  }
});
```

### 链式动画

```javascript
$('.box')
  .animate({ left: 100 }, 300)
  .animate({ top: 100 }, 300)
  .animate({ left: 0 }, 300)
  .animate({ top: 0 }, 300);
```

## 实际应用场景

### 场景 1：元素飞入

```javascript
function flyIn($elem, from = 'left') {
  const startPos = { opacity: 0 };
  
  switch (from) {
    case 'left':  startPos.left = -100; break;
    case 'right': startPos.left = 100; break;
    case 'top':   startPos.top = -100; break;
    case 'bottom': startPos.top = 100; break;
  }
  
  $elem
    .css(startPos)
    .animate({
      opacity: 1,
      left: 0,
      top: 0
    }, 500, 'easeOutQuad');
}
```

### 场景 2：脉冲效果

```javascript
function pulse($elem, scale = 1.1) {
  $elem
    .animate({ transform: `scale(${scale})` }, 200)
    .animate({ transform: 'scale(1)' }, 200);
}
```

### 场景 3：进度条

```javascript
function animateProgress($bar, percent) {
  $bar.animate({ width: percent + '%' }, {
    duration: 500,
    easing: 'easeOutQuad',
    step(now) {
      $bar.text(Math.round(now) + '%');
    }
  });
}
```

### 场景 4：数字滚动

```javascript
function countUp($elem, from, to, duration = 1000) {
  $({ count: from }).animate({ count: to }, {
    duration,
    step(now) {
      $elem.text(Math.round(now));
    }
  });
}

// 使用
countUp($('.number'), 0, 1000);
```

### 场景 5：弹跳效果

```javascript
function bounce($elem) {
  $elem
    .animate({ top: '-=30' }, 150, 'easeOutQuad')
    .animate({ top: '+=30' }, 150, 'easeInQuad')
    .animate({ top: '-=15' }, 100, 'easeOutQuad')
    .animate({ top: '+=15' }, 100, 'easeInQuad');
}
```

## 本章小结

animate() 方法：

- 支持任意 CSS 属性动画
- 支持相对值（+=、-=）
- 支持多种缓动函数
- 支持 step 回调实时监控
- 支持 options 对象配置

实现要点：

- 解析属性值（数字、字符串、相对值）
- 自动添加单位（px）
- requestAnimationFrame 驱动
- 缓动函数插值

下一章，我们深入研究缓动函数。

---

**思考题**：animate() 不支持 transform 属性的动画，因为 transform 的值格式复杂（如 `rotate(45deg) scale(1.5)`）。如何扩展实现？
