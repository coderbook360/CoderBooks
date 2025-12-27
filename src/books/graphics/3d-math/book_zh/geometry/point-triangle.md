# 点与三角形的关系

判断一个点是否在三角形内部是图形学中的基础操作，用于：

- **碰撞检测**：判断点是否与三角形面片碰撞
- **光栅化**：判断像素中心是否在三角形内
- **拾取**：判断点击位置是否在某个三角形上

本章介绍三种主流方法，每种都有其适用场景。

## 重心坐标法

最优雅的方法是使用**重心坐标**。这种方法不仅能判断点是否在三角形内，还能直接用于插值——这是光栅化的核心需求。

### 为什么重心坐标如此强大？

重心坐标的核心思想是：**用顶点的加权组合来表示任意点**。

三角形内任意点可以表示为三个顶点的加权平均：

$$
\mathbf{P} = \alpha \mathbf{V}_0 + \beta \mathbf{V}_1 + \gamma \mathbf{V}_2
$$

其中 $\alpha + \beta + \gamma = 1$。

这三个权重有直观的几何意义：
- $\alpha$ 表示点 P "靠近" $V_0$ 的程度
- 当 P 恰好在 $V_0$ 时，$\alpha = 1, \beta = 0, \gamma = 0$
- 当 P 在 $V_0$ 的对边（$V_1 V_2$ 连线）上时，$\alpha = 0$

**判断规则**：
- 如果 $\alpha, \beta, \gamma \in [0, 1]$，点在三角形**内部**
- 如果某个坐标为 0，点在**边**上
- 如果某个坐标为负，点在三角形**外部**

### 从概念到代码

理解了原理，让我们看如何高效计算重心坐标。

关键是解一个线性方程组。我们可以把问题转化为：给定点 P，求参数 $\beta$ 和 $\gamma$（$\alpha = 1 - \beta - \gamma$）。

通过向量投影和 Cramer 法则，可以得到以下高效实现：

```javascript
/**
 * 计算点 P 相对于三角形 V0V1V2 的重心坐标
 * @returns {Object|null} 包含 alpha, beta, gamma 的对象，或 null（退化三角形）
 */
function computeBarycentricCoords(p, v0, v1, v2) {
  // 构造三角形的两条边向量
  const v0v1 = subtract(v1, v0);  // 从 V0 指向 V1
  const v0v2 = subtract(v2, v0);  // 从 V0 指向 V2
  const v0p = subtract(p, v0);    // 从 V0 指向点 P
  
  // 计算 Gram 矩阵元素（用于求解线性方程组）
  const d00 = dot(v0v1, v0v1);  // |V0V1|²
  const d01 = dot(v0v1, v0v2);  // V0V1 · V0V2
  const d02 = dot(v0v1, v0p);   // V0V1 · V0P
  const d11 = dot(v0v2, v0v2);  // |V0V2|²
  const d12 = dot(v0v2, v0p);   // V0V2 · V0P
  
  // 计算行列式（Cramer 法则的分母）
  const denom = d00 * d11 - d01 * d01;
  
  // 行列式为 0 说明三角形退化（三点共线）
  if (Math.abs(denom) < 1e-10) {
    return null;
  }
  
  const invDenom = 1.0 / denom;
  
  // 解出 beta 和 gamma
  const beta = (d11 * d02 - d01 * d12) * invDenom;
  const gamma = (d00 * d12 - d01 * d02) * invDenom;
  const alpha = 1 - beta - gamma;
  
  return { alpha, beta, gamma };
}

/**
 * 判断点是否在三角形内部
 */
function isPointInTriangle(p, v0, v1, v2) {
  const coords = computeBarycentricCoords(p, v0, v1, v2);
  
  if (!coords) return false;  // 退化三角形
  
  // 三个坐标都非负，说明点在三角形内或边上
  return coords.alpha >= 0 && coords.beta >= 0 && coords.gamma >= 0;
}
```

## 叉积法（同侧测试）

如果不需要重心坐标，叉积法是另一种直观的选择。它的核心思想更容易理解：**检查点是否在所有边的同一侧**。

### 原理

对于三角形 $V_0 V_1 V_2$（逆时针方向）：
- 点 $P$ 在边 $V_0 V_1$ 的左侧
- 点 $P$ 在边 $V_1 V_2$ 的左侧
- 点 $P$ 在边 $V_2 V_0$ 的左侧

如果都满足，点在三角形内。

```javascript
function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function isPointInTriangle2D(p, v0, v1, v2) {
  const d1 = sign(p, v0, v1);
  const d2 = sign(p, v1, v2);
  const d3 = sign(p, v2, v0);
  
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  
  return !(hasNeg && hasPos);
}
```

### 3D 版本

在 3D 中，需要将叉积投影到法向量方向：

