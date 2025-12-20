# 选择框与控制点基础

选中对象后，如何让用户拖拽、旋转、缩放？答案是：**Bounding Box（选择框）+ 控制点（Handles）**。

本章将探讨：
- 如何设计和绘制交互友好的选择框？
- 控制点的数学原理是什么？
- 如何实现复杂变换（旋转、缩放、翻转）？

---

## 1. Bounding Box 设计

选择框包含：
- **边框**：虚线矩形
- **8个控制点**：四角（缩放）+ 四边（缩放）
- **旋转手柄**：顶部中心的圆形

```
      ↻ (旋转)
      ○
      │
  ○───┼───○
  │       │
  ○   对象  ○
  │       │
  ○───┼───○
      ○
```

### 为什么是8个控制点？

这不是随意设计，而是基于用户体验优化：

| 控制点位置 | 功能 | 用户场景 |
|-----------|------|---------|
| **四角** | 同时改变宽高 | 快速调整尺寸 |
| **四边** | 只改变单边 | 精确调整宽度或高度 |
| **旋转手柄** | 旋转对象 | 改变方向 |

**设计细节**：
- 控制点尺寸固定（不随缩放变化）→ 始终易于点击
- 旋转手柄与边框保持距离 → 避免误触
- 虚线边框 → 不干扰视觉

---

## 2. 控制点类型与编码

```javascript
const HANDLE_TYPES = {
  // 8个尺寸控制点
  TOP_LEFT: 'tl',
  TOP_CENTER: 'tc',
  TOP_RIGHT: 'tr',
  MIDDLE_LEFT: 'ml',
  MIDDLE_RIGHT: 'mr',
  BOTTOM_LEFT: 'bl',
  BOTTOM_CENTER: 'bc',
  BOTTOM_RIGHT: 'br',
  
  // 旋转手柄
  ROTATE: 'rotate'
};

// 控制点分类（用于行为判断）
const HANDLE_CATEGORIES = {
  CORNER: ['tl', 'tr', 'bl', 'br'],    // 角点：双向缩放
  EDGE: ['tc', 'ml', 'mr', 'bc'],       // 边点：单向缩放
  ROTATION: ['rotate']                   // 旋转
};
```

---

## 3. 绘制选择框

### 基础实现

```javascript
class BaseObject {
  drawSelectionBox(ctx) {
    if (!this.selected) return;
    
    const zoom = this.canvas?.viewportZoom || 1;
    const handleSize = 8 / zoom;  // 固定屏幕尺寸
    
    ctx.save();
    
    // 绘制边框
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(this.left, this.top, this.width, this.height);
    ctx.setLineDash([]);
    
    // 绘制8个控制点
    const handles = this.getHandlePositions();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00aaff';
    
    Object.values(handles).forEach(({ x, y }) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
    
    // 绘制旋转手柄
    const rotateHandle = this.getRotateHandlePosition();
    ctx.beginPath();
    ctx.arc(rotateHandle.x, rotateHandle.y, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 绘制连接线（旋转手柄到顶边）
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(rotateHandle.x, rotateHandle.y);
    ctx.lineTo(rotateHandle.x, this.top);
    ctx.stroke();
    
    ctx.restore();
  }
  
  getHandlePositions() {
    const { left, top, width, height } = this;
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    return {
      [HANDLE_TYPES.TOP_LEFT]: { x: left, y: top },
      [HANDLE_TYPES.TOP_CENTER]: { x: centerX, y: top },
      [HANDLE_TYPES.TOP_RIGHT]: { x: left + width, y: top },
      [HANDLE_TYPES.MIDDLE_LEFT]: { x: left, y: centerY },
      [HANDLE_TYPES.MIDDLE_RIGHT]: { x: left + width, y: centerY },
      [HANDLE_TYPES.BOTTOM_LEFT]: { x: left, y: top + height },
      [HANDLE_TYPES.BOTTOM_CENTER]: { x: centerX, y: top + height },
      [HANDLE_TYPES.BOTTOM_RIGHT]: { x: left + width, y: top + height }
    };
  }
  
  getRotateHandlePosition() {
    const centerX = this.left + this.width / 2;
    const rotateDistance = 30 / (this.canvas?.viewportZoom || 1);
    return {
      x: centerX,
      y: this.top - rotateDistance
    };
  }
}
```

### 适配旋转后的对象

**问题**：上面的实现假设对象未旋转。当对象旋转后，控制点位置需要跟随旋转。

**解决方案**：应用变换矩阵。

