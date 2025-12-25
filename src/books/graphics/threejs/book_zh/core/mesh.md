# Mesh 网格对象

> "Mesh 是几何体和材质的结合，是 3D 世界的可见实体。"

## Mesh 概述

Mesh 是最常用的可渲染对象：

```
Mesh extends Object3D
├── geometry (BufferGeometry) - 顶点数据
├── material (Material | Material[]) - 外观定义
└── morphTargetInfluences - 变形权重
```

## 完整实现

```typescript
// src/objects/Mesh.ts
import { Object3D } from '../core/Object3D';
import { BufferGeometry } from '../core/BufferGeometry';
import { Material } from '../materials/Material';
import { Vector3 } from '../math/Vector3';
import { Matrix4 } from '../math/Matrix4';
import { Sphere } from '../math/Sphere';
import { Ray } from '../math/Ray';
import { Triangle } from '../math/Triangle';

const _inverseMatrix = new Matrix4();
const _ray = new Ray();
const _sphere = new Sphere();
const _sphereHitAt = new Vector3();

const _vA = new Vector3();
const _vB = new Vector3();
const _vC = new Vector3();

const _uvA = new Vector2();
const _uvB = new Vector2();
const _uvC = new Vector2();

const _normalA = new Vector3();
const _normalB = new Vector3();
const _normalC = new Vector3();

const _intersectionPoint = new Vector3();
const _intersectionPointWorld = new Vector3();

export class Mesh extends Object3D {
  readonly isMesh = true;
  type = 'Mesh';
  
  geometry: BufferGeometry;
  material: Material | Material[];
  
  morphTargetInfluences?: number[];
  morphTargetDictionary?: Record<string, number>;
  
  constructor(
    geometry: BufferGeometry = new BufferGeometry(),
    material: Material | Material[] = new MeshBasicMaterial()
  ) {
    super();
    
    this.geometry = geometry;
    this.material = material;
    
    this.updateMorphTargets();
  }
  
  copy(source: Mesh, recursive?: boolean): this {
    super.copy(source, recursive);
    
    if (source.morphTargetInfluences !== undefined) {
      this.morphTargetInfluences = source.morphTargetInfluences.slice();
    }
    
    if (source.morphTargetDictionary !== undefined) {
      this.morphTargetDictionary = { ...source.morphTargetDictionary };
    }
    
    this.material = Array.isArray(source.material)
      ? source.material.slice()
      : source.material;
    
    this.geometry = source.geometry;
    
    return this;
  }
  
  updateMorphTargets(): void {
    const geometry = this.geometry;
    const morphAttributes = geometry.morphAttributes;
    const keys = Object.keys(morphAttributes);
    
    if (keys.length > 0) {
      const morphAttribute = morphAttributes[keys[0]];
      
      if (morphAttribute !== undefined) {
        this.morphTargetInfluences = [];
        this.morphTargetDictionary = {};
        
        for (let m = 0; m < morphAttribute.length; m++) {
          const name = morphAttribute[m].name || String(m);
          
          this.morphTargetInfluences.push(0);
          this.morphTargetDictionary[name] = m;
        }
      }
    }
  }
  
  getVertexPosition(index: number, target: Vector3): Vector3 {
    const geometry = this.geometry;
    const position = geometry.attributes.position;
    const morphPosition = geometry.morphAttributes.position;
    const morphTargetsRelative = geometry.morphTargetsRelative;
    
    target.fromBufferAttribute(position, index);
    
    const morphInfluences = this.morphTargetInfluences;
    
    if (morphPosition && morphInfluences) {
      for (let i = 0; i < morphPosition.length; i++) {
        const influence = morphInfluences[i];
        
        if (influence === 0) continue;
        
        const morphAttribute = morphPosition[i];
        
        if (morphTargetsRelative) {
          _vA.fromBufferAttribute(morphAttribute, index);
          target.addScaledVector(_vA, influence);
        } else {
          _vA.fromBufferAttribute(morphAttribute, index);
          target.addScaledVector(
            _vA.sub(target),
            influence
          );
        }
      }
    }
    
    return target;
  }
}
```

## 射线检测

### raycast 方法

