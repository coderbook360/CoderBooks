# 渐变与图案

纯色填充虽然简洁，但在很多场景下显得过于单调。想象一个按钮，如果能有从上到下的光泽渐变，是不是看起来更有立体感？或者一个球体，通过径向渐变模拟光照效果，是不是更加真实？本章将带你掌握Canvas的两大视觉增强武器：渐变（Gradient）和图案（Pattern）。

## 线性渐变：沿直线的颜色过渡

首先要问一个问题：**如何创建一个从左到右、从红色过渡到蓝色的渐变？**

答案是使用 `createLinearGradient()`。这个方法需要四个参数：起点坐标 `(x0, y0)` 和终点坐标 `(x1, y1)`，它们定义了渐变的方向和范围。

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 创建从左到右的线性渐变
const gradient = ctx.createLinearGradient(0, 0, 200, 0);

// 添加色标：0% 位置是红色，100% 位置是蓝色
gradient.addColorStop(0, 'red');
gradient.addColorStop(1, 'blue');

// 使用渐变作为填充样式
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 200, 100);
```

这段代码创建了一个从 `(0, 0)` 到 `(200, 0)` 的水平渐变。关键在于两点：
- **方向**：起点到终点的连线决定了渐变方向（这里是水平向右）
- **色标**：通过 `addColorStop(offset, color)` 定义颜色位置，`offset` 范围是 0-1

### 控制渐变方向

思考一下，如果想要垂直渐变或对角渐变，该怎么办？

修改起点和终点坐标就行了：

```javascript
// 垂直渐变：从上到下
const verticalGradient = ctx.createLinearGradient(0, 0, 0, 200);
verticalGradient.addColorStop(0, '#4CAF50');
verticalGradient.addColorStop(1, '#FFC107');

// 对角渐变：从左上到右下
const diagonalGradient = ctx.createLinearGradient(0, 0, 200, 200);
diagonalGradient.addColorStop(0, '#E91E63');
diagonalGradient.addColorStop(1, '#9C27B0');
```

关键原理：**渐变的方向由起点到终点的向量决定**。这个向量可以是任意角度，不局限于水平或垂直。

### 多色渐变：创建彩虹效果

现在我要问第二个问题：**如果想要红、橙、黄、绿、蓝、紫的彩虹效果，怎么办？**

答案是添加多个色标：

```javascript
const rainbow = ctx.createLinearGradient(0, 0, 300, 0);
rainbow.addColorStop(0, 'red');
rainbow.addColorStop(0.16, 'orange');
rainbow.addColorStop(0.33, 'yellow');
rainbow.addColorStop(0.5, 'green');
rainbow.addColorStop(0.66, 'blue');
rainbow.addColorStop(0.83, 'indigo');
rainbow.addColorStop(1, 'violet');

ctx.fillStyle = rainbow;
ctx.fillRect(0, 0, 300, 100);
```

色标可以添加任意多个，关键是合理分配 `offset` 值。Canvas会自动在相邻色标之间进行平滑插值。

## 径向渐变：从中心向外的颜色扩散

现在我要问第三个问题：**如何实现一个从中心白色到边缘黑色的圆形渐变，模拟聚光灯效果？**

答案是使用 `createRadialGradient()`。这个方法需要6个参数，定义两个圆：
- 起始圆：`(x0, y0, r0)` - 中心坐标和半径
- 结束圆：`(x1, y1, r1)` - 中心坐标和半径

```javascript
// 创建聚光灯效果：中心亮，边缘暗
const radialGradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 100);
radialGradient.addColorStop(0, 'white');
radialGradient.addColorStop(1, 'black');

ctx.fillStyle = radialGradient;
ctx.fillRect(0, 0, 300, 300);
```

这个例子中，起始圆和结束圆的中心相同 `(150, 150)`，只是半径不同（0 和 100），形成了标准的圆形渐变。

### 创建立体球体效果

思考一下，如何让一个圆看起来像有光照的立体球？

关键是让光源不在圆心，而是偏上或偏左：

```javascript
// 立体球：光源在左上方
const sphere = ctx.createRadialGradient(120, 120, 20, 150, 150, 80);
sphere.addColorStop(0, '#ffffff');
sphere.addColorStop(0.3, '#87CEEB');
sphere.addColorStop(1, '#1E3A8A');

