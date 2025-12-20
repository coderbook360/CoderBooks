# 拖拽交互实现

拖拽是Canvas应用中最基础、最常用的交互方式。无论是图形编辑器、流程图工具还是游戏，拖拽都是核心功能。但实现流畅、准确的拖拽并不简单——你需要处理事件状态、坐标计算、边界约束等诸多细节。本章将系统讲解拖拽交互的实现原理和最佳实践。

## 拖拽的三个阶段

首先要问一个问题：**拖拽操作包含哪几个步骤？**

答案是三个阶段：

1. **开始（Start）**：鼠标按下，确定拖拽目标
2. **移动（Move）**：鼠标移动，更新目标位置
3. **结束（End）**：鼠标释放，完成拖拽

对应的事件：

```
mousedown/pointerdown → 开始拖拽
mousemove/pointermove → 拖拽中
mouseup/pointerup     → 结束拖拽
```

状态机模型：

```
空闲状态 ─[按下]→ 拖拽状态 ─[释放]→ 空闲状态
            ↓
          [移动]
            ↓
         更新位置
```

## 基础拖拽实现

现在我要问第二个问题：**如何实现一个矩形的拖拽？**

第一版代码（有问题）：

```javascript
const rect = { x: 100, y: 100, width: 80, height: 80 };
let isDragging = false;

canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  
  // 检测是否点击了矩形
  if (isPointInRect(point.x, point.y, rect)) {
    isDragging = true;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  
  // ❌ 问题：矩形会"跳"到鼠标位置
  rect.x = point.x;
  rect.y = point.y;
  
  redraw();
});

canvas.addEventListener('pointerup', () => {
  isDragging = false;
});

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}
```

这个实现有个严重问题：**矩形会突然跳到鼠标位置**（左上角与鼠标对齐），而不是从点击的位置拖拽。

### 正确实现：记录偏移量

思考一下，如何让矩形跟随鼠标，同时保持点击位置不变？

答案：**记录点击点相对于矩形的偏移量**

```javascript
const rect = { x: 100, y: 100, width: 80, height: 80 };
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  
  if (isPointInRect(point.x, point.y, rect)) {
    isDragging = true;
    
    // 记录点击点相对于矩形左上角的偏移
    dragOffsetX = point.x - rect.x;
    dragOffsetY = point.y - rect.y;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  
  // ✅ 正确：考虑偏移量
  rect.x = point.x - dragOffsetX;
  rect.y = point.y - dragOffsetY;
  
  redraw();
});

canvas.addEventListener('pointerup', () => {
  isDragging = false;
});
```

现在拖拽体验正确了！矩形会从点击位置开始跟随鼠标。

## 全局事件监听

现在我要问第三个问题：**如果鼠标移动很快，离开了Canvas区域，拖拽会失效吗？**

答案是会的！因为 `pointermove` 只在Canvas内触发。

解决方案：**在 `document` 上监听移动和释放事件**

```javascript
canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  
  if (isPointInRect(point.x, point.y, rect)) {
    isDragging = true;
    dragOffsetX = point.x - rect.x;
    dragOffsetY = point.y - rect.y;
    
    // 在document上监听移动和释放
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }
});

function onPointerMove(e) {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  rect.x = point.x - dragOffsetX;
  rect.y = point.y - dragOffsetY;
  
  redraw();
}

function onPointerUp(e) {
  isDragging = false;
  
  // 移除全局监听器
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
}
```

这样即使鼠标离开Canvas，拖拽也能继续。

## 拖拽约束

### 边界限制

现在我要问第四个问题：**如何让矩形不能拖出Canvas边界？**

答案：限制坐标范围

```javascript
function onPointerMove(e) {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  let newX = point.x - dragOffsetX;
  let newY = point.y - dragOffsetY;
  
  // 边界限制
  newX = Math.max(0, Math.min(newX, canvas.width - rect.width));
  newY = Math.max(0, Math.min(newY, canvas.height - rect.height));
  
  rect.x = newX;
  rect.y = newY;
  
  redraw();
}
```

### 网格吸附

如何让矩形拖拽时自动吸附到网格？

```javascript
const GRID_SIZE = 20;

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function onPointerMove(e) {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  let newX = point.x - dragOffsetX;
  let newY = point.y - dragOffsetY;
  
  // 网格吸附
  rect.x = snapToGrid(newX);
  rect.y = snapToGrid(newY);
  
  redraw();
}
```

### 方向限制

如何只允许水平或垂直拖拽？

```javascript
let dragMode = null;  // 'horizontal', 'vertical', null

canvas.addEventListener('pointerdown', (e) => {
  // ... 检测点击 ...
  
  dragMode = e.shiftKey ? 'horizontal' : 'vertical';  // Shift键控制方向
});

function onPointerMove(e) {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  
  if (dragMode === 'horizontal') {
    // 只改变X坐标
    rect.x = point.x - dragOffsetX;
  } else if (dragMode === 'vertical') {
    // 只改变Y坐标
    rect.y = point.y - dragOffsetY;
  } else {
    // 自由拖拽
    rect.x = point.x - dragOffsetX;
    rect.y = point.y - dragOffsetY;
  }
  
  redraw();
}
```

## 多对象拖拽

现在我要问第五个问题：**如何同时拖拽多个选中的对象？**

答案：记录所有对象的偏移量

