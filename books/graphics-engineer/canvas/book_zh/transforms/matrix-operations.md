# 矩阵运算与自定义变换

上一章我们理解了变换矩阵的原理。但在实际开发中，还会遇到更复杂的问题：**如何将屏幕坐标转换回Canvas坐标？如何实现斜切效果？如何构建一个通用的矩阵工具类？**本章将深入矩阵运算，掌握逆矩阵、错切变换等高级技巧。

## 为什么需要逆矩阵？

首先要问一个问题：**在图形编辑器中，用户点击了屏幕上的某个位置，如何知道点击的是Canvas中的哪个对象？**

这个问题涉及**坐标反向变换**：

```
屏幕坐标 → Canvas坐标 → 对象本地坐标
```

正向变换用矩阵乘法：

```
屏幕坐标 = 变换矩阵 × 本地坐标
```

反向变换需要**逆矩阵（Inverse Matrix）**：

```
本地坐标 = 逆矩阵 × 屏幕坐标
```

逆矩阵满足：`M × M^(-1) = I`（单位矩阵）

## 行列式：矩阵可逆的判断

现在我要问第二个问题：**是否所有矩阵都有逆矩阵？**

答案是否定的。矩阵可逆的充要条件是其**行列式（Determinant）不为零**。

对于Canvas的2×2核心矩阵 `[a c; b d]`，行列式计算公式：

```
det = a*d - b*c
```

如果 `det = 0`，矩阵不可逆，说明变换丢失了信息（如极端缩放到零）。

代码实现：

```javascript
function determinant(a, b, c, d) {
  return a * d - b * c;
}

// 检查矩阵是否可逆
function isInvertible(a, b, c, d) {
  return Math.abs(determinant(a, b, c, d)) > 1e-10;  // 避免浮点误差
}
```

## 逆矩阵计算

现在我要问第三个问题：**如何计算2D变换矩阵的逆矩阵？**

对于矩阵 `M = [a c e; b d f; 0 0 1]`，逆矩阵公式：

```
       [  d/det  -c/det  (c*f - d*e)/det ]
M^-1 = [ -b/det   a/det  (b*e - a*f)/det ]
       [  0       0       1               ]
```

其中 `det = a*d - b*c`。

代码实现：

```javascript
function invertMatrix(a, b, c, d, e, f) {
  const det = a * d - b * c;
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is not invertible');
  }
  
  return {
    a:  d / det,
    b: -b / det,
    c: -c / det,
    d:  a / det,
    e: (c * f - d * e) / det,
    f: (b * e - a * f) / det
  };
}

// 测试：旋转矩阵的逆矩阵
const angle = Math.PI / 4;
const cos = Math.cos(angle);
const sin = Math.sin(angle);

const matrix = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
const inverse = invertMatrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);

console.log(inverse);
// 结果：旋转-45度的矩阵
```

## 坐标变换：正向与逆向

现在我要问第四个问题：**如何将Canvas坐标转换为对象本地坐标？**

假设对象经过了 `translate(100, 50)` 和 `rotate(30°)` 变换，现在用户点击了Canvas的 `(150, 80)` 位置，如何计算这个点在对象本地坐标系中的位置？

答案：使用逆矩阵

```javascript
function transformPoint(matrix, x, y) {
  const { a, b, c, d, e, f } = matrix;
  return {
    x: a * x + c * y + e,
    y: b * x + d * y + f
  };
}

function inverseTransformPoint(matrix, x, y) {
  const inv = invertMatrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  return transformPoint(inv, x, y);
}

// 假设对象变换矩阵为
const matrix = {
  a: 0.866,  b: 0.5,    // 旋转30度
  c: -0.5,   d: 0.866,
  e: 100,    f: 50      // 平移(100, 50)
};

// Canvas点击坐标
const canvasPoint = { x: 150, y: 80 };

// 转换为对象本地坐标
const localPoint = inverseTransformPoint(matrix, canvasPoint.x, canvasPoint.y);
console.log(localPoint);  // 对象本地坐标系中的位置
```

这是实现点击检测、拖拽等交互的核心机制。

## 错切变换：斜切效果

现在我要问第五个问题：**如何让矩形看起来像平行四边形？**

答案是**错切变换（Shear/Skew）**。错切沿某一轴方向拉伸坐标。

### 水平错切

水平错切矩阵（`shx` 是错切系数）：

```
[1   shx  0]
[0   1    0]
[0   0    1]
```

变换公式：`x' = x + shx*y, y' = y`

代码实现：

