# 脏矩形渲染基础

首先要问一个问题：如果画布上有 100 个对象，但只有 2 个在移动，是否还需要每帧重绘全部 100 个？

答案是：不需要。通过**脏矩形 (Dirty Rectangle)** 优化，我们只重绘发生变化的区域，大幅提升性能。

---

## 1. 问题分析

### 全局重绘的性能瓶颈

常见的渲染模式：

```javascript
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清除整个画布
  
  for (const obj of objects) {
    obj.draw(ctx);  // 重绘所有对象
  }
}
```

这种方式的问题：
- 即使 99% 的对象静止不动，也要全部重绘
- 对象数量多时，每帧开销巨大

### 局部更新的可能性

现在我要问第二个问题：能否只重绘变化的部分？

答案是肯定的！关键思想：
1. **标记脏状态**：对象移动或改变时，标记为"脏"
2. **计算脏矩形**：确定需要重绘的区域
3. **局部重绘**：只清除和重绘脏区域

这就是脏矩形优化的核心。

---

## 2. 脏区域标记

### 脏状态管理

```javascript
class DirtyObject {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    this._dirty = true;  // 初始为脏（需要首次绘制）
    this._previousBounds = null;  // 记录旧位置
  }
  
  get dirty() {
    return this._dirty;
  }
  
  markDirty() {
    if (!this._dirty) {
      // 保存当前位置作为"旧位置"
      this._previousBounds = this.getBounds();
      this._dirty = true;
    }
  }
  
  clearDirty() {
    this._dirty = false;
    this._previousBounds = null;
  }
  
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
  
  // 移动时自动标记脏
  setPosition(x, y) {
    if (x !== this.x || y !== this.y) {
      this.markDirty();
      this.x = x;
      this.y = y;
    }
  }
}
```

关键点：
- `markDirty()` 时保存旧位置
- 任何会影响渲染的操作（移动、缩放、旋转）都要调用 `markDirty()`
- 渲染后调用 `clearDirty()` 清除脏状态

---

## 3. 脏矩形计算

### 包含旧位置和新位置

第三个问题：脏矩形应该是什么？

答案是：**旧位置和新位置的并集**。

思考一下：对象从位置 A 移动到位置 B，需要重绘哪里？
1. **旧位置 A**：要清除旧的图像
2. **新位置 B**：要绘制新的图像

所以脏矩形必须包含这两个区域。

```javascript
class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  // 矩形合并：返回包含两个矩形的最小矩形
  union(other) {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const right = Math.max(this.x + this.width, other.x + other.width);
    const bottom = Math.max(this.y + this.height, other.y + other.height);
    
    return new Rect(x, y, right - x, bottom - y);
  }
  
  // 矩形相交检测
  intersects(other) {
    return !(this.x + this.width < other.x ||
             other.x + other.width < this.x ||
             this.y + this.height < other.y ||
             other.y + other.height < this.y);
  }
  
  // 扩展边距（防止边界精度问题）
  expand(margin) {
    return new Rect(
      this.x - margin,
      this.y - margin,
      this.width + margin * 2,
      this.height + margin * 2
    );
  }
}

// 在 DirtyObject 中添加
class DirtyObject {
  // ... 前面的代码 ...
  
  getDirtyRect() {
    if (!this._dirty) return null;
    
    const currentBounds = new Rect(this.x, this.y, this.width, this.height);
    
    if (this._previousBounds) {
      // 合并旧位置和新位置
      const prevRect = new Rect(
        this._previousBounds.x,
        this._previousBounds.y,
        this._previousBounds.width,
        this._previousBounds.height
      );
      return currentBounds.union(prevRect);
    }
    
    return currentBounds;
  }
}
```

---

## 4. 矩形合并策略

如果有多个对象都移动了，会有多个脏矩形。现在问题来了：是分别重绘每个矩形，还是合并后一起重绘？

### 策略 1：全部合并为一个

```javascript
function mergeAll(rects) {
  if (rects.length === 0) return null;
  
  let merged = rects[0];
  for (let i = 1; i < rects.length; i++) {
    merged = merged.union(rects[i]);
  }
  return merged;
}
```

优点：简单
缺点：如果矩形分散，会重绘大量不必要的区域

### 策略 2：智能合并相交或接近的矩形

