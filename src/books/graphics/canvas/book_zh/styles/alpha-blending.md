# 透明度与混合模式

当你需要让一个遮罩层半透明，或者让一张水印若隐若现，或者实现平滑的淡入淡出动画，背后的核心机制就是**透明度（Alpha）**。本章将深入探讨Canvas中透明度的两种控制方式，以及它们如何与底层颜色混合。

## globalAlpha：全局透明度控制

首先要问一个问题：**如何让接下来绘制的所有内容都变成半透明？**

答案是设置 `globalAlpha` 属性：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 设置全局透明度为50%
ctx.globalAlpha = 0.5;

// 后续所有绘制都是半透明的
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 100, 100);

// 恢复不透明
ctx.globalAlpha = 1.0;
```

`globalAlpha` 的取值范围是 **0.0（完全透明）到 1.0（完全不透明）**，默认值是1.0。

### globalAlpha 的影响范围

思考一下，`globalAlpha` 会影响哪些绘制操作？

答案是**所有绘制操作**：填充、描边、文本、图像、渐变、图案，甚至阴影！

```javascript
ctx.globalAlpha = 0.3;

ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);          // 30%透明度

ctx.strokeStyle = 'blue';
ctx.lineWidth = 5;
ctx.strokeRect(50, 50, 100, 100);      // 30%透明度

ctx.font = '24px Arial';
ctx.fillText('Hello', 150, 75);        // 30%透明度

ctx.drawImage(img, 200, 50, 100, 100); // 30%透明度
```

所有操作都会受到影响，这就是"全局"的含义。

### 与状态管理配合

由于 `globalAlpha` 是上下文状态的一部分，使用 `save()` 和 `restore()` 可以方便地管理它：

```javascript
ctx.save();
ctx.globalAlpha = 0.5;
ctx.fillRect(50, 50, 100, 100);  // 半透明
ctx.restore();

ctx.fillRect(200, 50, 100, 100); // 完全不透明（自动恢复）
```

这是推荐的做法，避免忘记恢复透明度导致后续绘制异常。

## 颜色 Alpha 通道：精确控制

现在我要问第二个问题：**如果想让红色矩形半透明，但蓝色矩形完全不透明，不使用 globalAlpha 怎么办？**

答案是使用颜色的 **Alpha 通道**，即 `rgba()` 或 `hsla()` 格式：

```javascript
// rgba(r, g, b, a)：a 是 alpha 值，范围 0-1
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';  // 半透明红色
ctx.fillRect(50, 50, 100, 100);

ctx.fillStyle = 'rgba(0, 0, 255, 1.0)';  // 完全不透明蓝色
ctx.fillRect(100, 100, 100, 100);
```

或者使用HSL格式：

```javascript
// hsla(h, s%, l%, a)
ctx.fillStyle = 'hsla(0, 100%, 50%, 0.5)';    // 半透明红色
ctx.fillStyle = 'hsla(240, 100%, 50%, 1.0)';  // 完全不透明蓝色
```

这种方式的优点是**只影响当前颜色，不影响其他绘制操作**。

### globalAlpha 与颜色 Alpha 的叠加

思考一下，如果同时设置了 `globalAlpha` 和颜色的 alpha 值，最终透明度是多少？

答案是**两者相乘**：

```javascript
ctx.globalAlpha = 0.5;  // 全局50%
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';  // 颜色50%

// 最终透明度 = 0.5 * 0.5 = 0.25（25%）
ctx.fillRect(50, 50, 100, 100);
```

这个特性在某些场景很有用（如整体淡出效果），但也可能造成意外，需要注意。

## Alpha 混合原理：半透明如何叠加？

现在我要问第三个问题：**当一个半透明的红色矩形绘制在蓝色矩形上方时，重叠部分是什么颜色？**

这涉及到 **Alpha 混合（Alpha Blending）**算法，公式如下：

```
最终颜色 = 源颜色 × 源Alpha + 目标颜色 × (1 - 源Alpha)
最终Alpha = 源Alpha + 目标Alpha × (1 - 源Alpha)
```

让我们用具体数字验证：

```javascript
// 先绘制蓝色背景（目标）
ctx.fillStyle = 'rgb(0, 0, 255)';  // 纯蓝色
ctx.fillRect(0, 0, 200, 200);

