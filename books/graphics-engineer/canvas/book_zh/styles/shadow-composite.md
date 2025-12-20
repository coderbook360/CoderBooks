# 阴影与合成操作

一个扁平的图形如何变得立体？一张图片如何被裁剪成任意形状？答案就在本章的两大利器中：**阴影（Shadow）**和**合成操作（Composite Operation）**。前者为图形增添深度和质感，后者让你能像Photoshop图层混合模式一样控制图形的叠加方式。

## 阴影效果：从平面到立体

首先要问一个问题：**如何让一个矩形看起来悬浮在画布上方？**

答案是给它添加阴影。Canvas提供了四个阴影相关的属性：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 设置阴影
ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';  // 阴影颜色（半透明黑色）
ctx.shadowBlur = 10;                     // 模糊程度
ctx.shadowOffsetX = 5;                   // 水平偏移
ctx.shadowOffsetY = 5;                   // 垂直偏移

// 绘制图形
ctx.fillStyle = '#3B82F6';
ctx.fillRect(50, 50, 100, 100);
```

这四个属性的含义：
- **shadowColor**：阴影颜色，支持任何CSS颜色格式（默认透明）
- **shadowBlur**：模糊半径，单位像素，值越大越模糊（默认0）
- **shadowOffsetX**：阴影在X轴的偏移，正值向右，负值向左（默认0）
- **shadowOffsetY**：阴影在Y轴的偏移，正值向下，负值向上（默认0）

### 阴影方向与光源

思考一下，如果光源在左上方，阴影应该在哪个方向？

右下方！这意味着 `shadowOffsetX` 和 `shadowOffsetY` 都应该是正值：

```javascript
// 光源在左上方
ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
ctx.shadowBlur = 15;
ctx.shadowOffsetX = 8;
ctx.shadowOffsetY = 8;

// 光源在右下方
ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
ctx.shadowBlur = 15;
ctx.shadowOffsetX = -8;
ctx.shadowOffsetY = -8;
```

通过调整偏移的正负值，你可以模拟任意方向的光源。

### 发光效果：零偏移的阴影

现在我要问第二个问题：**如何让一个文字或图形看起来在发光？**

关键技巧：**将偏移设为0，增大模糊值，并使用亮色作为shadowColor**：

```javascript
// 绿色发光效果
ctx.shadowColor = '#10B981';
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;

ctx.fillStyle = '#10B981';
ctx.font = 'bold 48px Arial';
ctx.fillText('发光文字', 50, 100);
```

无偏移的阴影会在图形四周均匀扩散,形成光晕效果。这在游戏UI、霓虹灯效果中非常常见。

### 清除阴影：避免影响后续绘制

阴影设置是上下文状态的一部分，一旦设置后会影响所有后续绘制。如果只想为某些图形添加阴影，记得及时清除：

```javascript
// 绘制有阴影的矩形
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
ctx.fillRect(50, 50, 100, 100);

// 清除阴影（两种方法任选其一）
ctx.shadowColor = 'transparent';  // 方法1：设置透明
ctx.shadowBlur = 0;                // 方法2：模糊值设为0

// 后续绘制不会有阴影
ctx.fillRect(200, 50, 100, 100);
```

或者使用 `save()` 和 `restore()` 来管理状态：

```javascript
ctx.save();
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.fillRect(50, 50, 100, 100);
ctx.restore();  // 自动恢复到无阴影状态
```

### 阴影的性能代价

思考一下，阴影计算需要模糊算法，会消耗额外的CPU资源。对于高频率绘制的场景（如动画、游戏），如何优化？

答案是：
1. **减少阴影图形数量**：只为关键元素添加阴影
2. **降低模糊值**：`shadowBlur` 从20降到10，性能可能提升一倍
3. **使用预渲染**：将带阴影的图形绘制到离屏Canvas，然后作为图像复用

```javascript
// 预渲染技巧
const shadowCache = document.createElement('canvas');
shadowCache.width = 120;
shadowCache.height = 120;
const sctx = shadowCache.getContext('2d');

// 只渲染一次阴影
sctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
sctx.shadowBlur = 10;
sctx.shadowOffsetX = 5;
sctx.shadowOffsetY = 5;
sctx.fillStyle = '#3B82F6';
sctx.fillRect(10, 10, 100, 100);

// 后续直接使用缓存
function drawCard(x, y) {
  ctx.drawImage(shadowCache, x, y);
}
```

## 内阴影技巧：反向思维

现在我要问第三个问题：**Canvas只支持外阴影，如何实现按钮的内阴影效果？**

这需要一点技巧：用合成模式配合剪切路径

```javascript
function drawInsetShadow(x, y, width, height) {
  ctx.save();
  
  // 1. 先绘制主体
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(x, y, width, height);
  
  // 2. 设置剪切区域（限制阴影绘制范围）
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  
  // 3. 在外部绘制阴影（但因为剪切，只显示内部部分）
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = -5;
  ctx.shadowOffsetY = -5;
  
  // 绘制一个稍大的矩形（阴影会投射到剪切区域内）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
  ctx.lineWidth = 20;
  ctx.strokeRect(x, y, width, height);
  
  ctx.restore();
}

