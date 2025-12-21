# 高DPI屏幕适配

当你在 MacBook Pro 的 Retina 屏幕上打开一个 Canvas 应用，精心绘制的图形却显得模糊不清，就像隔着一层毛玻璃。但同样的代码在普通屏幕上显示完美。问题出在哪里？

答案是 **设备像素比**（Device Pixel Ratio）。这是 Web 开发者在高分辨率屏幕时代必须面对的核心问题。本章将深入探讨高 DPI 适配的原理、完整解决方案以及实际开发中的常见陷阱。

---

## 1. 问题根源：CSS像素与物理像素

### 1.1 什么是设备像素比？

**设备像素比（DPR）** 是物理像素与 CSS 像素的比值：

```
DPR = 物理像素 / CSS像素
```

**不同设备的 DPR**：
- 普通显示器：`devicePixelRatio = 1`
- Retina 显示器：`devicePixelRatio = 2` 或 `3`
- 高端 Windows 笔记本：`devicePixelRatio = 1.25`、`1.5`、`2`

**为什么会出现 DPR？**

早期的显示器，1个 CSS 像素对应1个物理像素。但随着屏幕分辨率的提升（如 Retina 屏幕），相同尺寸的屏幕塞入了更多物理像素。如果不做调整，网页上的文字和图标会变得极其微小，无法阅读。

因此，操作系统和浏览器引入了 **CSS 像素**（逻辑像素）的概念：
- **CSS 像素**：开发者使用的抽象单位，保持固定的视觉大小
- **物理像素**：屏幕实际的硬件像素点

在 Retina 屏幕上，`devicePixelRatio = 2` 意味着：
- CSS 的 1px = 物理像素的 2×2 = 4个像素点
- 浏览器自动对文字、图片、DOM 元素进行高分辨率渲染

### 1.2 Canvas 的模糊问题

**为什么 Canvas 会模糊？**

Canvas 的 `width` 和 `height` 属性定义的是 **位图的分辨率**（内部像素数），而 CSS 的 `width` 和 `height` 定义的是 **显示尺寸**（逻辑像素）。

```html
<canvas id="canvas" width="400" height="300"></canvas>
```

```css
canvas {
  width: 400px;
  height: 300px;
}
```

在 Retina 屏幕上（`DPR = 2`）：
- Canvas 内部分辨率：400 × 300 像素
- 实际显示区域：400 × 300 CSS像素 = 800 × 600 物理像素

**问题**：400×300 的位图被拉伸到 800×600 的物理像素区域，导致 **模糊**（类似放大低分辨率图片）。

**视觉对比**：

| 场景 | Canvas 内部分辨率 | 显示尺寸 | 物理像素 | 结果 |
|------|------------------|---------|---------|------|
| 未适配 | 400×300 | 400×300 CSS px | 800×600 物理px | 模糊 |
| 已适配 | 800×600 | 400×300 CSS px | 800×600 物理px | 清晰 |

---

## 2. 完整的解决方案

### 2.1 基础适配方案

核心思路：**Canvas 内部分辨率 = CSS 尺寸 × DPR**

```javascript
function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  
  // 1. Canvas 内部分辨率（匹配物理像素）
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // 2. CSS 显示尺寸（逻辑尺寸）
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  // 3. 缩放绘图上下文（关键！）
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  return ctx;
}

// 使用
const ctx = setupCanvas(canvas, 800, 600);

// 现在使用逻辑坐标绘制（无需考虑 DPR）
ctx.fillRect(0, 0, 100, 100);  // 清晰的矩形
```

**为什么需要 `ctx.scale(dpr, dpr)`？**

如果不缩放上下文，你需要在所有绘制代码中乘以 DPR：

```javascript
// 不缩放上下文（不推荐）
canvas.width = 800 * dpr;
canvas.height = 600 * dpr;
ctx.fillRect(0 * dpr, 0 * dpr, 100 * dpr, 100 * dpr); // 繁琐且易错
```

