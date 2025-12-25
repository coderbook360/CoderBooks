# WebGLAttributes 属性管理

> "顶点属性是几何体的基础数据，高效管理是性能的关键。"

## 属性类型

```
Vertex Attributes
├── 位置 (position)
│   └── vec3 per vertex
├── 法线 (normal)
│   └── vec3 per vertex
├── UV 坐标 (uv)
│   └── vec2 per vertex
├── 颜色 (color)
│   └── vec3/vec4 per vertex
├── 切线 (tangent)
│   └── vec4 per vertex
├── 索引 (index)
│   └── uint16/uint32
├── 蒙皮 (skinning)
│   ├── skinIndex (vec4)
│   └── skinWeight (vec4)
└── 实例化
    ├── instanceMatrix (mat4)
    └── instanceColor (vec3)
```

## WebGLAttributes 实现

```typescript
// src/renderers/webgl/WebGLAttributes.ts
interface BufferData {
  buffer: WebGLBuffer;
  type: number;
  bytesPerElement: number;
  version: number;
  size?: number;
}

export class WebGLAttributes {
  private _gl: WebGL2RenderingContext;
  private _buffers = new WeakMap<BufferAttribute | InterleavedBuffer, BufferData>();
  
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }
  
  // ==================== 创建/更新 Buffer ====================
  
  get(attribute: BufferAttribute | InterleavedBuffer): BufferData | undefined {
    if (attribute.isInterleavedBufferAttribute) {
      return this._buffers.get((attribute as InterleavedBufferAttribute).data);
    }
    
    return this._buffers.get(attribute as BufferAttribute);
  }
  
  update(attribute: BufferAttribute | InterleavedBuffer, bufferType: number): void {
    // 处理 InterleavedBufferAttribute
    if (attribute.isInterleavedBufferAttribute) {
      attribute = (attribute as InterleavedBufferAttribute).data;
    }
    
    const data = this._buffers.get(attribute);
    
    if (data === undefined) {
      this._createBuffer(attribute, bufferType);
    } else if (data.version < attribute.version) {
      this._updateBuffer(attribute, bufferType, data);
    }
  }
  
  private _createBuffer(
    attribute: BufferAttribute | InterleavedBuffer,
    bufferType: number
  ): void {
    const gl = this._gl;
    const array = attribute.array;
    const usage = attribute.usage;
    
    // 创建 buffer
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, array, usage);
    
    // 记录 buffer 信息
    const type = this._getGLType(array);
    
    this._buffers.set(attribute, {
      buffer,
      type,
      bytesPerElement: array.BYTES_PER_ELEMENT,
      version: attribute.version,
      size: attribute.count,
    });
    
    // 监听 dispose
    attribute.onUploadCallback?.();
  }
  
  private _updateBuffer(
    attribute: BufferAttribute | InterleavedBuffer,
    bufferType: number,
    data: BufferData
  ): void {
    const gl = this._gl;
    const array = attribute.array;
    
    gl.bindBuffer(bufferType, data.buffer);
    
    const updateRanges = (attribute as BufferAttribute).updateRanges;
    
    if (updateRanges && updateRanges.length > 0) {
      // 部分更新
      for (const range of updateRanges) {
        const start = range.start * data.bytesPerElement;
        const count = range.count * data.bytesPerElement;
        
        gl.bufferSubData(
          bufferType,
          start,
          array,
          range.start,
          range.count
        );
      }
      
      // 清除更新范围
      updateRanges.length = 0;
    } else {
      // 全量更新
      gl.bufferSubData(bufferType, 0, array);
    }
    
    data.version = attribute.version;
  }
  
  remove(attribute: BufferAttribute | InterleavedBuffer): void {
    if (attribute.isInterleavedBufferAttribute) {
      attribute = (attribute as InterleavedBufferAttribute).data;
    }
    
    const data = this._buffers.get(attribute);
    
    if (data) {
      this._gl.deleteBuffer(data.buffer);
      this._buffers.delete(attribute);
    }
  }
  
  // ==================== 辅助函数 ====================
  
  private _getGLType(array: TypedArray): number {
    const gl = this._gl;
    
    if (array instanceof Float32Array) return gl.FLOAT;
    if (array instanceof Uint32Array) return gl.UNSIGNED_INT;
    if (array instanceof Int32Array) return gl.INT;
    if (array instanceof Uint16Array) return gl.UNSIGNED_SHORT;
    if (array instanceof Int16Array) return gl.SHORT;
    if (array instanceof Uint8Array) return gl.UNSIGNED_BYTE;
    if (array instanceof Int8Array) return gl.BYTE;
    
    throw new Error('Unknown array type');
  }
}
```

## WebGLBindingStates 绑定状态