```javascript
class BaseObject {
  /**
   * 获取考虑旋转的控制点位置
   */
  getTransformedHandlePositions() {
    const baseHandles = this.getHandlePositions();
    
    if (!this.rotation || this.rotation === 0) {
      return baseHandles;
    }
    
    // 旋转中心（对象中心）
    const cx = this.left + this.width / 2;
    const cy = this.top + this.height / 2;
    
    const transformed = {};
    
    for (const [type, pos] of Object.entries(baseHandles)) {
      transformed[type] = this.rotatePoint(pos.x, pos.y, cx, cy, this.rotation);
    }
    
    return transformed;
  }
  
  /**
   * 旋转点坐标
   */
  rotatePoint(x, y, cx, cy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const dx = x - cx;
    const dy = y - cy;
    
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }
  
  /**
   * 获取旋转后的旋转手柄位置
   */
  getTransformedRotateHandle() {
    const base = this.getRotateHandlePosition();
    const cx = this.left + this.width / 2;
    const cy = this.top + this.height / 2;
    
    return this.rotatePoint(base.x, base.y, cx, cy, this.rotation || 0);
  }
}
```

---

## 4. 控制点碰撞检测

### 精确检测

```javascript
class BaseObject {
  /**
   * 找到鼠标位置对应的控制点
   * @param {number} x - 鼠标 x 坐标
   * @param {number} y - 鼠标 y 坐标
   * @returns {string|null} - 控制点类型或 null
   */
  findHandleAtPoint(x, y) {
    const zoom = this.canvas?.viewportZoom || 1;
    const handleSize = 8 / zoom;
    const hitDistance = handleSize;  // 碰撞距离
    
    // 检测旋转手柄
    const rotateHandle = this.getTransformedRotateHandle();
    if (this.distance(x, y, rotateHandle.x, rotateHandle.y) < hitDistance) {
      return HANDLE_TYPES.ROTATE;
    }
    
    // 检测8个控制点
    const handles = this.getTransformedHandlePositions();
    for (const [type, pos] of Object.entries(handles)) {
      if (this.distance(x, y, pos.x, pos.y) < hitDistance) {
        return type;
      }
    }
    
    return null;
  }
  
  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
```

### 优先级优化

当多个对象重叠时，应优先检测顶层对象的控制点：

```javascript
class CanvasEditor {
  /**
   * 查找鼠标位置的控制点（所有选中对象）
   */
  findHandleAtPoint(x, y) {
    // 从顶层到底层遍历选中对象
    for (let i = this.selectedObjects.length - 1; i >= 0; i--) {
      const obj = this.selectedObjects[i];
      const handle = obj.findHandleAtPoint(x, y);
      if (handle) {
        return { object: obj, handle };
      }
    }
    return null;
  }
}
```

---

## 5. 缩放变换的数学原理

### 基本缩放（固定左上角）

最简单的缩放方式：固定左上角，改变宽高。

```javascript
// 右下角控制点：增加宽高
obj.width = startWidth + dx;
obj.height = startHeight + dy;
```

### 对称缩放（固定对角点）

拖拽左上角时，右下角应保持不动，这需要同时调整位置和尺寸。

**数学推导**：

设原始边界框为 `(x₀, y₀, w₀, h₀)`，拖拽左上角到新位置 `(x₁, y₁)`。

要求：
- 右下角固定：`(x₀ + w₀, y₀ + h₀)` 不变
- 新左上角：`(x₁, y₁)`

计算新尺寸：
```
x₁ + w₁ = x₀ + w₀  →  w₁ = (x₀ + w₀) - x₁
y₁ + h₁ = y₀ + h₀  →  h₁ = (y₀ + h₀) - y₁
```

**代码实现**：

```javascript
handleResize(obj, handle, x, y) {
  const dx = x - this.transformStart.x;
  const dy = y - this.transformStart.y;
  const start = this.transformStart;
  
  switch (handle) {
    case HANDLE_TYPES.BOTTOM_RIGHT:
      // 固定左上角
      obj.width = start.objWidth + dx;
      obj.height = start.objHeight + dy;
      break;
    
    case HANDLE_TYPES.TOP_LEFT:
      // 固定右下角
      const rightX = start.objLeft + start.objWidth;
      const bottomY = start.objTop + start.objHeight;
      
      obj.left = x;
      obj.top = y;
      obj.width = rightX - x;
      obj.height = bottomY - y;
      break;
    
    case HANDLE_TYPES.TOP_RIGHT:
      // 固定左下角
      const bottomY2 = start.objTop + start.objHeight;
      
      obj.top = y;
      obj.width = x - start.objLeft;
      obj.height = bottomY2 - y;
      break;
    
    case HANDLE_TYPES.BOTTOM_LEFT:
      // 固定右上角
      const rightX2 = start.objLeft + start.objWidth;
      
      obj.left = x;
      obj.width = rightX2 - x;
      obj.height = start.objHeight + dy;
      break;
    
    case HANDLE_TYPES.MIDDLE_RIGHT:
      // 只改变宽度
      obj.width = start.objWidth + dx;
      break;
    
    case HANDLE_TYPES.MIDDLE_LEFT:
      // 固定右边，改变宽度
      const rightX3 = start.objLeft + start.objWidth;
      obj.left = x;
      obj.width = rightX3 - x;
      break;
    
    case HANDLE_TYPES.TOP_CENTER:
      // 固定底边，改变高度
      const bottomY3 = start.objTop + start.objHeight;
      obj.top = y;
      obj.height = bottomY3 - y;
      break;
    
    case HANDLE_TYPES.BOTTOM_CENTER:
      // 固定顶边，改变高度
      obj.height = start.objHeight + dy;
      break;
  }
  
  // 防止负数尺寸（翻转）
  if (obj.width < 0) {
    obj.left += obj.width;
    obj.width = -obj.width;
    this.flipObjectHorizontally(obj);
  }
  
  if (obj.height < 0) {
    obj.top += obj.height;
    obj.height = -obj.height;
    this.flipObjectVertically(obj);
  }
  
  // 限制最小尺寸
  obj.width = Math.max(obj.width, 10);
  obj.height = Math.max(obj.height, 10);
}
```