缩放上下文后，绘制代码使用逻辑坐标，更加直观：

```javascript
// 缩放上下文（推荐）
ctx.scale(dpr, dpr);
ctx.fillRect(0, 0, 100, 100); // 简洁清晰
```

### 2.2 响应 DPR 动态变化

**场景**：用户在运行时改变系统缩放比例，或将窗口拖拽到不同 DPR 的显示器。

```javascript
class CanvasManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentDPR = window.devicePixelRatio || 1;
    
    // 初始化
    this.resize();
    
    // 监听 DPR 变化（Chrome 87+）
    this.setupDPRListener();
  }
  
  setupDPRListener() {
    // 使用 matchMedia 监听 DPR 变化
    const mediaQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    
    mediaQuery.addEventListener('change', () => {
      this.handleDPRChange();
    });
  }
  
  handleDPRChange() {
    const newDPR = window.devicePixelRatio || 1;
    
    if (newDPR !== this.currentDPR) {
      console.log(`DPR changed: ${this.currentDPR} → ${newDPR}`);
      this.currentDPR = newDPR;
      this.resize();
    }
  }
  
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.currentDPR;
    
    // 更新 Canvas 分辨率
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // 重置上下文（getContext 后状态会重置）
    this.ctx.scale(dpr, dpr);
    
    // 通知应用重新渲染
    this.onResize?.();
  }
}

// 使用
const manager = new CanvasManager(canvas);
manager.onResize = () => {
  editor.requestRender();
};
```

### 2.3 响应窗口尺寸变化

```javascript
class ResponsiveCanvas {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.dpr = window.devicePixelRatio || 1;
    
    this.resize();
    
    // 监听窗口变化
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    
    // 获取容器尺寸
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // 更新 Canvas
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // 重新缩放上下文
    const ctx = this.canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    return ctx;
  }
}
```

---

## 3. 浏览器兼容性处理

### 3.1 不同浏览器的 DPR 获取

```javascript
function getDevicePixelRatio() {
  // 标准方式
  if (window.devicePixelRatio !== undefined) {
    return window.devicePixelRatio;
  }
  
  // 旧版 IE（较少见）
  if (window.screen.deviceXDPI && window.screen.logicalXDPI) {
    return window.screen.deviceXDPI / window.screen.logicalXDPI;
  }
  
  // 默认值
  return 1;
}
```

### 3.2 处理非整数 DPR

某些 Windows 设备的 DPR 为 1.25、1.5 等非整数值：

```javascript
function setupCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  
  // 对于非整数 DPR，可以选择向上取整
  const adjustedDPR = Math.ceil(dpr);
  
  canvas.width = width * adjustedDPR;
  canvas.height = height * adjustedDPR;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.scale(adjustedDPR, adjustedDPR);
  
  return ctx;
}
```

**注意**：向上取整会略微增加内存和性能开销，但能确保在非整数 DPR 设备上也清晰。

---

## 4. 性能影响分析

### 4.1 内存开销

**内存占用 = width × height × 4字节（RGBA）**

| DPR | Canvas 尺寸 | 内存占用 |
|-----|------------|---------|
| 1 | 800×600 | 1.83 MB |
| 2 | 1600×1200 | 7.32 MB |
| 3 | 2400×1800 | 16.47 MB |

**优化建议**：
- 对于离屏 Canvas 缓存，可以考虑使用较低的 DPR（如固定为1）
- 动态调整：根据设备性能决定是否启用完整 DPR 适配

### 4.2 渲染性能

高 DPR 导致像素数量成倍增加，影响：
- `getImageData` / `putImageData` 的数据量
- 绘制操作的计算量
- GPU 纹理上传的带宽

**性能对比**（绘制1000个圆形）：

| DPR | 帧率 |
|-----|-----|
| 1 | 60 FPS |
| 2 | 45 FPS |
| 3 | 30 FPS |

**优化策略**：
```javascript
function adaptiveSetupCanvas(canvas, width, height) {
  const maxDPR = 2; // 限制最大 DPR
  const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
  
  // ... 其余代码
}
```

