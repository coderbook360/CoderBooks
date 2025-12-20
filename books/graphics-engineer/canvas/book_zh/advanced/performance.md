# 性能分析与问题排查

你的 Canvas 应用在开发时运行流畅，但部署到生产环境后，用户反馈卡顿、掉帧、甚至浏览器崩溃。如何系统性地定位性能瓶颈？如何区分是渲染问题、计算问题还是内存问题？

性能优化不是"盲目尝试"，而是基于 **数据驱动的决策**。本章将介绍完整的性能分析方法论、工具使用实战，以及真实场景的问题排查案例。

---

## 1. 性能分析基础工具

### 1.1 Performance API：精确测量

**Performance API** 提供高精度时间戳（微秒级），用于测量代码执行时间。

```javascript
const start = performance.now();

// 你的代码
for (let i = 0; i < 1000; i++) {
  ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 10, 10);
}

const end = performance.now();
console.log(`绘制1000个矩形耗时: ${(end - start).toFixed(2)}ms`);
```

**为什么不用 Date.now()？**

`Date.now()` 的精度仅为毫秒级，且受系统时间调整影响。`performance.now()` 从页面加载开始计时，单调递增，精度可达微秒级（0.001ms）。

**封装性能测量工具**：

```javascript
class PerformanceProfiler {
  constructor(name) {
    this.name = name;
    this.marks = new Map();
  }
  
  start(label) {
    this.marks.set(label, performance.now());
  }
  
  end(label) {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark for "${label}"`);
      return;
    }
    
    const duration = performance.now() - startTime;
    console.log(`[${this.name}] ${label}: ${duration.toFixed(2)}ms`);
    this.marks.delete(label);
    
    return duration;
  }
  
  measure(label, fn) {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }
}

// 使用
const profiler = new PerformanceProfiler('Canvas Renderer');

