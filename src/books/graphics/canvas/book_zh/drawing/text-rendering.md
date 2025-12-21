# 文本渲染与测量

在图形应用中，文本是传达信息最直接的方式。无论是图表上的标注、按钮上的标签，还是编辑器中的文字内容，都需要我们掌握文本渲染的技术。

但看似简单的"在画布上写字"，实际上涉及诸多细节：如何精确地将文字居中显示？如何让长文本自动换行？如何测量文字占据的空间？这些问题，都需要我们深入理解 Canvas 的文本渲染机制。

本章将从实际问题出发，逐步解答以下核心问题：
- 如何在 Canvas 上绘制文本？有哪些绘制方式？
- 如何设置字体和样式？语法规则是什么？
- 如何控制文本的对齐方式？对齐点在哪里?
- 如何测量文本尺寸？TextMetrics 告诉我们什么信息？
- 如何实现多行文本和自动换行？

---

## 文本绘制基础

首先要问一个问题：**Canvas 提供了哪些方法来绘制文本？**

Canvas 提供了两个核心方法：

### fillText：填充文本

```javascript
ctx.fillStyle = '#2c3e50';
ctx.font = '24px Arial';
ctx.fillText('Hello Canvas', 100, 100);
```

`fillText()` 使用当前的 `fillStyle` 填充文本。参数含义：
- 第一个参数：要绘制的文本字符串
- 第二个参数：文本绘制的 x 坐标
- 第三个参数：文本绘制的 y 坐标
- 第四个参数（可选）：最大宽度

### strokeText：描边文本

```javascript
ctx.strokeStyle = '#e74c3c';
ctx.lineWidth = 2;
ctx.font = '24px Arial';
ctx.strokeText('Hello Canvas', 100, 150);
```

`strokeText()` 使用当前的 `strokeStyle` 绘制文本轮廓。参数与 `fillText()` 完全相同。

### 组合使用

实践中，我们常常将两者组合使用，实现带描边的文本效果：

```javascript
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

const text = 'Canvas Text';
const x = canvas.width / 2;
const y = canvas.height / 2;

// 先绘制描边（宽度较大）
ctx.strokeStyle = '#2c3e50';
ctx.lineWidth = 8;
ctx.strokeText(text, x, y);

// 再绘制填充（覆盖在描边上）
ctx.fillStyle = '#3498db';
ctx.fillText(text, x, y);
```

这种技术常用于制作标题、Logo 等需要突出显示的文字。

### maxWidth 参数

第四个可选参数 `maxWidth` 用于限制文本的最大宽度。如果文本实际宽度超过这个值，Canvas 会自动压缩文本：

```javascript
ctx.font = '24px Arial';
ctx.fillStyle = 'black';

// 正常绘制
ctx.fillText('This is a long text', 50, 50);

// 限制最大宽度为 100px（文本会被压缩）
ctx.fillText('This is a long text', 50, 100, 100);
```

注意：`maxWidth` 只会**压缩**文本，不会**换行**。Canvas 不支持自动换行，我们需要手动实现（稍后会讲）。

---

## 字体设置：font 属性

现在我要问第二个问题：**如何设置文本的字体和样式？**

Canvas 的 `font` 属性使用 CSS 风格的字体语法：

```javascript
ctx.font = 'italic bold 24px/30px Arial, sans-serif';
```

### 完整语法

```
font = [font-style] [font-variant] [font-weight] font-size[/line-height] font-family
```

- **font-style**（可选）：`normal`、`italic`、`oblique`
- **font-variant**（可选）：`normal`、`small-caps`
- **font-weight**（可选）：`normal`、`bold`、`100-900`
- **font-size**（必需）：字号，如 `16px`、`1.2em`
- **line-height**（可选）：行高，如 `/1.5`（Canvas 中通常不生效）
- **font-family**（必需）：字体族，如 `Arial`、`'Microsoft YaHei'`

### 最小有效设置

最简单的有效设置必须包含**字号**和**字体族**：

