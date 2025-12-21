# 缓动函数：让动画更自然

线性动画看起来机械、不自然。缓动函数（Easing Functions）让动画更符合物理直觉。

## 什么是缓动

```
线性：匀速运动
   ─────────────────→

easeIn：慢启动
   ·····─────────────→

easeOut：快启动慢结束
   ─────────────·····→

easeInOut：两端慢中间快
   ·····───────·····→
```

## 缓动函数的本质

缓动函数接收进度 t (0-1)，返回变换后的进度：

```javascript
function linear(t) {
  return t;  // 输入什么返回什么
}

function easeInQuad(t) {
  return t * t;  // 开始慢，结束快
}

function easeOutQuad(t) {
  return t * (2 - t);  // 开始快，结束慢
}
```

## 可视化理解

```
进度   linear    easeIn    easeOut
0.0    0.00      0.00      0.00
0.2    0.20      0.04      0.36
0.4    0.40      0.16      0.64
0.6    0.60      0.36      0.84
0.8    0.80      0.64      0.96
1.0    1.00      1.00      1.00
```

注意 easeIn 在前半段进度很慢（0.04, 0.16），easeOut 则相反。

## 常用缓动函数

### Quad（二次方）

```javascript
const easeInQuad = t => t * t;
const easeOutQuad = t => t * (2 - t);
const easeInOutQuad = t => t < 0.5 
  ? 2 * t * t 
  : -1 + (4 - 2 * t) * t;
```

### Cubic（三次方）

```javascript
const easeInCubic = t => t * t * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = t => t < 0.5 
  ? 4 * t * t * t 
  : 1 - Math.pow(-2 * t + 2, 3) / 2;
```

### Quart（四次方）

```javascript
const easeInQuart = t => t * t * t * t;
const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
const easeInOutQuart = t => t < 0.5 
  ? 8 * t * t * t * t 
  : 1 - Math.pow(-2 * t + 2, 4) / 2;
```

### Quint（五次方）

```javascript
const easeInQuint = t => t * t * t * t * t;
const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
const easeInOutQuint = t => t < 0.5 
  ? 16 * t * t * t * t * t 
  : 1 - Math.pow(-2 * t + 2, 5) / 2;
```

### Sine（正弦）

```javascript
const easeInSine = t => 1 - Math.cos((t * Math.PI) / 2);
const easeOutSine = t => Math.sin((t * Math.PI) / 2);
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
```

### Expo（指数）

```javascript
const easeInExpo = t => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeInOutExpo = t => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};
```

### Circ（圆形）

```javascript
const easeInCirc = t => 1 - Math.sqrt(1 - t * t);
const easeOutCirc = t => Math.sqrt(1 - Math.pow(t - 1, 2));
const easeInOutCirc = t => t < 0.5
  ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
  : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
```

### Back（回弹）

```javascript
const c1 = 1.70158;
const c3 = c1 + 1;

const easeInBack = t => c3 * t * t * t - c1 * t * t;
const easeOutBack = t => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
const easeInOutBack = t => {
  const c2 = c1 * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};
```

### Elastic（弹性）

```javascript
const easeInElastic = t => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * 
         Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
};

const easeOutElastic = t => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * 
         Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

const easeInOutElastic = t => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * 
        Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
    : (Math.pow(2, -20 * t + 10) * 
        Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
};
```

### Bounce（弹跳）

```javascript
const easeOutBounce = t => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

const easeInBounce = t => 1 - easeOutBounce(1 - t);

const easeInOutBounce = t => t < 0.5
  ? (1 - easeOutBounce(1 - 2 * t)) / 2
  : (1 + easeOutBounce(2 * t - 1)) / 2;
```

## 完整实现

