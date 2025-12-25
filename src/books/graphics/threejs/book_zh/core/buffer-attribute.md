# BufferAttribute 属性类

> "BufferAttribute 是顶点数据的载体，连接 JavaScript 和 GPU。"

## BufferAttribute 概述

BufferAttribute 封装类型化数组，存储顶点属性：

```
BufferAttribute
├── array (TypedArray) - 数据存储
├── itemSize (number) - 每个元素的分量数
├── count (number) - 元素数量
├── normalized (boolean) - 是否归一化
├── usage (number) - GPU 使用提示
└── version (number) - 更新版本号
```

## 完整实现

```typescript
// src/core/BufferAttribute.ts
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { Vector4 } from '../math/Vector4';
import { Matrix3 } from '../math/Matrix3';
import { Matrix4 } from '../math/Matrix4';
import { MathUtils } from '../math/MathUtils';
import { StaticDrawUsage } from '../constants';

type TypedArray = 
  | Float32Array 
  | Float64Array 
  | Int8Array 
  | Int16Array 
  | Int32Array 
  | Uint8Array 
  | Uint16Array 
  | Uint32Array;

const _vector = new Vector3();
const _vector2 = new Vector2();

export class BufferAttribute {
  readonly isBufferAttribute = true;
  
  name: string;
  array: TypedArray;
  itemSize: number;
  count: number;
  normalized: boolean;
  
  usage: number;
  updateRange: { offset: number; count: number };
  gpuType: number;
  
  version: number;
  
  constructor(
    array: TypedArray,
    itemSize: number,
    normalized = false
  ) {
    if (Array.isArray(array)) {
      throw new TypeError(
        'BufferAttribute: array should be a TypedArray.'
      );
    }
    
    this.name = '';
    this.array = array;
    this.itemSize = itemSize;
    this.count = array.length / itemSize;
    this.normalized = normalized;
    
    this.usage = StaticDrawUsage;
    this.updateRange = { offset: 0, count: -1 };
    this.gpuType = FloatType;
    
    this.version = 0;
  }
  
  set needsUpdate(value: boolean) {
    if (value === true) {
      this.version++;
    }
  }
  
  get needsUpdate(): boolean {
    return false; // 只写属性
  }
  
  setUsage(value: number): this {
    this.usage = value;
    return this;
  }
}
```

## 数据访问

### 单分量访问

```typescript
getX(index: number): number {
  let x = this.array[index * this.itemSize];
  
  if (this.normalized) {
    x = denormalize(x, this.array);
  }
  
  return x;
}

setX(index: number, x: number): this {
  if (this.normalized) {
    x = normalize(x, this.array);
  }
  
  this.array[index * this.itemSize] = x;
  return this;
}

getY(index: number): number {
  let y = this.array[index * this.itemSize + 1];
  
  if (this.normalized) {
    y = denormalize(y, this.array);
  }
  
  return y;
}

setY(index: number, y: number): this {
  if (this.normalized) {
    y = normalize(y, this.array);
  }
  
  this.array[index * this.itemSize + 1] = y;
  return this;
}

getZ(index: number): number {
  let z = this.array[index * this.itemSize + 2];
  
  if (this.normalized) {
    z = denormalize(z, this.array);
  }
  
  return z;
}

setZ(index: number, z: number): this {
  if (this.normalized) {
    z = normalize(z, this.array);
  }
  
  this.array[index * this.itemSize + 2] = z;
  return this;
}

getW(index: number): number {
  let w = this.array[index * this.itemSize + 3];
  
  if (this.normalized) {
    w = denormalize(w, this.array);
  }
  
  return w;
}

setW(index: number, w: number): this {
  if (this.normalized) {
    w = normalize(w, this.array);
  }
  
  this.array[index * this.itemSize + 3] = w;
  return this;
}
```

### 多分量访问

