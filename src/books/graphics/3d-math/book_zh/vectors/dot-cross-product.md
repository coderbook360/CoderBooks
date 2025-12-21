# 点积与叉积

在前面的章节中，我们学习了向量的加减、数乘和长度。现在要问两个更深入的问题：

1. **如何判断两个向量是否垂直？**
2. **如何找到一个垂直于平面的向量？**

第一个问题的答案是**点积**，第二个问题的答案是**叉积**。

这两种运算是 3D 图形学中最重要的向量运算，几乎无处不在。

## 点积（Dot Product）

### 什么是点积

点积是两个向量运算得到一个**标量**（普通数字）的运算。

数学符号：$\mathbf{a} \cdot \mathbf{b}$（读作"a 点 b"）

计算方法：**对应分量相乘再相加**

$$
\mathbf{a} \cdot \mathbf{b} = a_x \cdot b_x + a_y \cdot b_y + a_z \cdot b_z
$$

例如：

$$
(1, 2, 3) \cdot (4, 5, 6) = 1 \times 4 + 2 \times 5 + 3 \times 6 = 4 + 10 + 18 = 32
$$

这个数字 32 有什么含义？让我们看看点积的几何意义。

### 点积的几何意义

点积有一个非常重要的几何公式：

$$
\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\| \cdot \|\mathbf{b}\| \cdot \cos\theta
$$

其中 $\theta$ 是两个向量之间的夹角。

这个公式告诉我们：**点积的值与夹角的余弦值成正比**。

现在思考：余弦函数在不同角度的值是多少？

- $\cos(0°) = 1$（同向）
- $\cos(90°) = 0$（垂直）
- $\cos(180°) = -1$（反向）

因此，点积的正负号可以告诉我们两个向量的**方向关系**：

| 点积值 | 含义 | 夹角 |
|-------|------|------|
| $\mathbf{a} \cdot \mathbf{b} > 0$ | 方向大致相同 | 锐角（0° ~ 90°）|
| $\mathbf{a} \cdot \mathbf{b} = 0$ | 方向垂直 | 直角（90°）|
| $\mathbf{a} \cdot \mathbf{b} < 0$ | 方向大致相反 | 钝角（90° ~ 180°）|

### 特殊情况：单位向量点积

如果 $\mathbf{a}$ 和 $\mathbf{b}$ 都是单位向量（长度为 1），那么：

$$
\mathbf{a} \cdot \mathbf{b} = 1 \times 1 \times \cos\theta = \cos\theta
$$

点积的值**直接等于夹角的余弦值**！

这在图形学中非常有用，因为很多方向向量都是归一化的单位向量。

### 代码实现：dot() 方法

```javascript
class Vector3 {
  // ... 前面的代码 ...

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
}
```

非常简单：对应分量相乘再相加。

使用示例：

```javascript
const a = new Vector3(1, 0, 0); // x 轴方向
const b = new Vector3(0, 1, 0); // y 轴方向

console.log(a.dot(b)); // 0 - 垂直

const c = new Vector3(1, 1, 0); // 45° 方向
console.log(a.dot(c)); // 1 - 锐角（正值）

const d = new Vector3(-1, 0, 0); // 反向
console.log(a.dot(d)); // -1 - 钝角（负值）
```

### 应用 1：计算向量夹角

如何计算两个向量之间的夹角？

从几何公式推导：

$$
\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\| \cdot \|\mathbf{b}\| \cdot \cos\theta
$$

两边同时除以 $\|\mathbf{a}\| \cdot \|\mathbf{b}\|$：

$$
\cos\theta = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \cdot \|\mathbf{b}\|}
$$

再用反余弦函数（$\arccos$）：

$$
\theta = \arccos\left(\frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \cdot \|\mathbf{b}\|}\right)
$$

代码实现：

```javascript
function angleBetween(a, b) {
  const dot = a.dot(b);
  const lenProduct = a.length() * b.length();
  const cosTheta = dot / lenProduct;
  
  // 限制 cosTheta 在 [-1, 1] 范围内（避免数值误差）
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  
  return Math.acos(clampedCos); // 返回弧度
}

// 使用示例
const v1 = new Vector3(1, 0, 0);
const v2 = new Vector3(1, 1, 0);

const angleRad = angleBetween(v1, v2);
const angleDeg = angleRad * (180 / Math.PI);
console.log(`夹角：${angleDeg.toFixed(2)}°`); // 45.00°
```

