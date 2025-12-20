# 章节写作指导：选择框与控制点实现

## 1. 章节信息（强制性基础信息）
- **章节标题**: 选择框与控制点实现
- **文件名**: bounding-box-controls.md
- **所属部分**: 第八部分：图形编辑器核心功能
- **预计阅读时间**: 30分钟
- **难度等级**: 中级到高级

## 2. 学习目标（验收清单）

### 知识目标
- 理解边界框（Bounding Box）的计算原理
- 掌握控制点（Control Points）的设计与布局
- 了解不同控制点的功能（缩放、旋转、移动）
- 认识控制点的点击检测和拖拽处理

### 技能目标
- 能够计算对象的边界框（考虑旋转变换）
- 能够绘制8个缩放控制点和旋转控制点
- 能够实现控制点的点击检测
- 掌握通过控制点实现对象变换的原理

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **边界框（Bounding Box）**: 包围对象的最小矩形区域
- **轴对齐边界框（AABB）**: 边与坐标轴平行的边界框
- **定向边界框（OBB）**: 考虑对象旋转的边界框
- **控制点（Control Points）**: 用户通过拖拽控制点来变换对象
- **控制点类型**: 缩放控制点（8个角点和边中点）、旋转控制点
- **控制点拖拽**: 检测控制点点击、跟踪拖拽、应用变换

### 关键知识点（必须全部覆盖）
- 如何计算对象的边界框（未旋转和已旋转）
- 如何布局控制点的位置（8个缩放点 + 1个旋转点）
- 如何绘制控制点（方形、圆形、带图标等）
- 如何检测鼠标是否点击了控制点
- 如何根据拖拽距离计算对象的新尺寸和位置
- 如何保持对象中心点不变进行缩放

## 4. 写作要求（结构规范）

- **开篇方式**: 
  - 从用户操作场景引入："选中一个矩形后，四周出现8个小方块，这些就是控制点"
  - 展示 Figma、Sketch 等工具的控制点设计
  - 提出核心问题："如何计算控制点位置？如何处理拖拽？"

- **结构组织**: 
  1. **概念介绍**：边界框与控制点的概念
  2. **边界框计算**：实现未旋转和已旋转对象的边界框
  3. **控制点设计**：设计控制点的类型、位置、样式
  4. **控制点绘制**：实现控制点的渲染逻辑
  5. **点击检测**：判断鼠标是否点击了某个控制点
  6. **拖拽处理**：实现控制点的拖拽逻辑
  7. **缩放计算**：根据拖拽计算对象的新尺寸
  8. **旋转控制**：实现旋转控制点的拖拽
  9. **完整示例**：综合展示控制点系统的使用
  10. **视觉优化**：控制点的高亮、悬停效果等
  11. **章节小结**：总结控制点系统的核心要点

- **代码示例**: 
  - **示例 1**: 边界框计算实现（约 40-50 行）
  - **示例 2**: 控制点布局和绘制（约 60-80 行）
  - **示例 3**: 控制点点击检测（约 30-40 行）
  - **示例 4**: 缩放控制点拖拽处理（约 60-80 行）
  - **示例 5**: 旋转控制点拖拽处理（约 40-50 行）

- **图表需求**: 
  - 需要一个示意图：展示8个缩放控制点和1个旋转控制点的布局
  - 需要一个示意图：展示旋转对象的边界框计算
  - 需要一个流程图：展示"点击控制点 → 拖拽 → 计算变换 → 更新对象"的流程

## 5. 技术细节（技术规范）

- **源码参考**: 
  - Fabric.js 的控制点系统（`fabric.Control`）
  - Konva.js 的 Transformer 类
  - Excalidraw 的边界框和控制点实现

