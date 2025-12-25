# 四元数与旋转表示

> "四元数是 3D 旋转的最佳表示，避免了万向节锁的困扰。"

## 旋转表示方式

### 对比

| 表示方式 | 存储 | 优点 | 缺点 |
|----------|------|------|------|
| 欧拉角 | 3 个数 | 直观 | 万向节锁 |
| 轴-角 | 4 个数 | 直观 | 插值困难 |
| 矩阵 | 9 个数 | 易组合 | 冗余、漂移 |
| 四元数 | 4 个数 | 无万向锁、易插值 | 不直观 |

### 万向节锁

当欧拉角的一个轴旋转 ±90° 时，另外两个轴会对齐，丢失一个自由度。

```
欧拉角 (X, Y, Z) 顺序：

正常情况：
   Y (Yaw)
    │
    ├──── X (Pitch)
   ╱
  Z (Roll)

当 Pitch = 90° 时：
   Y ───── Z   ← Yaw 和 Roll 对齐！
    │
    X
```

## 四元数基础

### 定义

四元数是复数的扩展：

```
q = w + xi + yj + zk

其中：
- i² = j² = k² = ijk = -1
- ij = k, jk = i, ki = j
- ji = -k, kj = -i, ik = -j
```

### 单位四元数

单位四元数满足 |q| = 1，可以表示 3D 旋转：

```
q = cos(θ/2) + sin(θ/2)(axi + ayj + azk)

其中：
- θ 是旋转角度
- (ax, ay, az) 是旋转轴（单位向量）
```

## Quaternion 实现

### 基础结构

```typescript
// src/math/Quaternion.ts
export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  
  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  
  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
  
  copy(q: Quaternion): this {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }
  
  identity(): this {
    return this.set(0, 0, 0, 1);
  }
}
```

### 从轴-角设置

```typescript
setFromAxisAngle(axis: Vector3, angle: number): this {
  // q = cos(θ/2) + sin(θ/2) * axis
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  
  this.x = axis.x * s;
  this.y = axis.y * s;
  this.z = axis.z * s;
  this.w = Math.cos(halfAngle);
  
  return this;
}
```

### 从欧拉角设置

```typescript
setFromEuler(euler: Euler, update = true): this {
  const x = euler.x, y = euler.y, z = euler.z;
  const order = euler.order;
  
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  
  switch (order) {
    case 'XYZ':
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
      break;
      
    case 'YXZ':
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 - s1 * s2 * c3;
      this.w = c1 * c2 * c3 + s1 * s2 * s3;
      break;
      
    case 'ZXY':
      this.x = s1 * c2 * c3 - c1 * s2 * s3;
      this.y = c1 * s2 * c3 + s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
      break;
      
    case 'ZYX':
      this.x = s1 * c2 * c3 - c1 * s2 * s3;
      this.y = c1 * s2 * c3 + s1 * c2 * s3;
      this.z = c1 * c2 * s3 - s1 * s2 * c3;
      this.w = c1 * c2 * c3 + s1 * s2 * s3;
      break;
      
    case 'YZX':
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 + s1 * c2 * s3;
      this.z = c1 * c2 * s3 - s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
      break;
      
    case 'XZY':
      this.x = s1 * c2 * c3 - c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 + s1 * s2 * s3;
      break;
  }
  
  return this;
}
```

### 从旋转矩阵设置

```typescript
setFromRotationMatrix(m: Matrix4): this {
  // 假设矩阵是正交的（无缩放）
  const te = m.elements,
    m11 = te[0], m12 = te[4], m13 = te[8],
    m21 = te[1], m22 = te[5], m23 = te[9],
    m31 = te[2], m32 = te[6], m33 = te[10],
    trace = m11 + m22 + m33;
  
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    
    this.w = 0.25 / s;
    this.x = (m32 - m23) * s;
    this.y = (m13 - m31) * s;
    this.z = (m21 - m12) * s;
    
  } else if (m11 > m22 && m11 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);
    
    this.w = (m32 - m23) / s;
    this.x = 0.25 * s;
    this.y = (m12 + m21) / s;
    this.z = (m13 + m31) / s;
    
  } else if (m22 > m33) {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);
    
    this.w = (m13 - m31) / s;
    this.x = (m12 + m21) / s;
    this.y = 0.25 * s;
    this.z = (m23 + m32) / s;
    
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);
    
    this.w = (m21 - m12) / s;
    this.x = (m13 + m31) / s;
    this.y = (m23 + m32) / s;
    this.z = 0.25 * s;
  }
  
  return this;
}
```

