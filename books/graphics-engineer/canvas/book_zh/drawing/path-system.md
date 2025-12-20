# 路径系统：直线、曲线与贝塞尔

在上一章，我们学习了 Canvas 的基础图形绘制。你可能会好奇：如果我想绘制一个心形、一个复杂的图标，或者自定义的任何形状，该怎么做？

这就需要理解 Canvas 的 **路径系统**（Path System）。路径系统是 Canvas 绘制的核心机制，它就像用隐形的笔在画布上规划形状的轮廓，然后一次性填充或描边。

首先要问一个问题：**Canvas 是如何绘制复杂形状的？**

答案是：**将形状分解为一系列直线和曲线的连接，通过路径系统组合起来**。

本章将回答以下问题：
- 路径的生命周期是什么？
- 如何绘制直线、折线和多边形？
- 如何绘制曲线？贝塞尔曲线是什么？
- 如何用路径绘制复杂图形？

---

## 路径系统概述

现在要问第二个问题：**什么是路径？**

**路径（Path）** 是一系列相连或独立的 **子路径（Subpath）** 的集合。每个子路径由一系列连接的点组成，这些点通过直线或曲线相连。

### 路径的生命周期

路径绘制遵循严格的生命周期：

```
1. beginPath()   → 开始新路径（清除旧路径）
2. moveTo(x, y)  → 移动到起点（开始子路径）
3. lineTo/arc... → 绘制路径（构建形状）
4. closePath()   → 闭合路径（可选）
5. fill/stroke() → 填充或描边
```

**关键概念**：
- **当前点（Current Point）**：路径绘制的当前位置，影响下一个操作的起点
- **子路径**：一个 `moveTo` 开始到下一个 `moveTo` 之前的连续绘制

### beginPath() 的重要性

思考一下：如果不调用 `beginPath()`，会发生什么？

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 300;

// 第一次绘制三角形
ctx.moveTo(50, 50);
ctx.lineTo(100, 100);
ctx.lineTo(50, 100);
ctx.closePath();
ctx.stroke();

// 第二次绘制矩形（忘记调用 beginPath）
ctx.moveTo(150, 50);
ctx.lineTo(250, 50);
ctx.lineTo(250, 150);
ctx.lineTo(150, 150);
ctx.closePath();
ctx.stroke(); // 问题：会重新绘制三角形！
```

**结果**：第二次 `stroke()` 会把三角形和矩形**一起绘制**，因为矩形路径累积在了三角形路径上。

**正确做法**：每次绘制新形状前，必须调用 `beginPath()` 清除旧路径：

```javascript
// 第一次绘制三角形
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(100, 100);
ctx.lineTo(50, 100);
ctx.closePath();
ctx.stroke();

// 第二次绘制矩形（正确）
ctx.beginPath(); // 新增：清除旧路径
ctx.moveTo(150, 50);
ctx.lineTo(250, 50);
ctx.lineTo(250, 150);
ctx.lineTo(150, 150);
ctx.closePath();
ctx.stroke();
```

有没有很关键？`beginPath()` 是路径绘制的第一步，**绝对不能省略**。

---

## 直线路径

现在要问第三个问题：**如何绘制直线和折线？**

Canvas 提供了两个基础方法：

### moveTo(x, y)：移动画笔

`moveTo` 将当前点移动到指定位置，**不绘制任何东西**，只是"抬起笔"移动到新位置。

```javascript
ctx.beginPath();
ctx.moveTo(50, 50); // 将画笔移动到 (50, 50)
// 此时没有绘制任何内容
```

### lineTo(x, y)：绘制直线

`lineTo` 从当前点绘制一条直线到指定点，并将当前点更新为新位置。

```javascript
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(200, 50); // 从 (50, 50) 绘制直线到 (200, 50)
ctx.stroke();
```

### 绘制折线

通过多次调用 `lineTo`，可以绘制折线：

```javascript
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(100, 100);
ctx.lineTo(150, 50);
ctx.lineTo(200, 100);
ctx.lineTo(250, 50);
ctx.strokeStyle = '#3498db';
ctx.lineWidth = 3;
ctx.stroke();
```

### 绘制三角形

```javascript
function drawTriangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath(); // 闭合路径（自动连接到起点）
  ctx.fill();
}

// 使用
drawTriangle(ctx, 50, 50, 150, 50, 100, 150);
```

### closePath()：闭合路径

`closePath()` 从当前点绘制一条直线回到子路径的起点，形成闭合形状。

**与手动 lineTo 起点的区别**：

```javascript
// 方式1：手动闭合（不推荐）
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(150, 50);
ctx.lineTo(100, 150);
ctx.lineTo(50, 50); // 手动连接到起点
ctx.stroke();

