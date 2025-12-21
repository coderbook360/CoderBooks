# 分层 Canvas 基础

首先要问一个问题：图形编辑器中，背景网格几乎不变，但用户拖拽的对象不断移动。有没有办法只重绘移动的对象，而不重绘背景？

答案是：**分层 Canvas**。就像动画电影使用透明赛璐珞片，把不同的内容画在不同的层上，只需要重新绘制变化的层。

---

## 1. 为什么分层

### 单 Canvas 的性能瓶颈

常见场景的问题：

```javascript
// 每帧都要重绘所有内容
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawGrid();          // 背景网格（永远不变）
  drawObjects();       // 用户对象（少数在移动）
  drawSelectionBox();  // 选择框（经常变化）
  drawControls();      // 控制点（经常变化）
}
```

现在我要问第二个问题：这种渲染有什么问题？

答案是浪费——**背景网格每帧都在重绘，但它根本不变化**。

### 分层的优化思路

如果我们有三个 Canvas，堆叠在一起：
- **背景层**：画一次网格，之后不再重绘
- **内容层**：只在对象移动时重绘
- **UI 层**：只在交互时重绘（选择框、控制点）

这样，大部分时间只需要重绘一到两个层，性能提升显著。

---

## 2. 分层策略设计

### 静态 vs 动态

分层的核心是**区分更新频率**：

| 层类型 | 内容示例 | 更新频率 |
|--------|---------|---------|
| **静态层** | 背景、网格、坐标轴 | 几乎不变 |
| **半静态层** | 用户对象、图形 | 偶尔变化 |
| **动态层** | 动画、粒子效果 | 每帧变化 |
| **UI 层** | 选择框、控制点、工具提示 | 交互时变化 |

### 常见分层方案

**方案 1：简单三层**（适合大多数场景）
```
- 背景层（z-index: 1）
- 内容层（z-index: 2）
- UI 层（z-index: 3）
```

**方案 2：精细五层**（复杂编辑器）
```
- 背景层（网格、坐标轴）
- 静态对象层（不移动的图形）
- 动态对象层（移动中的图形）
- 动画层（粒子、特效）
- UI 层（控件、提示）
```

**方案 3：按对象类型分层**（游戏）
```
- 远景层（背景）
- 地形层
- 敌人层
- 玩家层
- UI 层
```

---

## 3. 技术实现

### Canvas 堆叠布局

HTML 结构：

```html
<div class="canvas-container">
  <canvas id="background-layer" width="800" height="600"></canvas>
  <canvas id="content-layer" width="800" height="600"></canvas>
  <canvas id="ui-layer" width="800" height="600"></canvas>
</div>
```

CSS 定位：

```css
.canvas-container {
  position: relative;
  width: 800px;
  height: 600px;
}

.canvas-container canvas {
  position: absolute;
  top: 0;
  left: 0;
}

#background-layer {
  z-index: 1;
}

#content-layer {
  z-index: 2;
}

#ui-layer {
  z-index: 3;
}
```

关键点：
- **容器用 `position: relative`**：建立定位上下文
- **Canvas 用 `position: absolute`**：脱离文档流，堆叠在一起
- **z-index 控制层级**：数值越大越靠上

### 图层管理类

```javascript
class LayerManager {
  constructor(container, width, height) {
    this.container = container;
    this.width = width;
    this.height = height;
    this.layers = new Map();
  }
  
  createLayer(name, zIndex, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.id = `${name}-layer`;
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = zIndex;
    
    // 事件穿透设置
    if (options.interactive === false) {
      canvas.style.pointerEvents = 'none';
    }
    
    this.container.appendChild(canvas);
    
    const layer = {
      name,
      canvas,
      ctx: canvas.getContext('2d'),
      dirty: true,  // 初始标记为脏
      objects: [],
      renderFn: options.renderFn || this.defaultRenderFn
    };
    
    this.layers.set(name, layer);
    return layer;
  }
  
  getLayer(name) {
    return this.layers.get(name);
  }
  
  markDirty(name) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.dirty = true;
    }
  }
  
  markAllDirty() {
    this.layers.forEach(layer => layer.dirty = true);
  }
  
  render() {
    this.layers.forEach(layer => {
      if (layer.dirty) {
        this.renderLayer(layer);
        layer.dirty = false;
      }
    });
  }
  
  renderLayer(layer) {
    const { ctx, canvas } = layer;
    
    // 清除
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 渲染
    layer.renderFn(ctx, layer.objects);
  }
  
  defaultRenderFn(ctx, objects) {
    objects.forEach(obj => {
      if (obj.draw) obj.draw(ctx);
    });
  }
  
  resize(width, height) {
    this.width = width;
    this.height = height;
    
    this.layers.forEach(layer => {
      layer.canvas.width = width;
      layer.canvas.height = height;
      layer.dirty = true;
    });
  }
}
```