### 从两个向量设置

```typescript
setFromUnitVectors(vFrom: Vector3, vTo: Vector3): this {
  // 计算从 vFrom 旋转到 vTo 的四元数
  let r = vFrom.dot(vTo) + 1;
  
  if (r < Number.EPSILON) {
    // vFrom 和 vTo 反向
    r = 0;
    
    if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
      this.x = -vFrom.y;
      this.y = vFrom.x;
      this.z = 0;
      this.w = r;
    } else {
      this.x = 0;
      this.y = -vFrom.z;
      this.z = vFrom.y;
      this.w = r;
    }
  } else {
    // 使用叉积
    this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
    this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
    this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
    this.w = r;
  }
  
  return this.normalize();
}
```

## 四元数运算

### 长度与归一化

```typescript
length(): number {
  return Math.sqrt(
    this.x * this.x + 
    this.y * this.y + 
    this.z * this.z + 
    this.w * this.w
  );
}

lengthSq(): number {
  return (
    this.x * this.x + 
    this.y * this.y + 
    this.z * this.z + 
    this.w * this.w
  );
}

normalize(): this {
  let l = this.length();
  
  if (l === 0) {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
  } else {
    l = 1 / l;
    this.x *= l;
    this.y *= l;
    this.z *= l;
    this.w *= l;
  }
  
  return this;
}
```

### 乘法

四元数乘法不满足交换律：q1 × q2 ≠ q2 × q1

```typescript
multiply(q: Quaternion): this {
  return this.multiplyQuaternions(this, q);
}

premultiply(q: Quaternion): this {
  return this.multiplyQuaternions(q, this);
}

multiplyQuaternions(a: Quaternion, b: Quaternion): this {
  // Hamilton 积
  const qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
  const qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;
  
  this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
  this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
  this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
  this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
  
  return this;
}
```

### 共轭与逆

```typescript
// 共轭：虚部取反
conjugate(): this {
  this.x *= -1;
  this.y *= -1;
  this.z *= -1;
  return this;
}

// 逆：q⁻¹ = q* / |q|²
// 对于单位四元数：q⁻¹ = q*
invert(): this {
  return this.conjugate().normalize();
}
```

### 点积

```typescript
dot(v: Quaternion): number {
  return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
}
```

### 角度

```typescript
angleTo(q: Quaternion): number {
  return 2 * Math.acos(Math.abs(Math.min(1, this.dot(q))));
}

rotateTowards(q: Quaternion, step: number): this {
  const angle = this.angleTo(q);
  if (angle === 0) return this;
  
  const t = Math.min(1, step / angle);
  this.slerp(q, t);
  
  return this;
}
```

## 球面线性插值 (Slerp)

### 原理

```
        q0
       ╱
      ╱ θ
     ╱
────●──────── q1
    
slerp(q0, q1, t) 沿球面弧线插值
```

### 实现

```typescript
slerp(qb: Quaternion, t: number): this {
  if (t === 0) return this;
  if (t === 1) return this.copy(qb);
  
  const x = this.x, y = this.y, z = this.z, w = this.w;
  
  let cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
  
  if (cosHalfTheta < 0) {
    // qb 和 -qb 表示相同旋转，选择短路径
    this.w = -qb.w;
    this.x = -qb.x;
    this.y = -qb.y;
    this.z = -qb.z;
    cosHalfTheta = -cosHalfTheta;
  } else {
    this.copy(qb);
  }
  
  if (cosHalfTheta >= 1.0) {
    // 几乎相同，直接返回
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;
  
  if (sqrSinHalfTheta <= Number.EPSILON) {
    // 线性插值（避免除零）
    const s = 1 - t;
    this.w = s * w + t * this.w;
    this.x = s * x + t * this.x;
    this.y = s * y + t * this.y;
    this.z = s * z + t * this.z;
    return this.normalize();
  }
  
  const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
  const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  
  this.w = w * ratioA + this.w * ratioB;
  this.x = x * ratioA + this.x * ratioB;
  this.y = y * ratioA + this.y * ratioB;
  this.z = z * ratioA + this.z * ratioB;
  
  return this;
}

slerpQuaternions(qa: Quaternion, qb: Quaternion, t: number): this {
  return this.copy(qa).slerp(qb, t);
}
```

### 静态方法

