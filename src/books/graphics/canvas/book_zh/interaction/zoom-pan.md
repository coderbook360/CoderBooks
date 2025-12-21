# 缩放与平移交互

首先要问一个问题：如何让用户像使用 Google Maps 那样，自由地浏览一个大型 Canvas 画布？

答案是：实现视口（Viewport）控制。就像相机的取景框一样，我们通过移动相机（平移）和调整焦距（缩放），来观察世界的不同部分和不同细节。

---

## 1. 视口概念

### 什么是视口？

视口是"可见区域"的概念。想象一下：
- **画布内容**：一个巨大的无限平面，上面有各种图形
- **Canvas元素**：浏览器中固定大小的窗口
- **视口**：这个窗口当前"看到"的那部分内容

```javascript
// 视口的状态由三个参数决定
const viewport = {
  offsetX: 0,    // 视口左上角的 X 坐标（画布坐标系）
  offsetY: 0,    // 视口左上角的 Y 坐标（画布坐标系）
  scale: 1       // 缩放比例（1 = 原始大小）
};
```

### 视口变换

现在我要问第二个问题：如何把画布内容"投影"到屏幕上？

答案是：应用变换矩阵。屏幕坐标 = 画布坐标 × scale + offset。

```javascript
function applyViewportTransform(ctx, viewport) {
  // setTransform(a, b, c, d, e, f) 设置变换矩阵
  // a, d: 缩放
  // e, f: 平移
  ctx.setTransform(
    viewport.scale, 0,
    0, viewport.scale,
    viewport.offsetX, viewport.offsetY
  );
}
```

---

## 2. 平移实现

### 鼠标拖拽平移

第三个问题来了：如何用鼠标拖拽来平移视口？

思路很简单——记录鼠标移动的增量，累加到 offset 上。

```javascript
class PanController {
  constructor(canvas) {
    this.canvas = canvas;
    this.isPanning = false;
    this.lastX = 0;
    this.lastY = 0;
    
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.setupEvents();
  }
  
  setupEvents() {
    // 鼠标按下开始平移（中键或 Shift+左键）
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.isPanning = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.canvas.style.cursor = 'grab';
        e.preventDefault();
      }
    });
    
    // 鼠标移动时更新 offset
    document.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      
      this.offsetX += dx;
      this.offsetY += dy;
      
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      
      this.render();
    });
    
    // 鼠标抬起停止平移
    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = 'default';
      }
    });
  }
  
  render() {
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);  // 重置变换
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用视口变换
    ctx.setTransform(1, 0, 0, 1, this.offsetX, this.offsetY);
    
    // 绘制内容
    this.drawContent(ctx);
  }
  
  drawContent(ctx) {
    // 示例：绘制网格
    ctx.strokeStyle = '#ddd';
    for (let x = -1000; x <= 1000; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, -1000);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    for (let y = -1000; y <= 1000; y += 50) {
      ctx.beginPath();
      ctx.moveTo(-1000, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  }
}
```

关键点：
1. **监听 document**：鼠标移动和抬起事件绑定在 document 上，避免鼠标移出 Canvas 时失去控制
2. **使用增量**：`dx = e.clientX - this.lastX`，而不是直接使用 clientX，避免画面跳跃
3. **重置变换**：每次渲染前先 `setTransform(1, 0, 0, 1, 0, 0)` 重置，再应用新的变换

---

## 3. 缩放实现

### 滚轮缩放

现在处理缩放。第四个问题：如何响应滚轮事件改变缩放比例？

```javascript
class ZoomController extends PanController {
  constructor(canvas) {
    super(canvas);
    this.scale = 1;
    this.minScale = 0.1;
    this.maxScale = 10;
    
    this.setupZoom();
  }
  
  setupZoom() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // 滚轮向下缩小，向上放大
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = this.scale * delta;
      
      // 限制缩放范围
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
      
      this.render();
    }, { passive: false });  // passive: false 允许 preventDefault
  }
  
  render() {
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用缩放和平移
    ctx.setTransform(
      this.scale, 0,
      0, this.scale,
      this.offsetX, this.offsetY
    );
    
    this.drawContent(ctx);
  }
}
```

这个实现有个问题——缩放是以画布左上角为中心的，不符合直觉。我们期望的是**以鼠标位置为中心**缩放。

---

## 4. 中心点缩放

### 问题分析

想象这样的场景：你在地图上看着某个建筑物，然后滚轮放大。你期望这个建筑物"原地"放大，而不是飞到屏幕边缘。

这需要调整 offset，使得鼠标下方的那个点在缩放前后的屏幕位置不变。

