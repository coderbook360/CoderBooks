# WebGLProgram 着色器程序

> "着色器程序是 GPU 渲染的核心，连接 JavaScript 与 GPU。"

## WebGLProgram 结构

```
WebGLProgram
├── 源码
│   ├── vertexShader
│   └── fragmentShader
├── WebGL 对象
│   ├── program (WebGLProgram)
│   ├── vertexShader (WebGLShader)
│   └── fragmentShader (WebGLShader)
├── Uniform 缓存
│   └── uniforms Map
├── Attribute 信息
│   └── attributes Map
└── 诊断
    ├── diagnostics
    └── cacheKey
```

## 基础实现

### WebGLProgram 类

```typescript
// src/renderers/webgl/WebGLProgram.ts
import { WebGLShader } from './WebGLShader';
import { WebGLUniforms } from './WebGLUniforms';

export class WebGLProgram {
  readonly name: string;
  readonly id: number;
  readonly cacheKey: string;
  readonly usedTimes: number = 1;
  
  readonly program: WebGLProgram;
  readonly vertexShader: WebGLShader;
  readonly fragmentShader: WebGLShader;
  
  readonly uniforms: WebGLUniforms;
  readonly attributes: Map<string, number>;
  
  private _gl: WebGL2RenderingContext;
  
  constructor(
    renderer: WebGLRenderer,
    cacheKey: string,
    parameters: ProgramParameters
  ) {
    this._gl = renderer.getContext();
    const gl = this._gl;
    
    this.name = parameters.shaderName || '';
    this.id = programIdCount++;
    this.cacheKey = cacheKey;
    
    // 生成着色器源码
    const vertexGlsl = this._generateVertexShader(parameters);
    const fragmentGlsl = this._generateFragmentShader(parameters);
    
    // 创建着色器
    this.vertexShader = new WebGLShader(gl, gl.VERTEX_SHADER, vertexGlsl);
    this.fragmentShader = new WebGLShader(gl, gl.FRAGMENT_SHADER, fragmentGlsl);
    
    // 创建程序
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vertexShader.shader);
    gl.attachShader(this.program, this.fragmentShader.shader);
    
    // 绑定属性位置（可选）
    if (parameters.index0AttributeName) {
      gl.bindAttribLocation(this.program, 0, parameters.index0AttributeName);
    }
    
    // 链接程序
    gl.linkProgram(this.program);
    
    // 检查链接状态
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      console.error('Program link failed:', info);
      
      // 输出着色器编译错误
      console.error('Vertex shader:', gl.getShaderInfoLog(this.vertexShader.shader));
      console.error('Fragment shader:', gl.getShaderInfoLog(this.fragmentShader.shader));
    }
    
    // 获取 uniforms
    this.uniforms = new WebGLUniforms(gl, this.program);
    
    // 获取 attributes
    this.attributes = this._getAttributes(gl, this.program);
    
    // 清理着色器（可选，某些驱动需要保留）
    // gl.deleteShader(this.vertexShader.shader);
    // gl.deleteShader(this.fragmentShader.shader);
  }
  
  private _getAttributes(
    gl: WebGL2RenderingContext,
    program: WebGLProgram
  ): Map<string, number> {
    const attributes = new Map<string, number>();
    const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveAttrib(program, i)!;
      const name = info.name;
      const location = gl.getAttribLocation(program, name);
      
      attributes.set(name, location);
    }
    
    return attributes;
  }
  
  destroy(): void {
    const gl = this._gl;
    gl.deleteProgram(this.program);
    // 着色器在程序删除时自动删除
  }
}

let programIdCount = 0;
```

### 着色器源码生成

