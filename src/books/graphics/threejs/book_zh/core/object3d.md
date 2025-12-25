# Object3D 基类完整实现

> "Object3D 是 Three.js 世界的基石，承载着所有 3D 对象的共同特性。"

## Object3D 结构

```
Object3D
├── 标识 (id, uuid, name, type)
├── 变换 (position, rotation, quaternion, scale)
├── 矩阵 (matrix, matrixWorld)
├── 层级 (parent, children)
├── 渲染 (visible, frustumCulled, renderOrder)
├── 层级掩码 (layers)
└── 自定义 (userData)
```

## 完整实现

### 基础属性

```typescript
// src/core/Object3D.ts
import { EventDispatcher } from './EventDispatcher';
import { Euler } from '../math/Euler';
import { Quaternion } from '../math/Quaternion';
import { Matrix4 } from '../math/Matrix4';
import { Matrix3 } from '../math/Matrix3';
import { Vector3 } from '../math/Vector3';
import { Layers } from './Layers';
import { MathUtils } from '../math/MathUtils';

let _object3DId = 0;

const _v1 = new Vector3();
const _q1 = new Quaternion();
const _m1 = new Matrix4();
const _target = new Vector3();

const _position = new Vector3();
const _scale = new Vector3();
const _quaternion = new Quaternion();

const _xAxis = new Vector3(1, 0, 0);
const _yAxis = new Vector3(0, 1, 0);
const _zAxis = new Vector3(0, 0, 1);

export class Object3D extends EventDispatcher {
  readonly isObject3D = true;
  
  readonly id: number;
  uuid: string;
  name: string;
  type: string;
  
  parent: Object3D | null;
  children: Object3D[];
  
  up: Vector3;
  
  readonly position: Vector3;
  readonly rotation: Euler;
  readonly quaternion: Quaternion;
  readonly scale: Vector3;
  
  readonly modelViewMatrix: Matrix4;
  readonly normalMatrix: Matrix3;
  
  matrix: Matrix4;
  matrixWorld: Matrix4;
  
  matrixAutoUpdate: boolean;
  matrixWorldNeedsUpdate: boolean;
  matrixWorldAutoUpdate: boolean;
  
  layers: Layers;
  visible: boolean;
  
  castShadow: boolean;
  receiveShadow: boolean;
  
  frustumCulled: boolean;
  renderOrder: number;
  
  animations: AnimationClip[];
  
  userData: Record<string, unknown>;
  
  static DEFAULT_UP = new Vector3(0, 1, 0);
  static DEFAULT_MATRIX_AUTO_UPDATE = true;
  static DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;
  
  constructor() {
    super();
    
    this.id = _object3DId++;
    this.uuid = MathUtils.generateUUID();
    this.name = '';
    this.type = 'Object3D';
    
    this.parent = null;
    this.children = [];
    
    this.up = Object3D.DEFAULT_UP.clone();
    
    this.position = new Vector3();
    this.rotation = new Euler();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    
    // rotation 和 quaternion 双向同步
    this.rotation._onChange(() => {
      this.quaternion.setFromEuler(this.rotation, false);
    });
    
    this.quaternion._onChange(() => {
      this.rotation.setFromQuaternion(this.quaternion, undefined, false);
    });
    
    this.modelViewMatrix = new Matrix4();
    this.normalMatrix = new Matrix3();
    
    this.matrix = new Matrix4();
    this.matrixWorld = new Matrix4();
    
    this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE;
    this.matrixWorldNeedsUpdate = false;
    this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE;
    
    this.layers = new Layers();
    this.visible = true;
    
    this.castShadow = false;
    this.receiveShadow = false;
    
    this.frustumCulled = true;
    this.renderOrder = 0;
    
    this.animations = [];
    
    this.userData = {};
  }
}
```

### 层级操作