// 方式2：使用 closePath（推荐）
ctx.beginPath();
ctx.moveTo(200, 50);
ctx.lineTo(300, 50);
ctx.lineTo(250, 150);
ctx.closePath(); // 自动闭合
ctx.stroke();
```

**区别**：
- 手动闭合：起点和终点的线段连接可能不完美（端点样式）
- `closePath()`：保证闭合连接的完美性，特别是在 `lineJoin` 等属性下

---

## 绘制多边形

通过路径系统，我们可以绘制任意正多边形：

```javascript
function drawPolygon(ctx, cx, cy, radius, sides, options = {}) {
  const {
    fillStyle = '#3498db',
    strokeStyle = '#2980b9',
    lineWidth = 2,
    rotation = 0 // 旋转角度（度）
  } = options;
  
  ctx.beginPath();
  
  for (let i = 0; i < sides; i++) {
    // 计算每个顶点的角度
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2 + (rotation * Math.PI / 180);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.closePath();
  
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// 使用：绘制不同的正多边形
drawPolygon(ctx, 100, 100, 50, 3);  // 三角形
drawPolygon(ctx, 200, 100, 50, 5);  // 五边形
drawPolygon(ctx, 300, 100, 50, 6);  // 六边形
drawPolygon(ctx, 400, 100, 50, 8);  // 八边形
```

思考一下：这个函数是如何工作的？
- 将圆周（360°）分成 `sides` 等份
- 计算每个顶点在圆上的位置（极坐标转直角坐标）
- 用 `lineTo` 依次连接各顶点
- 用 `closePath` 闭合多边形

---

## 贝塞尔曲线

现在要问第四个问题：**如何绘制曲线？**

Canvas 提供了两种贝塞尔曲线方法：
- **二次贝塞尔曲线**：`quadraticCurveTo`（1个控制点）
- **三次贝塞尔曲线**：`bezierCurveTo`（2个控制点）

### 什么是贝塞尔曲线？

贝塞尔曲线是一种用 **控制点** 定义曲线形状的数学曲线。控制点不在曲线上，但它们像"磁铁"一样吸引曲线，改变曲线的弯曲程度。

**直观理解**：
- 起点：曲线的开始位置
- 控制点：决定曲线的弯曲方向和程度（不在曲线上）
- 终点：曲线的结束位置

### 二次贝塞尔曲线

```javascript
// 语法
ctx.quadraticCurveTo(cpx, cpy, x, y)
```

**参数**：
- `cpx, cpy`：控制点坐标
- `x, y`：终点坐标
- 起点是当前点（由 `moveTo` 或上一个路径操作确定）

```javascript
ctx.beginPath();
ctx.moveTo(50, 100); // 起点
ctx.quadraticCurveTo(150, 50, 250, 100); // 控制点 (150, 50)，终点 (250, 100)
ctx.strokeStyle = '#3498db';
ctx.lineWidth = 3;
ctx.stroke();

// 可选：标记控制点和端点（帮助理解）
ctx.fillStyle = '#e74c3c';
ctx.fillRect(50 - 3, 100 - 3, 6, 6);    // 起点
ctx.fillRect(250 - 3, 100 - 3, 6, 6);   // 终点
ctx.fillStyle = '#2ecc71';
ctx.fillRect(150 - 3, 50 - 3, 6, 6);    // 控制点
```

**控制点的作用**：
- 控制点越远离起点和终点连线，曲线弯曲越明显
- 控制点的位置决定曲线的弯曲方向

### 三次贝塞尔曲线

三次贝塞尔曲线有 **两个控制点**，可以创造更复杂的曲线：

```javascript
// 语法
ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
```

**参数**：
- `cp1x, cp1y`：第一个控制点
- `cp2x, cp2y`：第二个控制点
- `x, y`：终点

```javascript
ctx.beginPath();
ctx.moveTo(50, 150); // 起点
ctx.bezierCurveTo(100, 50, 200, 250, 250, 150); 
// 控制点1 (100, 50)，控制点2 (200, 250)，终点 (250, 150)
ctx.strokeStyle = '#9b59b6';
ctx.lineWidth = 3;
ctx.stroke();

// 标记点
ctx.fillStyle = '#e74c3c';
ctx.fillRect(50 - 3, 150 - 3, 6, 6);    // 起点
ctx.fillRect(250 - 3, 150 - 3, 6, 6);   // 终点
ctx.fillStyle = '#2ecc71';
ctx.fillRect(100 - 3, 50 - 3, 6, 6);    // 控制点1
ctx.fillRect(200 - 3, 250 - 3, 6, 6);   // 控制点2
```

**两个控制点的协同作用**：
- 第一个控制点影响起点附近的曲线方向
- 第二个控制点影响终点附近的曲线方向
- 两个控制点共同决定整体曲线形状

有没有很强大？三次贝塞尔曲线可以创造出非常平滑和自然的曲线。

---

## 曲线应用实践

### 绘制圆角矩形

使用二次贝塞尔曲线，我们可以轻松绘制圆角矩形：

```javascript
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  
  // 顶部边（左上圆角后）
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  
  // 右上圆角
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  
  // 右侧边
  ctx.lineTo(x + width, y + height - radius);
  
  // 右下圆角
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  
  // 底部边
  ctx.lineTo(x + radius, y + height);
  
  // 左下圆角
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  
  // 左侧边
  ctx.lineTo(x, y + radius);
  
  // 左上圆角
  ctx.quadraticCurveTo(x, y, x + radius, y);
  
  ctx.closePath();
}

// 使用
roundRect(ctx, 50, 50, 200, 100, 15);
ctx.fillStyle = '#3498db';
ctx.fill();
ctx.strokeStyle = '#2980b9';
ctx.lineWidth = 2;
ctx.stroke();
```

**原理**：
- 每个圆角用一个二次贝塞尔曲线
- 控制点位于直角顶点
- 曲线起点和终点分别在两条边上，距离顶点 `radius` 像素

### 绘制心形

通过三次贝塞尔曲线，我们可以绘制平滑的心形：

```javascript
function drawHeart(ctx, x, y, size) {
  const topY = y - size * 0.3;
  
  ctx.beginPath();
  
  // 左半边
  ctx.moveTo(x, topY + size * 0.3);
  ctx.bezierCurveTo(
    x, topY,
    x - size * 0.5, topY,
    x - size * 0.5, topY + size * 0.3
  );
  ctx.bezierCurveTo(
    x - size * 0.5, topY + size * 0.5,
    x, topY + size * 0.8,
    x, topY + size
  );
  
  // 右半边
  ctx.bezierCurveTo(
    x, topY + size * 0.8,
    x + size * 0.5, topY + size * 0.5,
    x + size * 0.5, topY + size * 0.3
  );
  ctx.bezierCurveTo(
    x + size * 0.5, topY,
    x, topY,
    x, topY + size * 0.3
  );
  
  ctx.closePath();
}

// 使用
drawHeart(ctx, 200, 150, 100);
ctx.fillStyle = '#e74c3c';
ctx.fill();
```

有没有很浪漫？通过精心设计的控制点，你可以绘制出各种复杂而优美的形状。

### 绘制波浪线

```javascript
function drawWave(ctx, x, y, width, amplitude, frequency) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  
  const step = width / frequency;
  
  for (let i = 0; i < frequency; i++) {
    const cpx1 = x + step * i + step * 0.25;
    const cpy1 = y + (i % 2 === 0 ? -amplitude : amplitude);
    const cpx2 = x + step * i + step * 0.75;
    const cpy2 = y + (i % 2 === 0 ? -amplitude : amplitude);
    const endX = x + step * (i + 1);
    const endY = y;
    
    ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, endX, endY);
  }
  
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// 使用
drawWave(ctx, 50, 150, 300, 20, 4);
```

---

## 本章小结

让我们回顾一下路径系统的核心要点：

**路径生命周期**：
1. `beginPath()`：开始新路径（必须）
2. `moveTo(x, y)`：移动到起点
3. `lineTo/arc/quadraticCurveTo/bezierCurveTo`：构建路径
4. `closePath()`：闭合路径（可选）
5. `fill()`/`stroke()`：填充或描边

**直线绘制**：
- `moveTo(x, y)`：移动画笔，不绘制
- `lineTo(x, y)`：从当前点绘制直线
- `closePath()`：闭合路径

**贝塞尔曲线**：
- 二次贝塞尔：1个控制点，适合简单曲线
- 三次贝塞尔：2个控制点，适合复杂平滑曲线
- 控制点像"磁铁"，吸引曲线弯曲

**下一步**：
在下一章，我们将深入学习路径的高级用法，包括圆弧、非零环绕规则和复杂路径操作。

---

## 思考题

1. 为什么每次绘制新形状都要调用 `beginPath()`？
2. `closePath()` 和手动 `lineTo` 回起点有什么区别？
3. 如何用二次贝塞尔曲线绘制一个抛物线？
4. 三次贝塞尔曲线的两个控制点分别控制哪部分曲线？
5. 如何绘制一个五角星？（提示：使用 `lineTo` 和正确的顶点顺序）

通过本章的学习，你已经掌握了 Canvas 路径系统的核心概念。在下一章，我们将学习更高级的路径操作！
