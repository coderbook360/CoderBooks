# 变换基础：平移、旋转、缩放

假设你要绘制一个围绕自己中心旋转的矩形。不使用变换的话，你需要计算矩形四个角点旋转后的坐标，然后用 `beginPath()` 和 `lineTo()` 一个个连接——这个计算过程复杂且容易出错。但如果你理解了Canvas的**坐标变换（Transform）**，这个问题会变得极其简单。

## 变换的本质：改变坐标系，而非图形

首先要问一个问题：**当你调用 `ctx.rotate()` 时，到底发生了什么？**

很多人的第一反应是："旋转即将绘制的图形"。但实际上，**变换改变的是坐标系本身，而不是图形**。

想象你站在一张纸前画画。如果你要画一个歪斜的矩形，有两种方式：
1. **方式1**：你保持不动，歪着手画（计算旋转后的坐标）
2. **方式2**：你把纸旋转，然后正常画一个矩形（变换坐标系）

Canvas 的变换就是**方式2**：它旋转了"纸"（坐标系），你依然用最简单的方式画矩形。

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// 不使用变换：需要计算旋转后的坐标（复杂）
function drawRotatedRectHard(x, y, width, height, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // ... 复杂的三角函数计算
}

// 使用变换：旋转坐标系，然后正常绘制（简单）
function drawRotatedRectEasy(x, y, width, height, angle) {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);  // 移动到中心
  ctx.rotate(angle);                              // 旋转坐标系
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.restore();
}
```

看到区别了吗？使用变换后，绘制代码 `fillRect()` 依然简单，复杂性被 `translate()` 和 `rotate()` 吸收了。

## 平移变换：移动坐标原点

现在我要问第二个问题：**如何让后续所有绘制都整体向右移动100像素？**

答案是使用 `translate(x, y)`，它将坐标原点移动到新位置：

```javascript
// 原始绘制：矩形在 (50, 50)
ctx.fillStyle = 'blue';
ctx.fillRect(50, 50, 100, 100);

// 平移坐标系
ctx.translate(100, 0);

// 依然写 (50, 50)，但实际绘制在 (150, 50)
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);
```

`translate(100, 0)` 将坐标原点从 `(0, 0)` 移动到 `(100, 0)`，之后所有坐标都相对于新原点。

### 平移的实际价值

思考一下，如果要绘制一个复杂的图形组合（如一辆汽车），有几十个图形元素，如何将整辆车移动到不同位置？

不使用平移，你需要修改每个图形的坐标：

```javascript
// 麻烦的方式
function drawCar(offsetX, offsetY) {
  ctx.fillRect(offsetX + 10, offsetY + 30, 80, 20);  // 车身
  ctx.beginPath();
  ctx.arc(offsetX + 25, offsetY + 50, 10, 0, Math.PI * 2);  // 左轮
  ctx.fill();
  ctx.beginPath();
  ctx.arc(offsetX + 75, offsetY + 50, 10, 0, Math.PI * 2);  // 右轮
  ctx.fill();
  // ... 更多部件
}
```

使用平移，你只需要设置一次偏移：

```javascript
// 优雅的方式
function drawCar() {
  ctx.fillRect(10, 30, 80, 20);  // 车身
  ctx.beginPath();
  ctx.arc(25, 50, 10, 0, Math.PI * 2);  // 左轮
  ctx.fill();
  ctx.beginPath();
  ctx.arc(75, 50, 10, 0, Math.PI * 2);  // 右轮
  ctx.fill();
}

// 在不同位置绘制
ctx.save();
ctx.translate(100, 100);
drawCar();
ctx.restore();

ctx.save();
ctx.translate(300, 150);
drawCar();
ctx.restore();
```

代码复用性大大提升，绘制逻辑清晰简洁。

## 旋转变换：围绕原点旋转

现在我要问第三个问题：**如何让一个矩形旋转45度？**

答案是使用 `rotate(angle)`，其中 **angle 是弧度制**：

```javascript
// 旋转45度（π/4 弧度）
ctx.rotate(Math.PI / 4);

