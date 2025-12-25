# WebGLUniforms 统一变量

> "Uniform 是 CPU 与 GPU 之间的桥梁，传递渲染所需的参数。"

## Uniform 类型

```
WebGL Uniform 类型
├── 标量
│   ├── float (FLOAT)
│   ├── int (INT)
│   └── bool (BOOL)
├── 向量
│   ├── vec2, vec3, vec4
│   ├── ivec2, ivec3, ivec4
│   └── bvec2, bvec3, bvec4
├── 矩阵
│   ├── mat2
│   ├── mat3
│   └── mat4
├── 采样器
│   ├── sampler2D
│   ├── samplerCube
│   ├── sampler3D
│   └── sampler2DArray
└── 数组
    └── 上述类型的数组
```

## WebGLUniforms 实现

```typescript
// src/renderers/webgl/WebGLUniforms.ts
type UniformValue = number | Vector2 | Vector3 | Vector4 | Color | Matrix3 | Matrix4 | Texture | number[];

interface SingleUniform {
  id: number;
  type: number;
  location: WebGLUniformLocation;
  setValue: (value: UniformValue, textures?: WebGLTextures) => void;
}

interface ArrayUniform {
  id: number;
  type: number;
  location: WebGLUniformLocation;
  size: number;
  setValue: (value: UniformValue[], textures?: WebGLTextures) => void;
}

interface StructuredUniform {
  id: number;
  uniforms: Map<string, SingleUniform | ArrayUniform | StructuredUniform>;
  setValue: (value: Record<string, UniformValue>, textures?: WebGLTextures) => void;
}

export class WebGLUniforms {
  private _gl: WebGL2RenderingContext;
  private _program: WebGLProgram;
  
  // 所有 uniform 的映射
  private _uniforms = new Map<string, SingleUniform | ArrayUniform | StructuredUniform>();
  
  // 序列化后的 uniform 列表（用于批量设置）
  private _seq: (SingleUniform | ArrayUniform)[] = [];
  
  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this._gl = gl;
    this._program = program;
    
    // 解析所有 uniforms
    this._parseUniforms();
  }
  
  private _parseUniforms(): void {
    const gl = this._gl;
    const program = this._program;
    
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(program, i)!;
      const location = gl.getUniformLocation(program, info.name)!;
      
      this._addUniform(info, location);
    }
  }
  
  private _addUniform(info: WebGLActiveInfo, location: WebGLUniformLocation): void {
    const name = info.name;
    const type = info.type;
    const size = info.size;
    
    // 解析名称（处理数组和结构体）
    // 例如: "lights[0].color" -> ["lights", "0", "color"]
    const pathParts = name.replace(/\[(\d+)\]/g, '.$1').split('.');
    const lastPart = pathParts.pop()!;
    
    // 获取或创建父容器
    let container: any = this._uniforms;
    
    for (const part of pathParts) {
      if (!container.has(part)) {
        container.set(part, new Map());
      }
      container = container.get(part);
    }
    
    // 创建 uniform
    const uniform = this._createUniform(type, size, location);
    
    if (container instanceof Map) {
      container.set(lastPart, uniform);
    } else {
      container[lastPart] = uniform;
    }
    
    // 添加到序列
    if (uniform.setValue) {
      this._seq.push(uniform);
    }
  }
  
  private _createUniform(
    type: number,
    size: number,
    location: WebGLUniformLocation
  ): SingleUniform | ArrayUniform {
    const gl = this._gl;
    const id = location as unknown as number;
    
    // 单值 uniform
    if (size === 1) {
      return {
        id,
        type,
        location,
        setValue: this._getSingleSetter(type, location),
      };
    }
    
    // 数组 uniform
    return {
      id,
      type,
      location,
      size,
      setValue: this._getArraySetter(type, location, size),
    };
  }
  
  // ==================== 单值设置器 ====================
  
  private _getSingleSetter(type: number, location: WebGLUniformLocation): (value: UniformValue, textures?: WebGLTextures) => void {
    const gl = this._gl;
    
    switch (type) {
      // 浮点数
      case gl.FLOAT:
        return (v: number) => gl.uniform1f(location, v);
        
      case gl.FLOAT_VEC2:
        return (v: Vector2 | number[]) => {
          if (Array.isArray(v)) {
            gl.uniform2fv(location, v);
          } else {
            gl.uniform2f(location, v.x, v.y);
          }
        };
        
      case gl.FLOAT_VEC3:
        return (v: Vector3 | Color | number[]) => {
          if (Array.isArray(v)) {
            gl.uniform3fv(location, v);
          } else if ((v as Color).isColor) {
            gl.uniform3f(location, (v as Color).r, (v as Color).g, (v as Color).b);
          } else {
            gl.uniform3f(location, (v as Vector3).x, (v as Vector3).y, (v as Vector3).z);
          }
        };
        
      case gl.FLOAT_VEC4:
        return (v: Vector4 | Quaternion | number[]) => {
          if (Array.isArray(v)) {
            gl.uniform4fv(location, v);
          } else {
            gl.uniform4f(location, v.x, v.y, v.z, v.w);
          }
        };
        
      // 矩阵
      case gl.FLOAT_MAT2:
        return (v: number[] | Float32Array) => {
          gl.uniformMatrix2fv(location, false, v);
        };
        
      case gl.FLOAT_MAT3:
        return (v: Matrix3 | number[] | Float32Array) => {
          if ((v as Matrix3).isMatrix3) {
            gl.uniformMatrix3fv(location, false, (v as Matrix3).elements);
          } else {
            gl.uniformMatrix3fv(location, false, v as number[]);
          }
        };
        
      case gl.FLOAT_MAT4:
        return (v: Matrix4 | number[] | Float32Array) => {
          if ((v as Matrix4).isMatrix4) {
            gl.uniformMatrix4fv(location, false, (v as Matrix4).elements);
          } else {
            gl.uniformMatrix4fv(location, false, v as number[]);
          }
        };
        
      // 整数
      case gl.INT:
      case gl.BOOL:
        return (v: number | boolean) => gl.uniform1i(location, +v);
        
      case gl.INT_VEC2:
      case gl.BOOL_VEC2:
        return (v: number[]) => gl.uniform2iv(location, v);
        
      case gl.INT_VEC3:
      case gl.BOOL_VEC3:
        return (v: number[]) => gl.uniform3iv(location, v);
        
      case gl.INT_VEC4:
      case gl.BOOL_VEC4:
        return (v: number[]) => gl.uniform4iv(location, v);
        
      // 采样器
      case gl.SAMPLER_2D:
      case gl.INT_SAMPLER_2D:
      case gl.UNSIGNED_INT_SAMPLER_2D:
      case gl.SAMPLER_2D_SHADOW:
        return this._getTextureSetter(gl.TEXTURE_2D, location);
        
      case gl.SAMPLER_CUBE:
      case gl.INT_SAMPLER_CUBE:
      case gl.UNSIGNED_INT_SAMPLER_CUBE:
      case gl.SAMPLER_CUBE_SHADOW:
        return this._getTextureSetter(gl.TEXTURE_CUBE_MAP, location);
        
      case gl.SAMPLER_3D:
      case gl.INT_SAMPLER_3D:
      case gl.UNSIGNED_INT_SAMPLER_3D:
        return this._getTextureSetter(gl.TEXTURE_3D, location);
        
      case gl.SAMPLER_2D_ARRAY:
      case gl.INT_SAMPLER_2D_ARRAY:
      case gl.UNSIGNED_INT_SAMPLER_2D_ARRAY:
      case gl.SAMPLER_2D_ARRAY_SHADOW:
        return this._getTextureSetter(gl.TEXTURE_2D_ARRAY, location);
        
      default:
        console.warn('Unknown uniform type:', type);
        return () => {};
    }
  }
  
  // ==================== 数组设置器 ====================
  
  private _getArraySetter(
    type: number,
    location: WebGLUniformLocation,
    size: number
  ): (value: UniformValue[], textures?: WebGLTextures) => void {
    const gl = this._gl;
    
    switch (type) {
      case gl.FLOAT:
        return (v: number[]) => gl.uniform1fv(location, v);
        
      case gl.FLOAT_VEC2:
        return (v: Vector2[] | number[]) => {
          const data = this._flattenVec2Array(v, size);
          gl.uniform2fv(location, data);
        };
        
      case gl.FLOAT_VEC3:
        return (v: (Vector3 | Color)[] | number[]) => {
          const data = this._flattenVec3Array(v, size);
          gl.uniform3fv(location, data);
        };
        
      case gl.FLOAT_VEC4:
        return (v: Vector4[] | number[]) => {
          const data = this._flattenVec4Array(v, size);
          gl.uniform4fv(location, data);
        };
        
      case gl.FLOAT_MAT3:
        return (v: Matrix3[] | Float32Array[]) => {
          const data = this._flattenMat3Array(v, size);
          gl.uniformMatrix3fv(location, false, data);
        };
        
      case gl.FLOAT_MAT4:
        return (v: Matrix4[] | Float32Array[]) => {
          const data = this._flattenMat4Array(v, size);
          gl.uniformMatrix4fv(location, false, data);
        };
        
      case gl.INT:
      case gl.BOOL:
        return (v: number[]) => gl.uniform1iv(location, v);
        
      case gl.SAMPLER_2D:
        return this._getTextureArraySetter(gl.TEXTURE_2D, location, size);
        
      case gl.SAMPLER_CUBE:
        return this._getTextureArraySetter(gl.TEXTURE_CUBE_MAP, location, size);
        
      default:
        console.warn('Unknown array uniform type:', type);
        return () => {};
    }
  }
  
  // ==================== 纹理设置器 ====================
  
  private _textureUnit = 0;
  
  private _getTextureSetter(
    textureType: number,
    location: WebGLUniformLocation
  ): (texture: Texture, textures: WebGLTextures) => void {
    const gl = this._gl;
    
    return (texture: Texture, textures: WebGLTextures) => {
      const unit = this._textureUnit++;
      
      // 设置采样器
      gl.uniform1i(location, unit);
      
      // 绑定纹理
      if (textureType === gl.TEXTURE_2D) {
        textures.setTexture2D(texture, unit);
      } else if (textureType === gl.TEXTURE_CUBE_MAP) {
        textures.setTextureCube(texture as CubeTexture, unit);
      } else if (textureType === gl.TEXTURE_3D) {
        textures.setTexture3D(texture as Data3DTexture, unit);
      }
    };
  }
  
  private _getTextureArraySetter(
    textureType: number,
    location: WebGLUniformLocation,
    size: number
  ): (textures: Texture[], textureManager: WebGLTextures) => void {
    const gl = this._gl;
    
    return (textureArray: Texture[], textureManager: WebGLTextures) => {
      const units = new Int32Array(size);
      
      for (let i = 0; i < size; i++) {
        units[i] = this._textureUnit++;
        
        if (textureType === gl.TEXTURE_2D) {
          textureManager.setTexture2D(textureArray[i], units[i]);
        } else if (textureType === gl.TEXTURE_CUBE_MAP) {
          textureManager.setTextureCube(textureArray[i] as CubeTexture, units[i]);
        }
      }
      
      gl.uniform1iv(location, units);
    };
  }
  
  // ==================== 数组扁平化 ====================
  
  private _flattenVec2Array(array: Vector2[] | number[], size: number): Float32Array {
    const data = new Float32Array(size * 2);
    
    for (let i = 0; i < size; i++) {
      const v = array[i];
      
      if (v instanceof Vector2) {
        data[i * 2] = v.x;
        data[i * 2 + 1] = v.y;
      } else if (typeof v === 'number') {
        data[i * 2] = (array as number[])[i * 2];
        data[i * 2 + 1] = (array as number[])[i * 2 + 1];
        break;
      }
    }
    
    return data;
  }
  
  private _flattenVec3Array(array: (Vector3 | Color)[] | number[], size: number): Float32Array {
    const data = new Float32Array(size * 3);
    
    for (let i = 0; i < size; i++) {
      const v = array[i];
      
      if (v instanceof Vector3) {
        data[i * 3] = v.x;
        data[i * 3 + 1] = v.y;
        data[i * 3 + 2] = v.z;
      } else if ((v as Color).isColor) {
        data[i * 3] = (v as Color).r;
        data[i * 3 + 1] = (v as Color).g;
        data[i * 3 + 2] = (v as Color).b;
      } else if (typeof v === 'number') {
        data.set(array as number[], 0);
        break;
      }
    }
    
    return data;
  }
  
  private _flattenVec4Array(array: Vector4[] | number[], size: number): Float32Array {
    const data = new Float32Array(size * 4);
    
    for (let i = 0; i < size; i++) {
      const v = array[i];
      
      if (v instanceof Vector4) {
        data[i * 4] = v.x;
        data[i * 4 + 1] = v.y;
        data[i * 4 + 2] = v.z;
        data[i * 4 + 3] = v.w;
      } else if (typeof v === 'number') {
        data.set(array as number[], 0);
        break;
      }
    }
    
    return data;
  }
  
  private _flattenMat3Array(array: Matrix3[] | Float32Array[], size: number): Float32Array {
    const data = new Float32Array(size * 9);
    
    for (let i = 0; i < size; i++) {
      const m = array[i];
      
      if ((m as Matrix3).isMatrix3) {
        data.set((m as Matrix3).elements, i * 9);
      } else {
        data.set(m as Float32Array, i * 9);
      }
    }
    
    return data;
  }
  
  private _flattenMat4Array(array: Matrix4[] | Float32Array[], size: number): Float32Array {
    const data = new Float32Array(size * 16);
    
    for (let i = 0; i < size; i++) {
      const m = array[i];
      
      if ((m as Matrix4).isMatrix4) {
        data.set((m as Matrix4).elements, i * 16);
      } else {
        data.set(m as Float32Array, i * 16);
      }
    }
    
    return data;
  }
  
  // ==================== 公共 API ====================
  
  setValue(name: string, value: UniformValue, textures?: WebGLTextures): void {
    const uniform = this._uniforms.get(name);
    
    if (uniform) {
      (uniform as SingleUniform).setValue(value, textures);
    }
  }
  
  setValues(values: Record<string, UniformValue>, textures?: WebGLTextures): void {
    // 重置纹理单元
    this._textureUnit = 0;
    
    for (const [name, value] of Object.entries(values)) {
      this.setValue(name, value, textures);
    }
  }
  
  // 批量设置（使用缓存的值）
  upload(uniformsList: UniformValue[], textures: WebGLTextures): void {
    this._textureUnit = 0;
    
    for (let i = 0; i < this._seq.length; i++) {
      const uniform = this._seq[i];
      const value = uniformsList[uniform.id];
      
      if (value !== undefined) {
        uniform.setValue(value, textures);
      }
    }
  }
}
```