ctx.fillStyle = sphere;
ctx.beginPath();
ctx.arc(150, 150, 80, 0, Math.PI * 2);
ctx.fill();
```

看到了吗？起始圆的中心在 `(120, 120)`，结束圆的中心在 `(150, 150)`，两个圆心不重合，光源就有了方向性，球体立刻有了立体感。

## 渐变坐标系统：一个常见的坑

现在我要问第四个问题：**如果我绘制两个矩形，都使用同一个渐变对象，会发生什么？**

让我们试试看：

```javascript
const gradient = ctx.createLinearGradient(0, 0, 200, 0);
gradient.addColorStop(0, 'red');
gradient.addColorStop(1, 'blue');

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 100, 50);    // 第一个矩形
ctx.fillRect(150, 100, 100, 50); // 第二个矩形
```

你可能期望两个矩形都有从红到蓝的完整渐变，但实际上：
- 第一个矩形只显示渐变的前半部分（红到紫）
- 第二个矩形显示渐变的后半部分（紫到蓝）

**为什么？因为渐变的坐标是相对于Canvas坐标系的，而不是相对于图形本身！**

这意味着 `createLinearGradient(0, 0, 200, 0)` 定义的渐变范围是Canvas的 `(0, 0)` 到 `(200, 0)`，无论你在哪里绘制图形，都是在这个固定的渐变"窗口"中采样颜色。

如果想让每个图形都有独立的完整渐变，需要为每个图形创建单独的渐变对象：

```javascript
// 为第一个矩形创建渐变
const gradient1 = ctx.createLinearGradient(0, 0, 100, 0);
gradient1.addColorStop(0, 'red');
gradient1.addColorStop(1, 'blue');
ctx.fillStyle = gradient1;
ctx.fillRect(0, 0, 100, 50);

// 为第二个矩形创建渐变
const gradient2 = ctx.createLinearGradient(150, 100, 250, 100);
gradient2.addColorStop(0, 'red');
gradient2.addColorStop(1, 'blue');
ctx.fillStyle = gradient2;
ctx.fillRect(150, 100, 100, 50);
```

## 图案填充：重复纹理的艺术

现在我要问第五个问题：**如何用一张小图片平铺填充整个Canvas？**

答案是使用 `createPattern()`。这个方法接受两个参数：
- `image`：图像源（HTMLImageElement、Canvas、Video等）
- `repetition`：重复模式（'repeat'、'repeat-x'、'repeat-y'、'no-repeat'）

```javascript
const img = new Image();
img.src = 'texture.png';

img.onload = function() {
  const pattern = ctx.createPattern(img, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, 400, 300);
};
```

注意 `img.onload` 的使用——图像必须完全加载后才能创建图案，否则图案会是空的。

### 图案重复模式

思考一下，如果只想在水平方向重复，垂直方向不重复，怎么办？

使用 `repeat-x`：

```javascript
const pattern = ctx.createPattern(img, 'repeat-x'); // 只水平重复
// 其他选项：
// 'repeat-y'  - 只垂直重复
// 'no-repeat' - 不重复
// 'repeat'    - 双向重复（默认）
```

### 使用Canvas作为图案源

有一个很神奇的技巧：**你可以用另一个Canvas作为图案源！**

这意味着你可以动态生成纹理：

```javascript
// 创建一个小的离屏Canvas作为纹理
const patternCanvas = document.createElement('canvas');
patternCanvas.width = 20;
patternCanvas.height = 20;
const pctx = patternCanvas.getContext('2d');

// 绘制网格纹理
pctx.strokeStyle = '#ddd';
pctx.lineWidth = 1;
pctx.strokeRect(0, 0, 20, 20);
pctx.moveTo(0, 10);
pctx.lineTo(20, 10);
pctx.moveTo(10, 0);
pctx.lineTo(10, 20);
pctx.stroke();