```typescript
add(...objects: Object3D[]): this {
  for (const object of objects) {
    if (object === this) {
      console.error("Object3D.add: Can't add object as a child of itself.");
      continue;
    }
    
    if (object && object.isObject3D) {
      if (object.parent !== null) {
        object.parent.remove(object);
      }
      
      object.parent = this;
      this.children.push(object);
      
      object.dispatchEvent({ type: 'added' });
    } else {
      console.error('Object3D.add: Not an instance of Object3D.', object);
    }
  }
  
  return this;
}

remove(...objects: Object3D[]): this {
  for (const object of objects) {
    const index = this.children.indexOf(object);
    
    if (index !== -1) {
      object.parent = null;
      this.children.splice(index, 1);
      
      object.dispatchEvent({ type: 'removed' });
    }
  }
  
  return this;
}

removeFromParent(): this {
  const parent = this.parent;
  
  if (parent !== null) {
    parent.remove(this);
  }
  
  return this;
}

clear(): this {
  for (const child of this.children) {
    child.parent = null;
    child.dispatchEvent({ type: 'removed' });
  }
  
  this.children.length = 0;
  
  return this;
}

attach(object: Object3D): this {
  // 在世界空间中附加对象，保持世界变换
  this.updateWorldMatrix(true, false);
  
  _m1.copy(this.matrixWorld).invert();
  
  if (object.parent !== null) {
    object.parent.updateWorldMatrix(true, false);
    _m1.multiply(object.parent.matrixWorld);
  }
  
  object.applyMatrix4(_m1);
  
  this.add(object);
  
  object.updateWorldMatrix(false, true);
  
  return this;
}
```

### 查找

```typescript
getObjectById(id: number): Object3D | undefined {
  return this.getObjectByProperty('id', id);
}

getObjectByName(name: string): Object3D | undefined {
  return this.getObjectByProperty('name', name);
}

getObjectByProperty(name: string, value: unknown): Object3D | undefined {
  if ((this as any)[name] === value) return this;
  
  for (const child of this.children) {
    const object = child.getObjectByProperty(name, value);
    
    if (object !== undefined) {
      return object;
    }
  }
  
  return undefined;
}

getObjectsByProperty(
  name: string, 
  value: unknown, 
  result: Object3D[] = []
): Object3D[] {
  if ((this as any)[name] === value) {
    result.push(this);
  }
  
  for (const child of this.children) {
    child.getObjectsByProperty(name, value, result);
  }
  
  return result;
}
```

### 世界属性

```typescript
getWorldPosition(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  return target.setFromMatrixPosition(this.matrixWorld);
}

getWorldQuaternion(target: Quaternion): Quaternion {
  this.updateWorldMatrix(true, false);
  this.matrixWorld.decompose(_position, target, _scale);
  return target;
}

getWorldScale(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  this.matrixWorld.decompose(_position, _quaternion, target);
  return target;
}

getWorldDirection(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  
  const e = this.matrixWorld.elements;
  
  return target.set(e[8], e[9], e[10]).normalize();
}
```

### 变换方法

```typescript
applyMatrix4(matrix: Matrix4): this {
  if (this.matrixAutoUpdate) {
    this.updateMatrix();
  }
  
  this.matrix.premultiply(matrix);
  this.matrix.decompose(this.position, this.quaternion, this.scale);
  
  return this;
}

applyQuaternion(q: Quaternion): this {
  this.quaternion.premultiply(q);
  return this;
}

setRotationFromAxisAngle(axis: Vector3, angle: number): void {
  this.quaternion.setFromAxisAngle(axis, angle);
}

setRotationFromEuler(euler: Euler): void {
  this.quaternion.setFromEuler(euler, true);
}

setRotationFromMatrix(m: Matrix4): void {
  this.quaternion.setFromRotationMatrix(m);
}

setRotationFromQuaternion(q: Quaternion): void {
  this.quaternion.copy(q);
}
```

### 局部变换

```typescript
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

translateOnAxis(axis: Vector3, distance: number): this {
  _v1.copy(axis).applyQuaternion(this.quaternion);
  this.position.add(_v1.multiplyScalar(distance));
  return this;
}

translateX(distance: number): this {
  return this.translateOnAxis(_xAxis, distance);
}

translateY(distance: number): this {
  return this.translateOnAxis(_yAxis, distance);
}

translateZ(distance: number): this {
  return this.translateOnAxis(_zAxis, distance);
}
```