```javascript
// 有效
ctx.font = '16px Arial';

// 无效：缺少字号
ctx.font = 'Arial';  // 不生效

// 无效：缺少字体族
ctx.font = '16px';  // 不生效
```

### 常见字体设置示例

```javascript
// 基础样式
ctx.font = '16px Arial';

// 粗体
ctx.font = 'bold 20px Arial';

// 斜体
ctx.font = 'italic 18px Georgia';

// 组合样式
ctx.font = 'italic bold 24px Verdana';

// 多个字体族（降级机制）
ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';

// 使用相对单位
ctx.font = '1.5em serif';
```

### 自定义字体的加载问题

使用自定义字体（通过 `@font-face` 加载）时，可能遇到字体未加载完成就开始绘制的问题：

```javascript
// 错误示范：字体可能还未加载
ctx.font = '24px CustomFont';
ctx.fillText('Hello', 100, 100);  // 可能显示为默认字体
```

正确的做法是等待字体加载完成：

```javascript
// 方式1：使用 Font Loading API
document.fonts.load('24px CustomFont').then(() => {
  ctx.font = '24px CustomFont';
  ctx.fillText('Hello', 100, 100);
});

// 方式2：监听 fonts.ready
document.fonts.ready.then(() => {
  ctx.font = '24px CustomFont';
  ctx.fillText('Hello', 100, 100);
});
```

---

## 文本对齐：textAlign 与 textBaseline

现在我要问第三个问题：**如何控制文本的对齐方式？**

Canvas 提供了两个属性来控制文本对齐：
- `textAlign`：水平对齐
- `textBaseline`：垂直基线

理解这两个属性的关键是：**它们改变的不是文本本身的位置，而是文本相对于绘制坐标点的锚点位置**。

### textAlign：水平对齐

```javascript
ctx.textAlign = 'start';  // 默认值
```

可选值：
- **start**（默认）：文本从绘制点开始（从左到右语言中，等同于 `left`）
- **end**：文本在绘制点结束（从左到右语言中，等同于 `right`）
- **left**：文本左对齐到绘制点
- **right**：文本右对齐到绘制点
- **center**：文本居中对齐到绘制点

让我们通过示例理解：

```javascript
const x = 200;
const y = 50;
const text = 'Text Align';

// 绘制参考线
ctx.strokeStyle = '#ccc';
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, 300);
ctx.stroke();

// 不同对齐方式
ctx.font = '16px Arial';

ctx.textAlign = 'left';
ctx.fillText(text + ' (left)', x, y);

ctx.textAlign = 'center';
ctx.fillText(text + ' (center)', x, y + 30);

ctx.textAlign = 'right';
ctx.fillText(text + ' (right)', x, y + 60);

ctx.textAlign = 'start';
ctx.fillText(text + ' (start)', x, y + 90);

ctx.textAlign = 'end';
ctx.fillText(text + ' (end)', x, y + 120);
```

在从左到右的语言环境中，`start` 等同于 `left`，`end` 等同于 `right`。但在从右到左的语言（如阿拉伯语、希伯来语）中，它们的含义会相反。

### textBaseline：垂直基线

```javascript
ctx.textBaseline = 'alphabetic';  // 默认值
```

可选值：
- **alphabetic**（默认）：基线对齐到字母的基准线
- **top**：文本顶部对齐到绘制点
- **hanging**：文本悬挂基线对齐（用于印度语系）
- **middle**：文本中线对齐到绘制点
- **ideographic**：表意文字基线对齐（用于中日韩文字）
- **bottom**：文本底部对齐到绘制点

让我们通过示例理解：

```javascript
const x = 50;
const y = 150;

// 绘制参考线
ctx.strokeStyle = '#ccc';
ctx.beginPath();
ctx.moveTo(0, y);
ctx.lineTo(400, y);
ctx.stroke();

// 不同基线
ctx.font = '24px Arial';

ctx.textBaseline = 'top';
ctx.fillText('Top', x, y);

ctx.textBaseline = 'middle';
ctx.fillText('Middle', x + 60, y);

ctx.textBaseline = 'alphabetic';
ctx.fillText('Alphabetic', x + 150, y);

ctx.textBaseline = 'bottom';
ctx.fillText('Bottom', x + 280, y);
```