```typescript
setXY(index: number, x: number, y: number): this {
  index *= this.itemSize;
  
  if (this.normalized) {
    x = normalize(x, this.array);
    y = normalize(y, this.array);
  }
  
  this.array[index] = x;
  this.array[index + 1] = y;
  
  return this;
}

setXYZ(index: number, x: number, y: number, z: number): this {
  index *= this.itemSize;
  
  if (this.normalized) {
    x = normalize(x, this.array);
    y = normalize(y, this.array);
    z = normalize(z, this.array);
  }
  
  this.array[index] = x;
  this.array[index + 1] = y;
  this.array[index + 2] = z;
  
  return this;
}

setXYZW(
  index: number, 
  x: number, 
  y: number, 
  z: number, 
  w: number
): this {
  index *= this.itemSize;
  
  if (this.normalized) {
    x = normalize(x, this.array);
    y = normalize(y, this.array);
    z = normalize(z, this.array);
    w = normalize(w, this.array);
  }
  
  this.array[index] = x;
  this.array[index + 1] = y;
  this.array[index + 2] = z;
  this.array[index + 3] = w;
  
  return this;
}
```

## 归一化处理

```typescript
// 归一化（JavaScript 值 -> 存储值）
function normalize(value: number, array: TypedArray): number {
  switch (array.constructor) {
    case Float32Array:
      return value;
      
    case Uint32Array:
      return Math.round(value * 4294967295.0);
      
    case Uint16Array:
      return Math.round(value * 65535.0);
      
    case Uint8Array:
      return Math.round(value * 255.0);
      
    case Int32Array:
      return Math.round(value * 2147483647.0);
      
    case Int16Array:
      return Math.round(value * 32767.0);
      
    case Int8Array:
      return Math.round(value * 127.0);
      
    default:
      throw new Error('Invalid typed array type.');
  }
}

// 反归一化（存储值 -> JavaScript 值）
function denormalize(value: number, array: TypedArray): number {
  switch (array.constructor) {
    case Float32Array:
      return value;
      
    case Uint32Array:
      return value / 4294967295.0;
      
    case Uint16Array:
      return value / 65535.0;
      
    case Uint8Array:
      return value / 255.0;
      
    case Int32Array:
      return Math.max(value / 2147483647.0, -1.0);
      
    case Int16Array:
      return Math.max(value / 32767.0, -1.0);
      
    case Int8Array:
      return Math.max(value / 127.0, -1.0);
      
    default:
      throw new Error('Invalid typed array type.');
  }
}
```

## 批量操作

### 数组操作

```typescript
copyArray(array: number[]): this {
  this.array.set(array);
  return this;
}

set(value: number[] | TypedArray, offset = 0): this {
  this.array.set(value, offset);
  return this;
}

copyAt(
  index1: number, 
  attribute: BufferAttribute, 
  index2: number
): this {
  index1 *= this.itemSize;
  index2 *= attribute.itemSize;
  
  for (let i = 0; i < this.itemSize; i++) {
    this.array[index1 + i] = attribute.array[index2 + i];
  }
  
  return this;
}

copyColorsArray(colors: Array<{ r: number; g: number; b: number }>): this {
  const array = this.array;
  let offset = 0;
  
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    
    array[offset++] = color.r;
    array[offset++] = color.g;
    array[offset++] = color.b;
  }
  
  return this;
}

copyVector2sArray(vectors: Vector2[]): this {
  const array = this.array;
  let offset = 0;
  
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    
    array[offset++] = vector.x;
    array[offset++] = vector.y;
  }
  
  return this;
}

copyVector3sArray(vectors: Vector3[]): this {
  const array = this.array;
  let offset = 0;
  
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    
    array[offset++] = vector.x;
    array[offset++] = vector.y;
    array[offset++] = vector.z;
  }
  
  return this;
}

copyVector4sArray(vectors: Vector4[]): this {
  const array = this.array;
  let offset = 0;
  
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    
    array[offset++] = vector.x;
    array[offset++] = vector.y;
    array[offset++] = vector.z;
    array[offset++] = vector.w;
  }
  
  return this;
}
```

### 变换操作

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

## 克隆与复制

```typescript
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
  this.gpuType = source.gpuType;
  
  return this;
}
```

## 序列化