// 使用这个Canvas作为图案
const gridPattern = ctx.createPattern(patternCanvas, 'repeat');
ctx.fillStyle = gridPattern;
ctx.fillRect(0, 0, 400, 300);
```

这段代码创建了一个 20×20 的网格纹理，然后平铺到整个Canvas上。完全程序化，无需外部图片！

## 实践应用：现代按钮光泽效果

让我们用渐变实现一个有光泽感的按钮：

```javascript
function drawGlossyButton(x, y, width, height, text) {
  ctx.save();
  
  // 绘制按钮主体（蓝色渐变）
  const mainGradient = ctx.createLinearGradient(x, y, x, y + height);
  mainGradient.addColorStop(0, '#5C9FFF');
  mainGradient.addColorStop(0.5, '#3478F6');
  mainGradient.addColorStop(1, '#2563EB');
  
  ctx.fillStyle = mainGradient;
  ctx.fillRect(x, y, width, height);
  
  // 绘制顶部高光（半透明白色渐变）
  const highlightGradient = ctx.createLinearGradient(x, y, x, y + height / 2);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = highlightGradient;
  ctx.fillRect(x, y, width, height / 2);
  
  // 绘制文本
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
  
  ctx.restore();
}

drawGlossyButton(100, 100, 150, 50, '立即下载');
```

这个按钮有两层渐变：
1. **主体渐变**：从上到下，深蓝到更深蓝
2. **高光渐变**：顶部半透明白色，向下淡出

这种双层渐变技巧在现代UI设计中非常常见。

## 进度条的渐变优化

再看一个实用例子：带渐变的进度条

```javascript
function drawProgressBar(x, y, width, height, progress) {
  // 绘制背景
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(x, y, width, height);
  
  // 绘制进度条（彩色渐变）
  const barWidth = width * progress;
  const progressGradient = ctx.createLinearGradient(x, y, x + barWidth, y);
  progressGradient.addColorStop(0, '#10B981');
  progressGradient.addColorStop(0.5, '#34D399');
  progressGradient.addColorStop(1, '#6EE7B7');
  
  ctx.fillStyle = progressGradient;
  ctx.fillRect(x, y, barWidth, height);
  
  // 绘制边框
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

drawProgressBar(50, 200, 300, 30, 0.65); // 65%进度
```

进度条从绿色到浅绿色的渐变让整个UI更有活力。

## 网格背景图案

最后，用图案实现一个专业的网格背景：

```javascript
// 创建网格图案Canvas
const gridCanvas = document.createElement('canvas');
gridCanvas.width = 40;
gridCanvas.height = 40;
const gctx = gridCanvas.getContext('2d');

// 绘制主网格线
gctx.strokeStyle = '#E5E7EB';
gctx.lineWidth = 1;
gctx.beginPath();
gctx.moveTo(0, 0);
gctx.lineTo(40, 0);
gctx.moveTo(0, 0);
gctx.lineTo(0, 40);
gctx.stroke();

// 绘制中心点（每隔5个单位）
gctx.fillStyle = '#D1D5DB';
gctx.fillRect(19.5, 19.5, 1, 1);

// 创建图案并应用
const gridPattern = ctx.createPattern(gridCanvas, 'repeat');
ctx.fillStyle = gridPattern;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

这种网格背景在设计工具、图表应用中非常常见。

## 本章小结

渐变和图案是Canvas中强大的样式增强工具：

- **线性渐变**通过 `createLinearGradient(x0, y0, x1, y1)` 创建，起点终点定义方向
- **径向渐变**通过 `createRadialGradient()` 创建，两个圆定义扩散范围
- **色标**通过 `addColorStop(offset, color)` 添加，offset范围0-1
- **渐变坐标**是相对Canvas坐标系的，不随图形移动
- **图案填充**通过 `createPattern(image, repetition)` 创建，支持图像和Canvas
- **重复模式**有 repeat、repeat-x、repeat-y、no-repeat 四种

关键技巧：
- 双层渐变可以创造光泽效果
- 非同心的径向渐变可以模拟光照
- Canvas可以作为图案源，实现程序化纹理
- 渐变对象可以复用，但要注意坐标系问题

掌握了渐变和图案，你的Canvas作品将从"功能性"跃升到"视觉冲击力"的新高度。下一章，我们将探索阴影和合成操作，进一步提升视觉表现力。