```typescript
static slerp(
  qa: Quaternion, 
  qb: Quaternion, 
  qm: Quaternion, 
  t: number
): Quaternion {
  return qm.slerpQuaternions(qa, qb, t);
}

static slerpFlat(
  dst: number[], dstOffset: number,
  src0: number[], srcOffset0: number,
  src1: number[], srcOffset1: number,
  t: number
): void {
  // 用于动画系统的批量插值
  let x0 = src0[srcOffset0];
  let y0 = src0[srcOffset0 + 1];
  let z0 = src0[srcOffset0 + 2];
  let w0 = src0[srcOffset0 + 3];
  
  const x1 = src1[srcOffset1];
  const y1 = src1[srcOffset1 + 1];
  const z1 = src1[srcOffset1 + 2];
  const w1 = src1[srcOffset1 + 3];
  
  if (t === 0) {
    dst[dstOffset] = x0;
    dst[dstOffset + 1] = y0;
    dst[dstOffset + 2] = z0;
    dst[dstOffset + 3] = w0;
    return;
  }
  
  if (t === 1) {
    dst[dstOffset] = x1;
    dst[dstOffset + 1] = y1;
    dst[dstOffset + 2] = z1;
    dst[dstOffset + 3] = w1;
    return;
  }
  
  // ... slerp 逻辑 ...
}
```

## Euler 实现

### 基础结构

```typescript
// src/math/Euler.ts
export type EulerOrder = 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';

export class Euler {
  private _x: number;
  private _y: number;
  private _z: number;
  private _order: EulerOrder;
  
  onChangeCallback: () => void;
  
  constructor(x = 0, y = 0, z = 0, order: EulerOrder = 'XYZ') {
    this._x = x;
    this._y = y;
    this._z = z;
    this._order = order;
    this.onChangeCallback = () => {};
  }
  
  get x(): number { return this._x; }
  set x(value: number) {
    this._x = value;
    this.onChangeCallback();
  }
  
  get y(): number { return this._y; }
  set y(value: number) {
    this._y = value;
    this.onChangeCallback();
  }
  
  get z(): number { return this._z; }
  set z(value: number) {
    this._z = value;
    this.onChangeCallback();
  }
  
  get order(): EulerOrder { return this._order; }
  set order(value: EulerOrder) {
    this._order = value;
    this.onChangeCallback();
  }
  
  set(x: number, y: number, z: number, order?: EulerOrder): this {
    this._x = x;
    this._y = y;
    this._z = z;
    if (order !== undefined) this._order = order;
    this.onChangeCallback();
    return this;
  }
  
  clone(): Euler {
    return new Euler(this._x, this._y, this._z, this._order);
  }
  
  copy(euler: Euler): this {
    this._x = euler._x;
    this._y = euler._y;
    this._z = euler._z;
    this._order = euler._order;
    this.onChangeCallback();
    return this;
  }
}
```

### 从旋转矩阵设置

```typescript
setFromRotationMatrix(m: Matrix4, order?: EulerOrder, update = true): this {
  const te = m.elements;
  const m11 = te[0], m12 = te[4], m13 = te[8];
  const m21 = te[1], m22 = te[5], m23 = te[9];
  const m31 = te[2], m32 = te[6], m33 = te[10];
  
  order = order || this._order;
  
  switch (order) {
    case 'XYZ':
      this._y = Math.asin(clamp(m13, -1, 1));
      
      if (Math.abs(m13) < 0.9999999) {
        this._x = Math.atan2(-m23, m33);
        this._z = Math.atan2(-m12, m11);
      } else {
        this._x = Math.atan2(m32, m22);
        this._z = 0;
      }
      break;
      
    case 'YXZ':
      this._x = Math.asin(-clamp(m23, -1, 1));
      
      if (Math.abs(m23) < 0.9999999) {
        this._y = Math.atan2(m13, m33);
        this._z = Math.atan2(m21, m22);
      } else {
        this._y = Math.atan2(-m31, m11);
        this._z = 0;
      }
      break;
      
    // ... 其他顺序 ...
  }
  
  this._order = order;
  if (update) this.onChangeCallback();
  
  return this;
}
```

### 从四元数设置

```typescript
setFromQuaternion(q: Quaternion, order?: EulerOrder, update?: boolean): this {
  _matrix.makeRotationFromQuaternion(q);
  return this.setFromRotationMatrix(_matrix, order, update);
}
```

### 重新排序

```typescript
reorder(newOrder: EulerOrder): this {
  _quaternion.setFromEuler(this);
  return this.setFromQuaternion(_quaternion, newOrder);
}
```

## 旋转应用

### 用四元数旋转向量

