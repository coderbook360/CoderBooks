# 章节写作指导：对象变换：移动、旋转、缩放

## 1. 章节信息（强制性基础信息）
- **章节标题**: 对象变换：移动、旋转、缩放
- **文件名**: object-transform.md
- **所属部分**: 第八部分：图形编辑器核心功能
- **预计阅读时间**: 30分钟
- **难度等级**: 中级到高级

## 2. 学习目标（验收清单）

### 知识目标
- 理解对象变换的三种基本操作：移动、旋转、缩放
- 掌握拖拽移动的实现原理和坐标计算
- 了解旋转变换的数学原理和实现方法
- 认识缩放变换的中心点保持策略

### 技能目标
- 能够实现对象的拖拽移动
- 能够实现通过旋转控制点旋转对象
- 能够实现通过缩放控制点调整对象大小
- 掌握变换操作的撤销重做支持

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **平移变换（Translation）**: 改变对象的位置（x, y）
- **旋转变换（Rotation）**: 绕对象中心点旋转
- **缩放变换（Scaling）**: 改变对象的尺寸（width, height 或 scaleX, scaleY）
- **变换原点（Transform Origin）**: 变换的参考点（通常是对象中心）
- **复合变换**: 同时应用多个变换（通过变换矩阵）
- **约束变换**: 按住特殊键实现的约束（等比缩放、15°旋转增量等）

### 关键知识点（必须全部覆盖）
- 如何实现拖拽移动（记录起点、计算偏移、更新位置）
- 如何实现旋转（计算角度、应用旋转、处理增量旋转）
- 如何实现缩放（计算新尺寸、保持中心点、处理负数尺寸）
- 如何实现约束变换（Shift、Alt 等修饰键）
- 如何处理多选对象的批量变换
- 如何触发变换事件（开始、进行中、结束）

## 4. 写作要求（结构规范）

- **开篇方式**: 
  - 从用户操作场景引入："用户选中一个矩形后，可以拖动它、旋转它、调整大小"
  - 展示三种变换操作的视觉效果
  - 提出核心问题："如何实现流畅自然的变换交互？"

- **结构组织**: 
  1. **变换概述**：介绍三种基本变换及其应用场景
  2. **拖拽移动实现**：详细讲解移动变换的完整流程
  3. **旋转变换实现**：讲解旋转控制点的拖拽和角度计算
  4. **缩放变换实现**：讲解缩放控制点的拖拽和尺寸计算
  5. **约束变换**：实现 Shift、Alt 等修饰键的约束效果
  6. **多选变换**：处理多个对象的批量变换
  7. **变换事件**：设计和触发变换相关事件
  8. **撤销重做支持**：记录变换前后的状态
  9. **完整示例**：综合展示变换系统的使用
  10. **性能优化**：实时变换的性能考虑
  11. **章节小结**：总结变换系统的核心要点

- **代码示例**: 
  - **示例 1**: 拖拽移动实现（约 50-60 行）
  - **示例 2**: 旋转变换实现（约 50-60 行）
  - **示例 3**: 缩放变换实现（约 60-80 行）
  - **示例 4**: 约束变换实现（约 40-50 行）
  - **示例 5**: 多选变换实现（约 50-60 行）

- **图表需求**: 
  - 需要一个流程图：展示"鼠标按下 → 拖拽 → 计算变换 → 更新对象 → 鼠标松开"的完整流程
  - 需要一个示意图：展示旋转变换的角度计算
  - 需要一个示意图：展示缩放时中心点保持不变的原理

## 5. 技术细节（技术规范）

- **源码参考**: 
  - Fabric.js 的变换系统（`fabric.Object.transform`）
  - Konva.js 的 Transformer 实现
  - Excalidraw 的对象变换逻辑

