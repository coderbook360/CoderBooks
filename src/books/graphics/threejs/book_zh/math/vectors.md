# 向量与向量运算

> "向量是 3D 图形的基础语言，掌握它才能与计算机'对话'。"

## 向量基础

### 什么是向量

向量是既有大小又有方向的量。在 3D 图形中，向量用于表示：
- 位置（从原点到点的偏移）
- 方向（如光线方向、法线方向）
- 速度（方向 + 速率）
- 力（方向 + 强度）

### 向量表示

```
        y
        ↑
        │    ·(3, 2)
        │   /
        │  /
        │ / v = (3, 2)
        │/
   ─────┼─────→ x
        │
```

## Vector3 实现

### 基础结构

```typescript
// src/math/Vector3.ts
export class Vector3 {
  x: number;
  y: number;
  z: number;
  
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  setScalar(scalar: number): this {
    this.x = scalar;
    this.y = scalar;
    this.z = scalar;
    return this;
  }
  
  setX(x: number): this {
    this.x = x;
    return this;
  }
  
  setY(y: number): this {
    this.y = y;
    return this;
  }
  
  setZ(z: number): this {
    this.z = z;
    return this;
  }
  
  setComponent(index: number, value: number): this {
    switch (index) {
      case 0: this.x = value; break;
      case 1: this.y = value; break;
      case 2: this.z = value; break;
      default: throw new Error(`index is out of range: ${index}`);
    }
    return this;
  }
  
  getComponent(index: number): number {
    switch (index) {
      case 0: return this.x;
      case 1: return this.y;
      case 2: return this.z;
      default: throw new Error(`index is out of range: ${index}`);
    }
  }
}
```

### 复制与克隆

```typescript
clone(): Vector3 {
  return new Vector3(this.x, this.y, this.z);
}

copy(v: Vector3): this {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;
  return this;
}
```

### 基础运算

```typescript
// 加法
add(v: Vector3): this {
  this.x += v.x;
  this.y += v.y;
  this.z += v.z;
  return this;
}

addScalar(s: number): this {
  this.x += s;
  this.y += s;
  this.z += s;
  return this;
}

addVectors(a: Vector3, b: Vector3): this {
  this.x = a.x + b.x;
  this.y = a.y + b.y;
  this.z = a.z + b.z;
  return this;
}

addScaledVector(v: Vector3, s: number): this {
  this.x += v.x * s;
  this.y += v.y * s;
  this.z += v.z * s;
  return this;
}

// 减法
sub(v: Vector3): this {
  this.x -= v.x;
  this.y -= v.y;
  this.z -= v.z;
  return this;
}

subScalar(s: number): this {
  this.x -= s;
  this.y -= s;
  this.z -= s;
  return this;
}

subVectors(a: Vector3, b: Vector3): this {
  this.x = a.x - b.x;
  this.y = a.y - b.y;
  this.z = a.z - b.z;
  return this;
}

// 乘法（分量相乘）
multiply(v: Vector3): this {
  this.x *= v.x;
  this.y *= v.y;
  this.z *= v.z;
  return this;
}

multiplyScalar(scalar: number): this {
  this.x *= scalar;
  this.y *= scalar;
  this.z *= scalar;
  return this;
}

multiplyVectors(a: Vector3, b: Vector3): this {
  this.x = a.x * b.x;
  this.y = a.y * b.y;
  this.z = a.z * b.z;
  return this;
}

// 除法
divide(v: Vector3): this {
  this.x /= v.x;
  this.y /= v.y;
  this.z /= v.z;
  return this;
}

divideScalar(scalar: number): this {
  return this.multiplyScalar(1 / scalar);
}
```

## 向量长度

### 长度计算

```
|v| = √(x² + y² + z²)
```

```typescript
length(): number {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
}

lengthSq(): number {
  return this.x * this.x + this.y * this.y + this.z * this.z;
}

// 曼哈顿长度（L1 范数）
manhattanLength(): number {
  return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
}
```

