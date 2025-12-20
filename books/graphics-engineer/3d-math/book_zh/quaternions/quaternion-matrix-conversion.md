# 四元数与矩阵转换

四元数和旋转矩阵可以互相转换，各有应用场景。

## 四元数转旋转矩阵

给定四元数 $\mathbf{q} = [w, x, y, z]$，转换为 $3 \times 3$ 旋转矩阵：

$$
\mathbf{R} = \begin{bmatrix}
1 - 2(y^2 + z^2) & 2(xy - wz) & 2(xz + wy) \\
2(xy + wz) & 1 - 2(x^2 + z^2) & 2(yz - wx) \\
2(xz - wy) & 2(yz + wx) & 1 - 2(x^2 + y^2)
\end{bmatrix}
$$

**推导依据**：展开 $\mathbf{q} \times \mathbf{v} \times \mathbf{q}^*$ 得到的线性变换。

## 代码实现（3×3）

```javascript
class Quaternion {
  toMatrix3() {
    const x2 = this.x + this.x;
    const y2 = this.y + this.y;
    const z2 = this.z + this.z;
    
    const xx = this.x * x2;
    const xy = this.x * y2;
    const xz = this.x * z2;
    
    const yy = this.y * y2;
    const yz = this.y * z2;
    const zz = this.z * z2;
    
    const wx = this.w * x2;
    const wy = this.w * y2;
    const wz = this.w * z2;
    
    return new Matrix3().set(
      1 - (yy + zz), xy - wz, xz + wy,
      xy + wz, 1 - (xx + zz), yz - wx,
      xz - wy, yz + wx, 1 - (xx + yy)
    );
  }
}
```

## 代码实现（4×4）

包含平移的完整变换矩阵：

```javascript
class Quaternion {
  toMatrix4() {
    const x2 = this.x + this.x;
    const y2 = this.y + this.y;
    const z2 = this.z + this.z;
    
    const xx = this.x * x2, xy = this.x * y2, xz = this.x * z2;
    const yy = this.y * y2, yz = this.y * z2, zz = this.z * z2;
    const wx = this.w * x2, wy = this.w * y2, wz = this.w * z2;
    
    return new Matrix4().set(
      1 - (yy + zz), xy - wz, xz + wy, 0,
      xy + wz, 1 - (xx + zz), yz - wx, 0,
      xz - wy, yz + wx, 1 - (xx + yy), 0,
      0, 0, 0, 1
    );
  }
}

// 使用示例
const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
const matrix = q.toMatrix4();

// 用矩阵旋转向量
const v = new Vector3(1, 0, 0);
const rotated = matrix.transformDirection(v);
console.log(rotated.toString());  // Vector3(0, 0, -1)
```

## 旋转矩阵转四元数

从旋转矩阵提取四元数（Shepperd算法）：

```javascript
class Matrix4 {
  toQuaternion() {
    const m = this.elements;
    const trace = m[0] + m[5] + m[10];
    
    let w, x, y, z;
    
    if (trace > 0) {
      // 最常见情况
      const s = Math.sqrt(trace + 1) * 2;
      w = 0.25 * s;
      x = (m[6] - m[9]) / s;
      y = (m[8] - m[2]) / s;
      z = (m[1] - m[4]) / s;
    } else if (m[0] > m[5] && m[0] > m[10]) {
      // m[0] 最大
      const s = Math.sqrt(1 + m[0] - m[5] - m[10]) * 2;
      w = (m[6] - m[9]) / s;
      x = 0.25 * s;
      y = (m[1] + m[4]) / s;
      z = (m[2] + m[8]) / s;
    } else if (m[5] > m[10]) {
      // m[5] 最大
      const s = Math.sqrt(1 + m[5] - m[0] - m[10]) * 2;
      w = (m[8] - m[2]) / s;
      x = (m[1] + m[4]) / s;
      y = 0.25 * s;
      z = (m[6] + m[9]) / s;
    } else {
      // m[10] 最大
      const s = Math.sqrt(1 + m[10] - m[0] - m[5]) * 2;
      w = (m[1] - m[4]) / s;
      x = (m[2] + m[8]) / s;
      y = (m[6] + m[9]) / s;
      z = 0.25 * s;
    }
    
    return new Quaternion(w, x, y, z).normalize();
  }
}

// 使用示例
const matrix = new Matrix4().makeRotationY(Math.PI / 2);
const q = matrix.toQuaternion();
console.log(q.toString());  // Quat(0.707, 0, 0.707, 0)
```

## 从欧拉角创建四元数

先转成三个四元数，再组合：

```javascript
class Quaternion {
  static fromEuler(x, y, z, order = 'XYZ') {
    const qX = Quaternion.fromAxisAngle(new Vector3(1, 0, 0), x);
    const qY = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), y);
    const qZ = Quaternion.fromAxisAngle(new Vector3(0, 0, 1), z);
    
    switch (order) {
      case 'XYZ': return qZ.multiply(qY).multiply(qX);
      case 'ZYX': return qX.multiply(qY).multiply(qZ);
      // ... 其他顺序
      default: return qZ.multiply(qY).multiply(qX);
    }
  }
}

// 使用示例
const q = Quaternion.fromEuler(0, Math.PI / 2, 0);  // 绕Y轴旋转90度
```

## 四元数转欧拉角

```javascript
class Quaternion {
  toEuler() {
    const x2 = this.x * this.x;
    const y2 = this.y * this.y;
    const z2 = this.z * this.z;
    
    // 万向节死锁检测
    const test = this.w * this.y - this.z * this.x;
    
    if (test > 0.499) {
      // 万向节死锁：正向
      return new Vector3(
        0,
        2 * Math.atan2(this.x, this.w),
        Math.PI / 2
      );
    }
    
    if (test < -0.499) {
      // 万向节死锁：负向
      return new Vector3(
        0,
        -2 * Math.atan2(this.x, this.w),
        -Math.PI / 2
      );
    }
    
    // 正常情况
    return new Vector3(
      Math.atan2(2 * (this.w * this.x + this.y * this.z), 1 - 2 * (x2 + y2)),
      Math.atan2(2 * (this.w * this.y + this.z * this.x), 1 - 2 * (y2 + z2)),
      Math.asin(2 * test)
    );
  }
}
```

## 何时使用哪种表示？

| 场景 | 推荐表示 | 理由 |
|------|----------|------|
| 用户输入 | 欧拉角 | 直观易懂 |
| 动画插值 | 四元数 | 平滑（Slerp） |
| 物理模拟 | 四元数 | 无万向节死锁 |
| 着色器 | 矩阵 | GPU直接支持 |
| 存储 | 四元数 | 空间小（4个数字） |
| 父子变换 | 矩阵 | 组合方便 |

## 小结

- **四元数→矩阵**：使用展开公式
- **矩阵→四元数**：Shepperd算法（4种情况）
- **欧拉角→四元数**：组合三个轴旋转
- **四元数→欧拉角**：需处理万向节死锁
- **选择建议**：根据应用场景选择合适表示
