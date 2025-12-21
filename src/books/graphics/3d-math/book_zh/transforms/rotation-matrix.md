# 旋转变换矩阵

旋转（Rotation）是3D图形学中最复杂也最重要的变换。

## 绕坐标轴旋转

### 绕 Z 轴旋转

绕 z 轴旋转角度 $\theta$（逆时针）：

$$
\mathbf{R}_z(\theta) = \begin{bmatrix}
\cos\theta & -\sin\theta & 0 & 0 \\
\sin\theta & \cos\theta & 0 & 0 \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 绕 X 轴旋转

$$
\mathbf{R}_x(\theta) = \begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & \cos\theta & -\sin\theta & 0 \\
0 & \sin\theta & \cos\theta & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 绕 Y 轴旋转

$$
\mathbf{R}_y(\theta) = \begin{bmatrix}
\cos\theta & 0 & \sin\theta & 0 \\
0 & 1 & 0 & 0 \\
-\sin\theta & 0 & \cos\theta & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

注意：y轴的符号不同（右手坐标系的特性）。

## 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  makeRotationX(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    this.elements = [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ];
    return this;
  }
  
  makeRotationY(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    this.elements = [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
    return this;
  }
  
  makeRotationZ(angleRad) {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    this.elements = [
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    return this;
  }
}
```

使用示例：

```javascript
const point = new Vector3(1, 0, 0);

// 绕 Z 轴旋转 90° (π/2 弧度)
const matrix = new Matrix4().makeRotationZ(Math.PI / 2);
const result = matrix.transformPoint(point);
console.log(result.toString()); // Vector3(0, 1, 0)
```

## 绕任意轴旋转

Rodrigues 旋转公式：绕单位向量 $\mathbf{k} = (k_x, k_y, k_z)$ 旋转 $\theta$：

$$
\mathbf{R}(\mathbf{k}, \theta) = \cos\theta \cdot \mathbf{I} + (1 - \cos\theta) \cdot \mathbf{k} \mathbf{k}^T + \sin\theta \cdot [\mathbf{k}]_\times
$$

代码实现（简化版）：

```javascript
makeRotationAxis(axis, angleRad) {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const t = 1 - c;
  
  const x = axis.x, y = axis.y, z = axis.z;
  const tx = t * x, ty = t * y;
  
  this.elements = [
    tx * x + c,     tx * y + s * z, tx * z - s * y, 0,
    tx * y - s * z, ty * y + c,     ty * z + s * x, 0,
    tx * z + s * y, ty * z - s * x, t * z * z + c,  0,
    0, 0, 0, 1
  ];
  
  return this;
}
```

## 旋转矩阵的性质

1. **正交矩阵**：$\mathbf{R}^T = \mathbf{R}^{-1}$
2. **保持长度**：$\|\mathbf{R} \times \mathbf{v}\| = \|\mathbf{v}\|$
3. **行列式为1**：$\det(\mathbf{R}) = 1$

## 小结

- 绕坐标轴旋转：使用三角函数构建矩阵
- 绕任意轴旋转：使用Rodrigues公式
- 旋转矩阵是正交矩阵

下一章：欧拉角与万向节死锁。
