# 章节写作指导：撤销重做系统

## 1. 章节信息（强制性基础信息）
- **章节标题**: 撤销重做系统
- **文件名**: undo-redo.md
- **所属部分**: 第八部分：图形编辑器核心功能
- **预计阅读时间**: 30分钟
- **难度等级**: 中级到高级

## 2. 学习目标（验收清单）

### 知识目标
- 理解撤销重做系统的核心原理
- 掌握命令模式（Command Pattern）的应用
- 了解历史栈的设计和管理
- 认识不同粒度的撤销策略

### 技能目标
- 能够设计并实现命令对象
- 能够实现基于历史栈的撤销重做机制
- 能够处理各种操作的撤销逻辑（增删改）
- 掌握撤销重做的性能优化策略

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **命令模式（Command Pattern）**: 将操作封装为对象，支持撤销和重做
- **历史栈（History Stack）**: 存储已执行命令的栈结构
- **撤销（Undo）**: 回退到上一个状态
- **重做（Redo）**: 恢复被撤销的操作
- **命令合并（Command Merging）**: 将连续的小操作合并为一个命令
- **快照（Snapshot）**: 保存完整状态用于快速恢复

### 关键知识点（必须全部覆盖）
- 如何设计命令接口（execute、undo 方法）
- 如何实现各种操作的命令类（添加、删除、修改等）
- 如何管理历史栈（push、pop、限制大小）
- 如何处理撤销后的新操作（清空 redo 栈）
- 如何实现命令合并优化连续操作
- 如何处理复杂命令（如分组、多选操作）

## 4. 写作要求（结构规范）

- **开篇方式**: 
  - 从用户期望引入："用户绘制了一个矩形，又修改了颜色，现在想撤销颜色修改"
  - 展示撤销重做在专业工具中的重要性
  - 提出核心问题："如何设计一个灵活可靠的撤销重做系统？"

- **结构组织**: 
  1. **撤销重做概述**：介绍核心概念和设计原则
  2. **命令模式基础**：讲解命令模式的原理
  3. **命令接口设计**：设计统一的命令接口
  4. **基础命令实现**：实现增删改命令
  5. **历史管理器**：实现历史栈的管理
  6. **撤销重做逻辑**：实现 undo 和 redo 方法
  7. **命令合并优化**：优化连续操作
  8. **复杂命令处理**：处理分组、多选等复杂场景
  9. **完整示例**：综合展示撤销重做系统的使用
  10. **性能优化**：大量历史记录的优化策略
  11. **章节小结**：总结撤销重做系统的核心要点

- **代码示例**: 
  - **示例 1**: Command 接口和基类（约 30-40 行）
  - **示例 2**: 各种命令类的实现（约 100-120 行）
  - **示例 3**: HistoryManager 类（约 80-100 行）
  - **示例 4**: 命令合并实现（约 40-50 行）
  - **示例 5**: 使用示例和快捷键绑定（约 30-40 行）

- **图表需求**: 
  - 需要一个类图：展示命令模式的类结构
  - 需要一个示意图：展示历史栈的 push/pop 操作
  - 需要一个流程图：展示"执行操作 → 记录命令 → 撤销 → 重做"的流程

## 5. 技术细节（技术规范）

- **源码参考**: 
  - Fabric.js 的历史管理（`fabric.Canvas.history`）
  - Excalidraw 的撤销重做实现
  - VS Code 的 Undo/Redo 架构

