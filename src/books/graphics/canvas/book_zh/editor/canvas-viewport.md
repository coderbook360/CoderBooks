# 画布管理与视口控制

你正在制作一个设计工具，画布很大（10000x10000），但屏幕只能显示一小部分。如何让用户平移和缩放画布，就像使用 Figma 或 Photoshop 一样？

这需要一个强大的 **Canvas 管理系统**。

---

##1. 画布 vs 视口

- **画布（Canvas）**：整个绘图区域，可能非常大
- **视口（Viewport）**：屏幕上可见的部分

类比：画布是一张巨大的纸，视口是一个窗口，你通过窗口看纸的一部分。

```
┌─────────────────────────────┐
│                             │
│   ┌─────────┐               │  ← 画布（10000x10000）
│   │         │               │
│   │  视口   │               │
│   │         │               │
│   └─────────┘               │
│                             │
└─────────────────────────────┘
```

---

## 2. Canvas 管理类设计

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    
    // 创建 Canvas 元素
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    // 画布尺寸
    this.width = options.width || this.container.clientWidth;
    this.height = options.height || this.container.clientHeight;
    this.setCanvasSize(this.width, this.height);
    
    // 视口变换
    this.viewportX = 0;       // 视口 X 偏移
    this.viewportY = 0;       // 视口 Y 偏移
    this.viewportZoom = 1;    // 缩放级别
    
    // 对象集合
    this.objects = [];
    
    // 渲染状态
    this._dirty = false;
    this._renderRequested = false;
    
    this.initEvents();
  }
  
  setCanvasSize(width, height) {
    this.width = width;
    this.height = height;
    
    // 处理高 DPI 屏幕
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);
    
    this.requestRender();
  }
  
  requestRender() {
    if (this._renderRequested) return;
    this._renderRequested = true;
    
    requestAnimationFrame(() => {
      this.render();
      this._renderRequested = false;
    });
  }
  
  render() {
    this.ctx.save();
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 应用视口变换
    this.ctx.translate(this.viewportX, this.viewportY);
    this.ctx.scale(this.viewportZoom, this.viewportZoom);
    
    // 绘制所有对象
    this.objects.forEach(obj => {
      if (obj.visible) {
        obj.draw(this.ctx);
      }
    });
    
    this.ctx.restore();
  }
  
  initEvents() {
    // 下一章实现
  }
}
```

---

## 3. 视口平移（Pan）

按住空格键拖动画布：

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ... 其他代码 ...
    
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    
    this.initPanEvents();
  }
  
  initPanEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.shiftKey) {  // 中键或 Shift
        this.startPan(e.clientX, e.clientY);
        e.preventDefault();
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.updatePan(e.clientX, e.clientY);
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.endPan();
    });
  }
  
  startPan(x, y) {
    this.isPanning = true;
    this.panStart.x = x - this.viewportX;
    this.panStart.y = y - this.viewportY;
    this.canvas.style.cursor = 'grabbing';
  }
  
  updatePan(x, y) {
    this.viewportX = x - this.panStart.x;
    this.viewportY = y - this.panStart.y;
    this.requestRender();
  }
  
  endPan() {
    this.isPanning = false;
    this.canvas.style.cursor = 'default';
  }
}
```

---

## 4. 视口缩放（Zoom）

滚轮缩放画布：

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ... 其他代码 ...
    
    this.minZoom = 0.1;
    this.maxZoom = 10;
    
    this.initZoomEvents();
  }
  
  initZoomEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;  // 缩小或放大
      const newZoom = this.viewportZoom * delta;
      
      // 限制缩放范围
      if (newZoom < this.minZoom || newZoom > this.maxZoom) return;
      
      // 以鼠标位置为中心缩放
      const mouseX = e.clientX - this.canvas.offsetLeft;
      const mouseY = e.clientY - this.canvas.offsetTop;
      
      this.zoomAt(mouseX, mouseY, newZoom);
    });
  }
  
  zoomAt(x, y, newZoom) {
    // 计算缩放前鼠标在画布上的坐标
    const worldX = (x - this.viewportX) / this.viewportZoom;
    const worldY = (y - this.viewportY) / this.viewportZoom;
    
    // 更新缩放
    this.viewportZoom = newZoom;
    
    // 调整平移，使鼠标位置保持不变
    this.viewportX = x - worldX * this.viewportZoom;
    this.viewportY = y - worldY * this.viewportZoom;
    
    this.requestRender();
  }
  
  // 便捷方法
  zoomIn() {
    this.zoomAt(this.width / 2, this.height / 2, this.viewportZoom * 1.2);
  }
  
  zoomOut() {
    this.zoomAt(this.width / 2, this.height / 2, this.viewportZoom / 1.2);
  }
  
  resetZoom() {
    this.viewportZoom = 1;
    this.viewportX = 0;
    this.viewportY = 0;
    this.requestRender();
  }
}
```

---

## 5. 坐标转换

视口变换后，鼠标的屏幕坐标需要转换为画布坐标：

```javascript
class CanvasEditor {
  // ...
  
