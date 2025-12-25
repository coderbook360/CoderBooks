# 常用数学工具函数

> "好的工具函数让复杂的数学变得简单，让代码更加优雅。"

## MathUtils 模块

### 角度转换

```typescript
// src/math/MathUtils.ts

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function degToRad(degrees: number): number {
  return degrees * DEG2RAD;
}

export function radToDeg(radians: number): number {
  return radians * RAD2DEG;
}
```

### 限制范围

```typescript
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 欧几里得取模（总是返回正数）
export function euclideanModulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}
```

### 插值

```typescript
// 线性插值
export function lerp(x: number, y: number, t: number): number {
  return (1 - t) * x + t * y;
}

// 反向插值：已知结果求 t
export function inverseLerp(x: number, y: number, value: number): number {
  if (x !== y) {
    return (value - x) / (y - x);
  }
  return 0;
}

// 重映射：从一个范围映射到另一个范围
export function mapLinear(
  x: number,
  a1: number, a2: number,
  b1: number, b2: number
): number {
  return b1 + (x - a1) * (b2 - b1) / (a2 - a1);
}

// 平滑步进（Hermite 插值）
export function smoothstep(x: number, min: number, max: number): number {
  if (x <= min) return 0;
  if (x >= max) return 1;
  
  x = (x - min) / (max - min);
  return x * x * (3 - 2 * x);
}

// 更平滑的步进（Ken Perlin 版本）
export function smootherstep(x: number, min: number, max: number): number {
  if (x <= min) return 0;
  if (x >= max) return 1;
  
  x = (x - min) / (max - min);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
```

### 插值曲线可视化

```
smoothstep:
1 │        ╭──────
  │       ╱
  │      ╱
  │     ╱
0 │────╯
  └──────────────→
    min       max

smootherstep:
1 │         ╭─────
  │        ╱
  │       ╱
  │      ╱
0 │─────╯
  └──────────────→
    min       max
```

### 随机数

```typescript
// 随机浮点数 [low, high)
export function randFloat(low: number, high: number): number {
  return low + Math.random() * (high - low);
}

// 随机整数 [low, high]
export function randInt(low: number, high: number): number {
  return low + Math.floor(Math.random() * (high - low + 1));
}

// 随机浮点数 [-range/2, range/2)
export function randFloatSpread(range: number): number {
  return range * (0.5 - Math.random());
}

// 确定性随机（基于种子）
export function seededRandom(seed: number): number {
  // Park-Miller 算法
  const a = 16807;
  const m = 2147483647;
  seed = (a * seed) % m;
  return seed / m;
}
```

### 2 的幂

```typescript
export function isPowerOfTwo(value: number): boolean {
  return (value & (value - 1)) === 0 && value !== 0;
}

// 向上取到最近的 2 的幂
export function ceilPowerOfTwo(value: number): number {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

// 向下取到最近的 2 的幂
export function floorPowerOfTwo(value: number): number {
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}
```

### UUID 生成

```typescript
const _lut: string[] = [];

for (let i = 0; i < 256; i++) {
  _lut[i] = (i < 16 ? '0' : '') + i.toString(16);
}

export function generateUUID(): string {
  const d0 = Math.random() * 0xffffffff | 0;
  const d1 = Math.random() * 0xffffffff | 0;
  const d2 = Math.random() * 0xffffffff | 0;
  const d3 = Math.random() * 0xffffffff | 0;
  
  return (
    _lut[d0 & 0xff] + _lut[d0 >> 8 & 0xff] + 
    _lut[d0 >> 16 & 0xff] + _lut[d0 >> 24 & 0xff] + '-' +
    _lut[d1 & 0xff] + _lut[d1 >> 8 & 0xff] + '-' +
    _lut[d1 >> 16 & 0x0f | 0x40] + _lut[d1 >> 24 & 0xff] + '-' +
    _lut[d2 & 0x3f | 0x80] + _lut[d2 >> 8 & 0xff] + '-' +
    _lut[d2 >> 16 & 0xff] + _lut[d2 >> 24 & 0xff] +
    _lut[d3 & 0xff] + _lut[d3 >> 8 & 0xff] +
    _lut[d3 >> 16 & 0xff] + _lut[d3 >> 24 & 0xff]
  );
}
```

### 阻尼/弹簧

