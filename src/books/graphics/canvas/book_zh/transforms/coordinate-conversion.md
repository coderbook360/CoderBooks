# 坐标系转换：屏幕坐标与 Canvas 坐标

当你开发一个图形编辑器，用户点击Canvas时，你需要判断点击的是哪个对象。但鼠标事件给你的是**屏幕坐标**，而对象的坐标是**Canvas坐标**，甚至是经过变换后的**对象本地坐标**。如何正确转换这些坐标？本章将系统讲解多层坐标系统及其转换方法。

## 坐标系层级概述

首先要问一个问题：**从用户点击到判断点击了哪个对象，涉及几层坐标系？**

答案至少有4层：

1. **屏幕坐标系**：相对于显示器左上角（event.screenX/Y）
2. **客户区坐标系**：相对于浏览器视口左上角（event.clientX/Y）
3. **页面坐标系**：相对于文档左上角，包含滚动（event.pageX/Y）
4. **Canvas坐标系**：相对于Canvas内部坐标系（需要计算）
5. **对象本地坐标系**：相对于对象自身坐标系（需要逆变换）

转换链：

```
用户点击 → 屏幕坐标 → 客户区坐标 → Canvas坐标 → 对象本地坐标
```

每一步都需要精确计算。

## 事件坐标详解

现在我要问第二个问题：**clientX、pageX、screenX有什么区别？**

让我们用代码验证：

```javascript
canvas.addEventListener('click', (e) => {
  console.log('screenX:', e.screenX, 'screenY:', e.screenY);
  console.log('clientX:', e.clientX, 'clientY:', e.clientY);
  console.log('pageX:', e.pageX, 'pageY:', e.pageY);
  console.log('offsetX:', e.offsetX, 'offsetY:', e.offsetY);
});
```

区别：
- **screenX/Y**：相对于整个屏幕，跨窗口时有用
- **clientX/Y**：相对于浏览器视口，最常用于Canvas
- **pageX/Y**：包含页面滚动，当Canvas在滚动页面中时使用
- **offsetX/Y**：相对于事件目标元素，但**不推荐**（受CSS影响不稳定）

**推荐使用 clientX/Y**，然后手动计算Canvas坐标。

## 客户区到 Canvas 坐标

现在我要问第三个问题：**如何将 clientX/Y 转换为Canvas内部坐标？**

核心步骤：
1. 获取Canvas在视口中的位置
2. 减去偏移得到相对Canvas的坐标
3. 考虑CSS尺寸与Canvas内部尺寸的比例

```javascript
function getCanvasCoordinates(canvas, clientX, clientY) {
  // 1. 获取Canvas边界矩形
  const rect = canvas.getBoundingClientRect();
  
  // 2. 计算相对Canvas左上角的坐标
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  // 3. 考虑Canvas的CSS尺寸与内部尺寸的缩放比例
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: x * scaleX,
    y: y * scaleY
  };
}

// 使用
canvas.addEventListener('click', (e) => {
  const { x, y } = getCanvasCoordinates(canvas, e.clientX, e.clientY);
  console.log('Canvas坐标:', x, y);
});
```

关键理解：
- `getBoundingClientRect()` 返回Canvas在视口中的位置和尺寸（包含CSS变换）
- `rect.width/height` 是CSS显示尺寸
- `canvas.width/height` 是内部绘制尺寸
- 两者可能不同（如CSS放大到200%）

## 处理特殊情况

### 1. CSS边框和内边距

如果Canvas有边框或内边距，`rect.left/top` 已经包含了这些，无需额外处理。但如果使用 `offsetX/Y`（不推荐），可能会有问题：

```javascript
// 不推荐：offsetX/Y 受 CSS 影响
canvas.addEventListener('click', (e) => {
  // 如果Canvas有边框，offsetX/Y 可能不准确
  const x = e.offsetX;  
  const y = e.offsetY;
});

// 推荐：始终使用 clientX/Y + getBoundingClientRect
```

### 2. CSS Transform 变换

如果Canvas被CSS transform（旋转、缩放）了，坐标转换变得复杂：

```html
<style>
  canvas {
    transform: rotate(15deg) scale(1.2);
  }
</style>
```