```typescript
private _generateVertexShader(parameters: ProgramParameters): string {
  const prefixVertex = this._getPrefixVertex(parameters);
  const customVertex = parameters.vertexShader;
  
  // 构建完整着色器
  let vertexShader = '#version 300 es\n';
  vertexShader += 'precision ' + parameters.precision + ' float;\n';
  vertexShader += 'precision ' + parameters.precision + ' int;\n';
  
  // 添加定义
  vertexShader += this._getDefines(parameters);
  
  // 内置 uniforms
  vertexShader += this._getCommonUniforms();
  
  // 内置 attributes
  vertexShader += this._getCommonAttributes(parameters);
  
  // 添加前缀代码
  vertexShader += prefixVertex;
  
  // 主着色器代码
  vertexShader += customVertex;
  
  return vertexShader;
}

private _generateFragmentShader(parameters: ProgramParameters): string {
  const prefixFragment = this._getPrefixFragment(parameters);
  const customFragment = parameters.fragmentShader;
  
  let fragmentShader = '#version 300 es\n';
  fragmentShader += 'precision ' + parameters.precision + ' float;\n';
  fragmentShader += 'precision ' + parameters.precision + ' int;\n';
  
  // 添加定义
  fragmentShader += this._getDefines(parameters);
  
  // 输出声明
  fragmentShader += 'out vec4 fragColor;\n';
  
  // 内置 uniforms
  fragmentShader += this._getCommonUniforms();
  
  // 添加前缀代码
  fragmentShader += prefixFragment;
  
  // 主着色器代码
  fragmentShader += customFragment;
  
  return fragmentShader;
}

private _getDefines(parameters: ProgramParameters): string {
  let defines = '';
  
  if (parameters.useFog) {
    defines += '#define USE_FOG\n';
  }
  
  if (parameters.fogExp2) {
    defines += '#define FOG_EXP2\n';
  }
  
  if (parameters.map) {
    defines += '#define USE_MAP\n';
  }
  
  if (parameters.normalMap) {
    defines += '#define USE_NORMALMAP\n';
  }
  
  if (parameters.envMap) {
    defines += '#define USE_ENVMAP\n';
  }
  
  if (parameters.vertexColors) {
    defines += '#define USE_COLOR\n';
  }
  
  if (parameters.instancing) {
    defines += '#define USE_INSTANCING\n';
  }
  
  if (parameters.skinning) {
    defines += '#define USE_SKINNING\n';
    defines += '#define BONE_TEXTURE\n';
  }
  
  // 自定义定义
  for (const [key, value] of Object.entries(parameters.defines || {})) {
    defines += `#define ${key} ${value}\n`;
  }
  
  return defines;
}

private _getCommonUniforms(): string {
  return `
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

uniform float time;
`;
}

private _getCommonAttributes(parameters: ProgramParameters): string {
  let attributes = `
in vec3 position;
in vec3 normal;
in vec2 uv;
`;
  
  if (parameters.vertexColors) {
    attributes += 'in vec3 color;\n';
  }
  
  if (parameters.instancing) {
    attributes += `
in mat4 instanceMatrix;
in vec3 instanceColor;
`;
  }
  
  if (parameters.skinning) {
    attributes += `
in vec4 skinIndex;
in vec4 skinWeight;
`;
  }
  
  return attributes;
}
```

## WebGLPrograms 管理器

```typescript
// src/renderers/webgl/WebGLPrograms.ts
interface ProgramParameters {
  shaderName: string;
  vertexShader: string;
  fragmentShader: string;
  precision: string;
  defines: Record<string, string>;
  
  // 功能标志
  useFog: boolean;
  fogExp2: boolean;
  map: boolean;
  normalMap: boolean;
  envMap: boolean;
  vertexColors: boolean;
  instancing: boolean;
  skinning: boolean;
  
  // 其他参数
  index0AttributeName?: string;
}

export class WebGLPrograms {
  private _renderer: WebGLRenderer;
  private _programs: WebGLProgram[] = [];
  private _shaderCache = new Map<string, string>();
  
  constructor(renderer: WebGLRenderer, capabilities: WebGLCapabilities) {
    this._renderer = renderer;
  }
  
  // 获取或创建程序
  getProgram(material: Material, scene: Scene, object: Object3D): WebGLProgram {
    // 生成参数
    const parameters = this._getParameters(material, scene, object);
    
    // 生成缓存键
    const cacheKey = this._getProgramCacheKey(parameters);
    
    // 查找缓存
    let program = this._programs.find(p => p.cacheKey === cacheKey);
    
    if (program) {
      program.usedTimes++;
      return program;
    }
    
    // 创建新程序
    program = new WebGLProgram(this._renderer, cacheKey, parameters);
    this._programs.push(program);
    
    return program;
  }
  
  // 生成缓存键
  private _getProgramCacheKey(parameters: ProgramParameters): string {
    const parts: string[] = [];
    
    parts.push(parameters.shaderName);
    parts.push(parameters.precision);
    
    // 功能标志
    if (parameters.useFog) parts.push('fog');
    if (parameters.fogExp2) parts.push('fogExp2');
    if (parameters.map) parts.push('map');
    if (parameters.normalMap) parts.push('normalMap');
    if (parameters.envMap) parts.push('envMap');
    if (parameters.vertexColors) parts.push('vertexColors');
    if (parameters.instancing) parts.push('instancing');
    if (parameters.skinning) parts.push('skinning');
    
    // 自定义定义
    for (const [key, value] of Object.entries(parameters.defines || {})) {
      parts.push(`${key}:${value}`);
    }
    
    return parts.join('_');
  }
  