### 实现文本居中

结合 `textAlign` 和 `textBaseline`，可以轻松实现文本在画布中央显示：

```javascript
function drawCenteredText(ctx, text, x, y) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 使用
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
drawCenteredText(ctx, 'Centered Text', centerX, centerY);
```

---

## 文本测量：measureText 与 TextMetrics

现在我要问第四个问题：**如何测量文本占据的空间？**

在实际开发中，我们常常需要知道文本的宽度和高度，以便进行精确布局或碰撞检测。Canvas 提供了 `measureText()` 方法：

```javascript
const text = 'Hello World';
const metrics = ctx.measureText(text);
console.log('文本宽度:', metrics.width);
```

### TextMetrics 对象

`measureText()` 返回一个 `TextMetrics` 对象，包含多个测量属性：

#### 基础属性（所有浏览器）

- **width**：文本的水平宽度（始终可用）

```javascript
ctx.font = '16px Arial';
const metrics = ctx.measureText('Hello');
console.log(metrics.width);  // 约 35.5
```

#### 扩展属性（现代浏览器）

以下属性在较新的浏览器中可用（需要检查兼容性）：

- **actualBoundingBoxLeft**：文本左边界到锚点的距离
- **actualBoundingBoxRight**：文本右边界到锚点的距离
- **actualBoundingBoxAscent**：文本上边界到基线的距离
- **actualBoundingBoxDescent**：文本下边界到基线的距离
- **fontBoundingBoxAscent**：字体上边界到基线的距离
- **fontBoundingBoxDescent**：字体下边界到基线的距离

```javascript
ctx.font = '24px Arial';
const metrics = ctx.measureText('Hello');

if (metrics.actualBoundingBoxAscent !== undefined) {
  const height = metrics.actualBoundingBoxAscent + 
                 metrics.actualBoundingBoxDescent;
  console.log('文本实际高度:', height);
}
```

### 计算文本完整尺寸

基于 TextMetrics，我们可以创建一个工具函数来获取文本的完整边界框：

```javascript
function getTextBounds(ctx, text) {
  const metrics = ctx.measureText(text);
  
  // 宽度始终可用
  const width = metrics.width;
  
  // 高度：优先使用精确值，否则估算
  let height;
  if (metrics.actualBoundingBoxAscent !== undefined) {
    height = metrics.actualBoundingBoxAscent + 
             metrics.actualBoundingBoxDescent;
  } else {
    // 降级：根据字号估算（不够精确）
    const fontSize = parseInt(ctx.font);
    height = fontSize * 1.2;  // 经验值
  }
  
  return { width, height };
}

// 使用
ctx.font = '20px Arial';
const bounds = getTextBounds(ctx, 'Hello Canvas');
console.log(`宽度: ${bounds.width}, 高度: ${bounds.height}`);
```

### 绘制文本边界框

为了可视化理解文本测量，我们可以绘制文本的边界框：

```javascript
function drawTextWithBounds(ctx, text, x, y) {
  ctx.save();
  
  // 绘制文本
  ctx.fillStyle = 'black';
  ctx.fillText(text, x, y);
  
  // 测量文本
  const metrics = ctx.measureText(text);
  
  // 绘制边界框
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  
  if (metrics.actualBoundingBoxAscent !== undefined) {
    // 精确边界框
    const left = x - metrics.actualBoundingBoxLeft;
    const top = y - metrics.actualBoundingBoxAscent;
    const width = metrics.actualBoundingBoxLeft + 
                  metrics.actualBoundingBoxRight;
    const height = metrics.actualBoundingBoxAscent + 
                   metrics.actualBoundingBoxDescent;
    ctx.strokeRect(left, top, width, height);
  } else {
    // 降级：简单矩形
    const width = metrics.width;
    const fontSize = parseInt(ctx.font);
    ctx.strokeRect(x, y - fontSize, width, fontSize);
  }
  
  ctx.restore();
}

// 使用
ctx.font = '24px Arial';
ctx.textBaseline = 'alphabetic';
drawTextWithBounds(ctx, 'Hello Canvas', 50, 100);
```