- **实现要点**: 
  1. **边界框计算（未旋转）**: 
     ```javascript
     getBoundingBox() {
       return {
         x: this.x - this.width / 2,
         y: this.y - this.height / 2,
         width: this.width,
         height: this.height
       };
     }
     ```
  
  2. **边界框计算（已旋转）**: 
     ```javascript
     getBoundingBox() {
       const cx = this.x;
       const cy = this.y;
       const w = this.width * this.scaleX;
       const h = this.height * this.scaleY;
       
       // 四个角点
       const corners = [
         { x: -w / 2, y: -h / 2 },
         { x: w / 2, y: -h / 2 },
         { x: w / 2, y: h / 2 },
         { x: -w / 2, y: h / 2 }
       ];
       
       // 旋转变换
       const angle = this.rotation * Math.PI / 180;
       const cos = Math.cos(angle);
       const sin = Math.sin(angle);
       
       const rotatedCorners = corners.map(p => ({
         x: cx + p.x * cos - p.y * sin,
         y: cy + p.x * sin + p.y * cos
       }));
       
       // 计算包围盒
       const xs = rotatedCorners.map(p => p.x);
       const ys = rotatedCorners.map(p => p.y);
       const minX = Math.min(...xs);
       const minY = Math.min(...ys);
       const maxX = Math.max(...xs);
       const maxY = Math.max(...ys);
       
       return {
         x: minX,
         y: minY,
         width: maxX - minX,
         height: maxY - minY
       };
     }
     ```
  
  3. **控制点定义**: 
     ```javascript
     const CONTROL_TYPES = {
       TL: 'top-left',       // 左上
       TM: 'top-middle',     // 上中
       TR: 'top-right',      // 右上
       MR: 'middle-right',   // 右中
       BR: 'bottom-right',   // 右下
       BM: 'bottom-middle',  // 下中
       BL: 'bottom-left',    // 左下
       ML: 'middle-left',    // 左中
       ROTATE: 'rotate'      // 旋转
     };
     
     class ControlPoint {
       constructor(type, x, y, cursor) {
         this.type = type;
         this.x = x;
         this.y = y;
         this.cursor = cursor; // CSS 光标样式
         this.size = 8;
       }
       
       containsPoint(px, py) {
         const halfSize = this.size / 2;
         return px >= this.x - halfSize &&
                px <= this.x + halfSize &&
                py >= this.y - halfSize &&
                py <= this.y + halfSize;
       }
     }
     ```
  
  4. **控制点布局**: 
     ```javascript
     getControlPoints() {
       const box = this.getBoundingBox();
       const x = box.x;
       const y = box.y;
       const w = box.width;
       const h = box.height;
       const cx = x + w / 2;
       const cy = y + h / 2;
       
       return [
         new ControlPoint(CONTROL_TYPES.TL, x, y, 'nwse-resize'),
         new ControlPoint(CONTROL_TYPES.TM, cx, y, 'ns-resize'),
         new ControlPoint(CONTROL_TYPES.TR, x + w, y, 'nesw-resize'),
         new ControlPoint(CONTROL_TYPES.MR, x + w, cy, 'ew-resize'),
         new ControlPoint(CONTROL_TYPES.BR, x + w, y + h, 'nwse-resize'),
         new ControlPoint(CONTROL_TYPES.BM, cx, y + h, 'ns-resize'),
         new ControlPoint(CONTROL_TYPES.BL, x, y + h, 'nesw-resize'),
         new ControlPoint(CONTROL_TYPES.ML, x, cy, 'ew-resize'),
         new ControlPoint(CONTROL_TYPES.ROTATE, cx, y - 30, 'crosshair')
       ];
     }
     ```
  
  5. **控制点绘制**: 
     ```javascript
     renderControls(ctx) {
       if (!this.selected) return;
       
       const controls = this.getControlPoints();
       const pointSize = 8 / canvas.viewportZoom;
       
       ctx.fillStyle = '#FFFFFF';
       ctx.strokeStyle = '#4A90E2';
       ctx.lineWidth = 2 / canvas.viewportZoom;
       
       controls.forEach(ctrl => {
         if (ctrl.type === CONTROL_TYPES.ROTATE) {
           // 旋转控制点绘制为圆形
           ctx.beginPath();
           ctx.arc(ctrl.x, ctrl.y, pointSize / 2, 0, Math.PI * 2);
           ctx.fill();
           ctx.stroke();
         } else {
           // 缩放控制点绘制为方形
           ctx.fillRect(
             ctrl.x - pointSize / 2,
             ctrl.y - pointSize / 2,
             pointSize,
             pointSize
           );
           ctx.strokeRect(
             ctrl.x - pointSize / 2,
             ctrl.y - pointSize / 2,
             pointSize,
             pointSize
           );
         }
       });
     }
     ```
  
  6. **控制点点击检测**: 
     ```javascript
     findControlAt(x, y) {
       if (!this.selected) return null;
       
       const controls = this.getControlPoints();
       const tolerance = 10 / canvas.viewportZoom;
       
       for (const ctrl of controls) {
         const dx = x - ctrl.x;
         const dy = y - ctrl.y;
         const distance = Math.sqrt(dx * dx + dy * dy);
         
         if (distance <= tolerance) {
           return ctrl;
         }
       }
       
       return null;
     }
     ```
  
  7. **缩放拖拽处理**: 
     ```javascript
     handleControlDrag(control, startPoint, currentPoint) {
       const dx = currentPoint.x - startPoint.x;
       const dy = currentPoint.y - startPoint.y;
       
       switch (control.type) {
         case CONTROL_TYPES.BR: // 右下角
           this.width += dx;
           this.height += dy;
           this.x += dx / 2;
           this.y += dy / 2;
           break;
         
         case CONTROL_TYPES.TL: // 左上角
           this.width -= dx;
           this.height -= dy;
           this.x += dx / 2;
           this.y += dy / 2;
           break;
         
         case CONTROL_TYPES.MR: // 右中
           this.width += dx;
           this.x += dx / 2;
           break;
         
         // ... 其他控制点
       }
       
       this.requestRender();
     }
     ```
  
  8. **旋转拖拽处理**: 
     ```javascript
     handleRotationDrag(startPoint, currentPoint) {
       const cx = this.x;
       const cy = this.y;
       
       const startAngle = Math.atan2(startPoint.y - cy, startPoint.x - cx);
       const currentAngle = Math.atan2(currentPoint.y - cy, currentPoint.x - cx);
       
       let deltaAngle = (currentAngle - startAngle) * 180 / Math.PI;
       
       // 按住 Shift 时，以 15° 为单位旋转
       if (event.shiftKey) {
         deltaAngle = Math.round(deltaAngle / 15) * 15;
       }
       
       this.rotation += deltaAngle;
       this.requestRender();
     }
     ```

