# BufferGeometry 设计与实现

> "BufferGeometry 是顶点数据的容器，是 GPU 渲染的基础。"

## BufferGeometry 概述

### 职责

BufferGeometry 负责存储和管理顶点数据：
- 位置（position）
- 法线（normal）
- 纹理坐标（uv）
- 颜色（color）
- 索引（index）
- 自定义属性

### 与旧版 Geometry 的区别

| 特性 | Geometry (已废弃) | BufferGeometry |
|------|------------------|----------------|
| 存储方式 | JavaScript 对象 | TypedArray |
| GPU 上传 | 需要转换 | 直接上传 |
| 内存效率 | 较低 | 较高 |
| 修改方式 | 直观 | 需要更新标记 |

## BufferAttribute

### 基础结构

```typescript
// src/core/BufferAttribute.ts
export class BufferAttribute {
  readonly isBufferAttribute = true;
  
  name: string;
  array: TypedArray;
  itemSize: number;
  count: number;
  normalized: boolean;
  
  usage: number;
  updateRange: { offset: number; count: number };
  
  version: number;
  
  constructor(
    array: TypedArray,
    itemSize: number,
    normalized = false
  ) {
    if (Array.isArray(array)) {
      throw new TypeError('BufferAttribute: array should be a TypedArray.');
    }
    
    this.name = '';
    this.array = array;
    this.itemSize = itemSize;
    this.count = array.length / itemSize;
    this.normalized = normalized;
    
    this.usage = StaticDrawUsage;
    this.updateRange = { offset: 0, count: -1 };
    
    this.version = 0;
  }
  
  set needsUpdate(value: boolean) {
    if (value) this.version++;
  }
  
  setUsage(value: number): this {
    this.usage = value;
    return this;
  }
}
```

### 数据访问

```typescript
getX(index: number): number {
  return this.array[index * this.itemSize];
}

setX(index: number, x: number): this {
  this.array[index * this.itemSize] = x;
  return this;
}

getY(index: number): number {
  return this.array[index * this.itemSize + 1];
}

setY(index: number, y: number): this {
  this.array[index * this.itemSize + 1] = y;
  return this;
}

getZ(index: number): number {
  return this.array[index * this.itemSize + 2];
}

setZ(index: number, z: number): this {
  this.array[index * this.itemSize + 2] = z;
  return this;
}

getW(index: number): number {
  return this.array[index * this.itemSize + 3];
}

setW(index: number, w: number): this {
  this.array[index * this.itemSize + 3] = w;
  return this;
}

setXY(index: number, x: number, y: number): this {
  index *= this.itemSize;
  this.array[index] = x;
  this.array[index + 1] = y;
  return this;
}

setXYZ(index: number, x: number, y: number, z: number): this {
  index *= this.itemSize;
  this.array[index] = x;
  this.array[index + 1] = y;
  this.array[index + 2] = z;
  return this;
}

setXYZW(index: number, x: number, y: number, z: number, w: number): this {
  index *= this.itemSize;
  this.array[index] = x;
  this.array[index + 1] = y;
  this.array[index + 2] = z;
  this.array[index + 3] = w;
  return this;
}
```

### 批量操作

```typescript
copyArray(array: number[]): this {
  this.array.set(array);
  return this;
}

copyAt(index1: number, attribute: BufferAttribute, index2: number): this {
  index1 *= this.itemSize;
  index2 *= attribute.itemSize;
  
  for (let i = 0; i < this.itemSize; i++) {
    this.array[index1 + i] = attribute.array[index2 + i];
  }
  
  return this;
}

set(value: number[] | TypedArray, offset = 0): this {
  this.array.set(value, offset);
  return this;
}

clone(): BufferAttribute {
  return new BufferAttribute(
    this.array.slice() as TypedArray,
    this.itemSize,
    this.normalized
  ).copy(this);
}

copy(source: BufferAttribute): this {
  this.name = source.name;
  this.array = new (source.array.constructor as any)(source.array);
  this.itemSize = source.itemSize;
  this.count = source.count;
  this.normalized = source.normalized;
  this.usage = source.usage;
  return this;
}
```

### 变换

