# WebGLGeometries 几何体管理

> "几何体是 3D 对象的骨架，高效管理几何体资源至关重要。"

## 几何体管理结构

```
WebGLGeometries
├── 几何体缓存
│   ├── BufferGeometry → WebGL Buffers
│   └── 引用计数
├── 属性更新
│   ├── 创建 Buffer
│   └── 更新 Buffer
├── 线框生成
│   ├── 索引几何体
│   └── 非索引几何体
└── 资源清理
    ├── dispose 事件
    └── 自动清理
```

## WebGLGeometries 实现

```typescript
// src/renderers/webgl/WebGLGeometries.ts
interface GeometryData {
  wireframe: BufferAttribute | null;
  updateRanges: Map<BufferAttribute, { start: number; count: number }[]>;
}

export class WebGLGeometries {
  private _gl: WebGL2RenderingContext;
  private _attributes: WebGLAttributes;
  private _info: WebGLInfo;
  
  private _geometries = new WeakMap<BufferGeometry, GeometryData>();
  
  constructor(
    gl: WebGL2RenderingContext,
    attributes: WebGLAttributes,
    info: WebGLInfo
  ) {
    this._gl = gl;
    this._attributes = attributes;
    this._info = info;
  }
  
  // ==================== 获取/更新几何体 ====================
  
  get(geometry: BufferGeometry): GeometryData {
    let data = this._geometries.get(geometry);
    
    if (!data) {
      data = {
        wireframe: null,
        updateRanges: new Map(),
      };
      
      this._geometries.set(geometry, data);
      
      // 监听 dispose
      geometry.addEventListener('dispose', this._onGeometryDispose);
      
      // 统计
      this._info.memory.geometries++;
    }
    
    return data;
  }
  
  update(geometry: BufferGeometry): void {
    const gl = this._gl;
    
    // 确保有缓存数据
    this.get(geometry);
    
    // 更新所有属性
    const geometryAttributes = geometry.attributes;
    
    for (const name in geometryAttributes) {
      this._attributes.update(geometryAttributes[name], gl.ARRAY_BUFFER);
    }
    
    // 更新形态目标属性
    const morphAttributes = geometry.morphAttributes;
    
    for (const name in morphAttributes) {
      const array = morphAttributes[name];
      
      for (let i = 0; i < array.length; i++) {
        this._attributes.update(array[i], gl.ARRAY_BUFFER);
      }
    }
  }
  
  // ==================== 线框几何体 ====================
  
  getWireframeAttribute(geometry: BufferGeometry): BufferAttribute {
    const data = this.get(geometry);
    
    // 检查缓存
    if (data.wireframe) {
      // 检查是否需要更新
      const currentVersion = geometry.index?.version ?? geometry.attributes.position.version;
      
      if (data.wireframe.version !== currentVersion) {
        data.wireframe = null;
      }
    }
    
    if (!data.wireframe) {
      data.wireframe = this._computeWireframeAttribute(geometry);
    }
    
    return data.wireframe;
  }
  
  private _computeWireframeAttribute(geometry: BufferGeometry): BufferAttribute {
    const indices: number[] = [];
    const geometryIndex = geometry.index;
    const geometryPosition = geometry.attributes.position;
    
    if (geometryIndex !== null) {
      // 索引几何体
      const array = geometryIndex.array;
      
      for (let i = 0; i < array.length; i += 3) {
        const a = array[i];
        const b = array[i + 1];
        const c = array[i + 2];
        
        // 三角形的三条边
        indices.push(a, b, b, c, c, a);
      }
    } else {
      // 非索引几何体
      const count = geometryPosition.count;
      
      for (let i = 0; i < count; i += 3) {
        const a = i;
        const b = i + 1;
        const c = i + 2;
        
        indices.push(a, b, b, c, c, a);
      }
    }
    
    // 创建属性
    const array = arrayNeedsUint32(indices, geometryPosition.count)
      ? new Uint32Array(indices)
      : new Uint16Array(indices);
    
    const attribute = new BufferAttribute(array, 1);
    attribute.version = geometryIndex?.version ?? geometryPosition.version;
    
    // 上传到 GPU
    this._attributes.update(attribute, this._gl.ELEMENT_ARRAY_BUFFER);
    
    return attribute;
  }
  
  // ==================== 清理 ====================
  
  private _onGeometryDispose = (event: Event): void => {
    const geometry = event.target as BufferGeometry;
    
    this._disposeGeometry(geometry);
  };
  
  private _disposeGeometry(geometry: BufferGeometry): void {
    const data = this._geometries.get(geometry);
    
    if (!data) return;
    
    geometry.removeEventListener('dispose', this._onGeometryDispose);
    
    // 移除索引
    if (geometry.index !== null) {
      this._attributes.remove(geometry.index);
    }
    
    // 移除属性
    const geometryAttributes = geometry.attributes;
    
    for (const name in geometryAttributes) {
      this._attributes.remove(geometryAttributes[name]);
    }
    
    // 移除形态目标
    const morphAttributes = geometry.morphAttributes;
    
    for (const name in morphAttributes) {
      const array = morphAttributes[name];
      
      for (let i = 0; i < array.length; i++) {
        this._attributes.remove(array[i]);
      }
    }
    
    // 移除线框索引
    if (data.wireframe) {
      this._attributes.remove(data.wireframe);
    }
    
    this._geometries.delete(geometry);
    
    // 统计
    this._info.memory.geometries--;
  };
  
  dispose(): void {
    // 清理所有几何体
    // 注意：WeakMap 无法遍历，实际实现需要维护额外的 Set
  }
}

// ==================== 辅助函数 ====================

function arrayNeedsUint32(array: number[], maxValue: number): boolean {
  // 检查是否需要 Uint32
  for (let i = 0; i < array.length; i++) {
    if (array[i] >= 65535) return true;
  }
  
  return maxValue >= 65535;
}
```

