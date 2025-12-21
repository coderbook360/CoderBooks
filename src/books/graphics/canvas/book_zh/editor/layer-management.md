# 图层管理：层级与排序

在图形编辑器中，用户绘制了多个重叠的图形：一个红色圆形、一个蓝色矩形、一张图片。现在用户想把被遮挡的圆形移到最顶层，该如何实现？

这就是 **图层管理**（Layer Management）要解决的问题：控制对象的绘制顺序（Z-Index），让用户能够调整谁在前、谁在后。本章将实现完整的图层管理系统，包括层级操作、可视化面板、批量处理、与撤销重做系统的集成，以及高级功能如图层锁定和可见性控制。

---

## 1. Z-Index 原理：数组即是图层

### 1.1 绘制顺序基础

Canvas 的绘制是 **后画覆盖先画**（Painter's Algorithm）：

```javascript
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);

ctx.fillStyle = 'blue';
ctx.fillRect(50, 50, 100, 100); // 蓝色矩形覆盖红色矩形
```

在编辑器中，对象存储在数组中，遍历绘制：

```javascript
class CanvasEditor {
  constructor() {
    this.objects = []; // 对象数组
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 按数组顺序绘制
    this.objects.forEach(obj => {
      obj.render(this.ctx);
    });
  }
}
```

**Z-Index 映射**：

```
数组索引：  0        1        2        3
对象：     rect1    rect2    rect3    rect4
绘制顺序： 先画     ——→     ——→     后画
视觉层级： 底层     ——→     ——→     顶层
```

**设计思考**：为什么不用单独的 `zIndex` 属性？

很多库（如 Fabric.js）的确为每个对象维护 `zIndex` 属性，绘制前排序。但这带来额外开销：
- 每次渲染都要排序（O(n log n)）
- 维护 `zIndex` 的唯一性和连续性

使用数组位置作为隐式 Z-Index 更简单高效：
- 遍历即渲染，无需排序
- 调整顺序只需数组操作（O(1) 或 O(n)）

---

## 2. 基础层级操作

### 2.1 四个核心操作

```javascript
class CanvasEditor {
  // 1. 移到最顶层（Bring to Front）
  bringToFront(object) {
    const index = this.objects.indexOf(object);
    if (index === -1 || index === this.objects.length - 1) {
      return; // 已经在最顶层或对象不存在
    }
    
    this.objects.splice(index, 1); // 从原位置移除
    this.objects.push(object);     // 添加到数组末尾（顶层）
    this.requestRender();
    this.emit('objects:modified');
  }
  
  // 2. 移到最底层（Send to Back）
  sendToBack(object) {
    const index = this.objects.indexOf(object);
    if (index === -1 || index === 0) {
      return; // 已经在最底层或对象不存在
    }
    
    this.objects.splice(index, 1);  // 从原位置移除
    this.objects.unshift(object);   // 添加到数组开头（底层）
    this.requestRender();
    this.emit('objects:modified');
  }
  
  // 3. 向上移动一层（Bring Forward）
  bringForward(object) {
    const index = this.objects.indexOf(object);
    if (index === -1 || index === this.objects.length - 1) {
      return; // 已经在最顶层或对象不存在
    }
    
    // 交换位置
    [this.objects[index], this.objects[index + 1]] = 
      [this.objects[index + 1], this.objects[index]];
    
    this.requestRender();
    this.emit('objects:modified');
  }
  
  // 4. 向下移动一层（Send Backward）
  sendBackward(object) {
    const index = this.objects.indexOf(object);
    if (index === -1 || index === 0) {
      return; // 已经在最底层或对象不存在
    }
    
    // 交换位置
    [this.objects[index], this.objects[index - 1]] = 
      [this.objects[index - 1], this.objects[index]];
    
    this.requestRender();
    this.emit('objects:modified');
  }
}
```

### 2.2 批量操作优化

**问题**：如果用户选中了多个对象，依次调用 `bringForward`，会导致顺序混乱。

```javascript
// ❌ 错误：依次提升会改变相对顺序
selectedObjects.forEach(obj => editor.bringForward(obj));
```

**正确方案**：先排序，再批量处理