```typescript
applyMatrix3(m: Matrix3): this {
  if (this.itemSize === 2) {
    for (let i = 0; i < this.count; i++) {
      _vector2.fromBufferAttribute(this, i);
      _vector2.applyMatrix3(m);
      this.setXY(i, _vector2.x, _vector2.y);
    }
  } else if (this.itemSize === 3) {
    for (let i = 0; i < this.count; i++) {
      _vector.fromBufferAttribute(this, i);
      _vector.applyMatrix3(m);
      this.setXYZ(i, _vector.x, _vector.y, _vector.z);
    }
  }
  return this;
}

applyMatrix4(m: Matrix4): this {
  for (let i = 0; i < this.count; i++) {
    _vector.fromBufferAttribute(this, i);
    _vector.applyMatrix4(m);
    this.setXYZ(i, _vector.x, _vector.y, _vector.z);
  }
  return this;
}

applyNormalMatrix(m: Matrix3): this {
  for (let i = 0; i < this.count; i++) {
    _vector.fromBufferAttribute(this, i);
    _vector.applyNormalMatrix(m);
    this.setXYZ(i, _vector.x, _vector.y, _vector.z);
  }
  return this;
}

transformDirection(m: Matrix4): this {
  for (let i = 0; i < this.count; i++) {
    _vector.fromBufferAttribute(this, i);
    _vector.transformDirection(m);
    this.setXYZ(i, _vector.x, _vector.y, _vector.z);
  }
  return this;
}
```

## BufferGeometry

### 基础结构

```typescript
// src/core/BufferGeometry.ts
import { EventDispatcher } from './EventDispatcher';
import { BufferAttribute } from './BufferAttribute';
import { Box3 } from '../math/Box3';
import { Sphere } from '../math/Sphere';
import { Vector3 } from '../math/Vector3';
import { Matrix4 } from '../math/Matrix4';
import { Matrix3 } from '../math/Matrix3';
import { MathUtils } from '../math/MathUtils';

let _id = 0;

const _m1 = new Matrix4();
const _obj = new Object3D();
const _offset = new Vector3();
const _box = new Box3();
const _boxMorphTargets = new Box3();
const _vector = new Vector3();

export class BufferGeometry extends EventDispatcher {
  readonly isBufferGeometry = true;
  readonly id: number;
  uuid: string;
  name: string;
  type: string;
  
  index: BufferAttribute | null;
  attributes: Record<string, BufferAttribute>;
  morphAttributes: Record<string, BufferAttribute[]>;
  morphTargetsRelative: boolean;
  
  groups: Array<{ start: number; count: number; materialIndex: number }>;
  
  boundingBox: Box3 | null;
  boundingSphere: Sphere | null;
  
  drawRange: { start: number; count: number };
  
  userData: Record<string, unknown>;
  
  constructor() {
    super();
    
    this.id = _id++;
    this.uuid = MathUtils.generateUUID();
    this.name = '';
    this.type = 'BufferGeometry';
    
    this.index = null;
    this.attributes = {};
    this.morphAttributes = {};
    this.morphTargetsRelative = false;
    
    this.groups = [];
    
    this.boundingBox = null;
    this.boundingSphere = null;
    
    this.drawRange = { start: 0, count: Infinity };
    
    this.userData = {};
  }
}
```

### 索引

```typescript
getIndex(): BufferAttribute | null {
  return this.index;
}

setIndex(index: BufferAttribute | number[] | null): this {
  if (Array.isArray(index)) {
    this.index = new BufferAttribute(
      new (arrayNeedsUint32(index) ? Uint32Array : Uint16Array)(index),
      1
    );
  } else {
    this.index = index;
  }
  return this;
}

function arrayNeedsUint32(array: number[]): boolean {
  for (let i = 0; i < array.length; i++) {
    if (array[i] >= 65535) return true;
  }
  return false;
}
```

### 属性管理

```typescript
getAttribute(name: string): BufferAttribute | undefined {
  return this.attributes[name];
}

setAttribute(name: string, attribute: BufferAttribute): this {
  this.attributes[name] = attribute;
  return this;
}

deleteAttribute(name: string): this {
  delete this.attributes[name];
  return this;
}

hasAttribute(name: string): boolean {
  return this.attributes[name] !== undefined;
}

getAttributeNames(): string[] {
  return Object.keys(this.attributes);
}
```

### 分组

用于多材质渲染：

```typescript
addGroup(start: number, count: number, materialIndex = 0): void {
  this.groups.push({ start, count, materialIndex });
}

clearGroups(): void {
  this.groups = [];
}

setDrawRange(start: number, count: number): void {
  this.drawRange.start = start;
  this.drawRange.count = count;
}
```

### 变换

