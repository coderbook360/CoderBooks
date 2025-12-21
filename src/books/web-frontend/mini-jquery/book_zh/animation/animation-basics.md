# 动画的本质：随时间变化的属性

在深入实现 jQuery 动画之前，我们先退一步思考：动画到底是什么？

这个问题的答案会影响我们如何设计整个动画系统。

## 动画的数学本质

从技术角度看，动画的本质其实很简单：**让某个属性的值随时间平滑变化**。

```javascript
// 假设我们要在 1 秒内把 opacity 从 0 变到 1

// 起始状态（t = 0ms）
opacity = 0

// 经过 500ms（t = 500ms，进度 50%）
opacity = 0.5

// 经过 1000ms（t = 1000ms，进度 100%）
opacity = 1
```

如果我们把这个过程抽象成公式：

```
当前值 = 起始值 + (结束值 - 起始值) × 进度
```

其中：
- **进度** = 已过时间 / 总时长
- 进度是 0 到 1 之间的值

这个公式看起来简单，但它是所有动画的基础。无论是 jQuery 动画、CSS 动画还是 Three.js 3D 动画，底层都是这个逻辑。

## 最简单的动画实现

理解了原理，让我们写出最简单的动画函数：

```javascript
function animate(element, property, from, to, duration) {
  const startTime = performance.now();
  
  function step(currentTime) {
    // 计算已过时间
    const elapsed = currentTime - startTime;
    
    // 计算进度（0 到 1，不能超过 1）
    const progress = Math.min(elapsed / duration, 1);
    
    // 核心公式：线性插值
    const currentValue = from + (to - from) * progress;
    
    // 应用到元素
    element.style[property] = currentValue;
    
    // 如果动画未完成，继续下一帧
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  // 启动动画
  requestAnimationFrame(step);
}

// 使用
animate(box, 'opacity', 0, 1, 1000);
```

短短 20 行代码，一个可用的动画引擎就完成了。让我们逐行理解：

1. **记录开始时间**：`performance.now()` 返回高精度时间戳
2. **计算进度**：已过时间除以总时长
3. **线性插值**：根据进度计算当前值
4. **应用样式**：设置到元素的 style 上
5. **递归调用**：如果没完成，用 `requestAnimationFrame` 请求下一帧

## 动画三要素

每个动画都有三个核心参数：

1. **起始值（from）**：动画开始时的值
2. **结束值（to）**：动画结束时的值
3. **持续时间（duration）**：动画需要多长时间完成

这三个参数决定了动画的全部行为。

## 什么是线性插值（Lerp）

```javascript
// 进度：0 到 1 之间的值
const progress = elapsed / duration;

// 线性插值：根据进度计算当前值
const currentValue = from + (to - from) * progress;
```

这种计算方式叫做**线性插值（Linear Interpolation）**，简称 **lerp**。它是动画和图形学中最基础的概念之一。

"线性"意味着变化是匀速的——每一帧的变化量相同。后面我们会学习"缓动函数"，让动画可以先快后慢或先慢后快。

## 多属性动画

同时改变多个属性：

```javascript
function animate(element, properties, duration) {
  const startTime = performance.now();
  const startValues = {};
  
  // 记录起始值
  for (const prop in properties) {
    startValues[prop] = parseFloat(getComputedStyle(element)[prop]) || 0;
  }
  
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 更新所有属性
    for (const prop in properties) {
      const from = startValues[prop];
      const to = properties[prop];
      const current = from + (to - from) * progress;
      element.style[prop] = current + (needsUnit(prop) ? 'px' : '');
    }
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}

// 使用
animate(box, {
  opacity: 1,
  width: 200,
  height: 100
}, 1000);
```

## 单位处理

CSS 属性值通常带单位：

