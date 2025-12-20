# 章节写作指导：高 DPI 屏幕适配

## 1. 章节信息（强制性基础信息）
- **章节标题**: 高 DPI 屏幕适配
- **文件名**: high-dpi.md
- **所属部分**: 第九部分：高级主题
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标（验收清单）

### 知识目标
- 理解高 DPI 屏幕（Retina）的特性
- 掌握 devicePixelRatio 的概念和作用
- 了解 Canvas 模糊问题的成因
- 认识适配高 DPI 屏幕的解决方案

### 技能目标
- 能够检测设备的 devicePixelRatio
- 能够正确设置 Canvas 的尺寸以适配高 DPI
- 能够处理 Canvas 上下文的缩放
- 掌握高 DPI 适配对性能的影响

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **DPI（Dots Per Inch）**: 每英寸的像素点数
- **物理像素**: 屏幕的实际像素
- **CSS 像素**: 逻辑像素，用于布局
- **devicePixelRatio**: 物理像素与 CSS 像素的比值
- **Retina 屏幕**: 高分辨率屏幕，通常 DPR ≥ 2
- **Canvas 模糊**: 未适配高 DPI 导致的绘制模糊

### 关键知识点（必须全部覆盖）
- 为什么 Canvas 在高 DPI 屏幕上会模糊
- 如何获取 devicePixelRatio
- 如何正确设置 Canvas 的 width/height 和 style
- 如何缩放绘图上下文
- 如何处理坐标转换
- 高 DPI 适配对性能的影响

## 4. 写作要求（结构规范）

- **开篇方式**: 
  - 从实际问题引入："在 MacBook 的 Retina 屏幕上，Canvas 绘制的图形看起来很模糊"
  - 展示对比图：适配前后的清晰度差异
  - 提出核心问题："为什么会模糊？如何解决？"

- **结构组织**: 
  1. **问题现象**：展示 Canvas 在高 DPI 屏幕上的模糊问题
  2. **原理分析**：解释物理像素、CSS 像素、DPR 的关系
  3. **解决方案**：详细讲解适配方法
  4. **完整实现**：提供完整的适配代码
  5. **坐标转换**：处理适配后的坐标问题
  6. **动态适配**：监听 DPR 变化（跨屏拖动）
  7. **性能考虑**：高 DPI 适配的性能影响
  8. **完整示例**：综合展示适配方案
  9. **章节小结**：总结高 DPI 适配的核心要点

- **代码示例**: 
  - **示例 1**: 基础的高 DPI 适配代码（约 30-40 行）
  - **示例 2**: 集成到 Canvas 类的实现（约 40-50 行）
  - **示例 3**: 动态监听 DPR 变化（约 30-40 行）
  - **示例 4**: 坐标转换处理（约 20-30 行）

- **图表需求**: 
  - 需要一个对比图：适配前后的视觉效果
  - 需要一个示意图：物理像素与 CSS 像素的关系
  - 需要一个代码注释图：标注 Canvas 尺寸设置的各个部分

## 5. 技术细节（技术规范）

- **源码参考**: 
  - MDN 文档：Canvas API
  - Fabric.js 的高 DPI 适配实现
  - Konva.js 的 pixelRatio 处理