// 再绘制半透明红色（源，alpha = 0.5）
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
ctx.fillRect(50, 50, 100, 100);

// 重叠部分的计算：
// R通道 = 255 × 0.5 + 0 × (1 - 0.5) = 127.5
// G通道 = 0 × 0.5 + 0 × (1 - 0.5) = 0
// B通道 = 0 × 0.5 + 255 × (1 - 0.5) = 127.5
// 结果：rgb(128, 0, 128) 紫色
```

结果确实是紫色！这就是 Alpha 混合的数学原理。

### 多层叠加的效果

思考一下，如果三个 `alpha = 0.3` 的白色矩形叠加，中心区域的透明度是多少？

每叠加一层，底色被遮盖的程度都会增加：

```javascript
function drawLayeredRects() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 400, 400);  // 黑色背景
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  
  ctx.fillRect(50, 50, 200, 200);   // 第一层
  ctx.fillRect(100, 100, 200, 200); // 第二层
  ctx.fillRect(150, 150, 200, 200); // 第三层
  
  // 中心区域叠加三次后，会比单层白色更明显
}
```

每层的 Alpha 值虽然只有 0.3，但多层叠加后，中心区域会接近 `1 - (0.7)^3 ≈ 0.657` 的不透明度。

## 透明度应用：半透明遮罩

现在我要问第四个问题：**如何给图片添加一个半透明的黑色遮罩层，让图片变暗？**

这是非常常见的UI效果：

```javascript
// 1. 绘制图片
ctx.drawImage(img, 0, 0, 400, 300);

// 2. 添加半透明黑色遮罩
ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
ctx.fillRect(0, 0, 400, 300);
```

根据 Alpha 混合公式，图片的每个像素都会与黑色混合 50%，整体变暗。

### 可交互的遮罩

进一步思考，如果遮罩的透明度可以通过滑块控制：

```javascript
function drawMask(alpha) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制原图
  ctx.drawImage(img, 0, 0, 400, 300);
  
  // 绘制可调透明度的遮罩
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, 400, 300);
}

// 滑块输入：0-1
document.getElementById('slider').addEventListener('input', (e) => {
  drawMask(parseFloat(e.target.value));
});
```

## 淡入淡出动画

现在我要问第五个问题：**如何实现一张图片从完全透明逐渐变为完全不透明？**

答案是使用 `globalAlpha` 配合 `requestAnimationFrame`：

```javascript
let opacity = 0;

function fadeIn() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, 0, 0, 400, 300);
  ctx.globalAlpha = 1;  // 恢复
  
  opacity += 0.02;
  
  if (opacity <= 1) {
    requestAnimationFrame(fadeIn);
  }
}

img.onload = function() {
  fadeIn();
};
```

淡出效果类似，只需将 `opacity += 0.02` 改为 `opacity -= 0.02`，起始值设为 1。

### 交叉淡入淡出

更复杂的场景：一张图片淡出的同时，另一张图片淡入

```javascript
let progress = 0;

function crossFade() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 第一张图片淡出
  ctx.globalAlpha = 1 - progress;
  ctx.drawImage(img1, 0, 0, 400, 300);
  
  // 第二张图片淡入
  ctx.globalAlpha = progress;
  ctx.drawImage(img2, 0, 0, 400, 300);
  
  ctx.globalAlpha = 1;
  
  progress += 0.02;
  
  if (progress <= 1) {
    requestAnimationFrame(crossFade);
  }
}
```

`progress` 从 0 增加到 1 的过程中，img1 的 alpha 从 1 降到 0，img2 的 alpha 从 0 升到 1。

## 水印效果

现在我要问第六个问题：**如何在图片上添加一个半透明的文字水印？**

```javascript
function addWatermark(text, alpha = 0.3) {
  ctx.drawImage(img, 0, 0, 400, 300);
  
  ctx.save();
  
  // 设置水印样式
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 绘制水印（带旋转）
  ctx.translate(200, 150);
  ctx.rotate(-Math.PI / 6);  // 旋转30度
  ctx.fillText(text, 0, 0);
  
  ctx.restore();
}

