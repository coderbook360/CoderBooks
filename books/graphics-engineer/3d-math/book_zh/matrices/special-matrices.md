# 特殊矩阵：单位矩阵与逆矩阵

在矩阵运算中，有两种特殊的矩阵非常重要：**单位矩阵**和**逆矩阵**。

## 单位矩阵（Identity Matrix）

单位矩阵记作 $\mathbf{I}$，它的主对角线元素都是 1，其余元素都是 0：

$$
\mathbf{I} = \begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & 1 & 0 & 0 \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 性质

单位矩阵在矩阵乘法中的作用类似数字中的 1：

$$
\mathbf{I} \times \mathbf{M} = \mathbf{M} \times \mathbf{I} = \mathbf{M}
$$

$$
\mathbf{I} \times \mathbf{v} = \mathbf{v}
$$

**几何意义**：单位矩阵表示"什么都不做"的变换。

### 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  makeIdentity() {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8]  = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9]  = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }
  
  // 判断是否为单位矩阵
  isIdentity() {
    const e = this.elements;
    return (
      e[0] === 1 && e[5] === 1 && e[10] === 1 && e[15] === 1 &&
      e[1] === 0 && e[2] === 0 && e[3] === 0 &&
      e[4] === 0 && e[6] === 0 && e[7] === 0 &&
      e[8] === 0 && e[9] === 0 && e[11] === 0 &&
      e[12] === 0 && e[13] === 0 && e[14] === 0
    );
  }
}
```

## 逆矩阵（Inverse Matrix）

逆矩阵记作 $\mathbf{M}^{-1}$，它满足：

$$
\mathbf{M} \times \mathbf{M}^{-1} = \mathbf{M}^{-1} \times \mathbf{M} = \mathbf{I}
$$

**几何意义**：逆矩阵表示"撤销"原变换的矩阵。

例如：
- 如果 $\mathbf{R}$ 是旋转 45° 的矩阵，那么 $\mathbf{R}^{-1}$ 是旋转 -45° 的矩阵
- 如果 $\mathbf{S}$ 是放大 2 倍的矩阵，那么 $\mathbf{S}^{-1}$ 是缩小到 0.5 倍的矩阵
- 如果 $\mathbf{T}$ 是平移 (5, 0, 0) 的矩阵，那么 $\mathbf{T}^{-1}$ 是平移 (-5, 0, 0) 的矩阵

### 应用场景

1. **撤销变换**：将变换后的物体还原到原位置
2. **求解方程**：如果 $\mathbf{M} \times \mathbf{v} = \mathbf{b}$，那么 $\mathbf{v} = \mathbf{M}^{-1} \times \mathbf{b}$
3. **相机变换**：视图矩阵是模型矩阵的逆
4. **法线变换**：需要用转置逆矩阵（后续章节讲解）

### 不是所有矩阵都有逆

只有**可逆矩阵**（也叫**非奇异矩阵**）才有逆矩阵。

判断条件：**行列式不为 0**。

例如，零矩阵（所有元素都是 0）没有逆矩阵。

### 代码实现

4×4 矩阵的逆矩阵计算较复杂，这里给出基于伴随矩阵和行列式的实现：

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  invert() {
    const e = this.elements;
    const result = new Matrix4();
    const r = result.elements;
    
    // 计算行列式
    const det = this.determinant();
    
    if (Math.abs(det) < 0.0001) {
      console.warn('Matrix is not invertible');
      return result.makeIdentity();
    }
    
    // 计算伴随矩阵的元素（简化版）
    // 这里省略完整的16个余子式计算...
    // 实际项目中可以使用Three.js的实现
    
    // 伴随矩阵的转置除以行列式
    const invDet = 1 / det;
    // ... 16个元素的计算 ...
    
    return result;
  }
  
  determinant() {
    const e = this.elements;
    // 4×4行列式计算（基于第一行的展开）
    // 这里省略完整实现，实际项目中使用库函数
    // ...
    return det;
  }
}
```

**实际项目建议**：使用成熟库（如 Three.js）的实现，因为手写逆矩阵容易出错。

### 简单例子：缩放矩阵的逆

缩放矩阵：

$$
\mathbf{S} = \begin{bmatrix}
s_x & 0 & 0 & 0 \\
0 & s_y & 0 & 0 \\
0 & 0 & s_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

其逆矩阵：

$$
\mathbf{S}^{-1} = \begin{bmatrix}
1/s_x & 0 & 0 & 0 \\
0 & 1/s_y & 0 & 0 \\
0 & 0 & 1/s_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

验证：$\mathbf{S} \times \mathbf{S}^{-1} = \mathbf{I}$

## 其他特殊矩阵

### 零矩阵

所有元素都是 0 的矩阵：

$$
\mathbf{0} = \begin{bmatrix}
0 & 0 & 0 & 0 \\
0 & 0 & 0 & 0 \\
0 & 0 & 0 & 0 \\
0 & 0 & 0 & 0
\end{bmatrix}
$$

性质：$\mathbf{M} + \mathbf{0} = \mathbf{M}$

### 对角矩阵

只有主对角线元素非零的矩阵：

$$
\mathbf{D} = \begin{bmatrix}
d_1 & 0 & 0 & 0 \\
0 & d_2 & 0 & 0 \\
0 & 0 & d_3 & 0 \\
0 & 0 & 0 & d_4
\end{bmatrix}
$$

对角矩阵的逆矩阵很简单：主对角线元素取倒数。

## 小结

特殊矩阵在图形学中扮演重要角色：

- **单位矩阵**：表示"无变换"，类似数字 1
- **逆矩阵**：撤销原变换，满足 $\mathbf{M} \times \mathbf{M}^{-1} = \mathbf{I}$
- **应用**：撤销变换、求解方程、相机变换

下一章将学习转置矩阵及其在法线变换中的应用。

---

**练习**：

1. 验证单位矩阵乘以任意矩阵等于原矩阵
2. 计算缩放矩阵 `scale(2, 3, 4)` 的逆矩阵
3. 思考：为什么零矩阵没有逆矩阵？