- **实现要点**: 
  1. **命令接口定义**: 
     ```javascript
     class Command {
       constructor(canvas) {
         this.canvas = canvas;
         this.timestamp = Date.now();
       }
       
       execute() {
         throw new Error('execute() must be implemented');
       }
       
       undo() {
         throw new Error('undo() must be implemented');
       }
       
       // 可选：判断是否可以与其他命令合并
       canMergeWith(other) {
         return false;
       }
       
       // 可选：与其他命令合并
       mergeWith(other) {
         throw new Error('mergeWith() must be implemented');
       }
     }
     ```
  
  2. **添加对象命令**: 
     ```javascript
     class AddObjectCommand extends Command {
       constructor(canvas, object) {
         super(canvas);
         this.object = object;
       }
       
       execute() {
         this.canvas.add(this.object);
       }
       
       undo() {
         this.canvas.remove(this.object);
       }
     }
     ```
  
  3. **删除对象命令**: 
     ```javascript
     class RemoveObjectCommand extends Command {
       constructor(canvas, object) {
         super(canvas);
         this.object = object;
         this.index = canvas.getObjectIndex(object);
       }
       
       execute() {
         this.canvas.remove(this.object);
       }
       
       undo() {
         this.canvas.insertAt(this.object, this.index);
       }
     }
     ```
  
  4. **修改属性命令**: 
     ```javascript
     class ModifyObjectCommand extends Command {
       constructor(canvas, object, property, oldValue, newValue) {
         super(canvas);
         this.object = object;
         this.property = property;
         this.oldValue = oldValue;
         this.newValue = newValue;
       }
       
       execute() {
         this.object[this.property] = this.newValue;
         this.canvas.requestRender();
       }
       
       undo() {
         this.object[this.property] = this.oldValue;
         this.canvas.requestRender();
       }
       
       // 连续修改同一属性可以合并
       canMergeWith(other) {
         return other instanceof ModifyObjectCommand &&
                other.object === this.object &&
                other.property === this.property &&
                Date.now() - this.timestamp < 1000; // 1秒内
       }
       
       mergeWith(other) {
         this.newValue = other.newValue;
         this.timestamp = other.timestamp;
       }
     }
     ```
  
  5. **历史管理器**: 
     ```javascript
     class HistoryManager {
       constructor(canvas, options = {}) {
         this.canvas = canvas;
         this.undoStack = [];
         this.redoStack = [];
         this.maxStackSize = options.maxStackSize || 100;
         this.isExecuting = false;
       }
       
       execute(command) {
         if (this.isExecuting) return;
         
         this.isExecuting = true;
         
         try {
           // 执行命令
           command.execute();
           
           // 尝试与最近的命令合并
           const lastCommand = this.undoStack[this.undoStack.length - 1];
           if (lastCommand && lastCommand.canMergeWith(command)) {
             lastCommand.mergeWith(command);
           } else {
             // 添加到撤销栈
             this.undoStack.push(command);
             
             // 限制栈大小
             if (this.undoStack.length > this.maxStackSize) {
               this.undoStack.shift();
             }
           }
           
           // 清空重做栈
           this.redoStack = [];
           
           this.canvas.emit('history:changed', {
             canUndo: this.canUndo(),
             canRedo: this.canRedo()
           });
         } finally {
           this.isExecuting = false;
         }
       }
       
       undo() {
         if (!this.canUndo() || this.isExecuting) return;
         
         this.isExecuting = true;
         
         try {
           const command = this.undoStack.pop();
           command.undo();
           this.redoStack.push(command);
           
           this.canvas.emit('history:changed', {
             canUndo: this.canUndo(),
             canRedo: this.canRedo()
           });
         } finally {
           this.isExecuting = false;
         }
       }
       
       redo() {
         if (!this.canRedo() || this.isExecuting) return;
         
         this.isExecuting = true;
         
         try {
           const command = this.redoStack.pop();
           command.execute();
           this.undoStack.push(command);
           
           this.canvas.emit('history:changed', {
             canUndo: this.canUndo(),
             canRedo: this.canRedo()
           });
         } finally {
           this.isExecuting = false;
         }
       }
       
       canUndo() {
         return this.undoStack.length > 0;
       }
       
       canRedo() {
         return this.redoStack.length > 0;
       }
       
       clear() {
         this.undoStack = [];
         this.redoStack = [];
         this.canvas.emit('history:changed', {
           canUndo: false,
           canRedo: false
         });
       }
     }
     ```
  
  6. **集成到 Canvas**: 
     ```javascript
     class Canvas {
       constructor(container, options = {}) {
         // ... 其他初始化
         this.history = new HistoryManager(this, options.history);
       }
       
       add(object) {
         const command = new AddObjectCommand(this, object);
         this.history.execute(command);
       }
       
       remove(object) {
         const command = new RemoveObjectCommand(this, object);
         this.history.execute(command);
       }
       
       modifyObject(object, property, newValue) {
         const oldValue = object[property];
         const command = new ModifyObjectCommand(
           this, object, property, oldValue, newValue
         );
         this.history.execute(command);
       }
     }
     ```
  
  7. **快捷键绑定**: 
     ```javascript
     document.addEventListener('keydown', (e) => {
       if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
         e.preventDefault();
         if (e.shiftKey) {
           canvas.history.redo();
         } else {
           canvas.history.undo();
         }
       }
       
       if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
         e.preventDefault();
         canvas.history.redo();
       }
     });
     ```
  
  8. **批量操作命令**: 
     ```javascript
     class BatchCommand extends Command {
       constructor(canvas, commands) {
         super(canvas);
         this.commands = commands;
       }
       
       execute() {
         this.commands.forEach(cmd => cmd.execute());
       }
       
       undo() {
         // 反向撤销
         for (let i = this.commands.length - 1; i >= 0; i--) {
           this.commands[i].undo();
         }
       }
     }
     
     // 使用示例：删除多个选中对象
     deleteSelection() {
       const commands = Array.from(this.selectedObjects).map(obj =>
         new RemoveObjectCommand(this, obj)
       );
       const batchCommand = new BatchCommand(this, commands);
       this.history.execute(batchCommand);
     }
     ```