### 归一化

```typescript
normalize(): this {
  return this.divideScalar(this.length() || 1);
}

setLength(length: number): this {
  return this.normalize().multiplyScalar(length);
}
```

## 点积

### 几何意义

```
a · b = |a| |b| cos(θ)
a · b = ax*bx + ay*by + az*bz
```

```
        a
       /
      /θ
     /──────
    ────────→ b
    
当 θ = 0°  时，a · b = |a||b| (同向)
当 θ = 90° 时，a · b = 0     (垂直)
当 θ = 180°时，a · b = -|a||b| (反向)
```

### 实现

```typescript
dot(v: Vector3): number {
  return this.x * v.x + this.y * v.y + this.z * v.z;
}
```

### 应用场景

```typescript
// 1. 判断夹角关系
const facing = camera.getWorldDirection(new Vector3());
const toTarget = target.clone().sub(camera.position).normalize();

const dot = facing.dot(toTarget);
if (dot > 0) {
  console.log('目标在相机前方');
} else if (dot < 0) {
  console.log('目标在相机后方');
} else {
  console.log('目标在相机侧面');
}

// 2. 计算投影
function projectOnto(v: Vector3, onto: Vector3): Vector3 {
  // proj = (v · onto / |onto|²) * onto
  const dot = v.dot(onto);
  const lenSq = onto.lengthSq();
  return onto.clone().multiplyScalar(dot / lenSq);
}

// 3. 光照强度
const lightIntensity = Math.max(0, normal.dot(lightDirection));
```

## 叉积

### 几何意义

```
a × b = |a| |b| sin(θ) n
```

叉积结果是一个垂直于 a 和 b 的向量。

```
        c = a × b
        ↑
        │
        │   b
        │  /
        │ /
        │/
        ────→ a
```

### 实现

```typescript
cross(v: Vector3): this {
  return this.crossVectors(this, v);
}

crossVectors(a: Vector3, b: Vector3): this {
  const ax = a.x, ay = a.y, az = a.z;
  const bx = b.x, by = b.y, bz = b.z;
  
  this.x = ay * bz - az * by;
  this.y = az * bx - ax * bz;
  this.z = ax * by - ay * bx;
  
  return this;
}
```

### 应用场景

```typescript
// 1. 计算法线
function computeNormal(p1: Vector3, p2: Vector3, p3: Vector3): Vector3 {
  const edge1 = p2.clone().sub(p1);
  const edge2 = p3.clone().sub(p1);
  return edge1.cross(edge2).normalize();
}

// 2. 判断旋转方向
const cross = a.clone().cross(b);
if (cross.z > 0) {
  console.log('逆时针旋转');
} else {
  console.log('顺时针旋转');
}

// 3. 构建正交基
function buildOrthonormalBasis(forward: Vector3): { right: Vector3; up: Vector3 } {
  const up = new Vector3(0, 1, 0);
  
  // 避免 forward 与 up 平行
  if (Math.abs(forward.dot(up)) > 0.9999) {
    up.set(1, 0, 0);
  }
  
  const right = forward.clone().cross(up).normalize();
  const realUp = right.clone().cross(forward).normalize();
  
  return { right, up: realUp };
}
```

## 距离与角度

### 距离计算

```typescript
distanceTo(v: Vector3): number {
  return Math.sqrt(this.distanceToSquared(v));
}

distanceToSquared(v: Vector3): number {
  const dx = this.x - v.x;
  const dy = this.y - v.y;
  const dz = this.z - v.z;
  return dx * dx + dy * dy + dz * dz;
}

// 曼哈顿距离
manhattanDistanceTo(v: Vector3): number {
  return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
}
```

### 角度计算

