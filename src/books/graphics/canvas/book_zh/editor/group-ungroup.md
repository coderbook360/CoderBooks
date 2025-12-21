# 对象分组与取消分组

选中多个对象，将它们组合为一个整体，像操作单个对象一样移动、旋转、缩放——这就是 **分组（Group）**。

---

## 1. Group 类实现

```javascript
class Group extends BaseObject {
  constructor(options = {}) {
    super(options);
    this.type = 'Group';
    this.objects = options.objects || [];
    
    // 计算分组的边界
    this.updateBounds();
  }
  
  updateBounds() {
    if (this.objects.length === 0) return;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    this.objects.forEach(obj => {
      minX = Math.min(minX, obj.left);
      minY = Math.min(minY, obj.top);
      maxX = Math.max(maxX, obj.left + obj.width);
      maxY = Math.max(maxY, obj.top + obj.height);
    });
    
    this.left = minX;
    this.top = minY;
    this.width = maxX - minX;
    this.height = maxY - minY;
  }
  
  add(object) {
    this.objects.push(object);
    object.parent = this;
    this.updateBounds();
  }
  
  remove(object) {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
      object.parent = null;
      this.updateBounds();
    }
  }
  
  render(ctx) {
    this.objects.forEach(obj => {
      obj.draw(ctx);
    });
  }
  
  containsPoint(x, y) {
    return this.objects.some(obj => obj.containsPoint(x, y));
  }
}
```

---

## 2. 创建分组

```javascript
class CanvasEditor {
  groupObjects(objects) {
    if (objects.length < 2) {
      console.warn('至少需要2个对象才能分组');
      return null;
    }
    
    // 创建分组
    const group = new Group({ objects: [...objects] });
    
    // 从画布移除原对象
    objects.forEach(obj => {
      this.remove(obj);
    });
    
    // 添加分组
    this.add(group);
    
    // 选中分组
    this.clearSelection();
    this.selectObject(group);
    
    return group;
  }
  
  groupSelectedObjects() {
    if (this.selectedObjects.length < 2) return;
    return this.groupObjects(this.selectedObjects);
  }
}

// 快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'g') {
    e.preventDefault();
    editor.groupSelectedObjects();
  }
});
```

---

## 3. 取消分组

```javascript
class CanvasEditor {
  ungroupObject(group) {
    if (!(group instanceof Group)) {
      console.warn('只能取消分组对象');
      return;
    }
    
    // 获取子对象
    const objects = [...group.objects];
    
    // 从画布移除分组
    this.remove(group);
    
    // 将子对象添加回画布
    objects.forEach(obj => {
      obj.parent = null;
      this.add(obj);
    });
    
    // 选中原对象
    this.clearSelection();
    objects.forEach(obj => this.selectObject(obj, true));
    
    return objects;
  }
  
  ungroupSelectedObject() {
    if (this.selectedObjects.length !== 1) return;
    const obj = this.selectedObjects[0];
    if (obj instanceof Group) {
      return this.ungroupObject(obj);
    }
  }
}

// 快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'G') {
    e.preventDefault();
    editor.ungroupSelectedObject();
  }
});
```

---

## 4. 分组变换

移动分组时，所有子对象一起移动：

```javascript
class Group extends BaseObject {
  set left(value) {
    const dx = value - this._left;
    this._left = value;
    
    // 同步移动子对象
    this.objects.forEach(obj => {
      obj.left += dx;
    });
  }
  
  set top(value) {
    const dy = value - this._top;
    this._top = value;
    
    this.objects.forEach(obj => {
      obj.top += dy;
    });
  }
}
```

---

## 5. 嵌套分组

分组可以包含其他分组：

```javascript
const group1 = editor.groupObjects([rect1, rect2]);
const group2 = editor.groupObjects([circle1, circle2]);
const superGroup = editor.groupObjects([group1, group2]);
```

---

## 本章小结

分组功能让编辑器更强大：
- **Group类**：管理子对象集合
- **分组操作**：将多个对象组合为一体
- **取消分组**：恢复为独立对象
- **分组变换**：整体移动、旋转、缩放

下一章，我们将实现图层管理，控制对象的前后顺序。