## UniformsUtils 工具类

```typescript
// src/renderers/shaders/UniformsUtils.ts
export const UniformsUtils = {
  // 克隆 uniforms
  clone<T extends Record<string, { value: UniformValue }>>(src: T): T {
    const dst = {} as T;
    
    for (const key in src) {
      const uniform = src[key];
      const value = uniform.value;
      
      if (value instanceof Color) {
        dst[key] = { value: value.clone() };
      } else if (value instanceof Vector2) {
        dst[key] = { value: value.clone() };
      } else if (value instanceof Vector3) {
        dst[key] = { value: value.clone() };
      } else if (value instanceof Vector4) {
        dst[key] = { value: value.clone() };
      } else if (value instanceof Matrix3) {
        dst[key] = { value: value.clone() };
      } else if (value instanceof Matrix4) {
        dst[key] = { value: value.clone() };
      } else if (Array.isArray(value)) {
        dst[key] = { value: value.slice() };
      } else {
        dst[key] = { value };
      }
    }
    
    return dst;
  },
  
  // 合并多个 uniforms
  merge(uniforms: Record<string, { value: UniformValue }>[]): Record<string, { value: UniformValue }> {
    const merged: Record<string, { value: UniformValue }> = {};
    
    for (const uniform of uniforms) {
      const tmp = UniformsUtils.clone(uniform);
      
      for (const key in tmp) {
        merged[key] = tmp[key];
      }
    }
    
    return merged;
  },
};
```