### 使用示例

```javascript
const container = document.querySelector('.canvas-container');
const layerManager = new LayerManager(container, 800, 600);

// 背景层：不接收事件
const bgLayer = layerManager.createLayer('background', 1, { 
  interactive: false 
});

// 内容层：不接收事件（事件由 UI 层处理）
const contentLayer = layerManager.createLayer('content', 2, { 
  interactive: false 
});

// UI 层：接收所有事件
const uiLayer = layerManager.createLayer('ui', 3, { 
  interactive: true 
});

// 背景只绘制一次
bgLayer.renderFn = (ctx) => {
  drawGrid(ctx, 800, 600, 50);
};
layerManager.markDirty('background');

// 内容层的对象
const objects = [
  new Rectangle(100, 100, 100, 80, 'blue'),
  new Circle(400, 200, 60, 'red')
];
contentLayer.objects = objects;
layerManager.markDirty('content');

// 动画循环
function animate() {
  layerManager.render();
  requestAnimationFrame(animate);
}

animate();
```

---

## 4. 事件处理

### 事件穿透问题

第三个问题来了：如果内容层在 UI 层下面，如何让鼠标事件"穿透" UI 层到达内容？

答案是：**CSS `pointer-events` 属性**。

```css
/* UI 层接收事件 */
#ui-layer {
  pointer-events: auto;  /* 默认值 */
}

/* 内容层和背景层不接收事件 */
#content-layer,
#background-layer {
  pointer-events: none;  /* 穿透 */
}
```

设置 `pointer-events: none` 后，该层会"对鼠标透明"，事件会传递到下层元素。

### 事件分发

虽然只有 UI 层接收事件，但我们需要判断用户点击的是哪个对象（可能在内容层）。

```javascript
class InteractionManager {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.uiLayer = layerManager.getLayer('ui');
    this.contentLayer = layerManager.getLayer('content');
    
    this.setupEvents();
  }
  
  setupEvents() {
    const canvas = this.uiLayer.canvas;
    
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 在内容层中进行碰撞检测
      const hitObject = this.hitTest(x, y);
      
      if (hitObject) {
        this.onObjectClick(hitObject, x, y);
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.onMouseMove(x, y);
    });
  }
  
  hitTest(x, y) {
    const objects = this.contentLayer.objects;
    
    // 从上到下检测（反向遍历）
    for (let i = objects.length - 1; i >= 0; i--) {
      if (objects[i].contains(x, y)) {
        return objects[i];
      }
    }
    
    return null;
  }
  
  onObjectClick(obj, x, y) {
    console.log('Clicked:', obj);
    
    // 绘制选择框到 UI 层
    this.drawSelection(obj);
    this.layerManager.markDirty('ui');
  }
  
  onMouseMove(x, y) {
    // 更新 UI 层（如悬停提示）
    const hitObject = this.hitTest(x, y);
    this.uiLayer.canvas.style.cursor = hitObject ? 'pointer' : 'default';
  }
  
  drawSelection(obj) {
    const ctx = this.uiLayer.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 绘制选择框
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
    ctx.setLineDash([]);
  }
}

// 使用
const interactionManager = new InteractionManager(layerManager);
```

---

## 5. 图层同步

### 视口同步

如果有缩放和平移功能，所有层的视口变换必须同步。

