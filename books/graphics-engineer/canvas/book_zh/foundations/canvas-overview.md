# Canvas 概述与开发环境

假设你要在网页上实现一个简单的画板功能，用户可以自由绘制图形、添加文字、拖动元素。你会选择什么技术方案？

如果你考虑过 SVG，那是个不错的选择——每个图形元素都是 DOM 节点，可以单独操作和修改。但如果你需要处理大量图形对象（比如上千个粒子动画），或者需要像素级的图像处理（比如实时滤镜），SVG 就力不从心了。

这时，Canvas 就是更合适的选择。

本章将回答以下核心问题：
- Canvas 到底是什么？它与 SVG 有何本质差异？
- Canvas 的工作原理是什么？
- 何时应该选择 Canvas 而不是 SVG？
- 如何搭建 Canvas 开发环境并写出第一个程序？

---

## 什么是 Canvas

首先要问一个问题：**Canvas 的本质是什么？**

Canvas 是 HTML5（WHATWG HTML Living Standard）引入的位图画布元素（`<canvas>`），提供了可通过 JavaScript API 进行像素级绘制的二维区域。根据 WHATWG HTML 规范（4.12.5 The canvas element），Canvas 元素代表一个分辨率依赖的位图画布，可用于动态渲染图形、游戏图像或其他视觉图像。

### Canvas 的核心特征

**1. 位图渲染**

Canvas 渲染的是 **位图**（Bitmap），不是矢量图形。一旦绘制完成，图形就变成了画布上的像素点，无法单独操作某个图形元素。

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 绘制一个矩形
ctx.fillStyle = '#3498db';
ctx.fillRect(50, 50, 100, 100);

// 此时矩形已经"烧"在画布上了，无法通过 DOM API 找到这个矩形
// 如果要移动它，只能清空画布重新绘制
```

这就像在纸上画画：铅笔痕迹一旦留在纸上，就成为纸的一部分，无法单独"抓取"某条线移动它。

**2. 即时模式渲染（Immediate Mode）**

Canvas 采用即时模式渲染：绘制命令被立即执行并栅格化到像素缓冲区，不保留场景图（Scene Graph）或对象模型。

这与 SVG 的保留模式（Retained Mode）形成鲜明对比：

```html
<!-- SVG 保留模式：每个图形是独立的 DOM 元素 -->
<svg width="200" height="200">
  <rect id="myRect" x="50" y="50" width="100" height="100" fill="#3498db" />
</svg>

<script>
// 可以直接操作这个矩形
const rect = document.getElementById('myRect');
rect.setAttribute('x', 100); // 移动矩形
rect.setAttribute('fill', '#e74c3c'); // 改变颜色
</script>
```

SVG 会维护一个场景图（Scene Graph），每个图形元素都可以独立查询和修改。Canvas 没有这种机制，所有绘制操作直接修改像素缓冲区。

**工程权衡**：
- **即时模式优势**：内存占用低（无需维护场景图）、渲染性能高（直接操作像素）
- **即时模式代价**：交互复杂度高（需要手动实现碰撞检测、状态管理）、重绘成本高（每次更新需全量或部分重绘）

**类比**：
- **Canvas（即时模式）**：像在黑板上画画，画完就固定了，要改动只能擦掉重画
- **SVG（保留模式）**：像用磁铁贴字，每个字都可以随时移动、修改

---

## Canvas 的工作原理

现在我要问第二个问题：**Canvas 如何完成绘制？**

Canvas 的绘制依赖一个核心概念：**绘图上下文**（Rendering Context）。

### 绘图上下文（Rendering Context）

Canvas 元素本身只是一个容器，真正的绘制 API 都在绘图上下文（Rendering Context）对象上。根据 HTML 规范，Canvas 支持多种上下文类型：

```javascript
const canvas = document.getElementById('canvas');

// 获取 2D 渲染上下文（CanvasRenderingContext2D）
const ctx = canvas.getContext('2d');

