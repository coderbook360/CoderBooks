# Matrix 矩阵变换

在 2D 图形渲染中，**变换矩阵（Transformation Matrix）** 是核心中的核心。它将平移、旋转、缩放等多种变换统一为矩阵乘法运算，使得复杂的变换组合变得简洁高效。

## 为什么使用矩阵？

考虑一个简单的问题：如何对一个点进行平移和旋转？

**分开计算的方式：**
```javascript
// 先旋转
x' = x * cos(θ) - y * sin(θ)
y' = x * sin(θ) + y * cos(θ)

// 再平移
x'' = x' + tx
y'' = y' + ty
```

**问题：** 当有多个变换时，代码会变得复杂，而且无法方便地组合多个变换。

**矩阵的解决方案：** 所有变换都表示为矩阵，变换组合就是矩阵乘法。

## 2D 变换矩阵

### 齐次坐标

为了用矩阵统一表示平移，我们使用 **3x3 齐次坐标矩阵**。但在实际实现中，由于最后一行总是 `[0, 0, 1]`，我们只存储 6 个值：

```
| a  c  tx |
| b  d  ty |
| 0  0  1  |
```

### Matrix 类实现

```typescript
// src/maths/Matrix.ts

/**
 * 2D 变换矩阵
 * 
 * 矩阵布局：
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 * 
 * 变换公式：
 * x' = a * x + c * y + tx
 * y' = b * x + d * y + ty
 */
export class Matrix {
  // 缩放和旋转分量
  public a: number = 1;   // 水平缩放
  public b: number = 0;   // 垂直倾斜（旋转分量）
  public c: number = 0;   // 水平倾斜（旋转分量）
  public d: number = 1;   // 垂直缩放
  
  // 平移分量
  public tx: number = 0;  // 水平位移
  public ty: number = 0;  // 垂直位移
  
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }
}
```

### 为什么是 a, b, c, d 而不是 m11, m12...？

这是历史遗留的命名习惯，源自 Flash/ActionScript。虽然不够直观，但已成为 2D 图形领域的约定俗成。

对应关系：
- `a = m00 = scaleX * cos(rotation)`
- `b = m10 = scaleX * sin(rotation)`
- `c = m01 = -scaleY * sin(rotation)`
- `d = m11 = scaleY * cos(rotation)`

## 基本变换

### 单位矩阵

```typescript
/**
 * 重置为单位矩阵
 * 单位矩阵相当于"无变换"
 */
public identity(): this {
  this.a = 1;
  this.b = 0;
  this.c = 0;
  this.d = 1;
  this.tx = 0;
  this.ty = 0;
  return this;
}
```

### 平移

```typescript
/**
 * 应用平移变换
 * 
 * 平移矩阵：
 * | 1  0  tx |
 * | 0  1  ty |
 * | 0  0  1  |
 */
public translate(x: number, y: number): this {
  this.tx += x;
  this.ty += y;
  return this;
}
```

### 缩放

```typescript
/**
 * 应用缩放变换
 * 
 * 缩放矩阵：
 * | sx  0   0 |
 * | 0   sy  0 |
 * | 0   0   1 |
 */
public scale(x: number, y: number): this {
  this.a *= x;
  this.b *= x;
  this.c *= y;
  this.d *= y;
  this.tx *= x;
  this.ty *= y;
  return this;
}
```

### 旋转

```typescript
/**
 * 应用旋转变换
 * 
 * 旋转矩阵：
 * | cos(θ)  -sin(θ)  0 |
 * | sin(θ)   cos(θ)  0 |
 * | 0        0       1 |
 */
public rotate(angle: number): this {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  const a = this.a;
  const b = this.b;
  const c = this.c;
  const d = this.d;
  const tx = this.tx;
  const ty = this.ty;
  
  // 矩阵乘法结果
  this.a = a * cos - b * sin;
  this.b = a * sin + b * cos;
  this.c = c * cos - d * sin;
  this.d = c * sin + d * cos;
  this.tx = tx * cos - ty * sin;
  this.ty = tx * sin + ty * cos;
  
  return this;
}
```

## 矩阵运算

### 矩阵乘法

这是变换组合的核心。**注意顺序：先应用的变换在右边**。

```typescript
/**
 * 将当前矩阵与另一矩阵相乘
 * result = this * matrix
 * 
 * 矩阵乘法公式：
 * | a1  c1  tx1 |   | a2  c2  tx2 |   | a1*a2+c1*b2   a1*c2+c1*d2   a1*tx2+c1*ty2+tx1 |
 * | b1  d1  ty1 | * | b2  d2  ty2 | = | b1*a2+d1*b2   b1*c2+d1*d2   b1*tx2+d1*ty2+ty1 |
 * | 0   0   1   |   | 0   0   1   |   | 0             0             1                 |
 */
public append(matrix: Matrix): this {
  const a = this.a;
  const b = this.b;
  const c = this.c;
  const d = this.d;
  
  this.a = a * matrix.a + c * matrix.b;
  this.b = b * matrix.a + d * matrix.b;
  this.c = a * matrix.c + c * matrix.d;
  this.d = b * matrix.c + d * matrix.d;
  this.tx = a * matrix.tx + c * matrix.ty + this.tx;
  this.ty = b * matrix.tx + d * matrix.ty + this.ty;
  
  return this;
}

/**
 * 前置乘法（顺序相反）
 * result = matrix * this
 */
public prepend(matrix: Matrix): this {
  const a = this.a;
  const b = this.b;
  const c = this.c;
  const d = this.d;
  const tx = this.tx;
  const ty = this.ty;
  
  this.a = matrix.a * a + matrix.c * b;
  this.b = matrix.b * a + matrix.d * b;
  this.c = matrix.a * c + matrix.c * d;
  this.d = matrix.b * c + matrix.d * d;
  this.tx = matrix.a * tx + matrix.c * ty + matrix.tx;
  this.ty = matrix.b * tx + matrix.d * ty + matrix.ty;
  
  return this;
}
```