## UniformsLib 标准 Uniforms

```typescript
// src/renderers/shaders/UniformsLib.ts
export const UniformsLib = {
  // 公共
  common: {
    diffuse: { value: new Color(0xffffff) },
    opacity: { value: 1.0 },
    
    map: { value: null },
    mapTransform: { value: new Matrix3() },
    
    alphaMap: { value: null },
    alphaMapTransform: { value: new Matrix3() },
    
    alphaTest: { value: 0 },
  },
  
  // 法线贴图
  normalmap: {
    normalMap: { value: null },
    normalMapTransform: { value: new Matrix3() },
    normalScale: { value: new Vector2(1, 1) },
  },
  
  // 凹凸贴图
  bumpmap: {
    bumpMap: { value: null },
    bumpMapTransform: { value: new Matrix3() },
    bumpScale: { value: 1 },
  },
  
  // 光照
  lights: {
    // 环境光
    ambientLightColor: { value: [] },
    
    // 方向光
    directionalLights: {
      value: [],
      properties: {
        direction: {},
        color: {},
      },
    },
    
    directionalLightShadows: {
      value: [],
      properties: {
        shadowBias: {},
        shadowNormalBias: {},
        shadowRadius: {},
        shadowMapSize: {},
      },
    },
    
    // 点光源
    pointLights: {
      value: [],
      properties: {
        position: {},
        color: {},
        distance: {},
        decay: {},
      },
    },
    
    pointLightShadows: {
      value: [],
      properties: {
        shadowBias: {},
        shadowNormalBias: {},
        shadowRadius: {},
        shadowMapSize: {},
        shadowCameraNear: {},
        shadowCameraFar: {},
      },
    },
    
    // 聚光灯
    spotLights: {
      value: [],
      properties: {
        position: {},
        direction: {},
        color: {},
        distance: {},
        decay: {},
        coneCos: {},
        penumbraCos: {},
      },
    },
    
    // 半球光
    hemisphereLights: {
      value: [],
      properties: {
        direction: {},
        skyColor: {},
        groundColor: {},
      },
    },
  },
  
  // 环境贴图
  envmap: {
    envMap: { value: null },
    flipEnvMap: { value: -1 },
    reflectivity: { value: 1.0 },
    ior: { value: 1.5 },
    refractionRatio: { value: 0.98 },
  },
  
  // 雾效
  fog: {
    fogDensity: { value: 0.00025 },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogColor: { value: new Color(0xffffff) },
  },
  
  // PBR
  physical: {
    clearcoat: { value: 0 },
    clearcoatMap: { value: null },
    clearcoatMapTransform: { value: new Matrix3() },
    clearcoatNormalMap: { value: null },
    clearcoatNormalMapTransform: { value: new Matrix3() },
    clearcoatNormalScale: { value: new Vector2(1, 1) },
    clearcoatRoughness: { value: 0 },
    
    iridescence: { value: 0 },
    iridescenceMap: { value: null },
    iridescenceMapTransform: { value: new Matrix3() },
    iridescenceIOR: { value: 1.3 },
    iridescenceThicknessMinimum: { value: 100 },
    iridescenceThicknessMaximum: { value: 400 },
    iridescenceThicknessMap: { value: null },
    iridescenceThicknessMapTransform: { value: new Matrix3() },
    
    sheen: { value: 0 },
    sheenColor: { value: new Color(0x000000) },
    sheenColorMap: { value: null },
    sheenColorMapTransform: { value: new Matrix3() },
    sheenRoughness: { value: 1 },
    sheenRoughnessMap: { value: null },
    sheenRoughnessMapTransform: { value: new Matrix3() },
    
    transmission: { value: 0 },
    transmissionMap: { value: null },
    transmissionMapTransform: { value: new Matrix3() },
    transmissionSamplerSize: { value: new Vector2() },
    transmissionSamplerMap: { value: null },
    
    thickness: { value: 0 },
    thicknessMap: { value: null },
    thicknessMapTransform: { value: new Matrix3() },
    attenuationDistance: { value: 0 },
    attenuationColor: { value: new Color(0x000000) },
    
    specularIntensity: { value: 1 },
    specularIntensityMap: { value: null },
    specularIntensityMapTransform: { value: new Matrix3() },
    specularColor: { value: new Color(1, 1, 1) },
    specularColorMap: { value: null },
    specularColorMapTransform: { value: new Matrix3() },
    
    anisotropyVector: { value: new Vector2() },
    anisotropyMap: { value: null },
    anisotropyMapTransform: { value: new Matrix3() },
  },
};
```