// 所有 2D 绘制操作通过 ctx 对象完成
ctx.fillStyle = '#3498db';
ctx.fillRect(10, 10, 100, 50);
ctx.strokeStyle = '#e74c3c';
ctx.strokeRect(120, 10, 100, 50);
```

**关键设计原则**：
1. **单一上下文原则**：同一个 Canvas 元素在同一时刻只能有一个活跃的上下文。如果再次调用 `getContext()` 且类型不同，会返回 `null`。

```javascript
const ctx2d = canvas.getContext('2d');
const ctxWebgl = canvas.getContext('webgl'); // 返回 null，因为已创建 2d 上下文
```

2. **上下文类型**：
   - `'2d'`：返回 CanvasRenderingContext2D，用于 2D 图形绘制
   - `'webgl'` / `'webgl2'`：返回 WebGL 上下文，用于 3D 渲染
   - `'bitmaprenderer'`：用于高效渲染 ImageBitmap 对象

### Canvas 在浏览器渲染流程中的位置

Canvas 的渲染机制绕过了传统的 DOM 布局和样式计算流程，直接操作后备存储（Backing Store）—— 一个像素缓冲区。

**DOM/SVG 渲染流水线**：
```
HTML 解析 → DOM 树构建 → CSSOM 树构建 → 
布局（Layout）→ 绘制（Paint）→ 合成（Composite）
```

**Canvas 渲染流水线**：
```
JavaScript 绘制 API 调用 → 像素缓冲区写入 → 
合成层（Composite Layer）→ 显示
```

**性能优势来源**：
1. **跳过布局计算**：Canvas 内容不参与 DOM 布局，避免了 Reflow/Relayout 的开销
2. **跳过样式计算**：无需解析 CSS 规则和计算继承属性
3. **GPU 加速合成**：Canvas 作为独立的合成层，可以利用 GPU 进行硬件加速

**代价**：
- 失去了浏览器的自动布局能力，所有布局逻辑需要手动计算
- 失去了 CSS 的样式管理能力，所有样式需要通过 JavaScript 设置

---

## Canvas vs SVG：何时选择 Canvas

现在我要问第三个问题：**什么场景下应该选择 Canvas？什么场景下选择 SVG？**

### 核心差异对比

**Canvas（位图 + 即时模式）**
- ✅ 高性能像素级绘制
- ✅ 适合大量图形对象（粒子系统、游戏）
- ✅ 适合图像处理（滤镜、卷积）
- ✅ 适合动态内容频繁重绘
- ❌ 缺乏内置交互（需要手动实现点击检测）
- ❌ 缩放时会失真（位图特性）
- ❌ 可访问性差（不是 DOM）

**SVG（矢量 + 保留模式）**
- ✅ 无损缩放（矢量特性）
- ✅ 每个元素可单独操作
- ✅ 内置事件系统（点击、悬停）
- ✅ 可访问性好（是 DOM）
- ✅ 易于调试（可以在 DevTools 中查看元素）
- ❌ 大量元素时性能下降（DOM 开销）
- ❌ 不适合像素级操作

### 选型决策指南

**优先选择 Canvas 的场景**：
1. **图形对象数量 > 1000**：粒子系统、大规模数据可视化、游戏场景渲染
   - 原因：SVG 每个元素都是 DOM 节点，大量节点会导致内存占用和布局计算成本激增
   - 经验值：当图形对象超过 1000 个时，Canvas 性能优势显著

2. **像素级图像处理**：照片编辑、实时滤镜、生成式艺术、图像卷积
   - 原因：Canvas 提供 ImageData API，可直接读写像素数据
   - SVG 不支持像素级操作

3. **高频率重绘**：游戏渲染（60fps）、物理模拟、实时动画
   - 原因：即时模式的 Canvas 重绘成本低，无需更新 DOM
   - SVG 每次修改都触发 DOM 变更和重排

4. **性能敏感场景**：移动端应用、低端设备
   - 原因：Canvas 内存占用更低，渲染性能更可控

**优先选择 SVG 的场景**：
1. **交互式图表**：需要单独响应每个元素的点击/悬停事件
   - 原因：SVG 每个元素都有内置事件系统，可直接绑定事件监听器
   - Canvas 需要手动实现碰撞检测（后续章节会详细讲解）

2. **矢量图标系统**：Logo、Icon，需要在不同分辨率下保持清晰
   - 原因：SVG 是矢量格式，任意缩放不失真
   - Canvas 是位图，缩放会导致像素化

3. **文档型图形**：流程图、架构图、思维导图
   - 原因：SVG 是 DOM 的一部分，支持屏幕阅读器和可访问性
   - 可以用 CSS 直接控制样式

4. **低频更新的图形**：静态图表、装饰性图形
   - 原因：SVG 的保留模式适合不频繁变化的内容
   - 修改单个元素无需重绘整个画面

**混合使用策略**：
实际项目中，Canvas 和 SVG 常常配合使用。例如在图形编辑器中：
- **Canvas 渲染内容区域**：主画布用 Canvas 绘制，支持高性能和像素操作
- **SVG 渲染 UI 控件**：工具栏、面板、图标用 SVG，利用其交互性和矢量特性

**案例分析：Figma 的技术选型**：
Figma 是一个基于浏览器的专业级图形设计工具，核心画布使用 Canvas，但在 Canvas 上自己实现了保留模式的对象模型：
- **为什么选 Canvas**：需要像素级精确控制、高性能渲染大量图形对象
- **如何解决交互问题**：手动实现碰撞检测、事件系统、对象管理（本书后续章节的核心主题）
- **架构权衡**：用工程复杂度换取性能和用户体验

这正是本书要深入探讨的核心技术路径。

---

## Canvas 的尺寸：CSS vs 实际像素

现在我要问第四个问题：**如何正确设置 Canvas 的尺寸？**

Canvas 有两个"尺寸"概念，新手常常混淆：

1. **Canvas 的实际像素尺寸**（`width` 和 `height` 属性）
2. **Canvas 的 CSS 显示尺寸**（`style.width` 和 `style.height`）

### 错误方式：只设置 CSS

```html
<!-- ❌ 错误：只设置 CSS，会导致内容模糊 -->
<canvas id="canvas" style="width: 800px; height: 600px;"></canvas>