```javascript
class CanvasEditor {
  // 批量移到最顶层
  bringToFrontMultiple(objects) {
    // 1. 过滤出存在的对象
    const validObjects = objects.filter(obj => this.objects.includes(obj));
    if (validObjects.length === 0) return;
    
    // 2. 从数组中移除这些对象
    this.objects = this.objects.filter(obj => !validObjects.includes(obj));
    
    // 3. 按原有顺序添加到末尾
    this.objects.push(...validObjects);
    
    this.requestRender();
    this.emit('objects:modified');
  }
  
  // 批量移到最底层
  sendToBackMultiple(objects) {
    const validObjects = objects.filter(obj => this.objects.includes(obj));
    if (validObjects.length === 0) return;
    
    this.objects = this.objects.filter(obj => !validObjects.includes(obj));
    
    // 按原有顺序添加到开头
    this.objects.unshift(...validObjects);
    
    this.requestRender();
    this.emit('objects:modified');
  }
  
  // 批量向上移动
  bringForwardMultiple(objects) {
    // 按当前位置从后往前排序（避免交换时互相影响）
    const sorted = objects
      .filter(obj => this.objects.includes(obj))
      .sort((a, b) => this.objects.indexOf(b) - this.objects.indexOf(a));
    
    sorted.forEach(obj => this.bringForward(obj));
  }
  
  // 批量向下移动
  sendBackwardMultiple(objects) {
    // 按当前位置从前往后排序
    const sorted = objects
      .filter(obj => this.objects.includes(obj))
      .sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
    
    sorted.forEach(obj => this.sendBackward(obj));
  }
}
```

---

## 3. 快捷键与用户交互

### 3.1 标准快捷键

