# 章节写作指导：对象分组与取消分组

## 1. 章节信息（强制性基础信息）
- **章节标题**: 对象分组与取消分组
- **文件名**: group-ungroup.md
- **所属部分**: 第八部分：图形编辑器核心功能
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标（验收清单）

### 知识目标
- 理解分组的概念和应用场景
- 掌握分组对象的数据结构设计
- 了解分组的坐标系统和变换逻辑
- 认识取消分组时的对象恢复机制

### 技能目标
- 能够实现将多个对象组合为分组
- 能够实现分组对象的渲染和交互
- 能够实现取消分组并恢复子对象
- 掌握嵌套分组的处理逻辑

## 3. 内容要点（内容清单）

### 核心概念（必须全部讲解）
- **分组（Group）**: 将多个对象组合为一个整体的容器对象
- **分组坐标系**: 分组内部的相对坐标系统
- **子对象（Children）**: 分组包含的对象集合
- **分组变换**: 对分组的变换会应用到所有子对象
- **嵌套分组**: 分组可以包含其他分组
- **取消分组（Ungroup）**: 将分组拆解为独立的子对象

### 关键知识点（必须全部覆盖）
- 如何创建分组对象（Group 类设计）
- 如何计算分组的边界框（基于所有子对象）
- 如何处理分组的相对坐标系统
- 如何渲染分组及其子对象
- 如何实现分组的点击检测
- 如何取消分组并恢复子对象到画布坐标系

## 4. 写作要求（结构规范）

- **开篇方式**: 
  - 从实际场景引入："设计一个图标时，需要将多个图形组合在一起，方便统一移动和缩放"
  - 展示分组前后的操作对比
  - 提出核心问题："如何实现对象的分组功能？"

- **结构组织**: 
  1. **分组需求分析**：列举分组的应用场景和功能需求
  2. **Group 类设计**：设计分组对象的数据结构
  3. **创建分组**：实现将多个对象组合为分组
  4. **分组坐标系**：处理分组内部的相对坐标
  5. **分组渲染**：实现分组及其子对象的绘制
  6. **分组变换**：处理分组的移动、旋转、缩放
  7. **分组交互**：实现分组的选择和点击检测
  8. **取消分组**：拆解分组并恢复子对象
  9. **嵌套分组**：处理分组包含分组的情况
  10. **完整示例**：综合展示分组功能的使用
  11. **章节小结**：总结分组系统的核心要点

- **代码示例**: 
  - **示例 1**: Group 类的完整实现（约 100-120 行）
  - **示例 2**: 创建分组的逻辑（约 40-50 行）
  - **示例 3**: 坐标系转换（约 30-40 行）
  - **示例 4**: 取消分组的实现（约 40-50 行）
  - **示例 5**: 嵌套分组的处理（约 30-40 行）

- **图表需求**: 
  - 需要一个示意图：展示分组前后的对象关系
  - 需要一个坐标系图：展示分组坐标系与画布坐标系的关系
  - 需要一个流程图：展示"创建分组 → 变换分组 → 取消分组"的流程

## 5. 技术细节（技术规范）

- **源码参考**: 
  - Fabric.js 的 `fabric.Group` 类
  - Konva.js 的 `Konva.Group` 实现
  - Paper.js 的 `paper.Group` 设计

