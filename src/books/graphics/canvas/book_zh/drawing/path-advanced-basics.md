# 路径高级操作基础

在前面的章节中，我们学会了如何用路径绘制各种形状。但实际开发中，你可能会遇到更复杂的需求：如何绘制一个镂空的圆环？如何让图像只在某个形状范围内显示（比如圆形头像）？如何判断鼠标点击是否落在某个复杂路径内？

这些问题，都需要我们掌握路径的高级操作。本章将从实际需求出发，逐步解答以下核心问题：
- 如何复用和组合路径？Path2D 的价值是什么？
- 如何实现镂空效果？填充规则是如何工作的？
- 如何限制绘制区域？裁剪的原理和使用场景？
- 如何判断点是否在路径内？点击检测的实现方法？

---

## 1. Path2D：可复用的路径对象

首先要问一个问题：**为什么需要 Path2D？**

在之前的学习中，我们都是通过 `ctx.beginPath()` 开始绘制路径，然后调用一系列绘制指令（如 `moveTo`、`lineTo`、`arc` 等），最后用 `fill()` 或 `stroke()` 完成渲染。这种方式有个问题：路径是"一次性"的，无法复用。

思考一下这个场景：你需要在画布上绘制 100 个相同的星形。如果每次都重新执行星形的路径指令，代码会非常冗余，性能也不理想。

**Path2D 就是为了解决这个问题**。它是一个可复用的路径对象，你可以预先定义好路径，然后在需要的时候重复使用。

### 创建 Path2D

Path2D 有三种创建方式：

```javascript
// 方式1：空路径，然后添加路径指令
const path = new Path2D();
path.rect(10, 10, 100, 100);
path.arc(160, 60, 50, 0, Math.PI * 2);

// 方式2：从 SVG 路径字符串创建
const svgPath = new Path2D('M 10 10 L 100 10 L 100 100 Z');

// 方式3：复制另一个 Path2D
const copy = new Path2D(path);
```

### Path2D 的使用

创建好 Path2D 后，可以直接传给 `fill()` 或 `stroke()`：

```javascript
const star = new Path2D();
// 绘制五角星的路径指令（省略具体实现）
star.moveTo(50, 10);
star.lineTo(20, 90);
star.lineTo(90, 35);
star.lineTo(10, 35);
star.lineTo(80, 90);
star.closePath();

// 在多个位置绘制相同的星形
ctx.save();
ctx.translate(50, 50);
ctx.fillStyle = '#f39c12';
ctx.fill(star);
ctx.restore();

ctx.save();
ctx.translate(150, 50);
ctx.fillStyle = '#e74c3c';
ctx.fill(star);
ctx.restore();

ctx.save();
ctx.translate(100, 120);
ctx.fillStyle = '#3498db';
ctx.fill(star);
ctx.restore();
```

这里的关键点是：**路径定义只执行一次，但可以在不同位置、不同样式下重复使用**。

### SVG 路径语法

Path2D 支持 SVG 路径语法，这意味着你可以直接从设计软件导出的 SVG 路径字符串创建路径：

```javascript
// SVG 路径字符串
const heartPath = new Path2D(
  'M 50,30 ' +
  'C 50,20 40,10 30,10 ' +
  'C 15,10 10,20 10,30 ' +
  'C 10,45 20,55 50,80 ' +
  'C 80,55 90,45 90,30 ' +
  'C 90,20 85,10 70,10 ' +
  'C 60,10 50,20 50,30 Z'
);

ctx.fillStyle = '#e74c3c';
ctx.fill(heartPath);
```

这对于复杂图形非常有用，你不需要手动转换 SVG 指令，可以直接复用设计师的输出。

### 组合路径：addPath()

Path2D 还支持将多个路径组合在一起：

```javascript
const path1 = new Path2D();
path1.rect(10, 10, 80, 80);

const path2 = new Path2D();
path2.arc(130, 50, 40, 0, Math.PI * 2);

// 组合两个路径
const combined = new Path2D();
combined.addPath(path1);
combined.addPath(path2);

// 一次性填充组合后的路径
ctx.fillStyle = '#3498db';
ctx.fill(combined);
```

