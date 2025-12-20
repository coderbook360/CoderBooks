# Canvas与SVG对比选择

你正在开发一个数据可视化项目，团队成员争论不休：应该用 Canvas 还是 SVG？产品经理希望图表能无限缩放不失真，前端工程师担心性能问题，UI 设计师希望能方便地添加交互效果。

Canvas 和 SVG 是 Web 图形开发的两大核心技术，它们的设计理念截然不同，适用场景也大相径庭。本章将深入对比两者的底层机制、性能特性、实际应用场景，并提供混合使用的架构方案。

---

## 1. 核心机制对比

### 1.1 渲染模式：即时模式 vs 保留模式

这是 Canvas 和 SVG 最根本的区别。

**Canvas：即时模式（Immediate Mode）**

```javascript
// Canvas 绘制后不保留对象
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 100);

// 无法"获取"这个矩形，它已经变成像素了
// 想要移动？必须清空重绘
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'red';
ctx.fillRect(20, 20, 100, 100); // 新位置
```

**特性**：
- 绘制命令立即执行，转换为像素
- 不保留图形对象的数据结构
- 无法直接查询或修改已绘制的图形
- 类似于在纸上画画，画完就固化了

**SVG：保留模式（Retained Mode）**

```xml
<!-- SVG 将图形保存为 DOM 节点 -->
<svg>
  <rect id="myRect" x="10" y="10" width="100" height="100" fill="red"/>
</svg>
```

```javascript
// 可以直接修改 DOM 节点
const rect = document.getElementById('myRect');
rect.setAttribute('x', 20); // 位置改变，浏览器自动重绘
```

**特性**：
- 每个图形都是一个 DOM 节点
- 可以通过 DOM API 查询和修改
- 浏览器维护完整的场景图（Scene Graph）
- 类似于用乐高积木搭建，可以随时调整

### 1.2 DOM 结构对比

| 维度 | Canvas | SVG |
|------|--------|-----|
| **DOM 元素** | 单个 `<canvas>` 元素 | 每个图形是一个元素（`<rect>`, `<circle>` 等） |
| **检查工具** | DevTools 看不到内部图形 | DevTools 可以查看和编辑每个图形 |
| **CSS 样式** | 不支持 | 支持（如 `rect { fill: red; }`） |
| **事件监听** | 需要手动实现点击检测 | 每个图形原生支持事件（`onclick`, `onhover`） |

**示例：事件处理对比**

```javascript
// Canvas: 手动实现点击检测
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 手动检测是否点击了矩形
  objects.forEach(obj => {
    if (x >= obj.x && x <= obj.x + obj.width &&
        y >= obj.y && y <= obj.y + obj.height) {
      console.log('Clicked:', obj);
    }
  });
});

// SVG: 原生事件支持
rect.addEventListener('click', (e) => {
  console.log('Clicked:', e.target);
});
```

### 1.3 像素 vs 矢量

**Canvas：基于像素（位图）**

```javascript
// Canvas 绘制圆形
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.fill();

// 放大后会模糊（像素被拉伸）
canvas.style.transform = 'scale(2)'; // ❌ 模糊
```

**SVG：基于矢量**

```xml
<!-- SVG 圆形定义 -->
<circle cx="100" cy="100" r="50" fill="red"/>

<!-- 无限缩放不失真 -->
<svg style="transform: scale(2)"> <!-- ✅ 清晰 -->
```

---

## 2. 性能深度对比

### 2.1 渲染性能：对象数量的影响

**基准测试**：

```javascript
// 测试：绘制不同数量的圆形
function benchmarkCanvas(count) {
  const start = performance.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * 800,
      Math.random() * 600,
      5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  
  return performance.now() - start;
}

function benchmarkSVG(count) {
  const start = performance.now();
  svg.innerHTML = ''; // 清空
  
  for (let i = 0; i < count; i++) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', Math.random() * 800);
    circle.setAttribute('cy', Math.random() * 600);
    circle.setAttribute('r', 5);
    svg.appendChild(circle);
  }
  
  return performance.now() - start;
}

// 结果（Chrome, 平均值）
console.log('100个对象:');
console.log('Canvas:', benchmarkCanvas(100), 'ms');   // ~1ms
console.log('SVG:', benchmarkSVG(100), 'ms');         // ~3ms

console.log('1000个对象:');
console.log('Canvas:', benchmarkCanvas(1000), 'ms');  // ~8ms
console.log('SVG:', benchmarkSVG(1000), 'ms');        // ~80ms

console.log('10000个对象:');
console.log('Canvas:', benchmarkCanvas(10000), 'ms'); // ~60ms
console.log('SVG:', benchmarkSVG(10000), 'ms');       // ~2000ms（非常慢）
```

**性能拐点**：约 1000-2000 个对象