### 数学推导

设鼠标位置为 `(mx, my)`（画布坐标）。缩放前后，这个点的屏幕坐标应该相等：

```
缩放前屏幕坐标：sx = mx * scale + offsetX
缩放后屏幕坐标：sx' = mx * newScale + newOffsetX

要求：sx = sx'
即：mx * scale + offsetX = mx * newScale + newOffsetX
解得：newOffsetX = offsetX + mx * (scale - newScale)
```

同理，`newOffsetY = offsetY + my * (scale - newScale)`。

### 代码实现

```javascript
class ViewportController extends ZoomController {
  setupZoom() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // 获取鼠标位置（画布坐标）
      const mousePos = this.screenToCanvas(e.clientX, e.clientY);
      
      // 计算新缩放比例
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, 
                       Math.min(this.maxScale, this.scale * delta));
      
      if (newScale === this.scale) return;  // 达到极限，不做处理
      
      // 调整 offset 使鼠标位置不变
      this.offsetX = this.offsetX + mousePos.x * (this.scale - newScale);
      this.offsetY = this.offsetY + mousePos.y * (this.scale - newScale);
      
      this.scale = newScale;
      this.render();
    }, { passive: false });
  }
  
  // 屏幕坐标转画布坐标
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;  // Canvas 内的 X
    const y = screenY - rect.top;   // Canvas 内的 Y
    
    // 逆变换：画布坐标 = (屏幕坐标 - offset) / scale
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }
  
  // 画布坐标转屏幕坐标
  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.scale + this.offsetX,
      y: canvasY * this.scale + this.offsetY
    };
  }
}
```

有没有很神奇的感觉？通过一个简单的公式，就实现了自然的缩放体验。

---

## 5. 触摸手势

移动端的双指缩放也是类似原理。

```javascript
class TouchZoomHandler {
  constructor(viewport) {
    this.viewport = viewport;
    this.lastDistance = 0;
    this.lastCenter = null;
    
    this.setupTouch();
  }
  
  setupTouch() {
    const canvas = this.viewport.canvas;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.lastDistance = this.getDistance(e.touches);
        this.lastCenter = this.getCenter(e.touches);
        e.preventDefault();
      }
    });
    
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const distance = this.getDistance(e.touches);
        const center = this.getCenter(e.touches);
        
        // 计算缩放因子
        const scaleFactor = distance / this.lastDistance;
        
        // 应用缩放（以双指中心为中心）
        const centerCanvas = this.viewport.screenToCanvas(center.x, center.y);
        const newScale = this.viewport.scale * scaleFactor;
        
        this.viewport.scale = Math.max(this.viewport.minScale,
                              Math.min(this.viewport.maxScale, newScale));
        
        // 调整 offset
        this.viewport.offsetX += centerCanvas.x * (this.lastDistance / distance - 1) * this.viewport.scale;
        this.viewport.offsetY += centerCanvas.y * (this.lastDistance / distance - 1) * this.viewport.scale;
        
        // 双指平移
        const dx = center.x - this.lastCenter.x;
        const dy = center.y - this.lastCenter.y;
        this.viewport.offsetX += dx;
        this.viewport.offsetY += dy;
        
        this.lastDistance = distance;
        this.lastCenter = center;
        
        this.viewport.render();
        e.preventDefault();
      }
    });
  }
  
  getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getCenter(touches) {
    const rect = this.viewport.canvas.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top
    };
  }
}
```

---

## 6. 完整视口管理类

把所有功能整合到一个类中：

