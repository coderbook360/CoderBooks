# 章节写作指导：拖拽交互实现

## 1. 章节信息

- **章节标题**: 拖拽交互实现
- **文件名**: interaction/drag-interaction.md
- **所属部分**: 第五部分：事件与交互
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解拖拽交互的状态机模型
- 掌握拖拽的三个阶段：开始、移动、结束
- 理解拖拽偏移量的计算
- 了解拖拽的边界限制处理

### 技能目标
- 能够实现基本的图形拖拽
- 能够处理拖拽的边界约束
- 能够实现多对象拖拽
- 能够处理拖拽时的视觉反馈

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **拖拽状态机** | isDragging 状态管理 |
| **拖拽偏移** | 点击点与对象原点的偏移量 |
| **拖拽目标** | 当前被拖拽的对象 |
| **拖拽约束** | 限制拖拽范围或方向 |

### 关键知识点

- 拖拽的三个事件：mousedown/touchstart, mousemove/touchmove, mouseup/touchend
- 记录起始点和偏移量
- 全局事件监听（document 而非 canvas）
- 拖拽时阻止文本选中
- 拖拽约束：边界限制、网格吸附、方向限制

### 边界与限制

- 快速移动可能导致鼠标离开 Canvas
- 触摸事件需要特殊处理
- 多对象拖拽的复杂性

## 4. 写作要求

### 开篇方式
从用户体验角度引入：拖拽是最直观的交互方式之一。实现流畅、符合预期的拖拽体验，需要正确处理事件状态和坐标计算。

### 结构组织

```
1. 拖拽原理
   - 拖拽的三个阶段
   - 状态机模型
   - 关键数据记录
   
2. 基本拖拽实现
   - 事件监听设置
   - 偏移量计算
   - 位置更新
   - 重绘处理
   
3. 拖拽优化
   - 全局事件监听
   - 阻止默认行为
   - 光标样式反馈
   
4. 拖拽约束
   - 边界限制
   - 网格吸附
   - 方向限制
   - 碰撞检测
   
5. 多对象拖拽
   - 选择集概念
   - 同步移动
   - 相对位置保持
   
6. 拖拽反馈
   - 拖拽预览
   - 放置指示
   - 动画效果
   
7. 本章小结
```

### 代码示例

1. **基本拖拽实现**
2. **考虑偏移量的拖拽**
3. **边界约束拖拽**
4. **网格吸附拖拽**
5. **多对象同步拖拽**
6. **完整拖拽管理器**

### 图表需求

- **拖拽状态机图**：展示状态转换
- **偏移量计算图**：展示点击点与对象原点的关系

## 5. 技术细节

### 实现要点

```javascript
// 基本拖拽实现
class DragHandler {
  constructor(canvas, objects) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = objects;
    
    this.isDragging = false;
    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };
    
    this.setupEvents();
  }
  
  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    // 注意：mousemove 和 mouseup 绑定在 document 上
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }
  
  onMouseDown(e) {
    const point = this.getCanvasPoint(e);
    
    // 从上到下检测点击的对象
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.containsPoint(point.x, point.y)) {
        this.isDragging = true;
        this.dragTarget = obj;
        // 记录偏移量：点击点相对于对象位置
        this.dragOffset.x = point.x - obj.x;
        this.dragOffset.y = point.y - obj.y;
        this.canvas.style.cursor = 'grabbing';
        break;
      }
    }
  }
  
  onMouseMove(e) {
    if (!this.isDragging || !this.dragTarget) return;
    
    const point = this.getCanvasPoint(e);
    
    // 使用偏移量计算新位置，避免跳跃
    this.dragTarget.x = point.x - this.dragOffset.x;
    this.dragTarget.y = point.y - this.dragOffset.y;
    
    this.render();
  }
  
  onMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
      this.canvas.style.cursor = 'default';
    }
  }
  
  getCanvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.objects.forEach(obj => obj.draw(this.ctx));
  }
}

// 带约束的拖拽
function constrainPosition(x, y, bounds, gridSize = null) {
  let newX = x;
  let newY = y;
  
  // 边界约束
  if (bounds) {
    newX = Math.max(bounds.left, Math.min(bounds.right, x));
    newY = Math.max(bounds.top, Math.min(bounds.bottom, y));
  }
  
  // 网格吸附
  if (gridSize) {
    newX = Math.round(newX / gridSize) * gridSize;
    newY = Math.round(newY / gridSize) * gridSize;
  }
  
  return { x: newX, y: newY };
}

// 多对象拖拽
class MultiDragHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.selectedObjects = [];
    this.dragOffsets = new Map();
  }
  
  startDrag(e, clickedObject) {
    const point = this.getCanvasPoint(e);
    
    // 为每个选中对象记录相对偏移
    this.selectedObjects.forEach(obj => {
      this.dragOffsets.set(obj, {
        x: point.x - obj.x,
        y: point.y - obj.y
      });
    });
  }
  
  updateDrag(e) {
    const point = this.getCanvasPoint(e);
    
    this.selectedObjects.forEach(obj => {
      const offset = this.dragOffsets.get(obj);
      obj.x = point.x - offset.x;
      obj.y = point.y - offset.y;
    });
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 拖拽时对象跳到鼠标位置 | 正确计算和使用偏移量 |
| 快速拖动时对象丢失 | 将 move/up 事件绑定到 document |
| 拖拽时选中了文字 | 阻止默认行为，设置 user-select: none |
| 触摸拖拽不流畅 | 使用 passive: false 并 preventDefault |

## 6. 风格指导

### 语气语调
- 从用户体验角度出发
- 强调常见问题和解决方案

### 类比方向
- 拖拽状态机类比"按住、移动、松开"
- 偏移量类比"我抓住的是物体的哪个部位"

## 7. 与其他章节的关系

### 前置依赖
- 第20章：事件绑定与坐标计算
- 第21章：点击检测

### 后续章节铺垫
- 为第41章"对象变换"提供拖拽移动基础

## 8. 章节检查清单

- [ ] 目标明确：读者能实现流畅的拖拽交互
- [ ] 术语统一：拖拽、偏移量等术语定义清晰
- [ ] 最小实现：提供拖拽管理器代码
- [ ] 边界处理：说明快速移动和边界约束
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：状态机图与代码对应
- [ ] 总结与练习：提供拖拽实现练习
