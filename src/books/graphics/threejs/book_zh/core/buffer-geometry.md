# BufferGeometry 完整实现

> "BufferGeometry 是现代 WebGL 渲染的基石，高效管理顶点数据。"

## BufferGeometry 结构

```
BufferGeometry
├── id, uuid, name, type
├── index (BufferAttribute) - 索引
├── attributes - 顶点属性字典
│   ├── position
│   ├── normal
│   ├── uv
│   ├── color
│   └── ...
├── morphAttributes - 变形属性
├── groups - 渲染分组
├── boundingBox - 包围盒
├── boundingSphere - 包围球
└── drawRange - 绘制范围
```

## 完整实现

```typescript
// src/core/BufferGeometry.ts
import { EventDispatcher } from './EventDispatcher';
import { BufferAttribute, Float32BufferAttribute } from './BufferAttribute';
import { Box3 } from '../math/Box3';
import { Sphere } from '../math/Sphere';
import { Vector3 } from '../math/Vector3';
import { Vector2 } from '../math/Vector2';
import { Matrix4 } from '../math/Matrix4';
import { Matrix3 } from '../math/Matrix3';
import { MathUtils } from '../math/MathUtils';
import { Object3D } from './Object3D';

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
  
  groups: Array<{
    start: number;
    count: number;
    materialIndex: number;
  }>;
  
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

## 索引管理

```typescript
getIndex(): BufferAttribute | null {
  return this.index;
}

setIndex(index: BufferAttribute | number[] | null): this {
  if (Array.isArray(index)) {
    // 自动选择 16 位或 32 位索引
    this.index = new BufferAttribute(
      new (arrayNeedsUint32(index) ? Uint32Array : Uint16Array)(index),
      1
    );
  } else {
    this.index = index;
  }
  
  return this;
}

// 检查是否需要 32 位索引
function arrayNeedsUint32(array: number[]): boolean {
  for (let i = 0; i < array.length; i++) {
    if (array[i] >= 65535) return true;
  }
  return false;
}
```

## 属性管理

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

## 分组管理

用于多材质渲染：

```typescript
addGroup(start: number, count: number, materialIndex = 0): void {
  this.groups.push({
    start,
    count,
    materialIndex,
  });
}

clearGroups(): void {
  this.groups = [];
}

setDrawRange(start: number, count: number): void {
  this.drawRange.start = start;
  this.drawRange.count = count;
}
```

## 变换方法

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
    tangent.transformDirection(matrix);
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

lookAt(vector: Vector3): this {
  _obj.lookAt(vector);
  _obj.updateMatrix();
  this.applyMatrix4(_obj.matrix);
  return this;
}

center(): this {
  this.computeBoundingBox();
  this.boundingBox!.getCenter(_offset).negate();
  this.translate(_offset.x, _offset.y, _offset.z);
  return this;
}
```

## 包围体计算

### 包围盒

```typescript
computeBoundingBox(): void {
  if (this.boundingBox === null) {
    this.boundingBox = new Box3();
  }
  
  const position = this.attributes.position;
  const morphAttributesPosition = this.morphAttributes.position;
  
  if (position && position.isGLBufferAttribute) {
    console.error(
      'BufferGeometry.computeBoundingBox(): ' +
      'Cannot compute bounding box from GLBufferAttribute.'
    );
    this.boundingBox.makeEmpty();
    return;
  }
  
  if (position !== undefined) {
    this.boundingBox.setFromBufferAttribute(position);
    
    // 包含变形目标
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
  
  if (
    isNaN(this.boundingBox.min.x) ||
    isNaN(this.boundingBox.min.y) ||
    isNaN(this.boundingBox.min.z)
  ) {
    console.error(
      'BufferGeometry.computeBoundingBox(): ' +
      'Computed min/max have NaN values.'
    );
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
    console.error(
      'BufferGeometry.computeBoundingSphere(): ' +
      'Cannot compute from GLBufferAttribute.'
    );
    this.boundingSphere.makeEmpty();
    return;
  }
  
  if (position) {
    const center = this.boundingSphere.center;
    
    _box.setFromBufferAttribute(position);
    
    // 包含变形目标
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
      maxRadiusSq = Math.max(
        maxRadiusSq,
        center.distanceToSquared(_vector)
      );
    }
    
    // 包含变形目标
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
          
          maxRadiusSq = Math.max(
            maxRadiusSq,
            center.distanceToSquared(_vector)
          );
        }
      }
    }
    
    this.boundingSphere.radius = Math.sqrt(maxRadiusSq);
    
    if (isNaN(this.boundingSphere.radius)) {
      console.error(
        'BufferGeometry.computeBoundingSphere(): ' +
        'Computed radius is NaN.'
      );
    }
  }
}
```