---

## 6. 等比缩放（保持宽高比）

### Shift 键约束

用户按住 Shift 键时，应保持宽高比不变。

```javascript
handleResize(obj, handle, x, y, shiftKey = false) {
  // ... 基本缩放逻辑
  
  if (shiftKey && HANDLE_CATEGORIES.CORNER.includes(handle)) {
    // 等比缩放：以长边为准
    const aspectRatio = this.transformStart.objWidth / this.transformStart.objHeight;
    
    if (Math.abs(obj.width / aspectRatio) > Math.abs(obj.height)) {
      // 宽度变化更大，以宽度为准
      obj.height = obj.width / aspectRatio;
    } else {
      // 高度变化更大，以高度为准
      obj.width = obj.height * aspectRatio;
    }
    
    // 调整位置（根据控制点类型）
    if (handle === HANDLE_TYPES.TOP_LEFT) {
      const rightX = this.transformStart.objLeft + this.transformStart.objWidth;
      const bottomY = this.transformStart.objTop + this.transformStart.objHeight;
      obj.left = rightX - obj.width;
      obj.top = bottomY - obj.height;
    } else if (handle === HANDLE_TYPES.TOP_RIGHT) {
      const bottomY = this.transformStart.objTop + this.transformStart.objHeight;
      obj.top = bottomY - obj.height;
    } else if (handle === HANDLE_TYPES.BOTTOM_LEFT) {
      const rightX = this.transformStart.objLeft + this.transformStart.objWidth;
      obj.left = rightX - obj.width;
    }
    // BOTTOM_RIGHT 不需要调整位置
  }
}
```

### 从中心缩放（Alt 键）

按住 Alt 键时，应以对象中心为基准缩放。

```javascript
handleResize(obj, handle, x, y, shiftKey, altKey) {
  if (altKey) {
    // 计算从中心的偏移
    const centerX = this.transformStart.objLeft + this.transformStart.objWidth / 2;
    const centerY = this.transformStart.objTop + this.transformStart.objHeight / 2;
    
    const offsetX = x - centerX;
    const offsetY = y - centerY;
    
    // 对称缩放
    obj.width = Math.abs(offsetX) * 2;
    obj.height = Math.abs(offsetY) * 2;
    obj.left = centerX - obj.width / 2;
    obj.top = centerY - obj.height / 2;
    
    if (shiftKey) {
      // Alt + Shift：等比 + 从中心
      const aspectRatio = this.transformStart.objWidth / this.transformStart.objHeight;
      const maxDelta = Math.max(Math.abs(offsetX), Math.abs(offsetY) / aspectRatio);
      
      obj.width = maxDelta * 2;
      obj.height = (maxDelta / aspectRatio) * 2;
      obj.left = centerX - obj.width / 2;
      obj.top = centerY - obj.height / 2;
    }
  } else {
    // 正常缩放逻辑...
  }
}
```

---

## 7. 旋转变换的数学原理

### 旋转角度计算

**原理**：计算鼠标相对于对象中心的角度。

```javascript
handleRotate(obj, x, y) {
  const centerX = obj.left + obj.width / 2;
  const centerY = obj.top + obj.height / 2;
  
  // 计算角度（弧度）
  const angle = Math.atan2(y - centerY, x - centerX);
  
  // 调整0度方向（默认指向右，我们需要指向上）
  obj.rotation = angle + Math.PI / 2;
}
```

### 角度吸附（15度增量）

按住 Shift 键时，角度应吸附到 15° 的倍数。

