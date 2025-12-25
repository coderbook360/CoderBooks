# 裁剪空间与归一化设备坐标

经过投影变换后，顶点从观察空间进入**裁剪空间**（Clip Space），然后通过透视除法变换到**归一化设备坐标**（NDC）。

## 为什么需要裁剪空间？

投影矩阵将 3D 场景"压缩"到一个标准体积中，方便后续处理：

1. **统一裁剪**：不管原始场景多大，裁剪都在 $[-1, 1]$ 范围内进行
2. **硬件加速**：GPU 针对这个标准范围优化
3. **简化计算**：屏幕映射变得简单

## 裁剪空间

### 齐次坐标

投影矩阵输出的是**齐次坐标** $(x_{clip}, y_{clip}, z_{clip}, w_{clip})$：

$$
\begin{bmatrix} x_{clip} \\ y_{clip} \\ z_{clip} \\ w_{clip} \end{bmatrix}
= M_{projection} \cdot 
\begin{bmatrix} x_{view} \\ y_{view} \\ z_{view} \\ 1 \end{bmatrix}
$$

注意：$w_{clip}$ 通常不再是 1！

### 透视投影的 w 分量

对于透视投影：

$$
w_{clip} = -z_{view}
$$

这就是透视除法的关键——远处的物体 $z$ 值大，$w$ 也大，除以 $w$ 后变小，产生"近大远小"的效果。

### 裁剪测试

在裁剪空间中，如果一个顶点满足以下条件，它就在视锥体内：

$$
-w_{clip} \leq x_{clip} \leq w_{clip}
$$
$$
-w_{clip} \leq y_{clip} \leq w_{clip}
$$
$$
-w_{clip} \leq z_{clip} \leq w_{clip} \quad \text{(OpenGL)}
$$
$$
0 \leq z_{clip} \leq w_{clip} \quad \text{(DirectX)}
$$

```javascript
function isInsideClipSpace(x, y, z, w) {
  return Math.abs(x) <= w &&
         Math.abs(y) <= w &&
         z >= -w && z <= w;  // OpenGL 约定
}
```

## 归一化设备坐标 (NDC)

### 透视除法

通过将 $x$、$y$、$z$ 除以 $w$，得到 NDC：

$$
\begin{aligned}
x_{ndc} &= \frac{x_{clip}}{w_{clip}} \\
y_{ndc} &= \frac{y_{clip}}{w_{clip}} \\
z_{ndc} &= \frac{z_{clip}}{w_{clip}}
\end{aligned}
$$

```javascript
function clipToNDC(clipCoords) {
  const w = clipCoords.w;
  
  return {
    x: clipCoords.x / w,
    y: clipCoords.y / w,
    z: clipCoords.z / w
  };
}
```

### NDC 范围

| API | X 范围 | Y 范围 | Z 范围 |
|-----|--------|--------|--------|
| OpenGL | [-1, 1] | [-1, 1] | [-1, 1] |
| DirectX | [-1, 1] | [-1, 1] | [0, 1] |
| Vulkan | [-1, 1] | [-1, 1] | [0, 1] |

### 左手系 vs 右手系

```
OpenGL (右手系)           DirectX (左手系)
    Y↑                        Y↑
    |  Z (向外)                |  Z (向里)
    | /                        | /
    |/___→X                   |/___→X
```

## 完整变换流程

```javascript
// 1. 模型变换：局部空间 → 世界空间
const worldPos = multiply(modelMatrix, localPos);

// 2. 视图变换：世界空间 → 观察空间
const viewPos = multiply(viewMatrix, worldPos);

// 3. 投影变换：观察空间 → 裁剪空间
const clipPos = multiply(projectionMatrix, viewPos);

// 4. 透视除法：裁剪空间 → NDC
const ndcPos = {
  x: clipPos.x / clipPos.w,
  y: clipPos.y / clipPos.w,
  z: clipPos.z / clipPos.w
};
```

## 可视化

```
观察空间 (View Space)
        视锥体
       /      \
      /   👁️   \
     /  相机    \
    /____________\
   近平面      远平面

        ↓ 投影变换

裁剪空间 (Clip Space)
   齐次坐标 (x,y,z,w)
   裁剪测试在这里进行

        ↓ 透视除法

NDC (归一化设备坐标)
    +Y
    ↑
    |  [-1,1]×[-1,1]×[-1,1]
    |    正方体
    |
----+----→ +X
    |
    ↓
```

## 裁剪算法

在裁剪空间中进行的经典算法：

### Cohen-Sutherland (2D)

```javascript
// 区域编码
const INSIDE = 0;  // 0000
const LEFT   = 1;  // 0001
const RIGHT  = 2;  // 0010
const BOTTOM = 4;  // 0100
const TOP    = 8;  // 1000

function computeOutCode(x, y, w) {
  let code = INSIDE;
  
  if (x < -w) code |= LEFT;
  else if (x > w) code |= RIGHT;
  
  if (y < -w) code |= BOTTOM;
  else if (y > w) code |= TOP;
  
  return code;
}
```

### Sutherland-Hodgman (多边形裁剪)

```javascript
function clipPolygonToPlane(polygon, plane) {
  const output = [];
  
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    
    const currentInside = isInsidePlane(current, plane);
    const nextInside = isInsidePlane(next, plane);
    
    if (currentInside) {
      output.push(current);
    }
    
    if (currentInside !== nextInside) {
      // 边与平面相交，计算交点
      output.push(intersectPlane(current, next, plane));
    }
  }
  
  return output;
}
```

## 深度值的非线性

透视投影后，$z_{ndc}$ 与 $z_{view}$ 不是线性关系：

$$
z_{ndc} = \frac{f + n}{f - n} + \frac{2fn}{(f-n) \cdot z_{view}}
$$

```javascript
// 从 NDC 深度还原观察空间深度
function ndcDepthToViewDepth(zNdc, near, far) {
  // OpenGL 约定
  return (2 * near * far) / (far + near - zNdc * (far - near));
}

// 从观察空间深度计算 NDC 深度
function viewDepthToNdcDepth(zView, near, far) {
  return (far + near) / (far - near) + (2 * far * near) / ((far - near) * zView);
}
```

这种非线性导致近处深度精度高、远处精度低，可能产生 Z-fighting。

## 小结

1. **裁剪空间**：投影矩阵输出，使用齐次坐标
2. **透视除法**：除以 $w$ 分量，产生透视效果
3. **NDC**：归一化的 $[-1,1]^3$ 立方体（或 DirectX 的 $[-1,1]^2 \times [0,1]$）
4. **裁剪测试**：在裁剪空间中进行，利用 $w$ 分量

下一章我们将探讨 NDC 到屏幕空间的变换。
