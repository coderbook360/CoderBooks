# 射线-三角形相交算法

在 3D 图形学中，**射线-三角形相交测试**是最基础也是最重要的操作之一。它用于：

- **光线追踪**：计算光线与物体表面的交点
- **拾取**：判断鼠标点击了哪个物体
- **碰撞检测**：检测运动物体是否穿透表面

## Möller-Trumbore 算法

这是最常用的射线-三角形相交算法，直接计算重心坐标，高效且数值稳定。

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

使用 Cramer 法则求解。

### 代码实现

```javascript
function rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
  const EPSILON = 0.0000001;
  
  // 计算边向量
  const e1 = subtract(v1, v0);
  const e2 = subtract(v2, v0);
  
  // 计算 P = D × E2
  const p = cross(rayDir, e2);
  
  // 计算行列式
  const det = dot(e1, p);
  
  // 射线平行于三角形平面
  if (Math.abs(det) < EPSILON) {
    return null;
  }
  
  const invDet = 1.0 / det;
  
  // 计算 T = O - V0
  const t = subtract(rayOrigin, v0);
  
  // 计算 u 参数
  const u = dot(t, p) * invDet;
  
  // u 超出范围
  if (u < 0 || u > 1) {
    return null;
  }
  
  // 计算 Q = T × E1
  const q = cross(t, e1);
  
  // 计算 v 参数
  const v = dot(rayDir, q) * invDet;
  
  // v 超出范围或 u+v > 1
  if (v < 0 || u + v > 1) {
    return null;
  }
  
  // 计算 t（射线参数）
  const distance = dot(e2, q) * invDet;
  
  // 交点在射线反方向
  if (distance < EPSILON) {
    return null;
  }
  
  // 返回交点信息
  return {
    distance: distance,
    u: u,
    v: v,
    point: add(rayOrigin, scale(rayDir, distance))
  };
}
```

## 理解重心坐标

重心坐标 $(u, v, w)$ 满足 $u + v + w = 1$（通常 $w = 1 - u - v$）：

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