| 对象数量 | Canvas | SVG | 更快的方案 |
|---------|--------|-----|-----------|
| <100 | ✅ 1ms | ✅ 3ms | 相当 |
| 100-1000 | ✅ 8ms | ⚠️ 80ms | Canvas |
| 1000-10000 | ✅ 60ms | ❌ 2000ms | Canvas |
| >10000 | ⚠️ 需优化 | ❌ 不可用 | Canvas |

### 2.2 交互性能对比

**场景**：鼠标悬停高亮对象

```javascript
// Canvas: 每次 hover 都要重绘所有对象
canvas.addEventListener('mousemove', (e) => {
  const hoveredObj = findObjectAt(e.clientX, e.clientY);
  
  // 清空并重绘
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  objects.forEach(obj => {
    ctx.fillStyle = obj === hoveredObj ? 'red' : 'blue';
    obj.draw(ctx);
  });
});

// SVG: 只需修改单个元素
svg.addEventListener('mouseover', (e) => {
  if (e.target.tagName === 'circle') {
    e.target.setAttribute('fill', 'red');
  }
}, true);

svg.addEventListener('mouseout', (e) => {
  if (e.target.tagName === 'circle') {
    e.target.setAttribute('fill', 'blue');
  }
}, true);
```

**结论**：
- **SVG 优势**：局部更新，无需重绘其他元素
- **Canvas 劣势**：需要全局重绘（可用脏矩形优化）

### 2.3 内存占用对比

| 对象数量 | Canvas 内存 | SVG 内存 | 说明 |
|---------|------------|---------|------|
| 1000 | ~10 MB | ~50 MB | SVG 每个节点有 DOM 开销 |
| 10000 | ~50 MB | ~500 MB | SVG 内存线性增长 |

**Canvas 内存组成**：
- 位图缓冲区：`width × height × 4` 字节
- JavaScript 对象数组（如果自己维护）

**SVG 内存组成**：
- 每个 DOM 节点：~50-100 字节基础开销
- 样式、事件监听器等附加内存

---

## 3. 功能特性对比

### 3.1 交互能力

| 功能 | Canvas | SVG |
|------|--------|-----|
| **点击事件** | 手动实现点击检测 | 每个元素原生支持 `onclick` |
| **悬停效果** | 手动实现 hover 检测 | CSS `:hover` 伪类 |
| **拖拽** | 手动实现 | 部分浏览器支持原生拖拽 |
| **辅助功能** | 不支持（无语义） | 支持（可添加 `<title>`, `aria-*`） |
| **CSS 样式** | 不支持 | 完全支持（如 `transition`, `animation`） |

**SVG 的 CSS 动画示例**：

```xml
<style>
  circle {
    transition: r 0.3s;
  }
  circle:hover {
    r: 10; /* 悬停时半径增大 */
  }
</style>

<svg>
  <circle cx="50" cy="50" r="5" fill="red"/>
</svg>
```

Canvas 实现相同效果需要手动编写动画逻辑。

### 3.2 可访问性（Accessibility）

**SVG**：
```xml
<svg role="img" aria-label="销售数据图表">
  <title>2023年销售数据</title>
  <desc>展示各季度销售额的柱状图</desc>
  <rect role="graphics-symbol" aria-label="Q1: 100万"/>
</svg>
```

**Canvas**：
```html
<canvas aria-label="销售数据图表">
  <!-- fallback 内容，但屏幕阅读器无法理解图形内容 -->
  2023年销售数据图表
</canvas>
```

**结论**：需要良好可访问性的场景（如政府网站、教育平台），SVG 更合适。

---

## 4. 技术选型决策指南

### 4.1 选择 Canvas 的场景

✅ **游戏开发**
- 大量移动对象（精灵、粒子）
- 逐帧动画
- 需要像素级控制（碰撞检测、特效）

✅ **数据可视化（大数据集）**
- 散点图（>10000 点）
- 实时数据流（股票走势、传感器数据）
- 热力图、密度图

✅ **图像处理**
- 滤镜效果
- 图片编辑器
- 计算机视觉应用

✅ **性能敏感型应用**
- 需要高帧率（60 FPS）
- 移动端设备
- 对象数量动态变化且可能很多

### 4.2 选择 SVG 的场景

✅ **图标和 UI 组件**
- Logo、图标库
- 需要响应式缩放
- 需要 CSS 样式控制

✅ **交互式图表（少量元素）**
- 饼图、柱状图（<100 个元素）
- 需要悬停提示、点击交互
- 需要动画过渡效果

✅ **地图和可视化（中等数据集）**
- 地理地图（区域少于1000个）
- 组织架构图、流程图
- 需要缩放和平移的场景