```typescript
angleTo(v: Vector3): number {
  const denominator = Math.sqrt(this.lengthSq() * v.lengthSq());
  if (denominator === 0) return Math.PI / 2;
  
  const theta = this.dot(v) / denominator;
  // 限制在 [-1, 1] 避免浮点误差
  return Math.acos(Math.max(-1, Math.min(1, theta)));
}
```

## 插值

### 线性插值

```typescript
lerp(v: Vector3, alpha: number): this {
  this.x += (v.x - this.x) * alpha;
  this.y += (v.y - this.y) * alpha;
  this.z += (v.z - this.z) * alpha;
  return this;
}

lerpVectors(v1: Vector3, v2: Vector3, alpha: number): this {
  this.x = v1.x + (v2.x - v1.x) * alpha;
  this.y = v1.y + (v2.y - v1.y) * alpha;
  this.z = v1.z + (v2.z - v1.z) * alpha;
  return this;
}
```

### 球面插值

用于方向向量的平滑过渡。

```typescript
// 简化版 slerp（用于单位向量）
slerp(v: Vector3, t: number): this {
  const dot = this.dot(v);
  
  // 如果几乎相同，使用 lerp
  if (Math.abs(dot) > 0.9999) {
    return this.lerp(v, t);
  }
  
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  
  const a = Math.sin((1 - t) * theta) / sinTheta;
  const b = Math.sin(t * theta) / sinTheta;
  
  this.x = this.x * a + v.x * b;
  this.y = this.y * a + v.y * b;
  this.z = this.z * a + v.z * b;
  
  return this;
}
```

## 变换

### 矩阵变换

```typescript
applyMatrix3(m: Matrix3): this {
  const x = this.x, y = this.y, z = this.z;
  const e = m.elements;
  
  this.x = e[0] * x + e[3] * y + e[6] * z;
  this.y = e[1] * x + e[4] * y + e[7] * z;
  this.z = e[2] * x + e[5] * y + e[8] * z;
  
  return this;
}

applyMatrix4(m: Matrix4): this {
  const x = this.x, y = this.y, z = this.z;
  const e = m.elements;
  
  const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
  
  this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
  this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
  this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
  
  return this;
}

applyNormalMatrix(m: Matrix3): this {
  return this.applyMatrix3(m).normalize();
}
```

### 四元数旋转

```typescript
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

### 欧拉角旋转

```typescript
applyEuler(euler: Euler): this {
  return this.applyQuaternion(_quaternion.setFromEuler(euler));
}

applyAxisAngle(axis: Vector3, angle: number): this {
  return this.applyQuaternion(_quaternion.setFromAxisAngle(axis, angle));
}
```

## 投影

### 相机投影

```typescript
// 世界坐标 → NDC
project(camera: Camera): this {
  return this.applyMatrix4(camera.matrixWorldInverse)
    .applyMatrix4(camera.projectionMatrix);
}

// NDC → 世界坐标
unproject(camera: Camera): this {
  return this.applyMatrix4(camera.projectionMatrixInverse)
    .applyMatrix4(camera.matrixWorld);
}
```

### 反射

```typescript
reflect(normal: Vector3): this {
  // v' = v - 2 * (v · n) * n
  return this.sub(_vector.copy(normal).multiplyScalar(2 * this.dot(normal)));
}
```

## 辅助方法

### 限制与取整

```typescript
min(v: Vector3): this {
  this.x = Math.min(this.x, v.x);
  this.y = Math.min(this.y, v.y);
  this.z = Math.min(this.z, v.z);
  return this;
}

max(v: Vector3): this {
  this.x = Math.max(this.x, v.x);
  this.y = Math.max(this.y, v.y);
  this.z = Math.max(this.z, v.z);
  return this;
}

clamp(min: Vector3, max: Vector3): this {
  this.x = Math.max(min.x, Math.min(max.x, this.x));
  this.y = Math.max(min.y, Math.min(max.y, this.y));
  this.z = Math.max(min.z, Math.min(max.z, this.z));
  return this;
}