```javascript
function mergeOverlapping(rects, threshold = 10) {
  const result = [];
  const remaining = [...rects];
  
  while (remaining.length > 0) {
    let current = remaining.pop().expand(threshold);
    let didMerge = true;
    
    // 反复尝试合并，直到无法继续合并
    while (didMerge) {
      didMerge = false;
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const expanded = remaining[i].expand(threshold);
        
        if (current.intersects(expanded)) {
          current = current.union(remaining[i]);
          remaining.splice(i, 1);
          didMerge = true;
        }
      }
    }
    
    result.push(current);
  }
  
  return result;
}
```

这个算法会：
1. 扩展矩形边界（threshold）
2. 合并相交或接近的矩形
3. 返回多个不重叠的矩形

优点：在重绘开销和分散程度之间取得平衡
缺点：算法复杂度较高

---

## 5. 局部重绘实现

### 使用 clip() 限制绘制区域

Canvas 的 `clip()` 方法可以限制绘制只在指定区域内生效。

```javascript
class DirtyRectRenderer {
  constructor(canvas, objects) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = objects;
  }
  
  render() {
    const dirtyRects = this.collectDirtyRects();
    
    if (dirtyRects.length === 0) {
      return;  // 无需重绘
    }
    
    // 对每个脏矩形进行局部重绘
    dirtyRects.forEach(rect => {
      this.renderRegion(rect);
    });
    
    // 清理脏状态
    this.objects.forEach(obj => {
      if (obj.clearDirty) obj.clearDirty();
    });
  }
  
  collectDirtyRects() {
    const rects = [];
    
    for (const obj of this.objects) {
      if (obj.dirty) {
        const dirtyRect = obj.getDirtyRect();
        if (dirtyRect) {
          rects.push(dirtyRect);
        }
      }
    }
    
    // 智能合并
    return mergeOverlapping(rects, 10);
  }
  
  renderRegion(rect) {
    this.ctx.save();
    
    // 裁剪到脏区域
    this.ctx.beginPath();
    this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.clip();
    
    // 清除脏区域
    this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    
    // 重绘与脏区域相交的所有对象
    for (const obj of this.objects) {
      const bounds = obj.getBounds ? 
        new Rect(obj.getBounds().x, obj.getBounds().y, obj.getBounds().width, obj.getBounds().height) :
        new Rect(obj.x, obj.y, obj.width, obj.height);
      
      if (bounds.intersects(rect)) {
        obj.draw(this.ctx);
      }
    }
    
    this.ctx.restore();
  }
}
```

关键点：
1. **save/restore**：保护 Canvas 状态
2. **clip()**：限制绘制区域
3. **只重绘相交对象**：遍历所有对象，只绘制与脏区域相交的

---

## 6. 完整示例

```javascript
// 可移动的对象
class MovableBox extends DirtyObject {
  constructor(x, y, width, height, color) {
    super(x, y, width, height);
    this.color = color;
    this.velocityX = (Math.random() - 0.5) * 100;
    this.velocityY = (Math.random() - 0.5) * 100;
  }
  
  update(deltaTime) {
    const newX = this.x + this.velocityX * (deltaTime / 1000);
    const newY = this.y + this.velocityY * (deltaTime / 1000);
    
    // 边界反弹
    if (newX < 0 || newX + this.width > canvas.width) {
      this.velocityX = -this.velocityX;
    }
    if (newY < 0 || newY + this.height > canvas.height) {
      this.velocityY = -this.velocityY;
    }
    
    this.setPosition(
      Math.max(0, Math.min(newX, canvas.width - this.width)),
      Math.max(0, Math.min(newY, canvas.height - this.height))
    );
  }
  
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 调试：绘制边界
    ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

// 性能对比演示
class PerformanceDemo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 创建对象
    this.objects = [];
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * (canvas.width - 50);
      const y = Math.random() * (canvas.height - 50);
      const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
      this.objects.push(new MovableBox(x, y, 50, 50, color));
    }
    
    // 只让 5 个对象移动
    this.movingObjects = this.objects.slice(0, 5);
    this.staticObjects = this.objects.slice(5);
    
    // 渲染器
    this.dirtyRenderer = new DirtyRectRenderer(canvas, this.objects);
    
    // 性能统计
    this.useDirtyRect = true;
    this.frameCount = 0;
    this.totalTime = 0;
    this.lastTime = performance.now();
  }
  
  update(deltaTime) {
    // 只更新移动的对象
    this.movingObjects.forEach(obj => obj.update(deltaTime));
  }
  
  render() {
    const startTime = performance.now();
    
    if (this.useDirtyRect) {
      // 脏矩形渲染
      this.dirtyRenderer.render();
    } else {
      // 全局重绘
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.objects.forEach(obj => obj.draw(this.ctx));
      this.objects.forEach(obj => {
        if (obj.clearDirty) obj.clearDirty();
      });
    }
    
    const renderTime = performance.now() - startTime;
    this.totalTime += renderTime;
    this.frameCount++;
    
    // 显示统计
    this.drawStats(renderTime);
  }
  
  drawStats(renderTime) {
    const avgTime = this.totalTime / this.frameCount;
    
    this.ctx.fillStyle = 'black';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`Mode: ${this.useDirtyRect ? 'Dirty Rect' : 'Full Redraw'}`, 10, 20);
    this.ctx.fillText(`Render Time: ${renderTime.toFixed(2)}ms`, 10, 40);
    this.ctx.fillText(`Avg Time: ${avgTime.toFixed(2)}ms`, 10, 60);
    this.ctx.fillText(`Objects: ${this.objects.length} (${this.movingObjects.length} moving)`, 10, 80);
  }
  
  toggleMode() {
    this.useDirtyRect = !this.useDirtyRect;
    this.frameCount = 0;
    this.totalTime = 0;
  }
  
  loop(time) {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame((t) => this.loop(t));
  }
  
  start() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }
}

// 运行
const canvas = document.getElementById('canvas');
const demo = new PerformanceDemo(canvas);
demo.start();

// 切换模式按钮
document.getElementById('toggle').addEventListener('click', () => {
  demo.toggleMode();
});
```

