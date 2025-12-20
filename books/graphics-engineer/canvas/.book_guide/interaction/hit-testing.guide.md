# 章节写作指导：点击检测：几何方法与路径方法

## 1. 章节信息

- **章节标题**: 点击检测：几何方法与路径方法
- **文件名**: interaction/hit-testing.md
- **所属部分**: 第五部分：事件与交互
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Canvas 点击检测（Hit Testing）的挑战
- 掌握几何方法进行点击检测
- 掌握使用 isPointInPath/isPointInStroke 检测
- 理解不同方法的适用场景和性能特点

### 技能目标
- 能够实现矩形、圆形等基础图形的点击检测
- 能够使用路径方法进行复杂图形的点击检测
- 能够处理变换后图形的点击检测
- 能够设计高效的点击检测策略

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **点击检测 (Hit Testing)** | 判断一个点是否在某个图形内部 |
| **几何方法** | 使用数学公式判断点与图形的关系 |
| **路径方法** | 使用 Canvas API isPointInPath/isPointInStroke |
| **包围盒 (Bounding Box)** | 图形的轴对齐矩形边界，用于快速排除 |

### 关键知识点

- 点与矩形的关系判断
- 点与圆的关系判断
- 点与多边形的关系判断（射线法）
- isPointInPath(path, x, y, fillRule)
- isPointInStroke(path, x, y)
- 包围盒预检测优化
- 处理变换后的坐标

### 边界与限制

- 几何方法对复杂图形困难
- isPointInPath 需要重建路径或使用 Path2D
- 变换后的检测需要坐标逆变换
- 性能：大量图形需要优化策略

## 4. 写作要求

### 开篇方式
从问题引入：用户点击了 Canvas，我们如何知道他点击的是哪个图形？Canvas 不像 DOM 那样自动处理这个问题，我们需要自己实现点击检测（Hit Testing）。

### 结构组织

```
1. 点击检测概述
   - 为什么需要点击检测
   - 两种主要方法
   - 方法选择考虑因素
   
2. 几何方法
   - 点与矩形
   - 点与圆
   - 点与椭圆
   - 点与多边形（射线法）
   - 点与线段（距离计算）
   
3. 路径方法
   - isPointInPath 基本用法
   - isPointInStroke 区别
   - 使用 Path2D 优化
   - 填充规则的影响
   
4. 包围盒优化
   - 包围盒概念
   - AABB 快速检测
   - 层级包围盒
   
5. 处理变换
   - 变换后的几何检测
   - 坐标逆变换方法
   - 实际应用示例
   
6. 检测策略
   - 图形遍历顺序（从上到下）
   - 提前终止
   - 分区优化
   
7. 本章小结
```

### 代码示例

1. **矩形点击检测**
2. **圆形点击检测**
3. **多边形点击检测（射线法）**
4. **isPointInPath 使用示例**
5. **包围盒检测函数**
6. **带变换的点击检测**
7. **完整的点击检测管理器**

### 图表需求

- **射线法原理图**：展示射线与多边形边的交点计数
- **包围盒示意图**：展示 AABB 快速排除
- **检测流程图**：展示完整的点击检测流程

## 5. 技术细节

### 实现要点

```javascript
// 点与矩形
function isPointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw &&
         py >= ry && py <= ry + rh;
}

// 点与圆
function isPointInCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

// 点与多边形（射线法）
function isPointInPolygon(px, py, vertices) {
  let inside = false;
  const n = vertices.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    if (((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// 点与线段的距离
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  
  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }
  
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.hypot(px - nearestX, py - nearestY);
}

// 使用 isPointInPath
class Shape {
  constructor() {
    this.path = new Path2D();
  }
  
  isPointInside(ctx, x, y) {
    return ctx.isPointInPath(this.path, x, y);
  }
  
  isPointOnStroke(ctx, x, y) {
    return ctx.isPointInStroke(this.path, x, y);
  }
}

// 包围盒
class BoundingBox {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  containsPoint(px, py) {
    return px >= this.x && px <= this.x + this.width &&
           py >= this.y && py <= this.y + this.height;
  }
}

// 带变换的点击检测
function hitTestWithTransform(x, y, object) {
  // 1. 将点转换到对象的本地坐标系
  const localPoint = object.worldToLocal(x, y);
  
  // 2. 在本地坐标系中进行几何检测
  return object.containsPoint(localPoint.x, localPoint.y);
}

// 点击检测管理器
class HitTestManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.objects = [];
  }
  
  add(object) {
    this.objects.push(object);
  }
  
  // 从上层到下层检测（通常反向遍历）
  hitTest(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      
      // 包围盒快速排除
      if (!obj.boundingBox.containsPoint(x, y)) {
        continue;
      }
      
      // 精确检测
      if (obj.containsPoint(x, y)) {
        return obj;
      }
    }
    return null;
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 变换后检测不准 | 将点逆变换到对象本地坐标系 |
| 大量图形检测慢 | 使用包围盒预检测 |
| 复杂图形几何计算困难 | 使用 isPointInPath |
| 描边检测需要容差 | 使用 lineWidth 或距离计算 |

## 6. 风格指导

### 语气语调
- 从问题出发，逐步深入
- 强调性能和优化策略

### 类比方向
- 点击检测类比"问每个图形：这个点在你里面吗？"
- 包围盒类比"先看看在不在这个区域附近"

## 7. 与其他章节的关系

### 前置依赖
- 第7章：路径高级操作
- 第20章：事件绑定与坐标计算

### 后续章节铺垫
- 为第22章"拖拽交互"提供图形选中基础
- 为第39章"对象选择机制"提供核心实现

## 8. 章节检查清单

- [ ] 目标明确：读者能实现各种图形的点击检测
- [ ] 术语统一：点击检测、包围盒等术语定义清晰
- [ ] 最小实现：提供各种检测函数
- [ ] 边界处理：说明变换后的处理方法
- [ ] 性能与权衡：详细讨论优化策略
- [ ] 图示与代码：射线法原理图与代码对应
- [ ] 总结与练习：提供点击检测练习