## WebGLObjects 对象管理

```typescript
// src/renderers/webgl/WebGLObjects.ts
export class WebGLObjects {
  private _gl: WebGL2RenderingContext;
  private _geometries: WebGLGeometries;
  private _attributes: WebGLAttributes;
  private _info: WebGLInfo;
  
  private _updateMap = new WeakMap<BufferGeometry, number>();
  
  constructor(
    gl: WebGL2RenderingContext,
    geometries: WebGLGeometries,
    attributes: WebGLAttributes,
    info: WebGLInfo
  ) {
    this._gl = gl;
    this._geometries = geometries;
    this._attributes = attributes;
    this._info = info;
  }
  
  update(object: Object3D): BufferGeometry {
    const frame = this._info.render.frame;
    const geometry = (object as Mesh).geometry;
    
    // 每帧只更新一次
    if (this._updateMap.get(geometry) !== frame) {
      // 更新几何体
      this._geometries.update(geometry);
      
      // 更新索引
      if (geometry.index !== null) {
        this._attributes.update(geometry.index, this._gl.ELEMENT_ARRAY_BUFFER);
      }
      
      this._updateMap.set(geometry, frame);
    }
    
    return geometry;
  }
  
  dispose(): void {
    // 清理
  }
}
```

## 几何体内存优化

### 几何体合并

