# 章节写作指导：Web Worker 与多线程图形处理

## 1. 章节信息（强制性基础信息）
- **章节标题**: Web Worker 与多线程图形处理
- **文件名**: webworker-graphics.md
- **所属部分**: 第九部分：高级主题
- **预计阅读时间**: 25 分钟
- **难度等级**: 高级

## 2. 学习目标（验收清单）

### 知识目标
- 理解主线程与 Worker 的通信模型
- 掌握 OffscreenCanvas 的用途与局限
- 了解可转移对象（transferable）的性能优势
- 明确何时采用多线程以及适用场景

### 技能目标
- 能在 Worker 中创建并渲染 OffscreenCanvas
- 能在主线程与 Worker 间传递图像数据或指令
- 能实现渲染任务拆分与合并的基本策略
- 能定位并避免常见的同步与数据复制问题

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **主线程与 Worker**：消息驱动、无共享 DOM、不可直接操作主线程 Canvas
- **OffscreenCanvas**：在 Worker 中使用 2D 或 WebGL 渲染
- **Transferable vs Structured Clone**：ArrayBuffer、ImageBitmap 的转移与复制
- **消息协议**：定义命令、参数、返回值与错误通道
- **任务划分**：渲染分片、预计算、滤镜、矢量到位图转换

### 关键知识点（必须全部覆盖）
- 创建 Worker、监听 message、postMessage API
- 将 <canvas> 转为 OffscreenCanvas 并转移到 Worker
- 在 Worker 内部获取 context 并执行绘制
- 使用 ImageBitmap/ArrayBuffer 传输图像数据以减少拷贝
- 多 Worker 协作与合并策略（tile 分片、z-order 合成）
- 错误与超时处理（异常回传、取消请求）

## 4. 写作要求（结构规范）

- **开篇方式**：
  - 从界面卡顿的痛点切入：主线程渲染 + 交互易阻塞
  - 给出解决思路：把耗时渲染或预处理放到 Worker
  - 提出章节主线：如何在 Worker 中绘制 Canvas 并与主线程协作

- **结构组织**：
  1. 主线程-Worker 模型与适用场景
  2. 基础通信：消息格式、命令协议、错误处理
  3. OffscreenCanvas 基础与浏览器支持
  4. 单 Worker 渲染流程（主线程创建、转移、回传）
  5. 多 Worker 分片渲染与合并策略
  6. Transferable 对象与性能优化
  7. 典型案例：滤镜预处理 / 瓦片渲染 / 矢量栅格化
  8. 调试与陷阱：同步问题、内存占用、兼容性
  9. 完整示例：可配置的 Worker 渲染流水线
  10. 小结：何时用、如何用、用后检查点

- **代码示例**：
  - 示例 1：创建 Worker 与基础通信（30-40 行）
  - 示例 2：OffscreenCanvas 渲染（50-60 行）
  - 示例 3：分片渲染与合并（60-80 行）
  - 示例 4：使用 ImageBitmap 作为可转移对象（40-50 行）
  - 示例 5：完整渲染管线（80-100 行）

- **图表需求**：
  - 一张消息流时序图：主线程 -> Worker -> 主线程
  - 一张分片渲染示意图：tile 合成流程

## 5. 技术细节（技术规范）

- **浏览器支持提示**：
  - OffscreenCanvas 支持 Chrome/Edge/Firefox（需注意版本），Safari 仍有限制
  - Fallback：无 OffscreenCanvas 时退回主线程渲染或用 OffscreenCanvas polyfill（受限）

