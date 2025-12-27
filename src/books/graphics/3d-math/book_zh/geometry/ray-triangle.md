# 射线-三角形相交算法

在 3D 图形学中，**射线-三角形相交测试**是最基础也是最重要的操作之一。它用于：

- **光线追踪**：计算光线与物体表面的交点
- **拾取**：判断鼠标点击了哪个物体
- **碰撞检测**：检测运动物体是否穿透表面

## 为什么需要射线-三角形相交？

在深入算法之前，让我们思考一个问题：**为什么 3D 图形学如此依赖这个看似简单的测试？**

答案在于 3D 模型的本质——几乎所有 3D 模型都由三角形组成。一个游戏角色可能由上万个三角形构成，当你点击屏幕时，程序需要快速判断：这条从相机发出的射线击中了哪个三角形？

这就是为什么射线-三角形相交算法必须：
1. **高效**：可能每帧执行数万次
2. **精确**：避免穿透或漏检
3. **稳定**：在各种边界情况下都能正常工作

理解了这些需求，我们来看最经典的解决方案。

## Möller-Trumbore 算法

这是 1997 年由 Tomas Möller 和 Ben Trumbore 提出的算法，至今仍是最常用的射线-三角形相交算法。它的核心思想是：**直接计算重心坐标**，一步到位解决"是否相交"和"交点在哪"两个问题。

### 为什么选择重心坐标？

传统方法是先求射线与三角形所在平面的交点，再判断交点是否在三角形内。这种方法有两个缺点：

1. **计算冗余**：需要两步计算，每步都有误差积累
2. **无法获得插值信息**：即使知道交点位置，也不知道如何插值顶点属性

而 Möller-Trumbore 算法使用重心坐标，可以：
- **一步到位**：同时判断相交和计算交点
- **直接插值**：重心坐标可直接用于插值法线、UV、颜色等顶点属性

### 数学推导

射线方程：
$$
\mathbf{P}(t) = \mathbf{O} + t\mathbf{D}
$$

三角形上的点用重心坐标表示：
$$
\mathbf{P}(u, v) = (1-u-v)\mathbf{V}_0 + u\mathbf{V}_1 + v\mathbf{V}_2
$$

相交意味着：
$$
\mathbf{O} + t\mathbf{D} = (1-u-v)\mathbf{V}_0 + u\mathbf{V}_1 + v\mathbf{V}_2
$$

整理：
$$
\mathbf{O} - \mathbf{V}_0 = -t\mathbf{D} + u(\mathbf{V}_1 - \mathbf{V}_0) + v(\mathbf{V}_2 - \mathbf{V}_0)
$$

设：
- $\mathbf{E}_1 = \mathbf{V}_1 - \mathbf{V}_0$（边1）
- $\mathbf{E}_2 = \mathbf{V}_2 - \mathbf{V}_0$（边2）
- $\mathbf{T} = \mathbf{O} - \mathbf{V}_0$（原点到顶点的向量）

得到矩阵方程：
$$
\begin{bmatrix} -\mathbf{D} & \mathbf{E}_1 & \mathbf{E}_2 \end{bmatrix}
\begin{bmatrix} t \\ u \\ v \end{bmatrix}
= \mathbf{T}
$$

### 为什么用 Cramer 法则？

这个 3×3 的线性方程组有多种解法，但 Cramer 法则特别适合这里，原因是：

1. **只有 3 个未知数**：Cramer 法则对小型系统非常高效
2. **可以提前退出**：如果行列式为 0，直接返回无交点
3. **中间结果可复用**：计算 u 和 v 时共享叉积结果

Cramer 法则的核心公式是：

$$
t = \frac{\det([\mathbf{T}, \mathbf{E}_1, \mathbf{E}_2])}{\det([-\mathbf{D}, \mathbf{E}_1, \mathbf{E}_2])}
$$

利用行列式的性质 $\det([A, B, C]) = A \cdot (B \times C)$，可以把这些行列式转换为点积和叉积运算。

### 代码实现

理解了数学原理，让我们看具体实现。每一步都对应前面的推导：

