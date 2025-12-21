# 用四元数表示旋转

四元数的核心用途是表示 3D 旋转。但四元数有 4 个分量 (x, y, z, w)，如何用它们表示旋转？

答案：使用**轴角表示**（Axis-Angle）作为桥梁。

## 轴角表示

**轴角表示**用两个参数描述旋转：
- **旋转轴**：单位向量 $\mathbf{axis} = (a_x, a_y, a_z)$
- **旋转角度**：$\theta$（弧度）

示例：

```javascript
// 绕 Y 轴旋转 90度
const rotation = {
  axis: { x: 0, y: 1, z: 0 },  // Y 轴
  angle: Math.PI / 2            // 90度
};
```

优点：
- **直观**：符合人类思维
- **紧凑**：4个数字（3个轴 + 1个角度）

## 从轴角构建四元数

给定旋转轴 $\mathbf{axis}$ 和角度 $\theta$，四元数为：

$$
\mathbf{q} = \left( \sin\frac{\theta}{2} \cdot \mathbf{axis}, \cos\frac{\theta}{2} \right)
$$

展开：

$$
\begin{align}
x &= a_x \cdot \sin\frac{\theta}{2} \\
y &= a_y \cdot \sin\frac{\theta}{2} \\
z &= a_z \cdot \sin\frac{\theta}{2} \\
w &= \cos\frac{\theta}{2}
\end{align}
$$

注意：使用 $\frac{\theta}{2}$（半角）！

### 代码实现

```javascript
function fromAxisAngle(axis, angle) {
  // 确保轴是单位向量
  const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
  const ax = axis.x / len;
  const ay = axis.y / len;
  const az = axis.z / len;
  
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  
  return {
    x: ax * s,
    y: ay * s,
    z: az * s,
    w: Math.cos(halfAngle)
  };
}

// 示例：绕 Y 轴旋转 90度
const q = fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
console.log(q); 
// { x: 0, y: 0.707, z: 0, w: 0.707 }
```

### 为什么是半角？

因为四元数表示旋转的数学原理涉及复数和 4 维空间，使用半角确保正确的旋转效果。

直观理解：
- $\theta = 0°$：无旋转 → $\mathbf{q} = (0, 0, 0, 1)$
- $\theta = 180°$：半圈旋转 → $w = \cos(90°) = 0$
- $\theta = 360°$：完整一圈 → $\mathbf{q} = (0, 0, 0, -1)$（与无旋转等效）

## 从四元数提取轴角

反向操作：从四元数提取旋转轴和角度。

公式：

$$
\begin{align}
\theta &= 2 \cdot \arccos(w) \\
\mathbf{axis} &= \frac{(x, y, z)}{\sin\frac{\theta}{2}}
\end{align}
$$

代码：

```javascript
function toAxisAngle(q) {
  // 处理无旋转情况
  if (Math.abs(q.w) >= 1.0) {
    return {
      axis: { x: 0, y: 1, z: 0 },  // 任意轴
      angle: 0
    };
  }
  
  const angle = 2 * Math.acos(q.w);
  const s = Math.sqrt(1 - q.w * q.w);
  
  // 避免除以零
  if (s < 0.001) {
    return {
      axis: { x: q.x, y: q.y, z: q.z },
      angle
    };
  }
  
  return {
    axis: {
      x: q.x / s,
      y: q.y / s,
      z: q.z / s
    },
    angle
  };
}

// 示例
const q = { x: 0, y: 0.707, z: 0, w: 0.707 };
const {axis, angle} = toAxisAngle(q);
console.log(axis);  // { x: 0, y: 1, z: 0 }
console.log(angle); // 1.571 (≈ π/2 = 90°)
```

## 用四元数旋转向量

