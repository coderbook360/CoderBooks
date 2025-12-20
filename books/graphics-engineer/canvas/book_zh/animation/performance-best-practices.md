# Canvas 绘制性能最佳实践

前面的章节我们学习了许多优化技术——离屏渲染、分层、脏矩形、帧率控制。现在要问一个关键问题：如何系统性地构建高性能的 Canvas 应用？

本章将这些技术整合为完整的最佳实践指南，并补充更多实用的优化技巧。

---

## 1. 性能问题识别

### 常见症状

- **帧率下降**：动画不流畅，出现卡顿
- **响应延迟**：用户交互响应慢
- **内存持续增长**：最终导致崩溃
- **CPU 占用过高**：影响其他任务

### 测量方法

使用 **Performance API** 测量帧时间：

```javascript
class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.maxSamples = 60;
  }
  
  startFrame() {
    this.frameStart = performance.now();
  }
  
  endFrame() {
    const frameTime = performance.now() - this.frameStart;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }
  }
  
  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }
  
  getFPS() {
    const avg = this.getAverageFrameTime();
    return avg > 0 ? 1000 / avg : 0;
  }
  
  draw(ctx) {
    const fps = this.getFPS().toFixed(1);
    const frameTime = this.getAverageFrameTime().toFixed(2);
    
    ctx.fillStyle = 'black';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Frame: ${frameTime}ms`, 10, 40);
  }
}

// 使用
const monitor = new PerformanceMonitor();

function animate() {
  monitor.startFrame();
  
  // 你的渲染代码
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ...
  
  monitor.endFrame();
  monitor.draw(ctx);
  
  requestAnimationFrame(animate);
}
```

---

## 2. 绘制操作成本排序

不同的 Canvas 操作性能差异巨大，了解它们的成本是优化的基础。

### 操作成本（从低到高）

1. **fillRect / clearRect** - 最快
2. **drawImage** - 非常快
3. **fill / stroke 简单路径** - 较快
4. **fill / stroke 复杂路径** - 较慢
5. **绘制带阴影的图形** - 慢
6. **使用滤镜** - 很慢
7. **getImageData / putImageData** - 极慢

### 优化策略

- 优先使用 `fillRect` 和 `drawImage`
- 复杂图形预渲染到离屏 Canvas
- 限制阴影和滤镜的使用
- 避免在动画循环中调用 `getImageData`

---

## 3. 减少状态切换

改变 Canvas 状态（颜色、字体、变换等）有性能开销。**批量相同状态的操作**能显著提升性能。

### 错误做法

```javascript
// 每个对象单独设置状态
objects.forEach(obj => {
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
});
```

每次循环都切换 `fillStyle`，开销大。

### 正确做法

```javascript
// 按颜色分组批量绘制
function groupByColor(objects) {
  const groups = new Map();
  for (const obj of objects) {
    if (!groups.has(obj.color)) {
      groups.set(obj.color, []);
    }
    groups.get(obj.color).push(obj);
  }
  return groups;
}

const groups = groupByColor(objects);
for (const [color, objs] of groups) {
  ctx.fillStyle = color;  // 只设置一次
  objs.forEach(obj => {
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  });
}
```

状态切换次数从 N 减少到颜色种类数。

---

## 4. 路径批量绘制

每次 `beginPath()` → `fill()` 都有开销。合并多个图形到一个路径能大幅提升性能。

### 错误做法

```javascript
// 每个圆单独绘制
circles.forEach(c => {
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
});
```

### 正确做法

```javascript
// 合并到单个路径
ctx.beginPath();
circles.forEach(c => {
  ctx.moveTo(c.x + c.r, c.y);  // 关键：移动到起点
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
});
ctx.fill();
```

**注意**：必须在每个子路径前调用 `moveTo()`，否则会出现连线。

---

## 5. 路径复用（Path2D）

复杂路径的构建很耗时。使用 `Path2D` 创建一次，多次使用。

```javascript
// 创建星形路径（只需一次）
const starPath = new Path2D();
for (let i = 0; i < 5; i++) {
  const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
  const x = Math.cos(angle) * 50;
  const y = Math.sin(angle) * 50;
  if (i === 0) starPath.moveTo(x, y);
  else starPath.lineTo(x, y);
}
starPath.closePath();

// 绘制多个星星
for (const star of stars) {
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.fillStyle = star.color;
  ctx.fill(starPath);  // 复用路径
  ctx.restore();
}
```

---

## 6. 整数坐标优化

浮点坐标会触发**子像素渲染**（anti-aliasing），比整数坐标慢。

```javascript
// 慢：子像素渲染
ctx.fillRect(10.3, 20.7, 50, 50);

