# 事件绑定与坐标计算

Canvas与普通DOM元素有一个根本区别：**Canvas内部绘制的图形不是独立的DOM节点**。这意味着你不能像操作按钮那样给每个矩形、圆形单独绑定 `onclick` 事件。所有交互都必须通过Canvas元素本身的事件来处理，然后由你的代码判断用户点击或触摸的是哪个图形。本章将系统讲解Canvas的事件处理机制。

## Canvas 事件的特点

首先要问一个问题：**为什么Canvas内部的图形不能像按钮那样直接绑定事件？**

答案在于Canvas的工作原理：Canvas是一个**位图（Bitmap）**画布，你调用 `fillRect()` 后，浏览器只是在像素级别记录了颜色，并不记录"这里有一个矩形对象"。

对比DOM元素：

```javascript
// DOM 元素：每个按钮是独立对象，可以直接绑定事件
const button = document.querySelector('button');
button.addEventListener('click', () => {
  console.log('Button clicked!');
});

// Canvas：图形只是像素，没有对象概念
ctx.fillRect(50, 50, 100, 100);
// ❌ 无法这样做：rect.addEventListener('click', ...)
```

因此，Canvas交互的思路是：
1. 在Canvas元素上绑定事件
2. 获取点击坐标
3. 自己判断坐标在哪个图形内
4. 执行相应的逻辑

## 鼠标事件

现在我要问第二个问题：**Canvas支持哪些鼠标事件？**

答案是所有标准的DOM鼠标事件：

| 事件类型 | 触发时机 | 常见用途 |
|---------|---------|---------|
| `mousedown` | 鼠标按下 | 拖拽开始、选择开始 |
| `mouseup` | 鼠标释放 | 拖拽结束、选择结束 |
| `mousemove` | 鼠标移动 | 拖拽中、悬停检测 |
| `click` | 点击（down+up） | 选中对象、触发操作 |
| `dblclick` | 双击 | 进入编辑模式 |
| `mouseenter` | 鼠标进入Canvas | 显示提示 |
| `mouseleave` | 鼠标离开Canvas | 隐藏提示 |
| `wheel` | 滚轮滚动 | 缩放、滚动 |

基本绑定示例：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', (e) => {
  console.log('Mouse down at:', e.clientX, e.clientY);
});

canvas.addEventListener('mousemove', (e) => {
  console.log('Mouse moving:', e.clientX, e.clientY);
});

canvas.addEventListener('mouseup', (e) => {
  console.log('Mouse up at:', e.clientX, e.clientY);
});
```

### 事件对象的关键属性

思考一下，事件对象 `e` 包含哪些有用的坐标信息？

```javascript
canvas.addEventListener('click', (e) => {
  console.log('clientX/Y:', e.clientX, e.clientY);  // 相对视口
  console.log('pageX/Y:', e.pageX, e.pageY);        // 相对页面（含滚动）
  console.log('offsetX/Y:', e.offsetX, e.offsetY);  // 相对Canvas（不推荐）
  console.log('button:', e.button);                  // 鼠标按钮：0左键，1中键，2右键
  console.log('shiftKey:', e.shiftKey);             // 是否按住Shift
  console.log('ctrlKey:', e.ctrlKey);               // 是否按住Ctrl
});
```

**重要提示**：上一章讲过，应该使用 `clientX/Y` + `getBoundingClientRect()` 计算Canvas坐标，而不是 `offsetX/Y`（受CSS影响不稳定）。

## 触摸事件

现在我要问第三个问题：**如何让Canvas支持移动端触摸？**

答案是监听触摸事件：

| 事件类型 | 触发时机 |
|---------|---------|
| `touchstart` | 手指触摸屏幕 |
| `touchmove` | 手指在屏幕上移动 |
| `touchend` | 手指离开屏幕 |
| `touchcancel` | 触摸被中断（如来电） |

触摸事件的关键区别：**支持多点触控**

```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();  // 阻止默认行为（如页面滚动）
  
  console.log('触点数量:', e.touches.length);
  
  // 遍历所有触点
  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    console.log(`触点${i}:`, touch.clientX, touch.clientY);
  }
});
```

触摸事件对象包含三个关键属性：

- **touches**：当前所有触点
- **targetTouches**：当前元素上的所有触点
- **changedTouches**：本次事件改变的触点

对于单点触摸（最常见），简化处理：

```javascript
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  
  const touch = e.touches[0];  // 获取第一个触点
  console.log('Touch at:', touch.clientX, touch.clientY);
});
```

### 阻止默认行为的重要性

思考一下，如果不调用 `e.preventDefault()` 会怎样？

移动端浏览器会执行默认行为，包括：
- 页面滚动
- 双击缩放
- 长按选择文本

这会干扰Canvas交互，因此必须阻止：

```javascript
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();  // 防止页面滚动
  // 处理触摸移动...
}, { passive: false });  // 重要！允许preventDefault
```

**passive: false** 是必需的，否则浏览器会忽略 `preventDefault()`（性能优化）。

## Pointer Events：统一的指针模型

现在我要问第四个问题：**有没有统一处理鼠标和触摸的方法？**

答案是 **Pointer Events API**，它统一了鼠标、触摸、触控笔等输入：

| 事件类型 | 对应鼠标/触摸 |
|---------|-------------|
| `pointerdown` | mousedown / touchstart |
| `pointermove` | mousemove / touchmove |
| `pointerup` | mouseup / touchend |
| `pointercancel` | touchcancel |

优点：
- **一套代码**处理多种输入
- **更好的兼容性**（现代浏览器全支持）
- **统一的API**

```javascript
canvas.addEventListener('pointerdown', (e) => {
  console.log('Pointer down:', e.clientX, e.clientY);
  console.log('Pointer type:', e.pointerType);  // 'mouse', 'touch', 'pen'
  console.log('Pressure:', e.pressure);         // 压力（触控笔）
});

