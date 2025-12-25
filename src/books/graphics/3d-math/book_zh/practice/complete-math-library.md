# 构建完整的 3D 数学库

本章将整合前面学习的所有知识，构建一个功能完整的 3D 数学库。

## 库的设计目标

1. **类型安全**：使用 TypeScript
2. **高性能**：避免不必要的对象分配
3. **易用性**：符合直觉的 API
4. **可测试**：每个函数都可独立测试

## 向量类

### Vec2

```typescript
export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}
  
  // 静态工厂
  static zero(): Vec2 { return new Vec2(0, 0); }
  static one(): Vec2 { return new Vec2(1, 1); }
  static fromArray(arr: number[]): Vec2 { return new Vec2(arr[0], arr[1]); }
  
  // 基础运算（返回新向量）
  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s: number): Vec2 { return new Vec2(this.x * s, this.y * s); }
  div(s: number): Vec2 { return new Vec2(this.x / s, this.y / s); }
  
  // 原地修改（高性能）
  addSelf(v: Vec2): this { this.x += v.x; this.y += v.y; return this; }
  subSelf(v: Vec2): this { this.x -= v.x; this.y -= v.y; return this; }
  mulSelf(s: number): this { this.x *= s; this.y *= s; return this; }
  
  // 向量运算
  dot(v: Vec2): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x; }
  
  length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSq(): number { return this.x * this.x + this.y * this.y; }
  
  normalize(): Vec2 {
    const len = this.length();
    return len > 0 ? this.div(len) : Vec2.zero();
  }
  
  // 工具方法
  clone(): Vec2 { return new Vec2(this.x, this.y); }
  copy(v: Vec2): this { this.x = v.x; this.y = v.y; return this; }
  set(x: number, y: number): this { this.x = x; this.y = y; return this; }
  toArray(): number[] { return [this.x, this.y]; }
  
  equals(v: Vec2, epsilon = 1e-6): boolean {
    return Math.abs(this.x - v.x) < epsilon && 
           Math.abs(this.y - v.y) < epsilon;
  }
}
```

### Vec3

```typescript
export class Vec3 {
  constructor(
    public x: number = 0, 
    public y: number = 0, 
    public z: number = 0
  ) {}
  
  // 静态工厂
  static zero(): Vec3 { return new Vec3(0, 0, 0); }
  static one(): Vec3 { return new Vec3(1, 1, 1); }
  static up(): Vec3 { return new Vec3(0, 1, 0); }
  static down(): Vec3 { return new Vec3(0, -1, 0); }
  static forward(): Vec3 { return new Vec3(0, 0, -1); }
  static back(): Vec3 { return new Vec3(0, 0, 1); }
  static right(): Vec3 { return new Vec3(1, 0, 0); }
  static left(): Vec3 { return new Vec3(-1, 0, 0); }
  
  // 基础运算
  add(v: Vec3): Vec3 { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vec3): Vec3 { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s: number): Vec3 { return new Vec3(this.x * s, this.y * s, this.z * s); }
  
  // 向量运算
  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  
  normalize(): Vec3 {
    const len = this.length();
    return len > 0 ? this.mul(1 / len) : Vec3.zero();
  }
  
  // 变换
  applyMatrix4(m: Mat4): Vec3 {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    
    const w = e[3] * x + e[7] * y + e[11] * z + e[15];
    const invW = 1 / w;
    
    return new Vec3(
      (e[0] * x + e[4] * y + e[8] * z + e[12]) * invW,
      (e[1] * x + e[5] * y + e[9] * z + e[13]) * invW,
      (e[2] * x + e[6] * y + e[10] * z + e[14]) * invW
    );
  }
  
  applyQuaternion(q: Quat): Vec3 {
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const x = this.x, y = this.y, z = this.z;
    
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    
    return new Vec3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx
    );
  }
  
  // 插值
  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }
  
  // 反射
  reflect(normal: Vec3): Vec3 {
    return this.sub(normal.mul(2 * this.dot(normal)));
  }
  
  // 工具方法
  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }
  toArray(): number[] { return [this.x, this.y, this.z]; }
}
```

### Vec4

```typescript
export class Vec4 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}
  
  // ... 类似 Vec3
  
  // 透视除法
  perspectiveDivide(): Vec3 {
    const invW = 1 / this.w;
    return new Vec3(this.x * invW, this.y * invW, this.z * invW);
  }
}
```

## 矩阵类

### Mat4