这种组合能力在构建复杂图形时非常有用。但要注意，`addPath()` 还支持一个可选的变换矩阵参数，可以在添加时对路径进行变换：

```javascript
// 创建一个变换矩阵：平移到 (200, 0)
const matrix = new DOMMatrix();
matrix.translateSelf(200, 0);

// 添加路径时应用变换
combined.addPath(path1, matrix);
```

---

## 2. 填充规则：实现镂空效果

现在我要问第二个问题：**如何绘制一个镂空的圆环？**

最直接的想法是：绘制一个大圆，再绘制一个小圆，然后填充。但问题是，默认情况下，两个圆都会被填充，无法实现镂空效果。

```javascript
// 错误示范：两个圆都会被填充
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);  // 外圆
ctx.arc(100, 100, 40, 0, Math.PI * 2);  // 内圆
ctx.fillStyle = '#3498db';
ctx.fill();
// 结果：两个圆都是蓝色实心，不是镂空圆环
```

要实现镂空，需要理解 Canvas 的**填充规则**（fill rule）。Canvas 支持两种填充规则：

### 非零绕回规则（nonzero）

这是默认规则。原理是：从待判断的点向外发射一条射线，统计与路径边界的交叉次数：
- 如果路径方向是顺时针，计数 +1
- 如果路径方向是逆时针，计数 -1
- 最终计数不为 0，则填充该点

对于单个封闭路径，这个规则会填充整个内部区域。但对于嵌套路径，如果内外路径的绘制方向相同，内部也会被填充；如果方向相反，就能实现镂空。

### 奇偶规则（evenodd）

原理更简单：从待判断的点向外发射一条射线，统计与路径边界的交叉次数：
- 如果次数是奇数，填充
- 如果次数是偶数，不填充

这个规则不关心路径方向，只看交叉次数的奇偶性。对于嵌套路径，自动实现镂空效果。

### 实现镂空圆环

使用奇偶规则，可以轻松实现镂空：

```javascript
const ring = new Path2D();
ring.arc(100, 100, 80, 0, Math.PI * 2);  // 外圆
ring.arc(100, 100, 40, 0, Math.PI * 2);  // 内圆

ctx.fillStyle = '#3498db';
ctx.fill(ring, 'evenodd');  // 指定奇偶规则
```

现在，内圆区域不会被填充，形成了镂空的圆环。

### 两种规则的对比

让我们通过一个例子对比两种规则：

```javascript
// 创建一个复杂的嵌套路径
const path = new Path2D();

// 外层矩形（顺时针）
path.rect(20, 20, 200, 200);

// 第一个内层矩形（顺时针）
path.rect(50, 50, 60, 60);

// 第二个内层矩形（顺时针）
path.rect(140, 50, 60, 60);

// 第三个内层矩形（顺时针）
path.rect(95, 140, 60, 60);

// 使用非零绕回规则（默认）
ctx.save();
ctx.translate(0, 0);
ctx.fillStyle = '#3498db';
ctx.fill(path, 'nonzero');
ctx.restore();

// 使用奇偶规则
ctx.save();
ctx.translate(250, 0);
ctx.fillStyle = '#e74c3c';
ctx.fill(path, 'evenodd');
ctx.restore();
```

在这个例子中：
- 使用 `nonzero` 规则，所有矩形（包括内层）都会被填充，因为它们的方向相同
- 使用 `evenodd` 规则，内层矩形会被镂空，因为它们的交叉次数是偶数

### 控制路径方向

如果你想在使用非零绕回规则时实现镂空，需要让内外路径的方向相反。对于圆形，可以通过控制起始角度和结束角度来改变方向：

