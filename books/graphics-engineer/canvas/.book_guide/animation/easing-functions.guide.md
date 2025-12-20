# 章节写作指导：缓动函数与动画曲线

## 1. 章节信息

- **章节标题**: 缓动函数与动画曲线
- **文件名**: animation/easing-functions.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解缓动函数的概念和作用
- 掌握常见缓动函数的数学原理
- 理解贝塞尔曲线在缓动中的应用
- 了解 CSS 缓动与自定义缓动

### 技能目标
- 能够实现常见的缓动函数
- 能够选择合适的缓动效果
- 能够创建自定义缓动曲线
- 能够将缓动应用于各种属性动画

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **缓动函数 (Easing)** | 将时间进度 (0-1) 映射为动画进度 (0-1) 的函数 |
| **ease-in** | 慢开始，加速结束 |
| **ease-out** | 快开始，减速结束 |
| **ease-in-out** | 慢开始慢结束，中间快 |
| **贝塞尔缓动** | 使用三次贝塞尔曲线定义的缓动 |

### 关键知识点

- 线性插值 (lerp)
- 多项式缓动（quadratic, cubic, quartic, quintic）
- 三角函数缓动（sine）
- 指数缓动（expo）
- 弹性缓动（elastic）
- 弹跳缓动（bounce）
- 贝塞尔曲线缓动

### 边界与限制

- 某些缓动会超出 0-1 范围（elastic）
- 贝塞尔缓动计算复杂度较高

## 4. 写作要求

### 开篇方式
从用户体验引入：线性动画看起来机械死板，而好的缓动让动画更加自然生动。苹果、Google 的设计规范都强调缓动在交互中的重要性。

### 结构组织

```
1. 为什么需要缓动
   - 线性动画的问题
   - 自然运动的特点
   - 缓动提升体验
   
2. 缓动函数原理
   - 输入输出：时间 → 进度
   - 缓动曲线图解
   - 基本分类
   
3. 多项式缓动
   - quadratic (二次)
   - cubic (三次)
   - quartic/quintic
   - in/out/inOut 变体
   
4. 其他缓动类型
   - sine (正弦)
   - expo (指数)
   - circ (圆形)
   - back (回弹)
   - elastic (弹性)
   - bounce (弹跳)
   
5. 贝塞尔缓动
   - 贝塞尔曲线回顾
   - CSS cubic-bezier
   - 实现方法
   
6. 动画应用
   - 位置动画
   - 颜色动画
   - 组合动画
   
7. 本章小结
```

### 代码示例

1. **线性插值函数**
2. **常见缓动函数集合**
3. **缓动动画示例**
4. **贝塞尔缓动实现**
5. **缓动可视化演示**

### 图表需求

- **缓动曲线对比图**：展示各种缓动的曲线形状
- **缓动效果对比动画**：展示不同缓动的视觉效果

## 5. 技术细节

### 实现要点

```javascript
// 线性插值
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// 缓动函数集合
const Easing = {
  // 线性
  linear: t => t,
  
  // 二次
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // 三次
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // 正弦
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // 指数
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  
  // 回弹
  easeInBack: t => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: t => {
    const c = 1.70158;
    return 1 + (--t) * t * ((c + 1) * t + c);
  },
  
  // 弹性
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
  
  // 弹跳
  easeOutBounce: t => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
};

// 动画类，使用缓动
class Tween {
  constructor(target, property, from, to, duration, easing = Easing.linear) {
    this.target = target;
    this.property = property;
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.easing = easing;
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
    const rawT = Math.min(elapsed / this.duration, 1);
    const easedT = this.easing(rawT);
    
    this.target[this.property] = lerp(this.from, this.to, easedT);
    
    if (rawT >= 1) {
      this.isComplete = true;
    }
  }
}

// 使用示例
const box = { x: 0 };
const tween = new Tween(box, 'x', 0, 300, 1000, Easing.easeOutElastic);
tween.start();

function animate(time) {
  tween.update(time);
  render();
  if (!tween.isComplete) {
    requestAnimationFrame(animate);
  }
}
requestAnimationFrame(animate);
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 缓动效果不自然 | 选择合适的缓动类型 |
| 弹性缓动超出边界 | 考虑是否需要 clamp |
| 多属性动画不同步 | 使用相同的时间基准 |
| 缓动曲线难以调试 | 使用可视化工具 |

## 6. 风格指导

### 语气语调
- 从用户体验角度解释
- 用可视化辅助理解曲线

### 类比方向
- 缓动类比"汽车的加减速"
- ease-in 类比"慢慢起步"
- ease-out 类比"刹车减速"

## 7. 与其他章节的关系

### 前置依赖
- 第25章：动画基础

### 后续章节铺垫
- 为各种动画效果提供缓动支持

## 8. 章节检查清单

- [ ] 目标明确：读者能实现和使用各种缓动
- [ ] 术语统一：缓动、插值等术语定义清晰
- [ ] 最小实现：提供完整的缓动函数集
- [ ] 边界处理：说明超出范围的缓动
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：缓动曲线图与代码对应
- [ ] 总结与练习：提供缓动应用练习