```javascript
// src/animation/easing.js

export const easings = {
  // 线性
  linear: t => t,
  
  // jQuery 默认
  swing: t => 0.5 - Math.cos(t * Math.PI) / 2,
  
  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: t => t < 0.5 
    ? 4 * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 3) / 2,
  
  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: t => t < 0.5 
    ? 8 * t * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 4) / 2,
  
  // Quint
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => 1 - Math.pow(1 - t, 5),
  easeInOutQuint: t => t < 0.5 
    ? 16 * t * t * t * t * t 
    : 1 - Math.pow(-2 * t + 2, 5) / 2,
  
  // Sine
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Circ
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: t => t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  
  // Back
  easeInBack: t => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
  easeOutBack: t => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeInOutBack: t => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  
  // Elastic
  easeInElastic: t => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * 
           Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * 
           Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeInOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * 
          Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2
      : (Math.pow(2, -20 * t + 10) * 
          Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },
  
  // Bounce
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInBounce: t => 1 - easings.easeOutBounce(1 - t),
  easeInOutBounce: t => t < 0.5
    ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2
    : (1 + easings.easeOutBounce(2 * t - 1)) / 2
};

export function installEasings(jQuery) {
  jQuery.easing = easings;
}
```

## 使用示例

```javascript
// 使用不同缓动
$('.box').animate({ left: 200 }, 500, 'easeOutQuad');
$('.box').animate({ left: 200 }, 500, 'easeOutBounce');
$('.box').animate({ left: 200 }, 500, 'easeOutElastic');
```

## 缓动选择指南

| 场景 | 推荐缓动 |
|------|----------|
| 一般移动 | easeOutQuad / easeOutCubic |
| 弹出菜单 | easeOutQuart |
| 模态框显示 | easeOutBack |
| 收回/关闭 | easeInQuad |
| 强调效果 | easeOutElastic |
| 落地效果 | easeOutBounce |
| 持续动画 | easeInOutSine |

## 自定义缓动

```javascript
// 添加自定义缓动
jQuery.easing.myCustomEase = function(t) {
  // 你的算法
  return t * t * t;
};

// 使用
$('.box').animate({ left: 200 }, 500, 'myCustomEase');
```

## 贝塞尔曲线缓动

CSS 的 cubic-bezier 可以转换为 JavaScript：

```javascript
function cubicBezier(p1x, p1y, p2x, p2y) {
  // 简化版实现
  return function(t) {
    // Newton-Raphson 迭代求解
    let x = t;
    for (let i = 0; i < 8; i++) {
      const currentX = bezierX(x, p1x, p2x) - t;
      if (Math.abs(currentX) < 0.001) break;
      x -= currentX / bezierDerivativeX(x, p1x, p2x);
    }
    return bezierY(x, p1y, p2y);
  };
  
  function bezierX(t, p1, p2) {
    return 3 * p1 * t * (1 - t) * (1 - t) + 
           3 * p2 * t * t * (1 - t) + 
           t * t * t;
  }
  
  function bezierY(t, p1, p2) {
    return 3 * p1 * t * (1 - t) * (1 - t) + 
           3 * p2 * t * t * (1 - t) + 
           t * t * t;
  }
  
  function bezierDerivativeX(t, p1, p2) {
    return 3 * (1 - t) * (1 - t) * p1 +
           6 * (1 - t) * t * (p2 - p1) +
           3 * t * t * (1 - p2);
  }
}

// 等价于 CSS ease
jQuery.easing.ease = cubicBezier(0.25, 0.1, 0.25, 1.0);
```

## 本章小结

缓动函数类型：

- **linear**：匀速
- **ease 系列**：In（慢启动）、Out（慢结束）、InOut（两端慢）
- **特殊效果**：Back（回弹）、Elastic（弹性）、Bounce（弹跳）

选择原则：

- 展开/显示：easeOut
- 收起/隐藏：easeIn
- 强调：Back/Elastic
- 自然：Sine/Quad

下一章，我们实现动画队列管理。

---

**思考题**：为什么 easeInBack 和 easeOutBack 的值会超过 0-1 范围？这在动画中是什么效果？
