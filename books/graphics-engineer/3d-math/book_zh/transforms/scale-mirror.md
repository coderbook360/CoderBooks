# 缩放与镜像变换

缩放（Scale）和镜像（Mirror）都是对物体大小和方向的变换。

## 缩放矩阵

沿三个轴独立缩放 $(s_x, s_y, s_z)$：

$$
\mathbf{S}(s_x, s_y, s_z) = \begin{bmatrix}
s_x & 0 & 0 & 0 \\
0 & s_y & 0 & 0 \\
0 & 0 & s_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

特殊情况：
- **均匀缩放**：$s_x = s_y = s_z = s$
- **拉伸**：某个轴 > 1
- **压缩**：某个轴 < 1

## 代码实现

```javascript
class Matrix4 {
  makeScale(x, y, z) {
    this.elements = [
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ];
    return this;
  }
  
  scale(x, y, z) {
    const s = new Matrix4().makeScale(x, y, z);
    return this.multiply(s);
  }
}
```

使用示例：

```javascript
const point = new Vector3(1, 2, 3);
const matrix = new Matrix4().makeScale(2, 0.5, 1);
const result = matrix.transformPoint(point);
console.log(result.toString()); // Vector3(2, 1, 3)
```

## 镜像变换

镜像是特殊的缩放（某个轴为-1）：

- 沿 X 轴镜像：$\mathbf{M}_x = \mathbf{S}(-1, 1, 1)$
- 沿 Y 轴镜像：$\mathbf{M}_y = \mathbf{S}(1, -1, 1)$
- 沿 Z 轴镜像：$\mathbf{M}_z = \mathbf{S}(1, 1, -1)$

```javascript
const mirrorX = new Matrix4().makeScale(-1, 1, 1);
```

## 缩放的逆变换

$$
\mathbf{S}^{-1}(s_x, s_y, s_z) = \mathbf{S}\left(\frac{1}{s_x}, \frac{1}{s_y}, \frac{1}{s_z}\right)
$$

注意：$s_i \neq 0$

## 非均匀缩放与法线

非均匀缩放会扭曲法线，必须用逆转置矩阵变换法线（见第17章）。

## 小结

- 缩放矩阵：对角矩阵
- 镜像：某个轴为负
- 逆变换：取倒数
- 注意：非均匀缩放影响法线