```typescript
applyMatrix4(matrix: Matrix4): this {
  const position = this.attributes.position;
  
  if (position !== undefined) {
    position.applyMatrix4(matrix);
    position.needsUpdate = true;
  }
  
  const normal = this.attributes.normal;
  
  if (normal !== undefined) {
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    normal.applyNormalMatrix(normalMatrix);
    normal.needsUpdate = true;
  }
  
  const tangent = this.attributes.tangent;
  
  if (tangent !== undefined) {
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    tangent.applyNormalMatrix(normalMatrix);
    tangent.needsUpdate = true;
  }
  
  if (this.boundingBox !== null) {
    this.computeBoundingBox();
  }
  
  if (this.boundingSphere !== null) {
    this.computeBoundingSphere();
  }
  
  return this;
}

applyQuaternion(q: Quaternion): this {
  _m1.makeRotationFromQuaternion(q);
  this.applyMatrix4(_m1);
  return this;
}

rotateX(angle: number): this {
  _m1.makeRotationX(angle);
  this.applyMatrix4(_m1);
  return this;
}

rotateY(angle: number): this {
  _m1.makeRotationY(angle);
  this.applyMatrix4(_m1);
  return this;
}

rotateZ(angle: number): this {
  _m1.makeRotationZ(angle);
  this.applyMatrix4(_m1);
  return this;
}

translate(x: number, y: number, z: number): this {
  _m1.makeTranslation(x, y, z);
  this.applyMatrix4(_m1);
  return this;
}

scale(x: number, y: number, z: number): this {
  _m1.makeScale(x, y, z);
  this.applyMatrix4(_m1);
  return this;
}

center(): this {
  this.computeBoundingBox();
  this.boundingBox!.getCenter(_offset).negate();
  this.translate(_offset.x, _offset.y, _offset.z);
  return this;
}

lookAt(vector: Vector3): this {
  _obj.lookAt(vector);
  _obj.updateMatrix();
  this.applyMatrix4(_obj.matrix);
  return this;
}
```

## 包围盒计算

### 包围盒

```typescript
computeBoundingBox(): void {
  if (this.boundingBox === null) {
    this.boundingBox = new Box3();
  }
  
  const position = this.attributes.position;
  const morphAttributesPosition = this.morphAttributes.position;
  
  if (position && position.isGLBufferAttribute) {
    console.error('BufferGeometry: Cannot compute bounding box from GLBufferAttribute.');
    this.boundingBox.makeEmpty();
    return;
  }
  
  if (position !== undefined) {
    this.boundingBox.setFromBufferAttribute(position);
    
    // 处理变形目标
    if (morphAttributesPosition) {
      for (let i = 0; i < morphAttributesPosition.length; i++) {
        _box.setFromBufferAttribute(morphAttributesPosition[i]);
        
        if (this.morphTargetsRelative) {
          _vector.addVectors(this.boundingBox.min, _box.min);
          this.boundingBox.expandByPoint(_vector);
          
          _vector.addVectors(this.boundingBox.max, _box.max);
          this.boundingBox.expandByPoint(_vector);
        } else {
          this.boundingBox.expandByPoint(_box.min);
          this.boundingBox.expandByPoint(_box.max);
        }
      }
    }
  } else {
    this.boundingBox.makeEmpty();
  }
  
  if (isNaN(this.boundingBox.min.x) || 
      isNaN(this.boundingBox.min.y) || 
      isNaN(this.boundingBox.min.z)) {
    console.error('BufferGeometry: Computed bounding box has NaN values.');
  }
}
```

### 包围球