- **实现要点**: 
  1. **拖拽移动实现**: 
     ```javascript
     class Canvas {
       _handleMouseDown(e) {
         const point = this.screenToCanvas(e.clientX, e.clientY);
         const target = this.findTargetAt(point.x, point.y);
         
         if (target) {
           this._dragTarget = target;
           this._dragStart = point;
           this._dragOriginalPos = { x: target.x, y: target.y };
           
           this.emit('object:moving:start', { target });
         }
       }
       
       _handleMouseMove(e) {
         if (this._dragTarget) {
           const point = this.screenToCanvas(e.clientX, e.clientY);
           const dx = point.x - this._dragStart.x;
           const dy = point.y - this._dragStart.y;
           
           // 应用网格对齐
           let newX = this._dragOriginalPos.x + dx;
           let newY = this._dragOriginalPos.y + dy;
           
           if (this.gridSnap && !e.altKey) {
             newX = Math.round(newX / this.gridSize) * this.gridSize;
             newY = Math.round(newY / this.gridSize) * this.gridSize;
           }
           
           this._dragTarget.set({ x: newX, y: newY });
           this.emit('object:moving', { target: this._dragTarget });
           this.requestRender();
         }
       }
       
       _handleMouseUp(e) {
         if (this._dragTarget) {
           this.emit('object:moved', { target: this._dragTarget });
           this._recordHistory('move', this._dragTarget);
           this._dragTarget = null;
           this._dragStart = null;
           this._dragOriginalPos = null;
         }
       }
     }
     ```
  
  2. **旋转变换实现**: 
     ```javascript
     handleRotation(startPoint, currentPoint, event) {
       const cx = this.x;
       const cy = this.y;
       
       // 计算起始角度和当前角度
       const startAngle = Math.atan2(startPoint.y - cy, startPoint.x - cx);
       const currentAngle = Math.atan2(currentPoint.y - cy, currentPoint.x - cx);
       
       // 计算角度差（转换为度）
       let deltaAngle = (currentAngle - startAngle) * 180 / Math.PI;
       
       // 按住 Shift 时，以 15° 为增量旋转
       if (event.shiftKey) {
         const totalAngle = this._rotationStart + deltaAngle;
         deltaAngle = Math.round(totalAngle / 15) * 15 - this._rotationStart;
       }
       
       this.rotation = this._rotationStart + deltaAngle;
       
       // 标准化角度到 0-360 范围
       this.rotation = ((this.rotation % 360) + 360) % 360;
       
       this.emit('object:rotating', { target: this, angle: this.rotation });
       this.requestRender();
     }
     
     startRotation() {
       this._rotationStart = this.rotation;
     }
     
     endRotation() {
       this.emit('object:rotated', { target: this, angle: this.rotation });
       canvas._recordHistory('rotate', this);
       delete this._rotationStart;
     }
     ```
  
  3. **缩放变换实现**: 
     ```javascript
     handleScaling(control, startPoint, currentPoint, event) {
       const cx = this.x;
       const cy = this.y;
       
       // 记录初始状态
       if (!this._scaleStart) {
         this._scaleStart = {
           width: this.width,
           height: this.height,
           scaleX: this.scaleX,
           scaleY: this.scaleY,
           x: this.x,
           y: this.y
         };
       }
       
       const dx = currentPoint.x - startPoint.x;
       const dy = currentPoint.y - startPoint.y;
       
       // 根据控制点类型计算缩放
       let scaleX = 1;
       let scaleY = 1;
       
       switch (control.type) {
         case 'top-left':
           scaleX = 1 - dx / this._scaleStart.width;
           scaleY = 1 - dy / this._scaleStart.height;
           break;
         case 'top-right':
           scaleX = 1 + dx / this._scaleStart.width;
           scaleY = 1 - dy / this._scaleStart.height;
           break;
         case 'bottom-right':
           scaleX = 1 + dx / this._scaleStart.width;
           scaleY = 1 + dy / this._scaleStart.height;
           break;
         case 'bottom-left':
           scaleX = 1 - dx / this._scaleStart.width;
           scaleY = 1 + dy / this._scaleStart.height;
           break;
       }
       
       // 等比缩放（按住 Shift）
       if (event.shiftKey) {
         const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
         scaleX = scaleX < 0 ? -scale : scale;
         scaleY = scaleY < 0 ? -scale : scale;
       }
       
       // 限制最小尺寸
       const minScale = 0.1;
       scaleX = Math.max(minScale, Math.abs(scaleX)) * Math.sign(scaleX);
       scaleY = Math.max(minScale, Math.abs(scaleY)) * Math.sign(scaleY);
       
       // 应用缩放
       this.scaleX = this._scaleStart.scaleX * scaleX;
       this.scaleY = this._scaleStart.scaleY * scaleY;
       
       // 从中心缩放（按住 Alt）
       if (!event.altKey) {
         // 调整位置保持对角控制点不动
         const offsetX = (this._scaleStart.width * (scaleX - 1)) / 2;
         const offsetY = (this._scaleStart.height * (scaleY - 1)) / 2;
         this.x = this._scaleStart.x + offsetX;
         this.y = this._scaleStart.y + offsetY;
       }
       
       this.emit('object:scaling', { target: this });
       this.requestRender();
     }
     
     endScaling() {
       this.emit('object:scaled', { target: this });
       canvas._recordHistory('scale', this);
       delete this._scaleStart;
     }
     ```
  
  4. **约束变换实现**: 
     ```javascript
     applyTransformConstraints(event) {
       // Shift: 等比缩放 / 15° 旋转增量
       // Alt: 从中心变换
       // Ctrl: 禁用网格对齐
       
       return {
         proportional: event.shiftKey,
         fromCenter: event.altKey,
         noSnap: event.ctrlKey
       };
     }
     ```
  
  5. **多选变换实现**: 
     ```javascript
     transformSelection(dx, dy) {
       if (this.selectedObjects.size === 0) return;
       
       this.selectedObjects.forEach(obj => {
         obj.x += dx;
         obj.y += dy;
       });
       
       this.emit('selection:moved', { 
         targets: Array.from(this.selectedObjects) 
       });
       this.requestRender();
     }
     
     rotateSelection(angle, centerX, centerY) {
       this.selectedObjects.forEach(obj => {
         // 旋转对象自身
         obj.rotation += angle;
         
         // 绕中心点旋转位置
         const dx = obj.x - centerX;
         const dy = obj.y - centerY;
         const rad = angle * Math.PI / 180;
         const cos = Math.cos(rad);
         const sin = Math.sin(rad);
         
         obj.x = centerX + dx * cos - dy * sin;
         obj.y = centerY + dx * sin + dy * cos;
       });
       
       this.requestRender();
     }
     ```