---

## 高级应用：多行文本与自动换行

Canvas 自身**不支持自动换行**，这意味着所有多行文本功能都需要我们手动实现。

### 手动绘制多行文本

最简单的多行文本：手动拆分换行符：

```javascript
function drawMultilineText(ctx, text, x, y, lineHeight) {
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

// 使用
ctx.font = '16px Arial';
const text = 'Line 1\nLine 2\nLine 3';
drawMultilineText(ctx, text, 50, 50, 24);
```

### 自动换行算法

更复杂的需求是：给定最大宽度，自动将长文本拆分为多行。核心思路是：逐词测量，超宽则换行。

```javascript
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    // 测试当前行加上新词的宽度
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const testWidth = ctx.measureText(testLine).width;
    
    if (testWidth > maxWidth && currentLine) {
      // 超宽：保存当前行，新词放到下一行
      lines.push(currentLine);
      currentLine = word;
    } else {
      // 未超宽：继续累积
      currentLine = testLine;
    }
  });
  
  // 保存最后一行
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// 使用
ctx.font = '16px Arial';
const text = 'This is a very long text that needs to be wrapped to fit within the canvas width.';
const maxWidth = 300;
const lines = wrapText(ctx, text, maxWidth);

let y = 50;
lines.forEach(line => {
  ctx.fillText(line, 50, y);
  y += 24;  // 行高
});
```

### 优化：处理单词过长

上述算法有个问题：如果单个单词的宽度就超过 `maxWidth`，会导致无限循环或错误。改进版本：

```javascript
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    // 检查单个单词是否过长
    const wordWidth = ctx.measureText(word).width;
    if (wordWidth > maxWidth) {
      // 单词过长：先保存当前行，再单独添加长词
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
      lines.push(word);  // 长词单独成行
      return;
    }
    
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const testWidth = ctx.measureText(testLine).width;
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
```

### 完整的多行文本绘制函数

将换行和绘制整合到一起：

```javascript
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapText(ctx, text, maxWidth);
  
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  
  // 返回实际绘制的高度
  return lines.length * lineHeight;
}

// 使用
ctx.font = '16px Arial';
ctx.fillStyle = 'black';

const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
             'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const totalHeight = drawWrappedText(ctx, text, 50, 50, 300, 24);

console.log('文本总高度:', totalHeight);
```

---

## 字体加载最佳实践

在实际项目中，字体加载是一个常见的痛点。特别是使用自定义字体时，必须确保字体加载完成后再进行绘制。

### 使用 Font Loading API

```javascript
// 定义字体
const customFont = new FontFace(
  'CustomFont',
  'url(fonts/custom-font.woff2)'
);

// 加载字体
customFont.load().then(font => {
  // 添加到文档
  document.fonts.add(font);
  
  // 现在可以安全使用
  ctx.font = '24px CustomFont';
  ctx.fillText('Hello', 100, 100);
}).catch(err => {
  console.error('字体加载失败:', err);
  // 降级到默认字体
  ctx.font = '24px Arial';
  ctx.fillText('Hello', 100, 100);
});
```

### 等待所有字体加载完成

```javascript
document.fonts.ready.then(() => {
  // 所有字体都已加载
  ctx.font = '24px CustomFont';
  ctx.fillText('Hello', 100, 100);
});
```

### 字体加载状态检查

```javascript
function isFontLoaded(fontFamily) {
  return document.fonts.check(`16px ${fontFamily}`);
}

// 使用
if (isFontLoaded('CustomFont')) {
  ctx.font = '24px CustomFont';
} else {
  ctx.font = '24px Arial';  // 降级
}
```

---

## 工程实践：真实项目中的文本渲染

在实际项目中，文本渲染不仅仅是调用`fillText`那么简单。让我们解决几个真实场景中常遇到的问题。

### 实战案例1：多行文本自动换行

