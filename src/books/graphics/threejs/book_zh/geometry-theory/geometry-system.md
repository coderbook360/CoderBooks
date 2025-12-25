# 几何体系统设计

> "几何体是 3D 对象的骨架，定义了物体的形状和结构。"

## 几何体系统概述

```
BufferGeometry 系统：

BufferGeometry
├── BufferAttribute           顶点属性
│   ├── position             位置（必需）
│   ├── normal               法线
│   ├── uv                   纹理坐标
│   ├── color                顶点颜色
│   └── 自定义属性            skinWeight, tangent...
├── 索引（Index）             共享顶点
├── 组（Groups）              多材质分组
├── 边界（Bounds）            
│   ├── boundingBox          AABB 边界盒
│   └── boundingSphere       边界球
└── 变形（Morphing）
    └── morphAttributes      变形目标属性
```

## BufferGeometry 核心

```typescript
// src/core/BufferGeometry.ts
import { BufferAttribute, InterleavedBufferAttribute } from './BufferAttribute';
import { Box3 } from '../math/Box3';
import { Sphere } from '../math/Sphere';
import { Vector3 } from '../math/Vector3';
import { Matrix4 } from '../math/Matrix4';
import { Matrix3 } from '../math/Matrix3';
import { generateUUID } from '../math/MathUtils';

type BufferAttributeType = BufferAttribute | InterleavedBufferAttribute;

export class BufferGeometry {
  readonly isBufferGeometry = true;
  readonly type = 'BufferGeometry';
  
  uuid = generateUUID();
  name = '';
  
  // 顶点索引
  index: BufferAttribute | null = null;
  
  // 顶点属性
  attributes: Record<string, BufferAttributeType> = {};
  
  // 变形目标属性
  morphAttributes: Record<string, BufferAttributeType[]> = {};
  morphTargetsRelative = false;
  
  // 绘制组（多材质支持）
  groups: Array<{
    start: number;
    count: number;
    materialIndex: number;
  }> = [];
  
  // 边界
  boundingBox: Box3 | null = null;
  boundingSphere: Sphere | null = null;
  
  // 绘制范围
  drawRange = { start: 0, count: Infinity };
  
  // 用户数据
  userData: Record<string, any> = {};
  
  constructor() {}
  
  // 获取索引
  getIndex(): BufferAttribute | null {
    return this.index;
  }
  
  // 设置索引
  setIndex(index: BufferAttribute | number[] | null): this {
    if (Array.isArray(index)) {
      this.index = new BufferAttribute(
        new (index.length > 65535 ? Uint32Array : Uint16Array)(index),
        1
      );
    } else {
      this.index = index;
    }
    return this;
  }
  
  // 获取属性
  getAttribute(name: string): BufferAttributeType | undefined {
    return this.attributes[name];
  }
  
  // 设置属性
  setAttribute(name: string, attribute: BufferAttributeType): this {
    this.attributes[name] = attribute;
    return this;
  }
  
  // 删除属性
  deleteAttribute(name: string): this {
    delete this.attributes[name];
    return this;
  }
  
  // 检查属性是否存在
  hasAttribute(name: string): boolean {
    return this.attributes[name] !== undefined;
  }
  
  // 添加绘制组
  addGroup(start: number, count: number, materialIndex = 0): void {
    this.groups.push({ start, count, materialIndex });
  }
  
  // 清除组
  clearGroups(): void {
    this.groups = [];
  }
  
  // 设置绘制范围
  setDrawRange(start: number, count: number): void {
    this.drawRange.start = start;
    this.drawRange.count = count;
  }
  
  // 应用矩阵变换
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
  
  // 应用四元数旋转
  applyQuaternion(q: Quaternion): this {
    const matrix = new Matrix4().makeRotationFromQuaternion(q);
    this.applyMatrix4(matrix);
    return this;
  }
  
  // 旋转
  rotateX(angle: number): this {
    const m = new Matrix4().makeRotationX(angle);
    this.applyMatrix4(m);
    return this;
  }
  
  rotateY(angle: number): this {
    const m = new Matrix4().makeRotationY(angle);
    this.applyMatrix4(m);
    return this;
  }
  
  rotateZ(angle: number): this {
    const m = new Matrix4().makeRotationZ(angle);
    this.applyMatrix4(m);
    return this;
  }
  
  // 平移
  translate(x: number, y: number, z: number): this {
    const m = new Matrix4().makeTranslation(x, y, z);
    this.applyMatrix4(m);
    return this;
  }
  
  // 缩放
  scale(x: number, y: number, z: number): this {
    const m = new Matrix4().makeScale(x, y, z);
    this.applyMatrix4(m);
    return this;
  }
  
  // 朝向点
  lookAt(vector: Vector3): this {
    const obj = new Object3D();
    obj.lookAt(vector);
    obj.updateMatrix();
    this.applyMatrix4(obj.matrix);
    return this;
  }
  
  // 移动到中心
  center(): this {
    this.computeBoundingBox();
    const center = this.boundingBox!.getCenter(new Vector3());
    this.translate(-center.x, -center.y, -center.z);
    return this;
  }
  
  // 归一化尺寸
  normalizeNormals(): void {
    const normals = this.attributes.normal;
    
    for (let i = 0, il = normals.count; i < il; i++) {
      const v = new Vector3(
        normals.getX(i),
        normals.getY(i),
        normals.getZ(i)
      );
      v.normalize();
      normals.setXYZ(i, v.x, v.y, v.z);
    }
  }
  
  // 计算边界盒
  computeBoundingBox(): void {
    if (this.boundingBox === null) {
      this.boundingBox = new Box3();
    }
    
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;
    
    if (position && position.isGLBufferAttribute) {
      console.error('Cannot compute bounding box from GLBufferAttribute');
      this.boundingBox.makeEmpty();
      return;
    }
    
    if (position !== undefined) {
      this.boundingBox.setFromBufferAttribute(position);
      
      // 考虑变形目标
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const box = new Box3();
          box.setFromBufferAttribute(morphAttributesPosition[i]);
          
          if (this.morphTargetsRelative) {
            const vector = new Vector3();
            vector.addVectors(this.boundingBox.min, box.min);
            this.boundingBox.expandByPoint(vector);
            
            vector.addVectors(this.boundingBox.max, box.max);
            this.boundingBox.expandByPoint(vector);
          } else {
            this.boundingBox.expandByPoint(box.min);
            this.boundingBox.expandByPoint(box.max);
          }
        }
      }
    } else {
      this.boundingBox.makeEmpty();
    }
    
    if (isNaN(this.boundingBox.min.x) || 
        isNaN(this.boundingBox.min.y) || 
        isNaN(this.boundingBox.min.z)) {
      console.error('Invalid boundingBox computed');
    }
  }
  
  // 计算边界球
  computeBoundingSphere(): void {
    if (this.boundingSphere === null) {
      this.boundingSphere = new Sphere();
    }
    
    const position = this.attributes.position;
    const morphAttributesPosition = this.morphAttributes.position;
    
    if (position && position.isGLBufferAttribute) {
      console.error('Cannot compute bounding sphere from GLBufferAttribute');
      this.boundingSphere.makeEmpty();
      return;
    }
    
    if (position) {
      const center = this.boundingSphere.center;
      
      const box = new Box3();
      box.setFromBufferAttribute(position);
      
      // 考虑变形
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const boxMorphTargets = new Box3();
          boxMorphTargets.setFromBufferAttribute(morphAttributesPosition[i]);
          
          if (this.morphTargetsRelative) {
            const vector = new Vector3();
            vector.addVectors(box.min, boxMorphTargets.min);
            box.expandByPoint(vector);
            
            vector.addVectors(box.max, boxMorphTargets.max);
            box.expandByPoint(vector);
          } else {
            box.expandByPoint(boxMorphTargets.min);
            box.expandByPoint(boxMorphTargets.max);
          }
        }
      }
      
      box.getCenter(center);
      
      // 计算最大距离
      let maxRadiusSq = 0;
      
      for (let i = 0, il = position.count; i < il; i++) {
        const v = new Vector3(
          position.getX(i),
          position.getY(i),
          position.getZ(i)
        );
        maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(v));
      }
      
      // 考虑变形
      if (morphAttributesPosition) {
        for (let i = 0, il = morphAttributesPosition.length; i < il; i++) {
          const morphAttribute = morphAttributesPosition[i];
          const morphTargetsRelative = this.morphTargetsRelative;
          
          for (let j = 0, jl = morphAttribute.count; j < jl; j++) {
            const v = new Vector3(
              morphAttribute.getX(j),
              morphAttribute.getY(j),
              morphAttribute.getZ(j)
            );
            
            if (morphTargetsRelative) {
              const p = new Vector3(
                position.getX(j),
                position.getY(j),
                position.getZ(j)
              );
              v.add(p);
            }
            
            maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(v));
          }
        }
      }
      
      this.boundingSphere.radius = Math.sqrt(maxRadiusSq);
      
      if (isNaN(this.boundingSphere.radius)) {
        console.error('Invalid boundingSphere radius');
      }
    }
  }
  
  // 计算法线
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
      for (let i = 0, il = normalAttribute.count; i < il; i++) {
        normalAttribute.setXYZ(i, 0, 0, 0);
      }
    }
    
    const pA = new Vector3();
    const pB = new Vector3();
    const pC = new Vector3();
    const cb = new Vector3();
    const ab = new Vector3();
    
    if (index) {
      // 索引几何体
      for (let i = 0, il = index.count; i < il; i += 3) {
        const vA = index.getX(i);
        const vB = index.getX(i + 1);
        const vC = index.getX(i + 2);
        
        pA.fromBufferAttribute(positionAttribute, vA);
        pB.fromBufferAttribute(positionAttribute, vB);
        pC.fromBufferAttribute(positionAttribute, vC);
        
        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        cb.cross(ab);
        
        normalAttribute.setXYZ(
          vA,
          normalAttribute.getX(vA) + cb.x,
          normalAttribute.getY(vA) + cb.y,
          normalAttribute.getZ(vA) + cb.z
        );
        normalAttribute.setXYZ(
          vB,
          normalAttribute.getX(vB) + cb.x,
          normalAttribute.getY(vB) + cb.y,
          normalAttribute.getZ(vB) + cb.z
        );
        normalAttribute.setXYZ(
          vC,
          normalAttribute.getX(vC) + cb.x,
          normalAttribute.getY(vC) + cb.y,
          normalAttribute.getZ(vC) + cb.z
        );
      }
    } else {
      // 非索引几何体
      for (let i = 0, il = positionAttribute.count; i < il; i += 3) {
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
  
  // 计算切线（用于法线贴图）
  computeTangents(): void {
    const index = this.index;
    const attributes = this.attributes;
    
    if (index === null ||
        attributes.position === undefined ||
        attributes.normal === undefined ||
        attributes.uv === undefined) {
      console.error('Missing required attributes');
      return;
    }
    
    const positions = attributes.position;
    const normals = attributes.normal;
    const uvs = attributes.uv;
    
    const nVertices = positions.count;
    
    if (attributes.tangent === undefined) {
      this.setAttribute('tangent', new BufferAttribute(
        new Float32Array(4 * nVertices),
        4
      ));
    }
    
    const tangents = attributes.tangent;
    
    const tan1: Vector3[] = [];
    const tan2: Vector3[] = [];
    
    for (let i = 0; i < nVertices; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }
    
    // 计算切线
    const vA = new Vector3();
    const vB = new Vector3();
    const vC = new Vector3();
    
    const uvA = new Vector2();
    const uvB = new Vector2();
    const uvC = new Vector2();
    
    const sdir = new Vector3();
    const tdir = new Vector3();
    
    function handleTriangle(a: number, b: number, c: number) {
      vA.fromBufferAttribute(positions, a);
      vB.fromBufferAttribute(positions, b);
      vC.fromBufferAttribute(positions, c);
      
      uvA.fromBufferAttribute(uvs, a);
      uvB.fromBufferAttribute(uvs, b);
      uvC.fromBufferAttribute(uvs, c);
      
      const x1 = vB.x - vA.x;
      const x2 = vC.x - vA.x;
      const y1 = vB.y - vA.y;
      const y2 = vC.y - vA.y;
      const z1 = vB.z - vA.z;
      const z2 = vC.z - vA.z;
      
      const s1 = uvB.x - uvA.x;
      const s2 = uvC.x - uvA.x;
      const t1 = uvB.y - uvA.y;
      const t2 = uvC.y - uvA.y;
      
      const r = 1.0 / (s1 * t2 - s2 * t1);
      
      sdir.set(
        (t2 * x1 - t1 * x2) * r,
        (t2 * y1 - t1 * y2) * r,
        (t2 * z1 - t1 * z2) * r
      );
      
      tdir.set(
        (s1 * x2 - s2 * x1) * r,
        (s1 * y2 - s2 * y1) * r,
        (s1 * z2 - s2 * z1) * r
      );
      
      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);
      
      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }
    
    for (let i = 0, il = index.count; i < il; i += 3) {
      handleTriangle(
        index.getX(i),
        index.getX(i + 1),
        index.getX(i + 2)
      );
    }
    
    // 正交化
    const tmp = new Vector3();
    const tmp2 = new Vector3();
    const n = new Vector3();
    
    for (let i = 0; i < nVertices; i++) {
      n.fromBufferAttribute(normals, i);
      const t = tan1[i];
      
      // Gram-Schmidt 正交化
      tmp.copy(t);
      tmp.sub(n.multiplyScalar(n.dot(t))).normalize();
      
      // 计算 handedness
      tmp2.crossVectors(n, t);
      const test = tmp2.dot(tan2[i]);
      const w = test < 0.0 ? -1.0 : 1.0;
      
      tangents.setXYZW(i, tmp.x, tmp.y, tmp.z, w);
    }
  }
  
  // 合并几何体
  merge(geometry: BufferGeometry, offset = 0): this {
    // ... 合并实现
    return this;
  }
  
  // 从非索引转换为索引
  toIndexed(): BufferGeometry {
    // ... 实现
    return this;
  }
  
  // 从索引转换为非索引
  toNonIndexed(): BufferGeometry {
    // 展开索引几何体
    function convertBufferAttribute(
      attribute: BufferAttributeType,
      indices: BufferAttribute
    ): BufferAttribute {
      const array = attribute.array;
      const itemSize = attribute.itemSize;
      const normalized = attribute.normalized;
      
      const array2 = new (array.constructor as any)(indices.count * itemSize);
      
      let index = 0;
      for (let i = 0, l = indices.count; i < l; i++) {
        const j = indices.getX(i) * itemSize;
        for (let s = 0; s < itemSize; s++) {
          array2[index++] = array[j + s];
        }
      }
      
      return new BufferAttribute(array2, itemSize, normalized);
    }
    
    if (this.index === null) {
      console.warn('Already non-indexed');
      return this;
    }
    
    const geometry2 = new BufferGeometry();
    const indices = this.index;
    const attributes = this.attributes;
    
    for (const name in attributes) {
      const attribute = attributes[name];
      const newAttribute = convertBufferAttribute(attribute, indices);
      geometry2.setAttribute(name, newAttribute);
    }
    
    // 处理变形属性
    const morphAttributes = this.morphAttributes;
    for (const name in morphAttributes) {
      const morphArray: BufferAttribute[] = [];
      const morphAttribute = morphAttributes[name];
      
      for (let i = 0, il = morphAttribute.length; i < il; i++) {
        const attribute = morphAttribute[i];
        const newAttribute = convertBufferAttribute(attribute, indices);
        morphArray.push(newAttribute);
      }
      
      geometry2.morphAttributes[name] = morphArray;
    }
    
    geometry2.morphTargetsRelative = this.morphTargetsRelative;
    
    // 处理组
    const groups = this.groups;
    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      geometry2.addGroup(group.start, group.count, group.materialIndex);
    }
    
    return geometry2;
  }
  
  // 克隆
  clone(): BufferGeometry {
    return new BufferGeometry().copy(this);
  }
  
  // 复制
  copy(source: BufferGeometry): this {
    // 清空
    this.index = null;
    this.attributes = {};
    this.morphAttributes = {};
    this.groups = [];
    this.boundingBox = null;
    this.boundingSphere = null;
    
    this.name = source.name;
    
    // 复制索引
    const index = source.index;
    if (index !== null) {
      this.setIndex(index.clone());
    }
    
    // 复制属性
    const attributes = source.attributes;
    for (const name in attributes) {
      const attribute = attributes[name];
      this.setAttribute(name, attribute.clone());
    }
    
    // 复制变形属性
    const morphAttributes = source.morphAttributes;
    for (const name in morphAttributes) {
      const array: BufferAttribute[] = [];
      const morphAttribute = morphAttributes[name];
      
      for (let i = 0, l = morphAttribute.length; i < l; i++) {
        array.push(morphAttribute[i].clone());
      }
      
      this.morphAttributes[name] = array;
    }
    
    this.morphTargetsRelative = source.morphTargetsRelative;
    
    // 复制组
    const groups = source.groups;
    for (let i = 0, l = groups.length; i < l; i++) {
      const group = groups[i];
      this.addGroup(group.start, group.count, group.materialIndex);
    }
    
    // 复制边界
    const boundingBox = source.boundingBox;
    if (boundingBox !== null) {
      this.boundingBox = boundingBox.clone();
    }
    
    const boundingSphere = source.boundingSphere;
    if (boundingSphere !== null) {
      this.boundingSphere = boundingSphere.clone();
    }
    
    this.drawRange.start = source.drawRange.start;
    this.drawRange.count = source.drawRange.count;
    
    this.userData = JSON.parse(JSON.stringify(source.userData));
    
    return this;
  }
  
  // 释放资源
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
}
```

## 顶点数据布局

```
索引几何体 vs 非索引几何体：

索引几何体（共享顶点）：
顶点: [v0, v1, v2, v3]
索引: [0, 1, 2, 0, 2, 3]  ← 两个三角形共享 v0, v2

    v3 ──── v2
    │ ╲    │
    │   ╲  │
    │     ╲│
    v0 ──── v1

非索引几何体（独立顶点）：
顶点: [v0, v1, v2, v0, v2, v3]  ← 每个三角形独立

优缺点：
┌────────────┬──────────────┬──────────────┐
│            │ 索引几何体    │ 非索引几何体  │
├────────────┼──────────────┼──────────────┤
│ 内存       │ 较少         │ 较多          │
│ 法线       │ 平滑（共享） │ 硬边（独立）  │
│ Draw Call  │ drawElements │ drawArrays   │
└────────────┴──────────────┴──────────────┘
```

## 本章小结

- BufferGeometry 是所有几何体的基类
- 顶点数据通过 BufferAttribute 存储
- 索引几何体共享顶点节省内存
- 边界盒/球用于裁剪优化
- 组允许单几何体使用多材质

下一章，我们将学习内置几何体的实现。