```javascript
function isPointInTriangle3D(p, v0, v1, v2) {
  // 计算三角形法向量
  const normal = cross(subtract(v1, v0), subtract(v2, v0));
  
  // 边向量与顶点到 P 的向量的叉积
  const c0 = cross(subtract(v1, v0), subtract(p, v0));
  const c1 = cross(subtract(v2, v1), subtract(p, v1));
  const c2 = cross(subtract(v0, v2), subtract(p, v2));
  
  // 检查所有叉积是否与法向量同向
  return dot(normal, c0) >= 0 && 
         dot(normal, c1) >= 0 && 
         dot(normal, c2) >= 0;
}
```

## 面积法

通过比较面积来判断：

$$
\text{点在内部} \iff S_{PAB} + S_{PBC} + S_{PCA} = S_{ABC}
$$

```javascript
function triangleArea2D(p1, p2, p3) {
  return Math.abs(
    (p1.x * (p2.y - p3.y) + 
     p2.x * (p3.y - p1.y) + 
     p3.x * (p1.y - p2.y)) / 2
  );
}

function isPointInTriangleByArea(p, v0, v1, v2) {
  const areaTotal = triangleArea2D(v0, v1, v2);
  const area1 = triangleArea2D(p, v1, v2);
  const area2 = triangleArea2D(v0, p, v2);
  const area3 = triangleArea2D(v0, v1, p);
  
  const epsilon = 0.0001;
  return Math.abs(areaTotal - (area1 + area2 + area3)) < epsilon;
}
```

## 最近点距离

计算点到三角形的最近点：

```javascript
function closestPointOnTriangle(p, v0, v1, v2) {
  // 边向量
  const e0 = subtract(v1, v0);
  const e1 = subtract(v2, v0);
  const v = subtract(p, v0);
  
  // 计算参数
  const d00 = dot(e0, e0);
  const d01 = dot(e0, e1);
  const d11 = dot(e1, e1);
  const d20 = dot(v, e0);
  const d21 = dot(v, e1);
  
  const denom = d00 * d11 - d01 * d01;
  let s = (d11 * d20 - d01 * d21) / denom;
  let t = (d00 * d21 - d01 * d20) / denom;
  
  // 检查各种情况
  if (s < 0) {
    // 最近点在边 V0-V2 上
    s = 0;
    t = clamp(d21 / d11, 0, 1);
  } else if (t < 0) {
    // 最近点在边 V0-V1 上
    t = 0;
    s = clamp(d20 / d00, 0, 1);
  } else if (s + t > 1) {
    // 最近点在边 V1-V2 上
    const edge = subtract(v2, v1);
    const toP = subtract(p, v1);
    const param = clamp(dot(toP, edge) / dot(edge, edge), 0, 1);
    
    return add(v1, scale(edge, param));
  }
  
  // 最近点在三角形内部
  return add(v0, add(scale(e0, s), scale(e1, t)));
}

function distanceToTriangle(p, v0, v1, v2) {
  const closest = closestPointOnTriangle(p, v0, v1, v2);
  return length(subtract(p, closest));
}
```

## 区域划分

三角形将平面分成 7 个区域：

```
      \  R1  /
       \    /
        \  /
    R6   \/   R2
    ----/V0\----
       / T  \
      /      \
   V2/________\V1
   /   \  R4  / \
  R5    \    /  R3
         \  /
```

- **T**：三角形内部
- **R1-R3**：顶点 Voronoi 区域
- **R4-R6**：边 Voronoi 区域

## 光栅化中的应用

在光栅化时，判断每个像素是否在三角形内：

```javascript
function rasterizeTriangle(v0, v1, v2, canvas) {
  // 计算包围盒
  const minX = Math.floor(Math.min(v0.x, v1.x, v2.x));
  const maxX = Math.ceil(Math.max(v0.x, v1.x, v2.x));
  const minY = Math.floor(Math.min(v0.y, v1.y, v2.y));
  const maxY = Math.ceil(Math.max(v0.y, v1.y, v2.y));
  
  // 遍历包围盒内的像素
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };  // 像素中心
      
      const coords = computeBarycentricCoords(p, v0, v1, v2);
      
      if (coords && coords.alpha >= 0 && coords.beta >= 0 && coords.gamma >= 0) {
        // 像素在三角形内，使用重心坐标插值颜色
        const color = interpolateColor(
          v0.color, v1.color, v2.color, 
          coords.alpha, coords.beta, coords.gamma
        );
        
        canvas.setPixel(x, y, color);
      }
    }
  }
}
```

## 性能对比

| 方法 | 操作次数 | 特点 |
|------|---------|------|
| 重心坐标 | ~15 | 可用于插值 |
| 叉积法 | ~12 | 直观简单 |
| 面积法 | ~20 | 数值稳定性好 |

## 小结

1. **重心坐标法**：最通用，可直接用于插值
2. **叉积法**：直观，检查点在所有边同侧
3. **面积法**：利用面积守恒原理
4. **最近点**：用于距离计算和碰撞响应

选择依据：
- 需要插值 → 重心坐标
- 只需判断 → 叉积法（更快）
- 需要距离 → 最近点算法