profiler.start('full-render');
profiler.measure('clear-canvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
profiler.measure('draw-objects', () => {
  objects.forEach(obj => obj.render(ctx));
});
profiler.end('full-render');
```

### 1.2 FPS 监控：实时帧率

**帧率（FPS）** 是衡量渲染性能的核心指标。60 FPS 意味着每帧 16.67ms，低于此值会产生卡顿感。

```javascript
class FPSMonitor {
  constructor(sampleSize = 60) {
    this.frameTimes = [];
    this.sampleSize = sampleSize;
    this.lastTime = performance.now();
    this.fpsElement = this.createDisplay();
  }
  
  createDisplay() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.8);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      border-radius: 4px;
    `;
    document.body.appendChild(div);
    return div;
  }
  
  update() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.sampleSize) {
      this.frameTimes.shift();
    }
    
    // 每10帧更新一次显示
    if (this.frameTimes.length % 10 === 0) {
      this.updateDisplay();
    }
  }
  
  getFPS() {
    if (this.frameTimes.length === 0) return 0;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avg);
  }
  
  getStats() {
    if (this.frameTimes.length === 0) return null;
    
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    return {
      fps: this.getFPS(),
      min: Math.round(1000 / sorted[sorted.length - 1]), // 最低FPS
      max: Math.round(1000 / sorted[0]),                 // 最高FPS
      p99: sorted[Math.floor(sorted.length * 0.99)],     // 99分位帧时间
    };
  }
  
  updateDisplay() {
    const stats = this.getStats();
    if (!stats) return;
    
    const color = stats.fps >= 55 ? '#0f0' : stats.fps >= 30 ? '#ff0' : '#f00';
    this.fpsElement.style.color = color;
    this.fpsElement.innerHTML = `
      FPS: ${stats.fps}<br>
      Min: ${stats.min} | Max: ${stats.max}<br>
      P99: ${stats.p99.toFixed(1)}ms
    `;
  }
  
  destroy() {
    this.fpsElement.remove();
  }
}

// 使用
const fpsMonitor = new FPSMonitor();

function animate() {
  fpsMonitor.update();
  
  // 渲染代码
  render();
  
  requestAnimationFrame(animate);
}
```

---

## 2. Chrome DevTools 实战

### 2.1 Performance 面板深度解析

**录制性能分析**：

1. **打开 DevTools** → Performance 标签
2. **开始录制**：点击左上角的⚫️（Record）或按 Ctrl+E
3. **执行操作**：在应用中执行卡顿的操作（如拖拽、缩放）
4. **停止录制**：点击⏹️（Stop）

**关键指标解读**：

| 区域 | 含义 | 关注点 |
|------|------|--------|
| **FPS** | 绿色柱越高越好，红色表示掉帧 | 查找红色区域，对应时间点有性能问题 |
| **Frames** | 每一帧的详细时间线 | 绿色<16.67ms为流畅，黄色/红色为卡顿 |
| **Main** | 主线程活动（JavaScript、渲染） | 黄色块为脚本执行，紫色块为渲染，查找耗时长的任务 |
| **GPU** | GPU 活动 | Canvas 使用 GPU 加速，查看 GPU 是否满载 |
| **Memory** | 内存使用 | 持续增长可能有内存泄漏 |

**案例1：定位慢速函数**

![Performance 截图示例（文字描述）]
- Main 线程中有一个黄色长块（50ms）
- 点击该块，底部 Summary 显示为 `renderAllObjects`
- 展开 Call Tree，发现 `Path2D.addPath` 占用 40ms

**优化方向**：Path2D 创建过于频繁，考虑缓存路径对象。

### 2.2 Memory 面板：排查内存泄漏

**识别内存泄漏**：

1. 打开 DevTools → Memory 标签
2. 选择 **Heap snapshot**（堆快照）
3. 执行操作（如创建100个图形）
4. 再次拍摄快照
5. 删除这些图形
6. 第三次拍摄快照
7. 对比快照，查看对象是否被正确释放

**常见泄漏源**：
- 事件监听器未移除
- 闭包引用大对象
- Canvas 缓存未清理
- 定时器未取消

**示例**：

```javascript
// ❌ 内存泄漏
class Shape {
  constructor(canvas) {
    this.canvas = canvas;
    this.onClick = (e) => this.handleClick(e);
    canvas.addEventListener('click', this.onClick); // 未移除
  }
  
  destroy() {
    // 忘记移除监听器！
  }
}

// ✅ 正确
class Shape {
  constructor(canvas) {
    this.canvas = canvas;
    this.onClick = (e) => this.handleClick(e);
    canvas.addEventListener('click', this.onClick);
  }
  
  destroy() {
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas = null; // 断开引用
  }
}
```

### 2.3 Rendering 面板：可视化性能

开启 **Rendering** 面板（DevTools → More tools → Rendering）：

- **Paint flashing**：绿色区域表示重绘，帮助识别不必要的绘制
- **Layer borders**：显示合成层边界（Canvas 通常是独立层）
- **Frame Rendering Stats**：实时显示帧率和GPU使用

---

## 3. 常见性能瓶颈识别

### 3.1 渲染瓶颈（GPU-bound）

**特征**：
- FPS 稳定在某个值（如30 FPS），但主线程空闲
- GPU 使用率高
- 增加对象数量后 FPS 线性下降

**常见原因**：
- 绘制的像素数量过多（大分辨率 Canvas、高 DPI）
- 大量图形叠加（过度绘制）
- 复杂的阴影、渐变、滤镜效果

**优化方案**：
- 使用脏矩形渲染，只绘制变化区域
- 分层 Canvas，静态层和动态层分离
- 降低高 DPI 设备的渲染分辨率
- 减少不可见对象的绘制

### 3.2 计算瓶颈（CPU-bound）

**特征**：
- Main 线程黄色块密集
- JavaScript 执行时间长（>16ms）
- 增加计算复杂度后 FPS 显著下降

**常见原因**：
- 碰撞检测算法低效（O(n²)）
- 频繁的几何计算（路径生成、矩阵变换）
- 大量对象的遍历更新

**优化方案**：
- 使用空间分割算法（四叉树、网格）优化碰撞检测
- 缓存计算结果（如边界框、变换矩阵）
- 使用 Web Worker 进行复杂计算
- 批量更新，减少逐个处理

**示例：优化碰撞检测**

```javascript
// ❌ 低效：O(n²)
function checkCollisions(objects) {
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      if (intersects(objects[i], objects[j])) {
        // 处理碰撞
      }
    }
  }
}

// ✅ 高效：使用空间哈希 O(n)
class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  
  clear() {
    this.cells.clear();
  }
  
  insert(obj) {
    const cells = this.getCells(obj.bounds);
    cells.forEach(key => {
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key).push(obj);
    });
  }
  
  getCells(bounds) {
    const keys = [];
    const minX = Math.floor(bounds.left / this.cellSize);
    const minY = Math.floor(bounds.top / this.cellSize);
    const maxX = Math.floor(bounds.right / this.cellSize);
    const maxY = Math.floor(bounds.bottom / this.cellSize);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        keys.push(`${x},${y}`);
      }
    }
    return keys;
  }
  
  getPotentialCollisions(obj) {
    const cells = this.getCells(obj.bounds);
    const candidates = new Set();
    cells.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.forEach(other => {
          if (other !== obj) candidates.add(other);
        });
      }
    });
    return Array.from(candidates);
  }
}

// 使用
const spatialHash = new SpatialHash(100); // 单元格大小100px

function checkCollisions(objects) {
  spatialHash.clear();
  objects.forEach(obj => spatialHash.insert(obj));
  
  objects.forEach(obj => {
    const candidates = spatialHash.getPotentialCollisions(obj);
    candidates.forEach(other => {
      if (intersects(obj, other)) {
        // 处理碰撞
      }
    });
  });
}
```

### 3.3 内存瓶颈

**特征**：
- Memory 面板显示内存持续增长
- 浏览器提示"页面无响应"
- 性能随时间逐渐下降

**常见原因**：
- 对象未正确释放（内存泄漏）
- 缓存无限增长
- 大量 ImageData 或离屏 Canvas

**优化方案**：
- 实现对象池复用对象
- 设置缓存上限（LRU 策略）
- 及时释放大对象引用

**对象池示例**：

```javascript
class ObjectPool {
  constructor(factory, resetFn) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = new Set();
  }
  
  acquire() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.factory();
    }
    this.active.add(obj);
    return obj;
  }
  
  release(obj) {
    if (this.active.has(obj)) {
      this.resetFn(obj);
      this.pool.push(obj);
      this.active.delete(obj);
    }
  }
  
  releaseAll() {
    this.active.forEach(obj => {
      this.resetFn(obj);
      this.pool.push(obj);
    });
    this.active.clear();
  }
}

// 使用
const particlePool = new ObjectPool(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }),
  (p) => { p.life = 0; } // 重置函数
);

function createParticle(x, y) {
  const p = particlePool.acquire();
  p.x = x;
  p.y = y;
  p.vx = Math.random() * 2 - 1;
  p.vy = Math.random() * 2 - 1;
  p.life = 100;
  return p;
}

function updateParticles(particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    if (p.life <= 0) {
      particlePool.release(p); // 归还对象池
      particles.splice(i, 1);
    }
  }
}
```

---

## 4. 性能预算管理

**什么是性能预算？**

为应用的各个部分设定性能目标，确保不超出预算。

```javascript
const PERFORMANCE_BUDGET = {
  maxObjects: 1000,        // 最多1000个对象
  maxFrameTime: 16,        // 每帧最多16ms
  maxMemory: 100 * 1024 * 1024, // 最多100MB
  maxRenderTime: 10,       // 渲染最多10ms
  maxUpdateTime: 5,        // 逻辑更新最多5ms
};

class PerformanceMonitor {
  constructor(budget) {
    this.budget = budget;
    this.warnings = [];
  }
  
  checkFrame(stats) {
    this.warnings = [];
    
    if (stats.frameTime > this.budget.maxFrameTime) {
      this.warnings.push(`帧时间超标: ${stats.frameTime.toFixed(2)}ms > ${this.budget.maxFrameTime}ms`);
    }
    
    if (stats.objectCount > this.budget.maxObjects) {
      this.warnings.push(`对象数量超标: ${stats.objectCount} > ${this.budget.maxObjects}`);
    }
    
    if (stats.renderTime > this.budget.maxRenderTime) {
      this.warnings.push(`渲染时间超标: ${stats.renderTime.toFixed(2)}ms > ${this.budget.maxRenderTime}ms`);
    }
    
    if (this.warnings.length > 0) {
      console.warn('[Performance Budget] 超出预算:\n' + this.warnings.join('\n'));
    }
  }
}

const perfMonitor = new PerformanceMonitor(PERFORMANCE_BUDGET);

function render() {
  const stats = {
    frameTime: 0,
    renderTime: 0,
    updateTime: 0,
    objectCount: objects.length
  };
  
  const frameStart = performance.now();
  
  // 更新逻辑
  const updateStart = performance.now();
  updateObjects();
  stats.updateTime = performance.now() - updateStart;
  
  // 渲染
  const renderStart = performance.now();
  drawObjects();
  stats.renderTime = performance.now() - renderStart;
  
  stats.frameTime = performance.now() - frameStart;
  
  perfMonitor.checkFrame(stats);
}
```

---

## 5. 真实案例分析

### 案例1：粒子系统性能问题

**现象**：粒子数量超过5000时，FPS 从60降至15。

**分析**：
1. Performance 面板显示主线程黄色块密集
2. 定位到 `updateParticles` 函数耗时40ms
3. 代码中每帧遍历所有粒子，进行三角函数计算

**优化**：
- 使用对象池减少 GC 开销
- 预计算三角函数表
- 使用 Web Worker 进行粒子更新
- 实现粒子分级（远处粒子降低更新频率）

**结果**：FPS 提升至55，粒子数量可达10000。

### 案例2：拖拽卡顿

**现象**：拖拽大量图形时，鼠标明显延迟。

**分析**：
1. 每次 `mousemove` 触发完整重绘（clearRect + 绘制所有对象）
2. 未使用脏矩形优化
3. 事件处理频率过高（300次/秒）

**优化**：
- 实现脏矩形渲染
- 使用 `requestAnimationFrame` 节流事件处理
- 拖拽时只重绘受影响区域

**结果**：拖拽流畅度提升至60 FPS。

---

## 6. 性能优化检查清单

**渲染层面**：
- [ ] 使用 `requestAnimationFrame` 而非 `setInterval`
- [ ] 实现脏矩形渲染，避免全屏重绘
- [ ] 静态内容使用分层 Canvas
- [ ] 离屏 Canvas 缓存复杂图形
- [ ] 避免不必要的状态切换（fillStyle、lineWidth）

**计算层面**：
- [ ] 使用空间分割算法优化碰撞检测
- [ ] 缓存计算结果（边界框、路径、矩阵）
- [ ] 批量处理相同操作
- [ ] 复杂计算移至 Web Worker

**内存层面**：
- [ ] 实现对象池复用对象
- [ ] 移除不再使用的事件监听器
- [ ] 设置缓存上限（LRU）
- [ ] 及时释放大对象引用

**绘制层面**：
- [ ] 使用整数坐标（避免亚像素渲染）
- [ ] 合并路径减少 `draw` 调用
- [ ] 避免频繁 `getImageData`
- [ ] 高 DPI 适配

---

## 本章小结

性能分析的核心流程：

1. **测量**：使用 Performance API 和 FPS 监控量化问题
2. **定位**：使用 Chrome DevTools 识别瓶颈类型（渲染/计算/内存）
3. **优化**：针对性采用优化方案
4. **验证**：对比优化前后数据，确认效果
5. **预算**：设定性能预算，持续监控

记住：**过早优化是万恶之源**。先用工具找到真正的瓶颈，再进行针对性优化，而不是盲目应用所有优化技巧。

在下一章，我们将对比 Canvas 与 SVG 的特性与适用场景，帮助你做出正确的技术选型决策。