```typescript
// src/renderers/webgl/WebGLBindingStates.ts
interface BindingState {
  vao: WebGLVertexArrayObject;
  geometry: BufferGeometry | null;
  program: WebGLProgram | null;
  wireframe: boolean;
  attributesNum: number;
}

export class WebGLBindingStates {
  private _gl: WebGL2RenderingContext;
  private _attributes: WebGLAttributes;
  
  // 缓存: geometry -> material -> wireframe -> BindingState
  private _bindingStates = new WeakMap<BufferGeometry, Map<WebGLProgram, Map<boolean, BindingState>>>();
  
  private _currentState: BindingState | null = null;
  private _defaultState: BindingState;
  
  constructor(gl: WebGL2RenderingContext, attributes: WebGLAttributes) {
    this._gl = gl;
    this._attributes = attributes;
    
    // 默认 VAO
    this._defaultState = {
      vao: gl.createVertexArray()!,
      geometry: null,
      program: null,
      wireframe: false,
      attributesNum: 0,
    };
  }
  
  // ==================== 设置绑定状态 ====================
  
  setup(
    object: Object3D,
    material: Material,
    program: WebGLProgram,
    geometry: BufferGeometry
  ): void {
    const wireframe = material.wireframe === true;
    
    // 获取或创建绑定状态
    let state = this._getBindingState(geometry, program, wireframe);
    
    if (!state) {
      state = this._createBindingState(geometry, program, wireframe);
      this._saveBindingState(geometry, program, wireframe, state);
    }
    
    // 绑定 VAO
    if (this._currentState !== state) {
      this._gl.bindVertexArray(state.vao);
      this._currentState = state;
    }
    
    // 检查是否需要更新
    if (this._needsUpdate(geometry, program, state)) {
      this._setupVertexAttributes(object, geometry, program);
      state.attributesNum = this._countAttributes(program);
    }
    
    // 更新索引
    const index = geometry.index;
    if (index !== null) {
      this._attributes.update(index, this._gl.ELEMENT_ARRAY_BUFFER);
    }
  }
  
  private _getBindingState(
    geometry: BufferGeometry,
    program: WebGLProgram,
    wireframe: boolean
  ): BindingState | undefined {
    const programMap = this._bindingStates.get(geometry);
    if (!programMap) return undefined;
    
    const wireframeMap = programMap.get(program);
    if (!wireframeMap) return undefined;
    
    return wireframeMap.get(wireframe);
  }
  
  private _createBindingState(
    geometry: BufferGeometry,
    program: WebGLProgram,
    wireframe: boolean
  ): BindingState {
    const vao = this._gl.createVertexArray()!;
    
    return {
      vao,
      geometry,
      program,
      wireframe,
      attributesNum: 0,
    };
  }
  
  private _saveBindingState(
    geometry: BufferGeometry,
    program: WebGLProgram,
    wireframe: boolean,
    state: BindingState
  ): void {
    let programMap = this._bindingStates.get(geometry);
    if (!programMap) {
      programMap = new Map();
      this._bindingStates.set(geometry, programMap);
    }
    
    let wireframeMap = programMap.get(program);
    if (!wireframeMap) {
      wireframeMap = new Map();
      programMap.set(program, wireframeMap);
    }
    
    wireframeMap.set(wireframe, state);
  }
  
  private _needsUpdate(
    geometry: BufferGeometry,
    program: WebGLProgram,
    state: BindingState
  ): boolean {
    // 检查属性数量是否变化
    const attributesNum = this._countAttributes(program);
    if (state.attributesNum !== attributesNum) return true;
    
    // 检查几何体版本
    // （简化实现，实际需要检查每个属性的版本）
    
    return false;
  }
  
  private _countAttributes(program: WebGLProgram): number {
    return this._gl.getProgramParameter(program, this._gl.ACTIVE_ATTRIBUTES);
  }
  
  // ==================== 设置顶点属性 ====================
  
  private _setupVertexAttributes(
    object: Object3D,
    geometry: BufferGeometry,
    program: WebGLProgram
  ): void {
    const gl = this._gl;
    
    // 获取程序的属性信息
    const programAttributes = this._getAttributes(program);
    const geometryAttributes = geometry.attributes;
    
    for (const [name, location] of programAttributes) {
      const geometryAttribute = geometryAttributes[name];
      
      if (geometryAttribute) {
        // 更新 buffer
        if (geometryAttribute.isInterleavedBufferAttribute) {
          this._attributes.update(
            (geometryAttribute as InterleavedBufferAttribute).data,
            gl.ARRAY_BUFFER
          );
        } else {
          this._attributes.update(geometryAttribute, gl.ARRAY_BUFFER);
        }
        
        // 设置属性指针
        this._setupVertexAttribPointer(location, geometryAttribute);
      } else if (name === 'instanceMatrix') {
        // 实例化矩阵
        if (object.isInstancedMesh) {
          this._setupInstanceMatrix(location, (object as InstancedMesh).instanceMatrix);
        }
      }
    }
    
    // 绑定索引
    const index = geometry.index;
    if (index !== null) {
      const bufferData = this._attributes.get(index);
      if (bufferData) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferData.buffer);
      }
    }
  }
  
  private _setupVertexAttribPointer(
    location: number,
    attribute: BufferAttribute | InterleavedBufferAttribute
  ): void {
    const gl = this._gl;
    
    let bufferData: BufferData | undefined;
    let stride: number;
    let offset: number;
    
    if (attribute.isInterleavedBufferAttribute) {
      const iba = attribute as InterleavedBufferAttribute;
      bufferData = this._attributes.get(iba.data);
      stride = iba.data.stride * bufferData!.bytesPerElement;
      offset = iba.offset * bufferData!.bytesPerElement;
    } else {
      bufferData = this._attributes.get(attribute as BufferAttribute);
      stride = 0;
      offset = 0;
    }
    
    if (!bufferData) return;
    
    // 绑定 buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferData.buffer);
    
    // 设置属性指针
    gl.enableVertexAttribArray(location);
    
    const size = attribute.itemSize;
    const type = bufferData.type;
    const normalized = attribute.normalized;
    
    if (attribute.isIntegerAttribute) {
      gl.vertexAttribIPointer(location, size, type, stride, offset);
    } else {
      gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
    }
    
    // 实例化除数
    if (attribute.isInstancedBufferAttribute) {
      const divisor = (attribute as InstancedBufferAttribute).meshPerAttribute;
      gl.vertexAttribDivisor(location, divisor);
    }
  }
  
  private _setupInstanceMatrix(location: number, attribute: InstancedBufferAttribute): void {
    const gl = this._gl;
    
    this._attributes.update(attribute, gl.ARRAY_BUFFER);
    const bufferData = this._attributes.get(attribute);
    
    if (!bufferData) return;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferData.buffer);
    
    // mat4 需要 4 个 vec4 属性位置
    for (let i = 0; i < 4; i++) {
      const loc = location + i;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16);
      gl.vertexAttribDivisor(loc, 1);
    }
  }
  
  private _getAttributes(program: WebGLProgram): Map<string, number> {
    const gl = this._gl;
    const attributes = new Map<string, number>();
    
    const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveAttrib(program, i)!;
      const location = gl.getAttribLocation(program, info.name);
      attributes.set(info.name, location);
    }
    
    return attributes;
  }
  
  // ==================== 释放 ====================
  
  releaseStatesOfGeometry(geometry: BufferGeometry): void {
    const programMap = this._bindingStates.get(geometry);
    
    if (programMap) {
      for (const wireframeMap of programMap.values()) {
        for (const state of wireframeMap.values()) {
          this._gl.deleteVertexArray(state.vao);
        }
      }
      
      this._bindingStates.delete(geometry);
    }
  }
  
  releaseStatesOfProgram(program: WebGLProgram): void {
    // 遍历所有几何体，移除相关状态
    // （需要额外的索引结构来实现）
  }
  
  reset(): void {
    this._gl.bindVertexArray(null);
    this._currentState = null;
  }
  
  dispose(): void {
    this.reset();
    this._gl.deleteVertexArray(this._defaultState.vao);
  }
}
```

## 使用示例

```typescript
// 创建属性管理器
const attributes = new WebGLAttributes(gl);

// 更新位置属性
attributes.update(geometry.attributes.position, gl.ARRAY_BUFFER);

// 更新索引
attributes.update(geometry.index, gl.ELEMENT_ARRAY_BUFFER);

// 获取 buffer 信息
const bufferData = attributes.get(geometry.attributes.position);
console.log(bufferData.buffer, bufferData.type);

// 创建绑定状态管理器
const bindingStates = new WebGLBindingStates(gl, attributes);

// 设置绑定
bindingStates.setup(mesh, material, program, geometry);

// 绘制
gl.drawElements(gl.TRIANGLES, geometry.index.count, gl.UNSIGNED_INT, 0);

// 清理
attributes.remove(geometry.attributes.position);
bindingStates.releaseStatesOfGeometry(geometry);
```

## 本章小结

- WebGLAttributes 管理 WebGL Buffer
- 支持部分更新和全量更新
- WebGLBindingStates 管理 VAO
- 自动缓存几何体-程序的绑定状态
- 支持实例化属性
- 支持交错 buffer 属性

下一章，我们将学习 WebGLGeometries 几何体管理。