- **实现要点**: 
  1. **基础适配代码**: 
     ```javascript
     function setupCanvas(canvas) {
       // 获取设备像素比
       const dpr = window.devicePixelRatio || 1;
       
       // 获取 CSS 尺寸
       const rect = canvas.getBoundingClientRect();
       
       // 设置 Canvas 的实际尺寸（物理像素）
       canvas.width = rect.width * dpr;
       canvas.height = rect.height * dpr;
       
       // 设置 Canvas 的显示尺寸（CSS 像素）
       canvas.style.width = rect.width + 'px';
       canvas.style.height = rect.height + 'px';
       
       // 缩放绘图上下文
       const ctx = canvas.getContext('2d');
       ctx.scale(dpr, dpr);
       
       return ctx;
     }
     ```
  
  2. **集成到 Canvas 类**: 
     ```javascript
     class Canvas {
       constructor(container, options = {}) {
         this.container = container;
         this.width = options.width || container.clientWidth;
         this.height = options.height || container.clientHeight;
         
         // 创建 Canvas 元素
         this.canvas = document.createElement('canvas');
         this.ctx = this.canvas.getContext('2d');
         container.appendChild(this.canvas);
         
         this._setupHighDPI();
         this._listenDPRChange();
       }
       
       _setupHighDPI() {
         const dpr = window.devicePixelRatio || 1;
         
         // 保存原始尺寸
         this._logicalWidth = this.width;
         this._logicalHeight = this.height;
         
         // 设置物理尺寸
         this.canvas.width = this.width * dpr;
         this.canvas.height = this.height * dpr;
         
         // 设置 CSS 尺寸
         this.canvas.style.width = this.width + 'px';
         this.canvas.style.height = this.height + 'px';
         
         // 缩放上下文
         this.ctx.scale(dpr, dpr);
         
         // 保存 DPR
         this._currentDPR = dpr;
       }
       
       resize(width, height) {
         this.width = width;
         this.height = height;
         this._setupHighDPI();
         this.requestRender();
       }
     }
     ```
  
  3. **动态监听 DPR 变化**: 
     ```javascript
     _listenDPRChange() {
       // 使用 matchMedia 监听 DPR 变化
       const mediaQuery = window.matchMedia(
         `(resolution: ${window.devicePixelRatio}dppx)`
       );
       
       const handleDPRChange = () => {
         const newDPR = window.devicePixelRatio || 1;
         
         if (newDPR !== this._currentDPR) {
           console.log('DPR 变化:', this._currentDPR, '->', newDPR);
           this._setupHighDPI();
           this.requestRender();
         }
       };
       
       // 监听变化
       if (mediaQuery.addEventListener) {
         mediaQuery.addEventListener('change', handleDPRChange);
       } else {
         // 降级方案
         mediaQuery.addListener(handleDPRChange);
       }
       
       // 保存清理函数
       this._removeDPRListener = () => {
         if (mediaQuery.removeEventListener) {
           mediaQuery.removeEventListener('change', handleDPRChange);
         } else {
           mediaQuery.removeListener(handleDPRChange);
         }
       };
     }
     
     dispose() {
       if (this._removeDPRListener) {
         this._removeDPRListener();
       }
       // ... 其他清理
     }
     ```
  
  4. **坐标转换**: 
     ```javascript
     // 获取鼠标在 Canvas 上的坐标
     getCanvasCoordinates(clientX, clientY) {
       const rect = this.canvas.getBoundingClientRect();
       
       // 计算相对于 Canvas 的位置（CSS 像素）
       const x = clientX - rect.left;
       const y = clientY - rect.top;
       
       // 不需要除以 DPR，因为 ctx.scale() 已经处理了
       return { x, y };
     }
     ```
  
  5. **绘制注意事项**: 
     ```javascript
     render() {
       // 清空画布时使用物理尺寸
       this.ctx.clearRect(0, 0, this._logicalWidth, this._logicalHeight);
       
       // 绘制时使用逻辑尺寸（CSS 像素）
       this.objects.forEach(obj => {
         obj.render(this.ctx);
       });
     }
     ```
  
  6. **图片绘制优化**: 
     ```javascript
     class ImageObject extends BaseObject {
       render(ctx) {
         const dpr = window.devicePixelRatio || 1;
         
         // 使用高分辨率图片
         if (this.imageHiRes && dpr >= 2) {
           ctx.drawImage(
             this.imageHiRes,
             this.x, this.y,
             this.width, this.height
           );
         } else {
           ctx.drawImage(
             this.image,
             this.x, this.y,
             this.width, this.height
           );
         }
       }
     }
     ```
  
  7. **性能优化建议**: 
     ```javascript
     class Canvas {
       constructor(container, options = {}) {
         // ... 其他初始化
         
         // 可选：限制最大 DPR
         this.maxDPR = options.maxDPR || 2;
       }
       
       _setupHighDPI() {
         let dpr = window.devicePixelRatio || 1;
         
         // 限制最大 DPR 以保证性能
         if (this.maxDPR) {
           dpr = Math.min(dpr, this.maxDPR);
         }
         
         // ... 后续代码
       }
     }
     ```

