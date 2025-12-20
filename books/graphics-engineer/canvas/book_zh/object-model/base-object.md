# 图形对象基类设计

上一章我们理解了"为什么需要对象模型"。现在要问一个具体问题：**一个图形对象应该包含哪些属性和方法？**

让我们从最简单的矩形开始，逐步设计一个通用的图形对象基类。

---

## 1. 需求分析

一个图形对象需要：
- **渲染能力**：绘制到 Canvas 上
- **几何信息**：位置、尺寸、旋转角度
- **样式信息**：颜色、边框、透明度
- **变换能力**：平移、旋转、缩放
- **交互能力**：检测点击、拖拽
- **管理能力**：唯一标识、克隆、销毁

---

## 2. 最简版本：矩形对象

先实现一个简单的矩形：

```javascript
class Rectangle {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fill = 'red';
  }
  
  render(ctx) {
    ctx.fillStyle = this.fill;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// 使用
const rect = new Rectangle(50, 50, 100, 80);
rect.render(ctx);
```

但如果还要实现圆形、文本等图形，它们都需要相同的属性（颜色、透明度等）。重复代码太多。

解决方案：**抽取公共部分到基类**。

---

## 3. 基类属性设计

### 对象标识

每个对象需要唯一标识：

```javascript
let objectIdCounter = 0;

class BaseObject {
  constructor() {
    this.id = `object_${++objectIdCounter}`;
    this.type = 'BaseObject';  // 子类覆盖
  }
}
```

### 几何属性

位置和尺寸：

```javascript
constructor() {
  // ...
  this.x = 0;
  this.y = 0;
  this.width = 100;
  this.height = 100;
}
```

**关键决策**：坐标原点是左上角还是中心？
- **左上角**：与 Canvas 坐标系一致，简单直观
- **中心点**：旋转和缩放更自然（Fabric.js 使用中心）

我们选择**中心点**，因为变换更方便：

```javascript
constructor() {
  // ...
  this.left = 0;    // 左边界
  this.top = 0;     // 上边界
  this.width = 100;
  this.height = 100;
}

// 计算中心点
get centerX() {
  return this.left + this.width / 2;
}

get centerY() {
  return this.top + this.height / 2;
}
```

### 变换属性

```javascript
constructor() {
  // ...
  this.rotation = 0;    // 旋转角度（弧度）
  this.scaleX = 1;      // X 缩放
  this.scaleY = 1;      // Y 缩放
}
```

### 样式属性

```javascript
constructor() {
  // ...
  this.fill = '#000000';       // 填充色
  this.stroke = null;          // 边框色
  this.strokeWidth = 1;        // 边框宽度
  this.opacity = 1;            // 透明度 (0-1)
}
```

### 状态属性

```javascript
constructor() {
  // ...
  this.visible = true;    // 是否可见
  this.selectable = true; // 是否可选择
  this.selected = false;  // 是否被选中
}
```

---

## 4. 基类方法设计

### 渲染方法

基类定义渲染流程，子类实现具体绘制：

```javascript
class BaseObject {
  // ... 属性 ...
  
  draw(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    this.applyTransform(ctx);
    this.render(ctx);  // 抽象方法，子类实现
    ctx.restore();
  }
  
  applyTransform(ctx) {
    const centerX = this.centerX;
    const centerY = this.centerY;
    
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-centerX, -centerY);
  }
  
  render(ctx) {
    throw new Error('render() must be implemented by subclass');
  }
}
```

### 碰撞检测

简单的矩形检测：

```javascript
containsPoint(x, y) {
  return x >= this.left && 
         x <= this.left + this.width &&
         y >= this.top && 
         y <= this.top + this.height;
}
```

**注意**：这只适用于未旋转的对象。旋转后需要将点坐标转换到对象的局部坐标系。

### 克隆方法

```javascript
clone() {
  const cloned = new this.constructor();
  Object.assign(cloned, this);
  cloned.id = `object_${++objectIdCounter}`;  // 新ID
  return cloned;
}
```

---

## 5. 完整的 BaseObject 实现