// 绘制矩形（会旋转绘制）
ctx.fillRect(50, 50, 100, 100);
```

但这里有个**关键细节**：`rotate()` 是**绕坐标原点旋转**，而不是绕矩形自己的中心旋转！

如果坐标原点在画布左上角 `(0, 0)`，矩形会绕左上角公转，而不是自转：

```javascript
ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
ctx.fillRect(100, 100, 80, 80);  // 原始位置（参考）

ctx.rotate(Math.PI / 4);  // 旋转45度
ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 80, 80);  // 旋转后的位置（偏离了）
```

蓝色矩形不会在原地旋转，而是绕 `(0, 0)` 点旋转到了其他位置。

### 绕中心旋转的标准模式

思考一下，如何让矩形绕自己的中心旋转？

核心思路：**平移→旋转→绘制**

```javascript
function drawRotatedRect(x, y, width, height, angle) {
  ctx.save();
  
  // 1. 将原点移动到矩形中心
  ctx.translate(x + width / 2, y + height / 2);
  
  // 2. 旋转坐标系
  ctx.rotate(angle);
  
  // 3. 绘制矩形（以原点为中心）
  ctx.fillRect(-width / 2, -height / 2, width, height);
  
  ctx.restore();
}

// 使用
drawRotatedRect(100, 100, 80, 80, Math.PI / 6);  // 旋转30度
```

关键步骤解析：
1. `translate(x + width/2, y + height/2)` 把坐标原点移到矩形中心
2. `rotate(angle)` 绕新原点（矩形中心）旋转
3. `fillRect(-width/2, -height/2, width, height)` 绘制以原点为中心的矩形

这个模式在绘制任何需要旋转的图形时都适用。

## 缩放变换：改变尺寸与方向

现在我要问第四个问题：**如何将后续绘制的所有内容放大2倍？**

答案是使用 `scale(x, y)`，参数是缩放倍数：

```javascript
// 等比例放大2倍
ctx.scale(2, 2);

// 绘制一个矩形（实际会是原来的2倍大）
ctx.fillRect(50, 50, 50, 50);  // 看起来是 (50, 50, 100, 100)
```

注意：缩放同时影响**坐标位置**和**尺寸**。`fillRect(50, 50, 50, 50)` 在 `scale(2, 2)` 后，起点变成 `(100, 100)`，尺寸变成 `100×100`。

### 非等比例缩放

思考一下，如何将图形在水平方向压缩一半，垂直方向拉伸2倍？

使用不同的X、Y缩放值：

```javascript
ctx.scale(0.5, 2);  // X轴压缩一半，Y轴拉伸2倍

ctx.fillRect(100, 50, 100, 50);
// 实际显示为起点 (50, 100)，尺寸 50×100
```

### 负值缩放：镜像效果

现在我要问第五个问题：**如何实现水平镜像翻转？**

答案是使用**负缩放值**：

```javascript
// 水平镜像（左右翻转）
ctx.scale(-1, 1);

// 垂直镜像（上下翻转）
ctx.scale(1, -1);

// 中心镜像（旋转180度效果）
ctx.scale(-1, -1);
```

但要注意一个**陷阱**：负缩放会让坐标系翻转，导致绘制位置异常：

```javascript
ctx.scale(-1, 1);  // 水平翻转
ctx.fillRect(50, 50, 100, 100);  // 矩形会出现在负坐标区域（看不见）

// 正确做法：配合平移
ctx.translate(canvas.width, 0);  // 先移到右边
ctx.scale(-1, 1);                 // 再翻转
ctx.fillRect(50, 50, 100, 100);   // 现在可见了
```

## 组合变换：顺序的重要性

现在我要问第六个问题：**"先平移后旋转"和"先旋转后平移"的结果一样吗？**

答案是**完全不一样！**变换的顺序至关重要：

```javascript
// 场景1：先平移后旋转
ctx.save();
ctx.translate(200, 200);
ctx.rotate(Math.PI / 4);
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 80, 80);  // 矩形在(200, 200)附近旋转
ctx.restore();

