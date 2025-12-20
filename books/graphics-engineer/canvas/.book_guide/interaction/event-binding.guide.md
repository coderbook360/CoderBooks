# 章节写作指导：事件绑定与坐标计算

## 1. 章节信息

- **章节标题**: 事件绑定与坐标计算
- **文件名**: interaction/event-bindng.md
- **所属部分**: 第五部分：事件与交互
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Canvas 事件处理的特点
- 掌握鼠标事件和触摸事件的绑定
- 理解事件对象的常用属性
- 掌握事件坐标到 Canvas 坐标的转换

### 技能目标
- 能够正确绑定和处理 Canvas 事件
- 能够统一处理鼠标和触摸事件
- 能够实现精确的坐标计算
- 能够设计事件处理架构

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **Canvas 事件** | Canvas 只是一个 DOM 元素，事件绑定在元素而非图形上 |
| **鼠标事件** | click, mousedown, mouseup, mousemove, mouseenter, mouseleave 等 |
| **触摸事件** | touchstart, touchmove, touchend, touchcancel |
| **Pointer 事件** | 统一的指针事件 API |

### 关键知识点

- addEventListener 绑定事件
- 事件委托与直接绑定
- 鼠标事件对象的属性
- 触摸事件与多点触控
- Pointer Events API 简介
- 被动事件监听器（passive）

### 边界与限制

- Canvas 内部图形没有独立事件
- 触摸事件需要阻止默认行为
- 移动端 300ms 延迟问题

## 4. 写作要求

### 开篇方式
指出关键区别：与 DOM 元素不同，Canvas 内部的图形不是独立的 DOM 节点，因此不能直接绑定事件。所有交互都需要通过 Canvas 元素本身的事件来处理，然后自己判断点击了哪个图形。

### 结构组织

```
1. Canvas 事件特点
   - 与 DOM 事件的区别
   - 事件绑定的位置
   - 图形交互的思路
   
2. 鼠标事件
   - 常用鼠标事件
   - 事件对象属性
   - 绑定示例
   
3. 触摸事件
   - 触摸事件类型
   - Touch 对象
   - 多点触控
   - 阻止默认行为
   
4. Pointer Events
   - 统一的指针模型
   - 兼容性处理
   - 最佳实践
   
5. 坐标转换
   - 事件坐标到 Canvas 坐标
   - 考虑各种因素
   - 封装工具函数
   
6. 事件处理架构
   - 事件分发设计
   - 性能考虑
   - 可维护性
   
7. 本章小结
```

### 代码示例

1. **鼠标事件绑定基础**
2. **触摸事件处理**
3. **统一的鼠标/触摸处理**
4. **Pointer Events 使用**
5. **坐标转换函数**
6. **事件管理器类**

### 图表需求

- **事件处理流程图**：从 DOM 事件到图形交互的完整流程
- **触摸事件对象结构图**：展示 touches, changedTouches 等

## 5. 技术细节

### 实现要点

```javascript
// 鼠标事件绑定
const canvas = document.getElementById('canvas');

canvas.addEventListener('mousedown', (e) => {
  const point = getCanvasPoint(canvas, e);
  console.log('Mouse down at:', point);
});

canvas.addEventListener('mousemove', (e) => {
  const point = getCanvasPoint(canvas, e);
  // 处理鼠标移动
});

canvas.addEventListener('mouseup', (e) => {
  // 处理鼠标释放
});

// 触摸事件处理
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();  // 阻止默认行为（如滚动）
  const touch = e.touches[0];
  const point = getCanvasPoint(canvas, touch);
  console.log('Touch start at:', point);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const point = getCanvasPoint(canvas, touch);
  // 处理触摸移动
}, { passive: false });

// 统一的指针事件处理
function getPointerPosition(canvas, e) {
  if (e.touches) {
    return getCanvasPoint(canvas, e.touches[0]);
  }
  return getCanvasPoint(canvas, e);
}

// Pointer Events (推荐)
canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  console.log('Pointer type:', e.pointerType);  // mouse, touch, pen
  console.log('Pointer down at:', point);
});

// 坐标转换（复习）
function getCanvasPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// 事件管理器
class CanvasEventManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.handlers = new Map();
    this.setupEvents();
  }
  
  setupEvents() {
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(type => {
      this.canvas.addEventListener(type, (e) => this.handleEvent(type, e));
    });
  }
  
  handleEvent(type, e) {
    const point = getCanvasPoint(this.canvas, e);
    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => handler({ type, point, originalEvent: e }));
  }
  
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);
  }
  
  off(type, handler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 触摸时页面也在滚动 | 使用 preventDefault() 并设置 passive: false |
| 触摸事件和鼠标事件都触发 | 使用 Pointer Events 或只监听一种 |
| 移动端有延迟感 | 避免 click 事件，使用 touchstart/pointerdown |
| 多点触控混乱 | 使用 pointerId 或 identifier 追踪 |

## 6. 风格指导

### 语气语调
- 强调 Canvas 与 DOM 事件的区别
- 注重实践和最佳实践

### 类比方向
- Canvas 事件类比"在一块画布上贴了一个透明的触摸板"
- 图形检测类比"你点了哪个区域由我来判断"

## 7. 与其他章节的关系

### 前置依赖
- 第19章：坐标系转换

### 后续章节铺垫
- 为第21章"点击检测"提供事件基础
- 为第22章"拖拽交互"提供事件处理基础

## 8. 章节检查清单

- [ ] 目标明确：读者能正确处理 Canvas 事件
- [ ] 术语统一：各类事件术语定义清晰
- [ ] 最小实现：提供事件管理器代码
- [ ] 边界处理：说明触摸事件的特殊处理
- [ ] 性能与权衡：提及 passive 监听器
- [ ] 图示与代码：事件流程图与代码对应
- [ ] 总结与练习：提供事件处理练习
