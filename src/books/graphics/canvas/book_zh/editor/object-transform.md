# 对象变换：移动、旋转、缩放

有了选择框和控制点，现在让它们真正工作起来：拖拽移动、旋转、缩放对象。

---

## 1. 拖拽移动

点击对象并拖动：

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ...
    this.draggingObject = null;
    this.dragStart = null;
    this.initDragEvents();
  }
  
  initDragEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
      
      // 优先检测控制点
      if (this.selectedObjects.length === 1) {
        const handle = this.selectedObjects[0].findHandleAtPoint(x, y);
        if (handle) return;  // 让控制点事件处理
      }
      
      // 检测对象
      const obj = this.findObjectAtPoint(x, y);
      if (obj) {
        this.draggingObject = obj;
        this.dragStart = {
          x, y,
          objLeft: obj.left,
          objTop: obj.top
        };
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.draggingObject) {
        const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        
        this.draggingObject.left = this.dragStart.objLeft + dx;
        this.draggingObject.top = this.dragStart.objTop + dy;
        
        this.requestRender();
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.draggingObject = null;
      this.dragStart = null;
    });
  }
}
```

---

## 2. 旋转实现

通过旋转手柄旋转对象：

```javascript
handleRotate(obj, currentX, currentY) {
  const centerX = obj.left + obj.width / 2;
  const centerY = obj.top + obj.height / 2;
  
  // 计算鼠标相对中心的角度
  const angle = Math.atan2(currentY - centerY, currentX - centerX);
  
  // 设置旋转角度（调整为顶部为0度）
  obj.rotation = angle + Math.PI / 2;
}
```

绘制时应用旋转：

```javascript
class BaseObject {
  applyTransform(ctx) {
    const centerX = this.left + this.width / 2;
    const centerY = this.top + this.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-centerX, -centerY);
  }
}
```

---

## 3. 缩放实现

完善8个控制点的缩放：

```javascript
handleResize(obj, handle, currentX, currentY) {
  const dx = currentX - this.transformStart.x;
  const dy = currentY - this.transformStart.y;
  const start = this.transformStart;
  
  switch (handle) {
    case HANDLE_TYPES.BOTTOM_RIGHT:
      obj.width = Math.max(10, start.objWidth + dx);
      obj.height = Math.max(10, start.objHeight + dy);
      break;
    
    case HANDLE_TYPES.TOP_LEFT:
      const newWidth = Math.max(10, start.objWidth - dx);
      const newHeight = Math.max(10, start.objHeight - dy);
      obj.left = start.objLeft + (start.objWidth - newWidth);
      obj.top = start.objTop + (start.objHeight - newHeight);
      obj.width = newWidth;
      obj.height = newHeight;
      break;
    
    case HANDLE_TYPES.TOP_RIGHT:
      obj.width = Math.max(10, start.objWidth + dx);
      const newH = Math.max(10, start.objHeight - dy);
      obj.top = start.objTop + (start.objHeight - newH);
      obj.height = newH;
      break;
    
    case HANDLE_TYPES.BOTTOM_LEFT:
      const newW = Math.max(10, start.objWidth - dx);
      obj.left = start.objLeft + (start.objWidth - newW);
      obj.width = newW;
      obj.height = Math.max(10, start.objHeight + dy);
      break;
    
    case HANDLE_TYPES.MIDDLE_RIGHT:
      obj.width = Math.max(10, start.objWidth + dx);
      break;
    
    case HANDLE_TYPES.MIDDLE_LEFT:
      const w = Math.max(10, start.objWidth - dx);
      obj.left = start.objLeft + (start.objWidth - w);
      obj.width = w;
      break;
    
    case HANDLE_TYPES.TOP_CENTER:
      const h = Math.max(10, start.objHeight - dy);
      obj.top = start.objTop + (start.objHeight - h);
      obj.height = h;
      break;
    
    case HANDLE_TYPES.BOTTOM_CENTER:
      obj.height = Math.max(10, start.objHeight + dy);
      break;
  }
}
```

---

## 4. 等比例缩放

按住 Shift 等比例缩放：

```javascript
handleResize(obj, handle, currentX, currentY, keepAspectRatio = false) {
  // ... 基础缩放代码 ...
  
  if (keepAspectRatio) {
    const aspectRatio = this.transformStart.objWidth / this.transformStart.objHeight;
    
    switch (handle) {
      case HANDLE_TYPES.BOTTOM_RIGHT:
      case HANDLE_TYPES.TOP_LEFT:
      case HANDLE_TYPES.TOP_RIGHT:
      case HANDLE_TYPES.BOTTOM_LEFT:
        // 角点：根据宽度调整高度
        obj.height = obj.width / aspectRatio;
        break;
    }
  }
}

// 事件监听
this.canvas.addEventListener('mousemove', (e) => {
  if (this.activeHandle && this.selectedObjects.length === 1) {
    const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
    const obj = this.selectedObjects[0];
    
    if (this.activeHandle === HANDLE_TYPES.ROTATE) {
      this.handleRotate(obj, x, y);
    } else {
      this.handleResize(obj, this.activeHandle, x, y, e.shiftKey);
    }
    
    this.requestRender();
  }
});
```

---

## 5. 键盘微调

方向键微调对象位置：

```javascript
document.addEventListener('keydown', (e) => {
  if (editor.selectedObjects.length === 0) return;
  
  const step = e.shiftKey ? 10 : 1;  // Shift加速
  
  switch (e.key) {
    case 'ArrowLeft':
      editor.selectedObjects.forEach(obj => obj.left -= step);
      break;
    case 'ArrowRight':
      editor.selectedObjects.forEach(obj => obj.left += step);
      break;
    case 'ArrowUp':
      editor.selectedObjects.forEach(obj => obj.top -= step);
      break;
    case 'ArrowDown':
      editor.selectedObjects.forEach(obj => obj.top += step);
      break;
    default:
      return;
  }
  
  e.preventDefault();
  editor.requestRender();
});
```

---

## 6. 变换约束

限制变换范围：

```javascript
class BaseObject {
  set left(value) {
    this._left = Math.max(0, Math.min(value, this.canvas.width - this.width));
  }
  
  set top(value) {
    this._top = Math.max(0, Math.min(value, this.canvas.height - this.height));
  }
  
  set width(value) {
    this._width = Math.max(10, value);  // 最小宽度
  }
  
  set height(value) {
    this._height = Math.max(10, value);  // 最小高度
  }
}
```

---

## 本章小结

对象变换是编辑器的核心功能：
- **拖拽移动**：捕获鼠标拖动，更新位置
- **旋转**：计算角度，应用变换矩阵
- **缩放**：8个控制点，支持等比例
- **键盘微调**：方向键精确调整

下一章，我们将实现对象的分组与取消分组功能。
