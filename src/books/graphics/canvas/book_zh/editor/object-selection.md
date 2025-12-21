# 对象选择机制

画布上有多个图形，用户点击其中一个，如何知道点击了哪个对象？如何高亮显示选中的对象？

这就是 **对象选择机制**。

---

## 1. 选择的核心：点击检测

用户点击屏幕坐标 `(screenX, screenY)`，需要：
1. 转换为画布坐标
2. 检测哪个对象包含这个点
3. 选中该对象

```javascript
class CanvasEditor {
  // ...
  
  initSelectionEvents() {
    this.selectedObjects = [];
    
    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
      const obj = this.findObjectAtPoint(x, y);
      
      if (obj) {
        this.selectObject(obj, e.shiftKey);  // Shift 多选
      } else {
        this.clearSelection();
      }
    });
  }
  
  selectObject(object, addToSelection = false) {
    if (!addToSelection) {
      this.clearSelection();
    }
    
    object.selected = true;
    this.selectedObjects.push(object);
    this.requestRender();
  }
  
  clearSelection() {
    this.selectedObjects.forEach(obj => {
      obj.selected = false;
    });
    this.selectedObjects = [];
    this.requestRender();
  }
}
```

---

## 2. 高亮显示选中对象

```javascript
class BaseObject {
  // ...
  
  draw(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    this.applyTransform(ctx);
    this.render(ctx);
    
    // 绘制选中框
    if (this.selected) {
      this.drawSelectionBox(ctx);
    }
    
    ctx.restore();
  }
  
  drawSelectionBox(ctx) {
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / (this.canvas?.viewportZoom || 1);  // 固定线宽
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(this.left, this.top, this.width, this.height);
    ctx.setLineDash([]);
  }
}
```

---

## 3. 框选（Marquee Selection）

按住鼠标拖动绘制选择框，选中框内所有对象。

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ...
    this.marquee = null;  // { startX, startY, endX, endY }
    this.initMarqueeEvents();
  }
  
  initMarqueeEvents() {
    let marqueeStart = null;
    
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !e.shiftKey) {
        const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
        const obj = this.findObjectAtPoint(x, y);
        
        if (!obj) {
          // 空白区域，开始框选
          marqueeStart = { x, y };
          this.clearSelection();
        }
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (marqueeStart) {
        const { x, y } = this.screenToCanvas(e.clientX, e.clientY);
        this.marquee = {
          startX: marqueeStart.x,
          startY: marqueeStart.y,
          endX: x,
          endY: y
        };
        this.requestRender();
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      if (this.marquee) {
        this.selectObjectsInMarquee();
        this.marquee = null;
        marqueeStart = null;
        this.requestRender();
      }
    });
  }
  
  selectObjectsInMarquee() {
    const { startX, startY, endX, endY } = this.marquee;
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const right = Math.max(startX, endX);
    const bottom = Math.max(startY, endY);
    
    this.objects.forEach(obj => {
      if (this.isObjectInRect(obj, left, top, right, bottom)) {
        this.selectObject(obj, true);
      }
    });
  }
  
  isObjectInRect(obj, left, top, right, bottom) {
    return obj.left < right &&
           obj.left + obj.width > left &&
           obj.top < bottom &&
           obj.top + obj.height > top;
  }
  
  render() {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.translate(this.viewportX, this.viewportY);
    this.ctx.scale(this.viewportZoom, this.viewportZoom);
    
    // 绘制对象
    this.objects.forEach(obj => {
      if (obj.visible) {
        obj.draw(this.ctx);
      }
    });
    
    // 绘制框选框
    if (this.marquee) {
      this.drawMarquee();
    }
    
    this.ctx.restore();
  }
  
  drawMarquee() {
    const { startX, startY, endX, endY } = this.marquee;
    const width = endX - startX;
    const height = endY - startY;
    
    this.ctx.fillStyle = 'rgba(0, 170, 255, 0.1)';
    this.ctx.fillRect(startX, startY, width, height);
    
    this.ctx.strokeStyle = '#00aaff';
    this.ctx.lineWidth = 1 / this.viewportZoom;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(startX, startY, width, height);
    this.ctx.setLineDash([]);
  }
}
```

---

## 4. 多选与取消选择

- **Shift + 点击**：添加到选择
- **Ctrl/Cmd + 点击**：切换选择状态

```javascript
selectObject(object, addToSelection = false) {
  if (addToSelection) {
    const index = this.selectedObjects.indexOf(object);
    if (index !== -1) {
      // 已选中，取消选择
      object.selected = false;
      this.selectedObjects.splice(index, 1);
    } else {
      // 未选中，添加到选择
      object.selected = true;
      this.selectedObjects.push(object);
    }
  } else {
    this.clearSelection();
    object.selected = true;
    this.selectedObjects.push(object);
  }
  
  this.requestRender();
}
```

---

## 5. 全选与反选

```javascript
class CanvasEditor {
  // ...
  
  selectAll() {
    this.clearSelection();
    this.objects.forEach(obj => {
      obj.selected = true;
      this.selectedObjects.push(obj);
    });
    this.requestRender();
  }
  
  invertSelection() {
    this.objects.forEach(obj => {
      obj.selected = !obj.selected;
      if (obj.selected) {
        this.selectedObjects.push(obj);
      } else {
        const index = this.selectedObjects.indexOf(obj);
        if (index !== -1) {
          this.selectedObjects.splice(index, 1);
        }
      }
    });
    this.requestRender();
  }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'a') {
    e.preventDefault();
    editor.selectAll();
  }
});
```

---

## 本章小结

对象选择是编辑器的基础交互：
- **点击选择**：findObjectAtPoint + selectObject
- **框选**：绘制选择框，选中框内对象
- **多选**：Shift 添加，Ctrl 切换
- **高亮显示**：绘制选中框

下一章，我们将为选中对象添加控制点，实现拖拽、旋转、缩放。
