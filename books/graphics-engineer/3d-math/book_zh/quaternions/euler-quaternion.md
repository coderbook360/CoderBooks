# 四元数与欧拉角的转换

在实际项目中，经常需要在四元数和欧拉角之间转换：
- **输入**：用户通过UI输入欧拉角（Pitch、Yaw、Roll）
- **内部**：使用四元数进行旋转计算
- **调试**：显示欧拉角便于理解

## 欧拉角到四元数

给定欧拉角 $(pitch, yaw, roll)$，转换为四元数的方法：

### 方法1：通过旋转矩阵（通用但慢）

```javascript
function eulerToQuaternion(pitch, yaw, roll) {
  // 1. 欧拉角 → 旋转矩阵
  const Rx = rotateX(pitch);
  const Ry = rotateY(yaw);
  const Rz = rotateZ(roll);
  const matrix = multiply(Rz, multiply(Ry, Rx));
  
  // 2. 旋转矩阵 → 四元数
  return matrixToQuaternion(matrix);
}
```

### 方法2：直接公式（更快）

```javascript
function eulerToQuaternionDirect(pitch, yaw, roll) {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  
  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy
  };
}

// 示例
const q = eulerToQuaternionDirect(
  Math.PI / 6,  // pitch: 30度
  Math.PI / 4,  // yaw: 45度
  0             // roll: 0度
);
```

## 四元数到欧拉角

反向转换更复杂，因为有多个欧拉角可以表示同一个旋转。

### 标准转换公式（ZYX顺序）

```javascript
function quaternionToEuler(q) {
  // 计算中间值
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);
  
  // Pitch (Y轴旋转)
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  let pitch;
  if (Math.abs(sinp) >= 1) {
    // 万向节死锁：使用90度
    pitch = Math.sign(sinp) * Math.PI / 2;
  } else {
    pitch = Math.asin(sinp);
  }
  
  // Yaw (Z轴旋转)
  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);
  
  return { pitch, yaw, roll };
}

// 示例
const q = { x: 0, y: 0.707, z: 0, w: 0.707 };  // 绕Y轴90度
const euler = quaternionToEuler(q);
console.log(euler);  // { pitch: 0, yaw: 1.57 (≈π/2), roll: 0 }
```

### 处理万向节死锁

当Pitch接近±90度时，Yaw和Roll不唯一：

```javascript
function quaternionToEulerSafe(q) {
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  
  if (Math.abs(sinp) >= 0.99999) {
    // 万向节死锁
    const pitch = Math.sign(sinp) * Math.PI / 2;
    const yaw = Math.atan2(-2 * (q.x * q.y - q.w * q.z),
                           1 - 2 * (q.y * q.y + q.z * q.z));
    const roll = 0;  // 固定roll为0
    
    return { pitch, yaw, roll };
  }
  
  // 正常情况
  return quaternionToEuler(q);
}
```

## 典型工作流

### Unity风格的Transform类

```javascript
class Transform {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this._rotation = { x: 0, y: 0, z: 0, w: 1 };  // 四元数
    this.scale = { x: 1, y: 1, z: 1 };
  }
  
  // 欧拉角getter（调试用）
  get eulerAngles() {
    return quaternionToEuler(this._rotation);
  }
  
  // 欧拉角setter（用户输入）
  set eulerAngles({ pitch, yaw, roll }) {
    this._rotation = eulerToQuaternionDirect(pitch, yaw, roll);
  }
  
  // 旋转操作（内部用四元数）
  rotateBy(axis, angle) {
    const delta = fromAxisAngle(axis, angle);
    this._rotation = multiplyQuaternion(delta, this._rotation);
    this._rotation = normalize(this._rotation);
  }
  
  // 输出矩阵（渲染用）
  getMatrix() {
    const T = translationMatrix(this.position);
    const R = quaternionToMatrix(this._rotation);
    const S = scaleMatrix(this.scale);
    return multiply(T, multiply(R, S));
  }
}

// 使用示例
const obj = new Transform();

// 用户输入欧拉角
obj.eulerAngles = { pitch: 30, yaw: 45, roll: 0 };

// 代码旋转
obj.rotateBy({ x: 0, y: 1, z: 0 }, Math.PI / 4);

// 调试显示
console.log('Current rotation:', obj.eulerAngles);

// 渲染
const matrix = obj.getMatrix();
```

## 常见陷阱

### 陷阱1：旋转顺序不匹配

```javascript
// Three.js使用XYZ顺序
const euler = new THREE.Euler(pitch, yaw, roll, 'XYZ');

// Unity使用ZXY顺序
// 需要调整转换公式
```

### 陷阱2：角度范围

```javascript
// 欧拉角可能超出[-π, π]
const euler = quaternionToEuler(q);
// euler.yaw 可能是 5.5 (超过π)

// 归一化到[-π, π]
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
```

## 总结

| 转换方向 | 方法 | 注意事项 |
|---------|------|---------|
| **欧拉角→四元数** | 直接公式 | 无歧义 |
| **四元数→欧拉角** | 反三角函数 | 多解，万向节死锁 |

关键要点：
- **内部存储用四元数**
- **用户接口用欧拉角**
- **万向节死锁**在转换时仍存在
- 不同库的**旋转顺序可能不同**

掌握转换方法，你就能灵活切换两种表示！
