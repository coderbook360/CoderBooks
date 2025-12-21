# Canvas 坐标系统

如果你学过数学坐标系，可能会疑惑：为什么 Canvas 的 Y 轴向下？数学中的笛卡尔坐标系 Y 轴向上，原点通常在中心。但 Canvas 的原点在左上角，Y 轴向下增长。

这不是随意设计。早期 CRT 显示器的电子束从屏幕左上角开始，逐行向右下扫描（Raster Scan）。这种自上而下的扫描方式影响了计算机图形学的坐标系设计，成为屏幕坐标系（Screen Coordinate System）的标准约定。

理解 Canvas 坐标系统是精确绘制图形的基础。本章将回答以下核心问题：
- Canvas 坐标系的原点位置和轴方向如何定义？
- 坐标值与像素的映射关系是什么？
- 为什么 1px 线条会渲染为模糊的 2px？（像素边界问题）
- 如何准确地将鼠标事件坐标转换为 Canvas 内部坐标？

---

## Canvas 默认坐标系

首先要问一个问题：**Canvas 的坐标系是如何定义的？**

### 原点与轴方向

Canvas 采用屏幕坐标系（Screen Coordinate System），也称左手坐标系（根据 WHATWG HTML 规范）：

- **原点 (0, 0)**：位于 Canvas 的左上角
- **X 轴**：向右为正方向
- **Y 轴**：向下为正方向（注意：与笛卡尔坐标系相反）

```
(0,0) ──────→ X轴
  │
  │
  │
  ↓
 Y轴
```

这与数学中常用的**笛卡尔坐标系**（Y 轴向上）正好相反。

### 坐标示例

让我们绘制一个矩形来直观理解坐标系：

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 300;

// 绘制一个矩形：起点 (50, 50)，宽 100，高 80
ctx.fillStyle = '#3498db';
ctx.fillRect(50, 50, 100, 80);

// 标注坐标点
ctx.fillStyle = '#e74c3c';
ctx.font = '14px monospace';
ctx.fillText('(0, 0)', 5, 15);
ctx.fillText('(50, 50)', 55, 45);
ctx.fillText('(150, 130)', 155, 145);
```

在这个例子中：
- 原点 (0, 0) 在左上角
- 矩形的左上角在 (50, 50)
- 矩形的右下角在 (150, 130)，计算方式：`(50 + 100, 50 + 80)`

### 绘制坐标轴辅助线

为了更清楚地可视化坐标系，我们可以绘制网格线：

```javascript
function drawGrid(ctx, width, height, step = 50) {
  ctx.save();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  
  // 绘制垂直线（X轴方向）
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    // 标注 X 坐标
    if (x > 0) {
      ctx.fillStyle = '#999';
      ctx.font = '10px monospace';
      ctx.fillText(x, x + 2, 12);
    }
  }
  
  // 绘制水平线（Y轴方向）
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    // 标注 Y 坐标
    if (y > 0) {
      ctx.fillStyle = '#999';
      ctx.font = '10px monospace';
      ctx.fillText(y, 2, y + 12);
    }
  }
  
  ctx.restore();
}

// 使用
drawGrid(ctx, canvas.width, canvas.height, 50);
```

这个辅助函数会绘制一个 50 像素间隔的网格，并标注坐标值，帮助你在开发时精确定位图形。

---

## 像素与坐标的关系

现在我要问第二个问题：**坐标值与实际像素的关系是什么？**

### 像素网格模型

Canvas 的每个坐标单位对应一个像素。关键理解：**坐标点表示像素的边界（边缘），而不是像素的中心**。

根据 Canvas 2D Context 规范（W3C），像素网格（Pixel Grid）是这样定义的：
- 坐标系中的整数坐标对应像素的边界线
- 像素本身占据从 (x, y) 到 (x+1, y+1) 的区域
- 像素的中心位于 (x+0.5, y+0.5)

想象 Canvas 是一张方格纸：
- **坐标点**是方格的交叉点（网格线）
- **像素**是方格本身（网格内的正方形区域）

```
   0   1   2   3   (坐标)
   │   │   │   │
0──┼───┼───┼───┼──
   │ ▓ │ ▓ │   │
1──┼───┼───┼───┼──
   │ ▓ │ ▓ │   │
2──┼───┼───┼───┼──
   │   │   │   │
