# WebWorker 高级：分片渲染与生产实践

在上一章我们掌握了 Worker 的基础通信和 OffscreenCanvas 渲染。现在我们要解决更复杂的问题：如何实现分片渲染加速、如何处理错误和超时、如何构建生产级的 Worker 渲染管线。

本章将回答以下问题：
- 如何实现分片渲染并合并结果？
- 如何处理 Worker 错误和超时？
- 典型应用场景有哪些？
- 如何调试和避免常见陷阱？

---

## 分片渲染：多 Worker 并行加速

现在我要问第一个问题：**如何实现分片渲染并合并结果？**

对于超大画布或复杂场景，可以将渲染任务拆分成多个"瓦片"（tiles），交给多个 Worker 并行处理，最后在主线程合并。这种策略类似于地图应用的瓦片加载。

### 分片渲染的基本流程

1. **主线程**：将画布划分为多个矩形区域（tiles）
2. **Worker 池**：每个 Worker 负责渲染一个 tile
3. **并行处理**：所有 tiles 同时渲染
4. **结果合并**：将各 tile 的 ImageBitmap 绘制到主 Canvas

### 完整实现

**主线程：任务分配与合并**

```javascript
// main.js
const TILE_SIZE = 256; // 每个瓦片 256x256
const WORKER_COUNT = 4; // 使用 4 个 Worker

// 创建 Worker 池
const workers = Array.from({ length: WORKER_COUNT }, (_, i) => {
  const worker = new Worker('tile-renderer.js', { type: 'module' });
  return { id: i, worker, busy: false };
});

// 将画布划分为 tiles
function getTiles(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y += TILE_SIZE) {
    for (let x = 0; x < width; x += TILE_SIZE) {
      tiles.push({
        x,
        y,
        width: Math.min(TILE_SIZE, width - x),
        height: Math.min(TILE_SIZE, height - y)
      });
    }
  }
  return tiles;
}

// 渲染单个 tile
async function renderTile(worker, tile, shapes) {
  return new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID();
    
    const onMessage = (event) => {
      const { type, reqId: id, bitmap, error } = event.data;
      if (id !== reqId) return;
      
      worker.worker.removeEventListener('message', onMessage);
      worker.busy = false;
      
      if (type === 'error') {
        reject(new Error(error));
      } else {
        resolve(bitmap);
      }
    };
    
    worker.worker.addEventListener('message', onMessage);
    worker.busy = true;
    
    worker.worker.postMessage({
      cmd: 'renderTile',
      reqId,
      tile,
      shapes
    });
  });
}

// 并行渲染所有 tiles
async function renderScene(canvas, shapes) {
  const ctx = canvas.getContext('2d');
  const tiles = getTiles(canvas.width, canvas.height);
  
  // 分配任务到 Worker 池
  const tasks = tiles.map(async (tile) => {
    // 等待空闲 Worker
    const worker = await getIdleWorker();
    const bitmap = await renderTile(worker, tile, shapes);
    return { tile, bitmap };
  });
  
  // 等待所有任务完成
  const results = await Promise.all(tasks);
  
  // 合并到主 Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  results.forEach(({ tile, bitmap }) => {
    ctx.drawImage(bitmap, tile.x, tile.y);
    bitmap.close(); // 释放 ImageBitmap 内存
  });
}

// 获取空闲 Worker（简单轮询）
async function getIdleWorker() {
  while (true) {
    const idle = workers.find(w => !w.busy);
    if (idle) return idle;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

**Worker 端：渲染单个 tile**

```javascript
// tile-renderer.js
self.onmessage = async (event) => {
  const { cmd, reqId, tile, shapes } = event.data;
  
  if (cmd === 'renderTile') {
    try {
      // 创建 tile 大小的离屏画布
      const canvas = new OffscreenCanvas(tile.width, tile.height);
      const ctx = canvas.getContext('2d');
      
      // 平移坐标系，只绘制可见部分
      ctx.translate(-tile.x, -tile.y);
      
      // 裁剪区域，避免绘制超出范围
      ctx.save();
      ctx.beginPath();
      ctx.rect(tile.x, tile.y, tile.width, tile.height);
      ctx.clip();
      
      // 渲染所有图形
      shapes.forEach(shape => {
        // 只渲染与 tile 相交的图形（可选优化）
        if (!intersectsTile(shape, tile)) return;
        
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation || 0);
        ctx.fillStyle = shape.fill || '#3498db';
        ctx.fillRect(
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height
        );
        ctx.restore();
      });
      
      ctx.restore();
      
      // 转换为 ImageBitmap 并传回（零拷贝）
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage({ type: 'result', reqId, bitmap }, [bitmap]);
      
    } catch (error) {
      self.postMessage({ type: 'error', reqId, error: error.message });
    }
  }
};