canvas.addEventListener('pointermove', (e) => {
  console.log('Pointer move:', e.clientX, e.clientY);
});

canvas.addEventListener('pointerup', (e) => {
  console.log('Pointer up:', e.clientX, e.clientY);
});
```

**推荐使用Pointer Events**，除非需要兼容非常老的浏览器。

## 坐标转换：核心工具函数

现在我要问第五个问题：**如何将事件坐标转换为Canvas内部坐标？**

这是上一章的核心内容，这里提供一个实用的工具函数：

```javascript
function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  
  // 处理触摸事件
  const clientX = event.clientX !== undefined 
    ? event.clientX 
    : event.touches[0].clientX;
  const clientY = event.clientY !== undefined 
    ? event.clientY 
    : event.touches[0].clientY;
  
  // 计算Canvas坐标
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  
  return { x, y };
}

// 使用
canvas.addEventListener('pointerdown', (e) => {
  const point = getCanvasPoint(canvas, e);
  console.log('Canvas坐标:', point.x, point.y);
});
```

这个函数自动处理：
- 鼠标和触摸事件
- Canvas在页面中的位置
- CSS尺寸与内部尺寸的缩放

## 事件处理架构

现在我要问第六个问题：**如何设计一个可扩展的事件处理系统？**

答案是封装一个 **EventManager** 类：

```javascript
class CanvasEventManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handlers = {};
    
    this.setupListeners();
  }
  
  setupListeners() {
    // 使用 Pointer Events 统一处理
    this.canvas.addEventListener('pointerdown', (e) => {
      const point = this.getCanvasPoint(e);
      this.emit('pointerdown', { point, originalEvent: e });
    });
    
    this.canvas.addEventListener('pointermove', (e) => {
      const point = this.getCanvasPoint(e);
      this.emit('pointermove', { point, originalEvent: e });
    });
    
    this.canvas.addEventListener('pointerup', (e) => {
      const point = this.getCanvasPoint(e);
      this.emit('pointerup', { point, originalEvent: e });
    });
    
    // 滚轮事件
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const point = this.getCanvasPoint(e);
      this.emit('wheel', {
        point,
        deltaY: e.deltaY,
        originalEvent: e
      });
    }, { passive: false });
  }
  
  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = event.clientX !== undefined 
      ? event.clientX 
      : event.touches[0].clientX;
    const clientY = event.clientY !== undefined 
      ? event.clientY 
      : event.touches[0].clientY;
    
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }
  
  on(eventName, handler) {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);
  }
  
  off(eventName, handler) {
    if (!this.handlers[eventName]) return;
    const index = this.handlers[eventName].indexOf(handler);
    if (index > -1) {
      this.handlers[eventName].splice(index, 1);
    }
  }
  
  emit(eventName, data) {
    if (!this.handlers[eventName]) return;
    this.handlers[eventName].forEach(handler => handler(data));
  }
}

// 使用
const eventManager = new CanvasEventManager(canvas);

eventManager.on('pointerdown', ({ point, originalEvent }) => {
  console.log('Click at:', point.x, point.y);
  // 这里进行点击检测...
});

eventManager.on('wheel', ({ point, deltaY }) => {
  console.log('Zoom at:', point.x, point.y, 'delta:', deltaY);
  // 这里进行缩放...
});
```

这个架构的优点：
- **统一接口**：外部只需要 `on/off` 订阅事件
- **坐标自动转换**：内部处理所有坐标计算
- **可扩展**：容易添加新事件类型
- **解耦**：事件处理逻辑与业务逻辑分离

## 性能考虑

现在我要问第七个问题：**mousemove 事件触发频率很高，如何优化性能？**

答案是**节流（Throttle）**或**防抖（Debounce）**：

```javascript
function throttle(fn, delay) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// 使用节流
canvas.addEventListener('pointermove', throttle((e) => {
  const point = getCanvasPoint(canvas, e);
  // 处理移动...
}, 16));  // 约60fps
```

或者只在需要时启用 mousemove 监听：

```javascript
let isDragging = false;

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  // 只在拖拽时监听移动
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;  // 不拖拽时跳过
  // 处理拖拽...
});

canvas.addEventListener('pointerup', (e) => {
  isDragging = false;
});
```

## 本章小结

Canvas事件处理的核心要点：

- **Canvas特点**：图形不是DOM节点，事件绑定在Canvas元素上
- **鼠标事件**：mousedown, mousemove, mouseup, click, wheel等
- **触摸事件**：touchstart, touchmove, touchend，需要 `preventDefault()`
- **Pointer Events**：统一的指针模型，推荐使用
- **坐标转换**：`clientX/Y` + `getBoundingClientRect()` 计算Canvas坐标
- **事件管理器**：封装事件处理逻辑，提供统一接口

关键技巧：
- 使用Pointer Events而非分别处理鼠标和触摸
- 触摸事件必须 `preventDefault()` + `{ passive: false }`
- 高频事件（mousemove）使用节流优化
- 封装EventManager类统一管理

下一章，我们将学习如何判断点击的是哪个图形——点击检测（Hit Testing）。