此时 `getBoundingClientRect()` 返回的是变换后的边界矩形，但不包含旋转信息。需要使用 `getTransform()` 或手动计算逆矩阵：

```javascript
function getTransformedCanvasCoordinates(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  
  // 相对于变换后矩形的坐标
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  // 如果Canvas有CSS transform，需要应用逆变换
  // 这里需要解析CSS transform或使用DOMMatrix
  
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return { x: x * scaleX, y: y * scaleY };
}
```

实际项目中，**建议避免对Canvas使用CSS transform**，改用Canvas内部变换。

### 3. 高 DPI 屏幕

高DPI屏幕（如Retina）的 `devicePixelRatio > 1`，Canvas需要相应调整：

```javascript
function setupHighDPICanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  
  // CSS尺寸
  const width = 400;
  const height = 300;
  
  // 内部尺寸放大
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // CSS尺寸不变
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  // 缩放上下文
  ctx.scale(dpr, dpr);
}

// 坐标转换时自动处理（内部尺寸 / CSS尺寸 = dpr）
function getCanvasCoordinates(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  // scaleX/Y 会自动等于 dpr
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return { x: x * scaleX, y: y * scaleY };
}
```

### 4. 页面滚动

如果页面有滚动，且Canvas不在视口顶部，使用 `pageX/Y` 更合适：

```javascript
function getCanvasCoordinatesWithScroll(canvas, pageX, pageY) {
  const rect = canvas.getBoundingClientRect();
  
  // pageX/Y 包含滚动，需要加上滚动偏移
  const x = pageX - (rect.left + window.scrollX);
  const y = pageY - (rect.top + window.scrollY);
  
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return { x: x * scaleX, y: y * scaleY };
}
```

或者统一使用 `clientX/Y`，因为 `getBoundingClientRect()` 已经考虑了滚动。

## Canvas 到对象本地坐标

现在我要问第四个问题：**如果对象经过了旋转、缩放，如何将Canvas坐标转换为对象本地坐标？**

答案是使用**逆变换矩阵**（上一章学过）：

```javascript
// 假设对象有变换矩阵
const object = {
  x: 200,
  y: 150,
  angle: Math.PI / 6,  // 旋转30度
  scaleX: 1.5,
  scaleY: 1.5,
  width: 80,
  height: 80
};

function getObjectLocalCoordinates(object, canvasX, canvasY) {
  // 构建对象的变换矩阵
  const cos = Math.cos(object.angle);
  const sin = Math.sin(object.angle);
  
  const matrix = {
    a: object.scaleX * cos,
    b: object.scaleX * sin,
    c: -object.scaleY * sin,
    d: object.scaleY * cos,
    e: object.x,
    f: object.y
  };
  
  // 计算逆矩阵
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  const inverse = {
    a:  matrix.d / det,
    b: -matrix.b / det,
    c: -matrix.c / det,
    d:  matrix.a / det,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / det,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / det
  };
  
  // 应用逆变换
  const localX = inverse.a * canvasX + inverse.c * canvasY + inverse.e;
  const localY = inverse.b * canvasX + inverse.d * canvasY + inverse.f;
  
  return { x: localX, y: localY };
}

// 判断点击是否在对象内
function isPointInObject(object, canvasX, canvasY) {
  const local = getObjectLocalCoordinates(object, canvasX, canvasY);
  
  // 假设对象原点在中心
  const halfW = object.width / 2;
  const halfH = object.height / 2;
  
  return local.x >= -halfW && local.x <= halfW &&
         local.y >= -halfH && local.y <= halfH;
}

canvas.addEventListener('click', (e) => {
  const { x, y } = getCanvasCoordinates(canvas, e.clientX, e.clientY);
  
  if (isPointInObject(object, x, y)) {
    console.log('点击了对象！');
  }
});
```

## 通用坐标转换工具

让我们封装一个完整的坐标转换工具类：