```javascript
let objectIdCounter = 0;

class BaseObject {
  constructor(options = {}) {
    // 标识
    this.id = `object_${++objectIdCounter}`;
    this.type = 'BaseObject';
    
    // 几何属性
    this.left = options.left || 0;
    this.top = options.top || 0;
    this.width = options.width || 100;
    this.height = options.height || 100;
    
    // 变换属性
    this.rotation = options.rotation || 0;
    this.scaleX = options.scaleX || 1;
    this.scaleY = options.scaleY || 1;
    
    // 样式属性
    this.fill = options.fill || '#000000';
    this.stroke = options.stroke || null;
    this.strokeWidth = options.strokeWidth || 1;
    this.opacity = options.opacity || 1;
    
    // 状态属性
    this.visible = options.visible !== false;
    this.selectable = options.selectable !== false;
    this.selected = false;
  }
  
  // 计算属性
  get centerX() {
    return this.left + this.width / 2;
  }
  
  get centerY() {
    return this.top + this.height / 2;
  }
  
  // 渲染方法
  draw(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    this.applyTransform(ctx);
    this.render(ctx);
    ctx.restore();
  }
  
  applyTransform(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;
    
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-cx, -cy);
  }
  
  render(ctx) {
    throw new Error('render() must be implemented by subclass');
  }
  
  // 碰撞检测
  containsPoint(x, y) {
    // TODO: 考虑旋转的情况
    return x >= this.left && 
           x <= this.left + this.width &&
           y >= this.top && 
           y <= this.top + this.height;
  }
  
  // 克隆
  clone() {
    const cloned = new this.constructor();
    Object.assign(cloned, this);
    cloned.id = `object_${++objectIdCounter}`;
    return cloned;
  }
  
  // 销毁
  dispose() {
    // 清理资源（如事件监听器）
  }
}
```

---

## 6. 继承示例：Rectangle 类

```javascript
class Rectangle extends BaseObject {
  constructor(options = {}) {
    super(options);
    this.type = 'Rectangle';
  }
  
  render(ctx) {
    const left = this.left;
    const top = this.top;
    const width = this.width;
    const height = this.height;
    
    // 绘制填充
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fillRect(left, top, width, height);
    }
    
    // 绘制边框
    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeRect(left, top, width, height);
    }
  }
}
```

---

## 7. 使用示例

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 创建矩形
const rect1 = new Rectangle({
  left: 50,
  top: 50,
  width: 100,
  height: 80,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 2
});

const rect2 = new Rectangle({
  left: 200,
  top: 50,
  width: 100,
  height: 80,
  fill: 'blue',
  rotation: Math.PI / 6  // 旋转 30 度
});

// 渲染
rect1.draw(ctx);
rect2.draw(ctx);

// 修改属性
rect1.fill = 'green';
rect1.rotation = Math.PI / 4;

// 重新绘制
ctx.clearRect(0, 0, canvas.width, canvas.height);
rect1.draw(ctx);
rect2.draw(ctx);
```

---

## 8. 继承示例：Circle 类

```javascript
class Circle extends BaseObject {
  constructor(options = {}) {
    super(options);
    this.type = 'Circle';
    this.radius = options.radius || 50;
  }
  
  render(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;
    
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    
    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }
    
    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
  }
  
  containsPoint(x, y) {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }
}
```

---

## 9. 设计权衡

### 坐标原点的选择

- **左上角**：
  - ✅ 与 Canvas 坐标系一致，简单
  - ❌ 旋转和缩放时需要手动计算中心
  
- **中心点**（我们的选择）：
  - ✅ 旋转和缩放更自然
  - ❌ 需要计算 `left` 和 `top`

### 变换矩阵 vs 分离属性

- **分离属性**（我们的选择）：
  - ✅ 直观，易于理解和调试
  - ❌ 应用变换时需要逐个设置
  
- **变换矩阵**：
  - ✅ 性能更好，灵活性更高
  - ❌ 不直观，难以理解

Fabric.js 使用分离属性，提供更好的易用性。

---

## 10. 性能考虑

- **状态保存/恢复开销**：每个对象调用 `save()` 和 `restore()`，开销不小
- **优化方案**：批量相同状态的对象，减少状态切换

```javascript
// 不好的做法
objects.forEach(obj => obj.draw(ctx));

// 好的做法：按状态分组
const opaque = objects.filter(o => o.opacity === 1);
const transparent = objects.filter(o => o.opacity < 1);

opaque.forEach(obj => obj.draw(ctx));
transparent.forEach(obj => obj.draw(ctx));
```

---

## 本章小结

我们设计了一个通用的 `BaseObject` 基类：
- **标识**：唯一 ID 和类型
- **几何**：位置、尺寸、变换（旋转、缩放）
- **样式**：填充、边框、透明度
- **渲染**：模板方法 `draw()`，子类实现 `render()`
- **交互**：碰撞检测、克隆、销毁

这个基类是对象模型的基石。下一章，我们将为它添加强大的属性系统，支持属性监听和自动重绘。