```typescript
// 指数衰减（用于相机跟随等）
export function damp(
  x: number,
  y: number,
  lambda: number,
  dt: number
): number {
  return lerp(x, y, 1 - Math.exp(-lambda * dt));
}

// 乒乓效果（往返循环）
export function pingpong(x: number, length = 1): number {
  return length - Math.abs(euclideanModulo(x, length * 2) - length);
}
```

## 几何工具

### Box3 包围盒

```typescript
// src/math/Box3.ts
export class Box3 {
  min: Vector3;
  max: Vector3;
  
  constructor(
    min = new Vector3(+Infinity, +Infinity, +Infinity),
    max = new Vector3(-Infinity, -Infinity, -Infinity)
  ) {
    this.min = min;
    this.max = max;
  }
  
  set(min: Vector3, max: Vector3): this {
    this.min.copy(min);
    this.max.copy(max);
    return this;
  }
  
  setFromPoints(points: Vector3[]): this {
    this.makeEmpty();
    
    for (let i = 0; i < points.length; i++) {
      this.expandByPoint(points[i]);
    }
    
    return this;
  }
  
  setFromCenterAndSize(center: Vector3, size: Vector3): this {
    const halfSize = _vector.copy(size).multiplyScalar(0.5);
    
    this.min.copy(center).sub(halfSize);
    this.max.copy(center).add(halfSize);
    
    return this;
  }
  
  setFromObject(object: Object3D, precise = false): this {
    this.makeEmpty();
    return this.expandByObject(object, precise);
  }
  
  makeEmpty(): this {
    this.min.x = this.min.y = this.min.z = +Infinity;
    this.max.x = this.max.y = this.max.z = -Infinity;
    return this;
  }
  
  isEmpty(): boolean {
    return (
      this.max.x < this.min.x ||
      this.max.y < this.min.y ||
      this.max.z < this.min.z
    );
  }
  
  getCenter(target: Vector3): Vector3 {
    return this.isEmpty()
      ? target.set(0, 0, 0)
      : target.addVectors(this.min, this.max).multiplyScalar(0.5);
  }
  
  getSize(target: Vector3): Vector3 {
    return this.isEmpty()
      ? target.set(0, 0, 0)
      : target.subVectors(this.max, this.min);
  }
  
  expandByPoint(point: Vector3): this {
    this.min.min(point);
    this.max.max(point);
    return this;
  }
  
  expandByVector(vector: Vector3): this {
    this.min.sub(vector);
    this.max.add(vector);
    return this;
  }
  
  expandByScalar(scalar: number): this {
    this.min.addScalar(-scalar);
    this.max.addScalar(scalar);
    return this;
  }
  
  expandByObject(object: Object3D, precise = false): this {
    object.updateWorldMatrix(false, false);
    
    if (object.geometry !== undefined) {
      const geometry = object.geometry;
      
      if (precise && geometry.attributes.position !== undefined) {
        const position = geometry.attributes.position;
        
        for (let i = 0; i < position.count; i++) {
          _vector.fromBufferAttribute(position, i)
            .applyMatrix4(object.matrixWorld);
          this.expandByPoint(_vector);
        }
      } else {
        if (geometry.boundingBox === null) {
          geometry.computeBoundingBox();
        }
        
        _box.copy(geometry.boundingBox!);
        _box.applyMatrix4(object.matrixWorld);
        this.union(_box);
      }
    }
    
    for (const child of object.children) {
      this.expandByObject(child, precise);
    }
    
    return this;
  }
  
  containsPoint(point: Vector3): boolean {
    return !(
      point.x < this.min.x || point.x > this.max.x ||
      point.y < this.min.y || point.y > this.max.y ||
      point.z < this.min.z || point.z > this.max.z
    );
  }
  
  containsBox(box: Box3): boolean {
    return (
      this.min.x <= box.min.x && box.max.x <= this.max.x &&
      this.min.y <= box.min.y && box.max.y <= this.max.y &&
      this.min.z <= box.min.z && box.max.z <= this.max.z
    );
  }
  
  intersectsBox(box: Box3): boolean {
    return !(
      box.max.x < this.min.x || box.min.x > this.max.x ||
      box.max.y < this.min.y || box.min.y > this.max.y ||
      box.max.z < this.min.z || box.min.z > this.max.z
    );
  }
  
  intersectsSphere(sphere: Sphere): boolean {
    this.clampPoint(sphere.center, _vector);
    return _vector.distanceToSquared(sphere.center) <= 
           sphere.radius * sphere.radius;
  }
  
  clampPoint(point: Vector3, target: Vector3): Vector3 {
    return target.copy(point).clamp(this.min, this.max);
  }
  
  distanceToPoint(point: Vector3): number {
    return this.clampPoint(point, _vector).distanceTo(point);
  }
  
  union(box: Box3): this {
    this.min.min(box.min);
    this.max.max(box.max);
    return this;
  }
  
  intersect(box: Box3): this {
    this.min.max(box.min);
    this.max.min(box.max);
    
    if (this.isEmpty()) this.makeEmpty();
    
    return this;
  }
  
  applyMatrix4(matrix: Matrix4): this {
    if (this.isEmpty()) return this;
    
    // 8 个角点变换后重新计算
    _points[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(matrix);
    _points[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(matrix);
    _points[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(matrix);
    _points[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(matrix);
    _points[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(matrix);
    _points[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(matrix);
    _points[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(matrix);
    _points[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(matrix);
    
    this.setFromPoints(_points);
    
    return this;
  }
}
```