  // 从材质获取参数
  private _getParameters(
    material: Material,
    scene: Scene,
    object: Object3D
  ): ProgramParameters {
    const shaderType = material.type;
    const shaderLib = ShaderLib[shaderType] || {
      vertexShader: material.vertexShader || DEFAULT_VERTEX_SHADER,
      fragmentShader: material.fragmentShader || DEFAULT_FRAGMENT_SHADER,
    };
    
    return {
      shaderName: shaderType,
      vertexShader: shaderLib.vertexShader,
      fragmentShader: shaderLib.fragmentShader,
      precision: this._renderer.capabilities.precision,
      defines: material.defines || {},
      
      useFog: material.fog && scene.fog !== null,
      fogExp2: scene.fog?.isFogExp2 ?? false,
      map: !!material.map,
      normalMap: !!material.normalMap,
      envMap: !!material.envMap || !!scene.environment,
      vertexColors: material.vertexColors,
      instancing: object.isInstancedMesh,
      skinning: object.isSkinnedMesh,
    };
  }
  
  // 释放程序
  release(program: WebGLProgram): void {
    program.usedTimes--;
    
    if (program.usedTimes === 0) {
      const index = this._programs.indexOf(program);
      this._programs.splice(index, 1);
      program.destroy();
    }
  }
  
  // 清理所有
  dispose(): void {
    for (const program of this._programs) {
      program.destroy();
    }
    this._programs.length = 0;
  }
}
```

## Uniform 管理

### WebGLUniforms 类

```typescript
// src/renderers/webgl/WebGLUniforms.ts
interface UniformInfo {
  name: string;
  type: number;
  size: number;
  location: WebGLUniformLocation;
  setValue: (value: any) => void;
}

export class WebGLUniforms {
  private _gl: WebGL2RenderingContext;
  private _uniforms = new Map<string, UniformInfo>();
  
  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this._gl = gl;
    
    // 获取所有 uniforms
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(program, i)!;
      const location = gl.getUniformLocation(program, info.name)!;
      
      // 处理数组 uniform（移除 [0]）
      const name = info.name.replace(/\[0\]$/, '');
      
