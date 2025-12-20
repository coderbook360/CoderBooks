# 缓动函数与动画曲线

首先要问一个问题：为什么有些动画看起来生硬死板，而有些却自然流畅？

答案在于**缓动函数 (Easing Function)**。线性动画是机械的匀速运动，而好的缓动让动画拥有"生命"——就像真实世界中的物体，加速时逐渐提速，减速时缓缓停下。

---

## 1. 为什么需要缓动

### 线性动画的问题

看这段代码：

```javascript
// 线性移动：每帧固定增量
function animate() {
  x += 2;  // 匀速移动
  render();
  requestAnimationFrame(animate);
}
```

这种动画有个致命缺陷——**没有生命力**。现实世界中，几乎没有物体是匀速运动的：
- 汽车启动时**慢慢加速**
- 刹车时**逐渐减速**
- 球抛出后受重力**加速下落**

### 自然运动的特点

观察苹果的 iOS 动画，或 Google 的 Material Design，你会发现：
- **动画开始时缓慢**（ease-in），给用户反应时间
- **动画结束时减速**（ease-out），避免突兀停止
- **中间部分快速**（ease-in-out），提高效率

这就是缓动的价值——**让数字动画模拟真实物理**。

---

## 2. 缓动函数原理

### 核心概念

现在我要问第二个问题：缓动函数到底在做什么？

答案很简单：**将时间进度（0-1）映射为动画进度（0-1）**。

```javascript
// 输入：时间进度 t，范围 0-1
// 输出：动画进度，通常也是 0-1（某些缓动会超出）
function easing(t) {
  return transformedT;
}

// 应用到实际值
const currentValue = start + (end - start) * easing(t);
```

### 线性插值 (Lerp)

在讲缓动前，先理解**线性插值**：

```javascript
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// 示例
lerp(0, 100, 0);    // → 0
lerp(0, 100, 0.5);  // → 50
lerp(0, 100, 1);    // → 100
```

公式：`value = start + (end - start) × t`

缓动的作用就是**改变这个 t 的值**，让它不再是线性的。

---

## 3. 多项式缓动

### 二次缓动 (Quadratic)

最简单的缓动：`easing(t) = t²`

```javascript
const Easing = {
  // ease-in：慢开始
  easeInQuad: t => t * t,
  
  // ease-out：慢结束
  easeOutQuad: t => t * (2 - t),
  
  // ease-in-out：慢开始慢结束
  easeInOutQuad: t => {
    if (t < 0.5) {
      return 2 * t * t;
    } else {
      return -1 + (4 - 2 * t) * t;
    }
  }
};
```

- **easeInQuad**：开始时缓慢，因为 t² 在 t 接近 0 时增长很慢
- **easeOutQuad**：结束时缓慢，公式确保在 t 接近 1 时斜率减小

### 三次缓动 (Cubic)

更强烈的缓动效果：`t³`

```javascript
Easing.easeInCubic = t => t * t * t;

Easing.easeOutCubic = t => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

Easing.easeInOutCubic = t => {
  if (t < 0.5) {
    return 4 * t * t * t;
  } else {
    const t1 = t - 1;
    return 4 * t1 * t1 * t1 + 1;
  }
};
```

三次缓动比二次更"激进"——开始更慢，加速更快。

### 更高次幂

```javascript
// 四次
Easing.easeInQuart = t => t * t * t * t;
Easing.easeOutQuart = t => 1 - (--t) * t * t * t;

// 五次
Easing.easeInQuint = t => t * t * t * t * t;
Easing.easeOutQuint = t => 1 + (--t) * t * t * t * t;
```

次数越高，缓动越极端。实际使用中，**二次和三次**最常见。

---

## 4. 其他缓动类型

### 正弦缓动 (Sine)

使用三角函数创造平滑曲线：

```javascript
Easing.easeInSine = t => 1 - Math.cos(t * Math.PI / 2);
Easing.easeOutSine = t => Math.sin(t * Math.PI / 2);
Easing.easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;
```

特点：非常柔和，适合需要**极致平滑**的场景。

### 指数缓动 (Expo)

使用 `2^(10t)` 创造极快的加速：