addWatermark('© 2024 版权所有', 0.25);
```

水印通常需要足够透明以不影响阅读，但又要清晰可见，`alpha = 0.2-0.4` 是常见选择。

## 预乘 Alpha：像素操作的陷阱

现在我要问第七个问题：**当你使用 getImageData 读取半透明像素时，会遇到什么问题？**

答案是 **预乘 Alpha（Premultiplied Alpha）**。Canvas 内部使用预乘 Alpha 存储颜色，即：

```
存储的RGB = 实际RGB × Alpha
```

例如，一个 `rgba(255, 0, 0, 0.5)` 的半透明红色，在 ImageData 中存储为：

```javascript
// 预期：data[0]=255, data[1]=0, data[2]=0, data[3]=128
// 实际：data[0]=128, data[1]=0, data[2]=0, data[3]=128
```

RGB 值被 Alpha 预乘了！如果你要修改像素颜色，需要先除以 Alpha，修改后再乘回去：

```javascript
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = imageData.data;

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3] / 255;
  
  if (a > 0) {
    // 反预乘：恢复原始颜色
    const actualR = r / a;
    const actualG = g / a;
    const actualB = b / a;
    
    // 修改颜色（如反相）
    const newR = 255 - actualR;
    const newG = 255 - actualG;
    const newB = 255 - actualB;
    
    // 重新预乘
    data[i] = newR * a;
    data[i + 1] = newG * a;
    data[i + 2] = newB * a;
  }
}

ctx.putImageData(imageData, 0, 0);
```

这个特性在像素级图像处理时必须考虑，否则会得到错误的颜色。

## clearRect 与透明度

思考一下，`clearRect()` 清除的区域是什么颜色？

答案是**完全透明（alpha = 0）**，而不是白色或黑色：

```javascript
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 400, 300);

ctx.clearRect(50, 50, 100, 100);  // 清除一个区域

// 结果：红色背景上有一个透明的矩形孔洞
```

如果Canvas的背景是网页的其他内容（如图片或颜色），清除后会显示出来。这就是 `clearRect` 的真正含义：**将像素的 Alpha 设为 0**，而不是填充某个颜色。

## 本章小结

透明度是Canvas中控制图形可见性的核心机制：

- **globalAlpha** 控制全局透明度，范围 0-1，影响所有后续绘制
- **颜色 Alpha** 通过 `rgba()` 或 `hsla()` 指定，只影响当前颜色
- **两者叠加**：最终透明度 = globalAlpha × 颜色Alpha
- **Alpha 混合公式**：`最终颜色 = 源颜色 × 源Alpha + 目标颜色 × (1 - 源Alpha)`
- **多层叠加**：每层都会根据混合公式与底层混合

实践应用：
- **半透明遮罩**：用 `rgba(0, 0, 0, alpha)` 使内容变暗
- **淡入淡出**：动态改变 `globalAlpha` 实现平滑过渡
- **水印效果**：低 alpha 值 + 旋转文本
- **预乘 Alpha**：像素操作时需要反预乘和重新预乘

关键技巧：
- 用 `save/restore` 管理 globalAlpha 状态
- 优先使用颜色 Alpha 而非 globalAlpha，避免意外影响
- 像素操作时注意预乘 Alpha 的影响
- `clearRect` 清除的是 Alpha 通道，不是填充颜色

掌握了透明度，你就能创造出丰富的视觉层次和动态效果。下一章，我们将进入坐标变换的世界，学习如何旋转、缩放和平移图形。