```javascript
function rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
  const EPSILON = 0.0000001;
  
  // 步骤1：计算边向量 E1 和 E2
  // E1 = V1 - V0，E2 = V2 - V0
  // 这两个向量定义了三角形的两条边
  const e1 = subtract(v1, v0);
  const e2 = subtract(v2, v0);
  
  // 步骤2：计算 P = D × E2
  // 这个叉积会被多次使用，先计算并缓存
  // P 垂直于射线方向和边 E2
  const p = cross(rayDir, e2);
  
  // 步骤3：计算行列式 det = E1 · P
  // 行列式代表射线与三角形平面的"平行度"
  // det ≈ 0 表示射线几乎平行于三角形
  const det = dot(e1, p);
  
  // 射线平行于三角形平面，无交点
  if (Math.abs(det) < EPSILON) {
    return null;
  }
  
  // 预计算行列式的倒数，避免后续多次除法
  const invDet = 1.0 / det;
  
  // 步骤4：计算 T = O - V0
  // T 是从三角形顶点 V0 指向射线起点的向量
  const t = subtract(rayOrigin, v0);
  
  // 步骤5：计算重心坐标 u
  // u = (T · P) / det
  const u = dot(t, p) * invDet;
  
  // 提前检查：u 必须在 [0, 1] 范围内
  // 否则交点在三角形外部
  if (u < 0 || u > 1) {
    return null;
  }
  
  // 步骤6：计算 Q = T × E1
  // Q 用于计算 v 和最终的 t 参数
  const q = cross(t, e1);
  
  // 步骤7：计算重心坐标 v
  // v = (D · Q) / det
  const v = dot(rayDir, q) * invDet;
  
  // 检查：v >= 0 且 u + v <= 1
  // 这确保交点在三角形的三条边内
  if (v < 0 || u + v > 1) {
    return null;
  }
  
  // 步骤8：计算射线参数 t（距离）
  // t = (E2 · Q) / det
  const distance = dot(e2, q) * invDet;
  
  // 交点在射线反方向（t < 0），不计入
  if (distance < EPSILON) {
    return null;
  }
  
  // 返回交点信息：距离、重心坐标、交点位置
  return {
    distance: distance,
    u: u,
    v: v,
    point: add(rayOrigin, scale(rayDir, distance))
  };
}
```

## 理解重心坐标

在继续之前，让我们深入理解重心坐标这个核心概念。

### 重心坐标的几何意义

重心坐标 $(u, v, w)$ 是描述点在三角形内位置的一种方式，满足 $u + v + w = 1$（通常 $w = 1 - u - v$）。

你可以这样理解：**每个坐标表示"靠近对应顶点的程度"**。

```
        V0 (w=1, u=0, v=0)
        /\
       /  \
      /    \
     /  *P  \
    /   (u,v,w)
   /________\
  V1        V2
(u=1)      (v=1)
```

- 如果 $u, v, w \in [0, 1]$，点在三角形内
- 如果某个坐标为负，点在对应顶点的对边外侧
- 坐标值越大，点越靠近对应顶点

### 为什么重心坐标对图形学如此重要？

重心坐标不仅用于判断点是否在三角形内，更重要的是**插值**。

在渲染管线中，顶点着色器计算每个顶点的属性（颜色、法线、纹理坐标等），但像素着色器需要知道三角形内部每个像素的属性值。怎么办？答案就是**用重心坐标插值**。

如果三角形三个顶点的某个属性值分别是 $A_0$、$A_1$、$A_2$，那么三角形内任意点 $(u, v, w)$ 处的属性值是：

$$
A = w \cdot A_0 + u \cdot A_1 + v \cdot A_2
$$

这就是**重心插值**，GPU 渲染的核心技术之一。

### 重心坐标的应用

```javascript
// 插值顶点属性（颜色、法线、UV等）
function interpolateAttribute(attr0, attr1, attr2, u, v) {
  const w = 1 - u - v;
  
  return {
    x: w * attr0.x + u * attr1.x + v * attr2.x,
    y: w * attr0.y + u * attr1.y + v * attr2.y,
    z: w * attr0.z + u * attr1.z + v * attr2.z
  };
}

// 使用示例
const normal = interpolateAttribute(n0, n1, n2, u, v);
const uv = interpolateAttribute(uv0, uv1, uv2, u, v);
```