## 使用示例

```typescript
// 创建 WebGLUniforms
const uniforms = new WebGLUniforms(gl, program);

// 设置单个 uniform
uniforms.setValue('modelMatrix', object.matrixWorld);
uniforms.setValue('viewMatrix', camera.matrixWorldInverse);
uniforms.setValue('projectionMatrix', camera.projectionMatrix);
uniforms.setValue('diffuse', material.color);
uniforms.setValue('opacity', material.opacity);

// 设置纹理
uniforms.setValue('map', material.map, textures);

// 批量设置
uniforms.setValues({
  modelMatrix: object.matrixWorld,
  viewMatrix: camera.matrixWorldInverse,
  projectionMatrix: camera.projectionMatrix,
  normalMatrix: object.normalMatrix,
  diffuse: material.color,
  opacity: material.opacity,
}, textures);

// 使用 UniformsUtils
const materialUniforms = UniformsUtils.merge([
  UniformsLib.common,
  UniformsLib.normalmap,
  UniformsLib.fog,
  {
    customColor: { value: new Color(0xff0000) },
  },
]);
```

## 本章小结

- WebGLUniforms 解析着色器 uniform
- 自动处理不同类型的设置函数
- 支持数组和结构体 uniform
- 纹理自动分配纹理单元
- UniformsLib 预定义标准 uniform
- UniformsUtils 提供克隆和合并工具

下一章，我们将学习 WebGLAttributes 属性管理。
