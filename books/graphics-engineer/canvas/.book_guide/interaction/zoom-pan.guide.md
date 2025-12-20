# 章节写作指导：缩放与平移交互

## 1. 章节信息

- **章节标题**: 缩放与平移交互
- **文件名**: interaction/zoom-pan.md
- **所属部分**: 第五部分：事件与交互
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解视口（Viewport）的概念
- 掌握画布平移（Pan）的实现原理
- 掌握画布缩放（Zoom）的实现原理
- 理解缩放中心点的处理

### 技能目标
- 能够实现鼠标拖拽平移画布
- 能够实现鼠标滚轮缩放画布
- 能够实现以鼠标位置为中心的缩放
- 能够处理缩放和平移的边界约束

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **视口 (Viewport)** | 可见区域，类似相机看到的范围 |
| **平移 (Pan)** | 移动视口位置，查看不同区域 |
| **缩放 (Zoom)** | 改变视口大小，放大或缩小视图 |
| **缩放中心** | 缩放时保持固定的点 |

### 关键知识点

- 视口变换矩阵
- 平移状态管理
- 鼠标滚轮事件处理
- 以鼠标位置为中心缩放的数学
- 触摸手势：双指缩放
- 缩放和平移的范围限制

### 边界与限制

- 缩放范围限制（最小/最大缩放比例）
- 平移边界限制
- 缩放后坐标转换的更新
- 触摸手势的兼容性

## 4. 写作要求

### 开篇方式
从地图应用引入：像 Google Maps 那样，可以拖拽平移查看不同区域，滚轮缩放查看不同细节层次。这种视口控制是图形编辑器的基础功能。

### 结构组织

```
1. 视口概念
   - 什么是视口
   - 视口与 Canvas 的关系
   - 视口变换
   
2. 平移实现
   - 平移状态管理
   - 鼠标拖拽平移
   - 变换矩阵更新
   - 平移边界
   
3. 缩放实现
   - 滚轮事件处理
   - 缩放比例计算
   - 缩放范围限制
   
4. 中心点缩放
   - 问题分析
   - 数学推导
   - 代码实现
   
5. 触摸手势
   - 双指平移
   - 双指缩放
   - 手势识别
   
6. 视口管理类
   - 完整实现
   - 状态序列化
   - 重置功能
   
7. 本章小结
```

### 代码示例

1. **基本平移实现**
2. **滚轮缩放实现**
3. **以鼠标位置为中心的缩放**
4. **双指触摸手势**
5. **完整视口管理类**
6. **视口范围约束**

### 图表需求

- **视口概念图**：展示视口与画布内容的关系
- **中心点缩放原理图**：展示缩放前后点的位置变化

## 5. 技术细节

### 实现要点

```javascript
// 视口管理类
class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 视口状态
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    
    // 限制
    this.minScale = 0.1;
    this.maxScale = 10;
    
    // 平移状态
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    
    this.setupEvents();
  }
  
  setupEvents() {
    // 平移（中键或空格+左键）
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.offsetX += dx;
        this.offsetY += dy;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.render();
      }
    });
    
    document.addEventListener('mouseup', () => {
      this.isPanning = false;
    });
    
    // 缩放（滚轮）
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const point = this.getCanvasPoint(e);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomAt(point.x, point.y, delta);
    }, { passive: false });
  }
  
  // 以指定点为中心缩放
  zoomAt(x, y, factor) {
    const newScale = Math.max(this.minScale, 
                     Math.min(this.maxScale, this.scale * factor));
    
    if (newScale === this.scale) return;
    
    // 关键公式：保持缩放中心不动
    // 缩放前：screenX = x * scale + offsetX
    // 缩放后：screenX = x * newScale + newOffsetX
    // 因为 screenX 不变，所以：
    // newOffsetX = screenX - x * newScale = offsetX + x * (scale - newScale)
    
    this.offsetX = this.offsetX + x * (this.scale - newScale);
    this.offsetY = this.offsetY + y * (this.scale - newScale);
    this.scale = newScale;
    
    this.render();
  }
  
  // 应用视口变换
  applyTransform() {
    this.ctx.setTransform(
      this.scale, 0,
      0, this.scale,
      this.offsetX, this.offsetY
    );
  }
  
  // 屏幕坐标转画布坐标
  screenToCanvas(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }
  
  // 画布坐标转屏幕坐标
  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.scale + this.offsetX,
      y: canvasY * this.scale + this.offsetY
    };
  }
  
  getCanvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return this.screenToCanvas(screenX, screenY);
  }
  
  // 重置视口
  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.render();
  }
  
  // 适应内容
  fitContent(contentBounds) {
    const { x, y, width, height } = contentBounds;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    const scaleX = canvasWidth / width;
    const scaleY = canvasHeight / height;
    this.scale = Math.min(scaleX, scaleY) * 0.9;  // 留边距
    
    this.offsetX = (canvasWidth - width * this.scale) / 2 - x * this.scale;
    this.offsetY = (canvasHeight - height * this.scale) / 2 - y * this.scale;
    
    this.render();
  }
  
  render() {
    // 清除并应用变换
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyTransform();
    
    // 绘制内容...
    this.drawContent();
  }
}

// 双指触摸缩放
class TouchZoomHandler {
  constructor(viewport) {
    this.viewport = viewport;
    this.lastDistance = 0;
    this.lastCenter = { x: 0, y: 0 };
  }
  
  onTouchStart(e) {
    if (e.touches.length === 2) {
      this.lastDistance = this.getDistance(e.touches);
      this.lastCenter = this.getCenter(e.touches);
    }
  }
  
  onTouchMove(e) {
    if (e.touches.length === 2) {
      const distance = this.getDistance(e.touches);
      const center = this.getCenter(e.touches);
      
      // 缩放
      const scaleFactor = distance / this.lastDistance;
      this.viewport.zoomAt(center.x, center.y, scaleFactor);
      
      // 平移
      const dx = center.x - this.lastCenter.x;
      const dy = center.y - this.lastCenter.y;
      this.viewport.offsetX += dx;
      this.viewport.offsetY += dy;
      
      this.lastDistance = distance;
      this.lastCenter = center;
    }
  }
  
  getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 缩放时画面跳跃 | 使用中心点缩放公式 |
| 平移时画面抖动 | 使用增量计算而非绝对位置 |
| 坐标转换后点击不准 | 更新坐标转换函数 |
| 缩放过度 | 添加最小/最大缩放限制 |

## 6. 风格指导

### 语气语调
- 数学公式配合直观解释
- 强调实际应用场景

### 类比方向
- 视口类比"相机取景框"
- 平移类比"移动相机"
- 缩放类比"调整焦距"

## 7. 与其他章节的关系

### 前置依赖
- 第15-17章：变换与矩阵

### 后续章节铺垫
- 为第38章"画布管理与视口控制"提供实现基础

## 8. 章节检查清单

- [ ] 目标明确：读者能实现视口缩放和平移
- [ ] 术语统一：视口、缩放中心等术语定义清晰
- [ ] 最小实现：提供完整视口管理类
- [ ] 边界处理：说明范围限制
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：中心点缩放原理图与代码对应
- [ ] 总结与练习：提供视口控制练习