3──┼───┼───┼───┼──
```

在这个示意图中：
- 坐标 (0, 0) 是左上角的交叉点
- 绘制 `fillRect(0, 0, 2, 2)` 会填充 4 个像素（标记为 ▓）
- 像素 [0, 0] 的中心点是坐标 (0.5, 0.5)

### 半像素问题：为什么线条会模糊？

这是 Canvas 新手最常遇到的困惑：为什么 `lineWidth = 1` 的线条看起来是 2 像素宽且颜色浅淡？

**根本原因**：坐标与像素边界的对齐问题（Pixel Boundary Alignment）。

当在整数坐标（如 x=100）绘制奇数宽度的线条时，线条的中心线落在整数坐标上，但线条需要向两侧各延伸 0.5 像素。浏览器的抗锯齿算法（Anti-Aliasing）会在相邻的两个像素上各绘制 50% 的不透明度，导致线条看起来模糊且颜色变浅。

**错误方式**（整数坐标绘制奇数宽度线条）：

```javascript
ctx.lineWidth = 1;
ctx.strokeStyle = '#000';

// ❌ 在整数坐标绘制，线条跨越两个像素
ctx.beginPath();
ctx.moveTo(100, 50);
ctx.lineTo(100, 150);
ctx.stroke();

// 分析：
// - 线条中心在 x=100
// - 线条范围：x=99.5 到 x=100.5
// - 像素 99 和像素 100 各渲染 50% 不透明度
// - 结果：看起来是 2px 宽的灰色线条
```

**正确方式**（使用 0.5 像素偏移）：

```javascript
ctx.lineWidth = 1;
ctx.strokeStyle = '#000';

// ✅ 使用 .5 偏移，线条中心对齐像素中心
ctx.beginPath();
ctx.moveTo(100.5, 50.5);
ctx.lineTo(100.5, 150.5);
ctx.stroke();

// 分析：
// - 线条中心在 x=100.5（像素 100 的中心）
// - 线条范围：x=100 到 x=101（恰好是一个像素的边界）
// - 像素 100 渲染 100% 不透明度
// - 结果：清晰的 1px 黑色线条
```

**像素对齐通用规则**：

| 情况 | 坐标值 | 原因 |
|------|--------|------|
| **奇数宽度线条**（1px, 3px, 5px）| 使用 `.5` 偏移 | 线条中心对齐像素中心 |
| **偶数宽度线条**（2px, 4px, 6px）| 使用整数坐标 | 线条边界自然对齐像素边界 |
| **填充图形**（fillRect, fill） | 使用整数坐标 | 填充区域天然对齐像素边界 |

**工程经验**：
在实际开发中，可以封装一个 `sharp()` 函数来自动处理像素对齐：

```javascript
// 根据线宽计算清晰的坐标
function sharp(value, lineWidth = 1) {
  return lineWidth % 2 === 1 ? Math.floor(value) + 0.5 : Math.round(value);
}

// 使用
ctx.lineWidth = 1;
ctx.moveTo(sharp(100, 1), sharp(50, 1)); // 返回 (100.5, 50.5)
```

### 对比示例：模糊 vs 清晰

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 200;

ctx.lineWidth = 1;
ctx.strokeStyle = '#000';

// 左侧：模糊的线条（整数坐标）
ctx.font = '12px sans-serif';
ctx.fillText('模糊（整数坐标）', 10, 20);

ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(50, 150);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(30, 100);
ctx.lineTo(70, 100);
ctx.stroke();

// 右侧：清晰的线条（.5 偏移）
ctx.fillText('清晰（.5 偏移）', 210, 20);

ctx.beginPath();
ctx.moveTo(250.5, 50.5);
ctx.lineTo(250.5, 150.5);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(230.5, 100.5);
ctx.lineTo(270.5, 100.5);
ctx.stroke();
```

放大查看这两组线条，你会明显看到左侧的线条更宽且颜色更浅（灰色），右侧的线条细且颜色纯黑。

---

## 坐标计算实践：从页面坐标到 Canvas 坐标

现在我要问第三个问题：**如何将鼠标位置转换为 Canvas 坐标？**

当用户在 Canvas 上点击或拖动时，浏览器提供的是**页面坐标**（相对于整个文档），我们需要将其转换为 **Canvas 内部坐标**。

### 基础转换：getBoundingClientRect()

