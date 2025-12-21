# 转置矩阵与矩阵属性

转置是矩阵的另一个重要运算，在法线变换和正交矩阵中有重要应用。

## 转置矩阵（Transpose）

矩阵的**转置**是将行和列互换：

$$
(\mathbf{M}^T)_{ij} = \mathbf{M}_{ji}
$$

记作 $\mathbf{M}^T$（读作"M 的转置"）。

例如：

$$
\mathbf{M} = \begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6
\end{bmatrix} \Rightarrow \mathbf{M}^T = \begin{bmatrix}
1 & 4 \\
2 & 5 \\
3 & 6
\end{bmatrix}
$$

第一行变成第一列，第二行变成第二列。

对于4×4矩阵：

$$
\mathbf{M} = \begin{bmatrix}
m_{11} & m_{12} & m_{13} & m_{14} \\
m_{21} & m_{22} & m_{23} & m_{24} \\
m_{31} & m_{32} & m_{33} & m_{34} \\
m_{41} & m_{42} & m_{43} & m_{44}
\end{bmatrix}
$$

$$
\mathbf{M}^T = \begin{bmatrix}
m_{11} & m_{21} & m_{31} & m_{41} \\
m_{12} & m_{22} & m_{32} & m_{42} \\
m_{13} & m_{23} & m_{33} & m_{43} \\
m_{14} & m_{24} & m_{34} & m_{44}
\end{bmatrix}
$$

### 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  transpose() {
    const result = new Matrix4();
    const e = this.elements;
    const r = result.elements;
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[row * 4 + col] = e[col * 4 + row];
      }
    }
    
    return result;
  }
}
```

使用示例：

```javascript
const m = new Matrix4();
m.set(0, 1, 5); // 第0行第1列设为5

const mt = m.transpose();
console.log(mt.get(1, 0)); // 5 - 变成第1行第0列
```

## 转置的性质

### 性质 1：两次转置还原

$$
(\mathbf{M}^T)^T = \mathbf{M}
$$

转置两次回到原矩阵。

### 性质 2：乘积的转置

$$
(\mathbf{A} \times \mathbf{B})^T = \mathbf{B}^T \times \mathbf{A}^T
$$

注意顺序反转！

### 性质 3：逆矩阵的转置

$$
(\mathbf{M}^{-1})^T = (\mathbf{M}^T)^{-1}
$$

## 对称矩阵

如果 $\mathbf{M}^T = \mathbf{M}$，则称为**对称矩阵**。

例如：

$$
\begin{bmatrix}
1 & 2 & 3 \\
2 & 4 & 5 \\
3 & 5 & 6
\end{bmatrix}
$$

对称矩阵关于主对角线对称。

## 正交矩阵（Orthogonal Matrix）

**正交矩阵**是一种特殊的矩阵，满足：

$$
\mathbf{M}^T \times \mathbf{M} = \mathbf{M} \times \mathbf{M}^T = \mathbf{I}
$$

也就是说：**转置等于逆矩阵**。

$$
\mathbf{M}^T = \mathbf{M}^{-1}
$$

### 几何意义

正交矩阵表示**旋转和镜像**变换，不包含缩放。

正交矩阵的性质：
- **保持长度**：$\|\mathbf{M} \times \mathbf{v}\| = \|\mathbf{v}\|$
- **保持角度**：变换后的向量夹角不变
- **列向量互相垂直**：且都是单位向量

### 为什么重要？

正交矩阵的逆矩阵非常容易计算：**只需转置**！

这在图形学中很有用，因为旋转矩阵都是正交矩阵。

### 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  isOrthogonal() {
    const mt = this.transpose();
    const product = this.multiply(mt);
    return product.isIdentity();
  }
}
```

## 应用：法线变换

法线（Normal）是垂直于表面的向量，在光照计算中至关重要。

问题：当我们用矩阵 $\mathbf{M}$ 变换一个物体时，如何变换法线？

**错误做法**：直接用 $\mathbf{M}$ 变换法线。

**正确做法**：使用 $(\mathbf{M}^{-1})^T$（逆矩阵的转置）。

### 为什么？

假设表面上有切向量 $\mathbf{t}$ 和法向量 $\mathbf{n}$，它们垂直：

$$
\mathbf{t} \cdot \mathbf{n} = 0
$$

变换后的切向量：$\mathbf{t}' = \mathbf{M} \times \mathbf{t}$

如果变换后的法向量是 $\mathbf{n}' = \mathbf{G} \times \mathbf{n}$，要保持垂直：

$$
\mathbf{t}' \cdot \mathbf{n}' = (\mathbf{M} \times \mathbf{t}) \cdot (\mathbf{G} \times \mathbf{n}) = 0
$$

通过数学推导（这里省略细节），可以证明：

$$
\mathbf{G} = (\mathbf{M}^{-1})^T
$$

### 特殊情况：正交矩阵

如果 $\mathbf{M}$ 是正交矩阵（如纯旋转），那么：

$$
(\mathbf{M}^{-1})^T = (\mathbf{M}^T)^T = \mathbf{M}
$$

也就是说，**纯旋转变换的法线可以直接用原矩阵变换**。

但如果包含缩放，就必须用逆转置矩阵。

### 代码实现

```javascript
function transformNormal(normal, modelMatrix) {
  // 计算逆转置矩阵
  const invTranspose = modelMatrix.invert().transpose();
  
  // 变换法向量
  return invTranspose.multiplyVector(normal).normalize();
}

// 使用示例
const normal = new Vector3(0, 1, 0);
const modelMatrix = new Matrix4();
// ... 设置变换矩阵 ...

const transformedNormal = transformNormal(normal, modelMatrix);
```

## 小结

转置矩阵及相关属性：

- **转置**：行列互换，$(\mathbf{M}^T)_{ij} = \mathbf{M}_{ji}$
- **性质**：$(\mathbf{A} \times \mathbf{B})^T = \mathbf{B}^T \times \mathbf{A}^T$（顺序反转）
- **对称矩阵**：$\mathbf{M}^T = \mathbf{M}$
- **正交矩阵**：$\mathbf{M}^T = \mathbf{M}^{-1}$，表示旋转和镜像
- **法线变换**：使用 $(\mathbf{M}^{-1})^T$，而不是 $\mathbf{M}$

至此，我们完成了矩阵的基础运算。下一章将学习如何用矩阵实现具体的变换：平移、旋转、缩放。

---

**练习**：

1. 手动计算一个3×3矩阵的转置
2. 验证 $(\mathbf{A} \times \mathbf{B})^T = \mathbf{B}^T \times \mathbf{A}^T$
3. 思考：为什么法线变换需要用逆转置矩阵？
4. 实现 `isOrthogonal()` 方法并测试
