# 基础图形：矩形、圆、椭圆

在前面的章节中，我们学习了 Canvas 的基础概念、坐标系统、状态管理和像素操作。现在是时候开始真正的图形绘制了。

首先要问一个问题：**Canvas 支持直接绘制哪些基本图形？**

答案可能让你意外：Canvas 只为 **矩形** 提供了直接绘制方法（`fillRect`、`strokeRect`、`clearRect`）。为什么 Canvas 特别对待矩形？因为矩形在 UI 开发中极其常用——按钮、面板、边框、分割线等等，几乎无处不在。

那其他图形呢？圆形、三角形、多边形都需要通过 **路径系统** 来绘制。路径系统是 Canvas 绘制的核心机制，我们将在本章和下一章深入学习。

本章将回答以下问题：
- 如何绘制矩形？有哪些方法？
- Canvas 的角度系统是什么？如何转换角度和弧度？
- 如何绘制圆形、弧形和扇形？
- 如何绘制椭圆？

---

## 矩形绘制

首先要问：**Canvas 提供了哪些矩形绘制方法？**

Canvas 提供了三个直接绘制矩形的方法，以及一个路径方法：

### fillRect()：填充矩形

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 300;

// 填充矩形：ctx.fillRect(x, y, width, height)
ctx.fillStyle = '#3498db';
ctx.fillRect(50, 50, 100, 80);
```

**参数**：
- `x, y`：矩形左上角坐标
- `width, height`：矩形的宽度和高度

**特点**：
- 立即填充矩形，无需 `beginPath()` 或 `fill()`
- 使用当前的 `fillStyle` 作为填充颜色

### strokeRect()：描边矩形

```javascript
ctx.strokeStyle = '#e74c3c';
ctx.lineWidth = 3;
ctx.strokeRect(170, 50, 100, 80);
```

**特点**：
- 只绘制矩形的轮廓，不填充
- 使用当前的 `strokeStyle` 和 `lineWidth`

### clearRect()：清除矩形区域

```javascript
// 在填充的矩形中间挖一个洞
ctx.fillStyle = '#2ecc71';
ctx.fillRect(50, 150, 200, 100);

ctx.clearRect(100, 175, 100, 50);
```

**特点**：
- 清除指定区域的内容，变为透明
- 常用于清空画布：`ctx.clearRect(0, 0, canvas.width, canvas.height)`

### rect()：路径矩形

除了直接绘制，还可以将矩形添加到路径中：

```javascript
ctx.beginPath();
ctx.rect(290, 50, 80, 80);
ctx.fillStyle = '#f39c12';
ctx.fill();
```

**与 fillRect/strokeRect 的区别**：
- `rect()` 只是添加矩形到当前路径，不会立即绘制
- 可以与其他路径操作组合，形成复杂路径
- 需要显式调用 `fill()` 或 `stroke()` 来绘制

### 负宽度和负高度

Canvas 允许负的宽度和高度，效果是反向绘制：

```javascript
// 正常矩形
ctx.fillStyle = '#3498db';
ctx.fillRect(50, 50, 100, 80); // 从左上到右下

// 负宽度：从右向左绘制
ctx.fillStyle = '#e74c3c';
ctx.fillRect(250, 50, -100, 80); // 从 (250, 50) 向左绘制

// 负高度：从下向上绘制
ctx.fillStyle = '#2ecc71';
ctx.fillRect(50, 200, 100, -80); // 从 (50, 200) 向上绘制
```

思考一下：这个特性在什么场景下有用？答案是：当你需要相对于参考点反向绘制图形时（比如绘制坐标轴）。

---

## 弧度与角度

现在要问第二个问题：**Canvas 的角度系统是什么？**

Canvas 使用 **弧度制**（Radians）而不是角度制（Degrees）。这是数学和编程中的标准做法。

### 弧度制详解

**弧度的定义**：一个圆的完整周长对应 2π 弧度（约 6.28）。

### 常用角度与弧度对照

**直角与平角**：
- **0度** = 0 弧度 = `0`
- **90度**（直角）= π/2 弧度 = `Math.PI / 2`
- **180度**（平角）= π 弧度 = `Math.PI`
- **270度** = 3π/2 弧度 = `Math.PI * 1.5`
- **360度**（周角）= 2π 弧度 = `Math.PI * 2`

**常用锐角**：
- **30度** = π/6 弧度 = `Math.PI / 6`
- **45度** = π/4 弧度 = `Math.PI / 4`
- **60度** = π/3 弧度 = `Math.PI / 3`

### 角度弧度转换

```javascript
// 角度转弧度
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

