# InterleavedBuffer 交错缓冲

> "交错缓冲把相关属性存储在一起，提升缓存命中率。"

## 交错缓冲概述

### 常规布局 vs 交错布局

```
常规布局 (Separate):
Position Buffer: [x0,y0,z0, x1,y1,z1, x2,y2,z2, ...]
Normal Buffer:   [nx0,ny0,nz0, nx1,ny1,nz1, ...]
UV Buffer:       [u0,v0, u1,v1, u2,v2, ...]

交错布局 (Interleaved):
Single Buffer: [x0,y0,z0, nx0,ny0,nz0, u0,v0,
                x1,y1,z1, nx1,ny1,nz1, u1,v1,
                x2,y2,z2, nx2,ny2,nz2, u2,v2, ...]
```

### 优势

- **缓存友好**: 同一顶点的数据在内存中连续
- **减少绑定**: 只需绑定一个缓冲区
- **GPU 优化**: 更好的内存访问模式

## InterleavedBuffer 实现

```typescript
// src/core/InterleavedBuffer.ts
import { MathUtils } from '../math/MathUtils';
import { StaticDrawUsage } from '../constants';

type TypedArray = 
  | Float32Array 
  | Float64Array 
  | Uint8Array 
  | Int8Array 
  | Uint16Array 
  | Int16Array 
  | Uint32Array 
  | Int32Array;

export class InterleavedBuffer {
  readonly isInterleavedBuffer = true;
  
  array: TypedArray;
  stride: number;
  count: number;
  
  usage: number;
  updateRange: { offset: number; count: number };
  
  version: number;
  uuid: string;
  
  constructor(array: TypedArray, stride: number) {
    this.array = array;
    this.stride = stride;
    this.count = array.length / stride;
    
    this.usage = StaticDrawUsage;
    this.updateRange = { offset: 0, count: -1 };
    
    this.version = 0;
    this.uuid = MathUtils.generateUUID();
  }
  
  set needsUpdate(value: boolean) {
    if (value === true) {
      this.version++;
    }
  }
  
  setUsage(value: number): this {
    this.usage = value;
    return this;
  }
  
  copy(source: InterleavedBuffer): this {
    this.array = new (source.array.constructor as any)(source.array);
    this.stride = source.stride;
    this.count = source.count;
    this.usage = source.usage;
    return this;
  }
  
  copyAt(
    index1: number,
    attribute: InterleavedBuffer,
    index2: number
  ): this {
    index1 *= this.stride;
    index2 *= attribute.stride;
    
    for (let i = 0; i < this.stride; i++) {
      this.array[index1 + i] = attribute.array[index2 + i];
    }
    
    return this;
  }
  
  set(value: TypedArray, offset = 0): this {
    this.array.set(value, offset);
    return this;
  }
  
  clone(data?: any): InterleavedBuffer {
    if (data && data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }
    
    if (this.array.buffer._uuid === undefined) {
      (this.array.buffer as any)._uuid = MathUtils.generateUUID();
    }
    
    if (data && data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      data.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer;
    }
    
    const array = new (this.array.constructor as any)(
      data.arrayBuffers[this.array.buffer._uuid]
    );
    
    const ib = new InterleavedBuffer(array, this.stride);
    ib.usage = this.usage;
    
    return ib;
  }
  
  toJSON(data?: any): any {
    if (data && data.arrayBuffers === undefined) {
      data.arrayBuffers = {};
    }
    
    if (this.array.buffer._uuid === undefined) {
      (this.array.buffer as any)._uuid = MathUtils.generateUUID();
    }
    
    if (data && data.arrayBuffers[this.array.buffer._uuid] === undefined) {
      data.arrayBuffers[this.array.buffer._uuid] = 
        Array.from(new Uint32Array(this.array.buffer));
    }
    
    return {
      uuid: this.uuid,
      buffer: this.array.buffer._uuid,
      type: this.array.constructor.name,
      stride: this.stride,
    };
  }
}
```

## InterleavedBufferAttribute 实现