```javascript
function getCanvasCoordinates(canvas, event) {
  // 获取 Canvas 元素在视口中的位置和尺寸
  const rect = canvas.getBoundingClientRect();
  
  // 鼠标相对于 Canvas 左上角的偏移
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  return { x, y };
}

// 使用示例
canvas.addEventListener('click', (event) => {
  const { x, y } = getCanvasCoordinates(canvas, event);
  console.log(`点击坐标: (${x}, ${y})`);
  
  // 在点击位置绘制一个圆
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
});
```

### 处理 Canvas 缩放

如果 Canvas 的 **CSS 显示尺寸** 与 **实际像素尺寸** 不一致，需要进行缩放转换：

```javascript
function getCanvasCoordinates(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  
  // 计算缩放比例
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  // 考虑缩放后的坐标
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  
  return { x, y };
}
```

**为什么需要缩放因子？**

假设：
- Canvas 的实际像素尺寸：1600×1200（`canvas.width` × `canvas.height`）
- CSS 显示尺寸：800×600（`style.width` × `style.height`）

此时 `scaleX = 1600 / 800 = 2`，`scaleY = 1200 / 600 = 2`。

鼠标在 CSS 坐标系中的位置是 (400, 300)，但在 Canvas 内部坐标系中对应的是 (800, 600)。

### 完整的坐标转换工具类

```javascript
class CoordinateHelper {
  constructor(canvas) {
    this.canvas = canvas;
  }
  
  // 从事件对象获取 Canvas 坐标
  fromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }
  
  // 检查坐标是否在 Canvas 范围内
  isInBounds(x, y) {
    return x >= 0 && x < this.canvas.width &&
           y >= 0 && y < this.canvas.height;
  }
  
  // 将 Canvas 坐标限制在边界内
  clamp(x, y) {
    return {
      x: Math.max(0, Math.min(this.canvas.width - 1, x)),
      y: Math.max(0, Math.min(this.canvas.height - 1, y))
    };
  }
}

// 使用示例
const helper = new CoordinateHelper(canvas);

canvas.addEventListener('mousemove', (event) => {
  const { x, y } = helper.fromEvent(event);
  
  if (helper.isInBounds(x, y)) {
    console.log(`鼠标在 Canvas 内: (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }
});
```

---

## 超出边界的绘制

现在我要问第四个问题：**如果绘制的图形超出 Canvas 边界会怎样？**

### Canvas 的裁剪区域

Canvas 有一个隐式的 **裁剪区域**（Clipping Region），默认等于整个 Canvas 尺寸。任何超出这个区域的绘制都会被裁剪掉。

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 300;

// 绘制一个部分超出边界的矩形
ctx.fillStyle = '#3498db';
ctx.fillRect(350, 250, 100, 100); // 起点 (350, 250)，宽高 100

// 实际只会显示 50×50 的部分，其余被裁剪
```

在这个例子中，矩形的理论范围是 (350, 250) 到 (450, 350)，但 Canvas 只有 400×300 的尺寸，所以只有 (350, 250) 到 (400, 300) 的部分会被绘制。

### 负坐标的有效性

Canvas 支持 **负坐标**，但负坐标区域同样会被裁剪：

```javascript
// 绘制一个起点为负坐标的矩形
ctx.fillStyle = '#e74c3c';
ctx.fillRect(-20, -20, 60, 60);

// 实际只会显示 (0, 0) 到 (40, 40) 的部分
```

这个特性在处理拖拽、平移等交互时非常有用——你不需要手动限制坐标范围，Canvas 会自动裁剪超出部分。

### 检查图形是否可见

在优化渲染性能时，常常需要判断图形是否在可见区域内：

```javascript
function isRectVisible(canvas, x, y, width, height) {
  return !(
    x + width < 0 ||   // 完全在左边界外
    x > canvas.width ||  // 完全在右边界外
    y + height < 0 ||    // 完全在上边界外
    y > canvas.height    // 完全在下边界外
  );
}

// 使用示例
const shapes = [
  { x: 100, y: 100, width: 50, height: 50 },
  { x: -100, y: -100, width: 50, height: 50 }, // 不可见
  { x: 500, y: 500, width: 50, height: 50 }    // 不可见
];

shapes.forEach(shape => {
  if (isRectVisible(canvas, shape.x, shape.y, shape.width, shape.height)) {
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
  }
});
```

这种优化在处理大量图形对象时能显著提升性能——只绘制可见的对象。

---

## 坐标系统与未来章节的关系

