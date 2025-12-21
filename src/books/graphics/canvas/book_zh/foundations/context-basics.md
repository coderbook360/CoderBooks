# 绘制上下文与状态基础

假设你要在 Canvas 上绘制多个图形：一个红色的圆、一个蓝色的矩形、一个绿色的三角形。如果你这样写代码：

```javascript
ctx.fillStyle = 'red';
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.fill();

ctx.fillRect(200, 50, 100, 100); // 问题：这个矩形是什么颜色？
```

答案可能出乎意料：矩形也是红色的！因为 `fillStyle` 在设置后会一直生效，直到你显式改变它。这就是所谓的"样式串味"问题（Style Pollution）。

**为什么 Canvas 要这样设计？** 这是因为 Canvas 采用了**有状态 API**（Stateful API）设计模式，类似于 OpenGL 的状态机模型。这种设计的核心思想是：将绘制参数（颜色、线宽、变换等）与绘制命令（fillRect、stroke等）分离，避免每次绘制都传递大量参数。这在需要绘制大量相似图形时，可以显著减少 API 调用的参数数量，提升性能。

然而，有状态设计也带来了挑战：状态的隐式延续容易导致意外的副作用。本章将深入介绍绘图上下文的组成、Canvas 状态的定义，为后续的状态管理打下基础。

本章将回答以下问题：
- 什么是绘图上下文（Context）？它包含哪些属性和方法？
- 什么是 Canvas 状态？哪些属性属于状态？
- 哪些属性可以被保存和恢复，哪些不能？

---

## 1. 认识绘图上下文

首先要问一个问题：**Canvas 的绘图上下文到底是什么？**

### 1.1 Context 对象概览

Canvas 元素本身只是一个容器（Bitmap Container），真正的绘制 API 都在 **CanvasRenderingContext2D** 对象上。这个对象通过 `getContext('2d')` 获取：

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

console.log(ctx); // CanvasRenderingContext2D {canvas: canvas#myCanvas, ...}
console.log(ctx.constructor.name); // "CanvasRenderingContext2D"
```

**设计动机：为什么要分离 Canvas 元素与 Context 对象？**

这是一个经典的**关注点分离**（Separation of Concerns）设计：
1. **Canvas 元素**：负责 DOM 层面的职责（尺寸、样式、事件监听等）
2. **Context 对象**：负责图形绘制的职责（绘制命令、状态管理等）

这种分离使得未来可以支持多种渲染上下文（如 WebGL 的 `'webgl'` 上下文、WebGPU 的 `'webgpu'` 上下文），而不需要改变 Canvas 元素本身的接口。

**关键特性**：
- 同一个 Canvas 元素多次调用 `getContext('2d')` 返回 **同一个对象**（单例模式）
- Context 对象持有对 Canvas 元素的引用：`ctx.canvas`
- Context 对象维护了一个 **绘图状态栈**（Drawing State Stack），用于保存和恢复状态

> **规范细节**：根据 WHATWG 规范，一旦为某个 Canvas 创建了特定类型的上下文（如 `'2d'`），再次请求不同类型的上下文（如 `'webgl'`）将返回 `null`。这是为了防止不同渲染引擎之间的冲突。

### 1.2 属性与方法分类

Context 对象的成员可以分为几类：

**1. 样式属性**（State Properties）
```javascript
ctx.fillStyle = '#3498db';      // 填充颜色/渐变/图案
ctx.strokeStyle = '#e74c3c';    // 描边颜色/渐变/图案
ctx.lineWidth = 2;              // 线宽
ctx.lineCap = 'round';          // 线帽样式：butt/round/square
ctx.lineJoin = 'round';         // 线连接样式：miter/round/bevel
ctx.globalAlpha = 0.8;          // 全局透明度
ctx.font = '16px sans-serif';   // 文本字体
ctx.textAlign = 'center';       // 文本对齐：left/center/right
```

**2. 绘制方法**
```javascript
ctx.fillRect(x, y, width, height);    // 填充矩形
ctx.strokeRect(x, y, width, height);  // 描边矩形
ctx.clearRect(x, y, width, height);   // 清空矩形区域
ctx.fill();                            // 填充路径
ctx.stroke();                          // 描边路径
```

**3. 路径方法**
```javascript
ctx.beginPath();                     // 开始新路径
ctx.moveTo(x, y);                    // 移动画笔
ctx.lineTo(x, y);                    // 画直线
ctx.arc(x, y, radius, start, end);   // 画圆弧
ctx.closePath();                     // 闭合路径
```

**4. 变换方法**
```javascript
ctx.translate(x, y);      // 平移
ctx.rotate(angle);        // 旋转
ctx.scale(x, y);          // 缩放
ctx.transform(...);       // 自定义变换矩阵
```

**5. 状态管理方法**
```javascript
ctx.save();     // 保存当前状态到栈
ctx.restore();  // 从栈恢复状态
```

---

## 2. 什么是 Canvas 状态

现在我要问第二个问题：**Canvas 的"状态"到底包括什么？**

### 2.1 状态的组成部分

Canvas 的状态（Drawing State）是指 **影响绘制结果的所有可配置属性的集合**。根据 WHATWG 规范，Canvas 状态主要包括：

**1. 样式属性（Style Properties）**
- 填充与描边：`fillStyle`, `strokeStyle`
- 线条样式：`lineWidth`, `lineCap`, `lineJoin`, `miterLimit`, `lineDashOffset`, `getLineDash()` 返回的虚线模式
- 阴影：`shadowOffsetX`, `shadowOffsetY`, `shadowBlur`, `shadowColor`
- 文本：`font`, `textAlign`, `textBaseline`, `direction`
- 图像平滑：`imageSmoothingEnabled`, `imageSmoothingQuality`
- 合成：`globalAlpha`, `globalCompositeOperation`

**2. 当前变换矩阵（Current Transformation Matrix, CTM）**
- 通过 `translate()`, `rotate()`, `scale()`, `transform()` 等方法设置的累积变换

**3. 当前裁剪区域（Current Clipping Region）**
- 通过 `clip()` 方法设置的裁剪路径

**设计动机：为什么这些属性被归类为"状态"？**

这些属性有一个共同特征：**它们影响所有后续绘制操作，而不仅仅是单次绘制**。这种设计源于 OpenGL 的状态机模型，核心思想是：
1. **减少参数传递**：不需要在每次绘制时都传递完整的样式参数
2. **批量操作优化**：相同样式的多个图形可以共享状态，减少状态切换开销
3. **声明式配置**：先声明"如何绘制"，再执行"绘制什么"，代码更清晰

### 2.2 可保存 vs 不可保存

**可被 `save()/restore()` 保存的属性**：

```javascript
// ✅ 这些属性会被 save/restore
- fillStyle, strokeStyle
- globalAlpha, globalCompositeOperation
- lineWidth, lineCap, lineJoin, miterLimit, lineDashOffset
- shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor
- font, textAlign, textBaseline, direction
- imageSmoothingEnabled, imageSmoothingQuality
- 当前变换矩阵（CTM）
- 当前裁剪区域
```

**不可被 `save()/restore()` 保存的属性**：

```javascript
// ❌ 这些不会被 save/restore
- 当前路径（Current Path）：通过 beginPath/moveTo/lineTo 等构建的路径
- 当前点的位置（Current Point）：moveTo 后的画笔位置
- 位图内容（Bitmap Content）：已绘制的像素数据
```

**深层思考：为什么路径不属于状态？**

路径（Path）是用来构建图形的**临时数据结构**，而状态是"如何绘制"的**持久配置**。这种设计体现了两个重要的工程权衡：

1. **内存效率**：路径可能包含数千个坐标点，如果每次 `save()` 都复制路径，会造成巨大的内存开销
2. **语义清晰**：路径是"正在构建的图形"，状态是"绘制的样式"，分离这两个概念使得 API 更易理解

实际应用中，如果需要复用路径，应该使用 `Path2D` 对象：

```javascript
const path = new Path2D();
path.arc(100, 100, 50, 0, Math.PI * 2);