```typescript
raycast(raycaster: Raycaster, intersects: Intersection[]): void {
  const geometry = this.geometry;
  const material = this.material;
  const matrixWorld = this.matrixWorld;
  
  if (material === undefined) return;
  
  // 包围球检测
  if (geometry.boundingSphere === null) {
    geometry.computeBoundingSphere();
  }
  
  _sphere.copy(geometry.boundingSphere!);
  _sphere.applyMatrix4(matrixWorld);
  
  if (!raycaster.ray.intersectsSphere(_sphere)) return;
  
  // 变换射线到局部空间
  _inverseMatrix.copy(matrixWorld).invert();
  _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);
  
  // 包围盒检测
  if (geometry.boundingBox !== null) {
    if (!_ray.intersectsBox(geometry.boundingBox)) return;
  }
  
  // 三角形检测
  this._computeIntersections(raycaster, intersects, _ray);
}

private _computeIntersections(
  raycaster: Raycaster,
  intersects: Intersection[],
  ray: Ray
): void {
  const geometry = this.geometry;
  const material = this.material;
  const index = geometry.index;
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const uv1 = geometry.attributes.uv1;
  const normal = geometry.attributes.normal;
  const groups = geometry.groups;
  const drawRange = geometry.drawRange;
  
  let intersection: Intersection | null;
  
  if (index !== null) {
    // 索引几何体
    const start = Math.max(0, drawRange.start);
    const end = Math.min(index.count, drawRange.start + drawRange.count);
    
    for (let i = start; i < end; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      
      intersection = this._checkGeometryIntersection(
        ray, position, uv, uv1, normal, a, b, c
      );
      
      if (intersection) {
        intersection.faceIndex = Math.floor(i / 3);
        intersects.push(intersection);
      }
    }
  } else if (position !== undefined) {
    // 非索引几何体
    const start = Math.max(0, drawRange.start);
    const end = Math.min(position.count, drawRange.start + drawRange.count);
    
    for (let i = start; i < end; i += 3) {
      intersection = this._checkGeometryIntersection(
        ray, position, uv, uv1, normal, i, i + 1, i + 2
      );
      
      if (intersection) {
        intersection.faceIndex = Math.floor(i / 3);
        intersects.push(intersection);
      }
    }
  }
}

private _checkGeometryIntersection(
  ray: Ray,
  position: BufferAttribute,
  uv: BufferAttribute | undefined,
  uv1: BufferAttribute | undefined,
  normal: BufferAttribute | undefined,
  a: number,
  b: number,
  c: number
): Intersection | null {
  this.getVertexPosition(a, _vA);
  this.getVertexPosition(b, _vB);
  this.getVertexPosition(c, _vC);
  
  const intersection = this._checkIntersection(
    ray, _vA, _vB, _vC, _intersectionPoint
  );
  
  if (intersection) {
    // UV 坐标
    if (uv) {
      _uvA.fromBufferAttribute(uv, a);
      _uvB.fromBufferAttribute(uv, b);
      _uvC.fromBufferAttribute(uv, c);
      
      intersection.uv = Triangle.getInterpolation(
        _intersectionPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new Vector2()
      );
    }
    
    if (uv1) {
      _uvA.fromBufferAttribute(uv1, a);
      _uvB.fromBufferAttribute(uv1, b);
      _uvC.fromBufferAttribute(uv1, c);
      
      intersection.uv1 = Triangle.getInterpolation(
        _intersectionPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new Vector2()
      );
    }
    
    // 法线
    if (normal) {
      _normalA.fromBufferAttribute(normal, a);
      _normalB.fromBufferAttribute(normal, b);
      _normalC.fromBufferAttribute(normal, c);
      
      intersection.normal = Triangle.getInterpolation(
        _intersectionPoint, _vA, _vB, _vC, 
        _normalA, _normalB, _normalC, new Vector3()
      );
      
      if (intersection.normal.dot(ray.direction) > 0) {
        intersection.normal.multiplyScalar(-1);
      }
    } else {
      // 计算面法线
      const face = { a, b, c, normal: new Vector3() };
      Triangle.getNormal(_vA, _vB, _vC, face.normal);
      intersection.face = face;
    }
    
    intersection.face = { a, b, c, normal: new Vector3() };
    Triangle.getNormal(_vA, _vB, _vC, intersection.face.normal);
  }
  
  return intersection;
}

private _checkIntersection(
  ray: Ray,
  pA: Vector3,
  pB: Vector3,
  pC: Vector3,
  point: Vector3
): Intersection | null {
  const material = this.material;
  const side = Array.isArray(material) 
    ? material[0].side 
    : material.side;
  
  // 检测射线与三角形相交
  const intersect = ray.intersectTriangle(
    pA, pB, pC, side === BackSide, point
  );
  
  if (intersect === null) return null;
  
  _intersectionPointWorld.copy(point);
  _intersectionPointWorld.applyMatrix4(this.matrixWorld);
  
  const distance = raycaster.ray.origin.distanceTo(_intersectionPointWorld);
  
  if (distance < raycaster.near || distance > raycaster.far) return null;
  
  return {
    distance,
    point: _intersectionPointWorld.clone(),
    object: this,
  };
}
```