### Sphere 包围球

```typescript
// src/math/Sphere.ts
export class Sphere {
  center: Vector3;
  radius: number;
  
  constructor(center = new Vector3(), radius = -1) {
    this.center = center;
    this.radius = radius;
  }
  
  set(center: Vector3, radius: number): this {
    this.center.copy(center);
    this.radius = radius;
    return this;
  }
  
  setFromPoints(points: Vector3[], optionalCenter?: Vector3): this {
    const center = this.center;
    
    if (optionalCenter !== undefined) {
      center.copy(optionalCenter);
    } else {
      _box.setFromPoints(points).getCenter(center);
    }
    
    let maxRadiusSq = 0;
    
    for (let i = 0; i < points.length; i++) {
      maxRadiusSq = Math.max(maxRadiusSq, 
        center.distanceToSquared(points[i]));
    }
    
    this.radius = Math.sqrt(maxRadiusSq);
    
    return this;
  }
  
  isEmpty(): boolean {
    return this.radius < 0;
  }
  
  makeEmpty(): this {
    this.center.set(0, 0, 0);
    this.radius = -1;
    return this;
  }
  
  containsPoint(point: Vector3): boolean {
    return point.distanceToSquared(this.center) <= 
           this.radius * this.radius;
  }
  
  distanceToPoint(point: Vector3): number {
    return point.distanceTo(this.center) - this.radius;
  }
  
  intersectsSphere(sphere: Sphere): boolean {
    const radiusSum = this.radius + sphere.radius;
    return sphere.center.distanceToSquared(this.center) <= 
           radiusSum * radiusSum;
  }
  
  intersectsBox(box: Box3): boolean {
    return box.intersectsSphere(this);
  }
  
  clampPoint(point: Vector3, target: Vector3): Vector3 {
    const deltaLengthSq = this.center.distanceToSquared(point);
    
    target.copy(point);
    
    if (deltaLengthSq > this.radius * this.radius) {
      target.sub(this.center).normalize();
      target.multiplyScalar(this.radius).add(this.center);
    }
    
    return target;
  }
  
  getBoundingBox(target: Box3): Box3 {
    if (this.isEmpty()) {
      target.makeEmpty();
      return target;
    }
    
    target.set(this.center, this.center);
    target.expandByScalar(this.radius);
    
    return target;
  }
  
  applyMatrix4(matrix: Matrix4): this {
    this.center.applyMatrix4(matrix);
    this.radius = this.radius * matrix.getMaxScaleOnAxis();
    return this;
  }
  
  expandByPoint(point: Vector3): this {
    if (this.isEmpty()) {
      this.center.copy(point);
      this.radius = 0;
      return this;
    }
    
    _vector.subVectors(point, this.center);
    const lengthSq = _vector.lengthSq();
    
    if (lengthSq > this.radius * this.radius) {
      const length = Math.sqrt(lengthSq);
      const delta = (length - this.radius) * 0.5;
      
      this.center.addScaledVector(_vector, delta / length);
      this.radius += delta;
    }
    
    return this;
  }
  
  union(sphere: Sphere): this {
    if (sphere.isEmpty()) return this;
    
    if (this.isEmpty()) {
      this.copy(sphere);
      return this;
    }
    
    if (this.center.equals(sphere.center)) {
      this.radius = Math.max(this.radius, sphere.radius);
    } else {
      _vector.subVectors(sphere.center, this.center)
        .setLength(sphere.radius);
      this.expandByPoint(_vector.add(sphere.center));
      
      _vector.subVectors(sphere.center, this.center)
        .setLength(-sphere.radius);
      this.expandByPoint(_vector.add(sphere.center));
    }
    
    return this;
  }
}
```

