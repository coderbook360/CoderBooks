# 为什么需要对象模型

假设你想在画布上绘制三个可拖拽的矩形，让用户能够点击、移动、删除它们。用我们目前学到的 Canvas API，你会怎么做？

这个看似简单的需求，却会暴露出 Canvas **即时模式（Immediate Mode）** 的根本局限性。

---

## 1. 直接绘制的局限

### 最简单的尝试

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 绘制三个矩形
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 80);

ctx.fillStyle = 'blue';
ctx.fillRect(200, 50, 100, 80);

ctx.fillStyle = 'green';
ctx.fillRect(350, 50, 100, 80);
```

绘制完成。但现在要问一个问题：**如何让用户拖拽这些矩形？**

---

## 2. 问题的本质：Canvas 不记得你画了什么

Canvas 绘制后，**不保留任何对象引用**。你调用 `fillRect()` 后，Canvas 只是在位图上填充了像素，它不知道"这里有个矩形对象"。

这就是 **即时模式（Immediate Mode）**：
- **绘制即丢弃**：每次绘制调用立即执行，完成后不保留任何信息
- **无对象概念**：Canvas 只是像素的集合，没有"矩形对象"、"圆形对象"的概念
- **无法直接操作**：你不能"删除某个矩形"，因为根本没有"某个矩形"这个对象

### 对比 SVG 的保留模式

SVG 采用 **保留模式（Retained Mode）**：

```html
<svg>
  <rect id="rect1" x="50" y="50" width="100" height="80" fill="red"/>
  <rect id="rect2" x="200" y="50" width="100" height="80" fill="blue"/>
</svg>
```

SVG 保留了每个图形的 DOM 节点，你可以：
```javascript
document.getElementById('rect1').remove();  // 直接删除
document.getElementById('rect2').setAttribute('fill', 'yellow');  // 修改属性
```

Canvas 没有这种能力。

---

## 3. 尝试实现交互：自己管理对象

既然 Canvas 不记得对象，那我们就**自己记住**：

```javascript
const rectangles = [
  { x: 50, y: 50, width: 100, height: 80, color: 'red' },
  { x: 200, y: 50, width: 100, height: 80, color: 'blue' },
  { x: 350, y: 50, width: 100, height: 80, color: 'green' }
];

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  rectangles.forEach(rect => {
    ctx.fillStyle = rect.color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  });
}

render();
```

现在可以操作对象了：

```javascript
// 删除第二个矩形
rectangles.splice(1, 1);
render();

// 改变第一个矩形的颜色
rectangles[0].color = 'orange';
render();
```

思考一下：这已经是一个**简单的对象模型**了。我们用 JavaScript 数组保存了图形对象的状态，Canvas 只负责渲染。

---

## 4. 实现拖拽：对象模型的必要性

现在尝试实现拖拽：

```javascript
let draggedRect = null;
let offsetX = 0;
let offsetY = 0;