#### 需求
在固定宽度的矩形内显示长文本，超出宽度自动换行，支持中英文混排。

#### 思路分析
1. 逐字符累积，用`measureText`测量当前行宽度
2. 超过最大宽度时换行
3. 中文标点不能作为行首
4. 考虑英文单词完整性（可选）

#### 完整实现

```javascript
/**
 * 绘制多行文本，支持自动换行
 * @param {CanvasRenderingContext2D} ctx - 绘图上下文
 * @param {string} text - 要绘制的文本
 * @param {number} x - 起始x坐标
 * @param {number} y - 起始y坐标  
 * @param {number} maxWidth - 最大宽度
 * @param {number} lineHeight - 行高
 * @return {number} 总高度
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let currentY = y;
  
  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line.length > 0) {
      // 检查是否为中文标点（不能作为行首）
      if (isPunctuation(chars[i])) {
        line += chars[i];  // 标点跟在当前行
        ctx.fillText(line, x, currentY);
        line = '';
        currentY += lineHeight;
      } else {
        ctx.fillText(line, x, currentY);
        line = chars[i];  // 当前字符移到下一行
        currentY += lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  
  // 绘制最后一行
  if (line.length > 0) {
    ctx.fillText(line, x, currentY);
  }
  
  return currentY + lineHeight - y; // 返回总高度
}

function isPunctuation(char) {
  const punctuations = '，。！？、；：''""（）《》【】';
  return punctuations.includes(char);
}

// 使用示例
ctx.font = '16px sans-serif';
ctx.fillStyle = '#333';
const text = '这是一段很长的文本，需要自动换行。Canvas doesn\'t support automatic line breaks, so we need to implement it manually.';
wrapText(ctx, text, 50, 50, 300, 24);
```

#### 性能优化

在大量文本场景下，`measureText`会成为瓶颈。优化方案：

```javascript
// 字符宽度缓存
const charWidthCache = new Map();

function measureCharWidth(ctx, char) {
  if (!charWidthCache.has(char)) {
    charWidthCache.set(char, ctx.measureText(char).width);
  }
  return charWidthCache.get(char);
}

// 优化版本的wrapText
function wrapTextOptimized(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let lineWidth = 0;
  let currentY = y;
  
  for (const char of chars) {
    const charWidth = measureCharWidth(ctx, char);
    
    if (lineWidth + charWidth > maxWidth && line.length > 0) {
      if (isPunctuation(char)) {
        line += char;
        lineWidth += charWidth;
        ctx.fillText(line, x, currentY);
        line = '';
        lineWidth = 0;
        currentY += lineHeight;
      } else {
        ctx.fillText(line, x, currentY);
        line = char;
        lineWidth = charWidth;
        currentY += lineHeight;
      }
    } else {
      line += char;
      lineWidth += charWidth;
    }
  }
  
  if (line.length > 0) {
    ctx.fillText(line, x, currentY);
  }
  
  return currentY + lineHeight - y;
}
```

---

### 实战案例2：文本溢出省略

#### 需求
在固定宽度内显示文本，超出部分显示"..."。

#### 实现

```javascript
/**
 * 绘制带省略号的文本
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text - 原始文本
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @param {number} maxWidth - 最大宽度
 */
function drawTextWithEllipsis(ctx, text, x, y, maxWidth) {
  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  let textWidth = ctx.measureText(text).width;
  
  // 文本没有超出，直接绘制
  if (textWidth <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  
  // 二分查找：找到能容纳的最大长度
  let left = 0;
  let right = text.length;
  let result = 0;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const testText = text.substring(0, mid);
    const testWidth = ctx.measureText(testText).width;
    
    if (testWidth + ellipsisWidth <= maxWidth) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  // 绘制裁剪后的文本+省略号
  ctx.fillText(text.substring(0, result) + ellipsis, x, y);
}

// 使用
ctx.font = '16px sans-serif';
drawTextWithEllipsis(ctx, '这是一段非常非常长的文本内容', 50, 50, 200);
```

---

### 实战案例3：文本在矩形框内完美居中