- **实现要点**：

  1) **主线程创建 Worker 与协议**
  ```javascript
  // main.js
  const worker = new Worker('renderer.js', { type: 'module' });

  // 简单协议：cmd + payload + reqId
  const request = (cmd, payload) => new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID();
    const onMessage = (event) => {
      const { type, reqId: id, data, error } = event.data;
      if (id !== reqId) return;
      worker.removeEventListener('message', onMessage);
      if (type === 'error') reject(error);
      else resolve(data);
    };
    worker.addEventListener('message', onMessage);
    worker.postMessage({ cmd, reqId, payload });
  });
  ```

  2) **转移 OffscreenCanvas 到 Worker**
  ```javascript
  // main.js
  const canvas = document.querySelector('#view');
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ cmd: 'init', canvas: offscreen }, [offscreen]); // transfer
  ```

  3) **Worker 内部获取上下文并渲染**
  ```javascript
  // renderer.js
  let ctx, width, height;

  self.onmessage = async (event) => {
    const { cmd, reqId, payload, canvas } = event.data;
    try {
      if (cmd === 'init') {
        ctx = canvas.getContext('2d');
        width = canvas.width;
        height = canvas.height;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);
        return reply(reqId, 'ok');
      }
      if (cmd === 'draw') {
        const { shapes } = payload;
        renderShapes(shapes);
        return reply(reqId, 'ok');
      }
      if (cmd === 'resize') {
        width = payload.width; height = payload.height;
        ctx.canvas.width = width; ctx.canvas.height = height;
        return reply(reqId, 'ok');
      }
      reply(reqId, 'noop');
    } catch (error) {
      replyError(reqId, error.message);
    }
  };

  function renderShapes(shapes) {
    ctx.clearRect(0, 0, width, height);
    shapes.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation || 0);
      ctx.fillStyle = s.fill || '#09f';
      ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    });
  }

  function reply(reqId, data) {
    self.postMessage({ type: 'result', reqId, data });
  }
  function replyError(reqId, error) {
    self.postMessage({ type: 'error', reqId, error });
  }
  ```

  4) **分片（tile）渲染与合并**
  ```javascript
  // main.js
  async function renderTiles(tiles) {
    const bitmaps = await Promise.all(
      tiles.map(tile => request('renderTile', tile)) // Worker 返回 ImageBitmap
    );
    const ctx = canvas.getContext('2d');
    bitmaps.forEach((bmp, i) => {
      const { x, y, w, h } = tiles[i];
      ctx.drawImage(bmp, x, y, w, h);
    });
  }
  ```

  ```javascript
  // renderer.js (tile 渲染)
  if (cmd === 'renderTile') {
    const { x, y, w, h, shapes } = payload;
    const off = new OffscreenCanvas(w, h);
    const c = off.getContext('2d');
    c.translate(-x, -y);
    renderShapes(shapes); // 复用 renderShapes（可加裁剪）
    const bitmap = off.transferToImageBitmap(); // transferable，零拷贝
    return reply(reqId, bitmap, [bitmap]);
  }
  ```

  5) **使用可转移对象减少复制**
  ```javascript
  // 传递 ImageBitmap / ArrayBuffer
  worker.postMessage({ cmd: 'process', buffer }, [buffer]);
  // buffer 在主线程变为 detached，提高性能
  ```

  6) **错误与超时处理**
  - 为每个请求设置超时，防止 Worker 卡死：`Promise.race([request, timeout])`
  - Worker 抛错时回传错误信息，主线程记录并降级

- **常见问题**：
  - **问题 1**：Safari 不支持 OffscreenCanvas 直接在 Worker 渲染
    - **解答**：降级为主线程渲染，或使用 ImageBitmap + 主线程合成
  - **问题 2**：传输大图导致卡顿
    - **解答**：使用 ImageBitmap/ArrayBuffer 作为 transferable，避免深拷贝
  - **问题 3**：多 Worker 竞争资源
    - **解答**：限制 Worker 数量（CPU 核心数），使用任务队列
  - **问题 4**：渲染结果不同步
    - **解答**：引入帧号/版本号，丢弃过期结果

## 6. 风格指导（表达规范）
- 语气：以性能优化和用户体验为导向，强调“减少卡顿、保持交互顺滑”。
- 表述：用“拆分-并行-合并”的顺序解释思路；对兼容性给明确 fallback 建议。
- 类比：
  - Worker 像“外包工厂”，主线程发指令、收成品；
  - Transferable 像“搬运货柜”直接过户，避免重复装卸；
  - 瓦片渲染像“拼图印刷”，分块印刷后拼合。

## 7. 章节检查清单
- [ ] 是否讲清楚主线程与 Worker 的通信模型与协议
- [ ] 是否覆盖 OffscreenCanvas 的创建、转移、上下文获取
- [ ] 是否提供可转移对象的示例（ImageBitmap/ArrayBuffer）
- [ ] 是否给出分片渲染与合并的流程与代码
- [ ] 是否说明浏览器支持与降级方案
- [ ] 是否提供错误与超时处理策略
- [ ] 是否有完整可运行的渲染管线示例
- [ ] 是否提醒资源释放（URL.revokeObjectURL、bitmap.close 等）

## 8. 写作建议与注意事项

### 重点强调
- 什么时候值得用 Worker：重 CPU 预处理、复杂滤镜、批量矢量栅格化、大尺寸合成
- OffscreenCanvas 支持有限，始终提供降级路径
- Transferable 对象显著降低复制开销

### 常见误区
- 以为 Worker 能直接操作 DOM/主线程 Canvas（澄清不能）
- 忽视消息协议与错误通道，导致调试困难
- 忽视版本/帧号，导致旧结果覆盖新画面

### 推荐实践
1. 设计清晰的消息协议（cmd、payload、reqId、error）。
2. 统一的任务调度与超时处理，防止 Worker 假死。
3. 引入性能指标（渲染耗时、主线程阻塞时间）做回归。
4. 在不支持 OffscreenCanvas 的环境下自动降级并提示。

### 参考资料推荐
- MDN：Web Workers API
- MDN：OffscreenCanvas
- Google Developers："OffscreenCanvas" 指南
- Fabric.js / Rough.js 对 Worker 的相关实践
