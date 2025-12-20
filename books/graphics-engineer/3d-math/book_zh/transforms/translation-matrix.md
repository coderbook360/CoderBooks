# 平移变换矩阵

平移（Translation）是最简单的变换：将物体从一个位置移动到另一个位置。

## 平移矩阵的形式

平移向量 $(t_x, t_y, t_z)$ 的矩阵表示：

$$
\mathbf{T}(t_x, t_y, t_z) = \begin{bmatrix}
1 & 0 & 0 & t_x \\
0 & 1 & 0 & t_y \\
0 & 0 & 1 & t_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

特点：
- 左上角 3×3 是单位矩阵
- 第四列是平移向量
- 最后一行是 $(0, 0, 0, 1)$

## 代码实现

```javascript
class Matrix4 {
  // ... 前面的代码 ...
  
  makeTranslation(x, y, z) {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ];
    return this;
  }
  
  translate(x, y, z) {
    const t = new Matrix4().makeTranslation(x, y, z);
    return this.multiply(t);
  }
}
```

使用示例：

```javascript
const point = new Vector3(1, 2, 3);

const matrix = new Matrix4().makeTranslation(5, 0, 2);
const result = matrix.transformPoint(point);
console.log(result.toString()); // Vector3(6, 2, 5)
```

## 平移的组合

两次平移可以合并为一次：

$$
\mathbf{T}(t_1) \times \mathbf{T}(t_2) = \mathbf{T}(t_1 + t_2)
$$

```javascript
const m1 = new Matrix4().makeTranslation(1, 0, 0);
const m2 = new Matrix4().makeTranslation(2, 3, 0);
const combined = m1.multiply(m2);
// 等价于平移 (3, 3, 0)
```

## 逆平移

平移的逆变换是反向平移：

$$
\mathbf{T}^{-1}(t_x, t_y, t_z) = \mathbf{T}(-t_x, -t_y, -t_z)
$$

```javascript
const forward = new Matrix4().makeTranslation(5, 3, 1);
const backward = new Matrix4().makeTranslation(-5, -3, -1);

const identity = forward.multiply(backward);
// 结果是单位矩阵
```

## 小结

- 平移矩阵：第四列存储平移向量
- 不影响方向向量（w=0）
- 逆平移：取相反数

下一章：旋转变换矩阵。