```javascript
const ring = new Path2D();
// 外圆：顺时针（0 到 2π）
ring.arc(100, 100, 80, 0, Math.PI * 2, false);
// 内圆：逆时针（2π 到 0）
ring.arc(100, 100, 40, 0, Math.PI * 2, true);

ctx.fillStyle = '#3498db';
ctx.fill(ring, 'nonzero');  // 使用默认规则也能镂空
```

但在实践中，**使用奇偶规则通常更简单直观**，不需要关心路径方向。

---

## 3. 路径裁剪：限制绘制区域

现在我要问第三个问题：**如何让图像只在某个形状范围内显示？**

比如，你想实现一个圆形头像效果：加载一张矩形图片，但只显示中心的圆形区域。这就需要用到**裁剪**（clipping）。

### clip() 基本用法

裁剪的原理是：定义一个路径，然后调用 `clip()`，之后的所有绘制都会被限制在这个路径范围内，路径外的内容不可见。

```javascript
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = 'avatar.jpg';

img.onload = () => {
  // 定义裁剪路径：圆形
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.clip();  // 设置裁剪区域
  
  // 绘制图像（只有圆形内的部分可见）
  ctx.drawImage(img, 20, 20, 160, 160);
};
```

关键点：
1. **先定义路径**，再调用 `clip()`
2. `clip()` 之后的所有绘制都受裁剪限制
3. 裁剪区域只能缩小，不能扩大

### 裁剪与状态管理

裁剪会改变绘制上下文的状态，且**无法直接撤销**。如果你需要在裁剪后恢复正常绘制，必须配合 `save()` 和 `restore()`：

```javascript
// 正常绘制
ctx.fillStyle = '#ecf0f1';
ctx.fillRect(0, 0, 400, 300);

// 保存状态
ctx.save();

// 设置裁剪
ctx.beginPath();
ctx.arc(200, 150, 100, 0, Math.PI * 2);
ctx.clip();

// 裁剪区域内的绘制
ctx.fillStyle = '#3498db';
ctx.fillRect(0, 0, 400, 300);  // 只有圆形内会显示蓝色

// 恢复状态
ctx.restore();

// 恢复后可以正常绘制
ctx.fillStyle = '#e74c3c';
ctx.fillRect(320, 20, 60, 60);  // 不受裁剪限制
```

### 复杂裁剪形状

裁剪不限于简单的圆形或矩形，你可以使用任意复杂的路径：

```javascript
// 星形裁剪
ctx.save();

const star = new Path2D();
const cx = 200, cy = 150, outerRadius = 100, innerRadius = 40;
for (let i = 0; i < 5; i++) {
  const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
  const x = cx + Math.cos(angle) * outerRadius;
  const y = cy + Math.sin(angle) * outerRadius;
  if (i === 0) star.moveTo(x, y);
  else star.lineTo(x, y);
  
  const innerAngle = angle + (2 * Math.PI) / 5;
  const ix = cx + Math.cos(innerAngle) * innerRadius;
  const iy = cy + Math.sin(innerAngle) * innerRadius;
  star.lineTo(ix, iy);
}
star.closePath();

ctx.clip(star);

// 在星形内绘制渐变
const gradient = ctx.createRadialGradient(200, 150, 20, 200, 150, 100);
gradient.addColorStop(0, '#f39c12');
gradient.addColorStop(1, '#e74c3c');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 400, 300);

ctx.restore();
```

### 裁剪的局限性

裁剪有几个重要的限制：

1. **只能缩小，不能扩大**：一旦设置裁剪，后续的裁剪只能进一步缩小可见区域
2. **无法直接撤销**：必须通过 `restore()` 恢复之前的状态
3. **性能影响**：复杂的裁剪路径可能影响渲染性能

```javascript
// 错误示范：试图扩大裁剪区域
ctx.save();

// 第一次裁剪：小圆
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.clip();

// 第二次裁剪：大圆（不会生效）
ctx.beginPath();
ctx.arc(100, 100, 100, 0, Math.PI * 2);
ctx.clip();  // 裁剪区域不会变大，仍然是小圆

ctx.fillStyle = '#3498db';
ctx.fillRect(0, 0, 200, 200);  // 只有小圆内可见

ctx.restore();
```

