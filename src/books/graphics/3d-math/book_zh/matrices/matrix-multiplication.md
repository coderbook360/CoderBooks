# 矩阵乘法详解

矩阵乘法是矩阵运算中最重要、也是最复杂的运算。它是实现变换组合的关键。

思考一个问题：如何先旋转物体，再平移？或者先缩放，再旋转，最后平移？

答案是：**矩阵相乘**。

## 矩阵乘法的定义

矩阵乘法**不是对应元素相乘**（那是 Hadamard 积，很少用）。

对于 $\mathbf{C} = \mathbf{A} \times \mathbf{B}$，元素 $c_{ij}$ 的计算方法：

$$
c_{ij} = \sum_{k=1}^{n} a_{ik} \cdot b_{kj}
$$

用通俗的话说：**第 i 行与第 j 列的对应元素相乘再相加**。

### 简单例子：2×2 矩阵

$$
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \times \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix}
$$

计算 $c_{11}$（第1行第1列）：

$$
c_{11} = 1 \times 5 + 2 \times 7 = 5 + 14 = 19
$$

计算 $c_{12}$（第1行第2列）：

$$
c_{12} = 1 \times 6 + 2 \times 8 = 6 + 16 = 22
$$

计算 $c_{21}$（第2行第1列）：

$$
c_{21} = 3 \times 5 + 4 \times 7 = 15 + 28 = 43
$$

计算 $c_{22}$（第2行第2列）：

$$
c_{22} = 3 \times 6 + 4 \times 8 = 18 + 32 = 50
$$

结果：

$$
\begin{bmatrix} 19 & 22 \\ 43 & 50 \end{bmatrix}
$$

## 矩阵乘法的规则

### 规则1：顺序敏感

矩阵乘法**不满足交换律**：

$$
\mathbf{A} \times \mathbf{B} \neq \mathbf{B} \times \mathbf{A}
$$

这意味着：先旋转再平移 ≠ 先平移再旋转。

### 规则2：满足结合律

$$
(\mathbf{A} \times \mathbf{B}) \times \mathbf{C} = \mathbf{A} \times (\mathbf{B} \times \mathbf{C})
$$

这意味着：可以先计算任意两个矩阵的乘积。

### 规则3：尺寸限制

只有当 $\mathbf{A}$ 的列数等于 $\mathbf{B}$ 的行数时，才能计算 $\mathbf{A} \times \mathbf{B}$。

对于 4×4 矩阵乘 4×4 矩阵，结果仍是 4×4 矩阵。

## 代码实现：4×4 矩阵乘法

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  multiply(m) {
    const result = new Matrix4();
    const a = this.elements;
    const b = m.elements;
    const c = result.elements;
    
    // 逐元素计算（列主序）
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + row] * b[col * 4 + k];
        }
        c[col * 4 + row] = sum;
      }
    }
    
    return result;
  }
}
```

这个实现遵循列主序存储，与 Three.js 和 WebGL 一致。

使用示例：

```javascript
const m1 = new Matrix4();
m1.set(0, 0, 2); // 第0行第0列设为2

const m2 = new Matrix4();
m2.set(1, 1, 3); // 第1行第1列设为3

const m3 = m1.multiply(m2);
console.log(m3.get(0, 0)); // 2
console.log(m3.get(1, 1)); // 3
```

## 矩阵乘以向量

矩阵的核心作用是**对向量进行变换**：

$$
\mathbf{v}' = \mathbf{M} \times \mathbf{v}
$$

在 4×4 矩阵系统中，向量是 4×1 的列向量 $(x, y, z, w)^T$。

计算方法（第 i 个分量）：

$$
v'_i = \sum_{j=1}^{4} m_{ij} \cdot v_j
$$

### 代码实现

```javascript
// 在 Matrix4 类中添加
multiplyVector(v) {
  const e = this.elements;
  const x = v.x, y = v.y, z = v.z;
  const w = (v.w !== undefined) ? v.w : 1; // 默认 w=1 表示点
  
  return new Vector3(
    e[0] * x + e[4] * y + e[8] * z + e[12] * w,
    e[1] * x + e[5] * y + e[9] * z + e[13] * w,
    e[2] * x + e[6] * y + e[10] * z + e[14] * w
  );
}
```

使用示例：

```javascript
const matrix = new Matrix4();
// ... 设置变换矩阵 ...

const point = new Vector3(1, 2, 3);
const transformed = matrix.multiplyVector(point);
console.log(transformed.toString());
```

## 几何意义：变换组合

矩阵乘法的几何意义是**变换的组合**。

假设：
- $\mathbf{R}$ 是旋转矩阵
- $\mathbf{T}$ 是平移矩阵

要先旋转再平移一个点 $\mathbf{p}$：

$$
\mathbf{p}' = \mathbf{T} \times (\mathbf{R} \times \mathbf{p}) = (\mathbf{T} \times \mathbf{R}) \times \mathbf{p}
$$

关键点：可以先计算 $\mathbf{M} = \mathbf{T} \times \mathbf{R}$（组合矩阵），然后用 $\mathbf{M}$ 变换所有点。

这样，无论有多少点，只需计算一次矩阵乘法，而不是对每个点都执行多次变换。

### 注意顺序

由于矩阵乘法不满足交换律：

- $\mathbf{T} \times \mathbf{R}$：先旋转，再平移
- $\mathbf{R} \times \mathbf{T}$：先平移，再旋转

结果完全不同！

示例：想象一个物体在原点，先平移到 (5, 0, 0)，再绕原点旋转90°：
- 物体会旋转到 (0, 5, 0)

如果反过来，先旋转再平移：
- 物体仍在 (5, 0, 0)

## 单位矩阵的性质

单位矩阵 $\mathbf{I}$ 在矩阵乘法中的作用类似数字 1：

$$
\mathbf{I} \times \mathbf{M} = \mathbf{M} \times \mathbf{I} = \mathbf{M}
$$

$$
\mathbf{I} \times \mathbf{v} = \mathbf{v}
$$

这就是为什么 `Matrix4` 的默认构造函数创建单位矩阵。

## 小结

矩阵乘法是3D变换的核心：

- **计算方法**：行与列对应元素相乘再相加
- **不满足交换律**：$\mathbf{A} \times \mathbf{B} \neq \mathbf{B} \times \mathbf{A}$
- **满足结合律**：$(\mathbf{A} \times \mathbf{B}) \times \mathbf{C} = \mathbf{A} \times (\mathbf{B} \times \mathbf{C})$
- **几何意义**：变换的组合
- **应用**：先算出组合矩阵，然后一次性变换所有顶点

下一章将学习两种特殊的矩阵：单位矩阵和逆矩阵。

---

**练习**：

1. 手动计算两个2×2矩阵的乘积
2. 验证单位矩阵乘以任意矩阵等于原矩阵
3. 实现 `multiplyVector` 方法并测试
4. 思考：为什么先旋转再平移 ≠ 先平移再旋转？
