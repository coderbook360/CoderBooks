# 矩阵分解与重组

在 3D 图形学中，经常需要从复合变换矩阵中提取独立的变换分量，或者将独立分量组合成矩阵。

## 为什么需要矩阵分解？

1. **动画混合**：提取旋转后进行四元数插值
2. **编辑器**：显示和修改独立的位置、旋转、缩放值
3. **约束系统**：分离处理不同变换分量
4. **序列化**：存储更紧凑的变换表示

## TRS 分解

最常见的分解是提取 **T**ranslation（平移）、**R**otation（旋转）、**S**cale（缩放）。

### 标准 TRS 矩阵结构

$$
M = T \cdot R \cdot S = 
\begin{bmatrix}
s_x r_{00} & s_y r_{01} & s_z r_{02} & t_x \\
s_x r_{10} & s_y r_{11} & s_z r_{12} & t_y \\
s_x r_{20} & s_y r_{21} & s_z r_{22} & t_z \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

### 分解算法

```typescript
interface DecomposedTransform {
  translation: Vec3;
  rotation: Quat;
  scale: Vec3;
}

function decomposeMatrix(m: Mat4): DecomposedTransform | null {
  const e = m.elements;
  
  // 1. 提取平移（第四列）
  const translation = new Vec3(e[12], e[13], e[14]);
  
  // 2. 提取缩放（每列的长度）
  const sx = Math.sqrt(e[0]*e[0] + e[1]*e[1] + e[2]*e[2]);
  const sy = Math.sqrt(e[4]*e[4] + e[5]*e[5] + e[6]*e[6]);
  const sz = Math.sqrt(e[8]*e[8] + e[9]*e[9] + e[10]*e[10]);
  
  // 检测镜像（行列式为负）
  const det = determinant3x3(
    e[0], e[4], e[8],
    e[1], e[5], e[9],
    e[2], e[6], e[10]
  );
  
  // 如果有镜像，将其归入缩放的一个分量
  const scale = new Vec3(
    det < 0 ? -sx : sx,
    sy,
    sz
  );
  
  // 3. 提取旋转（归一化的3x3矩阵）
  const invSx = 1 / scale.x;
  const invSy = 1 / scale.y;
  const invSz = 1 / scale.z;
  
  const rotationMatrix = [
    e[0] * invSx, e[1] * invSx, e[2] * invSx,
    e[4] * invSy, e[5] * invSy, e[6] * invSy,
    e[8] * invSz, e[9] * invSz, e[10] * invSz
  ];
  
  const rotation = quaternionFromRotationMatrix(rotationMatrix);
  
  return { translation, rotation, scale };
}
```

### 从旋转矩阵提取四元数

```typescript
function quaternionFromRotationMatrix(m: number[]): Quat {
  // m 是按列存储的 3x3 矩阵
  // m[0], m[1], m[2] = 第一列
  // m[3], m[4], m[5] = 第二列
  // m[6], m[7], m[8] = 第三列
  
  const trace = m[0] + m[4] + m[8];
  
  let x, y, z, w;
  
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m[5] - m[7]) * s;
    y = (m[6] - m[2]) * s;
    z = (m[1] - m[3]) * s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    w = (m[5] - m[7]) / s;
    x = 0.25 * s;
    y = (m[3] + m[1]) / s;
    z = (m[6] + m[2]) / s;
  } else if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    w = (m[6] - m[2]) / s;
    x = (m[3] + m[1]) / s;
    y = 0.25 * s;
    z = (m[7] + m[5]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
    w = (m[1] - m[3]) / s;
    x = (m[6] + m[2]) / s;
    y = (m[7] + m[5]) / s;
    z = 0.25 * s;
  }
  
  return new Quat(x, y, z, w).normalize();
}
```

## 重组矩阵

从分解后的分量重新构建矩阵：

```typescript
function composeMatrix(
  translation: Vec3,
  rotation: Quat,
  scale: Vec3
): Mat4 {
  const result = new Mat4();
  const e = result.elements;
  
  // 从四元数构建旋转矩阵
  const x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  
  const sx = scale.x, sy = scale.y, sz = scale.z;
  
  // 旋转 × 缩放
  e[0] = (1 - yy - zz) * sx;
  e[1] = (xy + wz) * sx;
  e[2] = (xz - wy) * sx;
  e[3] = 0;
  
  e[4] = (xy - wz) * sy;
  e[5] = (1 - xx - zz) * sy;
  e[6] = (yz + wx) * sy;
  e[7] = 0;
  
  e[8] = (xz + wy) * sz;
  e[9] = (yz - wx) * sz;
  e[10] = (1 - xx - yy) * sz;
  e[11] = 0;
  
  // 平移
  e[12] = translation.x;
  e[13] = translation.y;
  e[14] = translation.z;
  e[15] = 1;
  
  return result;
}
```

## 极分解

当矩阵包含剪切时，TRS 分解不够精确。**极分解**可以更准确地分离旋转和拉伸：

$$
M = R \cdot S = U \cdot P
$$

其中：
- $R$（或 $U$）是正交矩阵（旋转）
- $S$（或 $P$）是对称正定矩阵（拉伸）

### 迭代算法