```typescript
// src/core/InterleavedBufferAttribute.ts
import { InterleavedBuffer } from './InterleavedBuffer';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';
import { Vector4 } from '../math/Vector4';
import { Matrix3 } from '../math/Matrix3';
import { Matrix4 } from '../math/Matrix4';

const _vector = new Vector3();

export class InterleavedBufferAttribute {
  readonly isInterleavedBufferAttribute = true;
  
  name: string;
  data: InterleavedBuffer;
  itemSize: number;
  offset: number;
  normalized: boolean;
  
  constructor(
    interleavedBuffer: InterleavedBuffer,
    itemSize: number,
    offset: number,
    normalized = false
  ) {
    this.name = '';
    this.data = interleavedBuffer;
    this.itemSize = itemSize;
    this.offset = offset;
    this.normalized = normalized;
  }
  
  get count(): number {
    return this.data.count;
  }
  
  get array(): TypedArray {
    return this.data.array;
  }
  
  set needsUpdate(value: boolean) {
    this.data.needsUpdate = value;
  }
  
  // 数据访问
  getX(index: number): number {
    return this.data.array[index * this.data.stride + this.offset];
  }
  
  setX(index: number, x: number): this {
    this.data.array[index * this.data.stride + this.offset] = x;
    return this;
  }
  
  getY(index: number): number {
    return this.data.array[index * this.data.stride + this.offset + 1];
  }
  
  setY(index: number, y: number): this {
    this.data.array[index * this.data.stride + this.offset + 1] = y;
    return this;
  }
  
  getZ(index: number): number {
    return this.data.array[index * this.data.stride + this.offset + 2];
  }
  
  setZ(index: number, z: number): this {
    this.data.array[index * this.data.stride + this.offset + 2] = z;
    return this;
  }
  
  getW(index: number): number {
    return this.data.array[index * this.data.stride + this.offset + 3];
  }
  
  setW(index: number, w: number): this {
    this.data.array[index * this.data.stride + this.offset + 3] = w;
    return this;
  }
  
  setXY(index: number, x: number, y: number): this {
    index = index * this.data.stride + this.offset;
    this.data.array[index] = x;
    this.data.array[index + 1] = y;
    return this;
  }
  
  setXYZ(index: number, x: number, y: number, z: number): this {
    index = index * this.data.stride + this.offset;
    this.data.array[index] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;
    return this;
  }
  
  setXYZW(
    index: number,
    x: number,
    y: number,
    z: number,
    w: number
  ): this {
    index = index * this.data.stride + this.offset;
    this.data.array[index] = x;
    this.data.array[index + 1] = y;
    this.data.array[index + 2] = z;
    this.data.array[index + 3] = w;
    return this;
  }
  
  // 变换
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
  
  // 克隆
  clone(data?: any): InterleavedBufferAttribute {
    if (data === undefined) {
      console.log(
        'InterleavedBufferAttribute.clone(): ' +
        'Cloning an InterleavedBufferAttribute will de-interleave buffer data.'
      );
      
      const array: number[] = [];
      
      for (let i = 0; i < this.count; i++) {
        const index = i * this.data.stride + this.offset;
        
        for (let j = 0; j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }
      
      return new BufferAttribute(
        new (this.array.constructor as any)(array),
        this.itemSize,
        this.normalized
      );
    }
    
    if (data.interleavedBuffers === undefined) {
      data.interleavedBuffers = {};
    }
    
    if (data.interleavedBuffers[this.data.uuid] === undefined) {
      data.interleavedBuffers[this.data.uuid] = this.data.clone(data);
    }
    
    return new InterleavedBufferAttribute(
      data.interleavedBuffers[this.data.uuid],
      this.itemSize,
      this.offset,
      this.normalized
    );
  }
  
  toJSON(data?: any): any {
    if (data === undefined) {
      console.log(
        'InterleavedBufferAttribute.toJSON(): ' +
        'Serializing an InterleavedBufferAttribute will de-interleave buffer data.'
      );
      
      const array: number[] = [];
      
      for (let i = 0; i < this.count; i++) {
        const index = i * this.data.stride + this.offset;
        
        for (let j = 0; j < this.itemSize; j++) {
          array.push(this.data.array[index + j]);
        }
      }
      
      return {
        itemSize: this.itemSize,
        type: this.array.constructor.name,
        array,
        normalized: this.normalized,
      };
    }
    
    if (data.interleavedBuffers === undefined) {
      data.interleavedBuffers = {};
    }
    
    if (data.interleavedBuffers[this.data.uuid] === undefined) {
      data.interleavedBuffers[this.data.uuid] = this.data.toJSON(data);
    }
    
    return {
      isInterleavedBufferAttribute: true,
      itemSize: this.itemSize,
      data: this.data.uuid,
      offset: this.offset,
      normalized: this.normalized,
    };
  }
}
```

## 使用示例

### 创建交错几何体

```typescript
// 创建交错缓冲
// stride = 3 (position) + 3 (normal) + 2 (uv) = 8
const interleavedArray = new Float32Array([
  // 顶点 0: position, normal, uv
  0, 0, 0,    0, 0, 1,    0, 0,
  // 顶点 1
  1, 0, 0,    0, 0, 1,    1, 0,
  // 顶点 2
  1, 1, 0,    0, 0, 1,    1, 1,
  // 顶点 3
  0, 1, 0,    0, 0, 1,    0, 1,
]);

const interleavedBuffer = new InterleavedBuffer(interleavedArray, 8);

// 创建属性视图
const positionAttribute = new InterleavedBufferAttribute(
  interleavedBuffer,
  3,  // itemSize
  0   // offset
);

const normalAttribute = new InterleavedBufferAttribute(
  interleavedBuffer,
  3,  // itemSize
  3   // offset (after position)
);

const uvAttribute = new InterleavedBufferAttribute(
  interleavedBuffer,
  2,  // itemSize
  6   // offset (after position + normal)
);

// 创建几何体
const geometry = new BufferGeometry();
geometry.setAttribute('position', positionAttribute);
geometry.setAttribute('normal', normalAttribute);
geometry.setAttribute('uv', uvAttribute);
geometry.setIndex([0, 1, 2, 0, 2, 3]);
```

