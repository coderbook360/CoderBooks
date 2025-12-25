# 几何体工具函数

> "几何体工具让我们能够合并、转换和优化几何数据。"

## BufferGeometryUtils

```typescript
// src/utils/BufferGeometryUtils.ts
import { BufferGeometry } from '../core/BufferGeometry';
import { BufferAttribute, InterleavedBufferAttribute } from '../core/BufferAttribute';
import { Vector3 } from '../math/Vector3';
import { Triangle } from '../math/Triangle';

export class BufferGeometryUtils {
  
  // 合并多个几何体
  static mergeGeometries(
    geometries: BufferGeometry[],
    useGroups = false
  ): BufferGeometry | null {
    const isIndexed = geometries[0].index !== null;
    
    const attributesUsed = new Set(Object.keys(geometries[0].attributes));
    const morphAttributesUsed = new Set(Object.keys(geometries[0].morphAttributes));
    
    const attributes: Record<string, any[]> = {};
    const morphAttributes: Record<string, any[][]> = {};
    
    const morphTargetsRelative = geometries[0].morphTargetsRelative;
    
    const mergedGeometry = new BufferGeometry();
    
    let offset = 0;
    
    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];
      let attributesCount = 0;
      
      // 检查是否所有几何体都有相同的属性
      if (isIndexed !== (geometry.index !== null)) {
        console.error('All geometries must have compatible indexed state');
        return null;
      }
      
      // 收集属性
      for (const name in geometry.attributes) {
        if (!attributesUsed.has(name)) {
          console.error('All geometries must have compatible attributes');
          return null;
        }
        
        if (attributes[name] === undefined) {
          attributes[name] = [];
        }
        
        attributes[name].push(geometry.attributes[name]);
        attributesCount++;
      }
      
      if (attributesCount !== attributesUsed.size) {
        console.error('All geometries must have the same number of attributes');
        return null;
      }
      
      // 收集变形属性
      for (const name in geometry.morphAttributes) {
        if (!morphAttributesUsed.has(name)) {
          console.error('All geometries must have compatible morph attributes');
          return null;
        }
        
        if (morphAttributes[name] === undefined) {
          morphAttributes[name] = [];
        }
        
        morphAttributes[name].push(geometry.morphAttributes[name]);
      }
      
      if (useGroups) {
        let count: number;
        
        if (isIndexed) {
          count = geometry.index!.count;
        } else if (geometry.attributes.position !== undefined) {
          count = geometry.attributes.position.count;
        } else {
          console.error('Cannot merge geometries without position attribute');
          return null;
        }
        
        mergedGeometry.addGroup(offset, count, i);
        offset += count;
      }
    }
    
    // 合并索引
    if (isIndexed) {
      let indexOffset = 0;
      const mergedIndex: number[] = [];
      
      for (let i = 0; i < geometries.length; i++) {
        const index = geometries[i].index!;
        
        for (let j = 0; j < index.count; j++) {
          mergedIndex.push(index.getX(j) + indexOffset);
        }
        
        indexOffset += geometries[i].attributes.position.count;
      }
      
      mergedGeometry.setIndex(mergedIndex);
    }
    
    // 合并属性
    for (const name in attributes) {
      const mergedAttribute = this.mergeAttributes(attributes[name]);
      
      if (!mergedAttribute) {
        console.error('Failed to merge attribute: ' + name);
        return null;
      }
      
      mergedGeometry.setAttribute(name, mergedAttribute);
    }
    
    // 合并变形属性
    for (const name in morphAttributes) {
      const numMorphTargets = morphAttributes[name][0].length;
      
      if (numMorphTargets === 0) continue;
      
      mergedGeometry.morphAttributes[name] = [];
      
      for (let i = 0; i < numMorphTargets; i++) {
        const morphAttributesToMerge: BufferAttribute[] = [];
        
        for (let j = 0; j < morphAttributes[name].length; j++) {
          morphAttributesToMerge.push(morphAttributes[name][j][i]);
        }
        
        const mergedMorphAttribute = this.mergeAttributes(morphAttributesToMerge);
        
        if (!mergedMorphAttribute) {
          console.error('Failed to merge morph attributes');
          return null;
        }
        
        mergedGeometry.morphAttributes[name].push(mergedMorphAttribute);
      }
    }
    
    mergedGeometry.morphTargetsRelative = morphTargetsRelative;
    
    return mergedGeometry;
  }
  
  // 合并属性
  static mergeAttributes(
    attributes: (BufferAttribute | InterleavedBufferAttribute)[]
  ): BufferAttribute | null {
    let TypedArray: any;
    let itemSize: number;
    let normalized: boolean;
    let gpuType: number | undefined;
    let arrayLength = 0;
    
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      
      if ((attribute as any).isInterleavedBufferAttribute) {
        console.error('Cannot merge InterleavedBufferAttributes');
        return null;
      }
      
      if (TypedArray === undefined) {
        TypedArray = attribute.array.constructor;
      }
      if (TypedArray !== attribute.array.constructor) {
        console.error('All attributes must have the same array type');
        return null;
      }
      
      if (itemSize === undefined) {
        itemSize = attribute.itemSize;
      }
      if (itemSize !== attribute.itemSize) {
        console.error('All attributes must have the same itemSize');
        return null;
      }
      
      if (normalized === undefined) {
        normalized = attribute.normalized;
      }
      if (normalized !== attribute.normalized) {
        console.error('All attributes must have the same normalized state');
        return null;
      }
      
      arrayLength += attribute.array.length;
    }
    
    const array = new TypedArray(arrayLength);
    let offset = 0;
    
    for (let i = 0; i < attributes.length; i++) {
      array.set(attributes[i].array, offset);
      offset += attributes[i].array.length;
    }
    
    return new BufferAttribute(array, itemSize!, normalized);
  }
  
  // 交错属性（优化 GPU 访问）
  static interleaveAttributes(
    attributes: BufferAttribute[]
  ): InterleavedBufferAttribute[] {
    let TypedArray: any;
    let arrayLength = 0;
    let stride = 0;
    
    for (let i = 0, l = attributes.length; i < l; i++) {
      const attribute = attributes[i];
      
      if (TypedArray === undefined) {
        TypedArray = attribute.array.constructor;
      }
      if (TypedArray !== attribute.array.constructor) {
        console.error('All attributes must have the same array type');
        return [];
      }
      
      arrayLength += attribute.array.length;
      stride += attribute.itemSize;
    }
    
    const interleavedBuffer = new InterleavedBuffer(
      new TypedArray(arrayLength),
      stride
    );
    
    let offset = 0;
    const res: InterleavedBufferAttribute[] = [];
    const length = attributes[0].count;
    
    for (let i = 0, l = attributes.length; i < l; i++) {
      const attribute = attributes[i];
      const itemSize = attribute.itemSize;
      const array = attribute.array;
      
      for (let j = 0, n = 0; j < length; j++) {
        for (let s = 0; s < itemSize; s++, n++) {
          interleavedBuffer.array[j * stride + offset + s] = array[n];
        }
      }
      
      res.push(new InterleavedBufferAttribute(
        interleavedBuffer,
        itemSize,
        offset,
        attribute.normalized
      ));
      
      offset += itemSize;
    }
    
    return res;
  }
  
  // 计算变形法线
  static computeMorphedAttributes(
    object: Mesh
  ): {
    position: Float32Array;
    normal: Float32Array;
  } | null {
    const geometry = object.geometry as BufferGeometry;
    
    const morphPosition = geometry.morphAttributes.position;
    const morphNormal = geometry.morphAttributes.normal;
    const morphInfluences = object.morphTargetInfluences;
    
    if (!morphPosition || !morphInfluences) return null;
    
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    
    const positionArray = new Float32Array(position.count * 3);
    const normalArray = normal ? new Float32Array(normal.count * 3) : null;
    
    // 复制基础位置
    for (let i = 0, l = position.count; i < l; i++) {
      positionArray[i * 3] = position.getX(i);
      positionArray[i * 3 + 1] = position.getY(i);
      positionArray[i * 3 + 2] = position.getZ(i);
      
      if (normalArray && normal) {
        normalArray[i * 3] = normal.getX(i);
        normalArray[i * 3 + 1] = normal.getY(i);
        normalArray[i * 3 + 2] = normal.getZ(i);
      }
    }
    
    // 应用变形
    for (let i = 0; i < morphInfluences.length; i++) {
      const influence = morphInfluences[i];
      
      if (influence === 0) continue;
      
      const morphPositionAttr = morphPosition[i];
      const morphNormalAttr = morphNormal ? morphNormal[i] : null;
      
      for (let j = 0, jl = position.count; j < jl; j++) {
        positionArray[j * 3] += morphPositionAttr.getX(j) * influence;
        positionArray[j * 3 + 1] += morphPositionAttr.getY(j) * influence;
        positionArray[j * 3 + 2] += morphPositionAttr.getZ(j) * influence;
        
        if (normalArray && morphNormalAttr) {
          normalArray[j * 3] += morphNormalAttr.getX(j) * influence;
          normalArray[j * 3 + 1] += morphNormalAttr.getY(j) * influence;
          normalArray[j * 3 + 2] += morphNormalAttr.getZ(j) * influence;
        }
      }
    }
    
    return {
      position: positionArray,
      normal: normalArray!,
    };
  }
  
  // 估算顶点数
  static estimateBytesUsed(geometry: BufferGeometry): number {
    let mem = 0;
    
    for (const name in geometry.attributes) {
      const attr = geometry.attributes[name];
      mem += attr.count * attr.itemSize * attr.array.BYTES_PER_ELEMENT;
    }
    
    const indices = geometry.getIndex();
    if (indices) {
      mem += indices.count * indices.itemSize * indices.array.BYTES_PER_ELEMENT;
    }
    
    return mem;
  }
  
  // 计算形态学法线
  static computeMorphNormals(geometry: BufferGeometry): void {
    const morphPositions = geometry.morphAttributes.position;
    
    if (!morphPositions) return;
    
    const morphNormals = geometry.morphAttributes.normal;
    
    if (morphNormals === undefined) {
      geometry.morphAttributes.normal = [];
    }
    
    for (let i = 0, il = morphPositions.length; i < il; i++) {
      const morphPosition = morphPositions[i];
      
      if (!morphNormals || morphNormals[i] === undefined) {
        // 创建临时几何体计算法线
        const tempGeometry = new BufferGeometry();
        tempGeometry.setAttribute('position', morphPosition);
        tempGeometry.computeVertexNormals();
        
        geometry.morphAttributes.normal[i] = 
          tempGeometry.attributes.normal as BufferAttribute;
      }
    }
  }
  
  // 合并顶点（去重）
  static mergeVertices(
    geometry: BufferGeometry,
    tolerance = 1e-4
  ): BufferGeometry {
    tolerance = Math.max(tolerance, Number.EPSILON);
    
    // 生成精度网格
    const hashToIndex: Map<string, number> = new Map();
    const indices = geometry.getIndex();
    const positions = geometry.getAttribute('position');
    const vertexCount = indices ? indices.count : positions.count;
    
    let nextIndex = 0;
    const attributeNames = Object.keys(geometry.attributes);
    const attrArrays: Record<string, number[]> = {};
    const morphAttrsArrays: Record<string, number[][]> = {};
    const newIndices: number[] = [];
    
    for (const name of attributeNames) {
      attrArrays[name] = [];
    }
    
    for (const name in geometry.morphAttributes) {
      morphAttrsArrays[name] = geometry.morphAttributes[name].map(() => []);
    }
    
    // 获取顶点哈希
    const decimalShift = Math.log10(1 / tolerance);
    const shiftMultiplier = Math.pow(10, decimalShift);
    
    for (let i = 0; i < vertexCount; i++) {
      const index = indices ? indices.getX(i) : i;
      
      // 生成位置哈希
      let hash = '';
      
      for (let j = 0, l = attributeNames.length; j < l; j++) {
        const name = attributeNames[j];
        const attribute = geometry.getAttribute(name);
        const itemSize = attribute.itemSize;
        
        for (let k = 0; k < itemSize; k++) {
          hash += `${~~(attribute.array[index * itemSize + k] * shiftMultiplier)},`;
        }
      }
      
      // 检查是否已存在
      if (hashToIndex.has(hash)) {
        newIndices.push(hashToIndex.get(hash)!);
      } else {
        // 添加新顶点
        for (const name of attributeNames) {
          const attribute = geometry.getAttribute(name);
          const itemSize = attribute.itemSize;
          
          for (let k = 0; k < itemSize; k++) {
            attrArrays[name].push(attribute.array[index * itemSize + k]);
          }
        }
        
        // 添加变形属性
        for (const name in geometry.morphAttributes) {
          const morphAttributes = geometry.morphAttributes[name];
          
          for (let j = 0; j < morphAttributes.length; j++) {
            const attribute = morphAttributes[j];
            const itemSize = attribute.itemSize;
            
            for (let k = 0; k < itemSize; k++) {
              morphAttrsArrays[name][j].push(
                attribute.array[index * itemSize + k]
              );
            }
          }
        }
        
        hashToIndex.set(hash, nextIndex);
        newIndices.push(nextIndex);
        nextIndex++;
      }
    }
    
    // 构建新几何体
    const result = geometry.clone();
    
    for (const name of attributeNames) {
      const oldAttribute = geometry.getAttribute(name);
      const array = new (oldAttribute.array.constructor as any)(attrArrays[name]);
      const newAttribute = new BufferAttribute(
        array,
        oldAttribute.itemSize,
        oldAttribute.normalized
      );
      result.setAttribute(name, newAttribute);
    }
    
    for (const name in geometry.morphAttributes) {
      result.morphAttributes[name] = [];
      
      for (let j = 0; j < morphAttrsArrays[name].length; j++) {
        const oldAttribute = geometry.morphAttributes[name][j];
        const array = new (oldAttribute.array.constructor as any)(morphAttrsArrays[name][j]);
        const newAttribute = new BufferAttribute(
          array,
          oldAttribute.itemSize,
          oldAttribute.normalized
        );
        result.morphAttributes[name].push(newAttribute);
      }
    }
    
    result.setIndex(newIndices);
    
    return result;
  }
  
  // 转换为非索引几何体
  static toTrianglesDrawMode(
    geometry: BufferGeometry,
    drawMode: number
  ): BufferGeometry {
    if (drawMode === TrianglesDrawMode) {
      console.warn('Already using TrianglesDrawMode');
      return geometry;
    }
    
    // 处理 TriangleStrip 和 TriangleFan
    const index = geometry.getIndex();
    
    if (index === null) {
      const indices: number[] = [];
      const position = geometry.getAttribute('position');
      
      if (position !== undefined) {
        if (drawMode === TriangleFanDrawMode) {
          for (let i = 1, l = position.count - 1; i < l; i++) {
            indices.push(0, i, i + 1);
          }
        } else {
          // TriangleStripDrawMode
          for (let i = 0, l = position.count - 2; i < l; i++) {
            if (i % 2 === 0) {
              indices.push(i, i + 1, i + 2);
            } else {
              indices.push(i + 2, i + 1, i);
            }
          }
        }
      }
      
      if (indices.length > 0) {
        geometry = geometry.clone();
        geometry.setIndex(indices);
      }
    }
    
    return geometry;
  }
}

const TrianglesDrawMode = 0;
const TriangleStripDrawMode = 1;
const TriangleFanDrawMode = 2;
```