给定四元数 $\mathbf{q}$ 和向量 $\mathbf{v}$，旋转后的向量 $\mathbf{v'}$：

$$
\mathbf{v'} = \mathbf{q} \cdot \mathbf{v} \cdot \mathbf{q}^{-1}
$$

其中 $\mathbf{q}^{-1}$ 是 $\mathbf{q}$ 的逆。

### 实现方式1：直接公式

```javascript
function rotateVector(v, q) {
  // 将向量转换为四元数 (v.x, v.y, v.z, 0)
  const qv = { x: v.x, y: v.y, z: v.z, w: 0 };
  
  // q * qv * q^-1
  const temp = multiplyQuaternion(q, qv);
  const q_inv = conjugate(q);
  const result = multiplyQuaternion(temp, q_inv);
  
  return { x: result.x, y: result.y, z: result.z };
}

function conjugate(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}
```

### 实现方式2：优化公式（更快）

```javascript
function rotateVectorOptimized(v, q) {
  // 提取四元数的向量和标量部分
  const qv = { x: q.x, y: q.y, z: q.z };
  const qw = q.w;
  
  // t = 2 * cross(qv, v)
  const tx = 2 * (qv.y * v.z - qv.z * v.y);
  const ty = 2 * (qv.z * v.x - qv.x * v.z);
  const tz = 2 * (qv.x * v.y - qv.y * v.x);
  
  // v' = v + qw * t + cross(qv, t)
  return {
    x: v.x + qw * tx + (qv.y * tz - qv.z * ty),
    y: v.y + qw * ty + (qv.z * tx - qv.x * tz),
    z: v.z + qw * tz + (qv.x * ty - qv.y * tx)
  };
}

// 示例：旋转向量
const v = { x: 1, y: 0, z: 0 };  // X 轴方向
const q = fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);  // 绕Y轴90度
const rotated = rotateVectorOptimized(v, q);
console.log(rotated);  // { x: 0, y: 0, z: -1 } (指向 -Z)
```

## 组合旋转

两个旋转 $\mathbf{q}_1$ 和 $\mathbf{q}_2$ 的组合：先应用 $\mathbf{q}_1$，再应用 $\mathbf{q}_2$。

公式：

$$
\mathbf{q}_{\text{combined}} = \mathbf{q}_2 \cdot \mathbf{q}_1
$$

注意顺序：右边先应用！

### 四元数乘法

```javascript
function multiplyQuaternion(q1, q2) {
  return {
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
  };
}

// 示例：组合两个旋转
const q1 = fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4);  // Y轴45度
const q2 = fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 6);  // X轴30度

const combined = multiplyQuaternion(q2, q1);  // 先q1，再q2
```

## 单位四元数

表示旋转的四元数必须是**单位四元数**（长度为1）：

$$
|\mathbf{q}| = \sqrt{x^2 + y^2 + z^2 + w^2} = 1
$$

### 归一化

```javascript
function normalize(q) {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  
  if (len === 0) {
    return { x: 0, y: 0, z: 0, w: 1 };  // 无旋转
  }
  
  return {
    x: q.x / len,
    y: q.y / len,
    z: q.z / len,
    w: q.w / len
  };
}
```

多次旋转后可能累积误差，需要定期归一化：

```javascript
function applyRotations(q, rotations) {
  let result = q;
  
  rotations.forEach(rot => {
    result = multiplyQuaternion(result, rot);
  });
  
  // 归一化，消除累积误差
  return normalize(result);
}
```

## 四元数的逆

四元数的逆用于"撤销"旋转：

$$
\mathbf{q}^{-1} = \frac{\mathbf{q}^*}{|\mathbf{q}|^2}
$$

对于单位四元数，$|\mathbf{q}| = 1$，所以：

$$
\mathbf{q}^{-1} = \mathbf{q}^* = (-x, -y, -z, w)
$$

代码：

```javascript
function inverse(q) {
  // 单位四元数的逆就是共轭
  return conjugate(q);
}

function conjugate(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

// 示例：旋转和反旋转
const q = fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
const q_inv = inverse(q);

const v = { x: 1, y: 0, z: 0 };
const rotated = rotateVector(v, q);
const original = rotateVector(rotated, q_inv);

console.log(original);  // { x: 1, y: 0, z: 0 } (恢复原始向量)
```

## 实际应用场景

### 场景1：FPS 相机旋转

```javascript
class FPSCamera {
  constructor() {
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };  // 无旋转
  }
  
  rotate(deltaPitch, deltaYaw) {
    // 绕相机局部 X 轴旋转（俯仰）
    const pitchRot = fromAxisAngle({ x: 1, y: 0, z: 0 }, deltaPitch);
    
    // 绕世界 Y 轴旋转（偏航）
    const yawRot = fromAxisAngle({ x: 0, y: 1, z: 0 }, deltaYaw);
    
    // 先局部俯仰，再全局偏航
    this.rotation = multiplyQuaternion(yawRot, multiplyQuaternion(pitchRot, this.rotation));
    
    // 归一化
    this.rotation = normalize(this.rotation);
  }
  
  getForward() {
    // 相机默认朝向 -Z
    return rotateVector({ x: 0, y: 0, z: -1 }, this.rotation);
  }
}
```

### 场景2：物体跟随目标

```javascript
function lookAt(fromPos, toPos, up) {
  // 计算朝向
  const forward = normalize(subtract(toPos, fromPos));
  const right = normalize(cross(forward, up));
  const realUp = cross(right, forward);
  
  // 构建旋转矩阵
  const matrix = [
    right.x, realUp.x, -forward.x,
    right.y, realUp.y, -forward.y,
    right.z, realUp.z, -forward.z
  ];
  
  // 转换为四元数
  return matrixToQuaternion(matrix);
}

// 使用
const enemy = { x: 10, y: 0, z: 5 };
const player = { x: 0, y: 0, z: 0 };

const lookRotation = lookAt(enemy, player, { x: 0, y: 1, z: 0 });
enemy.rotation = lookRotation;
```

### 场景3：物理模拟中的角速度

```javascript
class RigidBody {
  constructor() {
    this.rotation = { x: 0, y: 0, z: 0, w: 1 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };  // 弧度/秒
  }
  
  update(dt) {
    // 角速度转换为四元数增量
    const angle = Math.sqrt(
      this.angularVelocity.x ** 2 +
      this.angularVelocity.y ** 2 +
      this.angularVelocity.z ** 2
    ) * dt;
    
    if (angle > 0.001) {
      const axis = {
        x: this.angularVelocity.x / (angle / dt),
        y: this.angularVelocity.y / (angle / dt),
        z: this.angularVelocity.z / (angle / dt)
      };
      
      const deltaQ = fromAxisAngle(axis, angle);
      this.rotation = multiplyQuaternion(deltaQ, this.rotation);
      this.rotation = normalize(this.rotation);
    }
  }
}
```

## 常见陷阱

### 陷阱1：忘记归一化

```javascript
// 错误：多次旋转后不归一化
let q = { x: 0, y: 0, z: 0, w: 1 };
for (let i = 0; i < 100; i++) {
  const rot = fromAxisAngle({ x: 0, y: 1, z: 0 }, 0.01);
  q = multiplyQuaternion(q, rot);
  // ❌ 累积误差，|q| ≠ 1
}

// 正确：定期归一化
let q = { x: 0, y: 0, z: 0, w: 1 };
for (let i = 0; i < 100; i++) {
  const rot = fromAxisAngle({ x: 0, y: 1, z: 0 }, 0.01);
  q = multiplyQuaternion(q, rot);
  
  if (i % 10 === 0) {
    q = normalize(q);  // ✅ 每10次归一化
  }
}
```

### 陷阱2：旋转顺序错误

```javascript
// 错误：顺序颠倒
const combined = multiplyQuaternion(q1, q2);  // ❌ 先q2再q1

// 正确：右边先应用
const combined = multiplyQuaternion(q2, q1);  // ✅ 先q1再q2
```

### 陷阱3：轴未归一化

```javascript
// 错误：轴向量未归一化
const axis = { x: 1, y: 1, z: 0 };  // 长度 ≠ 1
const q = fromAxisAngle(axis, Math.PI / 2);  // ❌ 结果错误

// 正确：先归一化轴
const axis = { x: 1, y: 1, z: 0 };
const len = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
const normAxis = { x: axis.x / len, y: axis.y / len, z: axis.z / len };
const q = fromAxisAngle(normAxis, Math.PI / 2);  // ✅
```

## 总结

用四元数表示旋转的核心：

| 操作 | 公式 |
|------|------|
| **轴角→四元数** | $\mathbf{q} = (\sin\frac{\theta}{2} \cdot \mathbf{axis}, \cos\frac{\theta}{2})$ |
| **四元数→轴角** | $\theta = 2\arccos(w), \mathbf{axis} = \frac{(x,y,z)}{\sin\frac{\theta}{2}}$ |
| **旋转向量** | $\mathbf{v'} = \mathbf{q} \cdot \mathbf{v} \cdot \mathbf{q}^{-1}$ |
| **组合旋转** | $\mathbf{q}_{\text{combined}} = \mathbf{q}_2 \cdot \mathbf{q}_1$ |
| **逆旋转** | $\mathbf{q}^{-1} = (-x, -y, -z, w)$ (单位四元数) |

关键要点：
- 使用**半角**构建四元数
- 必须是**单位四元数**
- 旋转组合通过**四元数乘法**
- 定期**归一化**避免误差
- 旋转顺序：右边先应用

掌握这些操作，你就能用四元数高效地表示和操作 3D 旋转！