```javascript
class CoordinateConverter {
  constructor(canvas) {
    this.canvas = canvas;
  }
  
  // 客户区坐标 → Canvas坐标
  clientToCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return { x: x * scaleX, y: y * scaleY };
  }
  
  // Canvas坐标 → 对象本地坐标
  canvasToLocal(canvasX, canvasY, matrix) {
    const det = matrix.a * matrix.d - matrix.b * matrix.c;
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is not invertible');
    }
    
    const invA =  matrix.d / det;
    const invB = -matrix.b / det;
    const invC = -matrix.c / det;
    const invD =  matrix.a / det;
    const invE = (matrix.c * matrix.f - matrix.d * matrix.e) / det;
    const invF = (matrix.b * matrix.e - matrix.a * matrix.f) / det;
    
    return {
      x: invA * canvasX + invC * canvasY + invE,
      y: invB * canvasX + invD * canvasY + invF
    };
  }
  
  // 完整转换链：事件 → Canvas → 本地
  eventToLocal(event, matrix) {
    const canvas = this.clientToCanvas(event.clientX, event.clientY);
    return this.canvasToLocal(canvas.x, canvas.y, matrix);
  }
}

// 使用
const converter = new CoordinateConverter(canvas);

canvas.addEventListener('mousemove', (e) => {
  const canvasCoords = converter.clientToCanvas(e.clientX, e.clientY);
  console.log('Canvas坐标:', canvasCoords);
  
  if (selectedObject) {
    const localCoords = converter.canvasToLocal(
      canvasCoords.x,
      canvasCoords.y,
      selectedObject.matrix
    );
    console.log('对象本地坐标:', localCoords);
  }
});
```

## 事件包装器：简化调用

进一步封装，让事件直接携带Canvas坐标：

```javascript
class CanvasEventWrapper {
  constructor(canvas, converter) {
    this.canvas = canvas;
    this.converter = converter;
  }
  
  on(eventType, handler) {
    this.canvas.addEventListener(eventType, (e) => {
      // 增强事件对象
      e.canvasX = null;
      e.canvasY = null;
      
      const coords = this.converter.clientToCanvas(e.clientX, e.clientY);
      e.canvasX = coords.x;
      e.canvasY = coords.y;
      
      handler(e);
    });
  }
}

// 使用
const wrapper = new CanvasEventWrapper(canvas, converter);

wrapper.on('click', (e) => {
  console.log('Canvas坐标:', e.canvasX, e.canvasY);
  // 无需手动转换！
});
```

## 调试辅助：可视化坐标

开发时可视化坐标有助于调试：

```javascript
canvas.addEventListener('mousemove', (e) => {
  const { x, y } = converter.clientToCanvas(e.clientX, e.clientY);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制坐标文本
  ctx.fillStyle = 'black';
  ctx.font = '14px monospace';
  ctx.fillText(`Canvas: (${x.toFixed(0)}, ${y.toFixed(0)})`, 10, 20);
  ctx.fillText(`Client: (${e.clientX}, ${e.clientY})`, 10, 40);
  
  // 绘制十字线
  ctx.strokeStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.moveTo(0, y);
  ctx.lineTo(canvas.width, y);
  ctx.stroke();
});
```

## 本章小结

坐标系转换是Canvas交互的基础：

- **多层坐标系**：屏幕 → 客户区 → 页面 → Canvas → 对象本地
- **推荐使用**：`clientX/Y` + `getBoundingClientRect()`
- **转换公式**：
  ```javascript
  canvasX = (clientX - rect.left) * (canvas.width / rect.width)
  canvasY = (clientY - rect.top) * (canvas.height / rect.height)
  ```

特殊情况处理：
- **高DPI**：scaleX/Y 自动等于 devicePixelRatio
- **CSS transform**：避免使用或手动计算逆变换
- **滚动**：`getBoundingClientRect()` 已处理
- **边框/内边距**：`getBoundingClientRect()` 已包含

对象本地坐标：
- 使用逆变换矩阵
- 公式：`local = inverse(matrix) × canvas`
- 应用：点击检测、拖拽交互

工具封装：
- `CoordinateConverter` 类统一管理转换
- 事件包装器自动添加Canvas坐标
- 可视化工具辅助调试

掌握坐标转换后，你就能实现精确的Canvas交互功能了。下一章，我们将进入事件与交互部分，学习如何实现点击检测和拖拽。