```typescript
toJSON(): any {
  const data: any = {
    itemSize: this.itemSize,
    type: this.array.constructor.name,
    array: Array.from(this.array),
    normalized: this.normalized,
  };
  
  if (this.name !== '') data.name = this.name;
  if (this.usage !== StaticDrawUsage) data.usage = this.usage;
  
  return data;
}
```

## 类型化属性类

### Float 属性

```typescript
export class Float16BufferAttribute extends BufferAttribute {
  readonly isFloat16BufferAttribute = true;
  
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Uint16Array(array as any), itemSize, normalized);
    this.gpuType = HalfFloatType;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Float32Array(array as any), itemSize, normalized);
  }
}

export class Float64BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Float64Array(array as any), itemSize, normalized);
  }
}
```

### Int 属性

```typescript
export class Int8BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Int8Array(array as any), itemSize, normalized);
  }
}

export class Int16BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Int16Array(array as any), itemSize, normalized);
  }
}

export class Int32BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Int32Array(array as any), itemSize, normalized);
  }
}
```

### Uint 属性

```typescript
export class Uint8BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Uint8Array(array as any), itemSize, normalized);
  }
}

export class Uint8ClampedBufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Uint8ClampedArray(array as any), itemSize, normalized);
  }
}

export class Uint16BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Uint16Array(array as any), itemSize, normalized);
  }
}

export class Uint32BufferAttribute extends BufferAttribute {
  constructor(
    array: Iterable<number> | number,
    itemSize: number,
    normalized?: boolean
  ) {
    super(new Uint32Array(array as any), itemSize, normalized);
  }
}
```

## 使用提示

### Usage 常量

```typescript
// src/constants.ts
export const StaticDrawUsage = 35044;   // 数据不变，用于绘制
export const DynamicDrawUsage = 35048;  // 数据频繁更新
export const StreamDrawUsage = 35040;   // 数据每帧更新
export const StaticReadUsage = 35045;   // 从 GPU 读取
export const DynamicReadUsage = 35049;
export const StreamReadUsage = 35041;
export const StaticCopyUsage = 35046;   // GPU 内部复制
export const DynamicCopyUsage = 35050;
export const StreamCopyUsage = 35042;
```

### 使用示例

```typescript
// 静态几何体（默认）
const positions = new Float32BufferAttribute(vertices, 3);
// usage = StaticDrawUsage

// 动态几何体
const dynamicPositions = new Float32BufferAttribute(vertices, 3);
dynamicPositions.setUsage(DynamicDrawUsage);

// 粒子系统（每帧更新）
const particlePositions = new Float32BufferAttribute(particles, 3);
particlePositions.setUsage(StreamDrawUsage);
```

## 实际应用

### 创建自定义几何体

```typescript
const vertices = new Float32Array([
  // 位置
  -1, -1, 0,
   1, -1, 0,
   0,  1, 0,
]);

const colors = new Float32Array([
  // 颜色
  1, 0, 0,  // 红
  0, 1, 0,  // 绿
  0, 0, 1,  // 蓝
]);

const geometry = new BufferGeometry();
geometry.setAttribute('position', new BufferAttribute(vertices, 3));
geometry.setAttribute('color', new BufferAttribute(colors, 3));
```

### 动态更新

```typescript
// 获取位置属性
const position = geometry.attributes.position;

// 更新顶点
function animate(time: number) {
  for (let i = 0; i < position.count; i++) {
    const y = Math.sin(time + i * 0.5);
    position.setY(i, y);
  }
  
  // 标记需要更新
  position.needsUpdate = true;
  
  requestAnimationFrame(animate);
}
```

### 部分更新

```typescript
// 只更新部分数据
const attribute = geometry.attributes.position;

// 设置更新范围
attribute.updateRange.offset = 0;  // 起始位置
attribute.updateRange.count = 100; // 更新数量

// 标记更新
attribute.needsUpdate = true;
```

## 本章小结

- BufferAttribute 封装 TypedArray 存储顶点数据
- itemSize 指定每个元素的分量数
- normalized 支持整数到浮点的转换
- usage 提示 GPU 数据使用模式
- version 跟踪更新，needsUpdate 触发上传
- 提供多种类型化子类

下一章，我们将学习 BufferGeometry 完整实现。