```typescript
// src/utils/BufferGeometryUtils.ts
export class BufferGeometryUtils {
  /**
   * 合并多个几何体
   */
  static mergeGeometries(
    geometries: BufferGeometry[],
    useGroups = false
  ): BufferGeometry | null {
    const isIndexed = geometries[0].index !== null;
    
    // 验证所有几何体具有相同属性
    const attributesUsed = new Set<string>();
    
    for (const geometry of geometries) {
      for (const name in geometry.attributes) {
        attributesUsed.add(name);
      }
    }
    
    // 计算总数
    let totalVertices = 0;
    let totalIndices = 0;
    
    for (const geometry of geometries) {
      totalVertices += geometry.attributes.position.count;
      
      if (isIndexed) {
        totalIndices += geometry.index!.count;
      }
    }
    
    // 创建合并后的属性
    const mergedGeometry = new BufferGeometry();
    const mergedAttributes: Record<string, Float32Array> = {};
    
    for (const name of attributesUsed) {
      const firstAttribute = geometries[0].attributes[name];
      const itemSize = firstAttribute.itemSize;
      
      mergedAttributes[name] = new Float32Array(totalVertices * itemSize);
    }
    
    // 合并索引
    let mergedIndex: Uint32Array | null = null;
    if (isIndexed) {
      mergedIndex = new Uint32Array(totalIndices);
    }
    
    // 填充数据
    let vertexOffset = 0;
    let indexOffset = 0;
    
    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];
      const positionCount = geometry.attributes.position.count;
      
      // 复制属性
      for (const name of attributesUsed) {
        const attribute = geometry.attributes[name];
        const itemSize = attribute.itemSize;
        
        for (let j = 0; j < positionCount; j++) {
          for (let k = 0; k < itemSize; k++) {
            mergedAttributes[name][(vertexOffset + j) * itemSize + k] =
              attribute.array[j * itemSize + k];
          }
        }
      }
      
      // 复制索引（偏移顶点索引）
      if (isIndexed && mergedIndex) {
        const index = geometry.index!;
        
        for (let j = 0; j < index.count; j++) {
          mergedIndex[indexOffset + j] = index.array[j] + vertexOffset;
        }
        
        indexOffset += index.count;
      }
      
      // 添加组
      if (useGroups) {
        if (isIndexed) {
          mergedGeometry.addGroup(
            indexOffset - index!.count,
            index!.count,
            i
          );
        } else {
          mergedGeometry.addGroup(vertexOffset, positionCount, i);
        }
      }
      
      vertexOffset += positionCount;
    }
    
    // 设置属性
    for (const name in mergedAttributes) {
      const firstAttribute = geometries[0].attributes[name];
      const attribute = new BufferAttribute(
        mergedAttributes[name],
        firstAttribute.itemSize,
        firstAttribute.normalized
      );
      
      mergedGeometry.setAttribute(name, attribute);
    }
    
    // 设置索引
    if (mergedIndex) {
      mergedGeometry.setIndex(new BufferAttribute(mergedIndex, 1));
    }
    
    return mergedGeometry;
  }
  
  /**
   * 计算切线
   */
  static computeTangents(geometry: BufferGeometry): void {
    const index = geometry.index;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    
    if (!uv) {
      console.warn('Tangent calculation requires UV coordinates');
      return;
    }
    
    const nVertices = position.count;
    const tangents = new Float32Array(nVertices * 4);
    
    const tan1 = new Float32Array(nVertices * 3);
    const tan2 = new Float32Array(nVertices * 3);
    
    const vA = new Vector3();
    const vB = new Vector3();
    const vC = new Vector3();
    
    const uvA = new Vector2();
    const uvB = new Vector2();
    const uvC = new Vector2();
    
    const sdir = new Vector3();
    const tdir = new Vector3();
    
    function handleTriangle(a: number, b: number, c: number): void {
      vA.fromBufferAttribute(position, a);
      vB.fromBufferAttribute(position, b);
      vC.fromBufferAttribute(position, c);
      
      uvA.fromBufferAttribute(uv, a);
      uvB.fromBufferAttribute(uv, b);
      uvC.fromBufferAttribute(uv, c);
      
      const x1 = vB.x - vA.x;
      const y1 = vB.y - vA.y;
      const z1 = vB.z - vA.z;
      
      const x2 = vC.x - vA.x;
      const y2 = vC.y - vA.y;
      const z2 = vC.z - vA.z;
      
      const s1 = uvB.x - uvA.x;
      const t1 = uvB.y - uvA.y;
      
      const s2 = uvC.x - uvA.x;
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
      
      // 累加
      for (const i of [a, b, c]) {
        tan1[i * 3] += sdir.x;
        tan1[i * 3 + 1] += sdir.y;
        tan1[i * 3 + 2] += sdir.z;
        
        tan2[i * 3] += tdir.x;
        tan2[i * 3 + 1] += tdir.y;
        tan2[i * 3 + 2] += tdir.z;
      }
    }
    
    // 处理所有三角形
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        handleTriangle(
          index.array[i],
          index.array[i + 1],
          index.array[i + 2]
        );
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        handleTriangle(i, i + 1, i + 2);
      }
    }
    
    // 正交化
    const n = new Vector3();
    const t = new Vector3();
    const t2Vec = new Vector3();
    
    for (let i = 0; i < nVertices; i++) {
      n.fromBufferAttribute(normal, i);
      
      t.set(tan1[i * 3], tan1[i * 3 + 1], tan1[i * 3 + 2]);
      t2Vec.set(tan2[i * 3], tan2[i * 3 + 1], tan2[i * 3 + 2]);
      
      // Gram-Schmidt
      const tmp = t.clone().sub(n.clone().multiplyScalar(n.dot(t))).normalize();
      
      // 计算手性
      const w = n.clone().cross(t).dot(t2Vec) < 0 ? -1 : 1;
      
      tangents[i * 4] = tmp.x;
      tangents[i * 4 + 1] = tmp.y;
      tangents[i * 4 + 2] = tmp.z;
      tangents[i * 4 + 3] = w;
    }
    
    geometry.setAttribute('tangent', new BufferAttribute(tangents, 4));
  }
  
  /**
   * 交错缓冲区转换
   */
  static interleaveAttributes(geometry: BufferGeometry): BufferGeometry {
    const attributes = geometry.attributes;
    const position = attributes.position;
    
    if (!position) {
      console.warn('Geometry has no position attribute');
      return geometry;
    }
    
    // 计算步长
    let stride = 0;
    const attributeInfos: { name: string; size: number; offset: number }[] = [];
    
    for (const name in attributes) {
      const attribute = attributes[name];
      const size = attribute.itemSize;
      
      attributeInfos.push({
        name,
        size,
        offset: stride,
      });
      
      stride += size;
    }
    
    // 创建交错数组
    const count = position.count;
    const interleavedArray = new Float32Array(count * stride);
    
    for (let i = 0; i < count; i++) {
      for (const info of attributeInfos) {
        const attribute = attributes[info.name];
        
        for (let j = 0; j < info.size; j++) {
          interleavedArray[i * stride + info.offset + j] =
            attribute.array[i * info.size + j];
        }
      }
    }
    
    // 创建交错缓冲区
    const interleavedBuffer = new InterleavedBuffer(interleavedArray, stride);
    
    // 创建新几何体
    const newGeometry = new BufferGeometry();
    
    for (const info of attributeInfos) {
      const attribute = new InterleavedBufferAttribute(
        interleavedBuffer,
        info.size,
        info.offset
      );
      
      newGeometry.setAttribute(info.name, attribute);
    }
    
    // 复制索引
    if (geometry.index) {
      newGeometry.setIndex(geometry.index);
    }
    
    // 复制组
    for (const group of geometry.groups) {
      newGeometry.addGroup(group.start, group.count, group.materialIndex);
    }
    
    return newGeometry;
  }
}
```

## 使用示例

```typescript
// 创建几何体管理器
const geometries = new WebGLGeometries(gl, attributes, info);
const objects = new WebGLObjects(gl, geometries, attributes, info);

// 更新对象
const updatedGeometry = objects.update(mesh);

// 获取线框索引
const wireframeIndex = geometries.getWireframeAttribute(geometry);

// 合并几何体
const mergedGeometry = BufferGeometryUtils.mergeGeometries([
  geometry1,
  geometry2,
  geometry3,
]);

// 计算切线
BufferGeometryUtils.computeTangents(geometry);

// 转换为交错缓冲区
const interleavedGeometry = BufferGeometryUtils.interleaveAttributes(geometry);
```

## 本章小结

- WebGLGeometries 管理几何体 GPU 资源
- 自动生成线框索引
- WebGLObjects 每帧更新对象
- BufferGeometryUtils 提供几何体工具
- 支持几何体合并减少 Draw Call
- 交错缓冲区提高 GPU 缓存效率

下一章，我们将学习 WebGLCapabilities 能力检测。