```typescript
computeBoundingSphere(): void {
  if (this.boundingSphere === null) {
    this.boundingSphere = new Sphere();
  }
  
  const position = this.attributes.position;
  const morphAttributesPosition = this.morphAttributes.position;
  
  if (position && position.isGLBufferAttribute) {
    console.error('BufferGeometry: Cannot compute bounding sphere from GLBufferAttribute.');
    this.boundingSphere.makeEmpty();
    return;
  }
  
  if (position) {
    const center = this.boundingSphere.center;
    
    _box.setFromBufferAttribute(position);
    
    // 处理变形目标
    if (morphAttributesPosition) {
      for (let i = 0; i < morphAttributesPosition.length; i++) {
        _boxMorphTargets.setFromBufferAttribute(morphAttributesPosition[i]);
        
        if (this.morphTargetsRelative) {
          _vector.addVectors(_box.min, _boxMorphTargets.min);
          _box.expandByPoint(_vector);
          
          _vector.addVectors(_box.max, _boxMorphTargets.max);
          _box.expandByPoint(_vector);
        } else {
          _box.expandByPoint(_boxMorphTargets.min);
          _box.expandByPoint(_boxMorphTargets.max);
        }
      }
    }
    
    _box.getCenter(center);
    
    // 计算最大半径
    let maxRadiusSq = 0;
    
    for (let i = 0; i < position.count; i++) {
      _vector.fromBufferAttribute(position, i);
      maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
    }
    
    // 处理变形目标
    if (morphAttributesPosition) {
      for (let i = 0; i < morphAttributesPosition.length; i++) {
        const morphAttribute = morphAttributesPosition[i];
        const morphTargetsRelative = this.morphTargetsRelative;
        
        for (let j = 0; j < morphAttribute.count; j++) {
          _vector.fromBufferAttribute(morphAttribute, j);
          
          if (morphTargetsRelative) {
            _offset.fromBufferAttribute(position, j);
            _vector.add(_offset);
          }
          
          maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(_vector));
        }
      }
    }
    
    this.boundingSphere.radius = Math.sqrt(maxRadiusSq);
    
    if (isNaN(this.boundingSphere.radius)) {
      console.error('BufferGeometry: Computed bounding sphere has NaN radius.');
    }
  }
}
```

## 法线计算

```typescript
computeVertexNormals(): void {
  const index = this.index;
  const positionAttribute = this.getAttribute('position');
  
  if (positionAttribute === undefined) return;
  
  let normalAttribute = this.getAttribute('normal');
  
  if (normalAttribute === undefined) {
    normalAttribute = new BufferAttribute(
      new Float32Array(positionAttribute.count * 3),
      3
    );
    this.setAttribute('normal', normalAttribute);
  } else {
    // 重置法线
    for (let i = 0; i < normalAttribute.count; i++) {
      normalAttribute.setXYZ(i, 0, 0, 0);
    }
  }
  
  const pA = new Vector3(), pB = new Vector3(), pC = new Vector3();
  const nA = new Vector3(), nB = new Vector3(), nC = new Vector3();
  const cb = new Vector3(), ab = new Vector3();
  
  if (index) {
    // 索引几何体
    for (let i = 0; i < index.count; i += 3) {
      const vA = index.getX(i);
      const vB = index.getX(i + 1);
      const vC = index.getX(i + 2);
      
      pA.fromBufferAttribute(positionAttribute, vA);
      pB.fromBufferAttribute(positionAttribute, vB);
      pC.fromBufferAttribute(positionAttribute, vC);
      
      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);
      
      nA.fromBufferAttribute(normalAttribute, vA);
      nB.fromBufferAttribute(normalAttribute, vB);
      nC.fromBufferAttribute(normalAttribute, vC);
      
      nA.add(cb);
      nB.add(cb);
      nC.add(cb);
      
      normalAttribute.setXYZ(vA, nA.x, nA.y, nA.z);
      normalAttribute.setXYZ(vB, nB.x, nB.y, nB.z);
      normalAttribute.setXYZ(vC, nC.x, nC.y, nC.z);
    }
  } else {
    // 非索引几何体
    for (let i = 0; i < positionAttribute.count; i += 3) {
      pA.fromBufferAttribute(positionAttribute, i);
      pB.fromBufferAttribute(positionAttribute, i + 1);
      pC.fromBufferAttribute(positionAttribute, i + 2);
      
      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);
      
      normalAttribute.setXYZ(i, cb.x, cb.y, cb.z);
      normalAttribute.setXYZ(i + 1, cb.x, cb.y, cb.z);
      normalAttribute.setXYZ(i + 2, cb.x, cb.y, cb.z);
    }
  }
  
  this.normalizeNormals();
  normalAttribute.needsUpdate = true;
}

normalizeNormals(): void {
  const normals = this.attributes.normal;
  
  for (let i = 0; i < normals.count; i++) {
    _vector.fromBufferAttribute(normals, i);
    _vector.normalize();
    normals.setXYZ(i, _vector.x, _vector.y, _vector.z);
  }
}
```

## 切线计算

用于法线贴图：