## 法线计算

```typescript
computeVertexNormals(): void {
  const index = this.index;
  const positionAttribute = this.getAttribute('position');
  
  if (positionAttribute === undefined) {
    return;
  }
  
  let normalAttribute = this.getAttribute('normal');
  
  if (normalAttribute === undefined) {
    normalAttribute = new BufferAttribute(
      new Float32Array(positionAttribute.count * 3),
      3
    );
    this.setAttribute('normal', normalAttribute);
  } else {
    // 重置为零
    for (let i = 0; i < normalAttribute.count; i++) {
      normalAttribute.setXYZ(i, 0, 0, 0);
    }
  }
  
  const pA = new Vector3();
  const pB = new Vector3();
  const pC = new Vector3();
  const nA = new Vector3();
  const nB = new Vector3();
  const nC = new Vector3();
  const cb = new Vector3();
  const ab = new Vector3();
  
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

```typescript
computeTangents(): void {
  const index = this.index;
  const attributes = this.attributes;
  
  if (
    index === null ||
    attributes.position === undefined ||
    attributes.normal === undefined ||
    attributes.uv === undefined
  ) {
    console.error(
      'BufferGeometry.computeTangents(): ' +
      'Missing required attributes (index, position, normal, uv).'
    );
    return;
  }
  
  const positionAttribute = attributes.position;
  const normalAttribute = attributes.normal;
  const uvAttribute = attributes.uv;
  
  if (this.hasAttribute('tangent') === false) {
    this.setAttribute(
      'tangent',
      new BufferAttribute(
        new Float32Array(4 * positionAttribute.count),
        4
      )
    );
  }
  
  const tangentAttribute = this.getAttribute('tangent')!;
  
  const tan1: Vector3[] = [];
  const tan2: Vector3[] = [];
  
  for (let i = 0; i < positionAttribute.count; i++) {
    tan1[i] = new Vector3();
    tan2[i] = new Vector3();
  }
  
  const vA = new Vector3();
  const vB = new Vector3();
  const vC = new Vector3();
  
  const uvA = new Vector2();
  const uvB = new Vector2();
  const uvC = new Vector2();
  
  const sdir = new Vector3();
  const tdir = new Vector3();
  
  function handleTriangle(a: number, b: number, c: number): void {
    vA.fromBufferAttribute(positionAttribute, a);
    vB.fromBufferAttribute(positionAttribute, b);
    vC.fromBufferAttribute(positionAttribute, c);
    
    uvA.fromBufferAttribute(uvAttribute, a);
    uvB.fromBufferAttribute(uvAttribute, b);
    uvC.fromBufferAttribute(uvAttribute, c);
    
    vB.sub(vA);
    vC.sub(vA);
    
    uvB.sub(uvA);
    uvC.sub(uvA);
    
    const r = 1.0 / (uvB.x * uvC.y - uvC.x * uvB.y);
    
    if (!isFinite(r)) return;
    
    sdir
      .copy(vB)
      .multiplyScalar(uvC.y)
      .addScaledVector(vC, -uvB.y)
      .multiplyScalar(r);
    
    tdir
      .copy(vC)
      .multiplyScalar(uvB.x)
      .addScaledVector(vB, -uvC.x)
      .multiplyScalar(r);
    
    tan1[a].add(sdir);
    tan1[b].add(sdir);
    tan1[c].add(sdir);
    
    tan2[a].add(tdir);
    tan2[b].add(tdir);
    tan2[c].add(tdir);
  }
  
  // 处理每个三角形
  const groups = this.groups.length > 0 
    ? this.groups 
    : [{ start: 0, count: index.count, materialIndex: 0 }];
  
  for (const group of groups) {
    const start = group.start;
    const count = group.count;
    
    for (let i = start; i < start + count; i += 3) {
      handleTriangle(
        index.getX(i),
        index.getX(i + 1),
        index.getX(i + 2)
      );
    }
  }
  
  const tmp = new Vector3();
  const tmp2 = new Vector3();
  const n = new Vector3();
  const n2 = new Vector3();
  
  function handleVertex(v: number): void {
    n.fromBufferAttribute(normalAttribute, v);
    n2.copy(n);
    
    const t = tan1[v];
    
    // Gram-Schmidt 正交化
    tmp.copy(t);
    tmp.sub(n.multiplyScalar(n.dot(t))).normalize();
    
    // 计算副切线方向
    tmp2.crossVectors(n2, t);
    const w = tmp2.dot(tan2[v]) < 0 ? -1 : 1;
    
    tangentAttribute.setXYZW(v, tmp.x, tmp.y, tmp.z, w);
  }
  
  for (const group of groups) {
    const start = group.start;
    const count = group.count;
    
    for (let i = start; i < start + count; i += 3) {
      handleVertex(index.getX(i));
      handleVertex(index.getX(i + 1));
      handleVertex(index.getX(i + 2));
    }
  }
}
```

## 克隆与复制

```typescript
clone(): BufferGeometry {
  return new BufferGeometry().copy(this);
}