---

## 4. 路径点击测试：判断点是否在路径内

现在我要问第四个问题：**如何判断鼠标点击是否落在某个路径内？**

这是图形编辑器中的核心功能：用户点击画布，你需要判断点击的是哪个图形。Canvas 提供了两个 API 来实现点击测试：

### isPointInPath：判断点是否在路径内

```javascript
const path = new Path2D();
path.arc(100, 100, 50, 0, Math.PI * 2);

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 判断点击是否在圆形内
  if (ctx.isPointInPath(path, x, y)) {
    console.log('点击在圆形内');
  } else {
    console.log('点击在圆形外');
  }
});
```

`isPointInPath()` 有两种调用方式：

```javascript
// 方式1：传入 Path2D 对象
ctx.isPointInPath(path, x, y);

// 方式2：使用当前路径（beginPath 后的路径）
ctx.beginPath();
ctx.arc(100, 100, 50, 0, Math.PI * 2);
ctx.isPointInPath(x, y);
```

### isPointInStroke：判断点是否在路径笔画上

有时候，你需要判断点是否在路径的**边缘**（笔画）上，而不是内部。比如，空心的圆形，只有点击边缘才响应：

```javascript
const circle = new Path2D();
circle.arc(100, 100, 50, 0, Math.PI * 2);

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 设置线宽，影响笔画的点击范围
  ctx.lineWidth = 10;
  
  if (ctx.isPointInStroke(circle, x, y)) {
    console.log('点击在圆形边缘');
  }
});
```

注意：`isPointInStroke()` 的判断受 `lineWidth` 影响。线宽越大，可点击的范围越大。

### 填充规则的影响

`isPointInPath()` 也支持填充规则参数：

```javascript
const ring = new Path2D();
ring.arc(100, 100, 80, 0, Math.PI * 2);  // 外圆
ring.arc(100, 100, 40, 0, Math.PI * 2);  // 内圆

// 使用奇偶规则，内圆区域返回 false
if (ctx.isPointInPath(ring, x, y, 'evenodd')) {
  console.log('点击在圆环内（不含镂空区域）');
}

// 使用非零绕回规则，内圆区域也返回 true（如果方向相同）
if (ctx.isPointInPath(ring, x, y, 'nonzero')) {
  console.log('点击在路径覆盖区域');
}
```

### 结合变换的处理

如果路径应用了变换（平移、旋转、缩放），`isPointInPath()` 会自动考虑当前的变换矩阵。但有时候，你需要手动处理坐标转换：

```javascript
// 场景：旋转后的矩形
ctx.save();
ctx.translate(200, 150);
ctx.rotate(Math.PI / 4);

const rect = new Path2D();
rect.rect(-50, -50, 100, 100);

ctx.fillStyle = '#3498db';
ctx.fill(rect);
ctx.restore();

// 点击检测
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 需要应用相同的变换
  ctx.save();
  ctx.translate(200, 150);
  ctx.rotate(Math.PI / 4);
  
  const path = new Path2D();
  path.rect(-50, -50, 100, 100);
  
  const isInside = ctx.isPointInPath(path, x, y);
  ctx.restore();
  
  if (isInside) {
    console.log('点击在旋转矩形内');
  }
});
```

更简洁的方法是**逆变换坐标**：将点击坐标从屏幕坐标系转换到路径的局部坐标系，然后再判断。这个技术会在后续的变换章节详细讲解。

### 性能考虑

`isPointInPath()` 和 `isPointInStroke()` 的性能取决于路径的复杂度。对于大量复杂路径的点击检测，建议：

1. **使用包围盒预筛选**：先用矩形快速判断，再用精确路径判断
2. **缓存 Path2D 对象**：避免重复创建路径
3. **使用空间索引**：如四叉树、R 树，快速定位候选对象

