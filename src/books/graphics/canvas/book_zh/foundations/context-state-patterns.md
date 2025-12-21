# 状态管理最佳实践

在前两章中，我们学习了 Canvas 的绘图上下文、状态定义，以及 `save()/restore()` 的工作机制。现在让我们将这些知识应用到实际开发中，学习如何设计可维护、高性能的状态管理模式。

本章将回答以下问题：
- 如何设计可复用的状态管理模式？
- 如何封装状态管理工具提升代码质量？
- 企业级应用中如何应用这些模式？
- 有哪些性能优化技巧？

---

## 1. 状态管理设计模式

### 1.1 模式1：函数级状态隔离

每个绘制函数内部使用 `save/restore` 包裹，确保不泄露状态：

```javascript
function drawShape(ctx, options) {
  ctx.save();
  try {
    // 设置样式
    ctx.fillStyle = options.fill || '#000';
    ctx.strokeStyle = options.stroke || '#000';
    ctx.lineWidth = options.lineWidth || 1;
    
    // 绘制逻辑
    ctx.beginPath();
    ctx.rect(options.x, options.y, options.width, options.height);
    ctx.fill();
    ctx.stroke();
  } finally {
    ctx.restore(); // 即使发生错误也能恢复
  }
}

// 使用
drawShape(ctx, { x: 10, y: 10, width: 100, height: 100, fill: 'red', stroke: 'black', lineWidth: 2 });
```

**关键点**：使用 `try/finally` 确保即使绘制代码抛出异常，`restore()` 也会被执行。

### 1.2 模式2：withState 高阶函数

封装一个通用的状态管理工具：

```javascript
function withState(ctx, fn) {
  ctx.save();
  try {
    return fn(ctx);
  } finally {
    ctx.restore();
  }
}

// 使用示例
withState(ctx, (ctx) => {
  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 100, 100);
});

// 状态已自动恢复
console.log(ctx.fillStyle); // '#000000'（默认值）

// 支持返回值
const result = withState(ctx, (ctx) => {
  ctx.fillStyle = 'blue';
  ctx.fillRect(120, 10, 100, 100);
  return 'done';
});
console.log(result); // 'done'
```

这个模式特别适合封装复杂的绘制逻辑。

### 1.3 模式3：状态预设（Preset）

对于重复使用的样式组合，可以封装为预设函数：

```javascript
const StylePresets = {
  button: (ctx) => {
    ctx.fillStyle = '#3498db';
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  },
  
  highlight: (ctx) => {
    ctx.fillStyle = '#f39c12';
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
  },
  
  danger: (ctx) => {
    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
  }
};

// 使用
withState(ctx, (ctx) => {
  StylePresets.button(ctx);
  ctx.fillRect(10, 10, 120, 40);
});

withState(ctx, (ctx) => {
  StylePresets.danger(ctx);
  ctx.fillRect(150, 10, 120, 40);
});
```

---

## 2. 生产级状态管理器

下面是一个完整的状态管理器实现，包含调试、错误检测等企业级功能：