<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

console.log(canvas.width);  // 300（默认值）
console.log(canvas.height); // 150（默认值）

// 绘制的内容会被拉伸到 800x600，导致模糊
ctx.fillRect(0, 0, 100, 100);
</script>
```

**问题**：Canvas 默认的实际像素是 300×150，CSS 只是把这个小画布"拉伸"显示为 800×600，就像把一张小图片放大，必然模糊。

### 正确方式：同时设置实际像素和 CSS

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ✅ 正确：先设置实际像素尺寸
canvas.width = 800;
canvas.height = 600;

// 然后设置 CSS 显示尺寸（可选，通常一致）
canvas.style.width = '800px';
canvas.style.height = '600px';

// 现在绘制的内容清晰锐利
ctx.fillStyle = '#3498db';
ctx.fillRect(0, 0, 100, 100);
```

**关键点**：
- `canvas.width` 和 `canvas.height` 决定 **像素缓冲区的实际尺寸**
- `style.width` 和 `style.height` 决定 **在页面上的显示大小**
- 两者可以不一致（用于实现高清屏适配），但通常保持一致

### 高清屏适配（简要提及）

在 Retina 屏幕上，可以将 Canvas 的实际像素设置为显示尺寸的 2 倍：

```javascript
const dpr = window.devicePixelRatio || 1;

canvas.width = 800 * dpr;
canvas.height = 600 * dpr;
canvas.style.width = '800px';
canvas.style.height = '600px';

// 缩放绘图上下文
ctx.scale(dpr, dpr);
```

这样可以在高清屏上获得清晰的渲染效果。详细内容会在后续"高 DPI 屏幕适配"章节深入讲解。

---

## 开发环境搭建

### 基础 HTML 模板

