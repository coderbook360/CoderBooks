# 正交投影原理

正交投影（Orthographic Projection）不产生透视效果，物体大小与距离无关。

## 什么是正交投影？

正交投影将3D空间的矩形区域（正交视锥体）映射到NDC立方体。

特点：
- 无透视效果（平行线保持平行）
- 物体大小不受距离影响
- 适合技术图纸、建筑设计、2D游戏

## 数学原理

定义正交视锥体的六个面：
- 左（left）、右（right）
- 下（bottom）、上（top）
- 近（near）、远（far）

目标：将 $[l, r] \times [b, t] \times [n, f]$ 映射到 $[-1, 1]^3$

## 两步变换

### 第一步：平移到原点

$$
\mathbf{T} = \begin{bmatrix}
1 & 0 & 0 & -\frac{r+l}{2} \\
0 & 1 & 0 & -\frac{t+b}{2} \\
0 & 0 & 1 & -\frac{f+n}{2} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 第二步：缩放到 $[-1, 1]$

$$
\mathbf{S} = \begin{bmatrix}
\frac{2}{r-l} & 0 & 0 & 0 \\
0 & \frac{2}{t-b} & 0 & 0 \\
0 & 0 & \frac{-2}{f-n} & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

注意：Z轴缩放为负（翻转方向）

### 组合矩阵

$$
\mathbf{P}_{ortho} = \mathbf{S} \times \mathbf{T} = \begin{bmatrix}
\frac{2}{r-l} & 0 & 0 & -\frac{r+l}{r-l} \\
0 & \frac{2}{t-b} & 0 & -\frac{t+b}{t-b} \\
0 & 0 & \frac{-2}{f-n} & -\frac{f+n}{f-n} \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

## 代码实现

```javascript
function orthographic(left, right, bottom, top, near, far) {
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  
  return new Matrix4().set(
    2 / w, 0, 0, -(right + left) / w,
    0, 2 / h, 0, -(top + bottom) / h,
    0, 0, -2 / d, -(far + near) / d,
    0, 0, 0, 1
  );
}

// 使用示例
const orthoMatrix = orthographic(
  -10, 10,  // left, right
  -10, 10,  // bottom, top
  0.1, 100  // near, far
);

const vertex = new Vector3(5, 5, -50);
const clipCoords = orthoMatrix.transformPoint(vertex);
console.log(clipCoords.toString());  // (0.5, 0.5, ..., 1)
```

## 简化形式（对称视锥体）

如果视锥体关于原点对称：

```javascript
function orthographicSymmetric(width, height, near, far) {
  return orthographic(
    -width / 2, width / 2,
    -height / 2, height / 2,
    near, far
  );
}

// 或者用半宽半高
function ortho(halfWidth, halfHeight, near, far) {
  return new Matrix4().set(
    1 / halfWidth, 0, 0, 0,
    0, 1 / halfHeight, 0, 0,
    0, 0, -2 / (far - near), -(far + near) / (far - near),
    0, 0, 0, 1
  );
}
```

## 正交投影 vs 透视投影

| 特性 | 正交投影 | 透视投影 |
|------|----------|----------|
| 透视效果 | 无 | 有（近大远小） |
| 平行线 | 保持平行 | 会聚到消失点 |
| 深度关系 | 保持线性 | 非线性 |
| $w$ 分量 | 始终为1 | 等于 $-z$ |
| 适用场景 | 工程图、2D游戏 | 3D游戏、真实感渲染 |

## 应用：2D游戏

在2D游戏中，常用正交投影：

```javascript
// 匹配画布尺寸的正交投影
function create2DProjection(width, height) {
  return orthographic(
    0, width,      // left, right（屏幕坐标）
    height, 0,     // bottom, top（Y轴翻转）
    -1, 1          // near, far（2D不关心深度）
  );
}

// 使用示例
const canvas = document.getElementById('canvas');
const projMatrix = create2DProjection(canvas.width, canvas.height);

// 屏幕坐标 (100, 200) 直接映射到NDC
const screenPos = new Vector3(100, 200, 0);
const ndc = projMatrix.transformPoint(screenPos);
```

## 小结

- **正交投影**：无透视效果，等距映射
- **数学原理**：平移 + 缩放
- **投影矩阵**：将矩形视锥体映射到NDC立方体
- **应用**：工程图、建筑设计、2D游戏
- **对比透视**：不除以深度（$w=1$）
