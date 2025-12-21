# 齐次坐标系统

为什么 3D 图形学使用 4×4 矩阵而不是 3×3？答案是：**为了支持平移变换**。

但这引出了一个问题：3D 空间只有 x、y、z 三个维度，第四个维度 w 是什么？

这就是**齐次坐标系统**。

## 从一个问题开始

尝试用 3×3 矩阵表示"将点 (1, 2, 3) 平移到 (4, 5, 6)"：

$$
\begin{bmatrix}
? & ? & ? \\
? & ? & ? \\
? & ? & ?
\end{bmatrix} \begin{bmatrix} 1 \\ 2 \\ 3 \end{bmatrix} = \begin{bmatrix} 4 \\ 5 \\ 6 \end{bmatrix}
$$

问题：**无论矩阵元素是什么，都无法实现**！

因为矩阵乘法是线性运算，而平移是**仿射变换**（非线性）。

## 齐次坐标的引入

解决方案：**增加一个维度**。

将 3D 坐标 $(x, y, z)$ 扩展为 4D：$(x, y, z, w)$

- **点**：$(x, y, z, 1)$，w = 1
- **方向向量**：$(x, y, z, 0)$，w = 0

这就是**齐次坐标**（Homogeneous Coordinates）。

## 齐次坐标的意义

### 点 vs 方向向量

在齐次坐标系统中，w 的值区分了两种概念：

- **w = 1**：表示**位置**（点）
- **w = 0**：表示**方向**（向量）

为什么要区分？因为它们对平移的响应不同：

- 点 $(1, 2, 3, 1)$ 平移 (5, 0, 0) → $(6, 2, 3, 1)$（位置改变）
- 方向 $(1, 0, 0, 0)$ 平移 (5, 0, 0) → $(1, 0, 0, 0)$（方向不变）

这个区分在矩阵变换中自动实现！

### w ≠ 1 的情况

齐次坐标 $(x, y, z, w)$ 可以通过**齐次除法**转换回 3D 坐标：

$$
(x', y', z') = \left(\frac{x}{w}, \frac{y}{w}, \frac{z}{w}\right)
$$

例如：
- $(4, 6, 8, 2)$ → $(2, 3, 4)$
- $(10, 20, 30, 5)$ → $(2, 4, 6)$

这意味着：$(4, 6, 8, 2)$ 和 $(2, 3, 4, 1)$ 表示同一个点。

### 为什么叫"齐次"？

"齐次"（Homogeneous）意为"相同种类"。在齐次坐标中，所有按比例缩放的坐标都表示同一个点：

$$
(x, y, z, w) \equiv (kx, ky, kz, kw), \quad k \neq 0
$$

## 平移矩阵的实现

有了齐次坐标，平移矩阵就可以实现了：

$$
\mathbf{T} = \begin{bmatrix}
1 & 0 & 0 & t_x \\
0 & 1 & 0 & t_y \\
0 & 0 & 1 & t_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

验证（平移点）：

$$
\begin{bmatrix}
1 & 0 & 0 & 5 \\
0 & 1 & 0 & 3 \\
0 & 0 & 1 & 1 \\
0 & 0 & 0 & 1
\end{bmatrix} \begin{bmatrix} 1 \\ 2 \\ 3 \\ 1 \end{bmatrix} = \begin{bmatrix} 1+5 \\ 2+3 \\ 3+1 \\ 1 \end{bmatrix} = \begin{bmatrix} 6 \\ 5 \\ 4 \\ 1 \end{bmatrix}
$$

验证（平移方向向量）：

$$
\begin{bmatrix}
1 & 0 & 0 & 5 \\
0 & 1 & 0 & 3 \\
0 & 0 & 1 & 1 \\
0 & 0 & 0 & 1
\end{bmatrix} \begin{bmatrix} 1 \\ 0 \\ 0 \\ 0 \end{bmatrix} = \begin{bmatrix} 1 \\ 0 \\ 0 \\ 0 \end{bmatrix}
$$

方向向量不受平移影响！

## 代码中的齐次坐标

### Vector3 的扩展

在代码中，我们通常使用 `Vector3` 表示 3D 坐标，但在矩阵变换时自动添加 w：

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  multiplyVector(v, w = 1) {
    const e = this.elements;
    const x = v.x, y = v.y, z = v.z;
    
    const outX = e[0] * x + e[4] * y + e[8]  * z + e[12] * w;
    const outY = e[1] * x + e[5] * y + e[9]  * z + e[13] * w;
    const outZ = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    const outW = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    
    // 齐次除法（如果 w ≠ 1）
    if (outW !== 1 && outW !== 0) {
      return new Vector3(outX / outW, outY / outW, outZ / outW);
    }
    
    return new Vector3(outX, outY, outZ);
  }
  
  // 专门用于点的变换（w=1）
  transformPoint(point) {
    return this.multiplyVector(point, 1);
  }
  
  // 专门用于方向的变换（w=0）
  transformDirection(direction) {
    return this.multiplyVector(direction, 0);
  }
}
```

使用示例：

```javascript
const matrix = new Matrix4();
// ... 设置为平移矩阵 ...

const point = new Vector3(1, 2, 3);
const direction = new Vector3(1, 0, 0);

const transformedPoint = matrix.transformPoint(point);
console.log(transformedPoint.toString()); // 平移后的点

const transformedDir = matrix.transformDirection(direction);
console.log(transformedDir.toString()); // 方向不变
```

## 投影变换中的 w

齐次坐标的另一个重要应用是**透视投影**。

在透视投影中，w 不再是 1，而是与深度相关的值。齐次除法后，远处的物体会缩小，产生透视效果。

这将在"投影变换"章节详细讲解。

## 小结

齐次坐标系统是 3D 图形学的基石：

- **定义**：在 3D 坐标后添加第四维 w，$(x, y, z) \rightarrow (x, y, z, w)$
- **点**：w = 1，$(x, y, z, 1)$
- **方向向量**：w = 0，$(x, y, z, 0)$
- **齐次除法**：$(x, y, z, w) \rightarrow (x/w, y/w, z/w)$
- **作用**：
  - 统一表示平移和线性变换
  - 区分点和方向向量
  - 实现透视投影

有了齐次坐标，下一章将实现具体的平移变换矩阵。

---

**练习**：

1. 将点 $(2, 3, 4)$ 转换为齐次坐标
2. 将齐次坐标 $(6, 9, 12, 3)$ 转换回 3D 坐标
3. 验证平移矩阵对方向向量 $(1, 0, 0, 0)$ 不起作用
4. 思考：为什么方向向量对平移"免疫"在物理上是合理的？