一个最简单的 Canvas 开发环境只需要一个 HTML 文件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canvas 开发环境</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #1a1a1a;
    }
    canvas {
      border: 1px solid #444;
      background: #fff;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

### TypeScript 配置（推荐）

使用 TypeScript 可以获得更好的类型提示和代码补全：

**tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  }
}
```

**package.json**（使用 Vite 作为开发服务器）：
```json
{
  "name": "canvas-project",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**main.ts**：
```typescript
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = 800;
canvas.height = 600;

// TypeScript 提供完整的类型提示
ctx.fillStyle = '#3498db';
ctx.fillRect(50, 50, 100, 100);
```

### 调试工具推荐

**1. VS Code 插件**
- **Live Server**：快速启动本地服务器
- **Error Lens**：实时显示类型错误

**2. 浏览器 DevTools**
- **Chrome DevTools**：在 Console 中可以直接访问 `canvas` 和 `ctx` 对象
- **Canvas Inspector**（Chrome 扩展）：录制和回放 Canvas 绘制过程

**3. 性能监控**
```javascript
// 简单的 FPS 计数器
let lastTime = performance.now();
let frameCount = 0;

function render() {
  frameCount++;
  const now = performance.now();
  
  if (now - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = now;
  }
  
  // 你的绘制代码...
  
  requestAnimationFrame(render);
}

render();
```

---

## 第一个 Canvas 程序：Hello Canvas

现在让我们写第一个完整的 Canvas 程序，绘制一个简单的彩色方块动画：

```javascript
// main.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 设置 Canvas 尺寸
canvas.width = 800;
canvas.height = 600;

// 定义方块的状态
let x = 50;
let y = 50;
let vx = 2;  // x 方向速度
let vy = 2;  // y 方向速度
const size = 50;

// 动画循环
function animate() {
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制方块
  ctx.fillStyle = '#3498db';
  ctx.fillRect(x, y, size, size);
  
  // 更新位置
  x += vx;
  y += vy;
  
  // 碰撞检测：碰到边界反弹
  if (x + size > canvas.width || x < 0) {
    vx = -vx;
  }
  if (y + size > canvas.height || y < 0) {
    vy = -vy;
  }
  
  // 下一帧
  requestAnimationFrame(animate);
}

// 启动动画
animate();
```

**代码逐行解析**：

1. **获取 Canvas 和上下文**：所有 Canvas 程序的第一步
2. **设置尺寸**：确保画布有足够的像素分辨率
3. **定义状态**：方块的位置 `(x, y)` 和速度 `(vx, vy)`
4. **清空画布**：`clearRect` 清除上一帧的内容（即时模式的核心）
5. **绘制背景**：用浅灰色填充整个画布
6. **绘制方块**：在当前位置绘制蓝色矩形
7. **更新位置**：根据速度移动方块
8. **碰撞检测**：碰到边界时反转速度方向
9. **请求下一帧**：使用 `requestAnimationFrame` 实现流畅动画

运行这个程序，你会看到一个蓝色方块在画布中弹跳。有没有很神奇的感觉？这就是 Canvas 的魅力——用简单的代码实现流畅的动画效果。

---

## Canvas 的边界与限制

在开始深入学习之前，有必要了解 Canvas 的一些技术边界和限制。

### 1. 最大尺寸限制

不同浏览器对 Canvas 的最大尺寸有限制：

- **Chrome/Edge**：约 32,767 × 32,767 像素
- **Firefox**：约 32,767 × 32,767 像素
- **Safari**：约 4,096 × 4,096 像素（移动端更小）

超过限制时，`getContext()` 会返回 `null`。

**检测方法**：
```javascript
function getMaxCanvasSize() {
  let size = 16384; // 从一个较大值开始
  
  while (size > 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    if (canvas.getContext('2d')) {
      return size;
    }
    
    size = Math.floor(size / 2);
  }
  
  return 256; // 最小安全值
}

console.log('最大 Canvas 尺寸:', getMaxCanvasSize());
```

### 2. 跨域图像安全限制

当 Canvas 绘制了跨域图像后，画布会被"污染"（tainted），无法再读取像素数据：

```javascript
const img = new Image();
img.src = 'https://example.com/image.jpg'; // 跨域图像
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  
  // ❌ 错误：会抛出 SecurityError
  const imageData = ctx.getImageData(0, 0, 100, 100);
};
```

**解决方案**：
- 服务器设置 CORS 头：`Access-Control-Allow-Origin: *`
- 图像设置 `crossOrigin` 属性：`img.crossOrigin = 'anonymous'`

这个主题会在"图像绘制与处理"章节详细讲解。

### 3. 可访问性问题

Canvas 渲染的内容 **不是 DOM**，屏幕阅读器无法识别。如果需要支持无障碍访问，应该：
- 提供 `<canvas>` 元素的 `aria-label` 属性
- 在 Canvas 内部提供文本描述（fallback content）
- 对于交互式内容，同时提供键盘导航支持

```html
<canvas id="canvas" aria-label="数据可视化图表：显示2024年销售趋势">
  <!-- Fallback content for screen readers -->
  <p>2024年销售额呈上升趋势，Q1: 100万，Q2: 150万，Q3: 200万，Q4: 250万</p>
</canvas>
```

---

## 本章小结

让我们回顾一下本章的核心要点：

**Canvas 是什么**：
- 位图画布，通过 JavaScript 进行像素级绘制
- 采用即时模式：画完就固定，不保留图形对象
- 高性能，适合大量图形和动态内容

**Canvas vs SVG**：
- Canvas：位图 + 即时模式，高性能，缺乏内置交互
- SVG：矢量 + 保留模式，无损缩放，每个元素可操作
- 选型依据：图形数量、是否需要像素操作、交互需求

**核心概念**：
- 绘图上下文（Context）：通过 `getContext('2d')` 获取
- 尺寸设置：区分实际像素尺寸和 CSS 显示尺寸
- 即时模式特性：需要手动清空画布并重绘

**技术边界**：
- 浏览器对 Canvas 尺寸有限制
- 跨域图像会污染画布
- 可访问性需要额外处理

**下一步**：
在下一章，我们将深入学习 Canvas 的坐标系统，理解如何精确定位和绘制图形。

---

## 思考题

1. 如果要实现一个可以拖动、缩放的图形编辑器，应该选择 Canvas 还是 SVG？为什么？
2. Canvas 的实际像素尺寸设置为 1600×1200，CSS 显示尺寸设置为 800×600，会发生什么？
3. 如何检测浏览器是否支持 Canvas？
4. 为什么 Canvas 需要手动调用 `clearRect` 清空画布，而 SVG 不需要？

思考完这些问题，你就已经建立了对 Canvas 的整体认知。让我们继续前进，探索 Canvas 的坐标系统！