// 检测图形是否与 tile 相交
function intersectsTile(shape, tile) {
  const halfW = shape.width / 2;
  const halfH = shape.height / 2;
  const left = shape.x - halfW;
  const right = shape.x + halfW;
  const top = shape.y - halfH;
  const bottom = shape.y + halfH;
  
  return !(
    right < tile.x ||
    left > tile.x + tile.width ||
    bottom < tile.y ||
    top > tile.y + tile.height
  );
}
```

**性能优化点**：
1. **Worker 数量**：通常设置为 CPU 核心数（`navigator.hardwareConcurrency`）
2. **Tile 大小**：过小会增加合并开销，过大会降低并行度，256-512px 通常是较好的选择
3. **任务队列**：使用队列管理任务，避免 Worker 空闲
4. **裁剪优化**：只渲染与 tile 相交的图形，减少无效绘制

---

## 错误处理与超时控制

Worker 可能因为代码错误、无限循环或资源耗尽而卡死。健壮的系统需要错误处理和超时机制。

### 超时控制

```javascript
// main.js
function requestWithTimeout(cmd, payload, timeout = 5000) {
  return Promise.race([
    request(cmd, payload),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Worker 超时')), timeout)
    )
  ]);
}

// 使用
try {
  const result = await requestWithTimeout('draw', { shapes }, 3000);
  console.log('渲染完成', result);
} catch (error) {
  console.error('渲染失败:', error);
  // 重启 Worker 或降级到主线程
}
```

### 错误监听

```javascript
worker.addEventListener('error', (event) => {
  console.error('Worker 错误:', event.message, event.filename, event.lineno);
  // 尝试重启 Worker
  restartWorker();
});

worker.addEventListener('messageerror', (event) => {
  console.error('消息反序列化失败');
});
```

### Worker 重启策略

```javascript
function createWorker() {
  const worker = new Worker('renderer.js', { type: 'module' });
  
  worker.addEventListener('error', () => {
    console.warn('Worker 崩溃，正在重启...');
    worker.terminate();
    setTimeout(() => {
      const newWorker = createWorker();
      // 重新初始化...
    }, 100);
  });
  
  return worker;
}
```

---

## 典型应用场景

### 场景 1：图像滤镜预处理

```javascript
// 在 Worker 中应用高斯模糊
// renderer.js
function applyGaussianBlur(imageData, radius) {
  const { data, width, height } = imageData;
  // ... 卷积计算（CPU 密集型）
  return imageData;
}