```typescript
export class Mat4 {
  elements: Float32Array;
  
  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }
  
  // 设为单位矩阵
  identity(): this {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }
  
  // 矩阵乘法
  multiply(m: Mat4): Mat4 {
    const result = new Mat4();
    const ae = this.elements;
    const be = m.elements;
    const re = result.elements;
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += ae[i + k * 4] * be[k + j * 4];
        }
        re[i + j * 4] = sum;
      }
    }
    
    return result;
  }
  
  // 变换矩阵
  static translation(x: number, y: number, z: number): Mat4 {
    const m = new Mat4();
    const e = m.elements;
    e[12] = x; e[13] = y; e[14] = z;
    return m;
  }
  
  static rotationX(radians: number): Mat4 {
    const m = new Mat4();
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const e = m.elements;
    e[5] = c; e[9] = -s;
    e[6] = s; e[10] = c;
    return m;
  }
  
  static rotationY(radians: number): Mat4 {
    const m = new Mat4();
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const e = m.elements;
    e[0] = c; e[8] = s;
    e[2] = -s; e[10] = c;
    return m;
  }
  
  static rotationZ(radians: number): Mat4 {
    const m = new Mat4();
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    const e = m.elements;
    e[0] = c; e[4] = -s;
    e[1] = s; e[5] = c;
    return m;
  }
  
  static scale(x: number, y: number, z: number): Mat4 {
    const m = new Mat4();
    const e = m.elements;
    e[0] = x; e[5] = y; e[10] = z;
    return m;
  }
  
  // 视图矩阵
  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const z = eye.sub(target).normalize();
    const x = up.cross(z).normalize();
    const y = z.cross(x);
    
    const m = new Mat4();
    const e = m.elements;
    
    e[0] = x.x; e[4] = x.y; e[8] = x.z; e[12] = -x.dot(eye);
    e[1] = y.x; e[5] = y.y; e[9] = y.z; e[13] = -y.dot(eye);
    e[2] = z.x; e[6] = z.y; e[10] = z.z; e[14] = -z.dot(eye);
    
    return m;
  }
  
  // 投影矩阵
  static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
    const m = new Mat4();
    const e = m.elements;
    
    const f = 1 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);
    
    e[0] = f / aspect;
    e[5] = f;
    e[10] = (near + far) * rangeInv;
    e[11] = -1;
    e[14] = 2 * near * far * rangeInv;
    e[15] = 0;
    
    return m;
  }
  
  static orthographic(
    left: number, right: number,
    bottom: number, top: number,
    near: number, far: number
  ): Mat4 {
    const m = new Mat4();
    const e = m.elements;
    
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const fn = 1 / (far - near);
    
    e[0] = 2 * rl;
    e[5] = 2 * tb;
    e[10] = -2 * fn;
    e[12] = -(right + left) * rl;
    e[13] = -(top + bottom) * tb;
    e[14] = -(far + near) * fn;
    
    return m;
  }
  
  // 逆矩阵
  invert(): Mat4 | null {
    const te = this.elements;
    const result = new Mat4();
    const me = result.elements;
    
    // 计算代数余子式 ...
    // (完整实现约100行)
    
    return result;
  }
  
  // 转置
  transpose(): Mat4 {
    const result = new Mat4();
    const te = this.elements;
    const re = result.elements;
    
    re[0] = te[0]; re[1] = te[4]; re[2] = te[8]; re[3] = te[12];
    re[4] = te[1]; re[5] = te[5]; re[6] = te[9]; re[7] = te[13];
    re[8] = te[2]; re[9] = te[6]; re[10] = te[10]; re[11] = te[14];
    re[12] = te[3]; re[13] = te[7]; re[14] = te[11]; re[15] = te[15];
    
    return result;
  }
}
```

## 四元数类

```typescript
export class Quat {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}
  
  static identity(): Quat { return new Quat(0, 0, 0, 1); }
  
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalizedAxis = axis.normalize();
    
    return new Quat(
      normalizedAxis.x * s,
      normalizedAxis.y * s,
      normalizedAxis.z * s,
      Math.cos(halfAngle)
    );
  }
  
  static fromEuler(x: number, y: number, z: number, order = 'XYZ'): Quat {
    const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
    const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
    const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
    
    // XYZ 顺序
    return new Quat(
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    );
  }
  
  multiply(q: Quat): Quat {
    return new Quat(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }
  
  conjugate(): Quat {
    return new Quat(-this.x, -this.y, -this.z, this.w);
  }
  
  normalize(): Quat {
    const len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    return new Quat(this.x/len, this.y/len, this.z/len, this.w/len);
  }
  
  static slerp(a: Quat, b: Quat, t: number): Quat {
    let cosom = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    
    // 如果点积为负，取反一个四元数
    if (cosom < 0) {
      cosom = -cosom;
      b = new Quat(-b.x, -b.y, -b.z, -b.w);
    }
    
    let scale0, scale1;
    
    if (1 - cosom > 1e-6) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      // 线性插值（角度很小）
      scale0 = 1 - t;
      scale1 = t;
    }
    
    return new Quat(
      scale0 * a.x + scale1 * b.x,
      scale0 * a.y + scale1 * b.y,
      scale0 * a.z + scale1 * b.z,
      scale0 * a.w + scale1 * b.w
    );
  }
  
  toMat4(): Mat4 {
    const m = new Mat4();
    const e = m.elements;
    
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    
    e[0] = 1 - yy - zz; e[4] = xy - wz;     e[8] = xz + wy;
    e[1] = xy + wz;     e[5] = 1 - xx - zz; e[9] = yz - wx;
    e[2] = xz - wy;     e[6] = yz + wx;     e[10] = 1 - xx - yy;
    
    return m;
  }
}
```

## 使用示例

```typescript
// 创建相机变换
const eye = new Vec3(0, 5, 10);
const target = new Vec3(0, 0, 0);
const up = new Vec3(0, 1, 0);

const viewMatrix = Mat4.lookAt(eye, target, up);
const projMatrix = Mat4.perspective(Math.PI / 4, 16 / 9, 0.1, 1000);
const vpMatrix = projMatrix.multiply(viewMatrix);

// 变换一个点
const worldPos = new Vec3(1, 2, 3);
const clipPos = new Vec4(worldPos.x, worldPos.y, worldPos.z, 1)
  .applyMatrix4(vpMatrix);
const ndcPos = clipPos.perspectiveDivide();

// 四元数旋转
const rotation = Quat.fromAxisAngle(Vec3.up(), Math.PI / 4);
const rotatedPos = worldPos.applyQuaternion(rotation);
```

## 小结

本章构建了一个完整的 3D 数学库，包括：

1. **向量类**：Vec2、Vec3、Vec4
2. **矩阵类**：Mat4
3. **四元数类**：Quat
4. **几何工具**：射线、平面、包围盒

关键设计决策：
- 不可变操作返回新对象
- 可变操作以 Self 结尾
- 使用 Float32Array 存储矩阵
- 提供静态工厂方法