### 矩阵求逆

逆矩阵用于"撤销"变换，或将世界坐标转换回局部坐标。

```typescript
/**
 * 计算逆矩阵
 * 
 * 对于 2x2 矩阵的逆：
 * | a  c |^(-1) = 1/(ad-bc) * |  d  -c |
 * | b  d |                     | -b   a |
 */
public invert(): this {
  const a = this.a;
  const b = this.b;
  const c = this.c;
  const d = this.d;
  const tx = this.tx;
  const ty = this.ty;
  
  // 行列式
  const det = a * d - b * c;
  
  if (det === 0) {
    // 矩阵不可逆，返回单位矩阵
    this.identity();
    return this;
  }
  
  const invDet = 1 / det;
  
  this.a = d * invDet;
  this.b = -b * invDet;
  this.c = -c * invDet;
  this.d = a * invDet;
  this.tx = (c * ty - d * tx) * invDet;
  this.ty = (b * tx - a * ty) * invDet;
  
  return this;
}
```

## 坐标变换

### 应用变换

```typescript
/**
 * 将矩阵变换应用到点
 * 
 * | a  c  tx |   | x |   | a*x + c*y + tx |
 * | b  d  ty | * | y | = | b*x + d*y + ty |
 * | 0  0  1  |   | 1 |   | 1              |
 */
public apply(point: Point, output?: Point): Point {
  const result = output || new Point();
  
  result.x = this.a * point.x + this.c * point.y + this.tx;
  result.y = this.b * point.x + this.d * point.y + this.ty;
  
  return result;
}

/**
 * 应用逆变换（世界坐标 → 局部坐标）
 */
public applyInverse(point: Point, output?: Point): Point {
  const result = output || new Point();
  
  const det = this.a * this.d - this.b * this.c;
  const invDet = 1 / det;
  
  const x = point.x - this.tx;
  const y = point.y - this.ty;
  
  result.x = (this.d * x - this.c * y) * invDet;
  result.y = (this.a * y - this.b * x) * invDet;
  
  return result;
}
```

## 从变换参数构建矩阵

```typescript
/**
 * 从位置、缩放、旋转、斜切、锚点构建矩阵
 * 这是 Transform 类的核心方法
 */
public setTransform(
  x: number, y: number,       // 位置
  pivotX: number, pivotY: number,  // 锚点
  scaleX: number, scaleY: number,  // 缩放
  rotation: number,           // 旋转
  skewX: number, skewY: number  // 斜切
): this {
  // 计算旋转的 sin/cos
  const sr = Math.sin(rotation);
  const cr = Math.cos(rotation);
  
  // 计算斜切的 sin/cos
  const cy = Math.cos(skewY);
  const sy = Math.sin(skewY);
  const cx = Math.cos(-skewX);
  const sx = Math.sin(-skewX);
  
  // 构建矩阵分量
  // 顺序：缩放 → 斜切 → 旋转 → 平移
  this.a = cr * scaleX * cy - sr * scaleY * sx;
  this.b = sr * scaleX * cy + cr * scaleY * sx;
  this.c = cr * scaleX * sy - sr * scaleY * cx;
  this.d = sr * scaleX * sy + cr * scaleY * cx;
  
  // 平移，考虑锚点偏移
  this.tx = x - pivotX * this.a - pivotY * this.c;
  this.ty = y - pivotX * this.b - pivotY * this.d;
  
  return this;
}
```

## 实用方法

```typescript
/**
 * 复制矩阵
 */
public copyFrom(matrix: Matrix): this {
  this.a = matrix.a;
  this.b = matrix.b;
  this.c = matrix.c;
  this.d = matrix.d;
  this.tx = matrix.tx;
  this.ty = matrix.ty;
  return this;
}

/**
 * 克隆矩阵
 */
public clone(): Matrix {
  return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
}

/**
 * 转换为数组（用于 WebGL uniform）
 */
public toArray(transpose = false): Float32Array {
  const array = new Float32Array(9);
  
  if (transpose) {
    array[0] = this.a;
    array[1] = this.b;
    array[2] = 0;
    array[3] = this.c;
    array[4] = this.d;
    array[5] = 0;
    array[6] = this.tx;
    array[7] = this.ty;
    array[8] = 1;
  } else {
    array[0] = this.a;
    array[1] = this.c;
    array[2] = this.tx;
    array[3] = this.b;
    array[4] = this.d;
    array[5] = this.ty;
    array[6] = 0;
    array[7] = 0;
    array[8] = 1;
  }
  
  return array;
}
```

## 小结

Matrix 是 2D 变换的数学基础：

1. **统一表示**：平移、旋转、缩放、斜切都用 6 个数字表示
2. **组合变换**：通过矩阵乘法组合多个变换
3. **坐标转换**：正向变换和逆变换用于坐标空间转换
4. **GPU 友好**：矩阵可以直接传递给 shader

理解矩阵变换是掌握任何图形渲染引擎的必备知识。