## 使用示例

### 合并几何体

```typescript
import { BufferGeometryUtils } from 'three/addons/utils/BufferGeometryUtils';

// 合并多个几何体为一个（减少 Draw Call）
const geometries = [];

for (let i = 0; i < 100; i++) {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  );
  geometries.push(geometry);
}

const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
const mesh = new Mesh(mergedGeometry, material);
scene.add(mesh);
```

### 合并并保留组

```typescript
// 合并并保留组（多材质）
const box = new BoxGeometry(1, 1, 1);
box.translate(-2, 0, 0);

const sphere = new SphereGeometry(0.5, 32, 16);
sphere.translate(2, 0, 0);

const merged = BufferGeometryUtils.mergeGeometries(
  [box, sphere],
  true  // 使用组
);

// 使用材质数组
const mesh = new Mesh(merged, [
  new MeshBasicMaterial({ color: 0xff0000 }),
  new MeshBasicMaterial({ color: 0x00ff00 }),
]);
```

### 顶点合并（优化）

```typescript
// 合并重复顶点
const geometry = new BufferGeometry();

// 假设有重复顶点的数据
const positions = new Float32Array([
  0, 0, 0,
  1, 0, 0,
  1, 1, 0,
  0, 0, 0,  // 重复
  1, 1, 0,  // 重复
  0, 1, 0,
]);

geometry.setAttribute('position', new BufferAttribute(positions, 3));
geometry.computeVertexNormals();

// 合并重复顶点
const optimized = BufferGeometryUtils.mergeVertices(geometry);
console.log(`Vertices: ${positions.length / 3} → ${optimized.getAttribute('position').count}`);
```

### 内存估算

```typescript
// 估算几何体内存使用
const geometry = new SphereGeometry(1, 128, 64);
const bytes = BufferGeometryUtils.estimateBytesUsed(geometry);
console.log(`Memory usage: ${(bytes / 1024).toFixed(2)} KB`);
```

## 几何体优化技巧

```
优化策略：

1. 合并静态几何体
   - 减少 Draw Call
   - 适用于不需要单独变换的物体

2. 使用索引几何体
   - 共享顶点节省内存
   - 提高缓存命中率

3. 合并重复顶点
   - mergeVertices() 去重
   - 对导入模型特别有效

4. 使用 LOD（Level of Detail）
   - 远处使用低精度几何体
   - 减少顶点处理

5. 视锥体裁剪
   - 不渲染视野外物体
   - computeBoundingSphere() 支持
```

## 本章小结

- BufferGeometryUtils 提供几何体操作工具
- mergeGeometries 合并多个几何体减少 Draw Call
- mergeVertices 去除重复顶点优化内存
- 交错属性可优化 GPU 内存访问
- 合理使用工具可显著提升性能

下一章，我们将学习纹理系统。