  // 屏幕坐标 → 画布坐标
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    
    // 减去视口偏移并除以缩放
    const canvasX = (x - this.viewportX) / this.viewportZoom;
    const canvasY = (y - this.viewportY) / this.viewportZoom;
    
    return { x: canvasX, y: canvasY };
  }
  
  // 画布坐标 → 屏幕坐标
  canvasToScreen(canvasX, canvasY) {
    const x = canvasX * this.viewportZoom + this.viewportX;
    const y = canvasY * this.viewportZoom + this.viewportY;
    return { x, y };
  }
}

// 使用
canvas.addEventListener('click', (e) => {
  const { x, y } = editor.screenToCanvas(e.clientX, e.clientY);
  console.log('点击了画布的', x, y);
});
```

---

## 6. 对象管理集成

```javascript
class CanvasEditor {
  // ...
  
  add(object) {
    this.objects.push(object);
    object.canvas = this;
    this.requestRender();
  }
  
  remove(object) {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
      object.canvas = null;
      this.requestRender();
    }
  }
  
  clear() {
    this.objects = [];
    this.requestRender();
  }
  
  findObjectAtPoint(x, y) {
    // 从后往前查找（上层优先）
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.visible && obj.containsPoint(x, y)) {
        return obj;
      }
    }
    return null;
  }
}
```

---

## 7. 完整使用示例

```javascript
const editor = new CanvasEditor(document.getElementById('container'), {
  width: 800,
  height: 600
});

// 添加对象
const rect1 = new Rectangle({
  left: 100,
  top: 100,
  width: 200,
  height: 150,
  fill: 'red'
});

const rect2 = new Rectangle({
  left: 400,
  top: 200,
  width: 150,
  height: 100,
  fill: 'blue'
});

editor.add(rect1);
editor.add(rect2);

// 缩放按钮
document.getElementById('zoom-in').addEventListener('click', () => {
  editor.zoomIn();
});

document.getElementById('zoom-out').addEventListener('click', () => {
  editor.zoomOut();
});

document.getElementById('reset').addEventListener('click', () => {
  editor.resetZoom();
});

// 点击选择对象
editor.canvas.addEventListener('click', (e) => {
  const { x, y } = editor.screenToCanvas(e.clientX, e.clientY);
  const obj = editor.findObjectAtPoint(x, y);
  if (obj) {
    console.log('选中了:', obj.type);
  }
});
```

---

## 8. 高DPI屏幕适配

```javascript
setCanvasSize(width, height) {
  this.width = width;
  this.height = height;
  
  // 获取设备像素比
  const dpr = window.devicePixelRatio || 1;
  
  // Canvas 内部分辨率
  this.canvas.width = width * dpr;
  this.canvas.height = height * dpr;
  
  // CSS 显示尺寸
  this.canvas.style.width = width + 'px';
  this.canvas.style.height = height + 'px';
  
  // 缩放上下文
  this.ctx.scale(dpr, dpr);
  
  this.requestRender();
}
```

在 Retina 屏幕上，`devicePixelRatio` 为 2，这样画布会更清晰。

---

## 9. 性能优化

### 脏标记

只在视口变换或对象变化时重绘：

```javascript
requestRender() {
  if (this._renderRequested) return;  // 避免重复请求
  this._renderRequested = true;
  
  requestAnimationFrame(() => {
    this.render();
    this._renderRequested = false;
  });
}
```

### 视口裁剪

只绘制视口内的对象：

```javascript
render() {
  this.ctx.save();
  this.ctx.clearRect(0, 0, this.width, this.height);
  
  this.ctx.translate(this.viewportX, this.viewportY);
  this.ctx.scale(this.viewportZoom, this.viewportZoom);
  
  // 计算可见区域
  const visibleLeft = -this.viewportX / this.viewportZoom;
  const visibleTop = -this.viewportY / this.viewportZoom;
  const visibleRight = visibleLeft + this.width / this.viewportZoom;
  const visibleBottom = visibleTop + this.height / this.viewportZoom;
  
  // 只绘制可见对象
  this.objects.forEach(obj => {
    if (obj.visible && this.isInViewport(obj, visibleLeft, visibleTop, visibleRight, visibleBottom)) {
      obj.draw(this.ctx);
    }
  });
  
  this.ctx.restore();
}

isInViewport(obj, left, top, right, bottom) {
  return !(obj.left + obj.width < left ||
           obj.left > right ||
           obj.top + obj.height < top ||
           obj.top > bottom);
}
```

---

## 本章小结

Canvas 管理系统是图形编辑器的核心：
- **视口变换**：平移和缩放改变可见区域
- **坐标转换**：屏幕坐标与画布坐标的转换
- **渲染循环**：高效的 requestAnimationFrame 渲染
- **高DPI适配**：清晰显示在 Retina 屏幕上

下一章，我们将实现对象的选择机制。