- **常见问题**: 
  - **问题 1**: "撤销时如何防止触发新的命令记录？"
    - **解答**: 使用 `isExecuting` 标志位，撤销/重做时不记录新命令
  - **问题 2**: "如何处理对象引用失效的问题？"
    - **解答**: 命令中保存对象 ID，撤销时通过 ID 查找对象
  - **问题 3**: "命令合并的时机如何把握？"
    - **解答**: 通常合并1秒内的同对象同属性修改

## 6. 风格指导（表达规范）

- **语气语调**: 
  - 从"让用户放心操作"的角度出发，强调撤销重做的重要性
  - 用"就像文档编辑器的 Ctrl+Z"这样的类比，帮助理解
  - 对命令模式用清晰的类图和代码说明

- **类比方向**: 
  - 类比 1：命令模式像是"操作记录本"，记录每一步操作
  - 类比 2：历史栈像是"时间机器"，可以回到过去的状态
  - 类比 3：命令合并像是"压缩记录"，把连续的小操作合并

## 7. 章节检查清单

- [ ] 目标明确：读者是否理解了撤销重做系统的设计原理
- [ ] 术语统一：命令模式、历史栈、撤销重做等术语定义清晰
- [ ] 最小实现：提供了命令类、历史管理器的完整实现
- [ ] 边界处理：说明了栈为空、正在执行等边界情况
- [ ] 性能与权衡：讨论了命令合并、栈大小限制等优化策略
- [ ] 替代方案：对比了命令模式与快照模式
- [ ] 图示与代码：类图、示意图、流程图与代码实现相互呼应
- [ ] 总结与练习：建议读者实现一个支持命令描述的增强版系统

## 8. 写作建议与注意事项

### 重点强调
- 撤销重做是现代应用的标配，极大提升用户体验和信心
- 命令模式是实现撤销重做的经典设计模式
- 命令合并是优化用户体验的关键，避免过多琐碎的撤销步骤

### 常见误区
- 不要在撤销/重做过程中记录新命令，造成无限循环
- 不要忘记在执行新命令时清空重做栈
- 不要让历史栈无限增长，需要限制最大大小

### 推荐实现细节

1. **历史面板**: 
   ```javascript
   class HistoryPanel {
     render() {
       const list = document.getElementById('history-list');
       list.innerHTML = '';
       
       this.canvas.history.undoStack.forEach((cmd, i) => {
         const item = document.createElement('div');
         item.textContent = cmd.description || cmd.constructor.name;
         item.onclick = () => this.undoTo(i);
         list.appendChild(item);
       });
     }
     
     undoTo(index) {
       while (this.canvas.history.undoStack.length > index + 1) {
         this.canvas.history.undo();
       }
     }
   }
   ```

2. **命令描述**: 
   ```javascript
   class ModifyObjectCommand extends Command {
     constructor(canvas, object, property, oldValue, newValue) {
       super(canvas);
       this.description = `修改 ${object.name} 的 ${property}`;
     }
   }
   ```

3. **快照优化**: 
   ```javascript
   class SnapshotCommand extends Command {
     constructor(canvas) {
       super(canvas);
       this.snapshot = canvas.toJSON();
     }
       
     undo() {
       this.canvas.loadFromJSON(this.snapshot);
     }
   }
   
   // 每 10 个命令创建一个快照
   if (this.undoStack.length % 10 === 0) {
     this.undoStack.push(new SnapshotCommand(this.canvas));
   }
   ```

### 参考资料推荐
- 《设计模式》：命令模式章节
- Fabric.js 源码：历史管理实现
- VS Code 架构文档：Undo/Redo Stack
- "Undo/Redo in Figma" 技术博客