- **实现要点**: 
  1. **Group 类基础结构**: 
     ```javascript
     class Group extends BaseObject {
       constructor(objects = []) {
         super();
         this.type = 'group';
         this.objects = [];
         this.addObjects(objects);
         this._calculateBounds();
       }
       
       addObject(object) {
         // 从画布移除对象
         if (object.canvas) {
           object.canvas.remove(object);
         }
         
         // 转换为分组坐标系
         this._toGroupCoordinates(object);
         
         this.objects.push(object);
         object.group = this;
         
         this._calculateBounds();
         this.requestRender();
       }
       
       removeObject(object) {
         const index = this.objects.indexOf(object);
         if (index !== -1) {
           this.objects.splice(index, 1);
           object.group = null;
           this._calculateBounds();
           this.requestRender();
         }
       }
     }
     ```
  
  2. **计算分组边界**: 
     ```javascript
     _calculateBounds() {
       if (this.objects.length === 0) {
         this.width = 0;
         this.height = 0;
         return;
       }
       
       let minX = Infinity, minY = Infinity;
       let maxX = -Infinity, maxY = -Infinity;
       
       this.objects.forEach(obj => {
         const box = obj.getBoundingBox();
         minX = Math.min(minX, box.x);
         minY = Math.min(minY, box.y);
         maxX = Math.max(maxX, box.x + box.width);
         maxY = Math.max(maxY, box.y + box.height);
       });
       
       // 设置分组中心点和尺寸
       this.x = (minX + maxX) / 2;
       this.y = (minY + maxY) / 2;
       this.width = maxX - minX;
       this.height = maxY - minY;
     }
     ```
  
  3. **坐标系转换**: 
     ```javascript
     _toGroupCoordinates(object) {
       // 记录对象在画布坐标系中的位置
       const canvasX = object.x;
       const canvasY = object.y;
       
       // 转换为相对于分组中心的坐标
       object.x = canvasX - this.x;
       object.y = canvasY - this.y;
     }
     
     _toCanvasCoordinates(object) {
       // 转换回画布坐标系
       const groupX = object.x;
       const groupY = object.y;
       
       // 应用分组的变换
       const angle = this.rotation * Math.PI / 180;
       const cos = Math.cos(angle);
       const sin = Math.sin(angle);
       
       object.x = this.x + (groupX * cos - groupY * sin) * this.scaleX;
       object.y = this.y + (groupX * sin + groupY * cos) * this.scaleY;
       object.rotation += this.rotation;
       object.scaleX *= this.scaleX;
       object.scaleY *= this.scaleY;
     }
     ```
  
  4. **分组渲染**: 
     ```javascript
     render(ctx) {
       ctx.save();
       
       // 应用分组变换
       ctx.translate(this.x, this.y);
       ctx.rotate(this.rotation * Math.PI / 180);
       ctx.scale(this.scaleX, this.scaleY);
       
       // 渲染所有子对象
       this.objects.forEach(obj => {
         obj.render(ctx);
       });
       
       ctx.restore();
     }
     ```
  
  5. **创建分组**: 
     ```javascript
     class Canvas {
       groupSelection() {
         if (this.selectedObjects.size < 2) {
           console.warn('需要至少选中 2 个对象才能分组');
           return;
         }
         
         const objects = Array.from(this.selectedObjects);
         
         // 创建分组
         const group = new Group(objects);
         
         // 从画布移除原对象
         objects.forEach(obj => {
           this.remove(obj);
         });
         
         // 添加分组到画布
         this.add(group);
         
         // 选中分组
         this.clearSelection();
         this.selectObject(group);
         
         this.emit('objects:grouped', { group, objects });
         this.requestRender();
         
         return group;
       }
     }
     ```
  
  6. **取消分组**: 
     ```javascript
     class Canvas {
       ungroupSelection() {
         if (!this.activeObject || this.activeObject.type !== 'group') {
           console.warn('当前选中的不是分组对象');
           return;
         }
         
         const group = this.activeObject;
         const objects = group.objects.slice(); // 复制数组
         
         // 从画布移除分组
         this.remove(group);
         
         // 恢复子对象到画布坐标系
         objects.forEach(obj => {
           group._toCanvasCoordinates(obj);
           obj.group = null;
           this.add(obj);
         });
         
         // 选中恢复的对象
         this.clearSelection();
         objects.forEach(obj => {
           this.selectObject(obj, true);
         });
         
         this.emit('group:ungrouped', { group, objects });
         this.requestRender();
         
         return objects;
       }
     }
     ```
  
  7. **点击检测**: 
     ```javascript
     class Group extends BaseObject {
       containsPoint(x, y) {
         // 先检查是否在分组边界内
         if (!super.containsPoint(x, y)) {
           return false;
         }
         
         // 转换为分组坐标系
         const localX = x - this.x;
         const localY = y - this.y;
         
         // 检查是否命中任何子对象
         return this.objects.some(obj => 
           obj.containsPoint(localX, localY)
         );
       }
     }
     ```