// 场景2：先旋转后平移
ctx.save();
ctx.rotate(Math.PI / 4);
ctx.translate(200, 200);
ctx.fillStyle = 'blue';
ctx.fillRect(0, 0, 80, 80);  // 矩形的位置被旋转影响
ctx.restore();
```

结果：
- **红色矩形**：在 `(200, 200)` 附近原地旋转
- **蓝色矩形**：旋转后的 `(200, 200)` 实际不在对角线上，位置偏移了

理解原因：
- 先平移后旋转：原点先移到 `(200, 200)`，然后绕新原点旋转，图形相对新原点的位置不变
- 先旋转后平移：原点先旋转，平移方向也旋转了，`translate(200, 200)` 不再是水平+垂直移动

**标准中心旋转模式就是利用了顺序**：先平移到中心，再旋转，让图形围绕自己的中心旋转。

## 实践应用：太阳系模型

让我们用变换实现一个简化的太阳系动画：

```javascript
let angle = 0;

function drawSolarSystem() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  
  // 太阳在中心
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = '#FDB813';
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  
  // 地球公转
  ctx.save();
  ctx.rotate(angle);  // 公转角度
  ctx.translate(150, 0);  // 公转半径
  
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // 月球绕地球公转
  ctx.save();
  ctx.rotate(angle * 12);  // 月球转得更快
  ctx.translate(40, 0);
  
  ctx.fillStyle = '#CCCCCC';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();  // 恢复到地球坐标系
  ctx.restore();  // 恢复到太阳坐标系
  ctx.restore();  // 恢复到画布坐标系
  
  angle += 0.01;
  requestAnimationFrame(drawSolarSystem);
}

drawSolarSystem();
```

注意 `save/restore` 的嵌套使用：每个天体都有自己的坐标系，通过保存和恢复状态来管理。

## 实现镜像倒影效果

再看一个实用案例：绘制物体的水中倒影

```javascript
function drawWithReflection(img, x, y, width, height) {
  // 绘制原图
  ctx.drawImage(img, x, y, width, height);
  
  // 绘制倒影
  ctx.save();
  
  // 移动到图片底部
  ctx.translate(x, y + height);
  
  // 垂直翻转
  ctx.scale(1, -1);
  
  // 半透明绘制
  ctx.globalAlpha = 0.5;
  ctx.drawImage(img, 0, 0, width, height);
  
  ctx.restore();
}

const img = new Image();
img.src = 'boat.jpg';
img.onload = function() {
  drawWithReflection(img, 100, 50, 200, 150);
};
```

倒影效果通过 `scale(1, -1)` 实现垂直翻转，配合 `globalAlpha` 实现半透明。

## 变换的累积效应

思考一下，如果连续调用 `translate(50, 0)` 三次，会怎样？

答案是**累积**：原点会移动 `150` 像素：

```javascript
ctx.translate(50, 0);
ctx.translate(50, 0);
ctx.translate(50, 0);

ctx.fillRect(0, 0, 50, 50);  // 实际绘制在 (150, 0)
```

同样，连续 `rotate()` 也会累积：

```javascript
ctx.rotate(Math.PI / 4);
ctx.rotate(Math.PI / 4);

// 总共旋转了 π/2（90度）
```

这就是为什么要配合 `save/restore` 使用，避免变换意外累积。

## 本章小结

坐标变换是简化图形绘制的强大工具：

- **变换本质**：改变坐标系，而非图形本身
- **translate(x, y)**：平移坐标原点
- **rotate(angle)**：绕原点旋转（弧度制）
- **scale(x, y)**：缩放坐标系，负值实现镜像

关键技巧：
- **绕中心旋转**：translate到中心 → rotate → 以原点为中心绘制
- **变换顺序**：先平移后旋转 ≠ 先旋转后平移
- **镜像效果**：负缩放 + 适当平移
- **状态管理**：用 `save/restore` 隔离变换影响

常见陷阱：
- 忘记 `rotate()` 绕原点而非图形中心旋转
- 忽略变换的累积效应
- 负缩放后坐标系翻转导致位置错乱

掌握了基础变换，你已经能优雅地处理大部分图形绘制需求。下一章，我们将深入变换的数学原理——矩阵，揭示变换背后的秘密。