注意：`Math.acos()` 返回的是**弧度**，需要乘以 `180 / Math.PI` 转换为角度。

为什么要限制 `cosTheta` 在 [-1, 1] 范围？因为浮点数计算可能产生微小误差，导致 `cosTheta` 超出范围（如 1.0000001），这会让 `Math.acos()` 返回 `NaN`。

### 应用 2：判断方向

点积可以快速判断两个向量的方向关系：

```javascript
function isFacing(forward, target) {
  return forward.dot(target) > 0;
}

// 判断相机是否朝向目标
const cameraForward = new Vector3(0, 0, -1);
const toTarget = new Vector3(1, 0, -0.5).normalize();

if (isFacing(cameraForward, toTarget)) {
  console.log('目标在视野内');
} else {
  console.log('目标在背后');
}
```

### 应用 3：计算投影

点积还可以计算向量 $\mathbf{a}$ 在向量 $\mathbf{b}$ 方向上的**投影长度**。

如果 $\mathbf{b}$ 是单位向量，投影长度就是：

$$
\text{投影} = \mathbf{a} \cdot \mathbf{b}
$$

这在光照计算中非常重要（Lambert 漫反射模型）。

## 叉积（Cross Product）

### 什么是叉积

叉积是两个向量运算得到一个**新向量**的运算。

数学符号：$\mathbf{a} \times \mathbf{b}$（读作"a 叉 b"）

计算方法：

$$
\mathbf{a} \times \mathbf{b} = \begin{pmatrix}
a_y b_z - a_z b_y \\
a_z b_x - a_x b_z \\
a_x b_y - a_y b_x
\end{pmatrix}
$$

公式看起来很复杂，但有规律：

- x 分量：用 y 和 z 交叉相乘
- y 分量：用 z 和 x 交叉相乘
- z 分量：用 x 和 y 交叉相乘

注意中间项是**负号**。

例如：

$$
(1, 0, 0) \times (0, 1, 0) = (0 \cdot 0 - 0 \cdot 1, 0 \cdot 0 - 1 \cdot 0, 1 \cdot 1 - 0 \cdot 0) = (0, 0, 1)
$$

x 轴叉乘 y 轴，得到 z 轴。这就是**右手法则**。

### 叉积的几何意义

叉积 $\mathbf{a} \times \mathbf{b}$ 的几何意义：

1. **方向**：垂直于 $\mathbf{a}$ 和 $\mathbf{b}$ 所在的平面
2. **长度**：等于 $\mathbf{a}$ 和 $\mathbf{b}$ 构成的平行四边形的面积

$$
\|\mathbf{a} \times \mathbf{b}\| = \|\mathbf{a}\| \cdot \|\mathbf{b}\| \cdot \sin\theta
$$

其中 $\theta$ 是两个向量的夹角。

### 右手法则

如何确定叉积的方向？用**右手法则**：

1. 伸出右手
2. 四指指向 $\mathbf{a}$ 的方向
3. 弯曲四指指向 $\mathbf{b}$ 的方向
4. 拇指指向的方向就是 $\mathbf{a} \times \mathbf{b}$ 的方向

验证：
- $\mathbf{x} \times \mathbf{y} = \mathbf{z}$ ✅
- $\mathbf{y} \times \mathbf{z} = \mathbf{x}$ ✅
- $\mathbf{z} \times \mathbf{x} = \mathbf{y}$ ✅

但反过来：
- $\mathbf{y} \times \mathbf{x} = -\mathbf{z}$ ❌（方向相反）

这说明叉积**不满足交换律**：

$$
\mathbf{a} \times \mathbf{b} = -(\mathbf{b} \times \mathbf{a})
$$

### 代码实现：cross() 方法

```javascript
cross(v) {
  return new Vector3(
    this.y * v.z - this.z * v.y,
    this.z * v.x - this.x * v.z,
    this.x * v.y - this.y * v.x
  );
}
```

使用示例：

```javascript
const x = new Vector3(1, 0, 0);
const y = new Vector3(0, 1, 0);

const z = x.cross(y);
console.log(z.toString()); // Vector3(0, 0, 1)

const negZ = y.cross(x);
console.log(negZ.toString()); // Vector3(0, 0, -1) - 方向相反
```

### 特殊情况：平行向量

如果两个向量平行（或反平行），它们的夹角是 0° 或 180°，$\sin\theta = 0$，所以：

$$
\mathbf{a} \times \mathbf{a} = \mathbf{0}
$$