      this._uniforms.set(name, {
        name,
        type: info.type,
        size: info.size,
        location,
        setValue: this._getSetter(info.type, location, info.size),
      });
    }
  }
  
  // 设置单个 uniform
  setValue(name: string, value: any): void {
    const uniform = this._uniforms.get(name);
    if (uniform) {
      uniform.setValue(value);
    }
  }
  
  // 设置多个 uniforms
  setValues(values: Record<string, any>): void {
    for (const [name, value] of Object.entries(values)) {
      this.setValue(name, value);
    }
  }
  
  // 根据类型获取设置函数
  private _getSetter(
    type: number,
    location: WebGLUniformLocation,
    size: number
  ): (value: any) => void {
    const gl = this._gl;
    
    switch (type) {
      case gl.FLOAT:
        return (value: number) => gl.uniform1f(location, value);
        
      case gl.FLOAT_VEC2:
        return (value: Vector2 | Float32Array) => {
          if (value instanceof Vector2) {
            gl.uniform2f(location, value.x, value.y);
          } else {
            gl.uniform2fv(location, value);
          }
        };
        
      case gl.FLOAT_VEC3:
        return (value: Vector3 | Color | Float32Array) => {
          if (value instanceof Vector3) {
            gl.uniform3f(location, value.x, value.y, value.z);
          } else if (value instanceof Color) {
            gl.uniform3f(location, value.r, value.g, value.b);
          } else {
            gl.uniform3fv(location, value);
          }
        };
        
      case gl.FLOAT_VEC4:
        return (value: Vector4 | Quaternion | Float32Array) => {
          if (value instanceof Vector4 || value instanceof Quaternion) {
            gl.uniform4f(location, value.x, value.y, value.z, value.w);
          } else {
            gl.uniform4fv(location, value);
          }
        };
        
      case gl.FLOAT_MAT3:
        return (value: Matrix3 | Float32Array) => {
          if (value instanceof Matrix3) {
            gl.uniformMatrix3fv(location, false, value.elements);
          } else {
            gl.uniformMatrix3fv(location, false, value);
          }
        };
        
      case gl.FLOAT_MAT4:
        return (value: Matrix4 | Float32Array) => {
          if (value instanceof Matrix4) {
            gl.uniformMatrix4fv(location, false, value.elements);
          } else {
            gl.uniformMatrix4fv(location, false, value);
          }
        };
        
      case gl.INT:
      case gl.BOOL:
        return (value: number | boolean) => gl.uniform1i(location, value ? 1 : 0);
        
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE:
        return (value: number) => gl.uniform1i(location, value);
        
      default:
        return () => console.warn('Unknown uniform type:', type);
    }
  }
}
```

## Shader 片段库

```typescript
// src/renderers/shaders/ShaderChunk.ts
export const ShaderChunk = {
  // 顶点变换
  project_vertex: `
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
gl_Position = projectionMatrix * mvPosition;
`,
  
  // UV 处理
  uv_vertex: `
#ifdef USE_MAP
vUv = (uvTransform * vec3(uv, 1)).xy;
#endif
`,
  
  // 法线
  normal_vertex: `
vec3 transformedNormal = normalMatrix * normal;
#ifdef FLIP_SIDED
transformedNormal = -transformedNormal;
#endif
vNormal = normalize(transformedNormal);
`,
  
  // 雾效
  fog_fragment: `
#ifdef USE_FOG
float depth = gl_FragCoord.z / gl_FragCoord.w;
#ifdef FOG_EXP2
float fogFactor = exp(-fogDensity * fogDensity * depth * depth);
#else
float fogFactor = smoothstep(fogNear, fogFar, depth);
#endif
fragColor.rgb = mix(fogColor, fragColor.rgb, fogFactor);
#endif
`,
  
  // 颜色空间
  encodings_fragment: `
#ifdef SRGB_OUTPUT
fragColor.rgb = linearToSRGB(fragColor.rgb);
#endif
`,
  
  // 色调映射
  tonemapping_fragment: `
#ifdef USE_TONEMAPPING
fragColor.rgb = toneMapping(fragColor.rgb);
#endif
`,
};

// 组合使用
const vertexShader = `
${ShaderChunk.common}
${ShaderChunk.uv_vertex}
${ShaderChunk.normal_vertex}
${ShaderChunk.project_vertex}
`;
```

## 着色器库

```typescript
// src/renderers/shaders/ShaderLib.ts
export const ShaderLib = {
  basic: {
    uniforms: {
      diffuse: { value: new Color(0xffffff) },
      opacity: { value: 1.0 },
      map: { value: null },
      uvTransform: { value: new Matrix3() },
    },
    
    vertexShader: `
out vec2 vUv;
out vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
    
    fragmentShader: `
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D map;

in vec2 vUv;
in vec3 vNormal;

void main() {
  vec4 diffuseColor = vec4(diffuse, opacity);
  
  #ifdef USE_MAP
  diffuseColor *= texture(map, vUv);
  #endif
  
  fragColor = diffuseColor;
}
`,
  },
  
  lambert: {
    // Lambert 着色器...
  },
  
  phong: {
    // Phong 着色器...
  },
  
  standard: {
    // PBR 着色器...
  },
};
```

## 使用示例

```typescript
// 获取程序（内部调用）
const program = programs.getProgram(material, scene, object);

// 使用程序
gl.useProgram(program.program);

// 设置 uniforms
program.uniforms.setValue('modelMatrix', object.matrixWorld);
program.uniforms.setValue('viewMatrix', camera.matrixWorldInverse);
program.uniforms.setValue('projectionMatrix', camera.projectionMatrix);
program.uniforms.setValue('diffuse', material.color);
program.uniforms.setValue('opacity', material.opacity);

// 绑定纹理
if (material.map) {
  textures.setTexture2D(material.map, 0);
  program.uniforms.setValue('map', 0);
}

// 绘制...

// 释放程序
programs.release(program);
```

## 本章小结

- WebGLProgram 封装着色器编译和链接
- 源码生成添加定义和通用代码
- WebGLPrograms 管理程序缓存
- WebGLUniforms 提供类型安全的设置
- ShaderChunk 可复用着色器片段
- ShaderLib 预定义材质着色器

下一章，我们将学习 WebGLState 状态管理。
