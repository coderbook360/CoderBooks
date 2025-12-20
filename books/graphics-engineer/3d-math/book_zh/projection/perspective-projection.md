# 透视投影原理

透视投影（Perspective Projection）是3D图形中最重要的变换之一，它模拟人眼看世界的方式：**近大远小**。

## 为什么需要透视投影？

现实中，两条平行的铁轨会在远处"交汇"。这不是因为它们真的相交，而是透视效应。

透视投影将3D世界压缩到2D屏幕上，保持这种真实感。

## 基本原理：相似三角形

假设：
- 相机在原点，看向 $-Z$ 方向
- 投影平面距离相机 $d$ 单位（称为焦距）
- 物体上一点 $P(x, y, z)$

根据相似三角形：

$$
\frac{x'}{d} = \frac{x}{-z}
$$

$$
x' = \frac{-d \cdot x}{z}
$$

同理：

$$
y' = \frac{-d \cdot y}{z}
$$

**关键观察**：投影坐标与 $z$ 成反比，越远越小！

## 齐次坐标表示

直接用矩阵无法表达"除以z"，所以使用齐次坐标：

$$
\mathbf{P}_{simple} = \begin{bmatrix}
d & 0 & 0 & 0 \\
0 & d & 0 & 0 \\
0 & 0 & 1 & 0 \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

变换后：

$$
\begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix}
\rightarrow
\begin{bmatrix} d \cdot x \\ d \cdot y \\ z \\ -z \end{bmatrix}
$$

透视除法（$w = -z$）：

$$
\left( \frac{d \cdot x}{-z}, \frac{d \cdot y}{-z}, \frac{z}{-z} \right) = \left( \frac{-d \cdot x}{z}, \frac{-d \cdot y}{z}, -1 \right)
$$

## 视锥体（Frustum）

实际应用中，需要限定可见范围：
- **近裁剪面**（Near Plane）：距离 $n$
- **远裁剪面**（Far Plane）：距离 $f$
- **视野角度**（FOV）：垂直方向的张角

视锥体是一个截锥体（truncated pyramid）。

## 标准透视投影矩阵

完整的透视投影矩阵（OpenGL / WebGL）：

$$
\mathbf{P} = \begin{bmatrix}
\frac{1}{\tan(\frac{fov}{2}) \cdot aspect} & 0 & 0 & 0 \\
0 & \frac{1}{\tan(\frac{fov}{2})} & 0 & 0 \\
0 & 0 & -\frac{f+n}{f-n} & -\frac{2fn}{f-n} \\
0 & 0 & -1 & 0
\end{bmatrix}
$$

其中：
- $fov$：垂直视野角度（弧度）
- $aspect$：宽高比（width / height）
- $n$：近裁剪距离
- $f$：远裁剪距离

## 代码实现

```javascript
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  
  return new Matrix4().set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, 2 * far * near * nf,
    0, 0, -1, 0
  );
}

// 使用示例
const projectionMatrix = perspective(
  Math.PI / 3,  // 60度视野
  canvas.width / canvas.height,  // 宽高比
  0.1,  // 近裁剪面
  100   // 远裁剪面
);

// 变换顶点
const vertex = new Vector3(1, 2, -5);
const clipCoords = projectionMatrix.transformPoint(vertex);

// 透视除法
const ndc = new Vector3(
  clipCoords.x / clipCoords.w,
  clipCoords.y / clipCoords.w,
  clipCoords.z / clipCoords.w
);
```

## 深度非线性

透视投影的深度值不是线性的！

原始深度 $z_{view}$ 变换后：

$$
z_{ndc} = \frac{-\frac{f+n}{f-n} \cdot z_{view} - \frac{2fn}{f-n}}{-z_{view}}
$$

简化后：

$$
z_{ndc} = \frac{f+n}{f-n} + \frac{2fn}{(f-n) \cdot z_{view}}
$$

**特点**：
- 近处深度精度高
- 远处深度精度低
- 导致"深度冲突"（Z-Fighting）

解决方法：
- 增大近裁剪面距离（如从0.1改为1）
- 使用反向Z（Reverse-Z）技术

## 小结

- **透视投影**：模拟近大远小效果
- **数学原理**：相似三角形，除以深度值
- **齐次坐标**：通过 $w$ 分量实现透视除法
- **投影矩阵**：将视锥体映射到NDC
- **深度非线性**：近处精度高，远处精度低