## 使用示例

### 基本用法

```typescript
// 创建几何体和材质
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });

// 创建网格
const cube = new Mesh(geometry, material);
scene.add(cube);

// 变换
cube.position.set(0, 1, 0);
cube.rotation.y = Math.PI / 4;
cube.scale.set(2, 2, 2);
```

### 多材质

```typescript
const geometry = new BoxGeometry(1, 1, 1);

// 每个面使用不同材质
const materials = [
  new MeshBasicMaterial({ color: 0xff0000 }), // +X
  new MeshBasicMaterial({ color: 0x00ff00 }), // -X
  new MeshBasicMaterial({ color: 0x0000ff }), // +Y
  new MeshBasicMaterial({ color: 0xffff00 }), // -Y
  new MeshBasicMaterial({ color: 0xff00ff }), // +Z
  new MeshBasicMaterial({ color: 0x00ffff }), // -Z
];

const cube = new Mesh(geometry, materials);
```

### 变形目标

```typescript
const geometry = new BufferGeometry();

// 基础位置
const positions = new Float32Array([...]);
geometry.setAttribute('position', new BufferAttribute(positions, 3));

// 变形目标
const morphPosition1 = new Float32Array([...]);
const morphPosition2 = new Float32Array([...]);

geometry.morphAttributes.position = [
  new BufferAttribute(morphPosition1, 3),
  new BufferAttribute(morphPosition2, 3),
];

// 命名变形目标
geometry.morphAttributes.position[0].name = 'smile';
geometry.morphAttributes.position[1].name = 'frown';

const mesh = new Mesh(geometry, material);

// 控制变形
mesh.morphTargetInfluences[0] = 0.5; // 50% smile
// 或使用字典
mesh.morphTargetInfluences[mesh.morphTargetDictionary['smile']] = 0.5;
```

### 射线检测

```typescript
const raycaster = new Raycaster();
const mouse = new Vector2();

function onClick(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(scene.children);
  
  if (intersects.length > 0) {
    const hit = intersects[0];
    
    console.log('Hit object:', hit.object.name);
    console.log('Distance:', hit.distance);
    console.log('Point:', hit.point);
    console.log('Face:', hit.face);
    console.log('UV:', hit.uv);
  }
}
```

## SkinnedMesh

带骨骼的网格：

```typescript
// src/objects/SkinnedMesh.ts
import { Mesh } from './Mesh';
import { Skeleton } from './Skeleton';
import { Matrix4 } from '../math/Matrix4';

export class SkinnedMesh extends Mesh {
  readonly isSkinnedMesh = true;
  type = 'SkinnedMesh';
  
  bindMode: 'attached' | 'detached';
  bindMatrix: Matrix4;
  bindMatrixInverse: Matrix4;
  
  skeleton?: Skeleton;
  
  constructor(
    geometry?: BufferGeometry,
    material?: Material | Material[]
  ) {
    super(geometry, material);
    
    this.bindMode = 'attached';
    this.bindMatrix = new Matrix4();
    this.bindMatrixInverse = new Matrix4();
  }
  
  bind(skeleton: Skeleton, bindMatrix?: Matrix4): void {
    this.skeleton = skeleton;
    
    if (bindMatrix === undefined) {
      this.updateMatrixWorld(true);
      this.skeleton.calculateInverses();
      bindMatrix = this.matrixWorld;
    }
    
    this.bindMatrix.copy(bindMatrix);
    this.bindMatrixInverse.copy(bindMatrix).invert();
  }
  
  pose(): void {
    this.skeleton?.pose();
  }
  
  normalizeSkinWeights(): void {
    const geometry = this.geometry;
    const skinWeight = geometry.attributes.skinWeight;
    
    for (let i = 0; i < skinWeight.count; i++) {
      const x = skinWeight.getX(i);
      const y = skinWeight.getY(i);
      const z = skinWeight.getZ(i);
      const w = skinWeight.getW(i);
      
      const scale = 1.0 / (x + y + z + w);
      
      skinWeight.setXYZW(i, x * scale, y * scale, z * scale, w * scale);
    }
  }
  
  updateMatrixWorld(force?: boolean): void {
    super.updateMatrixWorld(force);
    
    if (this.bindMode === 'attached') {
      this.bindMatrixInverse.copy(this.matrixWorld).invert();
    } else if (this.bindMode === 'detached') {
      this.bindMatrixInverse.copy(this.bindMatrix).invert();
    }
  }
  
  applyBoneTransform(index: number, vector: Vector3): Vector3 {
    const skeleton = this.skeleton;
    const geometry = this.geometry;
    
    const skinIndex = geometry.attributes.skinIndex;
    const skinWeight = geometry.attributes.skinWeight;
    
    _basePosition.fromBufferAttribute(position, index);
    
    const weights = [
      skinWeight.getX(index),
      skinWeight.getY(index),
      skinWeight.getZ(index),
      skinWeight.getW(index),
    ];
    
    const indices = [
      skinIndex.getX(index),
      skinIndex.getY(index),
      skinIndex.getZ(index),
      skinIndex.getW(index),
    ];
    
    vector.set(0, 0, 0);
    
    for (let i = 0; i < 4; i++) {
      const weight = weights[i];
      if (weight === 0) continue;
      
      const boneIndex = indices[i];
      _matrix4.multiplyMatrices(
        skeleton.bones[boneIndex].matrixWorld,
        skeleton.boneInverses[boneIndex]
      );
      
      vector.addScaledVector(
        _vector.copy(_basePosition).applyMatrix4(_matrix4),
        weight
      );
    }
    
    return vector.applyMatrix4(this.bindMatrixInverse);
  }
}
```