// 快：整数坐标
ctx.fillRect(Math.round(10.3), Math.round(20.7), 50, 50);
```

### 1px 线条的特殊情况

Canvas 坐标系中，整数坐标位于像素**中心**。绘制 1px 线条时需要 **0.5 偏移**：

```javascript
ctx.lineWidth = 1;

// 模糊的 1px 线
ctx.moveTo(100, 50);
ctx.lineTo(100, 150);

// 清晰的 1px 线
ctx.moveTo(100.5, 50.5);
ctx.lineTo(100.5, 150.5);
```

---

## 7. 避免频繁的像素操作

`getImageData` 和 `putImageData` 极其耗时，因为涉及 CPU-GPU 数据传输。

### 错误做法

```javascript
function animate() {
  const imageData = ctx.getImageData(0, 0, w, h);  // 慢！
  // 处理像素
  ctx.putImageData(imageData, 0, 0);  // 慢！
  requestAnimationFrame(animate);
}
```

### 优化策略

- 使用 **CSS 滤镜**代替像素操作（如模糊、灰度）
- 如果必须操作像素，降低频率或分辨率
- 考虑使用 **WebGL** 处理大量像素

---

## 8. 图像缓存

重复绘制相同图像时，避免重复加载。

```javascript
class ImageCache {
  constructor() {
    this.cache = new Map();
  }
  
  load(url) {
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  get(url) {
    return this.cache.get(url);
  }
}

const imageCache = new ImageCache();
await imageCache.load('sprite.png');

function draw() {
  const img = imageCache.get('sprite.png');
  ctx.drawImage(img, 0, 0);
}
```

---

## 9. 对象复用与内存管理

频繁创建和销毁对象会触发垃圾回收，导致卡顿。

### 对象池模式

```javascript
class ObjectPool {
  constructor(factory, size) {
    this.pool = [];
    for (let i = 0; i < size; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire() {
    return this.pool.pop() || null;
  }
  
  release(obj) {
    obj.reset();  // 重置状态
    this.pool.push(obj);
  }
}

// 使用
const bulletPool = new ObjectPool(() => new Bullet(), 100);

function fire() {
  const bullet = bulletPool.acquire();
  if (bullet) {
    bullet.activate(x, y);
  }
}

function update() {
  bullets.forEach(b => {
    if (b.isDead()) {
      bulletPool.release(b);  // 回收
    }
  });
}
```

---

## 10. Chrome DevTools 分析

使用 Chrome 的 **Performance** 面板精确定位性能瓶颈。

### 使用步骤

1. 打开 DevTools → **Performance** 面板
2. 点击 **录制按钮**（圆圈）
3. 执行你要分析的操作
4. 点击 **停止**
5. 分析 **Frames** 区域和 **Main** 线程

### 关键指标

- **FPS**：绿色柱越高越好，红色表示掉帧
- **Scripting**（黄色）：JavaScript 执行时间
- **Rendering**（紫色）：Canvas 绘制时间
- **Painting**（绿色）：像素填充时间

---

## 11. 性能优化检查清单

完成项目后，用这份清单检查：

- [ ] 使用 `requestAnimationFrame` 而非 `setInterval`
- [ ] 避免在动画循环中创建对象
- [ ] 批量相同状态的绘制操作
- [ ] 使用整数坐标
- [ ] 复用 `Path2D` 对象
- [ ] 使用离屏 Canvas 缓存复杂图形
- [ ] 使用分层 Canvas 分离静态和动态内容
- [ ] 限制阴影和滤镜的使用
- [ ] 避免频繁的 `getImageData`
- [ ] 使用对象池复用对象
- [ ] 适当降低分辨率（如移动端使用 `devicePixelRatio / 2`）
- [ ] 使用 CSS `will-change: transform` 提示 GPU 加速

---

## 12. 权衡与边界

### 过度优化的代价

优化是有成本的：
- **代码复杂度增加**：批量绘制、对象池等增加代码量
- **可维护性下降**：过多优化让代码难以理解
- **开发时间延长**：提前优化可能浪费时间

### 优化原则

1. **测量优先**：先用工具找到真正的瓶颈
2. **渐进优化**：从影响最大的问题开始
3. **保持简洁**：只在必要时优化
4. **文档化**：复杂优化需要注释说明

---

## 本章小结

Canvas 性能优化的核心原则：
- **测量优先**：用工具找到真正的瓶颈
- **减少开销**：批量操作、复用对象、降低复杂度
- **分而治之**：离屏渲染、分层、脏矩形
- **合理权衡**：性能与代码复杂度之间找平衡

掌握这些最佳实践后，你就能构建高性能的 Canvas 应用。下一部分，我们将进入对象模型设计，学习如何构建可维护的图形应用架构。