平行向量的叉积是**零向量**。

```javascript
const v = new Vector3(1, 2, 3);
const parallel = v.multiplyScalar(2); // (2, 4, 6) - 平行向量

const result = v.cross(parallel);
console.log(result.toString()); // Vector3(0, 0, 0)
```

### 应用 1：计算平面法向量

三角形有三个顶点 A、B、C，如何计算三角形的**法向量**（垂直于三角形平面的向量）？

步骤：

1. 计算两条边向量：$\mathbf{AB}$ 和 $\mathbf{AC}$
2. 叉积：$\mathbf{n} = \mathbf{AB} \times \mathbf{AC}$
3. 归一化：$\hat{\mathbf{n}} = \frac{\mathbf{n}}{\|\mathbf{n}\|}$

```javascript
function calculateTriangleNormal(A, B, C) {
  const AB = B.sub(A);
  const AC = C.sub(A);
  
  const normal = AB.cross(AC);
  return normal.normalize();
}

// 使用示例
const A = new Vector3(0, 0, 0);
const B = new Vector3(1, 0, 0);
const C = new Vector3(0, 1, 0);

const normal = calculateTriangleNormal(A, B, C);
console.log(normal.toString()); // Vector3(0, 0, 1) - 指向 z 轴
```

这是 3D 建模和光照计算的基础操作。

### 应用 2：计算三角形面积

三角形面积 = 平行四边形面积的一半：

$$
\text{面积} = \frac{1}{2} \|\mathbf{AB} \times \mathbf{AC}\|
$$

```javascript
function calculateTriangleArea(A, B, C) {
  const AB = B.sub(A);
  const AC = C.sub(A);
  
  const cross = AB.cross(AC);
  return cross.length() / 2;
}

const area = calculateTriangleArea(
  new Vector3(0, 0, 0),
  new Vector3(1, 0, 0),
  new Vector3(0, 1, 0)
);
console.log(area); // 0.5
```

### 应用 3：判断点在三角形的哪一侧

叉积的方向可以判断点在三角形的正面还是背面（背面剔除算法）：

```javascript
function isPointInFrontOfTriangle(point, A, B, C) {
  const normal = calculateTriangleNormal(A, B, C);
  const toPoint = point.sub(A);
  
  return normal.dot(toPoint) > 0;
}
```

注意：这里结合了叉积（计算法向量）和点积（判断方向）。

## 点积 vs 叉积：对比总结

| 特性 | 点积 | 叉积 |
|-----|------|------|
| 结果类型 | 标量（数字）| 向量 |
| 几何意义 | 夹角、投影 | 垂直向量、面积 |
| 交换律 | ✅ $\mathbf{a} \cdot \mathbf{b} = \mathbf{b} \cdot \mathbf{a}$ | ❌ $\mathbf{a} \times \mathbf{b} = -(\mathbf{b} \times \mathbf{a})$ |
| 维度 | 适用于 2D 和 3D | 仅 3D（2D 叉积是标量）|
| 典型应用 | 光照、夹角、判断方向 | 法向量、面积、右手坐标系 |

## 小结

在本章中，我们学习了两种核心向量运算：

- **点积**：$\mathbf{a} \cdot \mathbf{b} = a_x b_x + a_y b_y + a_z b_z$
  - 结果是标量
  - 几何意义：$\|\mathbf{a}\| \|\mathbf{b}\| \cos\theta$
  - 应用：计算夹角、判断方向、计算投影
  - 满足交换律

- **叉积**：$\mathbf{a} \times \mathbf{b}$
  - 结果是向量（垂直于 $\mathbf{a}$ 和 $\mathbf{b}$）
  - 几何意义：长度等于平行四边形面积
  - 应用：计算法向量、计算面积、确定方向
  - 不满足交换律（顺序敏感）

点积和叉积是图形学中最常用的向量运算，下一章将看到它们在光照、运动、碰撞检测等实际场景中的应用。

---

**练习**：

1. 计算 `(1, 2, 3)` 和 `(4, 5, 6)` 的点积
2. 判断 `(1, 1, 0)` 和 `(-1, 1, 0)` 是否垂直（用点积）
3. 计算 `(1, 0, 0)` 和 `(0, 0, 1)` 的叉积
4. 计算三角形 `(0,0,0)`, `(3,0,0)`, `(0,4,0)` 的法向量和面积

尝试在浏览器控制台中完成这些练习。
