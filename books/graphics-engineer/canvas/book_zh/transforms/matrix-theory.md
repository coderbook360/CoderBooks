# 变换矩阵原理

上一章我们学习了 `translate`、`rotate`、`scale` 三种基本变换。但你有没有好奇：**这些方法的底层是如何实现的？为什么变换的顺序会影响结果？**答案就在**变换矩阵（Transform Matrix）**中。理解矩阵原理，不仅能让你掌握Canvas的深层机制，更能为阅读 Fabric.js、Konva.js 等图形库源码打下坚实基础。

## 为什么需要矩阵？

首先要问一个问题：**能否用一种统一的数学方式表示所有变换操作？**

答案是可以——用**矩阵**。在Canvas内部，所有的 `translate`、`rotate`、`scale` 操作最终都会转化为一个 **3×3 的变换矩阵**。

矩阵的优势：
- **统一表示**：所有变换用同一种数据结构
- **高效计算**：矩阵乘法可以组合多个变换
- **可逆操作**：通过逆矩阵可以反向变换

这就是为什么图形学中大量使用矩阵——它是处理坐标变换的最优工具。

## 仿射变换与齐次坐标

现在我要问第二个问题：**为什么需要3×3矩阵，而不是2×2？**

思考一下 **平移变换**：`(x, y)` 平移到 `(x + tx, y + ty)`。如果用2×2矩阵表示：

```
[x']   [? ?] [x]
[y'] = [? ?] [y]
```

无论矩阵元素取什么值，都无法表示加法操作（平移）！2×2矩阵只能表示线性变换（旋转、缩放），不能表示平移。

解决方案是引入 **齐次坐标（Homogeneous Coordinates）**：用三个分量 `(x, y, 1)` 表示二维点，第三个分量永远是1。这样平移就可以用矩阵乘法表示了：

```
[x']   [1  0  tx] [x]   [x + tx]
[y'] = [0  1  ty] [y] = [y + ty]
[1 ]   [0  0  1 ] [1]   [1     ]
```

有没有很神奇？加上第三行后，平移操作 `(x + tx, y + ty)` 可以通过矩阵乘法实现！

## Canvas 的 6 参数矩阵

Canvas并不直接暴露 3×3 矩阵，而是用 **6个参数** `(a, b, c, d, e, f)` 表示：

```javascript
ctx.setTransform(a, b, c, d, e, f);
```

这6个参数与 3×3 矩阵的对应关系是：

```
[a  c  e]
[b  d  f]
[0  0  1]
```

其中：
- `a, b, c, d`：控制旋转、缩放、错切（2×2 子矩阵）
- `e, f`：控制平移（x和y方向）
- 第三行 `[0, 0, 1]` 固定不变（齐次坐标）

坐标变换公式：

```
x' = a*x + c*y + e
y' = b*x + d*y + f
```

现在思考一下，单位矩阵（不做任何变换）的参数是什么？

答案是 `(1, 0, 0, 1, 0, 0)`：

```javascript
ctx.setTransform(1, 0, 0, 1, 0, 0);
// 等价于：x' = x, y' = y
```

## 基本变换的矩阵形式

现在我要问第三个问题：**平移、旋转、缩放分别对应什么矩阵？**

### 平移矩阵

`translate(tx, ty)` 对应的矩阵：

```
[1   0   tx]
[0   1   ty]
[0   0   1 ]
```

Canvas API：`ctx.setTransform(1, 0, 0, 1, tx, ty)`

验证：
```javascript
// 使用 translate
ctx.translate(50, 100);

// 等价于使用 setTransform
ctx.setTransform(1, 0, 0, 1, 50, 100);
```

### 缩放矩阵

`scale(sx, sy)` 对应的矩阵：

```
[sx  0   0]
[0   sy  0]
[0   0   1]
```

Canvas API：`ctx.setTransform(sx, 0, 0, sy, 0, 0)`

### 旋转矩阵

`rotate(θ)` 对应的矩阵（θ是弧度）：

```
[cos(θ)  -sin(θ)  0]
[sin(θ)   cos(θ)  0]
[0        0       1]
```

Canvas API：`ctx.setTransform(Math.cos(θ), Math.sin(θ), -Math.sin(θ), Math.cos(θ), 0, 0)`

例如，旋转45度（π/4弧度）：

```javascript
const angle = Math.PI / 4;
const cos = Math.cos(angle);  // ≈ 0.707
const sin = Math.sin(angle);  // ≈ 0.707

ctx.setTransform(cos, sin, -sin, cos, 0, 0);
```

## 矩阵乘法与变换组合

现在我要问第四个问题：**为什么"先平移后旋转"和"先旋转后平移"的结果不同？**