drawInsetShadow(50, 50, 200, 100);
```

原理：通过 `clip()` 限制绘制区域，然后在外部绘制阴影，阴影的部分会投射到内部，形成内阴影效果。

## 合成操作：图形的混合模式

现在我要问第四个问题：**如何让一张图片只在圆形区域内显示，超出部分被裁剪？**

答案是使用 `globalCompositeOperation`，这个属性控制**新绘制的内容如何与已有内容组合**。

### 源与目标的概念

首先理解两个术语：
- **目标（Destination）**：已经绘制在Canvas上的内容
- **源（Source）**：即将绘制的新内容

合成操作定义的就是源和目标如何混合。

### 常用合成模式：source-over（默认）

默认模式是 `source-over`，意思是"源覆盖在目标上方"，这是我们最常见的绘制行为：

```javascript
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);  // 目标

ctx.globalCompositeOperation = 'source-over';  // 默认值
ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 100, 100);  // 源（覆盖在红色上方）
```

蓝色矩形会正常绘制在红色矩形上方，交叉部分显示蓝色。

### source-in：图像遮罩

现在来实现开篇提到的圆形裁剪效果：

```javascript
// 1. 先绘制遮罩形状（目标）
ctx.beginPath();
ctx.arc(150, 150, 80, 0, Math.PI * 2);
ctx.fillStyle = '#000';  // 颜色无所谓，只关心形状
ctx.fill();

// 2. 设置合成模式为"源在目标内"
ctx.globalCompositeOperation = 'source-in';

// 3. 绘制图像（源）
const img = new Image();
img.src = 'photo.jpg';
img.onload = function() {
  ctx.drawImage(img, 0, 0, 300, 300);
  ctx.globalCompositeOperation = 'source-over';  // 恢复默认
};
```

`source-in` 的含义：**只保留源图形与目标图形重叠的部分**。结果是图片被圆形裁剪了。

### destination-out：橡皮擦效果

思考一下，如何实现画图软件中的橡皮擦功能？

答案是 `destination-out`，意思是"擦除目标中与源重叠的部分"：

```javascript
// 假设canvas上已经有一些绘制内容

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons === 1) {  // 鼠标按下
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(e.offsetX, e.offsetY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';  // 恢复
  }
});
```

鼠标移动时绘制圆形，但由于使用了 `destination-out`，圆形不是添加内容，而是擦除内容。

### xor：异或模式

`xor` 模式很特殊：**只显示源和目标不重叠的部分**，重叠部分变透明：

```javascript
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

ctx.globalCompositeOperation = 'xor';
ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 100, 100);
```

结果是两个矩形各自独立的部分保留，中间重叠区域透明。这在某些特效中很有用。

### lighter：叠加发光

`lighter` 模式会将源和目标的颜色值相加，产生更亮的颜色：

```javascript
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
ctx.fillRect(50, 50, 100, 100);

ctx.globalCompositeOperation = 'lighter';
ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
ctx.fillRect(100, 100, 100, 100);
```

重叠部分会变成紫色并且更亮，适合模拟光线叠加效果（如激光、粒子）。

## 混合模式：Photoshop般的效果

除了基础合成，Canvas还支持类似Photoshop的混合模式：

```javascript
// 正片叠底（Multiply）：颜色变暗
ctx.globalCompositeOperation = 'multiply';

// 滤色（Screen）：颜色变亮
ctx.globalCompositeOperation = 'screen';

// 叠加（Overlay）：增强对比度
ctx.globalCompositeOperation = 'overlay';