self.onmessage = async (event) => {
  const { cmd, reqId, imageData, radius } = event.data;
  
  if (cmd === 'blur') {
    const result = applyGaussianBlur(imageData, radius);
    self.postMessage({ type: 'result', reqId, imageData: result });
  }
};
```

### 场景 2：矢量图形批量栅格化

```javascript
// 将 1000 个 SVG 路径转换为位图缓存
async function rasterizeShapes(shapes) {
  const bitmaps = await Promise.all(
    shapes.map(shape =>
      requestWithTimeout('rasterize', shape, 2000)
    )
  );
  return bitmaps;
}
```

### 场景 3：瓦片地图渲染

```javascript
// 动态加载和渲染地图瓦片
async function loadMapTile(x, y, zoom) {
  const tile = await request('renderMapTile', { x, y, zoom });
  ctx.drawImage(tile, x * TILE_SIZE, y * TILE_SIZE);
}
```

---

## 调试技巧与常见陷阱

### 调试 Worker

**Chrome DevTools**：
1. 打开 DevTools → Sources 面板
2. 在 Threads 区域可以看到所有 Worker 线程
3. 可以在 Worker 代码中设置断点
4. Console 面板可以切换到 Worker 上下文

**日志输出**：

```javascript
// Worker 中的 console.log 会显示在主线程控制台
console.log('[Worker]', '开始渲染', shapes.length, '个图形');
```

### 常见陷阱

**陷阱 1：忘记 transfer 导致性能下降**

```javascript
// ❌ 错误：会深拷贝 bitmap
worker.postMessage({ bitmap });

// ✅ 正确：转移所有权
worker.postMessage({ bitmap }, [bitmap]);
```

**陷阱 2：使用已 detached 的对象**

```javascript
const buffer = imageData.data.buffer;
worker.postMessage({ buffer }, [buffer]);
console.log(buffer.byteLength); // 0（已被转移）
// ❌ 错误：不能再使用 buffer
```

**陷阱 3：频繁创建和销毁 Worker**

Worker 的创建有一定开销，应该**复用 Worker 实例**：

```javascript
// ❌ 错误：每次都创建新 Worker
function render() {
  const worker = new Worker('renderer.js');
  // ...
  worker.terminate();
}

// ✅ 正确：复用 Worker
const worker = new Worker('renderer.js');
function render() {
  request('draw', shapes);
}
```

**陷阱 4：忽略版本/帧号导致画面错乱**

在动画场景下，后发送的请求可能先返回，导致旧画面覆盖新画面。解决方法是引入**帧号**：

```javascript
let currentFrame = 0;

async function renderFrame(shapes) {
  const frame = ++currentFrame;
  const result = await request('draw', { shapes, frame });
  
  // 只接受最新帧的结果
  if (result.frame === currentFrame) {
    // 显示结果
  } else {
    console.warn('丢弃过期帧', result.frame);
  }
}
```

---

## 完整示例：可配置的 Worker 渲染管线

下面是一个完整的、生产可用的 Worker 渲染系统：

```javascript
// WorkerRenderer.js
export class WorkerRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.workerCount = options.workerCount || navigator.hardwareConcurrency || 4;
    this.tileSize = options.tileSize || 256;
    this.timeout = options.timeout || 5000;
    this.workers = [];
    this.frameId = 0;
    
    this.init();
  }
  
  init() {
    // 检测 OffscreenCanvas 支持
    if (!('transferControlToOffscreen' in this.canvas)) {
      console.warn('OffscreenCanvas 不支持，降级到主线程渲染');
      this.fallbackMode = true;
      this.ctx = this.canvas.getContext('2d');
      return;
    }
    
    // 创建 Worker 池
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker('tile-renderer.js', { type: 'module' });
      this.workers.push({ id: i, worker, busy: false });
    }
  }
  
  async render(shapes) {
    const frameId = ++this.frameId;
    
    if (this.fallbackMode) {
      return this.renderOnMainThread(shapes);
    }
    
    try {
      const tiles = this.getTiles();
      const tasks = tiles.map(tile => this.renderTile(tile, shapes, frameId));
      const results = await Promise.all(tasks);
      
      // 只合并最新帧
      if (frameId === this.frameId) {
        this.composeTiles(results);
      }
    } catch (error) {
      console.error('Worker 渲染失败:', error);
      this.renderOnMainThread(shapes); // 降级
    }
  }
  
  getTiles() {
    const tiles = [];
    const { width, height } = this.canvas;
    
    for (let y = 0; y < height; y += this.tileSize) {
      for (let x = 0; x < width; x += this.tileSize) {
        tiles.push({
          x, y,
          width: Math.min(this.tileSize, width - x),
          height: Math.min(this.tileSize, height - y)
        });
      }
    }
    
    return tiles;
  }
  
  async renderTile(tile, shapes, frameId) {
    const worker = await this.getIdleWorker();
    
    return new Promise((resolve, reject) => {
      const reqId = crypto.randomUUID();
      const timeoutId = setTimeout(() => {
        reject(new Error('Tile 渲染超时'));
      }, this.timeout);
      
      const onMessage = (event) => {
        const { type, reqId: id, bitmap, error } = event.data;
        if (id !== reqId) return;
        
        clearTimeout(timeoutId);
        worker.worker.removeEventListener('message', onMessage);
        worker.busy = false;
        
        if (type === 'error') {
          reject(new Error(error));
        } else {
          resolve({ tile, bitmap, frameId });
        }
      };
      
      worker.worker.addEventListener('message', onMessage);
      worker.busy = true;
      
      worker.worker.postMessage({ cmd: 'renderTile', reqId, tile, shapes });
    });
  }
  
  async getIdleWorker() {
    while (true) {
      const idle = this.workers.find(w => !w.busy);
      if (idle) return idle;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  composeTiles(results) {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    results.forEach(({ tile, bitmap }) => {
      ctx.drawImage(bitmap, tile.x, tile.y);
      bitmap.close();
    });
  }
  
  renderOnMainThread(shapes) {
    const ctx = this.ctx || this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    shapes.forEach(shape => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation || 0);
      ctx.fillStyle = shape.fill || '#3498db';
      ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
      ctx.restore();
    });
  }
  
  destroy() {
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
  }
}

