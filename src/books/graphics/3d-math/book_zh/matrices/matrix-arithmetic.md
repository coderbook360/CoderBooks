# 矩阵的加减与数乘

与向量类似，矩阵也支持加法、减法和数乘运算。这些运算在图形学中用于组合变换、插值动画等场景。

## 矩阵加法

两个相同大小的矩阵可以相加：**对应元素相加**。

$$
\mathbf{A} + \mathbf{B} = \begin{bmatrix}
a_{11} + b_{11} & a_{12} + b_{12} \\
a_{21} + b_{21} & a_{22} + b_{22}
\end{bmatrix}
$$

例如：

$$
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} + \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 6 & 8 \\ 10 & 12 \end{bmatrix}
$$

### 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  add(m) {
    const result = new Matrix4();
    for (let i = 0; i < 16; i++) {
      result.elements[i] = this.elements[i] + m.elements[i];
    }
    return result;
  }
}
```

使用示例：

```javascript
const m1 = new Matrix4();
const m2 = new Matrix4();
m2.set(0, 3, 5); // 设置一个元素

const m3 = m1.add(m2);
console.log(m3.get(0, 3)); // 5
```

## 矩阵减法

矩阵减法同样是对应元素相减：

$$
\mathbf{A} - \mathbf{B} = \begin{bmatrix}
a_{11} - b_{11} & a_{12} - b_{12} \\
a_{21} - b_{21} & a_{22} - b_{22}
\end{bmatrix}
$$

### 代码实现

```javascript
sub(m) {
  const result = new Matrix4();
  for (let i = 0; i < 16; i++) {
    result.elements[i] = this.elements[i] - m.elements[i];
  }
  return result;
}
```

## 矩阵数乘

矩阵数乘（标量乘法）是用一个数字乘以矩阵的每个元素：

$$
k \cdot \mathbf{A} = \begin{bmatrix}
k \cdot a_{11} & k \cdot a_{12} \\
k \cdot a_{21} & k \cdot a_{22}
\end{bmatrix}
$$

例如：

$$
2 \cdot \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} = \begin{bmatrix} 2 & 4 \\ 6 & 8 \end{bmatrix}
$$

### 代码实现

```javascript
multiplyScalar(k) {
  const result = new Matrix4();
  for (let i = 0; i < 16; i++) {
    result.elements[i] = this.elements[i] * k;
  }
  return result;
}
```

使用示例：

```javascript
const m = new Matrix4();
m.set(1, 1, 2);

const scaled = m.multiplyScalar(3);
console.log(scaled.get(1, 1)); // 6
```

## 应用：矩阵插值

矩阵加减和数乘的一个重要应用是**线性插值**（Lerp），用于平滑动画。

从矩阵 $\mathbf{A}$ 到 $\mathbf{B}$ 的插值：

$$
\mathbf{M}(t) = (1 - t) \cdot \mathbf{A} + t \cdot \mathbf{B}
$$

其中 $t \in [0, 1]$：
- $t = 0$：结果是 $\mathbf{A}$
- $t = 0.5$：结果是中间值
- $t = 1$：结果是 $\mathbf{B}$

### 代码实现

```javascript
function lerpMatrix(m1, m2, t) {
  // (1-t) * m1 + t * m2
  return m1.multiplyScalar(1 - t).add(m2.multiplyScalar(t));
}

// 使用示例：从单位矩阵插值到缩放矩阵
const identity = new Matrix4();
const scaled = new Matrix4();
scaled.set(0, 0, 2);
scaled.set(1, 1, 2);
scaled.set(2, 2, 2);

const halfway = lerpMatrix(identity, scaled, 0.5);
console.log(halfway.get(0, 0)); // 1.5 (介于1和2之间)
```

## 小结

矩阵的加减和数乘运算简单直观：
- **加法/减法**：对应元素相加/减
- **数乘**：每个元素乘以标量
- **应用**：矩阵插值用于动画过渡

下一章将学习矩阵最重要的运算——**矩阵乘法**。

---

**练习**：

1. 计算两个单位矩阵的和
2. 将单位矩阵的所有元素乘以 0.5
3. 实现一个 `lerp` 方法，集成到 Matrix4 类中