```typescript
computeTangents(): void {
  const index = this.index;
  const position = this.attributes.position;
  const normal = this.attributes.normal;
  const uv = this.attributes.uv;
  
  if (!index || !position || !normal || !uv) {
    console.error('BufferGeometry: Missing required attributes.');
    return;
  }
  
  const nVertices = position.count;
  
  if (!this.hasAttribute('tangent')) {
    this.setAttribute('tangent', new BufferAttribute(
      new Float32Array(4 * nVertices),
      4
    ));
  }
  
  const tangentAttribute = this.getAttribute('tangent');
  
  const tan1: Vector3[] = [];
  const tan2: Vector3[] = [];
  
  for (let i = 0; i < nVertices; i++) {
    tan1[i] = new Vector3();
    tan2[i] = new Vector3();
  }
  
  const vA = new Vector3(), vB = new Vector3(), vC = new Vector3();
  const uvA = new Vector2(), uvB = new Vector2(), uvC = new Vector2();
  
  const sdir = new Vector3(), tdir = new Vector3();
  
  // 计算每个三角形的切线贡献
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    
    vA.fromBufferAttribute(position, a);
    vB.fromBufferAttribute(position, b);
    vC.fromBufferAttribute(position, c);
    
    uvA.fromBufferAttribute(uv, a);
    uvB.fromBufferAttribute(uv, b);
    uvC.fromBufferAttribute(uv, c);
    
    vB.sub(vA);
    vC.sub(vA);
    
    uvB.sub(uvA);
    uvC.sub(uvA);
    
    const r = 1.0 / (uvB.x * uvC.y - uvC.x * uvB.y);
    
    if (!isFinite(r)) continue;
    
    sdir.copy(vB).multiplyScalar(uvC.y)
      .addScaledVector(vC, -uvB.y)
      .multiplyScalar(r);
    
    tdir.copy(vC).multiplyScalar(uvB.x)
      .addScaledVector(vB, -uvC.x)
      .multiplyScalar(r);
    
    tan1[a].add(sdir);
    tan1[b].add(sdir);
    tan1[c].add(sdir);
    
    tan2[a].add(tdir);
    tan2[b].add(tdir);
    tan2[c].add(tdir);
  }
  
  const tmp = new Vector3(), tmp2 = new Vector3();
  const n = new Vector3(), n2 = new Vector3();
  
  // 计算每个顶点的切线
  for (let i = 0; i < nVertices; i++) {
    n.fromBufferAttribute(normal, i);
    const t = tan1[i];
    
    // Gram-Schmidt 正交化
    tmp.copy(t).sub(n.multiplyScalar(n.dot(t))).normalize();
    
    // 计算副切线方向
    tmp2.crossVectors(n2.fromBufferAttribute(normal, i), t);
    const w = tmp2.dot(tan2[i]) < 0 ? -1 : 1;
    
    tangentAttribute.setXYZW(i, tmp.x, tmp.y, tmp.z, w);
  }
  
  tangentAttribute.needsUpdate = true;
}
```

## 使用示例

### 创建自定义几何体

```typescript
// 创建三角形
const geometry = new BufferGeometry();

const vertices = new Float32Array([
  -1, -1, 0,   // 顶点 0
   1, -1, 0,   // 顶点 1
   0,  1, 0,   // 顶点 2
]);

const normals = new Float32Array([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
]);

const uvs = new Float32Array([
  0, 0,
  1, 0,
  0.5, 1,
]);

geometry.setAttribute('position', new BufferAttribute(vertices, 3));
geometry.setAttribute('normal', new BufferAttribute(normals, 3));
geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
```

### 使用索引

```typescript
// 创建正方形（2 个三角形，共享顶点）
const geometry = new BufferGeometry();

const vertices = new Float32Array([
  -1, -1, 0,  // 0
   1, -1, 0,  // 1
   1,  1, 0,  // 2
  -1,  1, 0,  // 3
]);

const indices = [
  0, 1, 2,  // 第一个三角形
  0, 2, 3,  // 第二个三角形
];

geometry.setAttribute('position', new BufferAttribute(vertices, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();
```

### 动态更新

```typescript
// 更新顶点位置
const position = geometry.attributes.position;

for (let i = 0; i < position.count; i++) {
  const y = position.getY(i);
  position.setY(i, y + Math.sin(time + i * 0.1));
}

position.needsUpdate = true;
geometry.computeBoundingSphere();
```

## 本章小结

- BufferAttribute 存储类型化数组数据
- BufferGeometry 管理顶点属性
- 索引减少重复顶点
- 包围盒/包围球用于剔除
- 法线和切线可自动计算
- needsUpdate 标记触发 GPU 更新

下一章，我们将学习 EventDispatcher 事件系统。