- **常见问题**: 
  - **问题 1**: "拖拽时如何实现网格对齐？"
    - **解答**: 将计算出的新坐标四舍五入到最近的网格点
  - **问题 2**: "缩放时如何防止对象翻转？"
    - **解答**: 限制最小缩放值为正数（如 0.1），或者允许负数缩放实现镜像效果
  - **问题 3**: "多选对象旋转时，如何确定旋转中心？"
    - **解答**: 通常使用所有选中对象边界框的中心点

## 6. 风格指导（表达规范）

- **语气语调**: 
  - 从用户操作的自然性出发，强调流畅的交互体验
  - 用"拖动鼠标时，对象应该跟随鼠标移动"这样的用户视角描述
  - 对数学计算（角度、缩放比例）提供清晰的图示和代码

- **类比方向**: 
  - 类比 1：移动像是"用手拖动物体"，物体跟随手的移动
  - 类比 2：旋转像是"转动方向盘"，计算转动的角度
  - 类比 3：缩放像是"拉伸橡皮筋"，改变物体的大小

## 7. 章节检查清单

- [ ] 目标明确：读者是否理解了三种基本变换的实现原理
- [ ] 术语统一：平移、旋转、缩放、变换原点等术语定义清晰
- [ ] 最小实现：提供了移动、旋转、缩放的完整实现
- [ ] 边界处理：说明了最小尺寸限制、角度范围、网格对齐等
- [ ] 性能与权衡：讨论了实时变换的性能优化
- [ ] 替代方案：对比了不同的缩放策略（改变尺寸 vs 改变缩放因子）
- [ ] 图示与代码：流程图、示意图与代码实现相互呼应
- [ ] 总结与练习：建议读者实现一个支持多种约束的变换系统

## 8. 写作建议与注意事项

### 重点强调
- 对象变换是图形编辑器最频繁的操作，流畅性和精确性至关重要
- 约束变换（Shift、Alt）是提升用户效率的关键功能
- 变换事件是撤销重做、协同编辑等高级功能的基础

### 常见误区
- 不要忽视拖拽过程中的坐标系转换（屏幕坐标 → 画布坐标）
- 不要忘记在变换结束时触发事件，用于撤销重做记录
- 不要让旋转角度累积误差，定期标准化到 0-360 范围

### 推荐实现细节

1. **智能网格对齐**: 
   ```javascript
   snapToGrid(value, gridSize) {
     const snapped = Math.round(value / gridSize) * gridSize;
     // 如果距离网格很近（5px内），则对齐
     return Math.abs(value - snapped) < 5 ? snapped : value;
   }
   ```

2. **拖拽节流优化**: 
   ```javascript
   _handleMouseMove(e) {
     if (this._isDragging && !this._moveScheduled) {
       this._moveScheduled = true;
       requestAnimationFrame(() => {
         this._applyDrag(e);
         this._moveScheduled = false;
       });
     }
   }
   ```

### 参考资料推荐
- Fabric.js 文档：Object Transformation
- Konva.js 文档：Transformer
- 《3D数学基础》：变换矩阵章节
- Figma 的变换交互设计分析