// 使用示例
const canvas = document.querySelector('#canvas');
const renderer = new WorkerRenderer(canvas, {
  workerCount: 4,
  tileSize: 256,
  timeout: 3000
});

// 渲染场景
const shapes = generateShapes(1000);
await renderer.render(shapes);

// 清理资源
renderer.destroy();
```

---

## 性能最佳实践

1. **Worker 数量**：设置为 CPU 核心数，避免过多竞争
2. **Tile 大小**：在并行度和合并开销之间权衡，通常 256-512px
3. **使用可转移对象**：对于大数据，始终使用 transfer，避免复制
4. **资源释放**：及时调用 `bitmap.close()`、`URL.revokeObjectURL()`
5. **任务调度**：使用队列管理任务，避免 Worker 空闲
6. **降级方案**：检测浏览器支持，提供主线程渲染降级
7. **版本控制**：引入帧号/版本号，丢弃过期结果

---

## 小结：何时用、如何用、用后检查

**何时使用 Worker？**
- ✅ 重 CPU 运算（滤镜、像素处理、矢量栅格化）
- ✅ 可并行拆分的任务（瓦片渲染、批量转换）
- ✅ 预计算或后台处理（缓存生成）
- ❌ 频繁与 DOM 交互
- ❌ 轻量级计算（通信开销大于计算）

**如何使用？**
1. 设计清晰的消息协议（cmd、reqId、payload）
2. 使用 OffscreenCanvas 在 Worker 中渲染
3. 使用可转移对象减少数据复制
4. 实现超时和错误处理机制
5. 检测浏览器支持并提供降级方案

**用后检查**：
- [ ] 是否使用了可转移对象？
- [ ] 是否处理了 Worker 错误和超时？
- [ ] 是否及时释放了资源（bitmap.close()）？
- [ ] 是否引入了版本号防止画面错乱？
- [ ] 是否提供了不支持 OffscreenCanvas 的降级方案？

通过 Worker，我们成功地将耗时的图形处理从主线程剥离，保持了界面的流畅响应。但是要注意，Worker 不是银弹，只有在真正需要时才使用，并始终提供降级方案，确保应用在所有环境下都能正常工作。
