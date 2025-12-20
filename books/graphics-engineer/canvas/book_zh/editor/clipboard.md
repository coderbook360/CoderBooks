# 剪贴板操作

复制（Ctrl+C）、剪切（Ctrl+X）、粘贴（Ctrl+V）——编辑器的标准操作。

---

## 1. 复制对象

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ...
    this.clipboard = [];
    this.initClipboardEvents();
  }
  
  copy() {
    if (this.selectedObjects.length === 0) return;
    
    this.clipboard = this.selectedObjects.map(obj => obj.clone());
    console.log('已复制', this.clipboard.length, '个对象');
  }
  
  cut() {
    if (this.selectedObjects.length === 0) return;
    
    this.clipboard = this.selectedObjects.map(obj => obj.clone());
    
    // 删除原对象
    const batch = this.selectedObjects.map(obj => 
      new RemoveObjectCommand(this, obj)
    );
    this.history.execute(new BatchCommand(this, batch));
    
    this.clearSelection();
    console.log('已剪切', this.clipboard.length, '个对象');
  }
  
  paste() {
    if (this.clipboard.length === 0) return;
    
    this.clearSelection();
    
    // 粘贴对象，并稍微偏移位置
    const pastedObjects = this.clipboard.map(obj => {
      const cloned = obj.clone();
      cloned.left += 20;
      cloned.top += 20;
      return cloned;
    });
    
    const batch = pastedObjects.map(obj => 
      new AddObjectCommand(this, obj)
    );
    this.history.execute(new BatchCommand(this, batch));
    
    // 选中粘贴的对象
    pastedObjects.forEach(obj => this.selectObject(obj, true));
    
    console.log('已粘贴', pastedObjects.length, '个对象');
  }
}
```

---

## 2. clone 方法

确保对象可以被复制：

```javascript
class BaseObject {
  clone() {
    const Constructor = this.constructor;
    const cloned = new Constructor();
    
    // 复制所有可序列化属性
    Object.assign(cloned, this.toJSON());
    
    // 生成新ID
    cloned.id = `object_${++objectIdCounter}`;
    
    return cloned;
  }
}
```

---

## 3. 快捷键

```javascript
initClipboardEvents() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'c':
          e.preventDefault();
          this.copy();
          break;
        case 'x':
          e.preventDefault();
          this.cut();
          break;
        case 'v':
          e.preventDefault();
          this.paste();
          break;
      }
    }
  });
}
```

---

## 4. 系统剪贴板集成（可选）

使用 Clipboard API：

```javascript
async copyToSystemClipboard() {
  if (this.selectedObjects.length === 0) return;
  
  const json = JSON.stringify(this.selectedObjects.map(obj => obj.toJSON()));
  
  try {
    await navigator.clipboard.writeText(json);
    console.log('已复制到系统剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
  }
}

async pasteFromSystemClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    
    const objects = data.map(objData => ObjectFactory.create(objData));
    objects.forEach(obj => {
      obj.left += 20;
      obj.top += 20;
      this.addObject(obj);
    });
    
    console.log('从系统剪贴板粘贴成功');
  } catch (err) {
    console.error('粘贴失败:', err);
  }
}
```

---

## 5. 复制样式

只复制对象的样式属性：

```javascript
class CanvasEditor {
  copyStyle() {
    if (this.selectedObjects.length === 0) return;
    
    const obj = this.selectedObjects[0];
    this.copiedStyle = {
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity
    };
  }
  
  pasteStyle() {
    if (!this.copiedStyle || this.selectedObjects.length === 0) return;
    
    const batch = this.selectedObjects.flatMap(obj => 
      Object.entries(this.copiedStyle).map(([key, value]) =>
        new ModifyCommand(this, obj, key, obj[key], value)
      )
    );
    
    this.history.execute(new BatchCommand(this, batch));
  }
}

// 快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && e.key === 'c') {
    e.preventDefault();
    editor.copyStyle();
  } else if (e.ctrlKey && e.altKey && e.key === 'v') {
    e.preventDefault();
    editor.pasteStyle();
  }
});
```

---

## 本章小结

剪贴板操作让编辑器更实用：
- **复制/剪切/粘贴**：标准快捷键支持
- **clone 方法**：深度复制对象
- **系统剪贴板**：与其他应用互通（可选）
- **样式复制**：快速应用样式

**Part 8（图形编辑器核心功能）全部完成！**下一部分，我们将学习高级主题。