理解坐标系统是 Canvas 编程的基础，它为后续许多高级主题奠定了基础：

### 坐标变换（第15-19章）

在后续章节中，我们会学习如何**改变坐标系**：
- **平移**（translate）：移动原点位置
- **旋转**（rotate）：旋转坐标轴
- **缩放**（scale）：改变坐标单位

```javascript
// 预览：将原点移到画布中心
ctx.translate(canvas.width / 2, canvas.height / 2);

// 现在 (0, 0) 是画布中心，可以实现数学坐标系
ctx.scale(1, -1); // Y 轴翻转，向上为正
```

### 事件与交互（第20-24章）

坐标转换是实现交互的核心：
- **点击检测**：判断鼠标点击了哪个图形
- **拖拽**：根据鼠标位移更新图形坐标
- **缩放与平移**：实现画布的平移和缩放（类似地图应用）

---

## 高 DPI 屏幕的坐标问题（简要提及）

在 Retina 屏幕等高 DPI 设备上，`window.devicePixelRatio` 大于 1（通常是 2 或 3）。这会影响坐标计算：

```javascript
const dpr = window.devicePixelRatio || 1;

// 设置实际像素尺寸为显示尺寸的 dpr 倍
canvas.width = 800 * dpr;
canvas.height = 600 * dpr;
canvas.style.width = '800px';
canvas.style.height = '600px';

// 缩放上下文
ctx.scale(dpr, dpr);

// 坐标转换时需要考虑 dpr
function getCanvasCoordinates(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width / dpr;  // 除以 dpr
  const scaleY = canvas.height / rect.height / dpr;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}
```

完整的高 DPI 适配方案会在第46章"高 DPI 屏幕适配"中详细讲解。

---

## 本章小结

让我们回顾一下坐标系统的核心要点：

**坐标系定义**：
- 原点 (0, 0) 在左上角
- X 轴向右，Y 轴向下
- 每个坐标单位对应一个像素

**像素与坐标**：
- 坐标指的是像素边界，不是像素中心
- 像素 [i, j] 的中心点是坐标 (i + 0.5, j + 0.5)
- 绘制清晰的奇数宽度线条需要 .5 偏移

**坐标转换**：
- 使用 `getBoundingClientRect()` 获取 Canvas 位置
- 考虑 CSS 缩放因子：`canvas.width / rect.width`
- 使用工具类封装坐标转换逻辑

**边界处理**：
- Canvas 自动裁剪超出边界的内容
- 负坐标有效但会被裁剪
- 可以通过边界检测优化渲染性能

**下一步**：
在下一章，我们将学习绘图上下文的状态管理，理解如何保存和恢复绘图状态，为复杂的图形绘制做准备。

---

## 实践练习

**练习 1：绘制棋盘**

使用坐标系统知识，绘制一个 8×8 的国际象棋棋盘：

```javascript
function drawChessboard(ctx, size, cellSize) {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }
  }
}

drawChessboard(ctx, 8, 50); // 8×8 棋盘，每格 50px
```

**练习 2：实现坐标跟随**

让一个圆圈跟随鼠标移动：

```javascript
const helper = new CoordinateHelper(canvas);
let mouseX = 0, mouseY = 0;

canvas.addEventListener('mousemove', (event) => {
  const coords = helper.fromEvent(event);
  mouseX = coords.x;
  mouseY = coords.y;
});

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制跟随鼠标的圆圈
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
  ctx.fill();
  
  requestAnimationFrame(animate);
}

animate();
```

**练习 3：绘制网格坐标标尺**

创建一个带有坐标标尺的 Canvas，类似设计工具的标尺功能。

---

## 思考题

1. 如果要实现一个数学绘图工具（Y 轴向上的坐标系），如何改造 Canvas 的坐标系？
2. 为什么 2px 宽度的线条不需要 .5 偏移就能保持清晰？
3. 如果 Canvas 的 CSS 尺寸是 400×300，实际像素是 1600×1200，`devicePixelRatio` 是 2，那么鼠标点击 CSS 坐标 (200, 150) 对应的 Canvas 内部坐标是多少？
4. 如何实现一个"吸附网格"的功能，让拖动的图形自动对齐到最近的网格交叉点？

通过这些练习和思考，你已经掌握了 Canvas 坐标系统的核心知识。在下一章，我们将学习如何管理绘图上下文的状态，为更复杂的图形操作做准备！