```javascript
Easing.easeInExpo = t => {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
};

Easing.easeOutExpo = t => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

Easing.easeInOutExpo = t => {
  if (t === 0 || t === 1) return t;
  
  if (t < 0.5) {
    return Math.pow(2, 20 * t - 10) / 2;
  } else {
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};
```

特点：**戏剧性**的加速效果，用于需要"爆发力"的场景。

### 回弹缓动 (Back)

超出目标再返回，产生"拉弓"效果：

```javascript
Easing.easeInBack = t => {
  const c = 1.70158;  // 回弹强度
  return t * t * ((c + 1) * t - c);
};

Easing.easeOutBack = t => {
  const c = 1.70158;
  const t1 = t - 1;
  return 1 + t1 * t1 * ((c + 1) * t1 + c);
};
```

注意：这个缓动会**超出 0-1 范围**。比如 `easeOutBack(1.1)` 可能返回 `1.05`，造成"越界"效果。

### 弹性缓动 (Elastic)

模拟弹簧振荡：

```javascript
Easing.easeOutElastic = t => {
  if (t === 0 || t === 1) return t;
  
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
};

Easing.easeInElastic = t => {
  if (t === 0 || t === 1) return t;
  
  const p = 0.3;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - p / 4) * (2 * Math.PI) / p);
};
```

特点：**来回振荡**，适合"Q 弹"效果。

### 弹跳缓动 (Bounce)

模拟球落地反弹：

```javascript
Easing.easeOutBounce = t => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75;
    return 7.5625 * t * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75;
    return 7.5625 * t * t + 0.9375;
  } else {
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }
};

Easing.easeInBounce = t => {
  return 1 - Easing.easeOutBounce(1 - t);
};
```

这个函数模拟了球的多次反弹，每次反弹高度递减。

---

## 5. 贝塞尔缓动

### 贝塞尔曲线回顾

还记得我们在第6章学的贝塞尔曲线吗？三次贝塞尔曲线也可以用于缓动！

CSS 中的 `cubic-bezier(x1, y1, x2, y2)` 就是这个原理：
- 起点固定在 `(0, 0)`
- 终点固定在 `(1, 1)`
- 控制点 P1 为 `(x1, y1)`，P2 为 `(x2, y2)`

### 实现贝塞尔缓动

```javascript
function cubicBezier(p1x, p1y, p2x, p2y) {
  // 返回一个缓动函数
  return function(t) {
    // 使用牛顿迭代法求解 t 对应的曲线 x 值
    // 这里简化实现，实际应用建议使用成熟库（如 bezier-easing）
    
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;
    
    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;
    
    function sampleCurveX(t) {
      return ((ax * t + bx) * t + cx) * t;
    }
    
    function sampleCurveY(t) {
      return ((ay * t + by) * t + cy) * t;
    }
    
    function solveCurveX(x) {
      // 简化版：二分法求解
      let t0 = 0, t1 = 1, t = x;
      for (let i = 0; i < 8; i++) {
        const x0 = sampleCurveX(t) - x;
        if (Math.abs(x0) < 0.001) break;
        t -= x0 / (3 * ax * t * t + 2 * bx * t + cx);
      }
      return t;
    }
    
    return sampleCurveY(solveCurveX(t));
  };
}

// CSS ease 对应的贝塞尔
const CSSEasing = {
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1)
};
```

贝塞尔缓动的优势是**高度可定制**——通过调整控制点，可以创造任意形状的曲线。

---

## 6. 缓动应用

### Tween 动画类

现在我要问第三个问题：如何把缓动应用到实际动画中？

答案是：创建一个 **Tween** 类。

```javascript
class Tween {
  constructor(target, property, from, to, duration, easing = t => t) {
    this.target = target;      // 目标对象
    this.property = property;  // 要改变的属性
    this.from = from;          // 起始值
    this.to = to;              // 目标值
    this.duration = duration;  // 持续时间（毫秒）
    this.easing = easing;      // 缓动函数
    
    this.startTime = null;
    this.isComplete = false;
  }
  
  start() {
    this.startTime = performance.now();
    this.isComplete = false;
  }
  
  update(currentTime) {
    if (this.isComplete) return;
    
    const elapsed = currentTime - this.startTime;
    const rawT = Math.min(elapsed / this.duration, 1);  // 原始进度 0-1
    
    const easedT = this.easing(rawT);  // 应用缓动
    
    // 插值计算
    this.target[this.property] = this.from + (this.to - this.from) * easedT;
    
    if (rawT >= 1) {
      this.isComplete = true;
    }
  }
}
```