✅ **可访问性要求高的场景**
- 政府网站、教育平台
- 需要屏幕阅读器支持

### 4.3 混合使用策略

**最佳实践**：Canvas 处理动态内容，SVG 处理静态/交互内容。

**架构1：分层叠加**

```html
<div style="position: relative;">
  <!-- 底层：SVG 静态背景 -->
  <svg style="position: absolute; top: 0; left: 0;">
    <rect width="800" height="600" fill="#f0f0f0"/>
    <!-- 网格、坐标轴等静态元素 -->
  </svg>
  
  <!-- 上层：Canvas 动态内容 -->
  <canvas width="800" height="600" style="position: absolute; top: 0; left: 0;"></canvas>
  
  <!-- 顶层：SVG 交互控件 -->
  <svg style="position: absolute; top: 0; left: 0; pointer-events: none;">
    <circle cx="100" cy="100" r="20" fill="red" style="pointer-events: auto;"/>
  </svg>
</div>
```

**优势**：
- Canvas 处理大量数据点绘制（高性能）
- SVG 提供清晰的坐标轴、图例（矢量缩放）
- SVG 控件提供原生交互

**架构2：SVG 嵌入 Canvas**

```xml
<svg>
  <foreignObject x="0" y="0" width="800" height="600">
    <canvas width="800" height="600"></canvas>
  </foreignObject>
  <!-- SVG 元素在 Canvas 之上 -->
  <circle cx="100" cy="100" r="20" fill="red"/>
</svg>
```

**架构3：动态切换**

```javascript
class Chart {
  constructor(container) {
    this.container = container;
    this.useCanvas = false;
  }
  
  render(data) {
    // 根据数据量动态选择渲染方式
    if (data.length > 1000 && !this.useCanvas) {
      this.switchToCanvas();
    } else if (data.length < 500 && this.useCanvas) {
      this.switchToSVG();
    }
    
    this.useCanvas ? this.renderCanvas(data) : this.renderSVG(data);
  }
  
  switchToCanvas() {
    this.container.innerHTML = '<canvas></canvas>';
    this.canvas = this.container.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.useCanvas = true;
  }
  
  switchToSVG() {
    this.container.innerHTML = '<svg></svg>';
    this.svg = this.container.querySelector('svg');
    this.useCanvas = false;
  }
}
```

---

## 5. 真实项目案例分析

### 案例1：ECharts 的混合方案

**ECharts** 同时支持 Canvas 和 SVG 渲染器：

```javascript
const chart = echarts.init(container, null, {
  renderer: 'canvas' // 或 'svg'
});
```

**决策逻辑**：
- 默认 Canvas：适合大多数场景（性能优先）
- 移动端小数据量：自动切换到 SVG（更省电）
- 特殊需求（如打印、导出矢量图）：用户可手动切换

### 案例2：D3.js 的 SVG 优先

**D3.js** 主要使用 SVG，原因：
- 数据可视化通常元素数量适中（<1000）
- 需要丰富的交互（悬停、点击、拖拽）
- 需要动画过渡效果
- 社区期望可访问性

但 D3.js 也支持 Canvas 渲染（通过自定义渲染器）。

### 案例3：游戏引擎的 Canvas 选择

**Phaser**、**PixiJS** 等游戏引擎选择 Canvas/WebGL，原因：
- 大量精灵对象（>1000）
- 高帧率要求（60 FPS）
- 需要像素级控制（碰撞检测、粒子系统）
- 不需要 DOM 交互

---

## 6. 决策流程图

```
开始
  ↓
对象数量 > 2000？
  ├─ 是 → Canvas
  ├─ 否 ↓
需要原生交互事件？
  ├─ 是 → SVG
  ├─ 否 ↓
需要矢量缩放？
  ├─ 是 → SVG
  ├─ 否 ↓
性能敏感（移动端）？
  ├─ 是 → Canvas
  ├─ 否 ↓
需要可访问性？
  ├─ 是 → SVG
  ├─ 否 ↓
默认选择 → Canvas（通用性强）
```

---

## 本章小结

Canvas 与 SVG 的核心差异：

1. **渲染模式**：Canvas 即时模式（像素），SVG 保留模式（DOM）
2. **性能拐点**：约 1000-2000 个对象，Canvas 更优
3. **交互能力**：SVG 原生支持事件，Canvas 需手动实现
4. **缩放特性**：SVG 矢量无损，Canvas 位图会模糊
5. **混合使用**：分层叠加，发挥各自优势

**选择建议**：
- **Canvas**：大量对象、游戏、实时数据、图像处理
- **SVG**：少量对象、图标、交互式图表、可访问性需求
- **混合**：Canvas 处理动态内容，SVG 处理静态/交互内容

在下一章，我们将学习如何导出 Canvas 内容为图片和 SVG 格式。