```javascript
const objects = [
  { x: 100, y: 100, width: 80, height: 80, selected: false },
  { x: 200, y: 150, width: 60, height: 60, selected: true },
  { x: 300, y: 100, width: 100, height: 50, selected: true }
];

let isDragging = false;
let dragOffsets = [];  // 存储每个对象的偏移量

canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  
  // 查找点击的对象
  const clickedObject = objects.find(obj => isPointInRect(point.x, point.y, obj));
  
  if (clickedObject) {
    isDragging = true;
    
    // 记录所有选中对象的偏移量
    dragOffsets = objects
      .filter(obj => obj.selected)
      .map(obj => ({
        object: obj,
        offsetX: point.x - obj.x,
        offsetY: point.y - obj.y
      }));
  }
});

function onPointerMove(e) {
  if (!isDragging) return;
  
  const point = getCanvasPoint(canvas, e);
  
  // 更新所有选中对象的位置
  dragOffsets.forEach(({ object, offsetX, offsetY }) => {
    object.x = point.x - offsetX;
    object.y = point.y - offsetY;
  });
  
  redraw();
}
```

## 拖拽视觉反馈

### 光标样式

```javascript
canvas.addEventListener('pointermove', (e) => {
  if (isDragging) {
    canvas.style.cursor = 'grabbing';
    return;
  }
  
  const point = getCanvasPoint(canvas, e);
  const hoveredObject = objects.find(obj => isPointInRect(point.x, point.y, obj));
  
  canvas.style.cursor = hoveredObject ? 'grab' : 'default';
});
```

### 拖拽半透明效果

```javascript
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  objects.forEach(obj => {
    // 拖拽时半透明
    ctx.globalAlpha = (obj.selected && isDragging) ? 0.6 : 1.0;
    
    ctx.fillStyle = obj.selected ? '#3B82F6' : '#9CA3AF';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  });
  
  ctx.globalAlpha = 1.0;
}
```

## 完整拖拽管理器

综合所有功能，封装一个可复用的拖拽管理器：

```javascript
class DragManager {
  constructor(canvas, objects, options = {}) {
    this.canvas = canvas;
    this.objects = objects;
    this.options = {
      boundary: options.boundary !== false,
      grid: options.grid || null,
      ...options
    };
    
    this.isDragging = false;
    this.dragTargets = [];
    this.startPoint = null;
    
    this.setupListeners();
  }
  
  setupListeners() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
  }
  
  onPointerDown(e) {
    const point = getCanvasPoint(this.canvas, e);
    
    // 查找点击的对象
    const clicked = this.findObjectAt(point.x, point.y);
    if (!clicked) return;
    
    this.isDragging = true;
    this.startPoint = point;
    
    // 收集拖拽目标（所有选中对象）
    this.dragTargets = this.objects
      .filter(obj => obj.selected)
      .map(obj => ({
        object: obj,
        startX: obj.x,
        startY: obj.y,
        offsetX: point.x - obj.x,
        offsetY: point.y - obj.y
      }));
    
    // 全局监听
    document.addEventListener('pointermove', this.onPointerMove.bind(this));
    document.addEventListener('pointerup', this.onPointerUp.bind(this));
    
    this.canvas.style.cursor = 'grabbing';
  }
  
  onPointerMove(e) {
    if (!this.isDragging) return;
    
    const point = getCanvasPoint(this.canvas, e);
    
    this.dragTargets.forEach(({ object, offsetX, offsetY }) => {
      let newX = point.x - offsetX;
      let newY = point.y - offsetY;
      
      // 应用约束
      if (this.options.boundary) {
        newX = Math.max(0, Math.min(newX, this.canvas.width - object.width));
        newY = Math.max(0, Math.min(newY, this.canvas.height - object.height));
      }
      
      if (this.options.grid) {
        newX = this.snapToGrid(newX, this.options.grid);
        newY = this.snapToGrid(newY, this.options.grid);
      }
      
      object.x = newX;
      object.y = newY;
    });
    
    this.redraw();
  }
  
  onPointerUp() {
    this.isDragging = false;
    this.dragTargets = [];
    
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    
    this.canvas.style.cursor = 'default';
  }
  
  findObjectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      if (isPointInRect(x, y, this.objects[i])) {
        return this.objects[i];
      }
    }
    return null;
  }
  
  snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
  }
  
  redraw() {
    // 触发重绘回调
    if (this.options.onRedraw) {
      this.options.onRedraw();
    }
  }
}

// 使用
const dragManager = new DragManager(canvas, objects, {
  boundary: true,
  grid: 20,
  onRedraw: () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(obj => {
      ctx.fillStyle = obj.selected ? '#3B82F6' : '#9CA3AF';
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    });
  }
});
```

## 本章小结

拖拽交互的核心要点：

- **三阶段**：开始（pointerdown）、移动（pointermove）、结束（pointerup）
- **偏移量**：记录点击点相对对象的偏移，避免"跳动"
- **全局监听**：在document上监听move/up，防止鼠标离开Canvas
- **拖拽约束**：
  - 边界限制：Math.max/Math.min限制范围
  - 网格吸附：Math.round(value / grid) * grid
  - 方向限制：只更新X或Y坐标
- **多对象**：记录所有选中对象的偏移量数组
- **视觉反馈**：光标样式、半透明、拖拽预览

关键技巧：
- 用状态机管理拖拽状态
- 全局事件监听配合本地坐标转换
- 封装DragManager复用逻辑
- 适时移除事件监听器避免内存泄漏

下一章，我们将学习缩放与平移交互，实现类似地图的交互体验。