```typescript
function polarDecomposition(m: Mat4, maxIterations = 100): { rotation: Mat4; stretch: Mat4 } {
  let Q = m.clone();
  
  for (let i = 0; i < maxIterations; i++) {
    const Qinv = Q.invert();
    if (!Qinv) break;
    
    const Qt = Qinv.transpose();
    
    // Q = (Q + Q^(-T)) / 2
    const Qnext = new Mat4();
    for (let j = 0; j < 16; j++) {
      Qnext.elements[j] = (Q.elements[j] + Qt.elements[j]) / 2;
    }
    
    // 检查收敛
    let diff = 0;
    for (let j = 0; j < 16; j++) {
      diff += Math.abs(Qnext.elements[j] - Q.elements[j]);
    }
    
    Q = Qnext;
    
    if (diff < 1e-10) break;
  }
  
  // S = Q^T * M
  const stretch = Q.transpose().multiply(m);
  
  return { rotation: Q, stretch };
}
```

## QR 分解

将矩阵分解为正交矩阵 $Q$ 和上三角矩阵 $R$：

$$
M = Q \cdot R
$$

### Gram-Schmidt 过程

```typescript
function qrDecomposition(m: Mat4): { Q: Mat4; R: Mat4 } {
  // 提取列向量
  const a0 = new Vec3(m.elements[0], m.elements[1], m.elements[2]);
  const a1 = new Vec3(m.elements[4], m.elements[5], m.elements[6]);
  const a2 = new Vec3(m.elements[8], m.elements[9], m.elements[10]);
  
  // Gram-Schmidt 正交化
  const u0 = a0;
  const e0 = u0.normalize();
  
  const u1 = a1.sub(e0.mul(a1.dot(e0)));
  const e1 = u1.normalize();
  
  const u2 = a2.sub(e0.mul(a2.dot(e0))).sub(e1.mul(a2.dot(e1)));
  const e2 = u2.normalize();
  
  // 构建 Q
  const Q = new Mat4();
  Q.elements[0] = e0.x; Q.elements[1] = e0.y; Q.elements[2] = e0.z;
  Q.elements[4] = e1.x; Q.elements[5] = e1.y; Q.elements[6] = e1.z;
  Q.elements[8] = e2.x; Q.elements[9] = e2.y; Q.elements[10] = e2.z;
  
  // R = Q^T * M
  const R = Q.transpose().multiply(m);
  
  return { Q, R };
}
```

## 欧拉角提取

从旋转矩阵提取欧拉角：

```typescript
function extractEulerAngles(m: Mat4, order = 'XYZ'): Vec3 {
  const e = m.elements;
  const m11 = e[0], m12 = e[4], m13 = e[8];
  const m21 = e[1], m22 = e[5], m23 = e[9];
  const m31 = e[2], m32 = e[6], m33 = e[10];
  
  let x, y, z;
  
  switch (order) {
    case 'XYZ':
      y = Math.asin(clamp(m13, -1, 1));
      
      if (Math.abs(m13) < 0.9999999) {
        x = Math.atan2(-m23, m33);
        z = Math.atan2(-m12, m11);
      } else {
        // 万向节死锁
        x = Math.atan2(m32, m22);
        z = 0;
      }
      break;
      
    case 'YXZ':
      x = Math.asin(-clamp(m23, -1, 1));
      
      if (Math.abs(m23) < 0.9999999) {
        y = Math.atan2(m13, m33);
        z = Math.atan2(m21, m22);
      } else {
        y = Math.atan2(-m31, m11);
        z = 0;
      }
      break;
      
    // ... 其他顺序
  }
  
  return new Vec3(x, y, z);
}
```

## 应用示例

### 动画插值

```typescript
function interpolateTransforms(
  a: Mat4, 
  b: Mat4, 
  t: number
): Mat4 {
  // 分解
  const da = decomposeMatrix(a);
  const db = decomposeMatrix(b);
  
  if (!da || !db) {
    // 分解失败，直接插值矩阵元素
    return lerpMatrices(a, b, t);
  }
  
  // 独立插值
  const translation = da.translation.lerp(db.translation, t);
  const rotation = Quat.slerp(da.rotation, db.rotation, t);
  const scale = da.scale.lerp(db.scale, t);
  
  // 重组
  return composeMatrix(translation, rotation, scale);
}
```

### 编辑器显示

```typescript
class TransformGizmo {
  private decomposed: DecomposedTransform;
  
  setMatrix(m: Mat4): void {
    const d = decomposeMatrix(m);
    if (d) {
      this.decomposed = d;
      this.updateUI();
    }
  }
  
  getMatrix(): Mat4 {
    return composeMatrix(
      this.decomposed.translation,
      this.decomposed.rotation,
      this.decomposed.scale
    );
  }
  
  setPosition(pos: Vec3): void {
    this.decomposed.translation = pos;
  }
  
  setEulerAngles(euler: Vec3): void {
    this.decomposed.rotation = Quat.fromEuler(euler.x, euler.y, euler.z);
  }
}
```

## 小结

1. **TRS 分解**：最常用，适用于标准变换
2. **极分解**：精确分离旋转和拉伸
3. **QR 分解**：数值稳定的正交化
4. **重组**：从分量高效构建矩阵

注意事项：
- 检测镜像变换（行列式为负）
- 处理万向节死锁
- 数值精度问题