```javascript
function shearX(shx) {
  ctx.setTransform(1, 0, shx, 1, 0, 0);
}

// 水平错切0.5
ctx.save();
shearX(0.5);
ctx.fillRect(100, 100, 80, 80);
ctx.restore();
```

矩形会变成平行四边形，顶边向右倾斜。

### 垂直错切

垂直错切矩阵：

```
[1   0    0]
[shy 1    0]
[0   0    1]
```

变换公式：`x' = x, y' = shy*x + y`

```javascript
function shearY(shy) {
  ctx.setTransform(1, shy, 0, 1, 0, 0);
}

// 垂直错切0.5
ctx.save();
shearY(0.5);
ctx.fillRect(100, 100, 80, 80);
ctx.restore();
```

矩形会向上倾斜。

### 实际应用：斜体文字效果

```javascript
function drawItalicText(text, x, y) {
  ctx.save();
  ctx.setTransform(1, 0, 0.2, 1, x, y);  // 水平错切0.2
  ctx.font = '32px Arial';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

drawItalicText('Slanted Text', 100, 100);
```

通过错切实现文字倾斜效果。

## DOMMatrix API：浏览器原生矩阵类

现在我要问第六个问题：**有没有现成的矩阵工具可以用？**

答案是 **DOMMatrix**（原名 `SVGMatrix`），浏览器原生支持的矩阵类：

```javascript
// 创建矩阵
const matrix = new DOMMatrix();

// 链式变换
matrix
  .translate(100, 50)
  .rotate(30)  // 度数，自动转弧度
  .scale(1.5);

// 应用到Canvas
ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);

// 获取逆矩阵
const inverse = matrix.inverse();

// 变换点坐标
const point = new DOMPoint(150, 80);
const transformed = matrix.transformPoint(point);
console.log(transformed.x, transformed.y);

// 反向变换
const local = inverse.transformPoint(point);
console.log(local.x, local.y);
```

DOMMatrix优势：
- **原生性能**：浏览器底层优化
- **链式API**：可读性强
- **完整功能**：支持逆矩阵、点变换、矩阵乘法等

Canvas 2D也支持直接传入DOMMatrix：

```javascript
const matrix = new DOMMatrix().translate(100, 50).rotate(30);
ctx.setTransform(matrix);  // 直接传入
```

## 矩阵工具类实现

如果需要自己实现矩阵类（如理解原理或兼容性）：

```javascript
class Matrix {
  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }
  
  // 复制
  clone() {
    return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f);
  }
  
  // 乘以另一个矩阵
  multiply(m) {
    const a = this.a * m.a + this.c * m.b;
    const b = this.b * m.a + this.d * m.b;
    const c = this.a * m.c + this.c * m.d;
    const d = this.b * m.c + this.d * m.d;
    const e = this.a * m.e + this.c * m.f + this.e;
    const f = this.b * m.e + this.d * m.f + this.f;
    
    return new Matrix(a, b, c, d, e, f);
  }
  
  // 求逆矩阵
  invert() {
    const det = this.a * this.d - this.b * this.c;
    
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is not invertible');
    }
    
    return new Matrix(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det
    );
  }
  
  // 变换点
  transformPoint(x, y) {
    return {
      x: this.a * x + this.c * y + this.e,
      y: this.b * x + this.d * y + this.f
    };
  }
  
  // 应用到Canvas
  applyToContext(ctx) {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f);
  }
}

// 使用示例
const m1 = new Matrix().multiply(new Matrix(1, 0, 0, 1, 100, 50));  // 平移
const m2 = m1.multiply(new Matrix(
  Math.cos(Math.PI/6), Math.sin(Math.PI/6),
  -Math.sin(Math.PI/6), Math.cos(Math.PI/6),
  0, 0
));  // 旋转30度

m2.applyToContext(ctx);
ctx.fillRect(0, 0, 80, 80);
```

## 本章小结

矩阵运算是图形编程的核心技能：

- **逆矩阵**：用于坐标反向变换，行列式不为零时可逆
- **行列式公式**：`det = a*d - b*c`
- **逆矩阵公式**：可以手动计算或使用DOMMatrix
- **坐标变换**：
  - 正向：`transformPoint(matrix, x, y)`
  - 逆向：`transformPoint(inverse, x, y)`
- **错切变换**：实现斜切效果（水平错切、垂直错切）
- **DOMMatrix API**：浏览器原生矩阵类，推荐使用

关键应用：
- 点击检测：屏幕坐标→本地坐标
- 拖拽交互：需要双向坐标转换
- 斜体效果：使用错切变换
- 复杂变换：矩阵乘法组合

下一章，我们将学习变换堆栈与状态管理，掌握复杂场景中的变换组织方式。