copy(source: BufferGeometry): this {
  // 清空当前状态
  this.index = null;
  this.attributes = {};
  this.morphAttributes = {};
  this.groups = [];
  this.boundingBox = null;
  this.boundingSphere = null;
  
  // 元数据
  this.name = source.name;
  
  // 索引
  const index = source.index;
  if (index !== null) {
    this.setIndex(index.clone());
  }
  
  // 属性
  const attributes = source.attributes;
  for (const name in attributes) {
    const attribute = attributes[name];
    this.setAttribute(name, attribute.clone());
  }
  
  // 变形属性
  const morphAttributes = source.morphAttributes;
  for (const name in morphAttributes) {
    const array: BufferAttribute[] = [];
    const morphAttribute = morphAttributes[name];
    
    for (let i = 0; i < morphAttribute.length; i++) {
      array.push(morphAttribute[i].clone());
    }
    
    this.morphAttributes[name] = array;
  }
  
  this.morphTargetsRelative = source.morphTargetsRelative;
  
  // 分组
  const groups = source.groups;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    this.addGroup(group.start, group.count, group.materialIndex);
  }
  
  // 包围体
  const boundingBox = source.boundingBox;
  if (boundingBox !== null) {
    this.boundingBox = boundingBox.clone();
  }
  
  const boundingSphere = source.boundingSphere;
  if (boundingSphere !== null) {
    this.boundingSphere = boundingSphere.clone();
  }
  
  // 绘制范围
  this.drawRange.start = source.drawRange.start;
  this.drawRange.count = source.drawRange.count;
  
  // 用户数据
  this.userData = source.userData;
  
  return this;
}
```

## 清理

```typescript
dispose(): void {
  this.dispatchEvent({ type: 'dispose' });
}
```

## 使用示例

### 创建简单几何体

```typescript
// 创建三角形
const geometry = new BufferGeometry();

const vertices = new Float32Array([
  -1, -1, 0,
   1, -1, 0,
   0,  1, 0,
]);

geometry.setAttribute(
  'position',
  new BufferAttribute(vertices, 3)
);

geometry.computeVertexNormals();
```

### 索引几何体

```typescript
// 创建正方形
const geometry = new BufferGeometry();

const vertices = new Float32Array([
  -1, -1, 0,  // 0
   1, -1, 0,  // 1
   1,  1, 0,  // 2
  -1,  1, 0,  // 3
]);

const indices = [0, 1, 2, 0, 2, 3];

geometry.setAttribute('position', new BufferAttribute(vertices, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();
```

### 多材质分组

```typescript
const geometry = new BufferGeometry();

// ... 设置顶点

// 前 6 个索引用材质 0
geometry.addGroup(0, 6, 0);

// 后 6 个索引用材质 1
geometry.addGroup(6, 6, 1);

const materials = [material1, material2];
const mesh = new Mesh(geometry, materials);
```

## 本章小结

- BufferGeometry 存储所有顶点属性
- 支持索引和非索引模式
- 分组允许多材质渲染
- 自动计算法线和切线
- 包围体用于视锥剔除
- dispose 触发资源清理

下一章，我们将学习 InterleavedBuffer 交错缓冲。