## 优化版本

### 背面剔除

如果不需要检测背面，可以提前退出：

```javascript
function rayTriangleIntersectCullBack(rayOrigin, rayDir, v0, v1, v2) {
  const e1 = subtract(v1, v0);
  const e2 = subtract(v2, v0);
  const p = cross(rayDir, e2);
  
  const det = dot(e1, p);
  
  // 只检测正面（逆时针为正面）
  if (det < EPSILON) {
    return null;  // 背面或平行
  }
  
  // ... 后续相同
}
```

### 预计算边向量

对于静态三角形，可以预计算并存储边向量：

```javascript
class Triangle {
  constructor(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    
    // 预计算
    this.e1 = subtract(v1, v0);
    this.e2 = subtract(v2, v0);
    this.normal = normalize(cross(this.e1, this.e2));
  }
  
  intersect(rayOrigin, rayDir) {
    const p = cross(rayDir, this.e2);
    const det = dot(this.e1, p);
    
    if (Math.abs(det) < EPSILON) return null;
    
    // ... 使用预计算的 e1, e2
  }
}
```

## Watertight 射线-三角形测试

处理射线恰好穿过边或顶点的情况，避免"漏光"：

```javascript
function watertightRayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
  // 1. 选择射线方向的主轴
  const kz = maxDimension(abs(rayDir));
  const kx = (kz + 1) % 3;
  const ky = (kx + 1) % 3;
  
  // 2. 交换坐标，使 z 成为主轴
  const d = permute(rayDir, kx, ky, kz);
  const p0 = permute(subtract(v0, rayOrigin), kx, ky, kz);
  const p1 = permute(subtract(v1, rayOrigin), kx, ky, kz);
  const p2 = permute(subtract(v2, rayOrigin), kx, ky, kz);
  
  // 3. 剪切变换，使射线方向与 z 轴对齐
  const sz = 1.0 / d.z;
  const sx = -d.x * sz;
  const sy = -d.y * sz;
  
  p0.x += sx * p0.z;
  p0.y += sy * p0.z;
  p1.x += sx * p1.z;
  p1.y += sy * p1.z;
  p2.x += sx * p2.z;
  p2.y += sy * p2.z;
  
  // 4. 计算边函数
  const e0 = p1.x * p2.y - p1.y * p2.x;
  const e1 = p2.x * p0.y - p2.y * p0.x;
  const e2 = p0.x * p1.y - p0.y * p1.x;
  
  // 5. 检测是否在三角形内
  if ((e0 < 0 || e1 < 0 || e2 < 0) && 
      (e0 > 0 || e1 > 0 || e2 > 0)) {
    return null;
  }
  
  // 6. 计算行列式
  const det = e0 + e1 + e2;
  if (det === 0) return null;
  
  // 7. 计算缩放后的 z 坐标
  p0.z *= sz;
  p1.z *= sz;
  p2.z *= sz;
  
  const tScaled = e0 * p0.z + e1 * p1.z + e2 * p2.z;
  
  // 8. 早期退出
  if (det < 0 && tScaled >= 0) return null;
  if (det > 0 && tScaled <= 0) return null;
  
  // 9. 计算最终参数
  const invDet = 1.0 / det;
  const u = e1 * invDet;
  const v = e2 * invDet;
  const t = tScaled * invDet;
  
  return { t, u, v };
}
```

## 性能对比

| 算法 | 操作次数 | 特点 |
|------|---------|------|
| Möller-Trumbore | ~30 | 通用、高效 |
| Watertight | ~50 | 无漏光、更稳定 |
| 平面先测试 | ~40 | 可提前退出 |

## 小结

1. **Möller-Trumbore**：最常用的算法，直接计算重心坐标
2. **重心坐标**：用于插值顶点属性（法线、UV、颜色）
3. **Watertight**：处理边界情况，避免漏光
4. **优化**：背面剔除、预计算边向量

下一章将介绍点与三角形的关系判断。