### 坐标转换

```typescript
localToWorld(vector: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  return vector.applyMatrix4(this.matrixWorld);
}

worldToLocal(vector: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  return vector.applyMatrix4(_m1.copy(this.matrixWorld).invert());
}
```

### 朝向

```typescript
lookAt(x: number | Vector3, y?: number, z?: number): void {
  if (x instanceof Vector3) {
    _target.copy(x);
  } else {
    _target.set(x, y!, z!);
  }
  
  const parent = this.parent;
  
  this.updateWorldMatrix(true, false);
  
  _position.setFromMatrixPosition(this.matrixWorld);
  
  if ((this as any).isCamera || (this as any).isLight) {
    _m1.lookAt(_position, _target, this.up);
  } else {
    _m1.lookAt(_target, _position, this.up);
  }
  
  this.quaternion.setFromRotationMatrix(_m1);
  
  if (parent) {
    _m1.extractRotation(parent.matrixWorld);
    _q1.setFromRotationMatrix(_m1);
    this.quaternion.premultiply(_q1.invert());
  }
}
```

### 矩阵更新

```typescript
updateMatrix(): void {
  this.matrix.compose(this.position, this.quaternion, this.scale);
  this.matrixWorldNeedsUpdate = true;
}

updateMatrixWorld(force = false): void {
  if (this.matrixAutoUpdate) {
    this.updateMatrix();
  }
  
  if (this.matrixWorldNeedsUpdate || force) {
    if (this.parent === null) {
      this.matrixWorld.copy(this.matrix);
    } else {
      this.matrixWorld.multiplyMatrices(
        this.parent.matrixWorld,
        this.matrix
      );
    }
    
    this.matrixWorldNeedsUpdate = false;
    force = true;
  }
  
  // 递归更新子对象
  const children = this.children;
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    if (child.matrixWorldAutoUpdate === true || force === true) {
      child.updateMatrixWorld(force);
    }
  }
}

updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
  const parent = this.parent;
  
  if (updateParents && parent !== null && parent.matrixWorldAutoUpdate) {
    parent.updateWorldMatrix(true, false);
  }
  
  if (this.matrixAutoUpdate) {
    this.updateMatrix();
  }
  
  if (this.parent === null) {
    this.matrixWorld.copy(this.matrix);
  } else {
    this.matrixWorld.multiplyMatrices(
      this.parent.matrixWorld,
      this.matrix
    );
  }
  
  if (updateChildren) {
    const children = this.children;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      
      if (child.matrixWorldAutoUpdate) {
        child.updateWorldMatrix(false, true);
      }
    }
  }
}
```

### 遍历

```typescript
traverse(callback: (object: Object3D) => void): void {
  callback(this);
  
  const children = this.children;
  
  for (let i = 0; i < children.length; i++) {
    children[i].traverse(callback);
  }
}

traverseVisible(callback: (object: Object3D) => void): void {
  if (this.visible === false) return;
  
  callback(this);
  
  const children = this.children;
  
  for (let i = 0; i < children.length; i++) {
    children[i].traverseVisible(callback);
  }
}

traverseAncestors(callback: (object: Object3D) => void): void {
  const parent = this.parent;
  
  if (parent !== null) {
    callback(parent);
    parent.traverseAncestors(callback);
  }
}
```

### 克隆与复制