### 使用示例

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 创建一个对象
const box = { x: 50, y: 100, rotation: 0 };

// 创建动画：从 x=50 移动到 x=450，使用弹性缓动
const tween = new Tween(
  box,
  'x',
  50,
  450,
  2000,
  Easing.easeOutElastic
);

tween.start();

function animate(time) {
  tween.update(time);
  
  // 渲染
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'blue';
  ctx.fillRect(box.x, box.y, 50, 50);
  
  if (!tween.isComplete) {
    requestAnimationFrame(animate);
  }
}

requestAnimationFrame(animate);
```

### 多属性动画

```javascript
class TweenGroup {
  constructor() {
    this.tweens = [];
  }
  
  add(tween) {
    this.tweens.push(tween);
    return this;
  }
  
  start() {
    this.tweens.forEach(t => t.start());
  }
  
  update(time) {
    this.tweens.forEach(t => t.update(time));
  }
  
  isComplete() {
    return this.tweens.every(t => t.isComplete);
  }
}

// 同时动画多个属性
const box = { x: 50, y: 100, scale: 1, opacity: 0 };

const group = new TweenGroup();
group.add(new Tween(box, 'x', 50, 450, 1000, Easing.easeOutQuad));
group.add(new Tween(box, 'y', 100, 300, 1000, Easing.easeOutQuad));
group.add(new Tween(box, 'scale', 1, 2, 1000, Easing.easeOutBack));
group.add(new Tween(box, 'opacity', 0, 1, 500, Easing.linear));

group.start();

function animate(time) {
  group.update(time);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = box.opacity;
  ctx.save();
  ctx.translate(box.x + 25, box.y + 25);
  ctx.scale(box.scale, box.scale);
  ctx.fillStyle = 'blue';
  ctx.fillRect(-25, -25, 50, 50);
  ctx.restore();
  
  if (!group.isComplete()) {
    requestAnimationFrame(animate);
  }
}

requestAnimationFrame(animate);
```

### 颜色动画

```javascript
function lerpColor(color1, color2, t) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 颜色渐变动画
const obj = { colorT: 0 };
const colorTween = new Tween(obj, 'colorT', 0, 1, 2000, Easing.easeInOutQuad);

colorTween.start();

function animate(time) {
  colorTween.update(time);
  
  const color = lerpColor('#ff0000', '#0000ff', obj.colorT);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.fillRect(200, 150, 100, 100);
  
  if (!colorTween.isComplete) {
    requestAnimationFrame(animate);
  }
}

requestAnimationFrame(animate);
```

---

## 7. 缓动选择指南

不同场景适合不同的缓动：

- **ease-out（推荐默认）**：最常用，适合大多数场景（移动、缩放、淡入淡出）
- **ease-in-out**：适合往返动画、对话框出现/消失
- **ease-in**：适合元素退出场景
- **elastic**：适合提示、通知、"惊喜"效果
- **bounce**：适合游戏、儿童应用
- **back**：适合有"准备动作"的交互（如拖拽开始前的后撤）

**黄金法则**：当你不确定时，使用 `easeOutQuad` 或 `easeOutCubic`。

---

## 本章小结

缓动函数是动画的灵魂：
- **核心原理**：将时间进度（0-1）映射为动画进度（0-1）
- **常见类型**：多项式（quad/cubic）、三角函数（sine）、特殊效果（elastic/bounce/back）
- **贝塞尔缓动**：通过控制点定义任意曲线，CSS `cubic-bezier` 的原理
- **实际应用**：使用 Tween 类将缓动应用于任意属性动画

掌握缓动后，你的动画将从"能动"进化到"好看"。下一章，我们将学习帧率控制与时间管理，让动画在各种设备上都流畅运行。
