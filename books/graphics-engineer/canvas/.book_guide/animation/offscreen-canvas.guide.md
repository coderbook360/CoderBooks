# 章节写作指导：离屏 Canvas 与缓存优化

## 1. 章节信息

- **章节标题**: 离屏 Canvas 与缓存优化
- **文件名**: animation/offscreen-canvas.md
- **所属部分**: 第六部分：动画与渲染优化
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解离屏 Canvas 的概念和用途
- 掌握使用离屏 Canvas 进行预渲染
- 理解 OffscreenCanvas API 与 Web Worker
- 掌握缓存策略的设计

### 技能目标
- 能够创建和使用离屏 Canvas 缓存
- 能够实现复杂图形的预渲染
- 能够评估缓存的收益
- 能够管理缓存的生命周期

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **离屏 Canvas** | 不显示在页面上的 Canvas，用于预渲染 |
| **预渲染** | 提前将复杂图形渲染到缓存中 |
| **OffscreenCanvas** | 可在 Web Worker 中使用的 Canvas API |
| **缓存失效** | 缓存内容过期需要重新生成 |

### 关键知识点

- 创建离屏 Canvas（document.createElement）
- 将离屏 Canvas 作为图像源绘制
- OffscreenCanvas API
- 缓存策略：何时缓存、何时失效
- 内存管理与缓存清理

### 边界与限制

- 缓存占用内存
- 缓存失效的处理
- OffscreenCanvas 的浏览器兼容性

## 4. 写作要求

### 开篇方式
从性能问题引入：如果一个复杂图形（如大量路径、阴影、滤镜）需要每帧重绘，会很慢。如果这个图形不常变化，能否先画好存起来，用的时候直接贴上去？

### 结构组织

```
1. 离屏 Canvas 概念
   - 什么是离屏 Canvas
   - 为什么使用离屏 Canvas
   - 适用场景
   
2. 创建与使用
   - 创建离屏 Canvas
   - 在离屏 Canvas 上绑制
   - 将离屏 Canvas 绘制到主 Canvas
   
3. 预渲染优化
   - 复杂图形预渲染
   - 图形对象缓存
   - 尺寸和分辨率
   
4. OffscreenCanvas API
   - 基本用法
   - 在 Web Worker 中使用
   - 与主线程通信
   
5. 缓存策略
   - 缓存命中与失效
   - 脏标记机制
   - 内存管理
   
6. 实际应用
   - 图形对象缓存类
   - 精灵动画缓存
   - 性能对比
   
7. 本章小结
```

### 代码示例

1. **创建离屏 Canvas 基础**
2. **复杂图形预渲染**
3. **带缓存的图形对象**
4. **OffscreenCanvas + Web Worker**
5. **缓存管理器**

### 图表需求

- **离屏渲染流程图**：展示预渲染和绘制的流程
- **缓存策略示意图**：展示缓存命中和失效的判断

## 5. 技术细节

### 实现要点

```javascript
// 创建离屏 Canvas
function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 预渲染复杂图形
function prerenderComplex(width, height, drawFn) {
  const offscreen = createOffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  drawFn(ctx);
  return offscreen;
}

// 使用预渲染结果
const complexShape = prerenderComplex(100, 100, (ctx) => {
  // 复杂的绑制操作：阴影、渐变、多路径等
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  // ...更多复杂绑制
});

// 每帧只需绘制缓存的图像
function render() {
  mainCtx.drawImage(complexShape, x, y);
}

// 带缓存的图形对象
class CachedShape {
  constructor() {
    this._cache = null;
    this._cacheDirty = true;
    this._width = 100;
    this._height = 100;
  }
  
  // 属性变化时标记缓存失效
  set width(value) {
    if (this._width !== value) {
      this._width = value;
      this._cacheDirty = true;
    }
  }
  
  invalidateCache() {
    this._cacheDirty = true;
  }
  
  updateCache() {
    if (!this._cacheDirty) return;
    
    // 创建或调整缓存 Canvas
    if (!this._cache || 
        this._cache.width !== this._width ||
        this._cache.height !== this._height) {
      this._cache = createOffscreenCanvas(this._width, this._height);
    }
    
    const ctx = this._cache.getContext('2d');
    ctx.clearRect(0, 0, this._width, this._height);
    
    // 绑制到缓存
    this.drawToCache(ctx);
    
    this._cacheDirty = false;
  }
  
  drawToCache(ctx) {
    // 子类实现具体绘制
  }
  
  draw(mainCtx, x, y) {
    this.updateCache();
    mainCtx.drawImage(this._cache, x, y);
  }
}

// OffscreenCanvas + Web Worker
// main.js
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('render-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// render-worker.js
self.onmessage = (e) => {
  const canvas = e.data.canvas;
  const ctx = canvas.getContext('2d');
  
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绑制...
    requestAnimationFrame(render);
  }
  render();
};

// 缓存管理器
class CacheManager {
  constructor(maxSize = 50 * 1024 * 1024) {  // 50MB
    this.cache = new Map();
    this.currentSize = 0;
    this.maxSize = maxSize;
  }
  
  getCacheSize(canvas) {
    return canvas.width * canvas.height * 4;  // RGBA
  }
  
  set(key, canvas) {
    const size = this.getCacheSize(canvas);
    
    // 清理过期缓存以腾出空间
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      this.remove(oldestKey);
    }
    
    this.cache.set(key, { canvas, size });
    this.currentSize += size;
  }
  
  get(key) {
    const entry = this.cache.get(key);
    return entry ? entry.canvas : null;
  }
  
  remove(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
    }
  }
  
  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 缓存后图像模糊 | 考虑 devicePixelRatio |
| 内存占用过高 | 实现缓存大小限制和清理 |
| 缓存未更新 | 正确标记和处理脏状态 |
| OffscreenCanvas 不可用 | 使用常规离屏 Canvas 降级 |

## 6. 风格指导

### 语气语调
- 从性能优化角度出发
- 强调权衡和适用场景

### 类比方向
- 离屏 Canvas 类比"预先画好的贴纸"
- 缓存类比"做好的半成品"

## 7. 与其他章节的关系

### 前置依赖
- 第9章：图像绘制与处理

### 后续章节铺垫
- 为第50章"WebWorker 多线程"提供基础
- 为复杂图形渲染提供优化方案

## 8. 章节检查清单

- [ ] 目标明确：读者能实现离屏渲染和缓存优化
- [ ] 术语统一：离屏Canvas、缓存失效等术语定义清晰
- [ ] 最小实现：提供缓存图形类和管理器
- [ ] 边界处理：说明内存管理和兼容性
- [ ] 性能与权衡：讨论缓存的收益和成本
- [ ] 图示与代码：流程图与代码对应
- [ ] 总结与练习：提供缓存优化练习