---

## 5. 常见陷阱与最佳实践

### 5.1 陷阱1：忘记重新缩放上下文

```javascript
// ❌ 错误：修改 canvas.width 后上下文状态会重置
canvas.width = 800 * dpr;
canvas.height = 600 * dpr;
// ctx.scale(dpr, dpr) 的效果已经丢失！

// ✅ 正确：每次修改尺寸后重新缩放
canvas.width = 800 * dpr;
canvas.height = 600 * dpr;
ctx.scale(dpr, dpr); // 必须重新设置
```

### 5.2 陷阱2：图片加载后的适配

```javascript
// ✅ 正确：图片也需要考虑 DPR
const img = new Image();
img.src = 'icon.png';
img.onload = () => {
  const dpr = window.devicePixelRatio || 1;
  // 使用逻辑尺寸绘制（已缩放上下文）
  ctx.drawImage(img, 0, 0, 100, 100);
};
```

### 5.3 陷阱3：事件坐标转换

```javascript
// ✅ 正确：事件坐标需要考虑 DPR
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  // CSS 坐标（逻辑坐标）
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 如果需要 Canvas 内部坐标（像素坐标）
  const canvasX = x * dpr;
  const canvasY = y * dpr;
  
  // 但如果上下文已经 scale(dpr, dpr)，直接使用逻辑坐标即可
  checkHit(x, y);
});
```

### 5.4 最佳实践总结

1. **封装初始化逻辑**：避免重复代码
2. **监听 DPR 变化**：支持跨显示器拖拽
3. **限制最大 DPR**：在低端设备上保证性能
4. **统一坐标系统**：始终使用逻辑坐标编写绘制代码
5. **测试多种设备**：确保在 1x、1.5x、2x、3x 设备上都正常

---

## 6. 生产级完整方案

```javascript
class CanvasHiDPI {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.maxDPR = options.maxDPR || Infinity;
    this.onResize = options.onResize || (() => {});
    
    this.setup();
    this.attachListeners();
  }
  
  setup() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.getDPR();
    
    // 设置内部分辨率
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // 设置显示尺寸
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // 缩放上下文
    this.ctx.scale(dpr, dpr);
    
    // 存储逻辑尺寸
    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;
  }
  
  getDPR() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, this.maxDPR);
  }
  
  attachListeners() {
    // 监听窗口变化
    const resizeObserver = new ResizeObserver(() => {
      this.setup();
      this.onResize();
    });
    resizeObserver.observe(this.canvas.parentElement);
    
    // 监听 DPR 变化
    this.watchDPR();
  }
  
  watchDPR() {
    let currentDPR = this.getDPR();
    
    const check = () => {
      const newDPR = this.getDPR();
      if (newDPR !== currentDPR) {
        currentDPR = newDPR;
        this.setup();
        this.onResize();
      }
      requestAnimationFrame(check);
    };
    
    check();
  }
  
  // 获取逻辑坐标（用于事件处理）
  getLogicalCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
}

// 使用
const hiDPI = new CanvasHiDPI(canvas, {
  maxDPR: 2,
  onResize: () => {
    editor.requestRender();
  }
});

canvas.addEventListener('click', (e) => {
  const coords = hiDPI.getLogicalCoords(e.clientX, e.clientY);
  console.log('Logical coords:', coords);
});
```

---

## 本章小结

高 DPI 适配的核心要点：

1. **理解问题**：CSS 像素与物理像素的不匹配导致模糊
2. **解决方案**：Canvas 内部分辨率 = CSS 尺寸 × DPR + 缩放上下文
3. **动态适配**：监听 DPR 和窗口尺寸变化
4. **性能权衡**：高 DPR 带来清晰度提升，但增加内存和渲染开销
5. **最佳实践**：封装初始化逻辑、统一坐标系统、限制最大 DPR

在下一章，我们将探讨如何系统性地分析和排查 Canvas 应用的性能问题。
