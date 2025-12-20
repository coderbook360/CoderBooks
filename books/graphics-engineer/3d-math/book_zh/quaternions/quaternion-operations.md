# 四元数运算

四元数的乘法、共轭、逆等运算是旋转组合和变换的基础。

## 四元数乘法

两个四元数相乘：

$$
\mathbf{q}_1 \times \mathbf{q}_2 = [w_1, \mathbf{v}_1] \times [w_2, \mathbf{v}_2]
$$

展开公式：

$$
\mathbf{q}_1 \times \mathbf{q}_2 = [w_1 w_2 - \mathbf{v}_1 \cdot \mathbf{v}_2, \quad w_1 \mathbf{v}_2 + w_2 \mathbf{v}_1 + \mathbf{v}_1 \times \mathbf{v}_2]
$$

分量形式：

$$
\begin{align}
w &= w_1 w_2 - x_1 x_2 - y_1 y_2 - z_1 z_2 \\
x &= w_1 x_2 + x_1 w_2 + y_1 z_2 - z_1 y_2 \\
y &= w_1 y_2 - x_1 z_2 + y_1 w_2 + z_1 x_2 \\
z &= w_1 z_2 + x_1 y_2 - y_1 x_2 + z_1 w_2
\end{align}
$$

## 代码实现

```javascript
class Quaternion {
  multiply(other) {
    const w = this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z;
    const x = this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y;
    const y = this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x;
    const z = this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w;
    return new Quaternion(w, x, y, z);
  }
}

// 示例：绕Y轴旋转90度，再绕X轴旋转90度
const qY = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const qX = Quaternion.fromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const qCombined = qY.multiply(qX);  // 注意顺序！
```

**重要**：四元数乘法**不满足交换律**！

$$
\mathbf{q}_1 \times \mathbf{q}_2 \neq \mathbf{q}_2 \times \mathbf{q}_1
$$

顺序很重要：$\mathbf{q}_2 \times \mathbf{q}_1$ 表示先应用 $\mathbf{q}_1$ 后应用 $\mathbf{q}_2$。

## 共轭（Conjugate）

四元数的共轭：虚部取反

$$
\mathbf{q}^* = [w, -\mathbf{v}] = [w, -x, -y, -z]
$$

```javascript
conjugate() {
  return new Quaternion(this.w, -this.x, -this.y, -this.z);
}
```

**性质**：

$$
\mathbf{q} \times \mathbf{q}^* = [w^2 + x^2 + y^2 + z^2, (0, 0, 0)]
$$

对于单位四元数：

$$
\mathbf{q} \times \mathbf{q}^* = [1, (0, 0, 0)]
$$

## 逆（Inverse）

四元数的逆：

$$
\mathbf{q}^{-1} = \frac{\mathbf{q}^*}{|\mathbf{q}|^2}
$$

对于单位四元数（$|\mathbf{q}| = 1$）：

$$
\mathbf{q}^{-1} = \mathbf{q}^*
$$

```javascript
invert() {
  const lenSq = this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
  if (lenSq === 0) return new Quaternion();
  
  const invLenSq = 1 / lenSq;
  return new Quaternion(
    this.w * invLenSq,
    -this.x * invLenSq,
    -this.y * invLenSq,
    -this.z * invLenSq
  );
}
```

**应用**：逆四元数表示**反向旋转**。

## 点积（Dot Product）

$$
\mathbf{q}_1 \cdot \mathbf{q}_2 = w_1 w_2 + x_1 x_2 + y_1 y_2 + z_1 z_2
$$

```javascript
dot(other) {
  return this.w * other.w + this.x * other.x + this.y * other.y + this.z * other.z;
}
```

**用途**：计算两个旋转之间的"角度差"。

$$
\cos(\theta) = \mathbf{q}_1 \cdot \mathbf{q}_2
$$

## 旋转组合

连续旋转：先旋转 $\mathbf{q}_1$，再旋转 $\mathbf{q}_2$

$$
\mathbf{q}_{total} = \mathbf{q}_2 \times \mathbf{q}_1
$$

**注意顺序**：右侧先应用！

```javascript
function combineRotations(q1, q2) {
  return q2.multiply(q1);  // 先q1后q2
}

// 示例：先绕Y轴转90度，再绕X轴转45度
const qY = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const qX = Quaternion.fromAxisAngle(new Vector3(1, 0, 0), Math.PI / 4);
const qFinal = qX.multiply(qY);
```

## 标量乘法

$$
s \cdot \mathbf{q} = [s \cdot w, s \cdot x, s \cdot y, s \cdot z]
$$

```javascript
multiplyScalar(s) {
  return new Quaternion(this.w * s, this.x * s, this.y * s, this.z * s);
}
```

**注意**：标量乘法后不再是单位四元数，需要重新归一化。

## 加法

$$
\mathbf{q}_1 + \mathbf{q}_2 = [w_1 + w_2, x_1 + x_2, y_1 + y_2, z_1 + z_2]
$$

```javascript
add(other) {
  return new Quaternion(
    this.w + other.w,
    this.x + other.x,
    this.y + other.y,
    this.z + other.z
  );
}
```

**用途**：主要用于插值算法（如Slerp）。

## 小结

- **乘法**：组合旋转，不满足交换律
- **共轭**：虚部取反，单位四元数的共轭等于逆
- **逆**：反向旋转
- **点积**：测量旋转相似度
- **顺序**：$\mathbf{q}_2 \times \mathbf{q}_1$ 表示先应用 $\mathbf{q}_1$