```javascript
handleRotate(obj, x, y, shiftKey = false) {
  const centerX = obj.left + obj.width / 2;
  const centerY = obj.top + obj.height / 2;
  
  let angle = Math.atan2(y - centerY, x - centerX) + Math.PI / 2;
  
  if (shiftKey) {
    // 吸附到15度增量
    const snapAngle = (15 * Math.PI) / 180;  // 15度转弧度
    angle = Math.round(angle / snapAngle) * snapAngle;
  }
  
  obj.rotation = angle;
}
```

### 旋转时的控制点更新

旋转后，控制点位置需要实时更新，这在前面的 `getTransformedHandlePositions()` 中已实现。

---

## 8. 控制点交互完整实现

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ...
    this.activeHandle = null;
    this.activeObject = null;
    this.transformStart = null;
    this.initTransformEvents();
  }
  
  initTransformEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
      
      // 检测是否点击了控制点
      const result = this.findHandleAtPoint(x, y);
      
      if (result) {
        this.activeHandle = result.handle;
        this.activeObject = result.object;
        this.transformStart = {
          x, y,
          objLeft: result.object.left,
          objTop: result.object.top,
          objWidth: result.object.width,
          objHeight: result.object.height,
          objRotation: result.object.rotation || 0
        };
        e.stopPropagation();
        return;
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.activeHandle && this.activeObject) {
        const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
        this.handleTransform(x, y, e.shiftKey, e.altKey);
        e.preventDefault();
      } else {
        // 更新光标
        this.updateCursor(e);
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      if (this.activeHandle) {
        // 变换完成，记录到历史
        this.history.record();
      }
      
      this.activeHandle = null;
      this.activeObject = null;
      this.transformStart = null;
    });
  }
  
  handleTransform(x, y, shiftKey, altKey) {
    const obj = this.activeObject;
    const handle = this.activeHandle;
    
    if (handle === HANDLE_TYPES.ROTATE) {
      this.handleRotate(obj, x, y, shiftKey);
    } else {
      this.handleResize(obj, handle, x, y, shiftKey, altKey);
    }
    
    this.requestRender();
  }
  
  updateCursor(e) {
    const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
    const result = this.findHandleAtPoint(x, y);
    
    if (result) {
      this.canvas.style.cursor = this.getHandleCursor(result.handle, result.object);
    } else {
      this.canvas.style.cursor = 'default';
    }
  }
  
  getHandleCursor(handle, obj) {
    if (handle === HANDLE_TYPES.ROTATE) {
      return 'grab';
    }
    
    // 基础光标映射
    const baseCursors = {
      [HANDLE_TYPES.TOP_LEFT]: 'nw',
      [HANDLE_TYPES.TOP_CENTER]: 'n',
      [HANDLE_TYPES.TOP_RIGHT]: 'ne',
      [HANDLE_TYPES.MIDDLE_LEFT]: 'w',
      [HANDLE_TYPES.MIDDLE_RIGHT]: 'e',
      [HANDLE_TYPES.BOTTOM_LEFT]: 'sw',
      [HANDLE_TYPES.BOTTOM_CENTER]: 's',
      [HANDLE_TYPES.BOTTOM_RIGHT]: 'se'
    };
    
    let cursor = baseCursors[handle];
    
    // 根据旋转角度调整光标方向
    if (obj.rotation) {
      const degrees = (obj.rotation * 180) / Math.PI;
      const normalized = ((degrees % 360) + 360) % 360;
      
      // 每45度切换一次光标
      const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
      const index = Math.round(normalized / 45) % 8;
      
      // 应用旋转偏移
      const baseIndex = directions.indexOf(cursor.replace('-resize', ''));
      if (baseIndex !== -1) {
        cursor = directions[(baseIndex + index) % 8];
      }
    }
    
    return `${cursor}-resize`;
  }
}
```

---

## 本章小结

本章深入探讨了选择框和控制点系统的基础实现：

**核心设计**：
- 8个控制点（4角+4边）+ 旋转手柄
- 固定屏幕尺寸（不随缩放变化）
- 精确的碰撞检测和光标反馈

**数学原理**：
- **对称缩放**：固定对角点，同步调整位置和尺寸
- **等比缩放**：保持宽高比（Shift 键）
- **从中心缩放**：对称变换（Alt 键）
- **旋转计算**：atan2 + 15度吸附

**关键技术点**：
- 旋转对象的控制点位置校正（旋转矩阵）
- 交互的响应式设计（键盘修饰键）
- 负数尺寸的翻转处理
- 最小尺寸限制

**交互细节**：
- 鼠标光标方向随旋转角度变化
- 控制点优先级（顶层对象优先）
- 变换完成后记录历史

下一章，我们将探讨多选、分布式变换和企业级实现（Figma架构、智能吸附系统）。