// 可以多次使用同一个路径
ctx.fillStyle = 'red';
ctx.fill(path);

ctx.fillStyle = 'blue';
ctx.stroke(path);
```

### 2.3 状态属性完整列表

这是一个完整的状态属性检查表，你可以在开发时参考：

**绘制样式**：
- `fillStyle`
- `strokeStyle`
- `globalAlpha`
- `globalCompositeOperation`

**线条样式**：
- `lineWidth`
- `lineCap`
- `lineJoin`
- `miterLimit`
- `lineDashOffset`
- `getLineDash()` 返回的虚线模式

**阴影**：
- `shadowOffsetX`
- `shadowOffsetY`
- `shadowBlur`
- `shadowColor`

**文本**：
- `font`
- `textAlign`
- `textBaseline`
- `direction`

**图像**：
- `imageSmoothingEnabled`
- `imageSmoothingQuality`（Chromium）

**变换与裁剪**：
- 当前变换矩阵（CTM）
- 当前裁剪区域

---

## 本章小结

本章介绍了 Canvas 绘图上下文和状态的基础概念：

**绘图上下文**：
- CanvasRenderingContext2D 是所有绘制操作的入口
- 采用有状态 API 设计模式，源于 OpenGL 状态机
- 关注点分离：Canvas 元素 vs Context 对象
- 同一个 Canvas 的 `getContext` 返回同一个对象（单例模式）

**Canvas 状态组成**：
- 绘图状态（Drawing State）包括：样式属性、CTM、裁剪区域
- 可保存：所有样式属性、变换矩阵、裁剪路径
- 不可保存：当前路径、当前点位置、位图内容

**设计权衡**：
- 有状态 API 减少参数传递，提升批量绘制性能
- 路径不属于状态，出于内存效率和语义清晰考虑
- 使用 `Path2D` 对象实现路径复用

在下一章，我们将深入学习 `save()` 和 `restore()` 的工作机制，理解状态栈的内存模型。