- **常见问题**: 
  - **问题 1**: "分组后，子对象的坐标如何处理？"
    - **解答**: 转换为相对于分组中心的相对坐标
  - **问题 2**: "取消分组时，子对象如何恢复原来的位置？"
    - **解答**: 应用分组的变换（位置、旋转、缩放）到子对象
  - **问题 3**: "嵌套分组如何处理？"
    - **解答**: 递归应用变换，或者提供"深度取消分组"功能

## 6. 风格指导（表达规范）

- **语气语调**: 
  - 从"组织复杂图形"的实际需求出发，强调分组的便利性
  - 用"就像文件夹管理文件一样"的类比，帮助理解分组概念
  - 对坐标系转换用图示清晰说明

- **类比方向**: 
  - 类比 1：分组像是"文件夹"，可以把多个文件放在一起管理
  - 类比 2：分组坐标系像是"局部坐标系"，子对象在分组内部有自己的位置
  - 类比 3：取消分组像是"拆包裹"，把包裹里的物品取出来

## 7. 章节检查清单

- [ ] 目标明确：读者是否理解了分组的实现原理和坐标系统
- [ ] 术语统一：分组、子对象、分组坐标系等术语定义清晰
- [ ] 最小实现：提供了 Group 类、创建分组、取消分组的完整实现
- [ ] 边界处理：说明了空分组、单对象分组等边界情况
- [ ] 性能与权衡：讨论了嵌套分组的性能影响
- [ ] 替代方案：对比了不同的坐标系转换策略
- [ ] 图示与代码：示意图、坐标系图与代码实现相互呼应
- [ ] 总结与练习：建议读者实现一个支持深度取消分组的功能

## 8. 写作建议与注意事项

### 重点强调
- 分组是复杂图形编辑器的核心功能，支持层级化管理
- 坐标系转换是分组实现的关键，务必讲清楚原理
- 取消分组时需要正确恢复子对象的绝对位置和变换

### 常见误区
- 不要忘记在创建分组时从画布移除原对象
- 不要忽视分组变换对子对象的影响（需要累积变换）
- 不要让空分组或单对象分组造成逻辑错误

### 推荐实现细节

1. **快捷键绑定**: 
   ```javascript
   document.addEventListener('keydown', (e) => {
     if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
       e.preventDefault();
       canvas.groupSelection();
     }
     if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') {
       e.preventDefault();
       canvas.ungroupSelection();
     }
   });
   ```

2. **深度取消分组**: 
   ```javascript
   ungroupDeep(group) {
     const allObjects = [];
     
     function flatten(obj) {
       if (obj.type === 'group') {
         obj.objects.forEach(flatten);
       } else {
         allObjects.push(obj);
       }
     }
     
     flatten(group);
     return allObjects;
   }
   ```

3. **分组序列化**: 
   ```javascript
   class Group extends BaseObject {
     toJSON() {
       return {
         ...super.toJSON(),
         type: 'group',
         objects: this.objects.map(obj => obj.toJSON())
       };
     }
     
     static fromJSON(json) {
       const objects = json.objects.map(createObjectFromJSON);
       return new Group(objects);
     }
   }
   ```

### 参考资料推荐
- Fabric.js 文档：Groups 章节
- Konva.js 文档：Group
- 《3D数学基础》：坐标系变换
- 设计模式：组合模式（Composite Pattern）