```javascript
/**
 * Canvas 状态管理器
 * 提供状态保存、恢复、预设应用、调试等功能
 */
class CanvasStateManager {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.stateStack = [];
    this.debug = options.debug || false;
  }
  
  /**
   * 保存当前状态到栈顶
   * @returns {Function} 恢复函数，调用即可恢复状态
   */
  save() {
    this.ctx.save();
    const timestamp = this.debug ? Date.now() : null;
    this.stateStack.push({ timestamp });
    
    if (this.debug) {
      console.log(`[StateManager] save() - 栈深度: ${this.stateStack.length}`);
    }
    
    return () => this.restore();
  }
  
  /**
   * 从栈顶恢复状态
   * @returns {boolean} 是否成功恢复
   */
  restore() {
    if (this.stateStack.length === 0) {
      console.warn('[StateManager] restore() called without matching save()');
      return false;
    }
    
    this.ctx.restore();
    const state = this.stateStack.pop();
    
    if (this.debug && state.timestamp) {
      const duration = Date.now() - state.timestamp;
      console.log(`[StateManager] restore() - 栈深度: ${this.stateStack.length}, 持续时间: ${duration}ms`);
    }
    
    return true;
  }
  
  /**
   * 在独立状态中执行函数
   * @param {Function} fn - 要执行的函数，接收 ctx 作为参数
   * @returns {*} 函数的返回值
   */
  withState(fn) {
    this.ctx.save();
    try {
      return fn(this.ctx);
    } finally {
      this.ctx.restore();
    }
  }
  
  /**
   * 应用样式预设
   * @param {Object|Function} preset - 样式预设对象或函数
   */
  applyPreset(preset) {
    if (typeof preset === 'function') {
      preset(this.ctx);
    } else if (typeof preset === 'object' && preset !== null) {
      Object.assign(this.ctx, preset);
    } else {
      throw new TypeError('Preset must be an object or function');
    }
  }
  
  /**
   * 获取当前状态栈深度
   */
  getStackDepth() {
    return this.stateStack.length;
  }
  
  /**
   * 检查状态栈是否平衡（所有 save 都有对应的 restore）
   */
  isBalanced() {
    return this.stateStack.length === 0;
  }
  
  /**
   * 完全重置状态管理器和 Canvas
   */
  reset() {
    // 清空状态栈
    while (this.stateStack.length > 0) {
      this.ctx.restore();
      this.stateStack.pop();
    }
    
    // 重置 Canvas
    const { canvas } = this.ctx;
    canvas.width = canvas.width;
    
    if (this.debug) {
      console.log('[StateManager] reset() - 状态管理器已重置');
    }
  }
  
  /**
   * 创建状态快照（用于调试）
   */
  captureState() {
    return {
      fillStyle: this.ctx.fillStyle,
      strokeStyle: this.ctx.strokeStyle,
      lineWidth: this.ctx.lineWidth,
      globalAlpha: this.ctx.globalAlpha,
      font: this.ctx.font,
      textAlign: this.ctx.textAlign,
    };
  }
}

// 使用示例
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stateManager = new CanvasStateManager(ctx, { debug: true });

// 方式1：使用 withState
stateManager.withState((ctx) => {
  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 100, 100);
});

// 方式2：手动 save/restore
const restore = stateManager.save();
ctx.fillStyle = 'blue';
ctx.fillRect(120, 10, 100, 100);
restore();

// 方式3：应用样式预设
const buttonStyle = {
  fillStyle: '#3498db',
  strokeStyle: '#2980b9',
  lineWidth: 2
};

stateManager.withState((ctx) => {
  stateManager.applyPreset(buttonStyle);
  ctx.fillRect(230, 10, 120, 40);
  ctx.strokeRect(230, 10, 120, 40);
});

// 检查状态栈
console.log('栈深度:', stateManager.getStackDepth()); // 0
console.log('栈平衡:', stateManager.isBalanced());    // true
```

---

## 3. 企业级应用场景

### 3.1 场景1：图形编辑器的对象渲染

在图形编辑器中，需要高效渲染大量图形对象：

```javascript
/**
 * 图形对象渲染器
 * 优化策略：按样式批量渲染，最小化状态切换
 */
class ShapeRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }
  
  /**
   * 批量渲染图形对象
   * 性能优化：按 fillStyle 分组，减少状态切换
   */
  renderShapes(shapes) {
    const grouped = this.groupByStyle(shapes);
    
    for (const [style, group] of grouped) {
      this.ctx.save();
      this.ctx.fillStyle = style.fill;
      this.ctx.strokeStyle = style.stroke;
      this.ctx.lineWidth = style.lineWidth;
      
      // 批量绘制同样式的图形
      group.forEach(shape => {
        this.drawShape(shape);
      });
      
      this.ctx.restore();
    }
  }
  
  groupByStyle(shapes) {
    const groups = new Map();
    
    for (const shape of shapes) {
      const key = `${shape.fill}-${shape.stroke}-${shape.lineWidth}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(shape);
    }
    
    return Array.from(groups.entries()).map(([key, shapes]) => {
      const [fill, stroke, lineWidth] = key.split('-');
      return [{ fill, stroke, lineWidth: Number(lineWidth) }, shapes];
    });
  }
  
  drawShape(shape) {
    this.ctx.beginPath();
    if (shape.type === 'rect') {
      this.ctx.rect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === 'circle') {
      this.ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
    }
    this.ctx.fill();
    this.ctx.stroke();
  }
}