```javascript
const cssNumber = new Set([
  'opacity', 'zIndex', 'fontWeight', 'lineHeight',
  'fillOpacity', 'flexGrow', 'flexShrink', 'order'
]);

function needsUnit(property) {
  return !cssNumber.has(property);
}

function parseValue(value) {
  if (typeof value === 'number') {
    return { value, unit: 'px' };
  }
  
  const match = String(value).match(/^(-?\d*\.?\d+)(.*)$/);
  return {
    value: parseFloat(match[1]),
    unit: match[2] || 'px'
  };
}
```

## 回调函数

动画完成时执行回调：

```javascript
function animate(element, properties, duration, callback) {
  const startTime = performance.now();
  
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // ... 更新属性
    
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // 动画完成
      callback?.();
    }
  }
  
  requestAnimationFrame(step);
}

// 使用
animate(box, { opacity: 1 }, 1000, () => {
  console.log('动画完成');
});
```

## jQuery 动画 API 设计

```javascript
// 基础动画
$('.box').animate({ opacity: 1 }, 1000);

// 带回调
$('.box').animate({ opacity: 1 }, 1000, function() {
  console.log('完成');
});

// 带缓动
$('.box').animate({ opacity: 1 }, 1000, 'easeOutQuad');

// 完整参数
$('.box').animate({ opacity: 1 }, {
  duration: 1000,
  easing: 'swing',
  complete: function() {},
  step: function(now, tween) {}
});
```

## 动画系统架构

```
jQuery.fn.animate()
        ↓
    参数规范化
        ↓
    创建动画对象
        ↓
    加入动画队列
        ↓
    执行动画循环
        ↓
   requestAnimationFrame
        ↓
    计算当前值
        ↓
    更新 DOM
        ↓
    检查是否完成
```

## 核心模块

```javascript
// src/animation/animation.js

class Animation {
  constructor(elem, props, options) {
    this.elem = elem;
    this.props = props;
    this.duration = options.duration || 400;
    this.easing = options.easing || 'swing';
    this.callback = options.complete;
    
    this.startTime = null;
    this.startValues = {};
    this.endValues = {};
    
    this.init();
  }
  
  init() {
    // 解析起始值和结束值
    for (const prop in this.props) {
      const computed = getComputedStyle(this.elem)[prop];
      this.startValues[prop] = parseValue(computed);
      this.endValues[prop] = parseValue(this.props[prop]);
    }
  }
  
  start() {
    this.startTime = performance.now();
    this.tick();
  }
  
  tick() {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // 应用缓动
    const easedProgress = this.applyEasing(progress);
    
    // 更新所有属性
    for (const prop in this.props) {
      const start = this.startValues[prop].value;
      const end = this.endValues[prop].value;
      const unit = this.endValues[prop].unit;
      
      const current = start + (end - start) * easedProgress;
      this.elem.style[prop] = current + unit;
    }
    
    if (progress < 1) {
      requestAnimationFrame(() => this.tick());
    } else {
      this.complete();
    }
  }
  
  applyEasing(progress) {
    // 简单的缓动函数（后续章节详解）
    if (this.easing === 'linear') {
      return progress;
    }
    // swing (jQuery 默认)
    return 0.5 - Math.cos(progress * Math.PI) / 2;
  }
  
  complete() {
    this.callback?.call(this.elem);
  }
}
```

## 实际应用场景

### 场景 1：元素渐显

```javascript
$('.box').css('opacity', 0).animate({ opacity: 1 }, 500);
```

### 场景 2：展开动画

```javascript
$('.panel').animate({ height: 200 }, 300);
```

### 场景 3：组合动画

```javascript
$('.box').animate({
  left: 100,
  top: 50,
  opacity: 0.5
}, 1000);
```

## 本章小结

动画的本质：

- **属性随时间变化**：从起始值到结束值
- **线性插值**：`current = from + (to - from) × progress`
- **帧循环**：使用 requestAnimationFrame

动画要素：

- 起始值、结束值、持续时间
- 可选的缓动函数
- 完成回调

下一章，我们实现 `show()` 和 `hide()` 的动画版本。

---

**思考题**：如果同时对一个元素执行两个动画（修改不同属性），它们应该如何协调？并行还是排队？