clampScalar(minVal: number, maxVal: number): this {
  this.x = Math.max(minVal, Math.min(maxVal, this.x));
  this.y = Math.max(minVal, Math.min(maxVal, this.y));
  this.z = Math.max(minVal, Math.min(maxVal, this.z));
  return this;
}

clampLength(min: number, max: number): this {
  const length = this.length();
  return this.divideScalar(length || 1)
    .multiplyScalar(Math.max(min, Math.min(max, length)));
}

floor(): this {
  this.x = Math.floor(this.x);
  this.y = Math.floor(this.y);
  this.z = Math.floor(this.z);
  return this;
}

ceil(): this {
  this.x = Math.ceil(this.x);
  this.y = Math.ceil(this.y);
  this.z = Math.ceil(this.z);
  return this;
}

round(): this {
  this.x = Math.round(this.x);
  this.y = Math.round(this.y);
  this.z = Math.round(this.z);
  return this;
}

negate(): this {
  this.x = -this.x;
  this.y = -this.y;
  this.z = -this.z;
  return this;
}
```

### 随机向量

```typescript
random(): this {
  this.x = Math.random();
  this.y = Math.random();
  this.z = Math.random();
  return this;
}

randomDirection(): this {
  // 均匀分布在球面上
  const u = (Math.random() - 0.5) * 2;
  const t = Math.random() * Math.PI * 2;
  const f = Math.sqrt(1 - u * u);
  
  this.x = f * Math.cos(t);
  this.y = f * Math.sin(t);
  this.z = u;
  
  return this;
}
```

### 数组转换

```typescript
fromArray(array: number[], offset = 0): this {
  this.x = array[offset];
  this.y = array[offset + 1];
  this.z = array[offset + 2];
  return this;
}

toArray(array: number[] = [], offset = 0): number[] {
  array[offset] = this.x;
  array[offset + 1] = this.y;
  array[offset + 2] = this.z;
  return array;
}

fromBufferAttribute(attribute: BufferAttribute, index: number): this {
  this.x = attribute.getX(index);
  this.y = attribute.getY(index);
  this.z = attribute.getZ(index);
  return this;
}
```

### 比较

```typescript
equals(v: Vector3): boolean {
  return v.x === this.x && v.y === this.y && v.z === this.z;
}
```

## 静态临时变量

```typescript
// 在类外部定义，避免重复创建
const _vector = new Vector3();
const _quaternion = new Quaternion();
```

## Vector2 和 Vector4

### Vector2

```typescript
export class Vector2 {
  x: number;
  y: number;
  
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  // 类似 Vector3 的方法，但只有 x, y 分量
  
  // 2D 特有方法
  cross(v: Vector2): number {
    // 2D 叉积返回标量（z 分量）
    return this.x * v.y - this.y * v.x;
  }
  
  angle(): number {
    // 返回与 x 正方向的夹角
    return Math.atan2(-this.y, -this.x) + Math.PI;
  }
  
  rotateAround(center: Vector2, angle: number): this {
    const c = Math.cos(angle), s = Math.sin(angle);
    const x = this.x - center.x;
    const y = this.y - center.y;
    
    this.x = x * c - y * s + center.x;
    this.y = x * s + y * c + center.y;
    
    return this;
  }
}
```

### Vector4

```typescript
export class Vector4 {
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
  
  // 类似 Vector3 的方法，增加 w 分量
  
  // 齐次除法（用于投影后的坐标）
  divideByW(): this {
    if (this.w !== 0) {
      this.x /= this.w;
      this.y /= this.w;
      this.z /= this.w;
      this.w = 1;
    }
    return this;
  }
}
```

## 本章小结

- Vector3 是 3D 图形的核心数据结构
- 点积用于计算投影和夹角
- 叉积用于计算法线和旋转方向
- 矩阵和四元数变换应用旋转缩放
- 链式调用让代码更简洁
- 复用临时变量减少 GC

下一章，我们将学习矩阵与矩阵运算。