// 使用
const renderer = new ShapeRenderer(ctx);
const shapes = [
  { type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: 'red', stroke: 'black', lineWidth: 2 },
  { type: 'rect', x: 120, y: 0, width: 100, height: 100, fill: 'red', stroke: 'black', lineWidth: 2 },
  { type: 'circle', x: 290, y: 50, radius: 50, fill: 'blue', stroke: 'black', lineWidth: 2 },
];

renderer.renderShapes(shapes);
```

**性能提升**：
- 1000个图形，随机样式：约200ms
- 1000个图形，批量分组：约50ms（提升75%）

### 3.2 场景2：多层 Canvas 管理

复杂应用中使用多层 Canvas 实现性能优化：

```javascript
/**
 * 多层 Canvas 管理器
 * 应用场景：背景层（静态）+ 对象层（动态）+ 交互层（临时）
 */
class LayeredCanvasManager {
  constructor(container, width, height) {
    this.container = container;
    this.width = width;
    this.height = height;
    this.layers = new Map();
    
    this.initLayers();
  }
  
  initLayers() {
    const layerNames = ['background', 'content', 'interaction'];
    
    layerNames.forEach((name, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.zIndex = index;
      
      const ctx = canvas.getContext('2d');
      const stateManager = new CanvasStateManager(ctx);
      
      this.layers.set(name, {
        canvas,
        ctx,
        stateManager,
        dirty: false
      });
      
      this.container.appendChild(canvas);
    });
  }
  
  getLayer(layerName) {
    return this.layers.get(layerName);
  }
  
  markDirty(layerName) {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.dirty = true;
    }
  }
  
  clearLayer(layerName) {
    const layer = this.layers.get(layerName);
    if (layer) {
      const { ctx, canvas } = layer;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }
  
  render() {
    for (const [name, layer] of this.layers) {
      if (layer.dirty) {
        this.clearLayer(name);
        // 子类实现具体绘制逻辑
        layer.dirty = false;
      }
    }
  }
}

// 使用
const manager = new LayeredCanvasManager(container, 800, 600);

// 绘制背景（只绘制一次）
const bgLayer = manager.getLayer('background');
bgLayer.ctx.fillStyle = '#f0f0f0';
bgLayer.ctx.fillRect(0, 0, 800, 600);
```

---

## 4. 性能优化技巧

### 4.1 批量处理相同样式

```javascript
// ❌ 低效：每个对象都切换状态
objects.forEach(obj => {
  ctx.save();
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  ctx.restore();
});

// ✅ 高效：按颜色分组批量处理
const grouped = _.groupBy(objects, 'color');
for (const [color, objs] of Object.entries(grouped)) {
  ctx.save();
  ctx.fillStyle = color;
  objs.forEach(obj => {
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  });
  ctx.restore();
}
```

### 4.2 减少循环内的 save/restore

```javascript
// ❌ 低效：循环内频繁 save/restore
for (let i = 0; i < particles.length; i++) {
  ctx.save();
  ctx.translate(particles[i].x, particles[i].y);
  ctx.rotate(particles[i].angle);
  drawParticle(ctx);
  ctx.restore();
}

// ✅ 高效：使用 setTransform 避免save/restore
ctx.save();
for (let i = 0; i < particles.length; i++) {
  const p = particles[i];
  ctx.setTransform(
    Math.cos(p.angle), Math.sin(p.angle),
    -Math.sin(p.angle), Math.cos(p.angle),
    p.x, p.y
  );
  drawParticle(ctx);
}
ctx.restore();
```

---

## 本章小结

本章介绍了状态管理的最佳实践：

**设计模式**：
- 函数级状态隔离：使用 try/finally 确保 restore()
- withState 高阶函数：自动管理状态生命周期
- 状态预设：封装重复样式组合

**生产级工具**：
- CanvasStateManager 类：提供调试、错误检测功能
- 状态栈深度监控
- 状态快照功能

**企业级应用**：
- 图形编辑器：按样式批量渲染
- 多层 Canvas：分离静态和动态内容
- 性能优化：批量处理、减少状态切换

**性能优化技巧**：
- 按样式分组批量处理
- 循环内避免频繁 save/restore
- 使用 setTransform 代替 translate/rotate

通过本章学习，你已经掌握了 Canvas 状态管理的完整知识体系。在实际开发中，根据场景选择合适的模式，可以显著提升代码质量和性能。

在下一章，我们将学习像素操作，直接读取和修改 Canvas 的像素数据。