```javascript
class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 视口状态
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    
    // 限制
    this.minScale = 0.1;
    this.maxScale = 10;
    
    // 平移状态
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    
    this.setupEvents();
  }
  
  setupEvents() {
    // 平移（中键或 Shift + 左键）
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grab';
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.offsetX += dx;
        this.offsetY += dy;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.render();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = 'default';
      }
    });
    
    // 缩放
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const mousePos = this.screenToCanvas(e.clientX, e.clientY);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale,
                       Math.min(this.maxScale, this.scale * delta));
      
      if (newScale !== this.scale) {
        this.offsetX += mousePos.x * (this.scale - newScale);
        this.offsetY += mousePos.y * (this.scale - newScale);
        this.scale = newScale;
        this.render();
      }
    }, { passive: false });
  }
  
  // 坐标转换
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }
  
  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.scale + this.offsetX,
      y: canvasY * this.scale + this.offsetY
    };
  }
  
  // 应用变换
  applyTransform() {
    this.ctx.setTransform(
      this.scale, 0,
      0, this.scale,
      this.offsetX, this.offsetY
    );
  }
  
  // 重置视口
  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.render();
  }
  
  // 适应内容（类似 "缩放以适应"）
  fitContent(bounds) {
    const { x, y, width, height } = bounds;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // 计算最佳缩放比例（留 10% 边距）
    const scaleX = canvasWidth / width;
    const scaleY = canvasHeight / height;
    this.scale = Math.min(scaleX, scaleY) * 0.9;
    
    // 居中
    this.offsetX = (canvasWidth - width * this.scale) / 2 - x * this.scale;
    this.offsetY = (canvasHeight - height * this.scale) / 2 - y * this.scale;
    
    this.render();
  }
  
  // 状态序列化
  getState() {
    return {
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      scale: this.scale
    };
  }
  
  setState(state) {
    this.offsetX = state.offsetX;
    this.offsetY = state.offsetY;
    this.scale = state.scale;
    this.render();
  }
  
  render() {
    // 清除画布
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 应用视口变换
    this.applyTransform();
    
    // 绘制内容（由子类或外部实现）
    this.drawContent();
  }
  
  drawContent() {
    // 默认实现：绘制网格
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1 / this.scale;  // 保持线宽不随缩放变化
    
    const step = 50;
    for (let x = -2000; x <= 2000; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, -2000);
      this.ctx.lineTo(x, 2000);
      this.ctx.stroke();
    }
    for (let y = -2000; y <= 2000; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(-2000, y);
      this.ctx.lineTo(2000, y);
      this.ctx.stroke();
    }
    
    // 绘制坐标轴
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2 / this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(-2000, 0);
    this.ctx.lineTo(2000, 0);
    this.ctx.moveTo(0, -2000);
    this.ctx.lineTo(0, 2000);
    this.ctx.stroke();
  }
}

// 使用示例
const canvas = document.getElementById('canvas');
const viewport = new Viewport(canvas);

// 自定义绘制内容
viewport.drawContent = function() {
  // 绘制一些形状
  this.ctx.fillStyle = 'blue';
  this.ctx.fillRect(100, 100, 200, 150);
  
  this.ctx.fillStyle = 'red';
  this.ctx.beginPath();
  this.ctx.arc(400, 300, 80, 0, Math.PI * 2);
  this.ctx.fill();
};

viewport.render();

// 添加工具栏按钮
document.getElementById('reset').addEventListener('click', () => {
  viewport.reset();
});

document.getElementById('fit').addEventListener('click', () => {
  viewport.fitContent({ x: 0, y: 0, width: 800, height: 600 });
});
```

---

## 7. 边界约束

在实际应用中，可能需要限制视口的移动范围，避免用户"迷失"在无限画布中。

```javascript
class BoundedViewport extends Viewport {
  constructor(canvas, contentBounds) {
    super(canvas);
    this.contentBounds = contentBounds;  // { x, y, width, height }
  }
  
  clampOffset() {
    // 内容在屏幕上的边界
    const left = this.contentBounds.x * this.scale + this.offsetX;
    const top = this.contentBounds.y * this.scale + this.offsetY;
    const right = left + this.contentBounds.width * this.scale;
    const bottom = top + this.contentBounds.height * this.scale;
    
    // 防止内容完全移出屏幕
    if (right < 0) this.offsetX = -this.contentBounds.width * this.scale - this.contentBounds.x * this.scale;
    if (bottom < 0) this.offsetY = -this.contentBounds.height * this.scale - this.contentBounds.y * this.scale;
    if (left > this.canvas.width) this.offsetX = this.canvas.width - this.contentBounds.x * this.scale;
    if (top > this.canvas.height) this.offsetY = this.canvas.height - this.contentBounds.y * this.scale;
  }
  
  render() {
    this.clampOffset();
    super.render();
  }
}
```

但是这种约束要谨慎使用，过度限制会让用户感到不自然。大多数应用允许用户自由移动视口。

---

## 本章小结

视口控制是图形编辑器的基础能力：
- **平移**：通过修改 offsetX/Y，改变可见区域的位置
- **缩放**：通过修改 scale，改变可见区域的大小
- **中心点缩放**：关键公式 `newOffset = offset + point * (oldScale - newScale)`，使缩放中心保持不变
- **坐标转换**：屏幕坐标 ⇄ 画布坐标的互相转换，是所有交互的基础

这些技术在第38章"画布管理与视口控制"中还会结合对象模型进一步深化。现在，你已经能够构建一个可以自由浏览的无限画布应用了。