```typescript
clone(recursive = true): this {
  return new (this.constructor as any)().copy(this, recursive);
}

copy(source: Object3D, recursive = true): this {
  this.name = source.name;
  
  this.up.copy(source.up);
  
  this.position.copy(source.position);
  this.rotation.order = source.rotation.order;
  this.quaternion.copy(source.quaternion);
  this.scale.copy(source.scale);
  
  this.matrix.copy(source.matrix);
  this.matrixWorld.copy(source.matrixWorld);
  
  this.matrixAutoUpdate = source.matrixAutoUpdate;
  this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;
  this.matrixWorldAutoUpdate = source.matrixWorldAutoUpdate;
  
  this.layers.mask = source.layers.mask;
  this.visible = source.visible;
  
  this.castShadow = source.castShadow;
  this.receiveShadow = source.receiveShadow;
  
  this.frustumCulled = source.frustumCulled;
  this.renderOrder = source.renderOrder;
  
  this.animations = source.animations.slice();
  
  this.userData = JSON.parse(JSON.stringify(source.userData));
  
  if (recursive) {
    for (const child of source.children) {
      this.add(child.clone());
    }
  }
  
  return this;
}
```

### 序列化

```typescript
toJSON(meta?: any): any {
  const isRootObject = meta === undefined || typeof meta === 'string';
  
  const output: any = {};
  
  if (isRootObject) {
    meta = {
      geometries: {},
      materials: {},
      textures: {},
      images: {},
      shapes: {},
      skeletons: {},
      animations: {},
      nodes: {},
    };
    
    output.metadata = {
      version: 4.6,
      type: 'Object',
      generator: 'Object3D.toJSON',
    };
  }
  
  const object: any = {};
  
  object.uuid = this.uuid;
  object.type = this.type;
  
  if (this.name !== '') object.name = this.name;
  if (this.castShadow) object.castShadow = true;
  if (this.receiveShadow) object.receiveShadow = true;
  if (!this.visible) object.visible = false;
  if (!this.frustumCulled) object.frustumCulled = false;
  if (this.renderOrder !== 0) object.renderOrder = this.renderOrder;
  if (Object.keys(this.userData).length > 0) {
    object.userData = this.userData;
  }
  
  object.layers = this.layers.mask;
  object.matrix = this.matrix.toArray();
  object.up = this.up.toArray();
  
  if (!this.matrixAutoUpdate) object.matrixAutoUpdate = false;
  
  // 子对象
  if (this.children.length > 0) {
    object.children = [];
    
    for (const child of this.children) {
      object.children.push(child.toJSON(meta).object);
    }
  }
  
  // 动画
  if (this.animations.length > 0) {
    object.animations = [];
    
    for (const animation of this.animations) {
      object.animations.push(animation.toJSON(meta));
    }
  }
  
  if (isRootObject) {
    // 包含引用的资源
    const geometries = extractFromCache(meta.geometries);
    const materials = extractFromCache(meta.materials);
    const textures = extractFromCache(meta.textures);
    const images = extractFromCache(meta.images);
    
    if (geometries.length > 0) output.geometries = geometries;
    if (materials.length > 0) output.materials = materials;
    if (textures.length > 0) output.textures = textures;
    if (images.length > 0) output.images = images;
  }
  
  output.object = object;
  
  return output;
}

function extractFromCache(cache: Record<string, any>): any[] {
  const values = [];
  
  for (const key in cache) {
    const data = cache[key];
    delete data.metadata;
    values.push(data);
  }
  
  return values;
}
```

## 使用示例

### 基本变换

```typescript
const cube = new Mesh(geometry, material);

// 位置
cube.position.set(1, 2, 3);

// 旋转（欧拉角）
cube.rotation.set(0, Math.PI / 4, 0);

// 或四元数
cube.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 4);

// 缩放
cube.scale.set(2, 2, 2);
```

### 层级结构

```typescript
const parent = new Object3D();
const child1 = new Mesh(geometry1, material1);
const child2 = new Mesh(geometry2, material2);

parent.add(child1, child2);

// 子对象相对于父对象定位
child1.position.set(1, 0, 0);
child2.position.set(-1, 0, 0);

// 移动父对象，子对象跟随
parent.position.y = 5;
```

### 遍历场景

```typescript
scene.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});
```

## 本章小结

- Object3D 是所有 3D 对象的基类
- 支持完整的变换系统
- 实现父子层级关系
- 提供遍历、查找方法
- 支持克隆和序列化
- rotation 和 quaternion 自动同步

下一章，我们将学习 Scene 类的详细实现。