- **常见问题**: 
  - **问题 1**: "旋转后的对象如何计算边界框？"
    - **解答**: 需要计算四个角点旋转后的位置，然后取最小和最大坐标
  - **问题 2**: "拖拽角点缩放时，如何保持对象中心点不变？"
    - **解答**: 同时调整对象的位置，使中心点保持在原位
  - **问题 3**: "控制点的大小应该随缩放而变化吗？"
    - **解答**: 通常应保持固定的屏幕尺寸，除以 `viewportZoom` 来抵消缩放

## 6. 风格指导（表达规范）

- **语气语调**: 
  - 从用户体验出发，强调控制点的直观性和易用性
  - 用"拖拽角点可以调整大小"这样的用户语言，而不是纯技术描述
  - 对复杂的数学计算（如旋转变换）提供清晰的图示说明

- **类比方向**: 
  - 类比 1：控制点像是"物体的把手"，抓住不同的把手可以做不同的操作
  - 类比 2：边界框像是"物体的影子"，告诉你物体占据的空间
  - 类比 3：旋转控制点像是"方向盘"，拖动它可以旋转物体

## 7. 章节检查清单

- [ ] 目标明确：读者是否理解了边界框和控制点的实现原理
- [ ] 术语统一：AABB、OBB、控制点等术语定义清晰
- [ ] 最小实现：提供了边界框计算、控制点绘制、拖拽处理的完整实现
- [ ] 边界处理：说明了负数尺寸、旋转角度范围等边界情况
- [ ] 性能与权衡：讨论了控制点数量与交互便利性的权衡
- [ ] 替代方案：对比了不同的控制点布局方案（8点 vs 4点）
- [ ] 图示与代码：示意图、流程图与代码实现相互呼应
- [ ] 总结与练习：建议读者实现一个支持等比缩放的控制点系统

## 8. 写作建议与注意事项

### 重点强调
- 控制点是图形编辑器交互的核心，直接影响用户的操作体验
- 旋转对象的边界框计算是常见难点，务必讲清楚原理和代码
- 缩放时保持中心点不变是用户期望的行为，需要调整位置

### 常见误区
- 不要忘记考虑视口缩放，控制点大小应保持固定的屏幕尺寸
- 不要忽视旋转对象的特殊处理，边界框和控制点位置都需要变换
- 不要让控制点过小，难以点击；也不要过大，遮挡对象

### 推荐实现细节

1. **等比缩放（按住 Shift）**: 
   ```javascript
   handleControlDrag(control, startPoint, currentPoint, event) {
     const dx = currentPoint.x - startPoint.x;
     const dy = currentPoint.y - startPoint.y;
     
     if (event.shiftKey) {
       // 等比缩放：取较大的变化量
       const scale = Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(this.width, this.height);
       this.width *= 1 + scale * Math.sign(dx);
       this.height *= 1 + scale * Math.sign(dy);
     } else {
       // 自由缩放
       this.width += dx;
       this.height += dy;
     }
   }
   ```

2. **控制点悬停高亮**: 
   ```javascript
   _handleMouseMove(e) {
     const point = this.screenToCanvas(e.clientX, e.clientY);
     const hoveredControl = this.activeObject?.findControlAt(point.x, point.y);
     
     if (hoveredControl) {
       this.canvas.style.cursor = hoveredControl.cursor;
       this._hoveredControl = hoveredControl;
       this.requestRender();
     } else {
       this.canvas.style.cursor = 'default';
       this._hoveredControl = null;
     }
   }
   ```

### 参考资料推荐
- Fabric.js 源码：Controls 模块
- Konva.js 文档：Transformer
- 《3D数学基础》：旋转变换章节
- Figma 的控制点交互设计分析
