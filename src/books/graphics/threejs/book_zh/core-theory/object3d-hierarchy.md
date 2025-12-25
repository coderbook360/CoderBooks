# Object3D 层次结构与场景图

> "场景图是 3D 世界的骨架，层次结构让复杂场景变得有序。"

## 场景图概念

### 什么是场景图

场景图（Scene Graph）是一种树形数据结构，用于组织 3D 场景中的对象。每个节点可以有一个父节点和多个子节点。

```
Scene (根节点)
├── Group (环境)
│   ├── AmbientLight
│   └── DirectionalLight
├── Mesh (地面)
└── Group (角色)
    ├── Mesh (身体)
    ├── Mesh (头部)
    └── Group (手臂)
        ├── Mesh (上臂)
        └── Mesh (前臂)
```

### 变换继承

子对象的世界变换 = 父对象的世界变换 × 子对象的局部变换

```
父对象位置: (10, 0, 0)
子对象局部位置: (0, 5, 0)
子对象世界位置: (10, 5, 0)
```

## Object3D 实现

### 基础结构

```typescript
// src/core/Object3D.ts
import { EventDispatcher } from './EventDispatcher';
import { Vector3 } from '../math/Vector3';
import { Euler } from '../math/Euler';
import { Quaternion } from '../math/Quaternion';
import { Matrix4 } from '../math/Matrix4';
import { Matrix3 } from '../math/Matrix3';
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
  
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  
  frustumCulled: boolean;
  renderOrder: number;
  
  userData: Record<string, unknown>;
  
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
    
    // rotation 和 quaternion 同步
    this.rotation.onChange = () => {
      this.quaternion.setFromEuler(this.rotation, false);
    };
    
    this.quaternion.onChange = () => {
      this.rotation.setFromQuaternion(this.quaternion, undefined, false);
    };
    
    this.modelViewMatrix = new Matrix4();
    this.normalMatrix = new Matrix3();
    
    this.matrix = new Matrix4();
    this.matrixWorld = new Matrix4();
    
    this.matrixAutoUpdate = Object3D.DEFAULT_MATRIX_AUTO_UPDATE;
    this.matrixWorldNeedsUpdate = false;
    this.matrixWorldAutoUpdate = Object3D.DEFAULT_MATRIX_WORLD_AUTO_UPDATE;
    
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
    
    this.frustumCulled = true;
    this.renderOrder = 0;
    
    this.userData = {};
  }
  
  static DEFAULT_UP = new Vector3(0, 1, 0);
  static DEFAULT_MATRIX_AUTO_UPDATE = true;
  static DEFAULT_MATRIX_WORLD_AUTO_UPDATE = true;
}
```

### 变换应用

```typescript
applyMatrix4(matrix: Matrix4): this {
  if (this.matrixAutoUpdate) this.updateMatrix();
  
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

### 局部旋转

```typescript
rotateOnAxis(axis: Vector3, angle: number): this {
  // 绕局部轴旋转
  _q1.setFromAxisAngle(axis, angle);
  this.quaternion.multiply(_q1);
  return this;
}