```typescript
// Vector3.applyQuaternion
applyQuaternion(q: Quaternion): this {
  // 使用公式: v' = q * v * q^-1
  // 优化后的实现
  const x = this.x, y = this.y, z = this.z;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  
  // v' = v + q.w * t + cross(q.xyz, t)
  this.x = x + qw * tx + qy * tz - qz * ty;
  this.y = y + qw * ty + qz * tx - qx * tz;
  this.z = z + qw * tz + qx * ty - qy * tx;
  
  return this;
}
```

### 组合旋转

```typescript
// 先旋转 q1，再旋转 q2
const combined = q2.clone().multiply(q1);

// 注意顺序：右乘是局部旋转，左乘是世界旋转

// 局部旋转（相对于当前朝向）
object.quaternion.multiply(deltaRotation);

// 世界旋转（相对于世界坐标）
object.quaternion.premultiply(worldRotation);
```

### 相对旋转

```typescript
// 从 q1 到 q2 的相对旋转
function getRelativeRotation(q1: Quaternion, q2: Quaternion): Quaternion {
  // q1 * relative = q2
  // relative = q1^-1 * q2
  return q1.clone().invert().multiply(q2);
}
```

## Object3D 中的旋转

### 属性关联

```typescript
class Object3D {
  position: Vector3;
  rotation: Euler;
  quaternion: Quaternion;
  scale: Vector3;
  
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    
    // rotation 和 quaternion 同步
    this.rotation.onChangeCallback = () => {
      this.quaternion.setFromEuler(this.rotation, false);
    };
    
    this.quaternion.onChangeCallback = () => {
      this.rotation.setFromQuaternion(this.quaternion, undefined, false);
    };
  }
  
  rotateOnAxis(axis: Vector3, angle: number): this {
    _q1.setFromAxisAngle(axis, angle);
    this.quaternion.multiply(_q1);
    return this;
  }
  
  rotateOnWorldAxis(axis: Vector3, angle: number): this {
    _q1.setFromAxisAngle(axis, angle);
    this.quaternion.premultiply(_q1);
    return this;
  }
  
  rotateX(angle: number): this {
    return this.rotateOnAxis(_xAxis, angle);
  }
  
  rotateY(angle: number): this {
    return this.rotateOnAxis(_yAxis, angle);
  }
  
  rotateZ(angle: number): this {
    return this.rotateOnAxis(_zAxis, angle);
  }
  
  lookAt(x: number | Vector3, y?: number, z?: number): void {
    if (x instanceof Vector3) {
      _target.copy(x);
    } else {
      _target.set(x, y!, z!);
    }
    
    this.updateWorldMatrix(true, false);
    _position.setFromMatrixPosition(this.matrixWorld);
    
    if (this instanceof Camera || this instanceof Light) {
      _m1.lookAt(_position, _target, this.up);
    } else {
      _m1.lookAt(_target, _position, this.up);
    }
    
    this.quaternion.setFromRotationMatrix(_m1);
    
    if (this.parent) {
      _m1.extractRotation(this.parent.matrixWorld);
      _q1.setFromRotationMatrix(_m1);
      this.quaternion.premultiply(_q1.invert());
    }
  }
}
```

## 实用技巧

### 平滑旋转

```typescript
// 使用 slerp 实现平滑旋转
function smoothRotate(
  current: Quaternion,
  target: Quaternion,
  smoothFactor: number
): void {
  current.slerp(target, smoothFactor);
}

// 每帧调用
function update() {
  smoothRotate(camera.quaternion, targetRotation, 0.1);
}
```

### 限制旋转角度

```typescript
function clampRotation(
  quaternion: Quaternion,
  maxAngle: number
): void {
  const angle = 2 * Math.acos(quaternion.w);
  
  if (angle > maxAngle) {
    const scale = maxAngle / angle;
    quaternion.x *= scale;
    quaternion.y *= scale;
    quaternion.z *= scale;
    quaternion.w = Math.cos(maxAngle / 2);
    quaternion.normalize();
  }
}
```

### 避免抖动

```typescript
// 当四元数接近目标时，直接设置
function snapToTarget(
  current: Quaternion,
  target: Quaternion,
  threshold = 0.001
): void {
  if (current.angleTo(target) < threshold) {
    current.copy(target);
  }
}
```

## 本章小结

- 四元数避免万向节锁
- Slerp 实现平滑旋转插值
- 乘法不满足交换律
- Euler 和 Quaternion 保持同步
- rotateOnAxis 局部旋转
- rotateOnWorldAxis 世界旋转

下一章，我们将学习常用数学工具函数。