#### 需求
文本在矩形框内既水平居中又垂直居中。

#### 实现

```javascript
/**
 * 在矩形内绘制居中文本
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x - 矩形左上角x
 * @param {number} y - 矩形左上角y
 * @param {number} width - 矩形宽度
 * @param {number} height - 矩形高度
 */
function drawCenteredText(ctx, text, x, y, width, height) {
  // 保存状态
  ctx.save();
  
  // 设置水平居中对齐
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 计算中心点
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // 绘制文本
  ctx.fillText(text, centerX, centerY);
  
  ctx.restore();
}

// 使用：在按钮上绘制文本
function drawButton(ctx, text, x, y, width, height) {
  // 绘制按钮背景
  ctx.fillStyle = '#3498db';
  ctx.fillRect(x, y, width, height);
  
  // 绘制居中文本
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  drawCenteredText(ctx, text, x, y, width, height);
}

drawButton(ctx, '点击我', 100, 100, 120, 40);
```

---

### 实战案例4：文本渐变效果

#### 实现

```javascript
/**
 * 绘制渐变文本
 */
function drawGradientText(ctx, text, x, y) {
  // 测量文本宽度
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  
  // 创建渐变（沿文本方向）
  const gradient = ctx.createLinearGradient(x, y, x + textWidth, y);
  gradient.addColorStop(0, '#e74c3c');
  gradient.addColorStop(0.5, '#f39c12');
  gradient.addColorStop(1, '#3498db');
  
  // 应用渐变并绘制
  ctx.fillStyle = gradient;
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(text, x, y);
}

drawGradientText(ctx, 'Gradient Text', 100, 100);
```

---

### 边界情况处理

在实际项目中，务必考虑边界情况：

```javascript
function safeDrawText(ctx, text, x, y, maxWidth) {
  // 1. 空文本检查
  if (!text || text.length === 0) {
    return;
  }
  
  // 2. 坐标有效性检查
  if (isNaN(x) || isNaN(y)) {
    console.warn('Invalid text coordinates:', x, y);
    return;
  }
  
  // 3. 最大宽度检查
  if (maxWidth !== undefined && maxWidth <= 0) {
    console.warn('Invalid maxWidth:', maxWidth);
    return;
  }
  
  // 4. 字体有效性检查
  if (!ctx.font || ctx.font === '') {
    ctx.font = '16px sans-serif'; // 设置默认字体
  }
  
  // 5. 绘制
  try {
    if (maxWidth !== undefined) {
      ctx.fillText(text, x, y, maxWidth);
    } else {
      ctx.fillText(text, x, y);
    }
  } catch (error) {
    console.error('Failed to draw text:', error);
  }
}
```

---

## 本章小结

本章我们深入探讨了 Canvas 的文本渲染技术，核心内容包括：

**文本绘制**：
- `fillText()` 和 `strokeText()` 两种绘制方法
- `maxWidth` 参数用于压缩文本（不换行）
- 组合使用实现描边文本效果

**字体设置**：
- `font` 属性使用 CSS 风格语法
- 必须包含字号和字体族
- 自定义字体需要等待加载完成

**文本对齐**：
- `textAlign`：控制水平对齐（left, center, right, start, end）
- `textBaseline`：控制垂直基线（top, middle, alphabetic, bottom）
- 对齐改变的是锚点位置，不是文本位置

**文本测量**：
- `measureText()` 返回 TextMetrics 对象
- `width` 属性始终可用
- 扩展属性提供精确的边界框信息（需检查兼容性）

**高级应用**：
- Canvas 不支持自动换行，需手动实现
- 换行算法：逐词测量，超宽换行
- 需处理单词过长的边界情况

这些技术是构建图表、数据可视化、图形编辑器等应用的基础。在后续章节中，我们会看到文本渲染在实际项目中的应用。

**思考题**：
1. 如何实现文本的垂直居中对齐？
2. 如何实现文本在矩形框内居中显示（既水平居中又垂直居中）？
3. 如何实现文本的渐变填充效果？

这些问题的答案，会在后续的实践中逐步揭晓。