rotateOnWorldAxis(axis: Vector3, angle: number): this {
  // 绕世界轴旋转
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
```

### 局部平移

```typescript
translateOnAxis(axis: Vector3, distance: number): this {
  // 沿局部轴平移
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

### 局部 → 世界坐标转换

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

### lookAt

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
  
  if (this.isCamera || this.isLight) {
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

## 子对象管理

### add

```typescript
add(...objects: Object3D[]): this {
  for (const object of objects) {
    if (object === this) {
      console.error("Object3D.add: object can't be added as a child of itself.", object);
      continue;
    }
    
    if (object.parent !== null) {
      object.parent.remove(object);
    }
    
    object.parent = this;
    this.children.push(object);
    
    object.dispatchEvent({ type: 'added' });
  }
  
  return this;
}
```

### remove

```typescript
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
  return this.remove(...this.children);
}
```

### attach

保持世界变换不变地添加到新父对象：

```typescript
attach(object: Object3D): this {
  // 保存世界变换
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

getObjectsByProperty(name: string, value: unknown, result: Object3D[] = []): Object3D[] {
  if ((this as any)[name] === value) result.push(this);
  
  for (const child of this.children) {
    child.getObjectsByProperty(name, value, result);
  }
  
  return result;
}
```

## 矩阵更新

### updateMatrix

```typescript
updateMatrix(): void {
  this.matrix.compose(this.position, this.quaternion, this.scale);
  this.matrixWorldNeedsUpdate = true;
}
```

### updateMatrixWorld

```typescript
updateMatrixWorld(force = false): void {
  if (this.matrixAutoUpdate) this.updateMatrix();
  
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
  for (const child of this.children) {
    if (child.matrixWorldAutoUpdate || force) {
      child.updateMatrixWorld(force);
    }
  }
}
```

### updateWorldMatrix

更精细的控制：

```typescript
updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void {
  const parent = this.parent;
  
  if (updateParents && parent !== null) {
    parent.updateWorldMatrix(true, false);
  }
  
  if (this.matrixAutoUpdate) this.updateMatrix();
  
  if (this.parent === null) {
    this.matrixWorld.copy(this.matrix);
  } else {
    this.matrixWorld.multiplyMatrices(
      this.parent.matrixWorld,
      this.matrix
    );
  }
  
  if (updateChildren) {
    for (const child of this.children) {
      child.updateWorldMatrix(false, true);
    }
  }
}
```

## 遍历

### traverse

```typescript
traverse(callback: (object: Object3D) => void): void {
  callback(this);
  
  for (const child of this.children) {
    child.traverse(callback);
  }
}
```

### traverseVisible

```typescript
traverseVisible(callback: (object: Object3D) => void): void {
  if (this.visible === false) return;
  
  callback(this);
  
  for (const child of this.children) {
    child.traverseVisible(callback);
  }
}
```

### traverseAncestors

```typescript
traverseAncestors(callback: (object: Object3D) => void): void {
  const parent = this.parent;
  
  if (parent !== null) {
    callback(parent);
    parent.traverseAncestors(callback);
  }
}
```

## 世界属性获取

### getWorldPosition

```typescript
getWorldPosition(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  return target.setFromMatrixPosition(this.matrixWorld);
}
```

### getWorldQuaternion

```typescript
getWorldQuaternion(target: Quaternion): Quaternion {
  this.updateWorldMatrix(true, false);
  this.matrixWorld.decompose(_position, target, _scale);
  return target;
}
```

### getWorldScale

```typescript
getWorldScale(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  this.matrixWorld.decompose(_position, _quaternion, target);
  return target;
}
```

### getWorldDirection

```typescript
getWorldDirection(target: Vector3): Vector3 {
  this.updateWorldMatrix(true, false);
  
  const e = this.matrixWorld.elements;
  return target.set(e[8], e[9], e[10]).normalize();
}
```

## 克隆与复制

### clone

```typescript
clone(recursive = true): Object3D {
  return new (this.constructor as typeof Object3D)().copy(this, recursive);
}
```

### copy

```typescript
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
  
  this.visible = source.visible;
  
  this.castShadow = source.castShadow;
  this.receiveShadow = source.receiveShadow;
  
  this.frustumCulled = source.frustumCulled;
  this.renderOrder = source.renderOrder;
  
  this.userData = JSON.parse(JSON.stringify(source.userData));
  
  if (recursive) {
    for (const child of source.children) {
      this.add(child.clone());
    }
  }
  
  return this;
}
```

## JSON 序列化

### toJSON

```typescript
toJSON(meta?: { geometries: any; materials: any; textures: any; images: any }): any {
  const isRootObject = meta === undefined;
  
  const output: any = {};
  
  if (isRootObject) {
    meta = {
      geometries: {},
      materials: {},
      textures: {},
      images: {},
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
  
  object.matrix = this.matrix.toArray();
  
  if (this.children.length > 0) {
    object.children = [];
    
    for (const child of this.children) {
      object.children.push(child.toJSON(meta).object);
    }
  }
  
  if (isRootObject) {
    output.object = object;
  }
  
  return isRootObject ? output : { object };
}
```

## 使用示例

### 创建层次结构

```typescript
const scene = new Scene();

// 创建角色组
const character = new Group();
character.position.set(0, 0, 0);
scene.add(character);

// 添加身体
const body = new Mesh(bodyGeometry, bodyMaterial);
body.position.set(0, 1, 0);
character.add(body);

// 添加头部
const head = new Mesh(headGeometry, headMaterial);
head.position.set(0, 2, 0);
character.add(head);

// 移动整个角色
character.position.x = 5;  // 身体和头部都会跟随移动
```

### 局部旋转

```typescript
// 角色绕自身 Y 轴旋转
character.rotateY(Math.PI / 4);

// 头部绕局部 X 轴旋转（点头）
head.rotateX(-0.2);
```

### 查找对象

```typescript
// 按名称查找
const player = scene.getObjectByName('player');

// 按类型遍历
scene.traverse((object) => {
  if (object instanceof Mesh) {
    object.castShadow = true;
  }
});
```

### 世界坐标

```typescript
// 获取世界位置
const worldPos = new Vector3();
head.getWorldPosition(worldPos);
console.log('Head world position:', worldPos);

// 世界坐标转局部坐标
const localPos = character.worldToLocal(worldPos.clone());
```

## 本章小结

- Object3D 是所有 3D 对象的基类
- 场景图是树形层次结构
- 子对象继承父对象的变换
- rotation 和 quaternion 自动同步
- traverse 遍历整个子树
- updateMatrixWorld 递归更新变换矩阵

下一章，我们将学习 Scene 场景根节点的实现。