### Ray 射线

```typescript
// src/math/Ray.ts
export class Ray {
  origin: Vector3;
  direction: Vector3;
  
  constructor(
    origin = new Vector3(),
    direction = new Vector3(0, 0, -1)
  ) {
    this.origin = origin;
    this.direction = direction;
  }
  
  set(origin: Vector3, direction: Vector3): this {
    this.origin.copy(origin);
    this.direction.copy(direction);
    return this;
  }
  
  at(t: number, target: Vector3): Vector3 {
    return target.copy(this.origin)
      .addScaledVector(this.direction, t);
  }
  
  lookAt(v: Vector3): this {
    this.direction.copy(v).sub(this.origin).normalize();
    return this;
  }
  
  distanceToPoint(point: Vector3): number {
    return Math.sqrt(this.distanceSqToPoint(point));
  }
  
  distanceSqToPoint(point: Vector3): number {
    const directionDistance = _vector.subVectors(point, this.origin)
      .dot(this.direction);
    
    if (directionDistance < 0) {
      return this.origin.distanceToSquared(point);
    }
    
    _vector.copy(this.origin)
      .addScaledVector(this.direction, directionDistance);
    
    return _vector.distanceToSquared(point);
  }
  
  closestPointToPoint(point: Vector3, target: Vector3): Vector3 {
    target.subVectors(point, this.origin);
    
    const directionDistance = target.dot(this.direction);
    
    if (directionDistance < 0) {
      return target.copy(this.origin);
    }
    
    return target.copy(this.origin)
      .addScaledVector(this.direction, directionDistance);
  }
  
  intersectBox(box: Box3, target: Vector3): Vector3 | null {
    let tmin, tmax, tymin, tymax, tzmin, tzmax;
    
    const invdirx = 1 / this.direction.x;
    const invdiry = 1 / this.direction.y;
    const invdirz = 1 / this.direction.z;
    
    const origin = this.origin;
    
    if (invdirx >= 0) {
      tmin = (box.min.x - origin.x) * invdirx;
      tmax = (box.max.x - origin.x) * invdirx;
    } else {
      tmin = (box.max.x - origin.x) * invdirx;
      tmax = (box.min.x - origin.x) * invdirx;
    }
    
    if (invdiry >= 0) {
      tymin = (box.min.y - origin.y) * invdiry;
      tymax = (box.max.y - origin.y) * invdiry;
    } else {
      tymin = (box.max.y - origin.y) * invdiry;
      tymax = (box.min.y - origin.y) * invdiry;
    }
    
    if ((tmin > tymax) || (tymin > tmax)) return null;
    
    if (tymin > tmin || isNaN(tmin)) tmin = tymin;
    if (tymax < tmax || isNaN(tmax)) tmax = tymax;
    
    if (invdirz >= 0) {
      tzmin = (box.min.z - origin.z) * invdirz;
      tzmax = (box.max.z - origin.z) * invdirz;
    } else {
      tzmin = (box.max.z - origin.z) * invdirz;
      tzmax = (box.min.z - origin.z) * invdirz;
    }
    
    if ((tmin > tzmax) || (tzmin > tmax)) return null;
    
    if (tzmin > tmin || tmin !== tmin) tmin = tzmin;
    if (tzmax < tmax || tmax !== tmax) tmax = tzmax;
    
    if (tmax < 0) return null;
    
    return this.at(tmin >= 0 ? tmin : tmax, target);
  }
  
  intersectSphere(sphere: Sphere, target: Vector3): Vector3 | null {
    _vector.subVectors(sphere.center, this.origin);
    const tca = _vector.dot(this.direction);
    const d2 = _vector.dot(_vector) - tca * tca;
    const radius2 = sphere.radius * sphere.radius;
    
    if (d2 > radius2) return null;
    
    const thc = Math.sqrt(radius2 - d2);
    
    // t0 = 第一个交点（更近）
    const t0 = tca - thc;
    
    // t1 = 第二个交点（更远）
    const t1 = tca + thc;
    
    // 两个交点都在射线后面
    if (t1 < 0) return null;
    
    // t0 在后面，t1 在前面（起点在球内）
    if (t0 < 0) return this.at(t1, target);
    
    // 两个都在前面，返回更近的
    return this.at(t0, target);
  }
  
  intersectTriangle(
    a: Vector3, b: Vector3, c: Vector3,
    backfaceCulling: boolean,
    target: Vector3
  ): Vector3 | null {
    // Möller–Trumbore 算法
    _edge1.subVectors(b, a);
    _edge2.subVectors(c, a);
    _normal.crossVectors(_edge1, _edge2);
    
    let DdN = this.direction.dot(_normal);
    let sign;
    
    if (DdN > 0) {
      if (backfaceCulling) return null;
      sign = 1;
    } else if (DdN < 0) {
      sign = -1;
      DdN = -DdN;
    } else {
      return null;
    }
    
    _diff.subVectors(this.origin, a);
    const DdQxE2 = sign * this.direction.dot(
      _edge2.crossVectors(_diff, _edge2)
    );
    
    if (DdQxE2 < 0) return null;
    
    const DdE1xQ = sign * this.direction.dot(_edge1.cross(_diff));
    
    if (DdE1xQ < 0) return null;
    
    if (DdQxE2 + DdE1xQ > DdN) return null;
    
    const QdN = -sign * _diff.dot(_normal);
    
    if (QdN < 0) return null;
    
    return this.at(QdN / DdN, target);
  }
}
```