### 数据布局示意

```
Array Index:  0  1  2  3  4  5  6  7 | 8  9 10 11 12 13 14 15 | ...
              |--position--| |--normal--| |-uv-|

stride = 8 (floats per vertex)

Position: offset=0, itemSize=3
Normal:   offset=3, itemSize=3  
UV:       offset=6, itemSize=2

访问顶点 i 的数据:
- position: array[i * 8 + 0], array[i * 8 + 1], array[i * 8 + 2]
- normal:   array[i * 8 + 3], array[i * 8 + 4], array[i * 8 + 5]
- uv:       array[i * 8 + 6], array[i * 8 + 7]
```

### 动态更新

```typescript
const buffer = geometry.attributes.position.data;

function animate(time: number) {
  // 更新所有顶点
  for (let i = 0; i < buffer.count; i++) {
    const offset = i * buffer.stride;
    
    // 更新 y 位置
    buffer.array[offset + 1] = Math.sin(time + i * 0.5);
  }
  
  buffer.needsUpdate = true;
  
  requestAnimationFrame(animate);
}
```

## 与 WebGL 的对应

### VAO 设置

```typescript
function setupInterleavedAttributes(
  gl: WebGL2RenderingContext,
  buffer: InterleavedBuffer,
  attributes: InterleavedBufferAttribute[]
): void {
  // 创建并绑定 VBO
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, buffer.array, gl.STATIC_DRAW);
  
  const stride = buffer.stride * Float32Array.BYTES_PER_ELEMENT;
  
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    const offset = attr.offset * Float32Array.BYTES_PER_ELEMENT;
    
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(
      i,              // location
      attr.itemSize,  // size
      gl.FLOAT,       // type
      false,          // normalized
      stride,         // stride in bytes
      offset          // offset in bytes
    );
  }
}
```

### 内存布局对比

```
分离布局 (Separate):
Buffer 1: [P0 P1 P2 P3 ...]  位置
Buffer 2: [N0 N1 N2 N3 ...]  法线
Buffer 3: [U0 U1 U2 U3 ...]  UV

交错布局 (Interleaved):
Buffer:   [P0 N0 U0 | P1 N1 U1 | P2 N2 U2 | ...]

GPU 读取顶点 i 时:
- 分离布局: 3 次内存访问，可能 3 次缓存未命中
- 交错布局: 1 次内存访问，数据连续
```

## 性能考虑

### 何时使用交错缓冲

| 场景 | 推荐 |
|------|------|
| 静态几何体 | ✅ 交错 |
| 频繁更新所有属性 | ✅ 交错 |
| 只更新部分属性 | ❌ 分离 |
| 不同属性更新频率不同 | ❌ 分离 |
| 属性需要共享 | 视情况 |

### 典型应用

```typescript
// 静态模型 - 适合交错
class StaticModel {
  createInterleavedGeometry(vertices: Float32Array): BufferGeometry {
    const stride = 8; // pos(3) + normal(3) + uv(2)
    const buffer = new InterleavedBuffer(vertices, stride);
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', 
      new InterleavedBufferAttribute(buffer, 3, 0));
    geometry.setAttribute('normal', 
      new InterleavedBufferAttribute(buffer, 3, 3));
    geometry.setAttribute('uv', 
      new InterleavedBufferAttribute(buffer, 2, 6));
    
    return geometry;
  }
}

// 粒子系统 - 可能不适合（只更新位置）
class ParticleSystem {
  // 分离更好：只需更新位置缓冲
  createSeparateGeometry(count: number): BufferGeometry {
    const geometry = new BufferGeometry();
    
    // 位置经常更新
    geometry.setAttribute('position',
      new Float32BufferAttribute(new Float32Array(count * 3), 3)
        .setUsage(DynamicDrawUsage)
    );
    
    // 颜色很少更新
    geometry.setAttribute('color',
      new Float32BufferAttribute(new Float32Array(count * 3), 3)
    );
    
    return geometry;
  }
}
```

## 本章小结

- InterleavedBuffer 存储交错的顶点数据
- stride 指定每个顶点的总浮点数
- InterleavedBufferAttribute 是缓冲区的视图
- offset 指定属性在顶点中的起始位置
- 交错布局提升缓存命中率
- 适合静态或整体更新的几何体

下一章，我们将学习 Mesh 网格对象。