## InstancedMesh

实例化网格：

```typescript
// src/objects/InstancedMesh.ts
import { Mesh } from './Mesh';
import { Matrix4 } from '../math/Matrix4';
import { Color } from '../math/Color';
import { InstancedBufferAttribute } from '../core/InstancedBufferAttribute';

export class InstancedMesh extends Mesh {
  readonly isInstancedMesh = true;
  
  instanceMatrix: InstancedBufferAttribute;
  instanceColor: InstancedBufferAttribute | null;
  count: number;
  
  boundingBox: Box3 | null;
  boundingSphere: Sphere | null;
  
  constructor(
    geometry: BufferGeometry,
    material: Material | Material[],
    count: number
  ) {
    super(geometry, material);
    
    this.instanceMatrix = new InstancedBufferAttribute(
      new Float32Array(count * 16),
      16
    );
    
    this.instanceColor = null;
    this.count = count;
    
    this.boundingBox = null;
    this.boundingSphere = null;
    
    // 初始化为单位矩阵
    for (let i = 0; i < count; i++) {
      this.setMatrixAt(i, _identity);
    }
  }
  
  getMatrixAt(index: number, matrix: Matrix4): void {
    matrix.fromArray(this.instanceMatrix.array, index * 16);
  }
  
  setMatrixAt(index: number, matrix: Matrix4): void {
    matrix.toArray(this.instanceMatrix.array, index * 16);
  }
  
  getColorAt(index: number, color: Color): void {
    color.fromArray(this.instanceColor!.array, index * 3);
  }
  
  setColorAt(index: number, color: Color): void {
    if (this.instanceColor === null) {
      this.instanceColor = new InstancedBufferAttribute(
        new Float32Array(this.count * 3).fill(1),
        3
      );
    }
    
    color.toArray(this.instanceColor.array, index * 3);
  }
  
  dispose(): void {
    this.dispatchEvent({ type: 'dispose' });
  }
}

// 使用示例
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });

const count = 1000;
const mesh = new InstancedMesh(geometry, material, count);

const dummy = new Object3D();
const color = new Color();

for (let i = 0; i < count; i++) {
  dummy.position.set(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  );
  dummy.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  dummy.scale.setScalar(Math.random() + 0.5);
  dummy.updateMatrix();
  
  mesh.setMatrixAt(i, dummy.matrix);
  mesh.setColorAt(i, color.setHex(Math.random() * 0xffffff));
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor.needsUpdate = true;

scene.add(mesh);
```

## 本章小结

- Mesh 组合几何体和材质
- 支持单材质和多材质
- morphTargetInfluences 控制变形动画
- raycast 实现精确射线检测
- SkinnedMesh 支持骨骼动画
- InstancedMesh 高效渲染大量相同几何体

下一章，我们将学习 Layers 图层系统。