### Plane 平面

```typescript
// src/math/Plane.ts
export class Plane {
  normal: Vector3;
  constant: number;
  
  constructor(
    normal = new Vector3(1, 0, 0),
    constant = 0
  ) {
    this.normal = normal;
    this.constant = constant;
  }
  
  set(normal: Vector3, constant: number): this {
    this.normal.copy(normal);
    this.constant = constant;
    return this;
  }
  
  setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): this {
    this.normal.copy(normal);
    this.constant = -point.dot(this.normal);
    return this;
  }
  
  setFromCoplanarPoints(a: Vector3, b: Vector3, c: Vector3): this {
    const normal = _vector1.subVectors(c, b)
      .cross(_vector2.subVectors(a, b))
      .normalize();
    
    this.setFromNormalAndCoplanarPoint(normal, a);
    
    return this;
  }
  
  normalize(): this {
    const inverseNormalLength = 1.0 / this.normal.length();
    this.normal.multiplyScalar(inverseNormalLength);
    this.constant *= inverseNormalLength;
    return this;
  }
  
  distanceToPoint(point: Vector3): number {
    return this.normal.dot(point) + this.constant;
  }
  
  distanceToSphere(sphere: Sphere): number {
    return this.distanceToPoint(sphere.center) - sphere.radius;
  }
  
  projectPoint(point: Vector3, target: Vector3): Vector3 {
    return target.copy(point).addScaledVector(
      this.normal,
      -this.distanceToPoint(point)
    );
  }
  
  intersectLine(line: Line3, target: Vector3): Vector3 | null {
    const direction = line.delta(_vector1);
    const denominator = this.normal.dot(direction);
    
    if (denominator === 0) {
      if (this.distanceToPoint(line.start) === 0) {
        return target.copy(line.start);
      }
      return null;
    }
    
    const t = -(line.start.dot(this.normal) + this.constant) / denominator;
    
    if (t < 0 || t > 1) return null;
    
    return target.copy(line.start).addScaledVector(direction, t);
  }
  
  coplanarPoint(target: Vector3): Vector3 {
    return target.copy(this.normal).multiplyScalar(-this.constant);
  }
  
  applyMatrix4(matrix: Matrix4, optionalNormalMatrix?: Matrix3): this {
    const normalMatrix = optionalNormalMatrix || 
      _normalMatrix.getNormalMatrix(matrix);
    
    const referencePoint = this.coplanarPoint(_vector1)
      .applyMatrix4(matrix);
    
    const normal = this.normal.applyMatrix3(normalMatrix).normalize();
    
    this.constant = -referencePoint.dot(normal);
    
    return this;
  }
}
```

## 静态变量

```typescript
// 文件内共享的临时变量
const _vector = new Vector3();
const _vector1 = new Vector3();
const _vector2 = new Vector3();
const _box = new Box3();
const _normalMatrix = new Matrix3();
const _points = [
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
  new Vector3(),
];
const _edge1 = new Vector3();
const _edge2 = new Vector3();
const _normal = new Vector3();
const _diff = new Vector3();
```

## 本章小结

- MathUtils 提供常用数学函数
- Box3 用于 AABB 碰撞检测
- Sphere 用于包围球检测
- Ray 用于射线检测
- Plane 用于平面相交计算
- 静态变量避免临时对象

下一章，我们将学习 Color 颜色类的实现。