参考主流图形编辑器（Photoshop, Figma, Sketch）的快捷键约定：

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 上移一层 | Ctrl + ] | Cmd + ] |
| 下移一层 | Ctrl + [ | Cmd + [ |
| 移到顶层 | Ctrl + Shift + ] | Cmd + Shift + ] |
| 移到底层 | Ctrl + Shift + [ | Cmd + Shift + [ |

```javascript
class LayerKeyboardShortcuts {
  constructor(editor) {
    this.editor = editor;
    this.attachListeners();
  }
  
  attachListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }
  
  handleKeyDown(e) {
    const selected = this.editor.getSelectedObjects();
    if (selected.length === 0) return;
    
    // 检测 Ctrl/Cmd 键（跨平台兼容）
    const isMod = e.ctrlKey || e.metaKey;
    
    if (!isMod) return;
    
    if (e.key === ']') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Ctrl/Cmd + Shift + ]：移到顶层
        if (selected.length === 1) {
          this.editor.bringToFront(selected[0]);
        } else {
          this.editor.bringToFrontMultiple(selected);
        }
      } else {
        // Ctrl/Cmd + ]：上移一层
        if (selected.length === 1) {
          this.editor.bringForward(selected[0]);
        } else {
          this.editor.bringForwardMultiple(selected);
        }
      }
    } else if (e.key === '[') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Ctrl/Cmd + Shift + [：移到底层
        if (selected.length === 1) {
          this.editor.sendToBack(selected[0]);
        } else {
          this.editor.sendToBackMultiple(selected);
        }
      } else {
        // Ctrl/Cmd + [：下移一层
        if (selected.length === 1) {
          this.editor.sendBackward(selected[0]);
        } else {
          this.editor.sendBackwardMultiple(selected);
        }
      }
    }
  }
}

// 使用
new LayerKeyboardShortcuts(editor);
```

### 3.2 右键菜单集成

```javascript
class LayerContextMenu {
  constructor(editor) {
    this.editor = editor;
    this.createMenu();
  }
  
  createMenu() {
    this.menu = document.createElement('div');
    this.menu.className = 'context-menu';
    this.menu.style.display = 'none';
    this.menu.innerHTML = `
      <div class="menu-item" data-action="bring-to-front">置于顶层 (Ctrl+Shift+])</div>
      <div class="menu-item" data-action="bring-forward">上移一层 (Ctrl+])</div>
      <div class="menu-item" data-action="send-backward">下移一层 (Ctrl+[)</div>
      <div class="menu-item" data-action="send-to-back">置于底层 (Ctrl+Shift+[)</div>
    `;
    document.body.appendChild(this.menu);
    
    this.menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(action);
        this.hide();
      }
    });
  }
  
  show(x, y) {
    this.menu.style.left = x + 'px';
    this.menu.style.top = y + 'px';
    this.menu.style.display = 'block';
  }
  
  hide() {
    this.menu.style.display = 'none';
  }
  
  handleAction(action) {
    const selected = this.editor.getSelectedObjects();
    if (selected.length === 0) return;
    
    switch (action) {
      case 'bring-to-front':
        this.editor.bringToFrontMultiple(selected);
        break;
      case 'bring-forward':
        this.editor.bringForwardMultiple(selected);
        break;
      case 'send-backward':
        this.editor.sendBackwardMultiple(selected);
        break;
      case 'send-to-back':
        this.editor.sendToBackMultiple(selected);
        break;
    }
  }
}
```

---

## 4. 可视化图层面板

### 4.1 完整的图层面板实现

```javascript
class LayerPanel {
  constructor(editor, containerElement) {
    this.editor = editor;
    this.container = containerElement;
    this.setupUI();
    this.attachListeners();
    this.render();
  }
  
  setupUI() {
    this.container.innerHTML = `
      <div class="layer-panel">
        <div class="layer-panel-header">
          <span>图层</span>
          <button class="icon-btn" data-action="delete" title="删除图层">🗑️</button>
        </div>
        <div class="layer-list"></div>
      </div>
    `;
    
    this.layerList = this.container.querySelector('.layer-list');
    this.container.querySelector('[data-action="delete"]')
      .addEventListener('click', () => this.deleteSelected());
  }
  
  attachListeners() {
    // 监听编辑器事件
    this.editor.on('objects:added', () => this.render());
    this.editor.on('objects:removed', () => this.render());
    this.editor.on('objects:modified', () => this.render());
    this.editor.on('selection:updated', () => this.render());
  }
  
  render() {
    this.layerList.innerHTML = '';
    
    // 从顶层到底层显示（数组倒序）
    const objects = [...this.editor.objects].reverse();
    const selectedIds = new Set(
      this.editor.getSelectedObjects().map(obj => obj.id)
    );
    
    objects.forEach((obj, reverseIndex) => {
      const actualIndex = this.editor.objects.length - 1 - reverseIndex;
      const item = this.createLayerItem(obj, actualIndex, selectedIds.has(obj.id));
      this.layerList.appendChild(item);
    });
  }
  
  createLayerItem(obj, index, isSelected) {
    const item = document.createElement('div');
    item.className = 'layer-item' + (isSelected ? ' selected' : '');
    item.dataset.index = index;
    
    item.innerHTML = `
      <span class="layer-visibility" title="显示/隐藏">
        ${obj.visible !== false ? '👁️' : '🚫'}
      </span>
      <span class="layer-lock" title="锁定/解锁">
        ${obj.locked ? '🔒' : '🔓'}
      </span>
      <span class="layer-name">${this.getObjectName(obj)}</span>
      <span class="layer-type">${obj.type}</span>
    `;
    
    // 点击选中
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.layer-visibility, .layer-lock')) {
        this.handleSelect(obj, e.ctrlKey || e.metaKey, e.shiftKey);
      }
    });
    
    // 可见性切换
    item.querySelector('.layer-visibility').addEventListener('click', () => {
      this.toggleVisibility(obj);
    });
    
    // 锁定切换
    item.querySelector('.layer-lock').addEventListener('click', () => {
      this.toggleLock(obj);
    });
    
    // 拖拽重排序（简化版）
    item.draggable = true;
    item.addEventListener('dragstart', (e) => this.handleDragStart(e, obj));
    item.addEventListener('dragover', (e) => this.handleDragOver(e));
    item.addEventListener('drop', (e) => this.handleDrop(e, index));
    
    return item;
  }
  
  getObjectName(obj) {
    return obj.name || `${obj.type}_${obj.id.slice(0, 6)}`;
  }
  
  handleSelect(obj, isMulti, isRange) {
    if (isRange) {
      // Shift 点击：范围选择
      this.editor.selectRange(obj);
    } else if (isMulti) {
      // Ctrl/Cmd 点击：多选
      this.editor.toggleSelection(obj);
    } else {
      // 单选
      this.editor.clearSelection();
      this.editor.selectObject(obj);
    }
  }
  
  toggleVisibility(obj) {
    obj.visible = obj.visible === false;
    this.editor.requestRender();
    this.render();
  }
  
  toggleLock(obj) {
    obj.locked = !obj.locked;
    this.render();
  }
  
  deleteSelected() {
    const selected = this.editor.getSelectedObjects();
    if (selected.length === 0) return;
    
    if (confirm(`确定删除 ${selected.length} 个对象？`)) {
      this.editor.removeObjects(selected);
    }
  }
  
  // 拖拽重排序
  handleDragStart(e, obj) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', obj.id);
    this.draggedObject = obj;
  }
  
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  handleDrop(e, targetIndex) {
    e.preventDefault();
    
    if (!this.draggedObject) return;
    
    const fromIndex = this.editor.objects.indexOf(this.draggedObject);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    
    // 移动对象到新位置
    this.editor.objects.splice(fromIndex, 1);
    this.editor.objects.splice(targetIndex, 0, this.draggedObject);
    
    this.editor.requestRender();
    this.editor.emit('objects:modified');
    this.render();
    
    this.draggedObject = null;
  }
}

// CSS
const style = `
.layer-panel {
  width: 250px;
  border: 1px solid #ccc;
  background: #fff;
}

.layer-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #ccc;
  font-weight: bold;
}

.layer-list {
  max-height: 400px;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-item.selected {
  background: #e3f2fd;
}

.layer-visibility,
.layer-lock {
  margin-right: 6px;
  cursor: pointer;
  user-select: none;
}

.layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-type {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
`;
```

---

## 5. 与撤销重做系统集成

图层操作应该支持撤销重做：

```javascript
class LayerCommand {
  constructor(editor, object, fromIndex, toIndex) {
    this.editor = editor;
    this.object = object;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }
  
  execute() {
    this.moveObject(this.fromIndex, this.toIndex);
  }
  
  undo() {
    this.moveObject(this.toIndex, this.fromIndex);
  }
  
  moveObject(from, to) {
    const currentIndex = this.editor.objects.indexOf(this.object);
    if (currentIndex !== from) {
      console.warn('Object index mismatch');
      return;
    }
    
    this.editor.objects.splice(from, 1);
    this.editor.objects.splice(to, 0, this.object);
    this.editor.requestRender();
  }
}

// 在 CanvasEditor 中集成
class CanvasEditor {
  bringForward(object) {
    const index = this.objects.indexOf(object);
    if (index === -1 || index === this.objects.length - 1) return;
    
    const command = new LayerCommand(this, object, index, index + 1);
    this.history.execute(command); // 通过历史管理器执行
  }
  
  // 其他层级操作类似...
}
```

---

## 6. 高级功能：锁定与可见性

### 6.1 图层锁定

锁定的对象不可选中、不可编辑：

```javascript
class CanvasEditor {
  // 点击检测时跳过锁定对象
  findObjectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      
      // 跳过锁定或不可见的对象
      if (obj.locked || obj.visible === false) continue;
      
      if (obj.containsPoint(x, y)) {
        return obj;
      }
    }
    return null;
  }
  
  // 批量锁定/解锁
  lockObjects(objects) {
    objects.forEach(obj => obj.locked = true);
    this.emit('objects:modified');
  }
  
  unlockObjects(objects) {
    objects.forEach(obj => obj.locked = false);
    this.emit('objects:modified');
  }
}
```

### 6.2 图层可见性

不可见的对象不绘制：

```javascript
class CanvasEditor {
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.objects.forEach(obj => {
      // 跳过不可见对象
      if (obj.visible === false) return;
      
      obj.render(this.ctx);
    });
    
    this.renderSelection();
  }
}
```

---

## 本章小结

图层管理是图形编辑器的核心功能，本章实现了：

1. **Z-Index 原理**：数组位置即图层顺序，简单高效
2. **层级操作**：上移、下移、置顶、置底，支持单个和批量
3. **用户交互**：标准快捷键（Ctrl+[/]）和右键菜单
4. **可视化面板**：显示图层列表，支持拖拽排序
5. **高级功能**：图层锁定（不可编辑）和可见性（不绘制）
6. **撤销重做集成**：所有图层操作可撤销

**设计要点**：
- 数组位置作为隐式 Z-Index，避免维护额外属性
- 批量操作时保持相对顺序
- 锁定和可见性分离关注点（编辑 vs 渲染）
- 通过事件系统解耦图层面板与编辑器核心

在下一章，我们将实现撤销重做系统，让用户能够回退任何操作。