---

## 7. 性能评估

### 何时使用脏矩形优化？

**适合的场景**：
- 大量静态对象，少量动态对象（如地图编辑器）
- 对象集中在某些区域
- 对象移动距离较小

**不适合的场景**：
- 大部分对象都在移动（如粒子系统）
- 对象分散在整个画布
- 对象数量很少（优化开销大于收益）

### 收益计算

```
全局重绘成本 = 对象数量 × 单个对象绘制时间

脏矩形重绘成本 = 脏标记开销 + 矩形合并开销 + 相交对象数量 × 绘制时间

当：脏矩形重绘成本 < 全局重绘成本，优化才有意义
```

有个经验法则：如果**少于 30% 的画布需要重绘**，脏矩形优化通常是值得的。

---

## 8. 进阶：处理复杂变换

### 旋转和缩放的脏矩形

对于旋转的对象，脏矩形应该是**轴对齐包围盒 (AABB)**。

```javascript
class RotatableObject extends DirtyObject {
  constructor(x, y, width, height) {
    super(x, y, width, height);
    this.rotation = 0;
  }
  
  getBounds() {
    if (this.rotation === 0) {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    
    // 计算旋转后的 AABB
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    
    const corners = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x, y: this.y + this.height },
      { x: this.x + this.width, y: this.y + this.height }
    ];
    
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    const rotated = corners.map(corner => ({
      x: cx + (corner.x - cx) * cos - (corner.y - cy) * sin,
      y: cy + (corner.x - cx) * sin + (corner.y - cy) * cos
    }));
    
    const minX = Math.min(...rotated.map(p => p.x));
    const maxX = Math.max(...rotated.map(p => p.x));
    const minY = Math.min(...rotated.map(p => p.y));
    const maxY = Math.max(...rotated.map(p => p.y));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
```

---

## 本章小结

本章介绍了脏矩形优化的基础原理和实现：

**核心思想**：
- 只重绘发生变化的区域，避免全局重绘
- 通过标记、计算、合并、局部重绘四个步骤实现

**关键技术**：
- **脏标记**：记录旧位置和新位置
- **脏矩形计算**：旧位置和新位置的并集
- **智能合并**：合并相交或接近的矩形
- **局部重绘**：使用 clip() 限制绘制区域

**性能评估**：
- 适合静态对象多、动态对象少的场景
- 脏区域 < 30% 时优势明显
- 需要权衡管理开销和重绘成本

**复杂变换处理**：
- 旋转对象使用 AABB（轴对齐包围盒）
- 确保脏矩形包含所有影响区域

下一章，我们将探讨脏矩形的性能权衡、企业级实现和真实项目案例，帮助你在生产环境中正确使用这项优化技术。