// 弧度转角度
function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

// 使用示例
console.log(degToRad(90));  // 1.5707... (π/2)
console.log(radToDeg(Math.PI)); // 180
```

**为什么 Canvas 使用弧度？**
- 弧度是数学中的标准单位，更自然
- 计算更简洁（圆周长 = 2πr，不需要额外转换）
- 与三角函数（sin、cos）配合更方便

---

## 圆形绘制

现在要问第三个问题：**如何绘制圆形和弧形？**

Canvas 通过 `arc()` 方法绘制圆弧，完整的圆只是一种特殊的圆弧（0° 到 360°）。

### arc() 方法详解

```javascript
// 语法
ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise)
```

**参数说明**：
- `x, y`：圆心坐标
- `radius`：半径
- `startAngle`：起始角度（弧度）
- `endAngle`：结束角度（弧度）
- `counterclockwise`：是否逆时针绘制（可选，默认 false）

**起始角度位置**：
- 0 弧度（0°）位于 **3点钟方向**（正右方）
- 角度顺时针增加（Math.PI/2 是6点钟方向，Math.PI 是9点钟方向）

```
       12点 (3π/2 或 -π/2)
           ↑
           │
9点 (π) ← (x,y) → 3点 (0)
           │
           ↓
       6点 (π/2)
```

### 绘制完整圆形

```javascript
function drawCircle(ctx, x, y, radius, fillStyle) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// 使用
drawCircle(ctx, 100, 100, 50, '#3498db');
```

**关键点**：
- 必须调用 `beginPath()` 开始新路径
- 起始角度 0，结束角度 2π，绘制完整的圆
- 调用 `fill()` 或 `stroke()` 完成绘制

### 绘制半圆

```javascript
// 右半圆（3点到9点，逆时针）
ctx.beginPath();
ctx.arc(100, 100, 50, -Math.PI / 2, Math.PI / 2);
ctx.fillStyle = '#e74c3c';
ctx.fill();

// 左半圆（9点到3点，逆时针）
ctx.beginPath();
ctx.arc(200, 100, 50, Math.PI / 2, -Math.PI / 2);
ctx.fillStyle = '#2ecc71';
ctx.fill();
```

### 绘制扇形

扇形需要从圆心出发，绘制弧线，然后回到圆心闭合：

```javascript
function drawSector(ctx, x, y, radius, startAngle, endAngle, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x, y); // 移动到圆心
  ctx.arc(x, y, radius, startAngle, endAngle);
  ctx.closePath(); // 闭合路径（回到圆心）
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// 绘制一个60°扇形（从3点钟方向开始）
drawSector(ctx, 200, 200, 80, 0, degToRad(60), '#f39c12');

// 绘制一个90°扇形（从12点钟方向开始）
drawSector(ctx, 350, 200, 80, degToRad(-90), 0, '#9b59b6');
```

### counterclockwise 参数

默认情况下，`arc()` 按 **顺时针** 绘制。如果需要逆时针，设置第6个参数为 `true`：

```javascript
// 顺时针（默认）
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI / 2);
ctx.stroke();

// 逆时针
ctx.beginPath();
ctx.arc(200, 100, 50, 0, Math.PI / 2, true);
ctx.stroke();
```

有没有很神奇？同样的起始和结束角度，逆时针参数会让弧线走"另一边"。

---

## 椭圆绘制

现在要问第四个问题：**如何绘制椭圆？**

Canvas 提供了 `ellipse()` 方法（ES6+），用于绘制椭圆：

> **浏览器兼容性提示**  
> `ellipse()` 方法在以下浏览器中支持：
> - Chrome 31+
> - Firefox 48+
> - Safari 9+
> - Edge 13+
> - ❌ IE不支持（见下方兼容方案）

```javascript
// 语法
ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise)
```

**参数说明**：
- `x, y`：椭圆中心坐标
- `radiusX`：X轴半径（水平半径）
- `radiusY`：Y轴半径（垂直半径）
- `rotation`：椭圆旋转角度（弧度）
- `startAngle`：起始角度（弧度）
- `endAngle`：结束角度（弧度）
- `counterclockwise`：是否逆时针

### 绘制基础椭圆

```javascript
function drawEllipse(ctx, x, y, radiusX, radiusY, fillStyle) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// 水平椭圆
drawEllipse(ctx, 100, 100, 80, 50, '#3498db');