// 差值（Difference）：反转颜色差异
ctx.globalCompositeOperation = 'difference';
```

这些模式在图像处理、艺术效果中非常实用。例如用 `multiply` 为图片添加色调，用 `screen` 制作光效。

## 实践应用：发光按钮

让我们结合阴影和合成操作，实现一个会发光的按钮：

```javascript
function drawGlowButton(x, y, width, height, text, glowing) {
  ctx.save();
  
  // 如果处于发光状态
  if (glowing) {
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  // 绘制按钮主体
  ctx.fillStyle = glowing ? '#60A5FA' : '#3B82F6';
  ctx.fillRect(x, y, width, height);
  
  // 绘制文本
  ctx.shadowColor = 'transparent';  // 清除阴影
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
  
  ctx.restore();
}

// 鼠标悬停检测
let isHovering = false;
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  isHovering = (x > 100 && x < 250 && y > 100 && y < 150);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGlowButton(100, 100, 150, 50, '点击我', isHovering);
});
```

鼠标悬停时按钮会发出蓝色光晕，离开时恢复正常。

## 实现图片的心形遮罩

综合应用：让一张照片只在心形区域显示

```javascript
function drawHeartMask(x, y, size) {
  ctx.save();
  
  // 1. 绘制心形路径（目标）
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.3);
  
  // 左半心
  ctx.bezierCurveTo(
    x, y,
    x - size / 2, y,
    x - size / 2, y + size * 0.3
  );
  ctx.bezierCurveTo(
    x - size / 2, y + size * 0.6,
    x, y + size * 0.9,
    x, y + size
  );
  
  // 右半心
  ctx.bezierCurveTo(
    x, y + size * 0.9,
    x + size / 2, y + size * 0.6,
    x + size / 2, y + size * 0.3
  );
  ctx.bezierCurveTo(
    x + size / 2, y,
    x, y,
    x, y + size * 0.3
  );
  
  ctx.fillStyle = '#000';
  ctx.fill();
  
  // 2. 设置遮罩模式
  ctx.globalCompositeOperation = 'source-in';
  
  // 3. 绘制图片
  const img = new Image();
  img.src = 'portrait.jpg';
  img.onload = function() {
    ctx.drawImage(img, x - size / 2, y, size, size);
    ctx.globalCompositeOperation = 'source-over';
  };
  
  ctx.restore();
}

drawHeartMask(200, 100, 150);
```

## 合成模式完全指南

### 源图形控制（Source 系列）

**source-over（默认模式）**
- **效果**: 源图形覆盖目标图形，正常的绘制行为
- **用途**: 常规绘制操作
- **场景**: 默认的图层叠加

**source-in**
- **效果**: 只显示源和目标的重叠部分，使用源的颜色
- **用途**: 图像遮罩、形状裁剪
- **场景**: 用形状裁剪图像，创建复杂的遮罩效果

**source-out**
- **效果**: 只显示源的非重叠部分
- **用途**: 反向裁剪、镂空效果
- **场景**: 从图形中挖空特定形状

---

### 目标图形控制（Destination 系列）

**destination-over**
- **效果**: 源图形绘制在目标图形下方
- **用途**: 添加背景层
- **场景**: 后绘制背景，不遮挡已有内容

**destination-in**
- **效果**: 只保留目标的重叠部分，用目标的颜色
- **用途**: 反向遮罩
- **场景**: 用新图形作为遮罩，裁剪原有图形

**destination-out**
- **效果**: 擦除目标图形的重叠部分
- **用途**: 橡皮擦效果
- **场景**: 实现可控的擦除功能，删除指定区域

---

### 特殊混合模式

**xor（异或）**
- **效果**: 只显示非重叠部分，重叠部分变透明
- **用途**: 差集效果
- **场景**: 高亮显示两个图形的差异区域

**lighter（相加）**
- **效果**: 颜色值相加，画面变亮
- **用途**: 光效叠加
- **场景**: 霓虹灯、光晕、粒子发光效果

**multiply（正片叠底）**
- **效果**: 颜色相乘，画面变暗
- **用途**: 阴影层
- **场景**: 模拟阴影、创建暗部细节

**screen（滤色）**
- **效果**: 反色相乘再反色，画面变亮
- **用途**: 高光层
- **场景**: 提亮、柔光效果、光斑

---

### 快速选择指南

**需要遮罩效果时**:
- 用新形状遮罩图像 → `source-in`
- 用已有形状遮罩新图 → `destination-in`

**需要擦除效果时**:
- 擦除已有内容 → `destination-out`
- 保留非重叠部分 → `source-out`

**需要光效时**:
- 发光叠加 → `lighter`
- 柔光提亮 → `screen`
- 阴影变暗 → `multiply`

**需要特殊效果时**:
- 后置背景 → `destination-over`
- 差异高亮 → `xor`

## 本章小结

阴影和合成操作是Canvas的两大视觉增强工具：

- **阴影**通过四个属性控制：shadowColor、shadowBlur、shadowOffsetX、shadowOffsetY
- **发光效果**通过零偏移+高模糊+亮色实现
- **内阴影**需要通过剪切路径技巧实现
- **阴影有性能开销**，高频场景建议预渲染或减少使用

- **globalCompositeOperation** 控制图形混合方式
- **source-in** 用于实现遮罩效果
- **destination-out** 用于实现擦除效果
- **lighter** 用于光效叠加
- **混合模式**（multiply、screen等）实现类Photoshop效果

关键技巧：
- 用 `save/restore` 管理阴影状态
- 合成模式只影响后续绘制，记得恢复
- 先绘制遮罩形状，再设置合成模式绘制内容
- 预渲染阴影图形可大幅提升性能

掌握这两个特性，你的Canvas作品将从"清晰"迈向"精美"。下一章，我们将探索透明度与混合模式的更多玩法。