- **常见问题**: 
  - **问题 1**: "为什么设置了 canvas.width 后，样式尺寸也变了？"
    - **解答**: 需要同时设置 canvas.style.width 来控制显示尺寸
  - **问题 2**: "适配后，鼠标坐标不准确？"
    - **解答**: 使用 CSS 像素即可，ctx.scale() 已经处理了转换
  - **问题 3**: "高 DPI 适配会影响性能吗？"
    - **解答**: 会增加像素数量，可以考虑限制最大 DPR

## 6. 风格指导（表达规范）

- **语气语调**: 
  - 从"提升视觉质量"的角度出发，强调适配的必要性
  - 用对比图直观展示适配前后的差异
  - 对技术细节提供清晰的代码示例和注释

- **类比方向**: 
  - 类比 1：高 DPI 屏幕像是"高清电视"，需要高分辨率内容才清晰
  - 类比 2：物理像素与 CSS 像素的关系像是"1元可以买2个糖"，DPR=2时，1个 CSS 像素对应2个物理像素
  - 类比 3：ctx.scale() 像是"放大镜"，让绘制内容自动适配高分辨率

## 7. 章节检查清单

- [ ] 目标明确：读者是否理解了高 DPI 适配的原理和实现
- [ ] 术语统一：DPI、DPR、物理像素、CSS 像素等术语定义清晰
- [ ] 最小实现：提供了完整的适配代码
- [ ] 边界处理：说明了 DPR 变化、性能限制等情况
- [ ] 性能与权衡：详细讨论了高 DPI 对性能的影响
- [ ] 替代方案：讨论了限制最大 DPR 的优化策略
- [ ] 图示与代码：对比图、示意图与代码实现相互呼应
- [ ] 总结与练习：建议读者测试不同 DPR 设备上的表现

## 8. 写作建议与注意事项

### 重点强调
- 高 DPI 适配是现代 Web 应用的基本要求，直接影响视觉质量
- ctx.scale() 是关键步骤，简化了后续绘制代码
- 动态监听 DPR 变化可以处理跨屏拖动的场景

### 常见误区
- 不要只设置 canvas.width 而忘记 canvas.style.width
- 不要在坐标计算中手动除以 DPR，ctx.scale() 已经处理
- 不要忽视性能影响，高 DPR 会显著增加像素数量

### 推荐实现细节

1. **辅助函数**: 
   ```javascript
   function getBackingStoreRatio(ctx) {
     return ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;
   }
   
   function getPixelRatio() {
     const dpr = window.devicePixelRatio || 1;
     const bsr = getBackingStoreRatio(ctx);
     return dpr / bsr;
   }
   ```

2. **调试工具**: 
   ```javascript
   function debugDPR(canvas) {
     console.log('CSS 尺寸:', canvas.style.width, canvas.style.height);
     console.log('Canvas 尺寸:', canvas.width, canvas.height);
     console.log('DPR:', window.devicePixelRatio);
     console.log('计算的物理像素:', 
       parseFloat(canvas.style.width) * window.devicePixelRatio,
       parseFloat(canvas.style.height) * window.devicePixelRatio
     );
   }
   ```

### 参考资料推荐
- MDN 文档：devicePixelRatio
- "High DPI Canvas" by Paul Irish
- HTML5 Rocks: "Improving HTML5 Canvas Performance"
- Fabric.js 源码：高 DPI 适配部分