// 垂直椭圆
drawEllipse(ctx, 250, 100, 50, 80, '#e74c3c');
```

### 旋转椭圆

`rotation` 参数可以旋转椭圆：

```javascript
// 旋转45°的椭圆
ctx.beginPath();
ctx.ellipse(400, 100, 80, 50, degToRad(45), 0, Math.PI * 2);
ctx.fillStyle = '#2ecc71';
ctx.fill();

// 旋转-30°的椭圆
ctx.beginPath();
ctx.ellipse(400, 250, 80, 50, degToRad(-30), 0, Math.PI * 2);
ctx.fillStyle = '#f39c12';
ctx.fill();
```

### 兼容性方案与Polyfill

对于需要支持旧浏览器的项目，可以使用以下Polyfill：

```javascript
// Polyfill: 为不支持ellipse的浏览器添加实现
if (!CanvasRenderingContext2D.prototype.ellipse) {
  CanvasRenderingContext2D.prototype.ellipse = function(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
    this.save();
    this.translate(x, y);
    this.rotate(rotation);
    this.scale(radiusX, radiusY);
    this.arc(0, 0, 1, startAngle, endAngle, anticlockwise);
    this.restore();
  };
}
```

使用这个Polyfill后，可以在任何浏览器中安全使用`ellipse()`方法。

**兼容方案（手动实现）**：

```javascript
// 手动实现椭圆绘制（不修改原型）
function drawEllipseCompat(ctx, x, y, radiusX, radiusY, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(radiusX, radiusY);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();
}

// 使用
ctx.fillStyle = '#3498db';
drawEllipseCompat(ctx, 200, 150, 80, 50, Math.PI / 4);
ctx.fill();
```

---

## 组合应用

基础图形可以组合成复杂的形状。让我们绘制一个简单的笑脸：

```javascript
function drawSmiley(ctx, x, y, radius) {
  // 脸（圆形）
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f39c12';
  ctx.fill();
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 左眼
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
  
  // 右眼
  ctx.beginPath();
  ctx.arc(x + radius * 0.3, y - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // 嘴巴（下半圆）
  ctx.beginPath();
  ctx.arc(x, y + radius * 0.1, radius * 0.5, 0, Math.PI);
  ctx.stroke();
}

// 使用
drawSmiley(ctx, 200, 200, 80);
```

有没有很有趣？通过组合基础图形，你可以创建各种复杂的图标和图形。

---

## 本章小结

让我们回顾一下基础图形绘制的核心要点：

**矩形绘制**：
- `fillRect(x, y, w, h)`：填充矩形
- `strokeRect(x, y, w, h)`：描边矩形
- `clearRect(x, y, w, h)`：清除矩形
- `rect(x, y, w, h)`：路径矩形

**角度系统**：
- Canvas 使用弧度制（0 到 2π）
- 转换公式：`弧度 = 角度 × π / 180`
- 0 弧度位于3点钟方向

**圆形绘制**：
- `arc(x, y, r, start, end, ccw)`
- 完整圆：起始0，结束2π
- 扇形：从圆心 `moveTo`，然后 `arc`，最后 `closePath`

**椭圆绘制**：
- `ellipse(x, y, rx, ry, rotation, start, end, ccw)`
- 可以旋转椭圆
- 旧浏览器用缩放模拟

**下一步**：
在下一章，我们将深入学习路径系统，绘制直线、曲线和贝塞尔曲线，解锁更复杂的图形绘制能力。

---

## 思考题

1. 如何绘制一个圆环（两个同心圆，外圆填充，内圆镂空）？
2. 如何绘制一个饼图（多个扇形组合）？
3. `arc()` 的 `counterclockwise` 参数在什么情况下会影响结果？
4. 如何用 `arc()` 绘制一个圆角矩形？

通过本章的学习，你已经掌握了 Canvas 的基础图形绘制。在下一章，我们将学习更强大的路径系统！