```javascript
class SyncedLayerManager extends LayerManager {
  constructor(container, width, height) {
    super(container, width, height);
    
    // 视口状态
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      scale: 1
    };
  }
  
  setViewport(offsetX, offsetY, scale) {
    this.viewport = { offsetX, offsetY, scale };
    this.markAllDirty();  // 所有层需要重绘
  }
  
  renderLayer(layer) {
    const { ctx, canvas } = layer;
    
    // 清除
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 应用视口变换
    ctx.setTransform(
      this.viewport.scale, 0,
      0, this.viewport.scale,
      this.viewport.offsetX, this.viewport.offsetY
    );
    
    // 渲染
    layer.renderFn(ctx, layer.objects);
  }
}

// 使用
const syncedManager = new SyncedLayerManager(container, 800, 600);

// 缩放和平移时更新视口
document.getElementById('zoom-in').addEventListener('click', () => {
  const v = syncedManager.viewport;
  syncedManager.setViewport(v.offsetX, v.offsetY, v.scale * 1.2);
  syncedManager.render();
});
```

---

## 6. 实际应用

### 图形编辑器分层

```javascript
class GraphicEditorLayers {
  constructor(container) {
    this.layerManager = new SyncedLayerManager(container, 800, 600);
    
    // 创建层
    this.bgLayer = this.layerManager.createLayer('background', 1, { 
      interactive: false,
      renderFn: this.renderBackground.bind(this)
    });
    
    this.contentLayer = this.layerManager.createLayer('content', 2, { 
      interactive: false 
    });
    
    this.uiLayer = this.layerManager.createLayer('ui', 3, { 
      interactive: true,
      renderFn: this.renderUI.bind(this)
    });
    
    // 交互
    this.interaction = new InteractionManager(this.layerManager);
    
    // 初始渲染
    this.layerManager.markAllDirty();
    this.layerManager.render();
  }
  
  renderBackground(ctx) {
    // 绘制网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 / this.layerManager.viewport.scale;
    
    const step = 50;
    for (let x = -1000; x <= 1000; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -1000);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    for (let y = -1000; y <= 1000; y += step) {
      ctx.beginPath();
      ctx.moveTo(-1000, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  }
  
  renderUI(ctx, objects) {
    // 绘制选择框、控制点等
    // ...
  }
  
  addObject(obj) {
    this.contentLayer.objects.push(obj);
    this.layerManager.markDirty('content');
    this.layerManager.render();
  }
}
```

### 游戏分层

```javascript
class GameLayers {
  constructor(container) {
    this.layerManager = new LayerManager(container, 800, 600);
    
    this.bgLayer = this.layerManager.createLayer('background', 1, { interactive: false });
    this.enemyLayer = this.layerManager.createLayer('enemy', 2, { interactive: false });
    this.playerLayer = this.layerManager.createLayer('player', 3, { interactive: false });
    this.effectLayer = this.layerManager.createLayer('effect', 4, { interactive: false });
    this.uiLayer = this.layerManager.createLayer('ui', 5, { interactive: false });
    
    // 背景只画一次
    this.renderBackground();
  }
  
  renderBackground() {
    const ctx = this.bgLayer.ctx;
    // 绘制静态背景...
    this.bgLayer.dirty = false;  // 不再重绘
  }
  
  update(deltaTime) {
    // 更新游戏逻辑
    this.updateEnemies(deltaTime);
    this.updatePlayer(deltaTime);
    this.updateEffects(deltaTime);
    
    // 标记需要重绘的层
    this.layerManager.markDirty('enemy');
    this.layerManager.markDirty('player');
    this.layerManager.markDirty('effect');
    // 背景层和 UI 层不重绘
  }
  
  render() {
    this.layerManager.render();
  }
}
```

---

## 本章小结

分层 Canvas 是提升性能的基础策略：

**核心原理**：
- **思想**：将不同更新频率的内容分到不同层，按需重绘
- **技术**：CSS 堆叠定位 + `pointer-events` 事件穿透
- **分类**：静态层、半静态层、动态层、UI 层

**技术要点**：
- **布局**：容器 `relative` + Canvas `absolute` + `z-index` 控制层级
- **事件**：底层设置 `pointer-events: none` 实现事件穿透
- **同步**：视口变换需要应用到所有层

**适用场景**：
- ✅ 图形编辑器（背景 + 内容 + UI）
- ✅ 数据可视化（坐标轴 + 数据 + 提示）
- ✅ 游戏（背景 + 游戏对象 + UI）

下一章我们将深入探讨分层的性能权衡，以及 Figma、Miro 等企业级应用的高级分层策略。
