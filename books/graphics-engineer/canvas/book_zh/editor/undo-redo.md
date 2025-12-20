# 撤销重做系统

用户执行了错误操作，按 Ctrl+Z 撤销——这是编辑器的必备功能。如何实现？答案是 **Command 模式**。

---

## 1. Command 模式

每个操作封装为一个 Command 对象，包含：
- `execute()`：执行操作
- `undo()`：撤销操作
- `redo()`：重做操作

---

## 2. Command 基类

```javascript
class Command {
  constructor(editor) {
    this.editor = editor;
  }
  
  execute() {
    throw new Error('execute() must be implemented');
  }
  
  undo() {
    throw new Error('undo() must be implemented');
  }
  
  redo() {
    this.execute();  // 默认重做就是重新执行
  }
}
```

---

## 3. 具体命令实现

### 添加对象命令

```javascript
class AddObjectCommand extends Command {
  constructor(editor, object) {
    super(editor);
    this.object = object;
  }
  
  execute() {
    this.editor.add(this.object);
  }
  
  undo() {
    this.editor.remove(this.object);
  }
}
```

### 删除对象命令

```javascript
class RemoveObjectCommand extends Command {
  constructor(editor, object) {
    super(editor);
    this.object = object;
    this.index = -1;
  }
  
  execute() {
    this.index = this.editor.objects.indexOf(this.object);
    this.editor.remove(this.object);
  }
  
  undo() {
    this.editor.objects.splice(this.index, 0, this.object);
    this.editor.requestRender();
  }
}
```

### 修改属性命令

```javascript
class ModifyCommand extends Command {
  constructor(editor, object, property, oldValue, newValue) {
    super(editor);
    this.object = object;
    this.property = property;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
  
  execute() {
    this.object[this.property] = this.newValue;
    this.editor.requestRender();
  }
  
  undo() {
    this.object[this.property] = this.oldValue;
    this.editor.requestRender();
  }
}
```

---

## 4. 历史管理器

```javascript
class History {
  constructor(maxSize = 50) {
    this.commands = [];
    this.currentIndex = -1;
    this.maxSize = maxSize;
  }
  
  execute(command) {
    command.execute();
    
    // 删除当前位置之后的所有命令
    this.commands = this.commands.slice(0, this.currentIndex + 1);
    
    // 添加新命令
    this.commands.push(command);
    this.currentIndex++;
    
    // 限制历史大小
    if (this.commands.length > this.maxSize) {
      this.commands.shift();
      this.currentIndex--;
    }
  }
  
  undo() {
    if (this.currentIndex < 0) return;
    
    const command = this.commands[this.currentIndex];
    command.undo();
    this.currentIndex--;
  }
  
  redo() {
    if (this.currentIndex >= this.commands.length - 1) return;
    
    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    command.redo();
  }
  
  canUndo() {
    return this.currentIndex >= 0;
  }
  
  canRedo() {
    return this.currentIndex < this.commands.length - 1;
  }
  
  clear() {
    this.commands = [];
    this.currentIndex = -1;
  }
}
```

---

## 5. 集成到编辑器

```javascript
class CanvasEditor {
  constructor(containerElement, options = {}) {
    // ...
    this.history = new History();
  }
  
  addObject(object) {
    const cmd = new AddObjectCommand(this, object);
    this.history.execute(cmd);
  }
  
  removeObject(object) {
    const cmd = new RemoveObjectCommand(this, object);
    this.history.execute(cmd);
  }
  
  modifyObject(object, property, newValue) {
    const oldValue = object[property];
    const cmd = new ModifyCommand(this, object, property, oldValue, newValue);
    this.history.execute(cmd);
  }
  
  undo() {
    this.history.undo();
  }
  
  redo() {
    this.history.redo();
  }
}
```

---

## 6. 快捷键

```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    editor.undo();
  } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
    e.preventDefault();
    editor.redo();
  }
});
```

---

## 7. 批量操作

多个小操作合并为一个命令：

```javascript
class BatchCommand extends Command {
  constructor(editor, commands) {
    super(editor);
    this.commands = commands;
  }
  
  execute() {
    this.commands.forEach(cmd => cmd.execute());
  }
  
  undo() {
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

// 使用
const batch = new BatchCommand(editor, [
  new ModifyCommand(editor, rect, 'fill', 'red', 'blue'),
  new ModifyCommand(editor, rect, 'left', 50, 100)
]);
editor.history.execute(batch);
```

---

## 本章小结

撤销重做系统基于 Command 模式：
- **Command 封装**：每个操作是一个命令对象
- **History 管理**：维护命令历史栈
- **execute/undo/redo**：三个核心方法
- **批量操作**：多个命令合并执行

下一章，我们将实现剪贴板操作，完成 Part 8。