canvas.addEventListener('mousedown', (e) => {
  const x = e.offsetX;
  const y = e.offsetY;
  
  // 检测点击了哪个矩形
  for (let i = rectangles.length - 1; i >= 0; i--) {
    const rect = rectangles[i];
    if (x >= rect.x && x <= rect.x + rect.width &&
        y >= rect.y && y <= rect.y + rect.height) {
      draggedRect = rect;
      offsetX = x - rect.x;
      offsetY = y - rect.y;
      break;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (draggedRect) {
    draggedRect.x = e.offsetX - offsetX;
    draggedRect.y = e.offsetY - offsetY;
    render();  // 重新绘制
  }
});

canvas.addEventListener('mouseup', () => {
  draggedRect = null;
});
```

有没有注意到？我们的代码中**完全没有直接操作 Canvas**。所有逻辑都在操作 `rectangles` 数组中的对象，最后统一调用 `render()` 重绘。

这就是 **对象模型（Object Model）** 的核心思想。

---

## 5. 对象模型的定义

**对象模型**是在 Canvas 之上构建的逻辑对象层，它：
- **状态管理**：用 JavaScript 对象保存图形的状态（位置、大小、颜色等）
- **渲染管理**：提供统一的渲染方法，将对象状态绘制到 Canvas
- **事件管理**：处理用户交互，更新对象状态，触发重绘

### 架构图

```
┌─────────────────────────────────┐
│     应用逻辑（用户交互）         │
│  (选择、拖拽、变换、删除等)      │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│      对象模型 (Object Model)     │
│  ┌──────────┐  ┌──────────┐    │
│  │ Rect对象 │  │ Circle对象│    │
│  └──────────┘  └──────────┘    │
│  (状态管理、事件处理、渲染)      │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│      Canvas 2D API               │
│  (fillRect, arc, drawImage...)   │
└─────────────────────────────────┘
```

---

## 6. 对象模型的优势

### 1. 交互能力

没有对象模型，你无法：
- 选择某个图形（因为没有"某个图形"的引用）
- 拖拽图形（无法追踪图形的状态）
- 删除图形（无法从 Canvas 上"擦掉"单个图形）

### 2. 状态管理

```javascript
// 直接绘制：无法查询状态
ctx.fillRect(50, 50, 100, 80);
// 这个矩形的位置是多少？无法知道

// 对象模型：状态可查询
const rect = { x: 50, y: 50, width: 100, height: 80 };
console.log(rect.x);  // 50
```

### 3. 动画

对象模型让动画变得简单：

```javascript
function animate() {
  rectangles[0].x += 2;  // 修改对象状态
  render();              // 重新绘制
  requestAnimationFrame(animate);
}
```

### 4. 撤销重做

保存对象状态，就能实现撤销：

```javascript
const history = [];

function saveState() {
  history.push(JSON.parse(JSON.stringify(rectangles)));
}

function undo() {
  if (history.length > 0) {
    rectangles = history.pop();
    render();
  }
}
```

### 5. 序列化

对象模型可以轻松导出和导入：

```javascript
const json = JSON.stringify(rectangles);
localStorage.setItem('canvas-data', json);

// 恢复
const restored = JSON.parse(localStorage.getItem('canvas-data'));
```

---

## 7. Fabric.js 的对象模型

专业的图形库都使用对象模型。Fabric.js 是典型代表：

```javascript
const canvas = new fabric.Canvas('canvas');

// 创建对象
const rect = new fabric.Rect({
  left: 50,
  top: 50,
  width: 100,
  height: 80,
  fill: 'red'
});

canvas.add(rect);  // 添加到画布

// 自动支持选择、拖拽、变换
rect.set('fill', 'blue');  // 修改属性
canvas.remove(rect);       // 删除对象
canvas.renderAll();        // 重新绘制
```

Fabric.js 的核心就是 `fabric.Object` 基类，所有图形对象都继承自它。

---

## 8. 代价与权衡

对象模型不是免费的：
- **内存开销**：需要存储所有对象的状态
- **性能开销**：每次交互都需要重绘整个画布
- **复杂度增加**：需要设计对象类、渲染管道、事件系统

但通过优化技术可以缓解：
- **脏矩形**：只重绘变化的区域
- **分层 Canvas**：分离静态和动态内容
- **离屏缓存**：预渲染复杂图形

---

## 9. 什么时候需要对象模型？

### 适用场景

- **图形编辑器**：需要选择、拖拽、变换图形
- **可视化看板**：需要动态更新数据驱动的图形
- **游戏**：需要管理大量游戏对象
- **交互式图表**：需要响应用户操作

### 不适用场景

- **静态图表**：绘制一次就不变了（直接用 Canvas API 即可）
- **像素艺术**：直接操作像素数据更高效
- **超高性能渲染**：对象模型的开销可能不可接受（考虑 WebGL）

---

## 本章小结

Canvas 的即时模式让它无法直接支持交互操作。**对象模型**通过在 Canvas 之上构建逻辑对象层，解决了这个问题：
- **状态管理**：用 JavaScript 对象保存图形状态
- **渲染管理**：统一的渲染流程
- **事件管理**：处理用户交互

理解了"为什么需要对象模型"后，下一章我们将设计一个通用的图形对象基类。