答案在于**矩阵乘法的非交换性**：`A × B ≠ B × A`

假设我们要先平移 `(tx, ty)`，再旋转 `θ`：

```
最终矩阵 = 旋转矩阵 × 平移矩阵
```

注意顺序：**后执行的变换在左侧**！这是因为坐标变换是右乘：

```
[x']   [最终矩阵] [x]
[y'] = [      ] [y]
[1 ]   [      ] [1]
```

计算过程：

```
点 → 平移 → 旋转
[x] → [平移矩阵][x] → [旋转矩阵][平移矩阵][x]
[y]   [      ][y]   [      ][      ][y]
[1]   [      ][1]   [      ][      ][1]
```

所以最终矩阵是 `旋转矩阵 × 平移矩阵`，**左边的矩阵后执行**。

用代码验证：

```javascript
// 方式1：先平移(100, 0)，再旋转45度
ctx.save();
ctx.translate(100, 0);
ctx.rotate(Math.PI / 4);
ctx.fillRect(0, 0, 50, 50);
ctx.restore();

// 方式2：使用矩阵实现同样效果
const tx = 100, ty = 0;
const angle = Math.PI / 4;
const cos = Math.cos(angle);
const sin = Math.sin(angle);

// 矩阵乘法：旋转 × 平移
// [cos -sin 0]   [1 0 tx]   [cos -sin tx*cos]
// [sin  cos 0] × [0 1 ty] = [sin  cos tx*sin]
// [0    0   1]   [0 0  1]   [0    0   1     ]

ctx.setTransform(
  cos, sin,                  // a, b (旋转)
  -sin, cos,                 // c, d (旋转)
  tx * cos - ty * sin,       // e (平移+旋转)
  tx * sin + ty * cos        // f (平移+旋转)
);
ctx.fillRect(0, 0, 50, 50);
```

两种方式绘制结果完全相同！

## Canvas 矩阵 API

### setTransform：设置当前矩阵

`setTransform(a, b, c, d, e, f)` 会**替换**当前变换矩阵：

```javascript
ctx.setTransform(2, 0, 0, 2, 100, 50);
// 设置为：缩放2倍 + 平移(100, 50)

ctx.setTransform(1, 0, 0, 1, 0, 0);
// 重置为单位矩阵
```

### transform：累积变换

`transform(a, b, c, d, e, f)` 会**乘以**指定矩阵：

```javascript
ctx.translate(50, 0);     // M1
ctx.transform(1, 0, 0, 1, 30, 0);  // M2

// 最终矩阵 = M1 × M2
```

等价于：

```javascript
ctx.setTransform(1, 0, 0, 1, 80, 0);  // 平移累积：50 + 30
```

### getTransform：获取当前矩阵

```javascript
const matrix = ctx.getTransform();
console.log(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
```

返回一个 `DOMMatrix` 对象，包含当前的6个矩阵参数。

### resetTransform：重置为单位矩阵

```javascript
ctx.resetTransform();
// 等价于：ctx.setTransform(1, 0, 0, 1, 0, 0)
```

## 实践：用矩阵实现中心旋转

回到上一章的经典问题：如何绕矩形中心旋转？

用矩阵方式实现：

```javascript
function drawRotatedRect(x, y, width, height, angle) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  
  // 1. 平移到中心
  // 2. 旋转
  // 3. 平移回原位
  // 最终矩阵 = 平移回 × 旋转 × 平移到中心
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // 组合矩阵（手动计算）
  const a = cos;
  const b = sin;
  const c = -sin;
  const d = cos;
  const e = cx - cx * cos + cy * sin;
  const f = cy - cx * sin - cy * cos;
  
  ctx.save();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

drawRotatedRect(100, 100, 80, 80, Math.PI / 6);
```

虽然计算复杂，但理解这个过程能帮你深入掌握变换原理。

## 本章小结

变换矩阵是Canvas变换的底层机制：

- **齐次坐标**：用 `(x, y, 1)` 表示点，使平移可用矩阵乘法实现
- **3×3矩阵**：完整表示2D仿射变换（平移、旋转、缩放、错切）
- **6参数形式**：Canvas用 `(a, b, c, d, e, f)` 简化矩阵表示
- **矩阵乘法**：变换组合对应矩阵相乘，**后执行的在左侧**
- **Canvas API**：
  - `setTransform(...)` 替换矩阵
  - `transform(...)` 累积矩阵
  - `getTransform()` 获取当前矩阵
  - `resetTransform()` 重置矩阵

关键公式：
```
x' = a*x + c*y + e
y' = b*x + d*y + f
```

理解矩阵原理后，复杂变换不再神秘。下一章，我们将学习矩阵的高级运算——求逆、错切等操作。