```javascript
// 包围盒预筛选示例
function isPointInShape(shape, x, y) {
  // 快速检查：点是否在包围盒内
  const { minX, minY, maxX, maxY } = shape.bbox;
  if (x < minX || x > maxX || y < minY || y > maxY) {
    return false;
  }
  
  // 精确检查：点是否在路径内
  return ctx.isPointInPath(shape.path, x, y);
}
```

---

## 5. 综合应用：实际案例

让我们通过几个实际案例，综合运用本章学到的技术。

### 案例 1：圆形头像裁剪

实现一个常见的 UI 效果：将矩形图像裁剪为圆形，并添加描边。

```javascript
function drawCircularAvatar(ctx, img, cx, cy, radius) {
  ctx.save();
  
  // 创建圆形裁剪路径
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  
  // 绘制图像（居中裁剪）
  const size = radius * 2;
  ctx.drawImage(
    img,
    0, 0, img.width, img.height,  // 源矩形
    cx - radius, cy - radius, size, size  // 目标矩形
  );
  
  ctx.restore();
  
  // 添加圆形描边
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ecf0f1';
  ctx.lineWidth = 4;
  ctx.stroke();
}

// 使用
const img = new Image();
img.src = 'avatar.jpg';
img.onload = () => {
  drawCircularAvatar(ctx, img, 100, 100, 80);
};
```

### 案例 2：聚光灯效果

实现一个聚光灯遮罩效果：画布大部分区域是暗的，只有鼠标周围的圆形区域是亮的。

```javascript
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = 'background.jpg';

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  render();
});

function render() {
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制暗色背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 创建聚光灯路径（全局复合操作）
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  
  const gradient = ctx.createRadialGradient(
    mouseX, mouseY, 0,
    mouseX, mouseY, 100
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.restore();
}

img.onload = () => {
  render();
};
```

### 案例 3：可交互的镂空形状

实现一个可点击的镂空圆环，点击圆环部分高亮显示。

```javascript
const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// 创建圆环路径
const ring = new Path2D();
ring.arc(200, 150, 80, 0, Math.PI * 2);
ring.arc(200, 150, 40, 0, Math.PI * 2);

let isHovered = false;

// 绘制函数
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = isHovered ? '#e74c3c' : '#3498db';
  ctx.fill(ring, 'evenodd');
  
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  ctx.stroke(ring);
}

// 鼠标移动检测
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const wasHovered = isHovered;
  isHovered = ctx.isPointInPath(ring, x, y, 'evenodd');
  
  if (wasHovered !== isHovered) {
    canvas.style.cursor = isHovered ? 'pointer' : 'default';
    draw();
  }
});

// 点击检测
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (ctx.isPointInPath(ring, x, y, 'evenodd')) {
    alert('你点击了圆环！');
  }
});

// 初始绘制
draw();
```

---

## 本章小结

本章我们深入探讨了 Canvas 路径的高级操作，核心内容包括：

**Path2D 对象**：
- 可复用的路径对象，提升性能和代码可维护性
- 支持 SVG 路径语法，方便与设计工具集成
- `addPath()` 实现路径组合

**填充规则**：
- **非零绕回规则**（nonzero）：考虑路径方向，通过计数判断
- **奇偶规则**（evenodd）：只看交叉次数奇偶性，实现镂空更简单
- 镂空效果的关键是选择正确的填充规则

**路径裁剪**：
- `clip()` 限制绘制区域，实现遮罩效果
- 裁剪只能缩小，不能扩大
- 必须配合 `save()`/`restore()` 管理状态

**点击测试**：
- `isPointInPath()`：判断点是否在路径内部
- `isPointInStroke()`：判断点是否在路径笔画上
- 受变换矩阵和填充规则影响
- 性能优化：包围盒预筛选 + 精确判断

这些技术是构建图形编辑器的基础。下一章我们将深入探讨填充规则的数学原理、SVG 路径解析，以及企业级性能优化策略。
